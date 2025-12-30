import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { logout } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Briefcase, Check, X, Calendar, Clock, User as UserIcon, Users, ClipboardCheck, TrendingUp, Plus, AlertCircle, LogOut } from "lucide-react";
import type { User, TodaySchedule, LeaveRequest } from "@/types";

interface HRAssistantDashboardProps {
  user: User;
}

export default function HRAssistantDashboard({ user }: HRAssistantDashboardProps) {
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

  // Announcements (demo data)
  const [announcements] = useState([
    { id: 1, title: "Office Closed Friday", message: "The office will be closed this Friday for maintenance.", date: "2025-11-14" },
    { id: 2, title: "Staff Meeting", message: "All staff are required to attend the meeting on Monday at 9am.", date: "2025-11-13" },
  ]);

  // Leave request modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [form, setForm] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    error: '',
    submitting: false,
  });

  // Filter states
  // const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'all' | 'present' | 'absent' | 'late'>('all');

  // Show limits
  // const [attendanceShowLimit, setAttendanceShowLimit] = useState<number>(10);

  // Get today's staff attendance
  const { data: todayStaffAttendance, isLoading: loadingTodayAttendance } = useQuery<{
    id: number;
    name: string;
    uniqueId: string;
    status: string;
    markedAt: string | null;
    markedByName: string | null;
  }[]>({
    queryKey: ["/api/staff-attendance"],
  });

  // Get all staff attendance history
  // const { data: allAttendanceHistory, isLoading: loadingAttendanceHistory } = useQuery<Attendance[]>({
  //   queryKey: ["/api/attendance"],
  // });

  // Filter for staff attendance history
  // const staffAttendanceHistory = allAttendanceHistory?.filter(att => {
  //   // We need to get user info to check if they're staff
  //   // For now, we'll assume all attendance records are enriched with user data
  //   return att.user?.role === 'staff';
  // }) || [];

  // Submit leave request
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
        queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
        setForm({ leaveType: '', startDate: '', endDate: '', reason: '', error: '', submitting: false });
        setShowLeaveModal(false);
        toast({
          title: "Success",
          description: "Leave request submitted successfully",
        });
      } else {
        setForm(f => ({ ...f, error: data.message || 'Failed to submit leave request.', submitting: false }));
      }
    } catch (err: any) {
      setForm(f => ({ ...f, error: err.message || 'Failed to submit leave request.', submitting: false }));
    }
  };

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: string }) => {
      const today = new Date().toISOString().split('T')[0];
      return apiRequest("POST", "/api/attendance/mark", { userId, date: today, status }).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance"] });
      toast({
        title: "Success",
        description: "Attendance marked successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance",
        variant: "destructive",
      });
    },
  });

  const handleMarkAttendance = (userId: number, status: "present" | "absent") => {
    markAttendanceMutation.mutate({ userId, status });
  };

  // Filtered data
  // const filteredStaffAttendance = staffAttendanceHistory?.filter(attendance => {
  //   const matchesStatus = attendanceStatusFilter === 'all' || attendance.status === attendanceStatusFilter;
  //   return matchesStatus;
  // }) || [];

  // Calculate stats
  const attendanceStats = {
    total: todayStaffAttendance?.length || 0,
    present: todayStaffAttendance?.filter(s => s.status === 'present').length || 0,
    absent: todayStaffAttendance?.filter(s => s.status === 'absent').length || 0,
    pending: todayStaffAttendance?.filter(s => s.status === 'pending').length || 0,
  };

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
      case 'present': return <Check className="w-4 h-4" />;
      case 'absent': return <X className="w-4 h-4" />;
      case 'late': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">HR Assistant Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, {user.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">HR Assistant</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytical Overview</h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Today's Attendance Stats */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Attendance</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{attendanceStats.present}/{attendanceStats.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {attendanceStats.absent} absent, {attendanceStats.pending} pending
                  </p>
                </div>
                <div className="h-14 w-14 bg-blue-100 rounded-xl flex items-center justify-center">
                  <ClipboardCheck className="h-7 w-7 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Staff */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Staff</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{todayStaffAttendance?.length || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Staff members</p>
                </div>
                <div className="h-14 w-14 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users className="h-7 w-7 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Rate */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">
                    {attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Today</p>
                </div>
                <div className="h-14 w-14 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-8">
          {/* Today's Staff Attendance */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardCheck className="w-5 h-5 mr-2 text-blue-600" />
                Today's Staff Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTodayAttendance ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading today's attendance...</p>
                </div>
              ) : todayStaffAttendance && todayStaffAttendance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marked Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mark by</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {todayStaffAttendance.map((staff) => (
                        <tr key={staff.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{staff.uniqueId}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={getStatusColor(staff.status)}
                            >
                              <div className="flex items-center">
                                {getStatusIcon(staff.status)}
                                <span className="ml-1 capitalize">{staff.status}</span>
                              </div>
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {staff.markedAt ? new Date(staff.markedAt).toLocaleString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) : 'N/A'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {staff.markedByName || 'N/A'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {staff.status === 'pending' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleMarkAttendance(staff.id, 'present')}
                                disabled={markAttendanceMutation.isPending}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Mark Present
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No staff members found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
