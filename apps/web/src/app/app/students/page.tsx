'use client';

import { useState } from 'react';
import { recordLabel } from '@/components/app/labels';
import { useDash } from '@/components/app/locale';
import { useAdmin, useRecords } from '@/components/app/records';
import { ConfirmationDialog, DataTable, EmptyState, ErrorState, FilterBar, FormDialog, LoadingState, PageHeader, SearchBar } from '@/components/app/ui';

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  dateOfBirth: string | null;
  notes: string | null;
  classes: { enrollmentId: string; id: string; name: string }[];
  parents: { linkId: string; name: string; relationship: string; email: string; phone: string | null }[];
};
type Course = { id: string; name: string; status: string };

const empty = { firstName: '', lastName: '', dateOfBirth: '', status: 'ACTIVE', notes: '', classId: '' };

export default function StudentsPage() {
  const { locale, text } = useDash();
  const admin = useAdmin();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState('');
  const [classId, setClassId] = useState('');
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Student | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const params = new URLSearchParams();
  if (submitted) params.set('q', submitted);
  if (status) params.set('status', status);
  if (classId) params.set('classId', classId);
  const suffix = params.toString();
  const records = useRecords<{ items: Student[] }>(`/directory/students${suffix ? `?${suffix}` : ''}`);
  const classes = useRecords<{ items: Course[] }>('/directory/classes');

  function edit(student?: Student): void {
    setEditing(student?.id ?? null);
    setForm(student ? { firstName: student.firstName, lastName: student.lastName, dateOfBirth: student.dateOfBirth ?? '', status: student.status, notes: student.notes ?? '', classId: student.classes[0]?.id ?? '' } : empty);
    setOpen(true);
  }

  async function save(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const ok = await records.mutate(editing ? `/directory/students/${editing}` : '/directory/students', editing ? 'PATCH' : 'POST', {
      firstName: form.firstName,
      lastName: form.lastName,
      dateOfBirth: form.dateOfBirth || null,
      status: form.status,
      notes: form.notes || null,
      classId: form.classId || null,
    });
    if (ok) setOpen(false);
  }

  if (records.error && !records.data) return <ErrorState message={records.error} retry={text.retry} onRetry={records.reload} />;
  if (!records.data) return <LoadingState>{text.loading}</LoadingState>;

  return (
    <>
      <PageHeader title={text.pages['/app/students']}>
        {admin ? <button className="dk-btn" type="button" onClick={() => edit()}>{text.newStudent}</button> : null}
      </PageHeader>
      {records.notice ? <p className="dk-note" role="status">{records.notice}</p> : null}
      <FilterBar>
        <SearchBar label={text.search} placeholder={text.search} value={query} onChange={setQuery} onSubmit={() => setSubmitted(query.trim())} />
        <select aria-label={text.status} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{text.allStatuses}</option>
          <option value="ACTIVE">{recordLabel('ACTIVE', locale)}</option>
          <option value="INACTIVE">{recordLabel('INACTIVE', locale)}</option>
        </select>
        <select aria-label={text.className} value={classId} onChange={(event) => setClassId(event.target.value)}>
          <option value="">{text.allClasses}</option>
          {classes.data?.items.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
        </select>
      </FilterBar>
      {records.data.items.length === 0 ? <EmptyState icon="students">{text.noStudents}</EmptyState> : (
        <DataTable
          columns={[text.name, text.className, text.parent, text.status, text.actions]}
          empty={text.noStudents}
          rows={records.data.items.map((student) => ({
            id: student.id,
            cells: [
              `${student.firstName} ${student.lastName}`,
              student.classes.map((course) => course.name).join(', ') || text.unavailable,
              student.parents.map((parent) => parent.name).join(', ') || text.unavailable,
              recordLabel(student.status, locale),
              <span className="dk-row-actions" key={student.id}>
                <button className="dk-btn ghost" type="button" onClick={() => setSelected(student)}>{text.details}</button>
                {admin ? <button className="dk-btn ghost" type="button" onClick={() => edit(student)}>{text.edit}</button> : null}
                {admin ? <button className="dk-btn ghost" type="button" onClick={() => setArchiveId(student.id)}>{text.archive}</button> : null}
              </span>,
            ],
          }))}
        />
      )}
      {selected ? (
        <section className="dk-panel-card">
          <header><h2>{selected.firstName} {selected.lastName}</h2><button className="dk-btn ghost" type="button" onClick={() => setSelected(null)}>{text.cancel}</button></header>
          <p>{text.birth}: {selected.dateOfBirth ?? text.unavailable}</p>
          <p>{text.notes}: {selected.notes || text.unavailable}</p>
          <p>{text.className}: {selected.classes.map((course) => course.name).join(', ') || text.unavailable}</p>
          <p>{text.parent}: {selected.parents.map((parent) => `${parent.name} (${recordLabel(parent.relationship, locale)})`).join(', ') || text.unavailable}</p>
        </section>
      ) : null}
      <FormDialog open={open} title={editing ? text.edit : text.newStudent} onClose={() => setOpen(false)}>
        <form className="dk-form" onSubmit={save}>
          <label>{text.firstName}<input className="dk-field" required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label>
          <label>{text.lastName}<input className="dk-field" required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label>
          <label>{text.birth}<input className="dk-field" type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} /></label>
          <label>{text.status}
            <select className="dk-field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="ACTIVE">{recordLabel('ACTIVE', locale)}</option>
              <option value="INACTIVE">{recordLabel('INACTIVE', locale)}</option>
            </select>
          </label>
          <label>{text.className}
            <select className="dk-field" value={form.classId} onChange={(event) => setForm({ ...form, classId: event.target.value })}>
              <option value="">{text.unavailable}</option>
              {classes.data?.items.filter((course) => course.status === 'ACTIVE').map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </select>
          </label>
          <label>{text.notes}<textarea className="dk-field" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
          {records.formError ? <p className="dk-error" role="alert">{records.formError}</p> : null}
          <button className="dk-btn" type="submit" disabled={records.pending}>{text.confirm}</button>
        </form>
      </FormDialog>
      <ConfirmationDialog
        open={archiveId !== null}
        title={text.archiveStudent}
        body={text.archiveStudentBody}
        confirmLabel={text.archive}
        cancelLabel={text.cancel}
        onClose={() => setArchiveId(null)}
        onConfirm={() => {
          if (archiveId) void records.mutate(`/directory/students/${archiveId}`, 'DELETE').then((ok) => { if (ok) setArchiveId(null); });
        }}
      />
    </>
  );
}
