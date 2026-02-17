import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "reports:read");
    const branchId = req.nextUrl.searchParams.get("branchId");
    if (!branchId) return fail("branchId is required", 400);
    assertBranchScope(ctx, branchId);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [ordersCount, salesAgg, paymentsAgg, syncFailures, waiterPending, kdsSlaBreaches] = await Promise.all([
      prisma.order.count({ where: { branchId, createdAt: { gte: since } } }),
      prisma.order.aggregate({
        where: { branchId, createdAt: { gte: since }, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true }
      }),
      prisma.payment.aggregate({
        where: { branchId, createdAt: { gte: since } },
        _count: { id: true }
      }),
      prisma.auditLog.count({
        where: { branchId, action: "SYNC_EVENT_APPLY_FAILED", createdAt: { gte: since } }
      }),
      prisma.waiterCall.count({
        where: { branchId, status: { in: ["CREATED", "ACKNOWLEDGED"] }, createdAt: { gte: since } }
      }),
      prisma.kitchenTicket.count({
        where: { branchId, status: { in: ["NEW", "COOKING"] }, createdAt: { lte: new Date(Date.now() - 12 * 60 * 1000) } }
      })
    ]);

    return ok({
      range: "24h",
      ordersCount,
      grossSales: salesAgg._sum.totalAmount ?? 0,
      paymentsCount: paymentsAgg._count.id,
      syncFailures,
      waiterPending,
      kdsSlaBreaches
    });
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
