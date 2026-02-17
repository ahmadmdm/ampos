import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/src/lib/jwt";
import { sha256 } from "@/src/lib/crypto";
import { randomUUID } from "node:crypto";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { refreshToken?: string };
  if (!body.refreshToken) return fail("refreshToken is required", 400);

  try {
    const claims = verifyRefreshToken(body.refreshToken);
    if (!claims.jti) return fail("INVALID_REFRESH_TOKEN_JTI", 401);

    const existing = await prisma.refreshToken.findUnique({
      where: { jti: claims.jti }
    });
    if (!existing || existing.isRevoked || existing.expiresAt.getTime() < Date.now()) {
      return fail("REFRESH_TOKEN_REVOKED_OR_EXPIRED", 401);
    }
    if (existing.tokenHash !== sha256(body.refreshToken)) {
      return fail("REFRESH_TOKEN_HASH_MISMATCH", 401);
    }

    const nextJti = randomUUID();
    const accessToken = signAccessToken({
      sub: claims.sub,
      org: claims.org,
      branches: claims.branches,
      roles: claims.roles
    });
    const refreshToken = signRefreshToken({
      sub: claims.sub,
      org: claims.org,
      branches: claims.branches,
      roles: claims.roles,
      jti: nextJti
    });

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { jti: claims.jti! },
        data: { isRevoked: true, revokedAt: new Date() }
      });
      await tx.refreshToken.create({
        data: {
          userId: claims.sub,
          tokenHash: sha256(refreshToken),
          jti: nextJti,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    });

    return ok({ accessToken, refreshToken });
  } catch {
    return fail("INVALID_REFRESH_TOKEN", 401);
  }
}
