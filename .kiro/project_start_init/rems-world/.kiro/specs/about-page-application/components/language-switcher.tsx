"use client";

import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import ReactCountryFlag from "react-country-flag";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  const toggleLanguage = () => {
    setLocale(locale === "en" ? "de" : "en");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="h-9 w-9"
      aria-label={locale === "en" ? "Switch to German" : "Switch to English"}
    >
      <ReactCountryFlag
        countryCode={locale === "en" ? "US" : "DE"}
        svg
        style={{
          width: "1.5em",
          height: "1.5em",
        }}
      />
    </Button>
  );
}
