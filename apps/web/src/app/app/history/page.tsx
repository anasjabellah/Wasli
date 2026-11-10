'use client';

import type { StaffPickup } from '@wasli/shared';
import { useMemo, useState } from 'react';
import { statusLabel } from '@/components/app/labels';
import { Remote } from '@/components/app/loader';
import { useDash } from '@/components/app/locale';
import { DataTable, FilterBar, PageHeader, SearchBar } from '@/components/app/ui';

const terminal = ['HANDED_OVER', 'CANCELLED', 'REJECTED', 'EXPIRED'] as const;

export default function HistoryPage() {
  const { locale, text } = useDash();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  return (
    <>
      <PageHeader title={text.pages['/app/history']} lede={text.historyNote}>
        <SearchBar label={text.search} placeholder={text.search} value={query} onChange={setQuery} onSubmit={() => setSubmitted(query.trim())} />
      </PageHeader>
      <FilterBar>
        <label>
          {text.status}
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{text.allStatuses}</option>
            {terminal.map((item) => <option key={item} value={item}>{statusLabel(item, locale)}</option>)}
          </select>
        </label>
        <label>
          {text.from}
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          {text.to}
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </FilterBar>
      <Remote<{ requests: StaffPickup[] }>
        path={`/operations/queue${submitted ? `?q=${encodeURIComponent(submitted)}` : ''}`}
        render={(data) => <HistoryTable requests={data.requests} status={status} from={from} to={to} />}
      />
    </>
  );
}

function HistoryTable({ requests, status, from, to }: { requests: StaffPickup[]; status: string; from: string; to: string }) {
  const { locale, text } = useDash();
  const rows = useMemo(() => requests.filter((request) => {
    if (!terminal.includes(request.status as (typeof terminal)[number])) return false;
    if (status && request.status !== status) return false;
    const day = request.requestedAt.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  }), [requests, status, from, to]);
  return (
    <DataTable
      columns={[text.student, text.className, text.parent, text.status, text.time]}
      empty={text.noHistory}
      rows={rows.map((request) => ({
        id: request.id,
        cells: [
          request.studentName,
          request.className ?? text.unavailable,
          request.parentName,
          statusLabel(request.status, locale),
          new Date(request.requestedAt).toLocaleString(locale === 'ar' ? 'ar-MA' : 'fr-MA'),
        ],
      }))}
    />
  );
}
