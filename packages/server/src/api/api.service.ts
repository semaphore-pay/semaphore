import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import type { SemaphorePayEngine } from "../database/index";
import { upsertCustomer, getCustomer, deleteCustomer } from "../customer/customer.api";
import { check, report } from "../entitlement/entitlement.api";
import { subscribe, cancel } from "../subscription/subscription.api";
import { createProduct, listProducts } from "../product/product.service";
import { create as createPlan, list as listPlans, get as getPlan, createTestPlan } from "../plan/plan.api";
import { purchaseProduct } from "../product/product.api";
import { handleWebhook } from "../webhook/webhook.api";
import { processSuccessfulPayment } from "../webhook/webhook.service";
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

export type NombaConfig = {
  clientId: string;
  clientSecret: string;
  accountId: string;
  callbackUrl: string;
  environment?: "sandbox" | "production";
};

export type NombaMultiConfig = {
  sandbox: NombaConfig;
  production: NombaConfig;
};

/**
 * Create a NombaClient from config. Picks sandbox or production credentials
 * based on the environment parameter.
 */
function createNombaClient(nombaConfig: NombaConfig | NombaMultiConfig, environment?: string): NombaClient {
  const isMultiConfig = 'sandbox' in nombaConfig && 'production' in nombaConfig;
  let config: NombaConfig;

  if (isMultiConfig) {
    const multi = nombaConfig as NombaMultiConfig;
    config = environment === 'production' ? multi.production : multi.sandbox;
  } else {
    config = nombaConfig as NombaConfig;
  }

  return new NombaClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    accountId: config.accountId,
    environment: config.environment ?? (environment === "production" ? "production" : "sandbox"),
  });
}

/**
 * Create a new collection (tenant). Generates a unique ID and
 * inserts the record. No API key required.
 *
 * @returns The created collection row.
 */
