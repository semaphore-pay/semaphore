import * as z from "zod";

export const subscribeToPlanSchema = z.object({
  customerId: z.string(),
  planId: z.string(),
});

export type SubscribeToPlanRequest = z.infer<typeof subscribeToPlanSchema>;

export interface SubscribeToPlanInput extends SubscribeToPlanRequest {
  collectionId: string;
  environment: "development" | "production";
}

export interface SubscribeToPlanResult {
  subscriptionId: string;
  status: "active" | "pending_payment" | "trialing";
  nombaOrderReference: string | null;
  trialEndAt: Date | null;
}

export interface ListSubscriptionsInput {
  collectionId: string;
  environment: "development" | "production";
  status?: string;
  planId?: string;
  customerId?: string;
  limit?: number;
  offset?: number;
}

export interface SubscriptionWithPlan {
  id: string;
  collectionId: string;
  customerId: string;
  planId: string;
  productInternalId: string | null;
  nombaOrderReference: string | null;
  nombaPaymentMethodId: string | null;
  status: string;
  canceled: boolean;
  cancelAtPeriodEnd: boolean;
  startedAt: Date | null;
  currentPeriodStartAt: Date | null;
  currentPeriodEndAt: Date | null;
  trialEndAt: Date | null;
  nextRetryAt: Date | null;
  retryCount: number;
  lastRetryAt: Date | null;
  canceledAt: Date | null;
  endedAt: Date | null;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  plan: {
    id: string;
    name: string;
    description: string | null;
    priceAmount: number;
    priceCurrency: string;
    interval: string;
    trialPeriodDays: number;
    badge: string | null;
    ctaText: string | null;
    sortOrder: number;
    isActive: boolean;
  } | null;
}

export interface ListSubscriptionsResult {
  subscriptions: SubscriptionWithPlan[];
  total: number;
}