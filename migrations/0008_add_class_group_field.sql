-- Migration: Add group field to classes table for better class organization
-- Date: 2025-12-15
-- Purpose: Support class groups (M1, M2, A1, A2, etc.) and improve schedule bulk creation

-- Add group column to classes table
ALTER TABLE classes 
ADD COLUMN `group` VARCHAR(10) DEFAULT NULL
COMMENT 'Class group identifier (M1, M2, A1, A2, etc.)';

-- Add unique constraint to prevent duplicate class configurations
ALTER TABLE classes
ADD UNIQUE KEY `unique_class_config` (`major_id`, `year`, `semester`, `group`, `academic_year`);

-- Add index for better query performance on schedules
CREATE INDEX idx_schedules_class_day ON schedules(class_id, day);
CREATE INDEX idx_schedules_teacher_time ON schedules(teacher_id, day, start_time, end_time);
