export type PaymentProviderName = "moyasar" | "tap";

export interface PaymentSessionInput {
  branchId: string;
  amount: number;
  currency: string;
  returnUrl: string;
  metadata: Record<string, string>;
}

export interface WebhookEvent {
  eventId: string;
  externalRef: string;
  status: "CONFIRMED" | "FAILED" | "PENDING";
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

export interface PaymentProvider {
  name: PaymentProviderName;
  createSession(input: PaymentSessionInput): Promise<{ sessionId: string; checkoutUrl: string; externalRef: string }>;
  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean;
  parseWebhookEvent(rawBody: string): WebhookEvent;
}
