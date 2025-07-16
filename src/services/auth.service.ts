// import api from "@/lib/api";
import api from "@/lib/api";
import type { AuthResponse } from "@/types/response.type";

interface SignInPayload {
  email: string;
  password: string;
}

interface SignUpPayload {
  name: string;
  email: string;
  password: string;
}

export async function signIn(payload: SignInPayload): Promise<AuthResponse> {
  const response = await api.post("/api/auth/signin", payload, {
    headers: { "Content-Type": "application/json" },
  });
  return response?.data;
}

export async function signUp(payload: SignUpPayload): Promise<AuthResponse> {
  const response = await api.post("/api/auth/signup", payload, {
    headers: { "Content-Type": "application/json" },
  });
  return response?.data;
}

export async function signOut(): Promise<AuthResponse> {
  const response = await api.post("/api/auth/signout", {
    headers: { "Content-Type": "application/json" },
  });
  return response?.data;
}
