import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  DATABASE_URL: z.string().optional().default('postgresql://user:password@localhost:5432/mydb'),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  GOOGLE_DEFAULT_MODEL: z.string().default('gemini-2.0-flash'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_DEFAULT_MODEL: z.string().default('llama-3.3-70b-versatile'),
  QDRANT_URL: z.string().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().optional(),
  QDRANT_COLLECTION: z.string().default('claim_rules'),
  JWT_ACCESS_SECRET: z.string().default(process.env.JWT_SECRET || 'dev-access-secret'),
  JWT_REFRESH_SECRET: z.string().default(process.env.JWT_SECRET || 'dev-refresh-secret'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default(process.env.JWT_EXPIRES_IN || '7d'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  UPLOADTHING_SECRET: z.string(),
  UPLOADTHING_APP_ID: z.string(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:\n', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
