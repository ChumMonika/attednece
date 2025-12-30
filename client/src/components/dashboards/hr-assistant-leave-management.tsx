import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, MessageSquare, Filter, ChevronDown, ChevronUp, Users } from "lucide-react";
import type { User, LeaveRequest } from "@/types";

interface HRAssistantLeaveManagementProps {
  user: User;
}

export default function HRAssistantLeaveManagement({ user }: HRAssistantLeaveManagementProps) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('GET', `/api/leave-requests/all`);
      const data = await response.json() as LeaveRequest[];
      setLeaveRequests(data);
    } catch {
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();

    const interval = setInterval(() => {
      fetchLeaveRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRespondToRequest = async (requestId: number, status: 'approved' | 'rejected') => {
    try {
      const response = await apiRequest('PUT', `/api/leave-request/${requestId}/respond`, {
        status,
        responseMessage: responseMessage.trim() || undefined,
      });

      if (response.ok) {
        fetchLeaveRequests();
        setShowResponseModal(false);
        setSelectedRequest(null);
        setResponseMessage('');
      }
    } catch (error) {
      console.error('Failed to respond to leave request:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filteredRequests = leaveRequests.filter(request =>
    statusFilter === 'all' || request.status === statusFilter
  );

  const calculateStats = () => {
    const total = leaveRequests.length;
    const pending = leaveRequests.filter(lr => lr.status === 'pending').length;
    const approved = leaveRequests.filter(lr => lr.status === 'approved').length;
    const rejected = leaveRequests.filter(lr => lr.status === 'rejected').length;

    return { total, pending, approved, rejected };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600">Review and manage staff leave requests</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.total}</p>
              </div>
              <div className="h-14 w-14 bg-green-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
              </div>
              <div className="h-14 w-14 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="h-7 w-7 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.approved}</p>
              </div>
              <div className="h-14 w-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected}</p>
              </div>
              <div className="h-14 w-14 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="h-7 w-7 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Filter by status:</label>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests List */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-green-600" />
            Leave Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading leave requests...</p>
            </div>
          ) : filteredRequests.length > 0 ? (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 capitalize">
                          {request.leaveType} Leave - {request.userName || 'Unknown User'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Requested: {new Date(request.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getStatusColor(request.status)}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                      {request.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowResponseModal(true);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedRequestId(expandedRequestId === request.id ? null : request.id)}
                      >
                        {expandedRequestId === request.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {expandedRequestId === request.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Request Details</h5>
                          <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Type:</span> {request.leaveType}</p>
                            <p><span className="font-medium">Duration:</span> {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}</p>
                            <p><span className="font-medium">Reason:</span> {request.reason}</p>
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Response Details</h5>
                          <div className="space-y-2 text-sm">
                            {request.status !== 'pending' ? (
                              <>
                                <p><span className="font-medium">Responded:</span> {new Date(request.respondedAt || request.updatedAt).toLocaleString()}</p>
                                <p><span className="font-medium">By:</span> {request.respondedBy ? 'HR Assistant' : 'System'}</p>
                                {request.responseMessage && (
                                  <p><span className="font-medium">Message:</span> {request.responseMessage}</p>
                                )}
                              </>
                            ) : (
                              <p className="text-gray-500">Awaiting response</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No leave requests found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Modal */}
      <Dialog open={showResponseModal} onOpenChange={setShowResponseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Leave Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900">{selectedRequest.userName || 'Unknown User'}</h4>
                <p className="text-sm text-gray-600 capitalize">{selectedRequest.leaveType} Leave</p>
                <p className="text-sm text-gray-600">
                  {new Date(selectedRequest.startDate).toLocaleDateString()} - {new Date(selectedRequest.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600 mt-2">{selectedRequest.reason}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Response Message (Optional)</label>
                <Textarea
                  placeholder="Add a message for the employee..."
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResponseModal(false);
                    setSelectedRequest(null);
                    setResponseMessage('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => handleRespondToRequest(selectedRequest.id, 'rejected')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleRespondToRequest(selectedRequest.id, 'approved')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}