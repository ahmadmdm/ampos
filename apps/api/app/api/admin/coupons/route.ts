import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";

/**
 * GET /api/admin/coupons — list all coupons for the org
 * POST /api/admin/coupons — create a coupon
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:read");

    const coupons = await prisma.coupon.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
    });
    return ok(coupons);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg === "UNAUTHORIZED" ? 401 : msg.includes("FORBIDDEN") ? 403 : 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");

    const body = await req.json();
    const { code, type, value, minOrderAmount, maxDiscount, usageLimit, validFrom, validUntil, branchId } = body;

    if (!code || !type || value == null) {
      return fail("code, type, and value are required", 400);
    }

    const coupon = await prisma.coupon.create({
      data: {
        organizationId: ctx.organizationId,
        branchId: branchId || null,
        code: code.toUpperCase(),
        type,
        value,
        minOrderAmount: minOrderAmount ?? null,
        maxDiscount: maxDiscount ?? null,
        usageLimit: usageLimit ?? null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });
    return ok(coupon, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") return fail("رمز القسيمة مستخدم بالفعل", 409);
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg === "UNAUTHORIZED" ? 401 : msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
