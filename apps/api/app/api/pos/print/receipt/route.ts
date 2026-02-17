import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { ok, fail } from "@/src/lib/http";
import { assertBranchScope } from "@/src/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "orders:write");
    const body = (await req.json()) as {
      orderId?: string;
      deviceId?: string;
      printerType?: "RECEIPT" | "KITCHEN";
      copies?: number;
    };

    if (!body.orderId) return fail("orderId is required", 400);

    const order = await prisma.order.findUnique({ where: { id: body.orderId } });
    if (!order) return fail("ORDER_NOT_FOUND", 404);
    assertBranchScope(ctx, order.branchId);

    await prisma.auditLog.create({
      data: {
        organizationId: order.organizationId,
        branchId: order.branchId,
        userId: ctx.userId,
        action: "PRINT_REQUESTED",
        entityType: "Order",
        entityId: order.id,
        afterJson: {
          deviceId: body.deviceId,
          printerType: body.printerType ?? "RECEIPT",
          copies: body.copies ?? 1
        }
      }
    });

    return ok({ queued: true, orderId: order.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
