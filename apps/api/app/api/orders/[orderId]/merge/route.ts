import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { ok, fail } from "@/src/lib/http";
import { writeAudit } from "@/src/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId: sourceOrderId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "orders:write");

    const body = (await req.json()) as { targetOrderId?: string };
    if (!body.targetOrderId) return fail("targetOrderId is required", 400);

    const merged = await prisma.$transaction(async (tx) => {
      const source = await tx.order.findUnique({ where: { id: sourceOrderId }, include: { items: true } });
      const target = await tx.order.findUnique({ where: { id: body.targetOrderId! }, include: { items: true } });
      if (!source || !target) throw new Error("ORDER_NOT_FOUND");
      assertBranchScope(ctx, source.branchId);
      assertBranchScope(ctx, target.branchId);

      for (const item of source.items) {
        await tx.orderItem.create({
          data: {
            orderId: target.id,
            productId: item.productId,
            variantId: item.variantId,
            itemNameAr: item.itemNameAr,
            qty: item.qty,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            note: item.note
          }
        });
      }

      const sourceSubtotal = source.items.reduce((s, i) => s + Number(i.lineTotal), 0);
      await tx.order.update({
        where: { id: target.id },
        data: {
          subtotal: Number(target.subtotal) + sourceSubtotal,
          totalAmount: Number(target.totalAmount) + sourceSubtotal
        }
      });

      await tx.order.update({ where: { id: source.id }, data: { status: "CANCELLED" } });
      await tx.orderStatusHistory.create({
        data: {
          orderId: source.id,
          fromStatus: source.status,
          toStatus: "CANCELLED",
          actorUserId: ctx.userId
        }
      });

      await writeAudit({
        tx,
        organizationId: source.organizationId,
        branchId: source.branchId,
        userId: ctx.userId,
        action: "ORDER_MERGED",
        entityType: "Order",
        entityId: source.id,
        afterJson: { sourceOrderId: source.id, targetOrderId: target.id } as never,
        requestId: req.headers.get("x-request-id") ?? undefined
      });

      return { sourceOrderId: source.id, targetOrderId: target.id };
    });

    return ok(merged);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = msg === "ORDER_NOT_FOUND" ? 404 : msg.includes("FORBIDDEN") ? 403 : 400;
    return fail(msg, status);
  }
}
