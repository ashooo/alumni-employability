-- Create a separate sandbox database for the v2 schema refactor.
-- This keeps the current application database untouched.

CREATE DATABASE IF NOT EXISTS `alumni_tracer_refactor`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

