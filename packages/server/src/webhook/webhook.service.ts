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

  if (eventType === "payment_success") {
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
      updatedAt: now,
    })
    .where(eq(schema.subscription.id, subscription.id));

  if (plan?.interval !== "none" && plan?.interval !== "yearly") {
    await resetEntitlementBalances(engine, subscription.id, now);
  }
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