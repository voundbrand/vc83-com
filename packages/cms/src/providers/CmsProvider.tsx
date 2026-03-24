"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { CmsContextValue, CmsProviderProps } from "../types";

const CmsContext = createContext<CmsContextValue | null>(null);

function normalizeAvailableLocales(
  defaultLocale: string,
  initialLocale: string,
  availableLocales?: string[]
): string[] {
  const uniqueLocales = new Set<string>();
  const orderedLocales: string[] = [];

  const addLocale = (value?: string) => {
    const normalized = value?.trim();
    if (!normalized || uniqueLocales.has(normalized)) {
      return;
    }
    uniqueLocales.add(normalized);
    orderedLocales.push(normalized);
  };

  for (const locale of availableLocales || []) {
    addLocale(locale);
  }

  addLocale(defaultLocale);
  addLocale(initialLocale);

  if (orderedLocales.length === 0) {
    addLocale("en");
  }

  return orderedLocales;
}

export function CmsProvider({
  children,
  transport,
  defaultLocale,
  initialLocale,
  availableLocales,
  initialEditMode = false,
}: CmsProviderProps) {
  const resolvedInitialLocale = initialLocale || defaultLocale;
  const resolvedAvailableLocales = useMemo(
    () =>
      normalizeAvailableLocales(
        defaultLocale,
        resolvedInitialLocale,
        availableLocales
      ),
    [availableLocales, defaultLocale, resolvedInitialLocale]
  );
  const [locale, setLocaleState] = useState(resolvedInitialLocale);
  const [isEditMode, setEditMode] = useState(initialEditMode);

  const setLocale = (nextLocale: string) => {
    const normalized = nextLocale.trim();
    if (!normalized) {
      return;
    }
    setLocaleState(normalized);
  };

  const toggleEditMode = () => {
    setEditMode((current) => !current);
  };

  return (
    <CmsContext.Provider
      value={{
        transport,
        locale,
        defaultLocale,
        availableLocales: resolvedAvailableLocales,
        isEditMode,
        setLocale,
        setEditMode,
        toggleEditMode,
      }}
    >
      {children}
    </CmsContext.Provider>
  );
}

export function useCms(): CmsContextValue {
  const context = useContext(CmsContext);
  if (!context) {
    throw new Error("useCms must be used within a CmsProvider");
  }
  return context;
}
