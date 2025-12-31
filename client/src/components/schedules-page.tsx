import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TablePagination } from "@/components/table-pagination";
import { Plus, Edit, Trash2, Clock, X, AlertCircle, Calendar as CalendarIcon, Layers, Filter, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import type { Schedule, Class, Subject, User, Major } from "@/types";

interface BulkScheduleItem {
  id: string;
  subjectId: string;
  teacherId: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

export default function SchedulesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [creationMode, setCreationMode] = useState<"single" | "bulk">("single");
  
  // Filters
  const [filterMajor, setFilterMajor] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterSemester, setFilterSemester] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    classId: "",
    subjectId: "",
    teacherId: "",
    day: "",
    startTime: "",
    endTime: "",
    room: "",
  });
  const [bulkClassId, setBulkClassId] = useState("");
  const [bulkSchedules, setBulkSchedules] = useState<BulkScheduleItem[]>([]);
  const [conflictWarnings, setConflictWarnings] = useState<string[]>([]);

  const { data: schedules, isLoading } = useQuery<Schedule[]>({
  queryKey: ["/api/schedules"],
});

const { data: allClasses } = useQuery<Class[]>({
  queryKey: ["/api/classes"],
});

// ✅ Filter for active classes only
const activeClasses = useMemo(() => {
  return allClasses?.filter(cls => cls.isActive === 1) || [];
}, [allClasses]);

// ✅ Use activeClasses throughout the component
const classes = activeClasses;

const { data: subjects } = useQuery<Subject[]>({
  queryKey: ["/api/subjects"],
});

const { data: users } = useQuery<User[]>({
  queryKey: ["/api/users"],
});

const { data: majors } = useQuery<Major[]>({
  queryKey: ["/api/majors"],
});

const teachers = users?.filter(u => u.role === "teacher") || [];

