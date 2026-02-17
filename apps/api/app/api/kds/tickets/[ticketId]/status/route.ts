import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { ok, fail } from "@/src/lib/http";
import { EVENTS } from "@/src/realtime/events";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { enqueueOutboxEvent, flushPendingOutboxEvents } from "@/src/realtime/outbox";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const body = (await req.json()) as { status?: "NEW" | "COOKING" | "READY" | "SERVED" };
    if (!body.status) return fail("status is required", 400);
    const ctx = getAuthContext(req);
    assertPermission(ctx, "kds:write");

    const existing = await prisma.kitchenTicket.findUnique({ where: { id: ticketId } });
    if (!existing) return fail("TICKET_NOT_FOUND", 404);
    assertBranchScope(ctx, existing.branchId);

    const ticket = await prisma.$transaction(async (tx) => {
      const next = await tx.kitchenTicket.update({
        where: { id: ticketId },
        data: { status: body.status }
      });

      const mappedOrderStatus =
        body.status === "NEW"
          ? "IN_KITCHEN"
          : body.status === "COOKING"
          ? "IN_KITCHEN"
          : body.status === "READY"
          ? "READY"
          : "SERVED";

      const orderBefore = await tx.order.findUnique({ where: { id: next.orderId } });
      await tx.order.update({
        where: { id: next.orderId },
        data: { status: mappedOrderStatus }
      });
      if (orderBefore && orderBefore.status !== mappedOrderStatus) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: next.orderId,
            fromStatus: orderBefore.status,
            toStatus: mappedOrderStatus,
            actorUserId: ctx.userId
          }
        });
      }

      await enqueueOutboxEvent(tx, {
        organizationId: existing.organizationId,
        branchId: next.branchId,
        userId: ctx.userId,
        requestId: req.headers.get("x-request-id") ?? undefined,
        envelope: {
          event: EVENTS.KITCHEN_TICKET_UPDATED,
          branchId: next.branchId,
          correlationId: `ticket_${next.id}`,
          idempotencyKey: `${next.id}:${body.status}`,
          payload: next
        }
      });

      return next;
    });
    await flushPendingOutboxEvents(50);

    return ok(ticket);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = msg.includes("FORBIDDEN")
      ? 403
      : msg === "UNAUTHORIZED"
      ? 401
      : 400;
    return fail(msg, status);
  }
}
