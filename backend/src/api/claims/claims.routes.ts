import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import {
  fileClaim, getClientClaims, getClientClaimDetail, refileClaim, submitPaymentRequest,
  getAdminClaims, getAdminClaimDetail, runAiAnalysis, makeDecision,
  getAdminPaymentRequests, processPayment,
} from './claims.controller';

const router = Router();

// ─── Client routes (authenticated) ───────────────────────────────────────────
router.use(authenticate);

router.post('/', fileClaim);
router.get('/', getClientClaims);
router.get('/:id', getClientClaimDetail);
router.post('/:id/refile', refileClaim);
router.post('/:id/payment-request', submitPaymentRequest);

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get('/admin/all', authenticate, authorize('ADMIN'), getAdminClaims);
router.get('/admin/payments/list', authenticate, authorize('ADMIN'), getAdminPaymentRequests);
router.patch('/admin/payments/:id/process', authenticate, authorize('ADMIN'), processPayment);
router.get('/admin/:id', authenticate, authorize('ADMIN'), getAdminClaimDetail);
router.post('/admin/:id/analyze', authenticate, authorize('ADMIN'), runAiAnalysis);
router.patch('/admin/:id/decision', authenticate, authorize('ADMIN'), makeDecision);

export default router;
