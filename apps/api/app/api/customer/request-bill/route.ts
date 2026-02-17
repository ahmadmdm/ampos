import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { assertValidTableToken } from "@/src/lib/table-auth";
import { enforceRateLimit } from "@/src/lib/rate-limit";
import { EVENTS } from "@/src/realtime/events";
import { makeCorrelationId } from "@pos1/utils";
import { enqueueOutboxEvent, flushPendingOutboxEvents } from "@/src/realtime/outbox";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    branchId?: string;
    tableId?: string;
    orderId?: string;
    note?: string;
    token?: string;
  };

  if (!body.branchId || !body.tableId) {
    return fail("branchId, tableId are required", 400);
  }
  const branchId = body.branchId;
  const tableId = body.tableId;
  const tokenCheck = await assertValidTableToken(req, {
    branchId,
    tableId,
    token: body.token
  });
  if (tokenCheck) return tokenCheck;
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return fail("BRANCH_NOT_FOUND", 404);
  if (!branch.isWaiterCallEnabled) return fail("WAITER_CALL_DISABLED", 403);

  const limiterKey = `waiter_call:${branchId}:${tableId}`;
  const allowed = await enforceRateLimit(limiterKey, branch.waiterCallCooldownSec);
  if (!allowed) {
    return fail("RATE_LIMITED_WAIT_60_SECONDS", 429);
  }

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.waiterCall.create({
      data: {
        organizationId: branch.organizationId,
        branchId,
        tableId,
        orderId: body.orderId,
        reason: "BILL",
        note: body.note,
        status: "CREATED",
        events: {
          create: {
            fromStatus: null,
            toStatus: "CREATED"
          }
        }
      }
    });
    const correlationId = makeCorrelationId();
    await enqueueOutboxEvent(tx, {
      organizationId: branch.organizationId,
      branchId,
      requestId: req.headers.get("x-request-id") ?? undefined,
      envelope: {
        event: EVENTS.WAITER_CALL_CREATED,
        branchId,
        correlationId,
        idempotencyKey: created.id,
        payload: created
      }
    });
    return created;
  });

  await flushPendingOutboxEvents(50);

  return ok(request, { status: 201 });
}
