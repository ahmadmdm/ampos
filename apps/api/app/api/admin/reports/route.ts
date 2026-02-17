import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";

/**
 * GET /api/admin/reports?branchId=X&range=7d|30d|90d|today
 *
 * Returns daily aggregated sales data for charting:
 *  - dailySales: [{ date, orders, revenue, avgTicket }]
 *  - topProducts: [{ nameAr, qty, revenue }]
 *  - paymentMethods: [{ method, count, total }]
 *  - orderTypes: [{ type, count }]
 *  - summary: { totalOrders, totalRevenue, avgTicket, cancelRate }
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "reports:read");
    const branchId = req.nextUrl.searchParams.get("branchId");
    if (!branchId) return fail("branchId is required", 400);
    assertBranchScope(ctx, branchId);

    const range = req.nextUrl.searchParams.get("range") ?? "7d";
    const days = range === "today" ? 1 : range === "30d" ? 30 : range === "90d" ? 90 : 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    // 1. Daily sales aggregation
    const dailySalesRaw: any[] = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*)::int as orders,
        COALESCE(SUM("totalAmount"), 0) as revenue
      FROM "Order"
      WHERE "branchId" = ${branchId}
        AND "createdAt" >= ${since}
        AND "status" NOT IN ('CANCELLED', 'DRAFT')
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    const dailySales = dailySalesRaw.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date),
      orders: Number(r.orders),
      revenue: Number(r.revenue),
      avgTicket: Number(r.orders) > 0 ? Number(r.revenue) / Number(r.orders) : 0,
    }));

    // 2. Top products
    const topProducts: any[] = await prisma.$queryRaw`
      SELECT 
        oi."itemNameAr" as "nameAr",
        SUM(oi."qty")::int as qty,
        SUM(oi."lineTotal") as revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON oi."orderId" = o."id"
      WHERE o."branchId" = ${branchId}
        AND o."createdAt" >= ${since}
        AND o."status" NOT IN ('CANCELLED', 'DRAFT')
      GROUP BY oi."itemNameAr"
      ORDER BY revenue DESC
      LIMIT 10
    `;

    // 3. Payment method breakdown
    const paymentMethods: any[] = await prisma.$queryRaw`
      SELECT 
        p."method",
        COUNT(*)::int as count,
        COALESCE(SUM(p."amount"), 0) as total
      FROM "Payment" p
      WHERE p."branchId" = ${branchId}
        AND p."createdAt" >= ${since}
        AND p."status" = 'CONFIRMED'
      GROUP BY p."method"
      ORDER BY total DESC
    `;

    // 4. Order type breakdown
    const orderTypes: any[] = await prisma.$queryRaw`
      SELECT 
        "type",
        COUNT(*)::int as count
      FROM "Order"
      WHERE "branchId" = ${branchId}
        AND "createdAt" >= ${since}
        AND "status" NOT IN ('CANCELLED', 'DRAFT')
      GROUP BY "type"
    `;

    // 5. Summary
    const [totalOrders, cancelledOrders, totalRevenue] = await Promise.all([
      prisma.order.count({ where: { branchId, createdAt: { gte: since }, status: { notIn: ["DRAFT"] } } }),
      prisma.order.count({ where: { branchId, createdAt: { gte: since }, status: "CANCELLED" } }),
      prisma.order.aggregate({ where: { branchId, createdAt: { gte: since }, status: { notIn: ["CANCELLED", "DRAFT"] } }, _sum: { totalAmount: true } }),
    ]);
    const rev = Number(totalRevenue._sum.totalAmount ?? 0);
    const validOrders = totalOrders - cancelledOrders;

    return ok({
      range,
      days,
      dailySales,
      topProducts: topProducts.map((p) => ({ nameAr: p.nameAr, qty: Number(p.qty), revenue: Number(p.revenue) })),
      paymentMethods: paymentMethods.map((p) => ({ method: p.method, count: Number(p.count), total: Number(p.total) })),
      orderTypes: orderTypes.map((t) => ({ type: t.type, count: Number(t.count) })),
      summary: {
        totalOrders: validOrders,
        totalRevenue: rev,
        avgTicket: validOrders > 0 ? rev / validOrders : 0,
        cancelRate: totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = msg.includes("FORBIDDEN") ? 403 : msg === "UNAUTHORIZED" ? 401 : 400;
    return fail(msg, status);
  }
}
