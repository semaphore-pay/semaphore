---
type: concept
title: "Subscriptions API"
source: "https://docs.semaphorepay.tech/api-reference/subscriptions/"
path: /api-reference/subscriptions/
updated: 2026-07-05
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-05T13:54:02.037Z"
---
---
title: Subscriptions API
---

# Subscriptions API

## Subscribe

```http
POST /api/v1/billing/collections/:id/subscriptions/subscribe
Content-Type: application/json
x-api-key: pk_...
```

```json
{
  "customerId": "cust_abc123",
  "productId": "prod_xyz789",
  "paymentMethod": {
    "type": "card",
    "token": "tok_..."
  }
}
```

### Response

```json
{
  "id": "sub_abc123",
  "customerId": "cust_abc123",
  "productId": "prod_xyz789",
  "status": "active",
  "currentPeriodStart": "2026-07-05T12:00:00Z",
  "currentPeriodEnd": "2026-08-05T12:00:00Z"
}
```

## Cancel Subscription

```http
POST /api/v1/billing/collections/:id/subscriptions/:subId/cancel
x-api-key: pk_...
```

### Response

```json
{
  "id": "sub_abc123",
  "cancelAtPeriodEnd": true,
  "currentPeriodEnd": "2026-08-05T12:00:00Z"
}
```

::: info
Canceling sets `cancelAtPeriodEnd: true`. The subscription remains active until the period ends.
:::
