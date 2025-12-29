import { LucideIcon } from "lucide-react";
import { LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, Settings, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  submenu?: { id: string; label: string }[];
}

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "User Management", icon: Users },
  { 
    id: "academic", 
    label: "Academic Setup", 
    icon: GraduationCap,
    submenu: [
      { id: "classes", label: "Classes" },
      { id: "schedules", label: "Schedules" },
    ]
  },
  { 
    id: "configuration", 
    label: "Configuration", 
    icon: Settings,
    submenu: [
      { id: "departments", label: "Departments" },
      { id: "majors", label: "Majors" },
      { id: "subjects", label: "Subjects" },
    ]
  },
];

interface NewAdminSidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

export default function NewAdminSidebar({ activeSection, onNavigate }: NewAdminSidebarProps) {
  return (
    <div className="position: fixed w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-bold">Admin Portal</h2>
        <p className="text-xs text-slate-400 mt-1">System Management</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id || item.submenu?.some(sub => sub.id === activeSection);
          
          return (
            <div key={item.id}>
              <button
                onClick={() => onNavigate(item.submenu ? item.submenu[0].id : item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left",
                  isActive 
                    ? "bg-slate-800 text-white font-medium" 
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
              
              {/* Submenu */}
              {item.submenu && isActive && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.submenu.map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => onNavigate(subItem.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all text-left",
                        activeSection === subItem.id
                          ? "bg-slate-700 text-white font-medium"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                      )}
                    >
                      <span className="w-1 h-1 rounded-full bg-slate-500" />
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-500">
          <p>Version 2.0.0</p>
          <p className="mt-1">© 2025 University</p>
        </div>
      </div>
    </div>
  );
}
