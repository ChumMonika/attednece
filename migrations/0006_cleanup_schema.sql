-- Database Schema Cleanup and Optimization
-- This script will:
-- 1. Drop unnecessary backup tables
-- 2. Fix column inconsistencies
-- 3. Align with E2E test expectations

USE university_staff_tracker;

-- ============================================
-- STEP 1: Drop Backup Tables (Not Needed)
-- ============================================
DROP TABLE IF EXISTS classes_backup;
DROP TABLE IF EXISTS departments_backup;
DROP TABLE IF EXISTS majors_backup;
DROP TABLE IF EXISTS schedules_backup;
DROP TABLE IF EXISTS users_backup;

-- ============================================
-- STEP 2: Fix Users Table
-- ============================================
-- Remove redundant 'department' column (we have department_id)
-- Remove redundant 'subject' column (subjects are linked through schedules)
ALTER TABLE users DROP COLUMN IF EXISTS department;
ALTER TABLE users DROP COLUMN IF EXISTS subject;

-- Ensure department_id has proper foreign key
ALTER TABLE users DROP FOREIGN KEY IF EXISTS users_ibfk_1;
ALTER TABLE users 
  ADD CONSTRAINT fk_users_department 
  FOREIGN KEY (department_id) REFERENCES departments(id) 
  ON DELETE SET NULL;

-- Ensure class_id has proper foreign key
ALTER TABLE users DROP FOREIGN KEY IF EXISTS users_ibfk_2;
ALTER TABLE users 
  ADD CONSTRAINT fk_users_class 
  FOREIGN KEY (class_id) REFERENCES classes(id) 
  ON DELETE SET NULL;

-- ============================================
-- STEP 3: Fix Schedules Table
-- ============================================
-- Ensure schedules has proper structure matching schema
ALTER TABLE schedules MODIFY COLUMN day_of_week VARCHAR(20) NOT NULL;
ALTER TABLE schedules MODIFY COLUMN start_time TIME NOT NULL;
ALTER TABLE schedules MODIFY COLUMN end_time TIME NOT NULL;
ALTER TABLE schedules MODIFY COLUMN room VARCHAR(50) NOT NULL;

-- Add foreign keys if missing
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS schedules_ibfk_1;
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS schedules_ibfk_2;
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS schedules_ibfk_3;

ALTER TABLE schedules 
  ADD CONSTRAINT fk_schedules_class 
  FOREIGN KEY (class_id) REFERENCES classes(id) 
  ON DELETE CASCADE;

ALTER TABLE schedules 
  ADD CONSTRAINT fk_schedules_subject 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) 
  ON DELETE CASCADE;

ALTER TABLE schedules 
  ADD CONSTRAINT fk_schedules_teacher 
  FOREIGN KEY (teacher_id) REFERENCES users(id) 
  ON DELETE CASCADE;

-- ============================================
-- STEP 4: Fix Subjects Table
-- ============================================
-- Ensure code is unique
ALTER TABLE subjects DROP INDEX IF EXISTS code;
ALTER TABLE subjects ADD UNIQUE INDEX idx_subject_code (code);

-- ============================================
-- STEP 5: Verify Class Moderators Table
-- ============================================
-- This table is useful for tracking class moderators
-- Make sure it has proper structure
ALTER TABLE class_moderators DROP FOREIGN KEY IF EXISTS class_moderators_ibfk_1;
ALTER TABLE class_moderators DROP FOREIGN KEY IF EXISTS class_moderators_ibfk_2;

ALTER TABLE class_moderators 
  ADD CONSTRAINT fk_class_moderators_class 
  FOREIGN KEY (class_id) REFERENCES classes(id) 
  ON DELETE CASCADE;

ALTER TABLE class_moderators 
  ADD CONSTRAINT fk_class_moderators_user 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE;

-- ============================================
-- STEP 6: Verify Class Subjects Table
-- ============================================
-- This table links subjects to classes (many-to-many)
-- Keep this as it's useful for curriculum management
ALTER TABLE class_subjects DROP FOREIGN KEY IF EXISTS class_subjects_ibfk_1;
ALTER TABLE class_subjects DROP FOREIGN KEY IF EXISTS class_subjects_ibfk_2;

ALTER TABLE class_subjects 
  ADD CONSTRAINT fk_class_subjects_class 
  FOREIGN KEY (class_id) REFERENCES classes(id) 
  ON DELETE CASCADE;

ALTER TABLE class_subjects 
  ADD CONSTRAINT fk_class_subjects_subject 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) 
  ON DELETE CASCADE;

-- ============================================
-- STEP 7: Fix Attendance Table
-- ============================================
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_ibfk_1;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_ibfk_2;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_ibfk_3;

-- Add proper foreign keys
ALTER TABLE attendance 
  ADD CONSTRAINT fk_attendance_user 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE;

-- marked_by should reference users(id) - who marked the attendance
ALTER TABLE attendance 
  ADD CONSTRAINT fk_attendance_marked_by 
  FOREIGN KEY (marked_by) REFERENCES users(id) 
  ON DELETE SET NULL;

-- schedule_id should reference schedules(id) if present
ALTER TABLE attendance 
  ADD CONSTRAINT fk_attendance_schedule 
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) 
  ON DELETE SET NULL;

-- ============================================
-- STEP 8: Fix Leave Requests Table
-- ============================================
ALTER TABLE leave_requests DROP FOREIGN KEY IF EXISTS leave_requests_ibfk_1;
ALTER TABLE leave_requests DROP FOREIGN KEY IF EXISTS leave_requests_ibfk_2;

ALTER TABLE leave_requests 
  ADD CONSTRAINT fk_leave_requests_user 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE;

ALTER TABLE leave_requests 
  ADD CONSTRAINT fk_leave_requests_responded_by 
  FOREIGN KEY (responded_by) REFERENCES users(id) 
  ON DELETE SET NULL;

-- ============================================
-- STEP 9: Fix CV Files Table
-- ============================================
ALTER TABLE cv_files DROP FOREIGN KEY IF EXISTS cv_files_ibfk_1;

ALTER TABLE cv_files 
  ADD CONSTRAINT fk_cv_files_user 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the changes

-- Check tables
SELECT 'Tables after cleanup:' as message;
SHOW TABLES;

-- Check users structure
SELECT 'Users table structure:' as message;
DESCRIBE users;

-- Check foreign keys
SELECT 'Foreign keys verification:' as message;
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'university_staff_tracker'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;

-- Check for any orphaned records
SELECT 'Checking for orphaned records:' as message;

SELECT 'Users with invalid department_id:' as check_type, COUNT(*) as count
FROM users 
WHERE department_id IS NOT NULL 
  AND department_id NOT IN (SELECT id FROM departments)
UNION ALL
SELECT 'Users with invalid class_id:', COUNT(*)
FROM users 
WHERE class_id IS NOT NULL 
  AND class_id NOT IN (SELECT id FROM classes)
UNION ALL
SELECT 'Schedules with invalid class_id:', COUNT(*)
FROM schedules 
WHERE class_id NOT IN (SELECT id FROM classes)
UNION ALL
SELECT 'Schedules with invalid subject_id:', COUNT(*)
FROM schedules 
WHERE subject_id NOT IN (SELECT id FROM subjects)
UNION ALL
SELECT 'Schedules with invalid teacher_id:', COUNT(*)
FROM schedules 
WHERE teacher_id NOT IN (SELECT id FROM users);

SELECT 'Database cleanup complete!' as message;
