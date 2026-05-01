import { NextFunction, Request, Response } from 'express';
import { roles, Role } from '../api/auth/auth.types';
import { verifyAccessToken } from '../api/auth/token.service';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ success: false, message: 'Missing bearer token' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid bearer token' });
  }
};

export const authorize =
  (...allowedRoles: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    next();
  };

export { roles };
