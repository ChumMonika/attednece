-- Migration 0010: Add is_late column to attendance table
-- This column tracks whether a staff/teacher marked attendance was late

-- Check if column exists, if not add it
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'university_staff_tracker' 
  AND TABLE_NAME = 'attendance' 
  AND COLUMN_NAME = 'is_late');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE attendance ADD COLUMN `is_late` TINYINT(1) NOT NULL DEFAULT 0 AFTER `status`',
  'SELECT "Column is_late already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on is_late for performance (skip if exists)
SET @index_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = 'university_staff_tracker' 
  AND TABLE_NAME = 'attendance' 
  AND INDEX_NAME = 'attendance_is_late_idx');

SET @sql = IF(@index_exists = 0,
  'CREATE INDEX `attendance_is_late_idx` ON attendance(`is_late`)',
  'SELECT "Index attendance_is_late_idx already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
