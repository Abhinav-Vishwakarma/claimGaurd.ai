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

// ─── Agent 2 Output: Clinical Validator (The Judge) ───────────────────────────

export type FraudFlag = {
  type: 'UPCODING' | 'UNBUNDLING' | 'PHANTOM_BILLING' | 'NONE';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'NONE';
};

export type ClinicalValidationReport = {
  passed: boolean;
  matched_condition: string | null;
  qdrant_confidence: number;
  icd10_specificity: {
    is_leaf_node: boolean;
    non_billable_hit: boolean;
    reason: string;
  };
  medical_necessity: {
    passed: boolean;
    allowed_cpts: string[];
    billed_cpts: string[];
    unauthorized_cpts: string[];
    reason: string;
  };
  fraud_detection: {
    upcoding: FraudFlag;
    unbundling: FraudFlag;
    ai_reasoning: string;
  };
  rejection_reasons: string[];
};

// ─── Agent 3 Output: Compliance Officer ──────────────────────────────────────

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

// ─── Agent Event Types (SSE streaming) ────────────────────────────────────────

export type AgentId = 'agent_1' | 'agent_2' | 'agent_3' | 'agent_4' | 'system';

export type AgentEventType =
  | 'PIPELINE_START'
  | 'AGENT_STARTED'
  | 'AGENT_THINKING'
  | 'TOOL_CALL'
  | 'TOOL_RESULT'
  | 'AGENT_OUTPUT'
  | 'AGENT_HANDOFF'
  | 'PIPELINE_COMPLETE'
  | 'PIPELINE_ERROR';

export type AgentEvent = {
  seq: number;
  t: number; // ms since pipeline start
  agent: AgentId;
  type: AgentEventType;
  message?: string;
  tool?: string;
  payload?: unknown;
};

// ─── Final Verdict ────────────────────────────────────────────────────────────

export type PipelineVerdict = 'CLAIMABLE' | 'NOT_CLAIMABLE' | 'NEEDS_REVIEW';

export type FinalPipelineResult = {
  sessionId: string;
  verdict: PipelineVerdict;
  isClaimable: boolean;
  verdictSummary: string;
  verdictReasons: string[];
  serviceMap: ServiceMap | null;
  validationReport: ClinicalValidationReport | null;
  gatekeeperReport: unknown | null;
  adjudicationResult: unknown | null; // FinancialAdjudicationReport | null
  eventLog: AgentEvent[];
};

// ─── Legacy Pipeline Output ───────────────────────────────────────────────────

export type OcrPipelineResult = {
  service_map: ServiceMap;
  claim_report: ClaimReport;
};
