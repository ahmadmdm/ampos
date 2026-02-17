import crypto from "node:crypto";
import type { PaymentProvider, PaymentSessionInput, WebhookEvent } from "./types";

function signHmac(secret: string, value: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function isRecentTimestamp(raw: string | undefined, windowSec = 300): boolean {
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return Math.abs(nowSec - ts) <= windowSec;
}

function normalizeWebhookStatus(raw: unknown): WebhookEvent["status"] {
  const value = String(raw ?? "").trim().toUpperCase();
  if (["CONFIRMED", "SUCCESS", "SUCCEEDED", "CAPTURED", "PAID"].includes(value)) {
    return "CONFIRMED";
  }
  if (["FAILED", "FAILURE", "DECLINED", "CANCELLED", "CANCELED"].includes(value)) {
    return "FAILED";
  }
  return "PENDING";
}

export class MoyasarProvider implements PaymentProvider {
  name = "moyasar" as const;

  async createSession(input: PaymentSessionInput) {
    const externalRef = `moy_${Date.now()}`;
    return {
      sessionId: externalRef,
      externalRef,
      checkoutUrl: `${input.returnUrl}?provider=moyasar&session=${externalRef}`
    };
  }

  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    const secret = process.env.MOYASAR_WEBHOOK_SECRET ?? "dev_secret";
    const signature = headers["x-moyasar-signature"] ?? "";
    const timestamp = headers["x-moyasar-timestamp"];
    const validTimestamp = isRecentTimestamp(timestamp);
    if (timestamp && !validTimestamp) return false;
    const expectedWithTimestamp = timestamp ? signHmac(secret, `${timestamp}.${rawBody}`) : "";
    const expectedLegacy = signHmac(secret, rawBody);

    if (validTimestamp && signature === expectedWithTimestamp) return true;
    return signature === expectedLegacy;
  }

  parseWebhookEvent(rawBody: string): WebhookEvent {
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    return {
      eventId: String(body.eventId ?? body.id ?? `evt_${Date.now()}`),
      externalRef: String(body.externalRef ?? body.reference ?? "unknown"),
      status: normalizeWebhookStatus(body.status),
      amount: Number(body.amount ?? 0),
      currency: String(body.currency ?? "SAR"),
      metadata: (body.metadata as Record<string, string>) ?? {}
    };
  }
}

export class TapProvider implements PaymentProvider {
  name = "tap" as const;

  async createSession(input: PaymentSessionInput) {
    const externalRef = `tap_${Date.now()}`;
    return {
      sessionId: externalRef,
      externalRef,
      checkoutUrl: `${input.returnUrl}?provider=tap&session=${externalRef}`
    };
  }

  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    const secret = process.env.TAP_WEBHOOK_SECRET ?? "dev_secret";
    const signature = headers["x-tap-signature"] ?? "";
    const timestamp = headers["x-tap-timestamp"];
    const validTimestamp = isRecentTimestamp(timestamp);
    if (timestamp && !validTimestamp) return false;
    const expectedWithTimestamp = timestamp ? signHmac(secret, `${timestamp}.${rawBody}`) : "";
    const expectedLegacy = signHmac(secret, rawBody);

    if (validTimestamp && signature === expectedWithTimestamp) return true;
    return signature === expectedLegacy;
  }

  parseWebhookEvent(rawBody: string): WebhookEvent {
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    return {
      eventId: String(body.eventId ?? body.id ?? `evt_${Date.now()}`),
      externalRef: String(body.externalRef ?? body.reference ?? "unknown"),
      status: normalizeWebhookStatus(body.status),
      amount: Number(body.amount ?? 0),
      currency: String(body.currency ?? "SAR"),
      metadata: (body.metadata as Record<string, string>) ?? {}
    };
  }
}
