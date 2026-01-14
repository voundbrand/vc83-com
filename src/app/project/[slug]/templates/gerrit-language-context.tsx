"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Language } from "./gerrit-translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("de");

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "de" ? "en" : "de"));
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Language toggle component
export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-stone-200 text-sm font-medium text-slate-600 hover:bg-stone-50 transition-colors"
      title={language === "de" ? "Switch to English" : "Auf Deutsch wechseln"}
    >
      <span className={language === "de" ? "font-bold text-sky-600" : ""}>DE</span>
      <span className="text-stone-300">/</span>
      <span className={language === "en" ? "font-bold text-sky-600" : ""}>EN</span>
    </button>
  );
}
