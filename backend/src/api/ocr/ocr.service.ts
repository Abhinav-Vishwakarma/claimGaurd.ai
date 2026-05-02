import { clinicalExtractor } from '../../agents/clinical-extractor';
import { clinicalValidator } from '../../agents/clinical-validator';
import { financialAdjudicator, resolvePolicy } from '../../agents/financial-adjudicator';
import { integrityGatekeeper } from '../../agents/integrity-gatekeeper';
import prisma from '../../config/prisma';
import { AgentSession } from '../../utils/agent-session';
import {
  PipelineAuditLogger,
  buildCriticalNullIssues,
  buildServiceMapFieldAudit,
  reconcileServiceMaps,
} from '../../utils/pipeline-audit';
import type { FinancialAdjudicationReport } from '../../agents/financial-adjudicator';
import type {
  ClinicalValidationReport,
  FinalPipelineResult,
  PipelineVerdict,
  ServiceMap,
} from './ocr.types';

export { AgentSession };

const logCachedServiceMapAudit = (
  auditLogger: PipelineAuditLogger,
  docType: 'prescription' | 'bill' | 'lab_report',
  filename: string,
  serviceMap: ServiceMap,
) => {
  const { fieldAudit, dataCompletenessScore } = buildServiceMapFieldAudit(serviceMap);
  auditLogger.addPhase({
    phase: `agent_1_extraction_${docType}`,
    agent: 'agent_1',
    status: 'warn',
    input_snapshot: {
      filename,
      doc_type: docType,
      source: 'cached_extracted_data',
    },
    output_snapshot: {
      parsed_service_map: serviceMap,
      data_completeness_score: dataCompletenessScore,
    },
    field_audit: fieldAudit,
    issues: [
      { code: 'CACHED_EXTRACTION', message: 'Using cached extraction; raw prompt/response unavailable for this run' },
      ...buildCriticalNullIssues(serviceMap),
    ],
  });
};

