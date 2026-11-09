import { describe, expect, it } from 'vitest';
import { loadApiEnv } from './api-env.js';

describe('loadApiEnv', () => {
  it('applies local defaults', () => {
    expect(loadApiEnv({ DATABASE_URL: 'postgresql://wasli:wasli@127.0.0.1:55432/wasli' })).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3001,
      CORS_ORIGINS: 'http://localhost:3000',
    });
  });

  it('requires the migration database URL', () => {
    expect(() => loadApiEnv({})).toThrow();
  });

  it('rejects development secrets in production', () => {
    expect(() =>
      loadApiEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://wasli:wasli@127.0.0.1:55432/wasli',
      }),
    ).toThrow(/Production requires/);
  });
});
