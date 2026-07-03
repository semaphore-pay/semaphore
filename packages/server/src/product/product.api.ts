import * as z from "zod";
import type { SemaphorePayEngine } from "../database/index";
import { createProductPurchase } from "../subscription/subscription.service";

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