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
```

## Test Cards

Use Nomba's test card numbers:

| Card | Result |
|---|---|
| `4111111111111111` | Success |
| `4000000000000002` | Declined |
| `4000000000009995` | Insufficient funds |

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

## Unit Testing

```typescript
import { createSemaphoreEngine } from '@semaphore-pay/server';

// Use in-memory SQLite for tests
const engine = createSemaphoreEngine({
  db: ':memory:',
  nomba: {
    clientId: 'test',
    clientSecret: 'test',
    accountId: 'test',
  },
  webhookSecret: 'test',
  callbackUrl: 'http://localhost:3000/webhook',
});

// Test subscription flow
const collection = await engine.createCollection({ name: 'Test' });
const plan = await engine.createPlan(collection.id, {
  name: 'Test Plan',
  amount: 1000,
  currency: 'NGN',
  interval: 'month',
  intervalCount: 1,
});
```
