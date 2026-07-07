---
title: Products & Plans
---

# Products & Plans

Plans define pricing. Products are what customers actually use.

## Plans

A plan defines how much to charge and how often.

```typescript
import { create } from '@semaphore-pay/server';

const plan = await create(engine, {
  name: 'Pro',
  description: 'Full access',
  priceAmount: 5000, // ₦50.00 in kobo
  priceCurrency: 'NGN',
  interval: 'monthly',
  trialPeriodDays: 14,
}, {
  collectionId: 'col_abc123',
  environment: 'development',
});
```

### Plan Parameters

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name |
| `description` | string | Optional description |
| `priceAmount` | number | Price in smallest currency unit (kobo for NGN) |
| `priceCurrency` | string | ISO 4217 currency code |
| `interval` | string | `"monthly"`, `"yearly"`, or `"none"` |
| `trialPeriodDays` | number | Optional trial length |
| `badge` | string | Optional display badge (e.g. `"Most Popular"`) |
| `ctaText` | string | Optional call-to-action text |
| `sortOrder` | number | Display order (lower = first) |

### Plan ID Format

Plan IDs are auto-generated: `plan_{sanitized_name}_{interval}`

Examples:
- `plan_pro_monthly`
- `plan_enterprise_yearly`
- `plan_basic_none`

## Products

Products are what customers subscribe to or purchase. Each product has its own features.

```typescript
import { createProduct } from '@semaphore-pay/server';

const product = await createProduct(engine, {
  name: 'Pro Access',
  description: 'Unlimited access to all features',
  features: [
    { featureId: 'api_calls', type: 'limit', limit: 10000 },
    { featureId: 'export', type: 'boolean' },
    { featureId: 'pro_mode', type: 'boolean' },
  ],
}, {
  collectionId: 'col_abc123',
  environment: 'development',
});
```

### Product Parameters

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name |
| `description` | string | Optional description |
| `features` | FeatureInput[] | Features attached to this product |

### FeatureInput

| Field | Type | Description |
|---|---|---|
| `featureId` | string | Feature identifier (e.g. `"api_calls"`) |
| `type` | string | `"boolean"` for on/off, `"limit"` for metered |
| `limit` | number | Max units for metered features |
| `resetInterval` | string | `"day"`, `"week"`, `"month"`, or `"year"` |

## Listing

```typescript
import { list } from '@semaphore-pay/server';
import { listProducts } from '@semaphore-pay/server';

// List plans
const plans = await list(engine, {}, {
  collectionId: 'col_abc123',
  environment: 'development',
});

// List products
const products = await listProducts(engine, {
  collectionId: 'col_abc123',
  environment: 'development',
});
```

## Getting by ID

```typescript
import { get } from '@semaphore-pay/server';
import { getProduct } from '@semaphore-pay/server';

const plan = await get(engine, { planId: 'plan_pro_monthly' }, {
  collectionId: 'col_abc123',
  environment: 'development',
});

const product = await getProduct(engine, {
  productId: 'prod_xyz789',
  collectionId: 'col_abc123',
  environment: 'development',
});
```

## Plans vs Products

| Aspect | Plan | Product |
|---|---|---|
| Purpose | Defines pricing & billing | Defines features & access |
| Price | Has `priceAmount` | No price (links to plan via subscription) |
| Features | Can have features attached | Has features directly |
| Subscription | Customer subscribes to plan | Customer gets access via plan subscription |
