import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";

/**
 * GET /api/admin/loyalty — get loyalty program config
 * POST /api/admin/loyalty — create or update loyalty program
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "reports:read");

    const program = await prisma.loyaltyProgram.findUnique({
      where: { organizationId: ctx.organizationId },
    });
    return ok(program);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg === "UNAUTHORIZED" ? 401 : 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");

    const body = await req.json();
    const { pointsPerSar, redemptionRate, minRedeemPoints, isActive } = body;

    const program = await prisma.loyaltyProgram.upsert({
      where: { organizationId: ctx.organizationId },
      create: {
        organizationId: ctx.organizationId,
        pointsPerSar: pointsPerSar ?? 1,
        redemptionRate: redemptionRate ?? 0.01,
        minRedeemPoints: minRedeemPoints ?? 100,
        isActive: isActive ?? true,
      },
      update: {
        ...(pointsPerSar != null && { pointsPerSar }),
        ...(redemptionRate != null && { redemptionRate }),
        ...(minRedeemPoints != null && { minRedeemPoints }),
        ...(isActive != null && { isActive }),
      },
    });
    return ok(program);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg === "UNAUTHORIZED" ? 401 : 400);
  }
}
