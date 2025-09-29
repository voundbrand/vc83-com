"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

// Define translation structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslationValue = any;
type TranslationObject = Record<string, TranslationValue>;

// Language context specifically for applications
interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => TranslationValue;
  translations: TranslationObject;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  translations: {
    en: TranslationObject;
    de: TranslationObject;
  };
  defaultLanguage?: string;
}

export function ApplicationLanguageProvider({
  children,
  translations,
  defaultLanguage = "en",
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState(defaultLanguage);

  const setLanguage = useCallback((lang: string) => {
    if (lang === "en" || lang === "de") {
      setLanguageState(lang);
      // Optionally save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("app-language", lang);
      }
    }
  }, []);

  const t = useCallback(
    (key: string): TranslationValue => {
      const keys = key.split(".");
      let value: TranslationValue = translations[language as "en" | "de"];

      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = (value as Record<string, TranslationValue>)[k];
        } else {
          // Fallback to English if key not found
          value = translations.en;
          for (const fallbackKey of keys) {
            if (value && typeof value === "object" && fallbackKey in value) {
              value = (value as Record<string, TranslationValue>)[fallbackKey];
            } else {
              return key; // Return the key itself if not found
            }
          }
          break;
        }
      }

      // Return the value as is (can be string, array, object, etc.)
      return value;
    },
    [language, translations],
  );

  const contextValue: LanguageContextType = {
    language,
    setLanguage,
    t,
    translations: translations[language as "en" | "de"] || translations.en,
  };

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useApplicationLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useApplicationLanguage must be used within an ApplicationLanguageProvider");
  }
  return context;
}
