import { and, eq, inArray } from "drizzle-orm";
import type { SemaphorePayEngine } from "../database/index";
import type { CreateProductInput } from "./product.types";

export async function createProduct(
  engine: SemaphorePayEngine<any>,
  input: CreateProductInput
) {
  const schema = engine.schema;
  const internalId = `prod_${crypto.randomUUID().replace(/-/g, "")}`;
  const now = new Date();

  return await engine.transaction(async (tx: any) => {
    const rows = await tx
      .insert(schema.product)
      .values({
        internalId,
        id: input.id,
        collectionId: input.collectionId,
        environment: input.environment,
        version: input.version ?? 1,
        name: input.name,
        group: input.group ?? "",
        isDefault: input.isDefault ?? false,
        priceAmount: input.priceAmount ?? null,
        priceCurrency: input.priceCurrency ?? "NGN",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const features = input.features ?? [];
    for (const feature of features) {
      const limit = feature.type === "boolean" ? null : feature.limit ?? null;
      if (feature.type === "limit" && limit === null) {
        throw new Error("Metered features require a limit.");
      }

      await tx
        .insert(schema.feature)
        .values({ id: feature.featureId, type: feature.type, createdAt: now, updatedAt: now })
        .onConflictDoNothing();

      await tx.insert(schema.productFeature).values({
        productInternalId: internalId,
        featureId: feature.featureId,
        limit,
        resetInterval: feature.type === "boolean" ? null : feature.resetInterval ?? null,
        config: feature.config ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return rows[0];
  });
}

export async function listProducts(
  engine: SemaphorePayEngine<any>,
  input: { collectionId: string; environment: "development" | "production" }
) {
  const schema = engine.schema;
  const products = await engine.db
    .select()
    .from(schema.product)
    .where(
      and(
        eq(schema.product.collectionId, input.collectionId),
        eq(schema.product.environment, input.environment),
      ),
    );

  if (products.length === 0) return [];

  const productInternalIds = products.map((product: any) => product.internalId);

  const features = await engine.db
    .select({
      productInternalId: schema.productFeature.productInternalId,
      featureId: schema.productFeature.featureId,
      limit: schema.productFeature.limit,
      resetInterval: schema.productFeature.resetInterval,
      config: schema.productFeature.config,
      type: schema.feature.type,
    })
    .from(schema.productFeature)
    .innerJoin(
      schema.feature,
      eq(schema.productFeature.featureId, schema.feature.id),
    )
    .where(inArray(schema.productFeature.productInternalId, productInternalIds));

  const featureMap = new Map<string, any[]>();
  for (const row of features) {
    const list = featureMap.get(row.productInternalId) ?? [];
    list.push(row);
    featureMap.set(row.productInternalId, list);
  }

  return products.map((product: any) => ({
    ...product,
    features: featureMap.get(product.internalId) ?? [],
  }));
}