import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { verifyRefreshToken } from "@/src/lib/jwt";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { refreshToken?: string };
  if (!body.refreshToken) return fail("refreshToken is required", 400);

  try {
    const claims = verifyRefreshToken(body.refreshToken);
    if (!claims.jti) return fail("INVALID_REFRESH_TOKEN_JTI", 401);

    await prisma.refreshToken.updateMany({
      where: { jti: claims.jti, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() }
    });

    return ok({ loggedOut: true });
  } catch {
    return fail("INVALID_REFRESH_TOKEN", 401);
  }
}
