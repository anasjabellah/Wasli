const labels: Record<string, string> = {
  PENDING: 'En attente',
  SCHEDULED: 'Planifiée',
  NOTIFIED: 'Arrivée signalée',
  PREPARING: 'En préparation',
  READY: 'Prêt',
  HANDED_OVER: 'Remis',
  CANCELLED: 'Annulée',
  REJECTED: 'Refusée',
  EXPIRED: 'Expirée',
};

const arabic: Record<string, string> = {
  PENDING: 'في الانتظار',
  SCHEDULED: 'مجدولة',
  NOTIFIED: 'تم الإبلاغ عن الوصول',
  PREPARING: 'قيد التحضير',
  READY: 'جاهز',
  HANDED_OVER: 'تم التسليم',
  CANCELLED: 'ملغاة',
  REJECTED: 'مرفوضة',
  EXPIRED: 'منتهية',
};

const weekdays: Record<string, { fr: string; ar: string }> = {
  MONDAY: { fr: 'Lundi', ar: 'الاثنين' },
  TUESDAY: { fr: 'Mardi', ar: 'الثلاثاء' },
  WEDNESDAY: { fr: 'Mercredi', ar: 'الأربعاء' },
  THURSDAY: { fr: 'Jeudi', ar: 'الخميس' },
  FRIDAY: { fr: 'Vendredi', ar: 'الجمعة' },
  SATURDAY: { fr: 'Samedi', ar: 'السبت' },
  SUNDAY: { fr: 'Dimanche', ar: 'الأحد' },
};

const records: Record<string, { fr: string; ar: string }> = {
  ACTIVE: { fr: 'Actif', ar: 'نشط' },
  INACTIVE: { fr: 'Inactif', ar: 'غير نشط' },
  ARCHIVED: { fr: 'Archivée', ar: 'مؤرشفة' },
  MOTHER: { fr: 'Mère', ar: 'أم' },
  FATHER: { fr: 'Père', ar: 'أب' },
  GUARDIAN: { fr: 'Tuteur', ar: 'وصي' },
  OTHER: { fr: 'Autre', ar: 'آخر' },
};

export function statusLabel(status: string, locale: 'fr' | 'ar' = 'fr'): string {
  if (locale === 'ar') return arabic[status] ?? status;
  return labels[status] ?? status;
}

export function recordLabel(value: string, locale: 'fr' | 'ar' = 'fr'): string {
  return records[value]?.[locale] ?? value;
}

export function weekdayLabel(value: string, locale: 'fr' | 'ar' = 'fr'): string {
  return weekdays[value]?.[locale] ?? value;
}
