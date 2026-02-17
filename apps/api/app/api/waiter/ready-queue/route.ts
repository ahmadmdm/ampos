import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { ok, fail } from "@/src/lib/http";
import { assertBranchScope } from "@/src/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "waiter:read");
    const branchId = req.nextUrl.searchParams.get("branchId") ?? ctx.branchIds[0];
    assertBranchScope(ctx, branchId);

    const queue = await prisma.kitchenTicket.findMany({
      where: { branchId, status: "READY" },
      include: {
        order: { include: { table: true } },
        items: { include: { orderItem: true } }
      },
      orderBy: { updatedAt: "asc" }
    });

    return ok(queue);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
