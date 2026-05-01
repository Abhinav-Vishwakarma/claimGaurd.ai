import { z } from 'zod';

export const ocrExtractSchema = z.object({
  body: z.object({
    vaultItemId: z.string().uuid('vaultItemId must be a valid UUID'),
    fileUrl: z.string().url('fileUrl must be a valid URL'),
    filename: z.string().min(1).max(255),
    docType: z.enum(['prescription', 'bill', 'lab_report']),
  }),
});
export const ocrGatekeeperSchema = z.object({
  body: z.object({
    prescriptionVaultId: z.string().uuid(),
    billVaultId: z.string().uuid(),
    labReportVaultId: z.string().uuid(),
  }),
});
