# Changelog

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
