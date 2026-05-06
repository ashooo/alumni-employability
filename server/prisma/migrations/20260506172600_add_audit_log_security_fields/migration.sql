-- Add security-log-friendly fields to audit_logs for filtering

ALTER TABLE `audit_logs`
  ADD COLUMN `status` VARCHAR(20) NULL,
  ADD COLUMN `ip_address` VARCHAR(45) NULL,
  ADD COLUMN `details` TEXT NULL;

CREATE INDEX `audit_logs_status_idx` ON `audit_logs`(`status`);
CREATE INDEX `audit_logs_ip_address_idx` ON `audit_logs`(`ip_address`);

