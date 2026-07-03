import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { SemaphorePayEngine } from "../database/index";
import type { SubscribeToPlanInput, SubscribeToPlanResult } from "./subscription.types";

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
    const hasTrial = targetPlan.trialPeriodDays > 0 && targetPlan.interval !== "none" && !isFreePlan;
    const subscriptionId = crypto.randomUUID();
    const orderReference = isFreePlan ? null : `ord_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = new Date();
    const trialEndAt = hasTrial ? new Date(now.getTime() + targetPlan.trialPeriodDays * 24 * 60 * 60 * 1000) : null;
    const periodEndAt = targetPlan.interval === "none" 
      ? null 
      : new Date(now.getTime() + (targetPlan.interval === "monthly" ? 30 : 365) * 24 * 60 * 60 * 1000);

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