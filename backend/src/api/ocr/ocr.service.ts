import prisma from '../../config/prisma';
import { clinicalExtractor } from '../../agents/clinical-extractor';
import { integrityGatekeeper } from '../../agents/integrity-gatekeeper';
import type { ServiceMap } from './ocr.types';

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

  async runGatekeeper(input: {
    prescriptionVaultId: string;
    billVaultId: string;
    labReportVaultId: string;
    userId: string;
  }) {
    const ids = [input.prescriptionVaultId, input.billVaultId, input.labReportVaultId];
    const vaultItems = await prisma.medicalVaultItem.findMany({
      where: {
        id: { in: ids },
        userId: input.userId,
      },
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
