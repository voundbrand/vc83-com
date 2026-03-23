"use client";

import { createContext, useContext, useState } from "react";
import type { CmsContextValue, CmsProviderProps } from "../types";

const CmsContext = createContext<CmsContextValue | null>(null);

export function CmsProvider({
  children,
  transport,
  defaultLocale,
  initialLocale,
  initialEditMode = false,
}: CmsProviderProps) {
  const [locale, setLocale] = useState(initialLocale || defaultLocale);
  const [isEditMode, setEditMode] = useState(initialEditMode);
  const toggleEditMode = () => {
    setEditMode((current) => !current);
  };

  return (
    <CmsContext.Provider
      value={{
        transport,
        locale,
        defaultLocale,
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
