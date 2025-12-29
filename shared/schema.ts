import { mysqlTable, text, int, boolean, timestamp, varchar, date, datetime, time, mysqlEnum, index } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Core Entities
export const departments = mysqlTable("departments", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  shortName: varchar("short_name", { length: 50 }).notNull().unique(), // ITE, DSE, BIO
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
});

export const majors = mysqlTable("majors", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("short_name", { length: 50 }).notNull(),
  departmentId: int("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
}, (table) => ({
  deptIdx: index("major_dept_idx").on(table.departmentId),
}));

export const classes = mysqlTable("classes", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(), // Auto-generated: e.g., "BDSE Y2S2 M1"
  majorId: int("major_id").notNull().references(() => majors.id, { onDelete: "cascade" }),
  year: int("year").notNull(), // Academic year: 1, 2, 3, 4
  semester: int("semester").notNull(), // 1 or 2
  academicYear: varchar("academic_year", { length: 20 }).notNull(), // "2025-2026"
  group: varchar("group", { length: 10 }).notNull(), // REQUIRED: M1, M2, A1, A2, etc.
  isActive: boolean("is_active").notNull().default(true), // For semester rollover
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
}, (table) => ({
  majorIdx: index("class_major_idx").on(table.majorId),
}));

export const subjects = mysqlTable("subjects", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  credits: int("credits").notNull().default(3),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
});

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  uniqueId: varchar("unique_id", { length: 20 }).notNull().unique(), // T001, S001, etc.
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  password: varchar("password", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["head", "admin", "hr_assistant", "hr_backup", "class_moderator", "moderator", "teacher", "staff"]).notNull(),
  departmentId: int("department_id").references(() => departments.id, { onDelete: "set null" }),
  classId: int("class_id").references(() => classes.id, { onDelete: "set null" }), // For class_moderator role
  workType: varchar("work_type", { length: 100 }), // Full-Time, Part-Time, etc.
  schedule: varchar("schedule", { length: 50 }), // e.g., "08:00-17:00" for staff
  status: mysqlEnum("status", ["active", "inactive", "banned", "pending", "suspended"]).notNull().default("active"),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
}, (table) => ({
  uniqueIdIdx: index("unique_id_idx").on(table.uniqueId),
  deptIdx: index("user_dept_idx").on(table.departmentId),
}));

// Updated schedule table - semester-based with classes and subjects
export const schedules = mysqlTable("schedules", {
  id: int("id").primaryKey().autoincrement(),
  classId: int("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  subjectId: int("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  teacherId: int("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  day: varchar("day", { length: 20 }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  room: varchar("room", { length: 50 }).notNull(),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
}, (table) => ({
  teacherIdx: index("sched_teacher_idx").on(table.teacherId),
}));

export const attendance = mysqlTable("attendance", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  status: mysqlEnum("status", ["present", "absent", "leave"]).notNull(),
  isLate: boolean("is_late").notNull().default(false),
  markedAt: datetime("marked_at"),
  markedBy: int("marked_by").references(() => users.id, { onDelete: "set null" }),
  scheduleId: int("schedule_id").references(() => schedules.id, { onDelete: "set null" }), // For teacher attendance
  notes: text("notes"),
}, (table) => ({
  userIdDateIdx: index("user_id_date_idx").on(table.userId, table.date),
  dateIdx: index("attendance_date_idx").on(table.date),
}));

export const leaveRequests = mysqlTable("leave_requests", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leaveType: varchar("leave_type", { length: 100 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  submittedAt: datetime("submitted_at").notNull(),
  respondedAt: datetime("responded_at"),
  respondedBy: int("responded_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => ({
  userIdStatusIdx: index("user_id_status_idx").on(table.userId, table.status),
}));

// Zod schemas for validation
export const loginSchema = z.object({
  uniqueId: z.string().min(1, "Unique ID is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertUserSchema = createInsertSchema(users, {
  uniqueId: z.string().min(1, "Unique ID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["head", "admin", "hr_assistant", "hr_backup", "class_moderator", "moderator", "teacher", "staff"]),
  departmentId: z.number().nullable().optional(),
  classId: z.number().nullable().optional(),
  workType: z.string().nullable().optional(),
  schedule: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "banned", "pending", "suspended"]).default("active").optional(),
}).omit({ createdAt: true, updatedAt: true });

export const insertDepartmentSchema = createInsertSchema(departments, {
  name: z.string().min(1, "Department name is required"),
  shortName: z.string().min(1, "Short name is required"),
}).omit({ createdAt: true, updatedAt: true });

export const insertMajorSchema = createInsertSchema(majors, {
  name: z.string().min(1, "Major name is required"),
  shortName: z.string().min(1, "Short name is required"),
  departmentId: z.number(),
}).omit({ createdAt: true, updatedAt: true });

export const insertClassSchema = createInsertSchema(classes, {
  majorId: z.number(),
  year: z.number().min(1).max(4),
  semester: z.number().min(1).max(2),
  academicYear: z.string().min(1, "Academic year is required"),
  group: z.string().min(1, "Group is required").max(10).regex(/^[A-Z0-9]+$/, "Group must be uppercase letters/numbers (e.g., M1, M2, A1)"),
}).omit({ name: true, createdAt: true, updatedAt: true }); // name will be auto-generated

export const insertSubjectSchema = createInsertSchema(subjects, {
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(1, "Subject code is required"),
  credits: z.number().min(1).default(3).optional(),
}).omit({ createdAt: true, updatedAt: true });

export const markAttendanceSchema = z.object({
  userId: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  status: z.enum(["present", "absent", "leave"]),
  scheduleId: z.number().optional(),
});

export const insertLeaveRequestSchema = z.object({
  leaveType: z.string().min(1, "Leave type is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
  reason: z.string().min(1, "Reason is required"),
});

export const respondLeaveRequestSchema = z.object({
  requestId: z.number(),
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
});

export const insertScheduleSchema = createInsertSchema(schedules, {
  classId: z.number().min(1, "Class is required"),
  subjectId: z.number().min(1, "Subject is required"),
  teacherId: z.number().min(1, "Teacher is required"),
  day: z.string().min(1, "Day is required"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be in HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be in HH:MM format"),
  room: z.string().min(1, "Room is required"),
}).omit({ createdAt: true, updatedAt: true });

export const updateScheduleSchema = insertScheduleSchema.partial();

// Bulk schedule creation schema
export const bulkScheduleSchema = z.object({
  schedules: z.array(insertScheduleSchema).min(1, "At least one schedule is required"),
});

// Type exports
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
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = typeof leaveRequests.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;
