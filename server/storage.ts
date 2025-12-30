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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private attendance: Map<number, Attendance>;
  private leaveRequests: Map<number, LeaveRequest>;
  private schedules: Map<number, Schedule>;
  private departments: Map<number, Department>;
  private majors: Map<number, Major>;
  private classes: Map<number, Class>;
  private subjects: Map<number, Subject>;
  private semesters: Map<number, Semester>;
  private classModerators: Map<number, ClassModerator>;
  private classSubjects: Map<number, ClassSubject>;
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

  constructor() {
    this.users = new Map();
    this.attendance = new Map();
    this.leaveRequests = new Map();
    this.schedules = new Map();
    this.departments = new Map();
    this.majors = new Map();
    this.classes = new Map();
    this.subjects = new Map();
    this.semesters = new Map();
    this.classModerators = new Map();
    this.classSubjects = new Map();
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
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Initialize departments first
    const now = new Date().toISOString();
    const sampleDepartments = [
      { name: "Computer Science", code: "CS", createdAt: now, updatedAt: now },
      { name: "Mathematics", code: "MATH", createdAt: now, updatedAt: now },
      { name: "Administration", code: "ADM", createdAt: now, updatedAt: now },
      { name: "IT Support", code: "IT", createdAt: now, updatedAt: now },
    ];
    sampleDepartments.forEach(dept => {
      const department: Department = { ...dept, id: this.currentDepartmentId++ };
      this.departments.set(department.id, department);
    });

    // Initialize majors
    const sampleMajors = [
      { name: "Data Science and Engineering", code: "DSE", departmentId: 1, createdAt: now, updatedAt: now },
      { name: "Software Engineering", code: "SE", departmentId: 1, createdAt: now, updatedAt: now },
    ];
    sampleMajors.forEach(maj => {
      const major: Major = { ...maj, id: this.currentMajorId++ };
      this.majors.set(major.id, major);
    });

    // Initialize classes
    const sampleClasses = [
      { name: "DSE Year 1", code: "DSE-Y1", majorId: 1, year: 1, startDate: "2025-09-01", endDate: "2025-12-31", academicYear: "2025-2026", createdAt: now, updatedAt: now },
      { name: "DSE Year 2", code: "DSE-Y2", majorId: 1, year: 2, startDate: "2025-09-01", endDate: "2025-12-31", academicYear: "2025-2026", createdAt: now, updatedAt: now },
      { name: "DSE Year 3", code: "DSE-Y3", majorId: 1, year: 3, startDate: "2025-09-01", endDate: "2025-12-31", academicYear: "2025-2026", createdAt: now, updatedAt: now },
    ];
    sampleClasses.forEach(cls => {
      const classObj: Class = { ...cls, id: this.currentClassId++ };
      this.classes.set(classObj.id, classObj);
    });

    // Initialize subjects
    const sampleSubjects = [
      { name: "Database Design and Management", code: "CS301", credits: 3, createdAt: now, updatedAt: now },
      { name: "Data Structures and Algorithms", code: "CS302", credits: 3, createdAt: now, updatedAt: now },
      { name: "Machine Learning", code: "CS401", credits: 3, createdAt: now, updatedAt: now },
      { name: "Project Practicum", code: "CS499", credits: 4, createdAt: now, updatedAt: now },
    ];
    sampleSubjects.forEach(subj => {
      const subject: Subject = { ...subj, id: this.currentSubjectId++ };
      this.subjects.set(subject.id, subject);
    });

    // Initialize semesters
    const sampleSemesters = [
      { name: "Fall 2025", code: "FALL-2025", startDate: "2025-09-01", endDate: "2025-12-31", isActive: true, createdAt: now, updatedAt: now },
      { name: "Spring 2026", code: "SPRING-2026", startDate: "2026-01-01", endDate: "2026-05-31", isActive: false, createdAt: now, updatedAt: now },
    ];
    sampleSemesters.forEach(sem => {
      const semester: Semester = { ...sem, id: this.currentSemesterId++ };
      this.semesters.set(semester.id, semester);
    });

    // Sample users for different roles
    const sampleUsers = [
      {
        uniqueId: "H001",
        name: "Dr. Sarah Williams",
        email: "sarah.williams@university.edu",
        password: "password123",
        role: "head" as const,
        departmentId: 1,
        workType: "Full-Time",
        schedule: "08:00-17:00",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        uniqueId: "A001",
        name: "Admin User",
        email: "admin@university.edu",
        password: "password123",
        role: "admin" as const,
        departmentId: 3,
        workType: "Full-Time",
        schedule: "08:00-17:00",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        uniqueId: "MOD001",
        name: "Class Moderator",
        email: "moderator@university.edu",
        password: "password123",
        role: "moderator" as const,
        departmentId: 1,
        workType: "Full-Time",
        schedule: "08:00-17:00",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        uniqueId: "HR001",
        name: "HR Assistant",
        email: "hr@university.edu",
        password: "password123",
        role: "hr_assistant" as const,
        departmentId: 3,
        workType: "Full-Time",
        schedule: "08:00-17:00",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        uniqueId: "T001",
        name: "Chamroeum",
        email: "chamroeum@university.edu",
        password: "password123",
        role: "teacher" as const,
        departmentId: 1,
        workType: "Full-Time",
        schedule: "07:00-11:00",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        uniqueId: "T002",
        name: "Vantha",
        email: "vantha@university.edu",
        password: "password123",
        role: "teacher" as const,
        departmentId: 1,
        workType: "Full-Time",
        schedule: "07:00-11:00",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        uniqueId: "T003",
        name: "Buncchun",
        email: "buncchun@university.edu",
        password: "password123",
        role: "teacher" as const,
        departmentId: 1,
        workType: "Full-Time",
        schedule: "07:00-12:00",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        uniqueId: "S001",
        name: "Ms. Vanna",
        email: "vanna@university.edu",
        password: "password123",
        role: "staff" as const,
        departmentId: 4,
        workType: "IT-Full-Time",
        schedule: "08:00-17:00",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        uniqueId: "S002",
        name: "Mr. Dara",
        email: "dara@university.edu",
        password: "password123",
        role: "staff" as const,
        departmentId: 4,
        workType: "IT-Part-Time",
        schedule: "08:00-12:00",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      }
    ];

    sampleUsers.forEach(userData => {
      const user: User = { ...userData, id: this.currentUserId++ };
      this.users.set(user.id, user);
    });

    // Sample attendance data
    const today = new Date().toISOString().split('T')[0];
    const sampleAttendance = [
      { userId: 5, date: today, status: "present" as const, isLate: false, markedAt: new Date().toISOString(), markedBy: 3 }, // T001 marked by moderator
      { userId: 6, date: today, status: "present" as const, isLate: false, markedAt: new Date().toISOString(), markedBy: 3 }, // T002 marked by moderator
      { userId: 7, date: today, status: "present" as const, isLate: true, markedAt: new Date().toISOString(), markedBy: 3 }, // T003 marked late by moderator
      { userId: 8, date: today, status: "present" as const, isLate: false, markedAt: new Date().toISOString(), markedBy: 4 }, // S001 marked by hr_assistant
      { userId: 9, date: today, status: "present" as const, isLate: false, markedAt: new Date().toISOString(), markedBy: 4 }, // S002 marked by hr_assistant
    ];

    sampleAttendance.forEach(attData => {
      const attendance: Attendance = { ...attData, id: this.currentAttendanceId++ };
      this.attendance.set(attendance.id, attendance);
    });

    // Sample leave requests
    const sampleLeaveRequests = [
      {
        userId: 6, // T002 (Vantha)
        leaveType: "Personal Leave",
        startDate: "2024-01-25",
        endDate: "2024-01-26",
        reason: "Family event to attend",
        status: "pending",
        submittedAt: new Date().toISOString(),
      },
      {
        userId: 7, // T003 (Buncchun) - already on leave
        leaveType: "Medical Leave",
        startDate: today,
        endDate: today,
        reason: "Medical appointment",
        status: "approved",
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
        respondedAt: new Date().toISOString(),
        respondedBy: 1,
      }
    ];

    sampleLeaveRequests.forEach(reqData => {
      const request: LeaveRequest = { 
        ...reqData, 
        id: this.currentLeaveRequestId++,
        respondedAt: reqData.respondedAt || null,
        respondedBy: reqData.respondedBy || null,
        rejectionReason: null
      };
      this.leaveRequests.set(request.id, request);
    });

    // Sample schedules with semester-based structure
    const sampleSchedules = [
      {
        semesterId: 1, // Fall 2025
        classId: 1, // DSE Year 1
        subjectId: 1, // Database Design and Management
        teacherId: 5, // Chamroeum
        day: "Monday",
        startTime: "07:00",
        endTime: "11:00",
        room: "Room 301",
        createdAt: now,
        updatedAt: now
      },
      {
        semesterId: 1,
        classId: 2, // DSE Year 2
        subjectId: 2, // Data Structures and Algorithms
        teacherId: 6, // Vantha
        day: "Tuesday",
        startTime: "07:00",
        endTime: "11:00",
        room: "Room 302",
        createdAt: now,
        updatedAt: now
      },
      {
        semesterId: 1,
        classId: 3, // DSE Year 3
        subjectId: 3, // Machine Learning
        teacherId: 7, // Buncchun
        day: "Wednesday",
        startTime: "07:00",
        endTime: "10:00",
        room: "Room 303",
        createdAt: now,
        updatedAt: now
      },
      {
        semesterId: 1,
        classId: 3, // DSE Year 3
        subjectId: 4, // Project Practicum
        teacherId: 7, // Buncchun
        day: "Thursday",
        startTime: "10:00",
        endTime: "12:00",
        room: "Room 304",
        createdAt: now,
        updatedAt: now
      },
    ];

    sampleSchedules.forEach(scheduleData => {
      const schedule: Schedule = { 
        ...scheduleData, 
        id: this.currentScheduleId++
      };
      this.schedules.set(schedule.id, schedule);
    });
  }

  // User Management Methods

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUniqueId(uniqueId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.uniqueId === uniqueId);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      status: "active",
      email: insertUser.email || null,
      departmentId: insertUser.departmentId || null,
      workType: insertUser.workType || null,
      schedule: insertUser.schedule || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAttendance(userId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(att => att.userId === userId);
  }

  async getAllAttendance(): Promise<Attendance[]> {
    return Array.from(this.attendance.values());
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(att => att.date === date);
  }

  async getAttendanceByDepartment(departmentId: number): Promise<Attendance[]> {
    if (!departmentId) return this.getAllAttendance();
    
    const departmentUsers = Array.from(this.users.values()).filter(user => user.departmentId === departmentId);
    const userIds = departmentUsers.map(user => user.id);
    
    return Array.from(this.attendance.values()).filter(att => userIds.includes(att.userId));
  }

  async getDepartmentSummary(): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await this.getAttendanceByDate(today);
    const allUsers = Array.from(this.users.values());
    const allDepartments = Array.from(this.departments.values());
    
    const summary = allDepartments.map(department => {
      const deptUsers = allUsers.filter(user => user.departmentId === department.id);
      const deptAttendance = todayAttendance.filter(att => 
        deptUsers.some(user => user.id === att.userId)
      );
      
      const present = deptAttendance.filter(att => att.status === "present").length;
      const absent = deptAttendance.filter(att => att.status === "absent").length;
      const onLeave = deptAttendance.filter(att => att.status === "leave").length;
      const notMarked = deptUsers.length - deptAttendance.length;
      
      return {
        department: department.name,
        departmentId: department.id,
        totalStaff: deptUsers.length,
        present,
        absent,
        onLeave,
        notMarked,
        attendanceRate: deptUsers.length > 0 ? Math.round((present / deptUsers.length) * 100) : 0
      };
    });
    
    return summary;
  }

  async markAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const id = this.currentAttendanceId++;
    const attendance: Attendance = { 
      ...insertAttendance, 
      id,
      markedAt: insertAttendance.markedAt || null,
      markedBy: insertAttendance.markedBy || null
    };
    this.attendance.set(id, attendance);
    return attendance;
  }

  async getLeaveRequests(userId?: number): Promise<LeaveRequest[]> {
    const requests = Array.from(this.leaveRequests.values());
    return userId ? requests.filter(req => req.userId === userId) : requests;
  }

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return Array.from(this.leaveRequests.values()).filter(req => req.status === "pending");
  }

  async createLeaveRequest(insertRequest: InsertLeaveRequest): Promise<LeaveRequest> {
    if (typeof insertRequest.userId !== 'number') {
      throw new Error('userId is required for leave request');
    }
    const id = this.currentLeaveRequestId++;
    const request: LeaveRequest = {
      id,
      userId: insertRequest.userId,
      leaveType: insertRequest.leaveType,
      startDate: insertRequest.startDate,
      endDate: insertRequest.endDate,
      reason: insertRequest.reason,
      status: "pending",
      submittedAt: new Date(),
      respondedAt: null,
      respondedBy: null,
      rejectionReason: null
    };
    this.leaveRequests.set(id, request);
    return request;
  }

  async updateLeaveRequest(id: number, updates: Partial<LeaveRequest>): Promise<LeaveRequest | undefined> {
    console.log('🔍 Memory updateLeaveRequest - Starting update');
    console.log('🆔 Request ID:', id);
    console.log('📝 Updates:', updates);
    
    const request = this.leaveRequests.get(id);
    if (!request) {
      console.log('❌ Memory updateLeaveRequest - No record found with id:', id);
      return undefined;
    }
    
    const updatedRequest = { ...request, ...updates };
    this.leaveRequests.set(id, updatedRequest);
    console.log('✅ Memory updateLeaveRequest - Success:', updatedRequest);
    return updatedRequest;
  }

  // Schedule management
  async getAllSchedules(): Promise<Schedule[]> {
    return Array.from(this.schedules.values());
  }

  async getSchedulesByDay(day: string): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(schedule => schedule.day === day);
  }

  async getSchedulesByTeacher(teacherId: number): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(schedule => schedule.teacherId === teacherId);
  }

  async getSchedulesBySemester(semesterId: number): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(schedule => schedule.semesterId === semesterId);
  }

  async getSchedulesByClass(classId: number): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(schedule => schedule.classId === classId);
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const id = this.currentScheduleId++;
    const newSchedule: Schedule = {
      ...schedule,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.schedules.set(id, newSchedule);
    return newSchedule;
  }

  async updateSchedule(id: number, updates: Partial<Schedule>): Promise<Schedule | undefined> {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;

    const updatedSchedule = { ...schedule, ...updates, updatedAt: new Date().toISOString() };
    this.schedules.set(id, updatedSchedule);
    return updatedSchedule;
  }

  async deleteSchedule(id: number): Promise<boolean> {
    return this.schedules.delete(id);
  }

  async validateScheduleConflict(
    teacherId: number,
    day: string,
    startTime: string,
    endTime: string,
    excludeScheduleId?: number,
    classId?: number
  ): Promise<{ hasConflict: boolean; type?: string; details?: string }> {
    // Get all schedules for this teacher on this day
    const teacherSchedules = Array.from(this.schedules.values()).filter(
      schedule => 
        schedule.teacherId === teacherId &&
        schedule.day === day &&
        (!excludeScheduleId || schedule.id !== excludeScheduleId)
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
        return { 
          hasConflict: true, 
          type: 'teacher', 
          details: `Teacher already scheduled on ${day} at ${existingStart}-${existingEnd}` 
        };
      }
    }

    // Check for class time conflicts if classId provided
    if (classId) {
      const classSchedules = Array.from(this.schedules.values()).filter(
        schedule => 
          schedule.classId === classId &&
          schedule.day === day &&
          (!excludeScheduleId || schedule.id !== excludeScheduleId)
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
          return { 
            hasConflict: true, 
            type: 'class', 
            details: `Class already scheduled on ${day} at ${existingStart}-${existingEnd}` 
          };
        }
      }
    }
    
    return { hasConflict: false };
  }

  async createBulkSchedules(scheduleList: InsertSchedule[]): Promise<Schedule[]> {
    const createdSchedules: Schedule[] = [];
    const conflicts: string[] = [];

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
      const id = this.currentScheduleId++;
      const newSchedule: Schedule = {
        ...schedule,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.schedules.set(id, newSchedule);
      createdSchedules.push(newSchedule);
    }

    return createdSchedules;
  }

  async getScheduleById(id: number): Promise<Schedule | undefined> {
    return this.schedules.get(id);
  }

  // Department Management
  async getAllDepartments(): Promise<Department[]> {
    return Array.from(this.departments.values());
  }

  async getDepartmentById(id: number): Promise<Department | undefined> {
    return this.departments.get(id);
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const id = this.currentDepartmentId++;
    const newDepartment: Department = {
      ...department,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.departments.set(id, newDepartment);
    return newDepartment;
  }

  async updateDepartment(id: number, updates: Partial<Department>): Promise<Department | undefined> {
    const department = this.departments.get(id);
    if (!department) return undefined;

    const updatedDepartment = { ...department, ...updates, updatedAt: new Date().toISOString() };
    this.departments.set(id, updatedDepartment);
    return updatedDepartment;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    return this.departments.delete(id);
  }

  // Major Management
  async getAllMajors(): Promise<Major[]> {
    return Array.from(this.majors.values());
  }

  async getMajorById(id: number): Promise<Major | undefined> {
    return this.majors.get(id);
  }

  async getMajorsByDepartment(departmentId: number): Promise<Major[]> {
    return Array.from(this.majors.values()).filter(major => major.departmentId === departmentId);
  }

  async createMajor(major: InsertMajor): Promise<Major> {
    const id = this.currentMajorId++;
    const newMajor: Major = {
      ...major,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.majors.set(id, newMajor);
    return newMajor;
  }

  async updateMajor(id: number, updates: Partial<Major>): Promise<Major | undefined> {
    const major = this.majors.get(id);
    if (!major) return undefined;

    const updatedMajor = { ...major, ...updates, updatedAt: new Date().toISOString() };
    this.majors.set(id, updatedMajor);
    return updatedMajor;
  }

  async deleteMajor(id: number): Promise<boolean> {
    return this.majors.delete(id);
  }

  // Class Management
  async getAllClasses(): Promise<Class[]> {
    return Array.from(this.classes.values());
  }

  async getClassById(id: number): Promise<Class | undefined> {
    return this.classes.get(id);
  }

  async getClassesByMajor(majorId: number): Promise<Class[]> {
    return Array.from(this.classes.values()).filter(cls => cls.majorId === majorId);
  }

  async getClassesByMajors(majorIds: number[]): Promise<Class[]> {
    return Array.from(this.classes.values()).filter(cls => majorIds.includes(cls.majorId));
  }

  async createClass(cls: InsertClass & { name: string }): Promise<Class> {
    const id = this.currentClassId++;
    const newClass: Class = {
      ...cls,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.classes.set(id, newClass);
    return newClass;
  }

  async updateClass(id: number, updates: Partial<Class>): Promise<Class | undefined> {
    const cls = this.classes.get(id);
    if (!cls) return undefined;

    const updatedClass = { ...cls, ...updates, updatedAt: new Date().toISOString() };
    this.classes.set(id, updatedClass);
    return updatedClass;
  }

  async deleteClass(id: number): Promise<boolean> {
    return this.classes.delete(id);
  }

  // Subject Management
  async getAllSubjects(): Promise<Subject[]> {
    return Array.from(this.subjects.values());
  }

  async getSubjectById(id: number): Promise<Subject | undefined> {
    return this.subjects.get(id);
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const id = this.currentSubjectId++;
    const newSubject: Subject = {
      ...subject,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.subjects.set(id, newSubject);
    return newSubject;
  }

  async updateSubject(id: number, updates: Partial<Subject>): Promise<Subject | undefined> {
    const subject = this.subjects.get(id);
    if (!subject) return undefined;

    const updatedSubject = { ...subject, ...updates, updatedAt: new Date().toISOString() };
    this.subjects.set(id, updatedSubject);
    return updatedSubject;
  }

  async deleteSubject(id: number): Promise<boolean> {
    return this.subjects.delete(id);
  }

  // Class Moderator Management
  async getClassModerators(classId: number): Promise<ClassModerator[]> {
    return Array.from(this.classModerators.values()).filter(cm => cm.classId === classId);
  }

  async getModeratorClasses(moderatorId: number): Promise<ClassModerator[]> {
    return Array.from(this.classModerators.values()).filter(cm => cm.moderatorId === moderatorId);
  }

  async assignModerator(assignment: InsertClassModerator): Promise<ClassModerator> {
    const id = this.currentClassModeratorId++;
    const newAssignment: ClassModerator = {
      ...assignment,
      id,
      createdAt: new Date().toISOString()
    };
    this.classModerators.set(id, newAssignment);
    return newAssignment;
  }

  async removeModerator(id: number): Promise<boolean> {
    return this.classModerators.delete(id);
  }

  // Class Subject Management
  async getClassSubjects(classId: number): Promise<ClassSubject[]> {
    return Array.from(this.classSubjects.values()).filter(cs => cs.classId === classId);
  }

  async getSubjectClasses(subjectId: number): Promise<ClassSubject[]> {
    return Array.from(this.classSubjects.values()).filter(cs => cs.subjectId === subjectId);
  }

  async assignSubjectToClass(assignment: InsertClassSubject): Promise<ClassSubject> {
    const id = this.currentClassSubjectId++;
    const newAssignment: ClassSubject = {
      ...assignment,
      id,
      createdAt: new Date().toISOString()
    };
    this.classSubjects.set(id, newAssignment);
    return newAssignment;
  }

  async removeSubjectFromClass(id: number): Promise<boolean> {
    return this.classSubjects.delete(id);
  }
}

// MySQL Storage Implementation
export class MySQLStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const dbConfig = {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER || "root",
      database: process.env.DB_NAME || "university_staff_tracker",
      password: process.env.DB_PASSWORD || "",
      connectionLimit: 10,
    };

    console.log('Attempting to connect to MySQL with config:', {
      ...dbConfig,
      password: dbConfig.password ? '***' : 'empty'
    });
    
    // Create a pool for the actual database operations
    const connection = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });
    
    this.db = drizzle(connection);
    
    // Test the database connection
    this.db.select().from(users).limit(1).then(() => {
      console.log('✅ Successfully connected to database:', dbConfig.database);
    }).catch((err) => {
      console.error('❌ Database error:', err.message);
      if (err.code === 'ER_NO_SUCH_TABLE') {
        console.error('   Tables do not exist. Please run the database setup script (db.sql).');
      } else if (err.code === 'ER_BAD_DB_ERROR') {
        console.error(`   Database '${dbConfig.database}' does not exist. Please create it first.`);
      } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('   Access denied. Please check your MySQL username and password in the .env file');
      } else if (err.code === 'ECONNREFUSED') {
        console.error('   Could not connect to MySQL server. Is it running?');
      }
    });
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
        status: users.status,
        createdAt: users.createdAt,
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
          status: users.status,
          createdAt: users.createdAt,
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
