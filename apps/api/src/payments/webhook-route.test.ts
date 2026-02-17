import { describe, expect, it, vi } from "vitest";
import { POST } from "../../app/api/payments/webhooks/[provider]/route";

const mocked = vi.hoisted(() => {
  return {
    provider: {
      name: "moyasar" as const,
      verifyWebhookSignature: vi.fn(),
      parseWebhookEvent: vi.fn()
    },
    prisma: {
      payment: {
        findUnique: vi.fn()
      }
    },
    processConfirmedPayment: vi.fn()
  };
});

vi.mock("@/src/payments/registry", () => ({
  getProvider: vi.fn(() => mocked.provider)
}));

vi.mock("@/src/lib/prisma", () => ({
  prisma: mocked.prisma
}));

vi.mock("@/src/queue/webhook-queue", () => ({
  webhookQueue: null
}));

vi.mock("@/src/payments/service", () => ({
  processConfirmedPayment: mocked.processConfirmedPayment
}));

describe("payments webhook route", () => {
  it("forwards webhook status to payment service", async () => {
    mocked.provider.verifyWebhookSignature.mockReturnValue(true);
    mocked.provider.parseWebhookEvent.mockReturnValue({
      eventId: "evt_1",
      externalRef: "ext_1",
      status: "FAILED",
      amount: 10,
      currency: "SAR",
      metadata: {
        organizationId: "org_1",
        branchId: "br_1"
      }
    });
    mocked.processConfirmedPayment.mockResolvedValue({
      deduped: false,
      paymentId: "pay_1",
      status: "FAILED",
      orderId: null,
      ticketId: null
    });

    const req = new Request("http://localhost:3001/api/payments/webhooks/moyasar", {
      method: "POST",
      body: JSON.stringify({ any: "payload" })
    });

    const res = await POST(req, { params: Promise.resolve({ provider: "moyasar" }) });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mocked.processConfirmedPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FAILED",
        eventId: "evt_1",
        externalRef: "ext_1"
      })
    );
    expect(payload.ok).toBe(true);
  });

  it("returns 400 when tenant metadata and payment lookup are missing", async () => {
    mocked.provider.verifyWebhookSignature.mockReturnValue(true);
    mocked.provider.parseWebhookEvent.mockReturnValue({
      eventId: "evt_2",
      externalRef: "ext_missing",
      status: "CONFIRMED",
      amount: 30,
      currency: "SAR",
      metadata: {}
    });
    mocked.prisma.payment.findUnique.mockResolvedValue(null);

    const req = new Request("http://localhost:3001/api/payments/webhooks/moyasar", {
      method: "POST",
      body: JSON.stringify({ any: "payload" })
    });

    const res = await POST(req, { params: Promise.resolve({ provider: "moyasar" }) });
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.error).toBe("MISSING_TENANT_METADATA");
  });
});
