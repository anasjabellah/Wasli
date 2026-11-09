'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login, registerCenter, writeSession, type ApiError } from '@/lib/api';

const copy = {
  fr: {
    dir: 'ltr' as const,
    lang: 'العربية',
    title: 'Ouvrir un centre',
    lede: 'Le centre est activé dès l’inscription, puis le tableau de bord s’ouvre.',
    center: 'Le centre',
    admin: 'L’administrateur',
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
    submit: 'Créer le centre',
    sending: 'Création…',
    mismatch: 'Les mots de passe ne correspondent pas.',
    required: 'Remplissez les champs obligatoires. Le mot de passe compte au moins 8 caractères.',
  },
  ar: {
    dir: 'rtl' as const,
    lang: 'Français',
    title: 'فتح مركز',
    lede: 'يُفعَّل المركز فور التسجيل، ثم تُفتح لوحة المدير.',
    center: 'المركز',
    admin: 'المدير',
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
    submit: 'إنشاء المركز',
    sending: 'جارٍ الإنشاء…',
    mismatch: 'كلمتا السر غير متطابقتين.',
    required: 'املأ الحقول الإلزامية. كلمة السر من 8 أحرف على الأقل.',
  },
};

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

export default function RegisterPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<keyof typeof copy>('fr');
  const text = copy[locale];
  const [fields, setFields] = useState<Fields>(empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set(key: keyof Fields, value: string): void {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function submit(): Promise<void> {
    const required = [fields.centerName, fields.centerEmail, fields.centerPhone, fields.city, fields.firstName, fields.lastName, fields.email];
    if (required.some((value) => value.trim().length < 2) || fields.password.length < 8) {
      setError(text.required);
      return;
    }
    if (fields.password !== fields.confirmPassword) {
      setError(text.mismatch);
      return;
    }
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
      setError(failure instanceof Error ? failure.message : text.required);
      setPending(false);
    }
  }

  return (
    <main className={text.dir === 'rtl' ? 'wrap rtl' : 'wrap'} lang={locale} dir={text.dir} style={{ paddingTop: 36, paddingBottom: 64 }}>
      <header className="nav">
        <Link href="/" className="brand"><span className="mark">W</span> Wasli</Link>
        <button className="btn ghost" type="button" onClick={() => { setLocale(locale === 'fr' ? 'ar' : 'fr'); setError(null); }}>{text.lang}</button>
      </header>
        <section className="stack">
          <div>
            <p className="kicker">Wasli</p>
            <h1>{text.title}</h1>
            <p className="lede">{text.lede}</p>
          </div>
          <form className="card stack" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <h2>{text.center}</h2>
            <label>{text.name}<input className="field" value={fields.centerName} onChange={(event) => set('centerName', event.target.value)} /></label>
            <label>{text.centerEmail}<input className="field" type="email" value={fields.centerEmail} onChange={(event) => set('centerEmail', event.target.value)} /></label>
            <label>{text.phone}<input className="field" value={fields.centerPhone} onChange={(event) => set('centerPhone', event.target.value)} /></label>
            <label>{text.city}<input className="field" value={fields.city} onChange={(event) => set('city', event.target.value)} /></label>
            <label>{text.address}<input className="field" value={fields.addressLine} onChange={(event) => set('addressLine', event.target.value)} /></label>
            <h2>{text.admin}</h2>
            <label>{text.first}<input className="field" value={fields.firstName} onChange={(event) => set('firstName', event.target.value)} /></label>
            <label>{text.last}<input className="field" value={fields.lastName} onChange={(event) => set('lastName', event.target.value)} /></label>
            <label>{text.email}<input className="field" type="email" value={fields.email} onChange={(event) => set('email', event.target.value)} /></label>
            <label>{text.adminPhone}<input className="field" value={fields.phone} onChange={(event) => set('phone', event.target.value)} /></label>
            <label>{text.password}<input className="field" type="password" value={fields.password} onChange={(event) => set('password', event.target.value)} autoComplete="new-password" /></label>
            <label>{text.confirm}<input className="field" type="password" value={fields.confirmPassword} onChange={(event) => set('confirmPassword', event.target.value)} autoComplete="new-password" /></label>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn primary" type="submit" disabled={pending}>{pending ? text.sending : text.submit}</button>
          </form>
        </section>
    </main>
  );
}
