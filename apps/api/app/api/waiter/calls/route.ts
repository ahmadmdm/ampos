import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "waiter:read");
    const branchId = req.nextUrl.searchParams.get("branchId") ?? ctx.branchIds[0];
    assertBranchScope(ctx, branchId);

    const status = req.nextUrl.searchParams.get("status") as
      | "CREATED"
      | "ACKNOWLEDGED"
      | "RESOLVED"
      | null;

    const calls = await prisma.waiterCall.findMany({
      where: { branchId, ...(status ? { status } : {}) },
      include: {
        table: true
      },
      orderBy: { createdAt: "desc" }
    });

    return ok(calls);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = msg.includes("FORBIDDEN")
      ? 403
      : msg === "UNAUTHORIZED"
      ? 401
      : 400;
    return fail(msg, status);
  }
}
