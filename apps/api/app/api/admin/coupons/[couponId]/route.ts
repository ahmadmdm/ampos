import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";

/**
 * PATCH /api/admin/coupons/[couponId] — update a coupon
 * DELETE /api/admin/coupons/[couponId] — deactivate a coupon
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ couponId: string }> }) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");
    const { couponId } = await params;

    const body = await req.json();
    const coupon = await prisma.coupon.update({
      where: { id: couponId, organizationId: ctx.organizationId },
      data: body,
    });
    return ok(coupon);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg === "UNAUTHORIZED" ? 401 : msg.includes("FORBIDDEN") ? 403 : 400);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ couponId: string }> }) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");
    const { couponId } = await params;

    await prisma.coupon.update({
      where: { id: couponId, organizationId: ctx.organizationId },
      data: { isActive: false },
    });
    return ok({ deleted: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg === "UNAUTHORIZED" ? 401 : msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
