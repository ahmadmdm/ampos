import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { ok, fail } from "@/src/lib/http";

/* GET /api/admin/inventory/items — list all inventory items in org */
export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "inventory:read");

    const items = await prisma.inventoryItem.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        supplier: { select: { id: true, name: true } },
        stockLevels: {
          select: {
            branchId: true,
            quantity: true,
            branch: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return ok(items);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}

/* POST /api/admin/inventory/items — create inventory item */
export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "inventory:write");

    const body = (await req.json()) as {
      sku: string;
      name: string;
      unit: string;
      reorderPoint?: number;
      supplierId?: string;
    };

    if (!body.sku?.trim() || !body.name?.trim() || !body.unit?.trim()) {
      return fail("sku, name, unit are required", 400);
    }

    const item = await prisma.inventoryItem.create({
      data: {
        organizationId: ctx.organizationId,
        sku: body.sku.trim(),
        name: body.name.trim(),
        unit: body.unit.trim(),
        reorderPoint: body.reorderPoint ?? null,
        supplierId: body.supplierId || null,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });

    return ok(item, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (msg.includes("Unique constraint")) return fail("SKU already exists", 409);
    return fail(msg, 400);
  }
}
