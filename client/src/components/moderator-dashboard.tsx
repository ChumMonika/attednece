//This file is no longer used - content moved to main moderator-dashboard.tsx
// Keeping for reference only
/*
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DashboardHeader from "./admin-header";
import { GraduationCap, Check, X, CalendarDays, Clock, MapPin } from "lucide-react";
import type { User, TodaySchedule, ScheduleWithTeacher } from "@/types";

interface ModeratorDashboardProps {
  user: User;
}

export default function ModeratorDashboard({ user }: ModeratorDashboardProps) {
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

  // Get today's schedule (API now filters by moderator's assigned classes automatically)
  const { data: allSchedules } = useQuery<ScheduleWithTeacher[]>({
    queryKey: ["/api/schedules"],
  });

  // Filter schedules for today only
  const todaySchedule = allSchedules?.filter(schedule => schedule.day === currentDay) || [];

  // Get the moderator's class label from the first schedule (all schedules should be for the same class)
  const moderatorClassLabel = allSchedules?.[0]?.classLabel || "Class Moderator";

  // Get all teachers with their attendance for today
  const { data: allTeachersWithAttendance } = useQuery<TodaySchedule[]>({
    queryKey: ["/api/attendance-today"],
    select: (data) => data?.filter(person => person.role === 'teacher') || []
  });

  // Combine schedule with attendance data
  const teachersWithScheduleAndAttendance = todaySchedule.map(schedule => {
    const teacherAttendance = allTeachersWithAttendance?.find(teacher => teacher.id === schedule.teacherId);
    return {
      ...schedule,
      teacher: schedule.teacher,
      attendance: teacherAttendance?.attendance || null
    };
  });

  const markAttendanceMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: string }) => {
      const today = new Date().toISOString().split('T')[0];
      return apiRequest("POST", "/api/attendance/mark", { userId, date: today, status }).then(r => r.json());
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

  const getSubjectBadgeColor = (subject: string) => {
    switch (subject?.toLowerCase()) {
      case "database design and management":
        return "bg-blue-100 text-blue-800";
      case "data structures and algorithms":
        return "bg-purple-100 text-purple-800";
      case "introduction to machine learning":
        return "bg-green-100 text-green-800";
      case "project practicum":
        return "bg-orange-100 text-orange-800";
      case "discrete mathematics":
        return "bg-red-100 text-red-800";
      case "advanced programming for data science":
        return "bg-indigo-100 text-indigo-800";
      case "web and cloud technology":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAttendanceStatusDisplay = (schedule: any) => {
    if (schedule.attendance) {
      const status = schedule.attendance.status;
      const markedAt = schedule.attendance.markedAt;
      
      if (status === "present") {
        return (
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-university-success text-sm rounded-full" style={{ color: '#166534' }}>
              <Check className="w-3 h-3 inline mr-1" />
              Present
            </span>
            <span className="text-xs text-gray-500">Marked at {markedAt}</span>
          </div>
        );
      } else if (status === "absent") {
        return (
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-university-error text-white text-sm rounded-full">
              <X className="w-3 h-3 inline mr-1" />
              Absent
            </span>
            <span className="text-xs text-gray-500">Marked at {markedAt}</span>
          </div>
        );
      } else if (status === "leave") {
        return (
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-university-warning text-white text-sm rounded-full">
              <CalendarDays className="w-3 h-3 inline mr-1" />
              On Leave
            </span>
            <span className="text-xs text-gray-500">Pre-approved</span>
          </div>
        );
      }
    }

    return (
      <div className="flex items-center space-x-3">
        <Button
          size="sm"
          className="bg-university-success hover:bg-green-700"
          style={{ color: '#166534' }}
          onClick={() => handleMarkAttendance(schedule.teacher.id, "present")}
          disabled={markAttendanceMutation.isPending}
        >
          <Check className="w-4 h-4 mr-2" />
          Mark Present
        </Button>
      </div>
    );
  };

  const presentCount = teachersWithScheduleAndAttendance?.filter(t => t.attendance?.status === "present").length || 0;
  const pendingCount = teachersWithScheduleAndAttendance?.filter(t => !t.attendance).length || 0;
  const onLeaveCount = teachersWithScheduleAndAttendance?.filter(t => t.attendance?.status === "leave").length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-tr from-orange-100 via-pink-100 to-yellow-100">
      <div className="w-full">
        <DashboardHeader
          user={user}
          title="Class Moderator Dashboard"
          subtitle={moderatorClassLabel}
          borderColor="border-university-mazer"
          bgColor="bg-university-mazer"
        />
     
        <div className="flex-1 flex flex-col w-full h-full px-6 py-8 pt-24">
        <Card className="w-full h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg font-semibold text-lg">
                  {moderatorClassLabel}
                </span>
                <div className="flex items-center">
                  <CalendarDays className="w-5 h-5 text-university-mazer mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Today's Schedule & Attendance
                  </h2>
                </div>
              </div>
              <p className="text-sm text-gray-600">{getTodayDate()}</p>
            </div>
          </div>

          <CardContent className="p-6">
            {/* Table View */
          /*
          
          }
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Subject</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Teacher</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Room</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {teachersWithScheduleAndAttendance?.map((schedule) => (
                    <tr 
                      key={schedule.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      {/* Time - Visually Dominant */
                     /* <td className="px-4 py-4">
                        <div className="flex items-center text-base font-semibold text-gray-900">
                          <Clock className="w-5 h-5 mr-2 text-university-mazer" />
                          <span>{schedule.startTime} – {schedule.endTime}</span>
                        </div>
                      </td>
                      
                      {/* Subject */
                      /*<td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{schedule.subject?.name || 'Unknown Subject'}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{schedule.subject?.code || ''}</div>
                        </div>
                      </td>
                      
                      {/* Teacher - Compact */
                      /*<td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{schedule.teacher?.name}</div>
                          <div className="text-xs text-gray-500">ID: {schedule.teacher?.uniqueId}</div>
                        </div>
                      </td>
                      
                      {/* Room */
                      /*<td className="px-4 py-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-1" />
                          {schedule.room}
                        </div>
                      </td>
                      
                      {/* Status - Color Coded */
                     /* <td className="px-4 py-4">
                        {schedule.attendance?.status === "present" && (
                          <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                            <Check className="w-3 h-3 mr-1" />
                            Present
                          </span>
                        )}
                        {schedule.attendance?.status === "absent" && (
                          <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full font-medium">
                            <X className="w-3 h-3 mr-1" />
                            Absent
                          </span>
                        )}
                        {schedule.attendance?.status === "leave" && (
                          <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full font-medium">
                            <CalendarDays className="w-3 h-3 mr-1" />
                            On Leave
                          </span>
                        )}
                        {schedule.attendance?.status === "late" && (
                          <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full font-medium">
                            ⏰ Late
                          </span>
                        )}
                        {!schedule.attendance && (
                          <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full font-medium">
                            ⏳ Pending
                          </span>
                        )}
                      </td>
                      
                      {/* Action */
                     /* <td className="px-4 py-4">
                        {!schedule.attendance ? (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white font-medium"
                            onClick={() => handleMarkAttendance(schedule.teacher.id, "present")}
                            disabled={markAttendanceMutation.isPending}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Mark Present
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-500 italic">
                            Marked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!teachersWithScheduleAndAttendance?.length && (
                <p className="text-center text-gray-500 py-8">No teachers scheduled for {currentDay}</p>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Summary:</span> {presentCount} Present, {pendingCount} Pending, {onLeaveCount} On Leave
                </div>
                {/* Removed Generate Daily Report button */
             /* </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  );
}
*/