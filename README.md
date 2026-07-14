<div align="center">

<img src="./assets/images/logo.svg" alt="Semaphore Pay" height="48" />

# Semaphore Pay

Subscription billing engine built on [Nomba](https://nomba.com) payment gateway.

[![npm version](https://img.shields.io/npm/v/@semaphore-pay/server?style=flat-square&label=server)](https://www.npmjs.com/package/@semaphore-pay/server)
[![npm version](https://img.shields.io/npm/v/@semaphore-pay/client?style=flat-square&label=client)](https://www.npmjs.com/package/@semaphore-pay/client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[Overview](#overview) · [Quick Start](#quick-start) · [Packages](#packages) · [Architecture](#architecture) · [Deployment](#deployment)

</div>

## Overview

Semaphore Pay provides multi-tenant subscription management, tokenized card billing, entitlements (usage-based feature gating), and webhook-driven payment lifecycle management. It runs on any JavaScript runtime (Bun, Node.js, Cloudflare Workers).

**Core capabilities:**

- Multi-tenant collections with isolated API keys
- Subscription plans (monthly, yearly, custom intervals)
- Tokenized card billing for recurring charges
- Entitlements — boolean on/off + metered counters with reset intervals
- Automated dunning with exponential backoff
- Idempotent webhook processing
- Better Auth integration (auto-create customers on signup)

> [!NOTE]
> Semaphore Pay is a library, not a standalone service. You integrate it into your existing backend.

## Quick Start

### Install

```bash
# Server (backend)
npm install @semaphore-pay/server

# Client (frontend)
npm install @semaphore-pay/client
```

### Server Setup

```typescript
import { initSemaphorePay, createSemaphorePayRouter } from "@semaphore-pay/server";

const engine = initSemaphorePay({
  dialect: "sqlite",       // or "postgresql"
  db,
  supportsTransactions: false, // set false for Cloudflare D1
});

const router = createSemaphorePayRouter(engine, {
  webhookSecret: process.env.NOMBA_WEBHOOK_SECRET,
  nomba: {
    clientId: process.env.NOMBA_SANDBOX_CLIENT_ID,
    clientSecret: process.env.NOMBA_SANDBOX_CLIENT_SECRET,
    accountId: process.env.NOMBA_SANDBOX_ACCOUNT_ID,
    callbackUrl: process.env.NOMBA_CHECKOUT_CALLBACK_URL,
  },
});
```

Mount the `router` in your HTTP framework (Hono, Express, etc.).

### Client Setup

```typescript
import { SemaphorePayClient } from "@semaphore-pay/client";

const client = new SemaphorePayClient({
  baseUrl: "https://your-api.example.com",
  apiKey: "sem_pk_test_...",
  collectionId: "col_...",
});
```

## Packages

| Package | Description |
|---------|-------------|
| [`@semaphore-pay/server`](./packages/server) | Engine, API router, database schemas, Nomba client, cron jobs |
| [`@semaphore-pay/client`](./packages/client) | HTTP client + React/React Native hooks with Zustand store |

## Architecture

```
Developer Dashboard ──▶ Semaphore Backend ──▶ Nomba Payments
                          │                   End-User Client
                          Webhook Handler
```

**Tech stack:** Hono, Drizzle ORM, PostgreSQL/SQLite (Cloudflare D1), Better Auth, Zod, Zustand (client), TypeScript.

### Multi-tenancy

Every entity (customer, subscription, plan, feature) is scoped to a `collectionId`. Each developer/merchant gets isolated API keys (`sem_pk|sk_test|live_{random}`).

### Database

Two schema variants maintained in parallel:

- `packages/server/src/database/schema/pg.ts` — PostgreSQL
- `packages/server/src/database/schema/sqlite.ts` / D1

Generate migrations:

```bash
bun run generate:pg       # PostgreSQL
bun run generate:sqlite   # SQLite
bun run generate:all      # Both
```

### Webhook Processing

Handles `payment_success` and `payment_failed` events from Nomba. Webhook signatures are verified via HMAC. The invoice table prevents duplicate activation from webhooks + the verify endpoint.

### Dunning

Cron-based retry with exponential backoff (up to 3 retries). Subscription cancelled after exhaustion. Use `test_15min` plan interval for fast dunning cycle testing.

## Deployment

### Cloudflare Workers (D1)

A ready-to-deploy example lives in [`packages/server/examples/cloudflare/`](./packages/server/examples/cloudflare).

```bash
cd packages/server/examples/cloudflare
bun run dev  # wrangler dev
```

> [!IMPORTANT]
> Set `supportsTransactions: false` when using Cloudflare D1 — it lacks native transactions.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NOMBA_SANDBOX_CLIENT_ID` | Yes | Nomba sandbox client ID |
| `NOMBA_SANDBOX_CLIENT_SECRET` | Yes | Nomba sandbox client secret |
| `NOMBA_SANDBOX_ACCOUNT_ID` | Yes | Nomba sandbox account ID |
| `NOMBA_LIVE_CLIENT_ID` | Production | Nomba production client ID |
| `NOMBA_LIVE_CLIENT_SECRET` | Production | Nomba production client secret |
| `NOMBA_LIVE_ACCOUNT_ID` | Production | Nomba production account ID |
| `NOMBA_WEBHOOK_SECRET` | Yes | HMAC secret for webhook verification |
| `NOMBA_CHECKOUT_CALLBACK_URL` | Yes | Checkout callback URL |
| `BETTER_AUTH_SECRET` | Optional | Better Auth secret |
| `BETTER_AUTH_URL` | Optional | Better Auth base URL |
| `FRONTEND_URL` | Optional | CORS allowed origin |
| `DATABASE_URL` | Optional | PostgreSQL connection string |
| `DB_DIALECT` | No | `postgresql` or `sqlite` (default: `sqlite`) |

## API Key Types

| Key prefix | Scope | Use case |
|------------|-------|----------|
| `sem_pk_test_*` / `sem_pk_live_*` | User-scoped | Frontend — auto-resolves `customerId` |
| `sem_sk_test_*` / `sem_sk_live_*` | Admin | Backend — full access |

Pass keys via the `x-api-key` header.

## Documentation

Full docs are hosted at the project's documentation site. Source lives in [`docs/`](./docs/):

- [Quick Start](./docs/quickstart.md) — 5-minute setup
- [Core Concepts](./docs/concepts/) — Collections, Subscriptions, Products, Entitlements
- [API Reference](./docs/api-reference/) — Collections, Plans, Products, Customers, Subscriptions, Entitlements
- [Guides](./docs/guides/) — Webhooks, Testing, React, React Native
- [Deploy](./docs/deploy/) — Cloudflare Workers, Environment Variables

Run docs locally:

```bash
npx @docmd/core dev    # localhost:3000
```

## Development

```bash
# Install dependencies
bun install

# Build server
cd packages/server && bun run build

# Build client
cd packages/client && bun run build
```
