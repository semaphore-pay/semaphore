---
title: First API Call
---

# First API Call

Walk through creating a subscription from scratch.

## Step 1: Create a Collection

```typescript
import { createSemaphoreEngine } from '@semaphore-pay/server';

const engine = createSemaphoreEngine({
  db: env.SEMAPHORE_DB,
  nomba: {
    clientId: env.NOMBA_CLIENT_ID,
    clientSecret: env.NOMBA_CLIENT_SECRET,
    accountId: env.NOMBA_ACCOUNT_ID,
  },
  webhookSecret: env.NOMBA_WEBHOOK_SECRET,
  callbackUrl: env.NOMBA_CHECKOUT_CALLBACK_URL,
});

const collection = await engine.createCollection({
  name: 'My SaaS App',
  description: 'Production',
});

console.log(collection.id); // Use this for all subsequent calls
console.log(collection.publicKey); // pk_... for client SDK
console.log(collection.secretKey); // sk_... for server-side admin
```

## Step 2: Create a Plan

Plans define pricing and billing intervals.

```typescript
const plan = await engine.createPlan(collection.id, {
  name: 'Pro',
  description: 'Full access',
  amount: 5000, // ₦50.00 in kobo
  currency: 'NGN',
  interval: 'month',
  intervalCount: 1,
  trialPeriodDays: 14,
});
```

## Step 3: Create a Product

Products are what customers subscribe to. Each product links to a plan.

```typescript
const product = await engine.createProduct(collection.id, {
  name: 'Pro Access',
  description: 'Unlimited access to all features',
  planId: plan.id,
  metadata: {
    features: 'unlimited,api,export',
  },
});
```

## Step 4: Create a Customer

```typescript
const customer = await engine.upsertCustomer(collection.id, {
  userId: 'user_abc123',
  email: 'user@example.com',
  name: 'John Doe',
  metadata: {
    company: 'Acme Inc',
  },
});
```

## Step 5: Subscribe

```typescript
const subscription = await engine.subscribe(collection.id, {
  customerId: customer.id,
  productId: product.id,
  paymentMethod: {
    type: 'card',
    token: 'tok_card_...', // From Nomba checkout
  },
});

console.log(subscription.status); // 'active'
console.log(subscription.currentPeriodEnd); // Next billing date
```

## Step 6: Check Entitlement

```typescript
const entitlement = await engine.checkEntitlement(collection.id, {
  customerId: customer.id,
  feature: 'api_access',
});

console.log(entitlement.entitled); // true/false
```

## Next Steps

- [Collections](/concepts/collections) — understand multi-tenancy
- [Webhooks](/guides/webhooks) — handle subscription events
- [Testing](/guides/testing) — test in sandbox mode
