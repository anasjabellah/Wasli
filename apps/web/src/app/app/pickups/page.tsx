'use client';

import { ACTIVE_PICKUP_STATUSES, type StaffPickup } from '@wasli/shared';
import { useState } from 'react';
import { statusLabel } from '@/components/app/labels';
import { Remote } from '@/components/app/loader';
import { readSession, staffPost } from '@/lib/api';

export default function PickupsPage() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  return (
    <div className="stack">
      <div className="page-head">
        <h1>Récupérations</h1>
        <form onSubmit={(event) => { event.preventDefault(); setSubmitted(query.trim()); }}>
          <input className="field" aria-label="Rechercher" value={query} placeholder="Élève, classe, parent" onChange={(event) => setQuery(event.target.value)} />
        </form>
      </div>
      <Remote<{ requests: StaffPickup[] }>
        path={`/operations/queue${submitted ? `?q=${encodeURIComponent(submitted)}` : ''}`}
        render={(data, reload) => (
          <Queue
            requests={data.requests.filter((request) =>
              (ACTIVE_PICKUP_STATUSES as readonly string[]).includes(request.status),
            )}
            reload={reload}
          />
        )}
      />
    </div>
  );
}

function Queue({ requests, reload }: { requests: StaffPickup[]; reload: () => void }) {
  const roles = readSession()?.user.roles ?? [];
  const canPrepare = roles.includes('TEACHER') || roles.includes('CENTER_ADMIN');
  const canVerify = canPrepare || roles.includes('RECEPTION');
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function act(path: string, body?: unknown): Promise<void> {
    setMessage(null);
    try {
      await staffPost(path, body);
      setPin('');
      reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action impossible');
    }
  }

  if (requests.length === 0) return <p className="empty">Aucune demande.</p>;

  return (
    <div className="stack">
      {message ? <p className="error">{message}</p> : null}
      {requests.map((request) => (
        <article className="sheet" key={request.id} style={{ padding: 16 }}>
          <div className="page-head">
            <div>
              <h2 style={{ margin: 0 }}>{request.studentName}</h2>
              <p className="note">{request.className} · {request.parentName} · arrivée {new Date(request.requestedAt).toLocaleTimeString()} · fin {request.scheduledEndAt ? new Date(request.scheduledEndAt).toLocaleTimeString() : '—'}</p>
            </div>
            <span className="pill">{statusLabel(request.status)}</span>
          </div>
          {request.delayReason ? <p className="warn">{request.delayReason}</p> : null}
          <div className="queue-actions">
            {canPrepare && request.status === 'NOTIFIED' ? <button className="btn primary" type="button" onClick={() => void act(`/pickup-requests/${request.id}/prepare`)}>Préparer</button> : null}
            {canPrepare && (request.status === 'NOTIFIED' || request.status === 'PREPARING') ? (
              <>
                <input className="field" value={reason} placeholder="Motif du retard" onChange={(event) => setReason(event.target.value)} />
                <button className="btn soft" type="button" onClick={() => void act(`/pickup-requests/${request.id}/delay`, { reason })}>Retarder</button>
              </>
            ) : null}
            {canPrepare && request.status === 'PREPARING' ? <button className="btn primary" type="button" onClick={() => void act(`/pickup-requests/${request.id}/ready`)}>Marquer prêt</button> : null}
            {canVerify && request.status === 'READY' ? (
              <>
                <input className="field" value={pin} inputMode="numeric" placeholder="Code montré par le parent" onChange={(event) => setPin(event.target.value)} />
                <button className="btn primary" type="button" onClick={() => void act(`/pickup-requests/${request.id}/verify-handover`, { pin })}>Vérifier la remise</button>
              </>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
