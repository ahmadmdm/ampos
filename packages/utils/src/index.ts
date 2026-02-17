export function makeCorrelationId(prefix = "req"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function toBps(amount: number): number {
  return Math.round(amount * 100);
}

export function fromBps(bps: number): number {
  return bps / 100;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export { t, setLocale, getLocale, registerTranslations } from "./i18n";
export type { Locale } from "./i18n";
