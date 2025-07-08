import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Bus, UserCog, Presentation, Users, User as UserIcon } from "lucide-react";
import type { User } from "@/types";

interface DashboardHeaderProps {
  user: User;
  title: string;
  subtitle: string;
  borderColor: string;
  bgColor: string;
  children?: React.ReactNode;
}

export default function DashboardHeader({ 
  user, 
  title, 
  subtitle, 
  borderColor, 
  bgColor,
  children 
}: DashboardHeaderProps) {
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "head":
        return <Bus className="text-white" />;
      case "admin":
        return <UserCog className="text-white" />;
      case "mazer":
        return <Presentation className="text-white" />;
      case "assistant":
        return <Users className="text-white" />;
      default:
        return <UserIcon className="text-white" />;
    }
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <header className={`bg-white shadow-sm border-b-4 ${borderColor}`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center`}>
              {getRoleIcon(user.role)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-600">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {children}
            <span className="text-sm text-gray-600">{getCurrentDate()}</span>
            <Button
              variant="ghost"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
