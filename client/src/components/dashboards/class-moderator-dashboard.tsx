import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { logout } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, MapPin, Check, X, BookOpen, GraduationCap, User as UserIcon, LogOut, AlertCircle } from "lucide-react";
import type { User } from "@/types";

interface ScheduleWithTeacher {
  id: number;
  classId: number;
  subjectId: number;
  teacherId: number;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  subject?: {
    id: number;
    name: string;
    code: string;
  };
  teacher?: {
    id: number;
    name: string;
    uniqueId: string;
  };
  class?: {
    id: number;
    name: string;
    group: string;
  };
}

interface TodayScheduleItem extends ScheduleWithTeacher {
  attendance?: {
    id: number;
    status: "present" | "absent" | "leave";
    markedAt: string;
  } | null;
}

interface ClassModeratorDashboardProps {
  user: User;
}

// ✅ NEW: Class Status Warning Component
function ClassStatusWarning({ classStatus, refetch }: { 
  classStatus: any; 
  refetch: () => void;
}) {

  // Don't show anything while loading
  if (!classStatus) return null;

  // Show error if no class assigned
  if (!classStatus.hasClass) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">No Class Assigned</AlertTitle>
        <AlertDescription className="text-base">
          You don't have a class assigned yet. Please contact the administrator to assign you to a class.
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            className="mt-2"
          >
            Refresh Status
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show warning if class is inactive
  if (!classStatus.isActive) {
    return (
      <Alert variant="destructive" className="mb-6 border-red-300 bg-red-50">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-lg font-semibold text-red-900">Class Inactive</AlertTitle>
        <AlertDescription className="text-base text-red-800">
          Your assigned class <strong>{classStatus.classInfo?.name}</strong> is currently <strong>inactive</strong>.
          <br />
          You cannot view schedules or mark attendance until the class is reactivated.
          <br />
          <span className="text-sm mt-2 block">Please contact the administrator for more information.</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            className="mt-3 border-red-400 text-red-700 hover:bg-red-100"
          >
            Refresh Status
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show success if class is active
  return (
    <Alert className="mb-6 border-green-300 bg-green-50">
      <Check className="h-5 w-5 text-green-600" />
      <AlertTitle className="text-lg font-semibold text-green-900">Class Active</AlertTitle>
      <AlertDescription className="text-base text-green-800">
        Your class <strong>{classStatus.classInfo?.name}</strong> is active. You can mark attendance for today's sessions.
      </AlertDescription>
    </Alert>
  );
}

export default function ClassModeratorDashboard({ user }: ClassModeratorDashboardProps) {
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

  // ✅ Get class status (single source of truth)
  const { data: classStatus, refetch: refetchStatus } = useQuery<{
  hasClass: boolean;
  isActive: boolean;
  classInfo?: {
    id: number;
    name: string;
    isActive: number;
  };
  message: string;
}>({
  queryKey: ["/api/my-class-status"],
  refetchInterval: 5000, // ✅ Every 5 seconds
  refetchOnWindowFocus: true,
  refetchOnMount: "always", // ✅ Changed from true
  staleTime: 0,
  gcTime: 0, // ✅ Changed from cacheTime
  refetchIntervalInBackground: true, // ✅ NEW: Refetch even when tab is inactive
  });

  const isClassActive = classStatus?.isActive ?? false;

  // Get current day
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  // Helper to get formatted date
  const getTodayDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('en-US', options);
  };

  const currentDay = getCurrentDay();

  // Get today's schedule (filtered by moderator's assigned class)
  const { data: allSchedules } = useQuery<ScheduleWithTeacher[]>({
    queryKey: ["/api/schedules"],
    enabled: isClassActive, // ✅ Only fetch if class is active
  });

  // Filter schedules for today only
  const todaySchedule = allSchedules?.filter(schedule => schedule.day === currentDay) || [];

  // Get the moderator's class information
  const moderatorClass = allSchedules?.[0]?.class;
  const classLabel = classStatus?.classInfo?.name || moderatorClass?.name || "Class";

  // Get attendance data for today
  const { data: attendanceToday } = useQuery<any[]>({
    queryKey: ["/api/attendance-today"],
    enabled: isClassActive, // ✅ Only fetch if class is active
  });

  // Combine schedule with attendance
  const scheduleWithAttendance: TodayScheduleItem[] = todaySchedule.map(schedule => {
    const teacherAttendance = attendanceToday?.find(
      att => att.id === schedule.teacherId && att.role === 'teacher'
    );
    return {
      ...schedule,
      attendance: teacherAttendance?.attendance || null
    };
  });

  // Calculate summary
  const summary = {
    total: scheduleWithAttendance.length,
    present: scheduleWithAttendance.filter(s => s.attendance?.status === 'present').length,
    pending: scheduleWithAttendance.filter(s => !s.attendance).length,
    onLeave: scheduleWithAttendance.filter(s => s.attendance?.status === 'leave').length,
  };

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: "present" | "absent" }) => {
      const today = new Date().toISOString().split('T')[0];
      return apiRequest("POST", "/api/attendance/mark", { 
        userId, 
        date: today, 
        status 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-today"] });
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
    // ✅ Prevent marking if class is inactive
    if (!isClassActive) {
      toast({
        title: "Cannot Mark Attendance",
        description: "Your class is currently inactive",
        variant: "destructive",
      });
      return;
    }
    markAttendanceMutation.mutate({ userId, status });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800";
      case "absent":
        return "bg-red-100 text-red-800";
      case "leave":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusText = (status?: string) => {
    if (!status) return "Pending";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

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
                <h1 className="text-xl font-semibold text-gray-900">Class Moderator Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, {user.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">Class Moderator</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-blue-600" />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchStatus()}
                className="flex items-center space-x-2"
              >
                <AlertCircle className="h-4 w-4" />
                <span>Refresh Status</span>
              </Button>
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* ✅ NEW: Class Status Warning - pass classStatus and refetch */}
          <ClassStatusWarning classStatus={classStatus} refetch={refetchStatus} />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{summary.total}</p>
                  </div>
                  <div className="h-14 w-14 bg-blue-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="h-7 w-7 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Present</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{summary.present}</p>
                  </div>
                  <div className="h-14 w-14 bg-green-100 rounded-xl flex items-center justify-center">
                    <Check className="h-7 w-7 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">{summary.pending}</p>
                  </div>
                  <div className="h-14 w-14 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Clock className="h-7 w-7 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">On Leave</p>
                    <p className="text-3xl font-bold text-purple-600 mt-2">{summary.onLeave}</p>
                  </div>
                  <div className="h-14 w-14 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Calendar className="h-7 w-7 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {classLabel} - Today's Schedule & Attendance
              </h1>
              <p className="text-sm text-gray-600 mt-1">{getTodayDate()}</p>
            </div>
          </div>

          {/* Schedule & Attendance Table */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Teacher
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Room
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* ✅ Show message if class is inactive */}
                    {!isClassActive ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                            <p className="text-base font-medium text-gray-900 mb-1">Class Inactive</p>
                            <p className="text-sm text-gray-500">
                              Your class is currently inactive. No schedules available.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : scheduleWithAttendance.length > 0 ? (
                      scheduleWithAttendance.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                              <Clock className="h-4 w-4 text-orange-500" />
                              <span>{item.startTime} - {item.endTime}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {item.subject?.name || "N/A"}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {item.subject?.code || ""}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.teacher?.name || "N/A"}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                ID: {item.teacher?.uniqueId || ""}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{item.room}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusBadge(
                                item.attendance?.status
                              )}`}
                            >
                              {getStatusText(item.attendance?.status)}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            {!item.attendance ? (
                              <Button
                                size="sm"
                                onClick={() => handleMarkAttendance(item.teacherId, "present")}
                                disabled={markAttendanceMutation.isPending || !isClassActive}
                                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-sm disabled:opacity-50"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Mark Present
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-500">
                                ✓ Marked at {new Date(item.attendance.markedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-base font-medium text-gray-900 mb-1">No classes scheduled for today</p>
                            <p className="text-sm text-gray-500">Enjoy your day off!</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}