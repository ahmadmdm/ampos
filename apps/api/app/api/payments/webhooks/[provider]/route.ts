import { fail, ok } from "@/src/lib/http";
import { getProvider } from "@/src/payments/registry";
import { processConfirmedPayment } from "@/src/payments/service";
import { webhookQueue } from "@/src/queue/webhook-queue";
import { prisma } from "@/src/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await params;
  const rawBody = await req.text();
  const provider = getProvider(providerName);
  const hdrs = Object.fromEntries(
    Array.from(req.headers.entries()).map(([k, v]) => [k.toLowerCase(), v])
  );

  if (!provider.verifyWebhookSignature(rawBody, hdrs)) {
    return fail("INVALID_SIGNATURE", 401);
  }

  const evt = provider.parseWebhookEvent(rawBody);
  if (!evt.externalRef || !evt.eventId) {
    return fail("INVALID_WEBHOOK_EVENT", 400);
  }

  let organizationId = evt.metadata?.organizationId;
  let branchId = evt.metadata?.branchId;
  if (!organizationId || !branchId) {
    const payment = await prisma.payment.findUnique({
      where: {
        provider_externalRef: {
          provider: provider.name,
          externalRef: evt.externalRef
        }
      }
    });
    if (!payment) return fail("MISSING_TENANT_METADATA", 400);
    organizationId = payment.organizationId;
    branchId = payment.branchId;
  }

  const payload = {
    provider: provider.name,
    organizationId,
    branchId,
    eventId: evt.eventId,
    externalRef: evt.externalRef,
    status: evt.status,
    amount: evt.amount,
    currency: evt.currency,
    metadata: evt.metadata
  };

  if (webhookQueue) {
    await webhookQueue.add("confirm-payment", payload, {
      jobId: `${provider.name}:${evt.eventId}`,
      removeOnComplete: 1000,
      removeOnFail: 1000
    });
    return ok({ queued: true, eventId: evt.eventId });
  }

  const result = await processConfirmedPayment(payload);

  return ok(result);
}
