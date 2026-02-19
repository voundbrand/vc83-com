/**
 * AGENT SESSION MANAGEMENT
 *
 * Manages conversations between org agents and external contacts.
 * Sessions are keyed by org + channel + external contact identifier.
 *
 * Flow:
 * 1. Inbound message arrives → resolveSession() finds or creates session
 * 2. resolveContact() matches external identifier to CRM contact
 * 3. Messages stored in agentSessionMessages
 * 4. Stats updated after each exchange
 */

import { query, mutation, internalQuery, internalMutation, internalAction } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import {
  getSessionPolicyFromConfig,
  resolveSessionTTL,
  DEFAULT_SESSION_POLICY,
} from "./sessionPolicy";
import {
  AGENT_LIFECYCLE_CHECKPOINT_VALUES,
  isAgentLifecycleState,
  resolveEscalationGateForLifecycleTransition,
  resolveSessionLifecycleState,
  type AgentEscalationGate,
  type AgentLifecycleCheckpoint,
  type AgentLifecycleState,
} from "./agentLifecycle";
import {
  resolveThreadDeliveryState,
  type ThreadDeliveryState,
} from "./agentExecution";

// Lazy-load internal to avoid circular dependency with _generated/api
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalRef: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternalRef(): any {
  if (!_internalRef) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalRef = require("../_generated/api").internal;
  }
  return _internalRef;
}

interface AgentModelResolutionTelemetry {
  selectedModel: string;
  usedModel?: string;
  selectionSource?: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

interface AgentActionTelemetryRecord {
  performedAt: number;
  modelResolution?: AgentModelResolutionTelemetry;
}

export interface AgentModelFallbackAggregation {
  windowHours: number;
  since: number;
  actionsScanned: number;
  actionsWithModelResolution: number;
  fallbackCount: number;
  fallbackRate: number;
  selectionSources: Array<{ source: string; count: number }>;
  fallbackReasons: Array<{ reason: string; count: number }>;
}

interface AgentToolResultRecord {
  tool?: string;
  status?: string;
}

export interface AgentToolSuccessFailureAggregation {
  windowHours: number;
  since: number;
  toolResultsScanned: number;
  successCount: number;
  failureCount: number;
  pendingCount: number;
  ignoredCount: number;
  successRate: number;
  failureRate: number;
  statusBreakdown: Array<{ status: string; count: number }>;
}

function normalizeAgentModelResolution(
  value: unknown
): AgentModelResolutionTelemetry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.selectedModel !== "string") {
    return null;
  }
  if (typeof record.fallbackUsed !== "boolean") {
    return null;
  }

  return {
    selectedModel: record.selectedModel,
    usedModel: typeof record.usedModel === "string" ? record.usedModel : undefined,
    selectionSource:
      typeof record.selectionSource === "string"
        ? record.selectionSource
        : undefined,
    fallbackUsed: record.fallbackUsed,
    fallbackReason:
      typeof record.fallbackReason === "string" ? record.fallbackReason : undefined,
  };
}

export function aggregateAgentModelFallback(
  records: AgentActionTelemetryRecord[],
  options: { windowHours: number; since: number }
): AgentModelFallbackAggregation {
  let actionsWithModelResolution = 0;
  let fallbackCount = 0;
  const selectionSourceCounts = new Map<string, number>();
  const fallbackReasonCounts = new Map<string, number>();

  for (const record of records) {
    const modelResolution = normalizeAgentModelResolution(record.modelResolution);
    if (!modelResolution) {
      continue;
    }

    actionsWithModelResolution += 1;
    const selectionSource = modelResolution.selectionSource?.trim().toLowerCase();
    if (selectionSource) {
      selectionSourceCounts.set(
        selectionSource,
        (selectionSourceCounts.get(selectionSource) ?? 0) + 1
      );
    }

    if (!modelResolution.fallbackUsed) {
      continue;
    }

    fallbackCount += 1;
    const fallbackReason = (modelResolution.fallbackReason ?? selectionSource ?? "")
      .trim()
      .toLowerCase();
    if (!fallbackReason) {
      continue;
    }

    fallbackReasonCounts.set(
      fallbackReason,
      (fallbackReasonCounts.get(fallbackReason) ?? 0) + 1
    );
  }

  const fallbackRate =
    actionsWithModelResolution > 0
      ? Number((fallbackCount / actionsWithModelResolution).toFixed(4))
      : 0;

  return {
    windowHours: options.windowHours,
    since: options.since,
    actionsScanned: records.length,
    actionsWithModelResolution,
    fallbackCount,
    fallbackRate,
    selectionSources: Array.from(selectionSourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count })),
    fallbackReasons: Array.from(fallbackReasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count })),
  };
}

function normalizeToolStatus(statusRaw: unknown): string | null {
  if (typeof statusRaw !== "string") {
    return null;
  }
  const normalized = statusRaw.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function aggregateAgentToolSuccessFailure(
  records: AgentToolResultRecord[],
  options: { windowHours: number; since: number }
): AgentToolSuccessFailureAggregation {
  let successCount = 0;
  let failureCount = 0;
  let pendingCount = 0;
  let ignoredCount = 0;
  const statusCounts = new Map<string, number>();

  for (const record of records) {
    const status = normalizeToolStatus(record.status);
    if (!status) {
      ignoredCount += 1;
      continue;
    }

    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);

    if (status === "success") {
      successCount += 1;
      continue;
    }

    if (status === "failed" || status === "error" || status === "disabled") {
      failureCount += 1;
      continue;
    }

    if (status === "pending_approval" || status === "pending" || status === "proposed") {
      pendingCount += 1;
      continue;
    }

    ignoredCount += 1;
  }

  const consideredTotal = successCount + failureCount;
  const successRate =
    consideredTotal > 0
      ? Number((successCount / consideredTotal).toFixed(4))
      : 0;
  const failureRate =
    consideredTotal > 0
      ? Number((failureCount / consideredTotal).toFixed(4))
      : 0;

  return {
    windowHours: options.windowHours,
    since: options.since,
    toolResultsScanned: records.length,
    successCount,
    failureCount,
    pendingCount,
    ignoredCount,
    successRate,
    failureRate,
    statusBreakdown: Array.from(statusCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ status, count })),
  };
}

interface AgentRetrievalTelemetry {
  docsRetrieved?: number;
  docsInjected?: number;
  bytesRetrieved?: number;
  bytesInjected?: number;
  sourceTags?: string[];
  mode?: string;
  path?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  semanticCandidateCount?: number;
  semanticFilteredCandidateCount?: number;
  semanticQueryTokenCount?: number;
  semanticChunkCount?: number;
  citationCount?: number;
  chunkCitationCount?: number;
  citations?: Array<{
    citationId?: string;
    chunkId?: string;
  }>;
}

interface AgentRetrievalTelemetryRecord {
  performedAt: number;
  retrieval?: AgentRetrievalTelemetry;
}

export interface AgentRetrievalAggregation {
  windowHours: number;
  since: number;
  messagesScanned: number;
  messagesWithRetrieval: number;
  docsRetrieved: number;
  docsInjected: number;
  bytesRetrieved: number;
  bytesInjected: number;
  avgDocsInjectedPerMessage: number;
  citationCount: number;
  avgCitationsPerMessage: number;
  chunkCitationCount: number;
  avgChunkCitationsPerMessage: number;
  semanticMessages: number;
  fallbackMessages: number;
  fallbackRate: number;
  retrievalModes: Array<{ mode: string; count: number }>;
  fallbackReasons: Array<{ reason: string; count: number }>;
  sourceTags: Array<{ tag: string; count: number }>;
}

function normalizeRetrievalTelemetry(
  value: unknown
): AgentRetrievalTelemetry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const normalizedCitations = Array.isArray(record.citations)
    ? record.citations
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
        .map((entry) => ({
          citationId:
            typeof entry.citationId === "string" ? entry.citationId : undefined,
          chunkId: typeof entry.chunkId === "string" ? entry.chunkId : undefined,
        }))
    : undefined;

  const citationCount =
    typeof record.citationCount === "number"
      ? record.citationCount
      : normalizedCitations?.length;
  const chunkCitationCount =
    typeof record.chunkCitationCount === "number"
      ? record.chunkCitationCount
      : normalizedCitations?.filter(
          (citation) =>
            typeof citation.chunkId === "string" && citation.chunkId.trim().length > 0
        ).length;

  return {
    docsRetrieved:
      typeof record.docsRetrieved === "number" ? record.docsRetrieved : undefined,
    docsInjected:
      typeof record.docsInjected === "number" ? record.docsInjected : undefined,
    bytesRetrieved:
      typeof record.bytesRetrieved === "number" ? record.bytesRetrieved : undefined,
    bytesInjected:
      typeof record.bytesInjected === "number" ? record.bytesInjected : undefined,
    sourceTags: Array.isArray(record.sourceTags)
      ? record.sourceTags.filter((entry): entry is string => typeof entry === "string")
      : undefined,
    mode: typeof record.mode === "string" ? record.mode : undefined,
    path: typeof record.path === "string" ? record.path : undefined,
    fallbackUsed: typeof record.fallbackUsed === "boolean" ? record.fallbackUsed : undefined,
    fallbackReason:
      typeof record.fallbackReason === "string" ? record.fallbackReason : undefined,
    semanticCandidateCount:
      typeof record.semanticCandidateCount === "number"
        ? record.semanticCandidateCount
        : undefined,
    semanticFilteredCandidateCount:
      typeof record.semanticFilteredCandidateCount === "number"
        ? record.semanticFilteredCandidateCount
        : undefined,
    semanticQueryTokenCount:
      typeof record.semanticQueryTokenCount === "number"
        ? record.semanticQueryTokenCount
        : undefined,
    semanticChunkCount:
      typeof record.semanticChunkCount === "number"
        ? record.semanticChunkCount
        : undefined,
    citationCount,
    chunkCitationCount,
    citations: normalizedCitations,
  };
}

