import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { signAccessToken, signRefreshToken } from "@/src/lib/jwt";
import { verifyPassword } from "@/src/lib/password";
import { sha256 } from "@/src/lib/crypto";
import { randomUUID } from "node:crypto";
import { rateLimit } from "@/src/lib/rate-limit";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) return fail("email and password are required", 400);

  // 10 attempts per email per 15 minutes — brute force protection
  const allowed = await rateLimit(`login:${body.email.toLowerCase()}`, 10, 900);
  if (!allowed) return fail("TOO_MANY_REQUESTS", 429);

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: {
      userRoles: { include: { role: true } },
      branches: true
    }
  });

  const isValidPassword = user ? await verifyPassword(body.password, user.passwordHash) : false;
  if (!user || !isValidPassword) {
    return fail("INVALID_CREDENTIALS", 401);
  }

  const roles = user.userRoles.map((r) => r.role.code);
  const branchIds = user.branches.map((b) => b.branchId);
  if (!roles.length) return fail("USER_HAS_NO_ROLES", 403);
  if (!branchIds.length) return fail("USER_HAS_NO_BRANCH_ACCESS", 403);
  const claims = {
    sub: user.id,
    org: user.organizationId,
    branches: branchIds,
    roles
  };

  const jti = randomUUID();
  const accessToken = signAccessToken(claims);
  const refreshToken = signRefreshToken({ ...claims, jti });
  const refreshTokenHash = sha256(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      jti,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  return ok({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: claims.roles,
      branchIds: claims.branches
    }
  });
}
