import React from "react";

export default function TeacherSidebar({ currentRoute }: { currentRoute: string }) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col py-8 px-4 h-screen fixed top-0 left-0 z-20 shadow-lg overflow-y-auto">
      <div className="flex items-center mb-10">
        <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center mr-2">
          <span className="text-xl font-bold text-white">T</span>
        </span>
        <span className="text-2xl font-bold text-blue-500">Teacher Panel</span>
      </div>
      <nav className="flex flex-col gap-2">
        <a href="/teacher-dashboard" className={`flex items-center px-3 py-2 rounded-lg font-medium transition ${currentRoute === '/teacher-dashboard' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-700 hover:bg-blue-500 hover:text-white'}`}>
          <span className="h-5 w-5 mr-3 flex items-center justify-center"></span> Dashboard
        </a>
        <a href="/teacher-attendance" className={`flex items-center px-3 py-2 rounded-lg font-medium transition ${currentRoute === '/teacher-attendance' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-700 hover:bg-blue-500 hover:text-white'}`}>
          <span className="h-5 w-5 mr-3 flex items-center justify-center"></span> Attendance
        </a>
        <a href="/teacher-leave" className={`flex items-center px-3 py-2 rounded-lg font-medium transition ${currentRoute === '/teacher-leave' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-700 hover:bg-blue-500 hover:text-white'}`}>
          <span className="h-5 w-5 mr-3 flex items-center justify-center"></span> Leave Requests
        </a>
      </nav>
    </aside>
  );
}
