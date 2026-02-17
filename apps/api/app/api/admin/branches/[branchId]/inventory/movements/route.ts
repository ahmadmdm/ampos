import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { ok, fail } from "@/src/lib/http";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "inventory:write");
    assertBranchScope(ctx, branchId);

    const body = (await req.json()) as {
      inventoryItemId?: string;
      type?: "IN" | "OUT" | "ADJUSTMENT" | "WASTE" | "TRANSFER";
      quantity?: number;
      reason?: string;
      refType?: string;
      refId?: string;
    };

    if (!body.inventoryItemId || !body.type || body.quantity == null) {
      return fail("inventoryItemId, type, quantity are required", 400);
    }

    const movement = await prisma.$transaction(async (tx) => {
      const row = await tx.stockLevel.findUnique({
        where: {
          branchId_inventoryItemId: {
            branchId,
            inventoryItemId: body.inventoryItemId!
          }
        }
      });

      const current = Number(row?.quantity ?? 0);
      const delta = body.type === "OUT" || body.type === "WASTE" ? -Math.abs(body.quantity!) : Math.abs(body.quantity!);
      const nextQty = current + delta;

      const stockLevel = row
        ? await tx.stockLevel.update({
            where: {
              branchId_inventoryItemId: {
                branchId,
                inventoryItemId: body.inventoryItemId!
              }
            },
            data: { quantity: nextQty }
          })
        : await tx.stockLevel.create({
            data: {
              organizationId: ctx.organizationId,
              branchId,
              inventoryItemId: body.inventoryItemId!,
              quantity: nextQty
            }
          });

      const stockMovement = await tx.stockMovement.create({
        data: {
          organizationId: ctx.organizationId,
          branchId,
          inventoryItemId: body.inventoryItemId!,
          type: body.type!,
          quantity: body.quantity!,
          reason: body.reason,
          refType: body.refType,
          refId: body.refId,
          createdByUserId: ctx.userId
        }
      });

      await tx.auditLog.create({
        data: {
          organizationId: ctx.organizationId,
          branchId,
          userId: ctx.userId,
          action: "STOCK_MOVEMENT_CREATED",
          entityType: "StockMovement",
          entityId: stockMovement.id,
          afterJson: { stockLevel, stockMovement }
        }
      });

      return { stockLevel, stockMovement };
    });

    return ok(movement, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
