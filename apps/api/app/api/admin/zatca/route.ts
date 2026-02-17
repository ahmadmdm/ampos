/**
 * ZATCA Configuration API
 * Admin endpoints for managing ZATCA e-invoicing settings per branch.
 *
 * GET  /api/admin/zatca?branchId=xxx — Get ZATCA config for a branch
 * POST /api/admin/zatca — Create/update ZATCA config
 * PUT  /api/admin/zatca — Update specific fields (certificate onboarding steps)
 */

import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { writeAudit } from "@/src/lib/audit";
import { generateCsrProperties, GENESIS_PIH } from "@/src/zatca";

// ─── GET: Retrieve ZATCA config ───

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "admin:read");

    const branchId = req.nextUrl.searchParams.get("branchId");

    if (branchId) {
      assertBranchScope(ctx, branchId);
      const config = await prisma.zatcaConfig.findUnique({
        where: { branchId },
      });

      if (!config) return fail("ZATCA_CONFIG_NOT_FOUND", 404);

      // Mask sensitive fields
      return Response.json({
        ...config,
        privateKeyPem: config.privateKeyPem ? "***CONFIGURED***" : null,
        complianceSecret: config.complianceSecret ? "***CONFIGURED***" : null,
        productionSecret: config.productionSecret ? "***CONFIGURED***" : null,
      });
    }

    // List all configs for organization
    const configs = await prisma.zatcaConfig.findMany({
      where: { organizationId: ctx.organizationId },
      select: {
        id: true,
        branchId: true,
        environment: true,
        isActive: true,
        vatNumber: true,
        sellerNameAr: true,
        lastIcv: true,
        createdAt: true,
        updatedAt: true,
        complianceCertBase64: false,
        productionCertBase64: false,
        privateKeyPem: false,
      },
    });

    return Response.json(configs);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, 400);
  }
}

// ─── POST: Create or update ZATCA config ───

export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "admin:write");

    const body = await req.json();
    const {
      branchId,
      environment,
      vatNumber,
      crn,
      sellerNameAr,
      sellerNameEn,
      streetNameAr,
      streetNameEn,
      buildingNumber,
      citySubdivisionAr,
      citySubdivisionEn,
      cityNameAr,
      cityNameEn,
      postalZone,
      businessCategory,
      csrCommonName,
      csrSerialNumber,
      csrInvoiceType,
      isActive,
    } = body;

    if (!branchId || !vatNumber || !crn || !sellerNameAr) {
      return fail("MISSING_REQUIRED_FIELDS: branchId, vatNumber, crn, sellerNameAr are required", 400);
    }

    assertBranchScope(ctx, branchId);

    // Validate VAT number format (15 digits starting with 3)
    if (!/^3\d{14}$/.test(vatNumber)) {
      return fail("INVALID_VAT_NUMBER: Must be 15 digits starting with 3", 400);
    }

    const data = {
      organizationId: ctx.organizationId,
      branchId,
      environment: environment || "sandbox",
      vatNumber,
      crn,
      sellerNameAr,
      sellerNameEn: sellerNameEn || null,
      streetNameAr: streetNameAr || "",
      streetNameEn: streetNameEn || null,
      buildingNumber: buildingNumber || "",
      citySubdivisionAr: citySubdivisionAr || "",
      citySubdivisionEn: citySubdivisionEn || null,
      cityNameAr: cityNameAr || "",
      cityNameEn: cityNameEn || null,
      postalZone: postalZone || "",
      businessCategory: businessCategory || "Supply activities",
      csrCommonName: csrCommonName || null,
      csrSerialNumber: csrSerialNumber || null,
      csrInvoiceType: csrInvoiceType || "1100",
      isActive: isActive ?? false,
    };

    const config = await prisma.zatcaConfig.upsert({
      where: { branchId },
      create: {
        ...data,
        lastIcv: 0,
        lastPih: GENESIS_PIH,
      },
      update: data,
    });

    await writeAudit({
      organizationId: ctx.organizationId,
      branchId,
      userId: ctx.userId,
      action: "ZATCA_CONFIG_UPDATED",
      entityType: "ZatcaConfig",
      entityId: config.id,
      afterJson: {
        environment: config.environment,
        vatNumber: config.vatNumber,
        isActive: config.isActive,
      } as never,
      requestId: req.headers.get("x-request-id") ?? undefined,
    });

    return Response.json({
      id: config.id,
      branchId: config.branchId,
      environment: config.environment,
      isActive: config.isActive,
      vatNumber: config.vatNumber,
      message: "ZATCA configuration saved",
      csrProperties: generateCsrProperties(config),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, 400);
  }
}

