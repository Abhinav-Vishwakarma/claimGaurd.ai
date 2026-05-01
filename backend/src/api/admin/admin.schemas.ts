import { z } from 'zod';
import { PlanType } from '@prisma/client';

export const registerClientSchema = z.object({
  body: z.object({
    userId: z.string().uuid().or(z.literal('')).optional(),
    email: z.string().email(),
    password: z.string().min(8).optional(),
    name: z.string().min(2),
    memberId: z.string().min(3),
    planType: z.nativeEnum(PlanType).default(PlanType.PPO),
    deductibleTotal: z.number().nonnegative().default(0),
    policyActive: z.boolean().default(true),
    premiumPaid: z.boolean().default(true),
  }),
});

export type RegisterClientInput = z.infer<typeof registerClientSchema>['body'];
