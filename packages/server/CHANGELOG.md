# Changelog

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
