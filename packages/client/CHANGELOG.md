# Changelog

## 0.1.6

### Added
- `listSubscriptions()` — fetches active subscriptions for the current customer, used to restore subscription state on page reload
- `listPurchases()` — fetches product purchases for the current customer, used to restore purchase state on page reload

## 0.1.5

### Added
- `Feature` interface now exported from `@semaphore-pay/client` (was in source but missing from dist types)

## 0.1.4

### Added
- Initial release with `SemaphorePayClient`
- Plan, Product, Feature, FeatureInput types
- Subscription management (subscribe, cancel)
- Product purchases
- Entitlement checking and reporting
- Payment verification with polling
- React hooks (`useSemaphorePayStore`)
- React Native support

## 0.1.3

- Added `test_15min` to `PlanInterval` type for test plans with 15-minute billing cycles

## 0.1.2

- **BREAKING:** `getCustomer()` removed — replaced with `getMe()` (resolves customer from key's userId)
- **BREAKING:** Fixed request path — all requests now correctly prepend `/client` prefix
- Added `verifyPayment(orderReference)` — verify payment via backend + Nomba API
- Added `waitForPayment(orderReference, opts?)` — polls with exponential backoff (0s/5s/20s/40s/80s/160s)
- Added `VerifyPaymentResult` type

## 0.1.1

- Fixed `tsconfig.build.json` to include `.tsx` files (React Native components now build correctly)
- Added `./react` export with zustand store and `useSemaphorePay` hook
- Moved `typescript` from peerDependencies to devDependencies
- Added `license` field

## 0.1.0

- Initial release