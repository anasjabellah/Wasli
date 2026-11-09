'use client';

import { Remote } from '@/components/app/loader';

type Schedule = { id: string; className: string; weekday: string; startTime: string; endTime: string };

export default function SchedulesPage() {
  return (
    <Remote<{ items: Schedule[] }>
      path="/operations/schedules"
      render={(data) => (
        <div className="stack">
          <h1>Horaires</h1>
          <div className="sheet">
            <table className="table">
              <thead><tr><th>Classe</th><th>Jour</th><th>Début</th><th>Fin</th></tr></thead>
              <tbody>
                {data.items.length === 0 ? <tr><td className="empty" colSpan={4}>Aucun horaire enregistré.</td></tr> : null}
                {data.items.map((schedule) => (
                  <tr key={schedule.id}><td>{schedule.className}</td><td>{schedule.weekday}</td><td>{schedule.startTime}</td><td>{schedule.endTime}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    />
  );
}
