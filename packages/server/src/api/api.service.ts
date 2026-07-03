import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import type { SemaphorePayEngine } from "../database/index";
import { upsertCustomer, getCustomer, deleteCustomer } from "../customer/customer.api";
import { check, report } from "../entitlement/entitlement.api";
import { subscribe, cancel } from "../subscription/subscription.api";
import { createProduct, listProducts } from "../product/product.service";
import { create as createPlan, list as listPlans, get as getPlan } from "../plan/plan.api";
import { purchaseProduct } from "../product/product.api";
import { handleWebhook } from "../webhook/webhook.api";
import { runSemaphorePayCron } from "../cron";
import { NombaClient } from "../nomba/nomba";

type Env = {
  Variables: {
    collectionId: string;
    environment: "development" | "production";
    keyType: "public" | "secret";
    keyUserId?: string;
  };
  _semaphorePayDb: any;
  _semaphorePayApiKeySchema: any;
};

/**
 * Create a new collection (tenant). Generates a unique ID and
 * inserts the record. No API key required.
 *
 * @returns The created collection row.
 */
export async function createCollection(engine: SemaphorePayEngine<any>, name: string) {
  const schema = engine.schema;
  const collectionId = `col_${crypto.randomUUID().replace(/-/g, "")}`;

  const rows = await engine.db
    .insert(schema.collection)
    .values({ id: collectionId, name: name })
    .returning();

  return rows[0];
}

/**
 * Create an API key for a collection. Keys follow the format
 * `sem_{pk|sk}_{test|live}_{randomHex}`.
 *
 * @param engine - The SemaphorePay engine.
 * @param input.collectionId - The collection to issue the key for.
 * @param input.type - `"public"` or `"secret"`.
 * @param input.environment - `"development"` or `"production"`.
 * @param input.userId - Required for `"public"` keys — scopes the key
 *   to a single app user.
 * @returns The created key row.
 */
export async function createApiKey(
  engine: SemaphorePayEngine<any>,
  input: {
    collectionId: string;
    type: "public" | "secret";
    environment: "development" | "production";
    userId?: string;
  }
) {
  const schema = engine.schema;
  
  const collection = await engine.db.query.collection.findFirst({
    where: eq(schema.collection.id, input.collectionId),
  });

  if (!collection) {
    throw new Error("Collection not found");
  }

  if (input.type === "public" && !input.userId) {
    throw new Error("userId is required for public keys.");
  }

  const prefix = input.type === "public" ? "pk" : "sk";
  const envPrefix = input.environment === "production" ? "live" : "test";
  const randomBytes = crypto.randomUUID().replace(/-/g, "");
  const keyString = `sem_${prefix}_${envPrefix}_${randomBytes}`;

  const rows = await engine.db
    .insert(schema.apiKey)
    .values({
      key: keyString,
      collectionId: input.collectionId,
      type: input.type,
      environment: input.environment,
      userId: input.type === "public" ? input.userId : null,
    })
    .returning();

  return rows[0];
}

/**
 * Common auth: validates any API key (public or secret) and stores
 * collectionId, environment, keyType, and keyUserId into Hono context.
 */
function requireAnyKey(api: Hono<Env>) {
  api.use("*", async (c, next) => {
    const key = c.req.header("x-api-key");
    if (!key) return c.json({ error: "Missing API key in x-api-key header" }, 401);

    const env = c.env as Env;
    const keyRecord = await env._semaphorePayDb.query.apiKey.findFirst({
      where: eq(env._semaphorePayApiKeySchema.key, key),
    });
    // ^ dynamic lookup via injected engine/schema — see _semaphorePayDb below

    if (!keyRecord) return c.json({ error: "Invalid API key" }, 401);

    c.set("collectionId", keyRecord.collectionId);
    c.set("environment", keyRecord.environment as "development" | "production");
    c.set("keyType", keyRecord.type as "public" | "secret");
    c.set("keyUserId", keyRecord.userId ?? undefined);
    await next();
  });
}

/**
 * Secret-key gate: rejects public keys. Used after the any-key middleware
 * for admin-only routes.
 */
function requireSecretKey(api: Hono<Env>) {
  api.use("*", async (c, next) => {
    if (c.get("keyType") !== "secret") {
      return c.json({ error: "Secret API key required for this operation." }, 403);
    }
    await next();
  });
}

/**
 * User-scoped helper: if the key is public, resolves the customerId
 * automatically from the key's userId. Secret keys pass through
 * whatever customerId was in the request body.
 */
function resolveCustomerId(
  c: any,
  bodyCustomerId?: string,
): { customerId: string } | { error: string; status: 400 | 500 } {
  const keyType = c.get("keyType") as string;
  const keyUserId = c.get("keyUserId") as string | undefined;

  if (keyType === "public") {
    if (!keyUserId) {
      return { error: "Public key missing userId scope.", status: 500 };
    }
    return { customerId: keyUserId };
  }

  // Secret key: customerId must come from the request body
  if (bodyCustomerId) return { customerId: bodyCustomerId };
  return { error: "customerId is required in the request body.", status: 400 };
}

