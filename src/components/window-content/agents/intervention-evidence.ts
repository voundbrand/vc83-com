export interface InterventionTimelineEvent {
  occurredAt: number;
  trustEventName?: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryProvenanceEvidence {
  occurredAt: number;
  eventName: string;
  consentScope: string;
  consentDecision: string;
  memoryCandidateIds: string[];
  consentPromptVersion?: string;
  blockedNoConsent: boolean;
  eventCount: number;
}

export type RetrievalCitationProvenanceType =
  | "knowledge_item_bridge"
  | "chunk_index"
  | "document";

export interface RetrievalCitationEvidenceItem {
  citationId: string;
  sourceKind: string;
  provenanceType: RetrievalCitationProvenanceType;
  sourcePath: string;
  chunkId?: string;
  mediaId?: string;
  filename?: string;
}

export interface RetrievalCitationEvidence {
  occurredAt: number;
  mode?: string;
  path?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  citationCount: number;
  chunkCitationCount: number;
  bridgeCitationCount: number;
  sourceKindCounts: Array<{ sourceKind: string; count: number }>;
  citations: RetrievalCitationEvidenceItem[];
  eventCount: number;
}

interface ParsedMemoryEvent {
  occurredAt: number;
  eventName: string;
  consentScope?: string;
  consentDecision?: string;
  memoryCandidateIds: string[];
  consentPromptVersion?: string;
}

interface ParsedRetrievalCitation {
  citationId?: string;
  source?: string;
  chunkId?: string;
  mediaId?: string;
  filename?: string;
}

interface ParsedRetrievalEvidence {
  occurredAt: number;
  mode?: string;
  path?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  citationCount?: number;
  chunkCitationCount?: number;
  citations: ParsedRetrievalCitation[];
}

export function deriveMemoryProvenanceEvidence(
  events: InterventionTimelineEvent[],
): MemoryProvenanceEvidence | null {
  const parsed = events
    .map(parseMemoryEvent)
    .filter((event): event is ParsedMemoryEvent => event !== null)
    .sort((a, b) => b.occurredAt - a.occurredAt);

  if (parsed.length === 0) {
    return null;
  }

  const latest = parsed[0];
  const fallbackCandidates = uniqueStrings(
    parsed.flatMap((event) => event.memoryCandidateIds),
  );
  const memoryCandidateIds =
    latest.memoryCandidateIds.length > 0 ? latest.memoryCandidateIds : fallbackCandidates;
  const blockedNoConsent = parsed.some(
    (event) => event.eventName === "trust.memory.write_blocked_no_consent.v1",
  );

  return {
    occurredAt: latest.occurredAt,
    eventName: latest.eventName,
    consentScope: latest.consentScope || "unknown",
    consentDecision: latest.consentDecision || "unknown",
    memoryCandidateIds,
    consentPromptVersion: latest.consentPromptVersion,
    blockedNoConsent,
    eventCount: parsed.length,
  };
}

export function deriveRetrievalCitationEvidence(
  events: InterventionTimelineEvent[],
): RetrievalCitationEvidence | null {
  const parsed = events
    .map(parseRetrievalEvidence)
    .filter((event): event is ParsedRetrievalEvidence => event !== null)
    .sort((a, b) => b.occurredAt - a.occurredAt);

  if (parsed.length === 0) {
    return null;
  }

  const latest = parsed[0];
  const normalizedCitations = latest.citations.map((citation, index) => {
    const sourceKind = citation.source || "unknown";
    const provenanceType: RetrievalCitationProvenanceType =
      sourceKind === "knowledge_item_bridge"
        ? "knowledge_item_bridge"
        : citation.chunkId
          ? "chunk_index"
          : "document";
    const sourcePath =
      citation.filename
      || citation.mediaId
      || citation.chunkId
      || citation.citationId
      || `citation_${index + 1}`;

    return {
      citationId: citation.citationId || `citation_${index + 1}`,
      sourceKind,
      provenanceType,
      sourcePath,
      ...(citation.chunkId ? { chunkId: citation.chunkId } : {}),
      ...(citation.mediaId ? { mediaId: citation.mediaId } : {}),
      ...(citation.filename ? { filename: citation.filename } : {}),
    };
  });

  const citationCount =
    typeof latest.citationCount === "number"
      ? latest.citationCount
      : normalizedCitations.length;
  const chunkCitationCount =
    typeof latest.chunkCitationCount === "number"
      ? latest.chunkCitationCount
      : normalizedCitations.filter((citation) => citation.provenanceType === "chunk_index").length;
  const bridgeCitationCount = normalizedCitations.filter(
    (citation) => citation.provenanceType === "knowledge_item_bridge",
  ).length;

  const sourceKindCounts = Array.from(
    normalizedCitations.reduce((counts, citation) => {
      counts.set(citation.sourceKind, (counts.get(citation.sourceKind) || 0) + 1);
      return counts;
    }, new Map<string, number>()).entries(),
  )
    .sort((a, b) => b[1] - a[1])
    .map(([sourceKind, count]) => ({ sourceKind, count }));

  return {
    occurredAt: latest.occurredAt,
    mode: latest.mode,
    path: latest.path,
    fallbackUsed: latest.fallbackUsed,
    fallbackReason: latest.fallbackReason,
    citationCount,
    chunkCitationCount,
    bridgeCitationCount,
    sourceKindCounts,
    citations: normalizedCitations,
    eventCount: parsed.length,
  };
}

function parseMemoryEvent(event: InterventionTimelineEvent): ParsedMemoryEvent | null {
  if (typeof event.trustEventName !== "string" || !event.trustEventName.startsWith("trust.memory.")) {
    return null;
  }

  const metadata = ensureRecord(event.metadata);
  const memoryCandidateIds = uniqueStrings(
    readStringArray(metadata?.memoryCandidateIds)
    || readStringArray(metadata?.memory_candidate_ids)
    || [],
  );

  return {
    occurredAt: event.occurredAt,
    eventName: event.trustEventName,
    consentScope:
      readString(metadata?.consentScope)
      || readString(metadata?.consent_scope),
    consentDecision:
      readString(metadata?.consentDecision)
      || readString(metadata?.consent_decision),
    memoryCandidateIds,
    consentPromptVersion:
      readString(metadata?.consentPromptVersion)
      || readString(metadata?.consent_prompt_version),
  };
}

function parseRetrievalEvidence(event: InterventionTimelineEvent): ParsedRetrievalEvidence | null {
  const metadata = ensureRecord(event.metadata);
  if (!metadata) {
    return null;
  }

  const retrieval = ensureRecord(metadata.retrieval) || metadata;
  if (!retrieval) {
    return null;
  }

  const mode = readString(retrieval.mode);
  const path = readString(retrieval.path);
  const hasCitationShape =
    Array.isArray(retrieval.citations)
    || typeof retrieval.citationCount === "number"
    || typeof retrieval.chunkCitationCount === "number";
  if (!mode && !path && !hasCitationShape) {
    return null;
  }

  const citations = Array.isArray(retrieval.citations)
    ? retrieval.citations
        .map(parseRetrievalCitation)
        .filter((citation): citation is ParsedRetrievalCitation => citation !== null)
    : [];

  return {
    occurredAt: event.occurredAt,
    mode,
    path,
    fallbackUsed:
      typeof retrieval.fallbackUsed === "boolean" ? retrieval.fallbackUsed : undefined,
    fallbackReason: readString(retrieval.fallbackReason),
    citationCount:
      typeof retrieval.citationCount === "number" ? retrieval.citationCount : undefined,
    chunkCitationCount:
      typeof retrieval.chunkCitationCount === "number"
        ? retrieval.chunkCitationCount
        : undefined,
    citations,
  };
}

function parseRetrievalCitation(value: unknown): ParsedRetrievalCitation | null {
  const record = ensureRecord(value);
  if (!record) {
    return null;
  }

  return {
    citationId: readString(record.citationId),
    source: readString(record.source),
    chunkId: readString(record.chunkId),
    mediaId: readString(record.mediaId),
    filename: readString(record.filename),
  };
}

function ensureRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
}
