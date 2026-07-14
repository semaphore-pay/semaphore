---
title: Subscriptions
---

# Subscriptions

Subscriptions represent a customer's access to a plan. They track billing status, renewal dates, and cancellation state.

## Subscription Lifecycle

```
created → active → past_due → canceled
                 ↘ trialed ↗
                      ↓
                   paused → active (resumed)
```

| Status | Description |
|---|---|
| `active` | Subscription is current and billing |
| `trialing` | In free trial period |
| `past_due` | Payment failed, in dunning period |
| `canceled` | Subscription ended (either immediately or at period end) |
| `paused` | Subscription temporarily paused |
| `pending_payment` | Awaiting initial payment (checkout in progress) |

## Creating a Subscription

```typescript
import { subscribe } from '@semaphore-pay/server';

const result = await subscribe(engine, {
  customerId: 'cust_abc123',
  planId: 'plan_pro_monthly',
}, {
  collectionId: 'col_abc123',
  environment: 'development',
});

console.log(result.status); // 'active' for free, 'pending_payment' for paid
console.log(result.checkout?.checkoutLink); // Nomba checkout URL
```

## Canceling a Subscription

End users can cancel their own subscriptions:

```typescript
// Client SDK
const result = await client.cancelSubscription('sub_abc123');
```

::: info
Canceling sets `cancelAtPeriodEnd: true`. The subscription remains active until the current period ends.
:::

## Pausing a Subscription

```typescript
import { pause } from '@semaphore-pay/server/subscription';

await pause(engine, 'sub_abc123', { collectionId: 'col_abc123' });
```

## Resuming a Subscription

```typescript
import { resume } from '@semaphore-pay/server/subscription';

await resume(engine, 'sub_abc123', { collectionId: 'col_abc123' });
```

## Renewals

Renewals are handled automatically via cron job. When a subscription's `currentPeriodEnd` passes:

1. Backend charges the tokenized card via Nomba
2. On success, updates `currentPeriodEnd` to next period
3. On failure, enters dunning with retry schedule

## Checking Entitlements

```typescript
import { check } from '@semaphore-pay/server';

const entitlement = await check(engine, {
  customerId: 'cust_abc123',
  featureId: 'api_access',
}, { collectionId: 'col_abc123' });

if (entitlement.allowed) {
  // Grant access
}
```

## Reporting Usage

For metered billing:

```typescript
import { report } from '@semaphore-pay/server';

await report(engine, {
  customerId: 'cust_abc123',
  featureId: 'api_calls',
  amount: 150,
}, { collectionId: 'col_abc123' });
```

## Fetching Subscriptions

```typescript
import { list as listSubscriptions } from '@semaphore-pay/server';

const subscriptions = await listSubscriptions(engine, {
  status: 'active',
  limit: 20,
}, { collectionId: 'col_abc123' });
```
