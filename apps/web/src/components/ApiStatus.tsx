'use client';

import { shellCopy } from '@wasli/shared';
import { useEffect, useState } from 'react';

type HealthState = 'checking' | 'up' | 'down';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function ApiStatus() {
  const [state, setState] = useState<HealthState>('checking');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiUrl}/api/v1/health`, { signal: controller.signal })
      .then((response) => {
        setState(response.ok ? 'up' : 'down');
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState('down');
        }
      });
    return () => controller.abort();
  }, []);

  const label =
    state === 'checking' ? 'Vérification…' : state === 'up' ? shellCopy.fr.apiUp : shellCopy.fr.apiDown;

  return (
    <p className={state === 'up' ? 'status up' : 'status'}>
      <i />
      {label}
    </p>
  );
}
