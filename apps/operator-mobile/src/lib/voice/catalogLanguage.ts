import type { OperatorVoiceCatalogEntry } from '../../api/client';

export type VoiceLanguageComparable = {
  language?: string;
  languages?: string[];
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
  armenian: 'hy',
  australian: 'en',
  brazilian: 'pt',
  bulgarian: 'bg',
  british: 'en',
  catalan: 'ca',
  chinese: 'zh',
  croatian: 'hr',
  czech: 'cs',
  danish: 'da',
  deutsch: 'de',
  dutch: 'nl',
  english: 'en',
  estonian: 'et',
  filipino: 'fil',
  finnish: 'fi',
  french: 'fr',
  german: 'de',
  greek: 'el',
  hebrew: 'he',
  hindi: 'hi',
  hungarian: 'hu',
  indonesian: 'id',
  italian: 'it',
  japanese: 'ja',
  korean: 'ko',
  latvian: 'lv',
  lithuanian: 'lt',
  malay: 'ms',
  mandarin: 'zh',
  norwegian: 'no',
  persian: 'fa',
  polish: 'pl',
  portuguese: 'pt',
  romanian: 'ro',
  russian: 'ru',
  serbian: 'sr',
  slovak: 'sk',
  slovenian: 'sl',
  spanish: 'es',
  swedish: 'sv',
  tagalog: 'fil',
  thai: 'th',
  turkish: 'tr',
  ukrainian: 'uk',
  urdu: 'ur',
  vietnamese: 'vi',
};

const LANGUAGE_CODE_TO_LABEL: Record<string, string> = {
  ar: 'Arabic',
  bg: 'Bulgarian',
  ca: 'Catalan',
  cs: 'Czech',
  da: 'Danish',
  de: 'German',
  el: 'Greek',
  en: 'English',
  es: 'Spanish',
  et: 'Estonian',
  fa: 'Persian',
  fil: 'Filipino',
  fi: 'Finnish',
  fr: 'French',
  he: 'Hebrew',
  hi: 'Hindi',
  hr: 'Croatian',
  hu: 'Hungarian',
  hy: 'Armenian',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  lt: 'Lithuanian',
  lv: 'Latvian',
  ms: 'Malay',
  nl: 'Dutch',
  no: 'Norwegian',
  pl: 'Polish',
  pt: 'Portuguese',
  ro: 'Romanian',
  ru: 'Russian',
  sk: 'Slovak',
  sl: 'Slovenian',
  sr: 'Serbian',
  sv: 'Swedish',
  th: 'Thai',
  tr: 'Turkish',
  ur: 'Urdu',
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
  const directAlias = LANGUAGE_ALIAS_TO_CODE[normalized];
  if (directAlias) {
    return directAlias;
  }
  const cleaned = normalized
    .replace(/'/g, '')
    .replace(/[^a-z0-9 -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) {
    return null;
  }
  const cleanedAlias = LANGUAGE_ALIAS_TO_CODE[cleaned];
  if (cleanedAlias) {
    return cleanedAlias;
  }
  const tokens = cleaned.split(/[\s-]+/g).filter(Boolean);
  for (const token of tokens) {
    const tokenAlias = LANGUAGE_ALIAS_TO_CODE[token];
    if (tokenAlias) {
      return tokenAlias;
    }
    if (/^[a-z]{2,3}$/.test(token)) {
      return token;
    }
  }
  const localeLikeTokens = normalized.match(/[a-z]{2,3}(?:-[a-z0-9]{2,8})*/g) || [];
  for (const token of localeLikeTokens) {
    const primarySegment = token.split('-', 1)[0]?.trim();
    if (!primarySegment) {
      continue;
    }
    const segmentAlias = LANGUAGE_ALIAS_TO_CODE[primarySegment];
    if (segmentAlias) {
      return segmentAlias;
    }
    if (/^[a-z]{2,3}$/.test(primarySegment)) {
      return primarySegment;
    }
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
  const candidates: Array<unknown> = [
    voice.language,
    ...(Array.isArray(voice.languages) ? voice.languages : []),
    labels.language,
    labels.locale,
    labels.accent,
    labels.lang,
    labels.language_code,
    labels.dialect,
  ];
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
