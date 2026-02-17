import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { emitRealtime } from "./emitter";
import { EVENTS } from "./events";

type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export interface OutboxEnvelope {
  event: EventName;
  branchId: string;
  correlationId: string;
  idempotencyKey?: string;
  payload: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseOutboxEnvelope(value: unknown): OutboxEnvelope | null {
  if (!isObject(value)) return null;
  const event = value.event;
  const branchId = value.branchId;
  const correlationId = value.correlationId;
  const payload = value.payload;
  const idempotencyKey = value.idempotencyKey;

  if (typeof event !== "string" || typeof branchId !== "string" || typeof correlationId !== "string") {
    return null;
  }

  return {
    event: event as EventName,
    branchId,
    correlationId,
    idempotencyKey: typeof idempotencyKey === "string" ? idempotencyKey : undefined,
    payload
  };
}

export async function enqueueOutboxEvent(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    branchId: string;
    userId?: string;
    requestId?: string;
    envelope: OutboxEnvelope;
  }
): Promise<void> {
  await tx.auditLog.create({
    data: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      userId: input.userId,
      action: "OUTBOX_PENDING",
      entityType: "RealtimeEvent",
      entityId: `${input.envelope.event}:${input.envelope.idempotencyKey ?? input.envelope.correlationId}`,
      requestId: input.requestId,
      afterJson: input.envelope as unknown as Prisma.InputJsonValue
    }
  });
}

export async function flushPendingOutboxEvents(limit = 100): Promise<{ sent: number; failed: number }> {
  const pending = await prisma.auditLog.findMany({
    where: { action: "OUTBOX_PENDING", entityType: "RealtimeEvent" },
    orderBy: { createdAt: "asc" },
    take: limit
  });

  let sent = 0;
  let failed = 0;

  for (const row of pending) {
    const envelope = parseOutboxEnvelope(row.afterJson);
    if (!envelope) {
      failed += 1;
      await prisma.auditLog.update({
        where: { id: row.id },
        data: {
          action: "OUTBOX_FAILED",
          afterJson: {
            reason: "INVALID_OUTBOX_ENVELOPE",
            original: row.afterJson
          } as unknown as Prisma.InputJsonValue
        }
      });
      continue;
    }

    try {
      await emitRealtime(envelope);
      sent += 1;
      await prisma.auditLog.update({
        where: { id: row.id },
        data: {
          action: "OUTBOX_SENT",
          afterJson: {
            ...envelope,
            sentAt: new Date().toISOString()
          } as unknown as Prisma.InputJsonValue
        }
      });
    } catch {
      failed += 1;
    }
  }

  return { sent, failed };
}
