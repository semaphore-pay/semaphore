---
title: Dashboard Setup
---

# Dashboard Setup

## Prerequisites

- Node.js 18+ or Bun
- The `semaphore-pay-backend` running (locally or deployed)

## Install

```bash
git clone https://github.com/your-org/semaphore-pay-dashboard.git
cd semaphore-pay-dashboard
bun install
```

## Environment Variables

Create `.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:8787
VITE_AUTH_BASE_URL=http://localhost:8787
```

For production:

```bash
VITE_API_BASE_URL=https://api.semaphorepay.tech
VITE_AUTH_BASE_URL=https://api.semaphorepay.tech
```

## Run

```bash
bun dev
```

Dashboard runs at `http://localhost:5173`.

## Build

```bash
bun run build
```

Output goes to `dist/`.

## How It Works

1. User signs in via magic link (Better Auth)
2. Session cookie is set on the backend domain
3. All API requests go to `/api/v1/billing/*` with `credentials: "include"`
4. Collection ID and environment are stored in `localStorage`

## Project Structure

```
src/
├── components/
│   ├── dashboard/       # Panel components (Analytics, Plans, Products, etc.)
│   └── ui/              # shadcn/ui primitives
├── lib/
│   ├── api.ts           # Fetch wrapper for /api/v1/billing/*
│   └── auth-client.ts   # Better Auth client config
├── store/               # Zustand stores (auth, plans, products, etc.)
├── pages/               # Login, Privacy, Terms
└── App.tsx              # Routes + ProtectedRoute
```
