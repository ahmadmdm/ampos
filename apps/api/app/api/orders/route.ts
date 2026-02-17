import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { EVENTS } from "@/src/realtime/events";
import { enqueueOutboxEvent, flushPendingOutboxEvents } from "@/src/realtime/outbox";
import { createKitchenTicketForOrder } from "@/src/lib/orders";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { computeTotals } from "@/src/lib/pricing";
import { evaluatePricingRules } from "@/src/lib/pricing-rules";
import type { Prisma } from "@prisma/client";

// ─── GET: List orders with filtering, search, pagination ───
export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "orders:read");

    const url = req.nextUrl;
    const branchId = url.searchParams.get("branchId");
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");
    const search = url.searchParams.get("search");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      organizationId: ctx.organizationId,
    };

    if (branchId) {
      assertBranchScope(ctx, branchId);
      where.branchId = branchId;
    } else if (!ctx.roles.includes("OWNER")) {
      where.branchId = { in: ctx.branchIds };
    }

    if (status) where.status = status as any;
    if (type) where.type = type as any;
    if (search) {
      where.OR = [
        { orderNo: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search } },
      ];
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          payments: true,
          table: true,
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return ok({
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = msg.includes("FORBIDDEN") ? 403 : msg === "UNAUTHORIZED" ? 401 : 400;
    return fail(msg, status);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      branchId?: string;
      tableId?: string;
      type?: "DINE_IN" | "TAKEAWAY" | "PICKUP" | "DELIVERY_PICKUP";
      items?: Array<{ productId: string; qty: number; unitPrice: number; itemNameAr: string }>;
    };

    if (!body.branchId || !body.type || !body.items?.length) {
      return fail("Missing order data", 400);
    }
    const ctx = getAuthContext(req);
    assertPermission(ctx, "orders:write");
    assertBranchScope(ctx, body.branchId);

    const total = body.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
    const branch = await prisma.branch.findUnique({ where: { id: body.branchId } });
    if (!branch) return fail("BRANCH_NOT_FOUND", 404);
    const rules = await prisma.pricingRule.findMany({
      where: { branchId: body.branchId, isActive: true }
    });
    const ruleEval = evaluatePricingRules(total, rules);
    const totals = computeTotals({
      subtotal: total,
      taxRateBps: branch.taxRateBps,
      serviceChargeBps: branch.serviceChargeBps,
      discountAmount: ruleEval.discountAmount
    });
    const { order } = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          organizationId: ctx.organizationId,
          branchId: body.branchId!,
          tableId: body.tableId,
          type: body.type!,
          source: "POS",
          orderNo: `A-${Date.now()}`,
          status: "CONFIRMED",
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          serviceCharge: totals.serviceCharge,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          items: {
            create: body.items!.map((item) => ({
              productId: item.productId,
              itemNameAr: item.itemNameAr,
              qty: item.qty,
              unitPrice: item.unitPrice,
              lineTotal: item.qty * item.unitPrice
            }))
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: "CONFIRMED"
            }
          }
        }
      });
      const createdTicket = await createKitchenTicketForOrder(tx, {
        orderId: createdOrder.id,
        organizationId: ctx.organizationId,
        branchId: body.branchId!
      });

      await enqueueOutboxEvent(tx, {
        organizationId: ctx.organizationId,
        branchId: body.branchId!,
        userId: ctx.userId,
        requestId: req.headers.get("x-request-id") ?? undefined,
        envelope: {
          event: EVENTS.ORDER_CREATED,
          branchId: createdOrder.branchId,
          correlationId: `order_${createdOrder.id}`,
          idempotencyKey: createdOrder.id,
          payload: createdOrder
        }
      });
      if (createdTicket) {
        await enqueueOutboxEvent(tx, {
          organizationId: ctx.organizationId,
          branchId: body.branchId!,
          userId: ctx.userId,
          requestId: req.headers.get("x-request-id") ?? undefined,
          envelope: {
            event: EVENTS.KITCHEN_TICKET_CREATED,
            branchId: createdOrder.branchId,
            correlationId: `ticket_${createdTicket.id}`,
            idempotencyKey: createdTicket.id,
            payload: createdTicket
          }
        });
      }
      return { order: createdOrder };
    });

    await flushPendingOutboxEvents(50);

    return ok(order, { status: 201 });
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
