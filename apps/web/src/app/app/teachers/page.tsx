'use client';

import { useState } from 'react';
import { recordLabel } from '@/components/app/labels';
import { useDash } from '@/components/app/locale';
import { useAdmin, useRecords } from '@/components/app/records';
import { DataTable, EmptyState, ErrorState, FormDialog, LoadingState, PageHeader, SearchBar } from '@/components/app/ui';

type Teacher = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  classes: { assignmentId: string; classId: string; name: string }[];
};
type Course = { id: string; name: string; status: string };
const blank = { firstName: '', lastName: '', email: '', phone: '', password: '', status: 'ACTIVE' };

export default function TeachersPage() {
  const { locale, text } = useDash();
  const admin = useAdmin();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [classId, setClassId] = useState('');
  const records = useRecords<{ items: Teacher[] }>(`/directory/teachers${submitted ? `?q=${encodeURIComponent(submitted)}` : ''}`);
  const classes = useRecords<{ items: Course[] }>('/directory/classes');

  async function save(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const body = { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone || null, status: form.status, ...(form.password ? { password: form.password } : {}) };
    const ok = await records.mutate(editing ? `/directory/teachers/${editing}` : '/directory/teachers', editing ? 'PATCH' : 'POST', body);
    if (ok) setOpen(false);
  }

  if (admin === null) return <LoadingState>{text.loading}</LoadingState>;
  if (!admin) return <ErrorState message={text.actionFailed} retry={text.retry} onRetry={() => undefined} />;
  if (records.error && !records.data) return <ErrorState message={records.error} retry={text.retry} onRetry={records.reload} />;
  if (!records.data) return <LoadingState>{text.loading}</LoadingState>;

  return (
    <>
      <PageHeader title={text.pages['/app/teachers']} lede={text.writeNote}>
        <button className="dk-btn" type="button" onClick={() => { setEditing(null); setForm(blank); setOpen(true); }}>{text.newTeacher}</button>
      </PageHeader>
      {records.notice ? <p className="dk-note" role="status">{records.notice}</p> : null}
      <SearchBar label={text.search} placeholder={text.search} value={query} onChange={setQuery} onSubmit={() => setSubmitted(query.trim())} />
      {records.data.items.length === 0 ? <EmptyState icon="teachers">{text.noTeachers}</EmptyState> : (
        <DataTable
          columns={[text.name, text.email, text.status, text.assigned, text.actions]}
          empty={text.noTeachers}
          rows={records.data.items.map((teacher) => ({
            id: teacher.id,
            cells: [
              `${teacher.firstName} ${teacher.lastName}`,
              teacher.email,
              recordLabel(teacher.status, locale),
              teacher.classes.map((course) => course.name).join(', ') || text.unavailable,
              <span className="dk-row-actions" key={teacher.id}>
                <button className="dk-btn ghost" type="button" onClick={() => { setEditing(teacher.id); setForm({ firstName: teacher.firstName, lastName: teacher.lastName, email: teacher.email, phone: teacher.phone ?? '', password: '', status: teacher.status }); setOpen(true); }}>{text.edit}</button>
                <button className="dk-btn ghost" type="button" onClick={() => setAssignFor(teacher.id)}>{text.assignClass}</button>
                {teacher.classes.map((course) => (
                  <button key={course.assignmentId} className="dk-btn ghost" type="button" onClick={() => void records.mutate(`/directory/teacher-classes/${course.assignmentId}`, 'DELETE')}>{text.remove} {course.name}</button>
                ))}
              </span>,
            ],
          }))}
        />
      )}
      <FormDialog open={open} title={editing ? text.edit : text.newTeacher} onClose={() => setOpen(false)}>
        <form className="dk-form" onSubmit={save}>
          <label>{text.firstName}<input className="dk-field" required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label>
          <label>{text.lastName}<input className="dk-field" required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label>
          <label>{text.email}<input className="dk-field" type="email" required dir="ltr" disabled={Boolean(editing)} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>{text.phone}<input className="dk-field" dir="ltr" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          {editing ? (
            <label>{text.status}
              <select className="dk-field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="ACTIVE">{recordLabel('ACTIVE', locale)}</option>
                <option value="INACTIVE">{recordLabel('INACTIVE', locale)}</option>
              </select>
            </label>
          ) : <label>{text.password}<input className="dk-field" type="password" minLength={8} required dir="ltr" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>}
          {records.formError ? <p className="dk-error" role="alert">{records.formError}</p> : null}
          <button className="dk-btn" type="submit" disabled={records.pending}>{text.confirm}</button>
        </form>
      </FormDialog>
      <FormDialog open={assignFor !== null} title={text.assignClass} onClose={() => setAssignFor(null)}>
        <form className="dk-form" onSubmit={(event) => {
          event.preventDefault();
          if (!assignFor) return;
          void records.mutate('/directory/teacher-classes', 'POST', { teacherUserId: assignFor, classId }).then((ok) => { if (ok) setAssignFor(null); });
        }}>
          <label>{text.className}
            <select className="dk-field" required value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="">{text.unavailable}</option>
              {classes.data?.items.filter((course) => course.status === 'ACTIVE').map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </select>
          </label>
          {records.formError ? <p className="dk-error" role="alert">{records.formError}</p> : null}
          <button className="dk-btn" type="submit" disabled={records.pending}>{text.confirm}</button>
        </form>
      </FormDialog>
    </>
  );
}
