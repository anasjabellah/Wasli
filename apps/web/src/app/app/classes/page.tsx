'use client';

import { recordLabel } from '@/components/app/labels';
import { Remote } from '@/components/app/loader';
import { useDash } from '@/components/app/locale';
import { DataTable, PageHeader } from '@/components/app/ui';

type Course = { id: string; name: string; subject: string | null; room: string | null; students: number; teachers?: number; status: string };

export default function ClassesPage() {
  const { locale, text } = useDash();
  return (
    <Remote<{ items: Course[] }>
      path="/operations/classes"
      render={(data) => (
        <>
          <PageHeader title={text.pages['/app/classes']} />
          <DataTable
            columns={[text.className, text.subject, text.room, text.enrolled, text.teacherCount, text.status]}
            empty={text.noClasses}
            rows={data.items.map((course) => ({
              id: course.id,
              cells: [
                course.name,
                course.subject ?? text.unavailable,
                course.room ?? text.unavailable,
                course.students,
                course.teachers ?? text.unavailable,
                recordLabel(course.status, locale),
              ],
            }))}
          />
        </>
      )}
    />
  );
}
