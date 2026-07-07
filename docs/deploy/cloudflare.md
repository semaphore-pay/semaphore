---
title: Deploy to Cloudflare
---

# Deploy to Cloudflare

Semaphore runs on Cloudflare Workers with D1 database.

## Prerequisites

- Cloudflare account
- Wrangler CLI installed
- D1 database created

## 1. Create D1 Database

```bash
npx wrangler d1 create semaphore-db
```

Copy the `database_id` to `wrangler.jsonc`.

## 2. Configure Wrangler

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
  "crons": ["0 * * * *", "0 0 * * *"],
  "routes": [
    { "pattern": "api.semaphorepay.tech", "zone_name": "semaphorepay.tech" }
  ]
}
```

## 3. Set Environment Variables

```bash
# Better Auth
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put BETTER_AUTH_URL

# Nomba (sandbox)
npx wrangler secret put NOMBA_SANDBOX_CLIENT_ID
npx wrangler secret put NOMBA_SANDBOX_CLIENT_SECRET
npx wrangler secret put NOMBA_SANDBOX_ACCOUNT_ID

# Nomba (production)
npx wrangler secret put NOMBA_LIVE_CLIENT_ID
npx wrangler secret put NOMBA_LIVE_CLIENT_SECRET
npx wrangler secret put NOMBA_LIVE_ACCOUNT_ID

# Nomba (shared)
npx wrangler secret put NOMBA_WEBHOOK_SECRET
npx wrangler secret put NOMBA_CHECKOUT_CALLBACK_URL

# CORS
npx wrangler secret put FRONTEND_URL

# Cloudflare (for D1 access)
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_DATABASE_ID
npx wrangler secret put CLOUDFLARE_D1_TOKEN
```

## 4. Run Migrations

```bash
# Run all migrations in order
npx wrangler d1 execute semaphore-db --remote --file=./migrations/sqlite/0001_watery_wild_child.sql
npx wrangler d1 execute semaphore-db --remote --file=./migrations/sqlite/0002_*.sql
npx wrangler d1 execute semaphore-db --remote --file=./migrations/sqlite/0003_*.sql
npx wrangler d1 execute semaphore-db --remote --file=./migrations/sqlite/0004_*.sql
npx wrangler d1 execute semaphore-db --remote --file=./migrations/sqlite/0005_*.sql
npx wrangler d1 execute semaphore-db --remote --file=./migrations/sqlite/0006_*.sql
npx wrangler d1 execute semaphore-db --remote --file=./migrations/sqlite/0007_*.sql
npx wrangler d1 execute semaphore-db --remote --file=./migrations/sqlite/0008_add_webhook_event.sql
```

## 5. Deploy

```bash
npx wrangler deploy
```

## 6. Custom Domain

In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Settings → Triggers → Custom Domains
4. Add `api.semaphorepay.tech`

## Static Files (Documentation Site)

For the documentation site:

```bash
cd docs
npx @docmd/core build
```

Output is in `site/` directory. Upload to Cloudflare Pages:

```bash
npx wrangler pages deploy site --project-name=semaphore-docs
```
