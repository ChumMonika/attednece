import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DashboardHeader from "./admin-header";
import { Bus, Check, X, Briefcase, User as UserIcon, Megaphone } from "lucide-react";
import type { User, TodaySchedule } from "@/types";

interface AssistantDashboardProps {
  user: User;
}

export default function AssistantDashboard({ user }: AssistantDashboardProps) {
  const { toast } = useToast();
  // Announcements (demo data)
  const [announcements] = useState([
    { id: 1, title: "Office Closed Friday", message: "The office will be closed this Friday for maintenance.", date: "2025-11-14" },
    { id: 2, title: "Staff Meeting", message: "All staff are required to attend the meeting on Monday at 9am.", date: "2025-11-13" },
  ]);
  // ...existing attendance logic...
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
    if (workType?.includes("Full-Time")) {
      return "bg-blue-100 text-blue-800";
    } else if (workType?.includes("Part-Time")) {
      return "bg-orange-100 text-orange-800";
    } else if (workType?.includes("Admin")) {
      return "bg-purple-100 text-purple-800";
    } else if (workType?.includes("Maintenance")) {
      return "bg-green-100 text-green-800";
    }
    return "bg-gray-100 text-gray-800";
  };
  const getAttendanceStatusDisplay = (staff: TodaySchedule) => {
    if (staff.attendance) {
      const status = staff.attendance.status;
      const markedAt = staff.attendance.markedAt;
      if (status === "present") {
        return (
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-university-success text-white text-sm rounded-full">
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
      }
    }
    return (
      <div className="flex items-center space-x-3">
        <Button
          size="sm"
          className="bg-university-success text-white hover:bg-green-700"
          onClick={() => handleMarkAttendance(staff.id, "present")}
          disabled={markAttendanceMutation.isPending}
        >
          <Check className="w-4 h-4 mr-2" />
          Mark Present
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleMarkAttendance(staff.id, "absent")}
          disabled={markAttendanceMutation.isPending}
        >
          <X className="w-4 h-4 mr-2" />
          Mark Absent
        </Button>
      </div>
    );
  };
  const presentCount = todaySchedule?.filter(s => s.attendance?.status === "present").length || 0;
  const absentCount = todaySchedule?.filter(s => s.attendance?.status === "absent").length || 0;
  const pendingCount = todaySchedule?.filter(s => !s.attendance).length || 0;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <DashboardHeader
        user={user}
        title="Staff Dashboard"
        subtitle={`Welcome back, ${user.name}!`}
        borderColor="border-blue-200"
        bgColor="bg-white/80 backdrop-blur-sm shadow-sm"
      />
      <div className="max-w-7xl mx-auto px-6 py-10 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile Card */}
          <Card className="card-modern shadow-xl border-0 overflow-hidden animate-fade-in lg:col-span-1">
            <div className="p-6 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4 shadow-lg">
                <UserIcon className="w-12 h-12 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-blue-700 mb-1">{user.name}</h2>
              <p className="text-sm text-gray-600 mb-2">{user.department} Staff</p>
              <div className="flex flex-col gap-1 text-gray-500 text-sm">
                <span>{user.email}</span>
                <span>{user.department}</span>
              </div>
            </div>
          </Card>

          {/* Announcements */}
          <Card className="card-modern shadow-xl border-0 animate-fade-in lg:col-span-3">
            <div className="p-6 flex items-center border-b border-gray-100">
              <Megaphone className="w-6 h-6 text-orange-500 mr-3" />
              <h2 className="text-xl font-bold text-gray-800">Announcements</h2>
            </div>
            <CardContent className="p-6">
              <ul className="space-y-4">
                {announcements.map(a => (
                  <li key={a.id} className="bg-orange-50 border-l-4 border-orange-400 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-orange-700">{a.title}</span>
                      <span className="text-xs text-gray-400">{a.date}</span>
                    </div>
                    <p className="text-gray-700 text-sm">{a.message}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Attendance Card */}
          <Card className="card-modern shadow-xl border-0 animate-fade-in">
            <div className="bg-gradient-to-r from-blue-400 to-indigo-500 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <Briefcase className="w-6 h-6 mr-3" /> Staff Attendance
                </h2>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="space-y-4">
                {todaySchedule?.map((staff) => (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-university-assistant bg-opacity-10 rounded-full flex items-center justify-center">
                        <Bus className="text-university-assistant h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900">{staff.name}</h3>
                          <span className="text-sm text-gray-500">({staff.uniqueId})</span>
                          {staff.workType && (
                            <span className={`px-2 py-1 text-xs rounded-full ${getWorkTypeBadgeColor(staff.workType)}`}>
                              {staff.workType}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{staff.schedule}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {getAttendanceStatusDisplay(staff)}
                    </div>
                  </div>
                ))}
                {!todaySchedule?.length && (
                  <p className="text-center text-gray-500 py-8">No staff scheduled for today</p>
                )}
              </div>
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Summary:</span> {presentCount} Present, {absentCount} Absent, {pendingCount} Pending
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
