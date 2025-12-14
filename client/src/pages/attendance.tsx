import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Sidebar, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardHeader from "@/components/admin-header";
import { useState, useMemo } from "react";
import type { Attendance, User, LeaveRequest } from "@/types";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, CalendarDays, FileText, Clock, Settings, Menu, UserCheck, CalendarMinus, Building2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { Link } from "wouter";

function formatDateInput(date: Date) {
  return date.toISOString().split('T')[0];
}

export default function AttendancePage() {

  // Role and department filter state
  const [roleFilter, setRoleFilter] = useState<'all' | 'staff' | 'teacher'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [date, setDate] = useState<string>(formatDateInput(new Date()));

  // Fetch attendance data with filters
  const { data: attendance, isLoading, error } = useQuery({
    queryKey: ['/api/attendance', date, roleFilter, departmentFilter],
    queryFn: () => {
      const params = new URLSearchParams({ date });
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (departmentFilter !== 'all') params.append('department', departmentFilter);
      return fetch(`/api/attendance?${params.toString()}`, { credentials: 'include' }).then(res => res.json());
    },
  });

  // Get unique departments for filter dropdown
  const departments = useMemo(() => {
    if (!Array.isArray(attendance)) return [];
    const deptSet = new Set(attendance.map((record: any) => record.user?.department).filter(Boolean));
    return Array.from(deptSet).sort();
  }, [attendance]);

  // Filtered attendance list - only show staff/teachers (or all if roleFilter is all)
  const filteredAttendance = useMemo(() => {
    if (!Array.isArray(attendance)) return [];
    return attendance.filter((record: any) => {
      if (roleFilter !== 'all' && record.user?.role !== roleFilter) return false;
      if (departmentFilter !== 'all' && record.user?.department !== departmentFilter) return false;
      return ['staff', 'teacher'].includes(record.user?.role || '');
    });
  }, [attendance, roleFilter, departmentFilter]);

  // Download CSV function
  function downloadCSV() {
    const csvRows = [];
    csvRows.push('Name,Department,Role,Date,Status');
    filteredAttendance.forEach(row => {
      csvRows.push([
        row.user?.name,
        row.user?.department,
        row.user?.role,
        row.date,
        row.status
      ].join(','));
    });
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Get current user for the dashboard header
  const { data: user } = useQuery<User>({
    queryKey: ['/api/me'],
    queryFn: getCurrentUser,
  });

  const currentRoute = typeof window !== 'undefined' ? window.location.pathname : '';

  const { data: leaveRequests } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
    queryFn: () => apiRequest("GET", "/api/leave-requests").then((res: Response) => res.json()),
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
              {leaveRequests && leaveRequests.filter((req: LeaveRequest) => req.status === 'pending').length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-university-warning text-white">
                  {leaveRequests.filter((req: LeaveRequest) => req.status === 'pending').length}
                </span>
              )}
            </Link>
          </nav>
        </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {user && (
          <DashboardHeader
            user={user}
            title="Attendance"
            subtitle="View and manage staff attendance records"
            borderColor="border-university-head"
            bgColor="bg-university-head"
          />
        )}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {/* Header with controls */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
                <p className="text-gray-600 mt-1">View and manage staff attendance records</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="role-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter by Role:</label>
                  <Select value={roleFilter} onValueChange={val => setRoleFilter(val as 'all' | 'staff' | 'teacher')}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="staff">Staff Only</SelectItem>
                      <SelectItem value="teacher">Teacher Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="department-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter by Department:</label>
                  <Select value={departmentFilter} onValueChange={val => setDepartmentFilter(val)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept: string) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="date-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">Select Date:</label>
                  <div className="relative">
                    <input
                      id="date-filter"
                      type="date"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      max={formatDateInput(new Date())}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="ml-2 px-4 py-2 bg-university-head text-white rounded hover:bg-university-head-dark transition"
                  onClick={downloadCSV}
                >
                  Download CSV
                </button>
              </div>
            </div>

            {/* Attendance Table */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="animate-pulse space-y-4">
                      <div className="h-6 bg-gray-200 rounded w-1/4 mx-auto"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                    </div>
                  </div>
                ) : error ? (
                  <div className="p-8 text-center">
                    <div className="text-red-600">Failed to load attendance data. Please try again.</div>
                  </div>
                ) : filteredAttendance && filteredAttendance.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Details
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAttendance.map((record: any) => {
                          const user = record.user;
                          let description = [];
                          if (user?.department) description.push(user.department);
                          if (user?.workType) description.push(user.workType);
                          if (user?.subject) description.push(user.subject);
                          
                          return (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-blue-800 font-medium">
                                      {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'NA'}
                                    </span>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{user?.name || record.userId}</div>
                                    <div className="text-sm text-gray-500">{user?.uniqueId || ''}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">{description.join(' • ') || '-'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(record.date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    weekday: 'short'
                                  })}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  record.status === 'present' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {record.status === 'present' ? 'Present' : 'Absent'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No attendance records found for the selected filters.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        </div>
      </div>

  );
}
