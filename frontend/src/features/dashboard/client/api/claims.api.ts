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

export type ClaimStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'PARTIAL_APPROVED' | 'REJECTED';

export type ClaimListItem = {
  id: string;
  prescriptionVaultId: string;
  billVaultId: string;
  labReportVaultId: string;
  provider: string;
  billedAmount: number;
  date: string;
  status: ClaimStatus;
  adminDecision: string | null;
  adminApprovedAmount: number | null;
  adminRemark: string | null;
  decidedAt: string | null;
  createdAt: string;
  claimSession: { verdict: string; isClaimable: boolean; verdictSummary: string; adjudicationResult: unknown } | null;
  eob: EobRecord | null;
  paymentRequest: { id: string; status: string; grantedAmount: number; createdAt: string } | null;
  parentClaim: { id: string; status: string } | null;
};

export type ClaimDetail = ClaimListItem & {
  vaultItems: { id: string; fileName: string; type: string; url: string }[];
  refiledClaims: { id: string; status: string; createdAt: string }[];
};

export type EobRecord = {
  id: string;
  dateOfService: string;
  billedAmount: number;
  allowedAmount: number;
  paidAmount: number;
  patientResponsibility: number;
  finalStatus: string;
};

export type PaymentRequestInput = {
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  additionalNotes?: string;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useMyClaimsList = () =>
  useQuery<ClaimListItem[]>({
    queryKey: ['claims', 'my'],
    queryFn: () => apiFetch('/claims'),
  });

export const useClaimDetail = (id: string) =>
  useQuery<ClaimDetail>({
    queryKey: ['claims', id],
    queryFn: () => apiFetch(`/claims/${id}`),
    enabled: !!id,
  });

export const useFileClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { prescriptionVaultId: string; billVaultId: string; labReportVaultId: string; provider?: string }) =>
      apiFetch('/claims', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  });
};

export const useRefileClaim = (parentClaimId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { prescriptionVaultId: string; billVaultId: string; labReportVaultId: string }) =>
      apiFetch(`/claims/${parentClaimId}/refile`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  });
};

export const useSubmitPaymentRequest = (claimId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PaymentRequestInput) =>
      apiFetch(`/claims/${claimId}/payment-request`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims', claimId] }),
  });
};
