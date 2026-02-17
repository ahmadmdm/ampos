import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { MoyasarProvider } from "../payments/providers";

function hmac(secret: string, value: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

describe("payment provider signature", () => {
  it("accepts valid timestamped signature", () => {
    process.env.MOYASAR_WEBHOOK_SECRET = "abc";
    const provider = new MoyasarProvider();
    const body = JSON.stringify({ amount: 10 });
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = hmac("abc", `${ts}.${body}`);

    expect(
      provider.verifyWebhookSignature(body, {
        "x-moyasar-signature": sig,
        "x-moyasar-timestamp": ts
      })
    ).toBe(true);
  });

  it("rejects stale timestamp", () => {
    process.env.MOYASAR_WEBHOOK_SECRET = "abc";
    const provider = new MoyasarProvider();
    const body = JSON.stringify({ amount: 10 });
    const ts = String(Math.floor(Date.now() / 1000) - 3600);
    const sig = hmac("abc", `${ts}.${body}`);

    expect(
      provider.verifyWebhookSignature(body, {
        "x-moyasar-signature": sig,
        "x-moyasar-timestamp": ts
      })
    ).toBe(false);
  });

  it("normalizes provider status values", () => {
    const provider = new MoyasarProvider();
    const confirmed = provider.parseWebhookEvent(
      JSON.stringify({ id: "e1", externalRef: "r1", status: "paid", amount: 10, currency: "SAR" })
    );
    const failed = provider.parseWebhookEvent(
      JSON.stringify({ id: "e2", externalRef: "r2", status: "declined", amount: 10, currency: "SAR" })
    );

    expect(confirmed.status).toBe("CONFIRMED");
    expect(failed.status).toBe("FAILED");
  });
});
