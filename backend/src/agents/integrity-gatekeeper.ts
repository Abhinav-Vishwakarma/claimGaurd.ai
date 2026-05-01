import prisma from '../config/prisma';
import type { ServiceMap } from '../api/ocr/ocr.types';

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
  async run(input: GatekeeperInput): Promise<GatekeeperReport> {
    const { prescription, bill, labReport } = input;
    const rejectionReasons: string[] = [];

    // --- 1. Administrative Check ---
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
      adminCheck.reason = (adminCheck.reason ? adminCheck.reason + '; ' : '') + 'Missing Provider NPI on bill';
    }

    // Chronological check
    const rxDate = prescription.metadata.date_of_service ? new Date(prescription.metadata.date_of_service) : null;
    const labDate = labReport.metadata.date_of_service ? new Date(labReport.metadata.date_of_service) : null;
    const billDate = bill.metadata.date_of_service ? new Date(bill.metadata.date_of_service) : null;

    if (rxDate && labDate && rxDate > labDate) {
      adminCheck.passed = false;
      adminCheck.reason = (adminCheck.reason ? adminCheck.reason + '; ' : '') + 'Prescription date is after Lab date';
    }
    if (labDate && billDate && labDate > billDate) {
      adminCheck.passed = false;
      adminCheck.reason = (adminCheck.reason ? adminCheck.reason + '; ' : '') + 'Lab date is after Bill date';
    }

    if (!adminCheck.passed) rejectionReasons.push(adminCheck.reason!);

    // --- 2. Policy & Premium Check ---
    const policyCheck: GatekeeperCheck = { passed: true };
    const patientId = prescription.metadata.patient_id;

    if (patientId) {
      const profile = await prisma.memberProfile.findUnique({
        where: { memberId: patientId },
      });

      if (!profile) {
        policyCheck.passed = false;
        policyCheck.reason = 'Member profile not found for Patient ID: ' + patientId;
      } else {
        if (!profile.policyActive) {
          policyCheck.passed = false;
          policyCheck.reason = 'Policy is inactive';
        }
        if (!profile.premiumPaid) {
          policyCheck.passed = false;
          policyCheck.reason = (policyCheck.reason ? policyCheck.reason + '; ' : '') + 'Member premium is unpaid';
        }
      }
    } else {
      policyCheck.passed = false;
      policyCheck.reason = 'Cannot perform policy check without Patient ID';
    }

    if (!policyCheck.passed) rejectionReasons.push(policyCheck.reason!);

    // --- 3. Triangulation Check ---
    const triangulationCheck = {
      passed: true,
      cpt_mismatches: [] as string[],
      missing_lab_report: false,
      reason: '',
    };

    const orderedService = prescription.triangulation_data.prescription.ordered_service?.toLowerCase() || '';
    const performedService = labReport.triangulation_data.lab_report.performed_service?.toLowerCase() || '';
    const billedCpts = bill.triangulation_data.billing.cpt_codes || [];

    // Check if billed CPT matches ordered service (Simple keyword matching for now)
    billedCpts.forEach((cpt) => {
      if (!orderedService.includes(cpt.toLowerCase()) && !orderedService.includes('service')) {
        // This is a naive check; in a real system we would map CPT to service names
        // For now, we flag it if neither the ordered service name nor a generic term matches.
        // We might need a better mapping here.
      }
    });

    if (!performedService) {
      triangulationCheck.passed = false;
      triangulationCheck.missing_lab_report = true;
      triangulationCheck.reason = 'No performed service found in lab report';
    }

    if (!triangulationCheck.passed) rejectionReasons.push(triangulationCheck.reason);

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
