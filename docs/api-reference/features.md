---
title: Features API
---

# Features API

Features define what capabilities a plan or product provides. They are boolean (on/off) or limit (metered with quota).

## Create Feature

```http
POST /api/v1/billing/collections/:collectionId/features
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "id": "api_calls",
  "name": "API Calls",
  "type": "limit"
}
```

### Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique feature identifier (e.g. `"api_calls"`) |
| `name` | string | yes | Display name |
| `type` | string | yes | `"boolean"` for on/off, `"limit"` for metered |

## List Features

```http
GET /api/v1/billing/collections/:collectionId/features
Cookie: semaphore.session=...
```

## Delete Feature

```http
DELETE /api/v1/billing/collections/:collectionId/features/:featureId
Cookie: semaphore.session=...
```

## Attach Feature to Plan

```http
POST /api/v1/billing/collections/:collectionId/features/attach-plan
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "planId": "plan_pro_monthly",
  "featureId": "api_calls",
  "type": "limit",
  "limit": 10000,
  "resetInterval": "month"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `planId` | string | yes | Plan to attach to |
| `featureId` | string | yes | Feature to attach |
| `type` | string | yes | `"boolean"` or `"limit"` |
| `limit` | number | no | Max units (for limit features) |
| `resetInterval` | string | no | `"day"`, `"week"`, `"month"`, or `"year"` |
| `config` | object | no | Custom configuration |

## Detach Feature from Plan

```http
POST /api/v1/billing/collections/:collectionId/features/detach-plan
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "planId": "plan_pro_monthly",
  "featureId": "api_calls"
}
```

## Attach Feature to Product

```http
POST /api/v1/billing/collections/:collectionId/features/attach-product
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "productInternalId": "prod_a1b2c3d4",
  "featureId": "pro_mode",
  "type": "boolean"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `productInternalId` | string | yes | Product internal ID to attach to |
| `featureId` | string | yes | Feature to attach |
| `type` | string | yes | `"boolean"` or `"limit"` |
| `limit` | number | no | Max units (for limit features) |
| `resetInterval` | string | no | `"day"`, `"week"`, `"month"`, or `"year"` |
| `config` | object | no | Custom configuration |

## Detach Feature from Product

```http
POST /api/v1/billing/collections/:collectionId/features/detach-product
Content-Type: application/json
Cookie: semaphore.session=...
```

```json
{
  "productInternalId": "prod_a1b2c3d4",
  "featureId": "pro_mode"
}
```
