import de from "./pages.de.json";
import en from "./pages.en.json";

export type PagesTranslations = typeof en;

const _deParityCheck: PagesTranslations = de;
void _deParityCheck;

export const pagesTranslations = {
  en,
  de,
} as const;
