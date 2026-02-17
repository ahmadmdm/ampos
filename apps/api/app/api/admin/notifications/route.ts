import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { emitRealtime } from "@/src/realtime/emitter";
import { EVENTS } from "@/src/realtime/events";

/**
 * POST /api/admin/notifications — send a push notification to a branch
 * Body: { branchId, title, body, type? }
 * 
 * This emits a NOTIFICATION event via Socket.IO to all connected clients in the branch.
 * Also stores it in AuditLog for history.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "orders:write"); // managers can notify

    const { branchId, title, body, type } = await req.json();
    if (!branchId || !title) return fail("branchId and title are required", 400);

    const notification = {
      id: `notif_${Date.now()}`,
      branchId,
      title,
      body: body || "",
      type: type || "INFO", // INFO, WARNING, URGENT
      sentBy: ctx.userId,
      sentAt: new Date().toISOString(),
    };

    // Emit via realtime
    await emitRealtime({
      event: EVENTS.NOTIFICATION,
      branchId,
      correlationId: notification.id,
      payload: notification,
    });

    // Log it
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        branchId,
        userId: ctx.userId,
        action: "NOTIFICATION_SENT",
        entityType: "Notification",
        entityId: notification.id,
        afterJson: notification as any,
      },
    });

    return ok(notification, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg === "UNAUTHORIZED" ? 401 : 400);
  }
}
