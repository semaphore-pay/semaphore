import { and, eq, lte, inArray, isNull, gte } from "drizzle-orm";
import type { SemaphorePayEngine } from "./database/index";

const MAX_RETRY_ATTEMPTS = 3;

export type ChargeFn = (input: {
  tokenKey: string;
  amount: number;
  currency: string;
  orderReference: string;
}) => Promise<{ success: boolean; status?: string }>;

export interface CronResult {
  success: boolean;
  processedAt: Date;
  cancellationsExecuted: number;
  accountsFlaggedPastDue: number;
  trialsEnded: number;
  renewalsQueued: number;
  paymentRetriesAttempted: number;
  paymentRetriesSucceeded: number;
  paymentRetriesFailed: number;
  subscriptionsCanceledAfterRetries: number;
}

export async function runSemaphorePayCron(
  engine: SemaphorePayEngine<any>,
  chargeFn?: ChargeFn,
): Promise<CronResult> {
  const schema = engine.schema;
  const now = new Date();

  return await engine.transaction(async (tx: any) => {
    // 1. Cancel expired subscriptions (cancelAtPeriodEnd)
    const expiredCancellations = await tx
      .update(schema.subscription)
      .set({
        status: "canceled",
        endedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          inArray(schema.subscription.status, ["active", "past_due", "trialing"]),
          eq(schema.subscription.cancelAtPeriodEnd, true),
          lte(schema.subscription.currentPeriodEndAt, now)
        )
      )
      .returning({ id: schema.subscription.id });

    // 2. Flag past-due accounts (active → past_due when period expired)
    const pastDueAccounts = await tx
      .update(schema.subscription)
      .set({
        status: "past_due",
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.subscription.status, "active"),
          eq(schema.subscription.cancelAtPeriodEnd, false),
          lte(schema.subscription.currentPeriodEndAt, now)
        )
      )
      .returning({ id: schema.subscription.id });

    // 3. End expired trials (trialing → past_due)
    const trialEnded = await tx
      .update(schema.subscription)
      .set({
        status: "past_due",
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.subscription.status, "trialing"),
          lte(schema.subscription.trialEndAt, now)
        )
      )
      .returning({ id: schema.subscription.id });

    // 4. Queue renewals (create pending invoices for active subs due for renewal)
    const dueRenewals = await tx.query.subscription.findMany({
      where: and(
        eq(schema.subscription.status, "active"),
        eq(schema.subscription.cancelAtPeriodEnd, false),
        lte(schema.subscription.currentPeriodEndAt, now)
      ),
      with: {
        plan: true,
        customer: true,
      },
    });

    for (const sub of dueRenewals) {
      if (!sub.plan || sub.plan.interval === "none") continue;

      const amount = sub.plan.priceAmount;
      const currency = sub.plan.priceCurrency;

      if (sub.customer.nombaCustomerId) {
        await tx.insert(schema.invoice).values({
          id: crypto.randomUUID(),
          collectionId: sub.collectionId,
          customerId: sub.customerId,
          subscriptionId: sub.id,
          type: "renewal",
          status: "pending",
          amount,
          currency,
          periodStartAt: sub.currentPeriodEndAt,
          periodEndAt: new Date(now.getTime() + (sub.plan.interval === "monthly" ? 30 : 365) * 24 * 60 * 60 * 1000),
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 5. Retry failed payments for past_due subscriptions
    let paymentRetriesAttempted = 0;
    let paymentRetriesSucceeded = 0;
    let paymentRetriesFailed = 0;
    let subscriptionsCanceledAfterRetries = 0;

    if (chargeFn) {
      const retryableSubscriptions = await tx.query.subscription.findMany({
        where: and(
          eq(schema.subscription.status, "past_due"),
          lte(schema.subscription.nextRetryAt, now),
          lte(schema.subscription.retryCount, MAX_RETRY_ATTEMPTS - 1),
        ),
        with: {
          plan: true,
          customer: true,
        },
      });

      for (const sub of retryableSubscriptions) {
        if (!sub.plan || sub.plan.interval === "none") continue;
        if (!sub.nombaPaymentMethodId) continue;

        paymentRetriesAttempted++;
        const amount = sub.plan.priceAmount;
        const currency = sub.plan.priceCurrency ?? "NGN";

        try {
          const result = await chargeFn({
            tokenKey: sub.nombaPaymentMethodId,
            amount,
            currency,
            orderReference: `retry_${sub.id}_${now.getTime()}`,
          });

          if (result.success) {
            paymentRetriesSucceeded++;
            // Payment succeeded — reactivate subscription
            const periodEndAt = sub.plan.interval === "monthly"
              ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
              : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

            await tx
              .update(schema.subscription)
              .set({
                status: "active",
                retryCount: 0,
                lastRetryAt: null,
                nextRetryAt: null,
                currentPeriodStartAt: now,
                currentPeriodEndAt: periodEndAt,
                updatedAt: now,
              })
              .where(eq(schema.subscription.id, sub.id));
          } else {
            await handleRetryFailure(tx, schema, sub, now);
            paymentRetriesFailed++;
          }
        } catch {
          await handleRetryFailure(tx, schema, sub, now);
          paymentRetriesFailed++;
        }
      }

      // 6. Cancel subscriptions that exhausted all retries
      const exhaustedRetries = await tx
        .update(schema.subscription)
        .set({
          status: "canceled",
          canceledAt: now,
          endedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.subscription.status, "past_due"),
            gte(schema.subscription.retryCount, MAX_RETRY_ATTEMPTS),
          )
        )
        .returning({ id: schema.subscription.id });

      subscriptionsCanceledAfterRetries = exhaustedRetries.length;
    }

    return {
      success: true,
      processedAt: now,
      cancellationsExecuted: expiredCancellations.length,
      accountsFlaggedPastDue: pastDueAccounts.length,
      trialsEnded: trialEnded.length,
      renewalsQueued: dueRenewals.length,
      paymentRetriesAttempted,
      paymentRetriesSucceeded,
      paymentRetriesFailed,
      subscriptionsCanceledAfterRetries,
    };
  });
}

async function handleRetryFailure(
  tx: any,
  schema: any,
  sub: any,
  now: Date,
) {
  const maxRetries = MAX_RETRY_ATTEMPTS;
  const currentRetryCount = (sub.retryCount ?? 0) + 1;
  const backoffDays = currentRetryCount === 1 ? 1 : currentRetryCount === 2 ? 3 : 7;
  const nextRetryAt = new Date(now.getTime() + backoffDays * 24 * 60 * 60 * 1000);

  if (currentRetryCount >= maxRetries) {
    await tx
      .update(schema.subscription)
      .set({
        status: "canceled",
        canceledAt: now,
        endedAt: now,
        retryCount: currentRetryCount,
        lastRetryAt: now,
        nextRetryAt: null,
        updatedAt: now,
      })
      .where(eq(schema.subscription.id, sub.id));
  } else {
    await tx
      .update(schema.subscription)
      .set({
        retryCount: currentRetryCount,
        lastRetryAt: now,
        nextRetryAt,
        updatedAt: now,
      })
      .where(eq(schema.subscription.id, sub.id));
  }
}
