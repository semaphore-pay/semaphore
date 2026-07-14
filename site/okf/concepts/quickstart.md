---
type: concept
title: "Quick Start"
source: "https://docs.semaphorepay.tech/quickstart/"
path: /quickstart/
updated: 2026-07-14
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-14T15:56:13.476Z"
---
---
title: Quick Start
---

# Quick Start

Get Semaphore running in your project in 5 minutes.

## Prerequisites

- Node.js 18+ or Bun
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

## 3. Create a Collection

A collection is like a RevenueCat project — an isolated tenant with its own API keys.

```typescript
import { createCollection, createApiKey } from '@semaphore-pay/server';

const collection = await createCollection(engine, 'My App', 'sandbox');

// Generate API keys for the collection
const publicKey = await createApiKey(engine, {
  collectionId: collection.id,
  type: 'public',
  environment: 'development',
  userId: user.id,
});

const secretKey = await createApiKey(engine, {
  collectionId: collection.id,
  type: 'secret',
  environment: 'development',
});
```

## 4. Set Up the Client SDK

```typescript
import { SemaphorePayClient } from '@semaphore-pay/client';

const client = new SemaphorePayClient({
  baseUrl: 'https://your-api.example.com',
  apiKey: 'pk_your_public_api_key',
  collectionId: 'your_collection_id',
});
```

## 5. Create Your First Subscription

```typescript
import { createPlan, createProduct, subscribe } from '@semaphore-pay/server';

// Server: create a plan
const plan = await createPlan(engine, {
  name: 'Pro Plan',
  description: 'Full access to all features',
  priceAmount: 2999, // ₦29.99 in kobo
  priceCurrency: 'NGN',
  interval: 'monthly',
}, {
  collectionId: collection.id,
  environment: 'development',
});

// Server: create a product
const product = await createProduct(engine, {
  id: 'prod_pro_access',
  name: 'Pro Access',
  features: [],
}, {
  collectionId: collection.id,
  environment: 'development',
});

// Client: subscribe a customer
const subscription = await client.subscribeToPlan({
  customerId: 'cust_abc123',
  planId: plan.id,
});
```

## 6. Handle Webhooks

```typescript
import { Hono } from 'hono';
import { handleWebhook } from '@semaphore-pay/server';

const app = new Hono();

app.post('/webhook', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('nomba-signature') ?? '';
  const nombaTimestamp = c.req.header('nomba-timestamp') ?? '';

  const result = await handleWebhook(engine, {
    rawBody,
    signature,
    webhookSecret: c.env.NOMBA_WEBHOOK_SECRET,
    nombaTimestamp,
  });

  return c.json(result);
});
```

## What's Next

- [Install SDK](/quickstart/install) — detailed installation
- [First API Call](/quickstart/first-call) — step-by-step walkthrough
- [Collections](/concepts/collections) — understand multi-tenancy
