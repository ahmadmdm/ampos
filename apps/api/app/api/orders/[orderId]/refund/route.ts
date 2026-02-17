import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { ok, fail } from "@/src/lib/http";
import { writeAudit } from "@/src/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "orders:write");

    const body = (await req.json()) as { paymentId?: string; amount?: number; reason?: string };
    if (!body.paymentId || body.amount == null) return fail("paymentId and amount are required", 400);

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      assertBranchScope(ctx, order.branchId);
      const payment = await tx.payment.findUnique({ where: { id: body.paymentId! } });
      if (!payment || payment.orderId !== order.id) throw new Error("PAYMENT_NOT_FOUND");

      const refund = await tx.refund.create({
        data: {
          paymentId: payment.id,
          amount: body.amount!,
          reason: body.reason
        }
      });

      await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
      await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });

      await writeAudit({
        tx,
        organizationId: order.organizationId,
        branchId: order.branchId,
        userId: ctx.userId,
        action: "ORDER_REFUNDED",
        entityType: "Order",
        entityId: order.id,
        afterJson: { refundId: refund.id, paymentId: payment.id, amount: body.amount, reason: body.reason } as never,
        requestId: req.headers.get("x-request-id") ?? undefined
      });

      return { orderId: order.id, refund };
    });

    return ok(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = msg === "ORDER_NOT_FOUND" || msg === "PAYMENT_NOT_FOUND" ? 404 : msg.includes("FORBIDDEN") ? 403 : 400;
    return fail(msg, status);
  }
}