export function aggregateAgentRetrievalTelemetry(
  records: AgentRetrievalTelemetryRecord[],
  options: { windowHours: number; since: number }
): AgentRetrievalAggregation {
  const toNumber = (value: unknown) => {
    if (typeof value !== "number" || Number.isNaN(value)) return 0;
    return value;
  };

  let messagesWithRetrieval = 0;
  let docsRetrieved = 0;
  let docsInjected = 0;
  let bytesRetrieved = 0;
  let bytesInjected = 0;
  let citationCount = 0;
  let chunkCitationCount = 0;
  let semanticMessages = 0;
  let fallbackMessages = 0;

  const modeCounts = new Map<string, number>();
  const fallbackReasonCounts = new Map<string, number>();
  const sourceTagCounts = new Map<string, number>();

  for (const record of records) {
    const retrieval = normalizeRetrievalTelemetry(record.retrieval);
    if (!retrieval) {
      continue;
    }

    messagesWithRetrieval += 1;
    docsRetrieved += toNumber(retrieval.docsRetrieved);
    docsInjected += toNumber(retrieval.docsInjected);
    bytesRetrieved += toNumber(retrieval.bytesRetrieved);
    bytesInjected += toNumber(retrieval.bytesInjected);
    citationCount += toNumber(retrieval.citationCount);
    chunkCitationCount += toNumber(retrieval.chunkCitationCount);

    const mode = retrieval.mode?.trim().toLowerCase();
    if (mode) {
      modeCounts.set(mode, (modeCounts.get(mode) ?? 0) + 1);
      if (mode === "semantic") {
        semanticMessages += 1;
      }
      if (mode === "fallback") {
        fallbackMessages += 1;
      }
    }

    if (retrieval.fallbackUsed) {
      fallbackMessages += mode === "fallback" ? 0 : 1;
      const fallbackReason = (retrieval.fallbackReason ?? "unknown")
        .trim()
        .toLowerCase();
      fallbackReasonCounts.set(
        fallbackReason,
        (fallbackReasonCounts.get(fallbackReason) ?? 0) + 1
      );
    }

    for (const tag of retrieval.sourceTags ?? []) {
      const normalizedTag = tag.trim().toLowerCase();
      if (!normalizedTag) continue;
      sourceTagCounts.set(normalizedTag, (sourceTagCounts.get(normalizedTag) ?? 0) + 1);
    }
  }

  return {
    windowHours: options.windowHours,
    since: options.since,
    messagesScanned: records.length,
    messagesWithRetrieval,
    docsRetrieved,
    docsInjected,
    bytesRetrieved,
    bytesInjected,
    avgDocsInjectedPerMessage: messagesWithRetrieval > 0
      ? Number((docsInjected / messagesWithRetrieval).toFixed(2))
      : 0,
    citationCount,
    avgCitationsPerMessage: messagesWithRetrieval > 0
      ? Number((citationCount / messagesWithRetrieval).toFixed(2))
      : 0,
    chunkCitationCount,
    avgChunkCitationsPerMessage: messagesWithRetrieval > 0
      ? Number((chunkCitationCount / messagesWithRetrieval).toFixed(2))
      : 0,
    semanticMessages,
    fallbackMessages,
    fallbackRate: messagesWithRetrieval > 0
      ? Number((fallbackMessages / messagesWithRetrieval).toFixed(4))
      : 0,
    retrievalModes: Array.from(modeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([mode, count]) => ({ mode, count })),
    fallbackReasons: Array.from(fallbackReasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count })),
    sourceTags: Array.from(sourceTagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count })),
  };
}

interface SoulDriftScores {
  identity: number;
  scope: number;
  boundary: number;
  performance: number;
  overall: number;
}

interface SoulDriftRecord {
  createdAt: number;
  triggerType?: string;
  status?: string;
  alignmentMode?: string;
  driftScores?: SoulDriftScores;
}

export interface SoulDriftAggregation {
  windowHours: number;
  since: number;
  proposalsScanned: number;
  proposalsWithDrift: number;
  alignmentProposals: number;
  pendingAlignmentProposals: number;
  averageOverallDrift: number;
  maxOverallDrift: number;
  severityBreakdown: Array<{ severity: "low" | "moderate" | "high"; count: number }>;
  alignmentModes: Array<{ mode: string; count: number }>;
}

function normalizeSoulDriftScores(value: unknown): SoulDriftScores | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const read = (field: string) =>
    typeof record[field] === "number" && Number.isFinite(record[field])
      ? Number(Math.min(1, Math.max(0, record[field] as number)).toFixed(4))
      : 0;
  return {
    identity: read("identity"),
    scope: read("scope"),
    boundary: read("boundary"),
    performance: read("performance"),
    overall: read("overall"),
  };
}

function classifyDriftSeverity(overall: number): "low" | "moderate" | "high" {
  if (overall >= 0.6) return "high";
  if (overall >= 0.3) return "moderate";
  return "low";
}

export function aggregateSoulDriftTelemetry(
  records: SoulDriftRecord[],
  options: { windowHours: number; since: number }
): SoulDriftAggregation {
  let proposalsWithDrift = 0;
  let alignmentProposals = 0;
  let pendingAlignmentProposals = 0;
  let totalOverall = 0;
  let maxOverallDrift = 0;
  const severityCounts = new Map<"low" | "moderate" | "high", number>();
  const alignmentModeCounts = new Map<string, number>();

  for (const record of records) {
    const triggerType = record.triggerType?.trim().toLowerCase();
    const status = record.status?.trim().toLowerCase();
    if (triggerType === "alignment") {
      alignmentProposals += 1;
      if (status === "pending") {
        pendingAlignmentProposals += 1;
      }
      const mode = (record.alignmentMode ?? "monitor").trim().toLowerCase();
      alignmentModeCounts.set(mode, (alignmentModeCounts.get(mode) ?? 0) + 1);
    }

    const driftScores = normalizeSoulDriftScores(record.driftScores);
    if (!driftScores) continue;

    proposalsWithDrift += 1;
    totalOverall += driftScores.overall;
    maxOverallDrift = Math.max(maxOverallDrift, driftScores.overall);
    const severity = classifyDriftSeverity(driftScores.overall);
    severityCounts.set(severity, (severityCounts.get(severity) ?? 0) + 1);
  }

  return {
    windowHours: options.windowHours,
    since: options.since,
    proposalsScanned: records.length,
    proposalsWithDrift,
    alignmentProposals,
    pendingAlignmentProposals,
    averageOverallDrift: proposalsWithDrift > 0
      ? Number((totalOverall / proposalsWithDrift).toFixed(4))
      : 0,
    maxOverallDrift: Number(maxOverallDrift.toFixed(4)),
    severityBreakdown: Array.from(severityCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([severity, count]) => ({ severity, count })),
    alignmentModes: Array.from(alignmentModeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([mode, count]) => ({ mode, count })),
  };
}

type AgentTurnState =
  | "queued"
  | "running"
  | "suspended"
  | "completed"
  | "failed"
  | "cancelled";

type AgentTurnTransition =
  | "inbound_received"
  | "turn_enqueued"
  | "lease_acquired"
  | "lease_heartbeat"
  | "lease_released"
  | "handoff_initiated"
  | "handoff_completed"
  | "escalation_started"
  | "escalation_resolved"
  | "stale_recovered"
  | "terminal_deliverable_recorded"
  | "turn_suspended"
  | "turn_completed"
  | "turn_failed"
  | "duplicate_dropped";

type TurnLeaseNextState = "suspended" | "completed" | "cancelled";

const DEFAULT_TURN_LEASE_MS = 45_000;
const MIN_TURN_LEASE_MS = 5_000;
const MAX_TURN_LEASE_MS = 5 * 60_000;

function clampLeaseDurationMs(value?: number): number {
  const duration = typeof value === "number" ? value : DEFAULT_TURN_LEASE_MS;
  return Math.min(MAX_TURN_LEASE_MS, Math.max(MIN_TURN_LEASE_MS, duration));
}

function buildLeaseToken(leaseOwner: string, now: number): string {
  return `${leaseOwner}:${now}:${Math.random().toString(36).slice(2, 10)}`;
}

function isTerminalTurnState(state: AgentTurnState): boolean {
  return state === "completed" || state === "failed" || state === "cancelled";
}

function resolveTurnLeaseReleaseTransition(
  nextState: TurnLeaseNextState
): AgentTurnTransition {
  if (nextState === "completed") return "turn_completed";
  if (nextState === "suspended") return "turn_suspended";
  return "lease_released";
}

function buildTurnLeaseReleasePatch(args: {
  nextState: TurnLeaseNextState;
  nextVersion: number;
  now: number;
  suspendedAt?: number;
  completedAt?: number;
  cancelledAt?: number;
}) {
  return {
    state: args.nextState,
    transitionVersion: args.nextVersion,
    leaseOwner: undefined,
    leaseToken: undefined,
    leaseExpiresAt: undefined,
    suspendedAt: args.nextState === "suspended" ? args.now : args.suspendedAt,
    completedAt: args.nextState === "completed" ? args.now : args.completedAt,
    cancelledAt: args.nextState === "cancelled" ? args.now : args.cancelledAt,
    updatedAt: args.now,
  };
}

async function nextEdgeOrdinal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  turnId: string
): Promise<number> {
  const latest = await ctx.db
    .query("executionEdges")
    .withIndex("by_turn_ordinal", (q: any) => q.eq("turnId", turnId))
    .order("desc")
    .first();
  return ((latest?.edgeOrdinal as number | undefined) ?? 0) + 1;
}

async function appendExecutionEdge(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    organizationId: string;
    sessionId: string;
    agentId: string;
    turnId: string;
    transition: AgentTurnTransition;
    fromState?: AgentTurnState;
    toState?: AgentTurnState;
    metadata?: unknown;
  }
): Promise<void> {
  const occurredAt = Date.now();
  const edgeOrdinal = await nextEdgeOrdinal(ctx, args.turnId);
  await ctx.db.insert("executionEdges", {
    organizationId: args.organizationId,
    sessionId: args.sessionId,
    agentId: args.agentId,
    turnId: args.turnId,
    transition: args.transition,
    fromState: args.fromState,
    toState: args.toState,
    edgeOrdinal,
    metadata: args.metadata,
    occurredAt,
    createdAt: occurredAt,
  });
}

/**
 * Create a queued turn for inbound processing.
 * If idempotencyKey matches an existing turn, returns the existing turn.
 */
export const createInboundTurn = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.id("agentSessions"),
    agentId: v.id("objects"),
    idempotencyKey: v.optional(v.string()),
    inboundMessageHash: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const normalizedIdempotencyKey =
      typeof args.idempotencyKey === "string" && args.idempotencyKey.trim().length > 0
        ? args.idempotencyKey.trim()
        : undefined;

    if (normalizedIdempotencyKey) {
      const duplicate = await ctx.db
        .query("agentTurns")
        .withIndex("by_org_idempotency_key", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("idempotencyKey", normalizedIdempotencyKey)
        )
        .first();

      if (duplicate) {
        const duplicateState = duplicate.state as AgentTurnState;
        await appendExecutionEdge(ctx, {
          organizationId: args.organizationId,
          sessionId: args.sessionId,
          agentId: args.agentId,
          turnId: duplicate._id,
          transition: "duplicate_dropped",
          fromState: duplicateState,
          toState: duplicateState,
          metadata: {
            idempotencyKey: normalizedIdempotencyKey,
            duplicateTurnId: duplicate._id,
          },
        });

        return {
          turnId: duplicate._id,
          transitionVersion: duplicate.transitionVersion,
          state: duplicate.state,
          duplicate: true,
        };
      }
    }

    const now = Date.now();
    const turnId = await ctx.db.insert("agentTurns", {
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      agentId: args.agentId,
      state: "queued",
      transitionVersion: 0,
      idempotencyKey: normalizedIdempotencyKey,
      inboundMessageHash: args.inboundMessageHash,
      metadata: args.metadata,
      queuedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await appendExecutionEdge(ctx, {
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      agentId: args.agentId,
      turnId,
      transition: "inbound_received",
      toState: "queued",
      metadata: {
        idempotencyKey: normalizedIdempotencyKey,
      },
    });

    await appendExecutionEdge(ctx, {
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      agentId: args.agentId,
      turnId,
      transition: "turn_enqueued",
      toState: "queued",
      metadata: {
        idempotencyKey: normalizedIdempotencyKey,
      },
    });

    return {
      turnId,
      transitionVersion: 0,
      state: "queued" as const,
      duplicate: false,
    };
  },
});

/**
 * Recover stale running turns for a session/agent by suspending expired leases.
 */
