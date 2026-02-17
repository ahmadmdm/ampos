import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../../app/api/customer/checkout/session/route";

const mocked = vi.hoisted(() => {
  return {
    prisma: {
      branch: {
        findUnique: vi.fn()
      },
      pricingRule: {
        findMany: vi.fn()
      },
      payment: {
        create: vi.fn()
      }
    },
    provider: {
      name: "moyasar" as const,
      createSession: vi.fn()
    }
  };
});

vi.mock("@/src/lib/prisma", () => ({
  prisma: mocked.prisma
}));

vi.mock("@/src/payments/registry", () => ({
  getProvider: vi.fn(() => mocked.provider)
}));

describe("customer checkout session route", () => {
  it("applies active pricing rules and branch org scope", async () => {
    mocked.prisma.branch.findUnique.mockResolvedValue({
      id: "br_1",
      organizationId: "org_1",
      taxRateBps: 1500,
      serviceChargeBps: 0
    });
    mocked.prisma.pricingRule.findMany.mockResolvedValue([
      {
        id: "rule_1",
        kind: "FIXED_DISCOUNT",
        value: 10,
        isActive: true,
        startsAt: null,
        endsAt: null
      }
    ]);
    mocked.provider.createSession.mockResolvedValue({
      sessionId: "sess_1",
      externalRef: "ext_1",
      checkoutUrl: "https://example.test/pay"
    });
    mocked.prisma.payment.create.mockResolvedValue({ id: "pay_1" });

    const req = new NextRequest("http://localhost:3001/api/customer/checkout/session", {
      method: "POST",
      body: JSON.stringify({
        branchId: "br_1",
        provider: "moyasar",
        returnUrl: "http://localhost:3003",
        type: "DINE_IN",
        cart: [{ productId: "p1", itemNameAr: "قهوة", qty: 1, unitPrice: 100 }]
      }),
      headers: {
        "content-type": "application/json"
      }
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mocked.prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          branchId: "br_1",
          amount: 105
        })
      })
    );
    expect(payload.data).toMatchObject({
      paymentId: "pay_1",
      subtotal: 100,
      taxAmount: 15,
      discountAmount: 10,
      amount: 105
    });
  });
});
