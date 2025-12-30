import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Bus, Check, X, Briefcase, User as UserIcon, Megaphone, Users, ClipboardCheck, Calendar, TrendingUp } from "lucide-react";
import type { User, TodaySchedule } from "@/types";

interface HRAssistantDashboardHomeProps {
  user: User;
}

export default function HRAssistantDashboardHome({ user }: HRAssistantDashboardHomeProps) {
  const { toast } = useToast();

  // Announcements (demo data)
  const [announcements] = useState([
    { id: 1, title: "Office Closed Friday", message: "The office will be closed this Friday for maintenance.", date: "2025-11-14" },
    { id: 2, title: "Staff Meeting", message: "All staff are required to attend the meeting on Monday at 9am.", date: "2025-11-13" },
  ]);

  const { data: todaySchedule } = useQuery<TodaySchedule[]>({
    queryKey: ["/api/attendance-today"],
    select: (data) => data?.filter(person => person.role === 'staff') || []
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

  const getWorkTypeBadgeColor = (workType: string) => {
    switch (workType) {
      case 'office': return 'bg-blue-100 text-blue-800';
      case 'remote': return 'bg-green-100 text-green-800';
      case 'field': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const presentCount = todaySchedule?.filter(person => person.attendanceStatus === 'present').length || 0;
  const absentCount = todaySchedule?.filter(person => person.attendanceStatus === 'absent').length || 0;
  const pendingCount = todaySchedule?.filter(person => !person.attendanceStatus).length || 0;
  const totalStaff = todaySchedule?.length || 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome back, {user.name}!</h1>
            <p className="text-green-100">HR Assistant - {user.department?.name || "N/A"}</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Briefcase className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Staff</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{totalStaff}</p>
              </div>
              <div className="h-14 w-14 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Present Today</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{presentCount}</p>
              </div>
              <div className="h-14 w-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <Check className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Absent Today</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{absentCount}</p>
              </div>
              <div className="h-14 w-14 bg-red-100 rounded-xl flex items-center justify-center">
                <X className="h-7 w-7 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingCount}</p>
              </div>
              <div className="h-14 w-14 bg-yellow-100 rounded-xl flex items-center justify-center">
                <ClipboardCheck className="h-7 w-7 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Attendance Overview */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Today's Staff Attendance</h2>
            <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
              View All Staff
            </Button>
          </div>
          <div className="space-y-3">
            {todaySchedule && todaySchedule.length > 0 ? (
              todaySchedule.slice(0, 5).map((person) => (
                <div key={person.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{person.name}</p>
                      <p className="text-xs text-gray-500">{person.department?.name || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {person.workType && (
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getWorkTypeBadgeColor(person.workType)}`}>
                        {person.workType}
                      </span>
                    )}
                    {person.attendanceStatus ? (
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        person.attendanceStatus === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {person.attendanceStatus === 'present' ? 'Present' : 'Absent'}
                      </span>
                    ) : (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs border-green-200 text-green-600 hover:bg-green-50"
                          onClick={() => handleMarkAttendance(person.id, 'present')}
                          disabled={markAttendanceMutation.isPending}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleMarkAttendance(person.id, 'absent')}
                          disabled={markAttendanceMutation.isPending}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No staff attendance data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Announcements */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center mb-4">
            <Megaphone className="w-5 h-5 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Announcements</h2>
          </div>
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="border-l-4 border-green-500 pl-4 py-2">
                <h3 className="text-sm font-semibold text-gray-900">{announcement.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{announcement.message}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(announcement.date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}