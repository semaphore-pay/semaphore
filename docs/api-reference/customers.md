---
title: Customers API
---

# Customers API

## Upsert Customer

```http
POST /api/v1/billing/collections/:collectionId/customers
Content-Type: application/json
Cookie: semaphore.session=...
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
| `email` | string | no | Customer email |
| `name` | string | no | Customer name |
| `metadata` | object | no | Custom key-value pairs |

### Response

```json
{
  "id": "cust_abc123",
  "userId": "user_abc123",
  "email": "user@example.com",
  "name": "John Doe"
}
```

## List Customers

```http
GET /api/v1/billing/collections/:collectionId/customers?search=john&limit=20&offset=0
Cookie: semaphore.session=...
```

### Query Parameters

| Param | Type | Description |
|---|---|---|
| `search` | string | Search by name or email |
| `limit` | number | Results per page (default: 20) |
| `offset` | number | Pagination offset |

### Response

```json
{
  "data": [
    {
      "id": "cust_abc123",
      "userId": "user_abc123",
      "email": "user@example.com",
      "name": "John Doe",
      "subscriptionCount": 2,
      "activeSubscriptionCount": 1,
      "lastActivityAt": "2026-07-05T12:00:00Z"
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

## Get Customer

```http
GET /api/v1/billing/collections/:collectionId/customers/:customerId
Cookie: semaphore.session=...
```

### Response

```json
{
  "id": "cust_abc123",
  "userId": "user_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "subscriptions": [
    {
      "productId": "prod_xyz789",
      "status": "active",
      "currentPeriodEnd": "2026-08-05T12:00:00Z"
    }
  ]
}
```

## Get Current Customer (Client SDK)

```http
GET /client/customers/me
x-api-key: pk_...
```

Returns the customer resolved from the API key's `userId`.

## Create Customer (Client SDK)

```http
POST /client/customers
Content-Type: application/json
x-api-key: pk_...
```

```json
{
  "userId": "user_abc123",
  "email": "user@example.com",
  "name": "John Doe"
}
```

::: info
When using a public API key, the `userId` is automatically set from the key's owner. You don't need to pass it.
:::
