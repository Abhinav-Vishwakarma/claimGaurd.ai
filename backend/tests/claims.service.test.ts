import { claimsService } from '../src/api/claims/claims.service';
import { prismaMock } from './singleton';
import { ocrService } from '../src/api/ocr/ocr.service';
import { jest, describe, it, expect } from '@jest/globals';

jest.mock('../src/api/ocr/ocr.service');

describe('Claims Service', () => {
  describe('fileClaim', () => {
    it('should throw an error if vault items are not exactly 3', async () => {
      // Mock prisma.medicalVaultItem.findMany to return an empty array
      prismaMock.medicalVaultItem.findMany.mockResolvedValue([]);

      await expect(
        claimsService.fileClaim('user-1', {
          prescriptionVaultId: 'p-1',
          billVaultId: 'b-1',
          labReportVaultId: 'l-1',
        })
      ).rejects.toThrow('One or more vault items not found or do not belong to you');
    });

    it('should successfully create a claim and extract details', async () => {
      const mockVaultItems: any = [
        {
          id: 'b-1',
          userId: 'user-1',
          extractedData: { triangulation_data: { billing: { billed_amount: 1500 } } },
        },
        {
          id: 'p-1',
          userId: 'user-1',
          extractedData: { metadata: { provider_npi: 'NPI-123' } },
        },
        {
          id: 'l-1',
          userId: 'user-1',
          extractedData: null,
        },
      ];

      prismaMock.medicalVaultItem.findMany.mockResolvedValue(mockVaultItems);

      prismaMock.claim.create.mockResolvedValue({
        id: 'claim-1',
        userId: 'user-1',
        prescriptionVaultId: 'p-1',
        billVaultId: 'b-1',
        labReportVaultId: 'l-1',
        provider: 'NPI-123',
        billedAmount: 1500,
        date: new Date(),
        status: 'PENDING',
      } as any);

      const result = await claimsService.fileClaim('user-1', {
        prescriptionVaultId: 'p-1',
        billVaultId: 'b-1',
        labReportVaultId: 'l-1',
      });

      expect(prismaMock.medicalVaultItem.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['p-1', 'b-1', 'l-1'] }, userId: 'user-1' },
      });

      expect(prismaMock.claim.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          provider: 'NPI-123',
          billedAmount: 1500,
          status: 'PENDING',
        }),
      });

      expect(result.id).toBe('claim-1');
    });
  });

  describe('getClientClaims', () => {
    it('should return claims for a user', async () => {
      prismaMock.claim.findMany.mockResolvedValue([
        { id: 'claim-1', userId: 'user-1' },
      ] as any);

      const result = await claimsService.getClientClaims('user-1');

      expect(result.length).toBe(1);
      expect(prismaMock.claim.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
