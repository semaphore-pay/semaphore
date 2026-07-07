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

- `better-auth` — authentication
- `drizzle-orm` — database ORM
- `hono` — HTTP framework
- `ioredis` — Redis client (optional, for caching)

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

- `react` (optional, for React hooks)
- `react-native` (optional, for React Native components)
- `react-native-webview` (optional, for React Native paywall)

### Framework Support

| Framework | Package | Import |
|---|---|---|
| Vanilla TS | `@semaphore-pay/client` | `import { SemaphorePayClient }` |
| React | `@semaphore-pay/client/react` | `import { useSemaphorePayStore }` |
| React Native | `@semaphore-pay/client/react-native` | `import { useSemaphorePay, SemaphorePayPaywall, SemaphorePayEntitlementGuard }` |

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
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "semaphore_db",
      "database_name": "semaphore-db",
      "database_id": "your-d1-id"
    }
  ],
  "crons": ["0 * * * *", "0 0 * * *"]
}
```

## Environment Variables

```bash
# Nomba (sandbox)
NOMBA_SANDBOX_CLIENT_ID=
NOMBA_SANDBOX_CLIENT_SECRET=
NOMBA_SANDBOX_ACCOUNT_ID=

# Nomba (production)
NOMBA_LIVE_CLIENT_ID=
NOMBA_LIVE_CLIENT_SECRET=
NOMBA_LIVE_ACCOUNT_ID=

# Nomba (shared)
NOMBA_WEBHOOK_SECRET=
NOMBA_CHECKOUT_CALLBACK_URL=https://your-api.example.com/webhook

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# CORS
FRONTEND_URL=https://your-frontend.com

# Cloudflare (for D1 access)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_DATABASE_ID=
CLOUDFLARE_D1_TOKEN=
```
