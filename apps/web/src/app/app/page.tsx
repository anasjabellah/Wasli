'use client';

import { ACTIVE_PICKUP_STATUSES, type StaffPickup } from '@wasli/shared';
import { useEffect, useState } from 'react';
import { statusLabel } from '@/components/app/labels';
import { readSession, staffGet } from '@/lib/api';

type Overview = {
  counts: Record<string, number>;
  active: StaffPickup[];
  recent: StaffPickup[];
};

export default function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [directory, setDirectory] = useState<{ students: number; links: number; teachers: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const admin = readSession()?.user.roles.includes('CENTER_ADMIN') ?? false;
    staffGet<Overview>('/operations/overview')
      .then(async (overview) => {
        setData(overview);
        if (!admin) return;
        const [students, parents, teachers] = await Promise.all([
          staffGet<{ items: unknown[] }>('/operations/students'),
          staffGet<{ items: unknown[] }>('/operations/parents'),
          staffGet<{ items: unknown[] }>('/operations/teachers'),
        ]);
        setDirectory({
          students: students.items.length,
          links: parents.items.length,
          teachers: teachers.items.length,
        });
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Erreur'));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Chargement…</p>;

  const active = ACTIVE_PICKUP_STATUSES.reduce((sum, status) => sum + (data.counts[status] ?? 0), 0);
  const metrics = [
    ...(directory
      ? [
          ['Élèves', directory.students],
          ['Liens parents', directory.links],
          ['Enseignants', directory.teachers],
        ]
      : []),
    ['Demandes actives', active],
    ['En préparation', data.counts.PREPARING ?? 0],
    ['Prêts', data.counts.READY ?? 0],
  ];

  return (
    <div className="stack">
      <h1>Vue d’ensemble</h1>
      <div className="metrics">
        {metrics.map(([label, value]) => (
          <article key={String(label)}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="sheet">
        <table className="table">
          <thead><tr><th>File active</th><th>Classe</th><th>Statut</th></tr></thead>
          <tbody>
            {data.active.length === 0 ? <tr><td className="empty" colSpan={3}>Aucune demande active.</td></tr> : null}
            {data.active.map((request) => (
              <tr key={request.id}>
                <td>{request.studentName}</td>
                <td>{request.className ?? '—'}</td>
                <td><span className="pill">{statusLabel(request.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="sheet">
        <table className="table">
          <thead><tr><th>Activité récente</th><th>Statut</th><th>Heure</th></tr></thead>
          <tbody>
            {data.recent.length === 0 ? <tr><td className="empty" colSpan={3}>Aucune opération enregistrée.</td></tr> : null}
            {data.recent.map((request) => (
              <tr key={request.id}>
                <td>{request.studentName}</td>
                <td>{statusLabel(request.status)}</td>
                <td>{new Date(request.requestedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
