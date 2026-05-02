import { Request, Response } from 'express';
import { catchAsync } from '../../../utils/catchAsync';
import { dashboardClientService } from './client.service';
import { AuthUser } from '../../auth/auth.types';

type AuthRequest = Request & { user?: AuthUser };

export const overview = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const data = await dashboardClientService.getOverview(userId);
  res.json({ success: true, data });
});

export const profile = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const data = await dashboardClientService.getProfile(userId);
  res.json({ success: true, data });
});

export const vault = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const data = await dashboardClientService.getVault(userId);
  res.json({ success: true, data });
});

export const deleteVault = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const itemId = req.params.id as string;
  await dashboardClientService.deleteVaultItem(userId, itemId);
  res.json({ success: true, message: 'Item deleted safely' });
});

export const claims = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const data = await dashboardClientService.getClaimsHistory(userId);
  res.json({ success: true, data });
});

export const appeals = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const data = await dashboardClientService.getAppeals(userId);
  res.json({ success: true, data });
});
