import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DashboardHeader from "./dashboard-header";
import { UserCheck, UserX, CalendarMinus, Clock } from "lucide-react";
import type { User, Stats, Attendance, LeaveRequest } from "@/types";

interface HeadDashboardProps {
  user: User;
}

export default function HeadDashboard({ user }: HeadDashboardProps) {
  const { toast } = useToast();

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: attendanceData } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance-all"],
  });

  const { data: leaveRequests } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
  });

  const respondToLeaveMutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: number; status: string }) =>
      apiRequest("POST", "/api/leave-requests/respond", { requestId, status }),
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

  const handleLeaveResponse = (requestId: number, status: "approved" | "rejected") => {
    respondToLeaveMutation.mutate({ requestId, status });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        user={user}
        title="Head Dashboard"
        subtitle={user.name}
        borderColor="border-university-head"
        bgColor="bg-university-head"
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
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
                  <p className="text-2xl font-bold text-gray-900">{stats?.present || 0}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{stats?.absent || 0}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{stats?.onLeave || 0}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{stats?.pendingRequests || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Attendance Overview */}
          <div className="lg:col-span-2">
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
                      </div>
                    </div>
                  ))}
                </div>

                <Button className="w-full mt-6 bg-university-head text-white hover:bg-purple-800">
                  View Full Attendance Report
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Leave Requests */}
          <div>
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
                        <span className="px-2 py-1 bg-university-warning bg-opacity-10 text-university-warning text-xs rounded-full">
                          Pending
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-4">{request.reason}</p>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-university-success text-white hover:bg-green-700"
                          onClick={() => handleLeaveResponse(request.id, "approved")}
                          disabled={respondToLeaveMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleLeaveResponse(request.id, "rejected")}
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
    </div>
  );
}
