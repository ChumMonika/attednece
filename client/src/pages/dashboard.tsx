import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";
import HeadDashboard from "@/components/head-dashboard";
import AdminDashboard from "@/components/admin-dashboard";
import MazerDashboard from "@/components/mazer-dashboard";
import AssistantDashboard from "@/components/assistant-dashboard";
import TeacherDashboard from "@/components/teacher-dashboard";

export default function Dashboard() {
  const { role } = useParams();
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/me"],
    queryFn: getCurrentUser,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
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
      case "mazer":
        return <MazerDashboard user={user} />;
      case "assistant":
        return <AssistantDashboard user={user} />;
      case "teacher":
      case "staff":
        return <TeacherDashboard user={user} />;
      default:
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-lg">Invalid role</div>
          </div>
        );
    }
  };

  return renderDashboard();
}
