'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login, pathForRoles, writeSession, type ApiError } from '@/lib/api';
import '../auth.css';

const copy = {
  fr: {
    dir: 'ltr' as const,
    lang: 'العربية',
    kicker: 'Connexion',
    title: 'Bon retour.',
    lede: 'Connectez-vous pour accéder à votre espace Wasli.',
    formTitle: 'Connexion',
    identifier: 'E-mail ou téléphone',
    password: 'Mot de passe',
    show: 'Afficher',
    hide: 'Masquer',
    submit: 'Se connecter',
    sending: 'Connexion…',
    create: 'Créer un centre',
    invalid: 'Vérifiez l’identifiant et le mot de passe.',
    failed: 'Connexion impossible.',
  },
  ar: {
    dir: 'rtl' as const,
    lang: 'Français',
    kicker: 'دخول',
    title: 'مرحبًا بعودتك.',
    lede: 'سجّل الدخول للوصول إلى فضاء Wasli.',
    formTitle: 'دخول',
    identifier: 'البريد أو الهاتف',
    password: 'كلمة السر',
    show: 'إظهار',
    hide: 'إخفاء',
    submit: 'دخول',
    sending: 'جارٍ الدخول…',
    create: 'فتح مركز',
    invalid: 'تحقق من المعرّف وكلمة السر.',
    failed: 'تعذر الدخول.',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<keyof typeof copy>('fr');
  const text = copy[locale];
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(): Promise<void> {
    if (identifier.trim().length < 3 || password.length < 8) {
      setError(text.invalid);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const session = await login(identifier.trim(), password);
      writeSession(session);
      router.push(pathForRoles(session.user.roles));
    } catch (caught) {
      const failure = caught as ApiError;
      const reason = failure.rejectionReason ? ` ${failure.rejectionReason}` : '';
      setError(failure instanceof Error ? `${failure.message}${reason}` : text.failed);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={text.dir === 'rtl' ? 'ax rtl' : 'ax'} lang={locale} dir={text.dir}>
      <header className="ax-bar">
        <Link href="/" className="ax-logo"><span className="ax-mark">W</span> Wasli</Link>
        <div className="ax-bar-end">
          <button className="ax-lang" type="button" onClick={() => { setLocale(locale === 'fr' ? 'ar' : 'fr'); setError(null); }}>{text.lang}</button>
        </div>
      </header>
      <section className="ax-login">
        <div className="ax-intro">
          <p className="ax-kicker">{text.kicker}</p>
          <h1>{text.title}</h1>
          <p className="ax-lede">{text.lede}</p>
        </div>
        <form className="ax-card" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <h2>{text.formTitle}</h2>
          <label>
            {text.identifier}
            <input className="ax-field" value={identifier} onChange={(event) => { setIdentifier(event.target.value); setError(null); }} autoComplete="username" />
          </label>
          <label>
            <span className="ax-label-row">
              {text.password}
              <button className="ax-reveal" type="button" onClick={() => setShow((value) => !value)}>{show ? text.hide : text.show}</button>
            </span>
            <input className="ax-field" type={show ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }} autoComplete="current-password" />
          </label>
          {error ? <p className="ax-error">{error}</p> : null}
          <button className="ax-btn" type="submit" disabled={pending}>{pending ? text.sending : text.submit}</button>
          <Link className="ax-create" href="/register">{text.create}</Link>
        </form>
      </section>
    </main>
  );
}
