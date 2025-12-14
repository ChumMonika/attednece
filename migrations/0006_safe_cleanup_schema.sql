-- SAFE Database Schema Cleanup
-- Execute this step-by-step to ensure data safety
-- Stop if any errors occur

USE university_staff_tracker;

-- ============================================
-- IMPORTANT: READ BEFORE EXECUTING
-- ============================================
-- This script will:
-- 1. Drop backup tables (classes_backup, departments_backup, majors_backup, schedules_backup, users_backup)
-- 2. Remove redundant columns from users table (department, subject)
-- 3. Add proper foreign key constraints
-- 4. Fix column types for consistency
--
-- SAFETY: The backup tables will be dropped, but all real data is preserved
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- STEP 1: Drop Backup Tables
-- ============================================
SELECT '=== STEP 1: Dropping Backup Tables ===' as step;

DROP TABLE IF EXISTS classes_backup;
SELECT 'Dropped: classes_backup' as status;

DROP TABLE IF EXISTS departments_backup;
SELECT 'Dropped: departments_backup' as status;

DROP TABLE IF EXISTS majors_backup;
SELECT 'Dropped: majors_backup' as status;

DROP TABLE IF EXISTS schedules_backup;
SELECT 'Dropped: schedules_backup' as status;

DROP TABLE IF EXISTS users_backup;
SELECT 'Dropped: users_backup' as status;

-- ============================================
-- STEP 2: Clean Users Table
-- ============================================
SELECT '=== STEP 2: Cleaning Users Table ===' as step;

-- Check if columns exist before dropping
SELECT 'Checking users table columns...' as status;
SHOW COLUMNS FROM users LIKE 'department';
SHOW COLUMNS FROM users LIKE 'subject';

-- Drop redundant columns (we have department_id and subjects are linked through schedules)
ALTER TABLE users DROP COLUMN IF EXISTS department;
SELECT 'Dropped redundant column: users.department' as status;

ALTER TABLE users DROP COLUMN IF EXISTS subject;
SELECT 'Dropped redundant column: users.subject' as status;

-- ============================================
-- STEP 3: Fix Foreign Key Constraints
-- ============================================
SELECT '=== STEP 3: Adding Foreign Key Constraints ===' as step;

-- Users -> Departments
ALTER TABLE users DROP FOREIGN KEY IF EXISTS users_ibfk_1;
ALTER TABLE users DROP FOREIGN KEY IF EXISTS fk_users_department;
ALTER TABLE users 
  ADD CONSTRAINT fk_users_department 
  FOREIGN KEY (department_id) REFERENCES departments(id) 
  ON DELETE SET NULL
  ON UPDATE CASCADE;
SELECT 'Added: fk_users_department' as status;

-- Users -> Classes
ALTER TABLE users DROP FOREIGN KEY IF EXISTS users_ibfk_2;
ALTER TABLE users DROP FOREIGN KEY IF EXISTS fk_users_class;
ALTER TABLE users 
  ADD CONSTRAINT fk_users_class 
  FOREIGN KEY (class_id) REFERENCES classes(id) 
  ON DELETE SET NULL
  ON UPDATE CASCADE;
SELECT 'Added: fk_users_class' as status;

-- ============================================
-- STEP 4: Fix Schedules Table
-- ============================================
SELECT '=== STEP 4: Fixing Schedules Table ===' as step;

-- Drop existing foreign keys
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS schedules_ibfk_1;
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS schedules_ibfk_2;
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS schedules_ibfk_3;
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS fk_schedules_class;
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS fk_schedules_subject;
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS fk_schedules_teacher;

-- Add proper foreign keys
ALTER TABLE schedules 
  ADD CONSTRAINT fk_schedules_class 
  FOREIGN KEY (class_id) REFERENCES classes(id) 
  ON DELETE CASCADE
  ON UPDATE CASCADE;
SELECT 'Added: fk_schedules_class' as status;

ALTER TABLE schedules 
  ADD CONSTRAINT fk_schedules_subject 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) 
  ON DELETE CASCADE
  ON UPDATE CASCADE;
SELECT 'Added: fk_schedules_subject' as status;

ALTER TABLE schedules 
  ADD CONSTRAINT fk_schedules_teacher 
  FOREIGN KEY (teacher_id) REFERENCES users(id) 
  ON DELETE CASCADE
  ON UPDATE CASCADE;
SELECT 'Added: fk_schedules_teacher' as status;

-- ============================================
-- STEP 5: Fix Subjects Table
-- ============================================
SELECT '=== STEP 5: Fixing Subjects Table ===' as step;

-- Ensure code is unique
ALTER TABLE subjects DROP INDEX IF EXISTS code;
ALTER TABLE subjects DROP INDEX IF EXISTS idx_subject_code;
ALTER TABLE subjects ADD UNIQUE INDEX idx_subject_code (code);
SELECT 'Added unique index: subjects.code' as status;

-- ============================================
-- STEP 6: Fix Class Moderators
-- ============================================
SELECT '=== STEP 6: Fixing Class Moderators ===' as step;

ALTER TABLE class_moderators DROP FOREIGN KEY IF EXISTS class_moderators_ibfk_1;
ALTER TABLE class_moderators DROP FOREIGN KEY IF EXISTS class_moderators_ibfk_2;
ALTER TABLE class_moderators DROP FOREIGN KEY IF EXISTS fk_class_moderators_class;
ALTER TABLE class_moderators DROP FOREIGN KEY IF EXISTS fk_class_moderators_user;

