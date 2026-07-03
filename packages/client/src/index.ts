/** API environment: development (test keys) or production (live keys). */
export type Environment = "development" | "production";

/** Plan billing interval. */
export type PlanInterval = "monthly" | "yearly" | "none";

/** Options passed to the SemaphorePayClient constructor. */
export interface SemaphorePayClientOptions {
  /** Base URL of your SemaphorePay server (e.g. http://localhost:8787). */
  baseUrl: string;
  /** Optional API key to pre-set. Use setApiKey() later if not known at construction time. */
  apiKey?: string;
}

/** Input for creating a new collection (tenant). No API key required. */
export interface CreateCollectionInput {
  /** Display name for the collection. */
  name: string;
  /** Optional user ID to scope the public key to. If omitted, the public key
   *  will be unscoped (admin-like). In client apps, pass the current user's ID. */
  userId?: string;
}

/** Result returned after creating a collection. */
export interface CreateCollectionResult {
  collection: { id: string; name: string };
  /** API keys for this collection.
   *  - Use `public` for client-side operations (check entitlements, subscribe, purchase).
   *  - Use `secret` for server-side admin operations (create products, list customers, etc.).
   */
  keys: { public: string; secret: string };
}

/** Input for upserting a customer. If an id is provided, the existing record is updated. */
export interface CustomerInput {
  /** Existing customer ID to update instead of creating a new record. */
  id?: string;
  /** Your application's user identifier. */
  userId: string;
  /** Customer email (required for Nomba checkout on paid subscriptions). */
  email?: string;
  /** Customer display name. */
  name?: string;
  /** Arbitrary key/value metadata attached to the customer. */
  metadata?: Record<string, string>;
}

/** A feature (entitlement) definition shared by plans and products. */
export interface FeatureInput {
  /** Unique identifier for this feature (e.g. "seats", "pro_mode"). */
  featureId: string;
  /** "boolean" for on/off features, "limit" for metered/countable features. */
  type: "boolean" | "limit";
  /** Maximum value for metered features. Omit or set to null for unlimited. */
  limit?: number | null;
  /** How often the metered balance resets. Defaults to "month". */
  resetInterval?: "day" | "week" | "month" | "year" | null;
  /** Optional additional configuration for this feature. */
  config?: Record<string, unknown>;
}

/** Input for creating a plan (recurring subscription). */
export interface CreatePlanInput {
  /** Unique plan identifier for your app (e.g. "pro", "team"). */
  id: string;
  /** Display name of the plan. */
  name: string;
  /** Optional description for pricing page. */
  description?: string;
  /** Price in the smallest currency unit (e.g. 5000 for ₦5000). */
  priceAmount: number;
  /** ISO 4217 currency code (e.g. "NGN", "USD"). */
  priceCurrency?: string;
  /** Billing interval: "monthly", "yearly", or "none" (one-time). */
  interval: PlanInterval;
  /** Trial period in days. Defaults to 30. Ignored if interval is "none". */
  trialPeriodDays?: number;
  /** Features (entitlements) included in this plan. */
  features?: FeatureInput[];
  /** Badge for pricing page (e.g. "Most Popular"). */
  badge?: string;
  /** CTA button text for pricing page. */
  ctaText?: string;
  /** Sort order for pricing page display. */
  sortOrder?: number;
  /** Whether the plan is active and purchasable. */
  isActive?: boolean;
}

/** A plan with its features. */
export interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  priceCurrency: string;
  interval: PlanInterval;
  trialPeriodDays: number;
  features: FeatureInput[];
  badge: string | null;
  ctaText: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a product (one-time purchase). */
export interface CreateProductInput {
  /** Unique product identifier for your app (e.g. "lifetime_pro"). */
  id: string;
  /** Display name of the product. */
  name: string;
  /** Optional grouping label (e.g. "Team Plans"). */
  group?: string;
  /** Whether this is the default product for the collection. */
  isDefault?: boolean;
  /** Price in the smallest currency unit (e.g. 50000 for ₦50000). */
  priceAmount?: number | null;
  /** ISO 4217 currency code (e.g. "NGN", "USD"). */
  priceCurrency?: string;
  /** Product version. Increment this to trigger migrations. */
  version?: number;
  /** Features (entitlements) included in this product. */
  features?: FeatureInput[];
}

/** Input for subscribing a customer to a plan. */
export interface SubscribeToPlanInput {
  /** The customer ID returned from createCustomer(). */
  customerId: string;
  /** The plan ID (e.g. "plan_pro_monthly"). */
  planId: string;
}

/** Result returned by subscribeToPlan(). */
export interface SubscribeToPlanResult {
  subscriptionId: string;
  status: "active" | "pending_payment" | "trialing";
  nombaOrderReference: string | null;
  trialEndAt: string | null;
  checkout?: {
    success: boolean;
    checkoutLink: string;
  };
}

/** Input for purchasing a product (one-time). */
export interface PurchaseProductInput {
  /** The customer ID returned from createCustomer(). */
  customerId: string;
  /** The product's internalId (from createProduct()). */
  productInternalId: string;
}

/** Input for checking whether a customer has a specific entitlement. */
export interface EntitlementCheckInput {
  /** The customer ID. */
  customerId: string;
  /** The feature identifier (e.g. "seats"). */
  featureId: string;
  /** How many units are required. Defaults to 1. */
  required?: number;
}

