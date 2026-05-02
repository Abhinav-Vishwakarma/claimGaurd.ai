import type { ServiceMap } from '../api/ocr/ocr.types';
import prisma from '../config/prisma';
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
  async run(input: GatekeeperInput, auditLogger?: PipelineAuditLogger): Promise<GatekeeperReport> {
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
    const policyQuery = {
      model: 'memberProfile',
      action: 'findUnique',
      args: { where: { memberId: patientId } },
    };

    let profile: Awaited<ReturnType<typeof prisma.memberProfile.findUnique>> | null = null;
    let similarMemberIds: string[] = [];

    if (patientId) {
      profile = await prisma.memberProfile.findUnique({
        where: { memberId: patientId },
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

    const orderedService = prescription.triangulation_data.prescription.ordered_service ?? '';
    const orderedServiceLower = orderedService.toLowerCase();
    const performedService = labReport.triangulation_data.lab_report.performed_service ?? '';
    const performedServiceLower = performedService.toLowerCase();
    const billedCpts = bill.triangulation_data.billing.cpt_codes || [];

    billedCpts.forEach((cpt) => {
      if (!orderedServiceLower.includes(cpt.toLowerCase()) && !orderedServiceLower.includes('service')) {
        triangulationCheck.cpt_mismatches.push(cpt);
      }
    });

    if (!performedServiceLower) {
      triangulationCheck.passed = false;
      triangulationCheck.missing_lab_report = true;
      triangulationCheck.reason = 'No performed service found in lab report';
    }

    if (triangulationCheck.cpt_mismatches.length > 0 && triangulationCheck.passed) {
      triangulationCheck.reason = `Billed CPTs not obvious in ordered service: ${triangulationCheck.cpt_mismatches.join(', ')}`;
    }

    if (!triangulationCheck.passed) rejectionReasons.push(triangulationCheck.reason);

    auditLogger?.addPhase({
      phase: 'agent_3_triangulation_check',
      agent: 'agent_3',
      status: !triangulationCheck.passed || triangulationCheck.cpt_mismatches.length > 0 ? 'warn' : 'ok',
      input_snapshot: {
        orderedService,
        performedService,
        billedCpts,
      },
      output_snapshot: {
        orderedService,
        performedService,
        billedCptComparison: billedCpts.map((cpt) => ({
          billed_cpt: cpt,
          ordered_service: orderedService,
          performed_service: performedService,
          matched_in_ordered_service: orderedServiceLower.includes(cpt.toLowerCase()) || orderedServiceLower.includes('service'),
        })),
        result: triangulationCheck,
      },
      field_audit: [],
      issues: [
        ...triangulationCheck.cpt_mismatches.map((cpt) => ({
          code: 'TRIANGULATION_MISMATCH',
          field: 'triangulation_data.billing.cpt_codes',
          message: `Billed CPT ${cpt} does not visually align with ordered service`,
        })),
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
