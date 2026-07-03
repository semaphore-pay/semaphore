import * as z from "zod";

export type PlanInterval = "monthly" | "yearly" | "none";

/** Zod schema for a plan feature definition. */
export const planFeatureSchema = z.object({
  featureId: z.string(),
  type: z.enum(["boolean", "limit"]),
  limit: z.number().int().nonnegative().optional().nullable(),
  resetInterval: z.enum(["day", "week", "month", "year"]).optional().nullable(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type PlanFeatureInput = z.infer<typeof planFeatureSchema>;

/** Zod schema for creating a plan. */
export const createPlanSchema = z.object({
  id: z.string().regex(/^plan_[a-z0-9_]+_(monthly|yearly|none)$/, {
    message: "Plan ID must follow convention: plan_{name}_{interval}",
  }),
  name: z.string().min(1),
  description: z.string().optional(),
  priceAmount: z.number().int().nonnegative(),
  priceCurrency: z.string().default("NGN"),
  interval: z.enum(["monthly", "yearly", "none"]),
  trialPeriodDays: z.number().int().nonnegative().default(30),
  features: z.array(planFeatureSchema).optional().default([]),
  badge: z.string().optional(),
  ctaText: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export type CreatePlanRequest = z.infer<typeof createPlanSchema>;

export interface CreatePlanInput extends CreatePlanRequest {
  collectionId: string;
  environment: "development" | "production";
}

export interface Plan {
  id: string;
  collectionId: string;
  environment: "development" | "production";
  name: string;
  description: string | null;
  priceAmount: number;
  priceCurrency: string;
  interval: PlanInterval;
  trialPeriodDays: number;
  features: PlanFeatureInput[];
  badge: string | null;
  ctaText: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListPlansResult {
  plans: Plan[];
}

export interface SubscribeToPlanResult {
  subscriptionId: string;
  status: "active" | "pending_payment" | "trialing";
  nombaOrderReference: string | null;
  trialEndAt: Date | null;
}