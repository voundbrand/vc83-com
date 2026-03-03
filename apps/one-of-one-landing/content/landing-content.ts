import de from "./landing.de.json";
import en from "./landing.en.json";

export type LandingTranslations = typeof en;

const _deParityCheck: LandingTranslations = de;
void _deParityCheck;

export const landingTranslations = {
  en,
  de,
} as const;
