import api from "@/lib/api";
import type { UserResponse } from "@/types/response.type";

export async function fetchSelf(): Promise<UserResponse> {
  const response = await api.get("/api/user/self");
  return response?.data as UserResponse;
}
