-- AlterTable
ALTER TABLE `academic_snapshot` ADD COLUMN `hard_skills_ave` DECIMAL(5, 2) NULL,
    ADD COLUMN `is_employable` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `soft_skills_ave` DECIMAL(5, 2) NULL;
