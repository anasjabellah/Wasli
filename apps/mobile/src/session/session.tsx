import type { AccountProfile } from '@wasli/shared';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, bindSession, parentApi } from '../lib/api';

const ACCESS_KEY = 'wasli.accessToken';
const REFRESH_KEY = 'wasli.refreshToken';

type SessionStatus = 'loading' | 'anonymous' | 'ready';

type SessionContextValue = {
  status: SessionStatus;
  user: AccountProfile | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<AccountProfile | null>(null);
  const accessToken = useRef<string | null>(null);
  const refreshToken = useRef<string | null>(null);
  const refreshLock = useRef<Promise<string | null> | null>(null);

  async function persist(nextAccess: string, nextRefresh: string, profile: AccountProfile): Promise<void> {
    if (!profile.roles.includes('PARENT')) {
      throw new ApiError({ code: 'NOT_A_PARENT', message: 'NOT_A_PARENT' });
    }
    accessToken.current = nextAccess;
    refreshToken.current = nextRefresh;
    await SecureStore.setItemAsync(ACCESS_KEY, nextAccess);
    await SecureStore.setItemAsync(REFRESH_KEY, nextRefresh);
    setUser(profile);
    setStatus('ready');
  }

  async function clear(): Promise<void> {
    accessToken.current = null;
    refreshToken.current = null;
    setUser(null);
    setStatus('anonymous');
    await SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => undefined);
    await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined);
  }

  async function refresh(): Promise<string | null> {
    if (refreshLock.current) {
      return refreshLock.current;
    }
    refreshLock.current = (async () => {
      const current = refreshToken.current;
      if (!current) {
        await clear();
        return null;
      }
      try {
        const session = await parentApi.refresh(current);
        await persist(session.accessToken, session.refreshToken, session.user);
        return session.accessToken;
      } catch {
        await clear();
        return null;
      } finally {
        refreshLock.current = null;
      }
    })();
    return refreshLock.current;
  }

  useEffect(() => {
    bindSession({
      getAccessToken: () => accessToken.current,
      refresh,
    });
    let cancelled = false;
    async function restore(): Promise<void> {
      try {
        const stored = await SecureStore.getItemAsync(REFRESH_KEY);
        if (cancelled) {
          return;
        }
        if (!stored) {
          setStatus('anonymous');
          return;
        }
        refreshToken.current = stored;
        const next = await refresh();
        if (!cancelled && !next) {
          setStatus('anonymous');
        }
      } catch {
        if (!cancelled) {
          setStatus('anonymous');
        }
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      login: async (identifier, password) => {
        const session = await parentApi.login(identifier, password);
        await persist(session.accessToken, session.refreshToken, session.user);
      },
      logout: async () => {
        const current = refreshToken.current;
        if (current) {
          await parentApi.logout(current).catch(() => undefined);
        }
        await clear();
      },
    }),
    [status, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('SessionProvider is missing');
  }
  return value;
}
