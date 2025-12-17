import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { X, RefreshCw } from "lucide-react";
import type { User, Department, Major, Class } from "@/types";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser?: User | null;
}

export default function AddUserModal({ isOpen, onClose, editingUser }: AddUserModalProps) {
  const { toast } = useToast();
  
  // Fetch data
  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    enabled: isOpen,
  });
  
  const { data: majors } = useQuery<Major[]>({
    queryKey: ["/api/majors"],
    enabled: isOpen,
  });
  
  const { data: classes } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: isOpen,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  // Generate secure password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = 'User@';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    uniqueId: "",
    email: "",
    password: generatePassword(),
    departmentId: "",
    majorId: "",
    classId: "",
    schedule: "08:00-17:00",
    status: "active",
  });

  // Generate User ID based on role
  const generateUserId = () => {
    if (!formData.role) {
      toast({
        title: "Error",
        description: "Please select a role first",
        variant: "destructive",
      });
      return;
    }

    const roleCountMap = users?.reduce((acc, user) => {
      const prefix = getRolePrefix(user.role);
      acc[prefix] = (acc[prefix] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const prefix = getRolePrefix(formData.role);
    const nextNumber = (roleCountMap[prefix] || 0) + 1;
    const userId = `${prefix}${String(nextNumber).padStart(3, '0')}`;
    
    setFormData(prev => ({ ...prev, uniqueId: userId }));
    toast({
      title: "ID Generated",
      description: `User ID: ${userId}`,
    });
  };

  const getRolePrefix = (role: string): string => {
    const prefixMap: Record<string, string> = {
      teacher: "T",
      staff: "S",
      hr_assistant: "HR",
      hr_backup: "HRB",
      moderator: "CM",
      class_moderator: "CM",
      admin: "ADMIN",
      head: "HEAD",
    };
    return prefixMap[role] || "U";
  };

  // Filter majors based on selected department
  const filteredMajors = majors?.filter(m => 
    !formData.departmentId || m.departmentId === parseInt(formData.departmentId)
  ) || [];

  // Filter classes based on selected department and major
  const filteredClasses = classes?.filter(c => {
    if (!formData.departmentId) return false;
    if (formData.majorId) {
      return c.majorId === parseInt(formData.majorId);
    }
    // Show all classes in the selected department if no major selected
    const classMajor = majors?.find(m => m.id === c.majorId);
    return classMajor?.departmentId === parseInt(formData.departmentId);
  }) || [];

  // Determine which fields to show based on role
  const showDepartment = ["teacher", "staff", "hr_assistant", "hr_backup", "moderator", "class_moderator", "head"].includes(formData.role);
  const showMajor = ["moderator", "class_moderator"].includes(formData.role);
  const showClass = ["moderator", "class_moderator"].includes(formData.role);
  const showSchedule = ["staff", "hr_assistant"].includes(formData.role);

  useEffect(() => {
    if (editingUser) {
      // Get the major ID from the class if user is a moderator
      let majorId = "";
      if (editingUser.classId && (editingUser.role === "moderator" || editingUser.role === "class_moderator")) {
        const userClass = classes?.find(c => c.id === editingUser.classId);
        if (userClass) {
          majorId = userClass.majorId.toString();
        }
      }

      setFormData({
        name: editingUser.name || "",
        role: editingUser.role || "",
        uniqueId: editingUser.uniqueId || "",
        email: editingUser.email || "",
        password: generatePassword(),
        departmentId: editingUser.departmentId?.toString() || "",
        majorId: majorId,
        classId: editingUser.classId?.toString() || "",
        schedule: editingUser.schedule || "08:00-17:00",
        status: editingUser.status || "active",
      });
    } else {
      setFormData({
        name: "",
        role: "",
        uniqueId: "",
        email: "",
        password: generatePassword(),
        departmentId: "",
        majorId: "",
        classId: "",
        schedule: "08:00-17:00",
        status: "active",
      });
    }
  }, [editingUser, isOpen, classes]);

  const createUserMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingUser) {
        return apiRequest("PUT", `/api/user/${editingUser.id}`, data);
      }
      return apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: editingUser ? "User updated successfully" : "User created successfully",
      });
      onClose();
      setFormData({
        name: "",
        role: "",
        uniqueId: "",
        email: "",
        password: generatePassword(),
        departmentId: "",
        majorId: "",
        classId: "",
        schedule: "08:00-17:00",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || (editingUser ? "Failed to update user" : "Failed to create user"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.role || !formData.uniqueId || !formData.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Role-specific validation
    if (showDepartment && !formData.departmentId) {
      toast({
        title: "Error",
        description: "Department is required for this role",
        variant: "destructive",
      });
      return;
    }

    if (showMajor && !formData.majorId) {
      toast({
        title: "Error",
        description: "Major is required for class moderators",
        variant: "destructive",
      });
      return;
    }

    if (showClass && !formData.classId) {
      toast({
        title: "Error",
        description: "Class is required for class moderators",
        variant: "destructive",
      });
      return;
    }

    const submitData: any = {
      name: formData.name,
      uniqueId: formData.uniqueId,
      email: formData.email,
      role: formData.role,
      status: formData.status,
      departmentId: formData.departmentId ? parseInt(formData.departmentId) : null,
      classId: formData.classId ? parseInt(formData.classId) : null,
      schedule: showSchedule ? formData.schedule : null,
      workType: (formData.role === "staff" || formData.role === "hr_assistant") ? "Full-Time" : null,
    };

    if (!editingUser) {
      submitData.password = formData.password;
    }

    createUserMutation.mutate(submitData);
  };

  const handleRoleChange = (role: string) => {
    setFormData(prev => ({ 
      ...prev, 
      role,
      uniqueId: "", // Reset ID when role changes
      departmentId: "",
      majorId: "",
      classId: "",
      schedule: (role === "staff" || role === "hr_assistant") ? "08:00-17:00" : "",
    }));
  };

  const getDepartmentForUser = () => {
    if (!formData.departmentId) return null;
    return departments?.find(d => d.id === parseInt(formData.departmentId));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {editingUser ? "Edit User" : "Add New User"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Full Name */}
          <div>
            <Label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-2">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter full name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={createUserMutation.isPending}
              className="h-11"
              required
            />
          </div>

          {/* Role - FIRST FIELD */}
          <div>
            <Label htmlFor="role" className="block text-sm font-semibold text-gray-800 mb-2">
              Role <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.role} onValueChange={handleRoleChange} disabled={!!editingUser}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="head">Head of Department</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="class_moderator">Class Moderator</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="hr_assistant">HR Assistant</SelectItem>
                <SelectItem value="hr_backup">HR Backup</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1.5">
              {!formData.role && "⚠️ Select role first to enable other fields"}
              {formData.role === "teacher" && "✓ Teachers are assigned to a department"}
              {formData.role === "staff" && "✓ Staff have fixed working hours (8:00-17:00)"}
              {formData.role === "class_moderator" && "✓ Moderators belong to one class"}
              {formData.role === "hr_assistant" && "✓ HR Assistants manage department staff"}
              {formData.role === "head" && "✓ Heads manage entire department"}
              {formData.role === "admin" && "✓ Full system access"}
            </p>
          </div>

          {/* Auto Generated User ID */}
          <div>
            <Label htmlFor="uniqueId" className="block text-sm font-semibold text-gray-800 mb-2">
              Auto Generated User ID <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="uniqueId"
                type="text"
                value={formData.uniqueId}
                disabled
                placeholder="Click 'Generate ID' button"
                className="flex-1 bg-gray-100 h-11"
              />
              <Button
                type="button"
                onClick={generateUserId}
                disabled={!formData.role || !!editingUser || createUserMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 px-4 h-11"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate ID
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              Format: {formData.role ? getRolePrefix(formData.role) : "T"} + Number (e.g., T001, S001, CM001)
            </p>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@university.edu"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              disabled={createUserMutation.isPending}
              className="h-11"
              required
            />
          </div>

          {/* Password */}
          {!editingUser && (
            <div>
              <Label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="text"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                disabled={createUserMutation.isPending}
                className="h-11 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Auto-generated secure password. User can change after first login.
              </p>
            </div>
          )}

          {/* Status */}
          <div>
            <Label htmlFor="status" className="block text-sm font-semibold text-gray-800 mb-2">
              Status <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Divider for Dynamic Fields */}
          {showDepartment && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-4">
                Role-Specific Information
              </p>
            </div>
          )}

          {/* Department - Shows for: Teacher, Staff, HR, Moderator, Head */}
          {showDepartment && (
            <div>
              <Label htmlFor="department" className="block text-sm font-semibold text-gray-800 mb-2">
                Department <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.departmentId} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  departmentId: value, 
                  majorId: "", 
                  classId: "" 
                }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name} ({dept.shortName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Major - Shows ONLY for: Class Moderator */}
          {showMajor && (
            <div>
              <Label htmlFor="major" className="block text-sm font-semibold text-gray-800 mb-2">
                Major <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.majorId} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  majorId: value,
                  classId: "" 
                }))}
                disabled={!formData.departmentId}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={!formData.departmentId ? "Select department first" : "Select Major"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredMajors.map((major) => (
                    <SelectItem key={major.id} value={major.id.toString()}>
                      {major.name} ({major.shortName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Class - Shows ONLY for: Class Moderator */}
          {showClass && (
            <div>
              <Label htmlFor="class" className="block text-sm font-semibold text-gray-800 mb-2">
                Class <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.classId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, classId: value }))}
                disabled={!formData.departmentId}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={!formData.departmentId ? "Select department first" : "Select Class"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1.5">
                Moderators are students assigned to exactly one class
              </p>
            </div>
          )}

          {/* Schedule - Shows ONLY for: Staff and HR Assistant */}
          {showSchedule && (
            <div>
              <Label htmlFor="schedule" className="block text-sm font-semibold text-gray-800 mb-2">
                Work Schedule
              </Label>
              <Input
                id="schedule"
                type="text"
                placeholder="e.g., 08:00-17:00"
                value={formData.schedule}
                onChange={(e) => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
                disabled={createUserMutation.isPending}
                className="h-11"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Fixed working hours (default: 8:00 AM - 5:00 PM)
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={onClose}
              disabled={createUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending 
                ? (editingUser ? "Updating..." : "Creating...") 
                : (editingUser ? "Update User" : "Create User")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
