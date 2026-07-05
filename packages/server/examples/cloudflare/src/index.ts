import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import {
  createSemaphorePayRouter,
  initSemaphorePay,
  runSemaphorePayCron,
} from "../../../src/index";
import * as sqliteSchema from "../../../src/database/schema/sqlite";

type Env = {
  DB: D1Database;
  NOMBA_WEBHOOK_SECRET?: string;
  NOMBA_CLIENT_ID?: string;
  NOMBA_CLIENT_SECRET?: string;
  NOMBA_ACCOUNT_ID?: string;
  NOMBA_CHECKOUT_CALLBACK_URL?: string;
  NOMBA_ENVIRONMENT?: "sandbox" | "production";
};

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    const db = drizzle(env.DB, { schema: sqliteSchema });
    const engine = initSemaphorePay({
      dialect: "sqlite",
      db,
      supportsTransactions: false,
    });
    const router = createSemaphorePayRouter(engine, {
      webhookSecret: env.NOMBA_WEBHOOK_SECRET,
      nomba:
        env.NOMBA_CLIENT_ID &&
        env.NOMBA_CLIENT_SECRET &&
        env.NOMBA_ACCOUNT_ID &&
        env.NOMBA_CHECKOUT_CALLBACK_URL
          ? {
              clientId: env.NOMBA_CLIENT_ID,
              clientSecret: env.NOMBA_CLIENT_SECRET,
              accountId: env.NOMBA_ACCOUNT_ID,
              callbackUrl: env.NOMBA_CHECKOUT_CALLBACK_URL,
              environment: env.NOMBA_ENVIRONMENT,
            }
          : undefined,
    });
    const app = new Hono<{ Bindings: Env }>();
    app.get("/health", (c) => c.json({ ok: true }));
    app.route("/", router);
    return app.fetch(request, env, ctx);
  },
  scheduled: (_: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    const db = drizzle(env.DB, { schema: sqliteSchema });
    const engine = initSemaphorePay({
      dialect: "sqlite",
      db,
      supportsTransactions: false,
    });
    ctx.waitUntil(runSemaphorePayCron(engine));
  },
};
