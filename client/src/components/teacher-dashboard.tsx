import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DashboardHeader from "./dashboard-header";
import { Check, X, CalendarMinus } from "lucide-react";
import type { User, Attendance, LeaveRequest } from "@/types";

interface TeacherDashboardProps {
  user: User;
}

export default function TeacherDashboard({ user }: TeacherDashboardProps) {
  const { toast } = useToast();
  const [leaveFormData, setLeaveFormData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const { data: attendanceHistory } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", user.id],
  });

  const { data: leaveRequests } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
  });

  const submitLeaveRequestMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/leave-request", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      setLeaveFormData({
        leaveType: "",
        startDate: "",
        endDate: "",
        reason: "",
      });
      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit leave request",
        variant: "destructive",
      });
    },
  });

  const handleSubmitLeaveRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveFormData.leaveType || !leaveFormData.startDate || !leaveFormData.endDate || !leaveFormData.reason) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    submitLeaveRequestMutation.mutate(leaveFormData);
  };

  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case "present":
        return <Check className="text-university-success h-5 w-5" />;
      case "absent":
        return <X className="text-university-error h-5 w-5" />;
      case "leave":
        return <CalendarMinus className="text-university-warning h-5 w-5" />;
      default:
        return null;
    }
  };

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "text-university-success";
      case "absent":
        return "text-university-error";
      case "leave":
        return "text-university-warning";
      default:
        return "text-gray-500";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-university-warning bg-opacity-10 text-university-warning";
      case "approved":
        return "bg-university-success bg-opacity-10 text-university-success";
      case "rejected":
        return "bg-university-error bg-opacity-10 text-university-error";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        user={user}
        title="Personal Dashboard"
        subtitle={`${user.name} - ${user.department} ${user.role === 'teacher' ? 'Teacher' : 'Staff'}`}
        borderColor="border-gray-600"
        bgColor="bg-gray-600"
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Attendance History */}
          <div className="lg:col-span-2">
            <Card>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">My Attendance History</h2>
              </div>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {attendanceHistory?.slice().reverse().slice(0, 10).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-university-success bg-opacity-10 rounded-full flex items-center justify-center">
                          {getAttendanceIcon(record.status)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getAttendanceStatusColor(record.status)}`}>
                          {record.status === 'present' ? 'Present' : record.status === 'absent' ? 'Absent' : 'On Leave'}
                        </p>
                        {record.markedAt && (
                          <p className="text-xs text-gray-500">{record.markedAt}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {!attendanceHistory?.length && (
                    <p className="text-center text-gray-500 py-8">No attendance records found</p>
                  )}
                </div>

                <Button className="w-full mt-6 bg-gray-600 text-white hover:bg-gray-700">
                  View Full History
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Leave Request Form and History */}
          <div className="space-y-6">
            {/* Leave Request Form */}
            <Card>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Submit Leave Request</h2>
              </div>
              <CardContent className="p-6">
                <form onSubmit={handleSubmitLeaveRequest} className="space-y-4">
                  <div>
                    <Label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 mb-2">
                      Leave Type
                    </Label>
                    <Select
                      value={leaveFormData.leaveType}
                      onValueChange={(value) => setLeaveFormData(prev => ({ ...prev, leaveType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                        <SelectItem value="Personal Leave">Personal Leave</SelectItem>
                        <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
                        <SelectItem value="Vacation">Vacation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={leaveFormData.startDate}
                      onChange={(e) => setLeaveFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={leaveFormData.endDate}
                      onChange={(e) => setLeaveFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      min={leaveFormData.startDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <Label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                      Reason
                    </Label>
                    <Textarea
                      id="reason"
                      rows={3}
                      placeholder="Please provide reason for leave..."
                      value={leaveFormData.reason}
                      onChange={(e) => setLeaveFormData(prev => ({ ...prev, reason: e.target.value }))}
                      className="resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gray-600 text-white hover:bg-gray-700"
                    disabled={submitLeaveRequestMutation.isPending}
                  >
                    {submitLeaveRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* My Leave Requests */}
            <Card>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">My Leave Requests</h2>
              </div>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {leaveRequests?.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">{request.leaveType}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{request.reason}</p>
                    </div>
                  ))}

                  {!leaveRequests?.length && (
                    <p className="text-center text-gray-500 py-4">No leave requests found</p>
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
