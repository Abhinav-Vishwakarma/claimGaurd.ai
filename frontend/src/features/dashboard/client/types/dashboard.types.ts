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
  type: "prescription" | "bill" | "lab_report";
  fileName: string;
  uploadDate: string;
  url: string;
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