import { useEffect, useState } from "react";
import type { Locale } from "../content/landing";
import { readStorage, writeStorage } from "../lib/storage";

const LANGUAGE_KEY = "claimguard-language";
const fallbackLocale: Locale = "en";
const locales: Locale[] = ["en", "hi", "ta", "mr"];

export type UseLanguageResult = {
  locale: Locale;
  setLocale: (locale: string) => void;
};

function getInitialLocale(): Locale {
  const stored = readStorage(LANGUAGE_KEY);
  return locales.includes(stored as Locale) ? (stored as Locale) : fallbackLocale;
}

export function useLanguage(): UseLanguageResult {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = (nextLocale: string) => {
    if (locales.includes(nextLocale as Locale)) {
      setLocaleState(nextLocale as Locale);
    }
  };

  useEffect(() => {
    writeStorage(LANGUAGE_KEY, locale);
  }, [locale]);

  return { locale, setLocale };
}
