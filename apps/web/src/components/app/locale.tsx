'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { dashCopy, type DashLocale, type DashText } from './copy';

type DashContextValue = {
  locale: DashLocale;
  text: DashText;
  setLocale: (locale: DashLocale) => void;
};

const DashContext = createContext<DashContextValue | null>(null);
const storageKey = 'wasli.dash.locale';

export function DashProvider({ initial, children }: { initial: DashLocale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<DashLocale>(() => {
    if (typeof window === 'undefined') return initial;
    const stored = window.sessionStorage.getItem(storageKey);
    return stored === 'ar' || stored === 'fr' ? stored : initial;
  });

  const value = useMemo<DashContextValue>(
    () => ({
      locale,
      text: dashCopy[locale],
      setLocale: (next) => {
        window.sessionStorage.setItem(storageKey, next);
        setLocaleState(next);
      },
    }),
    [locale],
  );

  return <DashContext.Provider value={value}>{children}</DashContext.Provider>;
}

export function useDash(): DashContextValue {
  const value = useContext(DashContext);
  if (!value) {
    return { locale: 'fr', text: dashCopy.fr, setLocale: () => undefined };
  }
  return value;
}
