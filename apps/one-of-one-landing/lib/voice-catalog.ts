/** Curated voice and language data for the landing page agent tiles + playground. */

/** The 6 languages shown by default on agent tiles. */
export const PRIMARY_LANGUAGE_CODES = ["de", "en", "fr", "es", "it", "nl"] as const;

export const SUPPORTED_LANGUAGES: Record<string, string> = {
  ar: "Arabic",
  bg: "Bulgarian",
  ca: "Catalan",
  cs: "Czech",
  da: "Danish",
  de: "German",
  el: "Greek",
  en: "English",
  es: "Spanish",
  et: "Estonian",
  fa: "Persian",
  fil: "Filipino",
  fi: "Finnish",
  fr: "French",
  he: "Hebrew",
  hi: "Hindi",
  hr: "Croatian",
  hu: "Hungarian",
  hy: "Armenian",
  id: "Indonesian",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  lt: "Lithuanian",
  lv: "Latvian",
  ms: "Malay",
  nl: "Dutch",
  no: "Norwegian",
  pl: "Polish",
  pt: "Portuguese",
  ro: "Romanian",
  ru: "Russian",
  sk: "Slovak",
  sl: "Slovenian",
  sr: "Serbian",
  sv: "Swedish",
  th: "Thai",
  tr: "Turkish",
  uk: "Ukrainian",
  ur: "Urdu",
  vi: "Vietnamese",
  zh: "Chinese",
};

export type PlaygroundVoice = {
  id: string;
  name: string;
  gender: "female" | "male";
  tone: string;
  labelEn: string;
  labelDe: string;
};

// Curated ElevenLabs voices for the playground.
// Verify IDs with: curl -H "xi-api-key: $KEY" https://api.elevenlabs.io/v1/voices
export const PLAYGROUND_VOICES: PlaygroundVoice[] = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "female", tone: "warm", labelEn: "Rachel — Warm, conversational", labelDe: "Rachel — Warm, gesprächig" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", gender: "female", tone: "soft", labelEn: "Bella — Soft, friendly", labelDe: "Bella — Sanft, freundlich" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", gender: "male", tone: "professional", labelEn: "Antoni — Professional, clear", labelDe: "Antoni — Professionell, klar" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", gender: "male", tone: "authoritative", labelEn: "Arnold — Authoritative, deep", labelDe: "Arnold — Autoritativ, tief" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", gender: "male", tone: "warm", labelEn: "Adam — Warm, narrative", labelDe: "Adam — Warm, erzählerisch" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", gender: "male", tone: "energetic", labelEn: "Sam — Energetic, upbeat", labelDe: "Sam — Energisch, optimistisch" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", gender: "female", tone: "clear", labelEn: "Elli — Clear, friendly", labelDe: "Elli — Klar, freundlich" },
  { id: "jBpfuIE2acCO8z3wKNLl", name: "Gigi", gender: "female", tone: "playful", labelEn: "Gigi — Playful, youthful", labelDe: "Gigi — Verspielt, jugendlich" },
];

export const ALLOWED_VOICE_IDS = new Set(PLAYGROUND_VOICES.map((v) => v.id));

export const MAX_PLAYGROUND_TEXT_LENGTH = 200;
