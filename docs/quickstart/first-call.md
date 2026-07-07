---
title: First API Call
---

# First API Call

Walk through creating a subscription from scratch.

## Step 1: Initialize the Engine

```typescript
import { initSemaphorePay } from '@semaphore-pay/server';
import { drizzle } from 'drizzle-orm/d1';
import * as sqliteSchema from '@semaphore-pay/server/schema/sqlite';

const db = drizzle(env.SEMAPHORE_DB, { schema: sqliteSchema });

const engine = initSemaphorePay({
  dialect: 'sqlite',
  db,
  supportsTransactions: false,
});
```

## Step 2: Create a Collection

```typescript
import { createCollection, createApiKey } from '@semaphore-pay/server';

const collection = await createCollection(engine, 'My SaaS App', 'sandbox');

console.log(collection.id); // Use this for all subsequent calls

// Generate API keys
const publicKey = await createApiKey(engine, {
  collectionId: collection.id,
  type: 'public',
  environment: 'development',
  userId: user.id,
});

console.log(publicKey.key); // pk_... for client SDK
```

## Step 3: Create a Plan

Plans define pricing and billing intervals.

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
  collectionId: collection.id,
  environment: 'development',
});
```

## Step 4: Create a Product

Products are what customers subscribe to. Each product has its own features.

```typescript
import { createProduct } from '@semaphore-pay/server';

const product = await createProduct(engine, {
  name: 'Pro Access',
  description: 'Unlimited access to all features',
  features: [
    { featureId: 'api_calls', type: 'limit', limit: 10000 },
    { featureId: 'export', type: 'boolean' },
  ],
}, {
  collectionId: collection.id,
  environment: 'development',
});
```

## Step 5: Create a Customer

```typescript
import { upsertCustomer } from '@semaphore-pay/server';

const customer = await upsertCustomer(engine, {
  userId: 'user_abc123',
  email: 'user@example.com',
  name: 'John Doe',
}, { collectionId: collection.id });
```

## Step 6: Subscribe

```typescript
import { subscribe } from '@semaphore-pay/server';

const subscription = await subscribe(engine, {
  customerId: customer.id,
  planId: plan.id,
}, {
  collectionId: collection.id,
  environment: 'development',
});

console.log(subscription.status); // 'active' or 'pending_payment'
console.log(subscription.checkout?.checkoutLink); // Nomba checkout URL for paid plans
```

## Step 7: Check Entitlement

```typescript
import { check } from '@semaphore-pay/server';

const entitlement = await check(engine, {
  customerId: customer.id,
  featureId: 'api_calls',
}, { collectionId: collection.id });

console.log(entitlement.allowed); // true/false
console.log(entitlement.balance); // { limit, remaining, resetAt, unlimited }
```

## Next Steps

- [Collections](/concepts/collections) — understand multi-tenancy
- [Webhooks](/guides/webhooks) — handle subscription events
- [Testing](/guides/testing) — test in sandbox mode
