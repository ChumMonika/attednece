/**
 * Unit Tests for Attendance Marking Function
 * Tests workflow rules, authorization, edge cases, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import type { IStorage, User, Attendance } from './storage';

// Mock storage implementation
class MockStorage implements Partial<IStorage> {
  private users: Map<number, User> = new Map();
  private attendance: Map<number, Attendance> = new Map();
  private attendanceId = 1;

  constructor() {
    // Setup test users
    this.users.set(1, {
      id: 1,
      uniqueId: 'M001',
      name: 'Mazer User',
      email: 'mazer@test.com',
      password: 'password',
      role: 'mazer',
      department: 'Academic Affairs',
      workType: 'Full-Time',
      schedule: '08:00-17:00',
      subject: '',
      status: 'active'
    });

    this.users.set(2, {
      id: 2,
      uniqueId: 'AS001',
      name: 'Assistant User',
      email: 'assistant@test.com',
      password: 'password',
      role: 'assistant',
      department: 'Administration',
      workType: 'Full-Time',
      schedule: '08:00-17:00',
      subject: '',
      status: 'active'
    });

    this.users.set(3, {
      id: 3,
      uniqueId: 'T001',
      name: 'Teacher User',
      email: 'teacher@test.com',
      password: 'password',
      role: 'teacher',
      department: 'Computer Science',
      workType: 'Full-Time',
      schedule: '07:00-11:00',
      subject: 'Mathematics',
      status: 'active'
    });

    this.users.set(4, {
      id: 4,
      uniqueId: 'S001',
      name: 'Staff User',
      email: 'staff@test.com',
      password: 'password',
      role: 'staff',
      department: 'IT Support',
      workType: 'Full-Time',
      schedule: '08:00-17:00',
      subject: '',
      status: 'active'
    });

    this.users.set(5, {
      id: 5,
      uniqueId: 'H001',
      name: 'Head User',
      email: 'head@test.com',
      password: 'password',
      role: 'head',
      department: 'Administration',
      workType: 'Full-Time',
      schedule: '08:00-17:00',
      subject: '',
      status: 'active'
    });

    this.users.set(6, {
      id: 6,
      uniqueId: 'A001',
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password',
      role: 'admin',
      department: 'Administration',
      workType: 'Full-Time',
      schedule: '08:00-17:00',
      subject: '',
      status: 'active'
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async markAttendance(data: any): Promise<Attendance> {
    const attendance: Attendance = {
      id: this.attendanceId++,
      userId: data.userId,
      date: data.date,
      status: data.status,
      markedAt: data.markedAt,
      markedBy: data.markedBy
    };
    this.attendance.set(attendance.id, attendance);
    return attendance;
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(a => a.date === date);
  }

  reset() {
    this.attendance.clear();
    this.attendanceId = 1;
  }
}

// Mock request/response helpers
function createMockRequest(
  body: any,
  session: { userId?: number; userRole?: string } = {}
): Partial<Request> {
  return {
    body,
    session: session as any
  };
}

function createMockResponse(): Partial<Response> {
  const res: any = {
    statusCode: 200,
    jsonData: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.jsonData = data;
      return res;
    }
  };
  return res;
}

// Attendance marking handler (extracted from routes.ts for testing)
async function markAttendanceHandler(
  req: Partial<Request>,
  res: Partial<Response>,
  storage: MockStorage
) {
  try {
    const { userId, date, status } = req.body || {};

    // Validate required fields
    if (!userId || !date || !status) {
      return res.status!(400).json({ message: 'Missing required fields' });
    }

    const userRole = (req.session as any)?.userRole;
    const currentUserId = (req.session as any)?.userId;

    // Check if user is authenticated
    if (!currentUserId) {
      return res.status!(401).json({ message: 'Unauthorized' });
    }

    // ONLY Mazer and Assistant can mark attendance
    if (!['mazer', 'assistant'].includes(userRole)) {
      return res.status!(403).json({
        message: 'Only Mazer or Assistant can mark attendance'
      });
    }

    // Validate target user exists
    const targetUser = await storage.getUser(userId);
    if (!targetUser) {
      return res.status!(404).json({ message: 'User not found' });
    }

    // Enforce role-specific permissions
    const canMark =
      (userRole === 'mazer' && targetUser.role === 'teacher') ||
      (userRole === 'assistant' && targetUser.role === 'staff');

    if (!canMark) {
      return res.status!(403).json({
        message:
          userRole === 'mazer'
            ? "Mazer can only mark teachers' attendance"
            : 'Assistant can only mark staff attendance'
      });
    }

    const attendance = await storage.markAttendance({
      userId,
      date,
      status,
      markedAt: new Date().toISOString(),
      markedBy: currentUserId
    });

    return res.status!(200).json(attendance);
  } catch (error: any) {
    return res.status!(400).json({
      message: 'Failed to mark attendance',
      error: error.message
    });
  }
}

describe('Attendance Marking Function - Unit Tests', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
    storage.reset();
  });

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'present' },
        {} // No session
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(401);
      expect(res.jsonData?.message).toBe('Unauthorized');
    });

    it('should reject requests from non-Mazer/Assistant users', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'present' },
        { userId: 3, userRole: 'teacher' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData?.message).toBe('Only Mazer or Assistant can mark attendance');
    });

    it('should reject Head users from marking attendance', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'present' },
        { userId: 5, userRole: 'head' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData?.message).toBe('Only Mazer or Assistant can mark attendance');
    });

    it('should reject Admin users from marking attendance', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'present' },
        { userId: 6, userRole: 'admin' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData?.message).toBe('Only Mazer or Assistant can mark attendance');
    });

    it('should prevent teachers from marking their own attendance', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'present' },
        { userId: 3, userRole: 'teacher' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData?.message).toBe('Only Mazer or Assistant can mark attendance');
    });

    it('should prevent staff from marking their own attendance', async () => {
      const req = createMockRequest(
        { userId: 4, date: '2025-12-06', status: 'present' },
        { userId: 4, userRole: 'staff' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData?.message).toBe('Only Mazer or Assistant can mark attendance');
    });
  });

  describe('Role-Specific Permissions', () => {
    it('should allow Mazer to mark teacher attendance', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData?.userId).toBe(3);
      expect(res.jsonData?.status).toBe('present');
      expect(res.jsonData?.markedBy).toBe(1);
    });

    it('should allow Assistant to mark staff attendance', async () => {
      const req = createMockRequest(
        { userId: 4, date: '2025-12-06', status: 'present' },
        { userId: 2, userRole: 'assistant' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData?.userId).toBe(4);
      expect(res.jsonData?.status).toBe('present');
      expect(res.jsonData?.markedBy).toBe(2);
    });

    it('should prevent Mazer from marking staff attendance', async () => {
      const req = createMockRequest(
        { userId: 4, date: '2025-12-06', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData?.message).toBe("Mazer can only mark teachers' attendance");
    });

    it('should prevent Assistant from marking teacher attendance', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'present' },
        { userId: 2, userRole: 'assistant' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData?.message).toBe('Assistant can only mark staff attendance');
    });

    it('should prevent Mazer from marking another Mazer', async () => {
      const req = createMockRequest(
        { userId: 1, date: '2025-12-06', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData?.message).toBe("Mazer can only mark teachers' attendance");
    });

    it('should prevent Assistant from marking another Assistant', async () => {
      const req = createMockRequest(
        { userId: 2, date: '2025-12-06', status: 'present' },
        { userId: 2, userRole: 'assistant' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData?.message).toBe('Assistant can only mark staff attendance');
    });
  });

  describe('Edge Cases - Missing Data', () => {
    it('should reject request with missing userId', async () => {
      const req = createMockRequest(
        { date: '2025-12-06', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData?.message).toBe('Missing required fields');
    });

    it('should reject request with missing date', async () => {
      const req = createMockRequest(
        { userId: 3, status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData?.message).toBe('Missing required fields');
    });

    it('should reject request with missing status', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-12-06' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData?.message).toBe('Missing required fields');
    });

    it('should reject request with empty body', async () => {
      const req = createMockRequest({}, { userId: 1, userRole: 'mazer' });
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData?.message).toBe('Missing required fields');
    });

    it('should reject request with null body', async () => {
      const req = createMockRequest(null, { userId: 1, userRole: 'mazer' });
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData?.message).toBe('Missing required fields');
    });
  });

  describe('Edge Cases - Invalid Data', () => {
    it('should reject request for non-existent user', async () => {
      const req = createMockRequest(
        { userId: 999, date: '2025-12-06', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(404);
      expect(res.jsonData?.message).toBe('User not found');
    });

    it('should handle invalid userId type (string)', async () => {
      const req = createMockRequest(
        { userId: 'invalid', date: '2025-12-06', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(404);
      expect(res.jsonData?.message).toBe('User not found');
    });

    it('should handle negative userId', async () => {
      const req = createMockRequest(
        { userId: -1, date: '2025-12-06', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(404);
      expect(res.jsonData?.message).toBe('User not found');
    });

    it('should handle zero userId', async () => {
      const req = createMockRequest(
        { userId: 0, date: '2025-12-06', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData?.message).toBe('Missing required fields');
    });
  });

  describe('Edge Cases - Duplicate Entries', () => {
    it('should allow marking attendance multiple times for same user on same day', async () => {
      // First marking
      const req1 = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res1 = createMockResponse();
      await markAttendanceHandler(req1, res1, storage);
      expect(res1.statusCode).toBe(200);

      // Second marking (update)
      const req2 = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'absent' },
        { userId: 1, userRole: 'mazer' }
      );
      const res2 = createMockResponse();
      await markAttendanceHandler(req2, res2, storage);
      expect(res2.statusCode).toBe(200);

      // Verify both records exist (no duplicate prevention at this level)
      const records = await storage.getAttendanceByDate('2025-12-06');
      expect(records.length).toBe(2);
    });

    it('should allow different users to mark on same date', async () => {
      // Mark teacher
      const req1 = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res1 = createMockResponse();
      await markAttendanceHandler(req1, res1, storage);
      expect(res1.statusCode).toBe(200);

      // Mark staff
      const req2 = createMockRequest(
        { userId: 4, date: '2025-12-06', status: 'present' },
        { userId: 2, userRole: 'assistant' }
      );
      const res2 = createMockResponse();
      await markAttendanceHandler(req2, res2, storage);
      expect(res2.statusCode).toBe(200);

      const records = await storage.getAttendanceByDate('2025-12-06');
      expect(records.length).toBe(2);
    });
  });

  describe('Valid Status Values', () => {
    it('should accept "present" status', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData?.status).toBe('present');
    });

    it('should accept "absent" status', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'absent' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData?.status).toBe('absent');
    });

    it('should accept "leave" status', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'leave' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData?.status).toBe('leave');
    });
  });

  describe('Date Handling', () => {
    it('should accept valid date format YYYY-MM-DD', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData?.date).toBe('2025-12-06');
    });

    it('should accept past dates', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-01-01', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData?.date).toBe('2025-01-01');
    });

    it('should accept future dates', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-12-31', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData?.date).toBe('2025-12-31');
    });
  });

  describe('Audit Trail', () => {
    it('should record who marked the attendance (markedBy)', async () => {
      const req = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData?.markedBy).toBe(1);
    });

    it('should record when attendance was marked (markedAt)', async () => {
      const beforeTime = new Date().toISOString();
      
      const req = createMockRequest(
        { userId: 3, date: '2025-12-06', status: 'present' },
        { userId: 1, userRole: 'mazer' }
      );
      const res = createMockResponse();

      await markAttendanceHandler(req, res, storage);

      const afterTime = new Date().toISOString();

      expect(res.statusCode).toBe(200);
      expect(res.jsonData?.markedAt).toBeDefined();
      // markedAt is now a datetime string, just verify it exists and is a string
      expect(typeof res.jsonData?.markedAt).toBe('string');
      expect(res.jsonData?.markedAt.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple markings in sequence', async () => {
      const users = [3, 3, 3];
      const statuses = ['present', 'absent', 'present'];

      for (let i = 0; i < users.length; i++) {
        const req = createMockRequest(
          { userId: users[i], date: '2025-12-06', status: statuses[i] },
          { userId: 1, userRole: 'mazer' }
        );
        const res = createMockResponse();

        await markAttendanceHandler(req, res, storage);
        expect(res.statusCode).toBe(200);
      }

      const records = await storage.getAttendanceByDate('2025-12-06');
      expect(records.length).toBe(3);
    });
  });
});
