import * as z from "zod";
import type { SemaphorePayEngine } from "../database/index";
import {
  createFeature,
  deleteFeature,
  listFeatures,
  getPlanFeatures,
  attachFeatureToPlan,
  detachFeatureFromPlan,
  updatePlanFeature,
  getProductFeatures,
  attachFeatureToProduct,
  detachFeatureFromProduct,
} from "./feature.service";

const createFeatureSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["boolean", "limit"]),
});

const attachPlanFeatureSchema = z.object({
  planId: z.string(),
  featureId: z.string(),
  type: z.enum(["boolean", "limit"]),
  limit: z.number().int().nonnegative().optional().nullable(),
  resetInterval: z.enum(["day", "week", "month", "year"]).optional().nullable(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const attachProductFeatureSchema = z.object({
  productInternalId: z.string(),
  featureId: z.string(),
  type: z.enum(["boolean", "limit"]),
  limit: z.number().int().nonnegative().optional().nullable(),
  resetInterval: z.enum(["day", "week", "month", "year"]).optional().nullable(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function create(
  engine: SemaphorePayEngine<any>,
  input: unknown,
  _context: { collectionId: string },
) {
  const parsed = createFeatureSchema.parse(input);
  return await createFeature(engine, parsed);
}

export async function list(
  engine: SemaphorePayEngine<any>,
  _input: unknown,
  context: { collectionId: string },
) {
  return await listFeatures(engine, { collectionId: context.collectionId });
}

export async function remove(
  engine: SemaphorePayEngine<any>,
  input: { featureId: string },
  _context: { collectionId: string },
) {
  return await deleteFeature(engine, input);
}

export async function getPlanFeatureConfigs(
  engine: SemaphorePayEngine<any>,
  input: { planId: string },
  _context: { collectionId: string },
) {
  return await getPlanFeatures(engine, input);
}

export async function attachPlan(
  engine: SemaphorePayEngine<any>,
  input: unknown,
  _context: { collectionId: string },
) {
  const parsed = attachPlanFeatureSchema.parse(input);
  return await attachFeatureToPlan(engine, parsed);
}

export async function detachPlan(
  engine: SemaphorePayEngine<any>,
  input: { planId: string; featureId: string },
  _context: { collectionId: string },
) {
  return await detachFeatureFromPlan(engine, input);
}

export async function updatePlan(
  engine: SemaphorePayEngine<any>,
  input: unknown,
  _context: { collectionId: string },
) {
  const parsed = attachPlanFeatureSchema.partial({ type: true }).parse(input);
  return await updatePlanFeature(engine, parsed as any);
}

export async function getProductFeatureConfigs(
  engine: SemaphorePayEngine<any>,
  input: { productInternalId: string },
  _context: { collectionId: string },
) {
  return await getProductFeatures(engine, input);
}

export async function attachProduct(
  engine: SemaphorePayEngine<any>,
  input: unknown,
  _context: { collectionId: string },
) {
  const parsed = attachProductFeatureSchema.parse(input);
  return await attachFeatureToProduct(engine, parsed);
}

export async function detachProduct(
  engine: SemaphorePayEngine<any>,
  input: { productInternalId: string; featureId: string },
  _context: { collectionId: string },
) {
  return await detachFeatureFromProduct(engine, input);
}
