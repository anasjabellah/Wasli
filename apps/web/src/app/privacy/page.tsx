import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="wrap legal">
      <Link href="/" className="brand"><span className="mark">W</span> Wasli</Link>
      <h1>Confidentialité</h1>
      <p>Wasli conserve les comptes, les élèves liés à un parent, les séances et les demandes de récupération dans la base du centre.</p>
      <p>Le code de remise n’est affiché qu’au parent qui a créé la demande, et seulement lorsque l’élève est prêt. Les listes de l’équipe ne contiennent pas ce code.</p>
      <p>Cette page décrit le comportement actuel du logiciel. Elle ne remplace pas une politique déposée par un centre.</p>
      <p><Link href="/">Retour à l’accueil</Link></p>
    </main>
  );
}
