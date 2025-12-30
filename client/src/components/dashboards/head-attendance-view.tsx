import { useState } from "react";
  import { useQuery } from "@tanstack/react-query";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import { Download, Calendar, Building2 } from "lucide-react";
  import type { User } from "@/types";

  interface AttendanceRecord {
    id: number | string;
    userId: number;
    scheduleId: number | null;
    date: string;
    status: "present" | "absent" | "leave" | "pending";
    markedBy?: number;
    markedByName?: string;
    markedAt?: string;
    createdAt: string;
    user?: User;
    classLabel?: string | null;
    classId?: number | null;
    leaveType?: string;
    leaveReason?: string;
  }

  interface HeadAttendanceViewProps {
    user: User;
  }

  

export default function HeadAttendanceView({ user }: HeadAttendanceViewProps) {
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: attendance } = useQuery<AttendanceRecord[]>({ 
    queryKey: ["/api/head/attendance", dateFilter, classFilter, statusFilter, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (classFilter !== "all") params.append("class", classFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      const queryString = params.toString();
      const url = `/api/head/attendance${queryString ? "?" + queryString : ""}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch attendance");
      return response.json();
    }
  });

  const getDateRange = () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (dateFilter === "today") return { start: startOfToday, end: new Date() };
    if (dateFilter === "week") {
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
      startOfWeek.setHours(0, 0, 0, 0);
      return { start: startOfWeek, end: new Date() };
    }
    if (dateFilter === "month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      return { start: startOfMonth, end: new Date() };
    }
    return { start: new Date("2000-01-01"), end: new Date("2099-12-31") };
  };

  const dateRange = getDateRange();
    // Fetch classes; server already scopes classes to the head's department
    const { data: classes } = useQuery<any[]>({ queryKey: ["/api/classes"] });
    const availableClasses = (classes || []).map((c) => c.classLabel || (c.name as string) || "").filter(Boolean).sort();

    const handleRoleChange = (value: string) => {
      setRoleFilter(value);
      if (value === "staff") setClassFilter("all");
    };

    const filteredAttendance = (attendance || []).filter((record) => {
      const recordDate = new Date(record.date);
      if (recordDate < dateRange.start || recordDate > dateRange.end) return false;
      return true;
    });

    const getStatusBadge = (status: string) => {
      switch (status) {
        case "present":
          return "bg-green-100 text-green-800";
        case "absent":
          return "bg-red-100 text-red-800";
        case "leave":
          return "bg-purple-100 text-purple-800";
        case "pending":
          return "bg-gray-100 text-gray-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    const handleExport = () => {
      const headers = ["Date", "Name", "Role", "Class", "Status", "Time"];
      const rows = filteredAttendance.map((r) => [
        new Date(r.date).toLocaleDateString(),
        r.user?.name || "N/A",
        r.user?.role.replace("_", " ") || "N/A",
        r.user?.role === "teacher" ? r.classLabel || "—" : "—",
        r.status.charAt(0).toUpperCase() + r.status.slice(1),
        r.markedAt ? new Date(r.markedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `attendance_${dateFilter}_${classFilter !== "all" ? classFilter + "_" : ""}${new Date().toISOString().split("T")[0]}.csv`;
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Department Attendance Monitoring</h1>
          <p className="text-gray-600">View attendance records for your department</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class {roleFilter === "staff" && <span className="text-gray-400 text-xs">(Teacher only)</span>}</label>
                <Select value={classFilter} onValueChange={setClassFilter} disabled={roleFilter === "staff"}>
                  <SelectTrigger className={roleFilter === "staff" ? "opacity-50 cursor-not-allowed" : ""}>
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {availableClasses.length > 0 ? (
                      availableClasses.map((label) => (
                        <SelectItem key={label} value={label}>{label}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No classes available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <Select value={roleFilter} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building2 className="h-4 w-4" />
            <span className="font-semibold">Total Records:</span>
            <span>{filteredAttendance.length}</span>
          </div>
          <Button onClick={handleExport} className="bg-purple-600 hover:bg-purple-700 text-white flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Class</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAttendance.length > 0 ? (
                    filteredAttendance.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{new Date(record.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{record.user?.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600"><span className="capitalize">{record.user?.role.replace('_', ' ') || 'N/A'}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-600">{record.user?.role === 'teacher' ? (record.classLabel || '—') : '—'}</td>
                        <td className="px-6 py-4 text-sm"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(record.status)}`}>{record.status.charAt(0).toUpperCase() + record.status.slice(1)}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-600">{record.markedAt ? new Date(record.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No attendance records found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
