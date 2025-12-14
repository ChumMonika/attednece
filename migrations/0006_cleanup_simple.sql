-- Database Schema Cleanup
-- This script will continue even if constraints don't exist

USE university_staff_tracker;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop backup tables
DROP TABLE IF EXISTS classes_backup;
DROP TABLE IF EXISTS departments_backup;
DROP TABLE IF EXISTS majors_backup;
DROP TABLE IF EXISTS schedules_backup;
DROP TABLE IF EXISTS users_backup;

-- Users table foreign keys (ignore errors if they don't exist)
ALTER TABLE users DROP FOREIGN KEY fk_user_class;
ALTER TABLE users DROP FOREIGN KEY users_department_id_departments_id_fk;
ALTER TABLE users ADD CONSTRAINT fk_users_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- Attendance foreign keys
ALTER TABLE attendance DROP FOREIGN KEY attendance_ibfk_1;
ALTER TABLE attendance DROP FOREIGN KEY attendance_user_id_users_id_fk;
ALTER TABLE attendance DROP FOREIGN KEY attendance_marked_by_users_id_fk;
ALTER TABLE attendance DROP FOREIGN KEY attendance_schedule_id_schedules_id_fk;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_marked_by FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL;

-- Schedules foreign keys
ALTER TABLE schedules DROP FOREIGN KEY schedules_ibfk_1;
ALTER TABLE schedules DROP FOREIGN KEY fk_schedule_class;
ALTER TABLE schedules DROP FOREIGN KEY fk_schedule_subject;
ALTER TABLE schedules DROP FOREIGN KEY schedules_teacher_id_users_id_fk;
ALTER TABLE schedules ADD CONSTRAINT fk_schedules_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE schedules ADD CONSTRAINT fk_schedules_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE schedules ADD CONSTRAINT fk_schedules_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- Class Moderators foreign keys
ALTER TABLE class_moderators DROP FOREIGN KEY class_moderators_ibfk_1;
ALTER TABLE class_moderators DROP FOREIGN KEY class_moderators_ibfk_2;
ALTER TABLE class_moderators DROP FOREIGN KEY class_moderators_ibfk_3;
ALTER TABLE class_moderators ADD CONSTRAINT fk_class_moderators_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE class_moderators ADD CONSTRAINT fk_class_moderators_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE class_moderators ADD CONSTRAINT fk_class_moderators_semester FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE;

-- Class Subjects foreign keys
ALTER TABLE class_subjects DROP FOREIGN KEY class_subjects_ibfk_1;
ALTER TABLE class_subjects DROP FOREIGN KEY class_subjects_ibfk_2;
ALTER TABLE class_subjects DROP FOREIGN KEY class_subjects_ibfk_3;
ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subjects_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subjects_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subjects_semester FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE;

-- Leave Requests foreign keys
ALTER TABLE leave_requests DROP FOREIGN KEY leave_requests_ibfk_1;
ALTER TABLE leave_requests DROP FOREIGN KEY leave_requests_user_id_users_id_fk;
ALTER TABLE leave_requests DROP FOREIGN KEY leave_requests_responded_by_users_id_fk;
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_responded_by FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL;

-- CV Files foreign keys
ALTER TABLE cv_files DROP FOREIGN KEY cv_files_ibfk_1;
ALTER TABLE cv_files DROP FOREIGN KEY cv_files_user_id_users_id_fk;
ALTER TABLE cv_files ADD CONSTRAINT fk_cv_files_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add unique index on subjects.code
ALTER TABLE subjects DROP INDEX idx_subject_code;
ALTER TABLE subjects ADD UNIQUE INDEX idx_subject_code (code);

SET FOREIGN_KEY_CHECKS = 1;

-- Verification
SELECT 'Schema cleanup completed!' as status;
SHOW TABLES;
