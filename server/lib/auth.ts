import { queryClient } from "./queryClient";
import type { User, LoginData, RegisterData } from "@shared/schema";

interface AuthResponse {
  user: Omit<User, 'password'>;
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Login failed");
  }

  const result = await response.json();
  return result;
}

export async function register(data: Omit<RegisterData, 'confirmPassword'> & { confirmPassword: string }): Promise<AuthResponse> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Registration failed");
  }

  const result = await response.json();
  return result;
}

export async function logout(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Logout failed");
  }

  // Clear all cached data
  queryClient.clear();
}

export async function getCurrentUser(): Promise<Omit<User, 'password'> | null> {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "include",
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      throw new Error("Failed to get current user");
    }

    const result = await response.json();
    return result.user;
  } catch (error) {
    return null;
  }
}
