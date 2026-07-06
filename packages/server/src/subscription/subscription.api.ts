import type { SemaphorePayEngine } from "../database/index";
import {
  subscribeToPlan,
  cancelSubscription,
  createProductPurchase,
  getSubscription,
  listSubscriptions,
  pauseSubscription,
  resumeSubscription,
  reactivateSubscription,
} from "./subscription.service";
import { subscribeToPlanSchema } from "./subscription.types";
import type { ListSubscriptionsInput } from "./subscription.types";

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

export async function get(
  engine: SemaphorePayEngine<any>,
  input: { subscriptionId: string },
  context: { collectionId: string }
) {
  return await getSubscription(engine, {
    subscriptionId: input.subscriptionId,
    collectionId: context.collectionId,
  });
}

export async function list(
  engine: SemaphorePayEngine<any>,
  input: Omit<ListSubscriptionsInput, "collectionId" | "environment">,
  context: { collectionId: string; environment: "development" | "production" }
) {
  return await listSubscriptions(engine, {
    ...input,
    collectionId: context.collectionId,
    environment: context.environment,
  });
}

export async function pause(
  engine: SemaphorePayEngine<any>,
  subscriptionId: string,
  context: { collectionId: string }
) {
  if (!subscriptionId) {
    throw new Error("Subscription ID is required.");
  }

  return await pauseSubscription(engine, {
    subscriptionId,
    collectionId: context.collectionId,
  });
}

export async function resume(
  engine: SemaphorePayEngine<any>,
  subscriptionId: string,
  context: { collectionId: string }
) {
  if (!subscriptionId) {
    throw new Error("Subscription ID is required.");
  }

  return await resumeSubscription(engine, {
    subscriptionId,
    collectionId: context.collectionId,
  });
}

export async function reactivate(
  engine: SemaphorePayEngine<any>,
  subscriptionId: string,
  context: { collectionId: string }
) {
  if (!subscriptionId) {
    throw new Error("Subscription ID is required.");
  }

  return await reactivateSubscription(engine, {
    subscriptionId,
    collectionId: context.collectionId,
  });
}