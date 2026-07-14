---
title: API Reference
---

# API Reference

Semaphore has two API layers: **Dashboard routes** (`/api/v1/billing`) for admin operations via session auth, and **SDK routes** (`/client`) for end-user operations via API key auth.

## Authentication

### Dashboard Routes (`/api/v1/billing`)

Used by the developer dashboard. Authentication via session cookie.

| Method | Header | Purpose |
|---|---|---|
| Session | `Cookie: semaphore.session=...` | Developer dashboard |

### SDK Routes (`/client`)

Used by the client SDK in end-user apps. Authentication via API key.

| Method | Header | Purpose |
|---|---|---|
| API Key | `x-api-key: pk_...` | Public key (client-side) |
| API Key | `x-api-key: sk_...` | Secret key (server-side) |

### Webhook Route (`/webhook`)

No auth required — verified by HMAC-SHA256 signature from Nomba.

## Dashboard API (`/api/v1/billing`)

### Collections

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collections` | Create a collection |
| `GET` | `/collections` | List all collections |
| `GET` | `/collections/:id` | Get a collection |
| `PUT` | `/collections/:id` | Update a collection |
| `GET` | `/collections/:id/analytics` | Get collection analytics |
| `DELETE` | `/collections/:id` | Delete a collection |

### API Keys

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/collections/:id/api-keys` | List API keys |
| `POST` | `/collections/:id/api-keys` | Generate a new API key |
| `DELETE` | `/collections/:id/api-keys/:key` | Revoke an API key |

### Plans

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collections/:id/plans` | Create a plan |
| `GET` | `/collections/:id/plans` | List plans |
| `GET` | `/collections/:id/plans/:planId` | Get a plan |
| `POST` | `/collections/:id/plans/:planId/deactivate` | Deactivate a plan |
| `POST` | `/collections/:id/plans/:planId/reactivate` | Reactivate a plan |
| `DELETE` | `/collections/:id/plans/:planId` | Delete a plan |

### Products

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collections/:id/products` | Create a product |
| `GET` | `/collections/:id/products` | List products |
| `GET` | `/collections/:id/products/:productId` | Get a product |
| `PUT` | `/collections/:id/products/:productId` | Update a product |
| `DELETE` | `/collections/:id/products/:productId` | Delete a product |

### Customers

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collections/:id/customers` | Upsert a customer |
| `GET` | `/collections/:id/customers` | List customers (with search/pagination) |
| `GET` | `/collections/:id/customers/:customerId` | Get a customer |

### Subscriptions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collections/:id/subscriptions/subscribe` | Subscribe a customer |
| `GET` | `/collections/:id/subscriptions` | List subscriptions |
| `GET` | `/collections/:id/subscriptions/:subId` | Get a subscription |
| `POST` | `/collections/:id/subscriptions/:subId/cancel` | Cancel a subscription |
| `POST` | `/collections/:id/subscriptions/:subId/pause` | Pause a subscription |
| `POST` | `/collections/:id/subscriptions/:subId/resume` | Resume a subscription |
| `POST` | `/collections/:id/subscriptions/:subId/reactivate` | Reactivate a subscription |

### Features

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collections/:id/features` | Create a feature |
| `GET` | `/collections/:id/features` | List features |
| `DELETE` | `/collections/:id/features/:featureId` | Delete a feature |
| `POST` | `/collections/:id/features/attach-plan` | Attach feature to a plan |
| `POST` | `/collections/:id/features/detach-plan` | Detach feature from a plan |
| `POST` | `/collections/:id/features/attach-product` | Attach feature to a product |
| `POST` | `/collections/:id/features/detach-product` | Detach feature from a product |

### Entitlements

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collections/:id/entitlements/check` | Check entitlement |
| `POST` | `/collections/:id/entitlements/report` | Report usage |

### Metrics & Balance

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/collections/:id/metrics/trend` | Get metric trend (current vs previous) |
| `GET` | `/collections/:id/metrics/history` | Get metric history |
| `POST` | `/collections/:id/metrics/refresh` | Refresh metric snapshot |
| `GET` | `/collections/:id/balance` | Get collection balance |

### Cron

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/collections/:id/cron/run` | Manually trigger renewal cron |

## Client SDK API (`/client`)

These endpoints are used by `@semaphore-pay/client`. All require `x-api-key` header.

### Customers

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/customers/me` | Get current customer (from key's userId) |
| `POST` | `/customers` | Create/update a customer |

### Plans & Products (read-only)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/plans` | List plans |
| `GET` | `/plans/:planId` | Get a plan |
| `GET` | `/products` | List products |

### Subscriptions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/subscriptions/subscribe` | Subscribe to a plan |
| `POST` | `/subscriptions/:id/cancel` | Cancel a subscription |

### Products (purchase)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/products/purchase` | Purchase a product (one-time) |

### Entitlements

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/entitlements/check` | Check entitlement |
| `POST` | `/entitlements/report` | Report usage |

### Payments

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/payments/verify` | Verify a payment by order reference |

## Webhook

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/webhook` | Nomba webhook receiver |
