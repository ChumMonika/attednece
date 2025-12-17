import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit, Trash2, KeyRound, Download } from "lucide-react";
import type { User, Department } from "@/types";
import AddUserModal from "./add-user-modal";

interface UserManagementTableProps {
  onAddUser: () => void;
}

export default function UserManagementTable({ onAddUser }: UserManagementTableProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => apiRequest("DELETE", `/api/user/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: number; password: string }) =>
      apiRequest("POST", `/api/users/${userId}/reset-password`, { newPassword: password }).then(r => r.json()),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
      setIsResetDialogOpen(false);
      setNewPassword("");
      setResetPasswordUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = (userId: number, userName: string) => {
    if (window.confirm(`Are you sure you want to delete ${userName}?`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleResetPassword = () => {
    if (!resetPasswordUser) return;
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    resetPasswordMutation.mutate({ userId: resetPasswordUser.id, password: newPassword });
  };

  const openResetPasswordDialog = (user: User) => {
    setResetPasswordUser(user);
    setNewPassword("");
    setIsResetDialogOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setIsAddUserModalOpen(true);
  };

  const filteredUsers = users?.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.uniqueId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Handle moderator filter to match both 'moderator' and 'class_moderator'
    const matchesRole = roleFilter === "all" || 
      u.role === roleFilter || 
      (roleFilter === "moderator" && (u.role === "moderator" || u.role === "class_moderator"));
    
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    const matchesDepartment = departmentFilter === "all" || 
      (u.departmentId && u.departmentId.toString() === departmentFilter);
    return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
  }) || [];

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-blue-600 hover:bg-blue-700 text-white",
      head: "bg-purple-600 hover:bg-purple-700 text-white",
      teacher: "bg-green-600 hover:bg-green-700 text-white",
      moderator: "bg-orange-600 hover:bg-orange-700 text-white",
      class_moderator: "bg-orange-600 hover:bg-orange-700 text-white",
      staff: "bg-gray-600 hover:bg-gray-700 text-white",
      hr_assistant: "bg-amber-600 hover:bg-amber-700 text-white",
      hr_backup: "bg-amber-700 hover:bg-amber-800 text-white",
    };
    return colors[role] || "bg-gray-600 hover:bg-gray-700 text-white";
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      head: "Head",
      teacher: "Teacher",
      moderator: "Class Moderator",
      staff: "Staff",
      hr_assistant: "HR Assistant",
      hr_backup: "HR Backup",
    };
    return labels[role] || role;
  };

  const getDepartmentName = (departmentId: number | null | undefined) => {
    if (!departmentId) return "System";
    const department = departments?.find(d => d.id === departmentId);
    return department?.shortName || "System";
  };

  const handleToggleSelectUser = (userId: number) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
    setSelectAll(newSelected.size === paginatedUsers.length && paginatedUsers.length > 0);
  };

  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(paginatedUsers.map(u => u.id));
      setSelectedUsers(allIds);
      setSelectAll(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user to delete",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedUsers.size} user(s)?`)) {
      try {
        for (const userId of Array.from(selectedUsers)) {
          await apiRequest("DELETE", `/api/user/${userId}`);
        }
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        setSelectedUsers(new Set());
        setSelectAll(false);
        toast({
          title: "Success",
          description: `Successfully deleted ${selectedUsers.size} user(s)`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete some users",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="p-8 pt-24 space-y-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage all users in one place. Control access, assign roles, and monitor activity across your platform.
          </p>
        </div>
        <div className="flex gap-3">
          {selectedUsers.size > 0 && (
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedUsers.size})
            </Button>
          )}
          <Button
            variant="outline"
            className="border-gray-300 hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={onAddUser}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="p-6 bg-white">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 border-gray-300"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); handleFilterChange(); }}
              className="w-full h-11 px-4 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="head">Head</option>
              <option value="teacher">Teacher</option>
              <option value="moderator">Moderator</option>
              <option value="staff">Staff</option>
              <option value="hr_assistant">HR Assistant</option>
            </select>
          </div>
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); handleFilterChange(); }}
              className="w-full h-11 px-4 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="w-full md:w-48">
            <select
              value={departmentFilter}
              onChange={(e) => { setDepartmentFilter(e.target.value); handleFilterChange(); }}
              className="w-full h-11 px-4 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {departments?.map((dept) => (
                <option key={dept.id} value={dept.id.toString()}>
                  {dept.shortName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 cursor-pointer w-4 h-4"
                    checked={selectAll}
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  FULL NAME
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  EMAIL
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  USERNAME
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  ROLE
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  STATUS
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  DEPARTMENT
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  JOINED DATE
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 text-sm">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 cursor-pointer w-4 h-4"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleToggleSelectUser(user.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span className="text-[15px] font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[14px] text-blue-600 hover:underline cursor-pointer">{user.email || "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[14px] font-medium text-gray-700">{user.uniqueId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`${getRoleBadgeColor(user.role)} px-3 py-1 text-xs font-semibold rounded-full w-[120px] inline-flex items-center justify-center transition-colors`}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`${
                        user.status === "active" 
                          ? "bg-green-100 hover:bg-green-200 text-green-700" 
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      } px-3 py-1 text-xs font-semibold rounded-full w-[80px] inline-flex items-center justify-center transition-colors`}>
                        {user.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[14px] text-gray-700">
                        {getDepartmentName(user.departmentId)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[14px] text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openResetPasswordDialog(user)}
                          className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredUsers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} results
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first page, last page, current page, and pages around current
                    return page === 1 || 
                           page === totalPages || 
                           Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, idx, arr) => (
                    <div key={page} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 w-8 ${
                          currentPage === page 
                            ? "bg-gray-900 hover:bg-gray-800 text-white" 
                            : ""
                        }`}
                      >
                        {page}
                      </Button>
                    </div>
                  ))
                }
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Password Reset Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {resetPasswordUser?.name} ({resetPasswordUser?.uniqueId})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => {
          setIsAddUserModalOpen(false);
          setEditingUser(null);
        }}
        editingUser={editingUser}
      />
    </div>
  );
}
