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
NOMBA_CHECKOUT_CALLBACK_URL=https://your-api.example.com/webhook/nomba
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

::: warning
Never commit secrets to version control. Use Cloudflare Secrets or `.dev.vars` for local development.
:::

## Local Development

Create `.dev.vars` in your project root:

```bash
BETTER_AUTH_SECRET=dev-secret
BETTER_AUTH_URL=http://localhost:8787
FRONTEND_URL=http://localhost:3000
NOMBA_SANDBOX_CLIENT_ID=...
NOMBA_SANDBOX_CLIENT_SECRET=...
NOMBA_SANDBOX_ACCOUNT_ID=...
NOMBA_WEBHOOK_SECRET=...
NOMBA_CHECKOUT_CALLBACK_URL=http://localhost:8787/webhook/nomba
```
