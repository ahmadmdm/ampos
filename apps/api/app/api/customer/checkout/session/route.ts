import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { getProvider } from "@/src/payments/registry";
import { assertValidTableToken } from "@/src/lib/table-auth";
import { computeTotals } from "@/src/lib/pricing";
import { evaluatePricingRules } from "@/src/lib/pricing-rules";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    branchId?: string;
    tableId?: string;
    provider?: string;
    returnUrl?: string;
    cart?: Array<{ productId: string; itemNameAr: string; qty: number; unitPrice: number }>;
    type?: "DINE_IN" | "TAKEAWAY" | "PICKUP" | "DELIVERY_PICKUP";
    token?: string;
  };

  if (!body.branchId || !body.provider || !body.returnUrl || !body.cart?.length || !body.type) {
    return fail("Missing checkout payload", 400);
  }
  if (body.tableId) {
    const tokenCheck = await assertValidTableToken(req, {
      branchId: body.branchId,
      tableId: body.tableId,
      token: body.token
    });
    if (tokenCheck) return tokenCheck;
  }

  const branch = await prisma.branch.findUnique({ where: { id: body.branchId } });
  if (!branch) return fail("BRANCH_NOT_FOUND", 404);
  const rules = await prisma.pricingRule.findMany({
    where: { branchId: body.branchId, isActive: true }
  });

  const subtotal = body.cart.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const ruleEval = evaluatePricingRules(subtotal, rules);
  const totals = computeTotals({
    subtotal,
    taxRateBps: branch.taxRateBps,
    serviceChargeBps: branch.serviceChargeBps,
    discountAmount: ruleEval.discountAmount
  });
  const provider = getProvider(body.provider);

  const orderCreatePayload = JSON.stringify({
    tableId: body.tableId,
    type: body.type,
    items: body.cart,
    taxRateBps: branch.taxRateBps,
    serviceChargeBps: branch.serviceChargeBps,
    discountAmount: ruleEval.discountAmount,
    appliedPricingRuleIds: ruleEval.appliedRuleIds
  });

  const session = await provider.createSession({
    branchId: body.branchId,
    amount: totals.totalAmount,
    currency: "SAR",
    returnUrl: body.returnUrl,
    metadata: {
      organizationId: branch.organizationId,
      branchId: body.branchId,
      orderCreatePayload
    }
  });

  const payment = await prisma.payment.create({
    data: {
      organizationId: branch.organizationId,
      branchId: body.branchId,
      method: "ONLINE",
      provider: provider.name,
      status: "PENDING",
      amount: totals.totalAmount,
      currency: "SAR",
      externalRef: session.externalRef
    }
  });

  return ok({
    paymentId: payment.id,
    amount: totals.totalAmount,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    serviceCharge: totals.serviceCharge,
    discountAmount: totals.discountAmount,
    currency: "SAR",
    provider: provider.name,
    checkoutUrl: session.checkoutUrl,
    externalRef: session.externalRef
  });
}
