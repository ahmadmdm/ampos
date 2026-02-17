import { describe, expect, it } from "vitest";
import { signTableToken, verifyTableToken } from "../lib/crypto";

describe("table token", () => {
  it("signs and verifies valid token", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signTableToken(
      { branchId: "br1", tableId: "t1", exp: now + 60 },
      "secret1"
    );

    const parsed = verifyTableToken(token, "secret1");
    expect(parsed?.branchId).toBe("br1");
    expect(parsed?.tableId).toBe("t1");
  });

  it("rejects expired token", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signTableToken(
      { branchId: "br1", tableId: "t1", exp: now - 1 },
      "secret1"
    );

    expect(verifyTableToken(token, "secret1")).toBeNull();
  });
});
