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
  bulkScheduleSchema,
  insertDepartmentSchema,
  insertMajorSchema,
  insertClassSchema,
  insertSubjectSchema
} from "@shared/schema";

// Note: Multer is not available in this environment
// For real file uploads, install multer: npm install multer @types/multer

export async function registerRoutes(app: Express): Promise<Server> {
  // Debug: inspect storage object to ensure methods exist
  try {
    console.log("[Startup] storage.constructor.name:", (storage as any)?.constructor?.name);
    console.log("[Startup] storage prototype methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(storage)).slice(0,50));
  } catch (err) {
    console.error("[Startup] Failed to inspect storage:", err);
  }
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
      
      console.log("📋 [Leave Requests API] Request from:", { userId: currentUserId, role: userRole });
      
      let leaveRequests;
      if (userRole === 'admin') {
        leaveRequests = await storage.getLeaveRequests();
        console.log("📋 [Admin] All leave requests:", leaveRequests.length);
      } else if (userRole === 'head') {
        leaveRequests = await storage.getLeaveRequests();
        console.log("📋 [Head] Total leave requests in system:", leaveRequests.length);
        
        const currentUser = await storage.getUser(currentUserId);
        console.log("👤 [Head] Current user:", { id: currentUser?.id, name: currentUser?.name, departmentId: currentUser?.departmentId });
        
        if (currentUser?.departmentId) {
          const allUsers = await storage.getAllUsers();
          const departmentUserIds = allUsers
            .filter(u => u.departmentId === currentUser.departmentId)
            .map(u => u.id);
          
          console.log("🏢 [Head] Department user IDs:", departmentUserIds);
          console.log("📝 [Head] Leave request user IDs:", leaveRequests.map(r => r.userId));
          
          leaveRequests = leaveRequests.filter(req => departmentUserIds.includes(req.userId));
          console.log("✅ [Head] Filtered leave requests:", leaveRequests.length);
        } else {
          console.log("⚠️ [Head] No departmentId found for current user");
        }
      } else {
        leaveRequests = await storage.getLeaveRequests(currentUserId);
      }

      const leaveRequestsWithUsers = await Promise.all(
        leaveRequests.map(async (request) => {
          const user = await storage.getUser(request.userId);
          console.log(`👥 [Enriching] Leave request ${request.id} -> User:`, { id: user?.id, name: user?.name, role: user?.role, departmentId: user?.departmentId });
          return { ...request, user };
        })
      );

      console.log("📤 [Response] Sending leave requests:", leaveRequestsWithUsers.length);
      res.json(leaveRequestsWithUsers);
    } catch (error) {
      console.error("❌ [Error] Leave requests API:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/leave-requests/respond", requireAuth, async (req, res) => {
    try {
      console.log("📝 [Leave Respond] Request body:", req.body);
      console.log("📝 [Leave Respond] Session:", { userId: (req.session as any).userId, role: (req.session as any).userRole });
      
      const { requestId, status, rejectionReason } = respondLeaveRequestSchema.parse(req.body);
      
      const userRole = (req.session as any).userRole;
      const currentUserId = (req.session as any).userId;
      
      if (userRole !== 'head' && userRole !== 'admin') {
        console.log("❌ [Leave Respond] Unauthorized role:", userRole);
        return res.status(403).json({ message: "Only Head of Department can approve/reject leave requests" });
      }

      const allLeaveRequests = await storage.getLeaveRequests();
      const leaveRequest = allLeaveRequests.find(r => r.id === requestId);
      
      if (!leaveRequest) {
        console.log("❌ [Leave Respond] Leave request not found:", requestId);
        return res.status(404).json({ message: "Leave request not found" });
      }
      
      console.log("📋 [Leave Respond] Leave request:", leaveRequest);

      if (userRole === 'head') {
        const currentUser = await storage.getUser(currentUserId);
        const requestUser = await storage.getUser(leaveRequest.userId);
        
        console.log("👤 [Leave Respond] Current user department:", currentUser?.departmentId);
        console.log("👤 [Leave Respond] Request user department:", requestUser?.departmentId);
        
        if (currentUser?.departmentId !== requestUser?.departmentId) {
          console.log("❌ [Leave Respond] Department mismatch");
          return res.status(403).json({ message: "You can only respond to leave requests from your department" });
        }
      }

      const updates: Partial<any> = {
        status,
        respondedAt: new Date(),
        respondedBy: currentUserId,
      };

      if (status === 'rejected' && rejectionReason) {
        updates.rejectionReason = rejectionReason;
      }

      console.log("📝 [Leave Respond] Updating with:", updates);

      const updatedRequest = await storage.updateLeaveRequest(requestId, updates);
      if (!updatedRequest) {
        console.log("❌ [Leave Respond] Update failed");
        return res.status(404).json({ message: "Failed to update leave request" });
      }

      console.log("✅ [Leave Respond] Updated successfully");

      if (status === 'approved') {
        const startDate = new Date(updatedRequest.startDate);
        const endDate = new Date(updatedRequest.endDate);
        
        console.log("📅 [Leave Respond] Creating attendance records from", startDate, "to", endDate);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          await storage.markAttendance({
            userId: updatedRequest.userId,
            date: dateStr,
            status: 'leave',
            isLate: 0,
            markedAt: new Date(),
            markedBy: currentUserId,
          });
        }
        
        console.log("✅ [Leave Respond] Attendance records created");
      }

      res.json(updatedRequest);
    } catch (error) {
      console.error("❌ [Leave Respond] Error:", error);
      if (error instanceof Error) {
        console.error("❌ [Leave Respond] Error message:", error.message);
        console.error("❌ [Leave Respond] Error stack:", error.stack);
      }
      res.status(500).json({ message: "Server error", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Attendance routes
  app.get("/api/my-attendance", requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.session as any).userId;
      const attendance = await storage.getAttendance(currentUserId);

      const enriched = await Promise.all(attendance.map(async (att) => {
        const enrichedAtt: any = { ...att };
        if (att.scheduleId) {
          const sched = await storage.getScheduleById(att.scheduleId);
          if (sched) {
            const subject = await storage.getSubjectById(sched.subjectId).catch(() => undefined);
            const classInfo = await storage.getClassById ? await (storage as any).getClassById(sched.classId).catch(() => undefined) : undefined;
            enrichedAtt.schedule = { ...sched, subject, classInfo };
          }
        }
        if (att.markedBy) {
          const marker = await storage.getUser(att.markedBy).catch(() => undefined);
          enrichedAtt.markedByName = marker ? marker.name : undefined;
        }
        return enrichedAtt;
      }));

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // HEAD ATTENDANCE ENDPOINT - CORRECTED LOGIC
  app.get("/api/head/attendance", requireAuth, async (req, res) => {
  try {
    const userRole = (req.session as any).userRole;
    const currentUserId = (req.session as any).userId;
    
    if (!['head', 'admin'].includes(userRole)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const currentUser = await storage.getUser(currentUserId);
    if (userRole === 'head' && !currentUser?.departmentId) {
      return res.status(400).json({ message: "User department not found" });
    }

    const { startDate, endDate, role: qRole, class: qClass, status: qStatus } = req.query as any;
    const start = startDate ? new Date(startDate) : new Date("2000-01-01");
    const end = endDate ? new Date(endDate) : new Date("2099-12-31");

    const allUsers = await storage.getAllUsers();
    const allAttendance = await storage.getAllAttendance();
    const allLeaveRequests = await storage.getLeaveRequests();
    const approvedLeaves = allLeaveRequests.filter(lr => lr.status === 'approved');
    const allClasses = await storage.getAllClasses();
    const allMajors = await storage.getAllMajors();
    const allSchedules = await storage.getAllSchedules();

    // ✅ Filter for ACTIVE classes only
    const activeClasses = allClasses.filter(cls => cls.isActive === 1);
    const activeClassIds = activeClasses.map(cls => cls.id);

    const majorMap = new Map(allMajors.map(m => [m.id, m]));
    const classById = new Map(activeClasses.map(cls => [cls.id, cls]));

    const buildClassLabel = (cls: any) => {
      if (!cls) return null;
      const major = majorMap.get(cls.majorId);
      const majorShort = major?.shortName || major?.name || 'Unknown';
      return `${majorShort} Y${cls.year}S${cls.semester}${cls.group ? ' ' + cls.group : ''}`;
    };

    const departmentMajorIds = userRole === 'admin' 
      ? allMajors.map(m => m.id)
      : allMajors.filter(m => m.departmentId === currentUser.departmentId).map(m => m.id);
    
    // ✅ Only active classes
    const departmentClassIds = activeClasses
      .filter(c => departmentMajorIds.includes(c.majorId))
      .map(c => c.id);

    // ✅ Filter schedules for active classes
    const activeSchedules = allSchedules.filter(s => activeClassIds.includes(s.classId));

    // Teacher attendance
    const teacherAttendance = allAttendance.filter(a => {
      const u = allUsers.find(uu => uu.id === a.userId);
      if (!u || u.role !== 'teacher') return false;
      
      const teacherSchedules = activeSchedules.filter(s => s.teacherId === a.userId);
      const hasDeptSchedule = teacherSchedules.some(s => departmentClassIds.includes(s.classId));
      
      return hasDeptSchedule;
    });

    const teacherEntries = teacherAttendance.map(a => {
      const user = allUsers.find(u => u.id === a.userId);
      const teacherSchedules = activeSchedules.filter(s => 
        s.teacherId === a.userId && 
        departmentClassIds.includes(s.classId)
      );
      
      const classSchedule = teacherSchedules.length > 0 ? teacherSchedules[0] : null;
      const classLabel = classSchedule ? buildClassLabel(classById.get(classSchedule.classId)) : null;

      return {
        id: a.id,
        userId: a.userId,
        date: a.date,
        status: a.status,
        markedBy: a.markedBy,
        markedAt: a.markedAt,
        user,
        classId: classSchedule?.classId || null,
        classLabel,
        schedule: classSchedule,
        scheduleId: classSchedule?.id || null
      };
    });

    // Staff attendance
    const departmentStaff = userRole === 'admin'
      ? allUsers.filter(u => u.role === 'staff')
      : allUsers.filter(u => u.role === 'staff' && u.departmentId === currentUser.departmentId);

    const staffAttendance = allAttendance.filter(a => {
      const u = allUsers.find(uu => uu.id === a.userId);
      if (!u || u.role !== 'staff') return false;
      if (!departmentStaff.some(ds => ds.id === u.id)) return false;
      if (startDate && endDate) {
        return new Date(a.date) >= start && new Date(a.date) <= end;
      }
      return true;
    });

    const staffLeaves = approvedLeaves.filter(l => {
      const u = allUsers.find(uu => uu.id === l.userId);
      if (!u || u.role !== 'staff') return false;
      if (!departmentStaff.some(ds => ds.id === u.id)) return false;
      if (startDate && endDate) {
        return new Date(l.startDate) <= end && new Date(l.endDate) >= start;
      }
      return true;
    });

    const attendance: any[] = [];
    attendance.push(...teacherEntries);
    attendance.push(...staffAttendance.map(a => {
      const user = allUsers.find(u => u.id === a.userId);
      return {
        ...a,
        user,
        classId: null,
        classLabel: null
      };
    }));

    for (const leave of staffLeaves) {
      const dateStr = leave.startDate;
      if (startDate && endDate && (new Date(dateStr) < start || new Date(dateStr) > end)) continue;
      const hasExisting = attendance.find(a => a.userId === leave.userId && a.date === dateStr);
      if (!hasExisting) {
        const user = allUsers.find(u => u.id === leave.userId);
        attendance.push({
          id: `leave-${leave.id}`,
          userId: leave.userId,
          date: dateStr,
          status: 'leave',
          markedBy: leave.respondedBy,
          markedAt: leave.respondedAt || leave.submittedAt,
          user,
          classId: null,
          classLabel: null
        });
      }
    }

    // Apply filters
    const filtered = attendance.filter(rec => {
      if (startDate && endDate) {
        const recDate = new Date(rec.date);
        if (recDate < start || recDate > end) return false;
      }
      if (qRole && qRole !== 'all' && rec.user?.role !== qRole) return false;
      if (qStatus && qStatus !== 'all' && rec.status !== qStatus) return false;
      if (qClass && qClass !== 'all') {
        if (typeof qClass === 'string' && qClass.match(/^\d+$/)) {
          if (rec.classId !== parseInt(qClass)) return false;
        } else {
          if (rec.classLabel !== qClass) return false;
        }
      }
      return true;
    });

    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (a.user?.name || '').localeCompare(b.user?.name || ''));

    res.json(filtered);
  } catch (error) {
    console.error("Head attendance endpoint error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

  app.get("/api/my-class-status", requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    const userRole = (req.session as any).userRole;
    
    if (userRole !== 'class_moderator' && userRole !== 'moderator') {
      return res.status(403).json({ message: "Only class moderators can check class status" });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user?.classId) {
      return res.json({ 
        hasClass: false, 
        isActive: false,
        message: "No class assigned" 
      });
    }
    
    const classObj = await storage.getClassById(user.classId);
    
    if (!classObj) {
      return res.json({ 
        hasClass: false, 
        isActive: false,
        message: "Class not found" 
      });
    }
    
    return res.json({ 
      hasClass: true, 
      isActive: classObj.isActive === 1,
      classInfo: {
        id: classObj.id,
        name: classObj.name,
        isActive: classObj.isActive
      },
      message: classObj.isActive === 1 
        ? "Class is active" 
        : "Class is inactive - you cannot mark attendance"
    });
  } catch (error) {
    console.error("Check class status error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

  app.get("/api/classes/active", requireAuth, async (req, res) => {
  try {
    const userRole = (req.session as any).userRole;
    
    if (!['admin', 'head'].includes(userRole)) {
      return res.status(403).json({ message: "Admin or Head access required" });
    }

    const allClasses = await storage.getAllClasses();
    
    // ✅ Return only active classes
    const activeClasses = allClasses.filter(cls => cls.isActive === 1);

    // Get majors to build full names
    const majors = await storage.getAllMajors();
    const majorMap = new Map(majors.map(m => [m.id, m]));

    const classesWithFullName = activeClasses.map(cls => {
      const major = majorMap.get(cls.majorId);
      const majorShort = major?.shortName || major?.name || 'Unknown';
      const majorFull = major?.name || 'Unknown';
      const groupStr = (cls as any).group ? ` ${(cls as any).group}` : '';

      const classLabel = `${majorShort} Y${cls.year}S${cls.semester}${groupStr}`;
      const yearText = `Year ${cls.year}`;
      const semesterText = `Semester ${cls.semester}`;
      const groupText = (cls as any).group || '';
      const displayClassName = `${majorFull} - ${yearText} - ${semesterText}${groupText ? ' - Group ' + groupText : ''}`;

      return {
        ...cls,
        classLabel,
        fullClassName: classLabel,
        displayClassName,
        majorShort
      };
    });

    res.json(classesWithFullName);
  } catch (error) {
    console.error("Get active classes error:", error);
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

      if (!["class_moderator", "moderator", "hr_assistant", "hr_backup"].includes(userRole)) {
        return res.status(403).json({ 
          message: "Only Class Moderators or HR can mark attendance" 
        });
      }

      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const canMark = 
        (["class_moderator", "moderator"].includes(userRole) && targetUser.role === "teacher") ||
        (["hr_assistant", "hr_backup"].includes(userRole) && targetUser.role === "staff");

      if (!canMark) {
        return res.status(403).json({ 
          message: ["class_moderator", "moderator"].includes(userRole)
            ? "Class Moderators can only mark teachers' attendance" 
            : "HR can only mark staff attendance"
        });
      }

      let isLate = false;
      if (targetUser.schedule && status === "present") {
        const scheduleStart = targetUser.schedule.split('-')[0];
        const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5);
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

  app.get("/api/attendance-today", requireAuth, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [allUsers, todaysAttendance, allLeaveRequests] = await Promise.all([
        storage.getAllUsers(),
        storage.getAttendanceByDate(today),
        storage.getLeaveRequests(),
      ]);

      const attendanceByUser = new Map<number, any>();
      for (const att of todaysAttendance) {
        attendanceByUser.set(att.userId, att);
      }

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
        const { password, ...userWithoutPassword } = u as any;

        let att = attendanceByUser.get(u.id) || null;

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

  app.get("/api/staff-attendance", requireAuth, async (req, res) => {
    try {
      const userRole = (req.session as any).userRole;
      
      if (!['hr_assistant', 'hr_backup'].includes(userRole)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const today = new Date().toISOString().split('T')[0];

      const allUsers = await storage.getAllUsers();
      const staffUsers = allUsers.filter(u => u.role === 'staff');

      const todaysAttendance = await storage.getAttendanceByDate(today);
      const staffAttendanceMap = new Map<number, any>();
      
      for (const att of todaysAttendance) {
        const user = staffUsers.find(u => u.id === att.userId);
        if (user) {
          staffAttendanceMap.set(att.userId, att);
        }
      }

      const result = await Promise.all(staffUsers.map(async (staff) => {
        const attendance = staffAttendanceMap.get(staff.id);
        
        let status = 'pending';
        let markedAt = null;
        let markedByName = null;
        
        if (attendance) {
          status = attendance.status;
          markedAt = attendance.markedAt;
          
          if (attendance.markedBy) {
            const marker = await storage.getUser(attendance.markedBy).catch(() => null);
            markedByName = marker ? marker.name : null;
          }
        }

        return {
          id: staff.id,
          name: staff.name,
          uniqueId: staff.uniqueId,
          status,
          markedAt,
          markedByName
        };
      }));

      res.json(result);
    } catch (error) {
      console.error("Staff attendance endpoint error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // User management routes
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const userRole = (req.session as any).userRole;
      const currentUserId = (req.session as any).userId;
      
      console.log("📋 [Users API] Request from:", { userId: currentUserId, role: userRole });
      
      let users;
      if (userRole === 'admin') {
        users = await storage.getAllUsers();
        console.log("📋 [Admin] All users:", users.length);
      } else if (userRole === 'head') {
        const currentUser = await storage.getUser(currentUserId);
        console.log("👤 [Head] Current user:", { id: currentUser?.id, name: currentUser?.name, departmentId: currentUser?.departmentId });
        
        if (currentUser?.departmentId) {
          const allUsers = await storage.getAllUsers();
          users = allUsers.filter(u => u.departmentId === currentUser.departmentId);
          console.log("🏢 [Head] Department users:", users.length, "out of", allUsers.length);
        } else {
          console.log("⚠️ [Head] No departmentId found");
          users = [];
        }
      } else {
        console.log("❌ [Forbidden] Role not authorized:", userRole);
        return res.status(403).json({ message: "Forbidden" });
      }
      
      console.log("📤 [Response] Sending users:", users.length);
      res.json(users);
    } catch (error) {
      console.error("❌ [Error] Users API:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const userData = insertUserSchema.parse(req.body);
      
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

  app.post("/api/test", (req, res) => {
    console.log("=== TEST ENDPOINT DEBUG ===");
    console.log("Test endpoint hit at:", new Date().toISOString());
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);
    res.json({ message: "Test endpoint working", body: req.body });
  });

  // Schedule management routes
  app.get("/api/schedules", requireAuth, async (req, res) => {
  try {
    console.log("=== SCHEDULE GET DEBUG ===");
    console.log("User role:", (req.session as any).userRole);
    console.log("User ID:", (req.session as any).userId);
    console.log("Query params:", req.query);
    
    const userRole = (req.session as any).userRole;
    const userId = (req.session as any).userId;
    
    if (!['head', 'admin', 'mazer', 'class_moderator', 'moderator'].includes(userRole)) {
      console.log("Access denied: User role not allowed");
      return res.status(403).json({ message: "Forbidden - Admin, Head, or Moderator access required" });
    }

    const { day, major } = req.query;
    let schedules;

    // ✅ LOAD ALL CLASSES FIRST (to check isActive)
    const allClasses = await storage.getAllClasses();
    const activeClassIds = allClasses
      .filter(cls => cls.isActive === 1) // Only active classes
      .map(cls => cls.id);

    if (userRole === 'class_moderator' || userRole === 'moderator') {
      const assignedClasses = await storage.getClassModeratorsByUser(userId);
      const classIds = assignedClasses.map(cm => cm.classId);
      
      console.log("Moderator assigned class IDs:", classIds);
      
      if (classIds.length === 0) {
        return res.json([]);
      }
      
      const allSchedules = await storage.getAllSchedules();
      
      // ✅ FILTER: Only schedules from assigned classes that are ACTIVE
      schedules = allSchedules.filter(schedule => 
        classIds.includes(schedule.classId) && 
        activeClassIds.includes(schedule.classId) // ✅ ADD THIS CHECK
      );
      
      if (day) {
        schedules = schedules.filter(schedule => schedule.day === day);
      }
    } else {
      // For admin/head: Also filter by active classes
      if (day) {
        schedules = await storage.getSchedulesByDay(day as string);
      } else if (major) {
        schedules = await storage.getSchedulesByMajor(major as string);
      } else {
        schedules = await storage.getAllSchedules();
      }
      
      // ✅ FILTER: Only active classes for admin/head too
      schedules = schedules.filter(schedule => 
        activeClassIds.includes(schedule.classId)
      );
    }

    console.log("Found schedules:", schedules.length);
    console.log("Active class IDs:", activeClassIds);

    // ... rest of the code (enriching with teacher/class/subject data)
    const classes = await storage.getAllClasses();
    const majors = await storage.getAllMajors();
    const subjects = await storage.getAllSubjects();
    const classMap = new Map(classes.map(c => [c.id, c]));
    const majorMap = new Map(majors.map(m => [m.id, m]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));

    const schedulesWithTeachers = await Promise.all(
      schedules.map(async (schedule) => {
        const teacher = await storage.getUser(schedule.teacherId);
        const classInfo = classMap.get(schedule.classId);
        const subject = subjectMap.get(schedule.subjectId);
        
        let classLabel = 'Unknown Class';
        let fullClassName = 'Unknown Class';
        let displayClassName = 'Unknown Class';
        let majorShort = 'Unknown';
        
        if (classInfo) {
          const major = majorMap.get(classInfo.majorId);
          majorShort = major?.shortName || major?.name || 'Unknown';
          const majorFull = major?.name || 'Unknown';
          const groupStr = (classInfo as any).group ? ` ${(classInfo as any).group}` : '';
          
          classLabel = `${majorShort} Y${classInfo.year}S${classInfo.semester}${groupStr}`;
          fullClassName = classLabel;
          
          const yearText = `Year ${classInfo.year}`;
          const semesterText = `Semester ${classInfo.semester}`;
          const groupText = (classInfo as any).group || '';
          displayClassName = `${majorFull} - ${yearText} - ${semesterText}${groupText ? ' - Group ' + groupText : ''}`;
        }
        
        return { 
          ...schedule, 
          teacher,
          subject,
          classLabel,
          fullClassName,
          displayClassName,
          majorShort,
          classInfo
        };
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

  app.post("/api/schedules/bulk", requireAuth, async (req, res) => {
    try {
      console.log("=== BULK SCHEDULE CREATE DEBUG ===");
      console.log("Request received at:", new Date().toISOString());
      console.log("User role:", (req.session as any).userRole);
      console.log("Request body:", req.body);
      
      if ((req.session as any).userRole !== 'admin') {
        console.log("Access denied: User is not admin");
        return res.status(403).json({ message: "Forbidden - Admin access required" });
      }

      const bulkData = bulkScheduleSchema.parse(req.body);
      console.log(`Parsed bulk data: ${bulkData.schedules.length} schedules to create`);
      
      const createdSchedules = await storage.createBulkSchedules(bulkData.schedules);
      console.log(`Successfully created ${createdSchedules.length} schedules`);

      const teacherIds = [...new Set(createdSchedules.map(s => s.teacherId))];
      const teachers = await Promise.all(teacherIds.map(id => storage.getUser(id)));
      const teacherMap = new Map(teachers.map(t => t ? [t.id, t] : [0, null]));

      const schedulesWithTeachers = createdSchedules.map(schedule => ({
        ...schedule,
        teacher: teacherMap.get(schedule.teacherId)
      }));

      console.log("=== END BULK SCHEDULE CREATE DEBUG ===");
      res.json(schedulesWithTeachers);
    } catch (error) {
      console.error("=== BULK SCHEDULE CREATE ERROR ===");
      console.error("Error:", error);
      console.error("Error message:", (error as Error).message);
      console.error("=== END BULK SCHEDULE CREATE ERROR ===");
      res.status(400).json({ 
        message: "Bulk schedule creation failed", 
        error: (error as Error).message,
        details: "Check for schedule conflicts or invalid data"
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
      const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');
      
      const updatedSchedule = await storage.updateSchedule(scheduleId, {
        ...updates,
        updatedAt: timestamp
      });

      if (!updatedSchedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }

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

      const teacher = await storage.getUser(schedule.teacherId);
      const scheduleWithTeacher = { ...schedule, teacher };

      res.json(scheduleWithTeacher);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/schedules/teacher/:teacherId", requireAuth, async (req, res) => {
    try {
      const userRole = (req.session as any).userRole;
      if (!['head', 'admin', 'mazer'].includes(userRole)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const teacherId = parseInt(req.params.teacherId);
      const schedules = await storage.getSchedulesByTeacher(teacherId);

      const teacher = await storage.getUser(teacherId);
      const schedulesWithTeacher = schedules.map(schedule => ({ ...schedule, teacher }));

      res.json(schedulesWithTeacher);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/my-schedules", requireAuth, async (req, res) => {
  try {
    const session = req.session as any;
    const userId = session.userId;
    const userRole = session.userRole;

    if (!['teacher', 'head', 'admin', 'mazer'].includes(userRole)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const schedules = await storage.getSchedulesByTeacher(userId);

    // ✅ Filter out schedules from inactive classes
    const allClasses = await storage.getAllClasses();
    const activeClassIds = allClasses
      .filter(cls => cls.isActive === 1)
      .map(cls => cls.id);
    
    const activeSchedules = schedules.filter(schedule => 
      activeClassIds.includes(schedule.classId)
    );

    const classes = await storage.getAllClasses();
    const majors = await storage.getAllMajors();
    const subjects = await storage.getAllSubjects();
    const classMap = new Map(classes.map(c => [c.id, c]));
    const majorMap = new Map(majors.map(m => [m.id, m]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));

    const schedulesWithDetails = activeSchedules.map(schedule => {
      const classInfo = classMap.get(schedule.classId);
      const subject = subjectMap.get(schedule.subjectId);
      const teacher = { id: schedule.teacherId } as any;

      let classLabel = 'Unknown Class';
      if (classInfo) {
        const major = majorMap.get(classInfo.majorId);
        const majorShort = major?.shortName || major?.name || 'Unknown';
        const groupStr = (classInfo as any).group ? ` ${(classInfo as any).group}` : '';
        classLabel = `${majorShort} Y${classInfo.year}S${classInfo.semester}${groupStr}`;
      }

      return {
        ...schedule,
        subject,
        teacher,
        classLabel,
        classInfo,
      };
    });

    res.json(schedulesWithDetails);
  } catch (error) {
    console.error('my-schedules error', error);
    res.status(500).json({ message: 'Server error' });
  }
});

  // Dashboard metrics endpoints
  app.get("/api/dashboard/metrics", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;
      const userRole = session.userRole;
      
      console.log("📊 [Dashboard Metrics] Request from:", { userId, role: userRole });
      
      const allUsers = await storage.getAllUsers();
      const allAttendance = await storage.getAllAttendance();
      const allLeaves = await storage.getLeaveRequests();
      
      console.log("📊 [Dashboard Metrics] Total data:", { users: allUsers.length, attendance: allAttendance.length, leaves: allLeaves.length });
      
      let filteredAttendance = allAttendance;
      let filteredLeaves = allLeaves;
      let filteredUsers = allUsers;
      
      if (userRole === 'teacher' || userRole === 'staff') {
        filteredAttendance = allAttendance.filter(a => a.userId === userId);
        filteredLeaves = allLeaves.filter(l => l.userId === userId);
        filteredUsers = allUsers.filter(u => u.id === userId);
        console.log("👤 [Teacher/Staff] Personal data only");
      }
      
      if (userRole === 'head') {
        const currentUser = allUsers.find(u => u.id === userId);
        console.log("👤 [Head] Current user:", { id: currentUser?.id, name: currentUser?.name, departmentId: currentUser?.departmentId });
        
        if (currentUser?.departmentId) {
          filteredUsers = allUsers.filter(u => u.departmentId === currentUser.departmentId);
          const deptUserIds = filteredUsers.map(u => u.id);
          filteredAttendance = allAttendance.filter(a => deptUserIds.includes(a.userId));
          filteredLeaves = allLeaves.filter(l => deptUserIds.includes(l.userId));
          
          console.log("🏢 [Head] Department data:", { 
            departmentId: currentUser.departmentId,
            users: filteredUsers.length,
            userIds: deptUserIds,
            attendance: filteredAttendance.length,
            leaves: filteredLeaves.length
          });
        } else {
          console.log("⚠️ [Head] No departmentId found");
        }
      }
      
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
      
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = filteredAttendance.filter(a => {
        const attDate = new Date(a.date).toISOString().split('T')[0];
        return attDate === today;
      });
      const todayPresent = todayAttendance.filter(a => a.status === 'present').length;
      const todayAbsent = todayAttendance.filter(a => a.status === 'absent').length;
      const todayLeave = todayAttendance.filter(a => a.status === 'leave').length;
      
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
  
  // PowerBI Integration endpoints
  app.get("/api/powerbi/attendance", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      
      if (session.userRole !== 'admin' && session.userRole !== 'head') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const allAttendance = await storage.getAllAttendance();
      const allUsers = await storage.getAllUsers();
      
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      
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
  
  app.get("/api/powerbi/leaves", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      
      if (session.userRole !== 'admin' && session.userRole !== 'head') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const allLeaves = await storage.getLeaveRequests();
      const allUsers = await storage.getAllUsers();
      
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      
      const enrichedData = allLeaves.map(leave => {
        const user = userMap.get(leave.userId);
        const respondedByUser = leave.respondedBy ? userMap.get(leave.respondedBy) : null;
        
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
  
  app.get("/api/powerbi/users", requireAuth, async (req, res) => {
    try {
      const session = req.session as any;
      
      if (session.userRole !== 'admin' && session.userRole !== 'head') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const allUsers = await storage.getAllUsers();
      
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
      
      const allLeaves = await storage.getLeaveRequests();
      
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
      const allLeaves = await storage.getLeaveRequests();
      
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
    const userRole = (req.session as any).userRole;
    const userId = (req.session as any).userId;

    let classes;

    if (userRole === 'admin') {
      // Admin can see all classes (including inactive for management)
      classes = await storage.getAllClasses();
    } else if (userRole === 'head') {
      // Head can see classes from their department
      const currentUser = await storage.getUser(userId);
      if (!currentUser?.departmentId) {
        return res.status(400).json({ message: "User department not found" });
      }

      const departmentMajors = await storage.getMajorsByDepartment(currentUser.departmentId);
      const majorIds = departmentMajors.map(m => m.id);
      classes = await storage.getClassesByMajors(majorIds);
    } else if (userRole === 'class_moderator' || userRole === 'moderator') {
      // ✅ NEW: Class moderators only see their assigned ACTIVE classes
      const allClasses = await storage.getAllClasses();
      const currentUser = await storage.getUser(userId);
      
      if (currentUser?.classId) {
        classes = allClasses.filter(cls => 
          cls.id === currentUser.classId && cls.isActive === 1
        );
      } else {
        classes = [];
      }
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ IMPORTANT: For non-admin users, filter to active classes only
    if (userRole !== 'admin') {
      classes = classes.filter(cls => cls.isActive === 1);
    }

    // Get all majors to build fullClassName
    const majors = await storage.getAllMajors();
    const majorMap = new Map(majors.map(m => [m.id, m]));

    // Add fullClassName to each class
    const classesWithFullName = classes.map(cls => {
      const major = majorMap.get(cls.majorId);
      const majorShort = major?.shortName || major?.name || 'Unknown';
      const majorFull = major?.name || 'Unknown';
      const groupStr = (cls as any).group ? ` ${(cls as any).group}` : '';

      const classLabel = `${majorShort} Y${cls.year}S${cls.semester}${groupStr}`;
      const yearText = `Year ${cls.year}`;
      const semesterText = `Semester ${cls.semester}`;
      const groupText = (cls as any).group || '';
      const displayClassName = `${majorFull} - ${yearText} - ${semesterText}${groupText ? ' - Group ' + groupText : ''}`;

      return {
        ...cls,
        classLabel,
        fullClassName: classLabel,
        displayClassName,
        majorShort
      };
    });

    res.json(classesWithFullName);
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
      
      // Auto-generate class name: "MAJORSHORT YyearSsemester GROUP" (uppercase)
      const major = await storage.getMajorById(classData.majorId);
      if (!major) {
        return res.status(400).json({ message: "Invalid major ID" });
      }
      const generatedName = `${major.shortName} Y${classData.year}S${classData.semester} ${classData.group.toUpperCase()}`;
      
      console.log('[CREATE CLASS] Generated name:', generatedName);
      console.log('[CREATE CLASS] Class data before create:', { ...classData, name: generatedName });
      
      const classObj = await storage.createClass({
        ...classData,
        name: generatedName,
        group: classData.group.toUpperCase() // Ensure group is uppercase
      });
      res.json(classObj);
    } catch (error) {
      console.error('Create class error:', error);
      res.status(400).json({ message: "Failed to create class", error: (error as Error).message });
    }
  });

  app.put("/api/classes/:id", requireAuth, async (req, res) => {
    try {
      if ((req.session as any).userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // If any component that affects the name changes, regenerate it
      if (updates.majorId || updates.year || updates.semester || updates.group) {
        const existingClass = await storage.getClassById(id);
        if (!existingClass) {
          return res.status(404).json({ message: "Class not found" });
        }
        
        const finalMajorId = updates.majorId || existingClass.majorId;
        const major = await storage.getMajorById(finalMajorId);
        if (!major) {
          return res.status(400).json({ message: "Invalid major ID" });
        }
        
        const finalYear = updates.year || existingClass.year;
        const finalSemester = updates.semester || existingClass.semester;
        const finalGroup = (updates.group || existingClass.group || '').toUpperCase();
        
        updates.name = `${major.shortName} Y${finalYear}S${finalSemester} ${finalGroup}`;
        updates.group = finalGroup; // Ensure group is also uppercase in updates
      }
      
      const updated = await storage.updateClass(id, updates);
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
