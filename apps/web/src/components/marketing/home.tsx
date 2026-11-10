'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { ApiStatus } from '@/components/ApiStatus';
import './home.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const copy = {
  fr: {
    dir: 'ltr' as const,
    lang: 'العربية',
    menu: 'Menu',
    links: [
      ['Produit', '#produit'],
      ['Parcours', '#parcours'],
      ['Fonctions', '#fonctions'],
      ['Pour les centres', '#centres'],
      ['Contact', '#contact'],
    ],
    login: 'Connexion',
    cta: 'Commencer',
    kicker: 'Récupération des élèves',
    titleA: 'Goodbye Chaos.',
    titleB: 'Hello Smart Pickup.',
    lede: 'Wasli simplifie la sortie des élèves dans les centres de soutien. Parents, enseignants et réception suivent la même file.',
    discover: 'Commencer',
    howCta: 'Voir le parcours',
    note: 'À la sortie',
    file: 'File',
    ready: 'Prêt',
    preparing: 'Préparation',
    code: 'Code',
    caption: 'Composition d’interface. Les prénoms illustrent l’écran et ne sont pas une file en direct.',
    whyTitle: 'Pourquoi Wasli ?',
    why: [
      ['Moins d’attente', 'Le parent annonce son arrivée au lieu d’attendre sans nouvelle.'],
      ['Une file claire', 'Chaque demande a un ordre, une classe et un statut.'],
      ['L’enseignant informé', 'La demande apparaît dans la file de sa classe.'],
      ['Une remise vérifiée', 'Le code n’est montré qu’une fois l’élève prêt.'],
    ],
    exploreTitle: 'Explorer Wasli',
    exploreText: 'Quatre surfaces. Le badge dit ce qui fonctionne aujourd’hui.',
    products: [
      ['Application parent', 'En service', '« Je suis arrivé », suivi du statut, code seulement à l’étape prêt. Le push n’est pas branché.', 'parent'],
      ['Tableau enseignant', 'En service', 'File de ses classes : préparer, retarder avec un motif, marquer prêt.', 'teacher'],
      ['Tableau réception', 'En service', 'File du centre, recherche, et vérification du code avant la sortie.', 'desk'],
      ['Administration', 'Partiel', 'Élèves, parents, classes et historique lus dans la base. La création depuis l’écran n’existe pas encore.', 'admin'],
    ],
    howTitle: 'Cinq étapes, une seule file.',
    steps: [
      ['Le parent arrive.', 'Il ouvre l’application au moment où il est au centre.'],
      ['Il envoie la demande.', '« Je suis arrivé » ouvre une demande sur la séance en cours.'],
      ['L’enseignant est prévenu.', 'La demande entre dans la file de sa classe.'],
      ['L’élève est préparé.', 'L’enseignant prépare, peut signaler un retard, puis marque prêt.'],
      ['La remise est confirmée.', 'Le parent montre le code. L’équipe le vérifie.'],
    ],
    featuresTitle: 'Ce que le centre peut utiliser.',
    features: [
      ['File de récupération', 'En service', 'Une demande active par élève et par séance, ordonnée par le score enregistré.'],
      ['Suivi des demandes', 'Partiel', 'L’application interroge l’API. Socket.IO et le push ne sont pas branchés.'],
      ['Coordination enseignant', 'En service', 'Préparer, retarder et marquer prêt depuis la file de la classe.'],
      ['Réception', 'En service', 'La réception voit la file du centre et confirme la remise.'],
      ['Vérification du code', 'En service', 'Six chiffres, montrés au parent seulement quand l’élève est prêt.'],
      ['Élèves et parents', 'Partiel', 'Les listes affichent les enregistrements existants. L’écriture depuis l’écran n’est pas encore là.'],
    ],
    centersTitle: 'Pour les centres.',
    centers: [
      ['Direction', 'Voit le centre, les liens parents, les classes et les comptages réels.'],
      ['Enseignants', 'Agissent sur leur file sans quitter le rythme de la classe.'],
      ['Réception', 'Surveille la sortie et confirme la remise.'],
      ['Parents', 'Annoncent leur arrivée, suivent le statut, montrent le code.'],
    ],
    close: 'Make Every Pickup Simpler.',
    closeText: 'Ouvrez votre centre et entrez dans le tableau de bord.',
    contactText: 'Écrivez au centre qui vous a ouvert un compte, ou utilisez la connexion si vous en avez déjà un.',
    footerNote: 'Récupération des élèves pour les centres de soutien.',
    privacy: 'Confidentialité',
    terms: 'Conditions',
  },
  ar: {
    dir: 'rtl' as const,
    lang: 'Français',
    menu: 'القائمة',
    links: [
      ['المنتج', '#produit'],
      ['المسار', '#parcours'],
      ['الوظائف', '#fonctions'],
      ['للمراكز', '#centres'],
      ['اتصال', '#contact'],
    ],
    login: 'دخول',
    cta: 'ابدأ',
    kicker: 'استلام التلاميذ',
    titleA: 'Goodbye Chaos.',
    titleB: 'Hello Smart Pickup.',
    lede: 'تنظّم Wasli خروج التلاميذ في مراكز الدعم. الأولياء والمعلمون والاستقبال يتابعون الصف نفسه.',
    discover: 'ابدأ',
    howCta: 'شاهد المسار',
    note: 'عند الخروج',
    file: 'الصف',
    ready: 'جاهز',
    preparing: 'تحضير',
    code: 'الرمز',
    caption: 'تركيب للواجهة. الأسماء توضّح الشاشة وليست صفاً مباشراً.',
    whyTitle: 'لماذا Wasli؟',
    why: [
      ['انتظار أقل', 'يعلن ولي الأمر وصوله بدل الانتظار دون خبر.'],
      ['صف واضح', 'لكل طلب ترتيب وقسم وحالة.'],
      ['المعلم على علم', 'يظهر الطلب في صف قسمه.'],
      ['تسليم متحقق', 'لا يُعرض الرمز إلا حين يصبح التلميذ جاهزاً.'],
    ],
    exploreTitle: 'استكشف Wasli',
    exploreText: 'أربع واجهات. الشارة تبين ما يعمل اليوم.',
    products: [
      ['تطبيق ولي الأمر', 'يعمل', '«لقد وصلت»، تتبع الحالة، والرمز فقط عند الجاهزية. الدفع غير موصول.', 'parent'],
      ['لوحة المعلم', 'يعمل', 'صف أقسامه: تحضير، تأخير بسبب، تعليم جاهز.', 'teacher'],
      ['لوحة الاستقبال', 'يعمل', 'صف المركز، البحث، والتحقق من الرمز قبل الخروج.', 'desk'],
      ['الإدارة', 'جزئي', 'تلاميذ وأولياء وأقسام وسجل من قاعدة البيانات. الإنشاء من الشاشة غير متاح بعد.', 'admin'],
    ],
    howTitle: 'خمس خطوات، وصف واحد.',
    steps: [
      ['يصل ولي الأمر.', 'يفتح التطبيق عندما يكون عند المركز.'],
      ['يرسل الطلب.', '«لقد وصلت» تفتح طلباً على الحصة الجارية.'],
      ['يصل إشعار للمعلم.', 'يدخل الطلب صف قسمه.'],
      ['يُجهَّز التلميذ.', 'يحضّر المعلم، ويمكنه تسجيل تأخير، ثم يعلّم الجاهزية.'],
      ['يُؤكد التسليم.', 'يُظهر ولي الأمر الرمز. يتحقق الفريق منه.'],
    ],
    featuresTitle: 'ما يمكن للمركز استخدامه.',
    features: [
      ['صف الاستلام', 'يعمل', 'طلب نشط واحد لكل تلميذ وحصة، مرتب حسب النقطة المسجلة.'],
      ['متابعة الطلبات', 'جزئي', 'التطبيق يسأل الواجهة. Socket.IO والدفع غير موصولين.'],
      ['تنسيق المعلم', 'يعمل', 'تحضير وتأخير وتعليم جاهز من صف القسم.'],
      ['الاستقبال', 'يعمل', 'يرى الاستقبال صف المركز ويؤكد التسليم.'],
      ['التحقق من الرمز', 'يعمل', 'ستة أرقام تُعرض لولي الأمر فقط عند الجاهزية.'],
      ['التلاميذ والأولياء', 'جزئي', 'القوائم تعرض السجلات الموجودة. الكتابة من الشاشة غير متاحة بعد.'],
    ],
    centersTitle: 'للمراكز.',
    centers: [
      ['الإدارة', 'ترى المركز وروابط الأولياء والأقسام والتعدادات الحقيقية.'],
      ['المعلمون', 'يتصرفون في صفهم دون كسر إيقاع الحصة.'],
      ['الاستقبال', 'يراقب الخروج ويؤكد التسليم.'],
      ['الأولياء', 'يعلنون الوصول، يتتبعون الحالة، ويُظهرون الرمز.'],
    ],
    close: 'Make Every Pickup Simpler.',
    closeText: 'افتح مركزك وادخل إلى لوحة الإدارة.',
    contactText: 'اكتب إلى المركز الذي فتح لك الحساب، أو استخدم الدخول إن كان لديك حساب.',
    footerNote: 'استلام التلاميذ لمراكز الدعم.',
    privacy: 'الخصوصية',
    terms: 'الشروط',
  },
};

