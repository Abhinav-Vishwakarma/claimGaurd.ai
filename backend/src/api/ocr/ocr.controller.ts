import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ocrService } from './ocr.service';
import type { AuthUser } from '../auth/auth.types';

type AuthRequest = Request & { user?: AuthUser };

export const extract = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const { vaultItemId, fileUrl, filename, docType } = req.body;

  const result = await ocrService.extract({ vaultItemId, fileUrl, filename, docType, userId });

  res.json({ success: true, data: result });
});

export const runGatekeeper = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const { prescriptionVaultId, billVaultId, labReportVaultId } = req.body;

  const result = await ocrService.runGatekeeper({
    prescriptionVaultId,
    billVaultId,
    labReportVaultId,
    userId,
  });

  res.json({ success: true, data: result });
});
