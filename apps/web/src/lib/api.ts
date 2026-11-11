import type { AccountProfile, AuthSession, StaffPickup } from '@wasli/shared';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type Session = { accessToken: string; refreshToken: string; user: AccountProfile };

export function readSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const accessToken = sessionStorage.getItem('wasli.access');
  const refreshToken = sessionStorage.getItem('wasli.refresh');
  const user = sessionStorage.getItem('wasli.user');
  if (!accessToken || !refreshToken || !user) return null;
  return { accessToken, refreshToken, user: JSON.parse(user) as AccountProfile };
}

export function writeSession(session: AuthSession): void {
  sessionStorage.setItem('wasli.access', session.accessToken);
  sessionStorage.setItem('wasli.refresh', session.refreshToken);
  sessionStorage.setItem('wasli.user', JSON.stringify(session.user));
}

export function clearSession(): void {
  sessionStorage.removeItem('wasli.access');
  sessionStorage.removeItem('wasli.refresh');
  sessionStorage.removeItem('wasli.user');
}

export function pathForRoles(roles: readonly string[]): string {
  if (roles.includes('PLATFORM_ADMIN')) return '/platform/centers';
  if (roles.includes('CENTER_ADMIN')) return '/app';
  if (roles.includes('RECEPTION') || roles.includes('TEACHER')) return '/app/pickups';
  return '/app';
}

export type ApiError = Error & {
  status?: number;
  code?: string;
  rejectionReason?: string | null;
  centerName?: string;
};

async function send<T>(path: string, options: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
  const response = await fetch(`${apiUrl}/api/v1${path}`, {
    method: options.method ?? 'GET',
    headers: {
      accept: 'application/json',
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T & { message?: string }) : ({} as T);
  if (!response.ok) {
    const body = payload as { message?: string; code?: string; rejectionReason?: string | null; centerName?: string };
    const failure = new Error(body.message ?? 'Request failed') as ApiError;
    failure.status = response.status;
    failure.code = body.code;
    failure.rejectionReason = body.rejectionReason;
    failure.centerName = body.centerName;
    throw failure;
  }
  return payload;
}

export async function login(identifier: string, password: string): Promise<AuthSession> {
  return send<AuthSession>('/auth/login', { method: 'POST', body: { identifier, password } });
}

export async function registerCenter(body: {
  centerName: string;
  centerEmail: string;
  centerPhone: string;
  city: string;
  addressLine?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}): Promise<{ centerId: string; status: 'ACTIVE' }> {
  return send('/centers/registrations', { method: 'POST', body });
}

export async function staffGet<T>(path: string): Promise<T> {
  return authorized<T>(path, 'GET');
}

export async function staffWrite<T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  return authorized<T>(path, method, body);
}

async function authorized<T>(path: string, method: string, body?: unknown): Promise<T> {
  const session = readSession();
  if (!session) throw new Error('Connectez-vous.');
  try {
    return await send<T>(path, { method, token: session.accessToken, body });
  } catch (error) {
    if (!(error instanceof Error) || (error as Error & { status?: number }).status !== 401) {
      throw error;
    }
    const refreshed = await send<AuthSession>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: session.refreshToken },
    }).catch(() => null);
    if (!refreshed) {
      clearSession();
      throw error;
    }
    writeSession(refreshed);
    return send<T>(path, { method, token: refreshed.accessToken, body });
  }
}

export async function staffPost<T>(path: string, body?: unknown): Promise<T> {
  const session = readSession();
  if (!session) throw new Error('Connectez-vous.');
  return send<T>(path, { method: 'POST', token: session.accessToken, body: body ?? {} });
}

export type { StaffPickup };
