import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { registerClientSchema } from './admin.schemas';
import * as controller from './admin.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.post('/register-client', validate(registerClientSchema), controller.registerClient);
router.get('/clients', controller.getClients);

export default router;
