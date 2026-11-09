'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, readSession, staffGet, staffPost } from '@/lib/api';

type CenterRow = { id: string; name: string; city: string | null; status: string; createdAt: string };
type CenterDetail = CenterRow & {
  email: string | null;
  phone: string | null;
  addressLine: string | null;
  rejectionReason: string | null;
  administrator: { firstName: string; lastName: string; email: string; phone: string | null } | null;
  history: Array<{ action: string; createdAt: string; reason: string | null }>;
};

const filters = ['', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED'] as const;

export default function PlatformCentersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<CenterRow[] | null>(null);
  const [status, setStatus] = useState<(typeof filters)[number]>('PENDING_APPROVAL');
  const [selected, setSelected] = useState<CenterDetail | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!session.user.roles.includes('PLATFORM_ADMIN')) {
      router.replace('/app');
    }
  }, [router]);

  function load(next = status): void {
    setError(null);
    staffGet<{ items: CenterRow[] }>(`/platform/centers${next ? `?status=${next}` : ''}`)
      .then((data) => setRows(data.items))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Erreur'));
  }

  useEffect(() => {
    if (readSession()?.user.roles.includes('PLATFORM_ADMIN')) load(status);
  }, [status]);

  async function open(id: string): Promise<void> {
    const detail = await staffGet<CenterDetail>(`/platform/centers/${id}`);
    setSelected(detail);
    setReason('');
  }

  async function decide(kind: 'approve' | 'reject'): Promise<void> {
    if (!selected) return;
    setError(null);
    try {
      await staffPost(`/platform/centers/${selected.id}/${kind}`, kind === 'reject' ? { reason } : {});
      setSelected(null);
      load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Action impossible');
    }
  }

  return (
    <main className="wrap" style={{ paddingTop: 28, paddingBottom: 64 }}>
      <header className="nav">
        <Link href="/" className="brand"><span className="mark">W</span> Wasli</Link>
        <button className="btn soft" type="button" onClick={() => { clearSession(); router.replace('/login'); }}>Déconnexion</button>
      </header>
      <h1>Centres</h1>
      <div className="hero-actions">
        {filters.map((filter) => (
          <button key={filter || 'all'} className={status === filter ? 'btn primary' : 'btn soft'} type="button" onClick={() => setStatus(filter)}>
            {filter || 'Tous'}
          </button>
        ))}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {!rows ? <p>Chargement…</p> : null}
      {rows && rows.length === 0 ? <p className="card">Aucun centre pour ce filtre.</p> : null}
      <div className="stack" style={{ marginTop: 18 }}>
        {rows?.map((row) => (
          <article className="card" key={row.id}>
            <h2>{row.name}</h2>
            <p>{row.city ?? 'Ville non renseignée'} · {row.status} · {new Date(row.createdAt).toLocaleString()}</p>
            <button className="btn soft" type="button" onClick={() => void open(row.id)}>Détail</button>
          </article>
        ))}
      </div>
      {selected ? (
        <section className="card stack" style={{ marginTop: 18 }}>
          <h2>{selected.name}</h2>
          <p>{selected.addressLine}</p>
          <p>{selected.email} · {selected.phone}</p>
          <p>{selected.administrator ? `${selected.administrator.firstName} ${selected.administrator.lastName} · ${selected.administrator.email}` : 'Administrateur introuvable'}</p>
          {selected.rejectionReason ? <p className="warn">{selected.rejectionReason}</p> : null}
          <h3>Historique</h3>
          {selected.history.length === 0 ? <p>Aucune décision enregistrée.</p> : null}
          {selected.history.map((entry) => (
            <p key={`${entry.action}-${entry.createdAt}`}>{entry.action} · {new Date(entry.createdAt).toLocaleString()}{entry.reason ? ` · ${entry.reason}` : ''}</p>
          ))}
          {selected.status === 'PENDING_APPROVAL' ? (
            <>
              <button className="btn primary" type="button" onClick={() => void decide('approve')}>Approuver</button>
              <label>Motif du refus<input className="field" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
              <button className="btn soft" type="button" onClick={() => void decide('reject')}>Refuser</button>
            </>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
