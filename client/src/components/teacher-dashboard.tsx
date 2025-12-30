import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { logout } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, AlertCircle, Calendar, Clock, User as UserIcon, Mail, Building, GraduationCap, TrendingUp, Plus, Filter, ChevronDown, ChevronUp, Megaphone, LogOut } from "lucide-react";
import type { User, LeaveRequest, Attendance } from "@/types";

interface TeacherDashboardProps {
  user: User;
}

export default function TeacherDashboard({ user }: TeacherDashboardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      setLocation("/login");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    },
  });

  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [announcements] = useState([
    { id: 1, title: "Staff Meeting Friday", message: "All teachers are required to attend the staff meeting this Friday at 2pm in the main hall.", date: "2025-11-12" },
    { id: 2, title: "Exam Schedule Released", message: "The final exam schedule has been published. Please check your department portal.", date: "2025-11-10" },
  ]);
  const [loading, setLoading] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loadingLeaveRequests, setLoadingLeaveRequests] = useState(false);
  const [form, setForm] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    error: '',
    submitting: false,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 border-green-200';
      case 'absent': return 'bg-red-100 text-red-800 border-red-200';
      case 'late': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4" />;
      case 'absent': return <XCircle className="w-4 h-4" />;
      case 'late': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const calculateStats = () => {
    const total = attendanceHistory.length;
    const present = attendanceHistory.filter(a => a.status === 'present').length;
    const absent = attendanceHistory.filter(a => a.status === 'absent').length;
    const late = attendanceHistory.filter(a => a.status === 'late').length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, late, attendanceRate };
  };

  const stats = calculateStats();

  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [expandedLeaveRequestId, setExpandedLeaveRequestId] = useState<number | null>(null);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all');

  // New filter states for attendance and leave requests
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'all' | 'present' | 'absent' | 'late'>('all');
  const [attendanceDateFilter, setAttendanceDateFilter] = useState<string>('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('all');
  const [leaveDateFilter, setLeaveDateFilter] = useState<string>('');

  // Show dropdown states
  const [attendanceShowLimit, setAttendanceShowLimit] = useState<number>(10);
  const [leaveShowLimit, setLeaveShowLimit] = useState<number>(10);

  const submitLeaveRequest = async () => {
    setForm(f => ({ ...f, error: '' }));

    if (!form.leaveType || !form.startDate || !form.endDate || !form.reason) {
      setForm(f => ({ ...f, error: 'Please fill all fields.' }));
      return;
    }
    if (form.endDate < form.startDate) {
      setForm(f => ({ ...f, error: 'End date cannot be before start date.' }));
      return;
    }

    setForm(f => ({ ...f, submitting: true }));
    try {
      const res = await apiRequest("POST", "/api/leave-request", {
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      });
      const data = await res.json();
      if (data && (data.success || data.id)) {
        fetchLeaveRequests();
        setForm({ leaveType: '', startDate: '', endDate: '', reason: '', error: '', submitting: false });
      } else {
        setForm(f => ({ ...f, error: data.message || 'Failed to submit leave request.', submitting: false }));
      }
    } catch (err: any) {
      setForm(f => ({ ...f, error: err.message || 'Failed to submit leave request.', submitting: false }));
    }
  };

  async function fetchLeaveRequests() {
    setLoadingLeaveRequests(true);
    try {
      const response = await apiRequest('GET', `/api/leave-requests?unique_id=${user.id}`);
      const data = await response.json() as LeaveRequest[];
      setLeaveRequests(data);
    } catch {
      setLeaveRequests([]);
    } finally {
      setLoadingLeaveRequests(false);
    }
  }

  const fetchAttendanceHistory = async () => {
    setLoadingAttendance(true);
    try {
      const res = await apiRequest("GET", `/api/my-attendance`);
      const data = await res.json();
      setAttendanceHistory(Array.isArray(data) ? data : []);
    } catch {
      setAttendanceHistory([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
    fetchAttendanceHistory();

    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
      fetchLeaveRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const pendingLeaveRequests = leaveRequests.filter(lr => lr.status === 'pending');
  const attendanceRate = attendanceHistory.length > 0
    ? Math.round((attendanceHistory.filter(a => a.status === 'present').length / attendanceHistory.length) * 100)
    : 0;

  // Filtered data for attendance
  const filteredAttendanceHistory = attendanceHistory.filter(attendance => {
    const matchesStatus = attendanceStatusFilter === 'all' || attendance.status === attendanceStatusFilter;

    let matchesDate = true;
    if (attendanceDateFilter) {
      const attendanceDate = new Date(attendance.date);
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

      switch (attendanceDateFilter) {
        case 'this-week':
          matchesDate = attendanceDate >= startOfWeek;
          break;
        case 'last-week':
          const lastWeekStart = new Date(startOfWeek);
          lastWeekStart.setDate(lastWeekStart.getDate() - 7);
          const lastWeekEnd = new Date(startOfWeek);
          lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
          matchesDate = attendanceDate >= lastWeekStart && attendanceDate <= lastWeekEnd;
          break;
        case 'this-month':
          matchesDate = attendanceDate >= startOfMonth;
          break;
        case 'last-month':
          matchesDate = attendanceDate >= startOfLastMonth && attendanceDate <= endOfLastMonth;
          break;
        case 'last-3-months':
          matchesDate = attendanceDate >= threeMonthsAgo;
          break;
        default:
          matchesDate = true;
      }
    }

    return matchesStatus && matchesDate;
  });

  // Filtered data for leave requests
  const filteredLeaveRequests = leaveRequests.filter(lr => {
    const matchesStatus = leaveStatusFilter === 'all' || lr.status === leaveStatusFilter;
    const matchesType = leaveTypeFilter === 'all' || lr.leaveType === leaveTypeFilter;

    let matchesDate = true;
    if (leaveDateFilter) {
      const startDate = new Date(lr.startDate);
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

      switch (leaveDateFilter) {
        case 'this-week':
          matchesDate = startDate >= startOfWeek;
          break;
        case 'last-week':
          const lastWeekStart = new Date(startOfWeek);
          lastWeekStart.setDate(lastWeekStart.getDate() - 7);
          const lastWeekEnd = new Date(startOfWeek);
          lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
          matchesDate = startDate >= lastWeekStart && startDate <= lastWeekEnd;
          break;
        case 'this-month':
          matchesDate = startDate >= startOfMonth;
          break;
        case 'last-month':
          matchesDate = startDate >= startOfLastMonth && startDate <= endOfLastMonth;
          break;
        case 'last-3-months':
          matchesDate = startDate >= threeMonthsAgo;
          break;
        default:
          matchesDate = true;
      }
    }

    return matchesStatus && matchesType && matchesDate;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Teacher Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, {user.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.department?.name || "N/A"} Teacher</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-blue-600" />
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

    

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Overview
        </h1>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.attendanceRate}%</p>
                </div>
                <div className="h-14 w-14 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Present Days</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.present}</p>
                </div>
                <div className="h-14 w-14 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Absent Days</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{stats.absent}</p>
                </div>
                <div className="h-14 w-14 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="h-7 w-7 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Late Days</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.late}</p>
                </div>
                <div className="h-14 w-14 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock className="h-7 w-7 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-8">
          {/* Attendance History */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                  Attendance History
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <select
                    value={attendanceShowLimit}
                    onChange={(e) => setAttendanceShowLimit(Number(e.target.value))}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10">10 entries</option>
                    <option value="25">25 entries</option>
                    <option value="50">50 entries</option>
                    <option value="100">100 entries</option>
                  </select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Attendance Filters */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filters:</span>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Status:</label>
                  <select
                    value={attendanceStatusFilter}
                    onChange={(e) => setAttendanceStatusFilter(e.target.value as any)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Date:</label>
                  <select
                    value={attendanceDateFilter}
                    onChange={(e) => setAttendanceDateFilter(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Time</option>
                    <option value="this-week">This Week</option>
                    <option value="last-week">Last Week</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="last-3-months">Last 3 Months</option>
                  </select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAttendanceStatusFilter('all');
                    setAttendanceDateFilter('');
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              </div>

              {/* Attendance History Table */}
              {loadingAttendance ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading attendance records...</p>
                </div>
              ) : filteredAttendanceHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAttendanceHistory.slice(0, attendanceShowLimit).map((attendance) => (
                        <tr key={attendance.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(attendance.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={getStatusColor(attendance.status)}
                            >
                              <div className="flex items-center">
                                {getStatusIcon(attendance.status)}
                                <span className="ml-1 capitalize">{attendance.status}</span>
                              </div>
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(attendance.status === 'present' || attendance.isLate) && attendance.markedAt
                              ? new Date(attendance.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : attendance.status === 'leave'
                              ? 'On Leave'
                              : 'N/A'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {(attendance.status === 'present' || attendance.isLate) && attendance.markedByName
                              ? attendance.markedByName
                              : attendance.status === 'leave'
                              ? 'On Leave'
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredAttendanceHistory.length > attendanceShowLimit && (
                    <div className="text-center mt-4">
                      <p className="text-sm text-gray-500">Showing {attendanceShowLimit} of {filteredAttendanceHistory.length} records</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No attendance records found matching your filters</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leave Request History */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
                  Leave Request History
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLeaveModal(true)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Leave Request
                  </Button>
                  <span className="text-sm text-gray-600">Show:</span>
                  <select
                    value={leaveShowLimit}
                    onChange={(e) => setLeaveShowLimit(Number(e.target.value))}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10">10 entries</option>
                    <option value="25">25 entries</option>
                    <option value="50">50 entries</option>
                    <option value="100">100 entries</option>
                  </select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Leave Request Filters */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filters:</span>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Status:</label>
                  <select
                    value={leaveStatusFilter}
                    onChange={(e) => setLeaveStatusFilter(e.target.value as any)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Type:</label>
                  <select
                    value={leaveTypeFilter}
                    onChange={(e) => setLeaveTypeFilter(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="annual">Annual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="personal">Personal Leave</option>
                    <option value="maternity">Maternity Leave</option>
                    <option value="emergency">Emergency Leave</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Date:</label>
                  <select
                    value={leaveDateFilter}
                    onChange={(e) => setLeaveDateFilter(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Time</option>
                    <option value="this-week">This Week</option>
                    <option value="last-week">Last Week</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="last-3-months">Last 3 Months</option>
                  </select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLeaveStatusFilter('all');
                    setLeaveTypeFilter('all');
                    setLeaveDateFilter('');
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              </div>

              {/* Leave Request History Table */}
              {loadingLeaveRequests ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading leave requests...</p>
                </div>
              ) : filteredLeaveRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLeaveRequests.slice(0, leaveShowLimit).map((lr) => (
                        <tr key={lr.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 capitalize">
                              {lr.leaveType} Leave
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(lr.startDate).toLocaleDateString()} - {new Date(lr.endDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={
                                lr.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                lr.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                'bg-yellow-100 text-yellow-800 border-yellow-200'
                              }
                            >
                              {lr.status.charAt(0).toUpperCase() + lr.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(lr.submittedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {lr.reason}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {lr.status === 'rejected' ? (lr.rejectionReason || 'N/A') : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredLeaveRequests.length > leaveShowLimit && (
                    <div className="text-center mt-4">
                      <p className="text-sm text-gray-500">Showing {leaveShowLimit} of {filteredLeaveRequests.length} records</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No leave requests found matching your filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 text-blue-700 flex items-center"><AlertCircle className="w-5 h-5 mr-2 text-yellow-500" /> Submit Leave Request</h2>
            <form onSubmit={(e) => { e.preventDefault(); submitLeaveRequest(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                <select
                  value={form.leaveType}
                  onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Leave Type</option>
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="emergency">Emergency Leave</option>
                  <option value="emergency">Other</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <Input
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Reason for leave"
                  className="w-full"
                />
              </div>
              {form.error && <div className="text-red-600 text-sm mt-2">{form.error}</div>}
              <div className="flex gap-2 mt-4">
                <Button type="submit" size="sm" className="bg-blue-500 text-white flex-1" disabled={form.submitting}>
                  {form.submitting ? 'Submitting...' : 'Submit'}
                </Button>
                <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setShowLeaveModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}