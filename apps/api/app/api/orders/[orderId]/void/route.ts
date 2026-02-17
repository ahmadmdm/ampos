import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { ok, fail } from "@/src/lib/http";
import { writeAudit } from "@/src/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "orders:write");

    const body = (await req.json()) as { reason?: string };

    const order = await prisma.$transaction(async (tx) => {
      const before = await tx.order.findUnique({ where: { id: orderId } });
      if (!before) throw new Error("ORDER_NOT_FOUND");
      assertBranchScope(ctx, before.branchId);
      const after = await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" }
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: orderId,
          fromStatus: before.status,
          toStatus: "CANCELLED",
          actorUserId: ctx.userId
        }
      });
      await writeAudit({
        tx,
        organizationId: before.organizationId,
        branchId: before.branchId,
        userId: ctx.userId,
        action: "ORDER_VOIDED",
        entityType: "Order",
        entityId: before.id,
        beforeJson: before as never,
        afterJson: { ...after, reason: body.reason } as never,
        requestId: req.headers.get("x-request-id") ?? undefined
      });
      return after;
    });

    return ok(order);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : msg === "ORDER_NOT_FOUND" ? 404 : 400);
  }
}
