import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { 
  loginSchema, 
  insertUserSchema, 
  markAttendanceSchema,
  insertLeaveRequestSchema,
  respondLeaveRequestSchema
} from "@shared/schema";

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
      const { uniqueId, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUniqueId(uniqueId);
      if (!user || user.password !== password) {
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
      res.status(400).json({ message: "Invalid request data" });
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

  // Attendance routes
  app.get("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const attendance = await storage.getAttendance(userId);
      
      // Get user details for each attendance record
      const attendanceWithUsers = await Promise.all(
        attendance.map(async (att) => {
          const user = await storage.getUser(att.userId);
          return { ...att, user };
        })
      );
      
      res.json(attendanceWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/attendance-all", requireAuth, async (req, res) => {
    try {
      // Only head and admin can view all attendance
      if (!['head', 'admin'].includes((req.session as any).userRole)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const attendance = await storage.getAllAttendance();
      
      // Get user details for each attendance record
      const attendanceWithUsers = await Promise.all(
        attendance.map(async (att) => {
          const user = await storage.getUser(att.userId);
          return { ...att, user };
        })
      );
      
      res.json(attendanceWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/attendance-today", requireAuth, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendance = await storage.getAttendanceByDate(today);
      const allUsers = await storage.getAllUsers();
      
      // Create a map of today's attendance
      const attendanceMap = new Map();
      attendance.forEach(att => {
        attendanceMap.set(att.userId, att);
      });
      
      // Get users based on role
      let relevantUsers = allUsers;
      if ((req.session as any).userRole === 'mazer') {
        relevantUsers = allUsers.filter(user => user.role === 'teacher');
      } else if ((req.session as any).userRole === 'assistant') {
        relevantUsers = allUsers.filter(user => user.role === 'staff');
      }
      
      // Combine user info with attendance status
      const todaySchedule = relevantUsers.map(user => ({
        ...user,
        attendance: attendanceMap.get(user.id) || null
      }));
      
      res.json(todaySchedule);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/mark-attendance", requireAuth, async (req, res) => {
    try {
      const { userId, date, status } = markAttendanceSchema.parse(req.body);
      
      // Check if user can mark attendance
      if (!['mazer', 'assistant'].includes((req.session as any).userRole)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Check if attendance already marked for this user and date
      const existingAttendance = await storage.getAttendanceByDate(date);
      const alreadyMarked = existingAttendance.find(att => att.userId === userId);
      
      if (alreadyMarked) {
        return res.status(400).json({ message: "Attendance already marked for this date" });
      }
      
      const now = new Date();
      const markedAt = now.toTimeString().slice(0, 5); // HH:MM format
      
      const attendance = await storage.markAttendance({
        userId,
        date,
        status,
        markedAt,
        markedBy: (req.session as any).userId
      });
      
      res.json(attendance);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Department-specific routes for Head dashboard
  app.get("/api/attendance-by-department", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'head') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { department } = req.query;
      const attendanceData = await storage.getAttendanceByDepartment(department as string);
      res.json(attendanceData);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/department-summary", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'head') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const summary = await storage.getDepartmentSummary();
      res.json(summary);
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
        userId: (req.session as any).userId
      });
      
      res.json(leaveRequest);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.get("/api/leave-requests", requireAuth, async (req, res) => {
    try {
      let requests;
      
      if ((req.session as any).userRole === 'head') {
        // Head can see all pending requests
        requests = await storage.getPendingLeaveRequests();
      } else {
        // Others can only see their own requests
        requests = await storage.getLeaveRequests((req.session as any).userId);
      }
      
      // Get user details for each request
      const requestsWithUsers = await Promise.all(
        requests.map(async (req) => {
          const user = await storage.getUser(req.userId);
          return { ...req, user };
        })
      );
      
      res.json(requestsWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/leave-requests/respond", requireAuth, async (req, res) => {
    try {
      // Only head can respond to leave requests
      if ((req.session as any).userRole !== 'head') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { requestId, status } = respondLeaveRequestSchema.parse(req.body);
      
      const updatedRequest = await storage.updateLeaveRequest(requestId, {
        status,
        respondedAt: new Date().toISOString(),
        respondedBy: (req.session as any).userId
      });
      
      if (!updatedRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // User management routes (Admin only)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/user", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const userData = insertUserSchema.parse(req.body);
      
      // Check if uniqueId already exists
      const existingUser = await storage.getUserByUniqueId(userData.uniqueId);
      if (existingUser) {
        return res.status(400).json({ message: "User ID already exists" });
      }
      
      const user = await storage.createUser(userData);
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
      const updates = req.body;
      
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

  const httpServer = createServer(app);
  return httpServer;
}
