import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { ok, fail } from "@/src/lib/http";

/* GET /api/admin/branches/[branchId] — get branch details */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:read");
    assertBranchScope(ctx, branchId);

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        _count: {
          select: { tables: true, products: true, devices: true, orders: true },
        },
      },
    });
    if (!branch) return fail("BRANCH_NOT_FOUND", 404);

    return ok(branch);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}

/* PATCH /api/admin/branches/[branchId] — update a branch */
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
      name?: string;
      code?: string;
      taxRateBps?: number;
      serviceChargeBps?: number;
      currency?: string;
      timezone?: string;
      isQrOrderingEnabled?: boolean;
      isWaiterCallEnabled?: boolean;
      waiterCallCooldownSec?: number;
    };

    const updated = await prisma.branch.update({
      where: { id: branchId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.code !== undefined && { code: body.code }),
        ...(body.taxRateBps !== undefined && { taxRateBps: body.taxRateBps }),
        ...(body.serviceChargeBps !== undefined && { serviceChargeBps: body.serviceChargeBps }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.timezone !== undefined && { timezone: body.timezone }),
        ...(body.isQrOrderingEnabled !== undefined && { isQrOrderingEnabled: body.isQrOrderingEnabled }),
        ...(body.isWaiterCallEnabled !== undefined && { isWaiterCallEnabled: body.isWaiterCallEnabled }),
        ...(body.waiterCallCooldownSec !== undefined && { waiterCallCooldownSec: body.waiterCallCooldownSec }),
      },
    });

    return ok(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}

/* DELETE /api/admin/branches/[branchId] — delete a branch */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");
    assertBranchScope(ctx, branchId);

    await prisma.branch.delete({ where: { id: branchId } });
    return ok({ deleted: branchId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