// ─── PUT: Update certificates/keys (onboarding flow) ───

export async function PUT(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "admin:write");

    const body = await req.json();
    const { branchId, step, ...data } = body;

    if (!branchId) return fail("MISSING_BRANCH_ID", 400);
    assertBranchScope(ctx, branchId);

    const existing = await prisma.zatcaConfig.findUnique({
      where: { branchId },
    });
    if (!existing) return fail("ZATCA_CONFIG_NOT_FOUND: Create config first via POST", 404);

    let updateData: any = {};
    let message = "";

    switch (step) {
      case "private_key":
        // Store the EC private key
        if (!data.privateKeyPem) return fail("MISSING_PRIVATE_KEY", 400);
        updateData = { privateKeyPem: data.privateKeyPem };
        message = "Private key stored";
        break;

      case "csr":
        // Store CSR (base64)
        if (!data.csrBase64) return fail("MISSING_CSR", 400);
        updateData = { csrBase64: data.csrBase64 };
        message = "CSR stored";
        break;

      case "compliance_cert":
        // Store compliance certificate + credentials from CCSID response
        if (!data.binarySecurityToken || !data.secret) {
          return fail("MISSING_COMPLIANCE_CREDENTIALS", 400);
        }
        updateData = {
          complianceCertBase64: data.binarySecurityToken,
          complianceUsername: data.binarySecurityToken,
          complianceSecret: data.secret,
          complianceRequestId: data.requestID || null,
        };
        message = "Compliance certificate and credentials stored";
        break;

      case "production_cert":
        // Store production certificate + credentials from PCSID response
        if (!data.binarySecurityToken || !data.secret) {
          return fail("MISSING_PRODUCTION_CREDENTIALS", 400);
        }
        updateData = {
          productionCertBase64: data.binarySecurityToken,
          productionUsername: data.binarySecurityToken,
          productionSecret: data.secret,
          environment: "production",
        };
        message = "Production certificate and credentials stored";
        break;

      case "activate":
        updateData = { isActive: true };
        message = "ZATCA e-invoicing activated for this branch";
        break;

      case "deactivate":
        updateData = { isActive: false };
        message = "ZATCA e-invoicing deactivated for this branch";
        break;

      case "reset_counters":
        // Reset ICV and PIH (use with caution!)
        updateData = {
          lastIcv: 0,
          lastPih: GENESIS_PIH,
        };
        message = "Invoice counters reset to genesis values";
        break;

      default:
        return fail("INVALID_STEP: Use private_key, csr, compliance_cert, production_cert, activate, deactivate, or reset_counters", 400);
    }

    const updated = await prisma.zatcaConfig.update({
      where: { branchId },
      data: updateData,
    });

    await writeAudit({
      organizationId: ctx.organizationId,
      branchId,
      userId: ctx.userId,
      action: `ZATCA_${step.toUpperCase()}`,
      entityType: "ZatcaConfig",
      entityId: updated.id,
      afterJson: { step, isActive: updated.isActive } as never,
      requestId: req.headers.get("x-request-id") ?? undefined,
    });

    return Response.json({
      message,
      branchId,
      step,
      isActive: updated.isActive,
      environment: updated.environment,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, 400);
  }
}
