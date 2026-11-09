'use client';

import { Remote } from '@/components/app/loader';

type ParentLink = { id: string; parentName: string; email: string; phone: string | null; studentName: string; canRequestPickup: boolean };

export default function ParentsPage() {
  return (
    <Remote<{ items: ParentLink[] }>
      path="/operations/parents"
      render={(data) => (
        <div className="stack">
          <h1>Parents</h1>
          <div className="sheet">
            <table className="table">
              <thead><tr><th>Parent</th><th>Élève</th><th>Contact</th><th>Peut demander</th></tr></thead>
              <tbody>
                {data.items.length === 0 ? <tr><td className="empty" colSpan={4}>Aucun parent lié.</td></tr> : null}
                {data.items.map((link) => (
                  <tr key={link.id}><td>{link.parentName}</td><td>{link.studentName}</td><td>{link.email}{link.phone ? ` · ${link.phone}` : ''}</td><td>{link.canRequestPickup ? 'Oui' : 'Non'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    />
  );
}
