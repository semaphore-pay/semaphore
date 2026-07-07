---
type: concept
title: "Products API"
source: "https://docs.semaphorepay.tech/api-reference/products/"
path: /api-reference/products/
updated: 2026-07-07
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-07T20:01:08.632Z"
---
---
title: Products API
---

# Products API

## Create Product

```http
POST /api/v1/billing/collections/:collectionId/products
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "name": "Pro Access",
  "description": "Unlimited access",
  "features": [
    { "featureId": "api_calls", "type": "limit", "limit": 10000 },
    { "featureId": "export", "type": "boolean" }
  ]
}
```

### Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Product name |
| `description` | string | no | Product description |
| `features` | FeatureInput[] | no | Features attached to this product |

### FeatureInput

| Field | Type | Required | Description |
|---|---|---|---|
| `featureId` | string | yes | Feature identifier (e.g. `"api_calls"`) |
| `type` | string | yes | `"boolean"` for on/off, `"limit"` for metered |
| `limit` | number | no | Max units for metered features |
| `resetInterval` | string | no | `"day"`, `"week"`, `"month"`, or `"year"` |

### Response

```json
{
  "internalId": "prod_a1b2c3d4",
  "id": "prod_xyz789",
  "collectionId": "col_abc123",
  "environment": "development",
  "version": 1,
  "name": "Pro Access",
  "group": "default",
  "isDefault": false,
  "priceAmount": null,
  "priceCurrency": "NGN",
  "priceInterval": null,
  "features": [
    { "featureId": "api_calls", "type": "limit", "limit": 10000 }
  ],
  "createdAt": "2026-07-05T12:00:00Z",
  "updatedAt": "2026-07-05T12:00:00Z"
}
```

## List Products

```http
GET /api/v1/billing/collections/:collectionId/products
Cookie: semaphore.session=...
```

## Get Product

```http
GET /api/v1/billing/collections/:collectionId/products/:productId
Cookie: semaphore.session=...
```

## Update Product

```http
PUT /api/v1/billing/collections/:collectionId/products/:productId
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "name": "Pro Access Updated",
  "features": [
    { "featureId": "api_calls", "type": "limit", "limit": 20000 }
  ]
}
```

## Delete Product

```http
DELETE /api/v1/billing/collections/:collectionId/products/:productId
Cookie: semaphore.session=...
```

::: danger
This permanently deletes the product. Customers with active access via this product will be affected.
:::

## Purchase Product (Client SDK)

```http
POST /client/products/purchase
Content-Type: application/json
x-api-key: pk_...
```

```json
{
  "customerId": "cust_abc123",
  "productInternalId": "prod_a1b2c3d4"
}
```

### Response

```json
{
  "id": "purch_xyz789",
  "status": "pending",
  "checkout": {
    "checkoutLink": "https://sandbox.nomba.com/checkout/...",
    "orderReference": "order_abc123"
  }
}
```
