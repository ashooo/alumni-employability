-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NULL,
    `phone` VARCHAR(30) NULL,
    `address` TEXT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'ALUMNI', 'SUPERADMIN') NOT NULL,
    `first_name` VARCHAR(50) NOT NULL,
    `last_name` VARCHAR(50) NOT NULL,
    `middle_name` VARCHAR(50) NULL,
    `suffix` VARCHAR(10) NULL,
    `last_login` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_username_key`(`username`),
    UNIQUE INDEX `user_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `college` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(20) NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `college_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `program` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(20) NULL,
    `description` TEXT NULL,
    `college_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `program_code_key`(`code`),
    INDEX `program_college_id_idx`(`college_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alumni_profile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `student_id` VARCHAR(20) NOT NULL,
    `batch_year` INTEGER NOT NULL,
    `current_program_id` INTEGER NULL,
    `lifecycle_status` ENUM('PENDING', 'ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `alumni_profile_user_id_key`(`user_id`),
    UNIQUE INDEX `alumni_profile_student_id_key`(`student_id`),
    INDEX `alumni_profile_current_program_id_idx`(`current_program_id`),
    INDEX `alumni_profile_batch_year_idx`(`batch_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academic_snapshot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `alumni_profile_id` INTEGER NOT NULL,
    `program_id` INTEGER NOT NULL,
    `gender` VARCHAR(20) NULL,
    `age` INTEGER NULL,
    `year_graduated` INTEGER NOT NULL,
    `cgpa` DECIMAL(5, 2) NULL,
    `prof_grade` DECIMAL(5, 2) NULL,
    `elec_grade` DECIMAL(5, 2) NULL,
    `ojt_grade` DECIMAL(5, 2) NULL,
    `leader_pos` BOOLEAN NULL DEFAULT false,
    `act_member_pos` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `academic_snapshot_alumni_profile_id_idx`(`alumni_profile_id`),
    INDEX `academic_snapshot_program_id_idx`(`program_id`),
    INDEX `academic_snapshot_year_graduated_idx`(`year_graduated`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competency` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `kind` ENUM('SOFT_SKILL', 'HARD_SKILL', 'KNOWLEDGE', 'ABILITY', 'INTEREST', 'TECHNOLOGY') NOT NULL,
    `description` TEXT NULL,
    `source` VARCHAR(100) NULL,
    `category` VARCHAR(100) NULL,
    `industry_relevance` VARCHAR(100) NULL,
    `is_trending` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `competency_kind_idx`(`kind`),
    UNIQUE INDEX `competency_name_kind_key`(`name`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_template` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `template_key` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `kind` ENUM('INITIAL', 'EMPLOYED', 'UNEMPLOYED', 'FOLLOWUP', 'GENERAL') NOT NULL,
    `path_key` ENUM('INITIAL', 'EMPLOYED', 'UNEMPLOYED', 'FOLLOWUP') NOT NULL,
    `is_followup` BOOLEAN NOT NULL DEFAULT false,
    `target_months` INTEGER NULL,
    `trigger_condition` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `survey_template_template_key_key`(`template_key`),
    INDEX `survey_template_kind_idx`(`kind`),
    INDEX `survey_template_path_key_idx`(`path_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_question` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question_key` VARCHAR(100) NOT NULL,
    `question_text` TEXT NOT NULL,
    `help_text` TEXT NULL,
    `question_type` ENUM('TEXT', 'TEXTAREA', 'NUMBER', 'BOOLEAN', 'DATE', 'SINGLE_SELECT', 'MULTI_SELECT', 'SCALE') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `survey_question_question_key_key`(`question_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_option` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question_id` INTEGER NOT NULL,
    `option_value` VARCHAR(100) NOT NULL,
    `option_label` VARCHAR(100) NOT NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `survey_option_question_id_idx`(`question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `template_question` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `template_id` INTEGER NOT NULL,
    `question_id` INTEGER NOT NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `section_key` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `template_question_template_id_display_order_idx`(`template_id`, `display_order`),
    UNIQUE INDEX `template_question_template_id_question_id_key`(`template_id`, `question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_submission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `alumni_profile_id` INTEGER NOT NULL,
    `academic_snapshot_id` INTEGER NULL,
    `template_id` INTEGER NOT NULL,
    `parent_submission_id` INTEGER NULL,
    `trigger_submission_id` INTEGER NULL,
    `branch_path` ENUM('INITIAL', 'EMPLOYED', 'UNEMPLOYED', 'FOLLOWUP') NOT NULL,
    `started_at` DATETIME(3) NULL,
    `submitted_at` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'COMPLETED', 'ABANDONED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
    `additional_data` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `survey_submission_alumni_profile_id_idx`(`alumni_profile_id`),
    INDEX `survey_submission_academic_snapshot_id_idx`(`academic_snapshot_id`),
    INDEX `survey_submission_template_id_idx`(`template_id`),
    INDEX `survey_submission_parent_submission_id_idx`(`parent_submission_id`),
    INDEX `survey_submission_trigger_submission_id_idx`(`trigger_submission_id`),
    INDEX `survey_submission_branch_path_idx`(`branch_path`),
    INDEX `survey_submission_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_answer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `submission_id` INTEGER NOT NULL,
    `question_id` INTEGER NOT NULL,
    `answer_text` TEXT NULL,
    `answer_number` DECIMAL(10, 2) NULL,
    `answer_boolean` BOOLEAN NULL,
    `answer_date` DATETIME(3) NULL,
    `answer_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `survey_answer_submission_id_idx`(`submission_id`),
    INDEX `survey_answer_question_id_idx`(`question_id`),
    UNIQUE INDEX `survey_answer_submission_id_question_id_key`(`submission_id`, `question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submission_competency` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `submission_id` INTEGER NOT NULL,
    `competency_id` INTEGER NOT NULL,
    `selected` BOOLEAN NOT NULL DEFAULT true,
    `score` INTEGER NULL,
    `importance` INTEGER NULL,
    `preference_rank` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `submission_competency_competency_id_idx`(`competency_id`),
    UNIQUE INDEX `submission_competency_submission_id_competency_id_key`(`submission_id`, `competency_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employment_outcome` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `alumni_profile_id` INTEGER NOT NULL,
    `submission_id` INTEGER NOT NULL,
    `employment_status` ENUM('EMPLOYED', 'UNEMPLOYED', 'SELF_EMPLOYED', 'FREELANCER', 'FURTHER_STUDYING', 'OTHER') NOT NULL,
    `outcome_date` DATETIME(3) NOT NULL,
    `company` VARCHAR(150) NULL,
    `job_title` VARCHAR(150) NULL,
    `industry` VARCHAR(100) NULL,
    `salary_range` VARCHAR(100) NULL,
    `degree_relevance` BOOLEAN NULL,
    `additional_data` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `employment_outcome_alumni_profile_id_idx`(`alumni_profile_id`),
    INDEX `employment_outcome_submission_id_idx`(`submission_id`),
    INDEX `employment_outcome_employment_status_idx`(`employment_status`),
    INDEX `employment_outcome_outcome_date_idx`(`outcome_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `followup_schedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `alumni_profile_id` INTEGER NOT NULL,
    `trigger_submission_id` INTEGER NOT NULL,
    `target_template_id` INTEGER NOT NULL,
    `due_at` DATETIME(3) NOT NULL,
    `sent_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'SENT', 'COMPLETED', 'SKIPPED', 'OVERDUE', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `followup_schedule_alumni_profile_id_idx`(`alumni_profile_id`),
    INDEX `followup_schedule_trigger_submission_id_idx`(`trigger_submission_id`),
    INDEX `followup_schedule_target_template_id_idx`(`target_template_id`),
    INDEX `followup_schedule_due_at_idx`(`due_at`),
    INDEX `followup_schedule_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `occupation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source_system` VARCHAR(50) NULL,
    `source_code` VARCHAR(50) NULL,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `family` VARCHAR(100) NULL,
    `metadata_json` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `occupation_title_idx`(`title`),
    INDEX `occupation_family_idx`(`family`),
    UNIQUE INDEX `occupation_source_system_source_code_key`(`source_system`, `source_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `occupation_competency` (
    `occupation_id` INTEGER NOT NULL,
    `competency_id` INTEGER NOT NULL,
    `weight` DECIMAL(6, 3) NULL,
    `source_kind` ENUM('SOFT_SKILL', 'HARD_SKILL', 'KNOWLEDGE', 'ABILITY', 'INTEREST', 'TECHNOLOGY') NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `occupation_competency_competency_id_idx`(`competency_id`),
    PRIMARY KEY (`occupation_id`, `competency_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ml_prediction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prediction_type` ENUM('EMPLOYABILITY', 'JOB_MATCHING', 'OTHER') NOT NULL,
    `model_name` VARCHAR(100) NOT NULL,
    `model_version` VARCHAR(100) NULL,
    `alumni_profile_id` INTEGER NOT NULL,
    `academic_snapshot_id` INTEGER NULL,
    `submission_id` INTEGER NULL,
    `input_snapshot` JSON NULL,
    `output_json` JSON NOT NULL,
    `confidence` DECIMAL(6, 4) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ml_prediction_prediction_type_idx`(`prediction_type`),
    INDEX `ml_prediction_model_name_idx`(`model_name`),
    INDEX `ml_prediction_alumni_profile_id_idx`(`alumni_profile_id`),
    INDEX `ml_prediction_academic_snapshot_id_idx`(`academic_snapshot_id`),
    INDEX `ml_prediction_submission_id_idx`(`submission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `arima_forecast` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `forecast_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `period_start` DATETIME(3) NOT NULL,
    `period_end` DATETIME(3) NOT NULL,
    `predicted_employment_rate` DECIMAL(6, 2) NULL,
    `lower_bound` DECIMAL(6, 2) NULL,
    `upper_bound` DECIMAL(6, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `arima_forecast_period_start_period_end_idx`(`period_start`, `period_end`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'info',
    `target_role` VARCHAR(20) NOT NULL DEFAULT 'alumni',
    `target_college_id` INTEGER NULL,
    `target_program_id` INTEGER NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `notifications_target_role_idx`(`target_role`),
    INDEX `notifications_target_college_id_idx`(`target_college_id`),
    INDEX `notifications_target_program_id_idx`(`target_program_id`),
    INDEX `notifications_created_by_idx`(`created_by`),
    INDEX `notifications_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `notification_id` INTEGER NOT NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_notifications_user_id_notification_id_key`(`user_id`, `notification_id`),
    INDEX `user_notifications_user_id_read_at_idx`(`user_id`, `read_at`),
    INDEX `user_notifications_notification_id_idx`(`notification_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(100) NULL,
    `entity_id` INTEGER NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `audit_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_entity_type_idx`(`entity_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `key` VARCHAR(100) NOT NULL,
    `value` LONGTEXT NOT NULL,
    `updated_by` INTEGER NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `system_settings_updated_by_idx`(`updated_by`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `filename` VARCHAR(255) NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uploaded_by` INTEGER NULL,
    `total_records` INTEGER NOT NULL,
    `success_count` INTEGER NOT NULL,
    `failed_count` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'completed',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `import_history_uploaded_by_idx`(`uploaded_by`),
    INDEX `import_history_uploaded_at_idx`(`uploaded_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_errors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `import_id` INTEGER NOT NULL,
    `row_number` INTEGER NOT NULL,
    `error` TEXT NOT NULL,
    `raw_data` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `import_errors_import_id_idx`(`import_id`),
    INDEX `import_errors_row_number_idx`(`row_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `program` ADD CONSTRAINT `program_college_id_fkey` FOREIGN KEY (`college_id`) REFERENCES `college`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alumni_profile` ADD CONSTRAINT `alumni_profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alumni_profile` ADD CONSTRAINT `alumni_profile_current_program_id_fkey` FOREIGN KEY (`current_program_id`) REFERENCES `program`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_snapshot` ADD CONSTRAINT `academic_snapshot_alumni_profile_id_fkey` FOREIGN KEY (`alumni_profile_id`) REFERENCES `alumni_profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_snapshot` ADD CONSTRAINT `academic_snapshot_program_id_fkey` FOREIGN KEY (`program_id`) REFERENCES `program`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_option` ADD CONSTRAINT `survey_option_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `survey_question`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_question` ADD CONSTRAINT `template_question_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `survey_template`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_question` ADD CONSTRAINT `template_question_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `survey_question`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_submission` ADD CONSTRAINT `survey_submission_alumni_profile_id_fkey` FOREIGN KEY (`alumni_profile_id`) REFERENCES `alumni_profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_submission` ADD CONSTRAINT `survey_submission_academic_snapshot_id_fkey` FOREIGN KEY (`academic_snapshot_id`) REFERENCES `academic_snapshot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_submission` ADD CONSTRAINT `survey_submission_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `survey_template`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_submission` ADD CONSTRAINT `survey_submission_parent_submission_id_fkey` FOREIGN KEY (`parent_submission_id`) REFERENCES `survey_submission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_submission` ADD CONSTRAINT `survey_submission_trigger_submission_id_fkey` FOREIGN KEY (`trigger_submission_id`) REFERENCES `survey_submission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_answer` ADD CONSTRAINT `survey_answer_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `survey_submission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_answer` ADD CONSTRAINT `survey_answer_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `survey_question`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission_competency` ADD CONSTRAINT `submission_competency_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `survey_submission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission_competency` ADD CONSTRAINT `submission_competency_competency_id_fkey` FOREIGN KEY (`competency_id`) REFERENCES `competency`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employment_outcome` ADD CONSTRAINT `employment_outcome_alumni_profile_id_fkey` FOREIGN KEY (`alumni_profile_id`) REFERENCES `alumni_profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employment_outcome` ADD CONSTRAINT `employment_outcome_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `survey_submission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `followup_schedule` ADD CONSTRAINT `followup_schedule_alumni_profile_id_fkey` FOREIGN KEY (`alumni_profile_id`) REFERENCES `alumni_profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `followup_schedule` ADD CONSTRAINT `followup_schedule_trigger_submission_id_fkey` FOREIGN KEY (`trigger_submission_id`) REFERENCES `survey_submission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `followup_schedule` ADD CONSTRAINT `followup_schedule_target_template_id_fkey` FOREIGN KEY (`target_template_id`) REFERENCES `survey_template`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `occupation_competency` ADD CONSTRAINT `occupation_competency_occupation_id_fkey` FOREIGN KEY (`occupation_id`) REFERENCES `occupation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `occupation_competency` ADD CONSTRAINT `occupation_competency_competency_id_fkey` FOREIGN KEY (`competency_id`) REFERENCES `competency`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ml_prediction` ADD CONSTRAINT `ml_prediction_alumni_profile_id_fkey` FOREIGN KEY (`alumni_profile_id`) REFERENCES `alumni_profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ml_prediction` ADD CONSTRAINT `ml_prediction_academic_snapshot_id_fkey` FOREIGN KEY (`academic_snapshot_id`) REFERENCES `academic_snapshot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ml_prediction` ADD CONSTRAINT `ml_prediction_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `survey_submission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_notifications` ADD CONSTRAINT `user_notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_notifications` ADD CONSTRAINT `user_notifications_notification_id_fkey` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `import_history` ADD CONSTRAINT `import_history_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `import_errors` ADD CONSTRAINT `import_errors_import_id_fkey` FOREIGN KEY (`import_id`) REFERENCES `import_history`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
