import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { authService } from './auth.service';

export const register = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await authService.register(req.body);
  res.status(201).json({ success: true, data });
});

export const login = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await authService.login(req.body);
  res.json({ success: true, data });
});

export const refresh = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await authService.refresh(req.body.refreshToken);
  res.json({ success: true, data });
});

export const logout = catchAsync(async (req: Request, res: Response): Promise<void> => {
  await authService.logout(req.body.refreshToken);
  res.status(204).send();
});

export const me = catchAsync(async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: { user: req.user } });
});
