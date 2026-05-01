import { z } from 'zod';

export const vaultUploadInputSchema = z.object({
  type: z.enum(['prescription', 'bill', 'lab_report']),
});

export const vaultUploadResultSchema = z.object({
  fileUrl: z.url(),
});

export type VaultUploadInput = z.infer<typeof vaultUploadInputSchema>;
export type VaultUploadResult = z.infer<typeof vaultUploadResultSchema>;
