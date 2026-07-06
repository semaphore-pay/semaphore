import * as z from "zod";
import type { SemaphorePayEngine } from "../database/index";
import { createPlan, listPlans, getPlan, deactivatePlan, reactivatePlan as reactivatePlanService, deletePlan } from "./plan.service";
import type { CreatePlanInput } from "./plan.types";
import { and, eq } from "drizzle-orm";

const createPlanSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  priceAmount: z.number().int().nonnegative(),
  priceCurrency: z.string().default("NGN"),
  interval: z.enum(["monthly", "yearly", "none"]),
  trialPeriodDays: z.number().int().nonnegative().default(30),
  features: z.array(z.object({
    featureId: z.string(),
    type: z.enum(["boolean", "limit"]),
    limit: z.number().int().nonnegative().optional().nullable(),
    resetInterval: z.enum(["day", "week", "month", "year"]).optional().nullable(),
    config: z.record(z.string(), z.unknown()).optional(),
  })).optional().default([]),
  badge: z.string().optional(),
  ctaText: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function create(
  engine: SemaphorePayEngine<any>,
  input: unknown,
  context: { collectionId: string; environment: "development" | "production" }
) {
  const parsedInput = createPlanSchema.parse(input);

  if (parsedInput.interval !== "none") {
    const schema = engine.schema;
    const existingMonthly = await engine.db.query.plan.findFirst({
      where: and(
        eq(schema.plan.collectionId, context.collectionId),
        eq(schema.plan.environment, context.environment),
        eq(schema.plan.name, parsedInput.name),
        eq(schema.plan.interval, "monthly")
      ),
    });
    const existingYearly = await engine.db.query.plan.findFirst({
      where: and(
        eq(schema.plan.collectionId, context.collectionId),
        eq(schema.plan.environment, context.environment),
        eq(schema.plan.name, parsedInput.name),
        eq(schema.plan.interval, "yearly")
      ),
    });

    if (parsedInput.interval === "yearly" && existingMonthly) {
      const monthlyPrice = existingMonthly.priceAmount;
      const yearlyPrice = parsedInput.priceAmount;
      if (yearlyPrice >= monthlyPrice * 12) {
        throw new Error("Yearly plan price must be less than 12x monthly price (enforce discount)");
      }
    }

    if (parsedInput.interval === "monthly" && existingYearly) {
      const yearlyPrice = existingYearly.priceAmount;
      const monthlyPrice = parsedInput.priceAmount;
      if (yearlyPrice >= monthlyPrice * 12) {
        throw new Error("Existing yearly plan price must be less than 12x this monthly price (enforce discount)");
      }
    }
  }

  return await createPlan(engine, {
    ...parsedInput,
    collectionId: context.collectionId,
    environment: context.environment,
  });
}

export async function list(
  engine: SemaphorePayEngine<any>,
  _input: unknown,
  context: { collectionId: string; environment: "development" | "production" }
) {
  return await listPlans(engine, {
    collectionId: context.collectionId,
    environment: context.environment,
    activeOnly: false,
  });
}

export async function get(
  engine: SemaphorePayEngine<any>,
  input: { planId: string },
  context: { collectionId: string; environment: "development" | "production" }
) {
  return await getPlan(engine, {
    planId: input.planId,
    collectionId: context.collectionId,
    environment: context.environment,
  });
}

export async function deactivate(
  engine: SemaphorePayEngine<any>,
  input: { planId: string; cancelRenewals?: boolean },
  context: { collectionId: string; environment: "development" | "production" }
) {
  return await deactivatePlan(engine, {
    planId: input.planId,
    collectionId: context.collectionId,
    environment: context.environment,
    cancelRenewals: input.cancelRenewals,
  });
}

export async function reactivatePlanApi(
  engine: SemaphorePayEngine<any>,
  input: { planId: string },
  context: { collectionId: string; environment: "development" | "production" }
) {
  return await reactivatePlanService(engine, {
    planId: input.planId,
    collectionId: context.collectionId,
    environment: context.environment,
  });
}

export async function remove(
  engine: SemaphorePayEngine<any>,
  input: { planId: string },
  context: { collectionId: string; environment: "development" | "production" }
) {
  return await deletePlan(engine, {
    planId: input.planId,
    collectionId: context.collectionId,
    environment: context.environment,
  });
}