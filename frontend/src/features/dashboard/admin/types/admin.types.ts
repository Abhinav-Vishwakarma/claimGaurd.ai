export type PlanType = "PPO" | "HMO";

export interface ClientRegistrationInput {
  userId?: string;
  email: string;
  password?: string;
  name: string;
  memberId: string;
  planType: PlanType;
  deductibleTotal: number;
  policyActive: boolean;
  premiumPaid: boolean;
}

export interface ClientProfile {
  id: string;
  email: string;
  name: string;
  memberProfile: {
    id: string;
    memberId: string;
    planType: PlanType;
    deductibleTotal: number;
    deductibleMet: number;
    policyActive: boolean;
    premiumPaid: boolean;
  } | null;
}
