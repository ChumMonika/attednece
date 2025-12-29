import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardHeader from "./admin-header";
// Removed TeacherSidebar import
import { CheckCircle, AlertCircle, Calendar, Clock, User as UserIcon, Mail, Building, GraduationCap, TrendingUp, Plus, Filter, ChevronDown, ChevronUp, Megaphone } from "lucide-react";
import type { User, LeaveRequest, Attendance } from "@/types";

interface TeacherDashboardProps {
  user: User;
}

export default function TeacherDashboard({ user }: TeacherDashboardProps) {
  // Announcements (demo data)
  const [announcements] = useState([
    { id: 1, title: "Staff Meeting Friday", message: "All teachers are required to attend the staff meeting this Friday at 2pm in the main hall.", date: "2025-11-12" },
    { id: 2, title: "Exam Schedule Released", message: "The final exam schedule has been published. Please check your department portal.", date: "2025-11-10" },
  ]);

  // Modal for leave request
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  // Show more/less state for leave request history
  const [showAllHistory, setShowAllHistory] = useState(false);
  if (!user) return <div className="text-center py-10">Loading user info...</div>;

  const [refreshKey, setRefreshKey] = useState(0);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loadingLeaveRequests, setLoadingLeaveRequests] = useState(false);
  const [form, setForm] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    error: '',
    submitting: false,
  });

  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [expandedLeaveRequestId, setExpandedLeaveRequestId] = useState<number | null>(null);
  const [approverMap, setApproverMap] = useState<{ [userId: number]: { name: string } }>({});
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all');

  // Helper to get current day name
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };
  const currentDay = getCurrentDay();

  // Fetch teacher's schedules (enriched)
  const { data: mySchedules } = useQuery<any[]>({
    queryKey: ["/api/my-schedules"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/my-schedules");
      return res.json();
    }
  });

  const monthOptions = (() => {
    const months: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      months.push({ value, label });
    }
    return months;
  })();

  const filteredAttendance = attendanceHistory.filter(att =>
    selectedMonth ? att.date.startsWith(selectedMonth) : true
  );

  const pendingLeaveRequests = leaveRequests.filter(lr => lr.status === 'pending');
  const leaveRequestHistory = leaveRequests.filter(lr => lr.status !== 'pending');
  const filteredLeaveRequestHistory = leaveRequestHistory.filter(lr =>
    historyStatusFilter === 'all' ? true : lr.status === historyStatusFilter
  );

  // Calculate attendance stats
  const attendanceStats = {
    present: filteredAttendance.filter(att => att.status === 'present').length,
    absent: filteredAttendance.filter(att => att.status === 'absent').length,
    leave: filteredAttendance.filter(att => att.status === 'leave').length,
    total: filteredAttendance.length
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForm(f => ({ ...f, error: '' }));

    if (!form.leaveType || !form.startDate || !form.endDate || !form.reason) {
      setForm(f => ({ ...f, error: 'Please fill all fields.' }));
      return;
    }
    if (form.endDate < form.startDate) {
      setForm(f => ({ ...f, error: 'End date cannot be before start date.' }));
      return;
    }

    setForm(f => ({ ...f, submitting: true }));
    try {
      const res = await apiRequest("POST", "/api/leave-request", {
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      });
      const data = await res.json();
      if (data && (data.success || data.id)) {
        fetchLeaveRequests();
        setForm({ leaveType: '', startDate: '', endDate: '', reason: '', error: '', submitting: false });
      } else {
        setForm(f => ({ ...f, error: data.message || 'Failed to submit leave request.', submitting: false }));
      }
    } catch (err: any) {
      setForm(f => ({ ...f, error: err.message || 'Failed to submit leave request.', submitting: false }));
    }
  };

  async function fetchLeaveRequests() {
    setLoadingLeaveRequests(true);
    try {
      const response = await apiRequest('GET', `/api/leave-requests?userId=${user.id}`);
      const data = await response.json() as LeaveRequest[];
      setLeaveRequests(data);
    } catch {
      setLeaveRequests([]);
    } finally {
      setLoadingLeaveRequests(false);
    }
  }

  const fetchAttendanceHistory = async () => {
    setLoadingAttendance(true);
    try {
      const res = await apiRequest("GET", `/api/my-attendance`);
      const data = await res.json();
      setAttendanceHistory(Array.isArray(data) ? data : []);
    } catch {
      setAttendanceHistory([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
    fetchAttendanceHistory();

    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
      fetchLeaveRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const nonPending = leaveRequests.filter(
      lr => lr.status !== 'pending' && lr.respondedBy && !approverMap[lr.respondedBy]
    );
    if (nonPending.length === 0) return;

    Promise.all(
      nonPending.map(lr =>
        fetch(`/api/user/${lr.respondedBy}`)
          .then(res => res.json())
          .then(u => ({ userId: lr.respondedBy, name: u.name }))
      )
    ).then(users => {
      setApproverMap(prev => {
        const map = { ...prev };
        users.forEach(u => {
          if (u.userId) map[u.userId] = { name: u.name };
        });
        return map;
      });
    });
  }, [leaveRequests]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Removed sidebar layout */}
      <div>
        <DashboardHeader
          user={user}
          title="Teacher Dashboard"
          subtitle={`Welcome back, ${user.name}!`}
          borderColor="border-blue-200"
          bgColor="bg-white/80 backdrop-blur-sm shadow-sm"
        />
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Profile Card */}
            <Card className="card-modern shadow-xl border-0 overflow-hidden animate-fade-in lg:col-span-1">
              <div className="p-6 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4 shadow-lg">
                  <UserIcon className="w-12 h-12 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-blue-700 mb-1">{user.name}</h2>
                <p className="text-sm text-gray-600 mb-2">{user.department} Teacher</p>
                <div className="flex flex-col gap-1 text-gray-500 text-sm">
                  <span className="flex items-center"><Mail className="w-4 h-4 mr-2" /> {user.email}</span>
                  <span className="flex items-center"><Building className="w-4 h-4 mr-2" /> {user.department}</span>
                </div>
              </div>
            </Card>

            {/* Today's Teaching Schedule (primary) */}
            <Card className="card-modern shadow-xl border-0 animate-fade-in lg:col-span-3">
              <div className="p-6 flex items-center border-b border-gray-100">
                <Calendar className="w-6 h-6 text-indigo-500 mr-3" />
                <h2 className="text-xl font-bold text-gray-800">Today's Teaching Schedule</h2>
                <p className="text-sm text-gray-500 ml-4">{currentDay}</p>
              </div>
              <CardContent className="p-6">
                {mySchedules && mySchedules.filter((s: any) => s.day === currentDay).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">You have no classes today</p>
                  </div>
                )}

                {mySchedules && mySchedules.filter((s: any) => s.day === currentDay).length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Subject (Code)</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Class</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Room</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mySchedules.filter((s: any) => s.day === currentDay).map((s: any) => (
                          <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-4 text-sm font-semibold text-gray-900"><Clock className="w-5 h-5 inline mr-2 text-indigo-500" />{s.startTime} – {s.endTime}</td>
                            <td className="px-4 py-4 text-sm">
                              <div className="font-medium text-gray-900">{s.subject?.name || 'Unknown Subject'}</div>
                              <div className="text-xs text-gray-500">{s.subject?.code || ''}</div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-700">{s.classLabel}</td>
                            <td className="px-4 py-4 text-sm text-gray-600">{s.room}</td>
                            <td className="px-4 py-4 text-sm">
                              {attendanceHistory.find(a => a.scheduleId === s.id) ? (
                                (() => {
                                  const a = attendanceHistory.find(a => a.scheduleId === s.id)!;
                                  const label = a.status.charAt(0).toUpperCase() + a.status.slice(1);
                                  const className = a.status === 'present' ? 'bg-green-100 text-green-800' : a.status === 'leave' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600';
                                  return (
                                    <div>
                                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${className}`}>{label}</span>
                                      {a.markedByName && <div className="text-xs text-gray-400">Marked by {a.markedByName}</div>}
                                    </div>
                                  );
                                })()
                              ) : (
                                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">Pending</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Attendance Card */}
            <Card className="card-modern shadow-xl border-0 animate-fade-in">
              <div className="bg-gradient-to-r from-blue-400 to-indigo-500 p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <Calendar className="w-6 h-6 mr-3" /> Attendance History
                  </h2>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-white/50 focus:outline-none"
                  >
                    {monthOptions.map(m => (
                      <option key={m.value} value={m.value} className="text-gray-900">{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <CardContent className="p-6">
                {loadingAttendance ? (
                  <div className="text-center py-12">
                    <div className="spinner-modern w-8 h-8 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading attendance data...</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto space-y-3">
                    {filteredAttendance.length > 0 ? (
                      filteredAttendance.map(att => (
                        <div key={att.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{att.date}</div>
                            {att.schedule && (
                              <div className="text-sm text-gray-600">{att.schedule.classInfo?.classLabel || att.schedule.classLabel || ''} — {att.schedule.subject?.name || ''}</div>
                            )}
                            {att.markedByName && <div className="text-xs text-gray-400">Marked by {att.markedByName}</div>}
                          </div>
                          <div>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              att.status === 'present' ? 'bg-green-100 text-green-800' :
                              att.status === 'absent' ? 'bg-red-100 text-red-800' :
                              att.status === 'leave' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {att.status.charAt(0).toUpperCase() + att.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No attendance records found</p>
                        <p className="text-sm">for this month.</p>
                      </div>
                    )}
                  </div>
                )}
                {/* Attendance stats */}
                <div className="flex justify-between mt-6">
                  <div className="flex flex-col items-center">
                    <span className="text-green-600 font-bold text-lg">{attendanceStats.present}</span>
                    <span className="text-xs text-gray-500">Present</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-red-600 font-bold text-lg">{attendanceStats.absent}</span>
                    <span className="text-xs text-gray-500">Absent</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-yellow-600 font-bold text-lg">{attendanceStats.leave}</span>
                    <span className="text-xs text-gray-500">Leave</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-blue-600 font-bold text-lg">{attendanceStats.total}</span>
                    <span className="text-xs text-gray-500">Total</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Leave Request Card */}
            <Card className="card-modern shadow-xl border-0 animate-fade-in">
              <div className="p-6 flex items-center justify-between border-b border-gray-100">
                <h3 className="text-lg font-semibold flex items-center"><AlertCircle className="w-5 h-5 mr-2 text-yellow-500" /> Request Leave</h3>
                <Button size="sm" className="bg-blue-500 text-white rounded-lg shadow" onClick={() => setShowLeaveModal(true)}>
                  <Plus className="w-4 h-4 mr-1" /> New Request
                </Button>
              </div>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 mb-2">Submit a leave request using the form.</p>
                <ul className="space-y-2">
                  {pendingLeaveRequests.length > 0 ? pendingLeaveRequests.map(lr => (
                    <li key={lr.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg shadow-sm">
                      <span className="font-medium text-gray-900">{lr.leaveType}</span>
                      <span className="text-xs text-gray-500">{lr.startDate} to {lr.endDate}</span>
                      <span className="px-2 py-1 rounded-full bg-yellow-200 text-yellow-800 text-xs font-semibold">Pending</span>
                    </li>
                  )) : <li className="text-gray-400 text-sm">No pending requests</li>}
                </ul>
              </CardContent>
            </Card>

            {/* Leave History Card */}
            <Card className="card-modern shadow-xl border-0 animate-fade-in">
              <div className="p-6 flex items-center border-b border-gray-100">
                <h3 className="text-lg font-semibold flex items-center"><Clock className="w-5 h-5 mr-2 text-indigo-500" /> Leave History</h3>
              </div>
              <CardContent className="p-6">
                <div className="flex gap-2 mb-4">
                  <Button size="sm" variant={historyStatusFilter === 'all' ? 'default' : 'outline'} onClick={() => setHistoryStatusFilter('all')}>All</Button>
                  <Button size="sm" variant={historyStatusFilter === 'approved' ? 'default' : 'outline'} onClick={() => setHistoryStatusFilter('approved')}>Approved</Button>
                  <Button size="sm" variant={historyStatusFilter === 'rejected' ? 'default' : 'outline'} onClick={() => setHistoryStatusFilter('rejected')}>Rejected</Button>
                </div>
                <ul className="space-y-2">
                  {filteredLeaveRequestHistory.length > 0 ? filteredLeaveRequestHistory.map(lr => (
                    <li key={lr.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm">
                      <span className="font-medium text-gray-900">{lr.leaveType}</span>
                      <span className="text-xs text-gray-500">{lr.startDate} to {lr.endDate}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${lr.status === 'approved' ? 'bg-green-200 text-green-800' : lr.status === 'rejected' ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-800'}`}>{lr.status.charAt(0).toUpperCase() + lr.status.slice(1)}</span>
                      {lr.respondedBy && approverMap[lr.respondedBy] && (
                        <span className="text-xs text-gray-400 ml-2">by {approverMap[lr.respondedBy].name}</span>
                      )}
                    </li>
                  )) : <li className="text-gray-400 text-sm">No leave history</li>}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Leave Request Modal */}
        {showLeaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
              <h2 className="text-xl font-bold mb-4 text-blue-700 flex items-center"><AlertCircle className="w-5 h-5 mr-2 text-yellow-500" /> Submit Leave Request</h2>
              <form onSubmit={handleLeaveSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                  <Input
                    value={form.leaveType}
                    onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}
                    placeholder="e.g. Sick, Personal, etc."
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <Input
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="Reason for leave"
                    className="w-full"
                  />
                </div>
                {form.error && <div className="text-red-600 text-sm mt-2">{form.error}</div>}
                <div className="flex gap-2 mt-4">
                  <Button type="submit" size="sm" className="bg-blue-500 text-white flex-1" disabled={form.submitting}>
                    {form.submitting ? 'Submitting...' : 'Submit'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setShowLeaveModal(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}