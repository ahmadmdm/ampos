import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { ok, fail } from "@/src/lib/http";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string; tableId: string }> }
) {
  try {
    const { branchId, tableId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");
    assertBranchScope(ctx, branchId);

    const body = (await req.json()) as {
      code?: string;
      seats?: number;
      tableAreaId?: string | null;
      isActive?: boolean;
    };

    const table = await prisma.table.update({
      where: { id: tableId },
      data: {
        ...(body.code !== undefined && { code: body.code }),
        ...(body.seats !== undefined && { seats: body.seats }),
        ...(body.tableAreaId !== undefined && { tableAreaId: body.tableAreaId }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return ok(table);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string; tableId: string }> }
) {
  try {
    const { branchId, tableId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");
    assertBranchScope(ctx, branchId);

    await prisma.table.delete({ where: { id: tableId } });
    return ok({ deleted: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
