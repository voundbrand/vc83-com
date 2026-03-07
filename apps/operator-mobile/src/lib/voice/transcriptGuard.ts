const BRACKETED_DESCRIPTOR_PATTERN = /\([^()]+\)|\[[^[\]]+\]|\{[^{}]+\}/g;

const NON_SPEECH_TERMS = [
  'noise',
  'background',
  'humming',
  'buzzing',
  'click',
  'clicking',
  'jingle',
  'outro',
  'intro',
  'beep',
  'beeping',
  'chime',
  'ringing',
  'ringtone',
  'tone',
  'ding',
  'static',
  'silence',
  'inaudible',
  'unintelligible',
  'clatter',
  'clattering',
  'thud',
  'thudding',
  'traffic',
  'engine',
  'door slam',
  'door slams',
  'passing',
  'wind',
  'rain',
  'siren',
  'footsteps',
  'coughing',
  'breathing',
  'laughter',
  'applause',
  'music',
] as const;

const SPEECH_HINT_PATTERN =
  /\b(hello|hi|hey|yes|no|please|thanks|thank\s+you|can\s+you|could\s+you|i|we|you)\b/i;

function normalizeTranscriptText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function containsAnyTerm(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function isLikelyAmbientTranscript(value: string | null | undefined): boolean {
  if (typeof value !== 'string') {
    return true;
  }
  const normalized = normalizeTranscriptText(value);
  if (!normalized) {
    return true;
  }
  const lower = normalized.toLowerCase();
  if (SPEECH_HINT_PATTERN.test(lower)) {
    return false;
  }

  const descriptorMatches = lower.match(BRACKETED_DESCRIPTOR_PATTERN) ?? [];
  if (descriptorMatches.length === 0) {
    return false;
  }

  const remainder = lower
    .replace(BRACKETED_DESCRIPTOR_PATTERN, ' ')
    .replace(/[.,!?;:/|\\_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (remainder) {
    return false;
  }

  const descriptorBody = descriptorMatches
    .map((segment) => segment.slice(1, -1).trim())
    .join(' ');
  if (!descriptorBody) {
    return true;
  }
  if (containsAnyTerm(descriptorBody, NON_SPEECH_TERMS)) {
    return true;
  }
  const descriptorWordCount = descriptorBody
    .split(/\s+/)
    .filter((segment) => segment.length > 0).length;
  return descriptorWordCount <= 4;
}

export function sanitizeTranscriptForVoiceTurn(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = normalizeTranscriptText(value);
  if (!normalized) {
    return null;
  }
  if (isLikelyAmbientTranscript(normalized)) {
    return null;
  }
  return normalized;
}
