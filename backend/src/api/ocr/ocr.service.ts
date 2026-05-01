import prisma from '../../config/prisma';
import { clinicalExtractor } from '../../agents/clinical-extractor';

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
};
