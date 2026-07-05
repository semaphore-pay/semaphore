import {
  boolean,
  index,
  integer,
  jsonb,
  pgTableCreator,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

interface PlanFeatureInput {
  featureId: string;
  type: "boolean" | "limit";
  limit?: number | null;
  resetInterval?: "day" | "week" | "month" | "year" | null;
  config?: Record<string, unknown>;
}

const pgTable = pgTableCreator((name) => `semaphore_pay_${name}`);

// Standardize timestamps
const createdAt = timestamp("created_at")
  .notNull()
  .$defaultFn(() => new Date());
const updatedAt = timestamp("updated_at")
  .notNull()
  .$defaultFn(() => new Date())
  .$onUpdateFn(() => new Date());

// ==========================================
// CORE ENTITIES
// ==========================================

export const customer = pgTable(
  "customer",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(), // Links to Better Auth's user.id
    collectionId: text("collection_id").notNull().references(() => collection.id),
    email: text("email"),
    name: text("name"),
    metadata: jsonb("metadata").$type<Record<string, string> | null>(),
    nombaCustomerId: text("nomba_customer_id"), // If Nomba supports customer mapping
    deletedAt: timestamp("deleted_at"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("semaphore_pay_customer_user_idx").on(table.userId),
    index("semaphore_pay_customer_nomba_idx").on(table.nombaCustomerId),
  ],
);

export const paymentMethod = pgTable(
  "payment_method",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id),
    nombaTokenId: text("nomba_token_id").notNull(), // The tokenized card reference from Nomba
    type: text("type"), // e.g., "card", "bank_transfer"
    brand: text("brand"), // e.g., "verve", "mastercard", "visa"
    last4: text("last4"),
    expiryMonth: integer("expiry_month"),
    expiryYear: integer("expiry_year"),
    isDefault: boolean("is_default").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("semaphore_pay_payment_method_customer_idx").on(table.customerId),
    index("semaphore_pay_payment_method_nomba_idx").on(table.nombaTokenId),
  ],
);

// ==========================================
// PRODUCTS & ENTITLEMENTS (The RevenueCat Engine)
// ==========================================

export const feature = pgTable("feature", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // "boolean", "limit"
  createdAt,
  updatedAt,
});

export const product = pgTable(
  "product",
  {
    internalId: text("internal_id").primaryKey(),
    id: text("id").notNull(),
    collectionId: text("collection_id").notNull().references(() => collection.id),
    environment: text("environment").notNull().default("development"),
    version: integer("version").notNull().default(1),
    name: text("name").notNull(),
    group: text("group").notNull().default(""),
    isDefault: boolean("is_default").notNull().default(false),
    priceAmount: integer("price_amount"), // In Kobo
    priceCurrency: text("price_currency").default("NGN"),
    priceInterval: text("price_interval"), // "monthly", "yearly"
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("semaphore_pay_product_id_version_unique").on(
      table.id,
      table.version,
    ),
    index("semaphore_pay_product_collection_env_idx").on(
      table.collectionId,
      table.environment,
    ),
  ],
);

export const productFeature = pgTable(
  "product_feature",
  {
    productInternalId: text("product_internal_id")
      .notNull()
      .references(() => product.internalId),
    featureId: text("feature_id")
      .notNull()
      .references(() => feature.id),
    limit: integer("limit"),
    resetInterval: text("reset_interval"),
    config: jsonb("config").$type<Record<string, unknown> | null>(),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.productInternalId, table.featureId] }),
  ],
);

// ==========================================
// PLANS (Recurring Billing)
// ==========================================

export const plan = pgTable(
  "plan",
  {
    id: text("id").primaryKey(), // plan_{name}_{interval}
    collectionId: text("collection_id")
      .notNull()
      .references(() => collection.id),
    environment: text("environment").notNull().default("development"),
    name: text("name").notNull(),
    description: text("description"),
    priceAmount: integer("price_amount").notNull(), // In Kobo
    priceCurrency: text("price_currency").default("NGN"),
    interval: text("interval").notNull(), // "monthly" | "yearly" | "none"
    trialPeriodDays: integer("trial_period_days").notNull().default(30),
    features: jsonb("features").$type<PlanFeatureInput[]>().notNull().default([]),
    // Pricing page metadata
    badge: text("badge"), // "Most Popular", "Best Value"
    ctaText: text("cta_text"), // "Start Free Trial", "Get Started"
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("semaphore_pay_plan_collection_env_idx").on(
      table.collectionId,
      table.environment,
    ),
    index("semaphore_pay_plan_active_idx").on(table.isActive),
  ],
);

export const planFeature = pgTable(
  "plan_feature",
  {
    planId: text("plan_id")
      .notNull()
      .references(() => plan.id),
    featureId: text("feature_id")
      .notNull()
      .references(() => feature.id),
    limit: integer("limit"),
    resetInterval: text("reset_interval"),
    config: jsonb("config").$type<Record<string, unknown> | null>(),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.planId, table.featureId] }),
  ],
);

