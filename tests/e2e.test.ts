/**
 * End-to-End Tests for University Staff Tracker System
 * Tests complete workflows across authentication, user management, and CRUD operations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

// Database connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Will be set from env
  database: 'university_staff_tracker',
};

let connection: mysql.Connection | null = null;

// Test data
const testUsers = {
  admin: {
    uniqueId: 'TEST_ADMIN_001',
    name: 'Test Admin User',
    email: 'test.admin@university.edu',
    password: 'TestAdmin123!',
    role: 'admin',
    departmentId: null,
    classId: null,
    workType: 'Full-Time',
    schedule: '08:00-17:00',
    status: 'active',
  },
  teacher: {
    uniqueId: 'TEST_TEACHER_001',
    name: 'Test Teacher User',
    email: 'test.teacher@university.edu',
    password: 'TestTeacher123!',
    role: 'teacher',
    departmentId: null,
    classId: null,
    workType: 'Full-Time',
    schedule: '08:00-17:00',
    status: 'active',
  },
  head: {
    uniqueId: 'TEST_HEAD_001',
    name: 'Test Head User',
    email: 'test.head@university.edu',
    password: 'TestHead123!',
    role: 'head',
    departmentId: null,
    classId: null,
    workType: 'Full-Time',
    schedule: '08:00-17:00',
    status: 'active',
  },
};

const testDepartment = {
  name: 'Test Department of Engineering',
  shortName: 'TENG',
};

const testMajor = {
  name: 'Bachelor Test Computer Science',
  shortName: 'BTCS',
  departmentId: null,
};

const testClass = {
  name: 'BTCS-2024-A',
  majorId: null,
  year: 2024,
  semester: 1,
};

const testSubject = {
  name: 'Introduction to Testing',
  code: 'TEST101',
  credits: 3,
};

const testSchedule = {
  classId: null,
  subjectId: null,
  teacherId: null,
  day: 'monday',
  startTime: '09:00',
  endTime: '10:30',
  room: 'Lab-101',
};

beforeAll(async () => {
  // Get password from environment or use default from .env
  const password = process.env.DB_PASSWORD || 'Nk1865!.';
  dbConfig.password = password;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database for E2E testing');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
});

afterAll(async () => {
  if (!connection) {
    return;
  }

  // Clean up test data
  try {
    await connection.execute('DELETE FROM schedules WHERE room = ?', ['Lab-101']);
    await connection.execute('DELETE FROM schedules WHERE room = ?', ['Lab-102']);
    await connection.execute('DELETE FROM subjects WHERE code = ?', ['TEST101']);
    await connection.execute('DELETE FROM classes WHERE name = ?', ['BTCS-2024-A']);
    await connection.execute('DELETE FROM majors WHERE short_name = ?', ['BTCS']);
    await connection.execute('DELETE FROM departments WHERE short_name = ?', ['TENG']);
    await connection.execute('DELETE FROM users WHERE unique_id LIKE ?', ['TEST_%']);
    console.log('Cleaned up test data');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  await connection.end();
});

describe('End-to-End System Tests', () => {
  // Shared test data IDs across all test suites
  let departmentId: number;
  let majorId: number;
  let classId: number;
  let subjectId: number;
  let adminId: number;
  let teacherId: number;
  let headId: number;
  let scheduleId: number;

  // Helper to skip tests if no DB connection
  const skipIfNoConnection = () => {
    if (!connection) {
      console.log('⚠️  Skipping test: Database connection not available. Set DB_PASSWORD environment variable.');
      return true;
    }
    return false;
  };

  // Create shared test data before all tests
  beforeAll(async () => {
    if (!connection) return;

    try {
      // 1. Create Department
      const [deptResult] = await connection.execute(
        'INSERT INTO departments (name, short_name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [testDepartment.name, testDepartment.shortName]
      ) as any;
      departmentId = deptResult.insertId;
      testMajor.departmentId = departmentId;
      testUsers.teacher.departmentId = departmentId;
      testUsers.head.departmentId = departmentId;

      // 2. Create Major
      const [majorResult] = await connection.execute(
        'INSERT INTO majors (name, short_name, department_id, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [testMajor.name, testMajor.shortName, testMajor.departmentId]
      ) as any;
      majorId = majorResult.insertId;
      testClass.majorId = majorId;

      // 3. Create Class
      const [classResult] = await connection.execute(
        'INSERT INTO classes (name, major_id, year, semester, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [testClass.name, testClass.majorId, testClass.year, testClass.semester]
      ) as any;
      classId = classResult.insertId;
      testSchedule.classId = classId;
      testUsers.teacher.classId = classId;

      // 4. Create Subject
      const [subjectResult] = await connection.execute(
        'INSERT INTO subjects (name, code, credits, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [testSubject.name, testSubject.code, testSubject.credits]
      ) as any;
      subjectId = subjectResult.insertId;
      testSchedule.subjectId = subjectId;

      // 5. Create Admin User
      const adminPassword = await bcrypt.hash(testUsers.admin.password, 10);
      const [adminResult] = await connection.execute(
        `INSERT INTO users (unique_id, name, email, password, role, work_type, schedule, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          testUsers.admin.uniqueId,
          testUsers.admin.name,
          testUsers.admin.email,
          adminPassword,
          testUsers.admin.role,
          testUsers.admin.workType,
          testUsers.admin.schedule,
          testUsers.admin.status,
        ]
      ) as any;
      adminId = adminResult.insertId;

      // 6. Create Teacher User
      const teacherPassword = await bcrypt.hash(testUsers.teacher.password, 10);
      const [teacherResult] = await connection.execute(
        `INSERT INTO users (unique_id, name, email, password, role, department_id, class_id, 
         work_type, schedule, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          testUsers.teacher.uniqueId,
          testUsers.teacher.name,
          testUsers.teacher.email,
          teacherPassword,
          testUsers.teacher.role,
          testUsers.teacher.departmentId,
          testUsers.teacher.classId,
          testUsers.teacher.workType,
          testUsers.teacher.schedule,
          testUsers.teacher.status,
        ]
      ) as any;
      teacherId = teacherResult.insertId;
      testSchedule.teacherId = teacherId;

      // 7. Create Head User
      const headPassword = await bcrypt.hash(testUsers.head.password, 10);
      const [headResult] = await connection.execute(
        `INSERT INTO users (unique_id, name, email, password, role, department_id, class_id, 
         work_type, schedule, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          testUsers.head.uniqueId,
          testUsers.head.name,
          testUsers.head.email,
          headPassword,
          testUsers.head.role,
          testUsers.head.departmentId,
          testUsers.head.classId,
          testUsers.head.workType,
          testUsers.head.schedule,
          testUsers.head.status,
        ]
      ) as any;
      headId = headResult.insertId;

      // 8. Create Schedule
      const [scheduleResult] = await connection.execute(
        `INSERT INTO schedules (class_id, subject_id, teacher_id, day, start_time, end_time, room, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          testSchedule.classId,
          testSchedule.subjectId,
          testSchedule.teacherId,
          testSchedule.day,
          testSchedule.startTime,
          testSchedule.endTime,
          testSchedule.room,
        ]
      ) as any;
      scheduleId = scheduleResult.insertId;

      console.log('✅ Created shared test data');
    } catch (error) {
      console.error('Error creating shared test data:', error);
    }
  });

  describe('1. Authentication System', () => {
    it('should hash passwords correctly during user creation', async () => {
      const hashedPassword = await bcrypt.hash(testUsers.admin.password, 10);
      expect(hashedPassword).not.toBe(testUsers.admin.password);
      expect(hashedPassword.length).toBeGreaterThan(50);
      
      const isValid = await bcrypt.compare(testUsers.admin.password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject invalid passwords', async () => {
      const hashedPassword = await bcrypt.hash(testUsers.admin.password, 10);
      const isValid = await bcrypt.compare('WrongPassword123!', hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should validate user roles', () => {
      const validRoles = ['admin', 'head', 'teacher', 'moderator', 'hr_assistant', 'staff'];
      expect(validRoles).toContain(testUsers.admin.role);
      expect(validRoles).toContain(testUsers.teacher.role);
      expect(validRoles).toContain(testUsers.head.role);
    });
  });

  describe('2. Department Management', () => {
    it('should have created the test department', async () => {
      if (skipIfNoConnection()) return;
      
      expect(departmentId).toBeGreaterThan(0);
      
      const [rows] = await connection!.execute(
        'SELECT * FROM departments WHERE id = ?',
        [departmentId]
      ) as any;

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe(testDepartment.name);
      expect(rows[0].short_name).toBe(testDepartment.shortName);
    });

    it('should retrieve department by ID', async () => {
      const [rows] = await connection.execute(
        'SELECT * FROM departments WHERE id = ?',
        [departmentId]
      ) as any;

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe(testDepartment.name);
      expect(rows[0].short_name).toBe(testDepartment.shortName);
    });

    it('should update department information', async () => {
      const updatedName = 'Updated Test Department of Engineering';
      await connection.execute(
        'UPDATE departments SET name = ?, updated_at = NOW() WHERE id = ?',
        [updatedName, departmentId]
      );

      const [rows] = await connection.execute(
        'SELECT * FROM departments WHERE id = ?',
        [departmentId]
      ) as any;

      expect(rows[0].name).toBe(updatedName);
    });

    it('should list all departments', async () => {
      const [rows] = await connection.execute('SELECT * FROM departments') as any;
      expect(rows.length).toBeGreaterThan(0);
      
      const testDept = rows.find((d: any) => d.short_name === testDepartment.shortName);
      expect(testDept).toBeDefined();
    });
  });

  describe('3. Major Management', () => {
    it('should have created a major under the test department', async () => {
      expect(majorId).toBeGreaterThan(0);
      
      const [result] = await connection.execute(
        'SELECT * FROM majors WHERE id = ?',
        [majorId]
      ) as any;

      expect(result).toHaveLength(1);
      expect(result[0].department_id).toBe(departmentId);
      testClass.majorId = majorId;
    });

    it('should verify major is linked to correct department', async () => {
      const [rows] = await connection.execute(
        'SELECT m.*, d.name as dept_name FROM majors m JOIN departments d ON m.department_id = d.id WHERE m.id = ?',
        [majorId]
      ) as any;

      expect(rows).toHaveLength(1);
      expect(rows[0].department_id).toBe(testMajor.departmentId);
      expect(rows[0].dept_name).toContain('Test Department');
    });

    it('should list majors by department', async () => {
      const [rows] = await connection.execute(
        'SELECT * FROM majors WHERE department_id = ?',
        [testMajor.departmentId]
      ) as any;

      expect(rows.length).toBeGreaterThan(0);
      const testMaj = rows.find((m: any) => m.short_name === testMajor.shortName);
      expect(testMaj).toBeDefined();
    });
  });

  describe('4. Class Management', () => {
    it('should have created a class under the test major', async () => {
      expect(classId).toBeGreaterThan(0);
      
      const [result] = await connection.execute(
        'SELECT * FROM classes WHERE id = ?',
        [classId]
      ) as any;

      expect(result).toHaveLength(1);
      expect(result[0].major_id).toBe(majorId);
    });

    it('should verify class hierarchy (class -> major -> department)', async () => {
      const [rows] = await connection.execute(
        `SELECT c.*, m.name as major_name, d.name as dept_name 
         FROM classes c 
         JOIN majors m ON c.major_id = m.id 
         JOIN departments d ON m.department_id = d.id 
         WHERE c.id = ?`,
        [classId]
      ) as any;

      expect(rows).toHaveLength(1);
      expect(rows[0].major_name).toBe(testMajor.name);
      expect(rows[0].dept_name).toContain('Test Department');
    });

    it('should list classes by year and semester', async () => {
      const [rows] = await connection.execute(
        'SELECT * FROM classes WHERE year = ? AND semester = ?',
        [testClass.year, testClass.semester]
      ) as any;

      expect(rows.length).toBeGreaterThan(0);
      const testCls = rows.find((c: any) => c.name === testClass.name);
      expect(testCls).toBeDefined();
    });
  });

  describe('5. Subject Management', () => {
    it('should have created a test subject', async () => {
      expect(subjectId).toBeGreaterThan(0);
      
      const [result] = await connection.execute(
        'SELECT * FROM subjects WHERE id = ?',
        [subjectId]
      ) as any;

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe(testSubject.code);
      expect(result[0].name).toBe(testSubject.name);
    });

    it('should ensure subject codes are unique', async () => {
      try {
        await connection.execute(
          'INSERT INTO subjects (name, code, credits, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
          ['Duplicate Subject', testSubject.code, 3]
        );
        expect.fail('Should have thrown duplicate key error');
      } catch (error: any) {
        expect(error.code).toBe('ER_DUP_ENTRY');
      }
    });

    it('should list all subjects', async () => {
      const [rows] = await connection.execute(
        'SELECT * FROM subjects'
      ) as any;

      expect(rows.length).toBeGreaterThan(0);
      const testSubj = rows.find((s: any) => s.code === testSubject.code);
      expect(testSubj).toBeDefined();
      expect(testSubj.name).toBe(testSubject.name);
    });
  });

  describe('6. User Management', () => {
    it('should have created admin user with hashed password', async () => {
      expect(adminId).toBeGreaterThan(0);
      
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [adminId]
      ) as any;

      expect(rows).toHaveLength(1);
      expect(rows[0].role).toBe('admin');
      expect(rows[0].email).toBe(testUsers.admin.email);
      
      // Verify password is hashed
      const isValid = await bcrypt.compare(testUsers.admin.password, rows[0].password);
      expect(isValid).toBe(true);
    });

    it('should have created teacher user linked to department and class', async () => {
      expect(teacherId).toBeGreaterThan(0);
      
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [teacherId]
      ) as any;

      expect(rows).toHaveLength(1);
      expect(rows[0].role).toBe('teacher');
      expect(rows[0].department_id).toBe(departmentId);
      expect(rows[0].class_id).toBe(classId);
    });

    it('should have created head user', async () => {
      expect(headId).toBeGreaterThan(0);
      
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [headId]
      ) as any;

      expect(rows).toHaveLength(1);
      expect(rows[0].role).toBe('head');
    });

    it('should verify user email uniqueness', async () => {
      try {
        const hashedPassword = await bcrypt.hash('AnyPassword123!', 10);
        await connection.execute(
          `INSERT INTO users (unique_id, name, email, password, role, work_type, schedule, status, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          ['DUPLICATE_001', 'Duplicate User', testUsers.admin.email, hashedPassword, 'staff', 'Full-Time', '08:00-17:00', 'active']
        );
        expect.fail('Should have thrown duplicate email error');
      } catch (error: any) {
        expect(error.code).toBe('ER_DUP_ENTRY');
      }
    });

    it('should retrieve user with department and class information', async () => {
      const [rows] = await connection.execute(
        `SELECT u.*, d.name as dept_name, c.name as class_name 
         FROM users u 
         LEFT JOIN departments d ON u.department_id = d.id 
         LEFT JOIN classes c ON u.class_id = c.id 
         WHERE u.id = ?`,
        [teacherId]
      ) as any;

      expect(rows).toHaveLength(1);
      expect(rows[0].email).toBe(testUsers.teacher.email);
      expect(rows[0].dept_name).toBe('Updated Test Department of Engineering');
      expect(rows[0].class_name).toBe(testClass.name);
    });

    it('should update user status', async () => {
      await connection.execute(
        'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
        ['inactive', teacherId]
      );

      const [rows] = await connection.execute(
        'SELECT status FROM users WHERE id = ?',
        [teacherId]
      ) as any;

      expect(rows[0].status).toBe('inactive');

      // Restore to active for subsequent tests
      await connection.execute(
        'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
        ['active', teacherId]
      );
    });

    it('should list users by role', async () => {
      const [admins] = await connection.execute(
        'SELECT * FROM users WHERE role = ?',
        ['admin']
      ) as any;
      
      const [teachers] = await connection.execute(
        'SELECT * FROM users WHERE role = ?',
        ['teacher']
      ) as any;

      expect(admins.length).toBeGreaterThan(0);
      expect(teachers.length).toBeGreaterThan(0);
      
      const testAdmin = admins.find((u: any) => u.unique_id === testUsers.admin.uniqueId);
      expect(testAdmin).toBeDefined();
    });

    it('should filter users by department', async () => {
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE department_id = ?',
        [testUsers.teacher.departmentId]
      ) as any;

      expect(rows.length).toBeGreaterThan(0);
      const users = rows.map((u: any) => u.email);
      expect(users).toContain(testUsers.teacher.email);
    });
  });

  describe('7. Schedule Management', () => {
    it('should have created a schedule linking class, subject, and teacher', async () => {
      expect(scheduleId).toBeGreaterThan(0);
      
      const [rows] = await connection.execute(
        'SELECT * FROM schedules WHERE id = ?',
        [scheduleId]
      ) as any;

      expect(rows).toHaveLength(1);
      expect(rows[0].class_id).toBe(classId);
      expect(rows[0].subject_id).toBe(subjectId);
      expect(rows[0].teacher_id).toBe(teacherId);
    });

    it('should retrieve complete schedule information', async () => {
      const [rows] = await connection.execute(
        `SELECT s.*, c.name as class_name, sub.name as subject_name, u.name as teacher_name 
         FROM schedules s 
         JOIN classes c ON s.class_id = c.id 
         JOIN subjects sub ON s.subject_id = sub.id 
         JOIN users u ON s.teacher_id = u.id 
         WHERE s.id = ?`,
        [scheduleId]
      ) as any;

      expect(rows).toHaveLength(1);
      expect(rows[0].class_name).toBe(testClass.name);
      expect(rows[0].subject_name).toBe(testSubject.name);
      expect(rows[0].teacher_name).toBe(testUsers.teacher.name);
      expect(rows[0].room).toBe(testSchedule.room);
    });

    it('should list schedules by day of week', async () => {
      const [rows] = await connection.execute(
        'SELECT * FROM schedules WHERE day = ?',
        [testSchedule.day]
      ) as any;

      expect(rows.length).toBeGreaterThan(0);
      const testSched = rows.find((s: any) => s.room === testSchedule.room);
      expect(testSched).toBeDefined();
    });

    it('should list schedules by teacher', async () => {
      const [rows] = await connection.execute(
        `SELECT s.*, c.name as class_name, sub.name as subject_name 
         FROM schedules s 
         JOIN classes c ON s.class_id = c.id 
         JOIN subjects sub ON s.subject_id = sub.id 
         WHERE s.teacher_id = ?`,
        [testSchedule.teacherId]
      ) as any;

      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].subject_name).toBe(testSubject.name);
    });

    it('should update schedule room and time', async () => {
      const newRoom = 'Lab-102';
      const newEndTime = '11:00';

      await connection.execute(
        'UPDATE schedules SET room = ?, end_time = ?, updated_at = NOW() WHERE id = ?',
        [newRoom, newEndTime, scheduleId]
      );

      const [rows] = await connection.execute(
        'SELECT * FROM schedules WHERE id = ?',
        [scheduleId]
      ) as any;

      expect(rows[0].room).toBe(newRoom);
      expect(rows[0].end_time.startsWith(newEndTime)).toBe(true); // MySQL returns HH:MM:SS format
    });
  });

  describe('8. Data Integrity and Relationships', () => {
    it('should maintain referential integrity between users and departments', async () => {
      const [rows] = await connection.execute(
        `SELECT COUNT(*) as count FROM users u 
         JOIN departments d ON u.department_id = d.id 
         WHERE u.unique_id LIKE 'TEST_%' AND u.department_id IS NOT NULL`
      ) as any;

      expect(rows[0].count).toBeGreaterThan(0);
    });

    it('should maintain referential integrity in schedule hierarchy', async () => {
      // Note: Schedule room was updated to 'Lab-102' in previous test
      const [rows] = await connection.execute(
        `SELECT s.*, c.name as class_name, m.name as major_name, d.name as dept_name,
                sub.name as subject_name, u.name as teacher_name
         FROM schedules s
         JOIN classes c ON s.class_id = c.id
         JOIN majors m ON c.major_id = m.id
         JOIN departments d ON m.department_id = d.id
         JOIN subjects sub ON s.subject_id = sub.id
         JOIN users u ON s.teacher_id = u.id
         WHERE s.room = ?`,
        ['Lab-102'] // Updated room from test #7
      ) as any;

      expect(rows).toHaveLength(1);
      expect(rows[0].class_name).toBe(testClass.name);
      expect(rows[0].major_name).toBe(testMajor.name);
      expect(rows[0].dept_name).toContain('Engineering'); // Department name was updated in earlier test
    });

    it('should verify all timestamps are set correctly', async () => {
      const [users] = await connection.execute(
        'SELECT created_at, updated_at FROM users WHERE unique_id LIKE "TEST_%"'
      ) as any;

      users.forEach((user: any) => {
        expect(user.created_at).toBeDefined();
        expect(user.updated_at).toBeDefined();
        expect(user.created_at instanceof Date || typeof user.created_at === 'string').toBe(true);
      });
    });
  });

  describe('9. Query Performance and Data Validation', () => {
    it('should efficiently query schedules with all relationships', async () => {
      const startTime = Date.now();
      
      const [rows] = await connection.execute(
        `SELECT s.*, 
                c.name as class_name, c.year, c.semester,
                m.name as major_name, m.short_name as major_code,
                d.name as dept_name, d.short_name as dept_code,
                sub.name as subject_name, sub.code as subject_code,
                u.name as teacher_name, u.email as teacher_email
         FROM schedules s
         JOIN classes c ON s.class_id = c.id
         JOIN majors m ON c.major_id = m.id
         JOIN departments d ON m.department_id = d.id
         JOIN subjects sub ON s.subject_id = sub.id
         JOIN users u ON s.teacher_id = u.id
         WHERE d.short_name = ?`,
        [testDepartment.shortName]
      ) as any;

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(queryTime).toBeLessThan(1000); // Query should complete within 1 second
      expect(rows.length).toBeGreaterThan(0);
    });

    it('should validate email format for existing users', async () => {
      const [rows] = await connection.execute(
        'SELECT email FROM users WHERE unique_id LIKE "TEST_%"'
      ) as any;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      rows.forEach((user: any) => {
        expect(emailRegex.test(user.email)).toBe(true);
      });
    });

    it('should validate time format in schedules', async () => {
      const [rows] = await connection.execute(
        'SELECT start_time, end_time FROM schedules WHERE room = ?',
        [testSchedule.room]
      ) as any;

      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/; // HH:MM or HH:MM:SS
      rows.forEach((schedule: any) => {
        expect(timeRegex.test(schedule.start_time)).toBe(true);
        expect(timeRegex.test(schedule.end_time)).toBe(true);
      });
    });

    it('should verify active status values are valid', async () => {
      const [rows] = await connection.execute(
        'SELECT DISTINCT status FROM users'
      ) as any;

      const validStatuses = ['active', 'inactive'];
      rows.forEach((row: any) => {
        expect(validStatuses).toContain(row.status);
      });
    });
  });

  describe('10. System Statistics and Reporting', () => {
    it('should count users by role', async () => {
      const [rows] = await connection.execute(
        'SELECT role, COUNT(*) as count FROM users GROUP BY role'
      ) as any;

      expect(rows.length).toBeGreaterThan(0);
      
      const roleMap = new Map(rows.map((r: any) => [r.role, r.count]));
      expect(roleMap.has('admin')).toBe(true);
      expect(roleMap.has('teacher')).toBe(true);
    });

    it('should count classes by year', async () => {
      const [rows] = await connection.execute(
        'SELECT year, COUNT(*) as count FROM classes GROUP BY year'
      ) as any;

      expect(rows.length).toBeGreaterThan(0);
      const testYear = rows.find((r: any) => r.year === testClass.year);
      expect(testYear).toBeDefined();
    });

    it('should generate department summary report', async () => {
      const [rows] = await connection.execute(
        `SELECT d.name as department, 
                COUNT(DISTINCT m.id) as major_count,
                COUNT(DISTINCT c.id) as class_count,
                COUNT(DISTINCT u.id) as user_count
         FROM departments d
         LEFT JOIN majors m ON d.id = m.department_id
         LEFT JOIN classes c ON m.id = c.major_id
         LEFT JOIN users u ON d.id = u.department_id
         WHERE d.short_name = ?
         GROUP BY d.id, d.name`,
        [testDepartment.shortName]
      ) as any;

      expect(rows).toHaveLength(1);
      expect(rows[0].major_count).toBeGreaterThan(0);
      expect(rows[0].class_count).toBeGreaterThan(0);
      expect(rows[0].user_count).toBeGreaterThan(0);
    });

    it('should calculate schedule load per teacher', async () => {
      const [rows] = await connection.execute(
        `SELECT u.name, u.email, COUNT(s.id) as class_count
         FROM users u
         LEFT JOIN schedules s ON u.id = s.teacher_id
         WHERE u.role = 'teacher' AND u.unique_id LIKE 'TEST_%'
         GROUP BY u.id, u.name, u.email`
      ) as any;

      expect(rows.length).toBeGreaterThan(0);
      const testTeacher = rows.find((r: any) => r.email === testUsers.teacher.email);
      expect(testTeacher).toBeDefined();
      expect(testTeacher.class_count).toBeGreaterThan(0);
    });
  });
});
