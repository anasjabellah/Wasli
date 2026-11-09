import {
  apiFailureFromResponse,
  assertDeviceApiBaseUrl,
  classifyFetchError,
  type AccountProfile,
  type ApiFailure,
  type AuthSession,
  type ParentChild,
  type ParentNotification,
  type ParentPickup,
} from '@wasli/shared';

export class ApiError extends Error {
  readonly failure: ApiFailure;

  constructor(failure: ApiFailure) {
    super(failure.message);
    this.name = 'ApiError';
    this.failure = failure;
  }
}

type SessionBridge = {
  getAccessToken: () => string | null;
  refresh: () => Promise<string | null>;
};

let bridge: SessionBridge = {
  getAccessToken: () => null,
  refresh: async () => null,
};

export function bindSession(next: SessionBridge): void {
  bridge = next;
}

function baseUrl(): string {
  try {
    return assertDeviceApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  } catch (error) {
    throw new ApiError(classifyFetchError(error));
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const url = `${baseUrl()}/api/v1${path}`;
  const send = async (token: string | null, allowRefresh: boolean): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const headers: Record<string, string> = { accept: 'application/json' };
      if (options.body !== undefined) {
        headers['content-type'] = 'application/json';
      }
      if (token) {
        headers.authorization = `Bearer ${token}`;
      }
      const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
      const text = await response.text();
      const payload = text ? (JSON.parse(text) as unknown) : null;
      if (response.status === 401 && allowRefresh && options.auth !== false) {
        const next = await bridge.refresh();
        if (next) {
          return send(next, false);
        }
      }
      if (!response.ok) {
        throw new ApiError(apiFailureFromResponse(response.status, payload));
      }
      return payload as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(classifyFetchError(error));
    } finally {
      clearTimeout(timer);
    }
  };

  const token = options.auth === false ? null : bridge.getAccessToken();
  return send(token, true);
}

export const parentApi = {
  login: (identifier: string, password: string) =>
    request<AuthSession>('/auth/login', { method: 'POST', auth: false, body: { identifier, password } }),
  refresh: (refreshToken: string) =>
    request<AuthSession>('/auth/refresh', { method: 'POST', auth: false, body: { refreshToken } }),
  logout: (refreshToken: string) =>
    request<null>('/auth/logout', { method: 'POST', auth: false, body: { refreshToken } }),
  children: () => request<{ children: ParentChild[] }>('/parents/me/children'),
  child: (studentId: string) => request<{ child: ParentChild }>(`/parents/me/children/${studentId}`),
  createPickup: (studentId: string) =>
    request<{ request: ParentPickup }>('/pickup-requests', { method: 'POST', body: { studentId } }),
  pickups: () => request<{ requests: ParentPickup[] }>('/pickup-requests'),
  pickup: (id: string) => request<{ request: ParentPickup }>(`/pickup-requests/${id}`),
  cancelPickup: (id: string) =>
    request<{ request: ParentPickup }>(`/pickup-requests/${id}/cancel`, { method: 'POST', body: {} }),
  notifications: () => request<{ notifications: ParentNotification[] }>('/notifications'),
};

export type { AccountProfile };
