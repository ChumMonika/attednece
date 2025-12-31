import { mysqlTable, text, int, tinyint, varchar, date, datetime, time, mysqlEnum, index } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// CORE ENTITIES
// ========================================

export const departments = mysqlTable("departments", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("short_name", { length: 50 }).notNull(),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
});

export const majors = mysqlTable("majors", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("short_name", { length: 50 }).notNull(),
  departmentId: int("department_id").notNull(),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
}, (table) => ({
  deptIdx: index("major_dept_idx").on(table.departmentId),
}));

export const classes = mysqlTable("classes", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  majorId: int("major_id").notNull(),
  group: varchar("group", { length: 10 }).notNull(),
  year: int("year").notNull(),
  semester: int("semester").notNull(),
  academicYear: varchar("academic_year", { length: 20 }).notNull(),
  isActive: tinyint("is_active").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
}, (table) => ({
  majorIdx: index("class_major_idx").on(table.majorId),
}));

export const subjects = mysqlTable("subjects", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  credits: int("credits").notNull(),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
});

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  uniqueId: varchar("unique_id", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  password: varchar("password", { length: 255 }).notNull(),
  role: mysqlEnum("role", [
    "head",
    "admin", 
    "hr_assistant",
    "hr_backup",
    "class_moderator",
    "moderator",
    "teacher",
    "staff"
  ]).notNull(),
  departmentId: int("department_id"),
  classId: int("class_id"),
  workType: varchar("work_type", { length: 100 }),
  schedule: varchar("schedule", { length: 50 }),
  status: mysqlEnum("status", [
    "active",
    "inactive",
    "banned",
    "pending",
    "suspended"
  ]).notNull(),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
}, (table) => ({
  uniqueIdIdx: index("unique_id_idx").on(table.uniqueId),
  deptIdx: index("user_dept_idx").on(table.departmentId),
  classIdx: index("user_class_idx").on(table.classId),
}));

// ========================================
// SCHEDULES & ATTENDANCE
// ========================================

export const schedules = mysqlTable("schedules", {
  id: int("id").primaryKey().autoincrement(),
  classId: int("class_id").notNull(),
  subjectId: int("subject_id").notNull(),
  day: varchar("day", { length: 20 }).notNull(),
  teacherId: int("teacher_id").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  room: varchar("room", { length: 50 }).notNull(),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
}, (table) => ({
  classIdx: index("sched_class_idx").on(table.classId),
  teacherIdx: index("sched_teacher_idx").on(table.teacherId),
}));

export const attendance = mysqlTable("attendance", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  date: date("date").notNull(),
  status: mysqlEnum("status", ["present", "absent", "leave"]).notNull(),
  isLate: tinyint("is_late").notNull(),
  scheduleId: int("schedule_id"),
  notes: text("notes"),
  markedAt: datetime("marked_at"),
  markedBy: int("marked_by"),
}, (table) => ({
  userDateIdx: index("user_id_date_idx").on(table.userId, table.date),
  dateIdx: index("attendance_date_idx").on(table.date),
}));

export const leaveRequests = mysqlTable("leave_requests", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  leaveType: varchar("leave_type", { length: 100 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull(),
  rejectionReason: text("rejection_reason"),
  submittedAt: datetime("submitted_at").notNull(),
  respondedAt: datetime("responded_at"),
  respondedBy: int("responded_by"),
}, (table) => ({
  userStatusIdx: index("user_id_status_idx").on(table.userId, table.status),
}));

// ========================================
// ZOD VALIDATION SCHEMAS
// ========================================

export const loginSchema = z.object({
  uniqueId: z.string().min(1, "Unique ID is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertUserSchema = createInsertSchema(users, {
  uniqueId: z.string().min(1, "Unique ID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum([
    "head",
    "admin",
    "hr_assistant",
    "hr_backup",
    "class_moderator",
    "moderator",
    "teacher",
    "staff"
  ]),
  departmentId: z.number().nullable().optional(),
  classId: z.number().nullable().optional(),
  workType: z.string().nullable().optional(),
  schedule: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "banned", "pending", "suspended"]).default("active").optional(),
}).omit({ createdAt: true, updatedAt: true });

export const insertDepartmentSchema = createInsertSchema(departments, {
  name: z.string().min(1, "Department name is required"),
  shortName: z.string().min(1, "Short name is required").max(50),
}).omit({ createdAt: true, updatedAt: true });

export const insertMajorSchema = createInsertSchema(majors, {
  name: z.string().min(1, "Major name is required"),
  shortName: z.string().min(1, "Short name is required").max(50),
  departmentId: z.number().min(1, "Department is required"),
}).omit({ createdAt: true, updatedAt: true });

export const insertClassSchema = createInsertSchema(classes, {
  name: z.string().min(1, "Class name is required"),
  majorId: z.number().min(1, "Major is required"),
  group: z.string().min(1, "Group is required").max(10).regex(/^[A-Z0-9]+$/, "Group must be uppercase (e.g., M1, A1)"),
  year: z.number().min(1).max(4),
  semester: z.number().min(1).max(2),
  academicYear: z.string().min(1, "Academic year is required").regex(/^\d{4}-\d{4}$/, "Format: YYYY-YYYY"),
  isActive: z.number().min(0).max(1).default(1).optional(), // tinyint: 0 or 1
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
}).omit({ createdAt: true, updatedAt: true });

export const insertSubjectSchema = createInsertSchema(subjects, {
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(1, "Subject code is required"),
  credits: z.number().min(1).default(3).optional(),
}).omit({ createdAt: true, updatedAt: true });

export const insertScheduleSchema = createInsertSchema(schedules, {
  classId: z.number().min(1, "Class is required"),
  subjectId: z.number().min(1, "Subject is required"),
  teacherId: z.number().min(1, "Teacher is required"),
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "Format: HH:MM:SS"),
  endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "Format: HH:MM:SS"),
  room: z.string().min(1, "Room is required"),
}).omit({ createdAt: true, updatedAt: true });

export const updateScheduleSchema = insertScheduleSchema.partial();

export const bulkScheduleSchema = z.object({
  schedules: z.array(insertScheduleSchema).min(1, "At least one schedule is required"),
});

export const markAttendanceSchema = z.object({
  userId: z.number().min(1, "User is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  status: z.enum(["present", "absent", "leave"]),
  isLate: z.number().min(0).max(1).default(0).optional(),
  scheduleId: z.number().optional(),
  notes: z.string().optional(),
});

export const insertLeaveRequestSchema = z.object({
  leaveType: z.string().min(1, "Leave type is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export const respondLeaveRequestSchema = z.object({
  requestId: z.number().min(1),
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
});

// ========================================
// TYPE EXPORTS
// ========================================

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;
export type Major = typeof majors.$inferSelect;
export type InsertMajor = typeof majors.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type InsertClass = typeof classes.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = typeof subjects.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = typeof leaveRequests.$inferInsert;