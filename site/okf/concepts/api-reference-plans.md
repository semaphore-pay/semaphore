---
type: concept
title: "Plans API"
source: "https://docs.semaphorepay.tech/api-reference/plans/"
path: /api-reference/plans/
updated: 2026-07-14
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-14T15:56:13.453Z"
---
---
title: Plans API
---

# Plans API

## Create Plan

```http
POST /api/v1/billing/collections/:collectionId/plans
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "id": "plan_pro_monthly",
  "name": "Pro",
  "description": "Full access",
  "priceAmount": 5000,
  "priceCurrency": "NGN",
  "interval": "monthly",
  "trialPeriodDays": 14
}
```

### Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique plan ID (e.g. `"plan_pro_monthly"`) |
| `name` | string | yes | Plan name |
| `description` | string | no | Plan description |
| `priceAmount` | number | yes | Price in kobo (₦50.00 = 5000) |
| `priceCurrency` | string | yes | ISO 4217 code (e.g. `"NGN"`) |
| `interval` | string | yes | `"monthly"`, `"yearly"`, or `"none"` |
| `trialPeriodDays` | number | no | Free trial length in days |
| `badge` | string | no | Display badge (e.g. `"Most Popular"`) |
| `ctaText` | string | no | Call-to-action text (e.g. `"Start Free Trial"`) |
| `sortOrder` | number | no | Display order (lower = first) |

### Response

```json
{
  "id": "plan_pro_monthly",
  "collectionId": "col_abc123",
  "environment": "development",
  "name": "Pro",
  "description": "Full access",
  "priceAmount": 5000,
  "priceCurrency": "NGN",
  "interval": "monthly",
  "trialPeriodDays": 14,
  "badge": null,
  "ctaText": null,
  "sortOrder": 0,
  "isActive": true,
  "createdAt": "2026-07-05T12:00:00Z",
  "updatedAt": "2026-07-05T12:00:00Z"
}
```

::: info
Plan IDs are auto-generated from name + interval: `plan_{sanitized_name}_{interval}` (e.g. `plan_pro_monthly`).
:::

## List Plans

```http
GET /api/v1/billing/collections/:collectionId/plans
Cookie: semaphore.session=...
```

## Get Plan

```http
GET /api/v1/billing/collections/:collectionId/plans/:planId
Cookie: semaphore.session=...
```

## Deactivate Plan

```http
POST /api/v1/billing/collections/:collectionId/plans/:planId/deactivate
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "cancelRenewals": true
}
```

::: info
Deactivating a plan stops new subscriptions but existing ones continue until canceled or period ends.
:::

## Reactivate Plan

```http
POST /api/v1/billing/collections/:collectionId/plans/:planId/reactivate
Cookie: semaphore.session=...
```

## Delete Plan

```http
DELETE /api/v1/billing/collections/:collectionId/plans/:planId
Cookie: semaphore.session=...
```

::: danger
This permanently deletes the plan. Active subscriptions using this plan will be affected.
:::
