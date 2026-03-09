/**
 * POST /api/pos/pairing/initiate
 *
 * Admin-authenticated endpoint that creates a short-lived QR pairing session.
 * The response contains a `qrPayload` (base64 JSON) that the iPad scans, and a
 * `pairingCode` (6-digit) for manual fallback entry.
 *
 * Flow:
 *   1. Admin opens the "Add Device" screen in the admin panel.
 *   2. This endpoint generates { code, secret } and stores them in Redis with
 *      a 300-second TTL.
 *   3. The QR code is rendered from `qrPayload` on the admin screen.
 *   4. The cashier scans the QR code with the iPad app, which calls /pairing/claim.
 *   5. On success the iPad receives a permanent device token. The Redis entry is
 *      deleted (one-time use).
 */

import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { ok, fail } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { redis } from "@/src/lib/redis";

/** Pairing session lives for 5 minutes — longer is a security risk */
const PAIRING_TTL_SECONDS = 300;

export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "admin:write");

    const { branchId } = (await req.json()) as { branchId?: string };
    if (!branchId) return fail("branchId is required", 400);
    assertBranchScope(ctx, branchId);

    // 6-digit human-readable code (for manual fallback entry on the iPad)
    const humanCode = Math.floor(100_000 + Math.random() * 900_000).toString();

    // 32-byte unguessable secret — this is what actually authenticates the claim
    const secret = crypto.randomBytes(32).toString("hex");

    const sessionPayload = {
      branchId,
      organizationId: ctx.organizationId,
      secret,
      createdAt: new Date().toISOString(),
    };

    // Store under pairing:{code} in Redis with hard TTL
    await redis.set(
      `pairing:${humanCode}`,
      JSON.stringify(sessionPayload),
      "EX",
      PAIRING_TTL_SECONDS,
    );

    // QR payload = base64(JSON{ code, secret })
    // The iPad decodes this and sends both to /pairing/claim.
    // Without the secret, guessing a valid code by brute-force requires
    // 2^256 attempts — effectively impossible.
    const qrPayload = Buffer.from(
      JSON.stringify({ code: humanCode, secret }),
    ).toString("base64");

    const expiresAt = new Date(
      Date.now() + PAIRING_TTL_SECONDS * 1000,
    ).toISOString();

    return ok({
      pairingCode: humanCode, // show this for manual entry fallback
      qrPayload,              // embed this string in a QR code image
      expiresAt,
      ttlSeconds: PAIRING_TTL_SECONDS,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "UNKNOWN_ERROR", 400);
  }
}
