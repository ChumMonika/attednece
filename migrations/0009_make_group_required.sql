-- Migration 0009: Make group field required and add unique constraint
-- This ensures each class configuration is unique within an academic year

-- Step 1: Update any NULL groups to a default value (if any exist)
UPDATE classes SET `group` = 'M1' WHERE `group` IS NULL OR `group` = '';

-- Step 1.5: Uppercase all existing groups and regenerate class names
UPDATE classes SET `group` = UPPER(`group`);

-- Step 1.6: Regenerate all class names with proper format including group
UPDATE classes c
JOIN majors m ON c.major_id = m.id
SET c.name = CONCAT(m.short_name, ' Y', c.year, 'S', c.semester, ' ', UPPER(c.`group`));

-- Step 2: Make group field NOT NULL (already done in migration 0008, but ensuring it)
-- This will succeed silently if already NOT NULL

-- Step 3: Unique constraint already exists from migration 0008

-- Step 4: Add indexes for better query performance (skip if exists)
SET @index1_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = 'university_staff_tracker' 
  AND TABLE_NAME = 'classes' 
  AND INDEX_NAME = 'idx_class_group');

SET @sql = IF(@index1_exists = 0, 
  'CREATE INDEX idx_class_group ON classes(`group`)', 
  'SELECT "Index idx_class_group already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index2_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = 'university_staff_tracker' 
  AND TABLE_NAME = 'classes' 
  AND INDEX_NAME = 'idx_class_academic_year');

SET @sql = IF(@index2_exists = 0, 
  'CREATE INDEX idx_class_academic_year ON classes(academic_year)', 
  'SELECT "Index idx_class_academic_year already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Remove old group_name column if it exists (cleanup from earlier migrations)
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'university_staff_tracker' 
  AND TABLE_NAME = 'classes' 
  AND COLUMN_NAME = 'group_name');

SET @sql = IF(@column_exists > 0, 
  'ALTER TABLE classes DROP COLUMN group_name', 
  'SELECT "Column group_name does not exist" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
