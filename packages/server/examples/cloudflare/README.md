```txt
bun install
bun run dev
```

```txt
bun run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
bun run cf-typegen
```

## Setup

1. Create a D1 database and note the database ID.
2. Update `wrangler.jsonc` with the D1 binding and environment variables.
3. Configure secrets with `wrangler secret put` for sensitive values.

## Notes

- This worker mounts the Semaphore API router and exposes `/health`.
- Paid plan checkout is enabled only if Nomba credentials are set.

## Demo script

```txt
SEMAPHORE_PAY_BASE_URL=http://127.0.0.1:8787 bun run scripts/demo-test.ts
```
