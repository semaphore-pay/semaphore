---
type: concept
title: "API Reference"
source: "https://docs.semaphorepay.tech/api-reference/"
path: /api-reference/
updated: 2026-07-05
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-05T13:54:02.038Z"
---
---
title: API Reference
---

# API Reference

All endpoints are under `/api/v1/billing`. Authentication is required via session cookie or API key.

## Authentication

| Method | Header | Purpose |
|---|---|---|
| Session | `Cookie: semaphore.session=...` | Developer dashboard |
| API Key | `x-api-key: pk_...` | End-user client SDK |
| API Key | `x-api-key: sk_...` | Server-side admin |

## Base URL

```
https://your-api.example.com/api/v1/billing
```

## Collections

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collections` | Create a collection |
| `GET` | `/collections` | List all collections |
| `GET` | `/collections/:id` | Get a collection |
| `DELETE` | `/collections/:id` | Delete a collection |

## Plans

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collections/:id/plans` | Create a plan |
| `GET` | `/collections/:id/plans` | List plans |
| `GET` | `/collections/:id/plans/:planId` | Get a plan |

## Products

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collections/:id/products` | Create a product |
| `GET` | `/collections/:id/products` | List products |
| `GET` | `/collections/:id/products/:productId` | Get a product |

## Customers

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collections/:id/customers` | Upsert a customer |
| `GET` | `/collections/:id/customers/:customerId` | Get a customer |

## Subscriptions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collections/:id/subscriptions/subscribe` | Subscribe a customer |
| `POST` | `/collections/:id/subscriptions/:subId/cancel` | Cancel a subscription |

## Entitlements

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collections/:id/entitlements/check` | Check entitlement |
| `POST` | `/collections/:id/entitlements/report` | Report usage |

## Webhooks

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/webhook/nomba` | Nomba webhook receiver |
