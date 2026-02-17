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
    const { orderId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "orders:write");

    const body = (await req.json()) as { items?: Array<{ orderItemId: string; qty: number }> };
    if (!body.items?.length) return fail("items are required", 400);

    const result = await prisma.$transaction(async (tx) => {
      const source = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!source) throw new Error("ORDER_NOT_FOUND");
      assertBranchScope(ctx, source.branchId);

      const sourceById = new Map(source.items.map((i) => [i.id, i]));
      const createItems = [] as Array<{ productId: string; itemNameAr: string; qty: number; unitPrice: number; lineTotal: number; note: string | null }>;

      for (const part of body.items!) {
        const src = sourceById.get(part.orderItemId);
        if (!src) throw new Error("ORDER_ITEM_NOT_FOUND");
        if (part.qty <= 0 || part.qty > Number(src.qty)) throw new Error("INVALID_SPLIT_QTY");

        createItems.push({
          productId: src.productId,
          itemNameAr: src.itemNameAr,
          qty: part.qty,
          unitPrice: Number(src.unitPrice),
          lineTotal: part.qty * Number(src.unitPrice),
          note: src.note
        });

        const remaining = Number(src.qty) - part.qty;
        if (remaining <= 0) {
          await tx.orderItem.delete({ where: { id: src.id } });
        } else {
          await tx.orderItem.update({
            where: { id: src.id },
            data: { qty: remaining, lineTotal: remaining * Number(src.unitPrice) }
          });
        }
      }

      const subtotal = createItems.reduce((s, i) => s + i.lineTotal, 0);
      const newOrder = await tx.order.create({
        data: {
          organizationId: source.organizationId,
          branchId: source.branchId,
          tableId: source.tableId,
          orderNo: `S-${Date.now()}`,
          source: source.source,
          type: source.type,
          status: source.status,
          subtotal,
          taxAmount: 0,
          serviceCharge: 0,
          discountAmount: 0,
          totalAmount: subtotal,
          items: { create: createItems }
        }
      });

      await writeAudit({
        tx,
        organizationId: source.organizationId,
        branchId: source.branchId,
        userId: ctx.userId,
        action: "ORDER_SPLIT",
        entityType: "Order",
        entityId: source.id,
        afterJson: { sourceOrderId: source.id, splitOrderId: newOrder.id, items: body.items } as never,
        requestId: req.headers.get("x-request-id") ?? undefined
      });

      return { sourceOrderId: source.id, splitOrderId: newOrder.id };
    });

    return ok(result, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = ["ORDER_NOT_FOUND", "ORDER_ITEM_NOT_FOUND"].includes(msg) ? 404 : msg.includes("FORBIDDEN") ? 403 : 400;
    return fail(msg, status);
  }
}
