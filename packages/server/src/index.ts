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

export * from "./api/api.service";
export { runSemaphorePayCron } from "./cron";
export * from "./customer/customer.api";
export * from "./product/product.api";
export * from "./product/product.service";
export * from "./product/product.types";
export * from "./plan/plan.api";
export * from "./plan/plan.service";
export * from "./plan/plan.types";
export * from "./subscription/subscription.service";
export { subscribe, cancel, pause, resume, reactivate } from "./subscription/subscription.api";
export { type SubscribeToPlanInput, type SubscribeToPlanResult, type ListSubscriptionsInput, type ListSubscriptionsResult, type SubscriptionWithPlan } from "./subscription/subscription.types";
export * from "./entitlement/entitlement.api";
export * from "./entitlement/entitlement.service";
export * from "./webhook/webhook.api";
