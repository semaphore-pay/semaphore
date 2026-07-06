import * as z from "zod";
import type { SemaphorePayEngine } from "../database/index";
import { createProductPurchase } from "../subscription/subscription.service";
import { getProduct as getProductService, updateProduct as updateProductService, deleteProduct as deleteProductService } from "./product.service";

const purchaseProductSchema = z.object({
  customerId: z.string(),
  productInternalId: z.string(),
});

export async function purchaseProduct(
  engine: SemaphorePayEngine<any>,
  input: unknown,
  context: { collectionId: string; environment: "development" | "production" }
) {
  const parsedInput = purchaseProductSchema.parse(input);
  return await createProductPurchase(engine, {
    ...parsedInput,
    collectionId: context.collectionId,
    environment: context.environment,
  });
}

export async function getProduct(
  engine: SemaphorePayEngine<any>,
  input: { productId: string },
  context: { collectionId: string; environment: "development" | "production" }
) {
  return getProductService(engine, {
    productId: input.productId,
    collectionId: context.collectionId,
    environment: context.environment,
  });
}

export async function updateProduct(
  engine: SemaphorePayEngine<any>,
  input: {
    productId: string;
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
  },
  context: { collectionId: string; environment: "development" | "production" }
) {
  return updateProductService(engine, {
    ...input,
    collectionId: context.collectionId,
    environment: context.environment,
  });
}

export async function deleteProduct(
  engine: SemaphorePayEngine<any>,
  input: { productId: string },
  context: { collectionId: string; environment: "development" | "production" }
) {
  return deleteProductService(engine, {
    productId: input.productId,
    collectionId: context.collectionId,
    environment: context.environment,
  });
}