function Arrow({ className = 'mh-draw' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 64" aria-hidden="true">
      <path d="M6 44c24-30 42-8 70-22" />
      <path d="M64 14l18 8-16 14" />
    </svg>
  );
}

function InterfaceCard({
  kind,
  locale,
  file,
  ready,
  preparing,
}: {
  kind: 'parent' | 'queue' | 'pin' | 'desk' | 'admin';
  locale: 'fr' | 'ar';
  file: string;
  ready: string;
  preparing: string;
}) {
  const ar = locale === 'ar';
  const klass = ar ? 'رياضيات' : 'Maths 4e';
  if (kind === 'parent') {
    return (
      <article className="mh-card parent">
        <p className="mh-mini">Wasli</p>
        <strong>Amina</strong>
        <span>{klass}</span>
        <em className="mh-pill wait">{preparing}</em>
        <b className="mh-card-action">{ar ? 'لقد وصلت' : 'Je suis arrivé'}</b>
      </article>
    );
  }
  if (kind === 'queue') {
    return (
      <article className="mh-card queue">
        <p className="mh-mini">{file}</p>
        <p className="mh-queue-class">{klass}</p>
        <div className="mh-row"><span>Amina</span><span className="mh-pill">{ready}</span></div>
        <div className="mh-row"><span>Youssef</span><span className="mh-pill wait">{preparing}</span></div>
      </article>
    );
  }
  if (kind === 'desk') {
    return (
      <article className="mh-card desk">
        <p className="mh-mini">{ar ? 'الاستقبال' : 'Réception'}</p>
        <span className="mh-search">{ar ? 'بحث' : 'Recherche'}</span>
        <strong className="mh-dots">••••••</strong>
        <b className="mh-card-action">{ar ? 'تأكيد التسليم' : 'Confirmer la remise'}</b>
      </article>
    );
  }
  if (kind === 'admin') {
    const labels = ar ? ['تلاميذ', 'أولياء', 'أقسام'] : ['Élèves', 'Parents', 'Classes'];
    return (
      <article className="mh-card admin">
        <p className="mh-mini">{ar ? 'الإدارة' : 'Administration'}</p>
        {labels.map((label) => <div className="mh-row" key={label}><span>{label}</span><i /></div>)}
      </article>
    );
  }
  return (
    <article className="mh-card pin">
      <p className="mh-mini">{ar ? 'الاستقبال' : 'Réception'}</p>
      <strong className="mh-dots">••••••</strong>
      <span>{ar ? 'تسليم مؤكد' : 'Remise sécurisée'}</span>
    </article>
  );
}

