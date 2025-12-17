-- Initialize sample data for University Attendance System

USE university_staff_tracker;

-- Insert sample departments
INSERT INTO departments (name, short_name, created_at, updated_at) VALUES 
('Information Technology & Engineering', 'ITE', NOW(), NOW()),
('Data Science & Engineering', 'DSE', NOW(), NOW()),
('Biology & Biotechnology', 'BIOTECH', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Insert sample majors
INSERT INTO majors (name, short_name, department_id, created_at, updated_at) VALUES 
('Computer Science', 'CS', 1, NOW(), NOW()),
('Data Science', 'DS', 2, NOW(), NOW()),
('Biotechnology', 'BIO', 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Insert sample classes
INSERT INTO classes (name, major_id, year, semester, academic_year, `group`, is_active, created_at, updated_at) VALUES 
('BDSE Y1S1 M1', 2, 1, 1, '2025-2026', 'M1', 1, NOW(), NOW()),
('BDSE Y2S1 M1', 2, 2, 1, '2025-2026', 'M1', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Insert subjects
INSERT INTO subjects (name, code, credits, created_at, updated_at) VALUES 
('Database Systems', 'CS101', 3, NOW(), NOW()),
('Web Development', 'CS102', 3, NOW(), NOW()),
('Data Structures', 'CS103', 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Insert sample users (with password: admin123)
INSERT INTO users (unique_id, name, email, password, role, department_id, status, created_at, updated_at) VALUES 
('ADMIN001', 'Admin User', 'admin@university.edu', 'admin123', 'admin', 1, 'active', NOW(), NOW()),
('HEAD001', 'Department Head', 'head@university.edu', 'head123', 'head', 1, 'active', NOW(), NOW()),
('TEACHER001', 'Teacher One', 'teacher1@university.edu', 'teacher123', 'teacher', 2, 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Display success message
SELECT 'Database initialized with sample data!' as Message;
