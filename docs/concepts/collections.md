---
title: Collections
---

# Collections

A collection is an isolated tenant within Semaphore. Think of it like a RevenueCat project — each developer gets their own collection with unique API keys and data isolation.

## How Collections Work

```
Semaphore Account (Nomba)
├── Collection: "My SaaS App" (sandbox)
│   ├── Plans: Pro, Enterprise
│   ├── Products: Pro Access, Enterprise Access
│   ├── Features: api_calls, export, pro_mode
│   ├── Customers: 1,234
│   └── Subscriptions: 892 active
│
├── Collection: "Another App" (production)
│   ├── Plans: Basic, Premium
│   ├── Products: Basic Access, Premium Access
│   ├── Customers: 567
│   └── Subscriptions: 234 active
```

Each collection is completely isolated. Data, API keys, and billing are separate.

## Creating a Collection

```typescript
import { createCollection } from '@semaphore-pay/server';

const collection = await createCollection(engine, 'My App', 'development');
```

Response:

```json
{
  "id": "col_abc123",
  "name": "My App",
  "environment": "development",
  "createdAt": "2026-07-05T12:00:00Z"
}
```

## Environments

Each collection has an environment:

| Environment | Purpose | Nomba Keys |
|---|---|---|
| `development` | Development and testing | `NOMBA_SANDBOX_*` |
| `production` | Live payments | `NOMBA_LIVE_*` |

## API Keys

Each collection has API keys for authentication:

| Key Type | Prefix | Purpose |
|---|---|---|
| Public Key | `sem_pk_test_*` / `sem_pk_live_*` | Client-side SDK (end-user apps) |
| Secret Key | `sem_sk_test_*` / `sem_sk_live_*` | Server-side admin operations |

::: warning
Never expose secret keys in client-side code. Use public keys for end-user applications.
:::

## Listing Collections

```typescript
// Dashboard API returns collections with stats
const collections = await fetch('/api/v1/billing/collections');
// Returns: [{ id, name, environment, plans, products, customers, activeSubscriptions }]
```
