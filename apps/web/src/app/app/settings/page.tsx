'use client';

import type { AccountProfile } from '@wasli/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, readSession } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AccountProfile | null>(null);

  useEffect(() => {
    setUser(readSession()?.user ?? null);
  }, []);

  return (
    <div className="stack">
      <h1>Réglages</h1>
      <article className="card">
        <h2>{user ? `${user.firstName} ${user.lastName}` : 'Compte'}</h2>
        <p>{user?.email}</p>
        <p className="note">La création d’élèves, de classes et d’horaires n’a pas encore de formulaire d’écriture. Les listes affichent les enregistrements existants.</p>
        <button className="btn primary" type="button" onClick={() => { clearSession(); router.replace('/login'); }}>Déconnexion</button>
      </article>
    </div>
  );
}
