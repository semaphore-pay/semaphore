/**
 * @packageDocumentation
 *
 * @semaphore-pay/server is the backend billing engine. It provides:
 * - Database-backed subscription and entitlement management
 * - A Hono router for HTTP APIs
 * - Nomba payment integration (checkout, webhooks, tokenized cards)
 * - Better Auth hooks for automatic customer creation
 * - Cron-based subscription dunning/cancellation
 *
 * @example
 * ```ts
 * import { initSemaphorePay, createSemaphorePayRouter } from "@semaphore-pay/server";
 *
 * const engine = initSemaphorePay({ dialect: "sqlite", db });
 * const router = createSemaphorePayRouter(engine, {
 *   nomba: { clientId: "...", clientSecret: "...", accountId: "...", callbackUrl: "..." },
 * });
 * ```
 */

export { initSemaphorePay } from "./database/index";
export { sqliteSchema, pgSchema } from "./database/index";
export type { SemaphorePayConfig } from "./database/index";

/**
 * Re-exported schema helpers. Contains {@link SemaphorePayEngine} and the
 * database table definitions for both PostgreSQL and SQLite.
 */
export * as schema from "./database/index";

export { getSemaphorePayHooks } from "./auth";

// ── API Service ──────────────────────────────────────────
export {
  createCollection,
  createApiKey,
  createSemaphorePayRouter,
  type NombaConfig,
  type NombaMultiConfig,
} from "./api/api.service";

export { runSemaphorePayCron } from "./cron";

// ── Customer ─────────────────────────────────────────────
export {
  upsertCustomer,
  listCustomersApi,
  getCustomer,
  deleteCustomer,
} from "./customer/customer.api";
export type {
  ListCustomersResult,
  CustomerWithDetails,
  CustomerSubscription,
  CustomerEntitlement,
} from "./customer/customer.types";

// ── Product ──────────────────────────────────────────────
export {
  purchaseProduct,
  getProduct,
  updateProduct,
  deleteProduct,
} from "./product/product.api";
export {
  createProduct,
  listProducts,
} from "./product/product.service";
export type { CreateProductInput, CreateProductRequest } from "./product/product.types";

// ── Plan ─────────────────────────────────────────────────
export {
  create as createPlan,
  list as listPlans,
  get as getPlan,
  deactivate,
  deactivate as deactivatePlan,
  reactivatePlanApi,
  remove,
  remove as deletePlan,
} from "./plan/plan.api";
export type { Plan, PlanInterval, CreatePlanInput, CreatePlanRequest, ListPlansResult } from "./plan/plan.types";

// ── Subscription ─────────────────────────────────────────
export {
  subscribeToPlan,
  cancelSubscription,
  getSubscription,
  listSubscriptions,
  pauseSubscription,
  resumeSubscription,
  reactivateSubscription,
  createProductPurchase,
} from "./subscription/subscription.service";
export { subscribe, cancel, pause, resume, reactivate } from "./subscription/subscription.api";
export type {
  SubscribeToPlanInput,
  SubscribeToPlanResult,
  ListSubscriptionsInput,
  ListSubscriptionsResult,
  SubscriptionWithPlan,
} from "./subscription/subscription.types";

// ── Feature ──────────────────────────────────────────────
export {
  create as createFeatureApi,
  list as listFeaturesApi,
  remove as removeFeatureApi,
  attachPlan,
  detachPlan,
  updatePlan,
  attachProduct,
  detachProduct,
  getPlanFeatureConfigs,
  getProductFeatureConfigs,
} from "./feature/feature.api";
export {
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
  type Feature,
  type PlanFeatureConfig,
  type ProductFeatureConfig,
} from "./feature/feature.service";

// ── Entitlement ──────────────────────────────────────────
export {
  check,
  report,
} from "./entitlement/entitlement.api";
export {
  checkEntitlement,
  reportEntitlement,
  type EntitlementBalance,
  type CheckResult,
  type ReportResult,
} from "./entitlement/entitlement.service";

// ── Webhook ──────────────────────────────────────────────
export { handleWebhook } from "./webhook/webhook.api";
export { processSuccessfulPayment } from "./webhook/webhook.service";
export type { WebhookContext } from "./webhook/webhook.service";

// ── Nomba ────────────────────────────────────────────────
export { NombaClient } from "./nomba/nomba";
export type { NombaClientOptions } from "./nomba/nomba";
