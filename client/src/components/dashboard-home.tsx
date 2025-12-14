import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, BookOpen, Building2, CalendarDays, Settings, UserPlus, School, Cog } from "lucide-react";
import type { User as UserType, Department, Major, Class, Subject } from "@/types";

interface DashboardHomeProps {
  onNavigate: (section: string) => void;
  onAddUser: () => void;
}

export default function DashboardHome({ onNavigate, onAddUser }: DashboardHomeProps) {
  const { data: users } = useQuery<UserType[]>({ queryKey: ["/api/users"] });
  const { data: departments } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: majors } = useQuery<Major[]>({ queryKey: ["/api/majors"] });
  const { data: classes } = useQuery<Class[]>({ queryKey: ["/api/classes"] });
  const { data: subjects } = useQuery<Subject[]>({ queryKey: ["/api/subjects"] });

  const teacherCount = users?.filter(u => u.role === "teacher").length || 0;
  const staffCount = users?.filter(u => u.role === "staff").length || 0;
  const moderatorCount = users?.filter(u => u.role === "moderator").length || 0;

  return (
    <div className="p-8 pt-24 space-y-6 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 min-h-screen">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-700 mb-1">Total Users</p>
              <p className="text-4xl font-bold text-gray-900">{users?.length || 0}</p>
            </div>
            <Users className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-700 mb-1">Total Majors</p>
              <p className="text-4xl font-bold text-gray-900">{majors?.length || 0}</p>
            </div>
            <GraduationCap className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-700 mb-1">Total Classes</p>
              <p className="text-4xl font-bold text-gray-900">{classes?.length || 0}</p>
            </div>
            <BookOpen className="w-10 h-10 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={onAddUser}
            className="h-20 bg-blue-600 hover:bg-blue-700 text-white font-medium text-base flex flex-col items-center justify-center gap-2 rounded-lg"
          >
            <UserPlus className="w-6 h-6" />
            <span>Add User</span>
          </Button>
          <Button
            onClick={() => onNavigate("classes")}
            className="h-20 bg-green-600 hover:bg-green-700 text-white font-medium text-base flex flex-col items-center justify-center gap-2 rounded-lg"
          >
            <School className="w-6 h-6" />
            <span>Academic Setup</span>
          </Button>
          <Button
            onClick={() => onNavigate("departments")}
            className="h-20 bg-purple-600 hover:bg-purple-700 text-white font-medium text-base flex flex-col items-center justify-center gap-2 rounded-lg"
          >
            <Cog className="w-6 h-6" />
            <span>Configuration</span>
          </Button>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-700 text-sm">Total Departments</span>
            <span className="text-xl font-semibold text-gray-900">{departments?.length || 0}</span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-700 text-sm">Total Teachers</span>
            <span className="text-xl font-semibold text-gray-900">{teacherCount}</span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-700 text-sm">Total Staff</span>
            <span className="text-xl font-semibold text-gray-900">{staffCount}</span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-700 text-sm">Total Class Moderators</span>
            <span className="text-xl font-semibold text-gray-900">{moderatorCount}</span>
          </div>
          
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-700 text-sm">Total Subjects</span>
            <span className="text-xl font-semibold text-gray-900">{subjects?.length || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
