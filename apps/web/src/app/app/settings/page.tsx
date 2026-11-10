'use client';

import type { AccountProfile } from '@wasli/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDash } from '@/components/app/locale';
import { PageHeader } from '@/components/app/ui';
import { clearSession, readSession } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const { text } = useDash();
  const [user, setUser] = useState<AccountProfile | null>(null);

  useEffect(() => {
    setUser(readSession()?.user ?? null);
  }, []);

  return (
    <>
      <PageHeader title={text.pages['/app/settings']} lede={text.writeNote} />
      <article className="dk-card">
        <h2>{user ? `${user.firstName} ${user.lastName}` : text.account}</h2>
        <p className="dk-note">{user?.email}</p>
        <p className="dk-note">{user ? user.roles.map((role) => text.roles[role] ?? role).join(' · ') : null}</p>
        <button className="dk-btn" type="button" onClick={() => { clearSession(); router.replace('/login'); }}>{text.logout}</button>
      </article>
    </>
  );
}
