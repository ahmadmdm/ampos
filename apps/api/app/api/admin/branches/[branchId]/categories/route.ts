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

    const categories = await prisma.category.findMany({
      where: { branchId },
      orderBy: { sortOrder: "asc" }
    });
    return ok(categories);
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
      sortOrder?: number;
      isActive?: boolean;
    };
    if (!body.nameAr) return fail("nameAr is required", 400);

    const category = await prisma.category.create({
      data: {
        organizationId: ctx.organizationId,
        branchId,
        nameAr: body.nameAr,
        nameEn: body.nameEn,
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true
      }
    });

    return ok(category, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
