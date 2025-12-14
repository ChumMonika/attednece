-- Simple Database Cleanup Script
-- Compatible with all MySQL versions

USE university_staff_tracker;

SET FOREIGN_KEY_CHECKS = 0;

-- Drop backup tables
DROP TABLE IF EXISTS classes_backup;
DROP TABLE IF EXISTS departments_backup;
DROP TABLE IF EXISTS majors_backup;
DROP TABLE IF EXISTS schedules_backup;
DROP TABLE IF EXISTS users_backup;

-- Users table - already cleaned (department and subject columns removed)

-- Fix all foreign key constraints
-- Users table
ALTER TABLE users DROP FOREIGN KEY IF EXISTS users_ibfk_1;
ALTER TABLE users DROP FOREIGN KEY IF EXISTS fk_users_department;
ALTER TABLE users ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE users DROP FOREIGN KEY IF EXISTS users_ibfk_2;
ALTER TABLE users DROP FOREIGN KEY IF EXISTS fk_users_class;
ALTER TABLE users ADD CONSTRAINT fk_users_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

-- Schedules table
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS schedules_ibfk_1;
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS fk_schedules_class;
ALTER TABLE schedules ADD CONSTRAINT fk_schedules_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS schedules_ibfk_2;
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS fk_schedules_subject;
ALTER TABLE schedules ADD CONSTRAINT fk_schedules_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS schedules_ibfk_3;
ALTER TABLE schedules DROP FOREIGN KEY IF EXISTS fk_schedules_teacher;
ALTER TABLE schedules ADD CONSTRAINT fk_schedules_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- Class Moderators
ALTER TABLE class_moderators DROP FOREIGN KEY IF EXISTS class_moderators_ibfk_1;
ALTER TABLE class_moderators DROP FOREIGN KEY IF EXISTS fk_class_moderators_class;
ALTER TABLE class_moderators ADD CONSTRAINT fk_class_moderators_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

ALTER TABLE class_moderators DROP FOREIGN KEY IF EXISTS class_moderators_ibfk_2;
ALTER TABLE class_moderators DROP FOREIGN KEY IF EXISTS fk_class_moderators_user;
ALTER TABLE class_moderators ADD CONSTRAINT fk_class_moderators_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Class Subjects
ALTER TABLE class_subjects DROP FOREIGN KEY IF EXISTS class_subjects_ibfk_1;
ALTER TABLE class_subjects DROP FOREIGN KEY IF EXISTS fk_class_subjects_class;
ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subjects_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

ALTER TABLE class_subjects DROP FOREIGN KEY IF EXISTS class_subjects_ibfk_2;
ALTER TABLE class_subjects DROP FOREIGN KEY IF EXISTS fk_class_subjects_subject;
ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subjects_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

-- Attendance
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_ibfk_1;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS fk_attendance_user;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_ibfk_2;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS fk_attendance_marked_by;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_marked_by FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_ibfk_3;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS fk_attendance_schedule;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL;

-- Leave Requests
ALTER TABLE leave_requests DROP FOREIGN KEY IF EXISTS leave_requests_ibfk_1;
ALTER TABLE leave_requests DROP FOREIGN KEY IF EXISTS fk_leave_requests_user;
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE leave_requests DROP FOREIGN KEY IF EXISTS leave_requests_ibfk_2;
ALTER TABLE leave_requests DROP FOREIGN KEY IF EXISTS fk_leave_requests_responded_by;
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_responded_by FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL;

-- CV Files
ALTER TABLE cv_files DROP FOREIGN KEY IF EXISTS cv_files_ibfk_1;
ALTER TABLE cv_files DROP FOREIGN KEY IF EXISTS fk_cv_files_user;
ALTER TABLE cv_files ADD CONSTRAINT fk_cv_files_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add unique constraint to subjects.code
ALTER TABLE subjects DROP INDEX IF EXISTS idx_subject_code;
ALTER TABLE subjects ADD UNIQUE INDEX idx_subject_code (code);

SET FOREIGN_KEY_CHECKS = 1;

-- Verification
SELECT 'Cleanup Complete!' as status;
SHOW TABLES;
