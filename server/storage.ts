import { 
  users, 
  attendance, 
  leaveRequests,
  schedules,
  departments,
  majors,
  classes,
  subjects,
  type User, 
  type InsertUser,
  type Attendance,
  type InsertAttendance,
  type LeaveRequest,
  type InsertLeaveRequest,
  type Schedule,
  type InsertSchedule,
  type Department,
  type InsertDepartment,
  type Major,
  type InsertMajor,
  type Class,
  type InsertClass,
  type Subject,
  type InsertSubject
} from "@shared/schema";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import { eq, and, or, desc, ne } from "drizzle-orm";
import fs from "fs";
import path from "path";

// Define ClassModerator types locally since we removed the table but still use the concept
export interface ClassModerator {
  id: number;
  classId: number;
  userId: number;
  semesterId: number;
  isPrimary: boolean;
  createdAt: string;
}

// Simple in-memory storage fallback
export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private attendance: Map<number, Attendance> = new Map();
  private leaveRequests: Map<number, LeaveRequest> = new Map();
  private schedules: Map<number, Schedule> = new Map();
  private departments: Map<number, Department> = new Map();
  private majors: Map<number, Major> = new Map();
  private classes: Map<number, Class> = new Map();
  private subjects: Map<number, Subject> = new Map();
  private currentUserId = 1;
  private currentAttendanceId = 1;
  private currentLeaveRequestId = 1;
  private currentScheduleId = 1;
  private currentDepartmentId = 1;
  private currentMajorId = 1;
  private currentClassId = 1;
  private currentSubjectId = 1;

  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUniqueId(uniqueId: string): Promise<User | undefined> {
    for (const u of this.users.values()) {
      if (u.uniqueId === uniqueId) return u;
    }
    return undefined;
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const now = new Date();
    const id = this.currentUserId++;
    const user: any = {
      id,
      ...insertUser,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const u = this.users.get(id);
    if (!u) return undefined;
    const updated = { ...u, ...updates, updatedAt: new Date() } as any;
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Attendance
  async getAttendance(userId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(a => a.userId === userId);
  }

  async getAllAttendance(): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).sort((a,b) => (new Date(b.date).getTime() - new Date(a.date).getTime()));
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(a => String(a.date).slice(0,10) === String(date).slice(0,10));
  }

  async getAttendanceByDepartment(_department: string): Promise<Attendance[]> {
    // naive: return all attendance where user's departmentId matches
    const deptId = Number(_department);
    return Array.from(this.attendance.values()).filter(a => {
      const u = this.users.get(a.userId as number);
      return u && u.departmentId === deptId;
    });
  }

  async getDepartmentSummary(): Promise<any> {
    // Simple summary
    const allUsers = await this.getAllUsers();
    const allAttendance = await this.getAllAttendance();
    const map = new Map<number, any>();
    for (const u of allUsers) {
      if (!u.departmentId) continue;
      if (!map.has(u.departmentId)) map.set(u.departmentId, { department: u.departmentId, totalStaff: 0, present: 0, absent: 0, onLeave: 0 });
      map.get(u.departmentId).totalStaff++;
    }
    const today = new Date().toISOString().slice(0,10);
    for (const a of allAttendance) {
      if (String(a.date).slice(0,10) !== today) continue;
      const u = this.users.get(a.userId as number);
      if (!u || !u.departmentId) continue;
      const entry = map.get(u.departmentId);
      if (!entry) continue;
      if (a.status === 'present') entry.present++;
      if (a.status === 'absent') entry.absent++;
      if (a.status === 'leave') entry.onLeave++;
    }
    return Array.from(map.values());
  }

  async markAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    // find existing by userId+date
    for (const a of this.attendance.values()) {
      if (a.userId === insertAttendance.userId && String(a.date).slice(0,10) === String(insertAttendance.date).slice(0,10)) {
        const updated = { ...a, ...insertAttendance } as any;
        this.attendance.set(a.id as number, updated);
        return updated;
      }
    }
    const id = this.currentAttendanceId++;
    const now = new Date();
    const record: any = { id, ...insertAttendance, markedAt: insertAttendance.markedAt || now };
    this.attendance.set(id, record);
    return record;
  }

  // Leave requests
  async getLeaveRequests(userId?: number): Promise<LeaveRequest[]> {
    let arr = Array.from(this.leaveRequests.values()).sort((a,b) => (new Date(b.submittedAt as any).getTime() - new Date(a.submittedAt as any).getTime()));
    if (userId) arr = arr.filter(l => l.userId === userId);
    return arr;
  }

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return Array.from(this.leaveRequests.values()).filter(l => l.status === 'pending');
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const id = this.currentLeaveRequestId++;
    const now = new Date();
    const r: any = { id, ...request, status: 'pending', submittedAt: now };
    this.leaveRequests.set(id, r);
    return r;
  }

  async updateLeaveRequest(id: number, updates: Partial<LeaveRequest>): Promise<LeaveRequest | undefined> {
    const ex = this.leaveRequests.get(id);
    if (!ex) return undefined;
    const updated = { ...ex, ...updates } as any;
    this.leaveRequests.set(id, updated);
    return updated;
  }

  // Schedule management (basic)
  async getAllSchedules(): Promise<Schedule[]> { return Array.from(this.schedules.values()); }
  async getSchedulesByDay(day: string): Promise<Schedule[]> { return Array.from(this.schedules.values()).filter(s => s.day === day); }
  async getSchedulesByTeacher(teacherId: number): Promise<Schedule[]> { return Array.from(this.schedules.values()).filter(s => s.teacherId === teacherId); }
  async getSchedulesByMajor(_major: string): Promise<Schedule[]> { return Array.from(this.schedules.values()); }
  async getSchedulesByClass(classId: number): Promise<Schedule[]> { return Array.from(this.schedules.values()).filter(s => s.classId === classId); }
  async createSchedule(schedule: InsertSchedule): Promise<Schedule> { const id = this.currentScheduleId++; const now = new Date(); const s:any={ id, ...schedule, createdAt: now, updatedAt: now }; this.schedules.set(id,s); return s; }
  async createBulkSchedules(schedulesList: InsertSchedule[]): Promise<Schedule[]> { const created: Schedule[] = []; for (const sch of schedulesList) created.push(await this.createSchedule(sch)); return created; }
  async validateScheduleConflict(): Promise<{ hasConflict: boolean; type?: string; details?: string }> { return { hasConflict: false }; }
  async updateSchedule(id: number, updates: Partial<Schedule>): Promise<Schedule | undefined> { const s = this.schedules.get(id); if (!s) return undefined; const updated = { ...s, ...updates }; this.schedules.set(id, updated as any); return updated as any; }
  async deleteSchedule(id: number): Promise<boolean> { return this.schedules.delete(id); }
  async getScheduleById(id: number): Promise<Schedule | undefined> { return this.schedules.get(id); }

  // Departments
  async getAllDepartments(): Promise<Department[]> { return Array.from(this.departments.values()); }
  async getDepartmentById(id: number): Promise<Department | undefined> { return this.departments.get(id); }
  async getDepartment(id: number): Promise<Department | undefined> { return this.getDepartmentById(id); }
  async createDepartment(department: InsertDepartment): Promise<Department> { const id = this.currentDepartmentId++; const now=new Date(); const d:any={ id, ...department, createdAt: now, updatedAt: now }; this.departments.set(id,d); return d; }
  async updateDepartment(id: number, updates: Partial<Department>): Promise<Department | undefined> { const d=this.departments.get(id); if(!d) return undefined; const u={...d,...updates}; this.departments.set(id,u as any); return u as any; }
  async deleteDepartment(id: number): Promise<boolean> { return this.departments.delete(id); }

  // Majors
  async getAllMajors(): Promise<Major[]> { return Array.from(this.majors.values()); }
  async getMajorById(id: number): Promise<Major | undefined> { return this.majors.get(id); }
  async getMajorsByDepartment(departmentId: number): Promise<Major[]> { return Array.from(this.majors.values()).filter(m => m.departmentId === departmentId); }
  async createMajor(major: InsertMajor): Promise<Major> { const id = this.currentMajorId++; const now=new Date(); const m:any={ id, ...major, createdAt: now, updatedAt: now }; this.majors.set(id,m); return m; }
  async updateMajor(id: number, updates: Partial<Major>): Promise<Major | undefined> { const m=this.majors.get(id); if(!m) return undefined; const u={...m,...updates}; this.majors.set(id,u as any); return u as any; }
  async deleteMajor(id: number): Promise<boolean> { return this.majors.delete(id); }

  // Classes
  async getAllClasses(): Promise<Class[]> { return Array.from(this.classes.values()); }
  async getClassById(id: number): Promise<Class | undefined> { return this.classes.get(id); }
  async getClassesByMajors(majorIds: number[]): Promise<Class[]> { return Array.from(this.classes.values()).filter(c => majorIds.includes(c.majorId)); }
  async createClass(classData: InsertClass & { name: string }): Promise<Class> { const id=this.currentClassId++; const now=new Date(); const c:any={ id, ...classData, createdAt: now, updatedAt: now }; this.classes.set(id,c); return c; }
  async updateClass(id: number, updates: Partial<Class>): Promise<Class | undefined> { const c=this.classes.get(id); if(!c) return undefined; const u={...c,...updates}; this.classes.set(id,u as any); return u as any; }
  async deleteClass(id: number): Promise<boolean> { return this.classes.delete(id); }

  // Subjects
  async getAllSubjects(): Promise<Subject[]> { return Array.from(this.subjects.values()); }
  async getSubjectById(id: number): Promise<Subject | undefined> { return this.subjects.get(id); }
  async createSubject(subject: InsertSubject): Promise<Subject> { const id=this.currentSubjectId++; const now=new Date(); const s:any={ id, ...subject, createdAt: now, updatedAt: now }; this.subjects.set(id,s); return s; }
  async updateSubject(id: number, updates: Partial<Subject>): Promise<Subject | undefined> { const s=this.subjects.get(id); if(!s) return undefined; const u={...s,...updates}; this.subjects.set(id,u as any); return u as any; }
  async deleteSubject(id: number): Promise<boolean> { return this.subjects.delete(id); }

  // Class Moderator management - simplified using users.classId
  async getAllClassModerators(): Promise<ClassModerator[]> {
    const out: ClassModerator[] = [];
    for (const u of this.users.values()) {
      if (u.role === 'class_moderator' || u.role === 'moderator') {
        out.push({ id: u.id, classId: u.classId || 0, userId: u.id, semesterId: 0, isPrimary: true, createdAt: (u.createdAt as any) });
      }
    }
    return out;
  }

  async getClassModeratorsByClass(classId: number): Promise<ClassModerator[]> {
    return (await this.getAllClassModerators()).filter(cm => cm.classId === classId);
  }

  async getClassModeratorsByUser(userId: number): Promise<ClassModerator[]> {
    const u = this.users.get(userId);
    if (!u || !u.classId) return [];
    return [{ id: userId, classId: u.classId, userId, semesterId: 0, isPrimary: true, createdAt: (u.createdAt as any) }];
  }

  async createClassModerator(moderator: InsertClassModerator): Promise<ClassModerator> {
    // set user's classId
    const u = this.users.get(moderator.userId as number);
    if (u) {
      u.classId = moderator.classId;
      this.users.set(u.id, u);
      return { id: u.id, classId: u.classId as number, userId: u.id, semesterId: moderator.semesterId || 0, isPrimary: !!moderator.isPrimary, createdAt: (u.createdAt as any) };
    }
    const id = moderator.userId || 0;
    return { id, classId: moderator.classId, userId: moderator.userId, semesterId: moderator.semesterId || 0, isPrimary: !!moderator.isPrimary, createdAt: new Date() };
  }

  async deleteClassModerator(id: number): Promise<boolean> {
    const u = this.users.get(id);
    if (!u) return false;
    u.classId = null as any;
    this.users.set(u.id, u);
    return true;
  }
}

