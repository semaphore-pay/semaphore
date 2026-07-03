CREATE TABLE "semaphore_pay_api_key" (
	"key" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"type" text NOT NULL,
	"environment" text DEFAULT 'development' NOT NULL,
	"user_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semaphore_pay_collection" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semaphore_pay_customer" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"collection_id" text NOT NULL,
	"email" text,
	"name" text,
	"metadata" jsonb,
	"nomba_customer_id" text,
	"deleted_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semaphore_pay_entitlement" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text,
	"product_purchase_id" text,
	"customer_id" text NOT NULL,
	"feature_id" text NOT NULL,
	"limit" integer,
	"balance" integer,
	"next_reset_at" timestamp,
	"source_type" text DEFAULT 'subscription' NOT NULL,
	"source_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semaphore_pay_feature" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semaphore_pay_invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"subscription_id" text,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"nomba_transaction_id" text,
	"nomba_payment_method_id" text,
	"period_start_at" timestamp,
	"period_end_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semaphore_pay_payment_method" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"nomba_token_id" text NOT NULL,
	"type" text,
	"brand" text,
	"last4" text,
	"expiry_month" integer,
	"expiry_year" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semaphore_pay_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"environment" text DEFAULT 'development' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_amount" integer NOT NULL,
	"price_currency" text DEFAULT 'NGN',
	"interval" text NOT NULL,
	"trial_period_days" integer DEFAULT 30 NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"badge" text,
	"cta_text" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semaphore_pay_plan_feature" (
	"plan_id" text NOT NULL,
	"feature_id" text NOT NULL,
	"limit" integer,
	"reset_interval" text,
	"config" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "semaphore_pay_plan_feature_plan_id_feature_id_pk" PRIMARY KEY("plan_id","feature_id")
);
--> statement-breakpoint
CREATE TABLE "semaphore_pay_product" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"id" text NOT NULL,
	"collection_id" text NOT NULL,
	"environment" text DEFAULT 'development' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"group" text DEFAULT '' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"price_amount" integer,
	"price_currency" text DEFAULT 'NGN',
	"price_interval" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semaphore_pay_product_feature" (
	"product_internal_id" text NOT NULL,
	"feature_id" text NOT NULL,
	"limit" integer,
	"reset_interval" text,
	"config" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "semaphore_pay_product_feature_product_internal_id_feature_id_pk" PRIMARY KEY("product_internal_id","feature_id")
);
--> statement-breakpoint
CREATE TABLE "semaphore_pay_product_purchase" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"product_internal_id" text NOT NULL,
	"nomba_order_reference" text,
	"status" text NOT NULL,
	"purchased_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semaphore_pay_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"product_internal_id" text,
	"nomba_order_reference" text,
	"status" text NOT NULL,
	"canceled" boolean DEFAULT false NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"started_at" timestamp,
	"current_period_start_at" timestamp,
	"current_period_end_at" timestamp,
	"trial_end_at" timestamp,
	"next_retry_at" timestamp,
	"canceled_at" timestamp,
	"ended_at" timestamp,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semaphore_pay_webhook_event" (
	"id" text PRIMARY KEY NOT NULL,
	"nomba_event_id" text NOT NULL,
	"type" text NOT NULL,
	"collection_id" text,
	"payload" jsonb NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"received_at" timestamp NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "semaphore_pay_api_key" ADD CONSTRAINT "semaphore_pay_api_key_collection_id_semaphore_pay_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."semaphore_pay_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_customer" ADD CONSTRAINT "semaphore_pay_customer_collection_id_semaphore_pay_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."semaphore_pay_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_entitlement" ADD CONSTRAINT "semaphore_pay_entitlement_subscription_id_semaphore_pay_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."semaphore_pay_subscription"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_entitlement" ADD CONSTRAINT "semaphore_pay_entitlement_product_purchase_id_semaphore_pay_product_purchase_id_fk" FOREIGN KEY ("product_purchase_id") REFERENCES "public"."semaphore_pay_product_purchase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_entitlement" ADD CONSTRAINT "semaphore_pay_entitlement_customer_id_semaphore_pay_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."semaphore_pay_customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_entitlement" ADD CONSTRAINT "semaphore_pay_entitlement_feature_id_semaphore_pay_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."semaphore_pay_feature"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_invoice" ADD CONSTRAINT "semaphore_pay_invoice_collection_id_semaphore_pay_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."semaphore_pay_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_invoice" ADD CONSTRAINT "semaphore_pay_invoice_customer_id_semaphore_pay_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."semaphore_pay_customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_invoice" ADD CONSTRAINT "semaphore_pay_invoice_subscription_id_semaphore_pay_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."semaphore_pay_subscription"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_payment_method" ADD CONSTRAINT "semaphore_pay_payment_method_customer_id_semaphore_pay_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."semaphore_pay_customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_plan" ADD CONSTRAINT "semaphore_pay_plan_collection_id_semaphore_pay_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."semaphore_pay_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_plan_feature" ADD CONSTRAINT "semaphore_pay_plan_feature_plan_id_semaphore_pay_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."semaphore_pay_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_plan_feature" ADD CONSTRAINT "semaphore_pay_plan_feature_feature_id_semaphore_pay_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."semaphore_pay_feature"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_product" ADD CONSTRAINT "semaphore_pay_product_collection_id_semaphore_pay_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."semaphore_pay_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_product_feature" ADD CONSTRAINT "semaphore_pay_product_feature_product_internal_id_semaphore_pay_product_internal_id_fk" FOREIGN KEY ("product_internal_id") REFERENCES "public"."semaphore_pay_product"("internal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_product_feature" ADD CONSTRAINT "semaphore_pay_product_feature_feature_id_semaphore_pay_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."semaphore_pay_feature"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_product_purchase" ADD CONSTRAINT "semaphore_pay_product_purchase_collection_id_semaphore_pay_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."semaphore_pay_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_product_purchase" ADD CONSTRAINT "semaphore_pay_product_purchase_customer_id_semaphore_pay_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."semaphore_pay_customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_product_purchase" ADD CONSTRAINT "semaphore_pay_product_purchase_product_internal_id_semaphore_pay_product_internal_id_fk" FOREIGN KEY ("product_internal_id") REFERENCES "public"."semaphore_pay_product"("internal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_subscription" ADD CONSTRAINT "semaphore_pay_subscription_collection_id_semaphore_pay_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."semaphore_pay_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_subscription" ADD CONSTRAINT "semaphore_pay_subscription_customer_id_semaphore_pay_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."semaphore_pay_customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_subscription" ADD CONSTRAINT "semaphore_pay_subscription_plan_id_semaphore_pay_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."semaphore_pay_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_subscription" ADD CONSTRAINT "semaphore_pay_subscription_product_internal_id_semaphore_pay_product_internal_id_fk" FOREIGN KEY ("product_internal_id") REFERENCES "public"."semaphore_pay_product"("internal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semaphore_pay_webhook_event" ADD CONSTRAINT "semaphore_pay_webhook_event_collection_id_semaphore_pay_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."semaphore_pay_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "semaphore_pay_api_key_collection_idx" ON "semaphore_pay_api_key" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "semaphore_pay_api_key_user_idx" ON "semaphore_pay_api_key" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "semaphore_pay_customer_user_idx" ON "semaphore_pay_customer" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "semaphore_pay_customer_nomba_idx" ON "semaphore_pay_customer" USING btree ("nomba_customer_id");--> statement-breakpoint
CREATE INDEX "semaphore_pay_entitlement_customer_feature_idx" ON "semaphore_pay_entitlement" USING btree ("customer_id","feature_id");--> statement-breakpoint
CREATE INDEX "semaphore_pay_entitlement_source_idx" ON "semaphore_pay_entitlement" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "semaphore_pay_invoice_customer_idx" ON "semaphore_pay_invoice" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "semaphore_pay_invoice_nomba_transaction_idx" ON "semaphore_pay_invoice" USING btree ("nomba_transaction_id");--> statement-breakpoint
CREATE INDEX "semaphore_pay_payment_method_customer_idx" ON "semaphore_pay_payment_method" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "semaphore_pay_payment_method_nomba_idx" ON "semaphore_pay_payment_method" USING btree ("nomba_token_id");--> statement-breakpoint
CREATE INDEX "semaphore_pay_plan_collection_env_idx" ON "semaphore_pay_plan" USING btree ("collection_id","environment");--> statement-breakpoint
CREATE INDEX "semaphore_pay_plan_active_idx" ON "semaphore_pay_plan" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "semaphore_pay_product_id_version_unique" ON "semaphore_pay_product" USING btree ("id","version");--> statement-breakpoint
CREATE INDEX "semaphore_pay_product_collection_env_idx" ON "semaphore_pay_product" USING btree ("collection_id","environment");--> statement-breakpoint
CREATE INDEX "semaphore_pay_product_purchase_customer_idx" ON "semaphore_pay_product_purchase" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "semaphore_pay_product_purchase_nomba_idx" ON "semaphore_pay_product_purchase" USING btree ("nomba_order_reference");--> statement-breakpoint
CREATE INDEX "semaphore_pay_subscription_customer_status_idx" ON "semaphore_pay_subscription" USING btree ("collection_id","customer_id","status","ended_at");--> statement-breakpoint
CREATE INDEX "semaphore_pay_subscription_next_retry_idx" ON "semaphore_pay_subscription" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "semaphore_pay_subscription_plan_idx" ON "semaphore_pay_subscription" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "semaphore_pay_webhook_event_nomba_event_id_unique" ON "semaphore_pay_webhook_event" USING btree ("nomba_event_id");--> statement-breakpoint
CREATE INDEX "semaphore_pay_webhook_event_status_idx" ON "semaphore_pay_webhook_event" USING btree ("status");