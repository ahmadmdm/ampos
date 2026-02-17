import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { ok, fail } from "@/src/lib/http";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:read");
    assertBranchScope(ctx, branchId);

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) return fail("BRANCH_NOT_FOUND", 404);

    return ok({
      id: branch.id,
      name: branch.name,
      taxRateBps: branch.taxRateBps,
      serviceChargeBps: branch.serviceChargeBps,
      isQrOrderingEnabled: branch.isQrOrderingEnabled,
      isWaiterCallEnabled: branch.isWaiterCallEnabled,
      waiterCallCooldownSec: branch.waiterCallCooldownSec,
      currency: branch.currency,
      timezone: branch.timezone
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");
    assertBranchScope(ctx, branchId);

    const body = (await req.json()) as {
      taxRateBps?: number;
      serviceChargeBps?: number;
      isQrOrderingEnabled?: boolean;
      isWaiterCallEnabled?: boolean;
      waiterCallCooldownSec?: number;
      timezone?: string;
      currency?: string;
    };

    const before = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!before) return fail("BRANCH_NOT_FOUND", 404);

    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: {
        taxRateBps: body.taxRateBps ?? before.taxRateBps,
        serviceChargeBps: body.serviceChargeBps ?? before.serviceChargeBps,
        isQrOrderingEnabled: body.isQrOrderingEnabled ?? before.isQrOrderingEnabled,
        isWaiterCallEnabled: body.isWaiterCallEnabled ?? before.isWaiterCallEnabled,
        waiterCallCooldownSec: body.waiterCallCooldownSec ?? before.waiterCallCooldownSec,
        timezone: body.timezone ?? before.timezone,
        currency: body.currency ?? before.currency
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        branchId,
        userId: ctx.userId,
        action: "BRANCH_SETTINGS_UPDATED",
        entityType: "Branch",
        entityId: branchId,
        beforeJson: before,
        afterJson: branch
      }
    });

    return ok(branch);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
