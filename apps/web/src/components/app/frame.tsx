'use client';

import type { AccountProfile, ParentNotification } from '@wasli/shared';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { clearSession, readSession, staffGet } from '@/lib/api';
import { dashCopy, type DashLocale } from './copy';
import { Icon, type IconName } from './icons';
import { DashProvider, useDash } from './locale';
import { ConfirmationDialog, EmptyState, LoadingState } from './ui';
import './dashboard.css';

const links: { href: string; roles: AccountProfile['roles'][number][]; icon: IconName }[] = [
  { href: '/app', roles: ['CENTER_ADMIN', 'TEACHER', 'RECEPTION'], icon: 'overview' },
  { href: '/app/pickups', roles: ['CENTER_ADMIN', 'TEACHER', 'RECEPTION'], icon: 'pickups' },
  { href: '/app/students', roles: ['CENTER_ADMIN', 'TEACHER', 'RECEPTION'], icon: 'students' },
  { href: '/app/parents', roles: ['CENTER_ADMIN'], icon: 'parents' },
  { href: '/app/teachers', roles: ['CENTER_ADMIN'], icon: 'teachers' },
  { href: '/app/classes', roles: ['CENTER_ADMIN', 'TEACHER', 'RECEPTION'], icon: 'classes' },
  { href: '/app/schedules', roles: ['CENTER_ADMIN', 'TEACHER', 'RECEPTION'], icon: 'schedules' },
  { href: '/app/history', roles: ['CENTER_ADMIN', 'TEACHER', 'RECEPTION'], icon: 'history' },
  { href: '/app/reports', roles: ['CENTER_ADMIN'], icon: 'reports' },
  { href: '/app/settings', roles: ['CENTER_ADMIN', 'TEACHER', 'RECEPTION', 'PARENT'], icon: 'settings' },
];

export function AppFrame({ children }: { children: ReactNode }) {
  const router = useRouter();
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
    return <main className="dk"><LoadingState>{dashCopy.fr.loading}</LoadingState></main>;
  }

  const initial: DashLocale = user.locale === 'ar' ? 'ar' : 'fr';
  return (
    <DashProvider initial={initial}>
      <FrameBody user={user}>{children}</FrameBody>
    </DashProvider>
  );
}