function FlowPreview({
  kind,
  locale,
  file,
  ready,
  preparing,
}: {
  kind: 'parent' | 'queue' | 'pin';
  locale: 'fr' | 'ar';
  file: string;
  ready: string;
  preparing: string;
}) {
  const ar = locale === 'ar';
  const klass = ar ? 'رياضيات' : 'Maths 4e';
  if (kind === 'parent') {
    return (
      <article className="mh-flow-ui">
        <header className="mh-flow-top"><span className="mh-flow-mark">W</span> Wasli</header>
        <p className="mh-flow-person"><strong>Amina</strong><small>{klass}</small></p>
        <b className="mh-flow-action">{ar ? 'لقد وصلت' : 'Je suis arrivé'}</b>
      </article>
    );
  }
  if (kind === 'queue') {
    return (
      <article className="mh-flow-ui queue">
        <header className="mh-flow-top"><span>{file}</span><b className="mh-flow-count">2</b></header>
        <p className="mh-flow-row"><i className="mh-flow-avatar">A</i><span>Amina<small>{klass}</small></span><em className="mh-flow-pill on">{ready}</em></p>
        <p className="mh-flow-row"><i className="mh-flow-avatar alt">Y</i><span>Youssef<small>{klass}</small></span><em className="mh-flow-pill">{preparing}</em></p>
      </article>
    );
  }
  return (
    <article className="mh-flow-ui pin">
      <header className="mh-flow-top"><span>{ar ? 'الاستقبال' : 'Réception'}</span></header>
      <strong className="mh-flow-code">••••••</strong>
      <span className="mh-flow-secure">{ar ? 'تسليم مؤكد' : 'Remise sécurisée'}</span>
    </article>
  );
}

