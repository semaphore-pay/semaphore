---
title: Webhooks
---

# Webhooks

Webhooks notify your backend when payment events occur. Semaphore receives events from Nomba and forwards them to your handler.

## Setting Up

```bash
# Environment variable
NOMBA_CHECKOUT_CALLBACK_URL=https://your-api.example.com/webhook
```

## Webhook Endpoint

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

## Event Types

| Event | Trigger |
|---|---|
| `payment_success` | Payment successful (initial or renewal) |
| `payment_failed` | Payment failed |
| `mandate.debit_success` | Recurring mandate debit successful |

## Verifying Webhooks

Semaphore automatically verifies webhook signatures using HMAC-SHA256 before processing. Invalid signatures are rejected with 400.

The signature is computed over colon-joined fields:

```
event_type:requestId:userId:walletId:transactionId:type:time:responseCode:nomba-timestamp
```

## Payment Verification Fallback

If webhooks aren't received (e.g. during development), use the payment verification endpoint:

```typescript
// Client SDK
const result = await client.verifyPayment('order_abc123');
console.log(result.status); // 'success', 'pending', 'failed'
console.log(result.processed); // true if just processed
```

Or poll with exponential backoff:

```typescript
const result = await client.waitForPayment('order_abc123', {
  maxAttempts: 6,
  delays: [0, 5000, 20000, 40000, 80000, 160000], // ~5 min total
  onAttempt: (attempt, result) => {
    console.log(`Attempt ${attempt}: ${result.status}`);
  },
});
```

## Webhook Response

Always return `200` to acknowledge receipt. Semaphore processes the event asynchronously.

```json
{
  "status": "processed"
}
```

## Testing Webhooks

Use the mock webhook script for local development:

```bash
cd packages/server
npx tsx mock-webhook.ts
```

This sends a signed `payment_success` event to `http://localhost:8787/webhook`.
