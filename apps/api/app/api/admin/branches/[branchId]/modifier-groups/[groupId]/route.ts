import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { ok, fail } from "@/src/lib/http";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string; groupId: string }> }
) {
  try {
    const { branchId, groupId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");
    assertBranchScope(ctx, branchId);

    const body = (await req.json()) as {
      nameAr?: string;
      nameEn?: string;
      minSelect?: number;
      maxSelect?: number;
      isRequired?: boolean;
    };

    const updated = await prisma.modifierGroup.update({
      where: { id: groupId },
      data: {
        nameAr: body.nameAr,
        nameEn: body.nameEn,
        minSelect: body.minSelect,
        maxSelect: body.maxSelect,
        isRequired: body.isRequired
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
  { params }: { params: Promise<{ branchId: string; groupId: string }> }
) {
  try {
    const { branchId, groupId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");
    assertBranchScope(ctx, branchId);

    await prisma.modifierOption.updateMany({
      where: { modifierGroupId: groupId },
      data: { isActive: false }
    });

    return ok({ deleted: true, modifierGroupId: groupId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
