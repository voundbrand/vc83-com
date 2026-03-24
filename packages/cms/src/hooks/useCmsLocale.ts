import { useCms } from "../providers/CmsProvider";
import type { CmsLocaleState } from "../types";

export function useCmsLocale(): CmsLocaleState {
  const { locale, defaultLocale, availableLocales, setLocale } = useCms();
  return {
    locale,
    defaultLocale,
    availableLocales,
    setLocale,
  };
}
