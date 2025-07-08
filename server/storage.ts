import { 
  users, 
  attendance, 
  leaveRequests,
  type User, 
  type InsertUser,
  type Attendance,
  type InsertAttendance,
  type LeaveRequest,
  type InsertLeaveRequest
} from "@shared/schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUniqueId(uniqueId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Attendance management
  getAttendance(userId: number): Promise<Attendance[]>;
  getAllAttendance(): Promise<Attendance[]>;
  getAttendanceByDate(date: string): Promise<Attendance[]>;
  markAttendance(attendance: InsertAttendance): Promise<Attendance>;
  
  // Leave request management
  getLeaveRequests(userId?: number): Promise<LeaveRequest[]>;
  getPendingLeaveRequests(): Promise<LeaveRequest[]>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, updates: Partial<LeaveRequest>): Promise<LeaveRequest | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private attendance: Map<number, Attendance>;
  private leaveRequests: Map<number, LeaveRequest>;
  private currentUserId: number;
  private currentAttendanceId: number;
  private currentLeaveRequestId: number;

  constructor() {
    this.users = new Map();
    this.attendance = new Map();
    this.leaveRequests = new Map();
    this.currentUserId = 1;
    this.currentAttendanceId = 1;
    this.currentLeaveRequestId = 1;
    
    // Initialize with sample users
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample users for different roles
    const sampleUsers = [
      {
        uniqueId: "H001",
        name: "Dr. Sarah Williams",
        email: "sarah.williams@university.edu",
        password: "password123",
        role: "head",
        department: "Administration",
        workType: "Full-Time",
        schedule: "08:00-17:00",
        subject: "",
        status: "active"
      },
      {
        uniqueId: "A001",
        name: "Admin User",
        email: "admin@university.edu",
        password: "password123",
        role: "admin",
        department: "Administration",
        workType: "Full-Time",
        schedule: "08:00-17:00",
        subject: "",
        status: "active"
      },
      {
        uniqueId: "M001",
        name: "Mazer User",
        email: "mazer@university.edu",
        password: "password123",
        role: "mazer",
        department: "Academic Affairs",
        workType: "Full-Time",
        schedule: "08:00-17:00",
        subject: "",
        status: "active"
      },
      {
        uniqueId: "AS001",
        name: "Assistant User",
        email: "assistant@university.edu",
        password: "password123",
        role: "assistant",
        department: "Administration",
        workType: "Full-Time",
        schedule: "08:00-17:00",
        subject: "",
        status: "active"
      },
      {
        uniqueId: "T001",
        name: "Mr. Chan",
        email: "chan@university.edu",
        password: "password123",
        role: "teacher",
        department: "Mathematics",
        workType: "Full-Time",
        schedule: "08:00-10:00",
        subject: "Math",
        status: "active"
      },
      {
        uniqueId: "T002",
        name: "Ms. Lina",
        email: "lina@university.edu",
        password: "password123",
        role: "teacher",
        department: "English",
        workType: "Full-Time",
        schedule: "10:00-12:00",
        subject: "English",
        status: "active"
      },
      {
        uniqueId: "T003",
        name: "Dr. Kim",
        email: "kim@university.edu",
        password: "password123",
        role: "teacher",
        department: "Science",
        workType: "Full-Time",
        schedule: "13:00-15:00",
        subject: "Science",
        status: "active"
      },
      {
        uniqueId: "S001",
        name: "Ms. Vanna",
        email: "vanna@university.edu",
        password: "password123",
        role: "staff",
        department: "IT Support",
        workType: "IT-Full-Time",
        schedule: "08:00-17:00",
        subject: "",
        status: "active"
      },
      {
        uniqueId: "S002",
        name: "Mr. Dara",
        email: "dara@university.edu",
        password: "password123",
        role: "staff",
        department: "IT Support",
        workType: "IT-Part-Time",
        schedule: "08:00-12:00",
        subject: "",
        status: "active"
      },
      {
        uniqueId: "S003",
        name: "Ms. Sarah",
        email: "sarah.staff@university.edu",
        password: "password123",
        role: "staff",
        department: "Administration",
        workType: "Admin-Full-Time",
        schedule: "09:00-18:00",
        subject: "",
        status: "active"
      },
      {
        uniqueId: "S004",
        name: "Mr. Tony",
        email: "tony@university.edu",
        password: "password123",
        role: "staff",
        department: "Maintenance",
        workType: "Maintenance",
        schedule: "06:00-14:00",
        subject: "",
        status: "active"
      }
    ];

    sampleUsers.forEach(userData => {
      const user: User = { ...userData, id: this.currentUserId++ };
      this.users.set(user.id, user);
    });

    // Sample attendance data
    const today = new Date().toISOString().split('T')[0];
    const sampleAttendance = [
      { userId: 5, date: today, status: "present", markedAt: "08:05", markedBy: 3 }, // T001 marked by mazer
      { userId: 8, date: today, status: "present", markedAt: "08:15", markedBy: 4 }, // S001 marked by assistant
      { userId: 10, date: today, status: "absent", markedAt: "09:30", markedBy: 4 }, // S003 marked by assistant
    ];

    sampleAttendance.forEach(attData => {
      const attendance: Attendance = { ...attData, id: this.currentAttendanceId++ };
      this.attendance.set(attendance.id, attendance);
    });

    // Sample leave requests
    const sampleLeaveRequests = [
      {
        userId: 6, // T002
        leaveType: "Personal Leave",
        startDate: "2024-01-25",
        endDate: "2024-01-26",
        reason: "Family event to attend",
        status: "pending",
        submittedAt: new Date().toISOString(),
      },
      {
        userId: 7, // T003 - already on leave
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
        respondedBy: reqData.respondedBy || null
      };
      this.leaveRequests.set(request.id, request);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUniqueId(uniqueId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.uniqueId === uniqueId);
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
      department: insertUser.department || null,
      workType: insertUser.workType || null,
      schedule: insertUser.schedule || null,
      subject: insertUser.subject || null
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
    const id = this.currentLeaveRequestId++;
    const request: LeaveRequest = { 
      ...insertRequest, 
      id,
      status: "pending",
      submittedAt: new Date().toISOString(),
      respondedAt: null,
      respondedBy: null
    };
    this.leaveRequests.set(id, request);
    return request;
  }

  async updateLeaveRequest(id: number, updates: Partial<LeaveRequest>): Promise<LeaveRequest | undefined> {
    const request = this.leaveRequests.get(id);
    if (!request) return undefined;
    
    const updatedRequest = { ...request, ...updates };
    this.leaveRequests.set(id, updatedRequest);
    return updatedRequest;
  }
}

export const storage = new MemStorage();
