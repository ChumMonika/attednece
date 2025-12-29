import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import HeadHeader from "./head-header";
import HeadSidebar from "./head-sidebar";
import HeadDashboardHome from "./dashboards/head-dashboard-home";
import HeadAttendanceView from "./dashboards/head-attendance-view";
import HeadLeaveRequestsView from "./dashboards/head-leave-requests-view";
import HeadUsersView from "./dashboards/head-users-view";
import type { User, LeaveRequest } from "@/types";

interface HeadDashboardProps {
  user: User;
}

export default function HeadDashboard({ user }: HeadDashboardProps) {
  const [activeSection, setActiveSection] = useState("dashboard");

  // Queries
  const { data: leaveRequests } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
    refetchOnMount: true,
    staleTime: 0,
  });

  // Debug: Log leave requests data
  console.log("Head Dashboard - All leave requests:", leaveRequests);
  console.log("Head Dashboard - Pending count:", leaveRequests?.filter(req => req.status === 'pending').length);

  const pendingCount = leaveRequests?.filter(req => req.status === 'pending').length || 0;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <HeadSidebar 
        activeSection={activeSection} 
        onNavigate={setActiveSection}
        pendingLeaveCount={pendingCount}
      />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        <HeadHeader user={user} />

        <div className="p-8 pt-24">
          {/* Dashboard Home */}
          {activeSection === "dashboard" && (
            <HeadDashboardHome user={user} />
          )}

          {/* Attendance Section */}
          {activeSection === "attendance" && (
            <HeadAttendanceView user={user} />
          )}

          {/* Leave Requests Section */}
          {activeSection === "leave-requests" && (
            <HeadLeaveRequestsView user={user} />
          )}

          {/* Users Section */}
          {activeSection === "users" && (
            <HeadUsersView user={user} />
          )}
        </div>
      </div>
    </div>
  );
}