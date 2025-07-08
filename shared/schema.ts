import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uniqueId: text("unique_id").notNull().unique(), // T001, S001, etc.
  name: text("name").notNull(),
  email: text("email"),
  password: text("password").notNull(),
  role: text("role").notNull(), // head, admin, mazer, assistant, teacher, staff
  department: text("department"),
  workType: text("work_type"), // Full-Time, Part-Time, etc.
  schedule: text("schedule"), // e.g., "08:00-17:00"
  subject: text("subject"), // for teachers
  status: text("status").notNull().default("active"), // active, inactive
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  status: text("status").notNull(), // present, absent, leave
  markedAt: text("marked_at"), // time when marked
  markedBy: integer("marked_by"), // who marked the attendance
});

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  leaveType: text("leave_type").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  submittedAt: text("submitted_at").notNull(),
  respondedAt: text("responded_at"),
  respondedBy: integer("responded_by"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  status: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  submittedAt: true,
  respondedAt: true,
  respondedBy: true,
});

export const loginSchema = z.object({
  uniqueId: z.string().min(1, "Staff ID is required"),
  password: z.string().min(1, "Password is required"),
});

export const markAttendanceSchema = z.object({
  userId: z.number(),
  date: z.string(),
  status: z.enum(["present", "absent"]),
});

export const respondLeaveRequestSchema = z.object({
  requestId: z.number(),
  status: z.enum(["approved", "rejected"]),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type MarkAttendanceData = z.infer<typeof markAttendanceSchema>;
export type RespondLeaveRequestData = z.infer<typeof respondLeaveRequestSchema>;