// Hierarchical grouping: Major → Year/Semester → Class → Schedules
const hierarchicalSchedules = useMemo(() => {
  if (!schedules || !classes || !majors) return { hierarchy: [], totalItems: 0, totalPages: 0 };

  // Filter schedules
  let filtered = schedules;
  if (filterMajor !== "all") {
    const classIdsForMajor = classes.filter(c => c.majorId === parseInt(filterMajor)).map(c => c.id);
    filtered = filtered.filter(s => classIdsForMajor.includes(s.classId));
  }
  if (filterClass !== "all") {
    filtered = filtered.filter(s => s.classId === parseInt(filterClass));   
  }

  // ❌ REMOVE THIS LINE (it was causing the duplicate):
  // const activeClasses = useMemo(() => {
  //   return allClasses?.filter(cls => cls.isActive === 1) || [];}, [allClasses]);

  // Group by major → year/semester → class
  const hierarchy: any[] = [];
  
  // Group schedules by class first
  const schedulesByClass = filtered.reduce((acc, schedule) => {
    if (!acc[schedule.classId]) acc[schedule.classId] = [];
    acc[schedule.classId].push(schedule);
    return acc;
  }, {} as Record<number, Schedule[]>);

  // Build hierarchy
  Object.entries(schedulesByClass).forEach(([classIdStr, classSchedules]) => {
    const classId = parseInt(classIdStr);
    const classInfo = classes.find(c => c.id === classId);
    if (!classInfo) return;

    const major = majors.find(m => m.id === classInfo.majorId);
    const majorShort = major?.shortName || 'Unknown';
    const majorName = major?.name || 'Unknown';
    const year = classInfo.year;
    const semester = classInfo.semester;
    const group = classInfo.group || '';
    const classLabel = classInfo.classLabel || `${majorShort} Y${year}S${semester} ${group}`;
    const subjectCount = classSchedules.length;

    // Sort schedules by day and time
    const sortedSchedules = classSchedules.sort((a, b) => {
      const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
      const dayDiff = (dayOrder[a.day as keyof typeof dayOrder] || 0) - (dayOrder[b.day as keyof typeof dayOrder] || 0);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    // Find or create major group
    let majorGroup = hierarchy.find(h => h.majorId === classInfo.majorId);
    if (!majorGroup) {
      majorGroup = {
        majorId: classInfo.majorId,
        majorName,
        majorShort,
        yearSemesterGroups: []
      };
      hierarchy.push(majorGroup);
    }

    // Find or create year/semester group
    const yearSemKey = `Y${year}S${semester}`;
    let yearSemGroup = majorGroup.yearSemesterGroups.find((g: any) => g.key === yearSemKey);
    if (!yearSemGroup) {
      yearSemGroup = {
        key: yearSemKey,
        year,
        semester,
        label: `Year ${year} – Semester ${semester}`,
        classes: []
      };
      majorGroup.yearSemesterGroups.push(yearSemGroup);
    }

    // Add class to year/semester group
    yearSemGroup.classes.push({
      classId,
      classInfo,
      classLabel,
      subjectCount,
      displayHeader: `${classLabel} — ${subjectCount} Subject${subjectCount !== 1 ? 's' : ''}`,
      schedules: sortedSchedules
    });
  });

  // Sort hierarchy
  hierarchy.sort((a, b) => a.majorShort.localeCompare(b.majorShort));
  hierarchy.forEach(major => {
    major.yearSemesterGroups.sort((a: any, b: any) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.semester - b.semester;
    });
    major.yearSemesterGroups.forEach((ys: any) => {
      ys.classes.sort((a: any, b: any) => a.classLabel.localeCompare(b.classLabel));
    });
  });

  // Count total number of classes (not schedules)
  const totalClasses = Object.keys(schedulesByClass).length;
  
  return {
    hierarchy,
    totalItems: totalClasses,
    totalPages: Math.ceil(totalClasses / itemsPerPage)
  };
}, [schedules, classes, majors, filterMajor, filterClass, currentPage, itemsPerPage]);



  const toggleClassExpanded = (classId: number) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId);
    } else {
      newExpanded.add(classId);
    }
    setExpandedClasses(newExpanded);
  };

  // Classes are collapsed by default (no auto-expand)

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingSchedule) {
        const response = await apiRequest("PUT", `/api/schedules/${editingSchedule.id}`, data);
        return response.json();
      }
      const response = await apiRequest("POST", "/api/schedules", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Success",
        description: editingSchedule ? "Schedule updated successfully" : "Schedule created successfully",
      });
      closeDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save schedule",
        variant: "destructive",
      });
    },
  });

  const bulkSaveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/schedules/bulk", data);
      return response.json();
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Success",
        description: `Successfully created ${response.length} schedule${response.length > 1 ? 's' : ''}`,
      });
      closeDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create schedules. Check for conflicts.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Success",
        description: "Schedule deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive",
      });
    },
  });

  const openDialog = (schedule?: Schedule, mode: "single" | "bulk" = "single") => {
    setCreationMode(mode);
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        classId: schedule.classId.toString(),
        subjectId: schedule.subjectId.toString(),
        teacherId: schedule.teacherId.toString(),
        day: schedule.day,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        room: schedule.room || "",
      });
    } else {
      setEditingSchedule(null);
      setFormData({ classId: "", subjectId: "", teacherId: "", day: "", startTime: "", endTime: "", room: "" });
      setBulkClassId("");
      setBulkSchedules([]);
      setConflictWarnings([]);
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingSchedule(null);
    setFormData({ classId: "", subjectId: "", teacherId: "", day: "", startTime: "", endTime: "", room: "" });
    setBulkClassId("");
    setBulkSchedules([]);
    setConflictWarnings([]);
    setCreationMode("single");
  };

  const addBulkScheduleSlot = () => {
    const newSlot: BulkScheduleItem = {
      id: Math.random().toString(36).substr(2, 9),
      subjectId: "",
      teacherId: "",
      day: "",
      startTime: "",
      endTime: "",
      room: "",
    };
    setBulkSchedules([...bulkSchedules, newSlot]);
  };

  const removeBulkScheduleSlot = (id: string) => {
    setBulkSchedules(bulkSchedules.filter(slot => slot.id !== id));
  };

  const updateBulkScheduleSlot = (id: string, field: keyof BulkScheduleItem, value: string) => {
    setBulkSchedules(bulkSchedules.map(slot => 
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  };

  const checkBulkConflicts = () => {
    const warnings: string[] = [];
    const teacherSchedules = new Map<string, Array<{day: string, start: string, end: string}>>();

    // Group by teacher
    bulkSchedules.forEach((slot, index) => {
      if (!slot.teacherId || !slot.day || !slot.startTime || !slot.endTime) return;
      
      const key = slot.teacherId;
      if (!teacherSchedules.has(key)) {
        teacherSchedules.set(key, []);
      }
      teacherSchedules.get(key)!.push({
        day: slot.day,
        start: slot.startTime,
        end: slot.endTime
      });
    });

    // Check for conflicts
    teacherSchedules.forEach((scheduleList, teacherId) => {
      const teacher = teachers.find(t => t.id.toString() === teacherId);
      const teacherName = teacher?.name || `Teacher ${teacherId}`;

      for (let i = 0; i < scheduleList.length; i++) {
        for (let j = i + 1; j < scheduleList.length; j++) {
          const s1 = scheduleList[i];
          const s2 = scheduleList[j];

          if (s1.day === s2.day) {
            const hasConflict = (
              (s1.start >= s2.start && s1.start < s2.end) ||
              (s1.end > s2.start && s1.end <= s2.end) ||
              (s1.start <= s2.start && s1.end >= s2.end)
            );

            if (hasConflict) {
              warnings.push(
                `⚠️ ${teacherName} has overlapping schedules on ${s1.day}: ${s1.start}-${s1.end} conflicts with ${s2.start}-${s2.end}`
              );
            }
          }
        }
      }
    });

    setConflictWarnings(warnings);
    return warnings.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId || !formData.subjectId || !formData.teacherId || !formData.day || !formData.startTime || !formData.endTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate({
      classId: parseInt(formData.classId),
      subjectId: parseInt(formData.subjectId),
      teacherId: parseInt(formData.teacherId),
      day: formData.day,
      startTime: formData.startTime,
      endTime: formData.endTime,
      room: formData.room || null,
      isActive: true,
    });
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bulkClassId) {
      toast({
        title: "Error",
        description: "Please select a class",
        variant: "destructive",
      });
      return;
    }

    if (bulkSchedules.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one schedule slot",
        variant: "destructive",
      });
      return;
    }

    // Validate all slots
    const invalidSlots = bulkSchedules.filter(slot => 
      !slot.subjectId || !slot.teacherId || !slot.day || !slot.startTime || !slot.endTime
    );

    if (invalidSlots.length > 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields for all schedule slots",
        variant: "destructive",
      });
      return;
    }

    // Check for conflicts
    checkBulkConflicts();

    // Prepare data
    const schedulesData = bulkSchedules.map(slot => ({
      classId: parseInt(bulkClassId),
      subjectId: parseInt(slot.subjectId),
      teacherId: parseInt(slot.teacherId),
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room || null,
      isActive: true,
    }));

    bulkSaveMutation.mutate({ schedules: schedulesData });
  };

  const handleDelete = (schedule: Schedule) => {
    if (window.confirm("Are you sure you want to delete this schedule?")) {
      deleteMutation.mutate(schedule.id);
    }
  };

  const getClassName = (schedule: Schedule) => {
    // First try to get fullClassName from schedule response (which includes it)
    if ((schedule as any).fullClassName) {
      return (schedule as any).fullClassName;
    }
    // Fall back to computing from classes list
    const classInfo = classes?.find(c => c.id === schedule.classId);
    if (classInfo && (classInfo as any).fullClassName) {
      return (classInfo as any).fullClassName;
    }
    return classInfo?.name || "Unknown";
  };

  const getSubjectName = (subjectId: number) => {
    const subject = subjects?.find(s => s.id === subjectId);
    return subject ? `${subject.code} - ${subject.name}` : "Unknown";
  };

  const getTeacherName = (teacherId: number) => {
    return users?.find(u => u.id === teacherId)?.name || "Unknown";
  };

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="p-8 pt-24 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedules</h1>
          <p className="text-sm text-gray-600 mt-2">Manage class schedules and timetables</p>
        </div>
        <Button
          onClick={() => openDialog(undefined, "bulk")}
          className="bg-green-600 hover:bg-green-700 text-white shadow-md"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Schedules
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <Select value={filterMajor} onValueChange={(value) => { setFilterMajor(value); setFilterClass("all"); setCurrentPage(1); }}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="All Majors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Majors</SelectItem>
              {majors?.map((major) => (
                <SelectItem key={major.id} value={major.id.toString()}>
                  {major.name} ({major.shortName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterClass} onValueChange={(value) => { setFilterClass(value); setCurrentPage(1); }}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes
                ?.filter(c => filterMajor === "all" || c.majorId === parseInt(filterMajor))
                .map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.classLabel || cls.displayClassName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {(filterMajor !== "all" || filterClass !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setFilterMajor("all"); setFilterClass("all"); setCurrentPage(1); }}
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Loading schedules...
          </div>
        ) : hierarchicalSchedules.totalItems === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No schedules found
          </div>
        ) : (
          <>
            {hierarchicalSchedules.hierarchy.map((majorGroup) => (
              <div key={majorGroup.majorId} className="border-b-2 border-gray-300 last:border-b-0">
                {/* Major Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white tracking-wide" title={majorGroup.majorName}>
                    {majorGroup.majorShort}
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-100 font-medium">Year:</span>
                      <select
                        value={filterYear}
                        onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-1 text-sm border-0 rounded-md bg-blue-500 text-white font-medium focus:outline-none focus:ring-2 focus:ring-white cursor-pointer hover:bg-blue-400 transition-colors"
                      >
                        <option value="all">All</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-100 font-medium">Semester:</span>
                      <select
                        value={filterSemester}
                        onChange={(e) => { setFilterSemester(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-1 text-sm border-0 rounded-md bg-blue-500 text-white font-medium focus:outline-none focus:ring-2 focus:ring-white cursor-pointer hover:bg-blue-400 transition-colors"
                      >
                        <option value="all">All</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Year/Semester Groups */}
                {majorGroup.yearSemesterGroups
                  .filter((ysGroup: any) => {
                    if (filterYear !== "all" && ysGroup.year !== parseInt(filterYear)) return false;
                    if (filterSemester !== "all" && ysGroup.semester !== parseInt(filterSemester)) return false;
                    return true;
                  })
                  .map((ysGroup: any) => (
                  <div key={ysGroup.key}>
                    {/* Classes in this Year/Semester */}
                    {ysGroup.classes.map((classGroup: any) => (
                      <div key={classGroup.classId} className="border-b border-gray-100 last:border-b-0">
                        {/* Class Header - Collapsible */}
                        <button
                          onClick={() => toggleClassExpanded(classGroup.classId)}
                          className="w-full px-10 py-4 bg-white hover:bg-blue-50 transition-all duration-200 flex items-center justify-between group border-l-4 border-transparent hover:border-blue-500"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-600">
                              {expandedClasses.has(classGroup.classId) ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </div>
                            <div className="text-left">
                              <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{classGroup.classLabel}</h4>
                              <p className="text-xs text-gray-500 mt-1">{classGroup.subjectCount} Subject{classGroup.subjectCount !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-blue-600 text-white font-bold text-sm px-3 py-1">
                              {classGroup.subjectCount}
                            </Badge>
                          </div>
                        </button>

                        {/* Schedules Table - Shown when expanded */}
                        {expandedClasses.has(classGroup.classId) && (
                          <div className="overflow-x-auto bg-white">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-y border-gray-200">
                                <tr>
                                  <th className="px-10 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Day</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Teacher</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Room</th>
                                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-100">
                                {classGroup.schedules.map((schedule: Schedule) => (
                                  <tr key={schedule.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-10 py-3">
                                      <span className="text-sm font-medium text-gray-900">{schedule.day}</span>
                                    </td>
                                    <td className="px-6 py-3">
                                      <div className="flex items-center gap-1 text-sm text-gray-600">
                                        <Clock className="w-4 h-4" />
                                        <span>{schedule.startTime} - {schedule.endTime}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3">
                                      <span className="text-sm text-gray-600">{getSubjectName(schedule.subjectId)}</span>
                                    </td>
                                    <td className="px-6 py-3">
                                      <span className="text-sm text-gray-600">{getTeacherName(schedule.teacherId)}</span>
                                    </td>
                                    <td className="px-6 py-3">
                                      <span className="text-sm text-gray-600">{schedule.room || "—"}</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => openDialog(schedule)}
                                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDelete(schedule)}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {!isLoading && hierarchicalSchedules.totalItems > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, hierarchicalSchedules.totalItems)} of {hierarchicalSchedules.totalItems} classes
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
                onClick={() => setCurrentPage(prev => Math.min(hierarchicalSchedules.totalPages, prev + 1))}
                disabled={currentPage === hierarchicalSchedules.totalPages}
                className="h-8"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? "Edit Schedule" : "Add Schedules"}
            </DialogTitle>
          </DialogHeader>

          {!editingSchedule && creationMode === "bulk" ? (
            // BULK CREATION MODE
            <form onSubmit={handleBulkSubmit} className="space-y-6">
              <div>
                <Label htmlFor="bulkClass">Select Class <span className="text-red-500">*</span></Label>
                <Select value={bulkClassId} onValueChange={setBulkClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.classLabel || cls.displayClassName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Existing Schedules Preview */}
              {bulkClassId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Existing Schedules for {classes?.find(c => c.id === parseInt(bulkClassId))?.classLabel}
                  </h4>
                  {schedules?.filter(s => s.classId === parseInt(bulkClassId)).length === 0 ? (
                    <p className="text-sm text-blue-700">No existing schedules</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-blue-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">Day</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">Time</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">Subject</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">Teacher</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">Room</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {schedules
                            ?.filter(s => s.classId === parseInt(bulkClassId))
                            .sort((a, b) => {
                              const dayOrder = daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day);
                              if (dayOrder !== 0) return dayOrder;
                              return a.startTime.localeCompare(b.startTime);
                            })
                            .map((schedule) => (
                              <tr key={schedule.id} className="border-b border-blue-100">
                                <td className="px-3 py-2 text-blue-900">{schedule.day}</td>
                                <td className="px-3 py-2 text-blue-900">{schedule.startTime} - {schedule.endTime}</td>
                                <td className="px-3 py-2 text-blue-900">{getSubjectName(schedule.subjectId)}</td>
                                <td className="px-3 py-2 text-blue-900">{getTeacherName(schedule.teacherId)}</td>
                                <td className="px-3 py-2 text-blue-900">{schedule.room}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Schedule Slots ({bulkSchedules.length})</Label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addBulkScheduleSlot}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Slot
                  </Button>
                </div>

                {bulkSchedules.length === 0 ? (
                  <Alert>
                    <CalendarIcon className="h-4 w-4" />
                    <AlertDescription>
                      No schedule slots added yet. Click "Add Slot" to create your first schedule entry.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {bulkSchedules.map((slot, index) => (
                      <Card key={slot.id} className="p-4 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <Badge variant="secondary">Slot {index + 1}</Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBulkScheduleSlot(slot.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 -mt-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Subject *</Label>
                            <Select
                              value={slot.subjectId}
                              onValueChange={(value) => updateBulkScheduleSlot(slot.id, "subjectId", value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjects?.map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id.toString()}>
                                    {subject.code} - {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Teacher *</Label>
                            <Select
                              value={slot.teacherId}
                              onValueChange={(value) => updateBulkScheduleSlot(slot.id, "teacherId", value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {teachers.map((teacher) => (
                                  <SelectItem key={teacher.id} value={teacher.id.toString()}>
                                    {teacher.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Day *</Label>
                            <Select
                              value={slot.day}
                              onValueChange={(value) => updateBulkScheduleSlot(slot.id, "day", value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {daysOfWeek.map((day) => (
                                  <SelectItem key={day} value={day}>
                                    {day}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Room</Label>
                            <Input
                              className="h-9"
                              value={slot.room}
                              onChange={(e) => updateBulkScheduleSlot(slot.id, "room", e.target.value)}
                              placeholder="e.g., A101"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Start Time *</Label>
                            <Input
                              type="time"
                              className="h-9"
                              value={slot.startTime}
                              onChange={(e) => updateBulkScheduleSlot(slot.id, "startTime", e.target.value)}
                            />
                          </div>

                          <div>
                            <Label className="text-xs">End Time *</Label>
                            <Input
                              type="time"
                              className="h-9"
                              value={slot.endTime}
                              onChange={(e) => updateBulkScheduleSlot(slot.id, "endTime", e.target.value)}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {conflictWarnings.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">Conflict Warnings:</div>
                    <ul className="space-y-1 text-sm">
                      {conflictWarnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={checkBulkConflicts}
                  className="mr-2"
                >
                  Check Conflicts
                </Button>
                <Button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700" 
                  disabled={bulkSaveMutation.isPending || bulkSchedules.length === 0}
                >
                  {bulkSaveMutation.isPending ? "Creating..." : `Create ${bulkSchedules.length} Schedule${bulkSchedules.length > 1 ? 's' : ''}`}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            // SINGLE CREATION/EDIT MODE
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="class">Class <span className="text-red-500">*</span></Label>
                <Select value={formData.classId} onValueChange={(value) => setFormData({ ...formData, classId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.classLabel || cls.displayClassName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Subject <span className="text-red-500">*</span></Label>
                <Select value={formData.subjectId} onValueChange={(value) => setFormData({ ...formData, subjectId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.code} - {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="teacher">Teacher <span className="text-red-500">*</span></Label>
                <Select value={formData.teacherId} onValueChange={(value) => setFormData({ ...formData, teacherId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.name} ({teacher.uniqueId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="day">Day <span className="text-red-500">*</span></Label>
                <Select value={formData.day} onValueChange={(value) => setFormData({ ...formData, day: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time <span className="text-red-500">*</span></Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time <span className="text-red-500">*</span></Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="room">Room (Optional)</Label>
                <Input
                  id="room"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="e.g., Room 301, Lab A"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingSchedule ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
