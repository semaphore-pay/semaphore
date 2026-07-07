---
title: Collections API
---

# Collections API

## Create Collection

```http
POST /api/v1/billing/collections
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "name": "My App",
  "description": "Production",
  "environment": "sandbox"
}
```

### Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Collection name |
| `description` | string | no | Collection description |
| `environment` | string | no | `"sandbox"` (default) or `"production"` |

### Response

```json
{
  "collection": {
    "id": "col_abc123",
    "name": "My App",
    "description": "Production",
    "environment": "sandbox",
    "createdAt": "2026-07-05T12:00:00Z"
  },
  "keys": {
    "public": "sem_pk_test_abc123",
    "secret": "sem_sk_test_def456"
  }
}
```

## List Collections

```http
GET /api/v1/billing/collections
Cookie: semaphore.session=...
```

### Response

```json
[
  {
    "id": "col_abc123",
    "name": "My App",
    "environment": "sandbox",
    "plans": 3,
    "products": 5,
    "customers": 123,
    "activeSubscriptions": 89,
    "createdAt": "2026-07-05T12:00:00Z"
  }
]
```

## Get Collection

```http
GET /api/v1/billing/collections/:id
Cookie: semaphore.session=...
```

### Response

```json
{
  "id": "col_abc123",
  "name": "My App",
  "description": "Production",
  "environment": "sandbox",
  "plans": 3,
  "products": 5,
  "customers": 123,
  "activeSubscriptions": 89,
  "createdAt": "2026-07-05T12:00:00Z"
}
```

## Get Collection Analytics

```http
GET /api/v1/billing/collections/:id/analytics
Cookie: semaphore.session=...
```

### Response

```json
{
  "mrr": 299900,
  "arr": 3598800,
  "activeTrials": 12,
  "subscribersByStatus": {
    "active": 89,
    "trialing": 12,
    "past_due": 3,
    "canceled": 45
  },
  "planBreakdown": [
    {
      "planId": "plan_pro_monthly",
      "planName": "Pro",
      "subscribers": 67,
      "mrr": 199900,
      "interval": "monthly"
    }
  ],
  "stats": {
    "plans": 3,
    "products": 5,
    "customers": 123,
    "activeSubscriptions": 89
  }
}
```

## Delete Collection

```http
DELETE /api/v1/billing/collections/:id
Cookie: semaphore.session=...
```

::: danger
This permanently deletes the collection and all its API keys.
:::

## API Keys

### List API Keys

```http
GET /api/v1/billing/collections/:id/api-keys
Cookie: semaphore.session=...
```

### Generate API Key

```http
POST /api/v1/billing/collections/:id/api-keys
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "type": "secret",
  "environment": "development"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | no | `"public"` or `"secret"` (default: `"secret"`) |
| `environment` | string | no | `"development"` or `"production"` (default: matches collection) |

### Revoke API Key

```http
DELETE /api/v1/billing/collections/:id/api-keys/:key
Cookie: semaphore.session=...
```
