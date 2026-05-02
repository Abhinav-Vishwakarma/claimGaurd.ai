import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '../../../../lib/authStorage';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const authHeaders = () => {
  const t = getAccessToken();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};

const apiFetch = async (url: string, opts?: RequestInit) => {
  const res = await fetch(`${API}${url}`, { ...opts, headers: { ...authHeaders(), ...opts?.headers } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Error ${res.status}`);
  return json.data;
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminClaimListItem = {
  id: string;
  prescriptionVaultId: string;
  billVaultId: string;
  labReportVaultId: string;
  provider: string;
  billedAmount: number;
  date: string;
  status: string;
  adminDecision: string | null;
  adminApprovedAmount: number | null;
  adminRemark: string | null;
  decidedAt: string | null;
  createdAt: string;
  user: { name: string | null; email: string; memberProfile: { memberId: string; planType: string; copay: number; coinsuranceRate: number } | null };
  claimSession: { verdict: string; isClaimable: boolean; verdictSummary: string } | null;
};

export type AdminClaimDetail = AdminClaimListItem & {
  vaultItems: { id: string; fileName: string; type: string; url: string; extractedAt: string | null }[];
  paymentRequest: AdminPaymentRequest | null;
  eob: { billedAmount: number; allowedAmount: number; paidAmount: number; patientResponsibility: number } | null;
  adjudicationResult: AdjudicationResult | null;
};

export type AdjudicationResult = {
  totalBilledAmount: number;
  totalAllowableAmount: number;
  approvedAmount: number;
  scrubSavings: number;
  copay: number;
  coinsuranceRate: number;
  coinsuranceCharge: number;
  patientResponsibility: number;
  insurerPays: number;
  cptBreakdown: { cptCode: string; billedAmount: number; allowableAmount: number; scrubSavings: number }[];
  notes: string[];
};

export type AdminPaymentRequest = {
  id: string;
  claimId: string;
  userId: string;
  grantedAmount: number;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  additionalNotes: string | null;
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
  adminRemark: string | null;
  approvedAt: string | null;
  createdAt: string;
  user?: { name: string | null; email: string };
  claim?: { id: string; billedAmount: number; adminApprovedAmount: number | null; adminDecision: string | null };
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useAdminClaimsList = (status?: string) =>
  useQuery<AdminClaimListItem[]>({
    queryKey: ['admin-claims', status ?? 'PENDING,UNDER_REVIEW'],
    queryFn: () => apiFetch(`/claims/admin/all${status ? `?status=${status}` : ''}`),
  });

export const useAdminClaimDetail = (id: string) =>
  useQuery<AdminClaimDetail>({
    queryKey: ['admin-claims', id],
    queryFn: () => apiFetch(`/claims/admin/${id}`),
    enabled: !!id,
  });

export const useMakeDecision = (claimId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { decision: 'APPROVED' | 'PARTIAL_APPROVED' | 'REJECTED'; adminRemark?: string; adminApprovedAmount?: number }) =>
      apiFetch(`/claims/admin/${claimId}/decision`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-claims'] });
    },
  });
};

export const useAdminPaymentRequests = (status?: string) =>
  useQuery<AdminPaymentRequest[]>({
    queryKey: ['admin-payments', status ?? 'PENDING_VERIFICATION'],
    queryFn: () => apiFetch(`/claims/admin/payments/list${status ? `?status=${status}` : ''}`),
  });

export const useProcessPayment = (paymentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { action: 'APPROVED' | 'REJECTED'; adminRemark?: string }) =>
      apiFetch(`/claims/admin/payments/${paymentId}/process`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payments'] }),
  });
};
