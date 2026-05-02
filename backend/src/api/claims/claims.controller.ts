import type { Request, Response, NextFunction } from 'express';
import { claimsService } from './claims.service';

type AuthReq = Request & { user?: { id: string; role: string } };

const catchAsync = (fn: (req: AuthReq, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthReq, res, next).catch(next);

// ─── Client controllers ───────────────────────────────────────────────────────

export const fileClaim = catchAsync(async (req, res) => {
  const claim = await claimsService.fileClaim(req.user!.id, req.body);
  res.status(201).json({ success: true, data: claim });
});

export const getClientClaims = catchAsync(async (req, res) => {
  const claims = await claimsService.getClientClaims(req.user!.id);
  res.json({ success: true, data: claims });
});

export const getClientClaimDetail = catchAsync(async (req, res) => {
  const claim = await claimsService.getClientClaimDetail(String(req.params.id), req.user!.id);
  res.json({ success: true, data: claim });
});

export const refileClaim = catchAsync(async (req, res) => {
  const claim = await claimsService.refileClaim(req.user!.id, String(req.params.id), req.body);
  res.status(201).json({ success: true, data: claim });
});

export const submitPaymentRequest = catchAsync(async (req, res) => {
  const pr = await claimsService.submitPaymentRequest(req.user!.id, String(req.params.id), req.body);
  res.status(201).json({ success: true, data: pr });
});

// ─── Admin controllers ────────────────────────────────────────────────────────

export const getAdminClaims = catchAsync(async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const statuses = status ? status.split(',') : undefined;
  const claims = await claimsService.getAdminClaims(statuses);
  res.json({ success: true, data: claims });
});

export const getAdminClaimDetail = catchAsync(async (req, res) => {
  const claim = await claimsService.getAdminClaimDetail(String(req.params.id));
  res.json({ success: true, data: claim });
});

export const runAiAnalysis = async (req: Request, res: Response) => {
  const adminId = (req as AuthReq).user?.id ?? 'admin';
  await claimsService.runAiAnalysis(String(req.params.id), adminId, res);
};

export const makeDecision = catchAsync(async (req, res) => {
  const claim = await claimsService.makeDecision(String(req.params.id), req.user!.id, req.body);
  res.json({ success: true, data: claim });
});

export const getAdminPaymentRequests = catchAsync(async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const requests = await claimsService.getAdminPaymentRequests(status);
  res.json({ success: true, data: requests });
});

export const processPayment = catchAsync(async (req, res) => {
  const pr = await claimsService.processPayment(String(req.params.id), req.user!.id, req.body);
  res.json({ success: true, data: pr });
});
