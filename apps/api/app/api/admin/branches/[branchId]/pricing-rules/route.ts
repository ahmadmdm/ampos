import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { ok, fail } from "@/src/lib/http";

const allowedKinds = new Set(["FIXED_DISCOUNT", "PERCENT_DISCOUNT"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:read");
    assertBranchScope(ctx, branchId);

    const rules = await prisma.pricingRule.findMany({
      where: { branchId },
      orderBy: { createdAt: "desc" }
    });
    return ok(rules);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId } = await params;
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

    if (!body.name || !body.kind || body.value == null) {
      return fail("name, kind, value are required", 400);
    }
    if (!allowedKinds.has(body.kind)) {
      return fail("Unsupported pricing rule kind", 400);
    }

    const rule = await prisma.pricingRule.create({
      data: {
        organizationId: ctx.organizationId,
        branchId,
        name: body.name,
        kind: body.kind,
        value: body.value,
        isActive: body.isActive ?? true,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null
      }
    });

    return ok(rule, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
