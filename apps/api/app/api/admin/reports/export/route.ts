import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { fail } from "@/src/lib/http";

/**
 * GET /api/admin/reports/export?branchId=X&range=7d&format=csv|json
 *
 * Exports order data as CSV or JSON for the given date range.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "reports:read");

    const branchId = req.nextUrl.searchParams.get("branchId");
    if (!branchId) return fail("branchId is required", 400);
    assertBranchScope(ctx, branchId);

    const range = req.nextUrl.searchParams.get("range") ?? "7d";
    const format = req.nextUrl.searchParams.get("format") ?? "csv";

    const days = range === "today" ? 1 : range === "30d" ? 30 : range === "90d" ? 90 : 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: { branchId, createdAt: { gte: since } },
      include: {
        items: true,
        payments: { select: { method: true, amount: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "json") {
      return NextResponse.json(orders, {
        headers: {
          "Content-Disposition": `attachment; filename="orders-${branchId}-${range}.json"`,
        },
      });
    }

    // CSV export
    const header = "رقم الطلب,النوع,الحالة,الإجمالي الفرعي,الضريبة,رسوم الخدمة,الخصم,الإجمالي,اسم العميل,هاتف العميل,طريقة الدفع,تاريخ الإنشاء";
    const rows = orders.map((o) => {
      const payMethod = o.payments.map((p) => p.method).join("+") || "-";
      return [
        o.orderNo,
        o.type,
        o.status,
        o.subtotal,
        o.taxAmount,
        o.serviceCharge,
        o.discountAmount,
        o.totalAmount,
        o.customerName || "-",
        o.customerPhone || "-",
        payMethod,
        o.createdAt.toISOString(),
      ].join(",");
    });

    // UTF-8 BOM for Arabic support in Excel
    const bom = "\uFEFF";
    const csv = bom + header + "\n" + rows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-${branchId}-${range}.csv"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = msg.includes("FORBIDDEN") ? 403 : msg === "UNAUTHORIZED" ? 401 : 400;
    return fail(msg, status);
  }
}
