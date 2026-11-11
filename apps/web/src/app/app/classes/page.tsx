'use client';

import { useState } from 'react';
import { recordLabel } from '@/components/app/labels';
import { useDash } from '@/components/app/locale';
import { useAdmin, useRecords } from '@/components/app/records';
import { ConfirmationDialog, DataTable, EmptyState, ErrorState, FilterBar, FormDialog, LoadingState, PageHeader, SearchBar } from '@/components/app/ui';

type Course = {
  id: string;
  name: string;
  subject: string | null;
  room: string | null;
  status: string;
  students: { enrollmentId: string; studentId: string; name: string }[];
  teachers: { assignmentId: string; teacherUserId: string; name: string }[];
};
type Student = { id: string; firstName: string; lastName: string };
type Teacher = { id: string; firstName: string; lastName: string; status: string };
const blank = { name: '', subject: '', room: '' };

export default function ClassesPage() {
  const { locale, text } = useDash();
  const admin = useAdmin();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [target, setTarget] = useState<Course | null>(null);
  const [studentId, setStudentId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const params = new URLSearchParams();
  if (submitted) params.set('q', submitted);
  if (status) params.set('status', status);
  const records = useRecords<{ items: Course[] }>(`/directory/classes${params.toString() ? `?${params}` : ''}`);
  const students = useRecords<{ items: Student[] }>(admin ? '/directory/students' : '/operations/students');
  const teachers = useRecords<{ items: Teacher[] }>(admin ? '/directory/teachers' : '/operations/teachers');

  async function save(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const body = { name: form.name, subject: form.subject || null, room: form.room || null };
    const ok = await records.mutate(editing ? `/directory/classes/${editing}` : '/directory/classes', editing ? 'PATCH' : 'POST', body);
    if (ok) setOpen(false);
  }

  if (records.error && !records.data) return <ErrorState message={records.error} retry={text.retry} onRetry={records.reload} />;
  if (!records.data) return <LoadingState>{text.loading}</LoadingState>;

  return (
    <>
      <PageHeader title={text.pages['/app/classes']}>
        {admin ? <button className="dk-btn" type="button" onClick={() => { setEditing(null); setForm(blank); setOpen(true); }}>{text.newClass}</button> : null}
      </PageHeader>
      {records.notice ? <p className="dk-note" role="status">{records.notice}</p> : null}
      <FilterBar>
        <SearchBar label={text.search} placeholder={text.search} value={query} onChange={setQuery} onSubmit={() => setSubmitted(query.trim())} />
        <select aria-label={text.status} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{text.allStatuses}</option>
          <option value="ACTIVE">{recordLabel('ACTIVE', locale)}</option>
          <option value="ARCHIVED">{recordLabel('ARCHIVED', locale)}</option>
        </select>
      </FilterBar>
      {records.data.items.length === 0 ? <EmptyState icon="classes">{text.noClasses}</EmptyState> : (
        <DataTable
          columns={[text.className, text.subject, text.room, text.enrolled, text.teacherCount, text.status, text.actions]}
          empty={text.noClasses}
          rows={records.data.items.map((course) => ({
            id: course.id,
            cells: [
              course.name,
              course.subject ?? text.unavailable,
              course.room ?? text.unavailable,
              course.students.map((student) => student.name).join(', ') || '0',
              course.teachers.map((teacher) => teacher.name).join(', ') || '0',
              recordLabel(course.status, locale),
              admin ? (
                <span className="dk-row-actions" key={course.id}>
                  <button className="dk-btn ghost" type="button" onClick={() => { setEditing(course.id); setForm({ name: course.name, subject: course.subject ?? '', room: course.room ?? '' }); setOpen(true); }}>{text.edit}</button>
                  <button className="dk-btn ghost" type="button" onClick={() => setTarget(course)}>{text.details}</button>
                  {course.status === 'ACTIVE' ? <button className="dk-btn ghost" type="button" onClick={() => setArchiveId(course.id)}>{text.archive}</button> : null}
                </span>
              ) : text.unavailable,
            ],
          }))}
        />
      )}
      <FormDialog open={open} title={editing ? text.edit : text.newClass} onClose={() => setOpen(false)}>
        <form className="dk-form" onSubmit={save}>
          <label>{text.name}<input className="dk-field" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>{text.subject}<input className="dk-field" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label>
          <label>{text.room}<input className="dk-field" value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} /></label>
          {records.formError ? <p className="dk-error" role="alert">{records.formError}</p> : null}
          <button className="dk-btn" type="submit" disabled={records.pending}>{text.confirm}</button>
        </form>
      </FormDialog>
      <FormDialog open={target !== null} title={target?.name ?? text.details} onClose={() => setTarget(null)}>
        {target ? (
          <div className="dk-form">
            <p>{text.enrolled}: {target.students.map((student) => student.name).join(', ') || text.unavailable}</p>
            <p>{text.teachers}: {target.teachers.map((teacher) => teacher.name).join(', ') || text.unavailable}</p>
            <form className="dk-form" onSubmit={(event) => {
              event.preventDefault();
              void records.mutate('/directory/enrollments', 'POST', { classId: target.id, studentId }).then((ok) => { if (ok) setTarget(null); });
            }}>
              <label>{text.enroll}
                <select className="dk-field" required value={studentId} onChange={(event) => setStudentId(event.target.value)}>
                  <option value="">{text.unavailable}</option>
                  {students.data?.items.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>)}
                </select>
              </label>
              <button className="dk-btn" type="submit" disabled={records.pending}>{text.confirm}</button>
            </form>
            <form className="dk-form" onSubmit={(event) => {
              event.preventDefault();
              void records.mutate('/directory/teacher-classes', 'POST', { classId: target.id, teacherUserId: teacherId }).then((ok) => { if (ok) setTarget(null); });
            }}>
              <label>{text.assignTeacher}
                <select className="dk-field" required value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
                  <option value="">{text.unavailable}</option>
                  {teachers.data?.items.filter((teacher) => teacher.status !== 'INACTIVE').map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</option>)}
                </select>
              </label>
              <button className="dk-btn" type="submit" disabled={records.pending}>{text.confirm}</button>
            </form>
            {target.students.map((student) => (
              <button key={student.enrollmentId} className="dk-btn ghost" type="button" onClick={() => void records.mutate(`/directory/enrollments/${student.enrollmentId}`, 'DELETE').then((ok) => { if (ok) setTarget(null); })}>{text.remove} {student.name}</button>
            ))}
            {records.formError ? <p className="dk-error" role="alert">{records.formError}</p> : null}
          </div>
        ) : null}
      </FormDialog>
      <ConfirmationDialog
        open={archiveId !== null}
        title={text.archiveClass}
        body={text.archiveClassBody}
        confirmLabel={text.archive}
        cancelLabel={text.cancel}
        onClose={() => setArchiveId(null)}
        onConfirm={() => {
          if (archiveId) void records.mutate(`/directory/classes/${archiveId}/archive`, 'POST', {}).then((ok) => { if (ok) setArchiveId(null); });
        }}
      />
    </>
  );
}
