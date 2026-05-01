import prisma from '../../config/prisma';
import { clinicalExtractor } from '../../agents/clinical-extractor';
import { clinicalValidator } from '../../agents/clinical-validator';
import { integrityGatekeeper } from '../../agents/integrity-gatekeeper';
import { AgentSession } from '../../utils/agent-session';
import type { ServiceMap, ClinicalValidationReport, FinalPipelineResult, PipelineVerdict } from './ocr.types';

export { AgentSession };

export const ocrService = {
  /**
   * Runs the clinical extractor agent on a vault item, then
   * persists the ServiceMap JSON back to the MedicalVaultItem record.
   */
  extract: async (input: {
    vaultItemId: string;
    fileUrl: string;
    filename: string;
    docType: 'prescription' | 'bill' | 'lab_report';
    userId: string;
  }) => {
    // Guard: ensure the vault item belongs to this user
    const vaultItem = await prisma.medicalVaultItem.findFirst({
      where: { id: input.vaultItemId, userId: input.userId },
    });

    if (!vaultItem) {
      const err = new Error('Vault item not found or access denied');
      Object.assign(err, { status: 404 });
      throw err;
    }

    // Run Agent 1: Clinical Extractor
    const serviceMap = await clinicalExtractor.extract({
      fileUrl: input.fileUrl,
      filename: input.filename,
      docType: input.docType,
    });

    // Persist extracted data back to the vault item
    const updated = await prisma.medicalVaultItem.update({
      where: { id: input.vaultItemId },
      data: {
        extractedData: serviceMap as object,
        extractedAt: new Date(),
      },
    });

    return { vaultItem: updated, serviceMap };
  },

  /**
   * Runs the full 3-agent pipeline over SSE, then saves the entire
   * session (event log + all reports + final verdict) to the DB.
   */
  runFullPipeline: async (
    input: {
      prescriptionVaultId: string;
      billVaultId: string;
      labReportVaultId: string;
      userId: string;
    },
    session: AgentSession,
  ): Promise<FinalPipelineResult> => {
    session.start('ClaimGuard multi-agent pipeline starting — 3 agents will analyze your claim');

    // ── Load vault items ──────────────────────────────────────────────────────
    const ids = [input.prescriptionVaultId, input.billVaultId, input.labReportVaultId];
    const vaultItems = await prisma.medicalVaultItem.findMany({
      where: { id: { in: ids }, userId: input.userId },
    });

    if (vaultItems.length !== 3) {
      const err = new Error('One or more vault items not found or access denied');
      Object.assign(err, { status: 404 });
      throw err;
    }

    const prescriptionItem = vaultItems.find((v) => v.id === input.prescriptionVaultId)!;
    const billItem = vaultItems.find((v) => v.id === input.billVaultId)!;
    const labReportItem = vaultItems.find((v) => v.id === input.labReportVaultId)!;

    // ── Create ClaimSession record early (so we have an ID to reference) ──────
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
    const allRejectionReasons: string[] = [];

    try {
      // ── Agent 1: Clinical Extractor ──────────────────────────────────────────
      session.emit({
        agent: 'agent_1',
        type: 'AGENT_STARTED',
        message: 'Clinical Extractor activated — detecting file types and routing each document',
      });

      // ── Extract prescription ─────────────────────────────────────────────────
      let prescriptionMap: ServiceMap;
      if (prescriptionItem.extractedData) {
        session.emit({
          agent: 'agent_1',
          type: 'AGENT_THINKING',
          message: `Using cached extraction for "${prescriptionItem.fileName}" (already processed)`,
        });
        prescriptionMap = prescriptionItem.extractedData as unknown as ServiceMap;
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
        });
        await prisma.medicalVaultItem.update({
          where: { id: prescriptionItem.id },
          data: { extractedData: prescriptionMap as object, extractedAt: new Date() },
        });
      }

      // ── Extract bill ─────────────────────────────────────────────────────────
      let billMap: ServiceMap;
      if (billItem.extractedData) {
        session.emit({
          agent: 'agent_1',
          type: 'AGENT_THINKING',
          message: `Using cached extraction for "${billItem.fileName}" (already processed)`,
        });
        billMap = billItem.extractedData as unknown as ServiceMap;
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
        });
        await prisma.medicalVaultItem.update({
          where: { id: billItem.id },
          data: { extractedData: billMap as object, extractedAt: new Date() },
        });
      }

      // ── Extract lab report ───────────────────────────────────────────────────
      let labReportMap: ServiceMap;
      if (labReportItem.extractedData) {
        session.emit({
          agent: 'agent_1',
          type: 'AGENT_THINKING',
          message: `Using cached extraction for "${labReportItem.fileName}" (already processed)`,
        });
        labReportMap = labReportItem.extractedData as unknown as ServiceMap;
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
        });
        await prisma.medicalVaultItem.update({
          where: { id: labReportItem.id },
          data: { extractedData: labReportMap as object, extractedAt: new Date() },
        });
      }

      serviceMap = prescriptionMap; // Use prescription as primary service map


      session.emit({
        agent: 'agent_1',
        type: 'AGENT_OUTPUT',
        message: '✅ All documents extracted — patient data structured',
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

      // ── Agent 2: Clinical Validator (The Judge) ──────────────────────────────
      validationReport = await clinicalValidator.run(
        { prescription: prescriptionMap, bill: billMap },
        session,
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

      // ── Agent 3: Integrity Gatekeeper ────────────────────────────────────────
      session.emit({
        agent: 'agent_3',
        type: 'AGENT_STARTED',
        message: 'Integrity Gatekeeper activated — running admin, policy, and triangulation checks',
      });

      session.emit({
        agent: 'agent_3',
        type: 'AGENT_THINKING',
        message: 'Verifying patient ID consistency, provider NPI, date chronology, and policy status...',
      });

      gatekeeperReport = await integrityGatekeeper.run({
        prescription: prescriptionMap,
        bill: billMap,
        labReport: labReportMap,
      });

      const gk = gatekeeperReport as { is_clean_claim: boolean; rejection_reasons: string[] };
      if (!gk.is_clean_claim) {
        allRejectionReasons.push(...gk.rejection_reasons);
      }

      session.emit({
        agent: 'agent_3',
        type: 'AGENT_OUTPUT',
        message: gk.is_clean_claim
          ? '✅ Integrity check PASSED — clean claim confirmed'
          : `❌ Integrity check FAILED — ${gk.rejection_reasons.length} issue(s) found`,
        payload: gatekeeperReport,
      });

      // ── Final Verdict ─────────────────────────────────────────────────────────
      const isClaimable = allRejectionReasons.length === 0;
      const validationPassed = validationReport?.passed ?? true;
      const gkPassed = gk.is_clean_claim;

      let verdict: PipelineVerdict;
      let verdictSummary: string;

      if (isClaimable) {
        verdict = 'CLAIMABLE';
        verdictSummary =
          'This claim is valid and ready for submission. All three agents verified the ICD-10 codes, CPT necessity, fraud patterns, and administrative integrity — no issues found.';
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

      // ── Persist to DB first, then complete SSE ───────────────────────────────
      const eventLog = session.getLog();

      await prisma.claimSession.update({
        where: { id: claimSession.id },
        data: {
          eventLog: eventLog as object[],
          extractedServiceMap: serviceMap as object,
          validationReport: validationReport as object,
          gatekeeperReport: gatekeeperReport as object,
          verdict,
          isClaimable,
          verdictReasons: allRejectionReasons,
          verdictSummary,
          completedAt: new Date(),
        },
      });

      // SSE payload MUST NOT contain eventLog — it creates a circular reference:
      // PIPELINE_COMPLETE.payload.eventLog[n] would contain the PIPELINE_COMPLETE
      // event itself, whose payload contains the eventLog again → infinite loop.
      // The frontend already has every event from the live stream.
      const ssePayload: FinalPipelineResult = {
        sessionId: claimSession.id,
        verdict,
        isClaimable,
        verdictSummary,
        verdictReasons: allRejectionReasons,
        serviceMap,
        validationReport,
        gatekeeperReport,
        eventLog: [],
      };

      session.complete(ssePayload);
      return { ...ssePayload, eventLog };

    } catch (err) {
      const message = (err as Error).message;
      session.error(`Pipeline failed: ${message}`);

      // Persist partial session
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

  /** Legacy: run just the gatekeeper (kept for backward compat) */
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

    const prescription = vaultItems.find((v) => v.id === input.prescriptionVaultId);
    const bill = vaultItems.find((v) => v.id === input.billVaultId);
    const labReport = vaultItems.find((v) => v.id === input.labReportVaultId);

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
