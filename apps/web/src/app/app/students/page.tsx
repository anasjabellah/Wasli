'use client';

import { useState } from 'react';
import { Remote } from '@/components/app/loader';

type Student = { id: string; firstName: string; lastName: string; status: string; classes: string[] };

export default function StudentsPage() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  return (
      <div className="stack">
      <div className="page-head">
        <h1>Élèves</h1>
        <form onSubmit={(event) => { event.preventDefault(); setSubmitted(query.trim()); }}>
          <input className="field" aria-label="Rechercher" value={query} placeholder="Rechercher" onChange={(event) => setQuery(event.target.value)} />
        </form>
      </div>
      <Remote<{ items: Student[] }>
        path={`/operations/students${submitted ? `?q=${encodeURIComponent(submitted)}` : ''}`}
        render={(data) => (
          <div className="sheet">
            <table className="table">
              <thead><tr><th>Nom</th><th>Classe</th><th>Statut</th></tr></thead>
              <tbody>
                {data.items.length === 0 ? <tr><td className="empty" colSpan={3}>Aucun élève.</td></tr> : null}
                {data.items.map((student) => (
                  <tr key={student.id}><td>{student.firstName} {student.lastName}</td><td>{student.classes.join(', ') || '—'}</td><td>{student.status}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      />
    </div>
  );
}
