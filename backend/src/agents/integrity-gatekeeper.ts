import type { ServiceMap } from '../api/ocr/ocr.types';
import prisma from '../config/prisma';
import type { AgentSession } from '../utils/agent-session';
import type { PipelineAuditLogger } from '../utils/pipeline-audit';

export type GatekeeperCheck = {
  passed: boolean;
  details?: string;
  reason?: string;
};

export type GatekeeperReport = {
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
};

export type GatekeeperInput = {
  prescription: ServiceMap;
  bill: ServiceMap;
  labReport: ServiceMap;
};

export const integrityGatekeeper = {
  async run(
    input: GatekeeperInput,
    auditLogger?: PipelineAuditLogger,
    session?: AgentSession,
  ): Promise<GatekeeperReport> {
    const { prescription, bill, labReport } = input;
    const rejectionReasons: string[] = [];

    const adminCheck: GatekeeperCheck = { passed: true };
    const patientIds = [
      prescription.metadata.patient_id,
      bill.metadata.patient_id,
      labReport.metadata.patient_id,
    ];

    if (patientIds.some((id) => !id)) {
      adminCheck.passed = false;
      adminCheck.reason = 'Missing Patient ID in one or more documents';
    } else if (new Set(patientIds).size > 1) {
      adminCheck.passed = false;
      adminCheck.reason = 'Patient ID mismatch across documents';
    }

    if (!bill.metadata.provider_npi) {
      adminCheck.passed = false;
      adminCheck.reason = `${adminCheck.reason ? `${adminCheck.reason}; ` : ''}Missing Provider NPI on bill`;
    }

    const rxDate = prescription.metadata.date_of_service ? new Date(prescription.metadata.date_of_service) : null;
    const labDate = labReport.metadata.date_of_service ? new Date(labReport.metadata.date_of_service) : null;
    const billDate = bill.metadata.date_of_service ? new Date(bill.metadata.date_of_service) : null;

    if (rxDate && labDate && rxDate > labDate) {
      adminCheck.passed = false;
      adminCheck.reason = `${adminCheck.reason ? `${adminCheck.reason}; ` : ''}Prescription date is after Lab date`;
    }
    if (labDate && billDate && labDate > billDate) {
      adminCheck.passed = false;
      adminCheck.reason = `${adminCheck.reason ? `${adminCheck.reason}; ` : ''}Lab date is after Bill date`;
    }

    if (!adminCheck.passed) rejectionReasons.push(adminCheck.reason!);

    auditLogger?.addPhase({
      phase: 'agent_3_administrative_check',
      agent: 'agent_3',
      status: adminCheck.passed ? 'ok' : 'warn',
      input_snapshot: {
        patient_ids: {
          prescription: prescription.metadata.patient_id,
          bill: bill.metadata.patient_id,
          lab_report: labReport.metadata.patient_id,
        },
        provider_npi_on_bill: bill.metadata.provider_npi,
        dates: {
          prescription: prescription.metadata.date_of_service,
          lab_report: labReport.metadata.date_of_service,
          bill: bill.metadata.date_of_service,
        },
      },
      output_snapshot: {
        result: adminCheck,
      },
      field_audit: [],
      issues: adminCheck.passed
        ? []
        : [{ code: 'ADMIN_CHECK_FAILED', message: adminCheck.reason ?? 'Administrative check failed' }],
    });

    const policyCheck: GatekeeperCheck = { passed: true };
    const patientId = prescription.metadata.patient_id;
    const normalizedId = patientId?.trim().toUpperCase() ?? '';
    const policyQuery = {
      model: 'memberProfile',
      action: 'findFirst',
      args: {
        where: {
          memberId: {
            equals: normalizedId,
            mode: 'insensitive',
          },
        },
      },
    };

    let profile: Awaited<ReturnType<typeof prisma.memberProfile.findFirst>> | null = null;
    let similarMemberIds: string[] = [];

    if (patientId) {
      profile = await prisma.memberProfile.findFirst({
        where: {
          memberId: {
            equals: normalizedId,
            mode: 'insensitive',
          },
        },
      });

      if (!profile) {
        policyCheck.passed = false;
        policyCheck.reason = `Member profile not found for Patient ID: ${patientId}`;

        const fuzzyMatches = await prisma.memberProfile.findMany({
          where: {
            memberId: {
              contains: patientId.slice(0, Math.max(3, Math.floor(patientId.length / 2))),
              mode: 'insensitive',
            },
          },
          take: 5,
        });
        similarMemberIds = fuzzyMatches.map((entry) => entry.memberId);
      } else {
        if (!profile.policyActive) {
          policyCheck.passed = false;
          policyCheck.reason = 'Policy is inactive';
        }
        if (!profile.premiumPaid) {
          policyCheck.passed = false;
          policyCheck.reason = `${policyCheck.reason ? `${policyCheck.reason}; ` : ''}Member premium is unpaid`;
        }
      }
    } else {
      policyCheck.passed = false;
      policyCheck.reason = 'Cannot perform policy check without Patient ID';
    }

    if (!policyCheck.passed) rejectionReasons.push(policyCheck.reason!);

    auditLogger?.addPhase({
      phase: 'agent_3_policy_check',
      agent: 'agent_3',
      status: policyCheck.passed ? 'ok' : 'warn',
      input_snapshot: {
        prisma_query: policyQuery,
      },
      output_snapshot: {
        found: Boolean(profile),
        fields_present: profile ? Object.keys(profile) : [],
        result: profile
          ? {
              memberId: profile.memberId,
              policyActive: profile.policyActive,
              premiumPaid: profile.premiumPaid,
              planType: profile.planType,
            }
          : null,
        similar_member_ids: similarMemberIds,
      },
      field_audit: [],
      issues: policyCheck.passed
        ? []
        : [{
            code: 'POLICY_CHECK_FAILED',
            message: policyCheck.reason ?? 'Policy check failed',
            values: similarMemberIds.length > 0 ? { similar_member_ids: similarMemberIds } : undefined,
          }],
    });

    const triangulationCheck = {
      passed: true,
      cpt_mismatches: [] as string[],
      missing_lab_report: false,
      reason: '',
    };

    const prescriptionOrderedCpts = new Set(
      prescription.triangulation_data.prescription.ordered_cpts
      || prescription.triangulation_data.billing.cpt_codes
      || [],
    );
    const labPerformedCpts = new Set(
      labReport.triangulation_data.billing.cpt_codes || [],
    );
    const allJustifiedCpts = new Set([...prescriptionOrderedCpts, ...labPerformedCpts]);
    const billedCptList = bill.triangulation_data.billing.cpt_codes || [];
    const unjustifiedCpts = billedCptList.filter((cpt) => !allJustifiedCpts.has(cpt));
    const hasSourceData = prescriptionOrderedCpts.size > 0 || labPerformedCpts.size > 0;

    if (!hasSourceData) {
      triangulationCheck.passed = true;
      triangulationCheck.reason =
        'Triangulation skipped - no CPT data found in prescription or lab report to compare against';
      session?.emit({
        agent: 'agent_3',
        type: 'AGENT_THINKING',
        message: 'Triangulation inconclusive - prescription and lab CPT lists are empty. Cannot validate billing.',
      });
    } else if (unjustifiedCpts.length > 0) {
      triangulationCheck.passed = false;
      triangulationCheck.cpt_mismatches = unjustifiedCpts;
      triangulationCheck.reason =
        `${unjustifiedCpts.length} billed CPT(s) not found in prescription orders or lab report: [${unjustifiedCpts.join(', ')}]`;
      rejectionReasons.push(triangulationCheck.reason);
    } else {
      triangulationCheck.passed = true;
      triangulationCheck.reason =
        `All ${billedCptList.length} billed CPT(s) verified against prescription and lab records`;
    }

    const orderedService = prescription.triangulation_data.prescription.ordered_service ?? '';
    const performedService = labReport.triangulation_data.lab_report.performed_service;

    if (!performedService) {
      triangulationCheck.missing_lab_report = true;
      session?.emit({
        agent: 'agent_3',
        type: 'AGENT_THINKING',
        message: 'performed_service is null in lab report - lab report may be incomplete',
      });
    }

    auditLogger?.addPhase({
      phase: 'agent_3_triangulation_check',
      agent: 'agent_3',
      status: !triangulationCheck.passed || triangulationCheck.cpt_mismatches.length > 0 || triangulationCheck.missing_lab_report
        ? 'warn'
        : 'ok',
      input_snapshot: {
        orderedService,
        performedService,
        billedCpts: billedCptList,
      },
      output_snapshot: {
        orderedService,
        performedService,
        billedCptComparison: billedCptList.map((cpt) => ({
          billed_cpt: cpt,
          matched_in_prescription_or_lab: allJustifiedCpts.has(cpt),
        })),
        result: triangulationCheck,
      },
      field_audit: [],
      issues: [
        ...triangulationCheck.cpt_mismatches.map((cpt) => ({
          code: 'TRIANGULATION_MISMATCH',
          field: 'triangulation_data.billing.cpt_codes',
          message: `Billed CPT ${cpt} is not justified by the prescription or lab report CPT sets`,
        })),
        ...(triangulationCheck.missing_lab_report
          ? [{ code: 'MISSING_LAB_PERFORMED_SERVICE', message: 'performed_service is null in the lab report' }]
          : []),
        ...(!triangulationCheck.passed
          ? [{ code: 'TRIANGULATION_FAILED', message: triangulationCheck.reason }]
          : []),
      ],
    });

    const isCleanClaim = adminCheck.passed && policyCheck.passed && triangulationCheck.passed;

    return {
      is_clean_claim: isCleanClaim,
      checks: {
        administrative: adminCheck,
        policy_active: policyCheck,
        triangulation: triangulationCheck,
      },
      rejection_reasons: rejectionReasons,
      can_proceed_to_medical_review: isCleanClaim,
    };
  },
};
