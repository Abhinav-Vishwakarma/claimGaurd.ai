import { z } from 'zod';
import { roles } from './auth.types';

const email = z.email().toLowerCase();
const password = z.string().min(8).max(72);

export const registerSchema = z.object({
  body: z.object({
    email,
    password,
    name: z.string().min(2).max(80).optional(),
    role: z.enum(roles).default('CLIENT'),
  }),
});

export const loginSchema = z.object({
  body: z.object({ email, password }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(20),
  }),
});

export const logoutSchema = refreshSchema;

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
