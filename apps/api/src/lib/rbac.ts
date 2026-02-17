import type { AuthContext } from "./auth";

const rolePermissions: Record<string, string[]> = {
  OWNER: ["*"],
  BRANCH_MANAGER: ["catalog:read", "catalog:write", "inventory:read", "inventory:write", "orders:read", "orders:write", "payments:read", "reports:read", "waiter:read", "kds:read"],
  CASHIER: ["orders:write", "orders:read", "catalog:read", "payments:read"],
  KITCHEN: ["kds:read", "kds:write", "catalog:read"],
  WAITER_RUNNER: ["waiter:read", "waiter:write", "orders:read", "catalog:read"],
  INVENTORY: ["inventory:read", "inventory:write", "catalog:read"],
  ACCOUNTANT: ["reports:read", "payments:read", "orders:read"]
};

export function assertPermission(ctx: AuthContext, permission: string): void {
  const allowed = ctx.roles.some((role) => {
    const perms = rolePermissions[role] ?? [];
    return perms.includes("*") || perms.includes(permission);
  });
  if (!allowed) {
    throw new Error("FORBIDDEN");
  }
}
