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
    assertPermission(ctx, "inventory:read");
    assertBranchScope(ctx, branchId);

    const rows = await prisma.stockLevel.findMany({
      where: { branchId },
      include: { inventoryItem: true }
    });

    const low = rows.filter((r) => {
      const rp = r.inventoryItem.reorderPoint;
      if (rp == null) return false;
      return Number(r.quantity) <= Number(rp);
    });

    return ok(low);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
