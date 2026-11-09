'use client';

import { Remote } from '@/components/app/loader';

type Teacher = { id: string; firstName: string; lastName: string; email: string };

export default function TeachersPage() {
  return (
    <Remote<{ items: Teacher[] }>
      path="/operations/teachers"
      render={(data) => (
        <div className="stack">
          <h1>Enseignants</h1>
          <div className="sheet">
            <table className="table">
              <thead><tr><th>Nom</th><th>E-mail</th></tr></thead>
              <tbody>
                {data.items.length === 0 ? <tr><td className="empty" colSpan={2}>Aucun enseignant.</td></tr> : null}
                {data.items.map((teacher) => (
                  <tr key={teacher.id}><td>{teacher.firstName} {teacher.lastName}</td><td>{teacher.email}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    />
  );
}
