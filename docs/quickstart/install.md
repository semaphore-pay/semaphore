---
title: Install SDK
---

# Install SDK

## Server SDK

The server SDK handles admin operations: creating collections, plans, products, and managing customers.

```bash
npm install @semaphore-pay/server
```

### Peer Dependencies

- `better-sqlite3` (SQLite) or `@cloudflare/workers-types` (D1)

### TypeScript Setup

```json
{
  "compilerOptions": {
    "moduleResolution": "Bundler",
    "target": "ESNext",
    "module": "ESNext"
  }
}
```

## Client SDK

The client SDK is for end-user applications. It handles subscriptions, entitlements, and customer management.

```bash
npm install @semaphore-pay/client
```

### Peer Dependencies

- `react` (optional, for zustand store)

### Framework Support

| Framework | Package | Import |
|---|---|---|
| Vanilla TS | `@semaphore-pay/client` | `import SemaphorePayClient` |
| React | `@semaphore-pay/client/react` | `import { useSemaphorePay }` |
| React Native | `@semaphore-pay/client/react-native` | `import { useSemaphorePay }` |

## Cloudflare Worker Setup

If deploying to Cloudflare Workers:

```bash
npm install @semaphore-pay/server
npm install wrangler --save-dev
```

`wrangler.jsonc`:

```json
{
  "name": "semaphore-api",
  "main": "src/index.ts",
  "compatibility_date": "2024-12-01",
  "d1_databases": [
    {
      "binding": "SEMAPHORE_DB",
      "database_name": "semaphore-db",
      "database_id": "your-d1-id"
    }
  ]
}
```

## Environment Variables

```bash
# Nomba
NOMBA_SANDBOX_CLIENT_ID=
NOMBA_SANDBOX_CLIENT_SECRET=
NOMBA_SANDBOX_ACCOUNT_ID=
NOMBA_WEBHOOK_SECRET=
NOMBA_CHECKOUT_CALLBACK_URL=

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# CORS
FRONTEND_URL=https://your-frontend.com
```
