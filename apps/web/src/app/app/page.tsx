'use client';

import { ACTIVE_PICKUP_STATUSES, type StaffPickup } from '@wasli/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { statusLabel } from '@/components/app/labels';
import { useDash } from '@/components/app/locale';
import { EmptyState, ErrorState, LoadingState, PageHeader, StatCard, StatusBadge } from '@/components/app/ui';
import { readSession, staffGet } from '@/lib/api';
import { Icon, type IconName } from '@/components/app/icons';

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
        const summary = await staffGet<{ students: number; links: number; teachers: number }>('/directory/summary');
        setDirectory(summary);
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
  const clock = (value: string) => new Date(value).toLocaleTimeString(locale === 'ar' ? 'ar-MA' : 'fr-MA', { hour: '2-digit', minute: '2-digit' });
  const admin = user?.roles.includes('CENTER_ADMIN') ?? false;
  const shortcuts: { href: string; label: string; icon: IconName }[] = [
    { href: '/app/students', label: text.students, icon: 'students' },
    ...(admin ? [{ href: '/app/parents', label: text.links, icon: 'parents' as const }, { href: '/app/teachers', label: text.teachers, icon: 'teachers' as const }] : []),
    { href: '/app/classes', label: text.pages['/app/classes'], icon: 'classes' },
    { href: '/app/schedules', label: text.pages['/app/schedules'], icon: 'schedules' },
  ];

  return (
    <>
      <PageHeader title={`${text.overviewHello}${user ? ` ${user.firstName}` : ''}.`} lede={text.overviewLede} />
      <div className="dk-stats">
        {directory ? <StatCard label={text.students} value={directory.students} href="/app/students" icon="students" /> : null}
        {directory ? <StatCard label={text.links} value={directory.links} href="/app/parents" icon="parents" accent="blue" /> : null}
        {directory ? <StatCard label={text.teachers} value={directory.teachers} href="/app/teachers" icon="teachers" /> : null}
        <StatCard label={text.active} value={active} href="/app/pickups" icon="pickups" accent="navy" />
        <StatCard label={text.preparing} value={data.counts.PREPARING ?? 0} href="/app/pickups" icon="schedules" />
        <StatCard label={text.ready} value={data.counts.READY ?? 0} href="/app/pickups" icon="check" accent="lime" />
      </div>
      <div className="dk-grid">
        <section className="dk-panel-card navy dk-queue">
          <header>
            <h2>{text.overviewQueue}</h2>
            <b>{active}</b>
          </header>
          {data.active.length === 0 ? <EmptyState icon="pickups">{text.noQueue}</EmptyState> : (
            <ul className="dk-queue-list">
              {data.active.map((request) => (
                <li key={request.id}>
                  <div>
                    <strong>{request.studentName}</strong>
                    <span>{request.className ?? text.unavailable}</span>
                  </div>
                  <span>{request.parentName || text.unavailable}</span>
                  <time dateTime={request.requestedAt}>{clock(request.requestedAt)}</time>
                  <StatusBadge status={request.status} label={statusLabel(request.status, locale)} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="dk-panel-card">
          <header><h2>{text.overviewRecent}</h2></header>
          {data.recent.length === 0 ? <EmptyState icon="history">{text.noRecent}</EmptyState> : (
            <ol className="dk-activity">
              {data.recent.map((request) => (
                <li key={request.id}>
                  <time dateTime={request.requestedAt}>{when(request.requestedAt)}</time>
                  <strong>{request.studentName}</strong>
                  <span>{statusLabel(request.status, locale)}</span>
                  {request.parentName ? <small>{request.parentName}</small> : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      <section>
        <h2>{text.overviewLinks}</h2>
        <div className="dk-links">
          {shortcuts.map((item) => (
            <Link key={item.href} href={item.href}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
