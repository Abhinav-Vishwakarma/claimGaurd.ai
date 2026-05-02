import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { apiRequest } from "../../../../lib/apiClient";

const OCR_BASE = "/dashboard/ocr";

const handleError = (error: any) => {
  toast.error(error.message || "An error occurred during extraction");
  throw error;
};

export const useExtractOcr = () => {
  return useMutation({
    mutationFn: async (payload: {
      vaultItemId: string;
      fileUrl: string;
      filename: string;
      docType: "prescription" | "bill" | "lab_report";
    }) => {
      return apiRequest<any>(`${OCR_BASE}`, {
        method: "POST",
        body: JSON.stringify(payload),
      }).catch(handleError);
    },
    onSuccess: () => {
      toast.success("Clinical data extracted successfully");
    },
  });
};

export const useRunGatekeeper = () => {
  return useMutation({
    mutationFn: async (payload: {
      prescriptionVaultId: string;
      billVaultId: string;
      labReportVaultId: string;
    }) => {
      return apiRequest<any>(`${OCR_BASE}/gatekeeper`, {
        method: "POST",
        body: JSON.stringify(payload),
      }).catch(handleError);
    },
  });
};
