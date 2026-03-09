/**
 * POST /api/pos/pairing/claim
 *
 * Called by the iPad after scanning the QR code from the admin screen.
 * This endpoint is intentionally unauthenticated — the 32-byte pairing secret
 * embedded in the QR payload IS the bearer credential.
 *
 * Security notes:
 *  - The pairing code expires in 5 minutes (TTL enforced by Redis).
 *  - Each code is single-use: the Redis key is deleted immediately on claim.
 *  - The secret is compared with crypto.timingSafeEqual() to prevent timing attacks.
 *  - Rate limiting should be applied at the Caddy/nginx layer for this path.
 */

import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { ok, fail } from "@/src/lib/http";
import { prisma } from "@/src/lib/prisma";
import { redis } from "@/src/lib/redis";

interface PairingSession {
  branchId: string;
  organizationId: string;
  secret: string;
  createdAt: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      qrPayload?: string;    // base64(JSON{code,secret}) — from QR scan
      pairingCode?: string;  // manual fallback: 6-digit code
      manualSecret?: string; // manual fallback: secret (shown as separate PIN)
      deviceName?: string;   // "iPad Kitchen 1" etc.
      platform?: string;     // "ios" | "android"
    };

    // ── Decode the payload ───────────────────────────────────────
    let code: string;
    let secret: string;

    if (body.qrPayload) {
      let decoded: { code?: string; secret?: string };
      try {
        decoded = JSON.parse(
          Buffer.from(body.qrPayload, "base64").toString("utf-8"),
        );
      } catch {
        return fail("INVALID_QR_PAYLOAD", 400);
      }
      if (!decoded.code || !decoded.secret) return fail("MALFORMED_QR_PAYLOAD", 400);
      code = decoded.code;
      secret = decoded.secret;
    } else if (body.pairingCode && body.manualSecret) {
      code   = body.pairingCode;
      secret = body.manualSecret;
    } else {
      return fail(
        "qrPayload OR (pairingCode + manualSecret) is required",
        400,
      );
    }

    if (!body.platform) return fail("platform is required", 400);

    // ── Retrieve pairing session from Redis ──────────────────────
    const raw = await redis.get(`pairing:${code}`);
    if (!raw) return fail("PAIRING_CODE_EXPIRED_OR_INVALID", 404);

    const session = JSON.parse(raw) as PairingSession;

    // ── Timing-safe secret comparison ────────────────────────────
    // Both buffers must be the same length for timingSafeEqual.
    // secret is 64-char hex (32 bytes); pad to prevent length leaks.
    const expectedBuf = Buffer.from(session.secret.padEnd(128), "utf-8");
    const providedBuf = Buffer.from(secret.padEnd(128), "utf-8");

    if (
      session.secret.length !== secret.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      // Don't delete the key — allow the legitimate admin to retry
      return fail("INVALID_PAIRING_SECRET", 401);
    }

    // ── One-time: delete the pairing key immediately ─────────────
    await redis.del(`pairing:${code}`);

    // ── Create the device record ─────────────────────────────────
    // Generate a unique device code (not the 6-digit pairing code)
    const deviceCode = crypto.randomBytes(6).toString("hex").toUpperCase();
    const token      = crypto.randomBytes(32).toString("hex");
    const tokenHash  = crypto.createHash("sha256").update(token).digest("hex");

    const device = await prisma.device.create({
      data: {
        branchId:      session.branchId,
        code:          deviceCode,
        name:          body.deviceName ?? `Device-${deviceCode}`,
        platform:      body.platform,
        authTokenHash: tokenHash,
        lastSeenAt:    new Date(),
      },
    });

    return ok({
      deviceId:   device.id,
      deviceCode: device.code,
      branchId:   device.branchId,
      token,        // store securely in device Keychain / Secure Storage
      message:    "Device paired and activated successfully",
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "UNKNOWN_ERROR", 400);
  }
}
