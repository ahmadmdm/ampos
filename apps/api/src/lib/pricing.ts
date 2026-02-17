export interface TotalsInput {
  subtotal: number;
  taxRateBps: number;
  serviceChargeBps: number;
  discountAmount?: number;
}

export interface Totals {
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
  discountAmount: number;
  totalAmount: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeTotals(input: TotalsInput): Totals {
  const subtotal = round2(input.subtotal);
  const discountAmount = round2(input.discountAmount ?? 0);
  const taxableAmount = round2(Math.max(subtotal - discountAmount, 0));
  const taxAmount = round2((taxableAmount * input.taxRateBps) / 10000);
  const serviceCharge = round2((taxableAmount * input.serviceChargeBps) / 10000);
  const totalAmount = round2(Math.max(taxableAmount + taxAmount + serviceCharge, 0));

  return {
    subtotal,
    taxAmount,
    serviceCharge,
    discountAmount,
    totalAmount
  };
}
