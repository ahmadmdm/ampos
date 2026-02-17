/**
 * Compute the effective price of a product after any product-level discount.
 */
export function computeProductEffectivePrice(product: {
  basePrice: number;
  discountType?: string | null;
  discountValue?: number | null;
  discountValidUntil?: Date | string | null;
}): { effectivePrice: number; discountApplied: number } {
  const base = Number(product.basePrice);

  if (!product.discountType || product.discountValue == null) {
    return { effectivePrice: base, discountApplied: 0 };
  }

  // Check validity
  if (product.discountValidUntil) {
    const until = new Date(product.discountValidUntil);
    if (until < new Date()) {
      return { effectivePrice: base, discountApplied: 0 };
    }
  }

  let discount: number;
  if (product.discountType === "PERCENTAGE") {
    discount = (base * Number(product.discountValue)) / 10000; // bps
  } else {
    discount = Number(product.discountValue);
  }

  discount = Math.min(discount, base); // Can't exceed price
  discount = Math.round(discount * 100) / 100;

  return {
    effectivePrice: Math.round((base - discount) * 100) / 100,
    discountApplied: discount,
  };
}
