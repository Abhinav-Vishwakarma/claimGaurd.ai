import { ClaimStatus, PlanType, VaultItemType, EOBStatus, AppealStatus } from '@prisma/client';

export interface DashboardOverviewResponse {
  activeClaimsCount: number;
  averageComplianceScore: number;
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: Date;
  }>;
}

export interface UserProfileResponse {
  memberId: string;
  planType: PlanType;
  deductible: {
    total: number;
    met: number;
  };
}

export interface MedicalVaultItemResponse {
  id: string;
  type: VaultItemType;
  fileName: string;
  uploadDate: Date;
  url: string;
  publicId?: string | null;
}

export interface EOBRecordResponse {
  id: string;
  dateOfService: Date;
  billedAmount: number;
  allowedAmount: number;
  paidAmount: number;
  patientResponsibility: number;
  finalStatus: EOBStatus;
}

export interface AppealLetterResponse {
  id: string;
  claimId: string;
  status: AppealStatus;
  createdAt: Date;
  content: string;
}
