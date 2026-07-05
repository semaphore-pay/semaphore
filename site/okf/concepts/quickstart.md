---
type: concept
title: "Quick Start"
source: "https://docs.semaphorepay.tech/quickstart/"
path: /quickstart/
updated: 2026-07-05
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-05T13:54:02.051Z"
---
---
title: Quick Start
---

# Quick Start

Get Semaphore running in your project in 5 minutes.

## Prerequisites

- Node.js 18+
- A Nomba account (sandbox or production)
- Cloudflare account (for deployment)

## 1. Install the SDKs

```bash
# Server SDK (backend)
npm install @semaphore-pay/server

# Client SDK (end-user apps)
npm install @semaphore-pay/client
```

## 2. Set Up Your Backend

```typescript
import { createSemaphoreEngine } from '@semaphore-pay/server';

const engine = createSemaphoreEngine({
  db: env.SEMAPHORE_DB, // D1 database
  nomba: {
    clientId: env.NOMBA_CLIENT_ID,
    clientSecret: env.NOMBA_CLIENT_SECRET,
    accountId: env.NOMBA_ACCOUNT_ID,
  },
  webhookSecret: env.NOMBA_WEBHOOK_SECRET,
  callbackUrl: env.NOMBA_CHECKOUT_CALLBACK_URL,
});
```

## 3. Create a Collection

A collection is like a RevenueCat project — an isolated tenant with its own API keys.

```typescript
const collection = await engine.createCollection({
  name: 'My App',
  description: 'Production collection',
});
// Returns: { id, name, publicKey, secretKey }
```

## 4. Set Up the Client SDK

```typescript
import SemaphorePayClient from '@semaphore-pay/client';

const client = new SemaphorePayClient({
  baseUrl: 'https://your-api.example.com',
  apiKey: 'pk_your_public_api_key',
  collectionId: 'your_collection_id',
});
```

## 5. Create Your First Subscription

```typescript
// Server: create a plan
const plan = await engine.createPlan(collectionId, {
  name: 'Pro Plan',
  description: 'Full access to all features',
  amount: 2999, // ₦29.99
  currency: 'NGN',
  interval: 'month',
  intervalCount: 1,
});

// Server: create a product
const product = await engine.createProduct(collectionId, {
  name: 'Pro Access',
  planId: plan.id,
});

// Client: subscribe a customer
const subscription = await client.subscribe({
  productId: product.id,
  customerEmail: 'user@example.com',
  paymentMethod: {
    type: 'card',
    token: 'tok_...',
  },
});
```

## 6. Handle Webhooks

```typescript
// In your Cloudflare Worker
app.post('/webhook/nomba', async (c) => {
  const event = await engine.handleWebhook(c.req.raw);
  // Event types: checkout.completed, subscription.renewed, etc.
});
```

## What's Next

- [Install SDK](/quickstart/install) — detailed installation
- [First API Call](/quickstart/first-call) — step-by-step walkthrough
- [Collections](/concepts/collections) — understand multi-tenancy
