-- =====================================================================
-- Smart Study Planner Web Application - Relational MySQL Database Schema
-- Version: 1.0.0 (MySQL 8.0+ Compatible)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `smart_study_planner` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `smart_study_planner`;

-- 1. Users Table (Students, Parents, Admins)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NULL, -- Can be NULL for OAuth/Google users
  `role` ENUM('student', 'parent', 'admin') NOT NULL DEFAULT 'student',
  `google_id` VARCHAR(255) NULL UNIQUE,
  `avatar_url` VARCHAR(500) NULL,
  `invite_code` VARCHAR(20) NULL UNIQUE, -- For students to share with parents
  `phone_number` VARCHAR(20) NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `daily_reminder_time` VARCHAR(10) DEFAULT '20:00',
  `email_alerts_enabled` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_invite_code` (`invite_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Parent-Student Links Table
CREATE TABLE IF NOT EXISTS `parent_student_links` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `parent_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `status` ENUM('pending', 'active', 'revoked') NOT NULL DEFAULT 'active',
  `linked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_psl_parent` FOREIGN KEY (`parent_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_psl_student` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_parent_student` (`parent_id`, `student_id`),
  INDEX `idx_parent` (`parent_id`),
  INDEX `idx_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS `courses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL, -- Owner (Student)
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(50) NULL,
  `description` TEXT NULL,
  `target_completion_date` DATE NOT NULL,
  `target_hours_per_day` DECIMAL(4,2) NOT NULL DEFAULT 2.00,
  `syllabus_modules` JSON NULL, -- Array of module/topic titles and details
  `difficulty` ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  `color_code` VARCHAR(20) DEFAULT '#4F46E5',
  `is_archived` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_courses_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_courses_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Study Plans Table (Dynamic schedule of daily milestones)
CREATE TABLE IF NOT EXISTS `study_plans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `day_number` INT NOT NULL,
  `scheduled_date` DATE NOT NULL,
  `module_name` VARCHAR(150) NOT NULL,
  `topic_title` VARCHAR(200) NOT NULL,
  `topic_description` TEXT NULL,
  `estimated_minutes` INT NOT NULL DEFAULT 60,
  `status` ENUM('pending', 'in_progress', 'completed', 'missed') NOT NULL DEFAULT 'pending',
  `completed_at` DATETIME NULL,
  `notes_snippet` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_study_plan_course` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_study_plan_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_plan_user_date` (`user_id`, `scheduled_date`),
  INDEX `idx_plan_course` (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Assignments Table
CREATE TABLE IF NOT EXISTS `assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `study_plan_id` INT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `due_date` DATE NOT NULL,
  `due_time` TIME NOT NULL DEFAULT '23:59:00',
  `status` ENUM('pending', 'completed', 'overdue') NOT NULL DEFAULT 'pending',
  `completed_at` DATETIME NULL,
  `score` INT DEFAULT NULL,
  `max_score` INT DEFAULT 100,
  `submission_notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_assignments_course` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assignments_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assignments_plan` FOREIGN KEY (`study_plan_id`) REFERENCES `study_plans`(`id`) ON DELETE SET NULL,
  INDEX `idx_assignments_user_due` (`user_id`, `due_date`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tests and Quizzes Table
CREATE TABLE IF NOT EXISTS `tests_and_quizzes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `pass_criteria` INT NOT NULL DEFAULT 60, -- Pass percentage (e.g. 60%)
  `duration_minutes` INT NOT NULL DEFAULT 20,
  `total_questions` INT NOT NULL DEFAULT 5,
  `assigned_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `status` ENUM('assigned', 'completed', 'missed') NOT NULL DEFAULT 'assigned',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tests_course` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tests_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_tests_user` (`user_id`, `assigned_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6b. Quiz Questions Table
CREATE TABLE IF NOT EXISTS `quiz_questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `quiz_id` INT NOT NULL,
  `question_text` TEXT NOT NULL,
  `question_type` ENUM('mcq', 'short_answer') NOT NULL DEFAULT 'mcq',
  `options` JSON NULL, -- Array of 4 options for MCQ
  `correct_answer` TEXT NOT NULL,
  `explanation` TEXT NULL,
  `topic` VARCHAR(100) NULL,
  CONSTRAINT `fk_qq_quiz` FOREIGN KEY (`quiz_id`) REFERENCES `tests_and_quizzes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6c. Student Quiz Submissions Table
CREATE TABLE IF NOT EXISTS `quiz_submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `quiz_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `score` INT NOT NULL,
  `total_marks` INT NOT NULL,
  `percentage` DECIMAL(5,2) NOT NULL,
  `passed` BOOLEAN NOT NULL,
  `weak_areas` JSON NULL,
  `strong_areas` JSON NULL,
  `student_answers` JSON NULL,
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_qs_quiz` FOREIGN KEY (`quiz_id`) REFERENCES `tests_and_quizzes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_qs_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Student Progress & Daily Activity Log
CREATE TABLE IF NOT EXISTS `student_progress` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `course_id` INT NULL,
  `date` DATE NOT NULL,
  `minutes_studied` INT NOT NULL DEFAULT 0,
  `completed_modules_count` INT NOT NULL DEFAULT 0,
  `tests_taken_count` INT NOT NULL DEFAULT 0,
  `average_test_score` DECIMAL(5,2) DEFAULT NULL,
  `streak_count` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_progress_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_progress_course` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_user_course_date` (`user_id`, `course_id`, `date`),
  INDEX `idx_progress_date` (`user_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Notes Table (AI-Generated & User Saved Study Notes)
CREATE TABLE IF NOT EXISTS `notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `topic` VARCHAR(200) NOT NULL,
  `summary` TEXT NOT NULL,
  `key_concepts` JSON NULL,
  `takeaways` JSON NULL,
  `flashcards` JSON NULL,
  `model_used` VARCHAR(50) DEFAULT 'claude-3-5-sonnet',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notes_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notes_course` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  INDEX `idx_notes_course_topic` (`course_id`, `topic`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Daily Alerts & Notification Audit Log
CREATE TABLE IF NOT EXISTS `daily_alerts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `recipient_id` INT NOT NULL,
  `recipient_role` ENUM('student', 'parent') NOT NULL,
  `recipient_email` VARCHAR(150) NOT NULL,
  `student_id` INT NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `summary_text` TEXT NOT NULL,
  `details_json` JSON NULL,
  `delivery_status` ENUM('sent', 'failed', 'mock_delivered') DEFAULT 'sent',
  `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_alert_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_alert_student` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_alerts_recipient` (`recipient_id`, `sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- Seed Data for Testing and Immediate Demo
-- =====================================================================

-- Default Passwords are all: Password123! (bcrypt hash: $2a$10$7R6v7F3nEv2v5wI1c6hT5eJ23w1f1QvC19wA9p3n4zY3s7E4G6K5m or runtime generated)
-- Students: sarvesh@student.edu (Invite Code: STU-SARV-9821)
-- Parent: parent.sarvesh@family.com
-- Admin: admin@studyplanner.io
