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
  "d1_databases": [
    {
      "binding": "SEMAPHORE_DB",
      "database_name": "semaphore-db",
      "database_id": "your-d1-id"
    }
  ]
}
```

## 3. Set Environment Variables

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put BETTER_AUTH_URL
npx wrangler secret put NOMBA_SANDBOX_CLIENT_ID
npx wrangler secret put NOMBA_SANDBOX_CLIENT_SECRET
npx wrangler secret put NOMBA_SANDBOX_ACCOUNT_ID
npx wrangler secret put NOMBA_WEBHOOK_SECRET
npx wrangler secret put NOMBA_CHECKOUT_CALLBACK_URL
npx wrangler secret put FRONTEND_URL
```

## 4. Run Migrations

```bash
npx wrangler d1 execute semaphore-db --remote --file=./migrations/sqlite/0001_watery_wild_child.sql
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
4. Add `api.yourdomain.com`

## Static Files (Client SDK)

For the client SDK documentation site:

```bash
cd docs
npx @docmd/core build
```

Output is in `site/` directory. Upload to Cloudflare Pages:

```bash
npx wrangler pages deploy site --project-name=semaphore-docs
```
