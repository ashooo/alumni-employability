-- AlterTable
ALTER TABLE `user` MODIFY `locked_until` DATETIME(3) NULL,
    MODIFY `last_failed_login_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `academic_snapshot_skill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `academic_snapshot_id` INTEGER NOT NULL,
    `skill_name` VARCHAR(150) NOT NULL,
    `skill_value` DECIMAL(6, 2) NULL,
    `source_column` VARCHAR(150) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `academic_snapshot_skill_academic_snapshot_id_idx`(`academic_snapshot_id`),
    INDEX `academic_snapshot_skill_skill_name_idx`(`skill_name`),
    UNIQUE INDEX `academic_snapshot_skill_academic_snapshot_id_skill_name_key`(`academic_snapshot_id`, `skill_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `academic_snapshot_skill` ADD CONSTRAINT `academic_snapshot_skill_academic_snapshot_id_fkey` FOREIGN KEY (`academic_snapshot_id`) REFERENCES `academic_snapshot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
