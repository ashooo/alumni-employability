-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(20) NOT NULL,
    `first_name` VARCHAR(50) NOT NULL,
    `last_name` VARCHAR(50) NOT NULL,
    `middle_name` VARCHAR(50) NULL,
    `suffix` VARCHAR(10) NULL,
    `last_login` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `College` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Degree` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `college_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentAcademic` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` VARCHAR(20) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `degree_id` INTEGER NOT NULL,
    `gender` VARCHAR(10) NULL,
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

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyTemplate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `target_months` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyQuestion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question_key` VARCHAR(50) NOT NULL,
    `question_text` TEXT NOT NULL,
    `question_type` VARCHAR(20) NOT NULL,
    `storage_type` VARCHAR(20) NOT NULL,
    `column_name` VARCHAR(50) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SurveyQuestion_question_key_key`(`question_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TemplateQuestion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `template_id` INTEGER NOT NULL,
    `question_id` INTEGER NOT NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyOption` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question_id` INTEGER NOT NULL,
    `option_value` VARCHAR(100) NOT NULL,
    `option_label` VARCHAR(100) NOT NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyResponse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_academic_id` INTEGER NOT NULL,
    `template_id` INTEGER NOT NULL,
    `response_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `employment_status` VARCHAR(50) NULL,
    `job_title` VARCHAR(100) NULL,
    `company` VARCHAR(100) NULL,
    `salary_range` VARCHAR(50) NULL,
    `job_relevance` BOOLEAN NULL,
    `soft_skills_ave` DECIMAL(5, 2) NULL,
    `hard_skills_ave` DECIMAL(5, 2) NULL,
    `additional_data` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Skill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `type` VARCHAR(10) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResponseSkill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `survey_response_id` INTEGER NOT NULL,
    `skill_id` INTEGER NOT NULL,
    `score` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Career` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CareerSkill` (
    `career_id` INTEGER NOT NULL,
    `skill_id` INTEGER NOT NULL,
    `importance` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`career_id`, `skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileCareer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `career_id` INTEGER NOT NULL,
    `survey_response_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployabilityPrediction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_academic_id` INTEGER NOT NULL,
    `survey_response_id` INTEGER NOT NULL,
    `model_version` VARCHAR(100) NOT NULL,
    `employable` BOOLEAN NOT NULL,
    `probability` DOUBLE NOT NULL,
    `input_snapshot` JSON NULL,
    `prediction_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ARIMAForecast` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `forecast_date` DATETIME(3) NOT NULL,
    `period_start` DATETIME(3) NOT NULL,
    `period_end` DATETIME(3) NOT NULL,
    `predicted_employment_rate` DOUBLE NOT NULL,
    `lower_bound` DOUBLE NULL,
    `upper_bound` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobRecommendation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_academic_id` INTEGER NOT NULL,
    `survey_response_id` INTEGER NOT NULL,
    `career_name` VARCHAR(100) NOT NULL,
    `match_score` DOUBLE NULL,
    `job_list` JSON NULL,
    `generated_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FollowupSchedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_academic_id` INTEGER NOT NULL,
    `template_id` INTEGER NOT NULL,
    `due_date` DATETIME(3) NOT NULL,
    `sent_date` DATETIME(3) NULL,
    `completed_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Degree` ADD CONSTRAINT `Degree_college_id_fkey` FOREIGN KEY (`college_id`) REFERENCES `College`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentAcademic` ADD CONSTRAINT `StudentAcademic_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentAcademic` ADD CONSTRAINT `StudentAcademic_degree_id_fkey` FOREIGN KEY (`degree_id`) REFERENCES `Degree`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TemplateQuestion` ADD CONSTRAINT `TemplateQuestion_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `SurveyTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TemplateQuestion` ADD CONSTRAINT `TemplateQuestion_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `SurveyQuestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyOption` ADD CONSTRAINT `SurveyOption_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `SurveyQuestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyResponse` ADD CONSTRAINT `SurveyResponse_student_academic_id_fkey` FOREIGN KEY (`student_academic_id`) REFERENCES `StudentAcademic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyResponse` ADD CONSTRAINT `SurveyResponse_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `SurveyTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResponseSkill` ADD CONSTRAINT `ResponseSkill_survey_response_id_fkey` FOREIGN KEY (`survey_response_id`) REFERENCES `SurveyResponse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResponseSkill` ADD CONSTRAINT `ResponseSkill_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `Skill`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareerSkill` ADD CONSTRAINT `CareerSkill_career_id_fkey` FOREIGN KEY (`career_id`) REFERENCES `Career`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareerSkill` ADD CONSTRAINT `CareerSkill_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `Skill`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileCareer` ADD CONSTRAINT `ProfileCareer_career_id_fkey` FOREIGN KEY (`career_id`) REFERENCES `Career`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileCareer` ADD CONSTRAINT `ProfileCareer_survey_response_id_fkey` FOREIGN KEY (`survey_response_id`) REFERENCES `SurveyResponse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployabilityPrediction` ADD CONSTRAINT `EmployabilityPrediction_student_academic_id_fkey` FOREIGN KEY (`student_academic_id`) REFERENCES `StudentAcademic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployabilityPrediction` ADD CONSTRAINT `EmployabilityPrediction_survey_response_id_fkey` FOREIGN KEY (`survey_response_id`) REFERENCES `SurveyResponse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobRecommendation` ADD CONSTRAINT `JobRecommendation_student_academic_id_fkey` FOREIGN KEY (`student_academic_id`) REFERENCES `StudentAcademic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobRecommendation` ADD CONSTRAINT `JobRecommendation_survey_response_id_fkey` FOREIGN KEY (`survey_response_id`) REFERENCES `SurveyResponse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowupSchedule` ADD CONSTRAINT `FollowupSchedule_student_academic_id_fkey` FOREIGN KEY (`student_academic_id`) REFERENCES `StudentAcademic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowupSchedule` ADD CONSTRAINT `FollowupSchedule_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `SurveyTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
