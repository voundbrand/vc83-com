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

const VOICE_PREVIEW_SAMPLE_BY_LANGUAGE: Record<string, string> = {
  ar: 'Marhaban, ana {name}.',
  bg: 'Zdravey, az sam {name}.',
  ca: 'Hola, soc {name}.',
  cs: 'Ahoj, ja jsem {name}.',
  da: 'Hej, jeg er {name}.',
  de: 'Hallo, ich bin {name}.',
  el: 'Yia sou, eimai o {name}.',
  en: 'Hello, this is {name}.',
  es: 'Hola, soy {name}.',
  et: 'Tere, mina olen {name}.',
  fa: 'Salam, man {name} hastam.',
  fil: 'Kumusta, ako si {name}.',
  fi: 'Hei, olen {name}.',
  fr: 'Bonjour, je suis {name}.',
  he: 'Shalom, ani {name}.',
  hi: 'Namaste, main {name} hoon.',
  hr: 'Bok, ja sam {name}.',
  hu: 'Szia, en {name} vagyok.',
  hy: 'Barev, yes {name} em.',
  id: 'Halo, saya {name}.',
  it: 'Ciao, sono {name}.',
  ja: 'Konnichiwa, watashi wa {name} desu.',
  ko: 'Annyeonghaseyo, jeoneun {name} imnida.',
  lt: 'Labas, as esu {name}.',
  lv: 'Sveiki, es esmu {name}.',
  ms: 'Halo, saya {name}.',
  nl: 'Hallo, ik ben {name}.',
  no: 'Hei, jeg er {name}.',
  pl: 'Czesc, jestem {name}.',
  pt: 'Ola, eu sou {name}.',
  ro: 'Salut, eu sunt {name}.',
  ru: 'Privet, ya {name}.',
  sk: 'Ahoj, ja som {name}.',
  sl: 'Zivjo, jaz sem {name}.',
  sr: 'Zdravo, ja sam {name}.',
  sv: 'Hej, jag ar {name}.',
  th: 'Sawasdee, chan khue {name}.',
  tr: 'Merhaba, ben {name}.',
  uk: 'Pryvit, ya {name}.',
  ur: 'Assalam alaikum, main {name} hoon.',
  vi: 'Xin chao, toi la {name}.',
  zh: 'Ni hao, wo shi {name}.',
};

const VOICE_PREVIEW_GREETING_ONLY_BY_LANGUAGE: Record<string, string> = {
  ar: 'Marhaban.',
  bg: 'Zdravey.',
  ca: 'Hola.',
  cs: 'Ahoj.',
  da: 'Hej.',
  de: 'Hallo.',
  el: 'Yia sou.',
  en: 'Hello.',
  es: 'Hola.',
  et: 'Tere.',
  fa: 'Salam.',
  fil: 'Kumusta.',
  fi: 'Hei.',
  fr: 'Bonjour.',
  he: 'Shalom.',
  hi: 'Namaste.',
  hr: 'Bok.',
  hu: 'Szia.',
  hy: 'Barev.',
  id: 'Halo.',
  it: 'Ciao.',
  ja: 'Konnichiwa.',
  ko: 'Annyeonghaseyo.',
  lt: 'Labas.',
  lv: 'Sveiki.',
  ms: 'Halo.',
  nl: 'Hallo.',
  no: 'Hei.',
  pl: 'Czesc.',
  pt: 'Ola.',
  ro: 'Salut.',
  ru: 'Privet.',
  sk: 'Ahoj.',
  sl: 'Zivjo.',
  sr: 'Zdravo.',
  sv: 'Hej.',
  th: 'Sawasdee.',
  tr: 'Merhaba.',
  uk: 'Pryvit.',
  ur: 'Assalam alaikum.',
  vi: 'Xin chao.',
  zh: 'Ni hao.',
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
    // ElevenLabs sometimes omits language metadata; treat those voices as
    // English defaults so non-English filters remain strict.
    return normalizedLanguage === 'en';
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

export function buildVoicePreviewSampleText(
  language: string | null | undefined,
  voiceName: string | null | undefined
): string {
  const normalizedLanguage = normalizeVoiceLanguageCode(language) || 'en';
  const normalizedName =
    typeof voiceName === 'string' && voiceName.trim().length > 0
      ? voiceName.trim()
      : null;
  if (!normalizedName) {
    return (
      VOICE_PREVIEW_GREETING_ONLY_BY_LANGUAGE[normalizedLanguage]
      || VOICE_PREVIEW_GREETING_ONLY_BY_LANGUAGE.en
    );
  }
  const template =
    VOICE_PREVIEW_SAMPLE_BY_LANGUAGE[normalizedLanguage]
    || VOICE_PREVIEW_SAMPLE_BY_LANGUAGE.en;
  return template.replace('{name}', normalizedName);
}

export function buildVoiceConversationStarterText(
  language: string | null | undefined,
  userFirstName: string | null | undefined
): string {
  const normalizedLanguage = normalizeVoiceLanguageCode(language) || 'en';
  const baseGreeting =
    VOICE_PREVIEW_GREETING_ONLY_BY_LANGUAGE[normalizedLanguage]
    || VOICE_PREVIEW_GREETING_ONLY_BY_LANGUAGE.en;
  const normalizedFirstName =
    typeof userFirstName === 'string'
      ? userFirstName.trim()
      : '';
  if (!normalizedFirstName) {
    return baseGreeting;
  }
  const greetingWithoutTerminalPunctuation = baseGreeting.replace(/[.!?]+$/g, '').trim();
  if (!greetingWithoutTerminalPunctuation) {
    return `${normalizedFirstName}.`;
  }
  return `${greetingWithoutTerminalPunctuation}, ${normalizedFirstName}.`;
}