function FrameBody({ user, children }: { user: AccountProfile; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, text, setLocale } = useDash();
  const [navOpen, setNavOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [today, setToday] = useState('');
  const [centerName, setCenterName] = useState('');
  const visible = links.filter((link) => link.roles.some((role) => user.roles.includes(role)));
  const admin = user.roles.includes('CENTER_ADMIN');
  const ordered = admin ? visible : [...visible].sort((left, right) => Number(right.href === '/app/pickups') - Number(left.href === '/app/pickups'));
  const staff = user.roles.some((role) => role === 'CENTER_ADMIN' || role === 'TEACHER' || role === 'RECEPTION');
  const title = text.pages[pathname as keyof typeof text.pages] ?? text.pages['/app'];
  const roleLine = user.roles.map((role) => text.roles[role] ?? role).join(' · ');
  useEffect(() => {
    setToday(new Date().toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'fr-MA', { weekday: 'long', day: 'numeric', month: 'long' }));
  }, [locale]);
  useEffect(() => {
    if (!staff) return;
    const session = readSession();
    if (!session) return;
    const controller = new AbortController();
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/operations/overview`, {
      headers: { accept: 'application/json', authorization: `Bearer ${session.accessToken}` },
      signal: controller.signal,
    })
      .then(async (response) => (response.ok ? response.json() as Promise<{ active: { centerName?: string }[]; recent: { centerName?: string }[] }> : null))
      .then((data) => {
        const named = data ? [...data.active, ...data.recent].find((request) => request.centerName) : undefined;
        if (named?.centerName) setCenterName(named.centerName);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [staff]);
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  function logout(): void {
    clearSession();
    router.replace('/login');
  }

  return (
    <div className={text.dir === 'rtl' ? 'dk rtl' : 'dk'} lang={locale} dir={text.dir} data-nav={navOpen ? 'open' : 'closed'}>
      <button className="dk-scrim" type="button" aria-label={text.closeNav} onClick={() => setNavOpen(false)} />
      <aside className="dk-side">
        <Link href="/app" className="dk-logo" onClick={() => setNavOpen(false)}>
          <span className="dk-mark">W</span>
          <span>Wasli</span>
        </Link>
        <nav className="dk-nav" aria-label={text.navLabel}>
          {ordered.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? 'active' : undefined}
              title={text.pages[link.href as keyof typeof text.pages]}
              onClick={() => setNavOpen(false)}
            >
              <Icon name={link.icon} />
              <span>{text.pages[link.href as keyof typeof text.pages]}</span>
            </Link>
          ))}
        </nav>
        <div className="dk-identity">
          <span className="dk-avatar" aria-hidden="true">{initials}</span>
          <div className="dk-who">
            <strong>{user.firstName} {user.lastName}</strong>
            <span>{roleLine}</span>
          </div>
          <button className="dk-btn ghost" type="button" title={text.logout} onClick={() => setConfirmLogout(true)}>
            <Icon name="logout" size={16} />
            <span>{text.logout}</span>
          </button>
        </div>
      </aside>
      <div className="dk-workspace">
        <header className="dk-top">
          <div className="dk-top-title">
            <button className="dk-icon-btn dk-menu" type="button" aria-label={text.openNav} onClick={() => setNavOpen(true)}>
              <Icon name="menu" />
            </button>
            <div>
              <h2>{title}</h2>
              <small>{[centerName, today].filter(Boolean).join(' · ')}</small>
            </div>
          </div>
          <div className="dk-top-actions">
            <button className="dk-btn ghost dk-lang" type="button" onClick={() => setLocale(locale === 'fr' ? 'ar' : 'fr')}>{text.lang}</button>
            <Notifications label={text.notifications} empty={text.notificationsEmpty} />
            <div className="dk-userchip">
              <span className="dk-avatar" aria-hidden="true">{initials}</span>
              <span className="dk-who">
                <strong>{user.firstName} {user.lastName}</strong>
                <small>{roleLine}</small>
              </span>
            </div>
          </div>
        </header>
        <section className="dk-content">
          {staff ? children : (
            <article className="dk-card">
              <h2>{text.parentOnlyTitle}</h2>
              <p className="dk-note">{text.parentOnly}</p>
            </article>
          )}
        </section>
      </div>
      <ConfirmationDialog
        open={confirmLogout}
        title={text.logoutTitle}
        body={text.logoutBody}
        confirmLabel={text.logout}
        cancelLabel={text.cancel}
        onConfirm={logout}
        onClose={() => setConfirmLogout(false)}
      />
    </div>
  );
}

function Notifications({ label, empty }: { label: string; empty: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ParentNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { locale } = useDash();

  function toggle(): void {
    const next = !open;
    setOpen(next);
    if (!next || items) return;
    staffGet<{ notifications: ParentNotification[] }>('/notifications')
      .then((data) => setItems(data.notifications))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : empty));
  }

  return (
    <div className="dk-popover">
      <button className="dk-icon-btn" type="button" aria-expanded={open} aria-label={label} onClick={toggle}>
        <Icon name="bell" />
      </button>
      {open ? (
        <div className="dk-panel">
          <strong>{label}</strong>
          {error ? <p>{error}</p> : null}
          {!items && !error ? <p>…</p> : null}
          {items && items.length === 0 ? <EmptyState>{empty}</EmptyState> : null}
          {items?.map((item) => (
            <article key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              <p>{new Date(item.createdAt).toLocaleString(locale === 'ar' ? 'ar-MA' : 'fr-MA')}</p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
