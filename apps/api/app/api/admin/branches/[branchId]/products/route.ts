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

    const products = await prisma.product.findMany({
      where: { branchId },
      include: { variants: true }
    });

    return ok(products);
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
      categoryId: string;
      nameAr: string;
      nameEn?: string;
      basePrice: number;
      requiresKitchen?: boolean;
      sku?: string;
      imageUrl?: string;
    };

    const product = await prisma.product.create({
      data: {
        organizationId: ctx.organizationId,
        branchId,
        categoryId: body.categoryId,
        nameAr: body.nameAr,
        nameEn: body.nameEn,
        sku: body.sku,
        basePrice: body.basePrice,
        requiresKitchen: body.requiresKitchen ?? true,
        imageUrl: body.imageUrl,
      }
    });

    return ok(product, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
