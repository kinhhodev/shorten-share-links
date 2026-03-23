import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load shared root .env (repo root) for backend.
// backend/api/src/env.ts -> repo root is ../../../.env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  /** Trim để tránh newline cuối dòng trong .env làm lệch chữ ký JWT. */
  JWT_SECRET: z.string().min(32).transform((s) => s.trim()),
  COOKIE_SECRET: z.string().min(16).transform((s) => s.trim()),
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  BASE_URL: z.string().url().default('http://localhost:3001'),
});

export const env = EnvSchema.parse(process.env);

