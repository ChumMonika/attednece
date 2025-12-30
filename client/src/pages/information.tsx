import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import DashboardHeader from "@/components/admin-header";
import AdminSidebar from "@/components/new-admin-sidebar";
import type { User } from "@/types";

export default function InformationPage() {
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const currentRoute = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar currentRoute={currentRoute} />
      <div className="flex-1 flex flex-col">
        <DashboardHeader
          user={{ id: 0, name: '', role: '', department: '', uniqueId: '', status: '' }}
          title="All Staff Information"
          subtitle="View information of all staff members."
          borderColor="border-gray-600"
          bgColor="bg-gray-600"
        />
        <div className="w-full h-full min-h-screen px-4 pb-8">
          <Card className="w-full h-full min-h-[700px] shadow-xl rounded-2xl overflow-hidden">
            {/* Gradient Card Header */}
            <div className="w-full py-6 px-8 bg-gradient-to-r from-indigo-400 via-pink-400 to-orange-300">
              <h2 className="text-2xl font-bold text-white tracking-wide">All Staff Information</h2>
              <p className="text-white text-opacity-90 mt-1">View information of all staff members.</p>
            </div>
            <CardContent className="p-6">
              {isLoading ? (
                <div>Loading staff information...</div>
              ) : error ? (
                <div className="text-red-600">Failed to load staff information.</div>
              ) : users && users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-pink-700 uppercase tracking-wider bg-pink-50">Unique ID</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-orange-700 uppercase tracking-wider bg-orange-50">Department</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-green-700 uppercase tracking-wider bg-green-50">Role</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, idx) => (
                        <tr key={user.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-orange-50'}>
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
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-700 underline">{user.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div>No staff found.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
