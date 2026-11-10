'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { login, registerCenter, writeSession, type ApiError } from '@/lib/api';
import '../auth.css';

const copy = {
  fr: {
    dir: 'ltr' as const,
    lang: 'العربية',
    account: 'Déjà un compte ?',
    login: 'Se connecter',
    headline: 'Votre centre, mieux organisé.',
    support: 'Centralisez vos élèves, vos équipes et la sortie des enfants avec Wasli.',
    caption: 'Aperçu d’interface. Les prénoms sont des exemples.',
    file: 'File',
    ready: 'Prêt',
    preparing: 'Préparation',
    klass: 'Maths 4e',
    pickup: 'Sortie',
    pickupBody: 'Amina est prête',
    kicker: 'Inscription',
    title: 'Ouvrir un centre',
    lede: 'Créez votre espace Wasli en quelques étapes.',
    stepCenter: 'Informations du centre',
    stepAdmin: 'Administrateur',
    name: 'Nom du centre',
    centerEmail: 'E-mail du centre',
    phone: 'Téléphone',
    city: 'Ville',
    address: 'Adresse complète',
    first: 'Prénom',
    last: 'Nom',
    email: 'E-mail',
    adminPhone: 'Téléphone (optionnel)',
    password: 'Mot de passe',
    confirm: 'Confirmer le mot de passe',
    show: 'Afficher',
    hide: 'Masquer',
    continue: 'Continuer',
    back: 'Retour',
    submit: 'Créer mon centre',
    sending: 'Création…',
    note: 'Le compte administrateur est créé avec le centre. Le centre est activé dès l’inscription, puis le tableau de bord s’ouvre.',
    requiredField: 'Ce champ est obligatoire.',
    emailInvalid: 'Adresse e-mail invalide.',
    phoneShort: 'Indiquez au moins 8 caractères.',
    tooLong: 'Texte trop long.',
    passwordShort: 'Le mot de passe compte au moins 8 caractères.',
    mismatch: 'Les mots de passe ne correspondent pas.',
    failed: 'Création impossible.',
  },
  ar: {
    dir: 'rtl' as const,
    lang: 'Français',
    account: 'لديك حساب؟',
    login: 'دخول',
    headline: 'مركزك، بتنظيم أفضل.',
    support: 'اجمع تلاميذك وفرقك وخروج الأطفال في Wasli.',
    caption: 'معاينة للواجهة. الأسماء أمثلة.',
    file: 'الصف',
    ready: 'جاهز',
    preparing: 'تحضير',
    klass: 'رياضيات',
    pickup: 'خروج',
    pickupBody: 'أمينة جاهزة',
    kicker: 'تسجيل',
    title: 'فتح مركز',
    lede: 'أنشئ فضاء Wasli في خطوات قليلة.',
    stepCenter: 'معلومات المركز',
    stepAdmin: 'المدير',
    name: 'اسم المركز',
    centerEmail: 'بريد المركز',
    phone: 'الهاتف',
    city: 'المدينة',
    address: 'العنوان الكامل',
    first: 'الاسم',
    last: 'النسب',
    email: 'البريد',
    adminPhone: 'الهاتف (اختياري)',
    password: 'كلمة السر',
    confirm: 'تأكيد كلمة السر',
    show: 'إظهار',
    hide: 'إخفاء',
    continue: 'متابعة',
    back: 'رجوع',
    submit: 'أنشئ مركزي',
    sending: 'جارٍ الإنشاء…',
    note: 'يُنشأ حساب المدير مع المركز. يُفعَّل المركز فور التسجيل، ثم تُفتح لوحة المدير.',
    requiredField: 'هذا الحقل إلزامي.',
    emailInvalid: 'البريد غير صالح.',
    phoneShort: '8 أحرف على الأقل.',
    tooLong: 'النص طويل جدًا.',
    passwordShort: 'كلمة السر من 8 أحرف على الأقل.',
    mismatch: 'كلمتا السر غير متطابقتين.',
    failed: 'تعذر الإنشاء.',
  },
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Reason = 'required' | 'email' | 'phone' | 'long' | 'password' | 'mismatch';
type IssueMap = Partial<Record<keyof Fields, Reason>>;

function bounded(value: string, min: number, max: number): Reason | null {
  const length = value.trim().length;
  if (length < min) return 'required';
  if (length > max) return 'long';
  return null;
}

function emailIssue(value: string): Reason | null {
  const length = value.trim().length;
  if (length < 1) return 'required';
  if (length > 160 || !emailPattern.test(value.trim())) return 'email';
  return null;
}

function phoneIssue(value: string, required: boolean): Reason | null {
  const length = value.trim().length;
  if (length === 0) return required ? 'required' : null;
  if (length < 8) return 'phone';
  if (length > 30) return 'long';
  return null;
}

function issueText(reason: Reason | undefined, text: (typeof copy)[keyof typeof copy]): string | undefined {
  if (reason === 'required') return text.requiredField;
  if (reason === 'email') return text.emailInvalid;
  if (reason === 'phone') return text.phoneShort;
  if (reason === 'long') return text.tooLong;
  if (reason === 'password') return text.passwordShort;
  if (reason === 'mismatch') return text.mismatch;
  return undefined;
}

type Fields = {
  centerName: string;
  centerEmail: string;
  centerPhone: string;
  city: string;
  addressLine: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

const empty: Fields = {
  centerName: '',
  centerEmail: '',
  centerPhone: '',
  city: '',
  addressLine: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

function Field({
  label, value, onChange, message, type = 'text', autoComplete, span = false, dir, reveal,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  message?: string;
  type?: string;
  autoComplete?: string;
  span?: boolean;
  dir?: 'ltr';
  reveal?: { shown: boolean; show: string; hide: string; onToggle: () => void };
}) {
  return (
    <label className={span ? 'ax-span' : undefined}>
      {reveal ? (
        <span className="ax-label-row">
          {label}
          <button className="ax-reveal" type="button" aria-pressed={reveal.shown} onClick={reveal.onToggle}>
            {reveal.shown ? reveal.hide : reveal.show}
          </button>
        </span>
      ) : label}
      <input
        className={message ? 'ax-field invalid' : 'ax-field'}
        type={reveal?.shown ? 'text' : type}
        dir={dir}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={message ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {message ? <small className="ax-hint">{message}</small> : null}
    </label>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<keyof typeof copy>('fr');
  const text = copy[locale];
  const [fields, setFields] = useState<Fields>(empty);
  const [step, setStep] = useState<1 | 2>(1);
  const [issues, setIssues] = useState<IssueMap>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const pendingRef = useRef(false);

  function set(key: keyof Fields, value: string): void {
    setFields((current) => ({ ...current, [key]: value }));
    setIssues((current) => {
      if (!current[key] && key !== 'password') return current;
      const next = { ...current };
      delete next[key];
      if (key === 'password') delete next.confirmPassword;
      return next;
    });
    setError(null);
  }

  function centerIssues(): IssueMap {
    return {
      centerName: bounded(fields.centerName, 2, 120) ?? undefined,
      centerEmail: emailIssue(fields.centerEmail) ?? undefined,
      centerPhone: phoneIssue(fields.centerPhone, true) ?? undefined,
      city: bounded(fields.city, 2, 80) ?? undefined,
      addressLine: fields.addressLine.trim().length > 180 ? 'long' : undefined,
    };
  }

  function adminIssues(): IssueMap {
    const password: Reason | undefined = fields.password.length < 8 ? 'password' : fields.password.length > 128 ? 'long' : undefined;
    const confirm: Reason | undefined = fields.confirmPassword.length < 8
      ? 'password'
      : fields.confirmPassword.length > 128
        ? 'long'
        : fields.password !== fields.confirmPassword
          ? 'mismatch'
          : undefined;
    return {
      firstName: bounded(fields.firstName, 1, 80) ?? undefined,
      lastName: bounded(fields.lastName, 1, 80) ?? undefined,
      email: emailIssue(fields.email) ?? undefined,
      phone: phoneIssue(fields.phone, false) ?? undefined,
      password,
      confirmPassword: confirm,
    };
  }

  function filled(map: IssueMap): IssueMap {
    return Object.fromEntries(Object.entries(map).filter((entry) => entry[1])) as IssueMap;
  }

  function next(): void {
    const problems = filled(centerIssues());
    setIssues(problems);
    if (Object.keys(problems).length > 0) return;
    setError(null);
    setStep(2);
  }

  async function submit(): Promise<void> {
    if (pendingRef.current) return;
    const center = filled(centerIssues());
    if (Object.keys(center).length > 0) {
      setIssues(center);
      setStep(1);
      return;
    }
    const admin = filled(adminIssues());
    setIssues(admin);
    if (Object.keys(admin).length > 0) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const email = fields.email.trim();
      await registerCenter({
        centerName: fields.centerName.trim(),
        centerEmail: fields.centerEmail.trim(),
        centerPhone: fields.centerPhone.trim(),
        city: fields.city.trim(),
        addressLine: fields.addressLine.trim() || undefined,
        firstName: fields.firstName.trim(),
        lastName: fields.lastName.trim(),
        email,
        phone: fields.phone.trim() || undefined,
        password: fields.password,
        confirmPassword: fields.confirmPassword,
      });
      const session = await login(email, fields.password);
      writeSession(session);
      router.push('/app');
    } catch (caught) {
      const failure = caught as ApiError;
      setError(failure instanceof Error ? failure.message : text.failed);
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <main className={text.dir === 'rtl' ? 'ax ax-split rtl' : 'ax ax-split'} lang={locale} dir={text.dir}>
      <aside className="ax-brand">
        <div className="ax-brand-top">
          <Link href="/" className="ax-logo"><span className="ax-mark">W</span> Wasli</Link>
          <button className="ax-lang" type="button" onClick={() => { setLocale(locale === 'fr' ? 'ar' : 'fr'); setError(null); }}>{text.lang}</button>
        </div>
        <div className="ax-brand-body">
        <div className="ax-brand-copy">
          <h1>{text.headline}</h1>
          <p>{text.support}</p>
        </div>
        <div className="ax-stage" aria-hidden="true">
          <article className="ax-queue">
            <header><span>{text.file}</span><b>2</b></header>
            <p className="ax-queue-class">{text.klass}</p>
            <p className="ax-queue-row"><i>A</i><span>Amina<small>{text.klass}</small></span><em className="on">{text.ready}</em></p>
            <p className="ax-queue-row"><i className="alt">Y</i><span>Youssef<small>{text.klass}</small></span><em>{text.preparing}</em></p>
          </article>
          <p className="ax-chip"><i />Amina · {text.ready}</p>
          <article className="ax-pickup">
            <p>{text.pickup}</p>
            <strong>{text.pickupBody}</strong>
            <span>{text.klass}</span>
          </article>
        </div>
        <p className="ax-caption">{text.caption}</p>
        </div>
      </aside>
      <section className="ax-pane">
        <form
          className="ax-onboard"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (step === 1) next();
            else void submit();
          }}
        >
          <div className="ax-onboard-head">
            <p className="ax-kicker ax-onboard-kicker">{text.kicker}</p>
            <p className="ax-account">{text.account} <Link href="/login">{text.login}</Link></p>
          </div>
          <h2>{text.title}</h2>
          <p className="ax-onboard-lede">{text.lede}</p>
          <ol className="ax-steps" data-step={step}>
            <li className={step === 1 ? 'current' : 'done'}>
              <button type="button" aria-current={step === 1 ? 'step' : undefined} onClick={() => { setError(null); setIssues({}); setStep(1); }}>
                <span>01</span>
                {text.stepCenter}
              </button>
            </li>
            <li className={step === 2 ? 'current' : 'upcoming'}>
              <button type="button" aria-current={step === 2 ? 'step' : undefined} disabled={step === 1} onClick={next}>
                <span>02</span>
                {text.stepAdmin}
              </button>
            </li>
          </ol>
          <div className="ax-step-body" key={step}>
          {step === 1 ? (
            <div className="ax-fields">
              <Field span label={text.name} value={fields.centerName} message={issueText(issues.centerName, text)} onChange={(value) => set('centerName', value)} />
              <Field label={text.centerEmail} type="email" dir="ltr" value={fields.centerEmail} message={issueText(issues.centerEmail, text)} onChange={(value) => set('centerEmail', value)} />
              <Field label={text.phone} dir="ltr" value={fields.centerPhone} message={issueText(issues.centerPhone, text)} onChange={(value) => set('centerPhone', value)} />
              <Field label={text.city} value={fields.city} message={issueText(issues.city, text)} onChange={(value) => set('city', value)} />
              <Field label={text.address} value={fields.addressLine} message={issueText(issues.addressLine, text)} onChange={(value) => set('addressLine', value)} />
            </div>
          ) : (
            <div className="ax-fields">
              <Field label={text.first} value={fields.firstName} message={issueText(issues.firstName, text)} autoComplete="given-name" onChange={(value) => set('firstName', value)} />
              <Field label={text.last} value={fields.lastName} message={issueText(issues.lastName, text)} autoComplete="family-name" onChange={(value) => set('lastName', value)} />
              <Field label={text.email} type="email" dir="ltr" value={fields.email} message={issueText(issues.email, text)} autoComplete="username" onChange={(value) => set('email', value)} />
              <Field label={text.adminPhone} dir="ltr" value={fields.phone} message={issueText(issues.phone, text)} onChange={(value) => set('phone', value)} />
              <Field label={text.password} type="password" dir="ltr" value={fields.password} message={issueText(issues.password, text)} autoComplete="new-password" reveal={{ shown: showPassword, show: text.show, hide: text.hide, onToggle: () => setShowPassword((value) => !value) }} onChange={(value) => set('password', value)} />
              <Field label={text.confirm} type="password" dir="ltr" value={fields.confirmPassword} message={issueText(issues.confirmPassword, text)} autoComplete="new-password" reveal={{ shown: showConfirm, show: text.show, hide: text.hide, onToggle: () => setShowConfirm((value) => !value) }} onChange={(value) => set('confirmPassword', value)} />
            </div>
          )}
          </div>
          {error ? <p className="ax-error" role="alert">{error}</p> : null}
          <div className="ax-actions">
            <button className="ax-btn" type="submit" disabled={pending}>{pending ? text.sending : step === 1 ? text.continue : text.submit}</button>
            {step === 2 ? <button className="ax-back" type="button" disabled={pending} onClick={() => { setError(null); setIssues({}); setStep(1); }}>{text.back}</button> : null}
          </div>
          {step === 2 ? <p className="ax-note">{text.note}</p> : null}
        </form>
      </section>
    </main>
  );
}
