# Changelog

## 0.1.36

### Added
- `GET /client/subscriptions` — returns subscriptions for the current customer (used by client to restore subscription state on page reload)
- `GET /client/purchases` — returns product purchases for the current customer
- `listPurchases` export from package entry point

### Fixed
- `subscribeToPlan` now prevents duplicate active subscriptions — returns existing subscription if customer already has one for the same plan, throws error if trying to subscribe to a different plan while one is active
- `attachFeatureToPlan` now backfills entitlement rows for all active subscribers of the plan — features added to a plan after subscription are immediately available
- `getActiveEntitlements` now lazily backfills missing entitlement rows — if a customer has an active subscription whose plan includes a feature but no entitlement row exists, one is created on the fly

## 0.1.35

- Fixed: `processSuccessfulPayment` now wraps `data.tokenizedCardData` (single object from Nomba webhook) into an array — tokenized cards are now correctly stored in `paymentMethod` table for recurring billing
- Fixed: Tokenized card field mapping matches Nomba webhook payload — `cardType` → `brand`, `cardPan` → `last4`, `tokenExpiryMonth` → `expiryMonth`, `tokenExpiryYear` → `expiryYear`
- Fixed: `subscribeToPlan` now sets `sourceType: "subscription"` and `sourceId: targetPlan.id` on entitlement rows — `resetEntitlementBalances` can now find the plan and reset metered balances correctly on renewal
- Fixed: `TokenizedCardData` type updated to match Nomba webhook payload — replaced `tokenExpirationDate` string with `tokenExpiryYear` and `tokenExpiryMonth` optional fields

## 0.1.34

- Fixed: `createTestPlan` now uses `generatePlanId("Test Plan (15 min cycle)", "test_15min")` → `plan_test_plan_15_min_cycle__test_15min` — matches expected `plan_{name}_{interval}` format validated by `createPlan`, removing redundant `Date.now()` timestamp

## 0.1.33

- Fixed: Added `./database` export to package.json — internal imports from `../database/index` now resolve correctly when published to npm

## 0.1.32

- Exported `updateCollection` from main entry point — allows updating collection `name` and `callbackUrl` via admin API
- Fixed: Nomba checkout amount conversion — server divides kobo by 100 before sending to Nomba API (Nomba expects main currency unit, not kobo)
- Fixed: Per-collection callback URL now used for checkout (falls back to global config)

## 0.1.31

- Changed default `trialPeriodDays` for plans from 30 to 0 — paid plans now go straight to `pending_payment` (no trial) unless explicitly configured

## 0.1.30

- Added `GET /client/features` endpoint — returns collection features with `featureId`, `type`, `limit`, `resetInterval` for dynamic entitlement UI

## 0.1.29

- Added per-collection Nomba checkout callback URL (`callbackUrl` field on collection table)
- Subscription and product purchase checkout now use collection-specific callback URL (falls back to global config)
- Migration: added `callback_url` column to `semaphore_pay_collection` table

## 0.1.28

- Fixed Nomba checkout amount conversion — server now divides kobo by 100 before sending to Nomba API (Nomba expects main currency unit, not kobo)
- Subscription and product purchase checkout amounts now match displayed prices

## 0.1.27

- Added test plans with `test_15min` interval — 15-minute billing cycles for fast dunning testing
- Added `createTestPlan()` helper — auto-creates ₦1,000 test plan on collection creation (sandbox/dev)
- Subscription: skip trial for test plans, 15-min period calculation
- Cron: 15-min renewal period + accelerated retry backoff (1min/3min/5min vs 1/3/7 days)
- Webhook: same fast timing for payment success/failed handling
- Exported `createTestPlan` from main entry point
- Updated docs: testing guide with test cards, dunning test flow, cron timeline

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
