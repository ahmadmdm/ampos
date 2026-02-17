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
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "waiter:write");
    const call = await prisma.waiterCall.findUnique({ where: { id: callId } });
    if (!call) return fail("CALL_NOT_FOUND", 404);
    assertBranchScope(ctx, call.branchId);

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.waiterCall.update({
        where: { id: callId },
        data: {
          status: "RESOLVED",
          events: {
            create: {
              fromStatus: call.status,
              toStatus: "RESOLVED",
              actorUserId: ctx.userId
            }
          }
        }
      });
      await enqueueOutboxEvent(tx, {
        organizationId: call.organizationId,
        branchId: call.branchId,
        userId: ctx.userId,
        requestId: req.headers.get("x-request-id") ?? undefined,
        envelope: {
          event: EVENTS.WAITER_CALL_RESOLVED,
          branchId: next.branchId,
          correlationId: `waiter_${next.id}`,
          idempotencyKey: next.id,
          payload: next
        }
      });
      return next;
    });

    await flushPendingOutboxEvents(50);

    return ok(updated);
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