export const recoverStaleRunningTurns = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.id("agentSessions"),
    agentId: v.id("objects"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const runningTurns = await ctx.db
      .query("agentTurns")
      .withIndex("by_session_agent_state", (q) =>
        q
          .eq("sessionId", args.sessionId)
          .eq("agentId", args.agentId)
          .eq("state", "running")
      )
      .collect();

    const recoveredTurnIds: Array<string> = [];

    for (const runningTurn of runningTurns) {
      const leaseExpired =
        typeof runningTurn.leaseExpiresAt !== "number"
        || runningTurn.leaseExpiresAt <= now;
      if (!leaseExpired) {
        continue;
      }

      const nextVersion = runningTurn.transitionVersion + 1;
      await ctx.db.patch(runningTurn._id, {
        state: "suspended",
        transitionVersion: nextVersion,
        leaseOwner: undefined,
        leaseToken: undefined,
        leaseExpiresAt: undefined,
        suspendedAt: now,
        updatedAt: now,
      });

      await appendExecutionEdge(ctx, {
        organizationId: args.organizationId,
        sessionId: args.sessionId,
        agentId: args.agentId,
        turnId: runningTurn._id,
        transition: "stale_recovered",
        fromState: "running",
        toState: "suspended",
        metadata: {
          reason: args.reason ?? "expired_lease",
          previousLeaseExpiresAt: runningTurn.leaseExpiresAt,
          nextVersion,
        },
      });

      recoveredTurnIds.push(runningTurn._id);
    }

    return {
      recoveredCount: recoveredTurnIds.length,
      recoveredTurnIds,
    };
  },
});

/**
 * Append a non-state-changing turn transition edge for runtime checkpoints.
 */
export const recordTurnTransition = internalMutation({
  args: {
    turnId: v.id("agentTurns"),
    transition: v.union(
      v.literal("handoff_initiated"),
      v.literal("handoff_completed"),
      v.literal("escalation_started"),
      v.literal("escalation_resolved"),
      v.literal("stale_recovered")
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) {
      return { success: false, error: "turn_not_found" as const };
    }

    const state = turn.state as AgentTurnState;
    await appendExecutionEdge(ctx, {
      organizationId: turn.organizationId,
      sessionId: turn.sessionId,
      agentId: turn.agentId,
      turnId: turn._id,
      transition: args.transition,
      fromState: state,
      toState: state,
      metadata: args.metadata,
    });

    return { success: true };
  },
});

/**
 * Persist exactly one terminal deliverable pointer per turn.
 */
export const recordTurnTerminalDeliverable = internalMutation({
  args: {
    turnId: v.id("agentTurns"),
    pointerType: v.string(),
    pointerId: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) {
      return { success: false, error: "turn_not_found" as const };
    }

    if (turn.terminalDeliverable) {
      return {
        success: false,
        error: "terminal_deliverable_already_recorded" as const,
        terminalDeliverable: turn.terminalDeliverable,
      };
    }

    const now = Date.now();
    const nextVersion = turn.transitionVersion + 1;
    const terminalDeliverable = {
      pointerType: args.pointerType,
      pointerId: args.pointerId,
      status: args.status,
      recordedAt: now,
    };

    await ctx.db.patch(args.turnId, {
      terminalDeliverable,
      transitionVersion: nextVersion,
      updatedAt: now,
    });

    const state = turn.state as AgentTurnState;
    await appendExecutionEdge(ctx, {
      organizationId: turn.organizationId,
      sessionId: turn.sessionId,
      agentId: turn.agentId,
      turnId: turn._id,
      transition: "terminal_deliverable_recorded",
      fromState: state,
      toState: state,
      metadata: {
        pointerType: args.pointerType,
        pointerId: args.pointerId,
        status: args.status,
        ...args.metadata,
      },
    });

    return {
      success: true,
      terminalDeliverable,
      transitionVersion: nextVersion,
    };
  },
});

/**
 * Acquire a running lease for a turn with optimistic concurrency checks.
 * Rejects acquisition when another unexpired running turn exists for the same session/agent.
 */
export const acquireTurnLease = internalMutation({
  args: {
    turnId: v.id("agentTurns"),
    sessionId: v.id("agentSessions"),
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    leaseOwner: v.string(),
    expectedVersion: v.number(),
    leaseDurationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) {
      return { success: false, error: "turn_not_found" as const };
    }
    if (
      turn.sessionId !== args.sessionId
      || turn.agentId !== args.agentId
      || turn.organizationId !== args.organizationId
    ) {
      return { success: false, error: "turn_context_mismatch" as const };
    }
    if (turn.transitionVersion !== args.expectedVersion) {
      return {
        success: false,
        error: "version_conflict" as const,
        currentVersion: turn.transitionVersion,
      };
    }
    const turnState = turn.state as AgentTurnState;
    if (isTerminalTurnState(turnState)) {
      return { success: false, error: "turn_terminal" as const };
    }

    const now = Date.now();
    const runningTurns = await ctx.db
      .query("agentTurns")
      .withIndex("by_session_agent_state", (q) =>
        q
          .eq("sessionId", args.sessionId)
          .eq("agentId", args.agentId)
          .eq("state", "running")
      )
      .collect();

    const conflictingTurn = runningTurns.find(
      (runningTurn) =>
        runningTurn._id !== args.turnId
        && typeof runningTurn.leaseExpiresAt === "number"
        && runningTurn.leaseExpiresAt > now
    );
    if (conflictingTurn) {
      return {
        success: false,
        error: "dual_active_turn" as const,
        conflictingTurnId: conflictingTurn._id,
      };
    }

    if (
      turn.state === "running"
      && typeof turn.leaseExpiresAt === "number"
      && turn.leaseExpiresAt > now
      && turn.leaseOwner !== args.leaseOwner
    ) {
      return { success: false, error: "lease_held_by_other_owner" as const };
    }

    const leaseDurationMs = clampLeaseDurationMs(args.leaseDurationMs);
    const leaseToken = buildLeaseToken(args.leaseOwner, now);
    const leaseExpiresAt = now + leaseDurationMs;
    const nextVersion = turn.transitionVersion + 1;
    const fromState = turnState;

    await ctx.db.patch(args.turnId, {
      state: "running",
      transitionVersion: nextVersion,
      leaseOwner: args.leaseOwner,
      leaseToken,
      leaseExpiresAt,
      lastHeartbeatAt: now,
      startedAt: turn.startedAt ?? now,
      updatedAt: now,
    });

    await appendExecutionEdge(ctx, {
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      agentId: args.agentId,
      turnId: args.turnId,
      transition: "lease_acquired",
      fromState,
      toState: "running",
      metadata: {
        leaseOwner: args.leaseOwner,
        expectedVersion: args.expectedVersion,
        nextVersion,
      },
    });

    return {
      success: true,
      turnId: args.turnId,
      leaseToken,
      leaseExpiresAt,
      transitionVersion: nextVersion,
    };
  },
});

/**
 * Extend lease expiry for a running turn while preserving CAS semantics.
 */
export const heartbeatTurnLease = internalMutation({
  args: {
    turnId: v.id("agentTurns"),
    expectedVersion: v.number(),
    leaseToken: v.string(),
    leaseDurationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) {
      return { success: false, error: "turn_not_found" as const };
    }
    if (turn.transitionVersion !== args.expectedVersion) {
      return {
        success: false,
        error: "version_conflict" as const,
        currentVersion: turn.transitionVersion,
      };
    }
    if (turn.state !== "running") {
      return { success: false, error: "turn_not_running" as const };
    }
    if (turn.leaseToken !== args.leaseToken) {
      return { success: false, error: "invalid_lease_token" as const };
    }

    const now = Date.now();
    if (typeof turn.leaseExpiresAt === "number" && turn.leaseExpiresAt <= now) {
      return { success: false, error: "lease_expired" as const };
    }

    const leaseDurationMs = clampLeaseDurationMs(args.leaseDurationMs);
    const leaseExpiresAt = now + leaseDurationMs;
    const nextVersion = turn.transitionVersion + 1;

    await ctx.db.patch(args.turnId, {
      transitionVersion: nextVersion,
      leaseExpiresAt,
      lastHeartbeatAt: now,
      updatedAt: now,
    });

    await appendExecutionEdge(ctx, {
      organizationId: turn.organizationId,
      sessionId: turn.sessionId,
      agentId: turn.agentId,
      turnId: turn._id,
      transition: "lease_heartbeat",
      fromState: "running",
      toState: "running",
      metadata: {
        expectedVersion: args.expectedVersion,
        nextVersion,
      },
    });

    return {
      success: true,
      turnId: args.turnId,
      leaseExpiresAt,
      transitionVersion: nextVersion,
    };
  },
});

/**
 * Release a lease and move the turn to a caller-selected next state.
 */
