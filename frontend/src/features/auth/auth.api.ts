import { apiRequest } from "../../lib/apiClient";
import { getAccessToken } from "../../lib/authStorage";
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from "./auth.types";

export const authApi = {
  login: (input: LoginInput) =>
    apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  register: (input: RegisterInput) =>
    apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  me: () => apiRequest<{ user: AuthUser }>("/auth/me", { token: getAccessToken() }),

  logout: (refreshToken: string) =>
    apiRequest<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
};
