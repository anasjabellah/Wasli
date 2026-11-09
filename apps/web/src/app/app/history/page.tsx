'use client';

import type { StaffPickup } from '@wasli/shared';
import { statusLabel } from '@/components/app/labels';
import { Remote } from '@/components/app/loader';

const terminal = new Set(['HANDED_OVER', 'CANCELLED', 'REJECTED', 'EXPIRED']);

export default function HistoryPage() {
  return (
    <Remote<{ requests: StaffPickup[] }>
      path="/operations/queue"
      render={(data) => {
        const rows = data.requests.filter((request) => terminal.has(request.status));
        return (
          <div className="stack">
            <h1>Historique</h1>
            <div className="sheet">
              <table className="table">
                <thead><tr><th>Élève</th><th>Statut</th><th>Date</th></tr></thead>
                <tbody>
                  {rows.length === 0 ? <tr><td className="empty" colSpan={3}>Aucune récupération terminée.</td></tr> : null}
                  {rows.map((request) => (
                    <tr key={request.id}><td>{request.studentName}</td><td>{statusLabel(request.status)}</td><td>{new Date(request.requestedAt).toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }}
    />
  );
}
