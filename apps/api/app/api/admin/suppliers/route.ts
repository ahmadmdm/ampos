import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { ok, fail } from "@/src/lib/http";

/* GET /api/admin/suppliers — list suppliers */
export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "inventory:read");

    const suppliers = await prisma.supplier.findMany({
      where: { organizationId: ctx.organizationId },
      include: { _count: { select: { inventoryItems: true } } },
      orderBy: { name: "asc" },
    });

    return ok(suppliers);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}

/* POST /api/admin/suppliers — create supplier */
export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "inventory:write");

    const body = (await req.json()) as { name: string; phone?: string };
    if (!body.name?.trim()) return fail("name is required", 400);

    const supplier = await prisma.supplier.create({
      data: {
        organizationId: ctx.organizationId,
        name: body.name.trim(),
        phone: body.phone || null,
      },
    });

    return ok(supplier, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, 400);
  }
}
