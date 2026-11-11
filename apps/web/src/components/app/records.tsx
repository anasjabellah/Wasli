'use client';

import { useCallback, useEffect, useState } from 'react';
import { staffGet, staffWrite } from '@/lib/api';
import { useDash } from './locale';

export function useRecords<T>(path: string) {
  const { text } = useDash();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);

  const reload = useCallback(() => {
    setError(null);
    staffGet<T>(path)
      .then(setData)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : text.actionFailed));
  }, [path, text.actionFailed]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function mutate(target: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<boolean> {
    if (pending) return false;
    setPending(true);
    setFormError('');
    try {
      await staffWrite(target, method, body);
      setNotice(text.saved);
      reload();
      return true;
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : text.actionFailed);
      return false;
    } finally {
      setPending(false);
    }
  }

  return { data, error, formError, notice, pending, reload, mutate };
}

export function useAdmin(): boolean | null {
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    const raw = sessionStorage.getItem('wasli.user');
    const roles = raw ? (JSON.parse(raw) as { roles?: string[] }).roles : [];
    setAdmin(roles?.includes('CENTER_ADMIN') ?? false);
  }, []);
  return admin;
}
