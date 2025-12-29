import { Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { User as UserType } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClassModeratorHeaderProps {
  user: UserType;
  className?: string;
}

export default function ClassModeratorHeader({ user, className }: ClassModeratorHeaderProps) {
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await apiRequest("POST", "/api/logout");
    setLocation("/");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className={`bg-white border-b border-gray-200 ${className || ""}`}>
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left Section - Logo & Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
            <span className="text-white font-bold text-lg">CM</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">University Attendance System</h1>
            <p className="text-sm text-gray-600">Class Moderator Portal</p>
          </div>
        </div>

        {/* Right Section - User Info & Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-3 hover:bg-gray-100 rounded-lg px-3 py-2"
              >
                <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg text-white font-semibold text-sm">
                  {getInitials(user.name)}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-600">Class Moderator</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
