import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { UserCheck, Clock, CalendarMinus, Building2} from "lucide-react";
import DashboardHeader from "@/components/admin-header";
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import type { LeaveRequest } from "@/types";

export default function LeaveRequestsPage() {
  // Auto-refresh state
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Set up auto-refresh
  useEffect(() => {
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected' | 'pending'>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: leaveRequests } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests", refreshKey],
  });

  // Filter leave requests by status
  const filteredLeaveRequests = leaveRequests?.filter(req => {
    if (statusFilter === 'all') return true;
    return req.status === statusFilter;
  }) || [];

  // Only show requests that overlap the selected date
  const displayedRequests = filteredLeaveRequests.filter(req => {
    if (!selectedDate) return false;
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    // Compare only date part
    return start <= selectedDate && end >= selectedDate;
  });

  const currentRoute = typeof window !== 'undefined' ? window.location.pathname : '';
  return (  
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-pink-100 to-orange-100 flex">
      {/* Sidebar Navigation */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col py-8 px-4 min-h-screen sticky top-0 z-20">
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
      <div className="flex-1 flex flex-col">
        <DashboardHeader 
          user={{ id: 0, name: "Head User", uniqueId: "0000", department: "All", role: "head", status: "active" }}
          title="Leave Requests Dashboard"
          subtitle="Pending and processed leave requests"
          borderColor="border-university-head"
          bgColor="bg-university-head"
        />
        <div className="flex-1 flex flex-col items-center py-12">
          {/* Header and Back Button */}
          <div className="w-full max-w-2xl mb-6">
            <div className="flex items-center justify-between py-4 px-2">
              <button
                onClick={() => window.history.back()}
                className="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <h1 className="text-2xl font-bold text-university-head">Leave Requests</h1>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'all' | 'approved' | 'rejected' | 'pending')}
                className="ml-4 px-3 py-2 border rounded text-sm"
              >
                <option value="all">All</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          {/* Combined Calendar and Day Timeline */}
          <div className="w-full h-full min-h-screen px-4 pb-8">
            <Card className="w-full h-full min-h-[700px]" >
              <CardContent className="p-4 flex justify-center border-b border-gray-200">
                <input
                  type="date"
                  value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                  onChange={e => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
                  className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  style={{ width: '180px' }}
                />
              </CardContent>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedDate ? selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Select a date'}
                </h2>
              </div>
              <CardContent className="p-6">
                <div className="relative min-h-[600px]">
                  {/* Timeline hours (optional: can be just All Day) */}
                  <div className="absolute left-0 top-0 flex flex-col h-full justify-between text-xs text-gray-400" style={{height: '600px'}}>
                    {[...Array(13)].map((_, i) => (
                      <div key={i} style={{height: '46px'}}>{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? 'Noon' : `${i-12} PM`}</div>
                    ))}
                  </div>
                  {/* Events for the selected day */}
                  <div className="ml-20">
                    {displayedRequests.length > 0 ? (
                      displayedRequests.map(request => {
                        const badgeColor = request.status === 'pending'
                          ? 'bg-yellow-200 text-yellow-900'
                          : request.status === 'approved'
                          ? 'bg-green-200 text-green-900'
                          : 'bg-red-200 text-red-900';
                        return (
                          <div key={request.id} className={`mb-4 rounded-lg shadow-md px-4 py-3 ${badgeColor} w-3/4`}> 
                            <div className="font-semibold">{request.user?.name}</div>
                            <div className="text-xs mb-1">{new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}</div>
                            <div className="text-xs">{request.reason}</div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No leave requests for this day</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
