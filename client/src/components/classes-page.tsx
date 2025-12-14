import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, School } from "lucide-react";
import type { Class, Major, Department } from "@/types";

export default function ClassesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    majorId: "",
    year: "",
    semester: "",
    academicYear: "",
  });

  const { data: classes, isLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  const { data: majors } = useQuery<Major[]>({
    queryKey: ["/api/majors"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingClass) {
        return apiRequest("PUT", `/api/classes/${editingClass.id}`, data);
      }
      return apiRequest("POST", "/api/classes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Success",
        description: editingClass ? "Class updated successfully" : "Class created successfully",
      });
      closeDialog();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save class",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/classes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Success",
        description: "Class deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete class",
        variant: "destructive",
      });
    },
  });

  const openDialog = (cls?: Class) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({
        name: cls.name,
        majorId: cls.majorId.toString(),
        year: cls.year.toString(),
        semester: cls.semester.toString(),
        academicYear: cls.academicYear || "",
      });
    } else {
      setEditingClass(null);
      setFormData({ name: "", majorId: "", year: "", semester: "", academicYear: "" });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingClass(null);
    setFormData({ name: "", majorId: "", year: "", semester: "", academicYear: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.majorId || !formData.year || !formData.semester || !formData.academicYear) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate({
      name: formData.name,
      majorId: parseInt(formData.majorId),
      year: parseInt(formData.year),
      semester: parseInt(formData.semester),
      academicYear: formData.academicYear,
    });
  };

  const handleDelete = (cls: Class) => {
    if (window.confirm(`Are you sure you want to delete ${cls.name}?`)) {
      deleteMutation.mutate(cls.id);
    }
  };

  const getMajorName = (majorId: number) => {
    return majors?.find(m => m.id === majorId)?.shortName || "Unknown";
  };

  const getDepartmentForMajor = (majorId: number) => {
    const major = majors?.find(m => m.id === majorId);
    return departments?.find(d => d.id === major?.departmentId)?.shortName || "";
  };

  return (
    <div className="p-8 pt-24 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-600 mt-1">Manage academic classes</p>
        </div>
        <Button
          onClick={() => openDialog()}
          className="bg-green-600 hover:bg-green-700 text-white shadow-md"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Class
        </Button>
      </div>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Class Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Major
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Semester
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Academic Year
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading classes...
                  </td>
                </tr>
              ) : classes?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No classes found
                  </td>
                </tr>
              ) : (
                classes?.map((cls) => (
                  <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                          <School className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{cls.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{getMajorName(cls.majorId)}</span>
                      <span className="text-xs text-gray-400 ml-1">({getDepartmentForMajor(cls.majorId)})</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">Year {cls.year}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">Semester {cls.semester}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{cls.academicYear || "—"}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(cls)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cls)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClass ? "Edit Class" : "Add New Class"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Class Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., DSE Y1S1, ITE Y2S2"
                required
              />
            </div>
            <div>
              <Label htmlFor="major">Major <span className="text-red-500">*</span></Label>
              <Select value={formData.majorId} onValueChange={(value) => setFormData({ ...formData, majorId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Major" />
                </SelectTrigger>
                <SelectContent>
                  {majors?.map((major) => (
                    <SelectItem key={major.id} value={major.id.toString()}>
                      {major.name} ({major.shortName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year">Year <span className="text-red-500">*</span></Label>
                <Select value={formData.year} onValueChange={(value) => setFormData({ ...formData, year: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Year 1</SelectItem>
                    <SelectItem value="2">Year 2</SelectItem>
                    <SelectItem value="3">Year 3</SelectItem>
                    <SelectItem value="4">Year 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="semester">Semester <span className="text-red-500">*</span></Label>
                <Select value={formData.semester} onValueChange={(value) => setFormData({ ...formData, semester: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="academicYear">Academic Year <span className="text-red-500">*</span></Label>
              <Input
                id="academicYear"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                placeholder="e.g., 2025-2026"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingClass ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