export const ocrService = {
  extract: async (input: {
    vaultItemId: string;
    fileUrl: string;
    filename: string;
    docType: 'prescription' | 'bill' | 'lab_report';
    userId: string;
  }) => {
    const vaultItem = await prisma.medicalVaultItem.findFirst({
      where: { id: input.vaultItemId, userId: input.userId },
    });

    if (!vaultItem) {
      const err = new Error('Vault item not found or access denied');
      Object.assign(err, { status: 404 });
      throw err;
    }

    const serviceMap = await clinicalExtractor.extract({
      fileUrl: input.fileUrl,
      filename: input.filename,
      docType: input.docType,
    });

    const updated = await prisma.medicalVaultItem.update({
      where: { id: input.vaultItemId },
      data: {
        extractedData: serviceMap as object,
        extractedAt: new Date(),
      },
    });

    return { vaultItem: updated, serviceMap };
  },

  runFullPipeline: async (
    input: {
      prescriptionVaultId: string;
      billVaultId: string;
      labReportVaultId: string;
      userId: string;
      claimId?: string;
      memberProfileId?: string;
    },
    session: AgentSession,
  ): Promise<FinalPipelineResult> => {
    session.start('ClaimGuard 4-agent pipeline starting - The Extractor -> The Judge -> Gatekeeper -> The Calculator');

    const ids = [input.prescriptionVaultId, input.billVaultId, input.labReportVaultId];
    const vaultItems = await prisma.medicalVaultItem.findMany({
      where: { id: { in: ids }, userId: input.userId },
    });

    if (vaultItems.length !== 3) {
      const err = new Error('One or more vault items not found or access denied');
      Object.assign(err, { status: 404 });
      throw err;
    }

    const prescriptionItem = vaultItems.find((item) => item.id === input.prescriptionVaultId)!;
    const billItem = vaultItems.find((item) => item.id === input.billVaultId)!;
    const labReportItem = vaultItems.find((item) => item.id === input.labReportVaultId)!;
    const auditLogger = await PipelineAuditLogger.create([
      { vault_item_id: prescriptionItem.id, filename: prescriptionItem.fileName, doc_type: 'prescription' },
      { vault_item_id: billItem.id, filename: billItem.fileName, doc_type: 'bill' },
      { vault_item_id: labReportItem.id, filename: labReportItem.fileName, doc_type: 'lab_report' },
    ]);

    const claimSession = await prisma.claimSession.create({
      data: {
        userId: input.userId,
        prescriptionVaultId: input.prescriptionVaultId,
        billVaultId: input.billVaultId,
        labReportVaultId: input.labReportVaultId,
      },
    });

    let serviceMap: ServiceMap | null = null;
    let validationReport: ClinicalValidationReport | null = null;
    let gatekeeperReport: unknown = null;
    let adjudicationResult: FinancialAdjudicationReport | null = null;
    const allRejectionReasons: string[] = [];

    try {
      session.emit({
        agent: 'agent_1',
        type: 'AGENT_STARTED',
        message: 'Clinical Extractor activated - detecting file types and routing each document',
      });

      let prescriptionMap: ServiceMap;
      if (prescriptionItem.extractedData) {
        session.emit({
          agent: 'agent_1',
          type: 'AGENT_THINKING',
          message: `Using cached extraction for "${prescriptionItem.fileName}" (already processed)`,
        });
        prescriptionMap = prescriptionItem.extractedData as unknown as ServiceMap;
        logCachedServiceMapAudit(auditLogger, 'prescription', prescriptionItem.fileName, prescriptionMap);
      } else {
        session.emit({
          agent: 'agent_1',
          type: 'AGENT_THINKING',
          message: `Detecting file type for "${prescriptionItem.fileName}"...`,
        });
        prescriptionMap = await clinicalExtractor.extract({
          fileUrl: prescriptionItem.url,
          filename: prescriptionItem.fileName,
          docType: 'prescription',
          session,
          auditLogger,
        });
        await prisma.medicalVaultItem.update({
          where: { id: prescriptionItem.id },
          data: { extractedData: prescriptionMap as object, extractedAt: new Date() },
        });
      }

      let billMap: ServiceMap;
      if (billItem.extractedData) {
        session.emit({
          agent: 'agent_1',
          type: 'AGENT_THINKING',
          message: `Using cached extraction for "${billItem.fileName}" (already processed)`,
        });
        billMap = billItem.extractedData as unknown as ServiceMap;
        logCachedServiceMapAudit(auditLogger, 'bill', billItem.fileName, billMap);
      } else {
        session.emit({
          agent: 'agent_1',
          type: 'AGENT_THINKING',
          message: `Detecting file type for "${billItem.fileName}"...`,
        });
        billMap = await clinicalExtractor.extract({
          fileUrl: billItem.url,
          filename: billItem.fileName,
          docType: 'bill',
          session,
          auditLogger,
        });
        await prisma.medicalVaultItem.update({
          where: { id: billItem.id },
          data: { extractedData: billMap as object, extractedAt: new Date() },
        });
      }

      let labReportMap: ServiceMap;
      if (labReportItem.extractedData) {
        session.emit({
          agent: 'agent_1',
          type: 'AGENT_THINKING',
          message: `Using cached extraction for "${labReportItem.fileName}" (already processed)`,
        });
        labReportMap = labReportItem.extractedData as unknown as ServiceMap;
        logCachedServiceMapAudit(auditLogger, 'lab_report', labReportItem.fileName, labReportMap);
      } else {
        session.emit({
          agent: 'agent_1',
          type: 'AGENT_THINKING',
          message: `Detecting file type for "${labReportItem.fileName}"...`,
        });
        labReportMap = await clinicalExtractor.extract({
          fileUrl: labReportItem.url,
          filename: labReportItem.fileName,
          docType: 'lab_report',
          session,
          auditLogger,
        });
        await prisma.medicalVaultItem.update({
          where: { id: labReportItem.id },
          data: { extractedData: labReportMap as object, extractedAt: new Date() },
        });
      }

      serviceMap = prescriptionMap;

      session.emit({
        agent: 'agent_1',
        type: 'AGENT_OUTPUT',
        message: 'All documents extracted - patient data structured',
        payload: {
          prescription: prescriptionMap,
          bill: billMap,
          labReport: labReportMap,
        },
      });

      session.emit({
        agent: 'agent_1',
        type: 'AGENT_HANDOFF',
        message: 'Handing ServiceMap to Agent 2: The Clinical Validator',
        payload: { to: 'agent_2' },
      });

      validationReport = await clinicalValidator.run(
        { prescription: prescriptionMap, bill: billMap },
        session,
        auditLogger,
      );

      if (!validationReport.passed) {
        allRejectionReasons.push(...validationReport.rejection_reasons);
      }

      session.emit({
        agent: 'agent_2',
        type: 'AGENT_HANDOFF',
        message: 'Handing enriched data to Agent 3: Integrity Gatekeeper',
        payload: { to: 'agent_3' },
      });

      session.emit({
        agent: 'agent_3',
        type: 'AGENT_STARTED',
        message: 'Integrity Gatekeeper activated - running admin, policy, and triangulation checks',
      });

      session.emit({
        agent: 'agent_3',
        type: 'AGENT_THINKING',
        message: 'Verifying patient ID consistency, provider NPI, date chronology, and policy status...',
      });

      gatekeeperReport = await integrityGatekeeper.run(
        {
          prescription: prescriptionMap,
          bill: billMap,
          labReport: labReportMap,
        },
        auditLogger,
        session,
      );

      const gk = gatekeeperReport as { is_clean_claim: boolean; rejection_reasons: string[] };
      if (!gk.is_clean_claim) {
        allRejectionReasons.push(...gk.rejection_reasons);
      }

      session.emit({
        agent: 'agent_3',
        type: 'AGENT_OUTPUT',
        message: gk.is_clean_claim
          ? 'Integrity check PASSED - clean claim confirmed'
          : `Integrity check FAILED - ${gk.rejection_reasons.length} issue(s) found`,
        payload: gatekeeperReport,
      });

      const isClaimable = allRejectionReasons.length === 0;

      if (isClaimable) {
        session.emit({
          agent: 'agent_3',
          type: 'AGENT_HANDOFF',
          message: 'Claim is valid - handing off to Agent 4: The Financial Adjudicator',
          payload: { to: 'agent_4' },
        });

        const memberProfile = await prisma.memberProfile.findUnique({
          where: { userId: input.userId },
        });
        const policy = resolvePolicy(memberProfile);

        const billedAmount = (billMap.triangulation_data.billing.billed_amount as number | null) ?? 0;
        const billedCpts = billMap.triangulation_data.billing.cpt_codes ?? [];
        const matchedCondition = validationReport?.matched_condition ?? null;

        adjudicationResult = await financialAdjudicator.run(
          { billedAmount, billedCpts, matchedCondition, policy },
          session,
        );
      } else {
        session.emit({
          agent: 'system',
          type: 'AGENT_THINKING',
          message: `Skipping financial adjudication - claim is not claimable (${allRejectionReasons.length} issue(s) found)`,
        });
      }

      const validationPassed = validationReport?.passed ?? true;
      const gkPassed = (gatekeeperReport as { is_clean_claim: boolean }).is_clean_claim ?? true;

      let verdict: PipelineVerdict;
      let verdictSummary: string;

      if (isClaimable) {
        verdict = 'CLAIMABLE';
        verdictSummary =
          'This claim is valid and ready for submission. All three agents verified the ICD-10 codes, CPT necessity, fraud patterns, and administrative integrity - no issues found.';
      } else if (!validationPassed && gkPassed) {
        verdict = 'NOT_CLAIMABLE';
        verdictSummary = `Claim rejected by The Clinical Validator. ${allRejectionReasons.length} clinical issue(s) detected: ${allRejectionReasons.slice(0, 2).join('; ')}.`;
      } else if (validationPassed && !gkPassed) {
        verdict = 'NOT_CLAIMABLE';
        verdictSummary = `Claim rejected by the Integrity Gatekeeper. ${allRejectionReasons.length} administrative issue(s) detected: ${allRejectionReasons.slice(0, 2).join('; ')}.`;
      } else {
        verdict = 'NOT_CLAIMABLE';
        verdictSummary = `Claim rejected by multiple agents. ${allRejectionReasons.length} total issue(s): ${allRejectionReasons.slice(0, 2).join('; ')}.`;
      }

      const reconciliation = reconcileServiceMaps(prescriptionMap, billMap, labReportMap);
      auditLogger.addPhase({
        phase: 'cross_agent_consistency_audit',
        agent: 'system',
        status: reconciliation.mismatches.length > 0 ? 'warn' : 'ok',
        input_snapshot: {
          prescription: prescriptionMap,
          bill: billMap,
          lab_report: labReportMap,
        },
        output_snapshot: {
          patient_id_identical: reconciliation.patientIdConsistent,
          chronological_consistency: reconciliation.chronologyConsistent,
          mismatches: reconciliation.mismatches,
        },
        field_audit: [],
        issues: reconciliation.mismatches,
      });

      const completenessScores = [
        buildServiceMapFieldAudit(prescriptionMap).dataCompletenessScore,
        buildServiceMapFieldAudit(billMap).dataCompletenessScore,
        buildServiceMapFieldAudit(labReportMap).dataCompletenessScore,
      ];
      const averageCompleteness = Number(
        (completenessScores.reduce((sum, score) => sum + score, 0) / completenessScores.length).toFixed(2),
      );
      const summaryCriticalNulls = [
        ...buildCriticalNullIssues(prescriptionMap),
        ...buildCriticalNullIssues(billMap),
        ...buildCriticalNullIssues(labReportMap),
      ].map((issue) => issue.field || issue.message);
      const falsePositiveRisks = auditLogger
        .getSnapshot()
        .phases
        .flatMap((phase) =>
          phase.issues
            .filter((issue) => issue.code === 'HIGH_FALSE_POSITIVE_RISK')
            .map((issue) => issue.message),
        );
      const crossAgentMismatchMessages = reconciliation.mismatches.map((issue) => `${issue.field}: ${issue.message}`);
      const rootCauseHypothesis = allRejectionReasons.length > 0
        ? `The most likely rejection driver was ${!validationReport?.passed ? 'agent_2' : 'agent_3'}, where "${allRejectionReasons[0]}" was recorded. Supporting audit evidence includes critical nulls [${summaryCriticalNulls.slice(0, 4).join(', ') || 'none'}] and mismatches [${crossAgentMismatchMessages.join(' | ') || 'none'}].`
        : 'The audit shows no blocking evidence: agent_1 produced sufficiently complete ServiceMaps, agent_2 found no medical-necessity or fraud blockers, and agent_3 found no administrative or policy conflicts.';

      auditLogger.setSummary({
        overall_status:
          verdict === 'CLAIMABLE' ? 'claimable' : reconciliation.mismatches.length > 0 ? 'audit_required' : 'non_claimable',
        data_completeness_score: averageCompleteness,
        critical_nulls: summaryCriticalNulls,
        false_positive_risks: falsePositiveRisks,
        cross_agent_mismatches: crossAgentMismatchMessages,
        root_cause_hypothesis: rootCauseHypothesis,
      });

      const eventLog = session.getLog();

      await prisma.claimSession.update({
        where: { id: claimSession.id },
        data: {
          eventLog: eventLog as object[],
          extractedServiceMap: serviceMap as object,
          validationReport: validationReport as object,
          gatekeeperReport: gatekeeperReport as object,
          adjudicationResult: (adjudicationResult as object) ?? undefined,
          verdict,
          isClaimable,
          verdictReasons: allRejectionReasons,
          verdictSummary,
          completedAt: new Date(),
        },
      });

      if (input.claimId) {
        await prisma.claim.update({
          where: { id: input.claimId },
          data: {
            claimSessionId: claimSession.id,
            adjudicationResult: (adjudicationResult as object) ?? undefined,
            status: 'UNDER_REVIEW',
          },
        });
      }

      const ssePayload: FinalPipelineResult = {
        sessionId: claimSession.id,
        verdict,
        isClaimable,
        verdictSummary,
        verdictReasons: allRejectionReasons,
        serviceMap,
        validationReport,
        gatekeeperReport,
        adjudicationResult,
        eventLog: [],
      };

      session.complete(ssePayload);
      return { ...ssePayload, eventLog };
    } catch (err) {
      const message = (err as Error).message;
      session.error(`Pipeline failed: ${message}`);

      auditLogger.setSummary({
        overall_status: 'audit_required',
        data_completeness_score: 0,
        critical_nulls: [],
        false_positive_risks: [],
        cross_agent_mismatches: [],
        root_cause_hypothesis: `Pipeline execution stopped before completion because ${message}. Review the last successful phase entries for the closest causal evidence.`,
      });

      await prisma.claimSession.update({
        where: { id: claimSession.id },
        data: {
          eventLog: session.getLog() as object[],
          verdict: 'NEEDS_REVIEW',
          isClaimable: false,
          verdictReasons: [`Pipeline error: ${message}`],
          verdictSummary: 'An unexpected error occurred during analysis. Please retry.',
          completedAt: new Date(),
        },
      });

      throw err;
    }
  },

  async runGatekeeper(input: {
    prescriptionVaultId: string;
    billVaultId: string;
    labReportVaultId: string;
    userId: string;
  }) {
    const ids = [input.prescriptionVaultId, input.billVaultId, input.labReportVaultId];
    const vaultItems = await prisma.medicalVaultItem.findMany({
      where: { id: { in: ids }, userId: input.userId },
    });

    if (vaultItems.length !== 3) {
      const err = new Error('One or more vault items not found or access denied');
      Object.assign(err, { status: 404 });
      throw err;
    }

    const prescription = vaultItems.find((item) => item.id === input.prescriptionVaultId);
    const bill = vaultItems.find((item) => item.id === input.billVaultId);
    const labReport = vaultItems.find((item) => item.id === input.labReportVaultId);

    if (!prescription?.extractedData || !bill?.extractedData || !labReport?.extractedData) {
      const err = new Error('All documents must be OCR processed before running the gatekeeper');
      Object.assign(err, { status: 400 });
      throw err;
    }

    return integrityGatekeeper.run({
      prescription: prescription.extractedData as unknown as ServiceMap,
      bill: bill.extractedData as unknown as ServiceMap,
      labReport: labReport.extractedData as unknown as ServiceMap,
    });
  },
};
