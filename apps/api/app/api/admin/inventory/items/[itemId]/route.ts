import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { ok, fail } from "@/src/lib/http";

/* PATCH /api/admin/inventory/items/[itemId] — update item */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "inventory:write");

    const body = (await req.json()) as {
      name?: string;
      unit?: string;
      reorderPoint?: number | null;
      supplierId?: string | null;
    };

    const item = await prisma.inventoryItem.update({
      where: { id: itemId, organizationId: ctx.organizationId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.unit && { unit: body.unit }),
        ...(body.reorderPoint !== undefined && { reorderPoint: body.reorderPoint }),
        ...(body.supplierId !== undefined && { supplierId: body.supplierId || null }),
      },
      include: { supplier: { select: { id: true, name: true } } },
    });

    return ok(item);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, 400);
  }
}

/* DELETE /api/admin/inventory/items/[itemId] — delete item */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "inventory:write");

    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({ where: { inventoryItemId: itemId } });
      await tx.stockLevel.deleteMany({ where: { inventoryItemId: itemId } });
      await tx.inventoryItem.delete({ where: { id: itemId, organizationId: ctx.organizationId } });
    });

    return ok({ deleted: itemId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, 400);
  }
}
