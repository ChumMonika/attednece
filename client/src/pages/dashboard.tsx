import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";
import HeadDashboard from "@/components/head-dashboard";
import AdminDashboard from "@/components/new-admin-dashboard";
import ModeratorDashboard from "@/components/moderator-dashboard";
import HRAssistantDashboard from "@/components/hr-assistant-dashboard";
import TeacherDashboard from "@/components/teacher-dashboard";
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { role } = useParams();
  const [, setLocation] = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const queryClient = useQueryClient();

  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/me", refreshKey],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="card-modern shadow-modern-lg border-0 p-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="spinner-modern w-12 h-12"></div>
            <p className="text-lg font-semibold text-gray-700">Loading Dashboard...</p>
            <p className="text-sm text-gray-500">Please wait while we prepare your workspace</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    setLocation("/login");
    return null;
  }

  // Redirect if role doesn't match
  if (user.role !== role) {
    setLocation(`/dashboard/${user.role}`);
    return null;
  }

  const renderDashboard = () => {
    switch (role) {
      case "head":
        return <HeadDashboard user={user} />;
      case "admin":
        return <AdminDashboard user={user} />;
      case "moderator":
        return <ModeratorDashboard user={user} />;
      case "hr_assistant":
        return <HRAssistantDashboard user={user} />;
      case "teacher":
      case "staff":
        return <TeacherDashboard user={user} />;
      default:
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <div className="card-modern shadow-modern-lg border-0 p-12">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Invalid Role</h2>
                <p className="text-gray-600 text-center">The role you're trying to access is not valid.</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return renderDashboard();
}
