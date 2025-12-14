import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import LeaveRequestsPage from "@/pages/leave-requests";
import AttendancePage from "@/pages/attendance";
import HeadDashboardPage from "@/pages/head-dashboard";
import UserManagementPage from "@/pages/user-management";
import AnalyticsPage from "@/pages/analytics";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard/:role" component={Dashboard} />
      <Route path="/head-dashboard" component={HeadDashboardPage} />
      <Route path="/attendance" component={AttendancePage} />
      <Route path="/leave-requests" component={LeaveRequestsPage} />
      <Route path="/user-management" component={UserManagementPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
