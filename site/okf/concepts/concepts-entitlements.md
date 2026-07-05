---
type: concept
title: Entitlements
source: "https://docs.semaphorepay.tech/concepts/entitlements/"
path: /concepts/entitlements/
updated: 2026-07-05
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-05T13:54:02.040Z"
---
---
title: Entitlements
---

# Entitlements

Entitlements control access to features. Check if a customer has access, and report usage for metered billing.

## Checking Entitlement

```typescript
const check = await engine.checkEntitlement(collectionId, {
  customerId: 'cust_abc123',
  feature: 'api_access',
});

if (check.entitled) {
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
  "entitled": true,
  "customerId": "cust_abc123",
  "feature": "api_access"
}
```

## Reporting Usage

For metered features, report usage after each unit is consumed:

```typescript
await engine.reportUsage(collectionId, {
  customerId: 'cust_abc123',
  feature: 'api_calls',
  quantity: 1,
});
```

### Common Usage Patterns

| Feature | Quantity | Description |
|---|---|---|
| `api_calls` | 1 per call | Track API usage |
| `storage_gb` | 1 per GB | Track storage consumption |
| `seats` | 1 per user | Track team size |
| `exports` | 1 per export | Track data exports |

## Setting Up Features

Features are defined in your product metadata. When creating a product:

```typescript
const product = await engine.createProduct(collectionId, {
  name: 'Pro Access',
  planId: plan.id,
  metadata: {
    features: 'api_access,export,priority_support',
    api_limit: '10000',
    storage_limit: '50',
  },
});
```

## Entitlement Logic

1. Customer must have an active or trialing subscription
2. Subscription must be linked to the product with the requested feature
3. Usage must be within limits (if defined)

::: info
Entitlement checks are synchronous. Use them for real-time access control.
:::
