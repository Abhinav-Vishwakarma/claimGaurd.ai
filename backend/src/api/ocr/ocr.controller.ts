import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ocrService, AgentSession } from './ocr.service';
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

/**
 * POST /api/v1/dashboard/ocr/stream
 * Runs the full 3-agent pipeline and streams AgentEvents over SSE.
 * The final PIPELINE_COMPLETE event carries the full FinalPipelineResult.
 */
export const streamPipeline = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const { prescriptionVaultId, billVaultId, labReportVaultId } = req.body;

  // Validate presence (schema validation runs before this via middleware)
  if (!prescriptionVaultId || !billVaultId || !labReportVaultId) {
    res.status(400).json({ success: false, message: 'Missing vault IDs' });
    return;
  }

  const session = new AgentSession();
  session.pipe(res);

  // Run pipeline async — errors are caught and streamed
  ocrService
    .runFullPipeline(
      { prescriptionVaultId, billVaultId, labReportVaultId, userId },
      session,
    )
    .catch((err) => {
      if (!res.writableEnded) {
        session.error((err as Error).message || 'Unexpected pipeline error');
      }
    });
};
