import { useState } from "react";
import type { User } from "@/types";
import AdminHeader from "./admin-header";
import NewAdminSidebar from "./new-admin-sidebar";
import DashboardHome from "./dashboard-home";
import UserManagementTable from "./user-management-table";
import ClassesPage from "./classes-page";
import DepartmentsConfig from "./config-departments";
import MajorsConfig from "./config-majors";
import SubjectsConfig from "./config-subjects";
import SchedulesPage from "./schedules-page";
import AddUserModal from "./add-user-modal";

interface NewAdminDashboardProps {
  user: User;
}

export default function NewAdminDashboard({ user }: NewAdminDashboardProps) {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardHome onNavigate={setActiveSection} onAddUser={() => setShowAddUserModal(true)} />;
      case "users":
        return <UserManagementTable onAddUser={() => setShowAddUserModal(true)} />;
      case "classes":
        return <ClassesPage />;
      case "schedules":
        return <SchedulesPage />;
      case "departments":
        return <DepartmentsConfig />;
      case "majors":
        return <MajorsConfig />;
      case "subjects":
        return <SubjectsConfig />;
      default:
        return <DashboardHome onNavigate={setActiveSection} onAddUser={() => setShowAddUserModal(true)} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader user={user} />
      <div className="flex">
        <NewAdminSidebar activeSection={activeSection} onNavigate={setActiveSection} />
        <main className="flex-1 ml-64">
          {renderContent()}
        </main>
      </div>
      
      {showAddUserModal && (
        <AddUserModal
          isOpen={showAddUserModal}
          onClose={() => setShowAddUserModal(false)}
          editingUser={null}
        />
      )}
    </div>
  );
}
