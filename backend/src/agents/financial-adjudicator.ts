import { loadRules } from '../rag/rule-documents';
import type { AgentSession } from '../utils/agent-session';
import type { ClinicalValidationReport } from '../api/ocr/ocr.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CptBreakdown = {
  cptCode: string;
  billedAmount: number;
  allowableAmount: number;
  scrubSavings: number;
};

export type FinancialAdjudicationReport = {
  // Input figures
  totalBilledAmount: number;
  totalAllowableAmount: number;
  // Step A — Price Scrubbing
  approvedAmount: number;
  scrubSavings: number; // billedAmount - approvedAmount
  // Step B — Cost Sharing
  copay: number;
  coinsuranceRate: number;
  coinsuranceCharge: number; // coinsuranceRate × approvedAmount
  patientResponsibility: number; // copay + coinsuranceCharge
  insurerPays: number; // approvedAmount - patientResponsibility
  // Breakdown by CPT
  cptBreakdown: CptBreakdown[];
  // Notes / warnings
  notes: string[];
};

export type PolicyTerms = {
  copay: number;
  coinsuranceRate: number;
  coverageLimit: number;
};

// ─── Default policy (fallback when no profile found) ─────────────────────────

const DEFAULT_POLICY: PolicyTerms = {
  copay: 20.0,
  coinsuranceRate: 0.20,
  coverageLimit: 100_000,
};

// ─── Agent 4: Financial Adjudicator ──────────────────────────────────────────

