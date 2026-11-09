'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login, pathForRoles, writeSession, type ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(): Promise<void> {
    if (identifier.trim().length < 3 || password.length < 8) {
      setError('Vérifiez l’identifiant et le mot de passe.');
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
      setError(failure instanceof Error ? `${failure.message}${reason}` : 'Connexion impossible.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="wrap auth" style={{ paddingTop: 48 }}>
      <Link href="/" className="brand"><span className="mark">W</span> Wasli</Link>
      <section className="hero">
        <div>
          <p className="kicker">Connexion</p>
          <h1>Bon retour.</h1>
          <p className="lede">E-mail ou téléphone, puis le mot de passe du compte créé par le centre.</p>
        </div>
        <form className="card stack" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <label>E-mail ou téléphone<input className="field" value={identifier} onChange={(event) => { setIdentifier(event.target.value); setError(null); }} autoComplete="username" /></label>
          <label>Mot de passe<input className="field" type={show ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }} autoComplete="current-password" /></label>
          <button className="btn ghost" type="button" onClick={() => setShow((value) => !value)}>{show ? 'Masquer' : 'Afficher'}</button>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn primary" type="submit" disabled={pending}>{pending ? 'Connexion…' : 'Se connecter'}</button>
          <Link href="/register">Créer un centre</Link>
        </form>
      </section>
    </main>
  );
}
