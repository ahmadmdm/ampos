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

    const tables = await prisma.table.findMany({
      where: { branchId },
      include: { area: true },
      orderBy: { code: "asc" },
    });

    const areas = await prisma.tableArea.findMany({
      where: { branchId },
      orderBy: { sortOrder: "asc" },
    });

    return ok({ tables, areas });
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
      code?: string;
      seats?: number;
      tableAreaId?: string;
      isActive?: boolean;
    };
    if (!body.code) return fail("code is required", 400);

    const table = await prisma.table.create({
      data: {
        branchId,
        code: body.code,
        seats: body.seats ?? 2,
        tableAreaId: body.tableAreaId,
        isActive: body.isActive ?? true,
      },
    });

    return ok(table, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
