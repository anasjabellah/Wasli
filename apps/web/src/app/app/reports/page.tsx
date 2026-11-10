'use client';

import { statusLabel } from '@/components/app/labels';
import { Remote } from '@/components/app/loader';
import { useDash } from '@/components/app/locale';
import { EmptyState, PageHeader } from '@/components/app/ui';

export default function ReportsPage() {
  const { locale, text } = useDash();
  return (
    <Remote<{ counts: Record<string, number> }>
      path="/operations/overview"
      render={(data) => {
        const entries = Object.entries(data.counts);
        const max = Math.max(1, ...entries.map(([, count]) => count));
        const empty = entries.every(([, count]) => count === 0);
        return (
          <>
            <PageHeader title={text.pages['/app/reports']} lede={text.reportsNote} />
            {empty ? <EmptyState>{text.noReports}</EmptyState> : (
              <div className="dk-card dk-bars">
                {entries.map(([status, count]) => (
                  <div key={status}>
                    <span>{statusLabel(status, locale)} · {count}</span>
                    <div className="dk-meter"><span style={{ width: `${(count / max) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      }}
    />
  );
}
