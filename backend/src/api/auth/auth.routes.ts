import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as controller from './auth.controller';
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from './auth.schemas';

const router = Router();

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', validate(logoutSchema), controller.logout);
router.get('/me', authenticate, controller.me);
router.get('/admin', authenticate, authorize('ADMIN'), (_req, res) => {
  res.json({ success: true, data: { scope: 'admin' } });
});

export default router;