export interface InsertClassModerator {
  classId: number;
  userId: number;
  semesterId?: number;
  isPrimary?: boolean;
}


export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUniqueId(uniqueId: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Attendance management
  getAttendance(userId: number): Promise<Attendance[]>;
  getAllAttendance(): Promise<Attendance[]>;
  getAttendanceByDate(date: string): Promise<Attendance[]>;
  getAttendanceByDepartment(department: string): Promise<Attendance[]>;
  getDepartmentSummary(): Promise<any>;
  markAttendance(attendance: InsertAttendance): Promise<Attendance>;
  
  // Leave request management
  getLeaveRequests(userId?: number): Promise<LeaveRequest[]>;
  getPendingLeaveRequests(): Promise<LeaveRequest[]>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, updates: Partial<LeaveRequest>): Promise<LeaveRequest | undefined>;

  // Schedule management
  getAllSchedules(): Promise<Schedule[]>;
  getSchedulesByDay(day: string): Promise<Schedule[]>;
  getSchedulesByTeacher(teacherId: number): Promise<Schedule[]>;
  getSchedulesByMajor(major: string): Promise<Schedule[]>;
  getSchedulesByClass(classId: number): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  createBulkSchedules(schedules: InsertSchedule[]): Promise<Schedule[]>;
  validateScheduleConflict(teacherId: number, day: string, startTime: string, endTime: string, excludeId?: number, classId?: number): Promise<{ hasConflict: boolean; type?: string; details?: string }>;
  updateSchedule(id: number, updates: Partial<Schedule>): Promise<Schedule | undefined>;
  deleteSchedule(id: number): Promise<boolean>;
  getScheduleById(id: number): Promise<Schedule | undefined>;

  // Department management
  getAllDepartments(): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, updates: Partial<Department>): Promise<Department | undefined>;
  deleteDepartment(id: number): Promise<boolean>;

  // Major management
  getAllMajors(): Promise<Major[]>;
  getMajor(id: number): Promise<Major | undefined>;
  getMajorsByDepartment(departmentId: number): Promise<Major[]>;
  createMajor(major: InsertMajor): Promise<Major>;
  updateMajor(id: number, updates: Partial<Major>): Promise<Major | undefined>;
  deleteMajor(id: number): Promise<boolean>;

  // Class management
  getAllClasses(): Promise<Class[]>;
  getClass(id: number): Promise<Class | undefined>;
  getClassesByMajors(majorIds: number[]): Promise<Class[]>;
  createClass(classData: InsertClass & { name: string }): Promise<Class>;
  updateClass(id: number, updates: Partial<Class>): Promise<Class | undefined>;
  deleteClass(id: number): Promise<boolean>;

  // Subject management
  getAllSubjects(): Promise<Subject[]>;
  getSubject(id: number): Promise<Subject | undefined>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: number, updates: Partial<Subject>): Promise<Subject | undefined>;
  deleteSubject(id: number): Promise<boolean>;

  // Class Moderator management
  getAllClassModerators(): Promise<ClassModerator[]>;
  getClassModeratorsByClass(classId: number): Promise<ClassModerator[]>;
  getClassModeratorsByUser(userId: number): Promise<ClassModerator[]>;
  createClassModerator(moderator: InsertClassModerator): Promise<ClassModerator>;
  deleteClassModerator(id: number): Promise<boolean>;
}

