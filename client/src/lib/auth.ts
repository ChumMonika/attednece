import { apiRequest } from "./queryClient";

export interface LoginResponse {
  role: string;
  name: string;
  id: number;
  uniqueId: string;
}

export async function login(uniqueId: string, password: string): Promise<LoginResponse> {
  const response = await apiRequest("POST", "/api/login", { uniqueId, password });
  return response.json();
}

export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/logout");
}

export async function getCurrentUser() {
  const response = await apiRequest("GET", "/api/me");
  if (!response.ok) {
    throw new Error('Not authenticated');
  }
  return response.json();
}