function Sketch({
  kind,
  locale,
  file,
  ready,
  preparing,
}: {
  kind: string;
  locale: 'fr' | 'ar';
  file: string;
  ready: string;
  preparing: string;
}) {
  const ar = locale === 'ar';
  const klass = ar ? 'رياضيات' : 'Maths 4e';
  if (kind === 'parent') {
    return (
      <div className="mh-phone-stage" aria-hidden="true">
        <span className="mh-orb" />
        <span className="mh-orb alt" />
        <div className="mh-phone">
          <span className="mh-speaker" />
          <article className="mh-show parent">
            <header className="mh-show-top"><span className="mh-show-mark">W</span> Wasli</header>
            <p className="mh-show-person"><strong>Amina</strong><small>{klass}</small></p>
            <em className="mh-show-pill">{preparing}</em>
            <b className="mh-show-action">{ar ? 'لقد وصلت' : 'Je suis arrivé'}</b>
          </article>
        </div>
      </div>
    );
  }
  if (kind === 'teacher') {
    return (
      <article className="mh-show queue" aria-hidden="true">
        <header className="mh-show-top"><span>{file}</span><b className="mh-show-count">2</b></header>
        <p className="mh-show-row"><i>A</i><span>Amina<small>{klass}</small></span><em className="on">{ready}</em></p>
        <p className="mh-show-row"><i className="alt">Y</i><span>Youssef<small>{klass}</small></span><em>{preparing}</em></p>
      </article>
    );
  }
  if (kind === 'desk') {
    return (
      <article className="mh-show desk" aria-hidden="true">
        <header className="mh-show-top"><span>{ar ? 'الاستقبال' : 'Réception'}</span></header>
        <span className="mh-show-search">{ar ? 'بحث' : 'Recherche'}</span>
        <strong className="mh-show-code">••••••</strong>
        <b className="mh-show-action">{ar ? 'تأكيد التسليم' : 'Confirmer la remise'}</b>
      </article>
    );
  }
  const labels = ar ? ['تلاميذ', 'أولياء', 'أقسام'] : ['Élèves', 'Parents', 'Classes'];
  return (
    <article className="mh-show admin" aria-hidden="true">
      <header className="mh-show-top"><span>{ar ? 'الإدارة' : 'Administration'}</span></header>
      {labels.map((label) => <p className="mh-show-row" key={label}><span>{label}</span><i /></p>)}
    </article>
  );
}

