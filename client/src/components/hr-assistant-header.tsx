import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";
import type { User } from "@/types";

interface HRAssistantHeaderProps {
  user: User;
}

export default function HRAssistantHeader({ user }: HRAssistantHeaderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      setLocation("/login");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    },
  });

  return (
    <header className="bg-white border-b border-gray-200 fixed top-0 right-0 left-64 z-50 shadow-sm">
      <div className="w-full">
        <div className="flex items-center justify-between">
          {/* Left Side - Logo/Title */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">HR</span>
            </div>
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">University Attendance System</h1>
                <p className="text-xs text-gray-500 mt-0.5">HR Assistant Portal - Staff Management</p>
              </div>
            </div>
          </div>

          {/* Right Side - User Info & Actions */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">HR Assistant</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center ring-2 ring-white shadow-md">
                <span className="text-white font-semibold text-sm">
                  {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}