/**
 * Create the full SemaphorePay HTTP router (Hono-based).
 *
 * Route auth levels:
 * - **None:** `/admin/collections`, `/webhooks/nomba`
 * - **Public OK:** `GET /products`, `GET /plans`, `GET /plans/:planId`
 * - **Secret only:** `/customers`, `/products` (POST), `/plans` (POST),
 *   `/admin/cron/run`
 * - **User-scoped:** `/entitlements/check`, `/entitlements/report`,
 *   `/subscriptions/subscribe`, `/subscriptions/:id/cancel`,
 *   `/products/purchase` — public keys auto-derive customerId from the
 *   key's userId; secret keys use the body's customerId.
 *
 * @param engine - A configured {@link SemaphorePayEngine}.
 * @param options.webhookSecret - Secret for Nomba webhook HMAC verification.
 * @param options.nomba - Nomba credentials for paid checkout.
 * @returns A Hono router that can be mounted via `app.route("/", router)`.
 */
export function createSemaphorePayRouter(
  engine: SemaphorePayEngine<any>,
  options?: {
    webhookSecret?: string;
    nomba?: {
      clientId: string;
      clientSecret: string;
      accountId: string;
      callbackUrl: string;
      environment?: "sandbox" | "production";
    };
  },
) {
  /* ------------------------------------------------------------------
   * Inject engine into Hono context so middleware can reach it without
   * closing over the outer scope (avoids stale-reference bugs).
   * ------------------------------------------------------------------ */
  const api = new Hono<Env & { _semaphorePayDb: any; _semaphorePayApiKeySchema: any }>();

  api.use("*", async (c, next) => {
    (c as any).env._semaphorePayDb = engine.db;
    (c as any).env._semaphorePayApiKeySchema = engine.schema.apiKey;
    await next();
  });

  /* ------------------------------------------------------------------
   * 0. Unauthenticated routes (no API key needed)
   * ------------------------------------------------------------------ */
  api.post("/admin/collections", async (c) => {
    const body = await c.req.json();
    const userId = body.userId as string | undefined;

    const collection = await createCollection(engine, body.name);

    const publicKey = await createApiKey(engine, {
      collectionId: collection.id,
      type: "public",
      environment: "development",
      userId,
    });
    const secretKey = await createApiKey(engine, {
      collectionId: collection.id,
      type: "secret",
      environment: "development",
    });

    return c.json({
      collection,
      keys: { public: publicKey.key, secret: secretKey.key },
    });
  });

  api.post("/webhooks/nomba", async (c) => {
    const rawBody = await c.req.text();
    const signature = c.req.header("nomba-signature") ?? "";

    if (!options?.webhookSecret) {
      return c.json({ error: "Missing webhook secret." }, 500);
    }

    const result = await handleWebhook(engine, {
      rawBody,
      signature,
      webhookSecret: options.webhookSecret,
    });

    return c.json(result);
  });

  /* ------------------------------------------------------------------
   * 1. Public-read catalog routes (any key OK)
   * ------------------------------------------------------------------ */
  const catalog = new Hono<Env>();
  requireAnyKey(catalog);

  catalog.get("/products", async (c) => {
    const collectionId = c.get("collectionId");
    const environment = c.get("environment");
    const result = await listProducts(engine, { collectionId, environment });
    return c.json(result);
  });

  catalog.get("/plans", async (c) => {
    const collectionId = c.get("collectionId");
    const environment = c.get("environment");
    const result = await listPlans(engine, {}, { collectionId, environment });
    return c.json(result);
  });

  catalog.get("/plans/:planId", async (c) => {
    const collectionId = c.get("collectionId");
    const environment = c.get("environment");
    const planId = c.req.param("planId");
    const result = await getPlan(engine, { planId }, { collectionId, environment });
    return c.json(result ?? null);
  });

  api.route("/", catalog);

  /* ------------------------------------------------------------------
   * 2. Admin routes (secret key only)
   * ------------------------------------------------------------------ */
  const admin = new Hono<Env>();
  requireAnyKey(admin);
  requireSecretKey(admin);

  admin.get("/customers/:id", async (c) => {
    const collectionId = c.get("collectionId");
    const customerId = c.req.param("id");
    const result = await getCustomer(engine, { customerId }, { collectionId });
    return c.json(result ?? null);
  });

  admin.delete("/customers/:id", async (c) => {
    const collectionId = c.get("collectionId");
    const customerId = c.req.param("id");
    const result = await deleteCustomer(engine, { customerId }, { collectionId });
    return c.json(result);
  });

  admin.post("/products", async (c) => {
    const collectionId = c.get("collectionId");
    const environment = c.get("environment");
    const body = await c.req.json();
    const result = await createProduct(engine, { ...body, collectionId, environment });
    return c.json(result);
  });

  admin.post("/plans", async (c) => {
    const collectionId = c.get("collectionId");
    const environment = c.get("environment");
    const body = await c.req.json();
    const result = await createPlan(engine, body, { collectionId, environment });
    return c.json(result);
  });

  admin.post("/admin/cron/run", async (c) => {
    const result = await runSemaphorePayCron(engine);
    return c.json(result);
  });

  api.route("/", admin);

  /* ------------------------------------------------------------------
   * 3. User-scoped routes (public key auto-resolves customerId
   *    from key.userId; secret key uses body's customerId)
   * ------------------------------------------------------------------ */
  const user = new Hono<Env>();
  requireAnyKey(user);

  user.post("/customers", async (c) => {
    const collectionId = c.get("collectionId");
    const body = await c.req.json();
    const resolved = resolveCustomerId(c, body.customerId);
    if ("error" in resolved) return c.json({ error: resolved.error }, resolved.status);
    body.userId = resolved.customerId;
    delete body.customerId;
    const result = await upsertCustomer(engine, body, { collectionId });
    return c.json(result);
  });

  user.post("/entitlements/check", async (c) => {
    const collectionId = c.get("collectionId");
    const body = await c.req.json();
    const resolved = resolveCustomerId(c, body.customerId);
    if ("error" in resolved) return c.json({ error: resolved.error }, resolved.status);
    body.customerId = resolved.customerId;

    const result = await check(engine, body, { collectionId });
    return c.json(result);
  });

  user.post("/entitlements/report", async (c) => {
    const collectionId = c.get("collectionId");
    const body = await c.req.json();
    const resolved = resolveCustomerId(c, body.customerId);
    if ("error" in resolved) return c.json({ error: resolved.error }, resolved.status);
    body.customerId = resolved.customerId;

    const result = await report(engine, body, { collectionId });
    return c.json(result);
  });

  user.post("/subscriptions/subscribe", async (c) => {
    const collectionId = c.get("collectionId");
    const environment = c.get("environment");
    const body = await c.req.json();
    const resolved = resolveCustomerId(c, body.customerId);
    if ("error" in resolved) return c.json({ error: resolved.error }, resolved.status);
    body.customerId = resolved.customerId;

    const result = await subscribe(engine, body, { collectionId, environment });

    if (result.status !== "pending_payment") {
      return c.json(result);
    }

    if (!options?.nomba) {
      return c.json({
        ...result,
        checkout: null,
        warning: "Nomba credentials not configured for checkout.",
      });
    }

    const plan = await engine.db.query.plan.findFirst({
      where: and(
        eq(engine.schema.plan.id, body.planId),
        eq(engine.schema.plan.collectionId, collectionId),
        eq(engine.schema.plan.environment, environment),
      ),
    });

    if (!plan || plan.priceAmount == null || plan.interval === "none") {
      throw new Error("Paid plan not found or missing price amount.");
    }

    const customer = await engine.db.query.customer.findFirst({
      where: and(
        eq(engine.schema.customer.id, body.customerId),
        eq(engine.schema.customer.collectionId, collectionId),
      ),
    });

    if (!customer?.email) {
      throw new Error("Customer email is required for Nomba checkout.");
    }

    const nomba = new NombaClient({
      clientId: options.nomba.clientId,
      clientSecret: options.nomba.clientSecret,
      accountId: options.nomba.accountId,
      environment:
        options.nomba.environment ?? (environment === "production" ? "production" : "sandbox"),
    });

    const checkout = await nomba.checkout.createOrder({
      order: {
        orderReference: result.nombaOrderReference ?? undefined,
        amount: plan.priceAmount,
        currency: (plan.priceCurrency ?? "NGN") as any,
        customerEmail: customer.email,
        callbackUrl: options.nomba.callbackUrl,
      },
      tokenizeCard: true,
    });

    await engine.db
      .update(engine.schema.subscription)
      .set({
        nombaOrderReference: checkout.orderReference,
        updatedAt: new Date(),
      })
      .where(eq(engine.schema.subscription.id, result.subscriptionId));

    return c.json({
      ...result,
      nombaOrderReference: checkout.orderReference,
      checkout,
    });
  });

  user.post("/subscriptions/:id/cancel", async (c) => {
    const collectionId = c.get("collectionId");
    const subscriptionId = c.req.param("id");
    const result = await cancel(engine, subscriptionId, { collectionId });
    return c.json(result);
  });

  user.post("/products/purchase", async (c) => {
    const collectionId = c.get("collectionId");
    const environment = c.get("environment");
    const body = await c.req.json();
    const resolved = resolveCustomerId(c, body.customerId);
    if ("error" in resolved) return c.json({ error: resolved.error }, resolved.status);
    body.customerId = resolved.customerId;

    const result = await purchaseProduct(engine, body, { collectionId, environment });
    return c.json(result);
  });

  api.route("/", user);

  return api;
}