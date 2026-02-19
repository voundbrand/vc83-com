type TrustArtifactEntry = {
  fieldId: string;
  valuePreview: string;
};

type TrustArtifactCard = {
  title?: string;
  summary?: string;
  identityAnchors?: TrustArtifactEntry[];
  guardrails?: TrustArtifactEntry[];
  handoffBoundaries?: TrustArtifactEntry[];
  driftCues?: TrustArtifactEntry[];
};

type MemoryLedgerCard = TrustArtifactCard & {
  ledgerEntries?: TrustArtifactEntry[];
};

type TrustArtifactsBundle = {
  version?: string;
  soulCard?: TrustArtifactCard;
  guardrailsCard?: TrustArtifactCard;
  teamCharter?: TrustArtifactCard;
  memoryLedger?: MemoryLedgerCard;
};

type VoiceConsentSummary = {
  activeCheckpointId?: string;
  sourceAttributionCount?: number;
  memoryCandidateCount?: number;
  sourceAttributionPolicy?: string;
};

type MemoryConsentSummary = {
  status?: "pending" | "accepted" | "declined";
  consentScope?: string;
  consentPromptVersion?: string;
};

export interface VoiceAgentCoCreationSource {
  contentDNAId: string;
  extractedData?: Record<string, unknown> | null;
  trustArtifacts?: TrustArtifactsBundle | null;
  voiceConsentSummary?: VoiceConsentSummary | null;
  memoryConsent?: MemoryConsentSummary | null;
}

export interface VoiceAgentCoCreationHandoffPayload {
  version: "voice-agent-handoff.v1";
  source: "voice_interview";
  createdAt: number;
  contentDNAId: string;
  trustArtifactsVersion: string | null;
  consentCheckpointId: string | null;
  sourceAttributionCount: number;
  memoryCandidateCount: number;
  requiresHumanReview: true;
  draftMessage: string;
}

const STORAGE_KEY = "voice-agent-handoff.v1";
export const VOICE_AGENT_HANDOFF_EVENT = "voice-agent-handoff:staged";
const MAX_CARD_HIGHLIGHTS = 2;
const MAX_SOURCE_FIELD_HIGHLIGHTS = 4;
const MAX_VALUE_PREVIEW_LENGTH = 120;

function truncateValuePreview(value: string): string {
  if (value.length <= MAX_VALUE_PREVIEW_LENGTH) {
    return value;
  }
  return `${value.slice(0, MAX_VALUE_PREVIEW_LENGTH - 1)}...`;
}

function formatValuePreview(value: unknown): string {
  if (Array.isArray(value)) {
    return truncateValuePreview(value.map((item) => String(item)).join(", "));
  }
  if (value && typeof value === "object") {
    try {
      return truncateValuePreview(JSON.stringify(value));
    } catch {
      return "[object]";
    }
  }
  return truncateValuePreview(String(value));
}

function summarizeEntries(title: string, entries: TrustArtifactEntry[] | undefined): string[] {
  const safeEntries = (entries || []).filter((entry) => Boolean(entry?.valuePreview));
  if (safeEntries.length === 0) {
    return [`- ${title}: no explicit entries captured`];
  }

  return safeEntries
    .slice(0, MAX_CARD_HIGHLIGHTS)
    .map((entry) => `- ${title}: ${truncateValuePreview(entry.valuePreview)}`);
}

function buildTrustHighlights(trustArtifacts: TrustArtifactsBundle | null | undefined): string[] {
  if (!trustArtifacts) {
    return ["- Trust artifacts: unavailable in handoff context"];
  }

  const lines = [
    ...summarizeEntries("Soul Card", trustArtifacts.soulCard?.identityAnchors),
    ...summarizeEntries("Guardrails", trustArtifacts.guardrailsCard?.guardrails),
    ...summarizeEntries("Team Charter", trustArtifacts.teamCharter?.handoffBoundaries),
    ...summarizeEntries("Memory Ledger", trustArtifacts.memoryLedger?.ledgerEntries),
  ];

  return lines;
}

function buildSourceFieldHighlights(extractedData: Record<string, unknown> | null | undefined): string[] {
  if (!extractedData) {
    return [];
  }

  const keys = Object.keys(extractedData)
    .filter((key) => {
      const value = extractedData[key];
      return value !== undefined && value !== null && value !== "";
    })
    .sort((a, b) => a.localeCompare(b))
    .slice(0, MAX_SOURCE_FIELD_HIGHLIGHTS);

  return keys.map((key) => `- ${key}: ${formatValuePreview(extractedData[key])}`);
}

