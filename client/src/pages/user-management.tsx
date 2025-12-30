import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DashboardHeader from "@/components/admin-header";
import AdminSidebar from "@/components/new-admin-sidebar";
import AddUserModal from "@/components/add-user-modal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit, Trash2, KeyRound } from "lucide-react";
import type { User } from "@/types";

export default function UserManagementPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
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

  const filteredUsers = users?.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.uniqueId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];

  const handleToggleSelectUser = (userId: number) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
    setSelectAll(newSelected.size === filteredUsers.length);
  };

  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(filteredUsers.map(u => u.id));
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

  const currentRoute = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar currentRoute={currentRoute} />
      <div className="ml-64 flex flex-col">
        <DashboardHeader
          user={{ id: 0, name: '', role: '', department: '', uniqueId: '', status: '' }}
          title="User Management"
          subtitle="Manage staff information."
          borderColor="border-university-admin"
          bgColor="bg-university-admin"
        />
        <div className="max-w-6xl mx-auto px-4 py-8 pt-24 space-y-8">
          <Card className="shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <Input
                  placeholder="Search by name or ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64"
                />
                <div className="flex items-center gap-2">
                  {selectedUsers.size > 0 && (
                    <Button 
                      onClick={handleBulkDelete}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected ({selectedUsers.size})
                    </Button>
                  )}
                  <Button 
                    onClick={() => setIsAddUserModalOpen(true)}
                    className="bg-university-admin text-white hover:bg-cyan-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left bg-gray-100">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-pink-700 uppercase tracking-wider bg-pink-50">Unique ID</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-orange-700 uppercase tracking-wider bg-orange-50">Department</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-green-700 uppercase tracking-wider bg-green-50">Role</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-purple-700 uppercase tracking-wider bg-purple-50">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-100">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, idx) => (
                      <tr key={user.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-orange-50 hover:bg-orange-100'}>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleToggleSelectUser(user.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-semibold">{user.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-pink-700 font-bold">{user.uniqueId}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-orange-600 font-bold">{user.department?.name || "N/A"}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold shadow-md 
                            ${user.role === 'head' ? 'bg-indigo-200 text-indigo-900' :
                              user.role === 'admin' ? 'bg-pink-200 text-pink-900' :
                              user.role === 'teacher' ? 'bg-green-200 text-green-900' :
                              user.role === 'staff' ? 'bg-blue-200 text-blue-900' :
                              'bg-gray-200 text-gray-900'}`}>{user.role}</span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold shadow-md 
                            ${user.status === 'active' ? 'bg-green-200 text-green-900' :
                              user.status === 'inactive' ? 'bg-gray-200 text-gray-700' :
                              user.status === 'suspended' ? 'bg-red-200 text-red-900' :
                              user.status === 'pending' ? 'bg-yellow-200 text-yellow-900' :
                              'bg-gray-200 text-gray-900'}`}>{user.status}</span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-700 underline">{user.email}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingUser(user);
                              setIsAddUserModalOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700"
                            onClick={() => openResetPasswordDialog(user)}
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <AddUserModal 
        isOpen={isAddUserModalOpen} 
        onClose={() => {
          setIsAddUserModalOpen(false);
          setEditingUser(null);
        }}
        editingUser={editingUser}
      />

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
    </div>
  );
}
