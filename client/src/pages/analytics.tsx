import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Users, FileText, Activity } from "lucide-react";

interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  attendanceRate: number;
}

interface LeaveStatistics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalDays: number;
  averageDays: number;
}

interface DepartmentOverview {
  totalUsers: number;
  roleDistribution: {
    head: number;
    admin: number;
    mazer: number;
    assistant: number;
    teacher: number;
    staff: number;
  };
  statusDistribution: {
    active: number;
    inactive: number;
  };
}

interface MonthlyTrends {
  year: number;
  monthlyData: Array<{
    month: string;
    attendance: number;
    leaves: number;
    present: number;
    absent: number;
  }>;
}

interface User {
  id: number;
  uniqueId: string;
  name: string;
  role: string;
  status: string;
}

export default function AnalyticsPage() {
  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    queryFn: getCurrentUser,
  });
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [leaveStatistics, setLeaveStatistics] = useState<LeaveStatistics | null>(null);
  const [departmentOverview, setDepartmentOverview] = useState<DepartmentOverview | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrends | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const canViewAllData = user?.role === 'admin' || user?.role === 'head';
  const canViewTrends = ['admin', 'head', 'mazer', 'assistant'].includes(user?.role || '');

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedYear, selectedUserId]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch attendance summary
      const userParam = selectedUserId !== 'all' ? `&userId=${selectedUserId}` : '';
      const attendanceRes = await fetch(`/api/analytics/attendance-summary?${userParam}`, {
        credentials: 'include'
      });
      if (attendanceRes.ok) {
        const data = await attendanceRes.json();
        setAttendanceSummary(data);
      }

      // Fetch leave statistics
      const leaveRes = await fetch(`/api/analytics/leave-statistics`, {
        credentials: 'include'
      });
      if (leaveRes.ok) {
        const data = await leaveRes.json();
        setLeaveStatistics(data);
      }

      // Fetch department overview (admin/head only)
      if (canViewAllData) {
        const deptRes = await fetch(`/api/analytics/department-overview`, {
          credentials: 'include'
        });
        if (deptRes.ok) {
          const data = await deptRes.json();
          setDepartmentOverview(data);
        }

        // Fetch user list for filter
        const usersRes = await fetch(`/api/analytics/users`, {
          credentials: 'include'
        });
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data);
        }
      }

      // Fetch monthly trends
      if (canViewTrends) {
        const trendsRes = await fetch(`/api/analytics/monthly-trends?year=${selectedYear}`, {
          credentials: 'include'
        });
        if (trendsRes.ok) {
          const data = await trendsRes.json();
          setMonthlyTrends(data);
        }
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Prepare data for charts
  const attendanceDistribution = attendanceSummary ? [
    { name: 'Present', value: attendanceSummary.presentDays, color: '#00C49F' },
    { name: 'Absent', value: attendanceSummary.absentDays, color: '#FF8042' },
    { name: 'Leave', value: attendanceSummary.leaveDays, color: '#FFBB28' }
  ] : [];

  const leaveStatusData = leaveStatistics ? [
    { name: 'Pending', value: leaveStatistics.pendingRequests, color: '#FFBB28' },
    { name: 'Approved', value: leaveStatistics.approvedRequests, color: '#00C49F' },
    { name: 'Rejected', value: leaveStatistics.rejectedRequests, color: '#FF8042' }
  ] : [];

  const roleDistributionData = departmentOverview ? [
    { name: 'Head', value: departmentOverview.roleDistribution.head },
    { name: 'Admin', value: departmentOverview.roleDistribution.admin },
    { name: 'Mazer', value: departmentOverview.roleDistribution.mazer },
    { name: 'Assistant', value: departmentOverview.roleDistribution.assistant },
    { name: 'Teacher', value: departmentOverview.roleDistribution.teacher },
    { name: 'Staff', value: departmentOverview.roleDistribution.staff }
  ] : [];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        
        <div className="flex gap-4">
          {canViewAllData && users.length > 0 && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id.toString()}>
                    {u.name} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {canViewTrends && (
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {attendanceSummary && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attendanceSummary.attendanceRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {attendanceSummary.presentDays} present out of {attendanceSummary.totalDays} days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Days</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attendanceSummary.totalDays}</div>
                <p className="text-xs text-muted-foreground">
                  Recorded attendance entries
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {leaveStatistics && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leaveStatistics.totalRequests}</div>
                <p className="text-xs text-muted-foreground">
                  {leaveStatistics.pendingRequests} pending approval
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Leave Duration</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leaveStatistics.averageDays} days</div>
                <p className="text-xs text-muted-foreground">
                  Total: {leaveStatistics.totalDays} days
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Distribution */}
        {attendanceSummary && attendanceSummary.totalDays > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Attendance Distribution</CardTitle>
              <CardDescription>Breakdown of attendance status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={attendanceDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {attendanceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Leave Status */}
        {leaveStatistics && leaveStatistics.totalRequests > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Leave Request Status</CardTitle>
              <CardDescription>Current status of leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leaveStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {leaveStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Role Distribution (Admin/Head only) */}
        {canViewAllData && departmentOverview && (
          <Card>
            <CardHeader>
              <CardTitle>Role Distribution</CardTitle>
              <CardDescription>Total users: {departmentOverview.totalUsers}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={roleDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Monthly Trends */}
        {canViewTrends && monthlyTrends && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Monthly Trends - {monthlyTrends.year}</CardTitle>
              <CardDescription>Attendance and leave patterns throughout the year</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrends.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="present" stroke="#00C49F" name="Present" />
                  <Line type="monotone" dataKey="absent" stroke="#FF8042" name="Absent" />
                  <Line type="monotone" dataKey="leaves" stroke="#FFBB28" name="Approved Leaves" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status Distribution (Admin/Head only) */}
      {canViewAllData && departmentOverview && (
        <Card>
          <CardHeader>
            <CardTitle>User Status</CardTitle>
            <CardDescription>Active vs Inactive users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {departmentOverview.statusDistribution.active}
                </div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-gray-400">
                  {departmentOverview.statusDistribution.inactive}
                </div>
                <div className="text-sm text-muted-foreground">Inactive Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
