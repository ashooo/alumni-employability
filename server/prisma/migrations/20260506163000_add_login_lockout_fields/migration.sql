-- Add persistent login lockout fields for security logs and enforcement

ALTER TABLE `user`
  ADD COLUMN `failed_login_attempts` INT NOT NULL DEFAULT 0,
  ADD COLUMN `locked_until` DATETIME NULL,
  ADD COLUMN `locked_permanently` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `last_failed_login_at` DATETIME NULL;

