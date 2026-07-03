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