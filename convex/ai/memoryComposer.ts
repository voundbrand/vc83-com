import {
  normalizeTeamAccessModeToken,
  type TeamAccessMode,
} from "./harness";

export interface KnowledgeContextDocument {
  mediaId?: string;
  chunkId?: string;
  chunkOrdinal?: number;
  filename: string;
  content: string;
  description?: string;
  tags?: string[];
  sizeBytes?: number;
  source?: string;
  updatedAt?: number;
  citationId?: string;
  semanticScore?: number;
  confidence?: number;
  confidenceBand?: "high" | "medium" | "low";
  matchedTokens?: string[];
  retrievalMethod?: string;
}

export interface KnowledgeContextComposition {
  documents: KnowledgeContextDocument[];
  tokenBudget: number;
  estimatedTokensUsed: number;
  droppedDocumentCount: number;
  truncatedDocumentCount: number;
  bytesUsed: number;
  sourceTags: string[];
}

export interface SemanticRetrievalChunkCandidate {
  chunkId: string;
  mediaId?: string;
  chunkOrdinal?: number;
  chunkText: string;
  sourceFilename: string;
  sourceDescription?: string;
  sourceTags?: string[];
  sourceUpdatedAt?: number;
  embeddingScore?: number;
}

export interface RankedSemanticRetrievalChunk extends SemanticRetrievalChunkCandidate {
  semanticScore: number;
  confidence: number;
  confidenceBand: "high" | "medium" | "low";
  matchedTokens: string[];
}

export interface OperatorPinnedNoteContextRecord {
  noteId: string;
  note: string;
  title?: string;
  sortOrder?: number;
  pinnedAt?: number;
  updatedAt?: number;
}

interface ComposeKnowledgeContextArgs {
  documents: KnowledgeContextDocument[];
  modelContextLength?: number;
  budgetRatio?: number;
  minBudgetTokens?: number;
  maxBudgetTokens?: number;
}

const ESTIMATED_CHARS_PER_TOKEN = 4;
const DEFAULT_MODEL_CONTEXT_LENGTH = 128_000;
const DEFAULT_BUDGET_RATIO = 0.2;
const DEFAULT_MIN_BUDGET_TOKENS = 1_000;
const DEFAULT_MAX_BUDGET_TOKENS = 12_000;
const DEFAULT_RECENT_CONTEXT_BUDGET_RATIO = 0.14;
const DEFAULT_RECENT_CONTEXT_MIN_BUDGET_TOKENS = 320;
const DEFAULT_RECENT_CONTEXT_MAX_BUDGET_TOKENS = 7_200;
const DEFAULT_RECENT_CONTEXT_RESPONSE_RESERVE_RATIO = 0.18;
const DEFAULT_RECENT_CONTEXT_RESPONSE_RESERVE_MIN_TOKENS = 768;
const DEFAULT_RECENT_CONTEXT_MAX_MESSAGES = 64;
const RECENT_CONTEXT_MESSAGE_OVERHEAD_TOKENS = 8;
const OPERATOR_PINNED_NOTE_CHAR_LIMIT = 1_200;
const ROLLING_SESSION_SUMMARY_MAX_USER_POINTS = 4;
const ROLLING_SESSION_SUMMARY_MAX_TOOL_POINTS = 4;
const ROLLING_SESSION_SUMMARY_USER_SNIPPET_MAX_CHARS = 220;
const ROLLING_SESSION_SUMMARY_TOOL_SNIPPET_MAX_CHARS = 260;
const ROLLING_SESSION_SUMMARY_MAX_CHARS = 1_600;
const REACTIVATION_MEMORY_SECTION_MAX_CHARS = 1_300;
const REACTIVATION_MEMORY_SUMMARY_MAX_CHARS = 900;
const REACTIVATION_MEMORY_CONTEXT_MAX_CHARS = 2_400;
const REACTIVATION_MEMORY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CONTACT_MEMORY_VALUE_MAX_CHARS = 160;
const CONTACT_MEMORY_EXCERPT_MAX_CHARS = 220;
const CONTACT_MEMORY_TOOL_SCAN_MAX_DEPTH = 3;
const CONTACT_MEMORY_TOOL_SCAN_MAX_ARRAY_ITEMS = 5;
const UTF8_ENCODER = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
const SEMANTIC_RETRIEVAL_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "for",
  "from",
  "how",
  "in",
  "is",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "we",
  "what",
  "when",
  "where",
  "which",
  "with",
]);

export interface SpecialistMemoryContextArgs {
  teamAccessMode?: TeamAccessMode | string;
  specialistName?: string;
  reason: string;
  summary: string;
  goal: string;
  priorSharedContext?: string;
}

export const ROLLING_SESSION_MEMORY_CONTRACT_VERSION =
  "session_rolling_summary_v1" as const;
export const ROLLING_SESSION_MEMORY_SOURCE_POLICY =
  "user_verified_tool_only_v1" as const;
export const SESSION_REACTIVATION_MEMORY_CONTRACT_VERSION =
  "session_reactivation_memory_v1" as const;
export const SESSION_REACTIVATION_MEMORY_SOURCE_POLICY =
  "rolling_summary_close_summary_v1" as const;
export const SESSION_REACTIVATION_MEMORY_TRIGGER =
  "inactivity_reactivation_v1" as const;
export const SESSION_CONTACT_MEMORY_CONTRACT_VERSION =
  "session_contact_memory_v1" as const;
export const SESSION_CONTACT_MEMORY_SOURCE_POLICY =
  "explicit_user_verified_tool_v1" as const;
export const SESSION_CONTACT_MEMORY_PROVENANCE_VERSION =
  "contact_memory_provenance_v1" as const;
export const SESSION_CONTACT_MEMORY_TRUST_EVENT_NAME =
  "trust.memory.consent_decided.v1" as const;
export const CONTACT_MEMORY_FIELD_ORDER = [
  "preferred_name",
  "email",
  "phone",
  "timezone",
  "communication_preference",
] as const;
export type SessionContactMemoryField = (typeof CONTACT_MEMORY_FIELD_ORDER)[number];
export type SessionContactMemorySourceKind =
  | "user_message"
  | "verified_tool_result";
export type SessionContactMemoryStatus = "active" | "superseded";

export interface SessionHistoryContextMessage {
  role: string;
  content: string;
  timestamp?: number;
  toolCalls?: unknown;
}

export interface SessionRollingSummaryMemoryRecord {
  contractVersion: typeof ROLLING_SESSION_MEMORY_CONTRACT_VERSION;
  sourcePolicy: typeof ROLLING_SESSION_MEMORY_SOURCE_POLICY;
  summary: string;
  sourceMessageCount: number;
  userMessageCount: number;
  verifiedToolResultCount: number;
  updatedAt: number;
}

export type SessionReactivationCloseReason = "idle_timeout" | "expired";

export interface SessionReactivationMemoryRecord {
  contractVersion: typeof SESSION_REACTIVATION_MEMORY_CONTRACT_VERSION;
  sourcePolicy: typeof SESSION_REACTIVATION_MEMORY_SOURCE_POLICY;
  trigger: typeof SESSION_REACTIVATION_MEMORY_TRIGGER;
  cachedContext: string;
  generatedAt: number;
  cacheExpiresAt: number;
  inactivityGapMs: number;
  source: {
    sessionId: string;
    organizationId: string;
    channel: string;
    externalContactIdentifier: string;
    sessionRoutingKey: string;
    closeReason: SessionReactivationCloseReason;
    closedAt: number;
    lastMessageAt: number;
  };
  provenance: {
    derivedFromRollingSummary: boolean;
    derivedFromSessionSummary: boolean;
  };
}

export interface SessionContactMemoryProvenanceRecord {
  contractVersion: typeof SESSION_CONTACT_MEMORY_PROVENANCE_VERSION;
  sourceKind: SessionContactMemorySourceKind;
  sourceSessionId: string;
  sourceTurnId: string;
  sourceMessageRole?: "user";
  sourceToolName?: string;
  sourceExcerpt: string;
  sourceTimestamp: number;
  actor: "agent_execution_pipeline";
  trustEventName: typeof SESSION_CONTACT_MEMORY_TRUST_EVENT_NAME;
  trustEventId: string;
}

export interface SessionContactMemoryRecord {
  memoryId: string;
  contractVersion: typeof SESSION_CONTACT_MEMORY_CONTRACT_VERSION;
  sourcePolicy: typeof SESSION_CONTACT_MEMORY_SOURCE_POLICY;
  field: SessionContactMemoryField;
  value: string;
  normalizedValue: string;
  dedupeKey: string;
  status: SessionContactMemoryStatus;
  supersedesMemoryId?: string;
  supersededByMemoryId?: string;
  revertedFromMemoryId?: string;
  provenance: SessionContactMemoryProvenanceRecord;
  createdAt: number;
  updatedAt: number;
}

