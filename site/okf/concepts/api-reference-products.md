---
type: concept
title: "Products API"
source: "https://docs.semaphorepay.tech/api-reference/products/"
path: /api-reference/products/
updated: 2026-07-05
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-05T13:54:02.035Z"
---
---
title: Products API
---

# Products API

## Create Product

```http
POST /api/v1/billing/collections/:id/products
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "name": "Pro Access",
  "description": "Unlimited access",
  "planId": "plan_abc123",
  "metadata": {
    "features": "api,export,priority_support"
  }
}
```

### Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Product name |
| `description` | string | no | Product description |
| `planId` | string | yes | Associated plan ID |
| `metadata` | object | no | Custom key-value pairs |

### Response

```json
{
  "id": "prod_xyz789",
  "name": "Pro Access",
  "planId": "plan_abc123",
  "metadata": {
    "features": "api,export,priority_support"
  }
}
```

## List Products

```http
GET /api/v1/billing/collections/:id/products
Cookie: semaphore.session=...
```

## Get Product

```http
GET /api/v1/billing/collections/:id/products/:productId
Cookie: semaphore.session=...
```
