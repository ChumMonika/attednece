export interface User {
  id: number;
  uniqueId: string;
  name: string;
  email?: string;
  role: string;
  department?: string;
  workType?: string;
  schedule?: string;
  subject?: string;
  status: string;
}

export interface Attendance {
  id: number;
  userId: number;
  date: string;
  status: string;
  markedAt?: string;
  markedBy?: number;
  user?: User;
}

export interface LeaveRequest {
  id: number;
  userId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  submittedAt: string;
  respondedAt?: string;
  respondedBy?: number;
  user?: User;
}

export interface TodaySchedule extends User {
  attendance: Attendance | null;
}

export interface Stats {
  present: number;
  absent: number;
  onLeave: number;
  pendingRequests: number;
  totalUsers: number;
}
