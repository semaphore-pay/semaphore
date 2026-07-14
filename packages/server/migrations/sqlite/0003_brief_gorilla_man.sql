ALTER TABLE `semaphore_pay_collection` ADD `environment` text DEFAULT 'sandbox' NOT NULL;--> statement-breakpoint
ALTER TABLE `semaphore_pay_collection` ADD `callback_url` text;--> statement-breakpoint
ALTER TABLE `semaphore_pay_feature` ADD `collection_id` text NOT NULL REFERENCES semaphore_pay_collection(id);--> statement-breakpoint
ALTER TABLE `semaphore_pay_feature` ADD `name` text NOT NULL;