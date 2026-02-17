import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { ok, fail } from "@/src/lib/http";

const allowedKinds = new Set(["FIXED_DISCOUNT", "PERCENT_DISCOUNT"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string; ruleId: string }> }
) {
  try {
    const { branchId, ruleId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");
    assertBranchScope(ctx, branchId);

    const body = (await req.json()) as {
      name?: string;
      kind?: string;
      value?: number;
      isActive?: boolean;
      startsAt?: string;
      endsAt?: string;
    };
    if (body.kind && !allowedKinds.has(body.kind)) {
      return fail("Unsupported pricing rule kind", 400);
    }

    const existing = await prisma.pricingRule.findUnique({ where: { id: ruleId } });
    if (!existing) return fail("PRICING_RULE_NOT_FOUND", 404);
    if (existing.branchId !== branchId) return fail("BRANCH_SCOPE_FORBIDDEN", 403);

    const updated = await prisma.pricingRule.update({
      where: { id: ruleId },
      data: {
        name: body.name,
        kind: body.kind,
        value: body.value,
        isActive: body.isActive,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined
      }
    });

    return ok(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string; ruleId: string }> }
) {
  try {
    const { branchId, ruleId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");
    assertBranchScope(ctx, branchId);

    const existing = await prisma.pricingRule.findUnique({ where: { id: ruleId } });
    if (!existing) return fail("PRICING_RULE_NOT_FOUND", 404);
    if (existing.branchId !== branchId) return fail("BRANCH_SCOPE_FORBIDDEN", 403);

    await prisma.pricingRule.update({ where: { id: ruleId }, data: { isActive: false } });
    return ok({ deleted: true, ruleId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