export class MySQLStorage implements IStorage {
  private users: Map<number, User>;
  private attendance: Map<number, Attendance>;
  private leaveRequests: Map<number, LeaveRequest>;
  private schedules: Map<number, Schedule>;
  private departments: Map<number, Department>;
  private majors: Map<number, Major>;
  private classes: Map<number, Class>;
  private subjects: Map<number, Subject>;
  private classModerators: Map<number, ClassModerator>;
  private currentUserId: number;
  private currentAttendanceId: number;
  private currentLeaveRequestId: number;
  private currentScheduleId: number;
  private currentDepartmentId: number;
  private currentMajorId: number;
  private currentClassId: number;
  private currentSubjectId: number;
  private currentSemesterId: number;
  private currentClassModeratorId: number;
  private currentClassSubjectId: number;
  private db: any;

  constructor() {
    // keep Maps for compatibility in case some code expects them; primary storage is MySQL via `this.db`
    this.users = new Map();
    this.attendance = new Map();
    this.leaveRequests = new Map();
    this.schedules = new Map();
    this.departments = new Map();
    this.majors = new Map();
    this.classes = new Map();
    this.subjects = new Map();
    this.classModerators = new Map();
    this.currentUserId = 1;
    this.currentAttendanceId = 1;
    this.currentLeaveRequestId = 1;
    this.currentScheduleId = 1;
    this.currentDepartmentId = 1;
    this.currentMajorId = 1;
    this.currentClassId = 1;
    this.currentSubjectId = 1;
    this.currentSemesterId = 1;
    this.currentClassModeratorId = 1;
    this.currentClassSubjectId = 1;

    // Initialize MySQL connection pool for Drizzle
    try {
      const pool = mysql.createPool({
        host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
        port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
        user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
        password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'university_staff_tracker',
        connectionLimit: 10,
      });
      this.db = drizzle(pool);
      console.log('🔌 MySQLStorage: connected to database');
    } catch (err) {
      console.error('MySQLStorage: failed to create DB pool', err);
      // Rethrow so the caller can fall back to in-memory storage
      throw err;
    }
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db
      .select({
        id: users.id,
        uniqueId: users.uniqueId,
        name: users.name,
        email: users.email,
        password: users.password,
        role: users.role,
        departmentId: users.departmentId,
        classId: users.classId, // ✅ ADD THIS LINE
        workType: users.workType, // ✅ ADD THIS LINE
        schedule: users.schedule, // ✅ ADD THIS LINE
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt, // ✅ ADD THIS LINE
        department: {
          id: departments.id,
          name: departments.name,
          shortName: departments.shortName,
        }
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.id, id))
      .limit(1);
    
    if (!result || !result[0]) return undefined;

    // Handle null department (when user has no department_id)
    const department = result[0].department && result[0].department.id !== null
      ? result[0].department 
      : undefined;
    
    return {
      ...result[0],
      department
    } as any;
  }

