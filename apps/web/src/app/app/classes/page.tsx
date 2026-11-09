'use client';

import { Remote } from '@/components/app/loader';

type Course = { id: string; name: string; subject: string | null; room: string | null; students: number; status: string };

export default function ClassesPage() {
  return (
    <Remote<{ items: Course[] }>
      path="/operations/classes"
      render={(data) => (
        <div className="stack">
          <h1>Classes</h1>
          <div className="sheet">
            <table className="table">
              <thead><tr><th>Classe</th><th>Matière</th><th>Salle</th><th>Élèves</th><th>Statut</th></tr></thead>
              <tbody>
                {data.items.length === 0 ? <tr><td className="empty" colSpan={5}>Aucune classe.</td></tr> : null}
                {data.items.map((course) => (
                  <tr key={course.id}>
                    <td>{course.name}</td>
                    <td>{course.subject ?? '—'}</td>
                    <td>{course.room ?? '—'}</td>
                    <td>{course.students}</td>
                    <td>{course.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    />
  );
}
