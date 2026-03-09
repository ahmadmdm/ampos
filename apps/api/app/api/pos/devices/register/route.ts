import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";

export async function POST(req: NextRequest) {
  // ── Security: device registration requires an authenticated admin ──────────
  // Without this guard, any party that knows a branchId could register a rogue
  // device and gain a valid POS token — a complete authentication bypass.
  const ctx = getAuthContext(req);
  assertPermission(ctx, "admin:write");

  const body = (await req.json()) as {
    branchId?: string;
    code?: string;
    name?: string;
    platform?: string;
  };

  if (!body.branchId || !body.code || !body.platform) {
    return fail("branchId, code, platform are required", 400);
  }

  // Scope registration to the admin's own branches
  assertBranchScope(ctx, body.branchId);

  // 32 bytes = 256 bits of entropy (was 24 bytes / 192 bits)
  const token = crypto.randomBytes(32).toString("hex");
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
