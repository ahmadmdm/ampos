import { prisma } from "../lib/prisma";
import { EVENTS } from "../realtime/events";
import type { Prisma } from "@prisma/client";
import { createKitchenTicketForOrder } from "../lib/orders";
import { computeTotals } from "../lib/pricing";
import { enqueueOutboxEvent, flushPendingOutboxEvents } from "../realtime/outbox";

export async function processConfirmedPayment(input: {
  branchId: string;
  organizationId: string;
  provider: string;
  eventId: string;
  externalRef: string;
  status?: "CONFIRMED" | "FAILED" | "PENDING";
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}) {
  const txResult = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const status = input.status ?? "CONFIRMED";
    const now = new Date();
    const exists = await tx.paymentAttempt.findUnique({
      where: { providerEventId: input.eventId }
    });
    if (exists) {
      return { deduped: true };
    }

    const existingPayment = await tx.payment.findUnique({
      where: {
        provider_externalRef: {
          provider: input.provider,
          externalRef: input.externalRef
        }
      }
    });
    if (
      existingPayment &&
      status === "CONFIRMED" &&
      (Number(existingPayment.amount) !== input.amount || existingPayment.currency !== input.currency)
    ) {
      await tx.paymentAttempt.create({
        data: {
          paymentId: existingPayment.id,
          providerEventId: input.eventId,
          status: "FAILED",
          rawPayload: {
            reason: "AMOUNT_OR_CURRENCY_MISMATCH",
            incomingAmount: input.amount,
            incomingCurrency: input.currency
          }
        }
      });
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: { status: "FAILED", confirmedAt: null }
      });
      return {
        deduped: false,
        paymentId: existingPayment.id,
        orderId: null,
        ticketId: null,
        status: "FAILED" as const,
        reason: "AMOUNT_OR_CURRENCY_MISMATCH" as const
      };
    }

    const payment = await tx.payment.upsert({
      where: {
        provider_externalRef: {
          provider: input.provider,
          externalRef: input.externalRef
        }
      },
      update: {
        status,
        confirmedAt: status === "CONFIRMED" ? now : null
      },
      create: {
        organizationId: input.organizationId,
        branchId: input.branchId,
        provider: input.provider,
        method: "ONLINE",
        status,
        amount: input.amount,
        currency: input.currency,
        externalRef: input.externalRef,
        confirmedAt: status === "CONFIRMED" ? now : null
      }
    });

    await tx.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        providerEventId: input.eventId,
        status,
        rawPayload: input.metadata ?? {}
      }
    });

    if (status !== "CONFIRMED") {
      return { deduped: false, paymentId: payment.id, orderId: null, ticketId: null, status };
    }

    let orderId = payment.orderId ?? null;
    if (!orderId && input.metadata?.orderCreatePayload) {
      const parsed = JSON.parse(input.metadata.orderCreatePayload) as {
        tableId?: string;
        type: "DINE_IN" | "TAKEAWAY" | "PICKUP" | "DELIVERY_PICKUP";
        items: Array<{ productId: string; qty: number; unitPrice: number; itemNameAr: string }>;
        taxRateBps?: number;
        serviceChargeBps?: number;
        discountAmount?: number;
        appliedPricingRuleIds?: string[];
      };
      const subtotal = parsed.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
      const totals = computeTotals({
        subtotal,
        taxRateBps: parsed.taxRateBps ?? 0,
        serviceChargeBps: parsed.serviceChargeBps ?? 0,
        discountAmount: parsed.discountAmount ?? 0
      });
      const createdOrder = await tx.order.create({
        data: {
          organizationId: input.organizationId,
          branchId: input.branchId,
          tableId: parsed.tableId,
          type: parsed.type,
          source: "CUSTOMER_WEB",
          orderNo: `W-${Date.now()}`,
          status: "CONFIRMED",
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          serviceCharge: totals.serviceCharge,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          items: {
            create: parsed.items.map((item) => ({
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
      orderId = createdOrder.id;
      await tx.payment.update({
        where: { id: payment.id },
        data: { orderId: createdOrder.id }
      });
    }

    let ticketId: string | null = null;
    if (orderId) {
      const ticket = await createKitchenTicketForOrder(tx, {
        orderId,
        organizationId: input.organizationId,
        branchId: input.branchId
      });
      ticketId = ticket?.id ?? null;
    }

    if (status === "CONFIRMED") {
      await enqueueOutboxEvent(tx, {
        organizationId: input.organizationId,
        branchId: input.branchId,
        envelope: {
          event: EVENTS.PAYMENT_CONFIRMED,
          branchId: input.branchId,
          correlationId: input.eventId,
          idempotencyKey: input.eventId,
          payload: { paymentId: payment.id, amount: input.amount, orderId }
        }
      });
      if (orderId) {
        await enqueueOutboxEvent(tx, {
          organizationId: input.organizationId,
          branchId: input.branchId,
          envelope: {
            event: EVENTS.ORDER_CREATED,
            branchId: input.branchId,
            correlationId: `order_${orderId}`,
            idempotencyKey: orderId,
            payload: { id: orderId, source: "CUSTOMER_WEB" }
          }
        });
      }
      if (ticketId) {
        await enqueueOutboxEvent(tx, {
          organizationId: input.organizationId,
          branchId: input.branchId,
          envelope: {
            event: EVENTS.KITCHEN_TICKET_CREATED,
            branchId: input.branchId,
            correlationId: `ticket_${ticketId}`,
            idempotencyKey: ticketId,
            payload: { id: ticketId, orderId }
          }
        });
      }
    }

    return { deduped: false, paymentId: payment.id, orderId, ticketId, status };
  });

  await flushPendingOutboxEvents(100);

  return txResult;
}
