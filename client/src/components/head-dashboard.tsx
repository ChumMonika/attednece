import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DashboardHeader from "./admin-header";
import { UserCheck, UserX, CalendarMinus, Clock, Building2, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import type { User, Stats, Attendance, LeaveRequest } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface HeadDashboardProps {
  user: User;
}

export default function HeadDashboard({ user }: HeadDashboardProps) {
  const { toast } = useToast();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Queries
  const { data: dashboardMetrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    queryFn: () => apiRequest("GET", "/api/dashboard/metrics").then(res => res.json()),
  });

  const { data: departmentSummary } = useQuery<any[]>({
    queryKey: ["/api/department-summary"],
  });

  const { data: attendanceData } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance-by-department", selectedDepartment],
    queryFn: () => {
      if (selectedDepartment === "all") {
        return apiRequest("GET", "/api/attendance-all").then(res => res.json());
      }
      return apiRequest("GET", `/api/attendance-by-department?department=${selectedDepartment}`).then(res => res.json());
    }
  });

  const { data: leaveRequests } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
  });

  // Mutations
  const respondToLeaveMutation = useMutation({
    mutationFn: ({ requestId, status, rejectionReason }: { requestId: number; status: "approved" | "rejected"; rejectionReason?: string }) =>
      apiRequest("POST", "/api/leave-requests/respond", { requestId, status, rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Leave request updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update leave request",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleApprove = (requestId: number) => {
    respondToLeaveMutation.mutate({ requestId, status: "approved" });
  };

  const openRejectDialog = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  const handleRejectSubmit = () => {
    if (!selectedRequest) return;
    respondToLeaveMutation.mutate(
      { requestId: selectedRequest.id, status: "rejected", rejectionReason },
      {
        onSuccess: () => {
          setIsRejectDialogOpen(false);
          setSelectedRequest(null);
          setRejectionReason("");
        }
      }
    );
  };

  // Computed values
  const departments = attendanceData ? 
    Array.from(new Set(attendanceData.map(record => record.user?.department).filter(Boolean))) as string[] : 
    [];

  const currentRoute = typeof window !== 'undefined' ? window.location.pathname : '';

  // Effects
  useEffect(() => {
    const fetchPendingLeaveRequests = async () => {
      try {
        const response = await apiRequest("GET", "/api/leave-requests");
        const data = await response.json();
        queryClient.setQueryData(["/api/leave-requests"], data);
      } catch (error) {
        console.error("Failed to fetch leave requests:", error);
      }
    };

    fetchPendingLeaveRequests();
    
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
      fetchPendingLeaveRequests();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user, refreshKey]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-100 via-pink-100 to-orange-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col py-8 px-4 h-screen fixed top-0 left-0 z-20 overflow-y-auto">
        <div className="flex items-center mb-10">
          <Building2 className="h-8 w-8 text-university-head mr-2" />
          <span className="text-2xl font-bold text-university-head">Head Panel</span>
        </div>
        <nav className="flex flex-col gap-2">
          <Link to="/head-dashboard" className={`flex items-center px-3 py-2 rounded-lg text-gray-700 font-medium hover:bg-university-head hover:text-white transition ${currentRoute === '/head-dashboard' ? 'bg-university-head text-white' : ''}`}> 
            <UserCheck className="h-5 w-5 mr-3" /> Dashboard
          </Link>
          <Link to="/attendance" className={`flex items-center px-3 py-2 rounded-lg text-gray-700 font-medium hover:bg-university-head hover:text-white transition ${currentRoute === '/attendance' ? 'bg-university-head text-white' : ''}`}> 
            <Clock className="h-5 w-5 mr-3" /> Attendance
          </Link>
          <Link to="/leave-requests" className={`flex items-center px-3 py-2 rounded-lg text-gray-700 font-medium hover:bg-university-head hover:text-white transition ${currentRoute === '/leave-requests' ? 'bg-university-head text-white' : ''}`}> 
            <CalendarMinus className="h-5 w-5 mr-3" /> Leave Requests
            {leaveRequests && leaveRequests.filter(req => req.status === 'pending').length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-university-warning text-white">
                {leaveRequests.filter(req => req.status === 'pending').length}
              </span>
            )}
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="ml-64 flex flex-col">
        <DashboardHeader
          user={user}
          title="Head Dashboard"
          subtitle="Manage leave requests and monitor attendance"
          borderColor="border-university-head"
          bgColor="bg-university-head"
        />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-university-success bg-opacity-10 rounded-lg flex items-center justify-center">
                    <UserCheck className="text-university-success h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Present Today</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardMetrics?.today?.present || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-university-error bg-opacity-10 rounded-lg flex items-center justify-center">
                    <UserX className="text-university-error h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Absent Today</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardMetrics?.today?.absent || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-university-warning bg-opacity-10 rounded-lg flex items-center justify-center">
                    <CalendarMinus className="text-university-warning h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">On Leave</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardMetrics?.today?.leave || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-university-blue bg-opacity-10 rounded-lg flex items-center justify-center">
                    <Clock className="text-university-blue h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardMetrics?.leaves?.pending || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Attendance Overview */}
            <Card>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Today's Attendance Overview</h2>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {attendanceData?.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {record.user?.name?.split(' ').map(n => n[0]).join('') || 'NA'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {record.user?.name} ({record.user?.uniqueId})
                          </p>
                          <p className="text-sm text-gray-600">{record.user?.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">{record.user?.schedule}</span>
                        <span
                          className={`px-3 py-1 text-white text-sm rounded-full ${
                            record.status === 'present'
                              ? 'bg-university-success'
                              : record.status === 'absent'
                              ? 'bg-university-error'
                              : 'bg-university-warning'
                          }`}
                        >
                          {record.status === 'present' ? 'Present' : record.status === 'absent' ? 'Absent' : 'On Leave'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewCv(record.user?.id || 0, record.user?.name || '')}
                          className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                          title={`View CV for ${record.user?.name}`}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View CV
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-6 bg-university-head text-white hover:bg-purple-800">
                  View Full Attendance Report
                </Button>
              </CardContent>
            </Card>

            {/* Pending Leave Requests */}
            <Card>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Pending Leave Requests</h2>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {leaveRequests?.filter(req => req.status === 'pending').map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{request.user?.name}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-university-warning bg-opacity-10 text-xs rounded-full" style={{ color: '#7c2d12' }}>
                          Pending
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-4">{request.reason}</p>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-university-success text-white hover:bg-green-700"
                          onClick={() => handleApprove(request.id)}
                          disabled={respondToLeaveMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => openRejectDialog(request)}
                          disabled={respondToLeaveMutation.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!leaveRequests?.filter(req => req.status === 'pending').length && (
                    <p className="text-sm text-gray-500 text-center py-4">No pending leave requests</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave request. This will be sent to the staff member.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rejection-reason" className="text-right">
                Reason
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="col-span-3"
                placeholder="Enter rejection reason..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={respondToLeaveMutation.isPending || !rejectionReason.trim()}
            >
              {respondToLeaveMutation.isPending ? "Rejecting..." : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}