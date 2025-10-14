"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";

/**
 * TRANSLATION CONTEXT
 *
 * Provides translation functionality throughout the app using the ontology framework.
 * Translations are stored in the `objects` table with type="translation".
 *
 * Usage:
 *   const { t, locale, setLocale } = useTranslation();
 *   <div>{t('desktop.welcome-icon')}</div>
 */

interface TranslationContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  availableLocales: string[];
  t: (key: string, params?: Record<string, string | number> | string) => string;
  formatDate: (date: Date) => string;
  formatNumber: (num: number) => string;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

const AVAILABLE_LOCALES = ["en", "de", "pl", "es", "fr", "ja"];
const DEFAULT_LOCALE = "en";

export function TranslationProvider({ children }: { children: ReactNode }) {
  const { sessionId } = useAuth();
  const [locale, setLocaleState] = useState<string>(DEFAULT_LOCALE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load preferences from Convex (only if signed in)
  const userPrefs = useQuery(
    api.userPreferences.get,
    sessionId ? { sessionId } : "skip"
  );

  const updatePrefs = useMutation(api.userPreferences.update);

  // Load language from Convex when available (signed-in users)
  useEffect(() => {
    if (userPrefs && !isHydrated) {
      if (userPrefs.language && AVAILABLE_LOCALES.includes(userPrefs.language)) {
        setLocaleState(userPrefs.language);
      }
      setIsHydrated(true);
    }
  }, [userPrefs, isHydrated]);

  // Fallback to localStorage if not signed in
  useEffect(() => {
    if (!sessionId && typeof window !== "undefined" && !isHydrated) {
      const savedLocale = localStorage.getItem("locale");
      if (savedLocale && AVAILABLE_LOCALES.includes(savedLocale)) {
        setLocaleState(savedLocale);
      }
      setIsHydrated(true);
    }
  }, [sessionId, isHydrated]);

  // Load all system translations for current locale using ontologyTranslations
  // Returns a key-value map: { "desktop.welcome-icon": "Welcome", ... }
  const translationsMap = useQuery(
    api.ontologyTranslations.getAllTranslations,
    { locale }
  );

  // Set locale and persist to backend or localStorage
  const setLocale = async (newLocale: string) => {
    if (!AVAILABLE_LOCALES.includes(newLocale)) return;

    setLocaleState(newLocale);

    if (sessionId) {
      // Save to Convex if signed in
      try {
        await updatePrefs({ sessionId, language: newLocale });
      } catch (error) {
        console.error("Failed to save language preference:", error);
        // Fallback to localStorage on error
        localStorage.setItem("locale", newLocale);
      }
    } else {
      // Fallback to localStorage if not signed in
      localStorage.setItem("locale", newLocale);
    }
  };

  // Translation function: t('desktop.welcome-icon') => 'Welcome'
  // Supports interpolation: t('welcome', { name: 'John' }) => 'Welcome, John!'
  const t = (key: string, params?: Record<string, string | number> | string): string => {
    // Handle legacy string fallback parameter
    const fallback = typeof params === 'string' ? params : undefined;
    const interpolationParams = typeof params === 'object' ? params : undefined;

    if (!translationsMap) {
      return fallback || key;
    }

    // Look up translation in the key-value map
    // Map structure: { "desktop.welcome-icon": "Welcome", ... }
    let value = translationsMap[key];

    if (!value) {
      // Fallback: return the fallback or key
      return fallback || key;
    }

    // Interpolate parameters if provided
    if (interpolationParams) {
      Object.entries(interpolationParams).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }

    return value;
  };

  // Format date according to locale
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  // Format number according to locale
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(locale).format(num);
  };

  const value: TranslationContextValue = {
    locale,
    setLocale,
    availableLocales: AVAILABLE_LOCALES,
    t,
    formatDate,
    formatNumber,
    isLoading: translationsMap === undefined,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

// Hook to use translation context
export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within TranslationProvider");
  }
  return context;
}
