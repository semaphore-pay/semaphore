ALTER TABLE `semaphore_pay_api_key` ADD `user_id` text;--> statement-breakpoint
CREATE INDEX `semaphore_pay_api_key_user_idx` ON `semaphore_pay_api_key` (`user_id`);