// This file is no longer used - content moved to main teacher-dashboard.tsx
// Keeping for reference only

import { Calendar } from "lucide-react";
import type { User } from "@/types";

interface TeacherAttendanceProps {
  user: User;
}

export default function TeacherAttendance({ user }: TeacherAttendanceProps) {
  // This component is deprecated - content moved to main teacher-dashboard.tsx
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Teacher Attendance</h2>
        <p className="text-gray-600">Content has been moved to the main dashboard page.</p>
      </div>
    </div>
  );
}