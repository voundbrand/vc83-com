function normalizeInboundRouteString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function firstInboundString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const normalized = normalizeInboundRouteString(value);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

function normalizeInboundObjectValue(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeInboundLanguageLockTag(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/_/g, "-");
  if (!normalized) {
    return null;
  }
  if (
    normalized === "english"
    || normalized === "englisch"
  ) {
    return "en";
  }
  if (
    normalized === "german"
    || normalized === "deutsch"
  ) {
    return "de";
  }
  if (normalized === "hindi") {
    return "hi";
  }
  if (/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(normalized)) {
    return normalized;
  }
  return null;
}

export function resolveInboundConversationLanguageLock(args: {
  metadata: Record<string, unknown>;
  inboundVoiceRequest?: {
    language?: string;
  } | null;
}): string | null {
  const voiceRuntime = normalizeInboundObjectValue(args.metadata.voiceRuntime);
  const conversationRuntime = normalizeInboundObjectValue(
    args.metadata.conversationRuntime,
  );
  const explicitConversationLanguageLock = normalizeInboundLanguageLockTag(
    conversationRuntime?.languageLock,
  );
  if (explicitConversationLanguageLock) {
    return explicitConversationLanguageLock;
  }
  const explicitVoiceRuntimeLanguageLock = normalizeInboundLanguageLockTag(
    voiceRuntime?.languageLock,
  );
  if (explicitVoiceRuntimeLanguageLock) {
    return explicitVoiceRuntimeLanguageLock;
  }
  return (
    normalizeInboundLanguageLockTag(args.inboundVoiceRequest?.language)
    ?? normalizeInboundLanguageLockTag(
      firstInboundString(
        voiceRuntime?.language,
        conversationRuntime?.language,
        args.metadata.language,
        args.metadata.locale,
      ),
    )
    ?? null
  );
}

export function buildInboundLanguageLockRuntimeContext(
  languageLock: string | null | undefined,
): string | null {
  const normalized = normalizeInboundLanguageLockTag(languageLock);
  if (!normalized) {
    return null;
  }
  return [
    "--- LANGUAGE LOCK ---",
    `Conversation language lock: ${normalized}.`,
    `Default all replies to ${normalized} and keep language stable across turns.`,
    "Switch languages only when the user explicitly requests it.",
    "--- END LANGUAGE LOCK ---",
  ].join("\n");
}