// ==========================================
// SUBSCRIPTIONS & LIFECYCLE
// ==========================================

export const subscription = pgTable(
  "subscription",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collection.id),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id),
    planId: text("plan_id")
      .notNull()
      .references(() => plan.id),
    productInternalId: text("product_internal_id").references(() => product.internalId), // For product purchases
    nombaOrderReference: text("nomba_order_reference"),
    status: text("status").notNull(),
    canceled: boolean("canceled").notNull().default(false),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    startedAt: timestamp("started_at"),
    currentPeriodStartAt: timestamp("current_period_start_at"),
    currentPeriodEndAt: timestamp("current_period_end_at"),
    trialEndAt: timestamp("trial_end_at"),
    nextRetryAt: timestamp("next_retry_at"),
    retryCount: integer("retry_count").notNull().default(0),
    lastRetryAt: timestamp("last_retry_at"),
    canceledAt: timestamp("canceled_at"),
    endedAt: timestamp("ended_at"),
    quantity: integer("quantity").notNull().default(1),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("semaphore_pay_subscription_customer_status_idx").on(
      table.collectionId,
      table.customerId,
      table.status,
      table.endedAt,
    ),
    index("semaphore_pay_subscription_next_retry_idx").on(table.nextRetryAt),
    index("semaphore_pay_subscription_plan_idx").on(table.planId),
  ],
);

export const entitlement = pgTable(
  "entitlement",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id").references(() => subscription.id),
    productPurchaseId: text("product_purchase_id").references(() => productPurchase.id),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id),
    featureId: text("feature_id")
      .notNull()
      .references(() => feature.id),
    limit: integer("limit"),
    balance: integer("balance"),
    nextResetAt: timestamp("next_reset_at"),
    sourceType: text("source_type").notNull().default("subscription"), // "subscription" | "product_purchase"
    sourceId: text("source_id"), // planId or productInternalId
    createdAt,
    updatedAt,
  },
  (table) => [
    index("semaphore_pay_entitlement_customer_feature_idx").on(
      table.customerId,
      table.featureId,
    ),
    index("semaphore_pay_entitlement_source_idx").on(table.sourceType, table.sourceId),
  ],
);

export const productPurchase = pgTable(
  "product_purchase",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collection.id),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id),
    productInternalId: text("product_internal_id")
      .notNull()
      .references(() => product.internalId),
    nombaOrderReference: text("nomba_order_reference"),
    status: text("status").notNull(),
    purchasedAt: timestamp("purchased_at").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("semaphore_pay_product_purchase_customer_idx").on(
      table.customerId,
      table.createdAt,
    ),
    index("semaphore_pay_product_purchase_nomba_idx").on(table.nombaOrderReference),
  ],
);

// ==========================================
// BILLING HISTORY & WEBHOOKS
// ==========================================

export const invoice = pgTable(
  "invoice",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collection.id),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id),
    subscriptionId: text("subscription_id").references(() => subscription.id),
    type: text("type").notNull(), // "subscription_creation", "renewal", "charge_failure"
    status: text("status").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    nombaTransactionId: text("nomba_transaction_id"),
    nombaPaymentMethodId: text("nomba_payment_method_id"),
    periodStartAt: timestamp("period_start_at"),
    periodEndAt: timestamp("period_end_at"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("semaphore_pay_invoice_customer_idx").on(
      table.customerId,
      table.createdAt,
    ),
    index("semaphore_pay_invoice_nomba_transaction_idx").on(
      table.nombaTransactionId,
    ),
  ],
);

export const webhookEvent = pgTable(
  "webhook_event",
  {
    id: text("id").primaryKey(),
    nombaEventId: text("nomba_event_id").notNull(), // Enforces idempotency
    type: text("type").notNull(),
    collectionId: text("collection_id").references(() => collection.id),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull(), // "pending", "processed", "failed"
    error: text("error"),
    receivedAt: timestamp("received_at").notNull(),
    processedAt: timestamp("processed_at"),
  },
  (table) => [
    uniqueIndex("semaphore_pay_webhook_event_nomba_event_id_unique").on(
      table.nombaEventId,
    ),
    index("semaphore_pay_webhook_event_status_idx").on(table.status),
  ],
);

export const collection = pgTable("collection", {
  id: text("id").primaryKey(), // e.g., col_123abc
  name: text("name").notNull(), 
  createdAt,
  updatedAt,
});

export const apiKey = pgTable(
  "api_key",
  {
    key: text("key").primaryKey(), // e.g., sem_sk_test_8f72...
    collectionId: text("collection_id")
      .notNull()
      .references(() => collection.id),
    type: text("type").notNull(), // "public" or "secret"
    environment: text("environment").notNull().default("development"), // "development" or "production"
    userId: text("user_id"), // Only set on public keys — scopes key to a single user
    createdAt,
    updatedAt,
  },
  (table) => [
    index("semaphore_pay_api_key_collection_idx").on(table.collectionId),
    index("semaphore_pay_api_key_user_idx").on(table.userId),
  ]
);
