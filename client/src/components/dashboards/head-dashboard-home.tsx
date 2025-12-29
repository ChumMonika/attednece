import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { UserCheck, UserX, CalendarMinus, Clock, Users, GraduationCap, Briefcase } from "lucide-react";
import type { User } from "@/types";

interface HeadDashboardHomeProps {
  user: User;
}

export default function HeadDashboardHome({ user }: HeadDashboardHomeProps) {
  const { data: dashboardMetrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    queryFn: () => fetch("/api/dashboard/metrics").then(res => res.json()),
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    refetchOnMount: true,
    staleTime: 0,
  });
  
  // Backend already filters by department for head role
  const departmentUsers = allUsers || [];
  const teacherCount = departmentUsers.filter(u => u.role === 'teacher').length;
  const staffCount = departmentUsers.filter(u => u.role === 'staff').length;
  const moderatorCount = departmentUsers.filter(u => u.role === 'class_moderator' || u.role === 'moderator').length;

  return (
    <div className="space-y-6">
      {/* Today's Department Attendance */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Attendance</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <UserCheck className="text-white h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-800">Present Today</p>
                  <p className="text-2xl font-bold text-green-900">{dashboardMetrics?.today?.present || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                  <UserX className="text-white h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-800">Absent Today</p>
                  <p className="text-2xl font-bold text-red-900">{dashboardMetrics?.today?.absent || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <CalendarMinus className="text-white h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-800">On Leave</p>
                  <p className="text-2xl font-bold text-purple-900">{dashboardMetrics?.today?.leave || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <Clock className="text-white h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-yellow-800">Pending Requests</p>
                  <p className="text-2xl font-bold text-yellow-900">{dashboardMetrics?.leaves?.pending || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Department Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Summary</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-700 text-sm flex items-center">
              <Users className="h-4 w-4 mr-2 text-gray-500" />
              Total Department Staff
            </span>
            <span className="text-xl font-semibold text-gray-900">{departmentUsers.length}</span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-700 text-sm flex items-center">
              <GraduationCap className="h-4 w-4 mr-2 text-gray-500" />
              Teachers
            </span>
            <span className="text-xl font-semibold text-gray-900">{teacherCount}</span>
          </div>
          
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-700 text-sm flex items-center">
              <Briefcase className="h-4 w-4 mr-2 text-gray-500" />
              Staff Members
            </span>
            <span className="text-xl font-semibold text-gray-900">{staffCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
