---
type: concept
title: "Products & Plans"
source: "https://docs.semaphorepay.tech/concepts/products-plans/"
path: /concepts/products-plans/
updated: 2026-07-05
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-05T13:54:02.040Z"
---
---
title: Products & Plans
---

# Products & Plans

Plans define pricing. Products are what customers subscribe to.

## Plans

A plan defines how much to charge and how often.

```typescript
const plan = await engine.createPlan(collectionId, {
  name: 'Pro',
  description: 'Full access',
  amount: 5000, // ₦50.00 in kobo
  currency: 'NGN',
  interval: 'month',
  intervalCount: 1,
  trialPeriodDays: 14,
});
```

### Plan Parameters

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name |
| `description` | string | Optional description |
| `amount` | number | Price in smallest currency unit (kobo for NGN) |
| `currency` | string | ISO 4217 currency code |
| `interval` | string | `day`, `week`, `month`, or `year` |
| `intervalCount` | number | Billing frequency (e.g., 3 for every 3 months) |
| `trialPeriodDays` | number | Optional trial length |

## Products

Products are what customers actually subscribe to. Each product links to one or more plans.

```typescript
const product = await engine.createProduct(collectionId, {
  name: 'Pro Access',
  description: 'Unlimited access to all features',
  planId: plan.id,
  metadata: {
    features: 'unlimited,api,export,priority_support',
  },
});
```

### Product Parameters

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name |
| `description` | string | Optional description |
| `planId` | string | ID of the associated plan |
| `metadata` | object | Key-value pairs for custom data |

## Listing

```typescript
// List plans
const plans = await engine.listPlans(collectionId);

// List products
const products = await engine.listProducts(collectionId);
```

## Getting by ID

```typescript
const plan = await engine.getPlan(collectionId, 'plan_abc123');
const product = await engine.getProduct(collectionId, 'prod_xyz789');
```
