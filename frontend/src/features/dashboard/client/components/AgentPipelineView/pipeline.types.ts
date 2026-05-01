// Mirrors backend src/api/ocr/ocr.types.ts — keep in sync

export type AgentId = 'agent_1' | 'agent_2' | 'agent_3' | 'system';

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

export interface AgentEvent {
  seq: number;
  t: number; // ms since pipeline start
  agent: AgentId;
  type: AgentEventType;
  message?: string;
  tool?: string;
  payload?: unknown;
}

export type AgentState = 'idle' | 'active' | 'thinking' | 'tool_calling' | 'done' | 'error';

export type PipelineVerdict = 'CLAIMABLE' | 'NOT_CLAIMABLE' | 'NEEDS_REVIEW';

export interface FraudFlag {
  type: string;
  description: string;
  severity: string;
}

export interface ClinicalValidationReport {
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
}

export interface GatekeeperCheck {
  passed: boolean;
  details?: string;
  reason?: string;
}

export interface GatekeeperReport {
  is_clean_claim: boolean;
  checks: {
    administrative: GatekeeperCheck;
    policy_active: GatekeeperCheck;
    triangulation: GatekeeperCheck & {
      cpt_mismatches: string[];
      missing_lab_report: boolean;
    };
  };
  rejection_reasons: string[];
  can_proceed_to_medical_review: boolean;
}

export interface FinalPipelineResult {
  sessionId: string;
  verdict: PipelineVerdict;
  isClaimable: boolean;
  verdictSummary: string;
  verdictReasons: string[];
  serviceMap: unknown | null;
  validationReport: ClinicalValidationReport | null;
  gatekeeperReport: GatekeeperReport | null;
  eventLog: AgentEvent[];
}

export type PipelineStatus = 'idle' | 'running' | 'complete' | 'error';

export const AGENT_META: Record<Exclude<AgentId, 'system'>, { name: string; icon: string; description: string; color: string }> = {
  agent_1: {
    name: 'Clinical Extractor',
    icon: '🔬',
    description: 'Reads PDFs → extracts structured medical data',
    color: '#6366f1',
  },
  agent_2: {
    name: 'The Judge',
    icon: '⚖️',
    description: 'ICD-10 specificity · CPT necessity · Fraud detection',
    color: '#f59e0b',
  },
  agent_3: {
    name: 'Integrity Gatekeeper',
    icon: '🛡️',
    description: 'Admin checks · Policy verification · Triangulation',
    color: '#10b981',
  },
};

export const TOOL_META: Record<string, { label: string; icon: string }> = {
  gemini_vision: { label: 'Gemini Vision OCR', icon: '✨' },
  local_pdf_parser: { label: 'Local PDF Parser', icon: '📄' },
  local_docx_parser: { label: 'Local DOCX Parser', icon: '📝' },
  groq_text_parser: { label: 'Groq Text LLM', icon: '⚡' },
  qdrant_searchClaimRules: { label: 'Qdrant Vector DB', icon: '🔍' },
  groq_llama3_fraud_analysis: { label: 'Groq LLaMA-3', icon: '🧠' },
};