function FeaturePreview({
  index,
  locale,
  file,
  ready,
  preparing,
}: {
  index: number;
  locale: 'fr' | 'ar';
  file: string;
  ready: string;
  preparing: string;
}) {
  const ar = locale === 'ar';
  const klass = ar ? 'رياضيات' : 'Maths 4e';
  if (index === 0) {
    return (
      <article className="mh-feat-ui" aria-hidden="true">
        <header className="mh-feat-top"><span>{file}</span><b>2</b></header>
        <p className="mh-feat-row"><i>A</i><span>Amina<small>{klass}</small></span><em className="on">{ready}</em></p>
        <p className="mh-feat-row"><i className="alt">Y</i><span>Youssef<small>{klass}</small></span><em>{preparing}</em></p>
      </article>
    );
  }
  if (index === 1) {
    const steps: Array<[string, string, string]> = ar
      ? [['طلب مستلم', 'مستلم', 'done'], ['التحضير جارٍ', 'جارٍ', 'done'], ['التلميذ جاهز', 'نشط', 'on']]
      : [['Demande reçue', 'Reçue', 'done'], ['Préparation en cours', 'En cours', 'done'], ['Élève prêt', 'Actif', 'on']];
    return (
      <div className="mh-feat-time" aria-hidden="true">
        <span className="mh-feat-line" />
        {steps.map(([label, state, mark]) => (
          <p className={mark} key={label}><i /><span>{label}</span><small>{state}</small></p>
        ))}
      </div>
    );
  }
  if (index === 2) {
    return (
      <article className="mh-feat-board" aria-hidden="true">
        <p className="mh-feat-student"><i>A</i><span>Amina<small>{klass}</small></span><em className="on">{ready}</em></p>
        <div className="mh-feat-actions">
          <span>{ar ? 'تحضير' : 'Préparer'}</span>
          <span>{ar ? 'تأخير' : 'Retard'}</span>
          <span className="on">{ar ? 'جاهز' : 'Prêt'}</span>
        </div>
      </article>
    );
  }
  if (index === 3) {
    return (
      <article className="mh-feat-ui" aria-hidden="true">
        <header className="mh-feat-top"><span>{ar ? 'الاستقبال' : 'Réception'}</span></header>
        <span className="mh-feat-search">{ar ? 'بحث' : 'Recherche'}</span>
        <strong className="mh-feat-dots">••••••</strong>
        <b className="mh-feat-action">{ar ? 'تأكيد التسليم' : 'Confirmer la remise'}</b>
      </article>
    );
  }
  if (index === 4) {
    return (
      <div className="mh-feat-otp" aria-hidden="true">
        <header className="mh-feat-otp-top">
          <i>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l5 2v4.2c0 3.2-2 5.2-5 6.3-3-1.1-5-3.1-5-6.3V3.5z" /></svg>
          </i>
          <span>{ar ? 'الاستقبال' : 'Réception'}</span>
        </header>
        <p className="mh-feat-otp-label">{ar ? 'رمز التسليم' : 'Code de remise'}</p>
        <div className="mh-feat-digits" dir="ltr">
          {Array.from({ length: 6 }, (_, digit) => <b className="mh-feat-digit" key={digit} />)}
        </div>
        <p className="mh-feat-otp-state">{ar ? 'تحقق عند الاستقبال' : 'Contrôle à la réception'}</p>
        <b className="mh-feat-action">{ar ? 'تأكيد التسليم' : 'Confirmer la remise'}</b>
      </div>
    );
  }
  const labels = ar ? ['تلاميذ', 'أولياء', 'أقسام'] : ['Élèves', 'Parents', 'Classes'];
  return (
    <div className="mh-feat-list" aria-hidden="true">
      {labels.map((label) => <p key={label}><span>{label}</span><i /></p>)}
    </div>
  );
}

function Icon({ name }: { name: number }) {
  const common = { width: 26, height: 26, viewBox: '0 0 26 26', fill: 'none', stroke: 'currentColor', strokeWidth: 2 };
  if (name === 0) return <svg {...common}><circle cx="13" cy="13" r="8" /><path d="M13 9v5l3 2" /></svg>;
  if (name === 1) return <svg {...common}><path d="M6 7h14M6 13h14M6 19h9" /></svg>;
  if (name === 2) return <svg {...common}><path d="M6 18V11l7-4 7 4v7" /><path d="M10 18v-4h6v4" /></svg>;
  return <svg {...common}><path d="M13 4l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V7z" /></svg>;
}

