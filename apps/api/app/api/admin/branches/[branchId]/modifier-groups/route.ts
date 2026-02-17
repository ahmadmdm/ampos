import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { ok, fail } from "@/src/lib/http";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:read");
    assertBranchScope(ctx, branchId);

    const groups = await prisma.modifierGroup.findMany({
      where: { organizationId: ctx.organizationId },
      include: { options: true, products: { include: { product: true } } },
      orderBy: { nameAr: "asc" }
    });

    const filtered = groups.filter((g) =>
      g.products.some((pg) => pg.product.branchId === branchId)
    );

    return ok(filtered);
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
      nameAr?: string;
      nameEn?: string;
      minSelect?: number;
      maxSelect?: number;
      isRequired?: boolean;
      options?: Array<{ nameAr: string; nameEn?: string; priceDelta?: number }>;
      productIds?: string[];
    };
    if (!body.nameAr) return fail("nameAr is required", 400);

    const group = await prisma.modifierGroup.create({
      data: {
        organizationId: ctx.organizationId,
        nameAr: body.nameAr,
        nameEn: body.nameEn,
        minSelect: body.minSelect ?? 0,
        maxSelect: body.maxSelect ?? 1,
        isRequired: body.isRequired ?? false,
        options: {
          create: (body.options ?? []).map((o) => ({
            nameAr: o.nameAr,
            nameEn: o.nameEn,
            priceDelta: o.priceDelta ?? 0,
            isActive: true
          }))
        },
        products: {
          create: (body.productIds ?? []).map((productId) => ({ productId }))
        }
      },
      include: { options: true }
    });

    return ok(group, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
