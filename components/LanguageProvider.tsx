"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type WebLanguage = "en" | "vi";

export const languageOptions: ReadonlyArray<{ value: WebLanguage; label: string; title: string }> = [
  { value: "en", label: "EN", title: "English" },
  { value: "vi", label: "VI", title: "Tiếng Việt" },
];

type LanguageContextValue = {
  language: WebLanguage;
  setLanguage: (language: WebLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANGUAGE_KEY = "mrnine-language";
const LEGACY_LANGUAGE_KEY = "webai-language";

export function LanguageProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [language, setLanguageState] = useState<WebLanguage>(() => {
    if (typeof window === "undefined") {
      return "vi";
    }

    const saved = window.localStorage.getItem(LANGUAGE_KEY) ?? window.localStorage.getItem(LEGACY_LANGUAGE_KEY);
    return saved === "en" || saved === "vi" ? saved : "vi";
  });

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(LANGUAGE_KEY, language);
    window.localStorage.setItem(LEGACY_LANGUAGE_KEY, language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
