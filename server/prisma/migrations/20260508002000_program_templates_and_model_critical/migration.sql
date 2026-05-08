ALTER TABLE `survey_template`
  ADD COLUMN `program_id` INTEGER NULL,
  ADD INDEX `survey_template_program_id_idx` (`program_id`),
  ADD CONSTRAINT `survey_template_program_id_fkey`
    FOREIGN KEY (`program_id`) REFERENCES `program`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `template_question`
  ADD COLUMN `is_model_critical` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `model_critical_key` VARCHAR(100) NULL;
