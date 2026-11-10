'use client';

import { ACTIVE_PICKUP_STATUSES, type StaffPickup } from '@wasli/shared';
import { useState } from 'react';
import { statusLabel } from '@/components/app/labels';
import { Remote } from '@/components/app/loader';
import { useDash } from '@/components/app/locale';
import { EmptyState, FilterBar, PageHeader, SearchBar, StatusBadge } from '@/components/app/ui';
import { readSession, staffPost } from '@/lib/api';

export default function PickupsPage() {
  const { text } = useDash();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [className, setClassName] = useState('');
  return (
    <>
      <PageHeader title={text.pages['/app/pickups']}>
        <SearchBar label={text.search} placeholder={text.search} value={query} onChange={setQuery} onSubmit={() => setSubmitted(query.trim())} />
      </PageHeader>
      <Remote<{ requests: StaffPickup[] }>
        path={`/operations/queue${submitted ? `?q=${encodeURIComponent(submitted)}` : ''}`}
        render={(data, reload) => {
          const active = data.requests.filter((request) => (ACTIVE_PICKUP_STATUSES as readonly string[]).includes(request.status));
          const classes = [...new Set(active.map((request) => request.className).filter((name): name is string => Boolean(name)))];
          const visible = className ? active.filter((request) => request.className === className) : active;
          return (
            <>
              <FilterBar>
                <label>
                  {text.className}
                  <select value={className} onChange={(event) => setClassName(event.target.value)}>
                    <option value="">{text.allClasses}</option>
                    {classes.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
              </FilterBar>
              <Queue requests={visible} reload={reload} />
            </>
          );
        }}
      />
    </>
  );
}

function Queue({ requests, reload }: { requests: StaffPickup[]; reload: () => void }) {
  const { text } = useDash();
  if (requests.length === 0) return <EmptyState>{text.noPickups}</EmptyState>;
  return (
    <div className="dk-stack">
      {requests.map((request) => <RequestCard key={request.id} request={request} reload={reload} />)}
    </div>
  );
}

function RequestCard({ request, reload }: { request: StaffPickup; reload: () => void }) {
  const { locale, text } = useDash();
  const roles = readSession()?.user.roles ?? [];
  const canPrepare = roles.includes('TEACHER') || roles.includes('CENTER_ADMIN');
  const canVerify = canPrepare || roles.includes('RECEPTION');
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const when = (value: string | null) => (value ? new Date(value).toLocaleTimeString(locale === 'ar' ? 'ar-MA' : 'fr-MA') : text.unavailable);

  async function act(path: string, body?: unknown): Promise<void> {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      await staffPost(path, body);
      setPin('');
      reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text.actionFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="dk-panel-card dk-request">
      <div className="dk-request-head">
        <div>
          <h2>{request.studentName}</h2>
          <p className="dk-note">{request.className ?? text.unavailable} · {request.parentName} · {text.arrival} {when(request.requestedAt)} · {text.finish} {when(request.scheduledEndAt)}</p>
        </div>
        <StatusBadge status={request.status} label={statusLabel(request.status, locale)} />
      </div>
      {request.delayReason ? <p className="dk-note">{request.delayReason}</p> : null}
      {message ? <p className="dk-note">{message}</p> : null}
      <div className="dk-actions">
        {canPrepare && request.status === 'NOTIFIED' ? <button className="dk-btn" type="button" disabled={pending} onClick={() => void act(`/pickup-requests/${request.id}/prepare`)}>{text.prepare}</button> : null}
        {canPrepare && (request.status === 'NOTIFIED' || request.status === 'PREPARING') ? (
          <>
            <input className="dk-field" value={reason} placeholder={text.delayPlaceholder} onChange={(event) => setReason(event.target.value)} />
            <button className="dk-btn soft" type="button" disabled={pending} onClick={() => void act(`/pickup-requests/${request.id}/delay`, { reason })}>{text.delay}</button>
          </>
        ) : null}
        {canPrepare && request.status === 'PREPARING' ? <button className="dk-btn" type="button" disabled={pending} onClick={() => void act(`/pickup-requests/${request.id}/ready`)}>{text.markReady}</button> : null}
        {canVerify && request.status === 'READY' ? (
          <>
            <input className="dk-field" value={pin} inputMode="numeric" placeholder={text.pinPlaceholder} onChange={(event) => setPin(event.target.value)} />
            <button className="dk-btn" type="button" disabled={pending} onClick={() => void act(`/pickup-requests/${request.id}/verify-handover`, { pin })}>{text.verify}</button>
          </>
        ) : null}
      </div>
    </article>
  );
}