export const releaseTurnLease = internalMutation({
  args: {
    turnId: v.id("agentTurns"),
    expectedVersion: v.number(),
    leaseToken: v.string(),
    nextState: v.optional(v.union(
      v.literal("suspended"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) {
      return { success: false, error: "turn_not_found" as const };
    }
    if (turn.transitionVersion !== args.expectedVersion) {
      return {
        success: false,
        error: "version_conflict" as const,
        currentVersion: turn.transitionVersion,
      };
    }
    if (turn.leaseToken !== args.leaseToken) {
      return { success: false, error: "invalid_lease_token" as const };
    }
    if (turn.state !== "running") {
      return { success: false, error: "turn_not_running" as const };
    }

    const now = Date.now();
    const nextState: TurnLeaseNextState = args.nextState ?? "suspended";
    const nextVersion = turn.transitionVersion + 1;
    const transition = resolveTurnLeaseReleaseTransition(nextState);

    await ctx.db.patch(
      args.turnId,
      buildTurnLeaseReleasePatch({
        nextState,
        nextVersion,
        now,
        suspendedAt: turn.suspendedAt,
        completedAt: turn.completedAt,
        cancelledAt: turn.cancelledAt,
      }),
    );

    await appendExecutionEdge(ctx, {
      organizationId: turn.organizationId,
      sessionId: turn.sessionId,
      agentId: turn.agentId,
      turnId: turn._id,
      transition,
      fromState: "running",
      toState: nextState,
      metadata: {
        expectedVersion: args.expectedVersion,
        nextVersion,
      },
    });

    return {
      success: true,
      turnId: args.turnId,
      state: nextState,
      transitionVersion: nextVersion,
    };
  },
});

/**
 * Mark a turn as failed and clear lease state, with CAS enforcement.
 */
export const failTurnLease = internalMutation({
  args: {
    turnId: v.id("agentTurns"),
    expectedVersion: v.number(),
    leaseToken: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) {
      return { success: false, error: "turn_not_found" as const };
    }
    if (turn.transitionVersion !== args.expectedVersion) {
      return {
        success: false,
        error: "version_conflict" as const,
        currentVersion: turn.transitionVersion,
      };
    }
    if (args.leaseToken && turn.leaseToken && turn.leaseToken !== args.leaseToken) {
      return { success: false, error: "invalid_lease_token" as const };
    }
    if (turn.state === "completed" || turn.state === "cancelled") {
      return { success: false, error: "turn_terminal" as const };
    }

    const now = Date.now();
    const nextVersion = turn.transitionVersion + 1;
    const fromState = turn.state as AgentTurnState;

    await ctx.db.patch(args.turnId, {
      state: "failed",
      transitionVersion: nextVersion,
      leaseOwner: undefined,
      leaseToken: undefined,
      leaseExpiresAt: undefined,
      failedAt: now,
      failureReason: args.reason,
      updatedAt: now,
    });

    await appendExecutionEdge(ctx, {
      organizationId: turn.organizationId,
      sessionId: turn.sessionId,
      agentId: turn.agentId,
      turnId: turn._id,
      transition: "turn_failed",
      fromState,
      toState: "failed",
      metadata: {
        reason: args.reason,
        expectedVersion: args.expectedVersion,
        nextVersion,
      },
    });

    return {
      success: true,
      turnId: args.turnId,
      state: "failed" as const,
      transitionVersion: nextVersion,
    };
  },
});

// ============================================================================
// SESSION RESOLUTION (Internal — called by execution pipeline)
// ============================================================================

/**
 * Find or create a session for this org + channel + contact
 */
export const resolveSession = internalMutation({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    // Look for existing active session
    const existing = await ctx.db
      .query("agentSessions")
      .withIndex("by_org_channel_contact", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("channel", args.channel)
          .eq("externalContactIdentifier", args.externalContactIdentifier)
      )
      .first();

    if (existing && existing.status === "active") {
      // Check if session has expired (TTL or max duration)
      const agentConfig = await ctx.db.get(existing.agentId);
      const configProps = (agentConfig?.customProperties || {}) as Record<string, unknown>;
      const policy = getSessionPolicyFromConfig(configProps);
      const { ttl, maxDuration } = resolveSessionTTL(policy, existing.channel);
      const now = Date.now();

      const isIdle = (now - existing.lastMessageAt) > ttl;
      const isExpired = (now - existing.startedAt) > maxDuration;

      if (isIdle || isExpired) {
        // Close the stale session
        const closeReason = isExpired ? "expired" as const : "idle_timeout" as const;
        await ctx.db.patch(existing._id, {
          status: closeReason === "expired" ? "expired" : "closed",
          closedAt: now,
          closeReason,
        });

        // Schedule async summary generation if policy requires it
        if (policy.onClose === "summarize_and_archive" && existing.messageCount > 2) {
          await ctx.scheduler.runAfter(0, getInternalRef().ai.agentSessions.generateSessionSummary, {
            sessionId: existing._id,
          });
        }

        // Create new session, optionally carrying forward context
        const newSessionData: Record<string, unknown> = {
          agentId: args.agentId,
          organizationId: args.organizationId,
          channel: args.channel,
          externalContactIdentifier: args.externalContactIdentifier,
          status: "active",
          messageCount: 0,
          tokensUsed: 0,
          costUsd: 0,
          startedAt: now,
          lastMessageAt: now,
        };

        // If policy says "resume", carry forward summary context
        if (policy.onReopen === "resume") {
          newSessionData.previousSessionId = existing._id;
          const summary = (existing as Record<string, unknown>).summary as
            | { text: string }
            | undefined;
          if (summary?.text) {
            newSessionData.previousSessionSummary = summary.text;
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newSessionId = await ctx.db.insert("agentSessions", newSessionData as any);
        return await ctx.db.get(newSessionId);
      }

      // Session is still valid — reuse
      return existing;
    }

    // Create new session
    const sessionId = await ctx.db.insert("agentSessions", {
      agentId: args.agentId,
      organizationId: args.organizationId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      status: "active",
      messageCount: 0,
      tokensUsed: 0,
      costUsd: 0,
      startedAt: Date.now(),
      lastMessageAt: Date.now(),
    });

    return await ctx.db.get(sessionId);
  },
});

/**
 * Resolve external identifier to CRM contact
 * Matches by phone (WhatsApp/SMS) or email
 */
export const resolveContact = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    identifier: v.string(),
    channel: v.string(),
  },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    const identifier = args.identifier.toLowerCase().trim();

    // Match by phone for phone-based channels
    if (["whatsapp", "sms"].includes(args.channel)) {
      const match = contacts.find((c) => {
        const props = c.customProperties as Record<string, unknown> | undefined;
        const phone = String(props?.phone || "").replace(/\s+/g, "");
        return phone === identifier.replace(/\s+/g, "");
      });
      if (match) return match;
    }

    // Match by email
    const emailMatch = contacts.find((c) => {
      const props = c.customProperties as Record<string, unknown> | undefined;
      return String(props?.email || "").toLowerCase() === identifier;
    });

    return emailMatch ?? null;
  },
});

/**
 * Link a CRM contact to a session
 */
export const linkContactToSession = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    crmContactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      crmContactId: args.crmContactId,
    });
  },
});

/**
 * Upsert session-level routing pin metadata (model + auth profile).
 * Used by failover/stickiness flow to keep routing stable across turns.
 */
export const upsertSessionRoutingPin = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    modelId: v.optional(v.string()),
    authProfileId: v.optional(v.string()),
    pinReason: v.string(),
    unlockReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;

    const now = Date.now();
    const existingPin = (session as Record<string, unknown>).routingPin as
      | {
          modelId?: string;
          authProfileId?: string;
          pinReason: string;
          pinnedAt: number;
          updatedAt: number;
          unlockReason?: string;
          unlockedAt?: number;
        }
      | undefined;

    await ctx.db.patch(args.sessionId, {
      routingPin: {
        modelId: args.modelId ?? existingPin?.modelId,
        authProfileId: args.authProfileId ?? existingPin?.authProfileId,
        pinReason: args.pinReason,
        pinnedAt: existingPin?.pinnedAt ?? now,
        updatedAt: now,
        unlockReason: args.unlockReason,
        unlockedAt: args.unlockReason ? now : undefined,
      },
    });
  },
});

// ============================================================================
// MESSAGE MANAGEMENT (Internal)
// ============================================================================

/**
 * Get conversation history for a session
 */
export const getSessionMessages = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("agentSessionMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Return most recent N messages, sorted by timestamp
    const sorted = messages.sort((a, b) => a.timestamp - b.timestamp);
    const limit = args.limit || 20;
    return sorted.slice(-limit);
  },
});

/**
 * Add a message to a session
 */
export const addSessionMessage = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    toolCalls: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agentSessionMessages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      toolCalls: args.toolCalls,
      timestamp: Date.now(),
    });
  },
});

// ============================================================================
// SESSION STATS (Internal)
// ============================================================================

/**
 * Update session stats after a message exchange
 */
export const updateSessionStats = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    tokensUsed: v.number(),
    costUsd: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;

    await ctx.db.patch(args.sessionId, {
      messageCount: session.messageCount + 1,
      tokensUsed: session.tokensUsed + args.tokensUsed,
      costUsd: session.costUsd + args.costUsd,
      lastMessageAt: Date.now(),
    });
  },
});

/**
 * Check if agent is within rate limits
 */
export const checkAgentRateLimit = internalQuery({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    maxMessagesPerDay: v.number(),
    maxCostPerDay: v.number(),
  },
  handler: async (ctx, args) => {
    const dayStart = Date.now() - 24 * 60 * 60 * 1000;

    // Get all sessions for this agent today
    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    const todaySessions = sessions.filter((s) => s.lastMessageAt >= dayStart);

    const totalMessages = todaySessions.reduce((sum, s) => sum + s.messageCount, 0);
    const totalCost = todaySessions.reduce((sum, s) => sum + s.costUsd, 0);

    if (totalMessages >= args.maxMessagesPerDay) {
      return { allowed: false, message: `Daily message limit reached (${args.maxMessagesPerDay})` };
    }

    if (totalCost >= args.maxCostPerDay) {
      return { allowed: false, message: `Daily cost limit reached ($${args.maxCostPerDay})` };
    }

    return { allowed: true, message: "OK", messagesRemaining: args.maxMessagesPerDay - totalMessages };
  },
});

// ============================================================================
// ERROR STATE TRACKING
// ============================================================================

/**
 * Update session error state (disabled tools, failure counts).
 * Called by the execution pipeline when a tool fails 3+ times.
 */
export const updateSessionErrorState = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    disabledTools: v.array(v.string()),
    failedToolCounts: v.any(),
    degraded: v.optional(v.boolean()),
    degradedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;

    await ctx.db.patch(args.sessionId, {
      errorState: {
        disabledTools: args.disabledTools,
        failedToolCounts: args.failedToolCounts as Record<string, number>,
        lastErrorAt: Date.now(),
        degraded: args.degraded,
        degradedAt: args.degraded ? Date.now() : undefined,
        degradedReason: args.degradedReason,
      },
    });
  },
});

/**
 * Get session error state (for resuming tool disable state).
 */
export const getSessionErrorState = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    return (session as Record<string, unknown>).errorState ?? null;
  },
});

// ============================================================================
// AUDIT LOGGING (Internal)
// ============================================================================

/**
 * Log an agent action to the objectActions audit trail
 */
export const logAgentAction = internalMutation({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    actionType: v.string(),
    actionData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.agentId,
      actionType: args.actionType,
      actionData: args.actionData || {},
      performedBy: args.agentId, // Agent performed the action
      performedAt: Date.now(),
    });
  },
});

// ============================================================================
// SESSION LIFECYCLE (Mix of internal + authenticated)
// ============================================================================

/**
 * Close a session (simple — backward compatible)
 */
export const closeSession = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "closed",
      closedAt: Date.now(),
      closeReason: "manual",
    });
  },
});

/**
 * Close a session with a specific reason and optional summary.
 * Used by TTL expiry, manual close, and handoff flows.
 */
export const closeSessionWithReason = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    reason: v.union(
      v.literal("idle_timeout"),
      v.literal("expired"),
      v.literal("manual"),
      v.literal("handed_off")
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "active") return;

    const status = args.reason === "expired" ? "expired" as const : "closed" as const;

    await ctx.db.patch(args.sessionId, {
      status,
      closedAt: Date.now(),
      closeReason: args.reason,
    });
  },
});

// ============================================================================
// SESSION TTL CLEANUP (Cron handler)
// ============================================================================

/**
 * Expire stale sessions in batches.
 * Called every 15 minutes by the cron scheduler.
 */
export const expireStaleSessions = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Get a batch of active sessions
    const activeSessions = await ctx.db
      .query("agentSessions")
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(200);

    let closedCount = 0;

    for (const session of activeSessions) {
      // Get agent config to resolve session policy
      const agentConfig = await ctx.db.get(session.agentId);
      const configProps = (agentConfig?.customProperties || {}) as Record<string, unknown>;
      const policy = getSessionPolicyFromConfig(configProps);
      const { ttl, maxDuration } = resolveSessionTTL(policy, session.channel);

      const isIdle = (now - session.lastMessageAt) > ttl;
      const isExpired = (now - session.startedAt) > maxDuration;

      if (isIdle || isExpired) {
        const closeReason = isExpired ? "expired" as const : "idle_timeout" as const;
        const status = closeReason === "expired" ? "expired" as const : "closed" as const;

        await ctx.db.patch(session._id, {
          status,
          closedAt: now,
          closeReason,
        });

        // Schedule async summary generation if policy requires it
        if (policy.onClose === "summarize_and_archive" && session.messageCount > 2) {
          await ctx.scheduler.runAfter(0, getInternalRef().ai.agentSessions.generateSessionSummary, {
            sessionId: session._id,
          });
        }

        closedCount++;
      }
    }

    if (closedCount > 0) {
      console.log(`[SessionCleanup] Closed ${closedCount} stale sessions`);
    }
  },
});

export function isValidSessionHandoffTarget(
  handOffToUserId: string,
  activeMemberUserIds: string[]
): boolean {
  const normalizedTarget = handOffToUserId.trim();
  return normalizedTarget.length > 0 && activeMemberUserIds.includes(normalizedTarget);
}

/**
 * Hand off session to a human user (requires auth)
 */
