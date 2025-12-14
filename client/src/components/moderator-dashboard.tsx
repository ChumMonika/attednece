import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DashboardHeader from "./admin-header";
import { GraduationCap, Check, X, CalendarDays, Clock, MapPin } from "lucide-react";
import type { User, TodaySchedule, ScheduleWithTeacher } from "@/types";

interface MazerDashboardProps {
  user: User;
}

export default function MazerDashboard({ user }: MazerDashboardProps) {
  const { toast } = useToast();

  // Get current day
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const currentDay = getCurrentDay();

  // Get today's schedule for Data Science and Engineering
  const { data: todaySchedule } = useQuery<ScheduleWithTeacher[]>({
    queryKey: ["/api/schedules"],
    select: (data) => data?.filter(schedule => schedule.day === currentDay) || []
  });

  // Get all teachers with their attendance for today
  const { data: allTeachersWithAttendance } = useQuery<TodaySchedule[]>({
    queryKey: ["/api/attendance-today"],
    select: (data) => data?.filter(person => person.role === 'teacher') || []
  });

  // Combine schedule with attendance data
  const teachersWithScheduleAndAttendance = todaySchedule?.map(schedule => {
    const teacherAttendance = allTeachersWithAttendance?.find(teacher => teacher.id === schedule.teacherId);
    return {
      ...schedule,
      teacher: schedule.teacher,
      attendance: teacherAttendance?.attendance || null
    };
  }) || [];

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

  const getAttendanceStatusDisplay = (teacher: any) => {
    if (teacher.attendance) {
      const status = teacher.attendance.status;
      const markedAt = teacher.attendance.markedAt;
      
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
          onClick={() => handleMarkAttendance(teacher.teacher.id, "present")}
          disabled={markAttendanceMutation.isPending}
        >
          <Check className="w-4 h-4 mr-2" />
          Mark Present
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleMarkAttendance(teacher.teacher.id, "absent")}
          disabled={markAttendanceMutation.isPending}
        >
          <X className="w-4 h-4 mr-2" />
          Mark Absent
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
          title="Mazer Dashboard"
          subtitle="Teacher Attendance Management"
          borderColor="border-university-mazer"
          bgColor="bg-university-mazer"
        />
     
        <div className="flex-1 flex flex-col w-full h-full px-6 py-8 pt-24">\n        <Card className="w-full h-full">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              <CalendarDays className="inline w-5 h-5 text-university-mazer mr-2" />
              {currentDay} - Data Science & Engineering Schedule & Attendance
            </h2>
          </div>

          <CardContent className="p-6">
            <div className="space-y-4">
              {teachersWithScheduleAndAttendance?.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-university-mazer bg-opacity-10 rounded-full flex items-center justify-center">
                      <GraduationCap className="text-university-mazer h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">{teacher.teacher?.name}</h3>
                        <span className="text-sm text-gray-500">({teacher.teacher?.uniqueId})</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getSubjectBadgeColor(teacher.course)}`}>
                          {teacher.course}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-4 h-4 mr-1" />
                          {teacher.startTime} - {teacher.endTime}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-1" />
                          {teacher.room}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {getAttendanceStatusDisplay(teacher)}
                  </div>
                </div>
              ))}

              {!teachersWithScheduleAndAttendance?.length && (
                <p className="text-center text-gray-500 py-8">No teachers scheduled for {currentDay}</p>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Summary:</span> {presentCount} Present, {pendingCount} Pending, {onLeaveCount} On Leave
                </div>
                {/* Removed Generate Daily Report button */}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  );
}
