import type { OperatorVoiceCatalogEntry } from '../../api/client';

export type VoiceLanguageComparable = {
  language?: string;
  labels?: Record<string, string>;
};

export type AgentVoiceLanguagePreference = 'system' | string;

export type OperatorVoiceLanguageCatalogEntry = {
  code: string;
  label: string;
  voiceCount: number;
};

const LANGUAGE_ALIAS_TO_CODE: Record<string, string> = {
  american: 'en',
  arabic: 'ar',
  brazilian: 'pt',
  british: 'en',
  chinese: 'zh',
  deutsch: 'de',
  dutch: 'nl',
  english: 'en',
  french: 'fr',
  german: 'de',
  hindi: 'hi',
  italian: 'it',
  japanese: 'ja',
  korean: 'ko',
  mandarin: 'zh',
  polish: 'pl',
  portuguese: 'pt',
  russian: 'ru',
  spanish: 'es',
  turkish: 'tr',
};

const LANGUAGE_CODE_TO_LABEL: Record<string, string> = {
  ar: 'Arabic',
  cs: 'Czech',
  da: 'Danish',
  de: 'German',
  el: 'Greek',
  en: 'English',
  es: 'Spanish',
  fi: 'Finnish',
  fr: 'French',
  he: 'Hebrew',
  hi: 'Hindi',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  ms: 'Malay',
  nl: 'Dutch',
  no: 'Norwegian',
  pl: 'Polish',
  pt: 'Portuguese',
  ro: 'Romanian',
  ru: 'Russian',
  sv: 'Swedish',
  th: 'Thai',
  tr: 'Turkish',
  uk: 'Ukrainian',
  vi: 'Vietnamese',
  zh: 'Chinese',
};

export function normalizeVoiceLanguageCode(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/_/g, '-');
  if (!normalized) {
    return null;
  }
  if (LANGUAGE_ALIAS_TO_CODE[normalized]) {
    return LANGUAGE_ALIAS_TO_CODE[normalized] || null;
  }
  const cleaned = normalized
    .replace(/[^a-z0-9 -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) {
    return null;
  }
  if (LANGUAGE_ALIAS_TO_CODE[cleaned]) {
    return LANGUAGE_ALIAS_TO_CODE[cleaned] || null;
  }
  const primarySegment = cleaned.split('-', 1)[0]?.trim();
  if (primarySegment && /^[a-z]{2,3}$/.test(primarySegment)) {
    return primarySegment;
  }
  return null;
}

export function formatVoiceLanguageLabel(code: string): string {
  const normalized = normalizeVoiceLanguageCode(code);
  if (!normalized) {
    const fallback = code.trim().toUpperCase();
    return fallback.length > 0 ? fallback : 'Unknown';
  }
  return LANGUAGE_CODE_TO_LABEL[normalized] || normalized.toUpperCase();
}

export function extractVoiceLanguageCodes(
  voice: VoiceLanguageComparable | OperatorVoiceCatalogEntry
): Set<string> {
  const codes = new Set<string>();
  const labels = voice.labels || {};
  const candidates = [voice.language, labels.language, labels.locale, labels.accent];
  for (const candidate of candidates) {
    const code = normalizeVoiceLanguageCode(candidate);
    if (code) {
      codes.add(code);
    }
  }
  return codes;
}

export function isVoiceCompatibleWithLanguage(
  voice: VoiceLanguageComparable | OperatorVoiceCatalogEntry,
  language: string | null | undefined
): boolean {
  const normalizedLanguage = normalizeVoiceLanguageCode(language);
  if (!normalizedLanguage) {
    return true;
  }
  const voiceLanguageCodes = extractVoiceLanguageCodes(voice);
  if (voiceLanguageCodes.size === 0) {
    return true;
  }
  return voiceLanguageCodes.has(normalizedLanguage);
}

export function normalizeVoiceLanguagePreference(value: unknown): AgentVoiceLanguagePreference {
  if (typeof value !== 'string') {
    return 'system';
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'system') {
    return 'system';
  }
  return normalizeVoiceLanguageCode(normalized) || 'system';
}

export function resolveVoiceLanguagePreference(
  preference: AgentVoiceLanguagePreference,
  deviceLanguageCode: string
): string {
  const requestedLanguage = preference === 'system' ? deviceLanguageCode : preference;
  return normalizeVoiceLanguageCode(requestedLanguage) || 'en';
}

export function buildVoiceLanguageCatalogFromVoices(
  voices: Array<VoiceLanguageComparable | OperatorVoiceCatalogEntry>
): OperatorVoiceLanguageCatalogEntry[] {
  const counts = new Map<string, number>();
  for (const voice of voices) {
    const codes = extractVoiceLanguageCodes(voice);
    for (const code of codes) {
      counts.set(code, (counts.get(code) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([code, voiceCount]) => ({
      code,
      label: formatVoiceLanguageLabel(code),
      voiceCount,
    }))
    .sort((left, right) => {
      const byLabel = left.label.localeCompare(right.label);
      return byLabel !== 0 ? byLabel : left.code.localeCompare(right.code);
    });
}
