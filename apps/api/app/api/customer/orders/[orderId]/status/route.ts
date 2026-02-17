import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { assertValidTableToken } from "@/src/lib/table-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { statusHistory: { orderBy: { at: "asc" } } }
  });

  if (!order) return fail("ORDER_NOT_FOUND", 404);

  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId");
  const tableId = url.searchParams.get("tableId");
  const token = url.searchParams.get("token");

  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "orders:read");
    assertBranchScope(ctx, order.branchId);
    return ok(order);
  } catch {
    if (!order.tableId) return fail("PUBLIC_TRACKING_NOT_ALLOWED", 403);
    if (!branchId || !tableId || !token) {
      return fail("branchId, tableId, token are required", 401);
    }
    if (branchId !== order.branchId || tableId !== order.tableId) {
      return fail("ORDER_SCOPE_MISMATCH", 401);
    }
    const tokenCheck = await assertValidTableToken(req, {
      branchId,
      tableId,
      token
    });
    if (tokenCheck) return tokenCheck;
  }

  return ok(order);
}
