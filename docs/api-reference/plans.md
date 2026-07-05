---
title: Plans API
---

# Plans API

## Create Plan

```http
POST /api/v1/billing/collections/:id/plans
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "name": "Pro",
  "description": "Full access",
  "amount": 5000,
  "currency": "NGN",
  "interval": "month",
  "intervalCount": 1,
  "trialPeriodDays": 14
}
```

### Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Plan name |
| `description` | string | no | Plan description |
| `amount` | number | yes | Price in kobo (₦50.00 = 5000) |
| `currency` | string | yes | ISO 4217 code |
| `interval` | string | yes | `day`, `week`, `month`, `year` |
| `intervalCount` | number | yes | Billing frequency |
| `trialPeriodDays` | number | no | Free trial length |

### Response

```json
{
  "id": "plan_abc123",
  "name": "Pro",
  "amount": 5000,
  "currency": "NGN",
  "interval": "month",
  "intervalCount": 1,
  "trialPeriodDays": 14
}
```

## List Plans

```http
GET /api/v1/billing/collections/:id/plans
Cookie: semaphore.session=...
```

## Get Plan

```http
GET /api/v1/billing/collections/:id/plans/:planId
Cookie: semaphore.session=...
```
