import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    branchId?: string;
    code?: string;
    name?: string;
    platform?: string;
  };

  if (!body.branchId || !body.code || !body.platform) {
    return fail("branchId, code, platform are required", 400);
  }

  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const device = await prisma.device.upsert({
    where: {
      branchId_code: {
        branchId: body.branchId,
        code: body.code
      }
    },
    update: {
      name: body.name ?? body.code,
      platform: body.platform,
      authTokenHash: tokenHash,
      lastSeenAt: new Date()
    },
    create: {
      branchId: body.branchId,
      code: body.code,
      name: body.name ?? body.code,
      platform: body.platform,
      authTokenHash: tokenHash,
      lastSeenAt: new Date()
    }
  });

  return ok({ deviceId: device.id, deviceCode: device.code, token });
}