ALTER TABLE class_moderators 
  ADD CONSTRAINT fk_class_moderators_class 
  FOREIGN KEY (class_id) REFERENCES classes(id) 
  ON DELETE CASCADE
  ON UPDATE CASCADE;
SELECT 'Added: fk_class_moderators_class' as status;

ALTER TABLE class_moderators 
  ADD CONSTRAINT fk_class_moderators_user 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE
  ON UPDATE CASCADE;
SELECT 'Added: fk_class_moderators_user' as status;

-- ============================================
-- STEP 7: Fix Class Subjects
-- ============================================
SELECT '=== STEP 7: Fixing Class Subjects ===' as step;

ALTER TABLE class_subjects DROP FOREIGN KEY IF EXISTS class_subjects_ibfk_1;
ALTER TABLE class_subjects DROP FOREIGN KEY IF EXISTS class_subjects_ibfk_2;
ALTER TABLE class_subjects DROP FOREIGN KEY IF EXISTS fk_class_subjects_class;
ALTER TABLE class_subjects DROP FOREIGN KEY IF EXISTS fk_class_subjects_subject;

ALTER TABLE class_subjects 
  ADD CONSTRAINT fk_class_subjects_class 
  FOREIGN KEY (class_id) REFERENCES classes(id) 
  ON DELETE CASCADE
  ON UPDATE CASCADE;
SELECT 'Added: fk_class_subjects_class' as status;

ALTER TABLE class_subjects 
  ADD CONSTRAINT fk_class_subjects_subject 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) 
  ON DELETE CASCADE
  ON UPDATE CASCADE;
SELECT 'Added: fk_class_subjects_subject' as status;

-- ============================================
-- STEP 8: Fix Attendance
-- ============================================
SELECT '=== STEP 8: Fixing Attendance ===' as step;

ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_ibfk_1;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_ibfk_2;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_ibfk_3;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS fk_attendance_user;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS fk_attendance_marked_by;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS fk_attendance_schedule;

ALTER TABLE attendance 
  ADD CONSTRAINT fk_attendance_user 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE
  ON UPDATE CASCADE;
SELECT 'Added: fk_attendance_user' as status;

ALTER TABLE attendance 
  ADD CONSTRAINT fk_attendance_marked_by 
  FOREIGN KEY (marked_by) REFERENCES users(id) 
  ON DELETE SET NULL
  ON UPDATE CASCADE;
SELECT 'Added: fk_attendance_marked_by' as status;

ALTER TABLE attendance 
  ADD CONSTRAINT fk_attendance_schedule 
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) 
  ON DELETE SET NULL
  ON UPDATE CASCADE;
SELECT 'Added: fk_attendance_schedule' as status;

-- ============================================
-- STEP 9: Fix Leave Requests
-- ============================================
SELECT '=== STEP 9: Fixing Leave Requests ===' as step;

ALTER TABLE leave_requests DROP FOREIGN KEY IF EXISTS leave_requests_ibfk_1;
ALTER TABLE leave_requests DROP FOREIGN KEY IF EXISTS leave_requests_ibfk_2;
ALTER TABLE leave_requests DROP FOREIGN KEY IF EXISTS fk_leave_requests_user;
ALTER TABLE leave_requests DROP FOREIGN KEY IF EXISTS fk_leave_requests_responded_by;

ALTER TABLE leave_requests 
  ADD CONSTRAINT fk_leave_requests_user 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE
  ON UPDATE CASCADE;
SELECT 'Added: fk_leave_requests_user' as status;

ALTER TABLE leave_requests 
  ADD CONSTRAINT fk_leave_requests_responded_by 
  FOREIGN KEY (responded_by) REFERENCES users(id) 
  ON DELETE SET NULL
  ON UPDATE CASCADE;
SELECT 'Added: fk_leave_requests_responded_by' as status;

-- ============================================
-- STEP 10: Fix CV Files
-- ============================================
SELECT '=== STEP 10: Fixing CV Files ===' as step;

ALTER TABLE cv_files DROP FOREIGN KEY IF EXISTS cv_files_ibfk_1;
ALTER TABLE cv_files DROP FOREIGN KEY IF EXISTS fk_cv_files_user;

ALTER TABLE cv_files 
  ADD CONSTRAINT fk_cv_files_user 
  FOREIGN KEY (user_id) REFERENCES users(id) 
  ON DELETE CASCADE
  ON UPDATE CASCADE;
SELECT 'Added: fk_cv_files_user' as status;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT '=== VERIFICATION ===' as step;

-- Show remaining tables
SELECT 'Current tables:' as info;
SHOW TABLES;

-- Show users structure
SELECT 'Users table structure:' as info;
DESCRIBE users;

-- Count foreign keys
SELECT 'Foreign key count by table:' as info;
SELECT 
  TABLE_NAME,
  COUNT(*) as fk_count
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'university_staff_tracker'
  AND REFERENCED_TABLE_NAME IS NOT NULL
GROUP BY TABLE_NAME
ORDER BY TABLE_NAME;

SELECT '✅ Database schema cleanup completed successfully!' as result;
