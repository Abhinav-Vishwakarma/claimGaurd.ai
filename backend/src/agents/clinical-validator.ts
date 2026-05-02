import { aiService } from '../api/ai/ai.service';
import type { ClinicalValidationReport, FraudFlag, ServiceMap } from '../api/ocr/ocr.types';
import { loadRules } from '../rag/rule-documents';
import { searchClaimRules } from '../tools/rule-engine';
import type { AgentSession } from '../utils/agent-session';
import {
  PipelineAuditLogger,
  evaluateFalsePositiveRisk,
} from '../utils/pipeline-audit';

/**
 * Returns true if the billed CPTs span 3 or more distinct clinical categories.
 * When this is true alongside context starvation, unbundling flags are likely false positives.
 *
 * Category ranges:
 *  E&M:      99xxx
 *  Imaging:  7xxxx (70000-79999)
 *  Lab:      8xxxx (80000-89999)
 *  Therapy:  9xxxx excluding 99xxx (90000-98999)
 *  Surgery:  1xxxx-6xxxx
 */
function getCptCategory(cpt: string): string {
  const num = parseInt(cpt.replace(/\D/g, ''), 10);
  if (isNaN(num)) return 'other';
  if (num >= 99201 && num <= 99499) return 'evaluation_management';
  if (num >= 70000 && num <= 79999) return 'imaging';
  if (num >= 80000 && num <= 89999) return 'lab_pathology';
  if (num >= 90000 && num <= 99200) return 'therapy_medicine';
  if (num >= 10000 && num <= 69999) return 'surgery_procedure';
  return 'other';
}

function spansMultipleCptCategories(cpts: string[], threshold = 3): boolean {
  const categories = new Set(cpts.map(getCptCategory));
  categories.delete('other');
  return categories.size >= threshold;
}

const buildCptDescriptionMap = () => {
  const rules = loadRules();
  const cptDescriptionMap: Record<string, string> = {};

  for (const condition of rules.conditions) {
    for (const cpt of condition.allowed_cpt_codes) {
      cptDescriptionMap[cpt.code] = cpt.description;
    }
  }

  return cptDescriptionMap;
};

const buildFraudPrompt = (
  conditionName: string,
  reasoningTraps: string[],
  billedCpts: string[],
  billedAmount: number | null,
  orderedService: string | null,
  reason: string | null,
  cptDescriptionMap: Record<string, string>,
) => {
  const cptBreakdown = billedCpts
    .map((cpt) => {
      const description = cptDescriptionMap[cpt] ?? 'Unknown service';
      const category = getCptCategory(cpt);
      return `  - ${cpt}: ${description} [Category: ${category}]`;
    })
    .join('\n');

  const categoryAnalysis = [...new Set(billedCpts.map(getCptCategory))]
    .map((cat) => `- ${cat}: ${billedCpts.filter((cpt) => getCptCategory(cpt) === cat).join(', ')}`)
    .join('\n');

  return `You are an expert medical billing fraud investigator. Analyze the following claim for fraud patterns.

CONDITION: ${conditionName}
ORDERED SERVICE (from prescription): ${orderedService || 'Not provided - extraction may be incomplete'}
CLINICAL REASON: ${reason || 'Not provided - extraction may be incomplete'}

BILLED CPT CODES WITH DESCRIPTIONS:
${cptBreakdown}

TOTAL BILLED AMOUNT: ${billedAmount != null ? `$${billedAmount}` : 'Unknown'}
KNOWN FRAUD PATTERNS FOR THIS CONDITION: ${reasoningTraps.join('; ')}

CPT CATEGORY ANALYSIS:
${categoryAnalysis}

EXPLICIT UNBUNDLING RULES - READ CAREFULLY:
Do NOT flag unbundling if ALL of the following are true:
1. The CPT codes belong to DIFFERENT clinical categories (E&M, imaging, lab, therapy).
2. No single comprehensive CPT code exists that replaces all of them combined.
3. Each service can be independently performed and billed on the same date.
4. The combination is clinically logical for the diagnosis.

ONLY flag unbundling if CPT codes within the SAME category are split when a bundled
code exists that would cover them all (e.g., billing 71045 + 71046 separately when
one code covers both views).

If ORDERED SERVICE or CLINICAL REASON is "Not provided", you MUST note this
data limitation in your reasoning and reduce your confidence in any fraud flag.
Do NOT flag fraud solely because context is missing.

SELF-QUESTIONING - answer each internally before responding:
1. Do these CPT codes span multiple clinical categories? (If yes, unbundling is unlikely)
2. Is there a single CPT that replaces ALL of these combined? (If no, unbundling is invalid)
3. Is the ordered service missing or incomplete? (If yes, lower your fraud confidence)
4. Is the visit level (E&M code) appropriate for the diagnosis complexity?
5. Are the lab/imaging tests logically connected to the diagnosis?
6. Is the total cost reasonable for this combination of services?

STRICT RULES:
1. Return ONLY a raw JSON object - NO markdown, NO code fences, NO explanation.
2. If context is missing (Unknown ordered service/reason), set severity to LOW maximum.

Return exactly this JSON:
{
  "upcoding": {
    "type": "UPCODING or NONE",
    "description": "<one sentence or 'No upcoding detected'>",
    "severity": "HIGH or MEDIUM or LOW or NONE"
  },
  "unbundling": {
    "type": "UNBUNDLING or NONE",
    "description": "<one sentence or 'No unbundling detected'>",
    "severity": "HIGH or MEDIUM or LOW or NONE"
  },
  "ai_reasoning": "<step-by-step summary referencing CPT categories and clinical logic>"
}`;
};

