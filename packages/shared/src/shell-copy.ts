export const shellCopy = {
  fr: {
    product: 'Wasli',
    tagline: 'La récupération des élèves, sans appels ni interruption de cours.',
    foundation:
      'Socle local en place. Les comptes, les classes et le parcours de récupération seront branchés sur cette base.',
    apiUp: 'API disponible',
    apiDown: 'API indisponible',
  },
  ar: {
    product: 'Wasli',
    tagline: 'تنظيم استلام التلاميذ دون اتصالات يدوية أو مقاطعة الحصص.',
    foundation: 'الأساس المحلي جاهز. الحسابات والأقسام ومسار الاستلام سترتبط بهذه القاعدة في المراحل التالية.',
    apiUp: 'واجهة البرمجة متصلة',
    apiDown: 'واجهة البرمجة غير متصلة',
  },
} as const;

export type ShellLocale = keyof typeof shellCopy;
