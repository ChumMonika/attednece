-- University Attendance System - Database Initialization Script
-- Run this in MySQL to set up the database schema

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS university_staff_tracker;
USE university_staff_tracker;

-- Drop existing tables (be careful - this deletes all data!)
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS class_subjects;
DROP TABLE IF EXISTS class_moderators;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS semesters;
DROP TABLE IF EXISTS majors;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;

-- Create departments table
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    short_name VARCHAR(50) UNIQUE NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

-- Create majors table
CREATE TABLE majors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    department_id INT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    INDEX major_dept_idx (department_id)
);

-- Create classes table
CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    major_id INT NOT NULL,
    year INT NOT NULL,
    semester INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    `group` VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE CASCADE,
    INDEX class_major_idx (major_id)
);

-- Create subjects table
CREATE TABLE subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    credits INT DEFAULT 3,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

-- Create semesters table
CREATE TABLE semesters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

-- Create users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unique_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    role ENUM('head', 'admin', 'hr_assistant', 'hr_backup', 'class_moderator', 'moderator', 'teacher', 'staff') NOT NULL,
    department_id INT,
    class_id INT,
    work_type VARCHAR(100),
    schedule VARCHAR(50),
    status ENUM('active', 'inactive', 'banned', 'pending', 'suspended') DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    INDEX unique_id_idx (unique_id),
    INDEX user_dept_idx (department_id)
);

-- Create class_moderators table
CREATE TABLE class_moderators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    user_id INT NOT NULL,
    semester_id INT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    INDEX mod_class_idx (class_id),
    INDEX mod_user_idx (user_id),
    INDEX mod_semester_idx (semester_id)
);

-- Create class_subjects table
CREATE TABLE class_subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    subject_id INT NOT NULL,
    semester_id INT NOT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    INDEX class_subject_idx (class_id, subject_id),
    INDEX cs_semester_idx (semester_id)
);

-- Create schedules table
CREATE TABLE schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    subject_id INT NOT NULL,
    teacher_id INT NOT NULL,
    day VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX sched_teacher_idx (teacher_id)
);

-- Create attendance table
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('present', 'absent', 'leave') NOT NULL,
    is_late BOOLEAN DEFAULT FALSE,
    marked_at DATETIME,
    marked_by INT,
    schedule_id INT,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL,
    INDEX user_id_date_idx (user_id, date),
    INDEX attendance_date_idx (date)
);

-- Create leave_requests table
CREATE TABLE leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    leave_type VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT,
    submitted_at DATETIME NOT NULL,
    responded_at DATETIME,
    responded_by INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX user_id_status_idx (user_id, status)
);

-- Insert sample departments
INSERT INTO departments VALUES
(1, 'Information Technology Engineering', 'ITE', NOW(), NOW()),
(2, 'Data Science & Engineering', 'DSE', NOW(), NOW()),
(3, 'Biology & Environmental Science', 'BIO', NOW(), NOW());

-- Insert sample majors
INSERT INTO majors VALUES
(2, 'Bachelor Supply Chain & Automation', 'BDSC', 1, NOW(), NOW()),
(7, 'Bachelor Data Science & Engineering', 'BDSE', 2, NOW(), NOW());

-- Insert sample subjects
INSERT INTO subjects VALUES
(1, 'Mathematics I', 'M306', 3, NOW(), NOW()),
(2, 'Physics I', 'P101', 3, NOW(), NOW()),
(3, 'Chemistry I', 'C101', 3, NOW(), NOW());

-- Insert sample admin user (Password: Admin@123)
INSERT INTO users VALUES
(1, 'ADMIN001', 'Admin User', 'admin@example.com', '$2b$10$1WF01587r4C4O4Dul9h7POcuC7ISZH77hJLYFkoDGz.VHcW/fsW1.', 'admin', NULL, NULL, NULL, NULL, 'active', NOW(), NOW());

echo "Database schema created successfully!";
