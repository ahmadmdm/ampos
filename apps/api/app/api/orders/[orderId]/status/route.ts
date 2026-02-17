import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { ok, fail } from "@/src/lib/http";
import { EVENTS } from "@/src/realtime/events";
import { assertBranchScope } from "@/src/lib/tenant";
import { enqueueOutboxEvent, flushPendingOutboxEvents } from "@/src/realtime/outbox";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "orders:write");

    const body = (await req.json()) as {
      status?: "CONFIRMED" | "IN_KITCHEN" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED";
    };
    if (!body.status) return fail("status is required", 400);
    const nextStatus = body.status;

    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.order.findUnique({ where: { id: orderId } });
      if (!before) throw new Error("ORDER_NOT_FOUND");
      assertBranchScope(ctx, before.branchId);

      const after = await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: before.status,
          toStatus: nextStatus,
          actorUserId: ctx.userId
        }
      });

      await enqueueOutboxEvent(tx, {
        organizationId: before.organizationId,
        branchId: before.branchId,
        userId: ctx.userId,
        requestId: req.headers.get("x-request-id") ?? undefined,
        envelope: {
          event: EVENTS.ORDER_STATUS_CHANGED,
          branchId: before.branchId,
          correlationId: `order_${orderId}`,
          idempotencyKey: `${orderId}:${nextStatus}`,
          payload: { orderId, status: nextStatus }
        }
      });

      return after;
    });

    await flushPendingOutboxEvents(50);

    return ok(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg === "ORDER_NOT_FOUND" ? 404 : msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