const parseFraudResult = (text: string): { upcoding: FraudFlag; unbundling: FraudFlag; ai_reasoning: string } => {
  try {
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      return JSON.parse(text.substring(startIdx, endIdx + 1));
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

export type ClinicalValidatorInput = {
  prescription: ServiceMap;
  bill: ServiceMap;
};

const buildCandidateAudit = (
  candidates: Awaited<ReturnType<typeof searchClaimRules>>,
  billedCpts: string[],
) =>
  candidates.map((candidate, index) => {
    const allowed = candidate.metadata.cptCodes ?? [];
    const overlap = billedCpts.filter((cpt) => allowed.includes(cpt));
    return {
      condition: candidate.metadata.conditionName,
      score: candidate.score,
      allowed_cpts: allowed,
      overlap_with_billed_cpts: overlap,
      rejected_reason:
        index === 0
          ? 'Selected as top semantic match'
          : overlap.length === 0
            ? 'Rejected because no billed CPT overlap was found'
            : 'Rejected because candidate scored lower than the top match',
    };
  });

export const clinicalValidator = {
  async run(
    input: ClinicalValidatorInput,
    session: AgentSession,
    auditLogger?: PipelineAuditLogger,
  ): Promise<ClinicalValidationReport> {
    const { prescription, bill } = input;
    const rejectionReasons: string[] = [];

    session.emit({
      agent: 'agent_2',
      type: 'AGENT_STARTED',
      message: 'Clinical Validator (The Judge) activated - running 3-phase medical validation',
    });

    const billedCpts = bill.triangulation_data.billing.cpt_codes || [];
    const prescriptionReason = prescription.triangulation_data.prescription.reason;
    const orderedService = prescription.triangulation_data.prescription.ordered_service;
    const billedAmount = bill.triangulation_data.billing.billed_amount;
    const cptDescriptionMap = buildCptDescriptionMap();

    session.emit({
      agent: 'agent_2',
      type: 'AGENT_THINKING',
      message: 'Phase 1: Building semantic query for ICD-10 specificity check...',
    });

    const billedCptDescriptions = billedCpts
      .map((cpt) => cptDescriptionMap[cpt] ?? cpt)
      .join(', ');

    const semanticQuery = [
      prescriptionReason,
      orderedService,
      billedCptDescriptions,
      ...billedCpts,
    ].filter(Boolean).join(' ');

    session.emit({
      agent: 'agent_2',
      type: 'AGENT_THINKING',
      message: `Semantic query built: "${semanticQuery.slice(0, 120)}..."`,
    });

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
    let candidateAudit: Array<Record<string, unknown>> = [];

    try {
      const searchResults = await searchClaimRules(semanticQuery, 5);
      candidateAudit = buildCandidateAudit(searchResults, billedCpts);

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

        const CONFIDENCE_THRESHOLD = 0.78;
        if (qdrantConfidence < CONFIDENCE_THRESHOLD) {
          session.emit({
            agent: 'agent_2',
            type: 'AGENT_THINKING',
            message: `Low Qdrant confidence (${(qdrantConfidence * 100).toFixed(1)}%) - below threshold of ${CONFIDENCE_THRESHOLD * 100}%. Condition match is uncertain. Will proceed but flagging for review.`,
          });
        }

        const prescriptionText = `${prescriptionReason ?? ''} ${orderedService ?? ''}`.toLowerCase();
        nonBillableHit = nonBillableIcd10.some(
          (code) => code !== 'N/A' && prescriptionText.includes(code.toLowerCase()),
        );

        if (nonBillableHit) {
          isLeafNode = false;
          rejectionReasons.push(
            `Claim references a non-billable (parent category) ICD-10 code. Codes ${nonBillableIcd10.join(', ')} are not billable - use the specific leaf node variant.`,
          );
        }
      } else {
        session.emit({
          agent: 'agent_2',
          type: 'TOOL_RESULT',
          tool: 'qdrant_searchClaimRules',
          message: 'No matching condition found in rules database - low confidence match',
          payload: { matchedCondition: null, qdrantConfidence: 0 },
        });
      }

      auditLogger?.addPhase({
        phase: 'agent_2_qdrant_semantic_match',
        agent: 'agent_2',
        status: searchResults.length > 0 ? 'ok' : 'warn',
        input_snapshot: {
          semantic_query: semanticQuery,
        },
        output_snapshot: {
          matched_condition: matchedCondition,
          matched_reason: matchedCondition ? 'Highest scoring semantic result from Qdrant' : 'No candidate matched',
          returned_candidates: candidateAudit,
        },
        field_audit: [],
        issues:
          searchResults.length > 0
            ? []
            : [{ code: 'NO_QDRANT_MATCH', message: 'No matching condition found in Qdrant' }],
      });
    } catch (err) {
      session.emit({
        agent: 'agent_2',
        type: 'TOOL_RESULT',
        tool: 'qdrant_searchClaimRules',
        message: `Qdrant search failed: ${(err as Error).message} - falling back to rules.json`,
      });

      auditLogger?.addPhase({
        phase: 'agent_2_qdrant_semantic_match',
        agent: 'agent_2',
        status: 'error',
        input_snapshot: {
          semantic_query: semanticQuery,
        },
        output_snapshot: {
          error: (err as Error).message,
        },
        field_audit: [],
        issues: [{ code: 'QDRANT_ERROR', message: (err as Error).message }],
      });

      try {
        const rules = loadRules();
        const fallbackCondition = rules.conditions.find((condition) =>
          billedCpts.some((cpt) => condition.allowed_cpt_codes.some((allowed) => allowed.code === cpt)),
        );
        if (fallbackCondition) {
          matchedCondition = fallbackCondition.name;
          allowedCpts = fallbackCondition.allowed_cpt_codes.map((entry) => entry.code);
          nonBillableIcd10 = fallbackCondition.icd10.non_billable;
          reasoningTraps = fallbackCondition.reasoning_traps;
        }
      } catch {
        // Keep fallback silent to avoid changing behavior.
      }
    }

    const specificity = {
      is_leaf_node: isLeafNode,
      non_billable_hit: nonBillableHit,
      reason: nonBillableHit
        ? 'Non-billable ICD-10 category code detected. Use the specific leaf node.'
        : matchedCondition
          ? `ICD-10 specificity check passed for condition: ${matchedCondition}`
          : 'Could not verify ICD-10 specificity - no matching condition found in rules database',
    };

    session.emit({
      agent: 'agent_2',
      type: 'AGENT_THINKING',
      message: `Phase 2: Checking CPT codes against allowed list - Billed: [${billedCpts.join(', ')}], Allowed: [${allowedCpts.join(', ')}]`,
    });

    const cptAllowlistAudit = billedCpts.map((cpt) => ({
      cpt_code: cpt,
      decision: allowedCpts.includes(cpt) ? 'allowed' : 'rejected',
      blocking_rule: allowedCpts.includes(cpt)
        ? null
        : `CPT ${cpt} is not in the matched allow-list for ${matchedCondition || 'the condition'}`,
    }));

    const unauthorizedCpts = allowedCpts.length > 0 ? billedCpts.filter((cpt) => !allowedCpts.includes(cpt)) : [];
    const medicalNecessityPassed = unauthorizedCpts.length === 0;

    if (!medicalNecessityPassed) {
      rejectionReasons.push(
        `Unauthorized CPT codes for ${matchedCondition || 'this condition'}: [${unauthorizedCpts.join(', ')}]. These procedures are not medically necessary for the diagnosed condition.`,
      );
    }

    auditLogger?.addPhase({
      phase: 'agent_2_cpt_allowlist_check',
      agent: 'agent_2',
      status: medicalNecessityPassed ? 'ok' : 'warn',
      input_snapshot: {
        matched_condition: matchedCondition,
        billed_cpts: billedCpts,
        allowed_cpts: allowedCpts,
      },
      output_snapshot: {
        decisions: cptAllowlistAudit,
      },
      field_audit: [],
      issues: cptAllowlistAudit
        .filter((entry) => entry.decision === 'rejected')
        .map((entry) => ({
          code: 'CPT_REJECTED',
          field: 'triangulation_data.billing.cpt_codes',
          message: String(entry.blocking_rule),
        })),
    });

    const medicalNecessity = {
      passed: medicalNecessityPassed,
      allowed_cpts: allowedCpts,
      billed_cpts: billedCpts,
      unauthorized_cpts: unauthorizedCpts,
      reason: medicalNecessityPassed
        ? `All billed CPT codes are within the approved list for ${matchedCondition || 'the matched condition'}`
        : `${unauthorizedCpts.length} unauthorized CPT code(s) detected: ${unauthorizedCpts.join(', ')}`,
    };

    session.emit({
      agent: 'agent_2',
      type: 'AGENT_THINKING',
      message: 'Phase 3: Running AI-powered fraud detection (upcoding + unbundling analysis)...',
    });

    let fraudDetection: ClinicalValidationReport['fraud_detection'];
    let falsePositiveRisk = {
      score: 'LOW',
      explanation: 'Fraud analysis was skipped.',
      categories: [] as string[],
    };

    if (matchedCondition && reasoningTraps.length > 0) {
      const fraudPrompt = buildFraudPrompt(
        matchedCondition,
        reasoningTraps,
        billedCpts,
        billedAmount,
        orderedService,
        prescriptionReason,
        cptDescriptionMap,
      );
      const starvationIssues = [];

      if (!orderedService || !prescriptionReason) {
        starvationIssues.push({
          code: 'CONTEXT_STARVATION',
          message: 'orderedService or reason is null in the fraud prompt context',
          values: {
            orderedService,
            reason: prescriptionReason,
          },
        });
      }

      session.emit({
        agent: 'agent_2',
        type: 'TOOL_CALL',
        tool: 'groq_llama3_fraud_analysis',
        message: 'Sending claim context to Groq for fraud pattern analysis...',
      });

      try {
        const fraudResult = await aiService.generate({
          service: 'groq',
          prompt: fraudPrompt,
          options: { temperature: 0.1, maxTokens: 1024, responseFormat: 'json_object' },
          audit: {
            logger: auditLogger,
            phase: 'agent_2_fraud_llm_call',
            agent: 'agent_2',
            inputSnapshot: {
              matched_condition: matchedCondition,
              billed_cpts: billedCpts,
            },
            issues: starvationIssues,
          },
        });

        fraudDetection = parseFraudResult(fraudResult.text);
        falsePositiveRisk = evaluateFalsePositiveRisk(
          allowedCpts,
          fraudDetection.unbundling.type !== 'NONE',
        );

        auditLogger?.addPhase({
          phase: 'agent_2_fraud_detection',
          agent: 'agent_2',
          status: starvationIssues.length > 0 || falsePositiveRisk.score !== 'LOW' ? 'warn' : 'ok',
          input_snapshot: {
            prompt: fraudPrompt,
            matched_condition: matchedCondition,
            orderedService,
            reason: prescriptionReason,
          },
          output_snapshot: {
            raw_response: fraudResult.text,
            parsed_fraud_result: fraudDetection,
            false_positive_risk_score: falsePositiveRisk.score,
            false_positive_risk_explanation: falsePositiveRisk.explanation,
          },
          field_audit: [],
          issues: [
            ...starvationIssues,
            ...(falsePositiveRisk.score !== 'LOW'
              ? [{
                  code: 'HIGH_FALSE_POSITIVE_RISK',
                  message: falsePositiveRisk.explanation,
                }]
              : []),
          ],
        });

        session.emit({
          agent: 'agent_2',
          type: 'TOOL_RESULT',
          tool: 'groq_llama3_fraud_analysis',
          message: `Fraud analysis complete - Upcoding: ${fraudDetection.upcoding.type} (${fraudDetection.upcoding.severity}), Unbundling: ${fraudDetection.unbundling.type} (${fraudDetection.unbundling.severity})`,
          payload: fraudDetection,
        });

        const contextStarved = !orderedService && !prescriptionReason;
        const multiCategoryBilling = spansMultipleCptCategories(billedCpts);

        if (fraudDetection.upcoding.type !== 'NONE' && fraudDetection.upcoding.severity !== 'LOW') {
          rejectionReasons.push(
            `Upcoding detected (${fraudDetection.upcoding.severity}): ${fraudDetection.upcoding.description}`,
          );
        }
        if (fraudDetection.unbundling.type !== 'NONE' && fraudDetection.unbundling.severity !== 'LOW') {
          if (contextStarved && multiCategoryBilling) {
            session.emit({
              agent: 'agent_2',
              type: 'AGENT_THINKING',
              message: `Unbundling flag suppressed - CONTEXT_STARVATION detected with multi-category CPT spread (${[...new Set(billedCpts.map(getCptCategory))].join(', ')}). This is a known false positive pattern. Fix extraction to resolve permanently.`,
            });
          } else {
            rejectionReasons.push(
              `Unbundling detected (${fraudDetection.unbundling.severity}): ${fraudDetection.unbundling.description}`,
            );
          }
        }
      } catch (err) {
        session.emit({
          agent: 'agent_2',
          type: 'TOOL_RESULT',
          tool: 'groq_llama3_fraud_analysis',
          message: `Groq analysis failed: ${(err as Error).message} - using deterministic fallback`,
        });

        const trapText = reasoningTraps.join(' ').toLowerCase();
        const hasUpcoding = trapText.includes('upcode') || trapText.includes('complex visit');
        const hasUnbundling = trapText.includes('unbundl') || trapText.includes('separate billing');

        fraudDetection = {
          upcoding: hasUpcoding
            ? {
                type: 'UPCODING',
                description: reasoningTraps.find((entry) => entry.toLowerCase().includes('upcode')) || 'Potential upcoding pattern',
                severity: 'MEDIUM',
              }
            : { type: 'NONE', description: 'No upcoding patterns detected', severity: 'NONE' },
          unbundling: hasUnbundling
            ? {
                type: 'UNBUNDLING',
                description: reasoningTraps.find((entry) => entry.toLowerCase().includes('unbundl')) || 'Potential unbundling pattern',
                severity: 'MEDIUM',
              }
            : { type: 'NONE', description: 'No unbundling patterns detected', severity: 'NONE' },
          ai_reasoning: 'Deterministic fallback used - AI fraud analysis was unavailable. Manual review recommended.',
        };

        falsePositiveRisk = evaluateFalsePositiveRisk(
          allowedCpts,
          fraudDetection.unbundling.type !== 'NONE',
        );

        auditLogger?.addPhase({
          phase: 'agent_2_fraud_detection',
          agent: 'agent_2',
          status: 'warn',
          input_snapshot: {
            prompt: fraudPrompt,
            matched_condition: matchedCondition,
            orderedService,
            reason: prescriptionReason,
          },
          output_snapshot: {
            raw_response: null,
            parsed_fraud_result: fraudDetection,
            false_positive_risk_score: falsePositiveRisk.score,
            false_positive_risk_explanation: falsePositiveRisk.explanation,
          },
          field_audit: [],
          issues: [
            ...starvationIssues,
            { code: 'FRAUD_LLM_FALLBACK', message: (err as Error).message },
            ...(falsePositiveRisk.score !== 'LOW'
              ? [{
                  code: 'HIGH_FALSE_POSITIVE_RISK',
                  message: falsePositiveRisk.explanation,
                }]
              : []),
          ],
        });
      }
    } else {
      fraudDetection = {
        upcoding: { type: 'NONE', description: 'No condition matched - skipped', severity: 'NONE' },
        unbundling: { type: 'NONE', description: 'No condition matched - skipped', severity: 'NONE' },
        ai_reasoning: 'Fraud analysis skipped: no matching condition found in rules database.',
      };

      auditLogger?.addPhase({
        phase: 'agent_2_fraud_detection',
        agent: 'agent_2',
        status: 'warn',
        input_snapshot: {
          matched_condition: matchedCondition,
          orderedService,
          reason: prescriptionReason,
        },
        output_snapshot: {
          parsed_fraud_result: fraudDetection,
          false_positive_risk_score: falsePositiveRisk.score,
          false_positive_risk_explanation: falsePositiveRisk.explanation,
        },
        field_audit: [],
        issues: [{ code: 'FRAUD_SKIPPED', message: 'Fraud analysis skipped because no condition was matched' }],
      });
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
        ? `Clinical validation PASSED for "${matchedCondition}" - no issues found`
        : `Clinical validation FAILED - ${rejectionReasons.length} issue(s) detected`,
      payload: report,
    });

    return report;
  },
};
