import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { apiRequest } from "../../../../lib/apiClient";
import type { ClientRegistrationInput, ClientProfile } from "../types/admin.types";

const ADMIN_BASE = "/admin";

const handleError = (error: any) => {
  toast.error(error.message || "An error occurred");
  throw error;
};

export const useRegisterClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ClientRegistrationInput) => {
      return apiRequest<any>(`${ADMIN_BASE}/register-client`, {
        method: "POST",
        body: JSON.stringify(payload),
      }).catch(handleError);
    },
    onSuccess: () => {
      toast.success("Client registered successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "clients"] });
    },
  });
};

export const useAllClients = () => {
  return useQuery({
    queryKey: ["admin", "clients"],
    queryFn: async (): Promise<ClientProfile[]> => {
      return apiRequest<ClientProfile[]>(`${ADMIN_BASE}/clients`).catch(handleError);
    },
  });
};

export const useSearchUser = (email: string) => {
  return useQuery({
    queryKey: ["admin", "user-search", email],
    queryFn: async () => {
      if (!email || email.length < 3) return null;
      return apiRequest<any>(`${ADMIN_BASE}/users/search?email=${encodeURIComponent(email)}`).catch(handleError);
    },
    enabled: email.length >= 3,
  });
};
