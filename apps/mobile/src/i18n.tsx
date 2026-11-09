import { parentCopy, type ParentLocale } from '@wasli/shared';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type LocaleContextValue = {
  locale: ParentLocale;
  setLocale: (locale: ParentLocale) => void;
  toggle: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<ParentLocale>('fr');
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      toggle: () => setLocale((current) => (current === 'fr' ? 'ar' : 'fr')),
    }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error('LocaleProvider is missing');
  }
  return value;
}

export function useCopy() {
  const { locale } = useLocale();
  return parentCopy[locale];
}

export function useDirection() {
  const { locale } = useLocale();
  const isRtl = locale === 'ar';
  return {
    isRtl,
    screen: { direction: isRtl ? 'rtl' : 'ltr' } as const,
    text: {
      writingDirection: isRtl ? 'rtl' : 'ltr',
      textAlign: isRtl ? 'right' : 'left',
    } as const,
    row: { flexDirection: isRtl ? 'row-reverse' : 'row' } as const,
  };
}
