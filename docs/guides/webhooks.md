---
title: Webhooks
---

# Webhooks

Webhooks notify your backend when subscription events occur. Semaphore receives events from Nomba and forwards them to your handler.

## Setting Up

```bash
# Environment variable
NOMBA_CHECKOUT_CALLBACK_URL=https://your-api.example.com/webhook/nomba
```

## Webhook Endpoint

```typescript
// In your Cloudflare Worker
app.post('/webhook/nomba', async (c) => {
  const event = await engine.handleWebhook(c.req.raw);
  
  switch (event.type) {
    case 'checkout.completed':
      // Payment successful, subscription activated
      console.log('Subscription:', event.data.subscriptionId);
      break;
      
    case 'subscription.renewed':
      // Recurring payment succeeded
      console.log('Renewed until:', event.data.currentPeriodEnd);
      break;
      
    case 'subscription.canceled':
      // Subscription canceled
      console.log('Cancels at:', event.data.currentPeriodEnd);
      break;
  }
  
  return c.json({ received: true });
});
```

## Event Types

| Event | Trigger |
|---|---|
| `checkout.completed` | Initial payment successful |
| `subscription.renewed` | Recurring payment successful |
| `subscription.canceled` | Subscription canceled |
| `payment.failed` | Payment failed, entering dunning |

## Verifying Webhooks

Semaphore automatically verifies webhook signatures before processing. Invalid signatures are rejected with 400.

## Retry Policy

Failed webhook deliveries are retried with exponential backoff:
- 1st retry: 1 minute
- 2nd retry: 5 minutes
- 3rd retry: 30 minutes
- 4th retry: 2 hours
- 5th retry: 24 hours