export const handOffSession = mutation({
  args: {
    sessionId: v.string(),
    agentSessionId: v.id("agentSessions"),
    handOffToUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const session = await ctx.db.get(args.agentSessionId);
    if (!session) throw new Error("Session not found");

    const activeMembers = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", session.organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    const activeMemberUserIds = activeMembers.map((member) => String(member.userId));

    if (!isValidSessionHandoffTarget(String(args.handOffToUserId), activeMemberUserIds)) {
      throw new Error("Hand off target must be an active organization member");
    }

    await ctx.db.patch(args.agentSessionId, {
      status: "handed_off",
      handedOffTo: args.handOffToUserId,
    });

    // Log handoff
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: session.agentId,
      actionType: "session_handed_off",
      actionData: {
        sessionId: args.agentSessionId,
        handedOffTo: args.handOffToUserId,
      },
      performedAt: Date.now(),
    });
  },
});

/**
 * Get active sessions for an org (for UI dashboard)
 */
/**
 * Get recent sessions for an agent (used by soul evolution reflection).
 */
export const getRecentSessionsForAgent = internalQuery({
  args: {
    agentId: v.id("objects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(args.limit ?? 20);
    return sessions;
  },
});

// ============================================================================
// SESSION SUMMARY GENERATION (Async — scheduled on close)
// ============================================================================

/**
 * Save an LLM-generated summary back to a closed session.
 * Called by generateSessionSummary after the LLM produces a summary.
 */
export const updateSessionSummary = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    summary: v.object({
      text: v.string(),
      generatedAt: v.number(),
      messageCount: v.number(),
      topics: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;

    await ctx.db.patch(args.sessionId, {
      summary: args.summary,
    });
  },
});

/**
 * Generate an LLM summary of a closed session's conversation.
 * Scheduled asynchronously when a session closes with onClose="summarize_and_archive".
 * Uses a cheap model to keep costs low.
 */
export const generateSessionSummary = internalAction({
  args: { sessionId: v.id("agentSessions") },
  handler: async (ctx, { sessionId }) => {
    const messages = await ctx.runQuery(
      getInternalRef().ai.agentSessions.getSessionMessages,
      { sessionId, limit: 20 }
    );

    if (messages.length < 3) return; // Not enough to summarize

    const transcript = messages
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join("\n");

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("[SessionSummary] OPENROUTER_API_KEY not configured, skipping summary");
      return;
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Summarize this conversation in 2-3 sentences. Focus on: what the customer wanted, what was done, any unresolved issues. Be concise.",
            },
            { role: "user", content: transcript },
          ],
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        console.error(`[SessionSummary] OpenRouter returned ${response.status}`);
        return;
      }

      const data = await response.json();
      const summaryText = data.choices?.[0]?.message?.content;

      if (summaryText) {
        await ctx.runMutation(
          getInternalRef().ai.agentSessions.updateSessionSummary,
          {
            sessionId,
            summary: {
              text: summaryText,
              generatedAt: Date.now(),
              messageCount: messages.length,
            },
          }
        );
      }
    } catch (e) {
      console.error("[SessionSummary] Failed to generate summary:", e);
    }
  },
});

// ============================================================================
// PUBLIC QUERIES (Authenticated — called from frontend UI)
// ============================================================================

/**
 * Aggregate session stats per agent for an organization.
 * Used by AgentsWindow and AgentAnalytics to show per-agent metrics.
 */
export const getAgentStats = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Fetch all sessions for this org (across all statuses)
    const allSessions = await ctx.db
      .query("agentSessions")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    // Group by agentId and aggregate
    const statsMap = new Map<
      string,
      {
        agentId: string;
        totalSessions: number;
        activeSessions: number;
        totalMessages: number;
        totalCostUsd: number;
        totalTokens: number;
        lastMessageAt: number;
      }
    >();

    for (const session of allSessions) {
      const key = session.agentId;
      const existing = statsMap.get(key);

      if (existing) {
        existing.totalSessions += 1;
        existing.activeSessions += session.status === "active" ? 1 : 0;
        existing.totalMessages += session.messageCount;
        existing.totalCostUsd += session.costUsd;
        existing.totalTokens += session.tokensUsed;
        existing.lastMessageAt = Math.max(existing.lastMessageAt, session.lastMessageAt || 0);
      } else {
        statsMap.set(key, {
          agentId: key,
          totalSessions: 1,
          activeSessions: session.status === "active" ? 1 : 0,
          totalMessages: session.messageCount,
          totalCostUsd: session.costUsd,
          totalTokens: session.tokensUsed,
          lastMessageAt: session.lastMessageAt || 0,
        });
      }
    }

    return Array.from(statsMap.values());
  },
});

/**
 * Aggregate retrieval telemetry emitted by agentExecution message_processed logs.
 * Used by Lane C/WS4 quality checks and later SLO dashboards.
 */
export const getRetrievalTelemetry = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const clampedHours = Math.min(Math.max(Math.floor(args.hours ?? 24), 1), 24 * 30);
    const since = Date.now() - clampedHours * 60 * 60 * 1000;

    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("actionType", "message_processed")
      )
      .collect();

    const records: AgentRetrievalTelemetryRecord[] = [];
    for (const action of actions) {
      if (action.performedAt < since) continue;
      if (args.agentId && action.objectId !== args.agentId) continue;

      const actionData = (action.actionData || {}) as Record<string, unknown>;
      records.push({
        performedAt: action.performedAt,
        retrieval: actionData.retrieval as AgentRetrievalTelemetry | undefined,
      });
    }

    return {
      source: "agent_message_processed",
      ...aggregateAgentRetrievalTelemetry(records, { windowHours: clampedHours, since }),
    };
  },
});

const SOUL_PROPOSAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "applied",
] as const;

async function collectOrgSoulProposals(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: string
) {
  const grouped = await Promise.all(
    SOUL_PROPOSAL_STATUSES.map((status) =>
      ctx.db
        .query("soulProposals")
        .withIndex("by_org_status", (q: any) =>
          q.eq("organizationId", organizationId).eq("status", status)
        )
        .collect()
    )
  );
  return grouped.flat();
}

/**
 * Operator query: summarize soul drift/alignment proposal telemetry.
 */
export const getOperatorDriftSummary = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const clampedHours = Math.min(Math.max(Math.floor(args.hours ?? 24), 1), 24 * 30);
    const since = Date.now() - clampedHours * 60 * 60 * 1000;
    const proposals = await collectOrgSoulProposals(ctx, args.organizationId);

    const records: SoulDriftRecord[] = proposals
      .filter((proposal) => proposal.createdAt >= since)
      .filter((proposal) => !args.agentId || proposal.agentId === args.agentId)
      .map((proposal) => ({
        createdAt: proposal.createdAt,
        triggerType: typeof proposal.triggerType === "string" ? proposal.triggerType : undefined,
        status: typeof proposal.status === "string" ? proposal.status : undefined,
        alignmentMode:
          typeof proposal.alignmentMode === "string" ? proposal.alignmentMode : undefined,
        driftScores:
          proposal.driftScores && typeof proposal.driftScores === "object"
            ? (proposal.driftScores as SoulDriftScores)
            : undefined,
      }));

    return {
      source: "soul_proposals",
      ...aggregateSoulDriftTelemetry(records, { windowHours: clampedHours, since }),
    };
  },
});

/**
 * Operator query: list latest alignment proposals with drift context.
 */
export const getAlignmentProposalQueue = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("applied"),
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const proposals = args.status
      ? await ctx.db
          .query("soulProposals")
          .withIndex("by_org_status", (q) =>
            q.eq("organizationId", args.organizationId).eq("status", args.status!)
          )
          .collect()
      : await collectOrgSoulProposals(ctx, args.organizationId);

    return proposals
      .filter((proposal) => proposal.triggerType === "alignment")
      .filter((proposal) => !args.agentId || proposal.agentId === args.agentId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, args.limit ?? 50)
      .map((proposal) => ({
        proposalId: proposal._id,
        agentId: proposal.agentId,
        sessionId: proposal.sessionId,
        status: proposal.status,
        alignmentMode: proposal.alignmentMode ?? "monitor",
        targetField: proposal.targetField,
        proposedValue: proposal.proposedValue,
        reason: proposal.reason,
        driftSummary: proposal.driftSummary,
        driftScores: proposal.driftScores,
        driftSignalSource: proposal.driftSignalSource,
        createdAt: proposal.createdAt,
        reviewedAt: proposal.reviewedAt,
      }));
  },
});

/**
 * Aggregate model fallback rate from agent message_processed audit logs.
 */
export const getModelFallbackRate = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const clampedHours = Math.min(Math.max(Math.floor(args.hours ?? 24), 1), 24 * 30);
    const since = Date.now() - clampedHours * 60 * 60 * 1000;

    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("actionType", "message_processed")
      )
      .collect();

    const records: AgentActionTelemetryRecord[] = [];
    for (const action of actions) {
      if (action.performedAt < since) {
        continue;
      }
      if (args.agentId && action.objectId !== args.agentId) {
        continue;
      }

      const actionData = (action.actionData || {}) as Record<string, unknown>;
      records.push({
        performedAt: action.performedAt,
        modelResolution: actionData.modelResolution as
          | AgentModelResolutionTelemetry
          | undefined,
      });
    }

    return {
      source: "agent_message_processed",
      ...aggregateAgentModelFallback(records, { windowHours: clampedHours, since }),
    };
  },
});

/**
 * Aggregate tool success/failure ratio from agent message_processed audit logs.
 */
export const getToolSuccessFailureRatio = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const clampedHours = Math.min(Math.max(Math.floor(args.hours ?? 24), 1), 24 * 30);
    const since = Date.now() - clampedHours * 60 * 60 * 1000;

    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("actionType", "message_processed")
      )
      .collect();

    const records: AgentToolResultRecord[] = [];
    for (const action of actions) {
      if (action.performedAt < since) {
        continue;
      }
      if (args.agentId && action.objectId !== args.agentId) {
        continue;
      }

      const actionData = (action.actionData || {}) as Record<string, unknown>;
      const toolResults = Array.isArray(actionData.toolResults)
        ? actionData.toolResults
        : [];

      for (const result of toolResults) {
        if (!result || typeof result !== "object") {
          records.push({});
          continue;
        }
        const resultRecord = result as Record<string, unknown>;
        records.push({
          tool: typeof resultRecord.tool === "string" ? resultRecord.tool : undefined,
          status:
            typeof resultRecord.status === "string" ? resultRecord.status : undefined,
        });
      }
    }

    return {
      source: "agent_message_processed",
      ...aggregateAgentToolSuccessFailure(records, { windowHours: clampedHours, since }),
    };
  },
});

/**
 * Inspect layered tool scoping decisions emitted in message_processed audit logs.
 */
