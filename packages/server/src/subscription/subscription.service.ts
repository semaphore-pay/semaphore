import { and, desc, eq, inArray, isNull, or, sql, count } from "drizzle-orm";
import type { SemaphorePayEngine } from "../database/index";
import type {
  SubscribeToPlanInput,
  SubscribeToPlanResult,
  ListSubscriptionsInput,
  ListSubscriptionsResult,
  SubscriptionWithPlan,
} from "./subscription.types";

function getResetIntervalMs(resetInterval: string | null): number {
  if (!resetInterval) return 30 * 24 * 60 * 60 * 1000;
  switch (resetInterval) {
    case "day": return 24 * 60 * 60 * 1000;
    case "week": return 7 * 24 * 60 * 60 * 1000;
    case "month": return 30 * 24 * 60 * 60 * 1000;
    case "year": return 365 * 24 * 60 * 60 * 1000;
    default: return 30 * 24 * 60 * 60 * 1000;
  }
}

function getPeriodEndAt(interval: string, now: Date): Date | null {
  if (interval === "none") return null;
  if (interval === "test_15min") return new Date(now.getTime() + 15 * 60 * 1000);
  return new Date(now.getTime() + (interval === "monthly" ? 30 : 365) * 24 * 60 * 60 * 1000);
}

export async function subscribeToPlan(
  engine: SemaphorePayEngine<any>,
  input: SubscribeToPlanInput
): Promise<SubscribeToPlanResult> {
  const schema = engine.schema;

  return await engine.transaction(async (tx: any) => {
    const targetPlan = await tx.query.plan.findFirst({
      where: and(
        eq(schema.plan.id, input.planId),
        eq(schema.plan.collectionId, input.collectionId),
        eq(schema.plan.environment, input.environment),
      ),
    });

    if (!targetPlan) {
      throw new Error("Plan not found.");
    }

    if (!targetPlan.isActive) {
      throw new Error("Plan is not active.");
    }

    const targetCustomer = await tx.query.customer.findFirst({
      where: and(
        eq(schema.customer.id, input.customerId),
        eq(schema.customer.collectionId, input.collectionId),
      ),
    });

    if (!targetCustomer) {
      throw new Error("Customer not found.");
    }

    const activeSub = await tx.query.subscription.findFirst({
      where: and(
        eq(schema.subscription.customerId, input.customerId),
        eq(schema.subscription.collectionId, input.collectionId),
        inArray(schema.subscription.status, ["active", "trialing", "past_due"]),
        or(isNull(schema.subscription.endedAt), sql`${schema.subscription.endedAt} > ${new Date().toISOString()}`)
      ),
      orderBy: [desc(schema.subscription.createdAt)],
    });

    const isFreePlan = targetPlan.priceAmount === 0;
    const hasTrial = targetPlan.trialPeriodDays > 0 && targetPlan.interval !== "none" && targetPlan.interval !== "test_15min" && !isFreePlan;
    const subscriptionId = crypto.randomUUID();
    const orderReference = isFreePlan ? null : `ord_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = new Date();
    const trialEndAt = hasTrial ? new Date(now.getTime() + targetPlan.trialPeriodDays * 24 * 60 * 60 * 1000) : null;
    const periodEndAt = getPeriodEndAt(targetPlan.interval, now);

    await tx.insert(schema.subscription).values({
      id: subscriptionId,
      collectionId: input.collectionId,
      customerId: input.customerId,
      planId: targetPlan.id,
      status: isFreePlan ? "active" : hasTrial ? "trialing" : "pending_payment",
      nombaOrderReference: orderReference,
      startedAt: now,
      currentPeriodStartAt: now,
      currentPeriodEndAt: periodEndAt,
      trialEndAt,
    });

    const planFeatures = await tx.query.planFeature.findMany({
      where: eq(schema.planFeature.planId, targetPlan.id),
    });

    for (const feature of planFeatures) {
      const isBoolean = feature.limit === null;

      await tx.insert(schema.entitlement).values({
        id: crypto.randomUUID(),
        customerId: input.customerId,
        subscriptionId: subscriptionId,
        featureId: feature.featureId,
        balance: isBoolean ? null : feature.limit,
        limit: isBoolean ? null : feature.limit,
        nextResetAt: isBoolean || targetPlan.interval === "none" ? null : periodEndAt,
      });
    }

    if (activeSub && isFreePlan) {
      await tx
        .update(schema.subscription)
        .set({
          status: "canceled",
          endedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.subscription.id, activeSub.id));
    }

    return {
      subscriptionId,
      status: isFreePlan ? "active" : hasTrial ? "trialing" : "pending_payment",
      nombaOrderReference: orderReference,
      trialEndAt,
    };
  });
}

export async function cancelSubscription(
  engine: SemaphorePayEngine<any>,
  subscriptionId: string,
  collectionId?: string
): Promise<void> {
  const schema = engine.schema;

  await engine.db
    .update(schema.subscription)
    .set({
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      collectionId
        ? and(
            eq(schema.subscription.id, subscriptionId),
            eq(schema.subscription.collectionId, collectionId),
          )
        : eq(schema.subscription.id, subscriptionId),
    );
}

export async function getSubscription(
  engine: SemaphorePayEngine<any>,
  input: { subscriptionId: string; collectionId: string }
): Promise<SubscriptionWithPlan | null> {
  const schema = engine.schema;

  const sub = await engine.db.query.subscription.findFirst({
    where: and(
      eq(schema.subscription.id, input.subscriptionId),
      eq(schema.subscription.collectionId, input.collectionId),
    ),
  });

  if (!sub) return null;

  const plan = sub.planId
    ? await engine.db.query.plan.findFirst({
        where: and(
          eq(schema.plan.id, sub.planId),
          eq(schema.plan.collectionId, input.collectionId),
        ),
      })
    : null;

  return {
    ...sub,
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          priceAmount: plan.priceAmount,
          priceCurrency: plan.priceCurrency,
          interval: plan.interval,
          trialPeriodDays: plan.trialPeriodDays,
          badge: plan.badge,
          ctaText: plan.ctaText,
          sortOrder: plan.sortOrder,
          isActive: plan.isActive,
        }
      : null,
  } as SubscriptionWithPlan;
}

export async function listSubscriptions(
  engine: SemaphorePayEngine<any>,
  input: ListSubscriptionsInput
): Promise<ListSubscriptionsResult> {
  const schema = engine.schema;

  const conditions = [
    eq(schema.subscription.collectionId, input.collectionId),
  ];

  if (input.status) {
    conditions.push(eq(schema.subscription.status, input.status));
  }
  if (input.planId) {
    conditions.push(eq(schema.subscription.planId, input.planId));
  }
  if (input.customerId) {
    conditions.push(eq(schema.subscription.customerId, input.customerId));
  }

  const whereClause = and(...conditions);

  const [totalResult] = await engine.db
    .select({ value: count() })
    .from(schema.subscription)
    .where(whereClause);

  const total = totalResult?.value ?? 0;

  const subs = await engine.db
    .select()
    .from(schema.subscription)
    .where(whereClause)
    .orderBy(desc(schema.subscription.createdAt))
    .limit(input.limit ?? 50)
    .offset(input.offset ?? 0);

  const planIds = [...new Set(subs.map((s: any) => s.planId).filter(Boolean))] as string[];
  const plans: any[] =
    planIds.length > 0
      ? await engine.db
          .select()
          .from(schema.plan)
          .where(
            and(
              inArray(schema.plan.id, planIds),
              eq(schema.plan.collectionId, input.collectionId),
            )
          )
      : [];

  const planMap = new Map<string, any>(plans.map((p: any) => [p.id, p]));

  const subscriptions: SubscriptionWithPlan[] = subs.map((sub: any) => {
    const plan = planMap.get(sub.planId);
    return {
      ...sub,
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            priceAmount: plan.priceAmount,
            priceCurrency: plan.priceCurrency,
            interval: plan.interval,
            trialPeriodDays: plan.trialPeriodDays,
            badge: plan.badge,
            ctaText: plan.ctaText,
            sortOrder: plan.sortOrder,
            isActive: plan.isActive,
          }
        : null,
    } as SubscriptionWithPlan;
  });

  return { subscriptions, total };
}

export async function pauseSubscription(
  engine: SemaphorePayEngine<any>,
  input: { subscriptionId: string; collectionId: string }
): Promise<SubscriptionWithPlan | null> {
  const schema = engine.schema;

  const sub = await engine.db.query.subscription.findFirst({
    where: and(
      eq(schema.subscription.id, input.subscriptionId),
      eq(schema.subscription.collectionId, input.collectionId),
    ),
  });

  if (!sub) {
    throw new Error("Subscription not found.");
  }

  if (sub.status !== "active" && sub.status !== "trialing") {
    throw new Error("Only active or trialing subscriptions can be paused.");
  }

  const now = new Date();

  await engine.db
    .update(schema.subscription)
    .set({
      status: "paused",
      updatedAt: now,
    })
    .where(eq(schema.subscription.id, input.subscriptionId));

  return getSubscription(engine, input);
}

export async function resumeSubscription(
  engine: SemaphorePayEngine<any>,
  input: { subscriptionId: string; collectionId: string }
): Promise<SubscriptionWithPlan | null> {
  const schema = engine.schema;

  const sub = await engine.db.query.subscription.findFirst({
    where: and(
      eq(schema.subscription.id, input.subscriptionId),
      eq(schema.subscription.collectionId, input.collectionId),
    ),
  });

  if (!sub) {
    throw new Error("Subscription not found.");
  }

  if (sub.status !== "paused") {
    throw new Error("Only paused subscriptions can be resumed.");
  }

  const now = new Date();

  await engine.db
    .update(schema.subscription)
    .set({
      status: "active",
      updatedAt: now,
    })
    .where(eq(schema.subscription.id, input.subscriptionId));

  return getSubscription(engine, input);
}

export async function reactivateSubscription(
  engine: SemaphorePayEngine<any>,
  input: { subscriptionId: string; collectionId: string }
): Promise<SubscriptionWithPlan | null> {
  const schema = engine.schema;

  const sub = await engine.db.query.subscription.findFirst({
    where: and(
      eq(schema.subscription.id, input.subscriptionId),
      eq(schema.subscription.collectionId, input.collectionId),
    ),
  });

  if (!sub) {
    throw new Error("Subscription not found.");
  }

  if (sub.status !== "canceled") {
    throw new Error("Only canceled subscriptions can be reactivated.");
  }

  if (!sub.cancelAtPeriodEnd) {
    throw new Error("Subscription is already reactivated (cancelAtPeriodEnd is false).");
  }

  const now = new Date();

  await engine.db
    .update(schema.subscription)
    .set({
      status: "active",
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
      updatedAt: now,
    })
    .where(eq(schema.subscription.id, input.subscriptionId));

  return getSubscription(engine, input);
}

export async function createProductPurchase(
  engine: SemaphorePayEngine<any>,
  input: {
    customerId: string;
    productInternalId: string;
    collectionId: string;
    environment: "development" | "production";
    nombaOrderReference?: string;
  }
) {
  const schema = engine.schema;

  return await engine.transaction(async (tx: any) => {
    const targetProduct = await tx.query.product.findFirst({
      where: and(
        eq(schema.product.internalId, input.productInternalId),
        eq(schema.product.collectionId, input.collectionId),
        eq(schema.product.environment, input.environment),
      ),
    });

    if (!targetProduct) {
      throw new Error("Product not found.");
    }

    const targetCustomer = await tx.query.customer.findFirst({
      where: and(
        eq(schema.customer.id, input.customerId),
        eq(schema.customer.collectionId, input.collectionId),
      ),
    });

    if (!targetCustomer) {
      throw new Error("Customer not found.");
    }

    const purchaseId = crypto.randomUUID();
    const now = new Date();

    await tx.insert(schema.productPurchase).values({
      id: purchaseId,
      collectionId: input.collectionId,
      customerId: input.customerId,
      productInternalId: input.productInternalId,
      nombaOrderReference: input.nombaOrderReference ?? null,
      status: "completed",
      purchasedAt: now,
    });

    const productFeatures = await tx.query.productFeature.findMany({
      where: eq(schema.productFeature.productInternalId, targetProduct.internalId),
    });

    for (const feature of productFeatures) {
      const isBoolean = feature.limit === null;

      await tx.insert(schema.entitlement).values({
        id: crypto.randomUUID(),
        customerId: input.customerId,
        subscriptionId: null,
        productPurchaseId: purchaseId,
        featureId: feature.featureId,
        balance: isBoolean ? null : feature.limit,
        limit: isBoolean ? null : feature.limit,
        nextResetAt: isBoolean ? null : feature.resetInterval ? new Date(now.getTime() + getResetIntervalMs(feature.resetInterval)) : null,
      });
    }

    return { purchaseId, status: "completed" };
  });
}
