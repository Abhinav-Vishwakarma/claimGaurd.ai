import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "../../lib/authStorage";
import { authApi } from "./auth.api";
import type { AuthResponse, LoginInput, RegisterInput } from "./auth.types";

const authKey = ["auth", "me"];

const authError = (error: Error) => toast.error(error.message);

function useAuthMutation<TInput>(mutationFn: (input: TInput) => Promise<AuthResponse>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onError: authError,
    onSuccess: (data) => {
      saveTokens(data);
      queryClient.setQueryData(authKey, { user: data.user });
      window.history.pushState({}, "", "/dashboard");
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
  });
}

export function useLogin() {
  return useAuthMutation<LoginInput>(authApi.login);
}

export function useRegister() {
  return useAuthMutation<RegisterInput>(authApi.register);
}

export function useMe() {
  return useQuery({
    queryKey: authKey,
    queryFn: authApi.me,
    enabled: Boolean(getAccessToken()),
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = getRefreshToken();
      if (refreshToken) await authApi.logout(refreshToken);
    },
    onSettled: () => {
      clearTokens();
      queryClient.removeQueries({ queryKey: authKey });
      window.history.pushState({}, "", "/login");
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
  });
}
