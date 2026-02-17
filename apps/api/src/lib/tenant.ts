import type { AuthContext } from "./auth";

export function assertBranchScope(ctx: AuthContext, branchId: string): void {
  if (!ctx.branchIds.includes(branchId) && !ctx.roles.includes("OWNER")) {
    throw new Error("BRANCH_SCOPE_FORBIDDEN");
  }
}
