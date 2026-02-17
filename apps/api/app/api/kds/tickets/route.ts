import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { ok, fail } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "kds:read");
    const branchId = req.nextUrl.searchParams.get("branchId") ?? ctx.branchIds[0];
    assertBranchScope(ctx, branchId);
    const station = req.nextUrl.searchParams.get("station");

    const tickets = await prisma.kitchenTicket.findMany({
      where: { branchId },
      include: {
        items: {
          where: station ? { station: { code: station } } : undefined,
          include: { orderItem: true, station: true }
        },
        order: true
      },
      orderBy: { createdAt: "desc" }
    });

    return ok(tickets);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = msg.includes("FORBIDDEN")
      ? 403
      : msg === "UNAUTHORIZED"
      ? 401
      : 400;
    return fail(msg, status);
  }
}