export const getToolScopingAudit = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    hours: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const clampedHours = Math.min(Math.max(Math.floor(args.hours ?? 24), 1), 24 * 30);
    const since = Date.now() - clampedHours * 60 * 60 * 1000;

    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("actionType", "message_processed")
      )
      .collect();

    let totalMessages = 0;
    const records: Array<{
      performedAt: number;
      sessionId?: string;
      policySource?: string;
      orgAllowListCount?: number;
      orgDenyListCount?: number;
      finalToolCount?: number;
      removedByOrgAllow?: number;
      removedByOrgDeny?: number;
      removedByIntegration?: number;
      finalToolNames?: string[];
    }> = [];

    for (const action of actions) {
      if (action.performedAt < since) {
        continue;
      }
      if (args.agentId && action.objectId !== args.agentId) {
        continue;
      }
      totalMessages += 1;

      const actionData = (action.actionData || {}) as Record<string, unknown>;
      const toolScoping = actionData.toolScoping;
      if (!toolScoping || typeof toolScoping !== "object") {
        continue;
      }

      const toolScopingRecord = toolScoping as Record<string, unknown>;
      const finalToolNames = Array.isArray(toolScopingRecord.finalToolNames)
        ? toolScopingRecord.finalToolNames.filter(
            (entry): entry is string => typeof entry === "string"
          )
        : [];
      const toNumber = (value: unknown): number | undefined =>
        typeof value === "number" && Number.isFinite(value) ? value : undefined;

      records.push({
        performedAt: action.performedAt,
        sessionId:
          typeof actionData.sessionId === "string" ? actionData.sessionId : undefined,
        policySource:
          typeof toolScopingRecord.policySource === "string"
            ? toolScopingRecord.policySource
            : undefined,
        orgAllowListCount: toNumber(toolScopingRecord.orgAllowListCount),
        orgDenyListCount: toNumber(toolScopingRecord.orgDenyListCount),
        finalToolCount: toNumber(toolScopingRecord.finalCount),
        removedByOrgAllow: Array.isArray(toolScopingRecord.removedByOrgAllow)
          ? toolScopingRecord.removedByOrgAllow.length
          : undefined,
        removedByOrgDeny: Array.isArray(toolScopingRecord.removedByOrgDeny)
          ? toolScopingRecord.removedByOrgDeny.length
          : undefined,
        removedByIntegration: Array.isArray(toolScopingRecord.removedByIntegration)
          ? toolScopingRecord.removedByIntegration.length
          : undefined,
        finalToolNames,
      });
    }

    return {
      windowHours: clampedHours,
      since,
      totalMessages,
      auditedMessages: records.length,
      records: records
        .sort((a, b) => b.performedAt - a.performedAt)
        .slice(0, args.limit ?? 50),
    };
  },
});

/**
 * Get messages for a session (authenticated version for the UI).
 * Used by AgentSessionsViewer to display conversation history.
 */
export const getSessionMessagesAuth = query({
  args: {
    sessionId: v.string(),
    agentSessionId: v.id("agentSessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const messages = await ctx.db
      .query("agentSessionMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.agentSessionId))
      .collect();

    const sorted = messages.sort((a, b) => a.timestamp - b.timestamp);
    const limit = args.limit || 50;
    return sorted.slice(-limit);
  },
});

export type ControlCenterEscalationUrgency = "low" | "normal" | "high" | null;

export interface ControlCenterThreadRow {
  threadId: string;
  sessionId: string;
  organizationId: string;
  templateAgentId: string;
  templateAgentName: string;
  lifecycleState: AgentLifecycleState;
  deliveryState: ThreadDeliveryState;
  escalationCountOpen: number;
  escalationUrgency: ControlCenterEscalationUrgency;
  waitingOnHuman: boolean;
  activeInstanceCount: number;
  takeoverOwnerUserId?: string;
  channel: string;
  externalContactIdentifier: string;
  lastMessagePreview: string;
  unreadCount: number;
  pinned: boolean;
  updatedAt: number;
  sortScore: number;
}

export type ControlCenterTimelineEventKind =
  | "lifecycle"
  | "approval"
  | "escalation"
  | "handoff"
  | "tool"
  | "memory"
  | "soul"
  | "operator";

export type ControlCenterTimelineActorType = "agent" | "operator" | "system";

export type ControlCenterEscalationGate = AgentEscalationGate;

export interface ControlCenterTimelineEvent {
  eventId: string;
  sessionId: string;
  threadId: string;
  kind: ControlCenterTimelineEventKind;
  occurredAt: number;
  actorType: ControlCenterTimelineActorType;
  actorId: string;
  fromState?: AgentLifecycleState;
  toState?: AgentLifecycleState;
  checkpoint?: string;
  escalationGate: ControlCenterEscalationGate;
  title: string;
  summary: string;
  reason?: string;
  trustEventName?: string;
  trustEventId?: string;
  sourceObjectIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface ControlCenterAgentInstanceSummary {
  instanceAgentId: string;
  templateAgentId: string;
  sessionId: string;
  roleLabel: string;
  spawnedAt: number;
  parentInstanceAgentId?: string;
  handoffReason?: string;
  active: boolean;
  displayName?: string;
}

export interface ControlCenterThreadDrillDown {
  threadId: string;
  timelineEvents: ControlCenterTimelineEvent[];
  lineage: ControlCenterAgentInstanceSummary[];
}

interface TimelineRetrievalCitation {
  citationId?: string;
  chunkId?: string;
  mediaId?: string;
  filename?: string;
  source?: string;
  retrievalMethod?: string;
}

interface TimelineRetrievalMetadata {
  mode?: string;
  path?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  citationCount?: number;
  chunkCitationCount?: number;
  citations?: TimelineRetrievalCitation[];
}

function resolveOpenEscalationMeta(session: {
  escalationState?: {
    status?: string;
    urgency?: string;
  } | null;
}): {
  escalationCountOpen: number;
  escalationUrgency: ControlCenterEscalationUrgency;
} {
  const escalationState = session.escalationState;
  if (!escalationState) {
    return {
      escalationCountOpen: 0,
      escalationUrgency: null,
    };
  }

  if (escalationState.status !== "pending" && escalationState.status !== "taken_over") {
    return {
      escalationCountOpen: 0,
      escalationUrgency: null,
    };
  }

  const urgency =
    escalationState.urgency === "high"
    || escalationState.urgency === "normal"
    || escalationState.urgency === "low"
      ? escalationState.urgency
      : "normal";

  return {
    escalationCountOpen: 1,
    escalationUrgency: urgency,
  };
}

function resolveWaitingOnHuman(lifecycleState: AgentLifecycleState): boolean {
  return lifecycleState === "escalated" || lifecycleState === "takeover";
}

function normalizeMessagePreview(content: unknown): string {
  if (typeof content !== "string") {
    return "No messages yet.";
  }
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return "No messages yet.";
  }
  return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
}

function resolveActiveInstanceCount(session: {
  agentId: Id<"objects">;
  teamSession?: {
    activeAgentId?: Id<"objects">;
    participatingAgentIds?: Id<"objects">[];
  } | null;
}): number {
  const instanceIds = new Set<string>();
  instanceIds.add(String(session.agentId));

  if (session.teamSession?.activeAgentId) {
    instanceIds.add(String(session.teamSession.activeAgentId));
  }

  for (const participantId of session.teamSession?.participatingAgentIds || []) {
    instanceIds.add(String(participantId));
  }

  return Math.max(1, instanceIds.size);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readAgentDisplayName(agent: any): string | null {
  if (!agent || typeof agent !== "object") {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customProperties = (agent.customProperties || {}) as any;
  if (typeof customProperties.displayName === "string" && customProperties.displayName.trim().length > 0) {
    return customProperties.displayName.trim();
  }
  if (typeof agent.name === "string" && agent.name.trim().length > 0) {
    return agent.name.trim();
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readTemplateAgentId(agent: any): Id<"objects"> | null {
  if (!agent || typeof agent !== "object") {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customProperties = (agent.customProperties || {}) as any;
  if (typeof customProperties.templateAgentId === "string" && customProperties.templateAgentId.trim().length > 0) {
    return customProperties.templateAgentId as Id<"objects">;
  }
  return null;
}

const LIFECYCLE_CHECKPOINT_SET = new Set<string>(
  AGENT_LIFECYCLE_CHECKPOINT_VALUES
);

const MEMORY_TRUST_EVENT_NAMES = new Set<string>([
  "trust.memory.consent_prompted.v1",
  "trust.memory.consent_decided.v1",
  "trust.memory.write_blocked_no_consent.v1",
]);

function resolveTimelineActorType(value: unknown): ControlCenterTimelineActorType {
  if (value === "agent") {
    return "agent";
  }
  if (value === "user" || value === "operator") {
    return "operator";
  }
  return "system";
}

function readLifecycleState(value: unknown): AgentLifecycleState | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return isAgentLifecycleState(value) ? value : undefined;
}

function readLifecycleCheckpoint(value: unknown): AgentLifecycleCheckpoint | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return LIFECYCLE_CHECKPOINT_SET.has(value)
    ? (value as AgentLifecycleCheckpoint)
    : undefined;
}

function resolveTimelineKindFromCheckpoint(
  checkpoint?: AgentLifecycleCheckpoint
): ControlCenterTimelineEventKind {
  if (!checkpoint) {
    return "lifecycle";
  }
  if (checkpoint === "approval_requested" || checkpoint === "approval_resolved") {
    return "approval";
  }
  if (checkpoint.startsWith("escalation_") || checkpoint === "agent_resumed") {
    return "escalation";
  }
  return "lifecycle";
}

function humanizeLifecycleToken(value: string): string {
  return value.replace(/_/g, " ");
}

function isMemoryTrustEventName(value: unknown): value is string {
  return typeof value === "string" && MEMORY_TRUST_EVENT_NAMES.has(value);
}

function resolveMemoryTrustEventTitle(eventName: string): string {
  if (eventName === "trust.memory.consent_prompted.v1") {
    return "Memory Consent Prompted";
  }
  if (eventName === "trust.memory.consent_decided.v1") {
    return "Memory Consent Decision";
  }
  return "Memory Write Blocked (No Consent)";
}

function summarizeMemoryTrustEvent(payload: {
  consent_scope?: string;
  consent_decision?: string;
  memory_candidate_ids?: string[];
}): string {
  const scope = typeof payload.consent_scope === "string"
    ? payload.consent_scope
    : "unknown";
  const decision = typeof payload.consent_decision === "string"
    ? payload.consent_decision
    : "unknown";
  const candidateCount = Array.isArray(payload.memory_candidate_ids)
    ? payload.memory_candidate_ids.length
    : 0;
  return `Consent scope ${scope}; decision ${decision}; candidates ${candidateCount}.`;
}

function normalizeTimelineRetrievalMetadata(value: unknown): TimelineRetrievalMetadata | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const citations = Array.isArray(record.citations)
    ? record.citations
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
        .map((entry) => ({
          citationId: typeof entry.citationId === "string" ? entry.citationId : undefined,
          chunkId: typeof entry.chunkId === "string" ? entry.chunkId : undefined,
          mediaId: typeof entry.mediaId === "string" ? entry.mediaId : undefined,
          filename: typeof entry.filename === "string" ? entry.filename : undefined,
          source: typeof entry.source === "string" ? entry.source : undefined,
          retrievalMethod:
            typeof entry.retrievalMethod === "string" ? entry.retrievalMethod : undefined,
        }))
    : undefined;

  const citationCount =
    typeof record.citationCount === "number"
      ? record.citationCount
      : citations?.length;
  const chunkCitationCount =
    typeof record.chunkCitationCount === "number"
      ? record.chunkCitationCount
      : citations?.filter((citation) =>
          typeof citation.chunkId === "string" && citation.chunkId.trim().length > 0
        ).length;

  return {
    mode: typeof record.mode === "string" ? record.mode : undefined,
    path: typeof record.path === "string" ? record.path : undefined,
    fallbackUsed: typeof record.fallbackUsed === "boolean" ? record.fallbackUsed : undefined,
    fallbackReason:
      typeof record.fallbackReason === "string" ? record.fallbackReason : undefined,
    citationCount,
    chunkCitationCount,
    citations,
  };
}

function resolveInstanceRoleLabel(args: {
  instanceId: string;
  rootInstanceId: string;
  activeInstanceId: string;
}): string {
  if (args.instanceId === args.rootInstanceId) {
    return "Primary";
  }
  if (args.instanceId === args.activeInstanceId) {
    return "Active Specialist";
  }
  return "Specialist";
}

export function buildControlCenterSortScore(args: {
  waitingOnHuman: boolean;
  escalationUrgency: ControlCenterEscalationUrgency;
  escalationCountOpen: number;
  updatedAt: number;
}): number {
  const waitingWeight = args.waitingOnHuman ? 4_000_000_000_000 : 0;
  const urgencyWeight =
    args.escalationUrgency === "high"
      ? 3_000_000_000_000
      : args.escalationUrgency === "normal"
        ? 2_000_000_000_000
        : args.escalationUrgency === "low"
          ? 1_000_000_000_000
          : 0;
  const escalationWeight = args.escalationCountOpen > 0 ? 500_000_000_000 : 0;
  return waitingWeight + urgencyWeight + escalationWeight + args.updatedAt;
}

export function sortControlCenterThreadRows(rows: ControlCenterThreadRow[]): ControlCenterThreadRow[] {
  return [...rows].sort((a, b) => {
    if (a.waitingOnHuman !== b.waitingOnHuman) {
      return a.waitingOnHuman ? -1 : 1;
    }
    return b.sortScore - a.sortScore;
  });
}

/**
 * Get control-center thread rows with lifecycle/delivery separation.
 */
export const getControlCenterThreadRows = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ControlCenterThreadRow[]> => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const [activeSessions, handedOffSessions] = await Promise.all([
      ctx.db
        .query("agentSessions")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "active")
        )
        .collect(),
      ctx.db
        .query("agentSessions")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "handed_off")
        )
        .collect(),
    ]);

    const sessions = [...activeSessions, ...handedOffSessions];
    if (sessions.length === 0) {
      return [];
    }

    const agentIds = new Set<string>();
    for (const session of sessions) {
      agentIds.add(String(session.agentId));
      if (session.teamSession?.activeAgentId) {
        agentIds.add(String(session.teamSession.activeAgentId));
      }
      for (const participantId of session.teamSession?.participatingAgentIds || []) {
        agentIds.add(String(participantId));
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentMap = new Map<string, any>();
    await Promise.all(
      Array.from(agentIds).map(async (agentId) => {
        const agent = await ctx.db.get(agentId as Id<"objects">);
        if (agent) {
          agentMap.set(agentId, agent);
        }
      })
    );

    const templateIds = new Set<string>();
    for (const agent of agentMap.values()) {
      const templateId = readTemplateAgentId(agent);
      if (templateId) {
        templateIds.add(String(templateId));
      }
    }

    await Promise.all(
      Array.from(templateIds).map(async (templateId) => {
        if (agentMap.has(templateId)) {
          return;
        }
        const templateAgent = await ctx.db.get(templateId as Id<"objects">);
        if (templateAgent) {
          agentMap.set(templateId, templateAgent);
        }
      })
    );

    const rows = await Promise.all(
      sessions.map(async (session): Promise<ControlCenterThreadRow | null> => {
        const lifecycleState = resolveSessionLifecycleState(session);
        const waitingOnHuman = resolveWaitingOnHuman(lifecycleState);
        const { escalationCountOpen, escalationUrgency } = resolveOpenEscalationMeta(session);

        const activeAgentId = session.teamSession?.activeAgentId || session.agentId;
        const activeAgent = agentMap.get(String(activeAgentId));
        const primaryAgent = activeAgent || agentMap.get(String(session.agentId));
        const templateAgentId = readTemplateAgentId(primaryAgent) || activeAgentId;
        const templateAgent = agentMap.get(String(templateAgentId)) || primaryAgent;
        const templateAgentName = readAgentDisplayName(templateAgent) || "Unknown Agent";

        const relatedAgentIds = new Set<string>();
        relatedAgentIds.add(String(session.agentId));
        relatedAgentIds.add(String(activeAgentId));
        relatedAgentIds.add(String(templateAgentId));
        for (const participantId of session.teamSession?.participatingAgentIds || []) {
          relatedAgentIds.add(String(participantId));
        }

        if (args.agentId && !relatedAgentIds.has(String(args.agentId))) {
          return null;
        }

        const [latestTurn, latestMessage] = await Promise.all([
          ctx.db
            .query("agentTurns")
            .withIndex("by_session_created", (q) => q.eq("sessionId", session._id))
            .order("desc")
            .first(),
          ctx.db
            .query("agentSessionMessages")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .order("desc")
            .first(),
        ]);

        const deliveryState = resolveThreadDeliveryState({
          sessionStatus: session.status,
          escalationStatus: session.escalationState?.status,
          latestTurnState: latestTurn?.state,
        });

        const updatedAt = Math.max(
          session.lastMessageAt || 0,
          latestTurn?.updatedAt || 0,
          session.lifecycleUpdatedAt || 0
        );

        const takeoverOwnerUserId =
          lifecycleState === "takeover"
          && (session.escalationState?.respondedBy || session.handedOffTo)
            ? String(session.escalationState?.respondedBy || session.handedOffTo)
            : undefined;

        const sortScore = buildControlCenterSortScore({
          waitingOnHuman,
          escalationUrgency,
          escalationCountOpen,
          updatedAt,
        });

        return {
          threadId: String(session._id),
          sessionId: String(session._id),
          organizationId: String(session.organizationId),
          templateAgentId: String(templateAgentId),
          templateAgentName,
          lifecycleState,
          deliveryState,
          escalationCountOpen,
          escalationUrgency,
          waitingOnHuman,
          activeInstanceCount: resolveActiveInstanceCount(session),
          takeoverOwnerUserId,
          channel: session.channel,
          externalContactIdentifier: session.externalContactIdentifier,
          lastMessagePreview: normalizeMessagePreview(latestMessage?.content),
          unreadCount: 0,
          pinned: false,
          updatedAt,
          sortScore,
        };
      })
    );

    const sorted = sortControlCenterThreadRows(
      rows.filter((row): row is ControlCenterThreadRow => row !== null)
    );

    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
    return sorted.slice(0, limit);
  },
});

