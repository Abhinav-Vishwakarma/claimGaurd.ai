import { Router } from 'express';
import { authenticate, authorize } from '../../../middlewares/auth';
import * as controller from './client.controller';

const router = Router();

// Apply auth and Client Role authorization to all endpoints
router.use(authenticate);
router.use(authorize('CLIENT'));

// Dashboard Map
router.get('/overview', controller.overview);
router.get('/profile', controller.profile);
router.get('/vault', controller.vault);
router.delete('/vault/:id', controller.deleteVault);

router.get('/claims', controller.claims);
router.get('/appeals', controller.appeals);

export default router;
