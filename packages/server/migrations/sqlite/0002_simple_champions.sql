ALTER TABLE `semaphore_pay_subscription` ADD `retry_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `semaphore_pay_subscription` ADD `last_retry_at` integer;