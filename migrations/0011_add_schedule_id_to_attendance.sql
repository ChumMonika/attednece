-- Migration 0011: Add schedule_id column to attendance table
-- This links attendance records to schedules for class-based tracking

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'university_staff_tracker' 
  AND TABLE_NAME = 'attendance' 
  AND COLUMN_NAME = 'schedule_id');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE attendance ADD COLUMN `schedule_id` INT AFTER `is_late`',
  'SELECT "Column schedule_id already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint if it doesn't exist
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = 'university_staff_tracker' 
  AND TABLE_NAME = 'attendance' 
  AND COLUMN_NAME = 'schedule_id'
  AND CONSTRAINT_NAME != 'PRIMARY');

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE attendance ADD CONSTRAINT `attendance_schedule_fk` FOREIGN KEY (`schedule_id`) REFERENCES schedules(`id`) ON DELETE SET NULL',
  'SELECT "Foreign key constraint already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on schedule_id for performance
SET @index_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = 'university_staff_tracker' 
  AND TABLE_NAME = 'attendance' 
  AND INDEX_NAME = 'attendance_schedule_id_idx');

SET @sql = IF(@index_exists = 0,
  'CREATE INDEX `attendance_schedule_id_idx` ON attendance(`schedule_id`)',
  'SELECT "Index attendance_schedule_id_idx already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
