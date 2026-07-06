import { and, eq, inArray } from "drizzle-orm";
import type { SemaphorePayEngine } from "../database/index";
import type { CreatePlanInput, Plan, PlanFeatureInput, PlanInterval } from "./plan.types";

function generatePlanId(name: string, interval: PlanInterval): string {
  const sanitized = name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return `plan_${sanitized}_${interval}`;
}

export async function createPlan(
  engine: SemaphorePayEngine<any>,
  input: CreatePlanInput
): Promise<Plan> {
  const schema = engine.schema;
  const now = new Date();

  const expectedId = generatePlanId(input.name, input.interval);
  if (input.id !== expectedId) {
    throw new Error(`Plan ID must be "${expectedId}" (format: plan_{name}_{interval})`);
  }

  if (input.interval !== "none") {
    const yearlyEquivalent = input.interval === "monthly" 
      ? input.priceAmount * 12 
      : input.priceAmount;
    const monthlyEquivalent = input.interval === "yearly"
      ? input.priceAmount / 12
      : input.priceAmount;
  }

  const existing = await engine.db.query.plan.findFirst({
    where: and(
      eq(schema.plan.id, input.id),
      eq(schema.plan.collectionId, input.collectionId),
      eq(schema.plan.environment, input.environment),
    ),
  });

  if (existing) {
    throw new Error(`Plan with ID "${input.id}" already exists in this collection/environment`);
  }

  return await engine.transaction(async (tx: any) => {
    const planRow = await tx
      .insert(schema.plan)
      .values({
        id: input.id,
        collectionId: input.collectionId,
        environment: input.environment,
        name: input.name,
        description: input.description ?? null,
        priceAmount: input.priceAmount,
        priceCurrency: input.priceCurrency,
        interval: input.interval,
        trialPeriodDays: input.trialPeriodDays,
        features: input.features,
        badge: input.badge ?? null,
        ctaText: input.ctaText ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    for (const feature of input.features) {
      const limit = feature.type === "boolean" ? null : feature.limit ?? null;
      if (feature.type === "limit" && limit === null) {
        throw new Error(`Metered feature "${feature.featureId}" requires a limit.`);
      }

      await tx
        .insert(schema.feature)
        .values({ id: feature.featureId, type: feature.type, createdAt: now, updatedAt: now })
        .onConflictDoNothing();

      await tx.insert(schema.planFeature).values({
        planId: input.id,
        featureId: feature.featureId,
        limit,
        resetInterval: feature.type === "boolean" ? null : feature.resetInterval ?? null,
        config: feature.config ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return planRow[0] as Plan;
  });
}

export async function listPlans(
  engine: SemaphorePayEngine<any>,
  input: { collectionId: string; environment: "development" | "production"; activeOnly?: boolean }
): Promise<Plan[]> {
  const schema = engine.schema;
  const conditions = [
    eq(schema.plan.collectionId, input.collectionId),
    eq(schema.plan.environment, input.environment),
  ];

  if (input.activeOnly !== false) {
    conditions.push(eq(schema.plan.isActive, true));
  }

  const plans = await engine.db
    .select()
    .from(schema.plan)
    .where(and(...conditions));

  if (plans.length === 0) return [];

  const planIds = plans.map((p: any) => p.id);

  const features = await engine.db
    .select({
      planId: schema.planFeature.planId,
      featureId: schema.planFeature.featureId,
      limit: schema.planFeature.limit,
      resetInterval: schema.planFeature.resetInterval,
      config: schema.planFeature.config,
      type: schema.feature.type,
    })
    .from(schema.planFeature)
    .innerJoin(schema.feature, eq(schema.planFeature.featureId, schema.feature.id))
    .where(inArray(schema.planFeature.planId, planIds));

  const featureMap = new Map<string, PlanFeatureInput[]>();
  for (const row of features) {
    const list = featureMap.get(row.planId) ?? [];
    list.push({
      featureId: row.featureId,
      type: row.type,
      limit: row.limit ?? undefined,
      resetInterval: row.resetInterval ?? undefined,
      config: row.config ?? undefined,
    });
    featureMap.set(row.planId, list);
  }

  return plans.map((plan: any) => ({
    ...plan,
    features: featureMap.get(plan.id) ?? [],
  })) as Plan[];
}

export async function getPlan(
  engine: SemaphorePayEngine<any>,
  input: { planId: string; collectionId: string; environment: "development" | "production" }
): Promise<Plan | null> {
  const schema = engine.schema;
  const plan = await engine.db.query.plan.findFirst({
    where: and(
      eq(schema.plan.id, input.planId),
      eq(schema.plan.collectionId, input.collectionId),
      eq(schema.plan.environment, input.environment),
    ),
  });

  if (!plan) return null;

  const features = await engine.db
    .select({
      featureId: schema.planFeature.featureId,
      limit: schema.planFeature.limit,
      resetInterval: schema.planFeature.resetInterval,
      config: schema.planFeature.config,
      type: schema.feature.type,
    })
    .from(schema.planFeature)
    .innerJoin(schema.feature, eq(schema.planFeature.featureId, schema.feature.id))
    .where(eq(schema.planFeature.planId, input.planId));

  return {
    ...plan,
    features: features.map((f: any) => ({
      featureId: f.featureId,
      type: f.type,
      limit: f.limit ?? undefined,
      resetInterval: f.resetInterval ?? undefined,
      config: f.config ?? undefined,
    })),
  } as Plan;
}

export async function deactivatePlan(
  engine: SemaphorePayEngine<any>,
  input: { planId: string; collectionId: string; environment: "development" | "production"; cancelRenewals?: boolean }
): Promise<Plan> {
  const schema = engine.schema;
  const existing = await getPlan(engine, input);
  if (!existing) throw new Error("Plan not found");

  await engine.db
    .update(schema.plan)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(schema.plan.id, input.planId),
        eq(schema.plan.collectionId, input.collectionId),
        eq(schema.plan.environment, input.environment),
      )
    );

  if (input.cancelRenewals) {
    await engine.db
      .update(schema.subscription)
      .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.subscription.planId, input.planId),
          eq(schema.subscription.collectionId, input.collectionId),
          inArray(schema.subscription.status, ["active", "trialing"]),
        )
      );
  }

  return { ...existing, isActive: false };
}

