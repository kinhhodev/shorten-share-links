import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(16),
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  BASE_URL: z.string().url().default('http://localhost:3001'),
});

export const env = EnvSchema.parse(process.env);