/** Result of checkEntitlement(). */
export interface EntitlementCheckResult {
  allowed: boolean;
  balance: {
    limit: number;
    remaining: number;
    resetAt: string | null;
    unlimited: boolean;
  } | null;
}

/** Input for consuming (reporting usage of) an entitlement. */
export interface EntitlementReportInput {
  /** The customer ID. */
  customerId: string;
  /** The feature identifier (e.g. "api_calls"). */
  featureId: string;
  /** How many units were used. Defaults to 1. */
  amount?: number;
}

/** Result of reportEntitlement(). */
export interface EntitlementReportResult {
  success: boolean;
  balance: {
    limit: number;
    remaining: number;
    resetAt: string | null;
    unlimited: boolean;
  } | null;
}

class HttpError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "SemaphorePayHttpError";
    this.status = status;
    this.body = body;
  }
}

export class SemaphorePayClient {
  private baseUrl: string;
  private apiKey?: string;
  private publicApiKey?: string;

  /**
   * The current customer ID. Set this after successful login or customer
   * creation so components can read it without passing it explicitly each time.
   */
  public currentCustomerId: string | null = null;

  constructor(options: SemaphorePayClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
  }

  /** Set the secret (admin) API key for server-side operations. */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  /** Set the public API key for client-side operations. */
  setPublicApiKey(apiKey: string) {
    this.publicApiKey = apiKey;
  }

  private getAuthKey(requiresAdmin: boolean): string | undefined {
    return requiresAdmin ? this.apiKey : (this.publicApiKey ?? this.apiKey);
  }

  async createCollection(input: CreateCollectionInput): Promise<CreateCollectionResult> {
    return await this.request<CreateCollectionResult>("POST", "/admin/collections", input);
  }

  async createCustomer(input: CustomerInput) {
    return await this.request("POST", "/customers", input, { requiresAuth: true, requiresAdmin: false });
  }

  async getCustomer(customerId: string) {
    return await this.request("GET", `/customers/${encodeURIComponent(customerId)}`, undefined, {
      requiresAuth: true,
      requiresAdmin: true,
    });
  }

  async deleteCustomer(customerId: string) {
    return await this.request("DELETE", `/customers/${encodeURIComponent(customerId)}`, undefined, {
      requiresAuth: true,
      requiresAdmin: true,
    });
  }

  async createPlan(input: CreatePlanInput): Promise<Plan> {
    return await this.request<Plan>("POST", "/plans", input, { requiresAuth: true, requiresAdmin: true });
  }

  async listPlans(): Promise<Plan[]> {
    return await this.request<Plan[]>("GET", "/plans", undefined, { requiresAuth: true, requiresAdmin: false });
  }

  async getPlan(planId: string): Promise<Plan> {
    return await this.request<Plan>("GET", `/plans/${encodeURIComponent(planId)}`, undefined, {
      requiresAuth: true,
      requiresAdmin: false,
    });
  }

  async createProduct(input: CreateProductInput) {
    return await this.request("POST", "/products", input, { requiresAuth: true, requiresAdmin: true });
  }

  async listProducts() {
    return await this.request("GET", "/products", undefined, { requiresAuth: true, requiresAdmin: false });
  }

  async subscribeToPlan(input: SubscribeToPlanInput): Promise<SubscribeToPlanResult> {
    return await this.request<SubscribeToPlanResult>(
      "POST",
      "/subscriptions/subscribe",
      input,
      { requiresAuth: true, requiresAdmin: false },
    );
  }

  async purchaseProduct(input: PurchaseProductInput) {
    return await this.request("POST", "/products/purchase", input, { requiresAuth: true, requiresAdmin: false });
  }

  async cancelSubscription(subscriptionId: string) {
    return await this.request(
      "POST",
      `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
      undefined,
      { requiresAuth: true, requiresAdmin: true },
    );
  }

  async checkEntitlement(input: EntitlementCheckInput): Promise<EntitlementCheckResult> {
    return await this.request<EntitlementCheckResult>(
      "POST",
      "/entitlements/check",
      input,
      { requiresAuth: true, requiresAdmin: false },
    );
  }

  async reportEntitlement(input: EntitlementReportInput): Promise<EntitlementReportResult> {
    return await this.request<EntitlementReportResult>(
      "POST",
      "/entitlements/report",
      input,
      { requiresAuth: true, requiresAdmin: false },
    );
  }

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown,
    options: { requiresAuth?: boolean; requiresAdmin?: boolean } = {},
  ): Promise<T> {
    const headers: Record<string, string> = { "content-type": "application/json" };

    if (options.requiresAuth) {
      const key = this.getAuthKey(options.requiresAdmin ?? true);
      if (!key) {
        throw new Error(
          `SemaphorePay ${options.requiresAdmin ? "admin" : "public"} API key is required for this request.`,
        );
      }
      headers["x-api-key"] = key;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    const payload = text ? safeJson(text) : null;

    if (!response.ok) {
      throw new HttpError(
        `SemaphorePay API request failed (${response.status})`,
        response.status,
        payload,
      );
    }

    return payload as T;
  }
}

function safeJson(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}
