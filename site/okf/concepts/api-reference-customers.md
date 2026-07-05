---
type: concept
title: "Customers API"
source: "https://docs.semaphorepay.tech/api-reference/customers/"
path: /api-reference/customers/
updated: 2026-07-05
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-05T13:54:02.033Z"
---
---
title: Customers API
---

# Customers API

## Upsert Customer

```http
POST /api/v1/billing/collections/:id/customers
Content-Type: application/json
x-api-key: pk_...
```

```json
{
  "userId": "user_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "metadata": {
    "company": "Acme Inc"
  }
}
```

### Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | string | yes | Your internal user ID |
| `email` | string | yes | Customer email |
| `name` | string | no | Customer name |
| `metadata` | object | no | Custom data |

### Response

```json
{
  "id": "cust_abc123",
  "userId": "user_abc123",
  "email": "user@example.com",
  "name": "John Doe"
}
```

## Get Customer

```http
GET /api/v1/billing/collections/:id/customers/:customerId
x-api-key: pk_...
```

### Response

```json
{
  "id": "cust_abc123",
  "userId": "user_abc123",
  "email": "user@example.com",
  "subscriptions": [
    {
      "productId": "prod_xyz789",
      "status": "active",
      "currentPeriodEnd": "2026-08-05T12:00:00Z"
    }
  ]
}
```
