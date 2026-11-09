import { describe, expect, it } from 'vitest';
import { TokenService } from './token.service.js';

const secret = 'test-access-secret-with-32-characters';

function service(ttl = 900): TokenService {
  return new TokenService({
    getOrThrow: (key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return secret;
      if (key === 'ACCESS_TOKEN_TTL_SECONDS') return ttl;
      if (key === 'REFRESH_TOKEN_TTL_SECONDS') return 3600;
      throw new Error(key);
    },
  } as never);
}

describe('access tokens', () => {
  it('round-trips the user id and rejects an expired token', () => {
    const tokens = service();
    const issued = tokens.signAccessToken('6d9c0c3e-4e2a-4c1b-9d2a-0c5b8a7e6f11');
    expect(tokens.verifyAccessToken(issued.token).userId).toBe('6d9c0c3e-4e2a-4c1b-9d2a-0c5b8a7e6f11');
    expect(() => service(-60).verifyAccessToken(service(-60).signAccessToken('user').token)).toThrow();
  });
});
