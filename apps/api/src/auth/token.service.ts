import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type AccessClaims = {
  sub: string;
  typ: 'access';
  iat: number;
  exp: number;
};

@Injectable()
export class TokenService {
  constructor(private readonly config: ConfigService) {}

  accessTtlSeconds(): number {
    return this.config.getOrThrow<number>('ACCESS_TOKEN_TTL_SECONDS');
  }

  refreshTtlSeconds(): number {
    return this.config.getOrThrow<number>('REFRESH_TOKEN_TTL_SECONDS');
  }

  signAccessToken(userId: string): { token: string; expiresAt: Date } {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + this.accessTtlSeconds();
    const claims: AccessClaims = { sub: userId, typ: 'access', iat: issuedAt, exp: expiresAt };
    return {
      token: signJwt(claims, this.config.getOrThrow<string>('JWT_ACCESS_SECRET')),
      expiresAt: new Date(expiresAt * 1000),
    };
  }

  verifyAccessToken(token: string): { userId: string } {
    let claims: AccessClaims;
    try {
      claims = verifyJwt(token, this.config.getOrThrow<string>('JWT_ACCESS_SECRET'));
    } catch {
      throw new UnauthorizedException({ code: 'SESSION_EXPIRED', message: 'Session expirée.' });
    }
    if (claims.typ !== 'access' || typeof claims.sub !== 'string' || claims.sub.length === 0) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Authentification requise.' });
    }
    return { userId: claims.sub };
  }

  createRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
    const token = randomBytes(32).toString('base64url');
    return {
      token,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + this.refreshTtlSeconds() * 1000),
    };
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function signJwt(claims: AccessClaims, secret: string): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(claims));
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJwt(token: string, secret: string): AccessClaims {
  const [header, body, signature, extra] = token.split('.');
  if (!header || !body || !signature || extra) {
    throw new Error('malformed');
  }
  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error('signature');
  }
  const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AccessClaims;
  if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('expired');
  }
  return claims;
}

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}
