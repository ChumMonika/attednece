-- University Attendance System - Complete Database Setup
-- This script creates the database schema AND adds sample data
-- SAFE: Run this once during initial setup

CREATE DATABASE IF NOT EXISTS university_staff_tracker;
USE university_staff_tracker;

-- Drop existing tables (clears old data)
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

-- ===== CREATE TABLES =====

-- Departments table
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    short_name VARCHAR(50) UNIQUE NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

-- Majors table
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

-- Classes table
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

-- Subjects table
CREATE TABLE subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    credits INT DEFAULT 3,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

-- Semesters table
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

-- Users table
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

-- Attendance table
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused') NOT NULL,
    notes TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX attendance_user_idx (user_id),
    INDEX attendance_date_idx (date),
    UNIQUE KEY unique_attendance (user_id, date)
);

-- Schedules table
CREATE TABLE schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    subject_id INT NOT NULL,
    room VARCHAR(50),
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
    start_time TIME,
    end_time TIME,
    academic_year VARCHAR(20),
    semester INT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Class Moderators table
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

-- Class Subjects table
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

-- Leave Requests table
CREATE TABLE leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    reviewer_id INT,
    reviewed_at DATETIME,
    comments TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX leave_user_idx (user_id),
    INDEX leave_status_idx (status)
);

-- ===== INSERT SAMPLE DATA =====

-- Insert departments
INSERT INTO departments (name, short_name, created_at, updated_at) VALUES 
('Information Technology & Engineering', 'ITE', NOW(), NOW()),
('Data Science & Engineering', 'DSE', NOW(), NOW()),
('Biology & Biotechnology', 'BIOTECH', NOW(), NOW()),
('Business & Management', 'BIZ', NOW(), NOW()),
('Arts & Humanities', 'ARTS', NOW(), NOW()),
('Medicine & Health Sciences', 'MED', NOW(), NOW()),
('Law & Social Sciences', 'LAW', NOW(), NOW());

-- Insert majors
INSERT INTO majors (name, short_name, department_id, created_at, updated_at) VALUES 
('Computer Science', 'CS', 1, NOW(), NOW()),
('Software Engineering', 'SE', 1, NOW(), NOW()),
('Data Science', 'DS', 2, NOW(), NOW()),
('Data Engineering', 'DE', 2, NOW(), NOW()),
('Biotechnology', 'BIO', 3, NOW(), NOW()),
('Microbiology', 'MICRO', 3, NOW(), NOW()),
('Business Administration', 'MBA', 4, NOW(), NOW()),
('Finance', 'FIN', 4, NOW(), NOW());

-- Insert semesters
INSERT INTO semesters (name, code, start_date, end_date, is_active, created_at, updated_at) VALUES 
('Fall 2025', 'FALL_2025', '2025-08-01', '2025-12-15', 1, NOW(), NOW()),
('Spring 2026', 'SPRING_2026', '2026-01-01', '2026-05-15', 0, NOW(), NOW()),
('Summer 2026', 'SUMMER_2026', '2026-06-01', '2026-08-15', 0, NOW(), NOW());

-- Insert classes
INSERT INTO classes (name, major_id, year, semester, academic_year, `group`, is_active, created_at, updated_at) VALUES 
('BDSE Y1S1 M1', 3, 1, 1, '2025-2026', 'M1', 1, NOW(), NOW()),
('BDSE Y1S1 M2', 3, 1, 1, '2025-2026', 'M2', 1, NOW(), NOW()),
('BDSE Y2S1 M1', 3, 2, 1, '2025-2026', 'M1', 1, NOW(), NOW()),
('BCS Y1S1 M1', 1, 1, 1, '2025-2026', 'M1', 1, NOW(), NOW());

-- Insert subjects
INSERT INTO subjects (name, code, credits, created_at, updated_at) VALUES 
('Database Systems', 'CS101', 3, NOW(), NOW()),
('Web Development', 'CS102', 3, NOW(), NOW()),
('Data Structures', 'CS103', 4, NOW(), NOW()),
('Algorithms', 'CS104', 4, NOW(), NOW()),
('Machine Learning', 'CS105', 3, NOW(), NOW()),
('Python Programming', 'CS106', 3, NOW(), NOW()),
('Network Security', 'CS107', 3, NOW(), NOW()),
('Cloud Computing', 'CS108', 3, NOW(), NOW());

-- Insert users (Sample Admin, Heads, Teachers)
INSERT INTO users (unique_id, name, email, password, role, department_id, status, created_at, updated_at) VALUES 
('ADMIN001', 'System Administrator', 'admin@university.edu', 'admin123', 'admin', 1, 'active', NOW(), NOW()),
('HEAD001', 'Dr. John Doe', 'john.doe@university.edu', 'head123', 'head', 1, 'active', NOW(), NOW()),
('HEAD002', 'Dr. Jane Smith', 'jane.smith@university.edu', 'head123', 'head', 2, 'active', NOW(), NOW()),
('TEACHER001', 'Prof. Alice Johnson', 'alice@university.edu', 'teacher123', 'teacher', 1, 'active', NOW(), NOW()),
('TEACHER002', 'Prof. Bob Williams', 'bob@university.edu', 'teacher123', 'teacher', 2, 'active', NOW(), NOW()),
('MODERATOR001', 'Sarah Brown', 'sarah@university.edu', 'moderator123', 'class_moderator', 2, 'active', NOW(), NOW()),
('MODERATOR002', 'Michael Davis', 'michael@university.edu', 'moderator123', 'class_moderator', 2, 'active', NOW(), NOW()),
('HR001', 'HR Assistant', 'hr@university.edu', 'hr123', 'hr_assistant', 1, 'active', NOW(), NOW()),
('STAFF001', 'Office Staff', 'staff@university.edu', 'staff123', 'staff', 1, 'active', NOW(), NOW());

-- ===== SETUP COMPLETE =====
SELECT 'Database setup completed successfully!' as status;
SELECT 'Admin Login: ADMIN001 / admin123' as credentials;
SELECT 'Head Login: HEAD001 / head123' as credentials;
SELECT 'Teacher Login: TEACHER001 / teacher123' as credentials;