/**
 * Thread drill-down payload for the control-center timeline and lineage views.
 * Timeline events are sourced from canonical lifecycle trust events.
 */
export const getControlCenterThreadDrillDown = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    threadId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ControlCenterThreadDrillDown | null> => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const threadId = args.threadId as Id<"agentSessions">;
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.organizationId !== args.organizationId) {
      return null;
    }

    const eventLimit = Math.max(1, Math.min(args.limit ?? 60, 200));
    const trustScanLimit = Math.max(250, eventLimit * 8);

    const trustEvents = await ctx.db
      .query("aiTrustEvents")
      .withIndex("by_org_occurred_at", (q) => q.eq("payload.org_id", args.organizationId))
      .order("desc")
      .take(trustScanLimit);

    const trustTimelineEvents = trustEvents
      .filter((event) =>
        (
          event.event_name === "trust.lifecycle.transition_checkpoint.v1"
          || event.event_name === "trust.lifecycle.operator_reply_in_stream.v1"
          || isMemoryTrustEventName(event.event_name)
        )
        && event.payload.session_id === args.threadId
      )
      .map((event): ControlCenterTimelineEvent => {
        const isOperatorReplyEvent =
          event.event_name === "trust.lifecycle.operator_reply_in_stream.v1";
        const isMemoryEvent = isMemoryTrustEventName(event.event_name);
        const checkpoint = readLifecycleCheckpoint(event.payload.lifecycle_checkpoint);
        const fromState = readLifecycleState(event.payload.lifecycle_state_from);
        const toState = readLifecycleState(event.payload.lifecycle_state_to);
        const reason =
          typeof event.payload.lifecycle_transition_reason === "string"
            ? event.payload.lifecycle_transition_reason
            : undefined;
        const actorType = resolveTimelineActorType(event.payload.actor_type);
        const actorId =
          typeof event.payload.actor_id === "string" && event.payload.actor_id.trim().length > 0
            ? event.payload.actor_id
            : "unknown";
        const kind = isMemoryEvent
          ? "memory"
          : isOperatorReplyEvent
            ? "operator"
            : resolveTimelineKindFromCheckpoint(checkpoint);
        const escalationGate = checkpoint
          ? resolveEscalationGateForLifecycleTransition({
              checkpoint,
              reason,
            })
          : "not_applicable";
        const checkpointLabel = checkpoint ? humanizeLifecycleToken(checkpoint) : "transition";
        const transitionLabel =
          fromState && toState
            ? `${fromState} -> ${toState}`
            : "transition recorded";
        const title = isMemoryEvent
          ? resolveMemoryTrustEventTitle(event.event_name)
          : isOperatorReplyEvent
            ? "Operator In-Stream Reply"
            : `Checkpoint ${checkpointLabel}`;
        const summary = isMemoryEvent
          ? summarizeMemoryTrustEvent({
              consent_scope: event.payload.consent_scope,
              consent_decision: event.payload.consent_decision,
              memory_candidate_ids: event.payload.memory_candidate_ids,
            })
          : isOperatorReplyEvent
            ? `Operator reply recorded at ${checkpointLabel}. Actor ${actorType}:${actorId}.`
            : `${transitionLabel}. Actor ${actorType}:${actorId}.`;

        return {
          eventId:
            typeof event.payload.event_id === "string" && event.payload.event_id.trim().length > 0
              ? event.payload.event_id
              : String(event._id),
          sessionId: args.threadId,
          threadId: args.threadId,
          kind,
          occurredAt: event.payload.occurred_at || event.created_at,
          actorType,
          actorId,
          fromState,
          toState,
          checkpoint,
          escalationGate,
          title,
          summary,
          reason,
          trustEventName: event.event_name,
          trustEventId:
            typeof event.payload.event_id === "string" ? event.payload.event_id : undefined,
          sourceObjectIds: event.payload.source_object_ids,
          metadata: {
            schemaValidationStatus: event.schema_validation_status,
            eventVersion: event.payload.event_version,
            ...(isMemoryEvent
              ? {
                  consentScope: event.payload.consent_scope,
                  consentDecision: event.payload.consent_decision,
                  memoryCandidateIds: event.payload.memory_candidate_ids,
                  consentPromptVersion: event.payload.consent_prompt_version,
                }
              : {}),
          },
        };
      });

    const handoffHistory = thread.teamSession?.handoffHistory || [];
    const instanceIds = new Set<string>();
    instanceIds.add(String(thread.agentId));
    if (thread.teamSession?.activeAgentId) {
      instanceIds.add(String(thread.teamSession.activeAgentId));
    }
    for (const participantId of thread.teamSession?.participatingAgentIds || []) {
      instanceIds.add(String(participantId));
    }
    for (const handoff of handoffHistory) {
      instanceIds.add(String(handoff.fromAgentId));
      instanceIds.add(String(handoff.toAgentId));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentMap = new Map<string, any>();
    await Promise.all(
      Array.from(instanceIds).map(async (instanceId) => {
        const agent = await ctx.db.get(instanceId as Id<"objects">);
        if (agent) {
          agentMap.set(instanceId, agent);
        }
      })
    );

    const templateIds = new Set<string>();
    for (const agent of agentMap.values()) {
      const templateId = readTemplateAgentId(agent);
      if (templateId) {
        templateIds.add(String(templateId));
      }
    }
    await Promise.all(
      Array.from(templateIds).map(async (templateId) => {
        if (agentMap.has(templateId)) {
          return;
        }
        const templateAgent = await ctx.db.get(templateId as Id<"objects">);
        if (templateAgent) {
          agentMap.set(templateId, templateAgent);
        }
      })
    );

    const retrievalActionScanLimit = Math.max(120, eventLimit * 6);
    const retrievalActions = (
      await Promise.all(
        Array.from(instanceIds).map(async (instanceId) =>
          ctx.db
            .query("objectActions")
            .withIndex("by_object", (q) => q.eq("objectId", instanceId as Id<"objects">))
            .order("desc")
            .take(retrievalActionScanLimit)
        )
      )
    ).flat();

    const retrievalTimelineEvents = retrievalActions
      .filter((action) =>
        action.organizationId === args.organizationId
        && action.actionType === "message_processed"
      )
      .map((action): ControlCenterTimelineEvent | null => {
        const actionData = (action.actionData || {}) as Record<string, unknown>;
        const actionSessionId =
          typeof actionData.sessionId === "string"
            ? actionData.sessionId
            : String(actionData.sessionId || "");
        if (!actionSessionId || actionSessionId !== args.threadId) {
          return null;
        }

        const retrieval = normalizeTimelineRetrievalMetadata(actionData.retrieval);
        if (!retrieval) {
          return null;
        }

        const citationCount =
          typeof retrieval.citationCount === "number"
            ? retrieval.citationCount
            : retrieval.citations?.length || 0;
        const chunkCitationCount =
          typeof retrieval.chunkCitationCount === "number"
            ? retrieval.chunkCitationCount
            : retrieval.citations?.filter((citation) =>
                typeof citation.chunkId === "string" && citation.chunkId.trim().length > 0
              ).length || 0;
        const bridgeCitationCount = retrieval.citations?.filter((citation) =>
          citation.source === "knowledge_item_bridge"
        ).length || 0;

        return {
          eventId: `retrieval:${String(action._id)}`,
          sessionId: args.threadId,
          threadId: args.threadId,
          kind: "tool",
          occurredAt: action.performedAt,
          actorType: "agent",
          actorId: String(action.objectId),
          escalationGate: "not_applicable",
          title: "Retrieval Citation Snapshot",
          summary: `Mode ${retrieval.mode || "unknown"}${retrieval.path ? ` via ${retrieval.path}` : ""}; ${citationCount} citation${citationCount === 1 ? "" : "s"} (${chunkCitationCount} chunk, ${bridgeCitationCount} bridge).`,
          sourceObjectIds: [String(action.objectId)],
          metadata: {
            retrieval,
            citationCount,
            chunkCitationCount,
            bridgeCitationCount,
            fallbackUsed: retrieval.fallbackUsed,
            fallbackReason: retrieval.fallbackReason,
          },
        };
      })
      .filter((event): event is ControlCenterTimelineEvent => event !== null)
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .slice(0, Math.min(eventLimit, 40));

    const rootInstanceId = String(thread.agentId);
    const activeInstanceId = String(thread.teamSession?.activeAgentId || thread.agentId);
    const rootTemplateId =
      readTemplateAgentId(agentMap.get(rootInstanceId)) || thread.agentId;

    const lineage: ControlCenterAgentInstanceSummary[] = Array.from(instanceIds)
      .map((instanceId) => {
        const instanceAgent = agentMap.get(instanceId);
        const templateAgentId =
          readTemplateAgentId(instanceAgent)
          || rootTemplateId;
        const inboundHandoffs = handoffHistory.filter(
          (entry) => String(entry.toAgentId) === instanceId
        );
        const latestInboundHandoff = inboundHandoffs.length > 0
          ? [...inboundHandoffs].sort((a, b) => b.timestamp - a.timestamp)[0]
          : null;
        const firstInboundHandoff = inboundHandoffs.length > 0
          ? [...inboundHandoffs].sort((a, b) => a.timestamp - b.timestamp)[0]
          : null;
        const parentInstanceAgentId =
          latestInboundHandoff
          && String(latestInboundHandoff.fromAgentId) !== instanceId
            ? String(latestInboundHandoff.fromAgentId)
            : undefined;
        const handoffReason = latestInboundHandoff?.reason;
        const spawnedAt = firstInboundHandoff?.timestamp || thread.startedAt;

        return {
          instanceAgentId: instanceId,
          templateAgentId: String(templateAgentId),
          sessionId: args.threadId,
          roleLabel: resolveInstanceRoleLabel({
            instanceId,
            rootInstanceId,
            activeInstanceId,
          }),
          spawnedAt,
          parentInstanceAgentId,
          handoffReason,
          active: instanceId === activeInstanceId,
          displayName: readAgentDisplayName(instanceAgent) || undefined,
        };
      })
      .sort((a, b) => {
        if (a.active !== b.active) {
          return a.active ? -1 : 1;
        }
        if (Boolean(a.parentInstanceAgentId) !== Boolean(b.parentInstanceAgentId)) {
          return a.parentInstanceAgentId ? 1 : -1;
        }
        return a.spawnedAt - b.spawnedAt;
      });

    const handoffTimelineEvents = handoffHistory.map((handoff, index): ControlCenterTimelineEvent => {
      const fromAgentId = String(handoff.fromAgentId);
      const toAgentId = String(handoff.toAgentId);
      const toAgentLabel =
        readAgentDisplayName(agentMap.get(toAgentId))
        || toAgentId;

      return {
        eventId: `handoff:${args.threadId}:${handoff.timestamp}:${index}`,
        sessionId: args.threadId,
        threadId: args.threadId,
        kind: "handoff",
        occurredAt: handoff.timestamp,
        actorType: "agent",
        actorId: fromAgentId,
        checkpoint: "handoff_completed",
        escalationGate: "not_applicable",
        title: `Handoff to ${toAgentLabel}`,
        summary: handoff.summary,
        reason: handoff.reason,
        sourceObjectIds: [fromAgentId, toAgentId],
        metadata: {
          goal: handoff.goal,
        },
      };
    });

    const timelineEvents = [...trustTimelineEvents, ...retrievalTimelineEvents, ...handoffTimelineEvents]
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .slice(0, eventLimit);

    return {
      threadId: args.threadId,
      timelineEvents,
      lineage,
    };
  },
});

