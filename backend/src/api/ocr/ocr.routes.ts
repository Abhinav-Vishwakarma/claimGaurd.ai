import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { ocrExtractSchema } from './ocr.schemas';
import * as controller from './ocr.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('CLIENT'));

// POST /api/v1/dashboard/ocr
// Body: { vaultItemId, fileUrl, filename, docType }
router.post('/', validate(ocrExtractSchema), controller.extract);

export default router;
