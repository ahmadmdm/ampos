import { NextRequest } from "next/server";
import { getAuthContext } from "@/src/lib/auth";
import { fail, ok } from "@/src/lib/http";

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    return ok({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchIds: ctx.branchIds,
      roles: ctx.roles
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg === "UNAUTHORIZED" ? 401 : 400);
  }
}
