---
type: concept
title: "Semaphore — Subscription Billing for Nomba"
source: "https://docs.semaphorepay.tech/"
path: /
updated: 2026-07-14
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-14T15:56:13.473Z"
---
---
title: Semaphore — Subscription Billing for Nomba
---

# Semaphore

A subscription billing engine built on top of Nomba. Multiple developers sign up, share one Nomba account, and manage their own subscription products with full lifecycle support.

## What Semaphore Provides

- **Multi-tenant collections** — each developer gets their own isolated collection with API keys
- **Subscription management** — create plans, products, and manage recurring billing
- **Tokenized card billing** — charge saved cards on renewals automatically
- **Bank transfer support** — accept bank transfers via Nomba
- **Entitlements** — check and report usage-based access with boolean and metered features
- **Webhook events** — real-time notifications for payment lifecycle
- **Payment verification** — fallback verification when webhooks aren't received
- **Client SDKs** — TypeScript/React core + React Native support

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Developer   │────▶│   Semaphore  │────▶│    Nomba     │
│   Dashboard  │     │   Backend    │     │   Payments   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
              ┌─────▼─────┐ ┌────▼────┐
              │  End-User  │ │ Webhook │
              │   Client   │ │ Handler │
              └───────────┘ └─────────┘
```

## Quick Links

- [Quick Start](/quickstart) — get up and running in 5 minutes
- [API Reference](/api-reference) — explore all endpoints
- [Guides](/guides/webhooks) — implementation walkthroughs
- [Deploy](/deploy/cloudflare) — deploy to Cloudflare

## Two SDK Layers

| Package | Layer | Purpose |
|---|---|---|
| `@semaphore-pay/server` | Backend | Admin operations, collections, plans, products, features |
| `@semaphore-pay/client` | Frontend | End-user operations, subscriptions, entitlements, payment verification |

The server SDK is for your backend. The client SDK is for your users' apps.
