export type VaultItemType = "prescription" | "bill" | "lab_report";

export interface ClaimSummary {
  id: string;
  status: "pending" | "approved" | "denied";
  amount: number;
  date: string;
  provider: string;
}

export interface DashboardOverview {
  activeClaimsCount: number;
  averageComplianceScore: number;
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: string;
  }>;
}

export interface UserProfile {
  memberId: string;
  planType: "PPO" | "HMO";
  deductible: {
    total: number;
    met: number;
  };
}

export interface MedicalVaultItem {
  id: string;
  type: VaultItemType;
  fileName: string;
  uploadDate: string;
  url: string;
  publicId?: string | null;
}

export interface EOBRecord {
  id: string;
  dateOfService: string;
  billedAmount: number;
  allowedAmount: number;
  paidAmount: number;
  patientResponsibility: number;
  finalStatus: "processed" | "appealed";
}

export interface AppealLetter {
  id: string;
  claimId: string;
  status: "drafted" | "submitted" | "resolved";
  createdAt: string;
  content: string;
}
