---
type: concept
title: Collections
source: "https://docs.semaphorepay.tech/concepts/collections/"
path: /concepts/collections/
updated: 2026-07-05
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-05T13:54:02.039Z"
---
---
title: Collections
---

# Collections

A collection is an isolated tenant within Semaphore. Think of it like a RevenueCat project — each developer gets their own collection with unique API keys and data isolation.

## How Collections Work

```
Semaphore Account (Nomba)
├── Collection: "My SaaS App"
│   ├── Plans: Pro, Enterprise
│   ├── Products: Pro Access, Enterprise Access
│   ├── Customers: 1,234
│   └── Subscriptions: 892 active
│
├── Collection: "Another App"
│   ├── Plans: Basic, Premium
│   ├── Products: Basic Access, Premium Access
│   ├── Customers: 567
│   └── Subscriptions: 234 active
```

Each collection is completely isolated. Data, API keys, and billing are separate.

## Creating a Collection

```typescript
const collection = await engine.createCollection({
  name: 'My App',
  description: 'Production environment',
});
```

Response:

```json
{
  "id": "col_abc123",
  "name": "My App",
  "description": "Production environment",
  "publicKey": "pk_col_abc123_xyz",
  "secretKey": "sk_col_abc123_def",
  "createdAt": "2026-07-05T12:00:00Z"
}
```

## API Keys

Each collection has two API keys:

| Key | Prefix | Purpose |
|---|---|---|
| Public Key | `pk_` | Client-side SDK (end-user apps) |
| Secret Key | `sk_` | Server-side admin operations |

::: warning
Never expose secret keys in client-side code. Use public keys for end-user applications.
:::

## Listing Collections

```typescript
const collections = await engine.listCollections();
```

## Deleting a Collection

```typescript
await engine.deleteCollection('col_abc123');
```

::: danger
Deleting a collection removes all associated plans, products, customers, and subscriptions. This action is irreversible.
:::
