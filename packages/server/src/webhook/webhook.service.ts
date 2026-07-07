import { and, eq, isNull } from "drizzle-orm";
import type { SemaphorePayEngine } from "../database/index";
import type { NombaTransactionClient } from "../nomba/nomba.transactions";
import { upsertInvoiceRecord } from "../invoice/invoice.service";

export interface WebhookContext {
  /** Nomba client for transaction verification. */
  nomba?: {
    transactions: NombaTransactionClient;
  };
}

export async function processNombaEvent(
  engine: SemaphorePayEngine<any>,
  payload: Record<string, any>,
  context: WebhookContext = {},
) {
  const schema = engine.schema;
  const requestId = payload.requestId;
  const eventType = payload.event_type ?? payload.event;
  const data = payload.data;

  if (!requestId || !eventType) {
    throw new Error("Invalid payload structure: missing requestId or event type.");
  }

  const existingEvent = await engine.db.query.webhookEvent.findFirst({
    where: eq(schema.webhookEvent.nombaEventId, requestId),
  });

  if (existingEvent) {
    return { status: "ignored", reason: "duplicate_request_id" };
  }

  let collectionId: string | null = null;
  let subscription: any | null = null;

  if (eventType === "payment_success" || eventType === "payment_failed") {
    const reference = data?.order?.orderReference ?? data?.merchantTxRef ?? data?.orderReference;
    if (reference) {
      subscription = await engine.db.query.subscription.findFirst({
        where: eq(schema.subscription.nombaOrderReference, reference),
      });
      collectionId = subscription?.collectionId ?? null;
    }
  }

  await engine.db.insert(schema.webhookEvent).values({
    id: crypto.randomUUID(),
    nombaEventId: requestId,
    type: eventType,
    collectionId,
    payload,
    status: "processed",
    receivedAt: new Date(),
    processedAt: new Date(),
  });

  switch (eventType) {
    case "payment_success":
      if (subscription) {
        await handlePaymentSuccess(engine, subscription, data, context);
      } else {
        console.error(
          `Received payment for unknown transaction reference: ${data?.order?.orderReference ?? data?.merchantTxRef ?? data?.orderReference}`,
        );
      }
      break;
    case "payment_failed":
      if (subscription) {
        await handlePaymentFailed(engine, subscription, data);
      }
      break;
    case "mandate.debit_success":
      break;
    default:
      console.log(`Unhandled Nomba event type: ${eventType}`);
  }

  return { status: "processed" };
}

async function handlePaymentSuccess(
  engine: SemaphorePayEngine<any>,
  subscription: any,
  data: Record<string, any>,
  context: WebhookContext,
) {
  const reference = data?.order?.orderReference ?? data?.merchantTxRef ?? data?.orderReference;
  if (!reference) return;

  // Verify transaction server-side before activating
  if (context.nomba) {
    try {
      const verification = await context.nomba.transactions.fetchSingle({
        orderReference: reference,
      });
      if (verification.status !== "SUCCESS") {
        console.error(`Transaction verification failed for ${reference}: status=${verification.status}`);
        return;
      }
    } catch (err) {
      console.error(`Transaction verification error for ${reference}:`, err);
      // Continue anyway — webhook is the source of truth, verification is defense-in-depth
    }
  }

  const amount = data?.order?.amount ?? data?.transaction?.transactionAmount ?? data.amount;
  const currency = data?.order?.currency ?? data?.currency ?? "NGN";

  await processSuccessfulPayment(engine, {
    orderReference: reference,
    subscriptionId: subscription.id,
    amount,
    currency,
    tokenizedCards: data?.tokenizedCardData,
  });
}

/**
 * Process a successful payment for a subscription.
 * Shared by webhook handler and the verify endpoint.
 * Idempotent — checks invoice table before processing.
 *
 * @returns `{ processed: true }` if payment was activated, `{ alreadyProcessed: true }` if already handled.
 */