  async getUserByUniqueId(uniqueId: string): Promise<User | undefined> {
    try {
      console.log(`Searching for user with uniqueId: ${uniqueId}`);
      const result = await this.db
        .select({
          id: users.id,
          uniqueId: users.uniqueId,
          name: users.name,
          email: users.email,
          password: users.password,
          role: users.role,
          departmentId: users.departmentId,
          classId: users.classId, // ✅ ADD THIS LINE
          workType: users.workType, // ✅ ADD THIS LINE
          schedule: users.schedule, // ✅ ADD THIS LINE
          status: users.status,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt, // ✅ ADD THIS LINE
          department: {
            id: departments.id,
            name: departments.name,
            shortName: departments.shortName,
          }
        })
        .from(users)
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .where(eq(users.uniqueId, uniqueId))
        .limit(1);
      
      if (!result || !result[0]) {
        console.log(`User not found with uniqueId: ${uniqueId}`);
        return undefined;
      }
      
      console.log(`Found user: ${result[0].name} (${result[0].uniqueId})`);

      // Handle null department (when user has no department_id)
      const department = result[0].department && result[0].department.id !== null
        ? result[0].department 
        : undefined;
      
      return {
        ...result[0],
        department
      } as any;
    } catch (error) {
      console.error('Error querying MySQL:', error);
      throw error;
    }
  }

