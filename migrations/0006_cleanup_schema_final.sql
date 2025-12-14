-- Database Schema Cleanup - MySQL Compatible Version
USE university_staff_tracker;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================
-- DROP BACKUP TABLES
-- =============================================
DROP TABLE IF EXISTS classes_backup;
DROP TABLE IF EXISTS departments_backup;
DROP TABLE IF EXISTS majors_backup;
DROP TABLE IF EXISTS schedules_backup;
DROP TABLE IF EXISTS users_backup;

SELECT '✓ Dropped all backup tables' as progress;

-- =============================================
-- CLEAN UP FOREIGN KEYS AND RECREATE PROPERLY
-- =============================================

-- USERS TABLE
ALTER TABLE users DROP FOREIGN KEY IF EXISTS fk_user_class;
ALTER TABLE users ADD CONSTRAINT fk_users_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE users DROP FOREIGN KEY IF EXISTS users_department_id_departments_id_fk;
ALTER TABLE users ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

SELECT '✓ Fixed users table foreign keys' as progress;

-- ATTENDANCE TABLE
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_ibfk_1;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_user_id_users_id_fk;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_marked_by_users_id_fk;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_schedule_id_schedules_id_fk;

ALTER TABLE attendance ADD CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_marked_by FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL;

SELECT '✓ Fixed attendance table foreign keys' as progress;

-- SCHEDULES TABLE
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS schedules_ibfk_1;
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS fk_schedule_class;
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS fk_schedule_subject;
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS schedules_teacher_id_users_id_fk;

ALTER TABLE schedules ADD CONSTRAINT fk_schedules_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE schedules ADD CONSTRAINT fk_schedules_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE schedules ADD CONSTRAINT fk_schedules_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

SELECT '✓ Fixed schedules table foreign keys' as progress;

-- CLASS_MODERATORS TABLE
ALTER TABLE class_moderators DROP FOREIGN KEY IF EXISTS class_moderators_ibfk_1;
ALTER TABLE class_moderators DROP FOREIGN KEY IF EXISTS class_moderators_ibfk_2;
ALTER TABLE class_moderators DROP FOREIGN KEY IF EXISTS class_moderators_ibfk_3;

ALTER TABLE class_moderators ADD CONSTRAINT fk_class_moderators_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE class_moderators ADD CONSTRAINT fk_class_moderators_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE class_moderators ADD CONSTRAINT fk_class_moderators_semester FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE;

SELECT '✓ Fixed class_moderators table foreign keys' as progress;

-- CLASS_SUBJECTS TABLE
ALTER TABLE class_subjects DROP FOREIGN KEY IF EXISTS class_subjects_ibfk_1;
ALTER TABLE class_subjects DROP FOREIGN KEY IF EXISTS class_subjects_ibfk_2;
ALTER TABLE class_subjects DROP FOREIGN KEY IF EXISTS class_subjects_ibfk_3;

ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subjects_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subjects_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subjects_semester FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE;

SELECT '✓ Fixed class_subjects table foreign keys' as progress;

-- LEAVE_REQUESTS TABLE
ALTER TABLE leave_requests DROP FOREIGN KEY IF EXISTS leave_requests_ibfk_1;
ALTER TABLE leave_requests DROP FOREIGN KEY IF EXISTS leave_requests_user_id_users_id_fk;
ALTER TABLE leave_requests DROP FOREIGN KEY IF EXISTS leave_requests_responded_by_users_id_fk;

ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_responded_by FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL;

SELECT '✓ Fixed leave_requests table foreign keys' as progress;

-- CV_FILES TABLE
ALTER TABLE cv_files DROP FOREIGN KEY IF EXISTS cv_files_ibfk_1;
ALTER TABLE cv_files DROP FOREIGN KEY IF EXISTS cv_files_user_id_users_id_fk;

ALTER TABLE cv_files ADD CONSTRAINT fk_cv_files_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

SELECT '✓ Fixed cv_files table foreign keys' as progress;

-- =============================================
-- ADD INDEXES FOR PERFORMANCE
-- =============================================

-- Subjects: unique code
ALTER TABLE subjects DROP INDEX IF EXISTS idx_subject_code;
ALTER TABLE subjects ADD UNIQUE INDEX idx_subject_code (code);

SELECT '✓ Added unique index on subjects.code' as progress;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- VERIFICATION
-- =============================================
SELECT '===========================================' as divider;
SELECT 'CLEANUP COMPLETED SUCCESSFULLY!' as result;
SELECT '===========================================' as divider;

-- Show remaining tables
SELECT 'Current Tables:' as section;
SHOW TABLES;

-- Show table structure
SELECT '' as blank;
SELECT 'Users Table Structure:' as section;
DESCRIBE users;

-- Show foreign keys
SELECT '' as blank;
SELECT 'Foreign Key Constraints:' as section;
SELECT 
  TABLE_NAME,
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'university_staff_tracker'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;
