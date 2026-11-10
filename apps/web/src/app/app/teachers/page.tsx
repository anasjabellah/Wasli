'use client';

import { Remote } from '@/components/app/loader';
import { useDash } from '@/components/app/locale';
import { DataTable, PageHeader } from '@/components/app/ui';

type Teacher = { id: string; firstName: string; lastName: string; email: string };

export default function TeachersPage() {
  const { text } = useDash();
  return (
    <Remote<{ items: Teacher[] }>
      path="/operations/teachers"
      render={(data) => (
        <>
          <PageHeader title={text.pages['/app/teachers']} lede={text.writeNote} />
          <DataTable
            columns={[text.name, text.email]}
            empty={text.noTeachers}
            rows={data.items.map((teacher) => ({
              id: teacher.id,
              cells: [`${teacher.firstName} ${teacher.lastName}`, teacher.email],
            }))}
          />
        </>
      )}
    />
  );
}
