# Changelog

## 0.1.26

- Fixed `SemaphorePayEngine` type compatibility — annotated `createCustomer` return type as `Promise<string>` to resolve `SemaphorePayEngine<"sqlite">` vs `SemaphorePayEngine<any>` mismatch

## 0.1.25

- Added sub-path exports for every module (`./api`, `./plan`, `./product`, `./customer`, `./feature`, `./entitlement`, `./webhook`, `./nomba`)
- Backend now imports from `@semaphore-pay/server/plan`, `@semaphore-pay/server/customer`, etc. — no more root `export *` collisions

## 0.1.24

- Fixed `exports` field in package.json — `types` condition now comes first in all entries (required for TypeScript `moduleResolution: "Bundler"` to resolve type declarations correctly)

## 0.1.23

- Fixed all missing exports from index.ts — replaced `export *` with explicit named re-exports
- Resolved TypeScript `export *` name collision issues that silently dropped `deactivate`, `reactivatePlanApi`, `remove`, `listCustomersApi`, `sqliteSchema`, `NombaClient`
- All API functions now correctly exported: plans, products, customers, features, entitlements

## 0.1.22

- Exported `getProduct`, `updateProduct`, `deleteProduct` from `product.api.ts`
- All product API functions now accessible from `@semaphore-pay/server`

## 0.1.21

- Added `POST /payments/verify` endpoint — verify payment by orderReference (webhook fallback)
- Added `processSuccessfulPayment()` — idempotent, shared by webhook handler and verify endpoint
- Fixed webhook signature verification — replaced broken hex-based verifier with `NombaWebhookVerifier`
- `handleWebhook` now accepts `nombaTimestamp` for correct HMAC verification
- `POST /products/purchase` now stores `nombaOrderReference` on productPurchase record
- Added `getMe` route — resolves customer from API key's userId
- `resolveCustomerId` now async — looks up actual customer.id from userId for public keys
- User routes mounted before admin to prevent `/customers/me` collision with `/customers/:id`
- Public key now overrides userId on customer create (forces key-scoped userId)
- Pre-built Nomba clients (`nombaClients` option) eliminate per-request race condition
- Exported `processSuccessfulPayment` and `WebhookContext`

## 0.1.20

- Added `environment` field to collection table (sandbox/production)
- `createCollection` now accepts `environment` parameter
- `createNombaClient` supports `NombaMultiConfig` — picks sandbox or production credentials based on environment
- Features now scoped per collection — `feature` table has `collectionId` FK
- `createFeature`, `deleteFeature`, `listFeatures` all take `collectionId` parameter
- Duplicate feature check now scoped to collection (same ID ok in different collections)
- `deleteFeature` verifies feature belongs to collection before removing

## 0.1.19

- Added `listCustomers` — paginated customer list with search by name/email/userId
- Exported `ListCustomersResult`, `CustomerWithDetails`, `CustomerSubscription`, `CustomerEntitlement` types

## 0.1.18

- Fixed cron: replaced all raw SQL with Drizzle join API for full D1 compatibility
- Fixed bug: payment retry now correctly joins `paymentMethod` table for `nombaTokenId` (was referencing non-existent `sub.nombaPaymentMethodId`)
- Removed unused `isNull` import

## 0.1.17

- Fixed cron: replaced `tx.query.*` relational queries with raw SQL to work on D1

## 0.1.16

- `listFeatures` now returns all features, not just those attached to plans/products

## 0.1.15

- Added `name` field to feature table — human-readable display name separate from programmatic `id`

## 0.1.14

- Added `createFeature`, `deleteFeature`, `listFeatures` — feature CRUD
- Added `attachFeatureToPlan`, `detachFeatureFromPlan`, `updatePlanFeature` — plan feature management
- Added `attachFeatureToProduct`, `detachFeatureFromProduct` — product feature management
- Added `getPlanFeatures`, `getProductFeatures` — list attached features
- Feature API wrappers with Zod validation

## 0.1.13

- Added `getProduct`, `updateProduct`, `deleteProduct` to product service
- Added `get`, `update`, `remove` API wrappers for product CRUD
- `updateProduct` replaces feature rows in transaction, validates version uniqueness
- `deleteProduct` blocks if product has existing purchases

## 0.1.12

- Fixed `reactivatePlan` name collision between plan.api and plan.service exports

## 0.1.11

- Renamed plan API `reactivate` → `reactivatePlan` to avoid name collision with subscription API `reactivate`

## 0.1.10

- Added `reactivatePlan` — re-enable a deactivated plan for new signups
- Added `reactivate` API function in plan.api

## 0.1.9

- `deactivatePlan` now accepts `cancelRenewals` option — sets `cancelAtPeriodEnd` on all active subscriptions for the plan

## 0.1.8

- `list` now returns all plans (active and inactive) instead of filtering to active only

## 0.1.7

- Added `deactivatePlan` — soft-disable a plan (stops recurring payments for new subscribers)
- Added `deletePlan` — permanently remove a plan (only if no subscriptions exist)
- Added `deactivate` and `remove` API functions in plan.api

## 0.1.6

- Added `"default"` condition to package.json exports map for Bun/drizzle-kit compatibility

## 0.1.5

- Exported `sqliteSchema` and `pgSchema` from `index.ts` for drizzle-kit migrations

## 0.1.4

- Exported `sqliteSchema` and `pgSchema` from `database/index.ts` for drizzle-kit migrations

## 0.1.3

- Re-exported `subscribe`, `cancel`, `pause`, `resume`, `reactivate` from main entry point

## 0.1.2

- Added `getSubscription` — fetch single subscription with plan details
- Added `listSubscriptions` — list with status/planId/customerId filters and pagination
- Added `pauseSubscription` — pause active/trialing subscriptions
- Added `resumeSubscription` — resume paused subscriptions
- Added `reactivateSubscription` — reactivate canceled subscriptions (undo cancellation)
- Added `ListSubscriptionsInput`, `ListSubscriptionsResult`, `SubscriptionWithPlan` types
- Added `@semaphore-pay/server/subscription` subpath export

## 0.1.1

- Moved `typescript` from peerDependencies to devDependencies
- Added `license` field

## 0.1.0

- Initial release
