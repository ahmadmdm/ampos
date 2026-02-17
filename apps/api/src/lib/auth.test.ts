import { describe, expect, it, vi, beforeEach } from "vitest";

const mocked = vi.hoisted(() => {
  return {
    verifyAccessToken: vi.fn(),
  };
});

vi.mock("@/src/lib/jwt", () => ({
  verifyAccessToken: mocked.verifyAccessToken,
}));

import { NextRequest } from "next/server";
import { getAuthContext } from "./auth";

describe("getAuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts context from Bearer JWT", () => {
    mocked.verifyAccessToken.mockReturnValue({
      sub: "user1",
      org: "org1",
      branches: ["br1", "br2"],
      roles: ["OWNER"],
    });

    const req = new NextRequest("http://localhost/api/test", {
      headers: { authorization: "Bearer valid-token" },
    });

    const ctx = getAuthContext(req);
    expect(ctx.userId).toBe("user1");
    expect(ctx.organizationId).toBe("org1");
    expect(ctx.branchIds).toEqual(["br1", "br2"]);
    expect(ctx.roles).toEqual(["OWNER"]);
    expect(mocked.verifyAccessToken).toHaveBeenCalledWith("valid-token");
  });

  it("throws UNAUTHORIZED when JWT verification fails", () => {
    mocked.verifyAccessToken.mockImplementation(() => {
      throw new Error("INVALID_TOKEN");
    });

    const req = new NextRequest("http://localhost/api/test", {
      headers: { authorization: "Bearer bad-token" },
    });

    expect(() => getAuthContext(req)).toThrow();
  });

  it("falls back to x-headers in dev mode", () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: {
        "x-org-id": "org_demo",
        "x-branch-id": "br_demo",
        "x-roles": "OWNER,CASHIER",
        "x-user-id": "u_dev",
      },
    });

    const ctx = getAuthContext(req);
    expect(ctx.userId).toBe("u_dev");
    expect(ctx.organizationId).toBe("org_demo");
    expect(ctx.roles).toEqual(["OWNER", "CASHIER"]);
  });

  it("throws UNAUTHORIZED when no auth provided and no dev headers", () => {
    const req = new NextRequest("http://localhost/api/test");
    expect(() => getAuthContext(req)).toThrow("UNAUTHORIZED");
  });
});
