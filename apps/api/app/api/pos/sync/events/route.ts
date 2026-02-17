import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { ok, fail } from "@/src/lib/http";
import type { Prisma } from "@prisma/client";
import { assertValidDevice } from "@/src/lib/device-auth";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      branchId?: string;
      deviceId?: string;
      events?: Array<{ seq: number; type: string; payload: Record<string, unknown> }>;
    };
    const deviceToken = req.headers.get("x-device-token");

    if (!body.branchId || !body.deviceId || !deviceToken || !body.events?.length) {
      return fail("branchId, deviceId, events and x-device-token are required", 400);
    }
    const device = await assertValidDevice(body.deviceId, deviceToken);
    if (device.branchId !== body.branchId) return fail("DEVICE_BRANCH_SCOPE_MISMATCH", 403);
    const branch = await prisma.branch.findUnique({ where: { id: body.branchId } });
    if (!branch) return fail("BRANCH_NOT_FOUND", 404);

    const acked: number[] = [];
    const rejected: Array<{ seq: number; reason: string }> = [];

    for (const event of body.events) {
      const key = `${body.deviceId}:${event.seq}`;
      const existing = await prisma.auditLog.findFirst({
        where: {
          organizationId: branch.organizationId,
          action: "SYNC_EVENT_APPLIED",
          entityType: "POS_EVENT",
          entityId: key
        }
      });

      if (existing) {
        rejected.push({ seq: event.seq, reason: "DUPLICATE" });
        continue;
      }

      await prisma.auditLog.create({
        data: {
          organizationId: branch.organizationId,
          branchId: body.branchId,
          action: "SYNC_EVENT_APPLIED",
          entityType: "POS_EVENT",
          entityId: key,
          afterJson: event.payload as Prisma.InputJsonValue
        }
      });
      acked.push(event.seq);
    }

    return ok({ acked, rejected, serverCursor: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status =
      msg === "DEVICE_NOT_FOUND" || msg === "INVALID_DEVICE_TOKEN"
        ? 401
        : msg.includes("FORBIDDEN")
        ? 403
        : 400;
    return fail(msg, status);
  }
}
