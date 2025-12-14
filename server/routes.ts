import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { 
  loginSchema, 
  insertUserSchema, 
  markAttendanceSchema,
  insertLeaveRequestSchema,
  respondLeaveRequestSchema,
  insertScheduleSchema,
  updateScheduleSchema,
  insertDepartmentSchema,
  insertMajorSchema,
  insertClassSchema,
  insertSubjectSchema,
  insertSemesterSchema
} from "@shared/schema";

// Note: Multer is not available in this environment
// For real file uploads, install multer: npm install multer @types/multer

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'university-attendance-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Session data interface
  interface SessionData {
    userId?: number;
    userRole?: string;
  }
  
  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!(req.session as any).userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Authentication routes
  app.post("/api/login", async (req, res) => {
    try {
      if (!req.body || !req.body.uniqueId || !req.body.password) {
        return res.status(400).json({ 
          message: "Missing required fields"
        });
      }
      
      const { uniqueId, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUniqueId(uniqueId);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Compare hashed password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      (req.session as any).userId = user.id;
      (req.session as any).userRole = user.role;
      
      res.json({ 
        role: user.role, 
        name: user.name,
        id: user.id,
        uniqueId: user.uniqueId
      });
    } catch (error) {
      console.error("=== LOGIN ERROR ===");
      console.error("Error type:", typeof error);
      console.error("Error message:", (error as Error).message);
      console.error("Error stack:", (error as Error).stack);
      console.error("=== END LOGIN ERROR ===");
      res.status(400).json({ 
        message: "Invalid request data", 
        error: (error as Error).message,
        details: "Check that uniqueId and password are strings"
      });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Leave request routes
  app.post("/api/leave-request", requireAuth, async (req, res) => {
    try {
      const requestData = insertLeaveRequestSchema.parse(req.body);
      
      const leaveRequest = await storage.createLeaveRequest({
        ...requestData,
        userId: (req.session as any).userId,
      } as any);

      res.json(leaveRequest);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.get("/api/leave-requests", requireAuth, async (req, res) => {
    try {
      const userRole = (req.session as any).userRole;
      const currentUserId = (req.session as any).userId;
      
      let leaveRequests;
      if (['head', 'admin'].includes(userRole)) {
        // Head and admin can see all leave requests
        leaveRequests = await storage.getLeaveRequests();
      } else {
        // Other users can only see their own leave requests
        leaveRequests = await storage.getLeaveRequests(currentUserId);
      }

      // Get user information for each leave request
      const leaveRequestsWithUsers = await Promise.all(
        leaveRequests.map(async (request) => {
          const user = await storage.getUser(request.userId);
          return { ...request, user };
        })
      );

      res.json(leaveRequestsWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/leave-requests/respond", requireAuth, async (req, res) => {
    try {
      const { requestId, status, rejectionReason } = respondLeaveRequestSchema.parse(req.body);
      
      const userRole = (req.session as any).userRole;
      // Only Head of Department (HoD) can approve/reject leave requests per BRD
      if (userRole !== 'head') {
        return res.status(403).json({ message: "Only Head of Department can approve/reject leave requests" });
      }

      const updates: Partial<any> = {
        status,
        respondedAt: new Date(),
        respondedBy: (req.session as any).userId,
      };

      if (status === 'rejected' && rejectionReason) {
        updates.rejectionReason = rejectionReason;
      }

      const updatedRequest = await storage.updateLeaveRequest(requestId, updates);
      if (!updatedRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      // If approved, automatically update attendance records to 'leave'
      if (status === 'approved') {
        const leaveRequest = updatedRequest;
        const startDate = new Date(leaveRequest.startDate);
        const endDate = new Date(leaveRequest.endDate);
        
        // Mark all days in the leave period as 'leave'
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          await storage.markAttendance({
            userId: leaveRequest.userId,
            date: dateStr,
            status: 'leave',
            isLate: false,
            markedAt: new Date(),
            markedBy: (req.session as any).userId,
          });
        }
      }

      res.json(updatedRequest);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Attendance routes
  // Secure endpoint for users to view only their own attendance
  app.get("/api/my-attendance", requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.session as any).userId;
      const attendance = await storage.getAttendance(currentUserId);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/attendance/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const currentUserId = (req.session as any).userId;
      const userRole = (req.session as any).userRole;

      // Only allow users to view their own attendance or head/admin to view any
      if (userId !== currentUserId && !['head', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const attendance = await storage.getAttendance(userId);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/attendance-all", requireAuth, async (req, res) => {
    try {
      const userRole = (req.session as any).userRole;
      if (!['head', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const attendance = await storage.getAllAttendance();
      
      // Get user information for each attendance record
      const attendanceWithUsers = await Promise.all(
        attendance.map(async (record) => {
          const user = await storage.getUser(record.userId);
          return { ...record, user };
        })
      );

      res.json(attendanceWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/attendance-by-department", requireAuth, async (req, res) => {
    try {
      const userRole = (req.session as any).userRole;
      if (!['head', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { department } = req.query;
      if (!department || department === 'all') {
        const attendance = await storage.getAllAttendance();
        const attendanceWithUsers = await Promise.all(
          attendance.map(async (record) => {
            const user = await storage.getUser(record.userId);
            return { ...record, user };
          })
        );
        res.json(attendanceWithUsers);
      } else {
        const attendance = await storage.getAttendanceByDepartment(department as string);
        const attendanceWithUsers = await Promise.all(
          attendance.map(async (record) => {
            const user = await storage.getUser(record.userId);
            return { ...record, user };
          })
        );
        res.json(attendanceWithUsers);
      }
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/department-summary", requireAuth, async (req, res) => {
    try {
      const userRole = (req.session as any).userRole;
      if (!['head', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const summary = await storage.getDepartmentSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/attendance/mark", requireAuth, async (req, res) => {
    try {
      const { userId, date, status, scheduleId } = markAttendanceSchema.parse(req.body);
      
      const userRole = (req.session as any).userRole;
      const currentUserId = (req.session as any).userId;

      // ONLY Moderator and HR Assistant/Backup can mark attendance (per BRD)
      if (!["moderator", "hr_assistant", "hr_backup"].includes(userRole)) {
        return res.status(403).json({ 
          message: "Only Class Moderators or HR can mark attendance" 
        });
      }

      // Validate target user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Enforce role-specific permissions per BRD:
      // - Moderator can only mark teachers
      // - HR Assistant/Backup can only mark staff
      const canMark = 
        (userRole === "moderator" && targetUser.role === "teacher") ||
        (["hr_assistant", "hr_backup"].includes(userRole) && targetUser.role === "staff");

      if (!canMark) {
        return res.status(403).json({ 
          message: userRole === "moderator" 
            ? "Class Moderators can only mark teachers' attendance" 
            : "HR can only mark staff attendance"
        });
      }

      // Auto-detect late status based on schedule
      let isLate = false;
      if (targetUser.schedule && status === "present") {
        const scheduleStart = targetUser.schedule.split('-')[0]; // e.g., "08:00" from "08:00-17:00"
        const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"
        isLate = currentTime > scheduleStart;
      }

      const attendance = await storage.markAttendance({
        userId,
        date,
        status,
        isLate,
        markedAt: new Date(),
        markedBy: currentUserId,
        scheduleId,
      });

      res.json(attendance);
    } catch (error: any) {
      console.error("Mark Attendance Error:", error);
      res.status(400).json({ 
        message: "Failed to mark attendance", 
        error: error.message 
      });
    }
  });

  // Today schedule endpoint combining users with today's attendance (and approved leave)
  app.get("/api/attendance-today", requireAuth, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [allUsers, todaysAttendance, allLeaveRequests] = await Promise.all([
        storage.getAllUsers(),
        storage.getAttendanceByDate(today),
        storage.getLeaveRequests(),
      ]);

      // Build a map of attendance by userId for quick lookup
      const attendanceByUser = new Map<number, any>();
      for (const att of todaysAttendance) {
        attendanceByUser.set(att.userId, att);
      }

      // Find approved leaves that cover today
      const approvedLeaveTodayByUser = new Set<number>();
      for (const req of allLeaveRequests) {
        if (req.status === 'approved') {
          const start = req.startDate;
          const end = req.endDate;
          if (start <= today && today <= end) {
            approvedLeaveTodayByUser.add(req.userId);
          }
        }
      }

      const result = allUsers.map(u => {
        // Exclude password field before sending to client
        const { password, ...userWithoutPassword } = u as any;

        let att = attendanceByUser.get(u.id) || null;

        // If no attendance but approved leave, synthesize a leave record
        if (!att && approvedLeaveTodayByUser.has(u.id)) {
          att = {
            id: -1,
            userId: u.id,
            date: today,
            status: 'leave',
            markedAt: 'Pre-approved',
            markedBy: null,
          };
        }

        return {
          ...userWithoutPassword,
          attendance: att,
        };
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const userRole = (req.session as any).userRole;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const userData = insertUserSchema.parse(req.body);
      
      // Hash password before storing
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const userDataWithHashedPassword = {
        ...userData,
        password: hashedPassword
      };
      
      const user = await storage.createUser(userDataWithHashedPassword);
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.put("/api/user/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const userId = parseInt(req.params.id);
      let updates = req.body;
      
      // If password is being updated, hash it
      if (updates.password) {
        const hashedPassword = await bcrypt.hash(updates.password, 10);
        updates = {
          ...updates,
          password: hashedPassword
        };
      }
      
      const updatedUser = await storage.updateUser(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.get("/api/user/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      const userId = parseInt(req.params.id);
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Remove password before sending
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/user/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const userId = parseInt(req.params.id);
      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Password reset endpoint (admin only)
  app.post("/api/users/:id/reset-password", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updatedUser = await storage.updateUser(userId, { password: hashedPassword });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Stats endpoint for dashboard
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      if (!['head', 'admin'].includes((req.session as any).userRole)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = await storage.getAttendanceByDate(today);
      const allUsers = await storage.getAllUsers();
      const pendingRequests = await storage.getPendingLeaveRequests();
      
      const present = todayAttendance.filter(att => att.status === 'present').length;
      const absent = todayAttendance.filter(att => att.status === 'absent').length;
      const onLeave = todayAttendance.filter(att => att.status === 'leave').length;
      
      res.json({
        present,
        absent,
        onLeave,
        pendingRequests: pendingRequests.length,
        totalUsers: allUsers.length
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Test endpoint
  app.post("/api/test", (req, res) => {
    console.log("=== TEST ENDPOINT DEBUG ===");
    console.log("Test endpoint hit at:", new Date().toISOString());
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);
    res.json({ message: "Test endpoint working", body: req.body });
  });

  // Schedule management routes (admin only)
  app.get("/api/schedules", requireAuth, async (req, res) => {
    try {
      console.log("=== SCHEDULE GET DEBUG ===");
      console.log("User role:", (req.session as any).userRole);
      console.log("Query params:", req.query);
      
      const userRole = (req.session as any).userRole;
      if (!['head', 'admin', 'mazer'].includes(userRole)) {
        console.log("Access denied: User role not allowed");
        return res.status(403).json({ message: "Forbidden - Admin, Head, or Mazer access required" });
      }

      const { day, major } = req.query;
      let schedules;

      if (day) {
        schedules = await storage.getSchedulesByDay(day as string);
      } else if (major) {
        schedules = await storage.getSchedulesByMajor(major as string);
      } else {
        schedules = await storage.getAllSchedules();
      }

      console.log("Found schedules:", schedules.length);

      // Get teacher information for each schedule
      const schedulesWithTeachers = await Promise.all(
        schedules.map(async (schedule) => {
          const teacher = await storage.getUser(schedule.teacherId);
          return { ...schedule, teacher };
        })
      );

      console.log("=== END SCHEDULE GET DEBUG ===");
      res.json(schedulesWithTeachers);
    } catch (error) {
      console.error("=== SCHEDULE GET ERROR ===");
      console.error("Error:", error);
      console.error("Error message:", (error as Error).message);
      console.error("=== END SCHEDULE GET ERROR ===");
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/schedules", requireAuth, async (req, res) => {
    try {
      console.log("=== SCHEDULE CREATE DEBUG ===");
      console.log("Request received at:", new Date().toISOString());
      console.log("User role:", (req.session as any).userRole);
      console.log("Request body:", req.body);
      console.log("Request headers:", req.headers);
      
      if ((req.session as any).userRole !== 'admin') {
        console.log("Access denied: User is not admin");
        return res.status(403).json({ message: "Forbidden - Admin access required" });
      }

      const scheduleData = insertScheduleSchema.parse(req.body);
      console.log("Parsed schedule data:", scheduleData);
      
      const schedule = await storage.createSchedule(scheduleData);

      console.log("Created schedule:", schedule);

      // Get teacher information
      const teacher = await storage.getUser(schedule.teacherId);
      const scheduleWithTeacher = { ...schedule, teacher };

      console.log("=== END SCHEDULE CREATE DEBUG ===");
      res.json(scheduleWithTeacher);
    } catch (error) {
      console.error("=== SCHEDULE CREATE ERROR ===");
      console.error("Error:", error);
      console.error("Error message:", (error as Error).message);
      console.error("=== END SCHEDULE CREATE ERROR ===");
      res.status(400).json({ 
        message: "Invalid request data", 
        error: (error as Error).message,
        details: "Check that all required fields are provided and in correct format"
      });
    }
  });

  app.put("/api/schedules/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const scheduleId = parseInt(req.params.id);
      const updates = updateScheduleSchema.parse(req.body);
      
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace('T', ' '); // Format: "2025-08-12 14:44:26"
      
      const updatedSchedule = await storage.updateSchedule(scheduleId, {
        ...updates,
        updatedAt: timestamp
      });

      if (!updatedSchedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      // Get teacher information
      const teacher = await storage.getUser(updatedSchedule.teacherId);
      const scheduleWithTeacher = { ...updatedSchedule, teacher };

      res.json(scheduleWithTeacher);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.delete("/api/schedules/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const scheduleId = parseInt(req.params.id);
      const deleted = await storage.deleteSchedule(scheduleId);

      if (!deleted) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      res.json({ message: "Schedule deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/schedules/:id", requireAuth, async (req, res) => {
    try {
      const userRole = (req.session as any).userRole;
      if (!['head', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const scheduleId = parseInt(req.params.id);
      const schedule = await storage.getScheduleById(scheduleId);

      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      // Get teacher information
      const teacher = await storage.getUser(schedule.teacherId);
      const scheduleWithTeacher = { ...schedule, teacher };

      res.json(scheduleWithTeacher);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get schedules by teacher (for mazer to see teacher schedules)
  app.get("/api/schedules/teacher/:teacherId", requireAuth, async (req, res) => {
    try {
      const userRole = (req.session as any).userRole;
      if (!['head', 'admin', 'mazer'].includes(userRole)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const teacherId = parseInt(req.params.teacherId);
      const schedules = await storage.getSchedulesByTeacher(teacherId);

      // Get teacher information
      const teacher = await storage.getUser(teacherId);
      const schedulesWithTeacher = schedules.map(schedule => ({ ...schedule, teacher }));

      res.json(schedulesWithTeacher);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ DASHBOARD METRICS ENDPOINTS ============
  
  // Get dashboard metrics - role-based data for dashboard cards
  app.get("/api/dashboard/metrics", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;
      const userRole = session.userRole;
      
      // Fetch all data
      const allUsers = await storage.getAllUsers();
      const allAttendance = await storage.getAllAttendance();
      const allLeaves = await storage.getAllLeaveRequests();
      
      // Filter data based on role
      let filteredAttendance = allAttendance;
      let filteredLeaves = allLeaves;
      let filteredUsers = allUsers;
      
      // Teachers and staff see only their own data
      if (userRole === 'teacher' || userRole === 'staff') {
        filteredAttendance = allAttendance.filter(a => a.userId === userId);
        filteredLeaves = allLeaves.filter(l => l.userId === userId);
        filteredUsers = allUsers.filter(u => u.id === userId);
      }
      
      // Calculate metrics
      const totalUsers = filteredUsers.length;
      const activeUsers = filteredUsers.filter(u => u.status === 'active').length;
      const inactiveUsers = filteredUsers.filter(u => u.status === 'inactive').length;
      
      const totalAttendance = filteredAttendance.length;
      const presentCount = filteredAttendance.filter(a => a.status === 'present').length;
      const absentCount = filteredAttendance.filter(a => a.status === 'absent').length;
      const leaveCount = filteredAttendance.filter(a => a.status === 'leave').length;
      const attendanceRate = totalAttendance > 0 
        ? ((presentCount / totalAttendance) * 100).toFixed(1)
        : "0.0";
      
      const totalLeaveRequests = filteredLeaves.length;
      const pendingLeaves = filteredLeaves.filter(l => l.status === 'pending').length;
      const approvedLeaves = filteredLeaves.filter(l => l.status === 'approved').length;
      const rejectedLeaves = filteredLeaves.filter(l => l.status === 'rejected').length;
      
      // Today's attendance
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = filteredAttendance.filter(a => {
        const attDate = new Date(a.date).toISOString().split('T')[0];
        return attDate === today;
      });
      const todayPresent = todayAttendance.filter(a => a.status === 'present').length;
      const todayAbsent = todayAttendance.filter(a => a.status === 'absent').length;
      const todayLeave = todayAttendance.filter(a => a.status === 'leave').length;
      
      // This month's attendance
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthAttendance = filteredAttendance.filter(a => {
        const date = new Date(a.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
      const monthPresent = monthAttendance.filter(a => a.status === 'present').length;
      const monthAbsent = monthAttendance.filter(a => a.status === 'absent').length;
      const monthLeave = monthAttendance.filter(a => a.status === 'leave').length;
      
      // Role distribution (admin/head only)
      let roleDistribution = null;
      if (userRole === 'admin' || userRole === 'head') {
        roleDistribution = {
          head: allUsers.filter(u => u.role === 'head').length,
          admin: allUsers.filter(u => u.role === 'admin').length,
          mazer: allUsers.filter(u => u.role === 'mazer').length,
          assistant: allUsers.filter(u => u.role === 'assistant').length,
          teacher: allUsers.filter(u => u.role === 'teacher').length,
          staff: allUsers.filter(u => u.role === 'staff').length
        };
      }
      
      res.json({
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          byRole: roleDistribution
        },
        attendance: {
          total: totalAttendance,
          present: presentCount,
          absent: absentCount,
          leave: leaveCount,
          rate: parseFloat(attendanceRate)
        },
        leaves: {
          total: totalLeaveRequests,
          pending: pendingLeaves,
          approved: approvedLeaves,
          rejected: rejectedLeaves
        },
        today: {
          total: todayAttendance.length,
          present: todayPresent,
          absent: todayAbsent,
          leave: todayLeave
        },
        thisMonth: {
          total: monthAttendance.length,
          present: monthPresent,
          absent: monthAbsent,
          leave: monthLeave
        }
      });
    } catch (error) {
      console.error("Dashboard metrics error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // PowerBI Integration - Get all attendance records (admin/head only)
  app.get("/api/powerbi/attendance", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      
      // Only admin/head can access PowerBI data
      if (session.userRole !== 'admin' && session.userRole !== 'head') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const allAttendance = await storage.getAllAttendance();
      const allUsers = await storage.getAllUsers();
      
      // Create a map for quick user lookup
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      
      // Enrich attendance data with user details
      const enrichedData = allAttendance.map(att => {
        const user = userMap.get(att.userId);
        const markedByUser = att.markedBy ? userMap.get(att.markedBy) : null;
        
        return {
          id: att.id,
          date: att.date,
          status: att.status,
          markedAt: att.markedAt,
          userId: att.userId,
          userName: user?.name || 'Unknown',
          userRole: user?.role || 'Unknown',
          userUniqueId: user?.uniqueId || 'Unknown',
          markedBy: att.markedBy,
          markedByName: markedByUser?.name || null,
          markedByRole: markedByUser?.role || null
        };
      });
      
      res.json({
        totalRecords: enrichedData.length,
        data: enrichedData
      });
    } catch (error) {
      console.error("PowerBI attendance error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // PowerBI Integration - Get all leave requests (admin/head only)
  app.get("/api/powerbi/leaves", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      
      // Only admin/head can access PowerBI data
      if (session.userRole !== 'admin' && session.userRole !== 'head') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const allLeaves = await storage.getAllLeaveRequests();
      const allUsers = await storage.getAllUsers();
      
      // Create a map for quick user lookup
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      
      // Enrich leave data with user details
      const enrichedData = allLeaves.map(leave => {
        const user = userMap.get(leave.userId);
        const respondedByUser = leave.respondedBy ? userMap.get(leave.respondedBy) : null;
        
        // Calculate duration
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        return {
          id: leave.id,
          userId: leave.userId,
          userName: user?.name || 'Unknown',
          userRole: user?.role || 'Unknown',
          userUniqueId: user?.uniqueId || 'Unknown',
          startDate: leave.startDate,
          endDate: leave.endDate,
          duration: duration,
          reason: leave.reason,
          status: leave.status,
          submittedAt: leave.submittedAt,
          respondedAt: leave.respondedAt,
          respondedBy: leave.respondedBy,
          respondedByName: respondedByUser?.name || null,
          respondedByRole: respondedByUser?.role || null,
          rejectionReason: leave.rejectionReason
        };
      });
      
      res.json({
        totalRecords: enrichedData.length,
        data: enrichedData
      });
    } catch (error) {
      console.error("PowerBI leaves error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // PowerBI Integration - Get all users (admin/head only)
  app.get("/api/powerbi/users", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      
      // Only admin/head can access PowerBI data
      if (session.userRole !== 'admin' && session.userRole !== 'head') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const allUsers = await storage.getAllUsers();
      
      // Remove sensitive data (password)
      const sanitizedUsers = allUsers.map(user => ({
        id: user.id,
        uniqueId: user.uniqueId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        status: user.status,
        hireDate: user.hireDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));
      
      res.json({
        totalRecords: sanitizedUsers.length,
        data: sanitizedUsers
      });
    } catch (error) {
      console.error("PowerBI users error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ ANALYTICS ENDPOINTS ============
  
  // Get attendance summary statistics
  app.get("/api/analytics/attendance-summary", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const { startDate, endDate, userId } = req.query;
      
      // Role-based access control
      let targetUserId = userId ? parseInt(userId as string) : null;
      
      // Teachers/staff can only view their own data
      if (session.userRole === 'teacher' || session.userRole === 'staff') {
        targetUserId = session.userId;
      }
      
      const allAttendance = await storage.getAllAttendance();
      
      // Filter by date range if provided
      let filteredAttendance = allAttendance;
      if (startDate) {
        filteredAttendance = filteredAttendance.filter(a => 
          new Date(a.date) >= new Date(startDate as string)
        );
      }
      if (endDate) {
        filteredAttendance = filteredAttendance.filter(a => 
          new Date(a.date) <= new Date(endDate as string)
        );
      }
      if (targetUserId) {
        filteredAttendance = filteredAttendance.filter(a => a.userId === targetUserId);
      }
      
      // Calculate statistics
      const totalDays = filteredAttendance.length;
      const presentDays = filteredAttendance.filter(a => a.status === 'present').length;
      const absentDays = filteredAttendance.filter(a => a.status === 'absent').length;
      const leaveDays = filteredAttendance.filter(a => a.status === 'leave').length;
      const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : "0.0";
      
      res.json({
        totalDays,
        presentDays,
        absentDays,
        leaveDays,
        attendanceRate: parseFloat(attendanceRate)
      });
    } catch (error) {
      console.error("Analytics attendance-summary error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get leave request statistics
  app.get("/api/analytics/leave-statistics", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const { startDate, endDate } = req.query;
      
      const allLeaves = await storage.getAllLeaveRequests();
      
      // Filter by date range if provided
      let filteredLeaves = allLeaves;
      if (startDate) {
        filteredLeaves = filteredLeaves.filter(l => 
          new Date(l.startDate) >= new Date(startDate as string)
        );
      }
      if (endDate) {
        filteredLeaves = filteredLeaves.filter(l => 
          new Date(l.endDate) <= new Date(endDate as string)
        );
      }
      
      // Teachers/staff can only view their own data
      if (session.userRole === 'teacher' || session.userRole === 'staff') {
        filteredLeaves = filteredLeaves.filter(l => l.userId === session.userId);
      }
      
      // Calculate statistics
      const totalRequests = filteredLeaves.length;
      const pendingRequests = filteredLeaves.filter(l => l.status === 'pending').length;
      const approvedRequests = filteredLeaves.filter(l => l.status === 'approved').length;
      const rejectedRequests = filteredLeaves.filter(l => l.status === 'rejected').length;
      
      // Calculate average leave days
      const totalDays = filteredLeaves.reduce((sum, leave) => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return sum + days;
      }, 0);
      const averageDays = totalRequests > 0 ? (totalDays / totalRequests).toFixed(1) : "0.0";
      
      res.json({
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        totalDays,
        averageDays: parseFloat(averageDays)
      });
    } catch (error) {
      console.error("Analytics leave-statistics error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get department overview statistics
  app.get("/api/analytics/department-overview", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      
      // Only admin/head can view department overview
      if (session.userRole !== 'admin' && session.userRole !== 'head') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const allUsers = await storage.getAllUsers();
      
      // Count by role
      const roleDistribution = {
        head: allUsers.filter(u => u.role === 'head').length,
        admin: allUsers.filter(u => u.role === 'admin').length,
        mazer: allUsers.filter(u => u.role === 'mazer').length,
        assistant: allUsers.filter(u => u.role === 'assistant').length,
        teacher: allUsers.filter(u => u.role === 'teacher').length,
        staff: allUsers.filter(u => u.role === 'staff').length
      };
      
      // Count by status
      const statusDistribution = {
        active: allUsers.filter(u => u.status === 'active').length,
        inactive: allUsers.filter(u => u.status === 'inactive').length
      };
      
      res.json({
        totalUsers: allUsers.length,
        roleDistribution,
        statusDistribution
      });
    } catch (error) {
      console.error("Analytics department-overview error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get monthly trends
  app.get("/api/analytics/monthly-trends", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const { year } = req.query;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      // Only admin/head/mazer/assistant can view trends
      if (!['admin', 'head', 'mazer', 'assistant'].includes(session.userRole)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const allAttendance = await storage.getAllAttendance();
      const allLeaves = await storage.getAllLeaveRequests();
      
      // Initialize monthly data
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(targetYear, i).toLocaleString('default', { month: 'short' }),
        attendance: 0,
        leaves: 0,
        present: 0,
        absent: 0
      }));
      
      // Aggregate attendance by month
      allAttendance.forEach(a => {
        const date = new Date(a.date);
        if (date.getFullYear() === targetYear) {
          const monthIndex = date.getMonth();
          monthlyData[monthIndex].attendance++;
          if (a.status === 'present') monthlyData[monthIndex].present++;
          if (a.status === 'absent') monthlyData[monthIndex].absent++;
        }
      });
      
      // Aggregate leaves by month
      allLeaves.forEach(l => {
        const date = new Date(l.startDate);
        if (date.getFullYear() === targetYear && l.status === 'approved') {
          const monthIndex = date.getMonth();
          monthlyData[monthIndex].leaves++;
        }
      });
      
      res.json({
        year: targetYear,
        monthlyData
      });
    } catch (error) {
      console.error("Analytics monthly-trends error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get user list for analytics filters
  app.get("/api/analytics/users", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      
      // Only admin/head can view all users
      if (session.userRole !== 'admin' && session.userRole !== 'head') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const allUsers = await storage.getAllUsers();
      
      // Return simplified user list
      const userList = allUsers.map(u => ({
        id: u.id,
        uniqueId: u.uniqueId,
        name: u.name,
        role: u.role,
        status: u.status
      }));
      
      res.json(userList);
    } catch (error) {
      console.error("Analytics users error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ========================================
  // ADMIN MANAGEMENT ROUTES (BRD-aligned)
  // ========================================

  // Department Management
  app.get("/api/departments", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const departments = await storage.getAllDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/departments", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const departmentData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(departmentData);
      res.json(department);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error: (error as Error).message });
    }
  });

  app.put("/api/departments/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      const updated = await storage.updateDepartment(id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Failed to update department" });
    }
  });

  app.delete("/api/departments/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteDepartment(id);
      res.json({ message: "Department deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete department" });
    }
  });

  // Major Management
  app.get("/api/majors", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const majors = await storage.getAllMajors();
      res.json(majors);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/majors", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const majorData = insertMajorSchema.parse(req.body);
      const major = await storage.createMajor(majorData);
      res.json(major);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error: (error as Error).message });
    }
  });

  app.put("/api/majors/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      const updated = await storage.updateMajor(id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Failed to update major" });
    }
  });

  app.delete("/api/majors/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteMajor(id);
      res.json({ message: "Major deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete major" });
    }
  });

  // Class Management
  app.get("/api/classes", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const classes = await storage.getAllClasses();
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/classes", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const classData = insertClassSchema.parse(req.body);
      const classObj = await storage.createClass(classData);
      res.json(classObj);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error: (error as Error).message });
    }
  });

  app.put("/api/classes/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      const updated = await storage.updateClass(id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Failed to update class" });
    }
  });

  app.delete("/api/classes/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteClass(id);
      res.json({ message: "Class deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete class" });
    }
  });

  // Subject Management
  app.get("/api/subjects", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const subjects = await storage.getAllSubjects();
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/subjects", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const subjectData = insertSubjectSchema.parse(req.body);
      const subject = await storage.createSubject(subjectData);
      res.json(subject);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error: (error as Error).message });
    }
  });

  app.put("/api/subjects/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      const updated = await storage.updateSubject(id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Failed to update subject" });
    }
  });

  app.delete("/api/subjects/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteSubject(id);
      res.json({ message: "Subject deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete subject" });
    }
  });

  // Semester Management
  app.get("/api/semesters", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const semesters = await storage.getAllSemesters();
      res.json(semesters);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/semesters", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const semesterData = insertSemesterSchema.parse(req.body);
      const semester = await storage.createSemester(semesterData);
      res.json(semester);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error: (error as Error).message });
    }
  });

  app.put("/api/semesters/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      const updated = await storage.updateSemester(id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Failed to update semester" });
    }
  });

  app.delete("/api/semesters/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteSemester(id);
      res.json({ message: "Semester deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete semester" });
    }
  });

  // Class Moderator Assignment
  app.get("/api/class-moderators", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const moderators = await storage.getAllClassModerators();
      res.json(moderators);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/class-moderators", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const moderator = await storage.createClassModerator(req.body);
      res.json(moderator);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error: (error as Error).message });
    }
  });

  app.delete("/api/class-moderators/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteClassModerator(id);
      res.json({ message: "Class moderator removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove class moderator" });
    }
  });

  // ========================================
  // END ADMIN MANAGEMENT ROUTES
  // ========================================

  // Catch-all route for debugging
  app.all("/api/*", (req, res) => {
    console.log("=== CATCH-ALL DEBUG ===");
    console.log("Method:", req.method);
    console.log("URL:", req.url);
    console.log("Path:", req.path);
    console.log("Body:", req.body);
    console.log("Headers:", req.headers);
    console.log("=== END CATCH-ALL DEBUG ===");
    res.status(404).json({ message: "API endpoint not found", path: req.path });
  });

  const httpServer = createServer(app);
  return httpServer;
}
