ALTER TABLE "semaphore_pay_subscription" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "semaphore_pay_subscription" ADD COLUMN "last_retry_at" timestamp;