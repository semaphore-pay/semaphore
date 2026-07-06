import { and, eq, or, inArray } from "drizzle-orm";
import type { SemaphorePayEngine } from "../database/index";

export interface Feature {
  id: string;
  type: "boolean" | "limit";
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanFeatureConfig {
  planId: string;
  featureId: string;
  limit: number | null;
  resetInterval: string | null;
  config: Record<string, unknown> | null;
}

export interface ProductFeatureConfig {
  productInternalId: string;
  featureId: string;
  limit: number | null;
  resetInterval: string | null;
  config: Record<string, unknown> | null;
}

export async function createFeature(
  engine: SemaphorePayEngine<any>,
  input: { id: string; type: "boolean" | "limit" },
): Promise<Feature> {
  const schema = engine.schema;
  const now = new Date();

  const existing = await engine.db.query.feature.findFirst({
    where: eq(schema.feature.id, input.id),
  });

  if (existing) {
    throw new Error(`Feature "${input.id}" already exists`);
  }

  const [row] = await engine.db
    .insert(schema.feature)
    .values({
      id: input.id,
      type: input.type,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return row;
}

export async function deleteFeature(
  engine: SemaphorePayEngine<any>,
  input: { featureId: string },
): Promise<void> {
  const schema = engine.schema;

  const inPlan = await engine.db.query.planFeature.findFirst({
    where: eq(schema.planFeature.featureId, input.featureId),
  });

  if (inPlan) {
    throw new Error(`Feature "${input.featureId}" is attached to a plan. Detach before deleting.`);
  }

  const inProduct = await engine.db.query.productFeature.findFirst({
    where: eq(schema.productFeature.featureId, input.featureId),
  });

  if (inProduct) {
    throw new Error(`Feature "${input.featureId}" is attached to a product. Detach before deleting.`);
  }

  await engine.db
    .delete(schema.feature)
    .where(eq(schema.feature.id, input.featureId));
}

export async function listFeatures(
  engine: SemaphorePayEngine<any>,
  input: { collectionId: string },
): Promise<Feature[]> {
  const schema = engine.schema;

  const planFeatureRows = await engine.db
    .select({ featureId: schema.planFeature.featureId })
    .from(schema.planFeature)
    .innerJoin(schema.plan, eq(schema.planFeature.planId, schema.plan.id))
    .where(eq(schema.plan.collectionId, input.collectionId));

  const productFeatureRows = await engine.db
    .select({ featureId: schema.productFeature.featureId })
    .from(schema.productFeature)
    .innerJoin(schema.product, eq(schema.productFeature.productInternalId, schema.product.internalId))
    .where(eq(schema.product.collectionId, input.collectionId));

  const featureIds = [
    ...new Set([
      ...planFeatureRows.map((r: { featureId: string }) => r.featureId),
      ...productFeatureRows.map((r: { featureId: string }) => r.featureId),
    ]),
  ];

  if (featureIds.length === 0) return [];

  return await engine.db.query.feature.findMany({
    where: inArray(schema.feature.id, featureIds),
  });
}

export async function getPlanFeatures(
  engine: SemaphorePayEngine<any>,
  input: { planId: string },
): Promise<PlanFeatureConfig[]> {
  const schema = engine.schema;

  return await engine.db.query.planFeature.findMany({
    where: eq(schema.planFeature.planId, input.planId),
  });
}

export async function attachFeatureToPlan(
  engine: SemaphorePayEngine<any>,
  input: {
    planId: string;
    featureId: string;
    type: "boolean" | "limit";
    limit?: number | null;
    resetInterval?: string | null;
    config?: Record<string, unknown> | null;
  },
): Promise<PlanFeatureConfig> {
  const schema = engine.schema;
  const now = new Date();

  const feature = await engine.db.query.feature.findFirst({
    where: eq(schema.feature.id, input.featureId),
  });

  if (!feature) {
    throw new Error(`Feature "${input.featureId}" does not exist. Create it first.`);
  }

  if (input.type === "limit" && (input.limit ?? null) === null) {
    throw new Error(`Metered feature "${input.featureId}" requires a limit.`);
  }

  const existing = await engine.db.query.planFeature.findFirst({
    where: and(
      eq(schema.planFeature.planId, input.planId),
      eq(schema.planFeature.featureId, input.featureId),
    ),
  });

  if (existing) {
    throw new Error(`Feature "${input.featureId}" is already attached to plan "${input.planId}"`);
  }

  const [row] = await engine.db
    .insert(schema.planFeature)
    .values({
      planId: input.planId,
      featureId: input.featureId,
      limit: input.type === "boolean" ? null : (input.limit ?? null),
      resetInterval: input.resetInterval ?? null,
      config: input.config ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return row;
}

export async function detachFeatureFromPlan(
  engine: SemaphorePayEngine<any>,
  input: { planId: string; featureId: string },
): Promise<void> {
  const schema = engine.schema;

  await engine.db
    .delete(schema.planFeature)
    .where(
      and(
        eq(schema.planFeature.planId, input.planId),
        eq(schema.planFeature.featureId, input.featureId),
      ),
    );
}

export async function updatePlanFeature(
  engine: SemaphorePayEngine<any>,
  input: {
    planId: string;
    featureId: string;
    limit?: number | null;
    resetInterval?: string | null;
    config?: Record<string, unknown> | null;
  },
): Promise<PlanFeatureConfig> {
  const schema = engine.schema;
  const now = new Date();

  const existing = await engine.db.query.planFeature.findFirst({
    where: and(
      eq(schema.planFeature.planId, input.planId),
      eq(schema.planFeature.featureId, input.featureId),
    ),
  });

  if (!existing) {
    throw new Error(`Feature "${input.featureId}" is not attached to plan "${input.planId}"`);
  }

  const [row] = await engine.db
    .update(schema.planFeature)
    .set({
      limit: input.limit !== undefined ? input.limit : existing.limit,
      resetInterval: input.resetInterval !== undefined ? input.resetInterval : existing.resetInterval,
      config: input.config !== undefined ? input.config : existing.config,
      updatedAt: now,
    })
    .where(
      and(
        eq(schema.planFeature.planId, input.planId),
        eq(schema.planFeature.featureId, input.featureId),
      ),
    )
    .returning();

  return row;
}

export async function getProductFeatures(
  engine: SemaphorePayEngine<any>,
  input: { productInternalId: string },
): Promise<ProductFeatureConfig[]> {
  const schema = engine.schema;

  return await engine.db.query.productFeature.findMany({
    where: eq(schema.productFeature.productInternalId, input.productInternalId),
  });
}

export async function attachFeatureToProduct(
  engine: SemaphorePayEngine<any>,
  input: {
    productInternalId: string;
    featureId: string;
    type: "boolean" | "limit";
    limit?: number | null;
    resetInterval?: string | null;
    config?: Record<string, unknown> | null;
  },
): Promise<ProductFeatureConfig> {
  const schema = engine.schema;
  const now = new Date();

  const feature = await engine.db.query.feature.findFirst({
    where: eq(schema.feature.id, input.featureId),
  });

  if (!feature) {
    throw new Error(`Feature "${input.featureId}" does not exist. Create it first.`);
  }

  if (input.type === "limit" && (input.limit ?? null) === null) {
    throw new Error(`Metered feature "${input.featureId}" requires a limit.`);
  }

  const existing = await engine.db.query.productFeature.findFirst({
    where: and(
      eq(schema.productFeature.productInternalId, input.productInternalId),
      eq(schema.productFeature.featureId, input.featureId),
    ),
  });

  if (existing) {
    throw new Error(`Feature "${input.featureId}" is already attached to product "${input.productInternalId}"`);
  }

  const [row] = await engine.db
    .insert(schema.productFeature)
    .values({
      productInternalId: input.productInternalId,
      featureId: input.featureId,
      limit: input.type === "boolean" ? null : (input.limit ?? null),
      resetInterval: input.resetInterval ?? null,
      config: input.config ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return row;
}

export async function detachFeatureFromProduct(
  engine: SemaphorePayEngine<any>,
  input: { productInternalId: string; featureId: string },
): Promise<void> {
  const schema = engine.schema;

  await engine.db
    .delete(schema.productFeature)
    .where(
      and(
        eq(schema.productFeature.productInternalId, input.productInternalId),
        eq(schema.productFeature.featureId, input.featureId),
      ),
    );
}
