'use client';

import { useState } from 'react';
import { recordLabel } from '@/components/app/labels';
import { useDash } from '@/components/app/locale';
import { useAdmin, useRecords } from '@/components/app/records';
import { DataTable, EmptyState, ErrorState, FormDialog, LoadingState, PageHeader, SearchBar } from '@/components/app/ui';

type Child = { linkId: string; studentId: string; studentName: string; relationship: string; canRequestPickup: boolean };
type Parent = { id: string; firstName: string; lastName: string; email: string; phone: string | null; status: string; children: Child[] };
type Student = { id: string; firstName: string; lastName: string };

const blank = { firstName: '', lastName: '', email: '', phone: '', password: '' };

export default function ParentsPage() {
  const { locale, text } = useDash();
  const admin = useAdmin();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const [link, setLink] = useState({ studentId: '', relationship: 'MOTHER', canRequestPickup: true });
  const records = useRecords<{ items: Parent[] }>(`/directory/parents${submitted ? `?q=${encodeURIComponent(submitted)}` : ''}`);
  const students = useRecords<{ items: Student[] }>('/directory/students');

  async function save(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const body = { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone || null, ...(form.password ? { password: form.password } : {}) };
    const ok = await records.mutate(editing ? `/directory/parents/${editing}` : '/directory/parents', editing ? 'PATCH' : 'POST', body);
    if (ok) setOpen(false);
  }

  async function saveLink(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!linkFor) return;
    const ok = await records.mutate('/directory/parent-links', 'POST', { parentUserId: linkFor, studentId: link.studentId, relationship: link.relationship, canRequestPickup: link.canRequestPickup });
    if (ok) setLinkFor(null);
  }

  if (admin === null) return <LoadingState>{text.loading}</LoadingState>;
  if (!admin) return <ErrorState message={text.actionFailed} retry={text.retry} onRetry={() => undefined} />;
  if (records.error && !records.data) return <ErrorState message={records.error} retry={text.retry} onRetry={records.reload} />;
  if (!records.data) return <LoadingState>{text.loading}</LoadingState>;

  return (
    <>
      <PageHeader title={text.pages['/app/parents']}>
        <button className="dk-btn" type="button" onClick={() => { setEditing(null); setForm(blank); setOpen(true); }}>{text.newParent}</button>
      </PageHeader>
      {records.notice ? <p className="dk-note" role="status">{records.notice}</p> : null}
      <SearchBar label={text.search} placeholder={text.search} value={query} onChange={setQuery} onSubmit={() => setSubmitted(query.trim())} />
      {records.data.items.length === 0 ? <EmptyState icon="parents">{text.noParents}</EmptyState> : (
        <DataTable
          columns={[text.parent, text.contact, text.children, text.actions]}
          empty={text.noParents}
          rows={records.data.items.map((parent) => ({
            id: parent.id,
            cells: [
              `${parent.firstName} ${parent.lastName}`,
              `${parent.email}${parent.phone ? ` · ${parent.phone}` : ''}`,
              parent.children.map((child) => `${child.studentName} (${recordLabel(child.relationship, locale)})`).join(', ') || text.unavailable,
              <span className="dk-row-actions" key={parent.id}>
                <button className="dk-btn ghost" type="button" onClick={() => { setEditing(parent.id); setForm({ firstName: parent.firstName, lastName: parent.lastName, email: parent.email, phone: parent.phone ?? '', password: '' }); setOpen(true); }}>{text.edit}</button>
                <button className="dk-btn ghost" type="button" onClick={() => setLinkFor(parent.id)}>{text.linkChild}</button>
                {parent.children.map((child) => (
                  <button key={child.linkId} className="dk-btn ghost" type="button" onClick={() => void records.mutate(`/directory/parent-links/${child.linkId}`, 'DELETE')}>{text.remove} {child.studentName}</button>
                ))}
              </span>,
            ],
          }))}
        />
      )}
      <FormDialog open={open} title={editing ? text.edit : text.newParent} onClose={() => setOpen(false)}>
        <form className="dk-form" onSubmit={save}>
          <label>{text.firstName}<input className="dk-field" required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label>
          <label>{text.lastName}<input className="dk-field" required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label>
          <label>{text.email}<input className="dk-field" type="email" required dir="ltr" value={form.email} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>{text.phone}<input className="dk-field" dir="ltr" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          {editing ? null : <label>{text.password}<input className="dk-field" type="password" minLength={8} dir="ltr" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>}
          {records.formError ? <p className="dk-error" role="alert">{records.formError}</p> : null}
          <button className="dk-btn" type="submit" disabled={records.pending}>{text.confirm}</button>
        </form>
      </FormDialog>
      <FormDialog open={linkFor !== null} title={text.linkChild} onClose={() => setLinkFor(null)}>
        <form className="dk-form" onSubmit={saveLink}>
          <label>{text.student}
            <select className="dk-field" required value={link.studentId} onChange={(event) => setLink({ ...link, studentId: event.target.value })}>
              <option value="">{text.unavailable}</option>
              {students.data?.items.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>)}
            </select>
          </label>
          <label>{text.relationship}
            <select className="dk-field" value={link.relationship} onChange={(event) => setLink({ ...link, relationship: event.target.value })}>
              {['MOTHER', 'FATHER', 'GUARDIAN', 'OTHER'].map((value) => <option key={value} value={value}>{recordLabel(value, locale)}</option>)}
            </select>
          </label>
          <label><input type="checkbox" checked={link.canRequestPickup} onChange={(event) => setLink({ ...link, canRequestPickup: event.target.checked })} /> {text.canRequest}</label>
          {records.formError ? <p className="dk-error" role="alert">{records.formError}</p> : null}
          <button className="dk-btn" type="submit" disabled={records.pending}>{text.confirm}</button>
        </form>
      </FormDialog>
    </>
  );
}
