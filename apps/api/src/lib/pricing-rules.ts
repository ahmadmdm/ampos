import { PricingRule } from "@prisma/client";

export interface PricingRuleEvaluation {
  discountAmount: number;
  appliedRuleIds: string[];
}

type NumericLike = number | { toString(): string };
type PricingRuleLike = Pick<PricingRule, "id" | "kind" | "startsAt" | "endsAt" | "isActive"> & {
  value: NumericLike;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isRuleActiveNow(
  rule: Pick<PricingRule, "startsAt" | "endsAt" | "isActive">,
  now = new Date()
): boolean {
  if (!rule.isActive) return false;
  if (rule.startsAt && rule.startsAt.getTime() > now.getTime()) return false;
  if (rule.endsAt && rule.endsAt.getTime() < now.getTime()) return false;
  return true;
}

export function evaluatePricingRules(
  subtotal: number,
  rules: PricingRuleLike[],
  now = new Date()
): PricingRuleEvaluation {
  if (subtotal <= 0) return { discountAmount: 0, appliedRuleIds: [] };

  let discount = 0;
  const appliedRuleIds: string[] = [];

  for (const rule of rules) {
    if (!isRuleActiveNow(rule, now)) continue;
    const value = Number(rule.value);
    if (!Number.isFinite(value) || value <= 0) continue;

    if (rule.kind === "FIXED_DISCOUNT") {
      discount += value;
      appliedRuleIds.push(rule.id);
      continue;
    }

    if (rule.kind === "PERCENT_DISCOUNT") {
      discount += (subtotal * value) / 100;
      appliedRuleIds.push(rule.id);
    }
  }

  const discountAmount = round2(Math.min(discount, subtotal));
  return { discountAmount, appliedRuleIds };
}
