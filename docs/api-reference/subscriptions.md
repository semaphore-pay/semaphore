---
title: Subscriptions API
---

# Subscriptions API

## Subscribe

```http
POST /api/v1/billing/collections/:collectionId/subscriptions/subscribe
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "customerId": "cust_abc123",
  "planId": "plan_pro_monthly"
}
```

### Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `customerId` | string | yes | Customer ID |
| `planId` | string | yes | Plan ID (e.g. `"plan_pro_monthly"`) |

### Response

```json
{
  "subscriptionId": "sub_abc123",
  "status": "active",
  "nombaOrderReference": "order_xyz789",
  "trialEndAt": null,
  "checkout": {
    "checkoutLink": "https://sandbox.nomba.com/checkout/...",
    "orderReference": "order_xyz789"
  }
}
```

::: info
For free plans (price = 0), status is `"active"` and `checkout` is null. For paid plans, status is `"pending_payment"` and `checkout` contains the Nomba checkout link.
:::

## List Subscriptions

```http
GET /api/v1/billing/collections/:collectionId/subscriptions?status=active&limit=20&offset=0
Cookie: semaphore.session=...
```

### Query Parameters

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter by status: `active`, `trialing`, `past_due`, `canceled`, `paused` |
| `planId` | string | Filter by plan ID |
| `customerId` | string | Filter by customer ID |
| `limit` | number | Results per page |
| `offset` | number | Pagination offset |

## Get Subscription

```http
GET /api/v1/billing/collections/:collectionId/subscriptions/:subscriptionId
Cookie: semaphore.session=...
```

## Cancel Subscription

```http
POST /api/v1/billing/collections/:collectionId/subscriptions/:subscriptionId/cancel
Cookie: semaphore.session=...
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
Canceling sets `cancelAtPeriodEnd: true`. The subscription remains active until the current period ends.
:::

## Pause Subscription

```http
POST /api/v1/billing/collections/:collectionId/subscriptions/:subscriptionId/pause
Cookie: semaphore.session=...
```

## Resume Subscription

```http
POST /api/v1/billing/collections/:collectionId/subscriptions/:subscriptionId/resume
Cookie: semaphore.session=...
```

## Reactivate Subscription

```http
POST /api/v1/billing/collections/:collectionId/subscriptions/:subscriptionId/reactivate
Cookie: semaphore.session=...
```

## Subscribe (Client SDK)

```http
POST /client/subscriptions/subscribe
Content-Type: application/json
x-api-key: pk_...
```

```json
{
  "customerId": "cust_abc123",
  "planId": "plan_pro_monthly"
}
```

## Cancel (Client SDK)

```http
POST /client/subscriptions/:subscriptionId/cancel
x-api-key: pk_...
```