export interface SessionContactMemoryExtractionCandidate {
  field: SessionContactMemoryField;
  value: string;
  normalizedValue: string;
  dedupeKey: string;
  sourceKind: SessionContactMemorySourceKind;
  sourceExcerpt: string;
  sourceToolName?: string;
}

export interface SessionContactMemoryMergeOperation {
  operationKey: string;
  candidate: SessionContactMemoryExtractionCandidate;
  mergeKind: "insert" | "supersede" | "revert";
  supersedesMemoryId?: string;
  revertedFromMemoryId?: string;
}

export interface SessionContactMemoryMergePlan {
  candidates: SessionContactMemoryExtractionCandidate[];
  operations: SessionContactMemoryMergeOperation[];
  ambiguousFields: SessionContactMemoryField[];
}

export interface AdaptiveRecentContextWindow {
  messages: SessionHistoryContextMessage[];
  tokenBudget: number;
  estimatedTokensUsed: number;
  droppedMessageCount: number;
  truncatedMessageCount: number;
}

interface BuildRollingSessionMemorySnapshotArgs {
  messages: SessionHistoryContextMessage[];
  now?: number;
  maxSummaryChars?: number;
}

interface BuildSessionReactivationMemorySnapshotArgs {
  sourceSessionId: string;
  sourceOrganizationId: string;
  sourceChannel: string;
  sourceExternalContactIdentifier: string;
  sourceSessionRoutingKey: string;
  sourceCloseReason: SessionReactivationCloseReason;
  sourceClosedAt: number;
  sourceLastMessageAt: number;
  inactivityGapMs: number;
  rollingSummaryMemory?: SessionRollingSummaryMemoryRecord | null;
  sessionSummary?: string | null;
  now?: number;
  cacheTtlMs?: number;
}

interface ComposeAdaptiveRecentContextWindowArgs {
  messages: SessionHistoryContextMessage[];
  modelContextLength?: number;
  reservedTokens?: number;
  budgetRatio?: number;
  minBudgetTokens?: number;
  maxBudgetTokens?: number;
  responseReserveRatio?: number;
  responseReserveMinTokens?: number;
  maxMessages?: number;
}

interface ToolResultRecord {
  tool?: unknown;
  status?: unknown;
  result?: unknown;
}

function compactSpecialistMemoryLine(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function composeSpecialistMemoryContext(
  args: SpecialistMemoryContextArgs
): string {
  const teamAccessMode = normalizeTeamAccessModeToken(
    args.teamAccessMode,
    "invisible"
  ) ?? "invisible";
  const specialistName = args.specialistName?.trim() || "specialist";
  const reason = compactSpecialistMemoryLine(args.reason || "Specialist handoff");
  const summary = compactSpecialistMemoryLine(args.summary || reason);
  const goal = compactSpecialistMemoryLine(args.goal || "Support the active conversation");
  const priorSharedContext = args.priorSharedContext?.trim();

  const modeGuidance = teamAccessMode === "direct"
    ? "Direct mode: specialist may answer in first person when active."
    : teamAccessMode === "meeting"
      ? "Meeting mode: primary agent remains visible and synthesizes specialist input."
      : "Invisible mode: specialist advice remains internal to primary-agent voice.";

  const lines: string[] = [];
  if (priorSharedContext && priorSharedContext.length > 0) {
    lines.push(priorSharedContext);
  }
  lines.push(`[Specialist routing mode: ${teamAccessMode}]`);
  lines.push(`Specialist: ${specialistName}`);
  lines.push(`Reason: ${reason}`);
  lines.push(`Summary: ${summary}`);
  lines.push(`Goal: ${goal}`);
  lines.push(modeGuidance);

  return lines.join("\n");
}

export function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / ESTIMATED_CHARS_PER_TOKEN);
}

export function getUtf8ByteLength(text: string): number {
  if (!text) return 0;
  if (UTF8_ENCODER) {
    return UTF8_ENCODER.encode(text).length;
  }
  // Fallback for runtimes without TextEncoder.
  return encodeURIComponent(text).replace(/%[A-F\d]{2}/g, "U").length;
}

function normalizePinnedNoteSortOrder(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(9_999, Math.max(-9_999, Math.trunc(value)));
}

function normalizePinnedNoteTimestamp(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.trunc(value));
}

function normalizePinnedNoteText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\s+/g, " ");
}

function truncatePinnedNoteText(text: string): string {
  if (text.length <= OPERATOR_PINNED_NOTE_CHAR_LIMIT) {
    return text;
  }
  return `${text.slice(0, OPERATOR_PINNED_NOTE_CHAR_LIMIT).trimEnd()} [truncated]`;
}

export function sortOperatorPinnedNotesForPrompt(
  notes: OperatorPinnedNoteContextRecord[]
): OperatorPinnedNoteContextRecord[] {
  return notes
    .filter((note) => normalizePinnedNoteText(note.note).length > 0)
    .map((note) => ({
      noteId: String(note.noteId),
      note: normalizePinnedNoteText(note.note),
      title: normalizePinnedNoteText(note.title),
      sortOrder: normalizePinnedNoteSortOrder(note.sortOrder),
      pinnedAt: normalizePinnedNoteTimestamp(note.pinnedAt),
      updatedAt: normalizePinnedNoteTimestamp(note.updatedAt),
    }))
    .sort((a, b) => {
      const sortOrderDelta = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (sortOrderDelta !== 0) {
        return sortOrderDelta;
      }
      const pinnedAtDelta = (a.pinnedAt ?? 0) - (b.pinnedAt ?? 0);
      if (pinnedAtDelta !== 0) {
        return pinnedAtDelta;
      }
      const updatedAtDelta = (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
      if (updatedAtDelta !== 0) {
        return updatedAtDelta;
      }
      return a.noteId.localeCompare(b.noteId);
    });
}

export function composeOperatorPinnedNotesContext(
  notes: OperatorPinnedNoteContextRecord[]
): string | null {
  const sorted = sortOperatorPinnedNotesForPrompt(notes);
  if (sorted.length === 0) {
    return null;
  }

  const lines: string[] = [
    "--- OPERATOR PINNED NOTES (L3) ---",
    "Durable operator-authored guidance. Treat these as stable memory unless the user explicitly overrides them in this thread.",
  ];

  for (let index = 0; index < sorted.length; index += 1) {
    const note = sorted[index];
    const label =
      note.title && note.title.length > 0
        ? note.title
        : `Pinned note ${index + 1}`;
    lines.push(`[L3-${index + 1}] ${label} (priority ${note.sortOrder ?? 0})`);
    lines.push(truncatePinnedNoteText(note.note));
    if (index < sorted.length - 1) {
      lines.push("");
    }
  }

  lines.push("--- END OPERATOR PINNED NOTES (L3) ---");
  return lines.join("\n");
}

export function tokenizeSemanticRetrievalText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !SEMANTIC_RETRIEVAL_STOP_WORDS.has(token));
}

