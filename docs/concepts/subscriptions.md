---
title: Subscriptions
---

# Subscriptions

Subscriptions represent a customer's access to a product. They track billing status, renewal dates, and cancellation state.

## Subscription Lifecycle

```
created → active → past_due → canceled
                 ↘ trialed ↗
```

| Status | Description |
|---|---|
| `active` | Subscription is current and billing |
| `trialing` | In free trial period |
| `past_due` | Payment failed, in dunning period |
| `canceled` | Subscription ended (either immediately or at period end) |

## Creating a Subscription

```typescript
const subscription = await engine.subscribe(collectionId, {
  customerId: 'cust_abc123',
  productId: 'prod_xyz789',
  paymentMethod: {
    type: 'card',
    token: 'tok_...',
  },
});
```

## Canceling a Subscription

End users can cancel their own subscriptions:

```typescript
// Client SDK
const result = await client.cancelSubscription({
  subscriptionId: 'sub_abc123',
});

console.log(result.cancelAtPeriodEnd); // true
console.log(result.currentPeriodEnd); // When access ends
```

::: info
Canceling sets `cancelAtPeriodEnd: true`. The subscription remains active until the current period ends.
:::

## Renewals

Renewals are handled automatically via cron job. When a subscription's `currentPeriodEnd` passes:

1. Backend charges the tokenized card via Nomba
2. On success, updates `currentPeriodEnd` to next period
3. On failure, enters dunning with retry schedule

## Checking Entitlements

```typescript
const check = await engine.checkEntitlement(collectionId, {
  customerId: 'cust_abc123',
  feature: 'api_access',
});

if (check.entitled) {
  // Grant access
}
```

## Reporting Usage

For metered billing:

```typescript
await engine.reportUsage(collectionId, {
  customerId: 'cust_abc123',
  feature: 'api_calls',
  quantity: 150,
});
```

## Fetching Subscriptions

```typescript
// Get customer's subscriptions
const subscriptions = await engine.getCustomer(collectionId, 'cust_abc123');
// Returns active, trialing, and past_due subscriptions
```
