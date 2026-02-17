import { EVENTS } from "./events";
import { redisPublisher } from "../lib/redis";

type EmitPayload = {
  event: (typeof EVENTS)[keyof typeof EVENTS];
  branchId: string;
  correlationId: string;
  idempotencyKey?: string;
  payload: unknown;
};

export async function emitRealtime(input: EmitPayload): Promise<void> {
  const envelope = { ...input, occurredAt: new Date().toISOString() };
  if (redisPublisher) {
    await redisPublisher.publish("rt:events", JSON.stringify(envelope));
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[realtime]", JSON.stringify(envelope));
  }
}
