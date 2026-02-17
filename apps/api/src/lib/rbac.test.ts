import { describe, expect, it } from "vitest";
import { assertPermission } from "../lib/rbac";

describe("rbac", () => {
  it("allows owner wildcard", () => {
    expect(() =>
      assertPermission(
        { userId: "u", organizationId: "o", branchIds: ["b"], roles: ["OWNER"] },
        "inventory:write"
      )
    ).not.toThrow();
  });

  it("blocks missing permission", () => {
    expect(() =>
      assertPermission(
        { userId: "u", organizationId: "o", branchIds: ["b"], roles: ["KITCHEN"] },
        "inventory:write"
      )
    ).toThrow("FORBIDDEN");
  });
});