export function MarketingHome() {
  const root = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [locale, setLocale] = useState<keyof typeof copy>('fr');
  const text = copy[locale];

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from('.mh-hero-title span', { y: 36, autoAlpha: 0, stagger: 0.08, duration: 0.7, ease: 'power3.out' });
      gsap.from('.mh-hero .mh-card', { y: 22, autoAlpha: 0, stagger: 0.12, duration: 0.65, delay: 0.16, ease: 'power2.out' });
      gsap.from('.mh-stamp, .mh-arrow, .mh-hero-foot', { autoAlpha: 0, y: 12, duration: 0.5, delay: 0.35, ease: 'power2.out' });
      gsap.from('.mh-arrow path', { strokeDashoffset: 160, duration: 0.8, delay: 0.4, ease: 'power2.out' });
      gsap.from('.mh-draw path', {
        strokeDashoffset: 160,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.mh-flow', start: 'top 80%', once: true },
      });
      gsap.to('.mh-drift', { y: -8, duration: 2.6, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.2 });
      const floats: Array<[string, number, string, number]> = [
        ['.mh-hero .mh-tilt.parent', -7, '-=1.2', 3.8],
        ['.mh-hero .mh-tilt.queue', -5, '+=1.1', 4.6],
        ['.mh-hero .mh-tilt.pin', -6, '-=1.1', 3.4],
      ];
      floats.forEach(([target, y, rotation, duration], index) => {
        gsap.to(target, {
          y,
          rotation,
          duration,
          delay: index * 0.35,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });
      ScrollTrigger.batch('.mh-rise', {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.from(batch, { y: 24, autoAlpha: 0, stagger: 0.08, duration: 0.5, ease: 'power2.out' }),
      });
      const featureEnter = { start: 'top 80%', once: true };
      gsap.from('.mh-feat-line', {
        scaleY: 0,
        duration: 0.55,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.mh-feature.f1', ...featureEnter },
      });
      gsap.from('.mh-feat-time p', {
        autoAlpha: 0,
        y: 8,
        stagger: 0.1,
        duration: 0.4,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.mh-feature.f1', ...featureEnter },
      });
      gsap.from('.mh-feat-board .on', {
        autoAlpha: 0.4,
        duration: 0.45,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.mh-feature.f2', ...featureEnter },
      });
      gsap.from('.mh-feat-digit', {
        autoAlpha: 0,
        y: 6,
        stagger: 0.05,
        duration: 0.32,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.mh-feature.f4', ...featureEnter },
      });
    },
    { scope: root, dependencies: [locale], revertOnUpdate: true },
  );

  function closeMenu(): void {
    menuRef.current?.removeAttribute('open');
  }

  return (
    <main ref={root} className={text.dir === 'rtl' ? 'mh rtl' : 'mh'} lang={locale} dir={text.dir}>
      <section className="mh-hero">
        <div className="mh-hero-inner">
          <header className="mh-nav">
            <Link href="/" className="mh-brand"><span className="mh-mark">W</span> Wasli</Link>
            <details className="mh-menu" ref={menuRef}>
              <summary>{text.menu}</summary>
              <nav>
                {text.links.map(([label, href]) => <a key={href} href={href} onClick={closeMenu}>{label}</a>)}
              </nav>
            </details>
            <nav className="mh-links" aria-label="Wasli">
              {text.links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
            </nav>
            <div className="mh-actions">
              <button className="mh-btn ghost" type="button" onClick={() => setLocale(locale === 'fr' ? 'ar' : 'fr')}>{text.lang}</button>
              <Link className="mh-btn ghost" href="/login">{text.login}</Link>
              <Link className="mh-btn solid" href="/register">{text.cta}</Link>
            </div>
          </header>

          <div className="mh-hero-stage">
            <h1 className="mh-hero-title" dir="ltr">
              <span>Goodbye</span>
              <span className="lime">Chaos.</span>
              <span>Hello Smart</span>
              <span className="lime">Pickup.</span>
            </h1>
            <div className="mh-tilt parent">
              <article className="mh-card mh-float parent-ui" aria-hidden="true">
                <header className="mh-device">
                  <span className="mh-device-mark">W</span>
                  <span>Wasli</span>
                  <i className="mh-status-dot" />
                </header>
                <div className="mh-person">
                  <span className="mh-avatar">A</span>
                  <span>
                    <strong>Amina</strong>
                    <small>{locale === 'ar' ? 'رياضيات' : 'Maths 4e'}</small>
                  </span>
                </div>
                <em className="mh-pill wait">{text.preparing}</em>
                <b className="mh-card-action">{locale === 'ar' ? 'لقد وصلت' : 'Je suis arrivé'}</b>
              </article>
            </div>
            <div className="mh-tilt queue">
              <article className="mh-card mh-float queue-ui" aria-hidden="true">
                <header className="mh-device">
                  <span>{text.file}</span>
                  <b>2</b>
                </header>
                <div className="mh-qrow">
                  <span className="mh-avatar">A</span>
                  <span><strong>Amina</strong><small>{locale === 'ar' ? 'رياضيات' : 'Maths 4e'}</small></span>
                  <em className="mh-pill">{text.ready}</em>
                </div>
                <div className="mh-qrow">
                  <span className="mh-avatar alt">Y</span>
                  <span><strong>Youssef</strong><small>{locale === 'ar' ? 'رياضيات' : 'Maths 4e'}</small></span>
                  <em className="mh-pill wait">{text.preparing}</em>
                </div>
              </article>
            </div>
            <div className="mh-tilt pin">
              <article className="mh-card mh-float pin-ui" aria-hidden="true">
                <header className="mh-device">
                  <span className="mh-lock" aria-hidden="true">
                    <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="3" y="7" width="10" height="7" rx="2" fill="currentColor" /></svg>
                  </span>
                  <span>{locale === 'ar' ? 'الاستقبال' : 'Réception'}</span>
                </header>
                <strong className="mh-code">••••••</strong>
                <span className="mh-secure">{locale === 'ar' ? 'تسليم مؤكد' : 'Remise sécurisée'}</span>
              </article>
            </div>
            <svg className="mh-arrow" viewBox="0 0 140 90" aria-hidden="true">
              <path d="M8 62c28-40 48-8 78-28" />
              <path d="M74 22l18 8-16 14" />
            </svg>
            <svg className="mh-arrow alt" viewBox="0 0 140 90" aria-hidden="true">
              <path d="M12 24c22 28 46 8 78 22" />
              <path d="M78 36l16 16-18 4" />
            </svg>
            <p className="mh-stamp">Smart<br />pickup<br />system</p>
            <div className="mh-hero-foot">
              <p className="mh-lede">{text.lede}</p>
              <div className="mh-hero-actions">
                <Link className="mh-btn solid" href="/register">{text.discover}</Link>
                <a className="mh-btn line" href="#parcours">{text.howCta}</a>
              </div>
              <p className="mh-caption">{text.caption}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mh-sheet">
        <div className="mh-sheet-inner">
        <section className="mh-flow" aria-label={locale === 'ar' ? 'مسار الخروج' : 'Parcours de sortie'}>
          <article className="mh-flow-step parent mh-rise">
            <span className="mh-num">01</span>
            <h3>{locale === 'ar' ? 'يصل ولي الأمر.' : 'Le parent arrive.'}</h3>
            <p>{locale === 'ar' ? 'يفتح التطبيق عند المركز.' : 'Il ouvre l’application au centre.'}</p>
            <div className="mh-flow-preview" aria-hidden="true">
              <FlowPreview kind="parent" locale={locale} file={text.file} ready={text.ready} preparing={text.preparing} />
            </div>
          </article>
          <Arrow className="mh-draw to-teacher" />
          <article className="mh-flow-step teacher mh-rise">
            <span className="mh-num">02</span>
            <h3>{locale === 'ar' ? 'يحضّر المعلم.' : "L'enseignant prépare."}</h3>
            <p>{locale === 'ar' ? 'يصل الطلب إلى صف القسم، ثم تُعلَّم الجاهزية.' : 'La demande entre dans sa classe, jusqu’au statut prêt.'}</p>
            <div className="mh-flow-preview" aria-hidden="true">
              <FlowPreview kind="queue" locale={locale} file={text.file} ready={text.ready} preparing={text.preparing} />
            </div>
          </article>
          <Arrow className="mh-draw to-desk" />
          <article className="mh-flow-step desk mh-rise">
            <span className="mh-num">03</span>
            <h3>{locale === 'ar' ? 'يُؤكد التسليم.' : 'La remise est confirmée.'}</h3>
            <p>{locale === 'ar' ? 'يُظهر ولي الأمر الرمز. يتحقق الفريق منه.' : 'Le parent montre le code. L’équipe le vérifie.'}</p>
            <div className="mh-flow-preview" aria-hidden="true">
              <FlowPreview kind="pin" locale={locale} file={text.file} ready={text.ready} preparing={text.preparing} />
            </div>
          </article>
          <p className="mh-flow-note">
            {locale === 'ar'
              ? 'الأسماء توضّح الشاشة وليست صفاً مباشراً.'
              : 'Prénoms d’illustration, pas une file en direct.'}
          </p>
        </section>

        <section className="mh-why" id="pourquoi">
          <div className="mh-why-copy">
            <h2>{text.whyTitle}</h2>
            <p className="mh-script">{text.note}</p>
          </div>
          <div className="mh-benefits">
            {text.why.map(([title, body], index) => (
              <article className={`mh-benefit n${index} mh-rise`} key={title}>
                <div className="mh-benefit-mark">
                  <span className="mh-benefit-index">0{index + 1}</span>
                  <span className="mh-icon" aria-hidden="true"><Icon name={index} /></span>
                </div>
                <div className="mh-benefit-copy">
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mh-block" id="produit">
          <h2>{text.exploreTitle}</h2>
          <p className="mh-sub">{text.exploreText}</p>
          <div className="mh-explore">
            {text.products.map(([title, state, body, kind]) => (
              <article className={`mh-tile ${kind} mh-rise`} key={title}>
                <div className="mh-explore-visual">
                  <Sketch kind={kind} locale={locale} file={text.file} ready={text.ready} preparing={text.preparing} />
                </div>
                <div className="mh-tile-copy">
                  <span className={state === 'Partiel' || state === 'جزئي' ? 'mh-badge partial' : 'mh-badge'}>{state}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mh-block" id="parcours">
          <h2>{text.howTitle}</h2>
          <ol className="mh-steps">
            {text.steps.map(([title, body], index) => (
              <li className="mh-rise" key={title}>
                <strong>0{index + 1}</strong>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mh-block" id="fonctions">
          <h2>{text.featuresTitle}</h2>
          <div className="mh-feature-grid">
            {text.features.map(([title, state, body], index) => (
              <article className={`mh-feature f${index} mh-rise`} key={title}>
                <FeaturePreview index={index} locale={locale} file={text.file} ready={text.ready} preparing={text.preparing} />
                <div className="mh-feat-copy">
                  <span className={state === 'Partiel' || state === 'جزئي' ? 'mh-badge partial' : 'mh-badge'}>{state}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mh-block" id="centres">
          <h2>{text.centersTitle}</h2>
          <div className="mh-roles">
            {text.centers.map(([title, body], index) => (
              <article className={`mh-role r${index} mh-rise`} key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mh-close" id="contact">
          <div className="mh-close-copy">
            <h2 dir="ltr">
              <span>Make Every</span>
              <span className="lime">Pickup</span>
              <span className="lime">Simpler.</span>
            </h2>
            <p>{text.closeText}</p>
            <p>{text.contactText}</p>
            <Link className="mh-btn solid" href="/register">{text.cta}</Link>
          </div>
          <div className="mh-close-art" aria-hidden="true">
            <div className="mh-tilt parent"><div className="mh-drift"><InterfaceCard kind="parent" locale={locale} file={text.file} ready={text.ready} preparing={text.preparing} /></div></div>
            <div className="mh-tilt pin"><div className="mh-drift"><InterfaceCard kind="pin" locale={locale} file={text.file} ready={text.ready} preparing={text.preparing} /></div></div>
          </div>
        </section>

        <footer className="mh-foot">
          <div>
            <Link href="/" className="mh-brand"><span className="mh-mark">W</span> Wasli</Link>
            <p>{text.footerNote}</p>
            <ApiStatus />
          </div>
          <nav aria-label="Wasli">
            {text.links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
            <Link href="/privacy">{text.privacy}</Link>
            <Link href="/terms">{text.terms}</Link>
          </nav>
          <button className="mh-btn line" type="button" onClick={() => setLocale(locale === 'fr' ? 'ar' : 'fr')}>{text.lang}</button>
        </footer>
        </div>
      </div>
    </main>
  );
}
