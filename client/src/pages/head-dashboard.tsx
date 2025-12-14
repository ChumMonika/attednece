import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";
import HeadDashboard from "@/components/head-dashboard";
import type { User } from "@/types";

export default function HeadDashboardPage() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/me"],
    queryFn: getCurrentUser,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error || !user) return <div>Failed to load user.<br />{error ? String(error) : null}</div>;

  return <HeadDashboard user={user} />;
}
