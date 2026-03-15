export const LANDING_VOICE_INTRO_AGENT_KEYS = [
  "clara",
  "maren",
  "jonas",
  "tobias",
  "lina",
  "kai",
  "nora",
  "samantha",
] as const;

export type LandingVoiceIntroAgentKey =
  (typeof LANDING_VOICE_INTRO_AGENT_KEYS)[number];

export type LandingVoiceIntroLanguage = "en" | "de";

const LANDING_VOICE_INTRO_SCRIPTS: Record<
  LandingVoiceIntroAgentKey,
  Record<LandingVoiceIntroLanguage, string>
> = {
  clara: {
    en: "Hi, I'm Clara, your AI receptionist. This call may be recorded and shared with our service providers. I'm here to take your calls, route you to the right specialist, and make sure nothing gets missed.",
    de: "Hallo, ich bin Clara, Ihre KI-Rezeptionistin. Dieses Gespräch kann aufgezeichnet und an unsere Dienstleister weitergegeben werden. Ich nehme Ihre Anrufe entgegen, leite Sie an den richtigen Spezialisten weiter und sorge dafür, dass nichts verloren geht.",
  },
  maren: {
    en: "Hi, I'm Maren. I coordinate appointments across all your locations, booking, rescheduling, and no-show recovery. Tell me what you need and I'll find the best slot.",
    de: "Hallo, ich bin Maren. Ich koordiniere Termine über alle Ihre Standorte, von Buchung über Umplanung bis zur Ausfallnachverfolgung. Sagen Sie mir, was Sie brauchen, und ich finde den besten Termin.",
  },
  jonas: {
    en: "Hi, I'm Jonas. I qualify your inbound leads so your sales team only talks to real opportunities. Describe an inquiry and I'll walk you through the process.",
    de: "Hallo, ich bin Jonas. Ich qualifiziere Ihre eingehenden Anfragen, damit Ihr Vertrieb nur mit echten Chancen spricht. Beschreiben Sie eine Anfrage und ich zeige Ihnen den Ablauf.",
  },
  tobias: {
    en: "Hi, I'm Tobias. I turn rough field notes into structured, quote-ready documentation with no typing required. Just describe the job and I'll draft it.",
    de: "Hallo, ich bin Tobias. Ich mache aus groben Notizen vom Einsatzort strukturierte, angebotsfertige Dokumentation, ganz ohne Tippen. Beschreiben Sie einfach den Auftrag.",
  },
  lina: {
    en: "Hi, I'm Lina. I handle your follow-ups after appointments, open quotes, and service visits so nothing falls through the cracks. Let me show you how that sounds.",
    de: "Hallo, ich bin Lina. Ich uebernehme Ihre Nachverfolgung nach Terminen, offenen Angeboten und Serviceeinsaetzen, damit nichts untergeht. Ich zeige Ihnen, wie das klingt.",
  },
  kai: {
    en: "Hi, I'm Kai. When someone calls in sick at 6 AM, the shift is covered by 6:05. I coordinate vacation planning, escalations, and handoffs through one assistant instead of scattered WhatsApp groups.",
    de: "Hallo, ich bin Kai. Wenn sich um 6 Uhr jemand krankmeldet, ist die Schicht um 6:05 besetzt. Ich koordiniere Urlaubsplanung, Eskalationen und Übergaben über einen Assistenten statt über verstreute WhatsApp-Gruppen.",
  },
  nora: {
    en: "Hi, I'm Nora. I turn your location data into clear insight about what's happening, why, and what to do next. Let me show you with an example.",
    de: "Hallo, ich bin Nora. Ich verwandle Ihre Standortdaten in klare Handlungsempfehlungen, was passiert, warum, und was als Naechstes zu tun ist.",
  },
  samantha: {
    en: "Hi, I'm Samantha, your diagnostic guide. This conversation may be recorded and shared with our service providers. I'm here to find the biggest bottleneck in your operations and recommend exactly which specialist can solve it.",
    de: "Hallo, ich bin Samantha, Ihre Diagnose-Beraterin. Dieses Gespraech kann aufgezeichnet und an unsere Dienstleister weitergegeben werden. Ich finde den groessten Engpass in Ihrem Betrieb und empfehle Ihnen genau, welcher Spezialist ihn loesen kann.",
  },
};

const LANDING_VOICE_INTRO_VOICE_ENV_KEYS: Record<
  LandingVoiceIntroAgentKey,
  string
> = {
  clara: "LANDING_VOICE_INTRO_CLARA_VOICE_ID",
  maren: "LANDING_VOICE_INTRO_MAREN_VOICE_ID",
  jonas: "LANDING_VOICE_INTRO_JONAS_VOICE_ID",
  tobias: "LANDING_VOICE_INTRO_TOBIAS_VOICE_ID",
  lina: "LANDING_VOICE_INTRO_LINA_VOICE_ID",
  kai: "LANDING_VOICE_INTRO_KAI_VOICE_ID",
  nora: "LANDING_VOICE_INTRO_NORA_VOICE_ID",
  samantha: "LANDING_VOICE_INTRO_SAMANTHA_VOICE_ID",
};

export function isLandingVoiceIntroAgentKey(
  value: string,
): value is LandingVoiceIntroAgentKey {
  return LANDING_VOICE_INTRO_AGENT_KEYS.includes(
    value as LandingVoiceIntroAgentKey,
  );
}

export function normalizeLandingVoiceIntroLanguage(
  value: string | null | undefined,
): LandingVoiceIntroLanguage {
  return value === "de" ? "de" : "en";
}

export function getLandingVoiceIntroScript(
  agentKey: LandingVoiceIntroAgentKey,
  language: LandingVoiceIntroLanguage,
): string {
  return LANDING_VOICE_INTRO_SCRIPTS[agentKey][language];
}

export function getLandingVoiceIntroVoiceId(
  agentKey: LandingVoiceIntroAgentKey,
): string | null {
  const envKey = LANDING_VOICE_INTRO_VOICE_ENV_KEYS[agentKey];
  const voiceId = process.env[envKey]?.trim();
  return voiceId ? voiceId : null;
}

export function getLandingVoiceIntroFilename(args: {
  agentKey: LandingVoiceIntroAgentKey;
  language: LandingVoiceIntroLanguage;
}): string {
  return `${args.agentKey}-intro-${args.language}.mp3`;
}
