import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as controller from './ai.controller';
import { aiGenerateSchema } from './ai.schemas';

const router = Router();

router.post('/generate', authenticate, validate(aiGenerateSchema), controller.generate);

export default router;
