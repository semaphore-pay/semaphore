---
type: concept
title: "Environment Variables"
source: "https://docs.semaphorepay.tech/deploy/env/"
path: /deploy/env/
updated: 2026-07-07
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-07-07T20:01:08.642Z"
---
---
title: Environment Variables
---

# Environment Variables

All environment variables needed for deployment.

## Nomba

```bash
# Sandbox (development)
NOMBA_SANDBOX_CLIENT_ID=
NOMBA_SANDBOX_CLIENT_SECRET=
NOMBA_SANDBOX_ACCOUNT_ID=

# Production
NOMBA_LIVE_CLIENT_ID=
NOMBA_LIVE_CLIENT_SECRET=
NOMBA_LIVE_ACCOUNT_ID=

# Shared
NOMBA_WEBHOOK_SECRET=
NOMBA_CHECKOUT_CALLBACK_URL=https://your-api.example.com/webhook
```

## Better Auth

```bash
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=https://your-api.example.com
```

## CORS

```bash
FRONTEND_URL=https://your-frontend.com
```

## Cloudflare

```bash
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_DATABASE_ID=
CLOUDFLARE_D1_TOKEN=
```

::: warning
Never commit secrets to version control. Use Cloudflare Secrets or `.dev.vars` for local development.
:::

## Local Development

Create `.dev.vars` in your project root:

```bash
BETTER_AUTH_SECRET=dev-secret
BETTER_AUTH_URL=http://localhost:8787
FRONTEND_URL=http://localhost:3000

# Nomba (sandbox)
NOMBA_SANDBOX_CLIENT_ID=...
NOMBA_SANDBOX_CLIENT_SECRET=...
NOMBA_SANDBOX_ACCOUNT_ID=...

# Nomba (production)
NOMBA_LIVE_CLIENT_ID=...
NOMBA_LIVE_CLIENT_SECRET=...
NOMBA_LIVE_ACCOUNT_ID=...

# Nomba (shared)
NOMBA_WEBHOOK_SECRET=...
NOMBA_CHECKOUT_CALLBACK_URL=http://localhost:8787/webhook

# Cloudflare (for D1 access)
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_DATABASE_ID=...
CLOUDFLARE_D1_TOKEN=...
```
