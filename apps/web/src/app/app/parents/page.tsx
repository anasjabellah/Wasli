'use client';

import { recordLabel } from '@/components/app/labels';
import { Remote } from '@/components/app/loader';
import { useDash } from '@/components/app/locale';
import { DataTable, PageHeader } from '@/components/app/ui';

type ParentLink = {
  id: string;
  parentName: string;
  email: string;
  phone: string | null;
  studentName: string;
  relationship?: string;
  canRequestPickup: boolean;
};

export default function ParentsPage() {
  const { locale, text } = useDash();
  return (
    <Remote<{ items: ParentLink[] }>
      path="/operations/parents"
      render={(data) => (
        <>
          <PageHeader title={text.pages['/app/parents']} />
          <DataTable
            columns={[text.parent, text.student, text.relationship, text.contact, text.canRequest]}
            empty={text.noParents}
            rows={data.items.map((link) => ({
              id: link.id,
              cells: [
                link.parentName,
                link.studentName,
                link.relationship ? recordLabel(link.relationship, locale) : text.unavailable,
                `${link.email}${link.phone ? ` · ${link.phone}` : ''}`,
                link.canRequestPickup ? text.yes : text.no,
              ],
            }))}
          />
        </>
      )}
    />
  );
}
