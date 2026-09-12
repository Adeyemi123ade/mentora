import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Source and compiled files live at different depths. Prefer the server workspace
// file in both layouts and never fall back to the repository-level .env.
const candidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'apps/server/.env'),
  fileURLToPath(new URL('../.env', import.meta.url)),
  fileURLToPath(new URL('../../../../apps/server/.env', import.meta.url)),
];
const serverEnv = candidates.find(existsSync);
if (serverEnv) dotenv.config({ path: serverEnv });

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  CLIENT_URL: z.string().min(1).default('http://localhost:5173'),
  SUPABASE_URL: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  BREVO_SMTP_LOGIN: z.string().optional(),
  BREVO_SMTP_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_SENDER_EMAIL: z.string().optional(),
});

export const env = schema.parse(process.env);
