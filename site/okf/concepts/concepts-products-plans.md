---
type: concept
title: "Products & Plans"
source: "https://docs.semaphorepay.tech/concepts/products-plans/"
path: /concepts/products-plans/
updated: 2026-07-14
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-14T15:56:13.459Z"
---
---
title: Products & Plans
---

# Products & Plans

Plans define pricing. Products are what customers actually use.

## Plans

A plan defines how much to charge and how often.

```typescript
import { createPlan } from '@semaphore-pay/server';

const plan = await createPlan(engine, {
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
  id: 'prod_pro_access',
  name: 'Pro Access',
  features: [
    { id: 'api_calls', type: 'limit', limit: 10000 },
    { id: 'export', type: 'boolean' },
    { id: 'pro_mode', type: 'boolean' },
  ],
}, {
  collectionId: 'col_abc123',
  environment: 'development',
});
```

### Product Parameters

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique product identifier (e.g. `"prod_pro_access"`) |
| `name` | string | Display name |
| `features` | FeatureInput[] | Features attached to this product |

### FeatureInput

| Field | Type | Description |
|---|---|---|
| `id` | string | Feature identifier (e.g. `"api_calls"`) |
| `type` | string | `"boolean"` for on/off, `"limit"` for metered |
| `limit` | number | Max units for metered features |
| `resetInterval` | string | `"day"`, `"week"`, `"month"`, or `"year"` |

## Listing

```typescript
import { listPlans } from '@semaphore-pay/server';
import { listProducts } from '@semaphore-pay/server';

// List plans
const plans = await listPlans(engine, {}, {
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
import { getPlan } from '@semaphore-pay/server';
import { getProduct } from '@semaphore-pay/server';

const plan = await getPlan(engine, { planId: 'plan_pro_monthly' }, {
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
| Price | Has `priceAmount` | Optional `priceAmount` (can have standalone pricing) |
| Features | Can have features attached | Has features directly |
| Subscription | Customer subscribes to plan | Customer gets access via plan subscription |
