import type { SemaphorePayEngine } from "../database/index";
import { subscribeToPlan, cancelSubscription, createProductPurchase } from "./subscription.service";
import { subscribeToPlanSchema } from "./subscription.types";

export async function subscribe(
  engine: SemaphorePayEngine<any>,
  input: unknown,
  context: { collectionId: string; environment: "development" | "production" }
) {
  const parsedInput = subscribeToPlanSchema.parse(input);
  return await subscribeToPlan(engine, {
    ...parsedInput,
    collectionId: context.collectionId,
    environment: context.environment,
  });
}

export async function cancel(
  engine: SemaphorePayEngine<any>,
  subscriptionId: string,
  context?: { collectionId?: string }
) {
  if (!subscriptionId) {
    throw new Error("Subscription ID is required.");
  }

  await cancelSubscription(engine, subscriptionId, context?.collectionId);
  return { success: true };
}