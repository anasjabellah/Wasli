import { z } from 'zod';

const apiEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    DATABASE_URL: z.string().min(1),
    APP_DATABASE_URL: z.string().min(1).optional(),
    APP_DB_PASSWORD: z.string().min(1).optional(),
    CORS_ORIGINS: z.string().min(1).default('http://localhost:3000'),
    JWT_ACCESS_SECRET: z.string().min(32).default('dev-only-access-secret-change-me!!'),
    PIN_ENCRYPTION_KEY: z.string().min(32).default('dev-only-pin-encryption-key-change!!'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().min(3600).default(60 * 60 * 24 * 30),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') {
      return;
    }
    if (env.JWT_ACCESS_SECRET.startsWith('dev-only') || env.PIN_ENCRYPTION_KEY.startsWith('dev-only')) {
      ctx.addIssue({
        code: 'custom',
        message: 'Production requires JWT_ACCESS_SECRET and PIN_ENCRYPTION_KEY',
        path: ['JWT_ACCESS_SECRET'],
      });
    }
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function loadApiEnv(source: Record<string, unknown>): ApiEnv {
  const picked: Record<string, unknown> = {};
  for (const key of [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'APP_DATABASE_URL',
    'APP_DB_PASSWORD',
    'CORS_ORIGINS',
    'JWT_ACCESS_SECRET',
    'PIN_ENCRYPTION_KEY',
    'ACCESS_TOKEN_TTL_SECONDS',
    'REFRESH_TOKEN_TTL_SECONDS',
  ]) {
    const value = source[key];
    if (value !== undefined && value !== '') {
      picked[key] = value;
    }
  }
  return apiEnvSchema.parse(picked);
}
