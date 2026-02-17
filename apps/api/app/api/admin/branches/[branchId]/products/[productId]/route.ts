import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { ok, fail } from "@/src/lib/http";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string; productId: string }> }
) {
  try {
    const { branchId, productId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");
    assertBranchScope(ctx, branchId);

    const body = (await req.json()) as {
      nameAr?: string;
      nameEn?: string;
      basePrice?: number;
      isActive?: boolean;
      requiresKitchen?: boolean;
      categoryId?: string;
    };

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        nameAr: body.nameAr,
        nameEn: body.nameEn,
        basePrice: body.basePrice,
        isActive: body.isActive,
        requiresKitchen: body.requiresKitchen,
        categoryId: body.categoryId
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
  { params }: { params: Promise<{ branchId: string; productId: string }> }
) {
  try {
    const { branchId, productId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");
    assertBranchScope(ctx, branchId);

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { isActive: false }
    });

    return ok({ deleted: true, productId: updated.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
