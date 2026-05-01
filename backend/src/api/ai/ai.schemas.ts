import { z } from 'zod';
import { aiServices } from './ai.types';

const attachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(3).max(120),
  dataBase64: z.string().min(1),
});

export const aiGenerateSchema = z.object({
  body: z.object({
    service: z.enum(aiServices),
    model: z.string().min(1).max(120).optional(),
    prompt: z.string().min(1).max(100_000),
    attachments: z.array(attachmentSchema).max(5).optional().default([]),
    options: z
      .object({
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().int().min(1).max(8192).optional(),
      })
      .optional()
      .default({}),
  }),
});
