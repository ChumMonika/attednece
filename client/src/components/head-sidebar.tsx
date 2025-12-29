import { LucideIcon } from "lucide-react";
import { LayoutDashboard, Users, Calendar, ClipboardCheck, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck },
  { id: "leave-requests", label: "Leave Requests", icon: Calendar },
  { id: "users", label: "Department Users", icon: Users },
];

interface HeadSidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  pendingLeaveCount?: number;
}

export default function HeadSidebar({ activeSection, onNavigate, pendingLeaveCount = 0 }: HeadSidebarProps) {
  return (
    <div className="position: fixed w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Building2 className="h-7 w-7 text-purple-400" />
          <div>
            <h2 className="text-xl font-bold">Head Portal</h2>
            <p className="text-xs text-slate-400 mt-0.5">Department Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const showBadge = item.id === "leave-requests" && pendingLeaveCount > 0;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left",
                isActive 
                  ? "bg-purple-700 text-white font-medium shadow-lg" 
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500 text-white font-semibold">
                  {pendingLeaveCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-500">
          <p>Head Dashboard</p>
          <p className="mt-1">© 2025 University</p>
        </div>
      </div>
    </div>
  );
}
