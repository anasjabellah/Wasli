'use client';

import { weekdayLabel } from '@/components/app/labels';
import { Remote } from '@/components/app/loader';
import { useDash } from '@/components/app/locale';
import { EmptyState, PageHeader } from '@/components/app/ui';

type Schedule = { id: string; className: string; weekday: string; startTime: string; endTime: string };

const order = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function SchedulesPage() {
  const { locale, text } = useDash();
  return (
    <Remote<{ items: Schedule[] }>
      path="/operations/schedules"
      render={(data) => (
        <>
          <PageHeader title={text.pages['/app/schedules']} lede={text.scheduleNote} />
          {data.items.length === 0 ? <EmptyState>{text.noSchedules}</EmptyState> : (
            <div className="dk-week">
              {order.map((day) => {
                const rows = data.items.filter((item) => item.weekday === day);
                return (
                  <article className="dk-day" key={day}>
                    <b>{weekdayLabel(day, locale)}</b>
                    {rows.length === 0 ? <p>{text.unavailable}</p> : rows.map((row) => (
                      <p key={row.id}>{row.className}<small>{row.startTime} – {row.endTime}</small></p>
                    ))}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    />
  );
}
