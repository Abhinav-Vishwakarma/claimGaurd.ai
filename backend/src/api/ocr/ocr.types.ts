// ─── Agent 1 Output: Clinical Extractor ──────────────────────────────────────

export type ServiceMap = {
  metadata: {
    patient_id: string | null;
    date_of_service: string | null;
    provider_npi: string | null;
    claim_type: string | null;
  };
  triangulation_data: {
    prescription: {
      ordered_service: string | null;
      reason: string | null;
      signature_verified: boolean | null;
    };
    lab_report: {
      performed_service: string | null;
      findings_summary: string | null;
      vitals: Record<string, string> | null;
    };
    billing: {
      cpt_codes: string[];
      billed_amount: number | null;
    };
  };
  predictive_signals: {
    risk_factors: string[];
    comorbidities: string[];
    next_recommended_visit: string | null;
  };
};

// ─── Agent 2 Output: Compliance Officer ──────────────────────────────────────

export type TriangulationVerdict = 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW';
export type PhantomBillingRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export type NetworkStatus = 'IN_NETWORK' | 'OUT_OF_NETWORK' | 'UNKNOWN';

export type ClaimReport = {
  verdict: TriangulationVerdict;
  confidence: number; // 0.0 – 1.0
  triangulation_result: {
    prescription_matches_report: boolean;
    chronological_anomaly: boolean;
    phantom_billing_risk: PhantomBillingRisk;
    network_status: NetworkStatus;
  };
  flags: string[];
  recommendations: string[];
  applied_rules: string[];
};

// ─── Final Pipeline Output ────────────────────────────────────────────────────

export type OcrPipelineResult = {
  service_map: ServiceMap;
  claim_report: ClaimReport;
};