  async getUserById(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    console.log('🔍 MySQL Query: SELECT * FROM users');
    const result = await this.db.select().from(users);
    console.log(`📊 MySQL Result: Found ${result.length} users from database`);
    return result;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const now = new Date();
    const result = await this.db.insert(users).values({
      ...insertUser,
      createdAt: now,
      updatedAt: now,
    });
    const newUser = await this.getUser(result[0].insertId as number);
    return newUser!;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    await this.db.update(users).set(updates).where(eq(users.id, id));
    return await this.getUser(id);
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Check if user exists first
      const existingUser = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
      
      if (existingUser.length === 0) {
        // User doesn't exist
        return false;
      }
      
      // Delete the user
      await this.db.delete(users).where(eq(users.id, id));
      
      // If no error was thrown, deletion was successful
      return true;
    } catch (error) {
      console.error(`❌ Error deleting user ${id}:`, error);
      return false;
    }
  }

  // Attendance management
  async getAttendance(userId: number): Promise<Attendance[]> {
    return await this.db.select().from(attendance).where(eq(attendance.userId, userId));
  }

  async getAllAttendance(): Promise<Attendance[]> {
    console.log('🔍 MySQL Query: SELECT * FROM attendance ORDER BY date DESC');
    const result = await this.db.select().from(attendance).orderBy(desc(attendance.date));
    console.log(`📊 MySQL Result: Found ${result.length} attendance records from database`);
    return result;
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    return await this.db.select().from(attendance).where(eq(attendance.date, date));
  }

  async getAttendanceByDepartment(department: string): Promise<Attendance[]> {
    const result = await this.db
      .select({
        id: attendance.id,
        userId: attendance.userId,
        date: attendance.date,
        status: attendance.status,
        isLate: attendance.isLate,
        markedAt: attendance.markedAt,
        markedBy: attendance.markedBy,
        scheduleId: attendance.scheduleId,
        notes: attendance.notes,
      })
      .from(attendance)
      .innerJoin(users, eq(attendance.userId, users.id))
      .where(eq(users.departmentId, department));
    
    return result;
  }

  async getDepartmentSummary(): Promise<any> {
    const allUsers = await this.getAllUsers();
    const allAttendance = await this.getAllAttendance();
    
    const departmentMap = new Map();
    
    // Initialize departments
    allUsers.forEach(user => {
      if (user.departmentId && !departmentMap.has(user.departmentId)) {
        departmentMap.set(user.departmentId, {
          department: user.departmentId,
          totalStaff: 0,
          present: 0,
          absent: 0,
          onLeave: 0
        });
      }
    });
    
    // Count staff by department
    allUsers.forEach(user => {
      if (user.departmentId) {
        const dept = departmentMap.get(user.departmentId);
        dept.totalStaff++;
      }
    });
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Count attendance by department for today
    allAttendance.filter(att => att.date.toISOString().split('T')[0] === today).forEach(att => {
      const user = allUsers.find(u => u.id === att.userId);
      if (user && user.departmentId) {
        const dept = departmentMap.get(user.departmentId);
        if (att.status === 'present') dept.present++;
        else if (att.status === 'absent') dept.absent++;
        else if (att.status === 'leave') dept.onLeave++;
      }
    });
    
    return Array.from(departmentMap.values());
  }

  async markAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    console.log('--- MARK ATTENDANCE (STORAGE) ---');
    console.log('Received data:', insertAttendance);

    try {
      const existing = await this.db.select().from(attendance)
        .where(and(eq(attendance.userId, insertAttendance.userId), eq(attendance.date, insertAttendance.date)))
        .limit(1);

      console.log('Existing record found:', existing.length > 0 ? existing[0] : 'No');

      if (existing.length > 0) {
        console.log('Action: Updating existing record...');
        await this.db.update(attendance)
          .set({
            status: insertAttendance.status,
            markedAt: insertAttendance.markedAt,
            markedBy: insertAttendance.markedBy
          })
          .where(eq(attendance.id, existing[0].id));
        
        const updatedRecord = await this.db.select().from(attendance).where(eq(attendance.id, existing[0].id)).limit(1);
        console.log('Update successful. Returning:', updatedRecord[0]);
        console.log('---------------------------------');
        return updatedRecord[0];
      } else {
        console.log('Action: Inserting new record...');
        const result = await this.db.insert(attendance).values(insertAttendance);
        console.log('Insert result:', result);

        const newRecord = await this.db.select().from(attendance).where(eq(attendance.id, result[0].insertId)).limit(1);
        console.log('Insert successful. Returning:', newRecord[0]);
        console.log('---------------------------------');
        return newRecord[0];
      }
    } catch (dbError: any) {
      console.error('!!! DATABASE ERROR in markAttendance !!!', dbError);
      console.log('---------------------------------');
      throw dbError; // Re-throw the error to be caught by the route handler
    }
  }

  // Leave request management
  async getLeaveRequests(userId?: number): Promise<LeaveRequest[]> {
    if (userId) {
      return await this.db.select().from(leaveRequests).where(eq(leaveRequests.userId, userId));
    }
    return await this.db.select().from(leaveRequests).orderBy(desc(leaveRequests.submittedAt));
  }

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return await this.db.select().from(leaveRequests).where(eq(leaveRequests.status, "pending"));
  }

  async createLeaveRequest(insertRequest: InsertLeaveRequest): Promise<LeaveRequest> {
    if (!insertRequest.userId) {
      throw new Error('userId is required to create a leave request');
    }
    const completeRequest = {
      leaveType: insertRequest.leaveType,
      startDate: insertRequest.startDate,
      endDate: insertRequest.endDate,
      reason: insertRequest.reason,
      userId: insertRequest.userId,
      status: 'pending' as const,
      submittedAt: new Date(),
      rejectionReason: null,
      respondedAt: null,
      respondedBy: null,
    };
    const result = await this.db.insert(leaveRequests).values(completeRequest);
    const newRequest = await this.db.select().from(leaveRequests).where(eq(leaveRequests.id, result[0].insertId as number)).limit(1);
    return newRequest[0];
  }

  async updateLeaveRequest(id: number, updates: Partial<LeaveRequest>): Promise<LeaveRequest | undefined> {
    try {
      console.log('🔍 MySQL updateLeaveRequest - Starting update');
      console.log('🆔 Request ID:', id);
      console.log('📝 Updates:', updates);
      
      await this.db.update(leaveRequests).set(updates).where(eq(leaveRequests.id, id));
      console.log('✅ MySQL updateLeaveRequest - Update query executed');
      
      const result = await this.db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1);
      console.log('🔍 MySQL updateLeaveRequest - Select query result:', result);
      
      if (result.length === 0) {
        console.log('❌ MySQL updateLeaveRequest - No record found with id:', id);
        return undefined;
      }
      
      console.log('✅ MySQL updateLeaveRequest - Success:', result[0]);
      return result[0];
    } catch (error) {
      console.error('💥 MySQL updateLeaveRequest - Error:', error);
      throw error;
    }
  }

  // Schedule management
  async getAllSchedules(): Promise<Schedule[]> {
    console.log('🔍 MySQL Query: SELECT * FROM schedules ORDER BY day DESC');
    const result = await this.db.select().from(schedules).orderBy(desc(schedules.day));
    console.log(`📊 MySQL Result: Found ${result.length} schedules from database`);
    return result;
  }

  async getSchedulesByDay(day: string): Promise<Schedule[]> {
    console.log(`🔍 MySQL Query: SELECT * FROM schedules WHERE day = '${day}' ORDER BY day DESC`);
    const result = await this.db.select().from(schedules).where(eq(schedules.day, day)).orderBy(desc(schedules.day));
    console.log(`📊 MySQL Result: Found ${result.length} schedules for day ${day} from database`);
    return result;
  }

  async getSchedulesByTeacher(teacherId: number): Promise<Schedule[]> {
    console.log(`🔍 MySQL Query: SELECT * FROM schedules WHERE teacherId = ${teacherId} ORDER BY day DESC`);
    const result = await this.db.select().from(schedules).where(eq(schedules.teacherId, teacherId)).orderBy(desc(schedules.day));
    console.log(`📊 MySQL Result: Found ${result.length} schedules for teacher ${teacherId} from database`);
    return result;
  }

  async getSchedulesByMajor(major: string): Promise<Schedule[]> {
    console.log(`🔍 MySQL Query: SELECT schedules.* FROM schedules JOIN classes ON schedules.classId = classes.id JOIN majors ON classes.majorId = majors.id WHERE majors.shortName = '${major}' ORDER BY schedules.day DESC`);
    const result = await this.db
      .select()
      .from(schedules)
      .innerJoin(classes, eq(schedules.classId, classes.id))
      .innerJoin(majors, eq(classes.majorId, majors.id))
      .where(eq(majors.shortName, major))
      .orderBy(desc(schedules.day));
    console.log(`📊 MySQL Result: Found ${result.length} schedules for major ${major} from database`);
    return result;
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const now = new Date();
    const result = await this.db.insert(schedules).values({
      ...schedule,
      createdAt: now,
      updatedAt: now,
    });
    const newSchedule = await this.db.select().from(schedules).where(eq(schedules.id, result[0].insertId as number)).limit(1);
    return newSchedule[0];
  }

  async updateSchedule(id: number, updates: Partial<Schedule>): Promise<Schedule | undefined> {
    try {
      console.log('🔍 MySQL updateSchedule - Starting update');
      console.log('🆔 Schedule ID:', id);
      console.log('📝 Updates:', updates);
      
      await this.db.update(schedules).set(updates).where(eq(schedules.id, id));
      console.log('✅ MySQL updateSchedule - Update query executed');
      
      const result = await this.db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
      console.log('🔍 MySQL updateSchedule - Select query result:', result);
      
      if (result.length === 0) {
        console.log('❌ MySQL updateSchedule - No record found with id:', id);
        return undefined;
      }
      
      console.log('✅ MySQL updateSchedule - Success:', result[0]);
      return result[0];
    } catch (error) {
      console.error('💥 MySQL updateSchedule - Error:', error);
      throw error;
    }
  }

  async deleteSchedule(id: number): Promise<boolean> {
    const result = await this.db.delete(schedules).where(eq(schedules.id, id));
    return (result as any).affectedRows > 0;
  }

  async getSchedulesByClass(classId: number): Promise<Schedule[]> {
    console.log(`🔍 MySQL Query: SELECT * FROM schedules WHERE class_id = ${classId}`);
    const result = await this.db.select().from(schedules).where(eq(schedules.classId, classId));
    console.log(`📊 MySQL Result: Found ${result.length} schedules for class ${classId}`);
    return result;
  }

  async validateScheduleConflict(
    teacherId: number,
    day: string,
    startTime: string,
    endTime: string,
    excludeScheduleId?: number,
    classId?: number
  ): Promise<{ hasConflict: boolean; type?: string; details?: string }> {
    console.log(`🔍 MySQL Query: Checking schedule conflict for teacher ${teacherId} on ${day} ${startTime}-${endTime}`);
    
    // Get all schedules for this teacher on this day
    const teacherSchedules = await this.db.select()
      .from(schedules)
      .where(
        and(
          eq(schedules.teacherId, teacherId),
          eq(schedules.day, day),
          excludeScheduleId ? ne(schedules.id, excludeScheduleId) : undefined
        )
      );

    // Check for teacher time conflicts
    for (const schedule of teacherSchedules) {
      const existingStart = schedule.startTime;
      const existingEnd = schedule.endTime;
      
      const hasConflict = (
        (startTime >= existingStart && startTime < existingEnd) || 
        (endTime > existingStart && endTime <= existingEnd) || 
        (startTime <= existingStart && endTime >= existingEnd)
      );
      
      if (hasConflict) {
        console.log(`⚠️ Teacher conflict found: ${existingStart}-${existingEnd} overlaps with ${startTime}-${endTime}`);
        return { 
          hasConflict: true, 
          type: 'teacher', 
          details: `Teacher already scheduled on ${day} at ${existingStart}-${existingEnd}` 
        };
      }
    }

    // Check for class time conflicts if classId provided
    if (classId) {
      const classSchedules = await this.db.select()
        .from(schedules)
        .where(
          and(
            eq(schedules.classId, classId),
            eq(schedules.day, day),
            excludeScheduleId ? ne(schedules.id, excludeScheduleId) : undefined
          )
        );

      for (const schedule of classSchedules) {
        const existingStart = schedule.startTime;
        const existingEnd = schedule.endTime;
        
        const hasConflict = (
          (startTime >= existingStart && startTime < existingEnd) || 
          (endTime > existingStart && endTime <= existingEnd) || 
          (startTime <= existingStart && endTime >= existingEnd)
        );
        
        if (hasConflict) {
          console.log(`⚠️ Class conflict found: ${existingStart}-${existingEnd} overlaps with ${startTime}-${endTime}`);
          return { 
            hasConflict: true, 
            type: 'class', 
            details: `Class already scheduled on ${day} at ${existingStart}-${existingEnd}` 
          };
        }
      }
    }
    
    console.log(`✅ No conflicts found for teacher ${teacherId} on ${day} ${startTime}-${endTime}`);
    return { hasConflict: false };
  }

  async createBulkSchedules(scheduleList: InsertSchedule[]): Promise<Schedule[]> {
    console.log(`🔍 MySQL Bulk Create: Inserting ${scheduleList.length} schedules`);
    
    const createdSchedules: Schedule[] = [];
    const conflicts: string[] = [];
    const now = new Date();

    // Validate all schedules first
    for (let i = 0; i < scheduleList.length; i++) {
      const schedule = scheduleList[i];
      const conflictResult = await this.validateScheduleConflict(
        schedule.teacherId,
        schedule.day,
        schedule.startTime,
        schedule.endTime,
        undefined,
        schedule.classId
      );
      
      if (conflictResult.hasConflict) {
        conflicts.push(`Slot ${i + 1}: ${conflictResult.type} conflict - ${conflictResult.details}`);
      }

      // Check for duplicate subject+day within the same class
      const duplicates = scheduleList.filter((s, idx) => 
        idx !== i && 
        s.classId === schedule.classId && 
        s.subjectId === schedule.subjectId && 
        s.day === schedule.day
      );
      if (duplicates.length > 0) {
        conflicts.push(`Slot ${i + 1}: Duplicate subject on same day for this class`);
      }
    }

    if (conflicts.length > 0) {
      throw new Error(`Schedule conflicts detected:\n${conflicts.join('\n')}`);
    }

    // Insert all schedules
    for (const schedule of scheduleList) {
      const result = await this.db.insert(schedules).values({
        ...schedule,
        createdAt: now,
        updatedAt: now,
      });
      
      const newSchedule = await this.db.select()
        .from(schedules)
        .where(eq(schedules.id, result[0].insertId as number))
        .limit(1);
      
      createdSchedules.push(newSchedule[0]);
    }

    console.log(`✅ MySQL Bulk Create: Successfully inserted ${createdSchedules.length} schedules`);
    return createdSchedules;
  }

  async getScheduleById(id: number): Promise<Schedule | undefined> {
    const result = await this.db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
    return result[0];
  }

  // Department management
  async getAllDepartments(): Promise<Department[]> {
    return await this.db.select().from(departments);
  }

  async getDepartmentById(id: number): Promise<Department | undefined> {
    const result = await this.db.select().from(departments).where(eq(departments.id, id)).limit(1);
    return result[0];
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    return this.getDepartmentById(id);
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const now = new Date();
    await this.db.insert(departments).values({
      ...department,
      createdAt: now,
      updatedAt: now,
    });
    const result = await this.db.select().from(departments).orderBy(desc(departments.id)).limit(1);
    return result[0];
  }

  async updateDepartment(id: number, updates: Partial<Department>): Promise<Department | undefined> {
    await this.db.update(departments).set(updates).where(eq(departments.id, id));
    return this.getDepartmentById(id);
  }

  async deleteDepartment(id: number): Promise<boolean> {
    const result = await this.db.delete(departments).where(eq(departments.id, id));
    return (result as any).affectedRows > 0;
  }

  // Major management
  async getAllMajors(): Promise<Major[]> {
    return await this.db.select().from(majors);
  }

  async getMajorById(id: number): Promise<Major | undefined> {
    const result = await this.db.select().from(majors).where(eq(majors.id, id)).limit(1);
    return result[0];
  }

  // Get majors by department id (used by head role)
  async getMajorsByDepartment(departmentId: number): Promise<Major[]> {
    return await this.db.select().from(majors).where(eq(majors.departmentId, departmentId));
  }

  async createMajor(major: InsertMajor): Promise<Major> {
    const now = new Date();
    await this.db.insert(majors).values({
      ...major,
      createdAt: now,
      updatedAt: now,
    });
    const result = await this.db.select().from(majors).orderBy(desc(majors.id)).limit(1);
    return result[0];
  }

  async updateMajor(id: number, updates: Partial<Major>): Promise<Major | undefined> {
    await this.db.update(majors).set(updates).where(eq(majors.id, id));
    return this.getMajorById(id);
  }

  async deleteMajor(id: number): Promise<boolean> {
    const result = await this.db.delete(majors).where(eq(majors.id, id));
    return (result as any).affectedRows > 0;
  }

  // Class management
  async getAllClasses(): Promise<Class[]> {
    return await this.db.select().from(classes);
  }

  async getClassById(id: number): Promise<Class | undefined> {
    const result = await this.db.select().from(classes).where(eq(classes.id, id)).limit(1);
    return result[0];
  }

  // Get classes that belong to any of the provided major IDs
  async getClassesByMajors(majorIds: number[]): Promise<Class[]> {
    if (!majorIds || majorIds.length === 0) return [];
    const conditions = majorIds.map(id => eq(classes.majorId, id));
    return await this.db.select().from(classes).where(or(...conditions));
  }

  async createClass(classData: InsertClass & { name: string }): Promise<Class> {
    const now = new Date();
    // Debug log to verify payload
    console.log('[MYSQL CREATE CLASS] Payload to DB:', { ...classData, createdAt: now, updatedAt: now });
    if (!classData.name) {
      console.error('[MYSQL CREATE CLASS] ERROR: name is missing!', classData);
    }
    await this.db.insert(classes).values({
      ...classData,
      createdAt: now,
      updatedAt: now,
    });
    const result = await this.db.select().from(classes).orderBy(desc(classes.id)).limit(1);
    return result[0];
  }

  async updateClass(id: number, updates: Partial<Class>): Promise<Class | undefined> {
    await this.db.update(classes).set(updates).where(eq(classes.id, id));
    return this.getClassById(id);
  }

  async deleteClass(id: number): Promise<boolean> {
    const result = await this.db.delete(classes).where(eq(classes.id, id));
    return (result as any).affectedRows > 0;
  }

  // Subject management
  async getAllSubjects(): Promise<Subject[]> {
    return await this.db.select().from(subjects);
  }

  async getSubjectById(id: number): Promise<Subject | undefined> {
    const result = await this.db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
    return result[0];
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const now = new Date();
    await this.db.insert(subjects).values({
      ...subject,
      createdAt: now,
      updatedAt: now,
    });
    const result = await this.db.select().from(subjects).orderBy(desc(subjects.id)).limit(1);
    return result[0];
  }

  async updateSubject(id: number, updates: Partial<Subject>): Promise<Subject | undefined> {
    await this.db.update(subjects).set(updates).where(eq(subjects.id, id));
    return this.getSubjectById(id);
  }

  async deleteSubject(id: number): Promise<boolean> {
    const result = await this.db.delete(subjects).where(eq(subjects.id, id));
    return (result as any).affectedRows > 0;
  }

  // Class Moderator management
  async getAllClassModerators(): Promise<ClassModerator[]> {
    // Query users table where role is class_moderator or moderator
    const moderators = await this.db
      .select()
      .from(users)
      .where(
        or(
          eq(users.role, "class_moderator"),
          eq(users.role, "moderator")
        )
      );

    // Transform to ClassModerator format for compatibility
    return moderators.map(user => ({
      id: user.id,
      classId: user.classId!,
      userId: user.id,
      semesterId: 0, // Not used anymore
      isPrimary: true, // All moderators are primary in this simplified model
      createdAt: user.createdAt.toISOString(),
    }));
  }

  async getClassModeratorsByClass(classId: number): Promise<ClassModerator[]> {
    // Query users table where classId matches and role is class_moderator or moderator
    const moderators = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.classId, classId),
          or(eq(users.role, "class_moderator"), eq(users.role, "moderator"))
        )
      );
    
    // Transform to ClassModerator format for compatibility
    return moderators.map(user => ({
      id: user.id,
      classId: user.classId!,
      userId: user.id,
      semesterId: 0, // Not used anymore
      isPrimary: true, // All moderators are primary in this simplified model
      createdAt: user.createdAt.toISOString(),
    }));
  }

  async getClassModeratorsByUser(userId: number): Promise<ClassModerator[]> {
    // Query users table for this specific user
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user[0] || !user[0].classId) {
      return [];
    }
    
    // Return single assignment based on user's classId
    return [{
      id: user[0].id,
      classId: user[0].classId,
      userId: user[0].id,
      semesterId: 0, // Not used anymore
      isPrimary: true,
      createdAt: user[0].createdAt.toISOString(),
    }];
  }

  async getClassModeratorById(id: number): Promise<ClassModerator | undefined> {
    const user = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user[0] || !user[0].classId) return undefined;
    
    return {
      id: user[0].id,
      classId: user[0].classId,
      userId: user[0].id,
      semesterId: 0,
      isPrimary: true,
      createdAt: user[0].createdAt.toISOString(),
    };
  }

  async createClassModerator(moderator: InsertClassModerator): Promise<ClassModerator> {
    // Update user's classId instead of inserting into class_moderators table
    await this.db
      .update(users)
      .set({ classId: moderator.classId })
      .where(eq(users.id, moderator.userId));
    
    const user = await this.db.select().from(users).where(eq(users.id, moderator.userId)).limit(1);
    return {
      id: user[0].id,
      classId: user[0].classId!,
      userId: user[0].id,
      semesterId: moderator.semesterId || 0,
      isPrimary: moderator.isPrimary || true,
      createdAt: user[0].createdAt,
    };
  }

  async deleteClassModerator(id: number): Promise<boolean> {
    // Set user's classId to null instead of deleting from class_moderators
    const result = await this.db
      .update(users)
      .set({ classId: null })
      .where(eq(users.id, id));
    
    return (result as any).affectedRows > 0;
  }
}

// Export the storage instance - using MySQL storage
export const storage = (() => {
  try {
    const mysqlStorage = new MySQLStorage();
    console.log('✅ Successfully connected to MySQL database');
    return mysqlStorage;
  } catch (error) {
    console.error('❌ Failed to connect to MySQL database:', error);
    console.log('⚠️  Falling back to in-memory storage (MemStorage)');
    console.log('📝 All data will be stored in memory and will be lost on server restart');
    return new MemStorage();
  }
})();
