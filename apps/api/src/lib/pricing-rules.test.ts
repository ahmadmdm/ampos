import { describe, expect, it } from "vitest";
import { evaluatePricingRules, isRuleActiveNow } from "./pricing-rules";

describe("pricing rules", () => {
  it("applies fixed and percent discounts and caps to subtotal", () => {
    const now = new Date("2026-02-16T10:00:00.000Z");
    const result = evaluatePricingRules(
      100,
      [
        {
          id: "r1",
          kind: "FIXED_DISCOUNT",
          value: 10,
          startsAt: null,
          endsAt: null,
          isActive: true
        },
        {
          id: "r2",
          kind: "PERCENT_DISCOUNT",
          value: 15,
          startsAt: null,
          endsAt: null,
          isActive: true
        }
      ],
      now
    );

    expect(result.discountAmount).toBe(25);
    expect(result.appliedRuleIds).toEqual(["r1", "r2"]);
  });

  it("skips inactive and out-of-window rules", () => {
    const now = new Date("2026-02-16T10:00:00.000Z");
    const active = isRuleActiveNow(
      {
        startsAt: new Date("2026-02-16T09:00:00.000Z"),
        endsAt: new Date("2026-02-16T11:00:00.000Z"),
        isActive: true
      },
      now
    );
    const inactive = isRuleActiveNow(
      {
        startsAt: new Date("2026-02-16T11:00:00.000Z"),
        endsAt: null,
        isActive: true
      },
      now
    );

    expect(active).toBe(true);
    expect(inactive).toBe(false);
  });
});
