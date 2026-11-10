'use client';

import { ACTIVE_PICKUP_STATUSES, type StaffPickup } from '@wasli/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { statusLabel } from '@/components/app/labels';
import { useDash } from '@/components/app/locale';
import { DataTable, EmptyState, ErrorState, LoadingState, PageHeader, StatCard, StatusBadge } from '@/components/app/ui';
import { readSession, staffGet } from '@/lib/api';

type Overview = {
  counts: Record<string, number>;
  active: StaffPickup[];
  recent: StaffPickup[];
};

export default function OverviewPage() {
  const { locale, text } = useDash();
  const [data, setData] = useState<Overview | null>(null);
  const [directory, setDirectory] = useState<{ students: number; links: number; teachers: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const user = readSession()?.user;

  function load(): void {
    const admin = user?.roles.includes('CENTER_ADMIN') ?? false;
    setError(null);
    staffGet<Overview>('/operations/overview')
      .then(async (overview) => {
        setData(overview);
        if (!admin) return;
        const [students, parents, teachers] = await Promise.all([
          staffGet<{ items: unknown[] }>('/operations/students'),
          staffGet<{ items: unknown[] }>('/operations/parents'),
          staffGet<{ items: unknown[] }>('/operations/teachers'),
        ]);
        setDirectory({ students: students.items.length, links: parents.items.length, teachers: teachers.items.length });
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Erreur'));
  }

  useEffect(() => {
    load();
  }, []);

  if (error) return <ErrorState message={error} retry={text.retry} onRetry={load} />;
  if (!data) return <LoadingState>{text.loading}</LoadingState>;

  const active = ACTIVE_PICKUP_STATUSES.reduce((sum, status) => sum + (data.counts[status] ?? 0), 0);
  const when = (value: string) => new Date(value).toLocaleString(locale === 'ar' ? 'ar-MA' : 'fr-MA');
  const links = [
    ['/app/students', text.students],
    ...(user?.roles.includes('CENTER_ADMIN') ? [['/app/parents', text.links], ['/app/teachers', text.teachers]] : []),
    ['/app/classes', text.pages['/app/classes']],
    ['/app/schedules', text.pages['/app/schedules']],
  ] as const;

  return (
    <>
      <PageHeader title={`${text.overviewHello}${user ? ` ${user.firstName}` : ''}.`} lede={text.overviewLede} />
      <div className="dk-stats">
        {directory ? <StatCard label={text.students} value={directory.students} /> : null}
        {directory ? <StatCard label={text.links} value={directory.links} accent="blue" /> : null}
        {directory ? <StatCard label={text.teachers} value={directory.teachers} /> : null}
        <StatCard label={text.active} value={active} accent="navy" />
        <StatCard label={text.preparing} value={data.counts.PREPARING ?? 0} />
        <StatCard label={text.ready} value={data.counts.READY ?? 0} accent="lime" />
      </div>
      <div className="dk-grid">
        <section className="dk-panel-card navy">
          <header><h2>{text.overviewQueue}</h2></header>
          <DataTable
            columns={[text.student, text.className, text.status]}
            empty={text.noQueue}
            rows={data.active.map((request) => ({
              id: request.id,
              cells: [request.studentName, request.className ?? text.unavailable, <StatusBadge key={request.id} status={request.status} label={statusLabel(request.status, locale)} />],
            }))}
          />
        </section>
        <section className="dk-panel-card">
          <header><h2>{text.overviewRecent}</h2></header>
          {data.recent.length === 0 ? <EmptyState>{text.noRecent}</EmptyState> : (
            <DataTable
              columns={[text.student, text.status, text.time]}
              empty={text.noRecent}
              rows={data.recent.map((request) => ({
                id: request.id,
                cells: [request.studentName, statusLabel(request.status, locale), when(request.requestedAt)],
              }))}
            />
          )}
        </section>
      </div>
      <section>
        <h2>{text.overviewLinks}</h2>
        <div className="dk-links">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        </div>
      </section>
    </>
  );
}
