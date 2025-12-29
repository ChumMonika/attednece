-- Migration 0012: Add notes column to attendance table
-- This allows adding notes to attendance records

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'university_staff_tracker' 
  AND TABLE_NAME = 'attendance' 
  AND COLUMN_NAME = 'notes');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE attendance ADD COLUMN `notes` TEXT AFTER `schedule_id`',
  'SELECT "Column notes already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
