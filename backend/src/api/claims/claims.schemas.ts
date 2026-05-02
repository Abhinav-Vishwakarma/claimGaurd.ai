import { z } from 'zod';

export const fileClaimSchema = z.object({
  body: z.object({
    prescriptionVaultId: z.string().uuid(),
    billVaultId: z.string().uuid(),
    labReportVaultId: z.string().uuid(),
    provider: z.string().max(255).optional(),
  }),
});

export const refileClaimSchema = z.object({
  body: z.object({
    prescriptionVaultId: z.string().uuid(),
    billVaultId: z.string().uuid(),
    labReportVaultId: z.string().uuid(),
  }),
});

export const makeDecisionSchema = z.object({
  body: z.object({
    decision: z.enum(['APPROVED', 'PARTIAL_APPROVED', 'REJECTED']),
    adminRemark: z.string().max(2000).optional(),
    adminApprovedAmount: z.number().positive().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const submitPaymentRequestSchema = z.object({
  body: z.object({
    accountHolderName: z.string().min(2).max(255),
    accountNumber: z.string().min(5).max(50),
    bankName: z.string().min(2).max(255),
    ifscCode: z.string().min(4).max(20),
    additionalNotes: z.string().max(500).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const processPaymentSchema = z.object({
  body: z.object({
    action: z.enum(['APPROVED', 'REJECTED']),
    adminRemark: z.string().max(1000).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});
