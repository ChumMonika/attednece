import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, School, ArrowUpDown, ChevronRight } from "lucide-react";
import { TablePagination } from "@/components/table-pagination";
import type { Class, Major, Department } from "@/types";

type SortField = "year" | "semester" | "group" | "academicYear";
type SortOrder = "asc" | "desc";

export default function ClassesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("year");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedClasses, setSelectedClasses] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  const [formData, setFormData] = useState({
    majorId: "",
    year: "",
    semester: "",
    academicYear: "",
    group: "",
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

  // Sorting and pagination logic
  const sortedAndPaginatedClasses = useMemo(() => {
    if (!classes) return { paginatedData: [], totalPages: 0, totalItems: 0 };

    // Sort classes
    const sorted = [...classes].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortField) {
        case "year":
          compareValue = a.year - b.year;
          break;
        case "semester":
          compareValue = a.semester - b.semester;
          break;
        case "group":
          compareValue = ((a as any).group || "").localeCompare((b as any).group || "");
          break;
        case "academicYear":
          compareValue = (a.academicYear || "").localeCompare(b.academicYear || "");
          break;
      }
      
      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    // Paginate
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = sorted.slice(startIndex, endIndex);
    const totalPages = Math.ceil(sorted.length / itemsPerPage);

    return { paginatedData, totalPages, totalItems: sorted.length };
  }, [classes, sortField, sortOrder, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

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

  const handleToggleSelectClass = (classId: number) => {
    const newSelected = new Set(selectedClasses);
    if (newSelected.has(classId)) {
      newSelected.delete(classId);
    } else {
      newSelected.add(classId);
    }
    setSelectedClasses(newSelected);
  };

  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedClasses(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(sortedAndPaginatedClasses.paginatedData.map(c => c.id));
      setSelectedClasses(allIds);
      setSelectAll(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClasses.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one class to delete",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedClasses.size} class(es)?`)) {
      try {
        for (const classId of Array.from(selectedClasses)) {
          await apiRequest("DELETE", `/api/classes/${classId}`);
        }
        queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
        setSelectedClasses(new Set());
        setSelectAll(false);
        toast({
          title: "Success",
          description: `Successfully deleted ${selectedClasses.size} class(es)`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete some classes",
          variant: "destructive",
        });
      }
    }
  };

  const openDialog = (cls?: Class) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({
        majorId: cls.majorId.toString(),
        year: cls.year.toString(),
        semester: cls.semester.toString(),
        academicYear: cls.academicYear || "",
        group: (cls as any).group || "",
      });
    } else {
      setEditingClass(null);
      setFormData({ majorId: "", year: "", semester: "", academicYear: "", group: "" });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingClass(null);
    setFormData({ majorId: "", year: "", semester: "", academicYear: "", group: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.majorId || !formData.year || !formData.semester || !formData.academicYear || !formData.group) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate({
      majorId: parseInt(formData.majorId),
      year: parseInt(formData.year),
      semester: parseInt(formData.semester),
      academicYear: formData.academicYear,
      group: formData.group.toUpperCase(), // Ensure uppercase
    });
  };

  // Generate preview of class name
  const getPreviewName = () => {
    if (!formData.majorId || !formData.year || !formData.semester || !formData.group) {
      return "Fill all fields to preview class name";
    }
    const major = majors?.find(m => m.id === parseInt(formData.majorId));
    if (!major) return "";
    return `${major.shortName} Y${formData.year}S${formData.semester} ${formData.group.toUpperCase()}`;
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
          <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-600 mt-2">Manage academic classes</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedClasses.size > 0 && (
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              size="lg"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Delete Selected ({selectedClasses.size})
            </Button>
          )}
          <Button
            onClick={() => openDialog()}
            className="bg-green-600 hover:bg-green-700 text-white shadow-md"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Class
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Class Label
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Major
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("year")}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Year
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("semester")}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Semester
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("group")}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Group
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("academicYear")}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Academic Year
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading classes...
                  </td>
                </tr>
              ) : sortedAndPaginatedClasses.totalItems === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No classes found
                  </td>
                </tr>
              ) : (
                sortedAndPaginatedClasses.paginatedData.map((cls) => (
                  <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedClasses.has(cls.id)}
                        onChange={() => handleToggleSelectClass(cls.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                          <School className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {cls.classLabel || cls.displayClassName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900" title={majors?.find(m => m.id === cls.majorId)?.name}>
                          {cls.majorShort || getMajorName(cls.majorId)}
                        </span>
                        <span className="text-xs text-gray-500">{getDepartmentForMajor(cls.majorId)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{cls.year}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{cls.semester}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {cls.group}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{cls.academicYear}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => openDialog(cls)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors mr-2"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cls)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!isLoading && sortedAndPaginatedClasses.totalItems > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedAndPaginatedClasses.totalItems)} of {sortedAndPaginatedClasses.totalItems} results
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(sortedAndPaginatedClasses.totalPages, prev + 1))}
                disabled={currentPage === sortedAndPaginatedClasses.totalPages}
                className="h-8"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClass ? "Edit Class" : "Add New Class"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Auto-generated name preview */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Label className="text-xs text-blue-700 font-semibold">Auto-Generated Class Name</Label>
              <p className="text-sm font-bold text-blue-900 mt-1">{getPreviewName()}</p>
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
              <Label htmlFor="group">Group <span className="text-red-500">*</span></Label>
              <Input
                id="group"
                value={formData.group}
                onChange={(e) => setFormData({ ...formData, group: e.target.value.toUpperCase() })}
                placeholder="e.g., M1, M2, A1, A2"
                maxLength={10}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Required: M1 (Morning 1), M2 (Morning 2), A1 (Afternoon 1), A2 (Afternoon 2), etc.</p>
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
