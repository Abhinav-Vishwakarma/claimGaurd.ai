import { aiService } from '../api/ai/ai.service';
import { searchClaimRules } from '../tools/rule-engine';
import { loadRules } from '../rag/rule-documents';
import type { ServiceMap, ClinicalValidationReport, FraudFlag } from '../api/ocr/ocr.types';
import type { AgentSession } from '../utils/agent-session';

// ─── Fraud Detection Prompt ───────────────────────────────────────────────────

const buildFraudPrompt = (
  conditionName: string,
  reasoningTraps: string[],
  billedCpts: string[],
  billedAmount: number | null,
  orderedService: string | null,
  reason: string | null,
) => `You are an expert medical billing fraud investigator. Analyze the following claim for fraud patterns.

CONDITION: ${conditionName}
ORDERED SERVICE (from prescription): ${orderedService || 'Unknown'}
CLINICAL REASON: ${reason || 'Unknown'}
BILLED CPT CODES: ${billedCpts.join(', ')}
TOTAL BILLED AMOUNT: ${billedAmount != null ? `$${billedAmount}` : 'Unknown'}
KNOWN FRAUD PATTERNS FOR THIS CONDITION: ${reasoningTraps.join('; ')}

STRICT RULES:
1. Return ONLY a raw JSON object — NO markdown, NO code fences, NO explanation.
2. Analyze specifically for UPCODING and UNBUNDLING.

Return exactly this JSON:
{
  "upcoding": {
    "type": "UPCODING or NONE",
    "description": "<one sentence explanation or 'No upcoding detected'>",
    "severity": "HIGH or MEDIUM or LOW or NONE"
  },
  "unbundling": {
    "type": "UNBUNDLING or NONE",
    "description": "<one sentence explanation or 'No unbundling detected'>",
    "severity": "HIGH or MEDIUM or LOW or NONE"
  },
  "ai_reasoning": "<2-3 sentence overall fraud assessment>"
}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseFraudResult = (text: string): { upcoding: FraudFlag; unbundling: FraudFlag; ai_reasoning: string } => {
  try {
    // Find the first { and last } to extract just the JSON object
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonStr = text.substring(startIdx, endIdx + 1);
      return JSON.parse(jsonStr);
    }
    
    return JSON.parse(text);
  } catch (err) {
    console.error('Failed to parse fraud result:', err, 'Raw text:', text);
    return {
      upcoding: { type: 'NONE', description: 'Fraud analysis unavailable', severity: 'NONE' },
      unbundling: { type: 'NONE', description: 'Fraud analysis unavailable', severity: 'NONE' },
      ai_reasoning: 'Could not complete automated fraud analysis. Manual review recommended.',
    };
  }
};

// ─── Agent 2: Clinical Validator ──────────────────────────────────────────────

export type ClinicalValidatorInput = {
  prescription: ServiceMap;
  bill: ServiceMap;
};

export const clinicalValidator = {
  async run(input: ClinicalValidatorInput, session: AgentSession): Promise<ClinicalValidationReport> {
    const { prescription, bill } = input;
    const rejectionReasons: string[] = [];

    session.emit({
      agent: 'agent_2',
      type: 'AGENT_STARTED',
      message: 'Clinical Validator (The Judge) activated — running 3-phase medical validation',
    });

    const billedCpts = bill.triangulation_data.billing.cpt_codes || [];
    const prescriptionReason = prescription.triangulation_data.prescription.reason;
    const orderedService = prescription.triangulation_data.prescription.ordered_service;
    const billedAmount = bill.triangulation_data.billing.billed_amount;

    // ── Phase 1: ICD-10 Specificity via Qdrant Semantic Search ─────────────────
    session.emit({
      agent: 'agent_2',
      type: 'AGENT_THINKING',
      message: 'Phase 1: Building semantic query for ICD-10 specificity check...',
    });

    const semanticQuery = [prescriptionReason, orderedService, ...billedCpts]
      .filter(Boolean)
      .join(' ');

    session.emit({
      agent: 'agent_2',
      type: 'TOOL_CALL',
      tool: 'qdrant_searchClaimRules',
      message: `Querying Qdrant vector store: "${semanticQuery.slice(0, 80)}..."`,
    });

    let matchedCondition: string | null = null;
    let qdrantConfidence = 0;
    let allowedCpts: string[] = [];
    let nonBillableIcd10: string[] = [];
    let reasoningTraps: string[] = [];
    let isLeafNode = true;
    let nonBillableHit = false;

    try {
      const searchResults = await searchClaimRules(semanticQuery, 1);

      if (searchResults.length > 0) {
        const top = searchResults[0];
        qdrantConfidence = top.score;
        matchedCondition = top.metadata.conditionName;
        allowedCpts = top.metadata.cptCodes;
        nonBillableIcd10 = top.metadata.nonBillableIcd10;
        reasoningTraps = top.metadata.reasoningTraps;

        session.emit({
          agent: 'agent_2',
          type: 'TOOL_RESULT',
          tool: 'qdrant_searchClaimRules',
          message: `Matched: "${matchedCondition}" (confidence: ${(qdrantConfidence * 100).toFixed(1)}%)`,
          payload: { matchedCondition, qdrantConfidence, allowedCpts, nonBillableIcd10 },
        });

        // Check non-billable ICD-10
        session.emit({
          agent: 'agent_2',
          type: 'AGENT_THINKING',
          message: `Checking ICD-10 specificity — non-billable codes for this condition: [${nonBillableIcd10.join(', ')}]`,
        });

        const prescriptionText = `${prescriptionReason} ${orderedService}`.toLowerCase();
        nonBillableHit = nonBillableIcd10.some(
          (code) => code !== 'N/A' && prescriptionText.includes(code.toLowerCase()),
        );

        if (nonBillableHit) {
          isLeafNode = false;
          const reason = `Claim references a non-billable (parent category) ICD-10 code. Codes ${nonBillableIcd10.join(', ')} are not billable — use the specific leaf node variant.`;
          rejectionReasons.push(reason);
        }
      } else {
        session.emit({
          agent: 'agent_2',
          type: 'TOOL_RESULT',
          tool: 'qdrant_searchClaimRules',
          message: 'No matching condition found in rules database — low confidence match',
          payload: { matchedCondition: null, qdrantConfidence: 0 },
        });
      }
    } catch (err) {
      session.emit({
        agent: 'agent_2',
        type: 'TOOL_RESULT',
        tool: 'qdrant_searchClaimRules',
        message: `Qdrant search failed: ${(err as Error).message} — falling back to rules.json`,
      });

      // Fallback: load rules.json directly and find best match by keyword
      try {
        const rules = loadRules();
        const fallbackCondition = rules.conditions.find((c) =>
          billedCpts.some((cpt) => c.allowed_cpt_codes.some((a) => a.code === cpt)),
        );
        if (fallbackCondition) {
          matchedCondition = fallbackCondition.name;
          allowedCpts = fallbackCondition.allowed_cpt_codes.map((c) => c.code);
          nonBillableIcd10 = fallbackCondition.icd10.non_billable;
          reasoningTraps = fallbackCondition.reasoning_traps;
        }
      } catch {
        // ignore fallback failure
      }
    }

    const specificity = {
      is_leaf_node: isLeafNode,
      non_billable_hit: nonBillableHit,
      reason: nonBillableHit
        ? `Non-billable ICD-10 category code detected. Use the specific leaf node.`
        : matchedCondition
          ? `ICD-10 specificity check passed for condition: ${matchedCondition}`
          : 'Could not verify ICD-10 specificity — no matching condition found in rules database',
    };

    // ── Phase 2: Medical Necessity — CPT Allow-List Check ──────────────────────

    session.emit({
      agent: 'agent_2',
      type: 'AGENT_THINKING',
      message: `Phase 2: Checking CPT codes against allowed list — Billed: [${billedCpts.join(', ')}], Allowed: [${allowedCpts.join(', ')}]`,
    });

    const unauthorizedCpts = allowedCpts.length > 0
      ? billedCpts.filter((cpt) => !allowedCpts.includes(cpt))
      : [];

    const medicalNecessityPassed = unauthorizedCpts.length === 0;

    if (!medicalNecessityPassed) {
      const reason = `Unauthorized CPT codes for ${matchedCondition || 'this condition'}: [${unauthorizedCpts.join(', ')}]. These procedures are not medically necessary for the diagnosed condition.`;
      rejectionReasons.push(reason);
    }

    const medicalNecessity = {
      passed: medicalNecessityPassed,
      allowed_cpts: allowedCpts,
      billed_cpts: billedCpts,
      unauthorized_cpts: unauthorizedCpts,
      reason: medicalNecessityPassed
        ? `All billed CPT codes are within the approved list for ${matchedCondition || 'the matched condition'}`
        : `${unauthorizedCpts.length} unauthorized CPT code(s) detected: ${unauthorizedCpts.join(', ')}`,
    };

    // ── Phase 3: Fraud Detection via Groq ──────────────────────────────────────

    session.emit({
      agent: 'agent_2',
      type: 'AGENT_THINKING',
      message: 'Phase 3: Running AI-powered fraud detection (upcoding + unbundling analysis)...',
    });

    let fraudDetection: ClinicalValidationReport['fraud_detection'];

    if (matchedCondition && reasoningTraps.length > 0) {
      const fraudPrompt = buildFraudPrompt(
        matchedCondition,
        reasoningTraps,
        billedCpts,
        billedAmount,
        orderedService,
        prescriptionReason,
      );

      session.emit({
        agent: 'agent_2',
        type: 'TOOL_CALL',
        tool: 'groq_llama3_fraud_analysis',
        message: 'Sending claim context to Groq (llama-3.3-70b) for fraud pattern analysis...',
      });

      try {
        const fraudResult = await aiService.generate({
          service: 'groq',
          prompt: fraudPrompt,
          options: { temperature: 0.1, maxTokens: 1024, responseFormat: 'json_object' },
        });

        fraudDetection = parseFraudResult(fraudResult.text);

        session.emit({
          agent: 'agent_2',
          type: 'TOOL_RESULT',
          tool: 'groq_llama3_fraud_analysis',
          message: `Fraud analysis complete — Upcoding: ${fraudDetection.upcoding.type} (${fraudDetection.upcoding.severity}), Unbundling: ${fraudDetection.unbundling.type} (${fraudDetection.unbundling.severity})`,
          payload: fraudDetection,
        });

        if (fraudDetection.upcoding.type !== 'NONE' && fraudDetection.upcoding.severity !== 'LOW') {
          rejectionReasons.push(`Upcoding detected (${fraudDetection.upcoding.severity}): ${fraudDetection.upcoding.description}`);
        }
        if (fraudDetection.unbundling.type !== 'NONE' && fraudDetection.unbundling.severity !== 'LOW') {
          rejectionReasons.push(`Unbundling detected (${fraudDetection.unbundling.severity}): ${fraudDetection.unbundling.description}`);
        }
      } catch (err) {
        session.emit({
          agent: 'agent_2',
          type: 'TOOL_RESULT',
          tool: 'groq_llama3_fraud_analysis',
          message: `Groq analysis failed: ${(err as Error).message} — using deterministic fallback`,
        });

        // Deterministic fallback: keyword match against reasoning_traps
        const trapText = reasoningTraps.join(' ').toLowerCase();
        const hasUpcoding = trapText.includes('upcode') || trapText.includes('complex visit');
        const hasUnbundling = trapText.includes('unbundl') || trapText.includes('separate billing');

        fraudDetection = {
          upcoding: hasUpcoding
            ? { type: 'UPCODING', description: reasoningTraps.find(t => t.toLowerCase().includes('upcode')) || 'Potential upcoding pattern', severity: 'MEDIUM' }
            : { type: 'NONE', description: 'No upcoding patterns detected', severity: 'NONE' },
          unbundling: hasUnbundling
            ? { type: 'UNBUNDLING', description: reasoningTraps.find(t => t.toLowerCase().includes('unbundl')) || 'Potential unbundling pattern', severity: 'MEDIUM' }
            : { type: 'NONE', description: 'No unbundling patterns detected', severity: 'NONE' },
          ai_reasoning: 'Deterministic fallback used — AI fraud analysis was unavailable. Manual review recommended.',
        };
      }
    } else {
      fraudDetection = {
        upcoding: { type: 'NONE', description: 'No condition matched — skipped', severity: 'NONE' },
        unbundling: { type: 'NONE', description: 'No condition matched — skipped', severity: 'NONE' },
        ai_reasoning: 'Fraud analysis skipped: no matching condition found in rules database.',
      };
    }

    const passed = rejectionReasons.length === 0;

    const report: ClinicalValidationReport = {
      passed,
      matched_condition: matchedCondition,
      qdrant_confidence: qdrantConfidence,
      icd10_specificity: specificity,
      medical_necessity: medicalNecessity,
      fraud_detection: fraudDetection,
      rejection_reasons: rejectionReasons,
    };

    session.emit({
      agent: 'agent_2',
      type: 'AGENT_OUTPUT',
      message: passed
        ? `✅ Clinical validation PASSED for "${matchedCondition}" — no issues found`
        : `❌ Clinical validation FAILED — ${rejectionReasons.length} issue(s) detected`,
      payload: report,
    });

    return report;
  },
};
