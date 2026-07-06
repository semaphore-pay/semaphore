import { and, eq, inArray, ne } from "drizzle-orm";
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

export async function getProduct(
  engine: SemaphorePayEngine<any>,
  input: { productId: string; collectionId: string; environment: "development" | "production" }
) {
  const schema = engine.schema;
  const product = await engine.db.query.product.findFirst({
    where: and(
      eq(schema.product.id, input.productId),
      eq(schema.product.collectionId, input.collectionId),
      eq(schema.product.environment, input.environment),
    ),
  });

  if (!product) return null;

  const features = await engine.db
    .select({
      featureId: schema.productFeature.featureId,
      limit: schema.productFeature.limit,
      resetInterval: schema.productFeature.resetInterval,
      config: schema.productFeature.config,
      type: schema.feature.type,
    })
    .from(schema.productFeature)
    .innerJoin(schema.feature, eq(schema.productFeature.featureId, schema.feature.id))
    .where(eq(schema.productFeature.productInternalId, product.internalId));

  return {
    ...product,
    features: features.map((f: any) => ({
      featureId: f.featureId,
      type: f.type,
      limit: f.limit ?? undefined,
      resetInterval: f.resetInterval ?? undefined,
      config: f.config ?? undefined,
    })),
  };
}

export async function updateProduct(
  engine: SemaphorePayEngine<any>,
  input: {
    productId: string;
    collectionId: string;
    environment: "development" | "production";
    name?: string;
    group?: string;
    isDefault?: boolean;
    priceAmount?: number | null;
    priceCurrency?: string;
    priceInterval?: string;
    version?: number;
    features?: Array<{
      featureId: string;
      type: "boolean" | "limit";
      limit?: number | null;
      resetInterval?: "day" | "week" | "month" | "year" | null;
      config?: Record<string, unknown>;
    }>;
  }
) {
  const schema = engine.schema;
  const now = new Date();

  const existing = await getProduct(engine, input);
  if (!existing) throw new Error("Product not found");

  const newVersion = input.version ?? existing.version;

  if (newVersion !== existing.version) {
    const duplicate = await engine.db.query.product.findFirst({
      where: and(
        eq(schema.product.id, input.productId),
        eq(schema.product.collectionId, input.collectionId),
        eq(schema.product.environment, input.environment),
        eq(schema.product.version, newVersion),
      ),
    });
    if (duplicate) {
      throw new Error(`Product "${input.productId}" already exists at version ${newVersion}`);
    }
  }

  const updates: Record<string, any> = { updatedAt: now };
  if (input.name !== undefined) updates.name = input.name;
  if (input.group !== undefined) updates.group = input.group;
  if (input.isDefault !== undefined) updates.isDefault = input.isDefault;
  if (input.priceAmount !== undefined) updates.priceAmount = input.priceAmount;
  if (input.priceCurrency !== undefined) updates.priceCurrency = input.priceCurrency;
  if (input.priceInterval !== undefined) updates.priceInterval = input.priceInterval;
  if (input.version !== undefined) updates.version = input.version;

  await engine.db
    .update(schema.product)
    .set(updates)
    .where(
      and(
        eq(schema.product.id, input.productId),
        eq(schema.product.collectionId, input.collectionId),
        eq(schema.product.environment, input.environment),
      )
    );

  if (input.features !== undefined) {
    await engine.transaction(async (tx: any) => {
      await tx
        .delete(schema.productFeature)
        .where(eq(schema.productFeature.productInternalId, existing.internalId));

      for (const feature of input.features!) {
        const limit = feature.type === "boolean" ? null : feature.limit ?? null;
        if (feature.type === "limit" && limit === null) {
          throw new Error("Metered features require a limit.");
        }

        await tx
          .insert(schema.feature)
          .values({ id: feature.featureId, type: feature.type, createdAt: now, updatedAt: now })
          .onConflictDoNothing();

        await tx.insert(schema.productFeature).values({
          productInternalId: existing.internalId,
          featureId: feature.featureId,
          limit,
          resetInterval: feature.type === "boolean" ? null : feature.resetInterval ?? null,
          config: feature.config ?? null,
          createdAt: now,
          updatedAt: now,
        });
      }
    });
  }

  return getProduct(engine, input);
}

export async function deleteProduct(
  engine: SemaphorePayEngine<any>,
  input: { productId: string; collectionId: string; environment: "development" | "production" }
): Promise<void> {
  const schema = engine.schema;

  const existing = await getProduct(engine, input);
  if (!existing) throw new Error("Product not found");

  const hasPurchases = await engine.db.query.productPurchase.findFirst({
    where: eq(schema.productPurchase.productInternalId, existing.internalId),
  });

  if (hasPurchases) {
    throw new Error("Cannot delete product with existing purchases. Create a new version instead.");
  }

  await engine.transaction(async (tx: any) => {
    await tx
      .delete(schema.productFeature)
      .where(eq(schema.productFeature.productInternalId, existing.internalId));

    await tx
      .delete(schema.product)
      .where(
        and(
          eq(schema.product.id, input.productId),
          eq(schema.product.collectionId, input.collectionId),
          eq(schema.product.environment, input.environment),
        )
      );
  });
}