'use client';

import { useState } from 'react';
import { recordLabel } from '@/components/app/labels';
import { Remote } from '@/components/app/loader';
import { useDash } from '@/components/app/locale';
import { DataTable, PageHeader, SearchBar } from '@/components/app/ui';

type Student = { id: string; firstName: string; lastName: string; status: string; classes: string[] };

export default function StudentsPage() {
  const { locale, text } = useDash();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  return (
    <>
      <PageHeader title={text.pages['/app/students']}>
        <SearchBar label={text.search} placeholder={text.search} value={query} onChange={setQuery} onSubmit={() => setSubmitted(query.trim())} />
      </PageHeader>
      <Remote<{ items: Student[] }>
        path={`/operations/students${submitted ? `?q=${encodeURIComponent(submitted)}` : ''}`}
        render={(data) => (
          <DataTable
            columns={[text.name, text.className, text.status]}
            empty={text.noStudents}
            rows={data.items.map((student) => ({
              id: student.id,
              cells: [`${student.firstName} ${student.lastName}`, student.classes.join(', ') || text.unavailable, recordLabel(student.status, locale)],
            }))}
          />
        )}
      />
    </>
  );
}
