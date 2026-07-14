---
type: concept
title: Entitlements
source: "https://docs.semaphorepay.tech/concepts/entitlements/"
path: /concepts/entitlements/
updated: 2026-07-14
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-14T15:56:13.458Z"
---
---
title: Entitlements
---

# Entitlements

Entitlements control access to features. Check if a customer has access, and report usage for metered billing.

## Feature Types

| Type | Description | Balance |
|---|---|---|
| `boolean` | On/off access | null |
| `limit` | Metered with quota | `{ limit, remaining, resetAt, unlimited }` |

## Creating Features

Features are created separately and attached to plans/products:

```typescript
import { createFeatureApi } from '@semaphore-pay/server';

// Boolean feature
await createFeatureApi(engine, {
  id: 'pro_mode',
  name: 'Pro Mode',
  type: 'boolean',
}, { collectionId: 'col_abc123' });

// Limit feature
await createFeatureApi(engine, {
  id: 'api_calls',
  name: 'API Calls',
  type: 'limit',
}, { collectionId: 'col_abc123' });
```

## Attaching Features to Plans

```typescript
import { attachPlan } from '@semaphore-pay/server';

await attachPlan(engine, {
  planId: 'plan_pro_monthly',
  featureId: 'api_calls',
  type: 'limit',
  limit: 10000,
  resetInterval: 'month',
}, { collectionId: 'col_abc123' });
```

## Attaching Features to Products

```typescript
import { attachProduct } from '@semaphore-pay/server';

await attachProduct(engine, {
  productInternalId: 'prod_a1b2c3d4',
  featureId: 'pro_mode',
  type: 'boolean',
}, { collectionId: 'col_abc123' });
```

## Checking Entitlement

```typescript
import { check } from '@semaphore-pay/server';

const result = await check(engine, {
  customerId: 'cust_abc123',
  featureId: 'api_calls',
  required: 1,
}, { collectionId: 'col_abc123' });

if (result.allowed) {
  // Grant access to the feature
  return { access: true };
} else {
  // Deny access
  return { access: false, reason: 'subscription_required' };
}
```

### Response

```json
{
  "allowed": true,
  "balance": {
    "limit": 10000,
    "remaining": 9500,
    "resetAt": "2026-08-01T00:00:00Z",
    "unlimited": false
  }
}
```

## Reporting Usage

For metered features, report usage after each unit is consumed:

```typescript
import { report } from '@semaphore-pay/server';

await report(engine, {
  customerId: 'cust_abc123',
  featureId: 'api_calls',
  amount: 1,
}, { collectionId: 'col_abc123' });
```

### Common Usage Patterns

| Feature | Amount | Description |
|---|---|---|
| `api_calls` | 1 per call | Track API usage |
| `storage_gb` | 1 per GB | Track storage consumption |
| `seats` | 1 per user | Track team size |
| `exports` | 1 per export | Track data exports |

## Entitlement Logic

1. Customer must have an active or trialing subscription
2. Subscription must be linked to a plan/product with the requested feature
3. For limit features, balance must have sufficient remaining units
4. Entitlements can also come from product purchases (one-time)

::: info
Entitlement checks are synchronous. Use them for real-time access control.
:::

## Detaching Features

```typescript
import { detachPlan, detachProduct } from '@semaphore-pay/server';

// Detach from plan
await detachPlan(engine, {
  planId: 'plan_pro_monthly',
  featureId: 'api_calls',
}, { collectionId: 'col_abc123' });

// Detach from product
await detachProduct(engine, {
  productInternalId: 'prod_a1b2c3d4',
  featureId: 'pro_mode',
}, { collectionId: 'col_abc123' });
```
