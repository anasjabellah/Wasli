'use client';

import { useState } from 'react';
import { weekdayLabel } from '@/components/app/labels';
import { useDash } from '@/components/app/locale';
import { useAdmin, useRecords } from '@/components/app/records';
import { ConfirmationDialog, EmptyState, ErrorState, FormDialog, LoadingState, PageHeader } from '@/components/app/ui';

type Schedule = {
  id: string;
  classId: string;
  className: string;
  weekday: string;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  teachers: string[];
};
type Course = { id: string; name: string; status: string };
const order = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const blank = { classId: '', weekday: 'MONDAY', startTime: '16:00', endTime: '17:30', effectiveFrom: '', effectiveUntil: '' };

export default function SchedulesPage() {
  const { locale, text } = useDash();
  const admin = useAdmin();
  const records = useRecords<{ items: Schedule[] }>('/directory/schedules');
  const classes = useRecords<{ items: Course[] }>('/directory/classes?status=ACTIVE');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [removeId, setRemoveId] = useState<string | null>(null);

  function edit(row?: Schedule): void {
    setEditing(row?.id ?? null);
    setForm(row ? { classId: row.classId, weekday: row.weekday, startTime: row.startTime, endTime: row.endTime, effectiveFrom: row.effectiveFrom, effectiveUntil: row.effectiveUntil ?? '' } : { ...blank, effectiveFrom: new Date().toISOString().slice(0, 10) });
    setOpen(true);
  }

  async function save(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const ok = await records.mutate(editing ? `/directory/schedules/${editing}` : '/directory/schedules', editing ? 'PATCH' : 'POST', {
      classId: form.classId,
      weekday: form.weekday,
      startTime: form.startTime,
      endTime: form.endTime,
      effectiveFrom: form.effectiveFrom,
      effectiveUntil: form.effectiveUntil || null,
    });
    if (ok) setOpen(false);
  }

  if (records.error && !records.data) return <ErrorState message={records.error} retry={text.retry} onRetry={records.reload} />;
  if (!records.data) return <LoadingState>{text.loading}</LoadingState>;

  return (
    <>
      <PageHeader title={text.pages['/app/schedules']} lede={text.scheduleNote}>
        {admin ? <button className="dk-btn" type="button" onClick={() => edit()}>{text.newSchedule}</button> : null}
      </PageHeader>
      {records.notice ? <p className="dk-note" role="status">{records.notice}</p> : null}
      {records.data.items.length === 0 ? <EmptyState icon="schedules">{text.noSchedules}</EmptyState> : (
        <div className="dk-week">
          {order.map((day) => {
            const rows = records.data?.items.filter((item) => item.weekday === day) ?? [];
            return (
              <article className="dk-day" key={day}>
                <b>{weekdayLabel(day, locale)}</b>
                {rows.length === 0 ? <p>{text.unavailable}</p> : rows.map((row) => (
                  <p key={row.id}>
                    {row.className}
                    <small>{row.startTime} – {row.endTime}</small>
                    {row.teachers.length > 0 ? <small>{row.teachers.join(', ')}</small> : null}
                    {admin ? (
                      <span className="dk-row-actions">
                        <button className="dk-btn ghost" type="button" onClick={() => edit(row)}>{text.edit}</button>
                        <button className="dk-btn ghost" type="button" onClick={() => setRemoveId(row.id)}>{text.remove}</button>
                      </span>
                    ) : null}
                  </p>
                ))}
              </article>
            );
          })}
        </div>
      )}
      <FormDialog open={open} title={editing ? text.edit : text.newSchedule} onClose={() => setOpen(false)}>
        <form className="dk-form" onSubmit={save}>
          <label>{text.className}
            <select className="dk-field" required value={form.classId} onChange={(event) => setForm({ ...form, classId: event.target.value })}>
              <option value="">{text.unavailable}</option>
              {classes.data?.items.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </select>
          </label>
          <label>{text.day}
            <select className="dk-field" value={form.weekday} onChange={(event) => setForm({ ...form, weekday: event.target.value })}>
              {order.map((day) => <option key={day} value={day}>{weekdayLabel(day, locale)}</option>)}
            </select>
          </label>
          <label>{text.start}<input className="dk-field" type="time" required dir="ltr" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
          <label>{text.end}<input className="dk-field" type="time" required dir="ltr" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
          <label>{text.effectiveFrom}<input className="dk-field" type="date" required dir="ltr" value={form.effectiveFrom} onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })} /></label>
          <label>{text.effectiveUntil}<input className="dk-field" type="date" dir="ltr" value={form.effectiveUntil} onChange={(event) => setForm({ ...form, effectiveUntil: event.target.value })} /></label>
          {records.formError ? <p className="dk-error" role="alert">{records.formError}</p> : null}
          <button className="dk-btn" type="submit" disabled={records.pending}>{text.confirm}</button>
        </form>
      </FormDialog>
      <ConfirmationDialog
        open={removeId !== null}
        title={text.deleteSchedule}
        body={text.deleteScheduleBody}
        confirmLabel={text.remove}
        cancelLabel={text.cancel}
        onClose={() => setRemoveId(null)}
        onConfirm={() => {
          if (removeId) void records.mutate(`/directory/schedules/${removeId}`, 'DELETE').then((ok) => { if (ok) setRemoveId(null); });
        }}
      />
    </>
  );
}
