import { and, eq, isNull } from "drizzle-orm";
import type { SemaphorePayEngine } from "../database/index";
import { upsertInvoiceRecord } from "../invoice/invoice.service";

export async function processNombaEvent(
  engine: SemaphorePayEngine<any>,
  payload: Record<string, any>,
) {
  const schema = engine.schema;
  const requestId = payload.requestId;
  const eventType = payload.event;
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
    const reference = data?.merchantTxRef ?? data?.orderReference;
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
        await handlePaymentSuccess(engine, subscription, data);
      } else {
        console.error(
          `Received payment for unknown transaction reference: ${data?.merchantTxRef ?? data?.orderReference}`,
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
) {
  const schema = engine.schema;
  const reference = data?.merchantTxRef ?? data?.orderReference;

  if (!reference) return;

  await upsertInvoiceRecord(engine, {
    collectionId: subscription.collectionId,
    customerId: subscription.customerId,
    subscriptionId: subscription.id,
    amount: data.amount,
    currency: data.currency || "NGN",
    nombaTransactionId: reference,
    status: "paid",
  });

  // Save tokenized card data if present — needed for recurring billing
  const tokenizedCards = data?.tokenizedCardData as
    | Array<{ tokenKey: string; cardType?: string; cardBrand?: string; last4?: string; expiryMonth?: number; expiryYear?: number }>
    | undefined;

  if (tokenizedCards?.length) {
    for (const card of tokenizedCards) {
      if (!card.tokenKey) continue;

      // Check if this token is already saved
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

      // Link the payment method to the subscription
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
      updatedAt: now,
    })
    .where(eq(schema.subscription.id, subscription.id));

  if (plan?.interval !== "none" && plan?.interval !== "yearly") {
    await resetEntitlementBalances(engine, subscription.id, now);
  }
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