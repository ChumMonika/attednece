import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, MapPin, Check, X, BookOpen, GraduationCap } from "lucide-react";
import ClassModeratorHeader from "@/components/class-moderator-header";
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

export default function ClassModeratorDashboard({ user }: ClassModeratorDashboardProps) {
  const { toast } = useToast();

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
  });

  // Filter schedules for today only
  const todaySchedule = allSchedules?.filter(schedule => schedule.day === currentDay) || [];

  // Get the moderator's class information
  const moderatorClass = allSchedules?.[0]?.class;
  const classLabel = moderatorClass?.name || "";

  // Get attendance data for today
  const { data: attendanceToday } = useQuery<any[]>({
    queryKey: ["/api/attendance-today"],
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
      <ClassModeratorHeader user={user} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {classLabel}Today's Schedule & Attendance to mark
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">{getTodayDate()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Session</p>
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

          {/* Schedule & Attendance Table */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
                <p className="text-sm text-gray-600 mt-1">Mark teacher attendance for each class session</p>
              </div>
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
                    {scheduleWithAttendance.length > 0 ? (
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
                                disabled={markAttendanceMutation.isPending}
                                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-sm"
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
