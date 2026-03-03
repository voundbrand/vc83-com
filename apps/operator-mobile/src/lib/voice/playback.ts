const SUPPORTED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
]);

export type VoicePlaybackSegment = {
  sequence: number;
  mimeType: string;
  uri: string;
  source: 'url' | 'data_uri';
};

type NativeBridgeChunkCandidate = {
  sequence?: number | null;
  mimeType?: string | null;
  audioBase64?: string | null;
  audioUrl?: string | null;
  uri?: string | null;
};

type BuildVoicePlaybackPlanArgs = {
  mimeType?: string | null;
  audioBase64?: string | null;
  audioUrl?: string | null;
  nativeBridge?: Record<string, unknown> | null;
};

export type VoicePlaybackPlan = {
  segments: VoicePlaybackSegment[];
  droppedUnsupportedMimeTypes: string[];
  usedDataUriFallback: boolean;
};

function normalizeMimeType(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const canonical = normalized.split(';', 1)[0]?.trim() || normalized;
  return canonical || null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

function isSupportedPlaybackMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.has(mimeType);
}

function buildDataUri(mimeType: string, audioBase64: string): string {
  return `data:${mimeType};base64,${audioBase64}`;
}

function parseNativeBridgeChunks(nativeBridge?: Record<string, unknown> | null): NativeBridgeChunkCandidate[] {
  if (!nativeBridge) {
    return [];
  }

  const collections: unknown[] = [];
  collections.push(nativeBridge.audioChunks);
  collections.push(nativeBridge.ttsChunks);
  collections.push(nativeBridge.chunks);

  for (const candidate of collections) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item) => typeof item === 'object' && item !== null) as NativeBridgeChunkCandidate[];
    }
  }

  return [];
}

export function buildVoicePlaybackPlan(args: BuildVoicePlaybackPlanArgs): VoicePlaybackPlan {
  const rootMimeType = normalizeMimeType(args.mimeType) || 'audio/mpeg';
  const chunkCandidates = parseNativeBridgeChunks(args.nativeBridge);
  const candidates: NativeBridgeChunkCandidate[] = chunkCandidates.length > 0
    ? chunkCandidates
    : [{
      sequence: 0,
      mimeType: rootMimeType,
      audioBase64: args.audioBase64,
      audioUrl: args.audioUrl,
    }];

  const droppedUnsupportedMimeTypes = new Set<string>();
  let usedDataUriFallback = false;

  const segments = candidates
    .map((candidate, index): VoicePlaybackSegment | null => {
      const mimeType = normalizeMimeType(candidate.mimeType) || rootMimeType;
      if (!isSupportedPlaybackMimeType(mimeType)) {
        droppedUnsupportedMimeTypes.add(mimeType);
        return null;
      }

      const preferredUrl = normalizeString(candidate.audioUrl) || normalizeString(candidate.uri);
      if (preferredUrl) {
        return {
          sequence: typeof candidate.sequence === 'number' ? candidate.sequence : index,
          mimeType,
          uri: preferredUrl,
          source: 'url',
        };
      }

      const audioBase64 = normalizeString(candidate.audioBase64);
      if (!audioBase64) {
        return null;
      }

      usedDataUriFallback = true;
      return {
        sequence: typeof candidate.sequence === 'number' ? candidate.sequence : index,
        mimeType,
        uri: buildDataUri(mimeType, audioBase64),
        source: 'data_uri',
      };
    })
    .filter((segment): segment is VoicePlaybackSegment => Boolean(segment))
    .sort((left, right) => left.sequence - right.sequence);

  return {
    segments,
    droppedUnsupportedMimeTypes: Array.from(droppedUnsupportedMimeTypes),
    usedDataUriFallback,
  };
}