export const financialAdjudicator = {
  async run(
    input: {
      billedAmount: number;
      billedCpts: string[];
      matchedCondition: string | null;
      policy: PolicyTerms;
    },
    session: AgentSession,
  ): Promise<FinancialAdjudicationReport> {
    const { billedAmount, billedCpts, matchedCondition, policy } = input;
    const notes: string[] = [];

    session.emit({
      agent: 'agent_4' as 'agent_1', // extend type
      type: 'AGENT_STARTED',
      message: '💰 Financial Adjudicator (The Calculator) activated — running price scrubbing and cost-sharing calculation',
    });

    // ── Step A: Price Scrubbing ───────────────────────────────────────────────

    session.emit({
      agent: 'agent_4' as 'agent_1',
      type: 'AGENT_THINKING',
      message: `Step A — Price Scrubbing: loading allowable amounts for ${billedCpts.length} CPT code(s) from rules database...`,
    });

    // Load allowable amounts from rules.json
    const rules = loadRules();
    const condition = rules.conditions.find((c) => c.name === matchedCondition);
    const allowableMap: Record<string, number> = {};
    let defaultAllowable = 200; // fallback per CPT if not in rules

    if (condition?.allowed_cpt_codes) {
      for (const entry of condition.allowed_cpt_codes) {
        if ('allowable_amount' in entry && typeof (entry as { allowable_amount?: number }).allowable_amount === 'number') {
          allowableMap[entry.code] = (entry as { code: string; allowable_amount: number }).allowable_amount;
        }
      }
      // Use condition financials copay/coinsurance if available
      if ((condition as { financials?: { copay?: number; coinsurance_percent?: number } }).financials) {
        const fin = (condition as { financials: { copay: number; coinsurance_percent: number } }).financials;
        if (fin.copay !== undefined) policy.copay = fin.copay;
        if (fin.coinsurance_percent !== undefined) policy.coinsuranceRate = fin.coinsurance_percent;
      }
    }

    // Build per-CPT breakdown
    const cptBreakdown: CptBreakdown[] = [];
    let totalAllowable = 0;

    if (billedCpts.length === 0) {
      // No CPTs extracted — use billed amount as is
      totalAllowable = billedAmount;
      notes.push('No CPT codes detected in bill — using total billed amount as allowable baseline');
    } else {
      // Distribute billed amount proportionally across CPTs
      const perCptBilled = billedAmount / billedCpts.length;

      for (const cpt of billedCpts) {
        const allowable = allowableMap[cpt] ?? defaultAllowable;
        const scrubSavings = Math.max(0, perCptBilled - allowable);
        cptBreakdown.push({
          cptCode: cpt,
          billedAmount: parseFloat(perCptBilled.toFixed(2)),
          allowableAmount: allowable,
          scrubSavings: parseFloat(scrubSavings.toFixed(2)),
        });
        totalAllowable += allowable;
      }

      if (Object.keys(allowableMap).length === 0) {
        notes.push(`No allowable amounts found in rules for condition "${matchedCondition}" — used fallback of $${defaultAllowable}/CPT`);
      }
    }

    // Approved = min(billed, allowable)
    const approvedAmount = parseFloat(Math.min(billedAmount, totalAllowable).toFixed(2));
    const scrubSavings = parseFloat(Math.max(0, billedAmount - approvedAmount).toFixed(2));

    if (scrubSavings > 0) {
      notes.push(`Price scrubbing applied: billed $${billedAmount.toFixed(2)} exceeded allowable $${totalAllowable.toFixed(2)} — approved amount set to $${approvedAmount.toFixed(2)}`);
    } else {
      notes.push(`Billed amount $${billedAmount.toFixed(2)} is within allowable limits — no scrubbing needed`);
    }

    session.emit({
      agent: 'agent_4' as 'agent_1',
      type: 'AGENT_THINKING',
      message: `Step A complete — Billed: $${billedAmount.toFixed(2)} | Allowable: $${totalAllowable.toFixed(2)} | Approved: $${approvedAmount.toFixed(2)} | Scrub savings: $${scrubSavings.toFixed(2)}`,
    });

    // ── Step B: Cost Sharing ──────────────────────────────────────────────────

    session.emit({
      agent: 'agent_4' as 'agent_1',
      type: 'AGENT_THINKING',
      message: `Step B — Cost Sharing: Copay $${policy.copay.toFixed(2)} + Coinsurance ${(policy.coinsuranceRate * 100).toFixed(0)}% × $${approvedAmount.toFixed(2)}`,
    });

    const coinsuranceCharge = parseFloat((policy.coinsuranceRate * approvedAmount).toFixed(2));
    const patientResponsibility = parseFloat((policy.copay + coinsuranceCharge).toFixed(2));
    const insurerPays = parseFloat(Math.max(0, approvedAmount - patientResponsibility).toFixed(2));

    // Coverage limit check
    if (insurerPays > policy.coverageLimit) {
      notes.push(`⚠️ Insurer pay ($${insurerPays.toFixed(2)}) exceeds annual coverage limit ($${policy.coverageLimit.toFixed(2)}) — capped at coverage limit`);
    }

    const report: FinancialAdjudicationReport = {
      totalBilledAmount: billedAmount,
      totalAllowableAmount: parseFloat(totalAllowable.toFixed(2)),
      approvedAmount,
      scrubSavings,
      copay: policy.copay,
      coinsuranceRate: policy.coinsuranceRate,
      coinsuranceCharge,
      patientResponsibility,
      insurerPays,
      cptBreakdown,
      notes,
    };

    session.emit({
      agent: 'agent_4' as 'agent_1',
      type: 'AGENT_OUTPUT',
      message: `✅ Financial adjudication complete — Insurer pays: $${insurerPays.toFixed(2)} | Patient responsibility: $${patientResponsibility.toFixed(2)}`,
      payload: report,
    });

    return report;
  },
};

// ─── Policy resolver ──────────────────────────────────────────────────────────

export const resolvePolicy = (memberProfile: {
  copay: number;
  coinsuranceRate: number;
  coverageLimit: number;
} | null): PolicyTerms => {
  if (!memberProfile) return { ...DEFAULT_POLICY };
  return {
    copay: memberProfile.copay,
    coinsuranceRate: memberProfile.coinsuranceRate,
    coverageLimit: memberProfile.coverageLimit,
  };
};
