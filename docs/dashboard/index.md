---
title: Dashboard
---

# Dashboard

The Semaphore Pay Dashboard is a React admin panel for managing your billing collections, plans, products, customers, entitlements, and analytics.

## Overview

```
semaphore-pay-dashboard (React SPA)
       ↓ HTTP calls (cookie auth)
semaphore-pay-backend (Cloudflare Worker)
       ↓ imports
@semaphore-pay/server (SDK)
       ↓
Nomba API
```

## Features

| Feature | Description |
|---|---|
| **Analytics** | MRR, ARR, active subscribers, churn rate. Interactive charts via Recharts. |
| **Plans** | Create, deactivate, reactivate, delete plans. View subscriber count and MRR per plan. |
| **Products** | CRUD products with features, pricing, groups. CSV export. |
| **Customers** | Paginated list with search, detail views with subscription history. |
| **Entitlements** | Create features (boolean/limit). Attach/detach to plans and products via drag-and-drop. |
| **Settings** | Collection config, API key management, payout balance. |
| **Auth** | Magic link email sign-in via Better Auth. |

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite + Rolldown |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | Zustand |
| Charts | Recharts |
| Routing | React Router v7 |
| Auth | Better Auth (magic link) |

## Quick Links

- [Setup](/dashboard/setup) — installation and environment variables
- [Authentication](/dashboard/auth) — Better Auth magic link flow
- [API Mapping](/dashboard/api) — how dashboard routes map to the backend