export async function createCollection(engine: SemaphorePayEngine<any>, name: string, environment: string = 'sandbox') {
  const schema = engine.schema;
  const collectionId = `col_${crypto.randomUUID().replace(/-/g, "")}`;

  const rows = await engine.db
    .insert(schema.collection)
    .values({ id: collectionId, name, environment })
    .returning();

  // Auto-create test plan for sandbox/development environments
  if (environment === 'sandbox' || environment === 'development') {
    await createTestPlan(engine, { collectionId, environment: 'development' });
  }

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
      userId: input.userId ?? null,
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
async function resolveCustomerId(
  c: any,
  bodyCustomerId?: string,
): Promise<{ customerId: string } | { error: string; status: 400 | 500 }> {
  const keyType = c.get("keyType") as string;
  const keyUserId = c.get("keyUserId") as string | undefined;

  if (keyType === "public") {
    if (!keyUserId) {
      return { error: "Public key missing userId scope.", status: 500 };
    }
    // Look up customer by userId to get the actual customer.id
    const e = (c.env as any)._engine;
    const collectionId = c.get("collectionId");
    if (e) {
      const customer = await e.db.query.customer.findFirst({
        where: and(
          eq(e.schema.customer.userId, keyUserId),
          eq(e.schema.customer.collectionId, collectionId),
        ),
      });
      if (customer) return { customerId: customer.id };
    }
    // Fallback: use userId as customerId (for upsert flows)
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
    /** Pre-built Nomba clients keyed by environment. When provided, these are
     *  used directly instead of creating clients per-request from `options.nomba`. */
    nombaClients?: {
      sandbox?: import("../nomba/nomba").NombaClient;
      production?: import("../nomba/nomba").NombaClient;
      callbackUrl?: string;
    };
  },
) {
  /* ------------------------------------------------------------------
   * The engine is stored in Hono context as `_engine` so route handlers
   * can read it without closing over the constructor argument. This
   * allows the outer app to override the engine per-request (e.g. in
   * Cloudflare Workers where env is available only at request time).
   * ------------------------------------------------------------------ */
  const api = new Hono<Env & { _engine: SemaphorePayEngine<any>; _semaphorePayDb: any; _semaphorePayApiKeySchema: any }>();

  api.use("*", async (c, next) => {
    if (!(c.env as any)._engine) {
      (c.env as any)._engine = engine;
      (c.env as any)._semaphorePayDb = engine.db;
      (c.env as any)._semaphorePayApiKeySchema = engine.schema.apiKey;
    }
    await next();
  });

  /** Read engine from context — falls back to closure for backward compat. */
  const getEngine = (c: any): SemaphorePayEngine<any> => c.env._engine ?? engine;

  /** Pick the pre-built Nomba client for the given environment, or create one on the fly. */
  function getNombaClient(environment?: string): NombaClient {
    if (options?.nombaClients) {
      const key = environment === "production" ? "production" : "sandbox";
      const client = options.nombaClients[key as "sandbox" | "production"];
      if (client) return client;
    }
    // Fallback: create a client from flat config
    if (options?.nomba) return createNombaClient(options.nomba, environment);
    throw new Error("Nomba is not configured.");
  }

  /* ------------------------------------------------------------------
   * 0. Unauthenticated routes (no API key needed)
   * ------------------------------------------------------------------ */
  api.post("/admin/collections", async (c) => {
    const e = getEngine(c);
    const body = await c.req.json();
    const userId = body.userId as string | undefined;

    const collection = await createCollection(e, body.name);

    const publicKey = await createApiKey(e, {
      collectionId: collection.id,
      type: "public",
      environment: "development",
      userId,
    });
    const secretKey = await createApiKey(e, {
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
    const e = getEngine(c);
    const rawBody = await c.req.text();
    const signature = c.req.header("nomba-signature") ?? "";

    if (!options?.webhookSecret) {
      return c.json({ error: "Missing webhook secret." }, 500);
    }

    const nombaContext = options?.nomba || options?.nombaClients
      ? { nomba: { transactions: getNombaClient().transactions } }
      : {};

    const result = await handleWebhook(e, {
      rawBody,
      signature,
      webhookSecret: options.webhookSecret,
    }, nombaContext);

    return c.json(result);
  });

  /* ------------------------------------------------------------------
   * 1. Public-read catalog routes (any key OK)
   * ------------------------------------------------------------------ */
  const catalog = new Hono<Env>();
  requireAnyKey(catalog);

  catalog.get("/products", async (c) => {
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const environment = c.get("environment");
    const result = await listProducts(e, { collectionId, environment });
    return c.json(result);
  });

  catalog.get("/plans", async (c) => {
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const environment = c.get("environment");
    const result = await listPlans(e, {}, { collectionId, environment });
    return c.json(result);
  });

  catalog.get("/plans/:planId", async (c) => {
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const environment = c.get("environment");
    const planId = c.req.param("planId");
    const result = await getPlan(e, { planId }, { collectionId, environment });
    return c.json(result ?? null);
  });

  api.route("/", catalog);

  /* ------------------------------------------------------------------
   * 2. Admin routes (secret key only)
   * ------------------------------------------------------------------ */
  const admin = new Hono<Env>();
  requireAnyKey(admin);

  admin.get("/customers/:id", async (c) => {
    if (c.get("keyType") !== "secret") return c.json({ error: "Secret API key required." }, 403);
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const customerId = c.req.param("id");
    const result = await getCustomer(e, { customerId }, { collectionId });
    return c.json(result ?? null);
  });

  admin.delete("/customers/:id", async (c) => {
    if (c.get("keyType") !== "secret") return c.json({ error: "Secret API key required." }, 403);
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const customerId = c.req.param("id");
    const result = await deleteCustomer(e, { customerId }, { collectionId });
    return c.json(result);
  });

  admin.post("/products", async (c) => {
    if (c.get("keyType") !== "secret") return c.json({ error: "Secret API key required." }, 403);
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const environment = c.get("environment");
    const body = await c.req.json();
    const result = await createProduct(e, { ...body, collectionId, environment });
    return c.json(result);
  });

  admin.post("/plans", async (c) => {
    if (c.get("keyType") !== "secret") return c.json({ error: "Secret API key required." }, 403);
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const environment = c.get("environment");
    const body = await c.req.json();
    const result = await createPlan(e, body, { collectionId, environment });
    return c.json(result);
  });

  admin.post("/admin/cron/run", async (c) => {
    if (c.get("keyType") !== "secret") return c.json({ error: "Secret API key required." }, 403);
    const e = getEngine(c);
    const chargeFn = (options?.nomba || options?.nombaClients)
      ? async (input: { tokenKey: string; amount: number; currency: string; orderReference: string }) => {
          const nomba = getNombaClient();
          try {
            const result = await nomba.tokenizedCards.charge({
              tokenKey: input.tokenKey,
              order: {
                orderReference: input.orderReference,
                amount: input.amount,
                currency: input.currency as any,
                customerEmail: "",
                callbackUrl: options?.nomba?.callbackUrl ?? "",
              },
            });
            return { success: result.status, status: result.message };
          } catch {
            return { success: false };
          }
        }
      : undefined;

    const result = await runSemaphorePayCron(e, chargeFn);
    return c.json(result);
  });

  /* ------------------------------------------------------------------
   * 3. User-scoped routes (public key auto-resolves customerId
   *    from key.userId; secret key uses body's customerId)
   * ------------------------------------------------------------------ */
  const user = new Hono<Env>();
  requireAnyKey(user);

  user.get("/customers/me", async (c) => {
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const keyUserId = c.get("keyUserId");
    const keyType = c.get("keyType");
    if (keyType === "public" && !keyUserId) return c.json({ error: "Key has no userId scope." }, 400);
    if (!keyUserId) return c.json(null);
    // Look up by userId (not by customer.id)
    const customer = await e.db.query.customer.findFirst({
      where: and(
        eq(e.schema.customer.userId, keyUserId),
        eq(e.schema.customer.collectionId, collectionId),
      ),
    });
    return c.json(customer ?? null);
  });

  user.post("/customers", async (c) => {
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const keyUserId = c.get("keyUserId");
    const keyType = c.get("keyType");
    const body = await c.req.json();
    // Public keys: force userId from the key, ignore body userId
    if (keyType === "public" && keyUserId) {
      body.userId = keyUserId;
    }
    if (!body.userId) {
      return c.json({ error: "userId is required in the request body." }, 400);
    }
    const result = await upsertCustomer(e, body, { collectionId });
    return c.json(result);
  });

  user.post("/entitlements/check", async (c) => {
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const body = await c.req.json();
    const resolved = await resolveCustomerId(c, body.customerId);
    if ("error" in resolved) return c.json({ error: resolved.error }, resolved.status);
    body.customerId = resolved.customerId;

    const result = await check(e, body, { collectionId });
    return c.json(result);
  });

  user.post("/entitlements/report", async (c) => {
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const body = await c.req.json();
    const resolved = await resolveCustomerId(c, body.customerId);
    if ("error" in resolved) return c.json({ error: resolved.error }, resolved.status);
    body.customerId = resolved.customerId;

    const result = await report(e, body, { collectionId });
    return c.json(result);
  });

  user.post("/subscriptions/subscribe", async (c) => {
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const environment = c.get("environment");
    const body = await c.req.json();
    const resolved = await resolveCustomerId(c, body.customerId);
    if ("error" in resolved) return c.json({ error: resolved.error }, resolved.status);
    body.customerId = resolved.customerId;

    const result = await subscribe(e, body, { collectionId, environment });

    if (result.status !== "pending_payment") {
      return c.json(result);
    }

    if (!options?.nomba && !options?.nombaClients) {
      return c.json({
        ...result,
        checkout: null,
        warning: "Nomba credentials not configured for checkout.",
      });
    }

    const plan = await e.db.query.plan.findFirst({
      where: and(
        eq(e.schema.plan.id, body.planId),
        eq(e.schema.plan.collectionId, collectionId),
        eq(e.schema.plan.environment, environment),
      ),
    });

    if (!plan || plan.priceAmount == null || plan.interval === "none") {
      throw new Error("Paid plan not found or missing price amount.");
    }

    const customer = await e.db.query.customer.findFirst({
      where: and(
        eq(e.schema.customer.id, body.customerId),
        eq(e.schema.customer.collectionId, collectionId),
      ),
    });

    if (!customer?.email) {
      throw new Error("Customer email is required for Nomba checkout.");
    }

    const nomba = getNombaClient(environment);
    const callbackUrl = options?.nombaClients?.callbackUrl ?? options?.nomba?.callbackUrl ?? "";

    const checkout = await nomba.checkout.createOrder({
      order: {
        orderReference: result.nombaOrderReference ?? undefined,
        amount: plan.priceAmount / 100,
        currency: (plan.priceCurrency ?? "NGN") as any,
        customerEmail: customer.email,
        callbackUrl,
      },
      tokenizeCard: true,
    });

    await e.db
      .update(e.schema.subscription)
      .set({
        nombaOrderReference: checkout.orderReference,
        updatedAt: new Date(),
      })
      .where(eq(e.schema.subscription.id, result.subscriptionId));

    return c.json({
      ...result,
      nombaOrderReference: checkout.orderReference,
      checkout,
    });
  });

  user.post("/subscriptions/:id/cancel", async (c) => {
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const subscriptionId = c.req.param("id");
    const result = await cancel(e, subscriptionId, { collectionId });
    return c.json(result);
  });

  /* ------------------------------------------------------------------
   * 4. Payment verification (fallback for webhooks)
   * ------------------------------------------------------------------ */
  user.post("/payments/verify", async (c) => {
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const body = await c.req.json();
    const orderReference = body.orderReference as string;

    if (!orderReference) {
      return c.json({ error: "orderReference is required." }, 400);
    }

    // Find subscription by order reference
    const subscription = await e.db.query.subscription.findFirst({
      where: and(
        eq(e.schema.subscription.nombaOrderReference, orderReference),
        eq(e.schema.subscription.collectionId, collectionId),
      ),
    });

    if (!subscription) {
      // Try one-time product purchase: orderRef format is "prod_{purchaseId}"
      if (orderReference.startsWith("prod_")) {
        const purchaseId = orderReference.slice(5);
        const purchase = await e.db.query.productPurchase.findFirst({
          where: and(
            eq(e.schema.productPurchase.id, purchaseId),
            eq(e.schema.productPurchase.collectionId, collectionId),
          ),
        });

        if (purchase) {
          return c.json({
            status: purchase.status === "completed" ? "success" : "pending",
            processed: false,
            alreadyProcessed: purchase.status === "completed",
          });
        }
      }

      // Fallback: search productPurchase by nombaOrderReference
      const productPurchase = await e.db.query.productPurchase.findFirst({
        where: and(
          eq(e.schema.productPurchase.nombaOrderReference, orderReference),
          eq(e.schema.productPurchase.collectionId, collectionId),
        ),
      });

      if (productPurchase) {
        return c.json({
          status: productPurchase.status === "completed" ? "success" : "pending",
          processed: false,
          alreadyProcessed: productPurchase.status === "completed",
        });
      }

      return c.json({ error: "No subscription or purchase found for this order reference." }, 404);
    }

    // If already active, nothing to do
    if (subscription.status === "active") {
      return c.json({ status: "success", processed: false, alreadyProcessed: true });
    }

    // Verify transaction via Nomba API
    if (!options?.nomba && !options?.nombaClients) {
      return c.json({ error: "Nomba credentials not configured for verification." }, 500);
    }

    const nomba = getNombaClient();
    try {
      const txResult = await nomba.transactions.fetchSingle({
        orderReference,
      });

      if (txResult.status !== "SUCCESS") {
        return c.json({
          status: txResult.status === "PENDING_BILLING" ? "pending" : "failed",
          nombaStatus: txResult.status,
          processed: false,
        });
      }

      // Transaction is SUCCESS — process the payment
      const result = await processSuccessfulPayment(e, {
        orderReference,
        subscriptionId: subscription.id,
        amount: typeof txResult.amount === "string" ? Number(txResult.amount) : (txResult.amount ?? 0),
      });

      return c.json({
        status: "success",
        processed: result.processed,
        alreadyProcessed: result.alreadyProcessed,
      });
    } catch (err) {
      return c.json({
        status: "error",
        error: err instanceof Error ? err.message : "Transaction verification failed",
        processed: false,
      }, 500);
    }
  });

  user.post("/products/purchase", async (c) => {
    const e = getEngine(c);
    const collectionId = c.get("collectionId");
    const environment = c.get("environment");
    const body = await c.req.json();
    const resolved = await resolveCustomerId(c, body.customerId);
    if ("error" in resolved) return c.json({ error: resolved.error }, resolved.status);
    body.customerId = resolved.customerId;

    const result = await purchaseProduct(e, body, { collectionId, environment });

    // If Nomba is configured and the product has a price, create a checkout order
    if ((options?.nomba || options?.nombaClients) && result.status === "completed") {
      const product = await e.db.query.product.findFirst({
        where: and(
          eq(e.schema.product.internalId, body.productInternalId),
          eq(e.schema.product.collectionId, collectionId),
        ),
      });

      if (product?.priceAmount && product.priceAmount > 0) {
        const customer = await e.db.query.customer.findFirst({
          where: and(
            eq(e.schema.customer.id, body.customerId),
            eq(e.schema.customer.collectionId, collectionId),
          ),
        });

        if (customer?.email) {
          const nomba = getNombaClient(environment);
          const orderRef = `prod_${result.purchaseId}`;
          const callbackUrl = options?.nombaClients?.callbackUrl ?? options?.nomba?.callbackUrl ?? "";

          const checkout = await nomba.checkout.createOrder({
            order: {
              orderReference: orderRef,
              amount: product.priceAmount / 100,
              currency: (product.priceCurrency ?? "NGN") as any,
              customerEmail: customer.email,
              callbackUrl,
            },
            tokenizeCard: true,
          });

          // Store Nomba's order reference on the productPurchase record
          await e.db
            .update(e.schema.productPurchase)
            .set({
              nombaOrderReference: checkout.orderReference,
              updatedAt: new Date(),
            })
            .where(eq(e.schema.productPurchase.id, result.purchaseId));

          return c.json({
            ...result,
            nombaOrderReference: checkout.orderReference,
            checkout,
          });
        }
      }
    }

    return c.json(result);
  });

  /* ------------------------------------------------------------------
   * Mount user routes BEFORE admin so /customers/me doesn't collide
   * with admin's /customers/:id
   * ------------------------------------------------------------------ */
  api.route("/", user);
  api.route("/", admin);

  return api;
}