import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { adminService } from './admin.service';

export const registerClient = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.registerClient(req.body);
  res.status(201).json({
    success: true,
    message: 'Client registered successfully',
    data: result,
  });
});

export const getClients = catchAsync(async (req: Request, res: Response) => {
  const clients = await adminService.getAllClients();
  res.json({
    success: true,
    data: clients,
  });
});
