import de from "./law-firm.de.json";
import en from "./law-firm.en.json";

export type LawFirmTranslations = typeof en;

const _deParityCheck: LawFirmTranslations = de;
void _deParityCheck;

export const lawFirmTranslations = {
  en,
  de,
} as const;
