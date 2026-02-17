import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { ok, fail } from "@/src/lib/http";
import { EVENTS } from "@/src/realtime/events";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { enqueueOutboxEvent, flushPendingOutboxEvents } from "@/src/realtime/outbox";

const statusRank = {
  NEW: 0,
  COOKING: 1,
  READY: 2,
  SERVED: 3
} as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticketItemId: string }> }
) {
  try {
    const { ticketItemId } = await params;
    const body = (await req.json()) as { status?: "NEW" | "COOKING" | "READY" | "SERVED" };
    if (!body.status) return fail("status is required", 400);
    const ctx = getAuthContext(req);
    assertPermission(ctx, "kds:write");
    const existingItem = await prisma.kitchenTicketItem.findUnique({
      where: { id: ticketItemId },
      include: { ticket: true }
    });
    if (!existingItem) return fail("TICKET_ITEM_NOT_FOUND", 404);
    assertBranchScope(ctx, existingItem.ticket.branchId);

    const { updatedItem, ticket } = await prisma.$transaction(async (tx) => {
      const nextItem = await tx.kitchenTicketItem.update({
        where: { id: ticketItemId },
        data: { status: body.status },
        include: {
          ticket: true
        }
      });

      const siblings = await tx.kitchenTicketItem.findMany({ where: { ticketId: nextItem.ticketId } });
      const overall = siblings.reduce<"NEW" | "COOKING" | "READY" | "SERVED">((acc, s) => {
        return statusRank[s.status] < statusRank[acc] ? s.status : acc;
      }, "SERVED");

      const nextTicket = await tx.kitchenTicket.update({
        where: { id: nextItem.ticketId },
        data: { status: overall }
      });

      const mappedOrderStatus =
        overall === "NEW"
          ? "IN_KITCHEN"
          : overall === "COOKING"
          ? "IN_KITCHEN"
          : overall === "READY"
          ? "READY"
          : "SERVED";
      const orderBefore = await tx.order.findUnique({ where: { id: nextTicket.orderId } });
      await tx.order.update({
        where: { id: nextTicket.orderId },
        data: { status: mappedOrderStatus }
      });
      if (orderBefore && orderBefore.status !== mappedOrderStatus) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: nextTicket.orderId,
            fromStatus: orderBefore.status,
            toStatus: mappedOrderStatus,
            actorUserId: ctx.userId
          }
        });
      }

      await enqueueOutboxEvent(tx, {
        organizationId: existingItem.ticket.organizationId,
        branchId: nextTicket.branchId,
        userId: ctx.userId,
        requestId: req.headers.get("x-request-id") ?? undefined,
        envelope: {
          event: EVENTS.KITCHEN_TICKET_UPDATED,
          branchId: nextTicket.branchId,
          correlationId: `ticket-item_${nextItem.id}`,
          idempotencyKey: `${nextItem.id}:${body.status}`,
          payload: { ticketItemId: nextItem.id, status: body.status, ticketStatus: nextTicket.status }
        }
      });

      return { updatedItem: nextItem, ticket: nextTicket };
    });

    await flushPendingOutboxEvents(50);

    return ok({ item: updatedItem, ticket });
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
