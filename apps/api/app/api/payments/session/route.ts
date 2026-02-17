import { NextRequest } from "next/server";
import { getProvider } from "@/src/payments/registry";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { computeTotals } from "@/src/lib/pricing";
import { evaluatePricingRules } from "@/src/lib/pricing-rules";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      branchId?: string;
      amount?: number;
      currency?: string;
      provider?: string;
      returnUrl?: string;
      metadata?: Record<string, string>;
    };

    if (!body.branchId || body.amount == null || !body.provider || !body.returnUrl) {
      return fail("Missing required payment session fields", 400);
    }

    const ctx = getAuthContext(req);
    assertPermission(ctx, "orders:write");
    assertBranchScope(ctx, body.branchId);

    const branch = await prisma.branch.findUnique({ where: { id: body.branchId } });
    if (!branch) return fail("BRANCH_NOT_FOUND", 404);
    const rules = await prisma.pricingRule.findMany({
      where: { branchId: body.branchId, isActive: true }
    });
    const ruleEval = evaluatePricingRules(body.amount, rules);
    const totals = computeTotals({
      subtotal: body.amount,
      taxRateBps: branch.taxRateBps,
      serviceChargeBps: branch.serviceChargeBps,
      discountAmount: ruleEval.discountAmount
    });

    const provider = getProvider(body.provider);
    const session = await provider.createSession({
      branchId: body.branchId,
      amount: totals.totalAmount,
      currency: body.currency ?? "SAR",
      returnUrl: body.returnUrl,
      metadata: body.metadata ?? {}
    });

    const payment = await prisma.payment.create({
      data: {
        organizationId: ctx.organizationId,
        branchId: body.branchId,
        method: "ONLINE",
        provider: provider.name,
        status: "PENDING",
        amount: totals.totalAmount,
        currency: body.currency ?? "SAR",
        externalRef: session.externalRef
      }
    });

    return ok({
      paymentId: payment.id,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      serviceCharge: totals.serviceCharge,
      discountAmount: totals.discountAmount,
      amount: totals.totalAmount,
      ...session
    });
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