function normalizeRollingSummaryText(
  value: unknown,
  maxChars: number
): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length === 0) {
    return null;
  }
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars).trimEnd()} [truncated]`;
}

function normalizeReactivationScopeToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeReactivationTimestamp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.trunc(value));
}

function normalizeReactivationDurationMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.trunc(value));
}

function normalizeToolResultSummary(value: unknown): string | null {
  if (typeof value === "string") {
    return normalizeRollingSummaryText(
      value,
      ROLLING_SESSION_SUMMARY_TOOL_SNIPPET_MAX_CHARS
    );
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return null;
  }
  return normalizeRollingSummaryText(
    serialized,
    ROLLING_SESSION_SUMMARY_TOOL_SNIPPET_MAX_CHARS
  );
}

function collectVerifiedToolOutcomeSummaries(
  toolCalls: unknown
): string[] {
  if (!Array.isArray(toolCalls)) {
    return [];
  }
  const summaries: string[] = [];
  for (const toolCall of toolCalls) {
    if (!toolCall || typeof toolCall !== "object") {
      continue;
    }
    const record = toolCall as ToolResultRecord;
    if (record.status !== "success") {
      continue;
    }
    const toolName = normalizeRollingSummaryText(
      record.tool,
      ROLLING_SESSION_SUMMARY_TOOL_SNIPPET_MAX_CHARS
    );
    const resultSummary = normalizeToolResultSummary(record.result);
    if (!toolName || !resultSummary) {
      continue;
    }
    summaries.push(`${toolName}: ${resultSummary}`);
  }
  return summaries;
}

function normalizeRecentContextRole(value: unknown): "user" | "assistant" | null {
  return value === "user" || value === "assistant" ? value : null;
}

export function normalizeSessionRollingSummaryMemoryRecord(
  value: unknown
): SessionRollingSummaryMemoryRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    record.contractVersion !== ROLLING_SESSION_MEMORY_CONTRACT_VERSION
    || record.sourcePolicy !== ROLLING_SESSION_MEMORY_SOURCE_POLICY
    || typeof record.summary !== "string"
    || typeof record.sourceMessageCount !== "number"
    || typeof record.userMessageCount !== "number"
    || typeof record.verifiedToolResultCount !== "number"
    || typeof record.updatedAt !== "number"
  ) {
    return null;
  }
  const summary = record.summary.trim();
  if (summary.length === 0) {
    return null;
  }
  return {
    contractVersion: ROLLING_SESSION_MEMORY_CONTRACT_VERSION,
    sourcePolicy: ROLLING_SESSION_MEMORY_SOURCE_POLICY,
    summary,
    sourceMessageCount: Math.max(0, Math.trunc(record.sourceMessageCount)),
    userMessageCount: Math.max(0, Math.trunc(record.userMessageCount)),
    verifiedToolResultCount: Math.max(0, Math.trunc(record.verifiedToolResultCount)),
    updatedAt: Math.max(0, Math.trunc(record.updatedAt)),
  };
}

export function normalizeSessionReactivationMemoryRecord(
  value: unknown
): SessionReactivationMemoryRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    record.contractVersion !== SESSION_REACTIVATION_MEMORY_CONTRACT_VERSION
    || record.sourcePolicy !== SESSION_REACTIVATION_MEMORY_SOURCE_POLICY
    || record.trigger !== SESSION_REACTIVATION_MEMORY_TRIGGER
  ) {
    return null;
  }

  const cachedContext = normalizeRollingSummaryText(
    record.cachedContext,
    REACTIVATION_MEMORY_CONTEXT_MAX_CHARS
  );
  const generatedAt = normalizeReactivationTimestamp(record.generatedAt);
  const cacheExpiresAt = normalizeReactivationTimestamp(record.cacheExpiresAt);
  const inactivityGapMs = normalizeReactivationDurationMs(record.inactivityGapMs);
  if (
    !cachedContext
    || generatedAt === null
    || cacheExpiresAt === null
    || inactivityGapMs === null
    || cacheExpiresAt <= generatedAt
  ) {
    return null;
  }

  const sourceRecord =
    record.source && typeof record.source === "object"
      ? record.source as Record<string, unknown>
      : null;
  if (!sourceRecord) {
    return null;
  }
  const sourceSessionId = normalizeReactivationScopeToken(sourceRecord.sessionId);
  const sourceOrganizationId = normalizeReactivationScopeToken(
    sourceRecord.organizationId
  );
  const sourceChannel = normalizeReactivationScopeToken(sourceRecord.channel);
  const sourceExternalContactIdentifier = normalizeReactivationScopeToken(
    sourceRecord.externalContactIdentifier
  );
  const sourceSessionRoutingKey = normalizeReactivationScopeToken(
    sourceRecord.sessionRoutingKey
  );
  const sourceCloseReason =
    sourceRecord.closeReason === "idle_timeout"
      || sourceRecord.closeReason === "expired"
      ? sourceRecord.closeReason
      : null;
  const sourceClosedAt = normalizeReactivationTimestamp(sourceRecord.closedAt);
  const sourceLastMessageAt = normalizeReactivationTimestamp(sourceRecord.lastMessageAt);
  if (
    !sourceSessionId
    || !sourceOrganizationId
    || !sourceChannel
    || !sourceExternalContactIdentifier
    || !sourceSessionRoutingKey
    || !sourceCloseReason
    || sourceClosedAt === null
    || sourceLastMessageAt === null
    || sourceClosedAt < sourceLastMessageAt
    || generatedAt < sourceClosedAt
  ) {
    return null;
  }

  const provenanceRecord =
    record.provenance && typeof record.provenance === "object"
      ? record.provenance as Record<string, unknown>
      : null;
  if (!provenanceRecord) {
    return null;
  }
  const derivedFromRollingSummary = provenanceRecord.derivedFromRollingSummary === true;
  const derivedFromSessionSummary = provenanceRecord.derivedFromSessionSummary === true;
  if (!derivedFromRollingSummary && !derivedFromSessionSummary) {
    return null;
  }

  return {
    contractVersion: SESSION_REACTIVATION_MEMORY_CONTRACT_VERSION,
    sourcePolicy: SESSION_REACTIVATION_MEMORY_SOURCE_POLICY,
    trigger: SESSION_REACTIVATION_MEMORY_TRIGGER,
    cachedContext,
    generatedAt,
    cacheExpiresAt,
    inactivityGapMs,
    source: {
      sessionId: sourceSessionId,
      organizationId: sourceOrganizationId,
      channel: sourceChannel,
      externalContactIdentifier: sourceExternalContactIdentifier,
      sessionRoutingKey: sourceSessionRoutingKey,
      closeReason: sourceCloseReason,
      closedAt: sourceClosedAt,
      lastMessageAt: sourceLastMessageAt,
    },
    provenance: {
      derivedFromRollingSummary,
      derivedFromSessionSummary,
    },
  };
}

export function buildRollingSessionMemorySnapshot(
  args: BuildRollingSessionMemorySnapshotArgs
): SessionRollingSummaryMemoryRecord | null {
  const userPoints: string[] = [];
  const toolPoints: string[] = [];
  const seenUserPoints = new Set<string>();
  const seenToolPoints = new Set<string>();
  const sourceMessageIndexes = new Set<number>();
  let userMessageCount = 0;

  const descendingMessages = [...args.messages].reverse();
  for (let index = 0; index < descendingMessages.length; index += 1) {
    const message = descendingMessages[index];
    const originalIndex = args.messages.length - index - 1;
    const role = normalizeRecentContextRole(message.role);
    if (!role) {
      continue;
    }

    let collectedFromMessage = false;
    if (role === "user" && userPoints.length < ROLLING_SESSION_SUMMARY_MAX_USER_POINTS) {
      const userPoint = normalizeRollingSummaryText(
        message.content,
        ROLLING_SESSION_SUMMARY_USER_SNIPPET_MAX_CHARS
      );
      if (userPoint) {
        const dedupeKey = userPoint.toLowerCase();
        if (!seenUserPoints.has(dedupeKey)) {
          seenUserPoints.add(dedupeKey);
          userPoints.push(userPoint);
          userMessageCount += 1;
          collectedFromMessage = true;
        }
      }
    }

    if (toolPoints.length < ROLLING_SESSION_SUMMARY_MAX_TOOL_POINTS) {
      const toolOutcomes = collectVerifiedToolOutcomeSummaries(message.toolCalls);
      for (const outcome of toolOutcomes) {
        if (toolPoints.length >= ROLLING_SESSION_SUMMARY_MAX_TOOL_POINTS) {
          break;
        }
        const dedupeKey = outcome.toLowerCase();
        if (seenToolPoints.has(dedupeKey)) {
          continue;
        }
        seenToolPoints.add(dedupeKey);
        toolPoints.push(outcome);
        collectedFromMessage = true;
      }
    }

    if (collectedFromMessage) {
      sourceMessageIndexes.add(originalIndex);
    }

    if (
      userPoints.length >= ROLLING_SESSION_SUMMARY_MAX_USER_POINTS
      && toolPoints.length >= ROLLING_SESSION_SUMMARY_MAX_TOOL_POINTS
    ) {
      break;
    }
  }

  if (userPoints.length === 0 && toolPoints.length === 0) {
    return null;
  }

  const summaryLines: string[] = [];
  if (userPoints.length > 0) {
    summaryLines.push("Recent user signals:");
    for (let index = userPoints.length - 1; index >= 0; index -= 1) {
      summaryLines.push(`- ${userPoints[index]}`);
    }
  }
  if (toolPoints.length > 0) {
    if (summaryLines.length > 0) {
      summaryLines.push("");
    }
    summaryLines.push("Verified tool outcomes:");
    for (let index = toolPoints.length - 1; index >= 0; index -= 1) {
      summaryLines.push(`- ${toolPoints[index]}`);
    }
  }

  let summary = summaryLines.join("\n").trim();
  const maxSummaryChars = Math.max(
    240,
    Math.trunc(args.maxSummaryChars ?? ROLLING_SESSION_SUMMARY_MAX_CHARS)
  );
  if (summary.length > maxSummaryChars) {
    summary = `${summary.slice(0, maxSummaryChars).trimEnd()} [truncated]`;
  }

  return {
    contractVersion: ROLLING_SESSION_MEMORY_CONTRACT_VERSION,
    sourcePolicy: ROLLING_SESSION_MEMORY_SOURCE_POLICY,
    summary,
    sourceMessageCount: sourceMessageIndexes.size,
    userMessageCount,
    verifiedToolResultCount: toolPoints.length,
    updatedAt: typeof args.now === "number" ? args.now : Date.now(),
  };
}

export function buildSessionReactivationMemorySnapshot(
  args: BuildSessionReactivationMemorySnapshotArgs
): SessionReactivationMemoryRecord | null {
  const sourceSessionId = normalizeReactivationScopeToken(args.sourceSessionId);
  const sourceOrganizationId = normalizeReactivationScopeToken(args.sourceOrganizationId);
  const sourceChannel = normalizeReactivationScopeToken(args.sourceChannel);
  const sourceExternalContactIdentifier = normalizeReactivationScopeToken(
    args.sourceExternalContactIdentifier
  );
  const sourceSessionRoutingKey = normalizeReactivationScopeToken(
    args.sourceSessionRoutingKey
  );
  const sourceCloseReason =
    args.sourceCloseReason === "idle_timeout" || args.sourceCloseReason === "expired"
      ? args.sourceCloseReason
      : null;
  const sourceClosedAt = normalizeReactivationTimestamp(args.sourceClosedAt);
  const sourceLastMessageAt = normalizeReactivationTimestamp(args.sourceLastMessageAt);
  const inactivityGapMs = normalizeReactivationDurationMs(args.inactivityGapMs);
  if (
    !sourceSessionId
    || !sourceOrganizationId
    || !sourceChannel
    || !sourceExternalContactIdentifier
    || !sourceSessionRoutingKey
    || !sourceCloseReason
    || sourceClosedAt === null
    || sourceLastMessageAt === null
    || inactivityGapMs === null
    || sourceClosedAt < sourceLastMessageAt
  ) {
    return null;
  }

  const rollingSummary = normalizeSessionRollingSummaryMemoryRecord(
    args.rollingSummaryMemory
  );
  const sessionSummary = normalizeRollingSummaryText(
    args.sessionSummary,
    REACTIVATION_MEMORY_SUMMARY_MAX_CHARS
  );
  if (!rollingSummary && !sessionSummary) {
    return null;
  }

  const lines: string[] = [
    "Reactivation context generated after an inactivity boundary.",
  ];
  if (rollingSummary?.summary) {
    lines.push("");
    lines.push("Rolling memory snapshot (L2 source):");
    lines.push(
      normalizeRollingSummaryText(
        rollingSummary.summary,
        REACTIVATION_MEMORY_SECTION_MAX_CHARS
      ) ?? rollingSummary.summary
    );
  }
  if (sessionSummary) {
    lines.push("");
    lines.push("Closed-session summary:");
    lines.push(sessionSummary);
  }

  const cachedContext = normalizeRollingSummaryText(
    lines.join("\n").trim(),
    REACTIVATION_MEMORY_CONTEXT_MAX_CHARS
  );
  if (!cachedContext) {
    return null;
  }

  const now = normalizeReactivationTimestamp(args.now) ?? Date.now();
  const cacheTtlMs = Math.max(
    60_000,
    Math.min(
      30 * 24 * 60 * 60 * 1000,
      normalizeReactivationDurationMs(args.cacheTtlMs) ?? REACTIVATION_MEMORY_CACHE_TTL_MS
    )
  );
  const generatedAt = Math.max(now, sourceClosedAt);
  const cacheExpiresAt = generatedAt + cacheTtlMs;

  return {
    contractVersion: SESSION_REACTIVATION_MEMORY_CONTRACT_VERSION,
    sourcePolicy: SESSION_REACTIVATION_MEMORY_SOURCE_POLICY,
    trigger: SESSION_REACTIVATION_MEMORY_TRIGGER,
    cachedContext,
    generatedAt,
    cacheExpiresAt,
    inactivityGapMs,
    source: {
      sessionId: sourceSessionId,
      organizationId: sourceOrganizationId,
      channel: sourceChannel,
      externalContactIdentifier: sourceExternalContactIdentifier,
      sessionRoutingKey: sourceSessionRoutingKey,
      closeReason: sourceCloseReason,
      closedAt: sourceClosedAt,
      lastMessageAt: sourceLastMessageAt,
    },
    provenance: {
      derivedFromRollingSummary: Boolean(rollingSummary),
      derivedFromSessionSummary: Boolean(sessionSummary),
    },
  };
}

export function composeRollingSessionMemoryContext(
  value: SessionRollingSummaryMemoryRecord | null | undefined
): string | null {
  const memory = normalizeSessionRollingSummaryMemoryRecord(value);
  if (!memory) {
    return null;
  }
  return [
    "--- ROLLING SESSION MEMORY (L2) ---",
    "Derived from user messages and verified tool outputs. Treat this as memory context, but always defer to explicit user corrections in this turn.",
    memory.summary,
    "--- END ROLLING SESSION MEMORY (L2) ---",
  ].join("\n");
}

export function composeSessionReactivationMemoryContext(
  value: SessionReactivationMemoryRecord | null | undefined
): string | null {
  const memory = normalizeSessionReactivationMemoryRecord(value);
  if (!memory) {
    return null;
  }
  return [
    "--- REACTIVATION MEMORY (L5) ---",
    `Trigger: ${memory.trigger}; inactivity gap: ${memory.inactivityGapMs}ms.`,
    `Provenance: source_session=${memory.source.sessionId}; source_org=${memory.source.organizationId}; source_channel=${memory.source.channel}; source_route=${memory.source.sessionRoutingKey}; source_close_reason=${memory.source.closeReason}.`,
    `Cache window: generated_at=${memory.generatedAt}; expires_at=${memory.cacheExpiresAt}.`,
    "Continuity boundary: apply only to this exact tenant/channel/contact/route scope and defer to explicit user corrections in this turn.",
    memory.cachedContext,
    "--- END REACTIVATION MEMORY (L5) ---",
  ].join("\n");
}

const CONTACT_MEMORY_FIELD_LABELS: Record<SessionContactMemoryField, string> = {
  preferred_name: "Preferred name",
  email: "Email",
  phone: "Phone",
  timezone: "Timezone",
  communication_preference: "Communication preference",
};

const CONTACT_MEMORY_FIELD_ORDER_MAP = new Map<SessionContactMemoryField, number>(
  CONTACT_MEMORY_FIELD_ORDER.map((field, index) => [field, index])
);

const CONTACT_MEMORY_SOURCE_PRIORITY: Record<SessionContactMemorySourceKind, number> = {
  user_message: 2,
  verified_tool_result: 1,
};

const CONTACT_MEMORY_USER_EMAIL_PATTERN =
  /\b(?:my email is|email me at|you can email me at)\s+([^\s,;]+)/gi;
const CONTACT_MEMORY_USER_PHONE_PATTERN =
  /\b(?:my phone(?: number)? is|text me at|call me at)\s+([+\d().\-\s]{8,24})/gi;
const CONTACT_MEMORY_USER_TIMEZONE_PATTERN =
  /\b(?:my timezone is|i(?:'m| am) in timezone)\s+([A-Za-z_\/+\-]{2,64})/gi;
const CONTACT_MEMORY_USER_PREFERENCE_PATTERN =
  /\b(?:i prefer|please use|best way to reach me is)\s+(email|e-mail|sms|text|phone|call|whatsapp|telegram)\b/gi;
const CONTACT_MEMORY_USER_NAME_PATTERNS = [
  /\bmy name is\s+([A-Za-z][A-Za-z .'-]{1,80})/gi,
  /\bcall me\s+([A-Za-z][A-Za-z .'-]{1,80})/gi,
];
const CONTACT_MEMORY_EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const CONTACT_MEMORY_NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,80}$/;
const CONTACT_MEMORY_TIMEZONE_REGEX = /^[A-Za-z_\/+\-]{2,64}$/;
const CONTACT_MEMORY_TOOL_FIELD_MAP: Record<string, SessionContactMemoryField> = {
  preferredname: "preferred_name",
  firstname: "preferred_name",
  fullname: "preferred_name",
  name: "preferred_name",
  email: "email",
  emailaddress: "email",
  contactemail: "email",
  phone: "phone",
  phonenumber: "phone",
  mobile: "phone",
  mobilephone: "phone",
  timezone: "timezone",
  tz: "timezone",
  preferredcontactchannel: "communication_preference",
  communicationpreference: "communication_preference",
  preferredchannel: "communication_preference",
  contactchannel: "communication_preference",
};

function normalizeContactMemoryText(value: unknown, maxChars: number): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length === 0) {
    return null;
  }
  return normalized.slice(0, maxChars);
}

function normalizeContactMemoryEmail(value: unknown): string | null {
  const text = normalizeContactMemoryText(value, CONTACT_MEMORY_VALUE_MAX_CHARS);
  if (!text) {
    return null;
  }
  const normalized = text.toLowerCase();
  return CONTACT_MEMORY_EMAIL_REGEX.test(normalized) ? normalized : null;
}

function normalizeContactMemoryPhone(value: unknown): string | null {
  const text = normalizeContactMemoryText(value, CONTACT_MEMORY_VALUE_MAX_CHARS);
  if (!text) {
    return null;
  }
  const hasLeadingPlus = text.trim().startsWith("+");
  const digitsOnly = text.replace(/[^\d]/g, "");
  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return null;
  }
  return `${hasLeadingPlus ? "+" : ""}${digitsOnly}`;
}

function normalizeContactMemoryTimezone(value: unknown): string | null {
  const text = normalizeContactMemoryText(value, CONTACT_MEMORY_VALUE_MAX_CHARS);
  if (!text) {
    return null;
  }
  const normalized = text.replace(/\s+/g, "_");
  return CONTACT_MEMORY_TIMEZONE_REGEX.test(normalized) ? normalized : null;
}

function normalizeContactMemoryPreference(value: unknown): string | null {
  const text = normalizeContactMemoryText(value, CONTACT_MEMORY_VALUE_MAX_CHARS);
  if (!text) {
    return null;
  }
  const normalized = text.toLowerCase();
  if (normalized === "e-mail") {
    return "email";
  }
  if (normalized === "text") {
    return "sms";
  }
  if (normalized === "call") {
    return "phone";
  }
  if (
    normalized === "email"
    || normalized === "sms"
    || normalized === "phone"
    || normalized === "whatsapp"
    || normalized === "telegram"
  ) {
    return normalized;
  }
  return null;
}

function normalizeContactMemoryDisplayName(value: unknown): string | null {
  const text = normalizeContactMemoryText(value, CONTACT_MEMORY_VALUE_MAX_CHARS);
  if (!text) {
    return null;
  }
  const normalized = text.replace(/[.,!?;:]+$/, "").trim();
  if (!CONTACT_MEMORY_NAME_REGEX.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeContactMemoryFieldValue(
  field: SessionContactMemoryField,
  value: unknown
): string | null {
  if (field === "email") {
    return normalizeContactMemoryEmail(value);
  }
  if (field === "phone") {
    return normalizeContactMemoryPhone(value);
  }
  if (field === "timezone") {
    return normalizeContactMemoryTimezone(value);
  }
  if (field === "communication_preference") {
    return normalizeContactMemoryPreference(value);
  }
  return normalizeContactMemoryDisplayName(value);
}

function buildContactMemoryDedupeKey(
  field: SessionContactMemoryField,
  normalizedValue: string
): string {
  return `${field}:${normalizedValue.toLowerCase()}`;
}

function buildContactMemoryExtractionCandidate(args: {
  field: SessionContactMemoryField;
  value: unknown;
  sourceKind: SessionContactMemorySourceKind;
  sourceExcerpt: unknown;
  sourceToolName?: string;
}): SessionContactMemoryExtractionCandidate | null {
  const normalizedValue = normalizeContactMemoryFieldValue(args.field, args.value);
  const sourceExcerpt = normalizeContactMemoryText(
    args.sourceExcerpt,
    CONTACT_MEMORY_EXCERPT_MAX_CHARS
  );
  if (!normalizedValue || !sourceExcerpt) {
    return null;
  }
  return {
    field: args.field,
    value: normalizedValue,
    normalizedValue,
    dedupeKey: buildContactMemoryDedupeKey(args.field, normalizedValue),
    sourceKind: args.sourceKind,
    sourceExcerpt,
    sourceToolName: args.sourceToolName,
  };
}

function pushUserMessageContactCandidates(
  userMessage: string,
  target: SessionContactMemoryExtractionCandidate[]
): void {
  for (const pattern of CONTACT_MEMORY_USER_NAME_PATTERNS) {
    pattern.lastIndex = 0;
    let matched;
    while ((matched = pattern.exec(userMessage)) !== null) {
      const name = matched[1] ?? "";
      const candidate = buildContactMemoryExtractionCandidate({
        field: "preferred_name",
        value: name,
        sourceKind: "user_message",
        sourceExcerpt: `user:${matched[0]}`,
      });
      if (candidate) {
        target.push(candidate);
      }
    }
  }

  CONTACT_MEMORY_USER_EMAIL_PATTERN.lastIndex = 0;
  let matchedEmail;
  while ((matchedEmail = CONTACT_MEMORY_USER_EMAIL_PATTERN.exec(userMessage)) !== null) {
    const email = matchedEmail[1] ?? "";
    const candidate = buildContactMemoryExtractionCandidate({
      field: "email",
      value: email,
      sourceKind: "user_message",
      sourceExcerpt: `user:${matchedEmail[0]}`,
    });
    if (candidate) {
      target.push(candidate);
    }
  }

  CONTACT_MEMORY_USER_PHONE_PATTERN.lastIndex = 0;
  let matchedPhone;
  while ((matchedPhone = CONTACT_MEMORY_USER_PHONE_PATTERN.exec(userMessage)) !== null) {
    const phone = matchedPhone[1] ?? "";
    const candidate = buildContactMemoryExtractionCandidate({
      field: "phone",
      value: phone,
      sourceKind: "user_message",
      sourceExcerpt: `user:${matchedPhone[0]}`,
    });
    if (candidate) {
      target.push(candidate);
    }
  }

  CONTACT_MEMORY_USER_TIMEZONE_PATTERN.lastIndex = 0;
  let matchedTimezone;
  while ((matchedTimezone = CONTACT_MEMORY_USER_TIMEZONE_PATTERN.exec(userMessage)) !== null) {
    const timezone = matchedTimezone[1] ?? "";
    const candidate = buildContactMemoryExtractionCandidate({
      field: "timezone",
      value: timezone,
      sourceKind: "user_message",
      sourceExcerpt: `user:${matchedTimezone[0]}`,
    });
    if (candidate) {
      target.push(candidate);
    }
  }

  CONTACT_MEMORY_USER_PREFERENCE_PATTERN.lastIndex = 0;
  let matchedPreference;
  while (
    (matchedPreference = CONTACT_MEMORY_USER_PREFERENCE_PATTERN.exec(userMessage)) !== null
  ) {
    const preference = matchedPreference[1] ?? "";
    const candidate = buildContactMemoryExtractionCandidate({
      field: "communication_preference",
      value: preference,
      sourceKind: "user_message",
      sourceExcerpt: `user:${matchedPreference[0]}`,
    });
    if (candidate) {
      target.push(candidate);
    }
  }
}

function normalizeContactMemoryToolKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isLikelyContactScopedToolPath(pathSegments: string[]): boolean {
  if (pathSegments.length <= 1) {
    return true;
  }
  return pathSegments.some((segment) => {
    const normalized = segment.toLowerCase();
    return normalized.includes("contact")
      || normalized.includes("customer")
      || normalized.includes("lead")
      || normalized.includes("profile");
  });
}

function pushToolResultContactCandidates(args: {
  toolResults?: Array<{ tool?: unknown; status?: unknown; result?: unknown }>;
  target: SessionContactMemoryExtractionCandidate[];
}): void {
  for (const toolResult of args.toolResults || []) {
    if (!toolResult || toolResult.status !== "success") {
      continue;
    }
    const root = toolResult.result;
    if (!root || typeof root !== "object") {
      continue;
    }
    const toolName = normalizeContactMemoryText(toolResult.tool, 80) ?? "unknown_tool";
    const queue: Array<{ value: unknown; path: string[]; depth: number }> = [
      { value: root, path: [], depth: 0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || current.depth > CONTACT_MEMORY_TOOL_SCAN_MAX_DEPTH) {
        continue;
      }

      if (Array.isArray(current.value)) {
        current.value
          .slice(0, CONTACT_MEMORY_TOOL_SCAN_MAX_ARRAY_ITEMS)
          .forEach((entry, index) => {
            queue.push({
              value: entry,
              path: [...current.path, String(index)],
              depth: current.depth + 1,
            });
          });
        continue;
      }

      if (!current.value || typeof current.value !== "object") {
        continue;
      }

      const entries = Object.entries(current.value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b));
      for (const [rawKey, rawValue] of entries) {
        const normalizedKey = normalizeContactMemoryToolKey(rawKey);
        const field = CONTACT_MEMORY_TOOL_FIELD_MAP[normalizedKey];
        const path = [...current.path, rawKey];
        if (
          field
          && (typeof rawValue === "string" || typeof rawValue === "number")
          && isLikelyContactScopedToolPath(path)
        ) {
          const sourceExcerpt = `${toolName}:${path.join(".")}=${String(rawValue)}`;
          const candidate = buildContactMemoryExtractionCandidate({
            field,
            value: String(rawValue),
            sourceKind: "verified_tool_result",
            sourceExcerpt,
            sourceToolName: toolName,
          });
          if (candidate) {
            args.target.push(candidate);
          }
        }

        if (
          rawValue
          && typeof rawValue === "object"
          && current.depth + 1 <= CONTACT_MEMORY_TOOL_SCAN_MAX_DEPTH
        ) {
          queue.push({
            value: rawValue,
            path,
            depth: current.depth + 1,
          });
        }
      }
    }
  }
}

function compareContactMemoryCandidates(
  a: SessionContactMemoryExtractionCandidate,
  b: SessionContactMemoryExtractionCandidate
): number {
  const fieldDelta =
    (CONTACT_MEMORY_FIELD_ORDER_MAP.get(a.field) ?? 999)
    - (CONTACT_MEMORY_FIELD_ORDER_MAP.get(b.field) ?? 999);
  if (fieldDelta !== 0) {
    return fieldDelta;
  }
  const sourceDelta =
    CONTACT_MEMORY_SOURCE_PRIORITY[b.sourceKind]
    - CONTACT_MEMORY_SOURCE_PRIORITY[a.sourceKind];
  if (sourceDelta !== 0) {
    return sourceDelta;
  }
  const dedupeDelta = a.dedupeKey.localeCompare(b.dedupeKey);
  if (dedupeDelta !== 0) {
    return dedupeDelta;
  }
  const excerptDelta = a.sourceExcerpt.localeCompare(b.sourceExcerpt);
  if (excerptDelta !== 0) {
    return excerptDelta;
  }
  return (a.sourceToolName ?? "").localeCompare(b.sourceToolName ?? "");
}

function dedupeContactMemoryCandidates(
  candidates: SessionContactMemoryExtractionCandidate[]
): SessionContactMemoryExtractionCandidate[] {
  const deduped = new Map<string, SessionContactMemoryExtractionCandidate>();
  for (const candidate of candidates) {
    const existing = deduped.get(candidate.dedupeKey);
    if (!existing) {
      deduped.set(candidate.dedupeKey, candidate);
      continue;
    }
    if (compareContactMemoryCandidates(candidate, existing) < 0) {
      deduped.set(candidate.dedupeKey, candidate);
    }
  }
  return Array.from(deduped.values()).sort(compareContactMemoryCandidates);
}

function splitAmbiguousFieldCandidates(
  candidates: SessionContactMemoryExtractionCandidate[]
): {
  candidates: SessionContactMemoryExtractionCandidate[];
  ambiguousFields: SessionContactMemoryField[];
} {
  const valuesByField = new Map<SessionContactMemoryField, Set<string>>();
  for (const candidate of candidates) {
    const values = valuesByField.get(candidate.field) ?? new Set<string>();
    values.add(candidate.normalizedValue.toLowerCase());
    valuesByField.set(candidate.field, values);
  }

  const ambiguousFields = CONTACT_MEMORY_FIELD_ORDER.filter((field) => {
    const values = valuesByField.get(field);
    return Boolean(values && values.size > 1);
  });
  if (ambiguousFields.length === 0) {
    return { candidates, ambiguousFields: [] };
  }

  const blocked = new Set<SessionContactMemoryField>(ambiguousFields);
  return {
    candidates: candidates.filter((candidate) => !blocked.has(candidate.field)),
    ambiguousFields,
  };
}

function normalizeContactMemoryScopeToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeContactMemoryTimestamp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.trunc(value));
}

function normalizeContactMemoryField(value: unknown): SessionContactMemoryField | null {
  return CONTACT_MEMORY_FIELD_ORDER.includes(value as SessionContactMemoryField)
    ? (value as SessionContactMemoryField)
    : null;
}

function normalizeContactMemoryStatus(value: unknown): SessionContactMemoryStatus | null {
  return value === "active" || value === "superseded"
    ? value
    : null;
}

function normalizeSessionContactMemoryProvenanceRecord(
  value: unknown
): SessionContactMemoryProvenanceRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    record.contractVersion !== SESSION_CONTACT_MEMORY_PROVENANCE_VERSION
    || record.actor !== "agent_execution_pipeline"
    || record.trustEventName !== SESSION_CONTACT_MEMORY_TRUST_EVENT_NAME
  ) {
    return null;
  }

  const sourceKind =
    record.sourceKind === "user_message" || record.sourceKind === "verified_tool_result"
      ? record.sourceKind
      : null;
  const sourceSessionId = normalizeContactMemoryScopeToken(record.sourceSessionId);
  const sourceTurnId = normalizeContactMemoryScopeToken(record.sourceTurnId);
  const sourceExcerpt = normalizeContactMemoryText(
    record.sourceExcerpt,
    CONTACT_MEMORY_EXCERPT_MAX_CHARS
  );
  const sourceTimestamp = normalizeContactMemoryTimestamp(record.sourceTimestamp);
  const trustEventId = normalizeContactMemoryScopeToken(record.trustEventId);
  const sourceToolName = normalizeContactMemoryText(record.sourceToolName, 80) ?? undefined;
  const sourceMessageRole = record.sourceMessageRole === "user" ? "user" : undefined;

  if (
    !sourceKind
    || !sourceSessionId
    || !sourceTurnId
    || !sourceExcerpt
    || sourceTimestamp === null
    || !trustEventId
  ) {
    return null;
  }
  if (sourceKind === "user_message" && sourceMessageRole !== "user") {
    return null;
  }
  if (sourceKind === "verified_tool_result" && !sourceToolName) {
    return null;
  }

  return {
    contractVersion: SESSION_CONTACT_MEMORY_PROVENANCE_VERSION,
    sourceKind,
    sourceSessionId,
    sourceTurnId,
    sourceMessageRole,
    sourceToolName,
    sourceExcerpt,
    sourceTimestamp,
    actor: "agent_execution_pipeline",
    trustEventName: SESSION_CONTACT_MEMORY_TRUST_EVENT_NAME,
    trustEventId,
  };
}

export function normalizeSessionContactMemoryRecord(
  value: unknown
): SessionContactMemoryRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    record.contractVersion !== SESSION_CONTACT_MEMORY_CONTRACT_VERSION
    || record.sourcePolicy !== SESSION_CONTACT_MEMORY_SOURCE_POLICY
  ) {
    return null;
  }

  const memoryId = normalizeContactMemoryScopeToken(
    record.memoryId ?? record._id
  );
  const field = normalizeContactMemoryField(record.field);
  const status = normalizeContactMemoryStatus(record.status);
  const valueText = normalizeContactMemoryText(record.value, CONTACT_MEMORY_VALUE_MAX_CHARS);
  const normalizedValue = normalizeContactMemoryText(
    record.normalizedValue,
    CONTACT_MEMORY_VALUE_MAX_CHARS
  );
  const dedupeKey = normalizeContactMemoryScopeToken(record.dedupeKey);
  const createdAt = normalizeContactMemoryTimestamp(record.createdAt);
  const updatedAt = normalizeContactMemoryTimestamp(record.updatedAt);
  const provenance = normalizeSessionContactMemoryProvenanceRecord(record.provenance);
  const supersedesMemoryId = normalizeContactMemoryScopeToken(record.supersedesMemoryId) ?? undefined;
  const supersededByMemoryId = normalizeContactMemoryScopeToken(record.supersededByMemoryId) ?? undefined;
  const revertedFromMemoryId = normalizeContactMemoryScopeToken(record.revertedFromMemoryId) ?? undefined;

  if (
    !memoryId
    || !field
    || !status
    || !valueText
    || !normalizedValue
    || !dedupeKey
    || createdAt === null
    || updatedAt === null
    || !provenance
  ) {
    return null;
  }
  if (buildContactMemoryDedupeKey(field, normalizedValue) !== dedupeKey) {
    return null;
  }
  if (updatedAt < createdAt) {
    return null;
  }

  return {
    memoryId,
    contractVersion: SESSION_CONTACT_MEMORY_CONTRACT_VERSION,
    sourcePolicy: SESSION_CONTACT_MEMORY_SOURCE_POLICY,
    field,
    value: valueText,
    normalizedValue,
    dedupeKey,
    status,
    supersedesMemoryId,
    supersededByMemoryId,
    revertedFromMemoryId,
    provenance,
    createdAt,
    updatedAt,
  };
}

export function extractSessionContactMemoryCandidates(args: {
  userMessage?: string | null;
  toolResults?: Array<{ tool?: unknown; status?: unknown; result?: unknown }> | null;
}): SessionContactMemoryExtractionCandidate[] {
  const candidates: SessionContactMemoryExtractionCandidate[] = [];
  const userMessage = normalizeContactMemoryText(
    args.userMessage,
    CONTACT_MEMORY_EXCERPT_MAX_CHARS * 4
  );
  if (userMessage) {
    pushUserMessageContactCandidates(userMessage, candidates);
  }
  pushToolResultContactCandidates({
    toolResults: args.toolResults ?? undefined,
    target: candidates,
  });
  return dedupeContactMemoryCandidates(candidates);
}

export function planSessionContactMemoryMerge(args: {
  existingRecords: SessionContactMemoryRecord[];
  candidates: SessionContactMemoryExtractionCandidate[];
}): SessionContactMemoryMergePlan {
  const dedupedCandidates = dedupeContactMemoryCandidates(args.candidates);
  const candidateSplit = splitAmbiguousFieldCandidates(dedupedCandidates);

  const normalizedExisting = args.existingRecords
    .map((record) => normalizeSessionContactMemoryRecord(record))
    .filter((record): record is SessionContactMemoryRecord => Boolean(record))
    .sort((a, b) => {
      const updatedAtDelta = b.updatedAt - a.updatedAt;
      if (updatedAtDelta !== 0) {
        return updatedAtDelta;
      }
      const createdAtDelta = b.createdAt - a.createdAt;
      if (createdAtDelta !== 0) {
        return createdAtDelta;
      }
      return b.memoryId.localeCompare(a.memoryId);
    });

  const activeByDedupe = new Map<string, SessionContactMemoryRecord>();
  const activeByField = new Map<SessionContactMemoryField, SessionContactMemoryRecord>();
  const byDedupeAny = new Map<string, SessionContactMemoryRecord[]>();

  for (const record of normalizedExisting) {
    const byDedupe = byDedupeAny.get(record.dedupeKey) ?? [];
    byDedupe.push(record);
    byDedupeAny.set(record.dedupeKey, byDedupe);

    if (record.status !== "active") {
      continue;
    }
    if (!activeByDedupe.has(record.dedupeKey)) {
      activeByDedupe.set(record.dedupeKey, record);
    }
    if (!activeByField.has(record.field)) {
      activeByField.set(record.field, record);
    }
  }

  const operations: SessionContactMemoryMergeOperation[] = [];
  for (const candidate of candidateSplit.candidates) {
    if (activeByDedupe.has(candidate.dedupeKey)) {
      continue;
    }

    const activeForField = activeByField.get(candidate.field);
    const priorMatchingRecord = (byDedupeAny.get(candidate.dedupeKey) || [])
      .find((record) => record.status === "superseded");
    const operationKey = `${candidate.field}:${candidate.dedupeKey}`;

    if (activeForField) {
      operations.push({
        operationKey,
        candidate,
        mergeKind: priorMatchingRecord ? "revert" : "supersede",
        supersedesMemoryId: activeForField.memoryId,
        revertedFromMemoryId: priorMatchingRecord?.memoryId,
      });
      activeByDedupe.delete(activeForField.dedupeKey);
    } else {
      operations.push({
        operationKey,
        candidate,
        mergeKind: priorMatchingRecord ? "revert" : "insert",
        revertedFromMemoryId: priorMatchingRecord?.memoryId,
      });
    }

    const syntheticActive: SessionContactMemoryRecord = {
      memoryId: `synthetic:${operationKey}`,
      contractVersion: SESSION_CONTACT_MEMORY_CONTRACT_VERSION,
      sourcePolicy: SESSION_CONTACT_MEMORY_SOURCE_POLICY,
      field: candidate.field,
      value: candidate.value,
      normalizedValue: candidate.normalizedValue,
      dedupeKey: candidate.dedupeKey,
      status: "active",
      provenance: {
        contractVersion: SESSION_CONTACT_MEMORY_PROVENANCE_VERSION,
        sourceKind: candidate.sourceKind,
        sourceSessionId: "synthetic",
        sourceTurnId: "synthetic",
        sourceMessageRole: candidate.sourceKind === "user_message" ? "user" : undefined,
        sourceToolName: candidate.sourceToolName,
        sourceExcerpt: candidate.sourceExcerpt,
        sourceTimestamp: 0,
        actor: "agent_execution_pipeline",
        trustEventName: SESSION_CONTACT_MEMORY_TRUST_EVENT_NAME,
        trustEventId: "synthetic",
      },
      createdAt: 0,
      updatedAt: 0,
    };
    activeByDedupe.set(candidate.dedupeKey, syntheticActive);
    activeByField.set(candidate.field, syntheticActive);
  }

  return {
    candidates: candidateSplit.candidates,
    operations,
    ambiguousFields: candidateSplit.ambiguousFields,
  };
}

export function composeSessionContactMemoryContext(
  records: SessionContactMemoryRecord[] | null | undefined
): string | null {
  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }

  const normalized = records
    .map((record) => normalizeSessionContactMemoryRecord(record))
    .filter((record): record is SessionContactMemoryRecord => Boolean(record))
    .filter((record) => record.status === "active")
    .sort((a, b) => {
      const fieldDelta =
        (CONTACT_MEMORY_FIELD_ORDER_MAP.get(a.field) ?? 999)
        - (CONTACT_MEMORY_FIELD_ORDER_MAP.get(b.field) ?? 999);
      if (fieldDelta !== 0) {
        return fieldDelta;
      }
      const updatedAtDelta = b.updatedAt - a.updatedAt;
      if (updatedAtDelta !== 0) {
        return updatedAtDelta;
      }
      return a.memoryId.localeCompare(b.memoryId);
    });

  if (normalized.length === 0) {
    return null;
  }

  const lines = [
    "--- STRUCTURED CONTACT MEMORY (L4) ---",
    "Derived only from explicit user statements and verified tool outputs. Apply only to this exact tenant/channel/contact/route scope and defer to explicit user corrections in this turn.",
  ];
  for (const record of normalized) {
    const sourceLabel =
      record.provenance.sourceKind === "user_message"
        ? "user"
        : `tool:${record.provenance.sourceToolName ?? "unknown"}`;
    lines.push(
      `- ${CONTACT_MEMORY_FIELD_LABELS[record.field]}: ${record.value} (source=${sourceLabel}; updated_at=${record.updatedAt})`
    );
  }
  lines.push("--- END STRUCTURED CONTACT MEMORY (L4) ---");
  return lines.join("\n");
}

function clampRecentContextTokenBudget(
  args: ComposeAdaptiveRecentContextWindowArgs
): number {
  const contextLength = Number.isFinite(args.modelContextLength)
    ? Math.max(1, Math.floor(args.modelContextLength as number))
    : DEFAULT_MODEL_CONTEXT_LENGTH;
  const budgetRatio = Number.isFinite(args.budgetRatio)
    ? Math.min(Math.max(args.budgetRatio as number, 0.01), 0.5)
    : DEFAULT_RECENT_CONTEXT_BUDGET_RATIO;
  const minBudget = Number.isFinite(args.minBudgetTokens)
    ? Math.max(1, Math.floor(args.minBudgetTokens as number))
    : DEFAULT_RECENT_CONTEXT_MIN_BUDGET_TOKENS;
  const maxBudget = Number.isFinite(args.maxBudgetTokens)
    ? Math.max(minBudget, Math.floor(args.maxBudgetTokens as number))
    : DEFAULT_RECENT_CONTEXT_MAX_BUDGET_TOKENS;
  const responseReserveRatio = Number.isFinite(args.responseReserveRatio)
    ? Math.min(Math.max(args.responseReserveRatio as number, 0.01), 0.6)
    : DEFAULT_RECENT_CONTEXT_RESPONSE_RESERVE_RATIO;
  const responseReserveMinTokens = Number.isFinite(args.responseReserveMinTokens)
    ? Math.max(0, Math.floor(args.responseReserveMinTokens as number))
    : DEFAULT_RECENT_CONTEXT_RESPONSE_RESERVE_MIN_TOKENS;
  const reservedTokens = Number.isFinite(args.reservedTokens)
    ? Math.max(0, Math.floor(args.reservedTokens as number))
    : 0;

  const responseReserve = Math.max(
    responseReserveMinTokens,
    Math.floor(contextLength * responseReserveRatio)
  );
  const availableAfterReserve = Math.max(0, contextLength - reservedTokens - responseReserve);
  const ratioBudget = Math.floor(contextLength * budgetRatio);
  const computedBudget = Math.min(availableAfterReserve, ratioBudget);

  if (computedBudget <= 0) {
    return 0;
  }
  if (availableAfterReserve < minBudget) {
    return Math.min(maxBudget, availableAfterReserve);
  }
  return Math.min(maxBudget, Math.max(minBudget, computedBudget));
}

export function composeAdaptiveRecentContextWindow(
  args: ComposeAdaptiveRecentContextWindowArgs
): AdaptiveRecentContextWindow {
  const tokenBudget = clampRecentContextTokenBudget(args);
  const maxMessages = Number.isFinite(args.maxMessages)
    ? Math.max(1, Math.floor(args.maxMessages as number))
    : DEFAULT_RECENT_CONTEXT_MAX_MESSAGES;

  const candidates = args.messages
    .map((message) => ({
      role: normalizeRecentContextRole(message.role),
      content: typeof message.content === "string" ? message.content.trim() : "",
      timestamp: message.timestamp,
      toolCalls: message.toolCalls,
    }))
    .filter((message) => message.role && message.content.length > 0)
    .slice(-maxMessages) as Array<{
      role: "user" | "assistant";
      content: string;
      timestamp?: number;
      toolCalls?: unknown;
    }>;

  if (candidates.length === 0 || tokenBudget <= 0) {
    return {
      messages: [],
      tokenBudget,
      estimatedTokensUsed: 0,
      droppedMessageCount: candidates.length,
      truncatedMessageCount: 0,
    };
  }

  const selected: SessionHistoryContextMessage[] = [];
  let estimatedTokensUsed = 0;
  let truncatedMessageCount = 0;

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const candidate = candidates[index];
    const remainingBudget = tokenBudget - estimatedTokensUsed;
    if (remainingBudget <= RECENT_CONTEXT_MESSAGE_OVERHEAD_TOKENS) {
      break;
    }

    const candidateTokens =
      estimateTokensFromText(candidate.content) + RECENT_CONTEXT_MESSAGE_OVERHEAD_TOKENS;
    if (candidateTokens <= remainingBudget) {
      selected.push({
        role: candidate.role,
        content: candidate.content,
        timestamp: candidate.timestamp,
        toolCalls: candidate.toolCalls,
      });
      estimatedTokensUsed += candidateTokens;
      continue;
    }

    if (selected.length > 0) {
      continue;
    }

    const truncatedContent = truncateTextToTokenBudget(
      candidate.content,
      Math.max(1, remainingBudget - RECENT_CONTEXT_MESSAGE_OVERHEAD_TOKENS)
    ).trim();
    if (truncatedContent.length === 0) {
      break;
    }
    selected.push({
      role: candidate.role,
      content: truncatedContent,
      timestamp: candidate.timestamp,
      toolCalls: candidate.toolCalls,
    });
    estimatedTokensUsed +=
      estimateTokensFromText(truncatedContent) + RECENT_CONTEXT_MESSAGE_OVERHEAD_TOKENS;
    truncatedMessageCount += 1;
    break;
  }

  selected.reverse();

  return {
    messages: selected,
    tokenBudget,
    estimatedTokensUsed,
    droppedMessageCount: Math.max(0, candidates.length - selected.length),
    truncatedMessageCount,
  };
}

function toConfidenceBand(score: number): "high" | "medium" | "low" {
  if (score >= 0.55) return "high";
  if (score >= 0.28) return "medium";
  return "low";
}

function clampConfidence(value: number): number {
  return Number(Math.min(1, Math.max(0, value)).toFixed(4));
}

export function rankSemanticRetrievalChunks(args: {
  queryText: string;
  candidates: SemanticRetrievalChunkCandidate[];
  limit?: number;
  minScore?: number;
}): RankedSemanticRetrievalChunk[] {
  const queryTokens = tokenizeSemanticRetrievalText(args.queryText);
  if (queryTokens.length === 0 || args.candidates.length === 0) {
    return [];
  }
  const queryTokenSet = new Set(queryTokens);
  const minScore = typeof args.minScore === "number" ? Math.max(0, args.minScore) : 0.1;
  const limit = Math.max(1, Math.floor(args.limit ?? args.candidates.length));
  const now = Date.now();
  const recentWindowMs = 30 * 24 * 60 * 60 * 1000;

  const scored: RankedSemanticRetrievalChunk[] = [];
  for (const candidate of args.candidates) {
    const corpus = [
      candidate.sourceFilename,
      candidate.sourceDescription ?? "",
      (candidate.sourceTags ?? []).join(" "),
      candidate.chunkText.slice(0, 6000),
    ].join(" ");
    const docTokens = tokenizeSemanticRetrievalText(corpus);
    if (docTokens.length === 0) continue;

    const docTokenSet = new Set(docTokens);
    const matchedTokens = queryTokens.filter((token) => docTokenSet.has(token));
    if (matchedTokens.length === 0) continue;

    const overlapScore = matchedTokens.length / queryTokenSet.size;
    const densityScore = matchedTokens.length / Math.max(1, Math.sqrt(docTokenSet.size));

    const sourceTagSet = new Set(
      (candidate.sourceTags ?? []).map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0)
    );
    const tagMatches = queryTokens.filter((token) => sourceTagSet.has(token)).length;
    const tagBoost = Math.min(0.25, tagMatches * 0.08);

    const ageMs =
      typeof candidate.sourceUpdatedAt === "number" ? Math.max(0, now - candidate.sourceUpdatedAt) : recentWindowMs;
    const recencyBoost = Math.max(0, 1 - ageMs / recentWindowMs) * 0.1;
    const embeddingBoost = Math.max(0, Math.min(1, candidate.embeddingScore ?? 0)) * 0.2;

    const semanticScore = clampConfidence(
      overlapScore * 0.55 + densityScore * 0.15 + tagBoost + recencyBoost + embeddingBoost
    );
    if (semanticScore < minScore) {
      continue;
    }

    scored.push({
      ...candidate,
      semanticScore,
      confidence: semanticScore,
      confidenceBand: toConfidenceBand(semanticScore),
      matchedTokens,
    });
  }

  return scored
    .sort((a, b) => {
      const scoreDelta = b.semanticScore - a.semanticScore;
      if (scoreDelta !== 0) return scoreDelta;
      const updatedAtDelta = (b.sourceUpdatedAt ?? 0) - (a.sourceUpdatedAt ?? 0);
      if (updatedAtDelta !== 0) return updatedAtDelta;
      return (a.chunkOrdinal ?? 0) - (b.chunkOrdinal ?? 0);
    })
    .slice(0, limit);
}

function clampTokenBudget(args: ComposeKnowledgeContextArgs): number {
  const contextLength = Number.isFinite(args.modelContextLength)
    ? Math.max(1, Math.floor(args.modelContextLength as number))
    : DEFAULT_MODEL_CONTEXT_LENGTH;
  const ratio = Number.isFinite(args.budgetRatio)
    ? Math.min(Math.max(args.budgetRatio as number, 0.01), 0.9)
    : DEFAULT_BUDGET_RATIO;
  const minBudget = Number.isFinite(args.minBudgetTokens)
    ? Math.max(1, Math.floor(args.minBudgetTokens as number))
    : DEFAULT_MIN_BUDGET_TOKENS;
  const maxBudget = Number.isFinite(args.maxBudgetTokens)
    ? Math.max(minBudget, Math.floor(args.maxBudgetTokens as number))
    : DEFAULT_MAX_BUDGET_TOKENS;
  const computed = Math.floor(contextLength * ratio);
  return Math.min(maxBudget, Math.max(minBudget, computed));
}

function truncateTextToTokenBudget(text: string, tokenBudget: number): string {
  if (tokenBudget <= 0) return "";
  const maxChars = tokenBudget * ESTIMATED_CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;
  const marker = "\n[Truncated for context budget]";
  const sliceChars = Math.max(0, maxChars - marker.length);
  const sliced = text.slice(0, sliceChars).trimEnd();
  return `${sliced}${marker}`;
}

function estimateDocumentOverheadTokens(doc: KnowledgeContextDocument): number {
  const overheadParts = [
    doc.filename,
    doc.description || "",
    (doc.tags || []).join(","),
    doc.source || "",
  ];
  return estimateTokensFromText(overheadParts.join("\n"));
}

function uniqueNormalizedTags(docs: KnowledgeContextDocument[]): string[] {
  const tags = new Set<string>();
  for (const doc of docs) {
    for (const tag of doc.tags || []) {
      const normalized = tag.trim().toLowerCase();
      if (normalized.length > 0) {
        tags.add(normalized);
      }
    }
    if (doc.source) {
      const normalizedSource = doc.source.trim().toLowerCase();
      if (normalizedSource.length > 0) {
        tags.add(normalizedSource);
      }
    }
  }
  return Array.from(tags);
}

export function composeKnowledgeContext(
  args: ComposeKnowledgeContextArgs
): KnowledgeContextComposition {
  const tokenBudget = clampTokenBudget(args);
  const docs = args.documents || [];
  const selected: KnowledgeContextDocument[] = [];
  let estimatedTokensUsed = 0;
  let droppedDocumentCount = 0;
  let truncatedDocumentCount = 0;
  let bytesUsed = 0;

  for (const doc of docs) {
    const content = doc.content?.trim();
    if (!content) {
      droppedDocumentCount += 1;
      continue;
    }

    const remainingBudget = tokenBudget - estimatedTokensUsed;
    if (remainingBudget <= 0) {
      droppedDocumentCount += 1;
      continue;
    }

    const overheadTokens = estimateDocumentOverheadTokens(doc);
    const contentTokenBudget = remainingBudget - overheadTokens;
    if (contentTokenBudget <= 0) {
      droppedDocumentCount += 1;
      continue;
    }

    let boundedContent = content;
    let contentTokens = estimateTokensFromText(content);
    if (contentTokens > contentTokenBudget) {
      boundedContent = truncateTextToTokenBudget(content, contentTokenBudget);
      contentTokens = estimateTokensFromText(boundedContent);
      truncatedDocumentCount += 1;
    }

    if (contentTokens <= 0) {
      droppedDocumentCount += 1;
      continue;
    }

    selected.push({
      ...doc,
      content: boundedContent,
    });
    estimatedTokensUsed += overheadTokens + contentTokens;
    bytesUsed += getUtf8ByteLength(boundedContent);
  }

  return {
    documents: selected,
    tokenBudget,
    estimatedTokensUsed,
    droppedDocumentCount,
    truncatedDocumentCount,
    bytesUsed,
    sourceTags: uniqueNormalizedTags(selected),
  };
}
