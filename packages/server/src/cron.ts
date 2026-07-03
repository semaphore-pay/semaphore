import { and, eq, lte, inArray } from "drizzle-orm";
import type { SemaphorePayEngine } from "./database/index";

export async function runSemaphorePayCron(engine: SemaphorePayEngine<any>) {
  const schema = engine.schema;
  const now = new Date();

  return await engine.transaction(async (tx: any) => {
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
      .returning({ id: schema.subscription.id, customerId: schema.subscription.customerId, planId: schema.subscription.planId });

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

    return {
      success: true,
      processedAt: now,
      cancellationsExecuted: expiredCancellations.length,
      accountsFlaggedPastDue: pastDueAccounts.length,
      trialsEnded: trialEnded.length,
      renewalsQueued: dueRenewals.length,
    };
  });
}