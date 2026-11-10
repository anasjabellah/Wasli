'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { staffGet } from '@/lib/api';
import { useDash } from './locale';
import { ErrorState, LoadingState } from './ui';

export function Remote<T>({
  path,
  render,
}: {
  path: string;
  render: (data: T, reload: () => void) => ReactNode;
}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load(): void {
    setLoading(true);
    setError(null);
    staffGet<T>(path)
      .then(setData)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Erreur'))
      .finally(() => setLoading(false));
  }

  const { text } = useDash();

  useEffect(() => {
    load();
  }, [path]);

  if (loading && !data) return <LoadingState>{text.loading}</LoadingState>;
  if (error) return <ErrorState message={error} retry={text.retry} onRetry={load} />;
  if (!data) return null;
  return <>{render(data, load)}</>;
}