export async function reactivatePlan(
  engine: SemaphorePayEngine<any>,
  input: { planId: string; collectionId: string; environment: "development" | "production" }
): Promise<Plan> {
  const schema = engine.schema;
  const existing = await getPlan(engine, input);
  if (!existing) throw new Error("Plan not found");

  await engine.db
    .update(schema.plan)
    .set({ isActive: true, updatedAt: new Date() })
    .where(
      and(
        eq(schema.plan.id, input.planId),
        eq(schema.plan.collectionId, input.collectionId),
        eq(schema.plan.environment, input.environment),
      )
    );

  return { ...existing, isActive: true };
}

export async function deletePlan(
  engine: SemaphorePayEngine<any>,
  input: { planId: string; collectionId: string; environment: "development" | "production" }
): Promise<void> {
  const schema = engine.schema;

  const hasSubscriptions = await engine.db.query.subscription.findFirst({
    where: and(
      eq(schema.subscription.planId, input.planId),
      eq(schema.subscription.collectionId, input.collectionId),
    ),
  });

  if (hasSubscriptions) {
    throw new Error("Cannot delete plan with active subscriptions. Deactivate it instead.");
  }

  await engine.transaction(async (tx: any) => {
    await tx
      .delete(schema.planFeature)
      .where(eq(schema.planFeature.planId, input.planId));

    await tx
      .delete(schema.plan)
      .where(
        and(
          eq(schema.plan.id, input.planId),
          eq(schema.plan.collectionId, input.collectionId),
          eq(schema.plan.environment, input.environment),
        )
      );
  });
}