import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { ocrExtractSchema, ocrGatekeeperSchema } from './ocr.schemas';
import * as controller from './ocr.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('CLIENT'));

// POST /api/v1/dashboard/ocr
// Body: { vaultItemId, fileUrl, filename, docType }
router.post('/', validate(ocrExtractSchema), controller.extract);

// POST /api/v1/dashboard/ocr/gatekeeper
// Body: { prescriptionVaultId, billVaultId, labReportVaultId }
router.post('/gatekeeper', validate(ocrGatekeeperSchema), controller.runGatekeeper);

export default router;
