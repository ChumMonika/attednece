-- Migration: Populate Departments and Majors
-- Created: 2025-12-14
-- Description: Insert all departments and their associated majors (skip if exists)

-- Insert Departments (only if they don't exist)
INSERT IGNORE INTO departments (name, short_name, created_at, updated_at) VALUES
('Supply Chain & Automation Engineering', 'SCAE', NOW(), NOW()),
('Bio Engineering', 'BIOE', NOW(), NOW()),
('Environmental Engineering', 'ENVE', NOW(), NOW()),
('Information Technology Engineering', 'ITE', NOW(), NOW()),
('Telecommunication & Electronics Engineering', 'TEE', NOW(), NOW());

-- Insert Majors for Supply Chain & Automation Engineering (SCAE)
INSERT IGNORE INTO majors (name, short_name, department_id, created_at, updated_at)
SELECT 'Bachelor Supply Chain & Automation Engineering', 'BSCAE', d.id, NOW(), NOW()
FROM departments d WHERE d.short_name = 'SCAE';

-- Insert Majors for Bio Engineering (BIOE)
INSERT IGNORE INTO majors (name, short_name, department_id, created_at, updated_at)
SELECT 'Bachelor Bio Engineering', 'BBE', d.id, NOW(), NOW()
FROM departments d WHERE d.short_name = 'BIOE';

INSERT IGNORE INTO majors (name, short_name, department_id, created_at, updated_at)
SELECT 'Bachelor Food Technology And Engineering', 'BFTE', d.id, NOW(), NOW()
FROM departments d WHERE d.short_name = 'BIOE';

-- Insert Majors for Environmental Engineering (ENVE)
INSERT IGNORE INTO majors (name, short_name, department_id, created_at, updated_at)
SELECT 'Bachelor Environmental Engineering', 'BEE', d.id, NOW(), NOW()
FROM departments d WHERE d.short_name = 'ENVE';

-- Insert Majors for Information Technology Engineering (ITE)
INSERT IGNORE INTO majors (name, short_name, department_id, created_at, updated_at)
SELECT 'Bachelor Information Technology Engineering', 'BITE', d.id, NOW(), NOW()
FROM departments d WHERE d.short_name = 'ITE';

INSERT IGNORE INTO majors (name, short_name, department_id, created_at, updated_at)
SELECT 'Bachelor Data Science And Engineering', 'BDSE', d.id, NOW(), NOW()
FROM departments d WHERE d.short_name = 'ITE';

-- Insert Majors for Telecommunication & Electronics Engineering (TEE)
INSERT IGNORE INTO majors (name, short_name, department_id, created_at, updated_at)
SELECT 'Bachelor Telecommunication & Electronics Engineering', 'BTEE', d.id, NOW(), NOW()
FROM departments d WHERE d.short_name = 'TEE';

-- Show departments with their majors
SELECT 
    d.short_name as dept_code,
    d.name as department,
    COUNT(m.id) as major_count
FROM departments d
LEFT JOIN majors m ON m.department_id = d.id
GROUP BY d.id, d.short_name, d.name
ORDER BY d.id;

SELECT 
    d.short_name as dept,
    m.short_name as major_code,
    m.name as major_name
FROM departments d
INNER JOIN majors m ON m.department_id = d.id
ORDER BY d.id, m.id;

