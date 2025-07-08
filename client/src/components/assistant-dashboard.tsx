import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DashboardHeader from "./dashboard-header";
import { Bus, Check, X, Briefcase } from "lucide-react";
import type { User, TodaySchedule } from "@/types";

interface AssistantDashboardProps {
  user: User;
}

export default function AssistantDashboard({ user }: AssistantDashboardProps) {
  const { toast } = useToast();

  const { data: todaySchedule } = useQuery<TodaySchedule[]>({
    queryKey: ["/api/attendance-today"],
  });

  const markAttendanceMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: string }) => {
      const today = new Date().toISOString().split('T')[0];
      return apiRequest("POST", "/api/mark-attendance", { userId, date: today, status });
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
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        user={user}
        title="Assistant Dashboard"
        subtitle="Staff Attendance Management"
        borderColor="border-university-assistant"
        bgColor="bg-university-assistant"
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              <Briefcase className="inline w-5 h-5 text-university-assistant mr-2" />
              Staff on Monday - Schedule & Attendance
            </h2>
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
                <Button className="bg-university-assistant text-white hover:bg-green-700">
                  Generate Daily Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
