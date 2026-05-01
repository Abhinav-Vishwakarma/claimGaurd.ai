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

export const searchUser = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.query;
  if (!email || typeof email !== 'string') {
    const err = new Error('Email query parameter is required');
    Object.assign(err, { status: 400 });
    throw err;
  }

  const user = await adminService.searchUserByEmail(email);
  res.json({
    success: true,
    data: user,
  });
});
