import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import type { 
  DashboardOverview, 
  UserProfile, 
  MedicalVaultItem, 
  EOBRecord, 
  AppealLetter 
} from "../types/dashboard.types";
import { apiRequest } from "../../../../lib/apiClient";

const API_BASE = "/api/v1/dashboard";

const handleError = (error: any) => {
  toast.error(error.message || "An error occurred");
  throw error;
};

// 1. Dashboard Home
export const useDashboardOverview = () => {
  return useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: async (): Promise<DashboardOverview> => {
      return apiRequest<DashboardOverview>(`${API_BASE}/overview`).catch(handleError);
    }
  });
};

// 2. Profile
export const useUserProfile = () => {
  return useQuery({
    queryKey: ["dashboard", "profile"],
    queryFn: async (): Promise<UserProfile> => {
      return apiRequest<UserProfile>(`${API_BASE}/profile`).catch(handleError);
    }
  });
};

// 3. Vault
export const useMedicalVault = () => {
  return useQuery({
    queryKey: ["dashboard", "vault"],
    queryFn: async (): Promise<MedicalVaultItem[]> => {
      return apiRequest<MedicalVaultItem[]>(`${API_BASE}/vault`).catch(handleError);
    }
  });
};

export const useUploadVaultItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileData: FormData) => {
      return apiRequest<{ success: boolean }>(`${API_BASE}/vault/upload`, {
        method: "POST",
        body: fileData as any, // FormData overrides Content-Type properly in fetch
      }).catch(handleError);
    },
    onSuccess: () => {
      toast.success("File uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["dashboard", "vault"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload file");
    }
  });
};

// 4. Claims History
export const useClaimsHistory = () => {
  return useQuery({
    queryKey: ["dashboard", "history"],
    queryFn: async (): Promise<EOBRecord[]> => {
      return apiRequest<EOBRecord[]>(`${API_BASE}/claims`).catch(handleError);
    }
  });
};

// 5. Appeals Center
export const useAppeals = () => {
  return useQuery({
    queryKey: ["dashboard", "appeals"],
    queryFn: async (): Promise<AppealLetter[]> => {
      return apiRequest<AppealLetter[]>(`${API_BASE}/appeals`).catch(handleError);
    }
  });
};