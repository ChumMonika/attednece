import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2, XCircle, Building2 } from "lucide-react";
import type { User } from "@/types";

interface LeaveRequest {
  id: number;
  userId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: string;
  user?: User;
}

interface HeadLeaveRequestsViewProps {
  user: User;
}

export default function HeadLeaveRequestsView({ user }: HeadLeaveRequestsViewProps) {
  const { toast } = useToast();
  
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingItemsPerPage, setPendingItemsPerPage] = useState(10);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);

  const { data: leaveRequests, isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
    refetchOnMount: true,
    staleTime: 0,
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    refetchOnMount: true,
    staleTime: 0,
  });

  // Mutation for responding to leave requests
  const respondToLeaveMutation = useMutation({
    mutationFn: ({
      requestId,
      status,
      rejectionReason,
    }: {
      requestId: number;
      status: "approved" | "rejected";
      rejectionReason?: string;
    }) =>
      apiRequest("POST", "/api/leave-requests/respond", {
        requestId,
        status,
        rejectionReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Success",
        description: "Leave request updated successfully",
      });
      setProcessingIds((prev) => new Set(prev));
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update leave request",
        variant: "destructive",
      });
    },
  });

  // Get department users for filtering
  const departmentUserIds = new Set(
    allUsers?.filter(u => u.departmentId === user.departmentId).map(u => u.id) || []
  );

  // Get available classes from attendance records (if available)
  // Note: Leave requests don't have direct class association
  const availableClasses: string[] = [];

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (dateFilter === "today") {
      return { start: startOfToday, end: new Date() };
    } else if (dateFilter === "week") {
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
      startOfWeek.setHours(0, 0, 0, 0);
      return { start: startOfWeek, end: new Date() };
    } else if (dateFilter === "month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      return { start: startOfMonth, end: new Date() };
    } else {
      return { start: new Date("2000-01-01"), end: new Date("2099-12-31") };
    }
  };

  const dateRange = getDateRange();

  // Filter leave requests
  const filteredRequests = leaveRequests?.filter((request) => {
    // 1. Department scoping (automatic)
    const isDepartmentUser = departmentUserIds.has(request.userId);
    if (!isDepartmentUser) return false;

    // 2. Date filter - use startDate
    const requestDate = request.startDate ? new Date(request.startDate) : null;
    if (!requestDate) return false;
    const isWithinDateRange = requestDate >= dateRange.start && requestDate <= dateRange.end;
    if (!isWithinDateRange) return false;

    // 3. Role filter
    const roleMatches =
      roleFilter === "all" ||
      (roleFilter === "teacher" && request.user?.role === "teacher") ||
      (roleFilter === "staff" && request.user?.role === "staff");

    return roleMatches;
  }) || [];

  // Separate pending and approved/rejected requests
  const pendingRequests = filteredRequests.filter((r) => r.status === "pending");
  const historyRequests = filteredRequests.filter((r) => r.status !== "pending");

  // Pagination for pending requests
  const pendingStartIndex = (pendingPage - 1) * pendingItemsPerPage;
  const paginatedPendingRequests = pendingRequests.slice(
    pendingStartIndex,
    pendingStartIndex + pendingItemsPerPage
  );
  const pendingTotalPages = Math.ceil(pendingRequests.length / pendingItemsPerPage);

  // Pagination for history requests
  const historyStartIndex = (historyPage - 1) * historyItemsPerPage;
  const paginatedHistoryRequests = historyRequests.slice(
    historyStartIndex,
    historyStartIndex + historyItemsPerPage
  );
  const historyTotalPages = Math.ceil(historyRequests.length / historyItemsPerPage);

  // Handle approve
  const handleApprove = (requestId: number) => {
    setProcessingIds((prev) => new Set(prev).add(requestId));
    respondToLeaveMutation.mutate({ requestId, status: "approved" });
  };

  // Open reject dialog
  const openRejectDialog = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  // Handle reject submission
  const handleRejectSubmit = () => {
    if (!selectedRequest) return;
    setProcessingIds((prev) => new Set(prev).add(selectedRequest.id));
    respondToLeaveMutation.mutate(
      {
        requestId: selectedRequest.id,
        status: "rejected",
        rejectionReason,
      },
      {
        onSuccess: () => {
          setIsRejectDialogOpen(false);
          setSelectedRequest(null);
          setRejectionReason("");
        },
      }
    );
  };

  // Get leave type display
  const getLeaveTypeLabel = (leaveType: string) => {
    const types: { [key: string]: string } = {
      sick: "Sick Leave",
      personal: "Personal Leave",
      annual: "Annual Leave",
      maternity: "Maternity Leave",
      paternity: "Paternity Leave",
      bereavement: "Bereavement Leave",
      study: "Study Leave",
      other: "Other",
    };
    return types[leaveType.toLowerCase()] || leaveType;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Leave Request Management
        </h1>
        <p className="text-gray-600">
          Review Staffs leave requests in your department
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          {/* Info Bar */}
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
            <div className="flex items-center gap-2 text-sm text-purple-900">
              <Building2 className="h-4 w-4" />
              <span className="font-semibold">Department:</span>
              <span>{user.department?.name || "N/A"}</span>
              <span className="mx-2">•</span>
              <span className="font-semibold">Total Requests:</span>
              <span>{filteredRequests.length}</span>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <Select value={dateFilter} onValueChange={(value: any) => {
                setDateFilter(value);
                setPendingPage(1);
                setHistoryPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Requests ({pendingRequests.length})
            </h2>
          </div>
          
          {pendingRequests.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show:</span>
              <Select
                value={pendingItemsPerPage.toString()}
                onValueChange={(value) => {
                  setPendingItemsPerPage(Number(value));
                  setPendingPage(1);
                }}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">requests</span>
            </div>
          )}
        </div>

        {paginatedPendingRequests.length > 0 ? (
          <div className="space-y-4">
            {paginatedPendingRequests.map((request) => {
              const isProcessing = processingIds.has(request.id);
              return (
                <Card key={request.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {request.user?.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {request.user?.uniqueId} • {request.user?.role.replace("_", " ")}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                          Pending
                        </span>
                      </div>

                      {/* Leave Type & Dates */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 bg-gray-50 rounded-lg px-4">
                        <div>
                          <p className="text-xs text-gray-600 font-semibold uppercase">Leave Type</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {getLeaveTypeLabel(request.leaveType)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-semibold uppercase">From</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {new Date(request.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-semibold uppercase">To</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {new Date(request.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-xs text-blue-600 font-semibold uppercase mb-2">
                          Reason
                        </p>
                        <p className="text-sm text-gray-700">{request.reason}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3 pt-4 border-t border-gray-200">
                        <Button
                          onClick={() => handleApprove(request.id)}
                          disabled={isProcessing || respondToLeaveMutation.isPending}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {isProcessing ? "Approving..." : "Approve"}
                        </Button>
                        <Button
                          onClick={() => openRejectDialog(request)}
                          disabled={isProcessing || respondToLeaveMutation.isPending}
                          variant="destructive"
                          className="flex-1 font-semibold"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {isProcessing ? "Rejecting..." : "Reject"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No pending leave requests</p>
            </CardContent>
          </Card>
        )}

        {/* Pagination for Pending Requests */}
        {pendingTotalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {pendingStartIndex + 1} to {Math.min(pendingStartIndex + pendingItemsPerPage, pendingRequests.length)} of {pendingRequests.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPendingPage((prev) => Math.max(prev - 1, 1))}
                disabled={pendingPage === 1}
                className="text-sm h-8"
              >
                Previous
              </Button>
              {Array.from({ length: pendingTotalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingPage(page)}
                  className={`w-8 h-8 p-0 text-sm ${
                    pendingPage === page
                      ? "bg-gray-900 text-white hover:bg-gray-800 hover:text-white"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPendingPage((prev) => Math.min(prev + 1, pendingTotalPages))}
                disabled={pendingPage === pendingTotalPages}
                className="text-sm h-8"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Leave Request History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Leave Request History ({historyRequests.length})
            </h2>
          </div>
          
          {historyRequests.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show:</span>
              <Select
                value={historyItemsPerPage.toString()}
                onValueChange={(value) => {
                  setHistoryItemsPerPage(Number(value));
                  setHistoryPage(1);
                }}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">requests</span>
            </div>
          )}
        </div>

        {paginatedHistoryRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg overflow-hidden shadow-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Leave Type
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Dates
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Decision
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedHistoryRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {request.user?.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getLeaveTypeLabel(request.leaveType)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(request.startDate).toLocaleDateString()} -{" "}
                      {new Date(request.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          request.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {request.status.charAt(0).toUpperCase() +
                          request.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {request.status === "approved" ? (
                        <span className="text-green-600 font-medium">✓ Approved</span>
                      ) : (
                        <span className="text-red-600 font-medium">✗ Rejected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No leave request history</p>
            </CardContent>
          </Card>
        )}

        {/* Pagination for History Requests */}
        {historyTotalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {historyStartIndex + 1} to {Math.min(historyStartIndex + historyItemsPerPage, historyRequests.length)} of {historyRequests.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 1))}
                disabled={historyPage === 1}
                className="text-sm h-8"
              >
                Previous
              </Button>
              {Array.from({ length: historyTotalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant="ghost"
                  size="sm"
                  onClick={() => setHistoryPage(page)}
                  className={`w-8 h-8 p-0 text-sm ${
                    historyPage === page
                      ? "bg-gray-900 text-white hover:bg-gray-800 hover:text-white"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryPage((prev) => Math.min(prev + 1, historyTotalPages))}
                disabled={historyPage === historyTotalPages}
                className="text-sm h-8"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Rejection Reason Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedRequest?.user?.name}'s leave
              request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this leave request is being rejected..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={respondToLeaveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={
                respondToLeaveMutation.isPending || !rejectionReason.trim()
              }
            >
              {respondToLeaveMutation.isPending ? "Rejecting..." : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
