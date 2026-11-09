'use client';

import type { AccountProfile } from '@wasli/shared';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { clearSession, readSession } from '@/lib/api';

const links = [
  { href: '/app', label: 'Vue d’ensemble', roles: ['CENTER_ADMIN', 'TEACHER', 'RECEPTION'] },
  { href: '/app/pickups', label: 'Récupérations', roles: ['CENTER_ADMIN', 'TEACHER', 'RECEPTION'] },
  { href: '/app/students', label: 'Élèves', roles: ['CENTER_ADMIN', 'TEACHER', 'RECEPTION'] },
  { href: '/app/parents', label: 'Parents', roles: ['CENTER_ADMIN'] },
  { href: '/app/teachers', label: 'Enseignants', roles: ['CENTER_ADMIN'] },
  { href: '/app/classes', label: 'Classes', roles: ['CENTER_ADMIN', 'TEACHER', 'RECEPTION'] },
  { href: '/app/schedules', label: 'Horaires', roles: ['CENTER_ADMIN', 'TEACHER', 'RECEPTION'] },
  { href: '/app/history', label: 'Historique', roles: ['CENTER_ADMIN', 'TEACHER', 'RECEPTION'] },
  { href: '/app/reports', label: 'Rapports', roles: ['CENTER_ADMIN'] },
  { href: '/app/settings', label: 'Réglages', roles: ['CENTER_ADMIN', 'TEACHER', 'RECEPTION', 'PARENT'] },
];

function Icon({ href }: { href: string }) {
  const common = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true };
  if (href.endsWith('/pickups')) {
    return <svg {...common}><path d="M2 4h12M2 8h12M2 12h8" /></svg>;
  }
  if (href.endsWith('/students') || href.endsWith('/parents') || href.endsWith('/teachers')) {
    return <svg {...common}><circle cx="8" cy="5.5" r="2.2" /><path d="M3.5 13c.7-2 2.3-3 4.5-3s3.8 1 4.5 3" /></svg>;
  }
  if (href.endsWith('/history') || href.endsWith('/reports')) {
    return <svg {...common}><path d="M3 13V7M8 13V3M13 13V9" /></svg>;
  }
  if (href.endsWith('/settings')) {
    return <svg {...common}><circle cx="8" cy="8" r="2" /><path d="M8 2.5v1.5M8 12v1.5M2.5 8H4M12 8h1.5M4 4l1 1M11 11l1 1M12 4l-1 1M5 11l-1 1" /></svg>;
  }
  return <svg {...common}><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="9" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="2.5" y="9" width="4.5" height="4.5" rx="1" /><rect x="9" y="9" width="4.5" height="4.5" rx="1" /></svg>;
}

export function AppFrame({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AccountProfile | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    const platformOnly =
      session.user.roles.includes('PLATFORM_ADMIN') &&
      !session.user.roles.some((role) => role === 'CENTER_ADMIN' || role === 'TEACHER' || role === 'RECEPTION' || role === 'PARENT');
    if (platformOnly) {
      router.replace('/platform/centers');
      return;
    }
    setUser(session.user);
  }, [router]);

  if (!user) {
    return <main className="wrap"><p>Chargement…</p></main>;
  }

  const visible = links.filter((link) => link.roles.some((role) => user.roles.includes(role as AccountProfile['roles'][number])));
  const admin = user.roles.includes('CENTER_ADMIN');
  const ordered = admin ? visible : [...visible].sort((left, right) => Number(right.href === '/app/pickups') - Number(left.href === '/app/pickups'));
  const staff = user.roles.some((role) => role === 'CENTER_ADMIN' || role === 'TEACHER' || role === 'RECEPTION');

  return (
    <div className="shell">
      <aside className="side">
        <Link href="/" className="brand"><span className="mark">W</span> Wasli</Link>
        <nav className="side-nav" aria-label="Centre">
          {ordered.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? 'nav-item active' : 'nav-item'}>
              <Icon href={link.href} />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
        <button className="btn ghost side-exit" type="button" onClick={() => { clearSession(); router.replace('/login'); }}>
          Déconnexion
        </button>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <strong>{user.firstName} {user.lastName}</strong>
          <span className="role">{user.roles.join(' · ')}</span>
        </header>
        <section className="main">
          {staff ? children : (
            <article className="card">
              <h1>Application parent</h1>
              <p>Les demandes « Je suis arrivé », le suivi et le code se font dans l’application mobile. Ce tableau de bord est réservé à l’équipe du centre.</p>
            </article>
          )}
        </section>
      </div>
    </div>
  );
}
