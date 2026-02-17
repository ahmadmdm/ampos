import { beforeEach, describe, expect, it, vi } from "vitest";
import { processConfirmedPayment } from "./service";

const mocked = vi.hoisted(() => {
  const tx = {
    paymentAttempt: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    payment: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn()
    },
    order: {
      create: vi.fn()
    }
  };
  return {
    tx,
    prismaMock: {
      $transaction: vi.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx))
    },
    enqueueOutboxEventMock: vi.fn(),
    flushPendingOutboxEventsMock: vi.fn(),
    createKitchenTicketForOrderMock: vi.fn()
  };
});

vi.mock("../lib/prisma", () => ({
  prisma: mocked.prismaMock
}));

vi.mock("../realtime/outbox", () => ({
  enqueueOutboxEvent: mocked.enqueueOutboxEventMock,
  flushPendingOutboxEvents: mocked.flushPendingOutboxEventsMock
}));

vi.mock("../lib/orders", () => ({
  createKitchenTicketForOrder: mocked.createKitchenTicketForOrderMock
}));

describe("processConfirmedPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.tx.paymentAttempt.findUnique.mockResolvedValue(null);
    mocked.tx.payment.findUnique.mockResolvedValue(null);
    mocked.tx.payment.upsert.mockResolvedValue({ id: "pay_1", orderId: null });
    mocked.tx.paymentAttempt.create.mockResolvedValue({});
    mocked.tx.order.create.mockResolvedValue({ id: "ord_1" });
    mocked.tx.payment.update.mockResolvedValue({});
    mocked.enqueueOutboxEventMock.mockResolvedValue(undefined);
    mocked.flushPendingOutboxEventsMock.mockResolvedValue({ sent: 0, failed: 0 });
    mocked.createKitchenTicketForOrderMock.mockResolvedValue({ id: "kt_1" });
  });

  it("returns deduped when provider event already exists", async () => {
    mocked.tx.paymentAttempt.findUnique.mockResolvedValue({ id: "attempt_1" });

    const result = await processConfirmedPayment({
      branchId: "br_1",
      organizationId: "org_1",
      provider: "moyasar",
      eventId: "evt_1",
      externalRef: "ext_1",
      status: "CONFIRMED",
      amount: 100,
      currency: "SAR"
    });

    expect(result).toEqual({ deduped: true });
    expect(mocked.tx.payment.upsert).not.toHaveBeenCalled();
    expect(mocked.enqueueOutboxEventMock).not.toHaveBeenCalled();
  });

  it("does not create order/ticket for non-confirmed status", async () => {
    const result = await processConfirmedPayment({
      branchId: "br_1",
      organizationId: "org_1",
      provider: "moyasar",
      eventId: "evt_2",
      externalRef: "ext_2",
      status: "FAILED",
      amount: 100,
      currency: "SAR"
    });

    expect(result).toMatchObject({
      deduped: false,
      paymentId: "pay_1",
      status: "FAILED",
      orderId: null,
      ticketId: null
    });
    expect(mocked.tx.order.create).not.toHaveBeenCalled();
    expect(mocked.createKitchenTicketForOrderMock).not.toHaveBeenCalled();
    expect(mocked.enqueueOutboxEventMock).not.toHaveBeenCalled();
  });

  it("fails confirmation on amount/currency mismatch for existing payment", async () => {
    mocked.tx.payment.findUnique.mockResolvedValue({
      id: "pay_existing",
      amount: 100,
      currency: "SAR"
    });

    const result = await processConfirmedPayment({
      branchId: "br_1",
      organizationId: "org_1",
      provider: "moyasar",
      eventId: "evt_mismatch",
      externalRef: "ext_3",
      status: "CONFIRMED",
      amount: 90,
      currency: "SAR"
    });

    expect(result).toMatchObject({
      deduped: false,
      paymentId: "pay_existing",
      status: "FAILED",
      reason: "AMOUNT_OR_CURRENCY_MISMATCH"
    });
    expect(mocked.tx.payment.upsert).not.toHaveBeenCalled();
    expect(mocked.tx.order.create).not.toHaveBeenCalled();
    expect(mocked.enqueueOutboxEventMock).not.toHaveBeenCalled();
  });

  it("creates order/ticket and enqueues outbox events for confirmed status", async () => {
    const result = await processConfirmedPayment({
      branchId: "br_1",
      organizationId: "org_1",
      provider: "moyasar",
      eventId: "evt_3",
      externalRef: "ext_3",
      status: "CONFIRMED",
      amount: 100,
      currency: "SAR",
      metadata: {
        orderCreatePayload: JSON.stringify({
          type: "DINE_IN",
          items: [{ productId: "p1", qty: 1, unitPrice: 100, itemNameAr: "قهوة" }],
          taxRateBps: 1500,
          serviceChargeBps: 0
        })
      }
    });

    expect(result).toMatchObject({
      deduped: false,
      paymentId: "pay_1",
      orderId: "ord_1",
      ticketId: "kt_1",
      status: "CONFIRMED"
    });
    expect(mocked.tx.order.create).toHaveBeenCalledTimes(1);
    expect(mocked.createKitchenTicketForOrderMock).toHaveBeenCalledTimes(1);
    expect(mocked.enqueueOutboxEventMock).toHaveBeenCalledTimes(3);
    expect(mocked.flushPendingOutboxEventsMock).toHaveBeenCalledTimes(1);
  });
});