export async function processSuccessfulPayment(
  engine: SemaphorePayEngine<any>,
  input: {
    orderReference: string;
    subscriptionId: string;
    amount: number;
    currency?: string;
    tokenizedCards?: Array<{ tokenKey: string; cardType?: string; cardBrand?: string; last4?: string; expiryMonth?: number; expiryYear?: number }>;
  },
): Promise<{ processed: boolean; alreadyProcessed: boolean }> {
  const schema = engine.schema;

  // Idempotency: check if invoice already paid for this reference
  const existingInvoice = await engine.db.query.invoice.findFirst({
    where: and(
      eq(schema.invoice.nombaTransactionId, input.orderReference),
      eq(schema.invoice.status, "paid"),
    ),
  });

  if (existingInvoice) {
    return { processed: false, alreadyProcessed: true };
  }

  const subscription = await engine.db.query.subscription.findFirst({
    where: eq(schema.subscription.id, input.subscriptionId),
  });

  if (!subscription) {
    return { processed: false, alreadyProcessed: false };
  }

  const amount = input.amount;
  const currency = input.currency ?? "NGN";

  await upsertInvoiceRecord(engine, {
    collectionId: subscription.collectionId,
    customerId: subscription.customerId,
    subscriptionId: subscription.id,
    amount,
    currency,
    nombaTransactionId: input.orderReference,
    status: "paid",
  });

  // Save tokenized card data if present — needed for recurring billing
  if (input.tokenizedCards?.length) {
    for (const card of input.tokenizedCards) {
      if (!card.tokenKey) continue;

      const existing = await engine.db.query.paymentMethod.findFirst({
        where: eq(schema.paymentMethod.nombaTokenId, card.tokenKey),
      });

      if (!existing) {
        await engine.db.insert(schema.paymentMethod).values({
          id: crypto.randomUUID(),
          customerId: subscription.customerId,
          nombaTokenId: card.tokenKey,
          type: card.cardType ?? null,
          brand: card.cardBrand ?? null,
          last4: card.last4 ?? null,
          expiryMonth: card.expiryMonth ?? null,
          expiryYear: card.expiryYear ?? null,
          isDefault: true,
        });
      }

      if (!subscription.nombaPaymentMethodId) {
        await engine.db
          .update(schema.subscription)
          .set({ nombaPaymentMethodId: card.tokenKey, updatedAt: new Date() })
          .where(eq(schema.subscription.id, subscription.id));
      }
    }
  }

  const plan = await engine.db.query.plan.findFirst({
    where: eq(schema.plan.id, subscription.planId),
  });

  const now = new Date();
  const periodEndAt = plan?.interval === "none"
    ? null
    : new Date(now.getTime() + (plan?.interval === "monthly" ? 30 : 365) * 24 * 60 * 60 * 1000);

  await engine.db
    .update(schema.subscription)
    .set({
      status: "active",
      startedAt: now,
      currentPeriodStartAt: now,
      currentPeriodEndAt: periodEndAt,
      trialEndAt: null,
      retryCount: 0,
      lastRetryAt: null,
      nextRetryAt: null,
      updatedAt: now,
    })
    .where(eq(schema.subscription.id, subscription.id));

  if (plan?.interval !== "none" && plan?.interval !== "yearly") {
    await resetEntitlementBalances(engine, subscription.id, now);
  }

  return { processed: true, alreadyProcessed: false };
}

async function handlePaymentFailed(
  engine: SemaphorePayEngine<any>,
  subscription: any,
  data: Record<string, any>,
) {
  const schema = engine.schema;
  const now = new Date();
  const maxRetries = 3;

  // Increment retry count and schedule next retry with exponential backoff
  const currentRetryCount = (subscription.retryCount ?? 0) + 1;
  const backoffDays = currentRetryCount === 1 ? 1 : currentRetryCount === 2 ? 3 : 7;
  const nextRetryAt = new Date(now.getTime() + backoffDays * 24 * 60 * 60 * 1000);

  if (currentRetryCount >= maxRetries) {
    // Max retries reached — cancel the subscription
    await engine.db
      .update(schema.subscription)
      .set({
        status: "canceled",
        canceledAt: now,
        endedAt: now,
        retryCount: currentRetryCount,
        lastRetryAt: now,
        updatedAt: now,
      })
      .where(eq(schema.subscription.id, subscription.id));
  } else {
    // Schedule next retry
    await engine.db
      .update(schema.subscription)
      .set({
        status: "past_due",
        retryCount: currentRetryCount,
        lastRetryAt: now,
        nextRetryAt,
        updatedAt: now,
      })
      .where(eq(schema.subscription.id, subscription.id));
  }

  // Record the failed invoice
  await upsertInvoiceRecord(engine, {
    collectionId: subscription.collectionId,
    customerId: subscription.customerId,
    subscriptionId: subscription.id,
    amount: data.amount,
    currency: data.currency || "NGN",
    nombaTransactionId: data?.merchantTxRef ?? data?.orderReference,
    status: "failed",
  });
}

async function resetEntitlementBalances(
  engine: SemaphorePayEngine<any>,
  subscriptionId: string,
  now: Date,
) {
  const schema = engine.schema;
  const entitlements = await engine.db.query.entitlement.findMany({
    where: and(
      eq(schema.entitlement.subscriptionId, subscriptionId),
      eq(schema.entitlement.sourceType, "subscription")
    ),
  });

  for (const ent of entitlements) {
    if (ent.limit !== null && ent.limit > 0) {
      await engine.db
        .update(schema.entitlement)
        .set({
          balance: ent.limit,
          nextResetAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: now,
        })
        .where(eq(schema.entitlement.id, ent.id));
    }
  }
}