"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";

/**
 * TRANSLATION CONTEXT
 *
 * Manages the current locale and provides locale utilities (date/number formatting).
 * Components should use useNamespaceTranslations() hook to load their specific translations.
 *
 * Usage:
 *   const { locale, setLocale } = useTranslation();
 *   const { t } = useNamespaceTranslations("ui.my_component");
 *   <div>{t('ui.my_component.title')}</div>
 */

interface TranslationContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  availableLocales: string[];
  formatDate: (date: Date) => string;
  formatNumber: (num: number) => string;
}

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

const AVAILABLE_LOCALES = ["en", "de", "pl", "es", "fr", "ja"];
const DEFAULT_LOCALE = "en";
export const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  de: "Deutsch",
  pl: "Polski",
  es: "Espanol",
  fr: "Francais",
  ja: "Japanese",
};

export function getLocaleLabel(localeCode: string): string {
  return LOCALE_LABELS[localeCode] || localeCode.toUpperCase();
}

/**
 * Detect browser language and return best match from available locales
 */
function detectBrowserLanguage(): string {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  // Get browser languages in order of preference
  const browserLanguages = navigator.languages || [navigator.language];

  // Try to find exact match first (e.g., "de-DE" -> "de")
  for (const browserLang of browserLanguages) {
    const langCode = browserLang.split("-")[0].toLowerCase();
    if (AVAILABLE_LOCALES.includes(langCode)) {
      return langCode;
    }
  }

  return DEFAULT_LOCALE;
}

interface TranslationProviderProps {
  children: ReactNode;
  /** Optional: Force a specific locale (overrides browser detection and user preferences) */
  forceLocale?: string;
}

export function TranslationProvider({ children, forceLocale }: TranslationProviderProps) {
  const { sessionId } = useAuth();

  // Normalize forceLocale to always be a string (for stable dependency arrays)
  const normalizedForceLocale = forceLocale || "";
  const hasValidForceLocale = normalizedForceLocale !== "" && AVAILABLE_LOCALES.includes(normalizedForceLocale);

  // Initialize with browser language detection (only runs once on mount)
  // If forceLocale is provided, use it directly
  const [locale, setLocaleState] = useState<string>(() => {
    // If forced locale is provided and valid, use it
    if (hasValidForceLocale) {
      return normalizedForceLocale;
    }

    // Server-side: use default
    if (typeof window === "undefined") return DEFAULT_LOCALE;

    // Check localStorage first (user explicitly chose)
    const savedLocale = localStorage.getItem("locale");
    if (savedLocale && AVAILABLE_LOCALES.includes(savedLocale)) {
      return savedLocale;
    }

    // Otherwise detect browser language
    return detectBrowserLanguage();
  });

  // Update locale if forceLocale changes
  useEffect(() => {
    if (hasValidForceLocale) {
      setLocaleState(normalizedForceLocale);
    }
  }, [normalizedForceLocale, hasValidForceLocale]);

  const [isHydrated, setIsHydrated] = useState(false);

  // Load preferences from Convex (only if signed in)
  // @ts-ignore TS2589: Convex generated query type can exceed instantiation depth in this context.
  const getUserPreferencesQuery = (api as any).userPreferences.get;
  const userPrefs = useQuery(
    getUserPreferencesQuery,
    sessionId ? { sessionId } : "skip"
  ) as { language?: string } | undefined;

  const updatePrefs = useMutation(api.userPreferences.update);

  // Load language from Convex when available (signed-in users only)
  // This will override the initial browser/localStorage detection
  // BUT: Skip this if forceLocale is set (checkout-specific override takes priority)
  useEffect(() => {
    // Don't override forced locale with user preferences
    if (hasValidForceLocale) {
      setIsHydrated(true);
      return;
    }

    if (sessionId && userPrefs && !isHydrated) {
      if (userPrefs.language && AVAILABLE_LOCALES.includes(userPrefs.language)) {
        setLocaleState(userPrefs.language);
      }
      setIsHydrated(true);
    } else if (!sessionId && !isHydrated) {
      // Mark as hydrated for non-signed-in users (already set in useState)
      setIsHydrated(true);
    }
  }, [sessionId, userPrefs, isHydrated, hasValidForceLocale]);

  // NOTE: We no longer load translations upfront to avoid Convex's 1024 field limit.
  // Each component should use useNamespaceTranslations() hook to load its own namespace.
  // This context only manages the current locale and provides locale utilities.

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

  // Translation function removed - components should use useNamespaceTranslations() instead

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
    formatDate,
    formatNumber,
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
