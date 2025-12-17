-- Update existing classes to uppercase groups and regenerate names
UPDATE classes SET `group` = UPPER(`group`);

UPDATE classes c
JOIN majors m ON c.major_id = m.id
SET c.name = CONCAT(m.short_name, ' Y', c.year, 'S', c.semester, ' ', c.`group`);
