import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { login } from "@/lib/auth";
import { GraduationCap } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uniqueId, setUniqueId] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: () => login(uniqueId, password),
    onSuccess: (data) => {
      // Clear any cached queries
      queryClient.clear();
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.name}!`,
      });
      
      // Client-side navigation to dashboard (no reload)
      setLocation(`/dashboard/${data.role}`);
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uniqueId || !password) {
      toast({
        title: "Error",
        description: "Please enter both Staff ID and password",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md mx-4 shadow-xl">
        <CardContent className="pt-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-university-blue rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="text-white text-2xl h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">University Staff Portal</h1>
            <p className="text-gray-600 mt-2">Access your attendance dashboard</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="uniqueId" className="block text-sm font-medium text-gray-700 mb-2">
                Staff ID
              </Label>
              <Input
                id="uniqueId"
                type="text"
                placeholder="Enter your unique ID"
                value={uniqueId}
                onChange={(e) => setUniqueId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent outline-none transition-all"
                disabled={loginMutation.isPending}
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent outline-none transition-all"
                disabled={loginMutation.isPending}
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-university-blue text-white py-3 px-4 rounded-lg hover:bg-blue-800 transition-colors font-medium"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
