import crypto from 'crypto';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AuthUser, Role, TokenPair } from './auth.types';

type RefreshPayload = JwtPayload & { sub: string; email: string; role: Role };

const durationToMs = (value: string): number => {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return Number(value) * 1000;

  const amount = Number(match[1]);
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return amount * unitMs;
};

const sign = (payload: AuthUser, secret: string, expiresIn: string) =>
  jwt.sign(payload, secret, { expiresIn } as SignOptions);

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export const refreshExpiryDate = () => new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN));

export const signTokenPair = (user: AuthUser): TokenPair => ({
  accessToken: sign(user, env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRES_IN),
  refreshToken: sign(user, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN),
});

export const verifyAccessToken = (token: string): AuthUser =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;

export const verifyRefreshToken = (token: string): RefreshPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
