'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { staffGet } from '@/lib/api';

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

  useEffect(() => {
    load();
  }, [path]);

  if (loading && !data) return <p>Chargement…</p>;
  if (error) {
    return (
      <div className="card">
        <p className="error">{error}</p>
        <button className="btn primary" type="button" onClick={load}>Réessayer</button>
      </div>
    );
  }
  if (!data) return null;
  return <>{render(data, load)}</>;
}
