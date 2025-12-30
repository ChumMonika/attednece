import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Check, X, Users, Calendar, TrendingUp, Filter, Download, User as UserIcon } from "lucide-react";
import type { User, TodaySchedule } from "@/types";

interface HRAssistantAttendanceProps {
  user: User;
}

export default function HRAssistantAttendance({ user }: HRAssistantAttendanceProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent'>('all');

  const { data: attendanceData, isLoading } = useQuery<TodaySchedule[]>({
    queryKey: ["/api/attendance-today", selectedDate],
    queryFn: () => apiRequest("GET", `/api/attendance-today?date=${selectedDate}`).then(r => r.json()),
    select: (data) => data?.filter(person => person.role === 'staff') || []
  });

  const markAttendanceMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: string }) => {
      return apiRequest("POST", "/api/attendance/mark", { userId, date: selectedDate, status }).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-today", selectedDate] });
      toast({
        title: "Success",
        description: "Attendance marked successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance",
        variant: "destructive",
      });
    },
  });

  const handleMarkAttendance = (userId: number, status: "present" | "absent") => {
    markAttendanceMutation.mutate({ userId, status });
  };

  const getWorkTypeBadgeColor = (workType: string) => {
    switch (workType) {
      case 'office': return 'bg-blue-100 text-blue-800';
      case 'remote': return 'bg-green-100 text-green-800';
      case 'field': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredData = attendanceData?.filter(person => {
    if (filterStatus === 'all') return true;
    return person.attendanceStatus === filterStatus;
  }) || [];

  const stats = {
    total: attendanceData?.length || 0,
    present: attendanceData?.filter(p => p.attendanceStatus === 'present').length || 0,
    absent: attendanceData?.filter(p => p.attendanceStatus === 'absent').length || 0,
    pending: attendanceData?.filter(p => !p.attendanceStatus).length || 0,
  };

  const exportAttendance = () => {
    const csvContent = [
      ['Name', 'Department', 'Work Type', 'Status', 'Date'],
      ...filteredData.map(person => [
        person.name,
        person.department?.name || 'N/A',
        person.workType || 'N/A',
        person.attendanceStatus || 'Pending',
        selectedDate
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-attendance-${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Attendance</h1>
          <p className="text-gray-600">Manage and track staff attendance records</p>
        </div>
        <Button
          onClick={exportAttendance}
          variant="outline"
          className="flex items-center"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Date and Filter Controls */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  <SelectItem value="present">Present Only</SelectItem>
                  <SelectItem value="absent">Absent Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Staff</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.total}</p>
              </div>
              <div className="h-14 w-14 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Present</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.present}</p>
              </div>
              <div className="h-14 w-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <Check className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Absent</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.absent}</p>
              </div>
              <div className="h-14 w-14 bg-red-100 rounded-xl flex items-center justify-center">
                <X className="h-7 w-7 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
              </div>
              <div className="h-14 w-14 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-7 w-7 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance List */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-green-600" />
            Staff Attendance for {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading attendance data...</p>
            </div>
          ) : filteredData.length > 0 ? (
            <div className="space-y-4">
              {filteredData.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{person.name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span>Department: {person.department?.name || "N/A"}</span>
                        {person.workType && (
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getWorkTypeBadgeColor(person.workType)}`}>
                            {person.workType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {person.attendanceStatus ? (
                      <Badge variant="outline" className={
                        person.attendanceStatus === 'present'
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-red-100 text-red-800 border-red-200'
                      }>
                        {person.attendanceStatus === 'present' ? 'Present' : 'Absent'}
                      </Badge>
                    ) : (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-200 text-green-600 hover:bg-green-50"
                          onClick={() => handleMarkAttendance(person.id, 'present')}
                          disabled={markAttendanceMutation.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleMarkAttendance(person.id, 'absent')}
                          disabled={markAttendanceMutation.isPending}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Absent
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No staff found for the selected criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}