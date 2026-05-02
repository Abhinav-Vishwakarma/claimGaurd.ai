import prisma from '../../config/prisma';
import type { AgentSession } from '../../utils/agent-session';
import { ocrService } from '../ocr/ocr.service';
import type { Response } from 'express';

// ─── Client: File a Claim ─────────────────────────────────────────────────────

export const claimsService = {
  async fileClaim(userId: string, data: {
    prescriptionVaultId: string;
    billVaultId: string;
    labReportVaultId: string;
    provider?: string;
  }) {
    // Verify all vault items belong to this user
    const ids = [data.prescriptionVaultId, data.billVaultId, data.labReportVaultId];
    const vaultItems = await prisma.medicalVaultItem.findMany({
      where: { id: { in: ids }, userId },
    });
    if (vaultItems.length !== 3) {
      const err = new Error('One or more vault items not found or do not belong to you');
      Object.assign(err, { status: 404 }); throw err;
    }

    // Pull billed amount from extracted bill data (if available)
    const billItem = vaultItems.find((v) => v.id === data.billVaultId);
    const extractedBilling = (billItem?.extractedData as { triangulation_data?: { billing?: { billed_amount?: number } } } | null)
      ?.triangulation_data?.billing;
    const billedAmount = extractedBilling?.billed_amount ?? 0;

    // Pull provider from prescription extracted data
    const rxItem = vaultItems.find((v) => v.id === data.prescriptionVaultId);
    const extractedProvider = (rxItem?.extractedData as { metadata?: { provider_npi?: string } } | null)
      ?.metadata?.provider_npi ?? data.provider ?? 'Unknown Provider';

    return prisma.claim.create({
      data: {
        userId,
        prescriptionVaultId: data.prescriptionVaultId,
        billVaultId: data.billVaultId,
        labReportVaultId: data.labReportVaultId,
        provider: extractedProvider,
        billedAmount,
        date: new Date(),
        status: 'PENDING',
      },
    });
  },

  // ─── Client: List my claims ───────────────────────────────────────────────

  async getClientClaims(userId: string) {
    return prisma.claim.findMany({
      where: { userId },
      include: {
        claimSession: { select: { verdict: true, isClaimable: true, verdictSummary: true, adjudicationResult: true } },
        eob: true,
        paymentRequest: { select: { id: true, status: true, grantedAmount: true, createdAt: true } },
        parentClaim: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  // ─── Client: Claim detail ─────────────────────────────────────────────────

  async getClientClaimDetail(claimId: string, userId: string) {
    const claim = await prisma.claim.findFirst({
      where: { id: claimId, userId },
      include: {
        claimSession: true,
        eob: true,
        paymentRequest: true,
        parentClaim: { select: { id: true, status: true } },
        refiledClaims: { select: { id: true, status: true, createdAt: true } },
      },
    });
    if (!claim) {
      const err = new Error('Claim not found');
      Object.assign(err, { status: 404 }); throw err;
    }
    // Attach vault item metadata (not sensitive content)
    const vaultItems = await prisma.medicalVaultItem.findMany({
      where: { id: { in: [claim.prescriptionVaultId, claim.billVaultId, claim.labReportVaultId] } },
      select: { id: true, fileName: true, type: true, url: true, uploadDate: true },
    });
    return { ...claim, vaultItems };
  },

  // ─── Client: Re-file claim ────────────────────────────────────────────────

  async refileClaim(userId: string, parentClaimId: string, data: {
    prescriptionVaultId: string;
    billVaultId: string;
    labReportVaultId: string;
  }) {
    const parent = await prisma.claim.findFirst({ where: { id: parentClaimId, userId } });
    if (!parent) {
      const err = new Error('Original claim not found'); Object.assign(err, { status: 404 }); throw err;
    }
    if (parent.status !== 'REJECTED') {
      const err = new Error('Only rejected claims can be re-filed'); Object.assign(err, { status: 400 }); throw err;
    }
    return claimsService.fileClaim(userId, { ...data, provider: parent.provider }).then((c) =>
      prisma.claim.update({ where: { id: c.id }, data: { parentClaimId } })
    );
  },

  // ─── Client: Submit payment request ──────────────────────────────────────

  async submitPaymentRequest(userId: string, claimId: string, bankDetails: {
    accountHolderName: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
    additionalNotes?: string;
  }) {
    const claim = await prisma.claim.findFirst({
      where: { id: claimId, userId },
      include: { paymentRequest: true },
    });
    if (!claim) { const e = new Error('Claim not found'); Object.assign(e, { status: 404 }); throw e; }
    if (claim.status !== 'APPROVED' && claim.status !== 'PARTIAL_APPROVED') {
      const e = new Error('Claim must be approved before submitting a payment request');
      Object.assign(e, { status: 400 }); throw e;
    }
    if (claim.paymentRequest) {
      const e = new Error('A payment request already exists for this claim');
      Object.assign(e, { status: 409 }); throw e;
    }

    const grantedAmount = claim.adminApprovedAmount ?? claim.billedAmount;

    return prisma.paymentRequest.create({
      data: {
        claimId,
        userId,
        grantedAmount,
        ...bankDetails,
        status: 'PENDING_VERIFICATION',
      },
    });
  },

  // ─── Admin: List all active claims ────────────────────────────────────────

  async getAdminClaims(statusFilter?: string[]) {
    const statuses = (statusFilter ?? ['PENDING', 'UNDER_REVIEW']) as ('PENDING' | 'UNDER_REVIEW')[];
    return prisma.claim.findMany({
      where: { status: { in: statuses } },
      include: {
        user: { include: { memberProfile: true } },
        claimSession: { select: { verdict: true, isClaimable: true, verdictSummary: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  // ─── Admin: Claim detail ──────────────────────────────────────────────────

  async getAdminClaimDetail(claimId: string) {
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        user: { include: { memberProfile: true } },
        claimSession: true,
        eob: true,
        paymentRequest: true,
        parentClaim: { select: { id: true, status: true } },
      },
    });
    if (!claim) { const e = new Error('Claim not found'); Object.assign(e, { status: 404 }); throw e; }

    const vaultItems = await prisma.medicalVaultItem.findMany({
      where: { id: { in: [claim.prescriptionVaultId, claim.billVaultId, claim.labReportVaultId] } },
      select: { id: true, fileName: true, type: true, url: true, extractedAt: true },
    });
    return { ...claim, vaultItems };
  },

  // ─── Admin: Run AI Analysis over SSE ─────────────────────────────────────

  async runAiAnalysis(claimId: string, adminId: string, res: Response) {
    const claim = await prisma.claim.findUnique({ where: { id: claimId } });
    if (!claim) { res.status(404).json({ message: 'Claim not found' }); return; }

    // Mark as under review
    await prisma.claim.update({ where: { id: claimId }, data: { status: 'UNDER_REVIEW', decidedByAdminId: adminId } });

    const session = new (await import('../../utils/agent-session')).AgentSession();
    session.pipe(res);

    ocrService.runFullPipeline(
      {
        prescriptionVaultId: claim.prescriptionVaultId,
        billVaultId: claim.billVaultId,
        labReportVaultId: claim.labReportVaultId,
        userId: claim.userId,
        claimId,
      },
      session,
    ).catch((err) => {
      if (!res.writableEnded) session.error((err as Error).message || 'Pipeline error');
    });
  },

  // ─── Admin: Make decision ─────────────────────────────────────────────────

  async makeDecision(claimId: string, adminId: string, data: {
    decision: 'APPROVED' | 'PARTIAL_APPROVED' | 'REJECTED';
    adminRemark?: string;
    adminApprovedAmount?: number; // for PARTIAL_APPROVED
  }) {
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { claimSession: true },
    });
    if (!claim) { const e = new Error('Claim not found'); Object.assign(e, { status: 404 }); throw e; }

    // Determine final approved amount
    let approvedAmount: number | undefined;
    if (data.decision === 'APPROVED') {
      const adj = claim.adjudicationResult as { insurerPays?: number } | null;
      approvedAmount = adj?.insurerPays ?? claim.billedAmount;
    } else if (data.decision === 'PARTIAL_APPROVED') {
      if (!data.adminApprovedAmount || data.adminApprovedAmount <= 0) {
        const e = new Error('adminApprovedAmount is required for PARTIAL_APPROVED');
        Object.assign(e, { status: 400 }); throw e;
      }
      approvedAmount = data.adminApprovedAmount;
    }

    const updated = await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: data.decision,
        adminDecision: data.decision,
        adminRemark: data.adminRemark,
        adminApprovedAmount: approvedAmount,
        decidedAt: new Date(),
        decidedByAdminId: adminId,
      },
    });

    // Auto-create EOBRecord for approved claims
    if (data.decision === 'APPROVED' || data.decision === 'PARTIAL_APPROVED') {
      const adj = claim.adjudicationResult as {
        approvedAmount?: number;
        patientResponsibility?: number;
        insurerPays?: number;
      } | null;

      await prisma.eOBRecord.upsert({
        where: { claimId },
        create: {
          claimId,
          dateOfService: claim.date,
          billedAmount: claim.billedAmount,
          allowedAmount: adj?.approvedAmount ?? claim.billedAmount,
          paidAmount: approvedAmount ?? 0,
          patientResponsibility: adj?.patientResponsibility ?? 0,
          finalStatus: 'processed',
        },
        update: {
          paidAmount: approvedAmount ?? 0,
          allowedAmount: adj?.approvedAmount ?? claim.billedAmount,
          patientResponsibility: adj?.patientResponsibility ?? 0,
        },
      });
    }

    return updated;
  },

  // ─── Admin: List payment requests ─────────────────────────────────────────

  async getAdminPaymentRequests(statusFilter?: string) {
    const status = (statusFilter ?? 'PENDING_VERIFICATION') as 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
    return prisma.paymentRequest.findMany({
      where: { status },
      include: {
        user: { select: { name: true, email: true } },
        claim: { select: { id: true, billedAmount: true, adminApprovedAmount: true, adminDecision: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  // ─── Admin: Approve/Reject payment request ────────────────────────────────

  async processPayment(paymentRequestId: string, adminId: string, data: {
    action: 'APPROVED' | 'REJECTED';
    adminRemark?: string;
  }) {
    const pr = await prisma.paymentRequest.findUnique({ where: { id: paymentRequestId } });
    if (!pr) { const e = new Error('Payment request not found'); Object.assign(e, { status: 404 }); throw e; }
    if (pr.status !== 'PENDING_VERIFICATION') {
      const e = new Error('Payment request is not pending verification'); Object.assign(e, { status: 400 }); throw e;
    }

    return prisma.paymentRequest.update({
      where: { id: paymentRequestId },
      data: {
        status: data.action,
        adminRemark: data.adminRemark,
        approvedAt: data.action === 'APPROVED' ? new Date() : undefined,
        approvedByAdminId: adminId,
      },
    });
  },
};
