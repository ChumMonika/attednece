import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Users, Search, Mail, Building, GraduationCap, Filter, Download, User as UserIcon } from "lucide-react";
import type { User } from "@/types";

interface HRAssistantStaffDirectoryProps {
  user: User;
}

export default function HRAssistantStaffDirectory({ user }: HRAssistantStaffDirectoryProps) {
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('GET', `/api/users?role=staff`);
      const data = await response.json() as User[];
      setStaff(data);
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const filteredStaff = staff.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || person.department?.name === departmentFilter;
    const matchesRole = roleFilter === 'all' || person.role === roleFilter;

    return matchesSearch && matchesDepartment && matchesRole;
  });

  const departments = [...new Set(staff.map(person => person.department?.name).filter(Boolean))];
  const roles = [...new Set(staff.map(person => person.role).filter(Boolean))];

  const exportStaff = () => {
    const csvContent = [
      ['Name', 'Email', 'Department', 'Role', 'Phone', 'Join Date'],
      ...filteredStaff.map(person => [
        person.name,
        person.email,
        person.department?.name || 'N/A',
        person.role || 'N/A',
        person.phone || 'N/A',
        person.createdAt ? new Date(person.createdAt).toLocaleDateString() : 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-directory.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Directory</h1>
          <p className="text-gray-600">View and manage staff information</p>
        </div>
        <Button
          onClick={exportStaff}
          variant="outline"
          className="flex items-center"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Staff</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{staff.length}</p>
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
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{departments.length}</p>
              </div>
              <div className="h-14 w-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Filtered Results</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{filteredStaff.length}</p>
              </div>
              <div className="h-14 w-14 bg-purple-100 rounded-xl flex items-center justify-center">
                <Search className="h-7 w-7 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setDepartmentFilter('all');
                  setRoleFilter('all');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-green-600" />
            Staff Directory ({filteredStaff.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading staff directory...</p>
            </div>
          ) : filteredStaff.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStaff.map((person) => (
                <div key={person.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{person.name}</h4>
                      <p className="text-sm text-gray-500 capitalize">{person.role}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="truncate">{person.email}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{person.department?.name || "N/A"}</span>
                    </div>

                    {person.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <GraduationCap className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{person.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                      <span className="text-xs text-gray-400">
                        Joined {person.createdAt ? new Date(person.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No staff found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}