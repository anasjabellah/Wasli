import type { MembershipRole } from './roles.js';
import type { PickupStatus } from './pickup-transition.js';

export type AccountProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  locale: 'fr' | 'ar';
  roles: MembershipRole[];
};

export type AuthSession = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: AccountProfile;
};

export type ParentCenter = {
  id: string;
  name: string;
  city: string | null;
  addressLine: string | null;
  timezone: string;
};

export type ParentPickupSummary = {
  id: string;
  status: PickupStatus;
  requestedAt: string;
  expiresAt: string | null;
};

export type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  className: string | null;
  center: ParentCenter;
  activePickup: ParentPickupSummary | null;
};

export type ParentPickup = {
  id: string;
  studentId: string;
  studentName: string;
  className: string | null;
  centerName: string;
  status: PickupStatus;
  requestedAt: string;
  eligibleAt: string | null;
  expiresAt: string | null;
  notifiedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  handedOverAt: string | null;
  cancelledReason: string | null;
  rejectedReason: string | null;
  canCancel: boolean;
  pin: string | null;
  pinExpiresAt: string | null;
};

export type StaffPickup = ParentPickup & {
  priorityScore: number;
  delayReason: string | null;
  scheduledEndAt: string | null;
  parentName: string;
};

export type ParentNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  pickupRequestId: string | null;
};

export type ApiFailureCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'MISSING_API_URL'
  | 'INVALID_API_URL'
  | 'LOCALHOST_API_URL'
  | 'VALIDATION'
  | 'INVALID_CREDENTIALS'
  | 'NOT_A_PARENT'
  | 'ACCOUNT_DISABLED'
  | 'UNAUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'STUDENT_NOT_FOUND'
  | 'PICKUP_NOT_ALLOWED'
  | 'NO_ACTIVE_SESSION'
  | 'DUPLICATE_PICKUP'
  | 'PICKUP_NOT_FOUND'
  | 'PICKUP_NOT_CANCELLABLE'
  | 'FORBIDDEN'
  | 'UNKNOWN';

export type ApiFailure = {
  code: ApiFailureCode;
  message: string;
  requestId?: string;
};

const FAILURE_CODES = new Set<ApiFailureCode>([
  'NETWORK',
  'TIMEOUT',
  'MISSING_API_URL',
  'INVALID_API_URL',
  'LOCALHOST_API_URL',
  'VALIDATION',
  'INVALID_CREDENTIALS',
  'NOT_A_PARENT',
  'ACCOUNT_DISABLED',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'STUDENT_NOT_FOUND',
  'PICKUP_NOT_ALLOWED',
  'NO_ACTIVE_SESSION',
  'DUPLICATE_PICKUP',
  'PICKUP_NOT_FOUND',
  'PICKUP_NOT_CANCELLABLE',
  'FORBIDDEN',
  'UNKNOWN',
]);

export function assertDeviceApiBaseUrl(url: string | undefined): string {
  if (!url || url.trim() === '') {
    throw new Error('MISSING_API_URL');
  }
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error('INVALID_API_URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('INVALID_API_URL');
  }
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
    throw new Error('LOCALHOST_API_URL');
  }
  return url.trim().replace(/\/$/, '');
}

export function classifyFetchError(error: unknown): ApiFailure {
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return { code: 'TIMEOUT', message: 'The request timed out.' };
  }
  if (error instanceof Error && FAILURE_CODES.has(error.message as ApiFailureCode)) {
    return { code: error.message as ApiFailureCode, message: error.message };
  }
  return { code: 'NETWORK', message: 'The network request failed.' };
}

export function apiFailureFromResponse(status: number, body: unknown): ApiFailure {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const rawCode = typeof record.code === 'string' ? record.code : '';
  const code = FAILURE_CODES.has(rawCode as ApiFailureCode)
    ? (rawCode as ApiFailureCode)
    : status === 401
      ? 'UNAUTHENTICATED'
      : status === 403
        ? 'FORBIDDEN'
        : 'UNKNOWN';
  const message = typeof record.message === 'string' ? record.message : 'Request failed.';
  const requestId = typeof record.requestId === 'string' ? record.requestId : undefined;
  return { code, message, requestId };
}
