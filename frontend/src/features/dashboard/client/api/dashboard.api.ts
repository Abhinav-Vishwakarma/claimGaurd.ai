import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { genUploader } from "uploadthing/client";
import type { FileRoute } from "uploadthing/types";
import { toast } from "react-toastify";
import type { 
  DashboardOverview, 
  UserProfile, 
  MedicalVaultItem, 
  EOBRecord, 
  AppealLetter,
  VaultItemType,
} from "../types/dashboard.types";
import { apiRequest } from "../../../../lib/apiClient";
import { getAccessToken } from "../../../../lib/authStorage";

const API_BASE = "/dashboard";
type ClientUploadRouter = {
  vaultUploader: FileRoute<{
    input: { type: VaultItemType };
    output: { fileUrl: string };
    errorShape: { message: string };
  }>;
};

const handleError = (error: any) => {
  toast.error(error.message || "An error occurred");
  throw error;
};

const UPLOADTHING_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"}/uploadthing`;
const { uploadFiles } = genUploader<any>({
  url: UPLOADTHING_URL,
});

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
    mutationFn: async (payload: { file: File; type: VaultItemType }) => {
      const token = getAccessToken();
      const [result] = await uploadFiles("vaultUploader", {
        files: [payload.file],
        // @ts-ignore - Uploadthing client types may not recognize 'input' dynamically
        input: { type: payload.type },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!result) throw new Error("Upload failed");
      return result;
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