export function buildVoiceAgentForThisDraft(source: VoiceAgentCoCreationSource): string {
  const consentStatus = source.memoryConsent?.status || "accepted";
  const consentScope = source.memoryConsent?.consentScope || "content_dna_profile";
  const consentPromptVersion =
    source.memoryConsent?.consentPromptVersion || "interview-memory-consent-v1";
  const checkpointId = source.voiceConsentSummary?.activeCheckpointId || "cp3_post_save_revoke";
  const sourceAttributionCount = source.voiceConsentSummary?.sourceAttributionCount || 0;
  const memoryCandidateCount = source.voiceConsentSummary?.memoryCandidateCount || 0;
  const attributionPolicy =
    source.voiceConsentSummary?.sourceAttributionPolicy
    || "Source attribution must remain explicit before autonomous execution.";

  const trustHighlights = buildTrustHighlights(source.trustArtifacts);
  const sourceFieldHighlights = buildSourceFieldHighlights(source.extractedData);

  const lines = [
    "Operator-approved handoff: create an `agent for this` from a completed voice co-creation session.",
    "",
    "Trust constraints (do not bypass):",
    "- Keep human-in-the-loop approvals explicit for any execution-risk actions.",
    "- Keep escalation controls explicit for ambiguous/high-risk requests.",
    "- Preserve trust-artifacts.v1 compatibility in all proposed mappings.",
    "",
    "Session handoff metadata:",
    `- Content DNA ID: ${source.contentDNAId}`,
    `- Consent status: ${consentStatus}`,
    `- Consent scope: ${consentScope}`,
    `- Consent prompt version: ${consentPromptVersion}`,
    `- Active consent checkpoint: ${checkpointId}`,
    `- Source-attributed candidates: ${sourceAttributionCount}`,
    `- Memory candidate count: ${memoryCandidateCount}`,
    `- Attribution policy: ${attributionPolicy}`,
    "",
    "Trust artifact highlights:",
    ...trustHighlights,
  ];

  if (sourceFieldHighlights.length > 0) {
    lines.push("", "Captured signal highlights:", ...sourceFieldHighlights);
  }

  lines.push(
    "",
    "Requested outcome:",
    "1) Propose the initial agent configuration and operating contract.",
    "2) Ask for explicit approval before any execution or side effects.",
    "3) Call out escalation triggers, handoff boundaries, and fallback behavior.",
  );

  return lines.join("\n");
}

export function buildVoiceAgentCoCreationHandoffPayload(
  source: VoiceAgentCoCreationSource,
): VoiceAgentCoCreationHandoffPayload {
  return {
    version: "voice-agent-handoff.v1",
    source: "voice_interview",
    createdAt: Date.now(),
    contentDNAId: source.contentDNAId,
    trustArtifactsVersion: source.trustArtifacts?.version || null,
    consentCheckpointId: source.voiceConsentSummary?.activeCheckpointId || null,
    sourceAttributionCount: source.voiceConsentSummary?.sourceAttributionCount || 0,
    memoryCandidateCount: source.voiceConsentSummary?.memoryCandidateCount || 0,
    requiresHumanReview: true,
    draftMessage: buildVoiceAgentForThisDraft(source),
  };
}

function parseStoredPayload(
  rawValue: string | null,
): VoiceAgentCoCreationHandoffPayload | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<VoiceAgentCoCreationHandoffPayload>;
    if (
      parsed.version !== "voice-agent-handoff.v1"
      || parsed.source !== "voice_interview"
      || typeof parsed.contentDNAId !== "string"
      || !parsed.contentDNAId
      || typeof parsed.draftMessage !== "string"
      || !parsed.draftMessage.trim()
    ) {
      return null;
    }

    return {
      version: "voice-agent-handoff.v1",
      source: "voice_interview",
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
      contentDNAId: parsed.contentDNAId,
      trustArtifactsVersion:
        typeof parsed.trustArtifactsVersion === "string" ? parsed.trustArtifactsVersion : null,
      consentCheckpointId:
        typeof parsed.consentCheckpointId === "string" ? parsed.consentCheckpointId : null,
      sourceAttributionCount:
        typeof parsed.sourceAttributionCount === "number" ? parsed.sourceAttributionCount : 0,
      memoryCandidateCount:
        typeof parsed.memoryCandidateCount === "number" ? parsed.memoryCandidateCount : 0,
      requiresHumanReview: true,
      draftMessage: parsed.draftMessage,
    };
  } catch {
    return null;
  }
}

export function stageVoiceAgentCoCreationHandoff(
  payload: VoiceAgentCoCreationHandoffPayload,
) {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(VOICE_AGENT_HANDOFF_EVENT));
}

export function consumeVoiceAgentCoCreationHandoff(): VoiceAgentCoCreationHandoffPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const payload = parseStoredPayload(window.sessionStorage.getItem(STORAGE_KEY));
  window.sessionStorage.removeItem(STORAGE_KEY);
  return payload;
}
