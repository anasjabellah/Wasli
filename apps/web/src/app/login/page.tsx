'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { login, pathForRoles, writeSession, type ApiError } from '@/lib/api';
import '../auth.css';

const copy = {
  fr: {
    dir: 'ltr' as const,
    lang: 'العربية',
    kicker: 'À la sortie',
    headline: 'La sortie des élèves, enfin organisée.',
    support: 'Parents, enseignants et réception suivent la même file.',
    caption: 'Aperçu d’interface. Les prénoms sont des exemples.',
    file: 'File',
    ready: 'Prêt',
    preparing: 'Préparation',
    klass: 'Maths 4e',
    pickup: 'Sortie',
    pickupBody: 'Amina est prête',
    title: 'Bon retour.',
    lede: 'Connectez-vous pour accéder à votre espace Wasli.',
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
    kicker: 'عند الخروج',
    headline: 'خروج التلاميذ، بتنظيم أخيرًا.',
    support: 'الأولياء والمعلمون والاستقبال يتابعون الصف نفسه.',
    caption: 'معاينة للواجهة. الأسماء أمثلة.',
    file: 'الصف',
    ready: 'جاهز',
    preparing: 'تحضير',
    klass: 'رياضيات',
    pickup: 'خروج',
    pickupBody: 'أمينة جاهزة',
    title: 'مرحبًا بعودتك.',
    lede: 'سجّل الدخول للوصول إلى فضاء Wasli.',
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
  const pendingRef = useRef(false);

  async function submit(): Promise<void> {
    if (pendingRef.current) return;
    if (identifier.trim().length < 3 || password.length < 8) {
      setError(text.invalid);
      return;
    }
    pendingRef.current = true;
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
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <main className={text.dir === 'rtl' ? 'ax ax-gate rtl' : 'ax ax-gate'} lang={locale} dir={text.dir}>
      <aside className="ax-gate-brand">
        <div className="ax-brand-top">
          <Link href="/" className="ax-logo"><span className="ax-mark">W</span> Wasli</Link>
          <button className="ax-lang" type="button" onClick={() => { setLocale(locale === 'fr' ? 'ar' : 'fr'); setError(null); }}>{text.lang}</button>
        </div>
        <div className="ax-gate-main">
          <div className="ax-gate-copy">
            <p className="ax-kicker">{text.kicker}</p>
            <h1>{text.headline}</h1>
            <p className="ax-gate-support">{text.support}</p>
          </div>
          <div className="ax-gate-art">
            <div className="ax-stage" aria-hidden="true">
              <article className="ax-queue">
                <header><span>{text.file}</span><b>2</b></header>
                <p className="ax-queue-class">{text.klass}</p>
                <p className="ax-queue-row"><i>A</i><span>Amina<small>{text.klass}</small></span><em className="on">{text.ready}</em></p>
                <p className="ax-queue-row"><i className="alt">Y</i><span>Youssef<small>{text.klass}</small></span><em>{text.preparing}</em></p>
              </article>
              <svg className="ax-gate-arrow" viewBox="0 0 72 28" aria-hidden="true">
                <path d="M4 14h52M44 6l14 8-14 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <article className="ax-pickup">
                <p>{text.pickup}</p>
                <strong>{text.pickupBody}</strong>
                <span>{text.klass}</span>
              </article>
            </div>
            <p className="ax-caption">{text.caption}</p>
          </div>
        </div>
      </aside>
      <section className="ax-gate-pane">
        <form className="ax-gate-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <h2>{text.title}</h2>
          <p className="ax-lede">{text.lede}</p>
          <label>
            {text.identifier}
            <input className="ax-field" dir="ltr" value={identifier} onChange={(event) => { setIdentifier(event.target.value); setError(null); }} autoComplete="username" />
          </label>
          <label>
            <span className="ax-label-row">
              {text.password}
              <button className="ax-reveal" type="button" aria-pressed={show} onClick={() => setShow((value) => !value)}>{show ? text.hide : text.show}</button>
            </span>
            <input className="ax-field" dir="ltr" type={show ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }} autoComplete="current-password" />
          </label>
          {error ? <p className="ax-error" role="alert">{error}</p> : null}
          <button className="ax-btn" type="submit" disabled={pending}>{pending ? text.sending : text.submit}</button>
          <Link className="ax-create" href="/register">{text.create}</Link>
        </form>
      </section>
    </main>
  );
}
