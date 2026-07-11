/** API environment: development (test keys) or production (live keys). */
export type Environment = "development" | "production";

/** Plan billing interval. */
export type PlanInterval = "monthly" | "yearly" | "none" | "test_15min";

/** Options passed to the SemaphorePayClient constructor. */
export interface SemaphorePayClientOptions {
  /** Base URL of your SemaphorePay server (e.g. http://localhost:8787). */
  baseUrl: string;
  /** Public or secret API key. Public keys are scoped to one collection. */
  apiKey: string;
  /** The collection ID this client is scoped to. */
  collectionId: string;
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

/** A plan with its features. */
export interface Plan {
  id: string;
  collectionId: string;
  environment: Environment;
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

/** A product with its features. */
export interface Product {
  internalId: string;
  id: string;
  collectionId: string;
  environment: Environment;
  version: number;
  name: string;
  group: string;
  isDefault: boolean;
  priceAmount: number | null;
  priceCurrency: string;
  priceInterval: string | null;
  features: FeatureInput[];
  createdAt: string;
  updatedAt: string;
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
    checkoutLink: string;
    orderReference: string;
  } | null;
}

/** Input for purchasing a product (one-time). */
export interface PurchaseProductInput {
  /** The customer ID returned from createCustomer(). */
  customerId: string;
  /** The product's internalId (from the catalog). */
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

/** Result of verifyPayment(). */
export interface VerifyPaymentResult {
  /** "success" | "pending" | "failed" | "error" */
  status: string;
  /** Whether the payment was just processed (subscription activated). */
  processed: boolean;
  /** Whether the payment was already processed before this call. */
  alreadyProcessed: boolean;
  /** Nomba's transaction status if available (e.g. "SUCCESS", "PENDING_BILLING"). */
  nombaStatus?: string;
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "SemaphorePayHttpError";
    this.status = status;
    this.body = body;
  }
}

/**
 * SemaphorePay end-user client.
 *
 * Configure with a public API key scoped to one collection.
 * Use this client in your app/website for customer-facing operations:
 * creating customers, subscribing to plans, checking entitlements, etc.
 *
 * ```ts
 * const client = new SemaphorePayClient({
 *   baseUrl: "https://your-server.example.com",
 *   apiKey: "pk_test_...",
 *   collectionId: "col_...",
 * });
 * ```
 */
export class SemaphorePayClient {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly collectionId: string;

  /**
   * The current customer ID. Set this after successful login or customer
   * creation so components can read it without passing it explicitly each time.
   */
  public currentCustomerId: string | null = null;

  constructor(options: SemaphorePayClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.collectionId = options.collectionId;
  }

  // ──── Customer ────

  async createCustomer(input: CustomerInput) {
    return await this.request("POST", "/customers", input);
  }

  /** Get the current customer resolved from the API key's userId. */
  async getMe() {
    return await this.request("GET", "/customers/me");
  }

  // ──── Plans (read-only catalog) ────

  async listPlans(): Promise<Plan[]> {
    return await this.request<Plan[]>("GET", "/plans");
  }

  async getPlan(planId: string): Promise<Plan | null> {
    return await this.request<Plan>("GET", `/plans/${encodeURIComponent(planId)}`);
  }

  // ──── Products (read-only catalog) ────

  async listProducts(): Promise<Product[]> {
    return await this.request<Product[]>("GET", "/products");
  }

  // ──── Subscriptions ────

  async subscribeToPlan(input: SubscribeToPlanInput): Promise<SubscribeToPlanResult> {
    return await this.request<SubscribeToPlanResult>("POST", "/subscriptions/subscribe", input);
  }

  async cancelSubscription(subscriptionId: string) {
    return await this.request(
      "POST",
      `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    );
  }

  // ──── Products (purchase) ────

  async purchaseProduct(input: PurchaseProductInput) {
    return await this.request("POST", "/products/purchase", input);
  }

  // ──── Entitlements ────

  async checkEntitlement(input: EntitlementCheckInput): Promise<EntitlementCheckResult> {
    return await this.request<EntitlementCheckResult>("POST", "/entitlements/check", input);
  }

  async reportEntitlement(input: EntitlementReportInput): Promise<EntitlementReportResult> {
    return await this.request<EntitlementReportResult>("POST", "/entitlements/report", input);
  }

  // ──── Payment Verification ────

  /**
   * Verify a payment by order reference. Calls the backend which checks
   * the transaction status via the Nomba API. If the transaction is
   * successful and not yet processed, activates the subscription.
   *
   * Use this as a fallback when webhooks are not received.
   */
  async verifyPayment(orderReference: string): Promise<VerifyPaymentResult> {
    return await this.request<VerifyPaymentResult>("POST", "/payments/verify", {
      orderReference,
    });
  }

  /**
   * Poll `verifyPayment` with exponential backoff until the payment is
   * confirmed or max attempts are exhausted.
   *
   * @param orderReference - The order reference from checkout.
   * @param opts.maxAttempts - Total poll attempts (default: 6).
   * @param opts.delays - Array of delays in ms between attempts.
   *   Defaults to [0, 5000, 20000, 40000, 80000, 160000] (~5 min total).
   * @returns The final verification result.
   */
  async waitForPayment(
    orderReference: string,
    opts?: {
      maxAttempts?: number;
      delays?: number[];
      onAttempt?: (attempt: number, result: VerifyPaymentResult) => void;
    },
  ): Promise<VerifyPaymentResult> {
    const delays = opts?.delays ?? [0, 5000, 20000, 40000, 80000, 160000];
    const maxAttempts = opts?.maxAttempts ?? delays.length;

    let lastResult: VerifyPaymentResult = { status: "pending", processed: false, alreadyProcessed: false };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const delay = delays[attempt] ?? delays[delays.length - 1] ?? 0;
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }

      try {
        lastResult = await this.verifyPayment(orderReference);
        opts?.onAttempt?.(attempt + 1, lastResult);

        // Stop if payment is confirmed or already processed
        if (lastResult.status === "success" || lastResult.alreadyProcessed) {
          return lastResult;
        }
      } catch (err) {
        // Network error — continue polling
        lastResult = { status: "error", processed: false, alreadyProcessed: false };
      }
    }

    return lastResult;
  }

  // ──── Internal ────

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-api-key": this.apiKey,
    };

    const response = await fetch(`${this.baseUrl}/client${path}`, {
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
