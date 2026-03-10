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

    // Pagination: default 50 active tickets per page
    const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 50)));
    const page  = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
    const skip  = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.kitchenTicket.findMany({
        where: { branchId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          startedAt: true,
          readyAt: true,
          servedAt: true,
          order: { select: { id: true, orderNo: true, table: { select: { code: true } } } },
          items: {
            where: station ? { station: { code: station } } : undefined,
            select: {
              id: true,
              status: true,
              orderItem: { select: { itemNameAr: true, qty: true } },
              station: { select: { id: true, code: true, nameAr: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.kitchenTicket.count({ where: { branchId } }),
    ]);

    return ok({ tickets, total, page, limit });
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
