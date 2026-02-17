import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    deviceId?: string;
    oldToken?: string;
  };

  if (!body.deviceId || !body.oldToken) {
    return fail("deviceId and oldToken are required", 400);
  }

  const device = await prisma.device.findUnique({ where: { id: body.deviceId } });
  if (!device) return fail("DEVICE_NOT_FOUND", 404);

  const oldHash = crypto.createHash("sha256").update(body.oldToken).digest("hex");
  if (oldHash !== device.authTokenHash) return fail("INVALID_DEVICE_TOKEN", 401);

  const newToken = crypto.randomBytes(24).toString("hex");
  const newHash = crypto.createHash("sha256").update(newToken).digest("hex");

  await prisma.device.update({
    where: { id: device.id },
    data: {
      authTokenHash: newHash,
      lastSeenAt: new Date()
    }
  });

  return ok({ deviceId: device.id, token: newToken });
}
