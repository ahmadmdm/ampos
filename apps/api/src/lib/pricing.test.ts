import { describe, expect, it } from "vitest";
import { computeTotals } from "./pricing";

describe("computeTotals", () => {
  it("computes basic totals without discount", () => {
    const result = computeTotals({
      subtotal: 100,
      taxRateBps: 1500, // 15%
      serviceChargeBps: 0,
    });
    expect(result.subtotal).toBe(100);
    expect(result.discountAmount).toBe(0);
    expect(result.taxAmount).toBe(15);
    expect(result.serviceCharge).toBe(0);
    expect(result.totalAmount).toBe(115);
  });

  it("applies tax AFTER discount (ZATCA-compliant)", () => {
    const result = computeTotals({
      subtotal: 100,
      taxRateBps: 1500, // 15%
      serviceChargeBps: 0,
      discountAmount: 20,
    });
    // Taxable = 100 - 20 = 80
    // Tax = 80 * 15% = 12
    expect(result.taxAmount).toBe(12);
    expect(result.totalAmount).toBe(92); // 80 + 12
  });

  it("applies service charge on post-discount amount", () => {
    const result = computeTotals({
      subtotal: 200,
      taxRateBps: 1500,
      serviceChargeBps: 1000, // 10%
      discountAmount: 50,
    });
    // Taxable = 200 - 50 = 150
    // Tax = 150 * 15% = 22.5
    // Service = 150 * 10% = 15
    expect(result.taxAmount).toBe(22.5);
    expect(result.serviceCharge).toBe(15);
    expect(result.totalAmount).toBe(187.5); // 150 + 22.5 + 15
  });

  it("handles zero subtotal", () => {
    const result = computeTotals({
      subtotal: 0,
      taxRateBps: 1500,
      serviceChargeBps: 500,
    });
    expect(result.totalAmount).toBe(0);
  });

  it("does not produce negative total when discount exceeds subtotal", () => {
    const result = computeTotals({
      subtotal: 50,
      taxRateBps: 1500,
      serviceChargeBps: 0,
      discountAmount: 100,
    });
    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(0);
  });

  it("rounds to 2 decimal places", () => {
    const result = computeTotals({
      subtotal: 33.33,
      taxRateBps: 1500,
      serviceChargeBps: 0,
    });
    // 33.33 * 15% = 5.0  (rounded)
    expect(result.taxAmount).toBe(5);
    expect(result.totalAmount).toBe(38.33);
  });
});