export const getActiveSessions = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", (args.status || "active") as "active" | "closed" | "handed_off")
      )
      .collect();

    return sessions;
  },
});

const RECEIPT_STATUSES = [
  "accepted",
  "processing",
  "completed",
  "failed",
  "duplicate",
] as const;

async function collectOrgReceipts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: string
) {
  const receipts = await Promise.all(
    RECEIPT_STATUSES.map((status) =>
      ctx.db
        .query("agentInboxReceipts")
        .withIndex("by_org_status", (q: any) =>
          q.eq("organizationId", organizationId).eq("status", status)
        )
        .collect()
    )
  );
  return receipts.flat();
}

/**
 * List stale receipts by age (accepted/processing older than threshold).
 */
export const getAgingReceipts = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    minAgeMinutes: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const minAgeMinutes = Math.max(1, Math.floor(args.minAgeMinutes ?? 15));
    const minAgeMs = minAgeMinutes * 60 * 1000;
    const now = Date.now();
    const receipts = await collectOrgReceipts(ctx, args.organizationId);

    return receipts
      .filter((receipt) => receipt.status === "accepted" || receipt.status === "processing")
      .map((receipt) => ({
        receiptId: receipt._id,
        status: receipt.status,
        turnId: receipt.turnId,
        idempotencyKey: receipt.idempotencyKey,
        ageMs: now - receipt.firstSeenAt,
        duplicateCount: receipt.duplicateCount,
        firstSeenAt: receipt.firstSeenAt,
        lastSeenAt: receipt.lastSeenAt,
      }))
      .filter((receipt) => receipt.ageMs >= minAgeMs)
      .sort((a, b) => b.ageMs - a.ageMs)
      .slice(0, args.limit ?? 50);
  },
});

/**
 * List receipts with duplicate ingress attempts.
 */
export const getDuplicateReceipts = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    minDuplicateCount: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const minDuplicateCount = Math.max(1, Math.floor(args.minDuplicateCount ?? 1));
    const receipts = await collectOrgReceipts(ctx, args.organizationId);

    return receipts
      .filter((receipt) => receipt.duplicateCount >= minDuplicateCount)
      .map((receipt) => ({
        receiptId: receipt._id,
        status: receipt.status,
        turnId: receipt.turnId,
        idempotencyKey: receipt.idempotencyKey,
        duplicateCount: receipt.duplicateCount,
        firstSeenAt: receipt.firstSeenAt,
        lastSeenAt: receipt.lastSeenAt,
      }))
      .sort((a, b) => {
        if (b.duplicateCount !== a.duplicateCount) {
          return b.duplicateCount - a.duplicateCount;
        }
        return b.lastSeenAt - a.lastSeenAt;
      })
      .slice(0, args.limit ?? 100);
  },
});

/**
 * List receipts that appear stuck in processing.
 */
export const getStuckReceipts = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    staleMinutes: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const staleMinutes = Math.max(1, Math.floor(args.staleMinutes ?? 10));
    const staleMs = staleMinutes * 60 * 1000;
    const now = Date.now();

    const processingReceipts = await ctx.db
      .query("agentInboxReceipts")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "processing")
      )
      .collect();

    return processingReceipts
      .map((receipt) => {
        const startedAt = receipt.processingStartedAt ?? receipt.firstSeenAt;
        return {
          receiptId: receipt._id,
          turnId: receipt.turnId,
          idempotencyKey: receipt.idempotencyKey,
          processingAgeMs: now - startedAt,
          startedAt,
          duplicateCount: receipt.duplicateCount,
          lastSeenAt: receipt.lastSeenAt,
        };
      })
      .filter((receipt) => receipt.processingAgeMs >= staleMs)
      .sort((a, b) => b.processingAgeMs - a.processingAgeMs)
      .slice(0, args.limit ?? 50);
  },
});

/**
 * Replay-safe debug endpoint: returns replay plan without executing side effects.
 */
export const getReplaySafeReceiptDebug = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    receiptId: v.id("agentInboxReceipts"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.organizationId !== args.organizationId) {
      return null;
    }

    const canReplay = receipt.status !== "processing";
    const now = Date.now();
    return {
      receiptId: receipt._id,
      status: receipt.status,
      turnId: receipt.turnId,
      idempotencyKey: receipt.idempotencyKey,
      duplicateCount: receipt.duplicateCount,
      canReplay,
      replayMetadata: canReplay
        ? {
            replayOfReceiptId: receipt._id,
            debugReplay: true,
            idempotencyKey: `${receipt.idempotencyKey}:debug:${now}`,
          }
        : null,
    };
  },
});

/**
 * Replay-safe debug endpoint: logs replay intent for operators without executing replay.
 */
export const requestReplaySafeReceipt = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    receiptId: v.id("agentInboxReceipts"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx, args.sessionId);
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.organizationId !== args.organizationId) {
      throw new Error("Receipt not found");
    }

    const canReplay = receipt.status !== "processing";
    const now = Date.now();
    const replayIdempotencyKey = `${receipt.idempotencyKey}:debug:${now}`;

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: receipt.agentId,
      actionType: "receipt_replay_requested",
      actionData: {
        receiptId: receipt._id,
        turnId: receipt.turnId,
        requestedBy: user.userId,
        reason: args.reason,
        canReplay,
        replayIdempotencyKey: canReplay ? replayIdempotencyKey : undefined,
      },
      performedAt: now,
    });

    return {
      accepted: canReplay,
      reason: canReplay ? "queued_for_operator_replay" : "receipt_still_processing",
      replayMetadata: canReplay
        ? {
            replayOfReceiptId: receipt._id,
            debugReplay: true,
            idempotencyKey: replayIdempotencyKey,
          }
        : null,
    };
  },
});
