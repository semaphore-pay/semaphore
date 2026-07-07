---
type: guide
title: Testing
source: "https://docs.semaphorepay.tech/guides/testing/"
path: /guides/testing/
updated: 2026-07-07
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-07T20:01:08.644Z"
---
---
title: Testing
---

# Testing

Test your integration in Nomba's sandbox environment.

## Sandbox Mode

Use sandbox API keys for development:

```bash
NOMBA_SANDBOX_CLIENT_ID=your_sandbox_client_id
NOMBA_SANDBOX_CLIENT_SECRET=your_sandbox_client_secret
NOMBA_SANDBOX_ACCOUNT_ID=your_sandbox_account_id
NOMBA_WEBHOOK_SECRET=your_webhook_secret
NOMBA_CHECKOUT_CALLBACK_URL=http://localhost:8787/webhook
```

## Smoke Test

Run the client SDK smoke test:

```bash
cd packages/client
npx tsx scripts/smoke-test.ts
```

This tests:
- Collection creation
- Plan creation
- Product creation
- Customer creation
- Subscription flow
- Entitlement checks

## Full Test Suite

Run the comprehensive test suite:

```bash
cd packages/server
npx tsx test-client.ts
```

All 10 SDK methods are tested:
- `createCustomer`
- `getMe`
- `listPlans`
- `getPlan`
- `listProducts`
- `subscribeToPlan`
- `cancelSubscription`
- `purchaseProduct`
- `checkEntitlement`
- `reportEntitlement`

## Payment Flow Tests

Test the complete payment flow including webhooks and verification:

```bash
cd packages/server
npx tsx test-payment-flow.ts
```

14 test suites covering:
- Webhook processing
- Payment verification
- Deduplication
- Bad signature handling
- Missing fields
- Invalid references
- Already active subscriptions
- `waitForPayment` polling
- Product purchases
- Edge cases

## Mock Webhook

Test webhook handling locally:

```bash
cd packages/server
npx tsx mock-webhook.ts
```

Sends a signed `payment_success` event to `http://localhost:8787/webhook`.

## Unit Testing

```typescript
import { initSemaphorePay } from '@semaphore-pay/server';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as sqliteSchema from '@semaphore-pay/server/schema/sqlite';

// Use in-memory SQLite for tests
const sqlite = require('better-sqlite3')(':memory:');
const db = drizzle(sqlite, { schema: sqliteSchema });

const engine = initSemaphorePay({
  dialect: 'sqlite',
  db,
  supportsTransactions: true,
});

// Test subscription flow
import { createCollection, create, createProduct, upsertCustomer, subscribe } from '@semaphore-pay/server';

const collection = await createCollection(engine, 'Test', 'sandbox');
const plan = await create(engine, {
  name: 'Test Plan',
  priceAmount: 1000,
  priceCurrency: 'NGN',
  interval: 'monthly',
}, {
  collectionId: collection.id,
  environment: 'development',
});
```

## Test Cards

Nomba sandbox provides test card numbers for development. Refer to Nomba documentation for current test card numbers.
