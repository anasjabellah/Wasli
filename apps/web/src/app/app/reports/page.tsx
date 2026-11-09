'use client';

import { statusLabel } from '@/components/app/labels';
import { Remote } from '@/components/app/loader';

export default function ReportsPage() {
  return (
    <Remote<{ counts: Record<string, number> }>
      path="/operations/overview"
      render={(data) => {
        const entries = Object.entries(data.counts);
        const max = Math.max(1, ...entries.map(([, count]) => count));
        return (
          <div className="stack">
            <h1>Rapports</h1>
            <p className="note">Comptage des demandes visibles pour ce compte. Pas d’indicateur inventé.</p>
            {entries.every(([, count]) => count === 0) ? <p className="empty">Aucune demande à reporter.</p> : null}
            {entries.map(([status, count]) => (
              <div key={status}>
                <span>{statusLabel(status)} · {count}</span>
                <div className="meter"><span style={{ width: `${(count / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        );
      }}
    />
  );
}
