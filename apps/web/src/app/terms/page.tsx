import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="wrap legal">
      <Link href="/" className="brand"><span className="mark">W</span> Wasli</Link>
      <h1>Conditions</h1>
      <p>L’accès est créé par le centre. Un parent, un enseignant ou la réception utilise le compte qui lui a été ouvert.</p>
      <p>Les textes de la page d’accueil décrivent les écrans présents. Les fonctions marquées « partiel » ne sont pas encore complètes, notamment les notifications instantanées et la création d’horaires depuis l’écran.</p>
      <p><Link href="/">Retour à l’accueil</Link></p>
    </main>
  );
}
