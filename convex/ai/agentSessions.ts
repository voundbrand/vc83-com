/**
 * AGENT SESSION MANAGEMENT
 *
 * Manages conversations between org agents and external contacts.
 * Sessions are keyed by org + channel + agent + contact + route identity.
 *
 * Flow:
 * 1. Inbound message arrives → resolveSession() finds or creates session
 * 2. resolveContact() matches external identifier to CRM contact
 * 3. Messages stored in agentSessionMessages
 * 4. Stats updated after each exchange
 */

import { action, query, mutation, internalQuery, internalMutation, internalAction } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { checkPermission, getUserContext, requireAuthenticatedUser } from "../rbacHelpers";
import {
  AGENT_TURN_TRANSITION_POLICY_VERSION,
  COLLABORATION_CONTRACT_VERSION,
  assertAgentExecutionBundleContract,
  assertAgentTurnTransitionEdge,
  assertCollaborationRuntimeContract,
  assertRuntimeIdempotencyContract,
  assertTurnQueueContract,
  agentExecutionBundleContractValidator,
  agentTurnRunAttemptContractValidator,
  collaborationAuthorityContractValidator,
  collaborationKernelContractValidator,
  runtimeIdempotencyContractValidator,
  turnQueueContractValidator,
  type AgentExecutionBundleContract,
  type AgentTurnReplayInvariantStatus,
  type AgentTurnRunAttemptContract,
  type AgentTurnState,
  type AgentTurnTransition,
  type CollaborationAuthorityContract,
  type CollaborationKernelContract,
  type RuntimeIdempotencyContract,
  type TurnQueueContract,
} from "../schemas/aiSchemas";
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
  normalizeCollaborationSyncCheckpointContract,
  resolveThreadDeliveryState,
  type ThreadDeliveryState,
} from "./agentExecution";
import {
  buildTrustTimelineCorrelationId,
  resolveTrustTimelineSurfaceFromWorkflow,
  type TrustTimelineSurface,
} from "./trustEvents";
import {
  AGENT_OPS_ALERT_THRESHOLD_DEFINITIONS,
  evaluateAgentOpsAlertThreshold,
  normalizeActionCompletionMismatchReasonCode,
  normalizeActionCompletionTemplateIdentifier,
  type ActionCompletionMismatchReasonCode,
  type AgentOpsAlertMetricKey,
  type AgentOpsAlertSeverity,
} from "./trustTelemetry";
import {
  RUNTIME_CAPABILITY_MANIFEST_ARTIFACT_ACTION_TYPE,
  buildRuntimeCapabilityManifestArtifact,
  normalizeRuntimeCapabilityManifestArtifact,
} from "./runtimeCapabilityManifestStore";
import {
  determineOrgLayer,
  getOrgIdsForScope,
  resolveScopedOrgTarget,
  type Scope,
  type ScopedOrg,
} from "../lib/layerScope";
import { filterVisibleOrdinaryOrganizations } from "../lib/organizationLifecycle";
import {
  CONTACT_MEMORY_FIELD_ORDER,
  buildSessionReactivationMemorySnapshot,
  buildRollingSessionMemorySnapshot,
  extractSessionContactMemoryCandidates,
  normalizeSessionContactMemoryRecord,
  normalizeSessionReactivationMemoryRecord,
  normalizeSessionRollingSummaryMemoryRecord,
  planSessionContactMemoryMerge,
  SESSION_CONTACT_MEMORY_CONTRACT_VERSION,
  SESSION_CONTACT_MEMORY_PROVENANCE_VERSION,
  SESSION_CONTACT_MEMORY_SOURCE_POLICY,
  SESSION_CONTACT_MEMORY_TRUST_EVENT_NAME,
  type SessionContactMemoryField,
  type SessionContactMemoryRecord,
  type SessionReactivationMemoryRecord,
  type SessionRollingSummaryMemoryRecord,
} from "./memoryComposer";
import { OpenRouterClient } from "./openrouter";

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

// Lazy-load full generated API to access public billing mutations from actions.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

export type SessionRouteProfileType = "platform" | "organization";

export interface SessionChannelRouteIdentityRecord {
  bindingId?: Id<"objects">;
  providerId?: string;
  providerConnectionId?: string;
  providerAccountId?: string;
  providerInstallationId?: string;
  providerProfileId?: string;
  providerProfileType?: SessionRouteProfileType;
  routeKey?: string;
}

export const LEGACY_SESSION_ROUTING_KEY = "legacy";
export const SESSION_ROUTING_METADATA_CONTRACT_VERSION =
  "occ_operator_routing_v1" as const;

export interface SessionRoutingMetadataRecord {
  contractVersion: typeof SESSION_ROUTING_METADATA_CONTRACT_VERSION;
  tenantId: string;
  lineageId: string;
  threadId: string;
  workflowKey: string;
  updatedAt: number;
  updatedBy?: string;
}

interface SessionCollaborationKernelIdentity {
  lineageId?: string;
  threadId?: string;
}

function normalizeRouteIdentityString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function areJsonValuesEquivalent(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }
  if (left === null || right === null) {
    return left === right;
  }
  const leftType = typeof left;
  const rightType = typeof right;
  if (leftType !== rightType) {
    return false;
  }
  if (leftType !== "object") {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }
    if (left.length !== right.length) {
      return false;
    }
    for (let index = 0; index < left.length; index += 1) {
      if (!areJsonValuesEquivalent(left[index], right[index])) {
        return false;
      }
    }
    return true;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (let index = 0; index < leftKeys.length; index += 1) {
    const key = leftKeys[index];
    if (!key || key !== rightKeys[index]) {
      return false;
    }
    if (!areJsonValuesEquivalent(leftRecord[key], rightRecord[key])) {
      return false;
    }
  }
  return true;
}

function normalizeSessionRouteProfileType(
  value: unknown
): SessionRouteProfileType | undefined {
  return value === "platform" || value === "organization" ? value : undefined;
}

function normalizeSessionCollaborationKernelIdentity(
  value: unknown
): SessionCollaborationKernelIdentity | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const lineageId = normalizeRouteIdentityString(record.lineageId);
  const threadId = normalizeRouteIdentityString(record.threadId);
  if (!lineageId && !threadId) {
    return undefined;
  }
  return {
    lineageId,
    threadId,
  };
}

export function normalizeSessionRoutingMetadata(
  value: unknown
): SessionRoutingMetadataRecord | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (record.contractVersion !== SESSION_ROUTING_METADATA_CONTRACT_VERSION) {
    return undefined;
  }
  const tenantId = normalizeRouteIdentityString(record.tenantId);
  const lineageId = normalizeRouteIdentityString(record.lineageId);
  const threadId = normalizeRouteIdentityString(record.threadId);
  const workflowKey = normalizeRouteIdentityString(record.workflowKey)?.toLowerCase();
  const updatedBy = normalizeRouteIdentityString(record.updatedBy);
  if (
    !tenantId
    || !lineageId
    || !threadId
    || !workflowKey
    || typeof record.updatedAt !== "number"
    || !Number.isFinite(record.updatedAt)
  ) {
    return undefined;
  }
  return {
    contractVersion: SESSION_ROUTING_METADATA_CONTRACT_VERSION,
    tenantId,
    lineageId,
    threadId,
    workflowKey,
    updatedAt: record.updatedAt,
    updatedBy,
  };
}

export function resolveSessionRoutingMetadataConsistencyError(args: {
  routingMetadata: SessionRoutingMetadataRecord;
  expectedTenantId: string;
  collaborationKernel?: SessionCollaborationKernelIdentity;
}): string | null {
  if (args.routingMetadata.tenantId !== args.expectedTenantId) {
    return "tenant_mismatch";
  }
  if (!args.collaborationKernel) {
    return "collaboration_contract_missing";
  }
  if (!args.collaborationKernel.lineageId || !args.collaborationKernel.threadId) {
    return "collaboration_kernel_missing_identity";
  }
  if (
    args.collaborationKernel.lineageId !== args.routingMetadata.lineageId
    || args.collaborationKernel.threadId !== args.routingMetadata.threadId
  ) {
    return "collaboration_routing_identity_mismatch";
  }
  return null;
}

export function normalizeSessionChannelRouteIdentity(
  value: unknown
): SessionChannelRouteIdentityRecord | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const normalized: SessionChannelRouteIdentityRecord = {
    bindingId: normalizeRouteIdentityString(record.bindingId) as
      | Id<"objects">
      | undefined,
    providerId: normalizeRouteIdentityString(record.providerId),
    providerConnectionId: normalizeRouteIdentityString(record.providerConnectionId),
    providerAccountId: normalizeRouteIdentityString(record.providerAccountId),
    providerInstallationId: normalizeRouteIdentityString(record.providerInstallationId),
    providerProfileId: normalizeRouteIdentityString(record.providerProfileId),
    providerProfileType: normalizeSessionRouteProfileType(record.providerProfileType),
    routeKey: normalizeRouteIdentityString(record.routeKey),
  };

  return Object.values(normalized).some((value) => Boolean(value))
    ? normalized
    : undefined;
}

export function buildSessionRoutingKey(
  identity: SessionChannelRouteIdentityRecord | null | undefined
): string {
  const normalized = normalizeSessionChannelRouteIdentity(identity);
  if (!normalized) {
    return LEGACY_SESSION_ROUTING_KEY;
  }

  if (normalized.routeKey) {
    return `route:${normalized.routeKey}`;
  }

  const segments = [
    ["provider", normalized.providerId],
    ["connection", normalized.providerConnectionId],
    ["account", normalized.providerAccountId],
    ["installation", normalized.providerInstallationId],
    ["profile_type", normalized.providerProfileType],
    ["profile", normalized.providerProfileId],
    ["binding", normalized.bindingId],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}:${value}`);

  return segments.length > 0
    ? segments.join("|")
    : LEGACY_SESSION_ROUTING_KEY;
}

function resolveSessionRoutingKeyFromRecord(
  value: Record<string, unknown>
): string {
  const persisted = normalizeRouteIdentityString(value.sessionRoutingKey);
  if (persisted) {
    return persisted;
  }
  return buildSessionRoutingKey(
    normalizeSessionChannelRouteIdentity(value.channelRouteIdentity)
  );
}

interface RouteScopedSessionCandidate {
  _id: string;
  agentId: string;
  status?: string;
  startedAt?: number;
  sessionRoutingKey?: string;
  channelRouteIdentity?: SessionChannelRouteIdentityRecord;
}

export function selectActiveSessionForRoute<T extends RouteScopedSessionCandidate>(
  sessions: T[],
  args: {
    agentId: string;
    incomingRouteIdentity?: SessionChannelRouteIdentityRecord;
  }
): { session: T | null; promoteLegacy: boolean; routingKey: string } {
  const incomingRoutingKey = buildSessionRoutingKey(args.incomingRouteIdentity);
  const activeForAgent = sessions
    .filter((session) => session.status === "active" && String(session.agentId) === args.agentId)
    .sort((a, b) => {
      const aStartedAt = typeof a.startedAt === "number" ? a.startedAt : 0;
      const bStartedAt = typeof b.startedAt === "number" ? b.startedAt : 0;
      if (aStartedAt !== bStartedAt) {
        return aStartedAt - bStartedAt;
      }
      return String(a._id).localeCompare(String(b._id));
    });

  if (activeForAgent.length === 0) {
    return { session: null, promoteLegacy: false, routingKey: incomingRoutingKey };
  }

  const exact = activeForAgent.find(
    (session) =>
      resolveSessionRoutingKeyFromRecord(session as unknown as Record<string, unknown>) ===
      incomingRoutingKey
  );
  if (exact) {
    return { session: exact, promoteLegacy: false, routingKey: incomingRoutingKey };
  }

  if (incomingRoutingKey !== LEGACY_SESSION_ROUTING_KEY) {
    const routeScopedActive = activeForAgent.filter(
      (session) =>
        resolveSessionRoutingKeyFromRecord(session as unknown as Record<string, unknown>) !==
        LEGACY_SESSION_ROUTING_KEY
    );
    if (routeScopedActive.length > 0) {
      return { session: null, promoteLegacy: false, routingKey: incomingRoutingKey };
    }

    const legacy = activeForAgent.find(
      (session) =>
        resolveSessionRoutingKeyFromRecord(session as unknown as Record<string, unknown>) ===
        LEGACY_SESSION_ROUTING_KEY
    );
    if (legacy) {
      return { session: legacy, promoteLegacy: true, routingKey: incomingRoutingKey };
    }

    return { session: null, promoteLegacy: false, routingKey: incomingRoutingKey };
  }

  const legacy = activeForAgent.find(
    (session) =>
      resolveSessionRoutingKeyFromRecord(session as unknown as Record<string, unknown>) ===
      LEGACY_SESSION_ROUTING_KEY
  );
  if (legacy) {
    return { session: legacy, promoteLegacy: false, routingKey: incomingRoutingKey };
  }

  return {
    session: activeForAgent[0],
    promoteLegacy: false,
    routingKey: incomingRoutingKey,
  };
}

function normalizeSessionScopeToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSessionFiniteTimestamp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.trunc(value));
}

function normalizeSessionFiniteDurationMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.trunc(value));
}

export interface SessionReactivationTriggerDecision {
  shouldClose: boolean;
  closeReason: "idle_timeout" | "expired" | null;
  reactivationTriggered: boolean;
  inactivityGapMs: number;
  inactivityThresholdMs: number;
  sessionAgeMs: number;
}

export function evaluateSessionReactivationTrigger(args: {
  now?: number;
  lastMessageAt?: number;
  startedAt?: number;
  inactivityTimeoutMs?: number;
  maxDurationMs?: number;
}): SessionReactivationTriggerDecision {
  const now = normalizeSessionFiniteTimestamp(args.now) ?? Date.now();
  const lastMessageAt = normalizeSessionFiniteTimestamp(args.lastMessageAt);
  const startedAt = normalizeSessionFiniteTimestamp(args.startedAt);
  const inactivityTimeoutMs = normalizeSessionFiniteDurationMs(args.inactivityTimeoutMs);
  const maxDurationMs = normalizeSessionFiniteDurationMs(args.maxDurationMs);
  if (
    lastMessageAt === null
    || startedAt === null
    || inactivityTimeoutMs === null
    || inactivityTimeoutMs <= 0
    || maxDurationMs === null
    || maxDurationMs <= 0
  ) {
    return {
      shouldClose: false,
      closeReason: null,
      reactivationTriggered: false,
      inactivityGapMs: 0,
      inactivityThresholdMs: inactivityTimeoutMs ?? 0,
      sessionAgeMs: 0,
    };
  }

  const inactivityGapMs = Math.max(0, now - lastMessageAt);
  const sessionAgeMs = Math.max(0, now - startedAt);
  const isInactive = inactivityGapMs >= inactivityTimeoutMs;
  const isExpired = sessionAgeMs >= maxDurationMs;
  const closeReason = isExpired
    ? "expired" as const
    : isInactive
      ? "idle_timeout" as const
      : null;

  return {
    shouldClose: Boolean(closeReason),
    closeReason,
    reactivationTriggered: isInactive,
    inactivityGapMs,
    inactivityThresholdMs: inactivityTimeoutMs,
    sessionAgeMs,
  };
}

export interface SessionReactivationMemoryScopeDecision {
  allowed: boolean;
  reason?:
    | "missing_scope"
    | "session_org_mismatch"
    | "channel_mismatch"
    | "contact_mismatch"
    | "route_mismatch";
}

export function evaluateSessionReactivationMemoryReadScope(args: {
  sessionOrganizationId?: Id<"organizations"> | string | null;
  requestedOrganizationId?: Id<"organizations"> | string | null;
  sessionChannel?: string | null;
  requestedChannel?: string | null;
  sessionExternalContactIdentifier?: string | null;
  requestedExternalContactIdentifier?: string | null;
  sessionRoutingKey?: string | null;
  requestedSessionRoutingKey?: string | null;
}): SessionReactivationMemoryScopeDecision {
  const sessionOrganizationId = normalizeSessionScopeToken(args.sessionOrganizationId);
  const requestedOrganizationId = normalizeSessionScopeToken(args.requestedOrganizationId);
  const sessionChannel = normalizeSessionScopeToken(args.sessionChannel);
  const requestedChannel = normalizeSessionScopeToken(args.requestedChannel);
  const sessionExternalContactIdentifier = normalizeSessionScopeToken(
    args.sessionExternalContactIdentifier
  );
  const requestedExternalContactIdentifier = normalizeSessionScopeToken(
    args.requestedExternalContactIdentifier
  );
  const sessionRoutingKey = normalizeSessionScopeToken(args.sessionRoutingKey);
  const requestedSessionRoutingKey = normalizeSessionScopeToken(
    args.requestedSessionRoutingKey
  );

  if (
    !sessionOrganizationId
    || !requestedOrganizationId
    || !sessionChannel
    || !requestedChannel
    || !sessionExternalContactIdentifier
    || !requestedExternalContactIdentifier
    || !sessionRoutingKey
    || !requestedSessionRoutingKey
  ) {
    return {
      allowed: false,
      reason: "missing_scope",
    };
  }
  if (sessionOrganizationId !== requestedOrganizationId) {
    return {
      allowed: false,
      reason: "session_org_mismatch",
    };
  }
  if (sessionChannel !== requestedChannel) {
    return {
      allowed: false,
      reason: "channel_mismatch",
    };
  }
  if (sessionExternalContactIdentifier !== requestedExternalContactIdentifier) {
    return {
      allowed: false,
      reason: "contact_mismatch",
    };
  }
  if (sessionRoutingKey !== requestedSessionRoutingKey) {
    return {
      allowed: false,
      reason: "route_mismatch",
    };
  }
  return { allowed: true };
}

export interface SessionReactivationMemoryCacheDecision {
  allowed: boolean;
  reason?: "cache_missing_or_invalid" | "cache_stale";
  memory?: SessionReactivationMemoryRecord;
}

export function evaluateSessionReactivationMemoryCacheState(args: {
  value: unknown;
  now?: number;
}): SessionReactivationMemoryCacheDecision {
  const memory = normalizeSessionReactivationMemoryRecord(args.value);
  if (!memory) {
    return {
      allowed: false,
      reason: "cache_missing_or_invalid",
    };
  }
  const now = normalizeSessionFiniteTimestamp(args.now) ?? Date.now();
  if (memory.cacheExpiresAt <= now) {
    return {
      allowed: false,
      reason: "cache_stale",
    };
  }
  return {
    allowed: true,
    memory,
  };
}

function assertPersistedSessionCollaborationContract(
  sessionRecord: Record<string, unknown>
) {
  const collaboration = sessionRecord.collaboration;
  if (!collaboration || typeof collaboration !== "object") {
    return;
  }
  const collaborationRecord = collaboration as Record<string, unknown>;
  const kernel = collaborationRecord.kernel;
  const authority = collaborationRecord.authority;
  if (!kernel || typeof kernel !== "object" || !authority || typeof authority !== "object") {
    throw new Error("Persisted collaboration contract missing kernel or authority payload.");
  }
  assertCollaborationRuntimeContract({
    kernel: kernel as CollaborationKernelContract,
    authority: authority as CollaborationAuthorityContract,
  });
}

function assertPersistedSessionRoutingMetadataContract(
  sessionRecord: Record<string, unknown>
) {
  if (!sessionRecord.routingMetadata) {
    return;
  }
  const routingMetadata = normalizeSessionRoutingMetadata(sessionRecord.routingMetadata);
  if (!routingMetadata) {
    throw new Error("Persisted session routing metadata contract is invalid.");
  }
  const expectedTenantId = String(sessionRecord.organizationId);
  const collaborationRecord =
    sessionRecord.collaboration && typeof sessionRecord.collaboration === "object"
      ? (sessionRecord.collaboration as Record<string, unknown>)
      : undefined;
  const collaborationKernel = normalizeSessionCollaborationKernelIdentity(
    collaborationRecord?.kernel
  );
  const consistencyError = resolveSessionRoutingMetadataConsistencyError({
    routingMetadata,
    expectedTenantId,
    collaborationKernel,
  });
  if (consistencyError) {
    throw new Error(
      `Persisted session routing metadata contract failed consistency checks (${consistencyError}).`
    );
  }
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

interface AgentActionCompletionTelemetry {
  contractVersion?: string;
  templateContractVersion?: string;
  enforcementMode?: "off" | "observe" | "enforce";
  source?: "template_metadata" | "legacy_samantha_fallback" | "none";
  templateRole?: string;
  templateAgentId?: string;
  rewriteApplied: boolean;
  claimedOutcomes: string[];
  malformedClaimCount: number;
  payload?: {
    observedViolation: boolean;
    reasonCode?: ActionCompletionMismatchReasonCode | "unknown";
    outcome?: string;
    claimStatus?: "in_progress" | "completed";
    status?: "enforced" | "pass";
    requiredTools: string[];
    observedTools: string[];
    availableTools: string[];
  };
}

interface AgentActionCompletionTelemetryRecord {
  performedAt: number;
  sessionId?: string;
  turnId?: string;
  agentId?: string;
  channel?: string;
  actionCompletion?: AgentActionCompletionTelemetry;
}

export interface AgentActionCompletionMismatchAggregation {
  windowHours: number;
  since: number;
  actionsScanned: number;
  actionsWithActionCompletionTelemetry: number;
  mismatchCount: number;
  rewriteCount: number;
  mismatchRate: number;
  reasonCodes: Array<{ reasonCode: string; count: number }>;
  channels: Array<{ channel: string; count: number }>;
  outcomes: Array<{ outcome: string; count: number }>;
  templateIdentifiers: Array<{
    templateIdentifier: string;
    mismatchCount: number;
    rewriteCount: number;
  }>;
  templateIncidents: Array<{
    templateRole: string;
    mismatchCount: number;
    rewriteCount: number;
  }>;
}

function normalizeActionCompletionTelemetry(
  value: unknown
): AgentActionCompletionTelemetry | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const enforcementMode =
    record.enforcementMode === "off"
    || record.enforcementMode === "observe"
    || record.enforcementMode === "enforce"
      ? record.enforcementMode
      : undefined;
  const source =
    record.source === "template_metadata"
    || record.source === "legacy_samantha_fallback"
    || record.source === "none"
      ? record.source
      : undefined;
  const templateRole =
    typeof record.templateRole === "string" && record.templateRole.trim().length > 0
      ? record.templateRole.trim()
      : undefined;
  const templateAgentId = normalizeActionCompletionTemplateIdentifier(record.templateAgentId);
  const claimedOutcomes = Array.isArray(record.claimedOutcomes)
    ? Array.from(
        new Set(
          record.claimedOutcomes
            .filter((entry): entry is string => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
        )
      ).sort((left, right) => left.localeCompare(right))
    : [];
  const malformedClaimCount =
    typeof record.malformedClaimCount === "number" && Number.isFinite(record.malformedClaimCount)
      ? Math.max(0, Math.floor(record.malformedClaimCount))
      : 0;
  const rewriteApplied = record.rewriteApplied === true;
  const payloadRecord =
    record.payload && typeof record.payload === "object"
      ? (record.payload as Record<string, unknown>)
      : undefined;
  const payload = payloadRecord
    ? (() => {
        const status =
          payloadRecord.status === "enforced" || payloadRecord.status === "pass"
            ? (payloadRecord.status as "enforced" | "pass")
            : undefined;
        const claimStatus =
          payloadRecord.claimStatus === "in_progress" || payloadRecord.claimStatus === "completed"
            ? (payloadRecord.claimStatus as "in_progress" | "completed")
            : undefined;
        const requiredTools = Array.isArray(payloadRecord.requiredTools)
          ? Array.from(
              new Set(
                payloadRecord.requiredTools
                  .filter((entry): entry is string => typeof entry === "string")
                  .map((entry) => entry.trim())
                  .filter((entry) => entry.length > 0)
              )
            ).sort((left, right) => left.localeCompare(right))
          : [];
        const observedTools = Array.isArray(payloadRecord.observedTools)
          ? Array.from(
              new Set(
                payloadRecord.observedTools
                  .filter((entry): entry is string => typeof entry === "string")
                  .map((entry) => entry.trim())
                  .filter((entry) => entry.length > 0)
              )
            ).sort((left, right) => left.localeCompare(right))
          : [];
        const availableTools = Array.isArray(payloadRecord.availableTools)
          ? Array.from(
              new Set(
                payloadRecord.availableTools
                  .filter((entry): entry is string => typeof entry === "string")
                  .map((entry) => entry.trim())
                  .filter((entry) => entry.length > 0)
              )
            ).sort((left, right) => left.localeCompare(right))
          : [];
        return {
          observedViolation: payloadRecord.observedViolation === true,
          reasonCode: normalizeActionCompletionMismatchReasonCode(payloadRecord.reasonCode),
          outcome:
            typeof payloadRecord.outcome === "string" && payloadRecord.outcome.trim().length > 0
              ? payloadRecord.outcome.trim()
              : undefined,
          claimStatus,
          status,
          requiredTools,
          observedTools,
          availableTools,
        };
      })()
    : undefined;

  return {
    contractVersion: normalizeActionCompletionTemplateIdentifier(record.contractVersion),
    templateContractVersion: normalizeActionCompletionTemplateIdentifier(
      record.templateContractVersion
    ),
    enforcementMode,
    source,
    templateRole,
    templateAgentId,
    rewriteApplied,
    claimedOutcomes,
    malformedClaimCount,
    payload,
  };
}

export function aggregateActionCompletionMismatchTelemetry(
  records: AgentActionCompletionTelemetryRecord[],
  options: { windowHours: number; since: number }
): AgentActionCompletionMismatchAggregation {
  let actionsWithActionCompletionTelemetry = 0;
  let mismatchCount = 0;
  let rewriteCount = 0;
  const reasonCounts = new Map<string, number>();
  const channelCounts = new Map<string, number>();
  const outcomeCounts = new Map<string, number>();
  const templateIdentifierCounts = new Map<
    string,
    { mismatchCount: number; rewriteCount: number }
  >();
  const templateCounts = new Map<string, { mismatchCount: number; rewriteCount: number }>();

  for (const record of records) {
    const actionCompletion = normalizeActionCompletionTelemetry(record.actionCompletion);
    if (!actionCompletion) {
      continue;
    }
    actionsWithActionCompletionTelemetry += 1;

    const templateRole = actionCompletion.templateRole ?? "unknown_template";
    const templateIdentifier =
      actionCompletion.templateAgentId ?? actionCompletion.templateRole ?? "unknown_template";
    if (!templateIdentifierCounts.has(templateIdentifier)) {
      templateIdentifierCounts.set(templateIdentifier, { mismatchCount: 0, rewriteCount: 0 });
    }
    if (!templateCounts.has(templateRole)) {
      templateCounts.set(templateRole, { mismatchCount: 0, rewriteCount: 0 });
    }

    const hasMismatch = actionCompletion.payload?.observedViolation === true;
    if (!hasMismatch) {
      continue;
    }

    mismatchCount += 1;
    const reasonCode = actionCompletion.payload?.reasonCode ?? "unknown";
    reasonCounts.set(reasonCode, (reasonCounts.get(reasonCode) ?? 0) + 1);

    if (actionCompletion.rewriteApplied === true) {
      rewriteCount += 1;
      const templateIdentifierEntry = templateIdentifierCounts.get(templateIdentifier);
      if (templateIdentifierEntry) {
        templateIdentifierEntry.rewriteCount += 1;
      }
      const templateEntry = templateCounts.get(templateRole);
      if (templateEntry) {
        templateEntry.rewriteCount += 1;
      }
    }

    const channel = typeof record.channel === "string" ? record.channel.trim().toLowerCase() : "";
    if (channel.length > 0) {
      channelCounts.set(channel, (channelCounts.get(channel) ?? 0) + 1);
    }

    const outcome =
      actionCompletion.payload?.outcome
      || actionCompletion.claimedOutcomes[0]
      || "";
    const normalizedOutcome = outcome.trim();
    if (normalizedOutcome.length > 0) {
      outcomeCounts.set(
        normalizedOutcome,
        (outcomeCounts.get(normalizedOutcome) ?? 0) + 1
      );
    }

    const templateEntry = templateCounts.get(templateRole);
    if (templateEntry) {
      templateEntry.mismatchCount += 1;
    }
    const templateIdentifierEntry = templateIdentifierCounts.get(templateIdentifier);
    if (templateIdentifierEntry) {
      templateIdentifierEntry.mismatchCount += 1;
    }
  }

  return {
    windowHours: options.windowHours,
    since: options.since,
    actionsScanned: records.length,
    actionsWithActionCompletionTelemetry,
    mismatchCount,
    rewriteCount,
    mismatchRate:
      actionsWithActionCompletionTelemetry > 0
        ? Number((mismatchCount / actionsWithActionCompletionTelemetry).toFixed(4))
        : 0,
    reasonCodes: Array.from(reasonCounts.entries())
      .sort((left, right) => {
        if (left[1] !== right[1]) {
          return right[1] - left[1];
        }
        return left[0].localeCompare(right[0]);
      })
      .map(([reasonCode, count]) => ({ reasonCode, count })),
    channels: Array.from(channelCounts.entries())
      .sort((left, right) => {
        if (left[1] !== right[1]) {
          return right[1] - left[1];
        }
        return left[0].localeCompare(right[0]);
      })
      .map(([channel, count]) => ({ channel, count })),
    outcomes: Array.from(outcomeCounts.entries())
      .sort((left, right) => {
        if (left[1] !== right[1]) {
          return right[1] - left[1];
        }
        return left[0].localeCompare(right[0]);
      })
      .map(([outcome, count]) => ({ outcome, count })),
    templateIdentifiers: Array.from(templateIdentifierCounts.entries())
      .map(([templateIdentifier, counts]) => ({
        templateIdentifier,
        mismatchCount: counts.mismatchCount,
        rewriteCount: counts.rewriteCount,
      }))
      .filter((entry) => entry.mismatchCount > 0 || entry.rewriteCount > 0)
      .sort((left, right) => {
        if (left.mismatchCount !== right.mismatchCount) {
          return right.mismatchCount - left.mismatchCount;
        }
        if (left.rewriteCount !== right.rewriteCount) {
          return right.rewriteCount - left.rewriteCount;
        }
        return left.templateIdentifier.localeCompare(right.templateIdentifier);
      }),
    templateIncidents: Array.from(templateCounts.entries())
      .map(([templateRole, counts]) => ({
        templateRole,
        mismatchCount: counts.mismatchCount,
        rewriteCount: counts.rewriteCount,
      }))
      .filter((entry) => entry.mismatchCount > 0 || entry.rewriteCount > 0)
      .sort((left, right) => {
        if (left.mismatchCount !== right.mismatchCount) {
          return right.mismatchCount - left.mismatchCount;
        }
        if (left.rewriteCount !== right.rewriteCount) {
          return right.rewriteCount - left.rewriteCount;
        }
        return left.templateRole.localeCompare(right.templateRole);
      }),
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
  assertAgentTurnTransitionEdge({
    transition: args.transition,
    fromState: args.fromState,
    toState: args.toState,
  });

  const replayInvariantStatus: AgentTurnReplayInvariantStatus = "validated";
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
    transitionPolicyVersion: AGENT_TURN_TRANSITION_POLICY_VERSION,
    replayInvariantStatus,
    metadata: args.metadata,
    occurredAt,
    createdAt: occurredAt,
  });
}

function normalizeExecutionContractString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isIdempotencyExpired(expiresAt: unknown, now: number): boolean {
  return typeof expiresAt === "number" && expiresAt <= now;
}

function resolveReplayConflictLabel(intentType: unknown):
  | "replay_duplicate_ingress"
  | "replay_duplicate_proposal"
  | "replay_duplicate_commit" {
  if (intentType === "proposal") {
    return "replay_duplicate_proposal";
  }
  if (intentType === "commit") {
    return "replay_duplicate_commit";
  }
  return "replay_duplicate_ingress";
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
    queueContract: v.optional(turnQueueContractValidator),
    idempotencyContract: v.optional(runtimeIdempotencyContractValidator),
    runAttempt: v.optional(agentTurnRunAttemptContractValidator),
    executionBundle: v.optional(agentExecutionBundleContractValidator),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    if (args.queueContract) {
      assertTurnQueueContract(args.queueContract as TurnQueueContract);
    }
    if (args.idempotencyContract) {
      assertRuntimeIdempotencyContract(
        args.idempotencyContract as RuntimeIdempotencyContract
      );
    }
    if (args.executionBundle) {
      assertAgentExecutionBundleContract(
        args.executionBundle as AgentExecutionBundleContract
      );
    }

    const normalizedIdempotencyKey =
      typeof args.idempotencyKey === "string" && args.idempotencyKey.trim().length > 0
        ? args.idempotencyKey.trim()
        : undefined;
    const normalizedScopeKey = normalizeExecutionContractString(
      args.idempotencyContract?.scopeKey
    );
    const normalizedPayloadHash = normalizeExecutionContractString(
      args.idempotencyContract?.payloadHash
    );
    const metadataRecord =
      args.metadata && typeof args.metadata === "object"
        ? (args.metadata as Record<string, unknown>)
        : undefined;
    const runtimeChannel = normalizeExecutionContractString(metadataRecord?.channel);
    const allowScopePayloadHashReplayMatch = !(
      runtimeChannel === "native_guest"
      && args.idempotencyContract?.intentType !== "proposal"
      && args.idempotencyContract?.intentType !== "commit"
    );
    const now = Date.now();
    const replayConflictLabel = resolveReplayConflictLabel(
      args.idempotencyContract?.intentType
    );

    let duplicate:
      | {
          _id: Id<"agentTurns">;
          transitionVersion: number;
          state: AgentTurnState;
          idempotencyExpiresAt?: number;
        }
      | undefined;

    if (normalizedScopeKey) {
      const scopeCandidates = await ctx.db
        .query("agentTurns")
        .withIndex("by_org_idempotency_scope_key", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("idempotencyScopeKey", normalizedScopeKey)
        )
        .collect();
      duplicate = scopeCandidates
        .sort((a, b) => {
          if (a.queuedAt !== b.queuedAt) {
            return a.queuedAt - b.queuedAt;
          }
          return String(a._id).localeCompare(String(b._id));
        })
        .find((candidate) => {
          if (isIdempotencyExpired(candidate.idempotencyExpiresAt, now)) {
            return false;
          }
          const candidatePayloadHash = normalizeExecutionContractString(
            (candidate.idempotencyContract as Record<string, unknown> | undefined)
              ?.payloadHash
          );
          if (
            normalizedPayloadHash &&
            candidatePayloadHash &&
            candidatePayloadHash !== normalizedPayloadHash
          ) {
            return false;
          }
          if (
            normalizedIdempotencyKey &&
            candidate.idempotencyKey === normalizedIdempotencyKey
          ) {
            return true;
          }
          if (!allowScopePayloadHashReplayMatch) {
            return false;
          }
          if (!normalizedPayloadHash || !candidatePayloadHash) {
            return false;
          }
          return candidatePayloadHash === normalizedPayloadHash;
        });
    }

    if (!duplicate && normalizedIdempotencyKey) {
      const keyCandidates = await ctx.db
        .query("agentTurns")
        .withIndex("by_org_idempotency_key", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("idempotencyKey", normalizedIdempotencyKey)
        )
        .collect();
      duplicate = keyCandidates
        .sort((a, b) => {
          if (a.queuedAt !== b.queuedAt) {
            return a.queuedAt - b.queuedAt;
          }
          return String(a._id).localeCompare(String(b._id));
        })
        .find((candidate) => {
          if (isIdempotencyExpired(candidate.idempotencyExpiresAt, now)) {
            return false;
          }
          const candidatePayloadHash = normalizeExecutionContractString(
            (candidate.idempotencyContract as Record<string, unknown> | undefined)
              ?.payloadHash
          );
          if (
            normalizedPayloadHash &&
            candidatePayloadHash &&
            candidatePayloadHash !== normalizedPayloadHash
          ) {
            return false;
          }
          return true;
        }) as
          | {
              _id: Id<"agentTurns">;
              transitionVersion: number;
              state: AgentTurnState;
              idempotencyExpiresAt?: number;
            }
          | undefined;
    }

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
            idempotencyScopeKey: normalizedScopeKey,
            queueConcurrencyKey: args.queueContract?.concurrencyKey,
            duplicateTurnId: duplicate._id,
            conflictLabel: replayConflictLabel,
          },
        });

        return {
          turnId: duplicate._id,
          transitionVersion: duplicate.transitionVersion,
          state: duplicate.state,
          duplicate: true,
          conflictLabel: replayConflictLabel,
          replayOutcome: "duplicate_acknowledged" as const,
        };
    }

    const turnId = await ctx.db.insert("agentTurns", {
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      agentId: args.agentId,
      state: "queued",
      transitionVersion: 0,
      idempotencyKey: normalizedIdempotencyKey,
      idempotencyScopeKey: normalizedScopeKey,
      idempotencyExpiresAt: args.idempotencyContract?.expiresAt,
      idempotencyContract: args.idempotencyContract as RuntimeIdempotencyContract | undefined,
      inboundMessageHash: args.inboundMessageHash,
      queueContract: args.queueContract as TurnQueueContract | undefined,
      queueConcurrencyKey: args.queueContract?.concurrencyKey,
      queueOrderingKey: args.queueContract?.orderingKey,
      runAttempt: args.runAttempt as AgentTurnRunAttemptContract | undefined,
      executionBundle: args.executionBundle as AgentExecutionBundleContract | undefined,
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
        idempotencyScopeKey: normalizedScopeKey,
        queueConcurrencyKey: args.queueContract?.concurrencyKey,
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
        idempotencyScopeKey: normalizedScopeKey,
        queueConcurrencyKey: args.queueContract?.concurrencyKey,
      },
    });

    return {
      turnId,
      transitionVersion: 0,
      state: "queued" as const,
      duplicate: false,
      conflictLabel: "replay_duplicate_ingress" as const,
      replayOutcome: "accepted" as const,
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
 * Persist deterministic run-attempt envelope fields on a turn.
 */
export const recordTurnRunAttempt = internalMutation({
  args: {
    turnId: v.id("agentTurns"),
    runAttempt: agentTurnRunAttemptContractValidator,
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) {
      return { success: false, error: "turn_not_found" as const };
    }

    await ctx.db.patch(args.turnId, {
      runAttempt: args.runAttempt as AgentTurnRunAttemptContract,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Pin execution bundle version snapshot on the turn lifecycle record.
 */
export const recordTurnExecutionBundle = internalMutation({
  args: {
    turnId: v.id("agentTurns"),
    executionBundle: agentExecutionBundleContractValidator,
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) {
      return { success: false, error: "turn_not_found" as const };
    }

    assertAgentExecutionBundleContract(
      args.executionBundle as AgentExecutionBundleContract
    );

    await ctx.db.patch(args.turnId, {
      executionBundle: args.executionBundle as AgentExecutionBundleContract,
      updatedAt: Date.now(),
    });

    return { success: true };
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
    queueConcurrencyKey: v.optional(v.string()),
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
    const turnRecord = turn as Record<string, unknown>;
    const persistedQueueConcurrencyKey = normalizeExecutionContractString(
      turnRecord.queueConcurrencyKey
    );
    const queueConcurrencyKey =
      normalizeExecutionContractString(args.queueConcurrencyKey)
      ?? persistedQueueConcurrencyKey;
    const queueWorkflowKey = normalizeExecutionContractString(
      (turnRecord.queueContract as Record<string, unknown> | undefined)?.workflowKey
    );
    const conflictLabel =
      queueWorkflowKey === "commit"
      || queueWorkflowKey === "collaboration_commit"
        ? "conflict_commit_in_progress"
        : "conflict_turn_in_progress";

    const runningTurns = queueConcurrencyKey
      ? await ctx.db
          .query("agentTurns")
          .withIndex("by_org_queue_concurrency_state", (q) =>
            q
              .eq("organizationId", args.organizationId)
              .eq("queueConcurrencyKey", queueConcurrencyKey)
              .eq("state", "running")
          )
          .collect()
      : await ctx.db
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
        conflictLabel,
        queueConcurrencyKey,
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
        queueConcurrencyKey,
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
 * Find or create a session for this org + channel + agent + contact (+ route identity)
 */
export const resolveSession = internalMutation({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
    channelRouteIdentity: v.optional(v.object({
      bindingId: v.optional(v.id("objects")),
      providerId: v.optional(v.string()),
      providerConnectionId: v.optional(v.string()),
      providerAccountId: v.optional(v.string()),
      providerInstallationId: v.optional(v.string()),
      providerProfileId: v.optional(v.string()),
      providerProfileType: v.optional(
        v.union(v.literal("platform"), v.literal("organization"))
      ),
      routeKey: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const incomingRouteIdentity = normalizeSessionChannelRouteIdentity(
      args.channelRouteIdentity
    );
    const incomingRoutingKey = buildSessionRoutingKey(incomingRouteIdentity);

    const candidates = await ctx.db
      .query("agentSessions")
      .withIndex("by_org_channel_agent_contact", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("channel", args.channel)
          .eq("agentId", args.agentId)
          .eq("externalContactIdentifier", args.externalContactIdentifier)
      )
      .collect();
    const routeCandidates = candidates.map((candidate) => ({
      _id: String(candidate._id),
      agentId: String(candidate.agentId),
      status: candidate.status,
      startedAt: candidate.startedAt,
      sessionRoutingKey: normalizeRouteIdentityString(
        (candidate as Record<string, unknown>).sessionRoutingKey
      ),
      channelRouteIdentity: normalizeSessionChannelRouteIdentity(
        (candidate as Record<string, unknown>).channelRouteIdentity
      ),
    }));
    const existingSelection = selectActiveSessionForRoute(routeCandidates, {
      agentId: String(args.agentId),
      incomingRouteIdentity,
    });
    let existing = existingSelection.session
      ? candidates.find(
          (candidate) =>
            String(candidate._id) === String(existingSelection.session?._id)
        ) ?? null
      : null;

    if (existing && existing.status === "active") {
      const existingRecord = existing as unknown as Record<string, unknown>;
      assertPersistedSessionCollaborationContract(existingRecord);
      assertPersistedSessionRoutingMetadataContract(existingRecord);
      const patch: Record<string, unknown> = {};
      if (existingSelection.promoteLegacy && incomingRouteIdentity) {
        patch.channelRouteIdentity = incomingRouteIdentity;
        patch.sessionRoutingKey = existingSelection.routingKey;
      } else if (!normalizeRouteIdentityString(existingRecord.sessionRoutingKey)) {
        patch.sessionRoutingKey = resolveSessionRoutingKeyFromRecord(existingRecord);
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
        const refreshed = await ctx.db.get(existing._id);
        if (refreshed) {
          existing = refreshed;
        }
      }

      // Check if session has expired (TTL or max duration)
      const agentConfig = await ctx.db.get(existing.agentId);
      const configProps = (agentConfig?.customProperties || {}) as Record<string, unknown>;
      const policy = getSessionPolicyFromConfig(configProps);
      const { ttl, maxDuration } = resolveSessionTTL(policy, existing.channel);
      const now = Date.now();

      const reactivationTrigger = evaluateSessionReactivationTrigger({
        now,
        lastMessageAt: existing.lastMessageAt,
        startedAt: existing.startedAt,
        inactivityTimeoutMs: ttl,
        maxDurationMs: maxDuration,
      });

      if (reactivationTrigger.shouldClose && reactivationTrigger.closeReason) {
        // Close the stale session
        const closeReason = reactivationTrigger.closeReason;
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
        const nextRouteIdentity =
          incomingRouteIdentity ||
          normalizeSessionChannelRouteIdentity(existing.channelRouteIdentity);
        const nextRoutingKey = buildSessionRoutingKey(nextRouteIdentity);
        const existingSessionRecord = existing as Record<string, unknown>;
        const existingSessionRoutingKey = resolveSessionRoutingKeyFromRecord(
          existingSessionRecord
        );
        const newSessionData: Record<string, unknown> = {
          agentId: args.agentId,
          organizationId: args.organizationId,
          channel: args.channel,
          externalContactIdentifier: args.externalContactIdentifier,
          channelRouteIdentity: nextRouteIdentity,
          sessionRoutingKey: nextRoutingKey,
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
          const summary = existingSessionRecord.summary as
            | { text: string }
            | undefined;
          if (summary?.text) {
            newSessionData.previousSessionSummary = summary.text;
          }
          const reactivationMemory = reactivationTrigger.reactivationTriggered
            ? buildSessionReactivationMemorySnapshot({
                sourceSessionId: String(existing._id),
                sourceOrganizationId: String(existing.organizationId),
                sourceChannel: existing.channel,
                sourceExternalContactIdentifier: existing.externalContactIdentifier,
                sourceSessionRoutingKey: existingSessionRoutingKey,
                sourceCloseReason: closeReason,
                sourceClosedAt: now,
                sourceLastMessageAt: existing.lastMessageAt,
                inactivityGapMs: reactivationTrigger.inactivityGapMs,
                rollingSummaryMemory: normalizeSessionRollingSummaryMemoryRecord(
                  existingSessionRecord.rollingSummaryMemory
                ),
                sessionSummary: summary?.text,
                now,
              })
            : null;
          if (reactivationMemory) {
            newSessionData.reactivationMemory = reactivationMemory;
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
      channelRouteIdentity: incomingRouteIdentity,
      sessionRoutingKey: incomingRoutingKey,
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
 * Upsert typed collaboration kernel + authority contract on a session.
 * Validation is fail-closed and enforces orchestrator-only mutating commits.
 */
export const upsertSessionCollaborationContract = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    kernel: collaborationKernelContractValidator,
    authority: collaborationAuthorityContractValidator,
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { success: false, error: "session_not_found" as const };
    }
    const sessionRecord = session as Record<string, unknown>;

    const normalizedKernelLineageId = normalizeRouteIdentityString(
      (args.kernel as Record<string, unknown>).lineageId
    );
    const normalizedKernelThreadId = normalizeRouteIdentityString(
      (args.kernel as Record<string, unknown>).threadId
    );
    if (!normalizedKernelLineageId || !normalizedKernelThreadId) {
      return {
        success: false,
        error: "blocked_policy" as const,
        reason: "collaboration_kernel_missing_identity",
      };
    }

    try {
      assertCollaborationRuntimeContract({
        kernel: args.kernel as CollaborationKernelContract,
        authority: args.authority as CollaborationAuthorityContract,
      });
    } catch (error) {
      return {
        success: false,
        error: "blocked_policy" as const,
        reason: error instanceof Error ? error.message : "collaboration_contract_validation_failed",
      };
    }

    const existingRoutingMetadata = normalizeSessionRoutingMetadata(
      sessionRecord.routingMetadata
    );
    if (sessionRecord.routingMetadata && !existingRoutingMetadata) {
      return {
        success: false,
        error: "blocked_policy" as const,
        reason: "routing_metadata_contract_invalid",
      };
    }
    if (existingRoutingMetadata) {
      const consistencyError = resolveSessionRoutingMetadataConsistencyError({
        routingMetadata: existingRoutingMetadata,
        expectedTenantId: String(session.organizationId),
        collaborationKernel: {
          lineageId: normalizedKernelLineageId,
          threadId: normalizedKernelThreadId,
        },
      });
      if (consistencyError) {
        return {
          success: false,
          error: "blocked_policy" as const,
          reason: consistencyError,
        };
      }
    }

    const existingCollaborationRecord =
      sessionRecord.collaboration && typeof sessionRecord.collaboration === "object"
        ? (sessionRecord.collaboration as Record<string, unknown>)
        : undefined;
    const existingContractVersion = normalizeRouteIdentityString(
      existingCollaborationRecord?.contractVersion
    );
    if (
      existingContractVersion === COLLABORATION_CONTRACT_VERSION
      && areJsonValuesEquivalent(existingCollaborationRecord?.kernel, args.kernel)
      && areJsonValuesEquivalent(existingCollaborationRecord?.authority, args.authority)
    ) {
      return {
        success: true,
        idempotent: true,
        collaboration: existingCollaborationRecord,
      };
    }

    const now = Date.now();
    const collaborationContract = {
      contractVersion: COLLABORATION_CONTRACT_VERSION,
      kernel: args.kernel,
      authority: args.authority,
      updatedAt: now,
      updatedBy: args.updatedBy,
    };

    await ctx.db.patch(args.sessionId, {
      collaboration: collaborationContract,
    });

    return {
      success: true,
      collaboration: collaborationContract,
    };
  },
});

/**
 * Upsert operator collaboration routing metadata contract on a session.
 * Fail closed when tenant/lineage/thread metadata is absent or mismatched.
 */
export const upsertSessionRoutingMetadata = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    tenantId: v.string(),
    lineageId: v.string(),
    threadId: v.string(),
    workflowKey: v.string(),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { success: false, error: "session_not_found" as const };
    }
    const sessionRecord = session as Record<string, unknown>;

    const tenantId = normalizeRouteIdentityString(args.tenantId);
    const lineageId = normalizeRouteIdentityString(args.lineageId);
    const threadId = normalizeRouteIdentityString(args.threadId);
    const workflowKey = normalizeRouteIdentityString(args.workflowKey)?.toLowerCase();
    const updatedBy = normalizeRouteIdentityString(args.updatedBy);

    if (!tenantId || !lineageId || !threadId || !workflowKey) {
      return {
        success: false,
        error: "routing_metadata_invalid" as const,
      };
    }

    const expectedTenantId = String(session.organizationId);
    const collaborationRecord =
      sessionRecord.collaboration
      && typeof sessionRecord.collaboration === "object"
        ? sessionRecord.collaboration as Record<string, unknown>
        : undefined;
    const collaborationKernel = normalizeSessionCollaborationKernelIdentity(
      collaborationRecord?.kernel
    );
    const nextRoutingMetadata: SessionRoutingMetadataRecord = {
      contractVersion: SESSION_ROUTING_METADATA_CONTRACT_VERSION,
      tenantId,
      lineageId,
      threadId,
      workflowKey,
      updatedAt: Date.now(),
      updatedBy,
    };
    const consistencyError = resolveSessionRoutingMetadataConsistencyError({
      routingMetadata: nextRoutingMetadata,
      expectedTenantId,
      collaborationKernel,
    });
    if (consistencyError) {
      return {
        success: false,
        error: "blocked_policy" as const,
        reason: consistencyError,
      };
    }

    const existingRoutingMetadata = normalizeSessionRoutingMetadata(
      sessionRecord.routingMetadata
    );
    if (sessionRecord.routingMetadata && !existingRoutingMetadata) {
      return {
        success: false,
        error: "blocked_policy" as const,
        reason: "routing_metadata_contract_invalid",
      };
    }
    if (
      existingRoutingMetadata
      && existingRoutingMetadata.contractVersion === SESSION_ROUTING_METADATA_CONTRACT_VERSION
      && existingRoutingMetadata.tenantId === tenantId
      && existingRoutingMetadata.lineageId === lineageId
      && existingRoutingMetadata.threadId === threadId
      && existingRoutingMetadata.workflowKey === workflowKey
    ) {
      return {
        success: true,
        idempotent: true,
        routingMetadata: existingRoutingMetadata,
      };
    }
    if (
      existingRoutingMetadata
      && (
        existingRoutingMetadata.tenantId !== tenantId
        || existingRoutingMetadata.lineageId !== lineageId
        || existingRoutingMetadata.threadId !== threadId
      )
    ) {
      return {
        success: false,
        error: "blocked_policy" as const,
        reason: "routing_metadata_mismatch",
      };
    }

    await ctx.db.patch(args.sessionId, {
      routingMetadata: nextRoutingMetadata,
    });

    return {
      success: true,
      routingMetadata: nextRoutingMetadata,
    };
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
    if (["whatsapp", "sms", "phone_call"].includes(args.channel)) {
      const match = contacts.find((c) => {
        const props = c.customProperties as Record<string, unknown> | undefined;
        const phone = String(props?.phone || "").replace(/[^\d+]/g, "");
        return phone === identifier.replace(/[^\d+]/g, "");
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
// OPERATOR PINNED NOTES (L3 MEMORY LAYER)
// ============================================================================

const OPERATOR_PINNED_NOTE_TITLE_MAX_CHARS = 160;
const OPERATOR_PINNED_NOTE_BODY_MAX_CHARS = 4_000;
const OPERATOR_PINNED_NOTE_LIMIT_DEFAULT = 25;
const OPERATOR_PINNED_NOTE_LIMIT_MAX = 100;
const OPERATOR_PINNED_NOTE_SORT_MIN = -9_999;
const OPERATOR_PINNED_NOTE_SORT_MAX = 9_999;

export type OperatorPinnedNotesAction = "read" | "create" | "update" | "delete";

export interface OperatorPinnedNotesAccessDecision {
  allowed: boolean;
  requiredPermission: "view_organization" | "manage_organization";
  reason?:
    | "session_org_mismatch"
    | "missing_permission";
}

export function evaluateOperatorPinnedNotesAccess(args: {
  action: OperatorPinnedNotesAction;
  sessionOrganizationId?: Id<"organizations"> | null;
  requestedOrganizationId: Id<"organizations">;
  isSuperAdmin: boolean;
  hasPermission: boolean;
}): OperatorPinnedNotesAccessDecision {
  const requiredPermission =
    args.action === "read" ? "view_organization" : "manage_organization";
  const sessionOrgMatchesRequested =
    Boolean(args.sessionOrganizationId)
    && String(args.sessionOrganizationId) === String(args.requestedOrganizationId);

  if (!args.isSuperAdmin && !sessionOrgMatchesRequested) {
    return {
      allowed: false,
      requiredPermission,
      reason: "session_org_mismatch",
    };
  }

  if (!args.hasPermission) {
    return {
      allowed: false,
      requiredPermission,
      reason: "missing_permission",
    };
  }

  return {
    allowed: true,
    requiredPermission,
  };
}

function normalizeOperatorPinnedNoteTitle(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length === 0) {
    return undefined;
  }
  return normalized.slice(0, OPERATOR_PINNED_NOTE_TITLE_MAX_CHARS);
}

function normalizeOperatorPinnedNoteBody(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, OPERATOR_PINNED_NOTE_BODY_MAX_CHARS);
}

function normalizeOperatorPinnedNoteSortOrder(
  value: unknown,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(
    OPERATOR_PINNED_NOTE_SORT_MIN,
    Math.min(OPERATOR_PINNED_NOTE_SORT_MAX, Math.trunc(value))
  );
}

function clampOperatorPinnedNotesLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return OPERATOR_PINNED_NOTE_LIMIT_DEFAULT;
  }
  return Math.max(
    1,
    Math.min(OPERATOR_PINNED_NOTE_LIMIT_MAX, Math.trunc(value))
  );
}

function sortOperatorPinnedNoteRecords<T extends {
  sortOrder?: number;
  pinnedAt?: number;
  updatedAt?: number;
  _id?: unknown;
  noteId?: string;
}>(records: T[]): T[] {
  return [...records].sort((a, b) => {
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
    const aKey = String(a.noteId ?? a._id ?? "");
    const bKey = String(b.noteId ?? b._id ?? "");
    return aKey.localeCompare(bKey);
  });
}

function mapOperatorPinnedNote(record: {
  _id: Id<"operatorPinnedNotes">;
  organizationId: Id<"organizations">;
  title?: string;
  note: string;
  sortOrder: number;
  pinnedAt: number;
  createdBy: Id<"users">;
  updatedBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
}) {
  return {
    noteId: String(record._id),
    organizationId: String(record.organizationId),
    title: record.title,
    note: record.note,
    sortOrder: record.sortOrder,
    pinnedAt: record.pinnedAt,
    createdBy: String(record.createdBy),
    updatedBy: String(record.updatedBy),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function resolveNextOperatorPinnedNoteSortOrder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">
): Promise<number> {
  const existing = await ctx.db
    .query("operatorPinnedNotes")
    .withIndex("by_organization_sort_order", (q: any) =>
      q.eq("organizationId", organizationId)
    )
    .collect();
  const maxSortOrder = existing.reduce((max: number, note: { sortOrder?: number }) => {
    const current =
      typeof note.sortOrder === "number" && Number.isFinite(note.sortOrder)
        ? Math.trunc(note.sortOrder)
        : 0;
    return Math.max(max, current);
  }, 0);
  return Math.min(OPERATOR_PINNED_NOTE_SORT_MAX, maxSortOrder + 100);
}

async function requireOperatorPinnedNotesAccess(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  sessionId: string;
  organizationId: Id<"organizations">;
  action: OperatorPinnedNotesAction;
}) {
  const auth = await requireAuthenticatedUser(args.ctx, args.sessionId);
  let isSuperAdmin = false;
  try {
    const userContext = await getUserContext(
      args.ctx,
      auth.userId,
      args.organizationId
    );
    isSuperAdmin =
      userContext.isGlobal && userContext.roleName === "super_admin";
  } catch {
    isSuperAdmin = false;
  }

  const requiredPermission =
    args.action === "read" ? "view_organization" : "manage_organization";
  const hasPermission = await checkPermission(
    args.ctx,
    auth.userId,
    requiredPermission,
    args.organizationId
  );

  const decision = evaluateOperatorPinnedNotesAccess({
    action: args.action,
    sessionOrganizationId: auth.organizationId,
    requestedOrganizationId: args.organizationId,
    isSuperAdmin,
    hasPermission,
  });

  if (!decision.allowed) {
    throw new Error("Unauthorized operator pinned notes access.");
  }

  return {
    userId: auth.userId,
    decision,
  };
}

export const listOperatorPinnedNotes = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOperatorPinnedNotesAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      action: "read",
    });

    const limit = clampOperatorPinnedNotesLimit(args.limit);
    const notes = await ctx.db
      .query("operatorPinnedNotes")
      .withIndex("by_organization_sort_order", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return sortOperatorPinnedNoteRecords(notes)
      .slice(0, limit)
      .map(mapOperatorPinnedNote);
  },
});

export const createOperatorPinnedNote = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    title: v.optional(v.string()),
    note: v.string(),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const access = await requireOperatorPinnedNotesAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      action: "create",
    });

    const note = normalizeOperatorPinnedNoteBody(args.note);
    if (note.length === 0) {
      throw new Error("Pinned note content is required.");
    }

    const defaultSortOrder = await resolveNextOperatorPinnedNoteSortOrder(
      ctx,
      args.organizationId
    );
    const sortOrder = normalizeOperatorPinnedNoteSortOrder(
      args.sortOrder,
      defaultSortOrder
    );
    const title = normalizeOperatorPinnedNoteTitle(args.title);
    const now = Date.now();

    const noteId = await ctx.db.insert("operatorPinnedNotes", {
      organizationId: args.organizationId,
      title,
      note,
      sortOrder,
      pinnedAt: now,
      createdBy: access.userId,
      updatedBy: access.userId,
      createdAt: now,
      updatedAt: now,
    });

    const created = await ctx.db.get(noteId);
    if (!created) {
      throw new Error("Failed to persist operator pinned note.");
    }

    return mapOperatorPinnedNote(created);
  },
});

export const updateOperatorPinnedNote = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    noteId: v.id("operatorPinnedNotes"),
    title: v.optional(v.string()),
    note: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const access = await requireOperatorPinnedNotesAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      action: "update",
    });

    const existing = await ctx.db.get(args.noteId);
    if (!existing || existing.organizationId !== args.organizationId) {
      throw new Error("Pinned note not found.");
    }

    const patch: Record<string, unknown> = {
      updatedBy: access.userId,
      updatedAt: Date.now(),
    };

    if (typeof args.title !== "undefined") {
      patch.title = normalizeOperatorPinnedNoteTitle(args.title);
    }
    if (typeof args.note !== "undefined") {
      const nextNote = normalizeOperatorPinnedNoteBody(args.note);
      if (nextNote.length === 0) {
        throw new Error("Pinned note content is required.");
      }
      patch.note = nextNote;
    }
    if (typeof args.sortOrder !== "undefined") {
      patch.sortOrder = normalizeOperatorPinnedNoteSortOrder(
        args.sortOrder,
        existing.sortOrder
      );
    }

    await ctx.db.patch(args.noteId, patch);
    const updated = await ctx.db.get(args.noteId);
    if (!updated) {
      throw new Error("Pinned note not found after update.");
    }

    return mapOperatorPinnedNote(updated);
  },
});

export const deleteOperatorPinnedNote = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    noteId: v.id("operatorPinnedNotes"),
  },
  handler: async (ctx, args) => {
    await requireOperatorPinnedNotesAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      action: "delete",
    });

    const existing = await ctx.db.get(args.noteId);
    if (!existing || existing.organizationId !== args.organizationId) {
      throw new Error("Pinned note not found.");
    }

    await ctx.db.delete(args.noteId);
    return {
      success: true,
      noteId: String(args.noteId),
    };
  },
});

export const getRuntimeOperatorPinnedNotes = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampOperatorPinnedNotesLimit(args.limit);
    const notes = await ctx.db
      .query("operatorPinnedNotes")
      .withIndex("by_organization_sort_order", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return sortOperatorPinnedNoteRecords(notes)
      .slice(0, limit)
      .map((note) => ({
        noteId: String(note._id),
        title: note.title,
        note: note.note,
        sortOrder: note.sortOrder,
        pinnedAt: note.pinnedAt,
        updatedAt: note.updatedAt,
      }));
  },
});

// ============================================================================
// ROLLING SESSION MEMORY (L2)
// ============================================================================

const SESSION_ROLLING_MEMORY_HISTORY_LIMIT_DEFAULT = 60;
const SESSION_ROLLING_MEMORY_HISTORY_LIMIT_MAX = 200;

function clampSessionRollingMemoryHistoryLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return SESSION_ROLLING_MEMORY_HISTORY_LIMIT_DEFAULT;
  }
  return Math.max(
    10,
    Math.min(SESSION_ROLLING_MEMORY_HISTORY_LIMIT_MAX, Math.trunc(value))
  );
}

export interface SessionRollingMemoryScopeDecision {
  allowed: boolean;
  reason?: "missing_scope" | "session_org_mismatch";
}

export function evaluateSessionRollingMemoryWriteScope(args: {
  sessionOrganizationId?: Id<"organizations"> | null;
  requestedOrganizationId?: Id<"organizations"> | null;
}): SessionRollingMemoryScopeDecision {
  if (!args.sessionOrganizationId || !args.requestedOrganizationId) {
    return {
      allowed: false,
      reason: "missing_scope",
    };
  }
  if (String(args.sessionOrganizationId) !== String(args.requestedOrganizationId)) {
    return {
      allowed: false,
      reason: "session_org_mismatch",
    };
  }
  return { allowed: true };
}

export const getSessionRollingSummaryMemory = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<SessionRollingSummaryMemoryRecord | null> => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }

    const scope = evaluateSessionRollingMemoryWriteScope({
      sessionOrganizationId: session.organizationId,
      requestedOrganizationId: args.organizationId,
    });
    if (!scope.allowed) {
      return null;
    }

    return normalizeSessionRollingSummaryMemoryRecord(
      (session as Record<string, unknown>).rollingSummaryMemory
    );
  },
});

export const getSessionReactivationMemory = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
    organizationId: v.id("organizations"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
    sessionRoutingKey: v.string(),
  },
  handler: async (ctx, args): Promise<SessionReactivationMemoryRecord | null> => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }

    const sessionRecord = session as Record<string, unknown>;
    const scope = evaluateSessionReactivationMemoryReadScope({
      sessionOrganizationId: session.organizationId,
      requestedOrganizationId: args.organizationId,
      sessionChannel: session.channel,
      requestedChannel: args.channel,
      sessionExternalContactIdentifier: session.externalContactIdentifier,
      requestedExternalContactIdentifier: args.externalContactIdentifier,
      sessionRoutingKey: resolveSessionRoutingKeyFromRecord(sessionRecord),
      requestedSessionRoutingKey: args.sessionRoutingKey,
    });
    if (!scope.allowed) {
      return null;
    }

    const cacheState = evaluateSessionReactivationMemoryCacheState({
      value: sessionRecord.reactivationMemory,
    });
    if (!cacheState.allowed || !cacheState.memory) {
      return null;
    }

    const previousSessionId = normalizeSessionScopeToken(sessionRecord.previousSessionId);
    if (!previousSessionId || previousSessionId !== cacheState.memory.source.sessionId) {
      return null;
    }

    const sourceScope = evaluateSessionReactivationMemoryReadScope({
      sessionOrganizationId: cacheState.memory.source.organizationId,
      requestedOrganizationId: String(args.organizationId),
      sessionChannel: cacheState.memory.source.channel,
      requestedChannel: args.channel,
      sessionExternalContactIdentifier:
        cacheState.memory.source.externalContactIdentifier,
      requestedExternalContactIdentifier: args.externalContactIdentifier,
      sessionRoutingKey: cacheState.memory.source.sessionRoutingKey,
      requestedSessionRoutingKey: args.sessionRoutingKey,
    });
    if (!sourceScope.allowed) {
      return null;
    }

    return cacheState.memory;
  },
});

export const refreshSessionRollingSummaryMemory = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    organizationId: v.id("organizations"),
    historyLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { success: false, error: "session_not_found" as const };
    }

    const scope = evaluateSessionRollingMemoryWriteScope({
      sessionOrganizationId: session.organizationId,
      requestedOrganizationId: args.organizationId,
    });
    if (!scope.allowed) {
      return {
        success: false,
        error: "blocked_scope" as const,
        reason: scope.reason,
      };
    }

    const historyLimit = clampSessionRollingMemoryHistoryLimit(args.historyLimit);
    const messages = await ctx.db
      .query("agentSessionMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    const recentMessages = messages
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-historyLimit);

    const snapshot = buildRollingSessionMemorySnapshot({
      messages: recentMessages.map((message) => ({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        toolCalls: (message as Record<string, unknown>).toolCalls,
      })),
    });
    if (!snapshot) {
      return {
        success: false,
        error: "blocked_policy" as const,
        reason: "no_eligible_sources" as const,
      };
    }

    await ctx.db.patch(args.sessionId, {
      rollingSummaryMemory: snapshot,
    });

    return {
      success: true,
      memory: snapshot,
    };
  },
});

// ============================================================================
// STRUCTURED CONTACT MEMORY (L4)
// ============================================================================

const SESSION_CONTACT_MEMORY_LIMIT_DEFAULT = 12;
const SESSION_CONTACT_MEMORY_LIMIT_MAX = 40;
const SESSION_CONTACT_MEMORY_POLICY_VERSION =
  "session_contact_memory_policy_v1" as const;

const SESSION_CONTACT_MEMORY_FIELD_ORDER = new Map<SessionContactMemoryField, number>(
  CONTACT_MEMORY_FIELD_ORDER.map((field, index) => [field, index])
);

function clampSessionContactMemoryLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return SESSION_CONTACT_MEMORY_LIMIT_DEFAULT;
  }
  return Math.max(
    1,
    Math.min(SESSION_CONTACT_MEMORY_LIMIT_MAX, Math.trunc(value))
  );
}

export function buildSessionContactMemoryNoEligibleSourcesSkipResult(args?: {
  extractedCandidateCount?: number;
  eligibleCandidateCount?: number;
}) {
  const extractedCandidateCount =
    typeof args?.extractedCandidateCount === "number" && Number.isFinite(args.extractedCandidateCount)
      ? Math.max(0, Math.trunc(args.extractedCandidateCount))
      : 0;
  const eligibleCandidateCount =
    typeof args?.eligibleCandidateCount === "number" && Number.isFinite(args.eligibleCandidateCount)
      ? Math.max(0, Math.trunc(args.eligibleCandidateCount))
      : 0;
  return {
    success: true as const,
    skippedReason: "no_eligible_sources" as const,
    policyVersion: SESSION_CONTACT_MEMORY_POLICY_VERSION,
    extractedCandidateCount,
    eligibleCandidateCount,
    insertedCount: 0,
    supersededCount: 0,
    ambiguousFields: [] as string[],
  };
}

export interface SessionContactMemoryScopeDecision {
  allowed: boolean;
  reason?:
    | "missing_scope"
    | "session_org_mismatch"
    | "channel_mismatch"
    | "contact_mismatch"
    | "route_mismatch";
}

export function evaluateSessionContactMemoryWriteScope(args: {
  sessionOrganizationId?: Id<"organizations"> | string | null;
  requestedOrganizationId?: Id<"organizations"> | string | null;
  sessionChannel?: string | null;
  requestedChannel?: string | null;
  sessionExternalContactIdentifier?: string | null;
  requestedExternalContactIdentifier?: string | null;
  sessionRoutingKey?: string | null;
  requestedSessionRoutingKey?: string | null;
}): SessionContactMemoryScopeDecision {
  const sessionOrganizationId = normalizeSessionScopeToken(args.sessionOrganizationId);
  const requestedOrganizationId = normalizeSessionScopeToken(args.requestedOrganizationId);
  const sessionChannel = normalizeSessionScopeToken(args.sessionChannel);
  const requestedChannel = normalizeSessionScopeToken(args.requestedChannel);
  const sessionExternalContactIdentifier = normalizeSessionScopeToken(
    args.sessionExternalContactIdentifier
  );
  const requestedExternalContactIdentifier = normalizeSessionScopeToken(
    args.requestedExternalContactIdentifier
  );
  const sessionRoutingKey = normalizeSessionScopeToken(args.sessionRoutingKey);
  const requestedSessionRoutingKey = normalizeSessionScopeToken(
    args.requestedSessionRoutingKey
  );

  if (
    !sessionOrganizationId
    || !requestedOrganizationId
    || !sessionChannel
    || !requestedChannel
    || !sessionExternalContactIdentifier
    || !requestedExternalContactIdentifier
    || !sessionRoutingKey
    || !requestedSessionRoutingKey
  ) {
    return {
      allowed: false,
      reason: "missing_scope",
    };
  }
  if (sessionOrganizationId !== requestedOrganizationId) {
    return {
      allowed: false,
      reason: "session_org_mismatch",
    };
  }
  if (sessionChannel !== requestedChannel) {
    return {
      allowed: false,
      reason: "channel_mismatch",
    };
  }
  if (sessionExternalContactIdentifier !== requestedExternalContactIdentifier) {
    return {
      allowed: false,
      reason: "contact_mismatch",
    };
  }
  if (sessionRoutingKey !== requestedSessionRoutingKey) {
    return {
      allowed: false,
      reason: "route_mismatch",
    };
  }
  return { allowed: true };
}

export interface SessionContactMemoryProvenanceDecision {
  allowed: boolean;
  reason?:
    | "missing_provenance"
    | "invalid_contract_version"
    | "invalid_source_policy"
    | "invalid_actor"
    | "invalid_trust_event";
}

export function evaluateSessionContactMemoryWriteProvenance(args: {
  provenance?: {
    contractVersion?: string | null;
    sourcePolicy?: string | null;
    actor?: string | null;
    trustEventName?: string | null;
  } | null;
}): SessionContactMemoryProvenanceDecision {
  if (!args.provenance) {
    return {
      allowed: false,
      reason: "missing_provenance",
    };
  }

  const contractVersion = normalizeSessionScopeToken(args.provenance.contractVersion);
  if (contractVersion !== SESSION_CONTACT_MEMORY_CONTRACT_VERSION) {
    return {
      allowed: false,
      reason: "invalid_contract_version",
    };
  }

  const sourcePolicy = normalizeSessionScopeToken(args.provenance.sourcePolicy);
  if (sourcePolicy !== SESSION_CONTACT_MEMORY_SOURCE_POLICY) {
    return {
      allowed: false,
      reason: "invalid_source_policy",
    };
  }

  const actor = normalizeSessionScopeToken(args.provenance.actor);
  if (actor !== "agent_execution_pipeline") {
    return {
      allowed: false,
      reason: "invalid_actor",
    };
  }

  const trustEventName = normalizeSessionScopeToken(args.provenance.trustEventName);
  if (trustEventName !== SESSION_CONTACT_MEMORY_TRUST_EVENT_NAME) {
    return {
      allowed: false,
      reason: "invalid_trust_event",
    };
  }

  return { allowed: true };
}

function sortSessionContactMemoryRecords(
  records: SessionContactMemoryRecord[]
): SessionContactMemoryRecord[] {
  return [...records].sort((a, b) => {
    const fieldDelta =
      (SESSION_CONTACT_MEMORY_FIELD_ORDER.get(a.field) ?? 999)
      - (SESSION_CONTACT_MEMORY_FIELD_ORDER.get(b.field) ?? 999);
    if (fieldDelta !== 0) {
      return fieldDelta;
    }
    const updatedAtDelta = b.updatedAt - a.updatedAt;
    if (updatedAtDelta !== 0) {
      return updatedAtDelta;
    }
    return a.memoryId.localeCompare(b.memoryId);
  });
}

export const getSessionContactMemory = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
    organizationId: v.id("organizations"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
    sessionRoutingKey: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SessionContactMemoryRecord[]> => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return [];
    }

    const sessionRecord = session as Record<string, unknown>;
    const scope = evaluateSessionContactMemoryWriteScope({
      sessionOrganizationId: session.organizationId,
      requestedOrganizationId: args.organizationId,
      sessionChannel: session.channel,
      requestedChannel: args.channel,
      sessionExternalContactIdentifier: session.externalContactIdentifier,
      requestedExternalContactIdentifier: args.externalContactIdentifier,
      sessionRoutingKey: resolveSessionRoutingKeyFromRecord(sessionRecord),
      requestedSessionRoutingKey: args.sessionRoutingKey,
    });
    if (!scope.allowed) {
      return [];
    }

    const records = await ctx.db
      .query("contactMemoryRecords")
      .withIndex("by_scope", (q) =>
        q.eq("organizationId", args.organizationId)
          .eq("channel", args.channel)
          .eq("externalContactIdentifier", args.externalContactIdentifier)
          .eq("sessionRoutingKey", args.sessionRoutingKey)
      )
      .collect();

    const normalized = records
      .map((record) =>
        normalizeSessionContactMemoryRecord({
          ...record,
          memoryId: String(record._id),
        })
      )
      .filter((record): record is SessionContactMemoryRecord => Boolean(record))
      .filter((record) => record.status === "active");

    const limit = clampSessionContactMemoryLimit(args.limit);
    return sortSessionContactMemoryRecords(normalized).slice(0, limit);
  },
});

export const refreshSessionContactMemory = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    turnId: v.id("agentTurns"),
    organizationId: v.id("organizations"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
    sessionRoutingKey: v.string(),
    userMessage: v.string(),
    toolResults: v.optional(v.array(v.object({
      tool: v.optional(v.string()),
      status: v.optional(v.string()),
      result: v.optional(v.any()),
    }))),
    provenance: v.object({
      contractVersion: v.string(),
      sourcePolicy: v.string(),
      actor: v.string(),
      trustEventName: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { success: false, error: "session_not_found" as const };
    }

    const turn = await ctx.db.get(args.turnId);
    if (
      !turn
      || turn.sessionId !== args.sessionId
      || turn.organizationId !== args.organizationId
    ) {
      return {
        success: false,
        error: "blocked_scope" as const,
        reason: "turn_scope_mismatch" as const,
      };
    }

    const sessionRecord = session as Record<string, unknown>;
    const scope = evaluateSessionContactMemoryWriteScope({
      sessionOrganizationId: session.organizationId,
      requestedOrganizationId: args.organizationId,
      sessionChannel: session.channel,
      requestedChannel: args.channel,
      sessionExternalContactIdentifier: session.externalContactIdentifier,
      requestedExternalContactIdentifier: args.externalContactIdentifier,
      sessionRoutingKey: resolveSessionRoutingKeyFromRecord(sessionRecord),
      requestedSessionRoutingKey: args.sessionRoutingKey,
    });
    if (!scope.allowed) {
      return {
        success: false,
        error: "blocked_scope" as const,
        reason: scope.reason,
      };
    }

    const provenance = evaluateSessionContactMemoryWriteProvenance({
      provenance: args.provenance,
    });
    if (!provenance.allowed) {
      return {
        success: false,
        error: "blocked_policy" as const,
        reason: provenance.reason,
      };
    }

    let extractedCandidates = extractSessionContactMemoryCandidates({
      userMessage: args.userMessage,
      toolResults: args.toolResults,
    });
    if (extractedCandidates.length === 0) {
      const fallbackMessages = await ctx.db
        .query("agentSessionMessages")
        .withIndex("by_session_timestamp", (q) => q.eq("sessionId", args.sessionId))
        .order("desc")
        .take(30);
      const fallbackUserMessage = fallbackMessages
        .reverse()
        .filter((message) => message.role === "user")
        .map((message) => message.content)
        .filter((content): content is string => typeof content === "string" && content.trim().length > 0)
        .join("\n");
      extractedCandidates = extractSessionContactMemoryCandidates({
        userMessage: fallbackUserMessage,
        toolResults: args.toolResults,
      });
      if (extractedCandidates.length === 0) {
        return buildSessionContactMemoryNoEligibleSourcesSkipResult({
          extractedCandidateCount: extractedCandidates.length,
          eligibleCandidateCount: 0,
        });
      }
    }

    const scopedRecords = await ctx.db
      .query("contactMemoryRecords")
      .withIndex("by_scope", (q) =>
        q.eq("organizationId", args.organizationId)
          .eq("channel", args.channel)
          .eq("externalContactIdentifier", args.externalContactIdentifier)
          .eq("sessionRoutingKey", args.sessionRoutingKey)
      )
      .collect();

    const idLookup = new Map<string, Id<"contactMemoryRecords">>();
    for (const record of scopedRecords) {
      idLookup.set(String(record._id), record._id);
    }

    const normalizedExisting = scopedRecords.map((record) =>
      normalizeSessionContactMemoryRecord({
        ...record,
        memoryId: String(record._id),
      })
    );
    const invalidExistingCount = normalizedExisting.filter((record) => !record).length;
    if (invalidExistingCount > 0) {
      return {
        success: false,
        error: "blocked_policy" as const,
        reason: "invalid_existing_provenance" as const,
      };
    }

    const mergePlan = planSessionContactMemoryMerge({
      existingRecords: normalizedExisting as SessionContactMemoryRecord[],
      candidates: extractedCandidates,
    });

    if (mergePlan.candidates.length === 0) {
      return {
        success: false,
        error: "blocked_policy" as const,
        reason: "ambiguous_candidate_values" as const,
        ambiguousFields: mergePlan.ambiguousFields,
      };
    }

    if (mergePlan.operations.length === 0) {
      return {
        success: true,
        policyVersion: SESSION_CONTACT_MEMORY_POLICY_VERSION,
        extractedCandidateCount: extractedCandidates.length,
        eligibleCandidateCount: mergePlan.candidates.length,
        insertedCount: 0,
        supersededCount: 0,
        ambiguousFields: mergePlan.ambiguousFields,
      };
    }

    const insertedIdsByOperation = new Map<string, Id<"contactMemoryRecords">>();
    const now = Date.now();
    for (const operation of mergePlan.operations) {
      const supersedesMemoryId =
        operation.supersedesMemoryId ? idLookup.get(operation.supersedesMemoryId) : undefined;
      const revertedFromMemoryId =
        operation.revertedFromMemoryId ? idLookup.get(operation.revertedFromMemoryId) : undefined;
      const trustEventId = [
        SESSION_CONTACT_MEMORY_TRUST_EVENT_NAME,
        String(args.sessionId),
        String(args.turnId),
        operation.candidate.dedupeKey,
      ].join(":");

      const insertedId = await ctx.db.insert("contactMemoryRecords", {
        organizationId: args.organizationId,
        channel: args.channel,
        externalContactIdentifier: args.externalContactIdentifier,
        sessionRoutingKey: args.sessionRoutingKey,
        contractVersion: SESSION_CONTACT_MEMORY_CONTRACT_VERSION,
        sourcePolicy: SESSION_CONTACT_MEMORY_SOURCE_POLICY,
        field: operation.candidate.field,
        value: operation.candidate.value,
        normalizedValue: operation.candidate.normalizedValue,
        dedupeKey: operation.candidate.dedupeKey,
        status: "active",
        supersedesMemoryId,
        revertedFromMemoryId,
        provenance: {
          contractVersion: SESSION_CONTACT_MEMORY_PROVENANCE_VERSION,
          sourceKind: operation.candidate.sourceKind,
          sourceSessionId: String(args.sessionId),
          sourceTurnId: String(args.turnId),
          sourceMessageRole:
            operation.candidate.sourceKind === "user_message"
              ? "user"
              : undefined,
          sourceToolName:
            operation.candidate.sourceKind === "verified_tool_result"
              ? operation.candidate.sourceToolName
              : undefined,
          sourceExcerpt: operation.candidate.sourceExcerpt,
          sourceTimestamp: now,
          actor: "agent_execution_pipeline",
          trustEventName: SESSION_CONTACT_MEMORY_TRUST_EVENT_NAME,
          trustEventId,
        },
        createdAt: now,
        updatedAt: now,
      });
      insertedIdsByOperation.set(operation.operationKey, insertedId);
    }

    let supersededCount = 0;
    for (const operation of mergePlan.operations) {
      if (!operation.supersedesMemoryId) {
        continue;
      }
      const supersedesId = idLookup.get(operation.supersedesMemoryId);
      const insertedId = insertedIdsByOperation.get(operation.operationKey);
      if (!supersedesId || !insertedId) {
        continue;
      }
      await ctx.db.patch(supersedesId, {
        status: "superseded",
        supersededByMemoryId: insertedId,
        updatedAt: now,
      });
      supersededCount += 1;
    }

    return {
      success: true,
      policyVersion: SESSION_CONTACT_MEMORY_POLICY_VERSION,
      extractedCandidateCount: extractedCandidates.length,
      eligibleCandidateCount: mergePlan.candidates.length,
      insertedCount: mergePlan.operations.length,
      supersededCount,
      ambiguousFields: mergePlan.ambiguousFields,
      insertedMemoryIds: Array.from(insertedIdsByOperation.values()).map(String),
    };
  },
});

// ============================================================================
// MESSAGE MANAGEMENT (Internal)
// ============================================================================

function resolveMessageHistoryLimit(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(500, Math.max(1, Math.floor(value)));
}

/**
 * Get conversation history for a session
 */
export const getSessionMessages = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = resolveMessageHistoryLimit(args.limit, 20);
    const messages = await ctx.db
      .query("agentSessionMessages")
      .withIndex("by_session_timestamp", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(limit);

    // Preserve existing chronological output ordering while using bounded descending reads.
    return messages.reverse();
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

export const getSessionSummaryBillingContext = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }
    return {
      organizationId: session.organizationId,
      agentId: session.agentId,
    };
  },
});

export const getSessionByIdInternal = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
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
    const billingContext = await ctx.runQuery(
      getInternalRef().ai.agentSessions.getSessionSummaryBillingContext,
      { sessionId }
    );
    if (!billingContext) {
      return;
    }

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

    const model = "openai/gpt-4o-mini";
    try {
      const client = new OpenRouterClient(apiKey);
      const response = await client.chatCompletion({
        model,
        messages: [
          {
            role: "system",
            content:
              "Summarize this conversation in 2-3 sentences. Focus on: what the customer wanted, what was done, any unresolved issues. Be concise.",
          },
          { role: "user", content: transcript },
        ],
        max_tokens: 200,
      });
      const usage = response?.usage ?? null;
      const promptTokens = Math.max(0, usage?.prompt_tokens ?? 0);
      const completionTokens = Math.max(0, usage?.completion_tokens ?? 0);
      const totalTokens = Math.max(
        0,
        usage?.total_tokens ?? promptTokens + completionTokens
      );
      const costUsd =
        typeof response?.cost === "number"
          ? Math.max(0, response.cost)
          : client.calculateCost(
            {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
            },
            model
          );
      const nativeCostInCents = Math.max(0, Math.round(costUsd * 100));

      try {
        await ctx.runMutation(generatedApi.api.ai.billing.recordUsage, {
          organizationId: billingContext.organizationId,
          requestType: "completion",
          provider: "openrouter",
          model,
          action: "session_summary_generation",
          requestCount: 1,
          inputTokens: promptTokens,
          outputTokens: completionTokens,
          totalTokens,
          costInCents: nativeCostInCents,
          nativeUsageUnit: "tokens",
          nativeUsageQuantity: totalTokens,
          nativeInputUnits: promptTokens,
          nativeOutputUnits: completionTokens,
          nativeTotalUnits: totalTokens,
          nativeCostInCents,
          nativeCostCurrency: "USD",
          nativeCostSource: "estimated_model_pricing",
          creditsCharged: 0,
          creditChargeStatus: "skipped_not_required",
          success: true,
          billingSource: "platform",
          requestSource: "llm",
          ledgerMode: "credits_ledger",
          creditLedgerAction: "session_summary_generation",
          usageMetadata: {
            source: "agent_session_summary",
            sessionId: String(sessionId),
            agentId: String(billingContext.agentId),
          },
        });
      } catch (usageError) {
        console.warn(
          "[SessionSummary] Failed to persist usage telemetry:",
          usageError
        );
      }

      const summaryText = response?.choices?.[0]?.message?.content;

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

        await ctx.scheduler.runAfter(
          0,
          getInternalRef().ai.weekendMode.processWeekendSessionSummary,
          { sessionId }
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

export interface EvalTraceReadScopeDecision {
  allowed: boolean;
  reason?: "missing_scope" | "session_org_mismatch" | "missing_permission";
}

export function evaluateEvalTraceReadScope(args: {
  sessionOrganizationId?: Id<"organizations"> | string | null;
  requestedOrganizationId?: Id<"organizations"> | string | null;
  hasPermission: boolean;
}): EvalTraceReadScopeDecision {
  const sessionOrganizationId = normalizeSessionScopeToken(args.sessionOrganizationId);
  const requestedOrganizationId = normalizeSessionScopeToken(args.requestedOrganizationId);
  if (!sessionOrganizationId || !requestedOrganizationId) {
    return {
      allowed: false,
      reason: "missing_scope",
    };
  }
  if (sessionOrganizationId !== requestedOrganizationId) {
    return {
      allowed: false,
      reason: "session_org_mismatch",
    };
  }
  if (!args.hasPermission) {
    return {
      allowed: false,
      reason: "missing_permission",
    };
  }
  return { allowed: true };
}

async function requireEvalTraceReadAccess(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  sessionId: string;
  organizationId: Id<"organizations">;
}) {
  const auth = await requireAuthenticatedUser(args.ctx, args.sessionId);
  const hasPermission = await checkPermission(
    args.ctx,
    auth.userId,
    "view_organization",
    args.organizationId
  );
  const decision = evaluateEvalTraceReadScope({
    sessionOrganizationId: auth.organizationId,
    requestedOrganizationId: args.organizationId,
    hasPermission,
  });
  if (!decision.allowed) {
    throw new Error("Unauthorized eval trace access.");
  }
  return {
    userId: auth.userId,
    decision,
  };
}

export const getEvalRunPlaybackTrace = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    runId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireEvalTraceReadAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });
    return await (ctx as any).runQuery(
      getInternalRef().ai.chat.getEvalRunPlaybackTraceInternal,
      {
        organizationId: args.organizationId,
        runId: args.runId,
        limit: args.limit,
      }
    );
  },
});

export const getEvalRunDiffTrace = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    baselineRunId: v.string(),
    candidateRunId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireEvalTraceReadAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });
    return await (ctx as any).runQuery(
      getInternalRef().ai.chat.getEvalRunDiffTraceInternal,
      {
        organizationId: args.organizationId,
        baselineRunId: args.baselineRunId,
        candidateRunId: args.candidateRunId,
        limit: args.limit,
      }
    );
  },
});

export const getEvalPromotionEvidencePacket = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    runId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireEvalTraceReadAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });
    return await (ctx as any).runQuery(
      getInternalRef().ai.chat.getEvalPromotionEvidencePacketInternal,
      {
        organizationId: args.organizationId,
        runId: args.runId,
        limit: args.limit,
      }
    );
  },
});

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
 * Lightweight debug event feed for a single agent.
 * Designed for in-product troubleshooting without terminal log hunting.
 */
export const getAgentDebugEvents = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    hours: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const clampedHours = Math.min(Math.max(Math.floor(args.hours ?? 24), 1), 24 * 30);
    const clampedLimit = Math.min(Math.max(Math.floor(args.limit ?? 60), 1), 300);
    const since = Date.now() - clampedHours * 60 * 60 * 1000;

    // by_object is the narrowest index for per-agent diagnostics.
    const sampled = await ctx.db
      .query("objectActions")
      .withIndex("by_object", (q) => q.eq("objectId", args.agentId))
      .order("desc")
      .take(clampedLimit * 6);

    const events: Array<{
      actionId: string;
      performedAt: number;
      actionType: string;
      sessionId?: string;
      turnId?: string;
      summary: {
        toolsUsed: string[];
        reasonCode?: string;
        outcome?: string;
        preflightReasonCode?: string;
        dispatchDecision?: string;
        dispatchInvocationStatus?: string;
      };
      payload: Record<string, unknown>;
    }> = [];

    for (const action of sampled) {
      if (action.organizationId !== args.organizationId) {
        continue;
      }
      if (action.performedAt < since) {
        continue;
      }
      const actionData = (action.actionData || {}) as Record<string, unknown>;
      const actionCompletion =
        actionData.actionCompletion
        && typeof actionData.actionCompletion === "object"
        && !Array.isArray(actionData.actionCompletion)
          ? (actionData.actionCompletion as Record<string, unknown>)
          : undefined;
      const actionCompletionPayload =
        actionCompletion?.payload
        && typeof actionCompletion.payload === "object"
        && !Array.isArray(actionCompletion.payload)
          ? (actionCompletion.payload as Record<string, unknown>)
          : undefined;
      const samanthaAutoDispatch =
        actionCompletion?.samanthaAutoDispatch
        && typeof actionCompletion.samanthaAutoDispatch === "object"
        && !Array.isArray(actionCompletion.samanthaAutoDispatch)
          ? (actionCompletion.samanthaAutoDispatch as Record<string, unknown>)
          : undefined;
      const toolsUsed = Array.isArray(actionData.toolsUsed)
        ? actionData.toolsUsed.filter((value): value is string => typeof value === "string")
        : [];

      events.push({
        actionId: String(action._id),
        performedAt: action.performedAt,
        actionType: action.actionType,
        sessionId: typeof actionData.sessionId === "string" ? actionData.sessionId : undefined,
        turnId: typeof actionData.turnId === "string" ? actionData.turnId : undefined,
        summary: {
          toolsUsed,
          reasonCode:
            typeof actionCompletionPayload?.reasonCode === "string"
              ? actionCompletionPayload.reasonCode
              : undefined,
          outcome:
            typeof actionCompletionPayload?.outcome === "string"
              ? actionCompletionPayload.outcome
              : undefined,
          preflightReasonCode:
            typeof actionCompletionPayload?.preflightReasonCode === "string"
              ? actionCompletionPayload.preflightReasonCode
              : undefined,
          dispatchDecision:
            typeof samanthaAutoDispatch?.dispatchDecision === "string"
              ? samanthaAutoDispatch.dispatchDecision
              : undefined,
          dispatchInvocationStatus:
            typeof samanthaAutoDispatch?.invocationStatus === "string"
              ? samanthaAutoDispatch.invocationStatus
              : undefined,
        },
        payload: actionData,
      });
      if (events.length >= clampedLimit) {
        break;
      }
    }

    return {
      windowHours: clampedHours,
      since,
      totalEvents: events.length,
      events,
    };
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
 * Inspect claim-vs-execution mismatch telemetry emitted by action-completion contracts.
 * User-facing strict mode: artifact-backed incidents only.
 */
export const getActionCompletionMismatchTelemetry = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    hours: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);
    return await buildActionCompletionMismatchTelemetryResponse({
      ctx,
      organizationId: args.organizationId,
      agentId: args.agentId,
      hours: args.hours,
      limit: args.limit,
      sourceMode: "artifacts_only",
    });
  },
});

/**
 * Admin diagnostic variant for mismatch telemetry.
 * Allows controlled fallback behavior for investigations.
 */
export const getActionCompletionMismatchTelemetryDiagnostic = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    hours: v.optional(v.number()),
    limit: v.optional(v.number()),
    sourceMode: v.optional(
      v.union(v.literal("auto"), v.literal("artifacts_only"))
    ),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);
    return await buildActionCompletionMismatchTelemetryResponse({
      ctx,
      organizationId: args.organizationId,
      agentId: args.agentId,
      hours: args.hours,
      limit: args.limit,
      sourceMode: args.sourceMode ?? "auto",
    });
  },
});

async function buildActionCompletionMismatchTelemetryResponse(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  agentId?: Id<"objects">;
  hours?: number;
  limit?: number;
  sourceMode: "auto" | "artifacts_only";
}) {
  const clampedHours = Math.min(Math.max(Math.floor(args.hours ?? 24), 1), 24 * 30);
  const clampedLimit = Math.min(Math.max(Math.floor(args.limit ?? 50), 1), 500);
  const since = Date.now() - clampedHours * 60 * 60 * 1000;

  const messageActions = await args.ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("actionType", "message_processed")
      )
      .collect();
  const mismatchActions = await args.ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("actionType", "action_completion_mismatch_detected")
      )
      .collect();
  const rewriteActions = await args.ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q: any) =>
        q.eq(
          "organizationId",
          args.organizationId
        ).eq("actionType", "action_completion_fail_closed_rewrite_applied")
      )
      .collect();

  const records: AgentActionCompletionTelemetryRecord[] = [];
  for (const action of messageActions) {
    if (action.performedAt < since) {
      continue;
    }
    if (args.agentId && action.objectId !== args.agentId) {
      continue;
    }
    const actionData = (action.actionData || {}) as Record<string, unknown>;
    records.push({
      performedAt: action.performedAt,
      sessionId:
        typeof actionData.sessionId === "string" ? actionData.sessionId : undefined,
      turnId:
        typeof actionData.turnId === "string" ? actionData.turnId : undefined,
      agentId: String(action.objectId),
      channel: typeof actionData.channel === "string" ? actionData.channel : undefined,
      actionCompletion: actionData.actionCompletion as AgentActionCompletionTelemetry | undefined,
    });
  }
  const mismatchArtifactRecords: AgentActionCompletionTelemetryRecord[] = [];
  for (const action of mismatchActions) {
    if (action.performedAt < since) {
      continue;
    }
    if (args.agentId && action.objectId !== args.agentId) {
      continue;
    }
    const actionData = (action.actionData || {}) as Record<string, unknown>;
    mismatchArtifactRecords.push({
      performedAt: action.performedAt,
      sessionId:
        typeof actionData.sessionId === "string" ? actionData.sessionId : undefined,
      turnId:
        typeof actionData.turnId === "string" ? actionData.turnId : undefined,
      agentId: String(action.objectId),
      channel: typeof actionData.channel === "string" ? actionData.channel : undefined,
      actionCompletion: actionData as unknown as AgentActionCompletionTelemetry,
    });
  }

  const incidents: Array<{
      performedAt: number;
      sessionId?: string;
      turnId?: string;
      agentId: string;
      channel?: string;
      reasonCode: string;
      outcome?: string;
      enforcementMode: "off" | "observe" | "enforce";
      source: "template_metadata" | "legacy_samantha_fallback" | "none";
      templateRole: string;
      templateAgentId?: string;
      templateIdentifier: string;
      contractVersion?: string;
      templateContractVersion?: string;
      claimedOutcomes: string[];
      malformedClaimCount: number;
      rewriteApplied: boolean;
      contractEvidence: {
        claimStatus?: "in_progress" | "completed";
        status?: "enforced" | "pass";
        requiredTools: string[];
        observedTools: string[];
        availableTools: string[];
      };
  }> = [];
  const sourceMode = args.sourceMode;
  const hasArtifactRecords = mismatchArtifactRecords.length > 0;
  const incidentSourceRecords =
    sourceMode === "artifacts_only"
      ? mismatchArtifactRecords
      : hasArtifactRecords
        ? mismatchArtifactRecords
        : records;
  const summarySourceRecords =
    sourceMode === "artifacts_only" ? mismatchArtifactRecords : records;
  for (const record of incidentSourceRecords) {
    const actionCompletion = normalizeActionCompletionTelemetry(record.actionCompletion);
    if (!actionCompletion || actionCompletion.payload?.observedViolation !== true) {
      continue;
    }
    const templateIdentifier =
      actionCompletion.templateAgentId ?? actionCompletion.templateRole ?? "unknown_template";
    incidents.push({
      performedAt: record.performedAt,
      sessionId: record.sessionId,
      turnId: record.turnId,
      agentId: record.agentId ?? "unknown_agent",
      channel: record.channel,
      reasonCode: actionCompletion.payload.reasonCode ?? "unknown",
      outcome:
        actionCompletion.payload.outcome
        || actionCompletion.claimedOutcomes[0]
        || undefined,
      enforcementMode: actionCompletion.enforcementMode ?? "off",
      source: actionCompletion.source ?? "none",
      templateRole: actionCompletion.templateRole ?? "unknown_template",
      templateAgentId: actionCompletion.templateAgentId,
      templateIdentifier,
      contractVersion: actionCompletion.contractVersion,
      templateContractVersion: actionCompletion.templateContractVersion,
      claimedOutcomes: actionCompletion.claimedOutcomes,
      malformedClaimCount: actionCompletion.malformedClaimCount,
      rewriteApplied: actionCompletion.rewriteApplied === true,
      contractEvidence: {
        claimStatus: actionCompletion.payload?.claimStatus,
        status: actionCompletion.payload?.status,
        requiredTools: actionCompletion.payload?.requiredTools ?? [],
        observedTools: actionCompletion.payload?.observedTools ?? [],
        availableTools: actionCompletion.payload?.availableTools ?? [],
      },
    });
  }
  const sortedIncidents = incidents
    .sort((left, right) => {
      if (left.performedAt !== right.performedAt) {
        return right.performedAt - left.performedAt;
      }
      const leftSession = left.sessionId ?? "";
      const rightSession = right.sessionId ?? "";
      if (leftSession !== rightSession) {
        return leftSession.localeCompare(rightSession);
      }
      const leftTurn = left.turnId ?? "";
      const rightTurn = right.turnId ?? "";
      if (leftTurn !== rightTurn) {
        return leftTurn.localeCompare(rightTurn);
      }
      if (left.agentId !== right.agentId) {
        return left.agentId.localeCompare(right.agentId);
      }
      return left.templateIdentifier.localeCompare(right.templateIdentifier);
    })
    .slice(0, clampedLimit);

  return {
    source: "agent_message_processed",
    sourceMode,
    dataQuality:
      sourceMode === "artifacts_only"
        ? hasArtifactRecords
          ? "artifact_backed"
          : "no_artifacts"
        : hasArtifactRecords
          ? "artifact_backed_with_fallback_available"
          : "fallback_derived",
    summarySource:
      sourceMode === "artifacts_only"
        ? "action_completion_mismatch_detected"
        : "message_processed",
    incidentSource: sourceMode === "artifacts_only"
      ? "action_completion_mismatch_detected"
      : hasArtifactRecords
        ? "action_completion_mismatch_detected"
        : "message_processed_fallback",
    rewriteArtifactCount: rewriteActions.filter((action: any) => {
      if (action.performedAt < since) {
        return false;
      }
      if (args.agentId && action.objectId !== args.agentId) {
        return false;
      }
      return true;
    }).length,
    ...aggregateActionCompletionMismatchTelemetry(summarySourceRecords, {
      windowHours: clampedHours,
      since,
    }),
    incidents: sortedIncidents,
  };
}

/**
 * Inspect required-scope contract failures emitted by runtime fail-closed checks.
 */
export const getRequiredScopeContractFailures = query({
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
    const clampedLimit = Math.min(Math.max(Math.floor(args.limit ?? 50), 1), 500);
    const since = Date.now() - clampedHours * 60 * 60 * 1000;

    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("actionType", "required_scope_contract_blocked")
      )
      .order("desc")
      .collect();

    const records: Array<{
      performedAt: number;
      agentId: string;
      sessionId?: string;
      turnId?: string;
      reasonCode?: string;
      manifestHash?: string;
      missingTools: string[];
      missingCapabilities: string[];
      missingCapabilityKinds: string[];
      requiredTools: string[];
      requiredCapabilities: string[];
      removedByLayer?: Record<string, unknown>;
      requiredScopeManifest?: Record<string, unknown>;
    }> = [];

    for (const action of actions) {
      if (action.performedAt < since) {
        continue;
      }
      if (args.agentId && action.objectId !== args.agentId) {
        continue;
      }

      const actionData = (action.actionData || {}) as Record<string, unknown>;
      const contract =
        actionData.contract && typeof actionData.contract === "object"
          ? (actionData.contract as Record<string, unknown>)
          : {};
      const gap =
        actionData.gap && typeof actionData.gap === "object"
          ? (actionData.gap as Record<string, unknown>)
          : {};
      const requiredScopeManifest =
        actionData.requiredScopeManifest && typeof actionData.requiredScopeManifest === "object"
          ? (actionData.requiredScopeManifest as Record<string, unknown>)
          : undefined;

      const requiredTools = Array.isArray(contract.requiredTools)
        ? contract.requiredTools.filter((item): item is string => typeof item === "string")
        : [];
      const requiredCapabilities = Array.isArray(contract.requiredCapabilities)
        ? contract.requiredCapabilities.filter((item): item is string => typeof item === "string")
        : [];
      const missingTools = Array.isArray(gap.missingTools)
        ? gap.missingTools.filter((item): item is string => typeof item === "string")
        : [];
      const missingCapabilities = Array.isArray(gap.missingCapabilities)
        ? gap.missingCapabilities.filter((item): item is string => typeof item === "string")
        : [];
      const missingCapabilityKinds = Array.isArray(gap.missingCapabilityKinds)
        ? gap.missingCapabilityKinds.filter((item): item is string => typeof item === "string")
        : [];
      const removedByLayer =
        gap.missingByLayer && typeof gap.missingByLayer === "object"
          ? (gap.missingByLayer as Record<string, unknown>)
          : undefined;
      const manifestHash = requiredScopeManifest
        && typeof requiredScopeManifest.manifestHash === "string"
        ? requiredScopeManifest.manifestHash
        : undefined;

      records.push({
        performedAt: action.performedAt,
        agentId: String(action.objectId),
        sessionId:
          typeof actionData.sessionId === "string" ? actionData.sessionId : undefined,
        turnId:
          typeof actionData.turnId === "string" ? actionData.turnId : undefined,
        reasonCode:
          typeof gap.reasonCode === "string" ? gap.reasonCode : undefined,
        manifestHash,
        missingTools: Array.from(new Set(missingTools)).sort((a, b) => a.localeCompare(b)),
        missingCapabilities: Array.from(new Set(missingCapabilities)).sort((a, b) => a.localeCompare(b)),
        missingCapabilityKinds: Array.from(new Set(missingCapabilityKinds)).sort((a, b) => a.localeCompare(b)),
        requiredTools: Array.from(new Set(requiredTools)).sort((a, b) => a.localeCompare(b)),
        requiredCapabilities: Array.from(new Set(requiredCapabilities)).sort((a, b) => a.localeCompare(b)),
        removedByLayer,
        requiredScopeManifest,
      });
      if (records.length >= clampedLimit) {
        break;
      }
    }

    return {
      windowHours: clampedHours,
      since,
      totalFailures: records.length,
      records,
    };
  },
});

/**
 * Persist and retrieve runtime capability manifest artifacts for explainability and audits.
 */
export const persistRuntimeCapabilityManifestArtifact = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    manifest: v.any(),
    persistedAtMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const artifact = buildRuntimeCapabilityManifestArtifact(
      args.manifest as Parameters<typeof buildRuntimeCapabilityManifestArtifact>[0],
    );

    const existing = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("actionType", RUNTIME_CAPABILITY_MANIFEST_ARTIFACT_ACTION_TYPE),
      )
      .collect();

    const duplicate = existing.find((action) => {
      if (action.objectId !== args.agentId) {
        return false;
      }
      const persisted = normalizeRuntimeCapabilityManifestArtifact(action.actionData);
      return persisted?.manifestHash === artifact.manifestHash;
    });

    if (duplicate) {
      return {
        stored: false,
        actionId: duplicate._id,
        manifestHash: artifact.manifestHash,
        manifestKey: artifact.manifestKey,
      };
    }

    const actionId = await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.agentId,
      actionType: RUNTIME_CAPABILITY_MANIFEST_ARTIFACT_ACTION_TYPE,
      actionData: artifact,
      performedAt: args.persistedAtMs ?? Date.now(),
    });

    return {
      stored: true,
      actionId,
      manifestHash: artifact.manifestHash,
      manifestKey: artifact.manifestKey,
    };
  },
});

export const getRuntimeCapabilityManifestArtifacts = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    manifestHash: v.optional(v.string()),
    hours: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const clampedHours = Math.min(Math.max(Math.floor(args.hours ?? 24), 1), 24 * 30);
    const clampedLimit = Math.min(Math.max(Math.floor(args.limit ?? 50), 1), 500);
    const since = Date.now() - clampedHours * 60 * 60 * 1000;

    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("actionType", RUNTIME_CAPABILITY_MANIFEST_ARTIFACT_ACTION_TYPE),
      )
      .order("desc")
      .collect();

    const records: Array<{
      performedAt: number;
      agentId: string;
      actionId: string;
      manifestHash: string;
      manifestKey: string;
      sourceLayerCatalog: string[];
      denyCatalog: string[];
      manifest: Record<string, unknown>;
    }> = [];
    const seenHashes = new Set<string>();

    for (const action of actions) {
      if (action.performedAt < since) {
        continue;
      }
      if (args.agentId && action.objectId !== args.agentId) {
        continue;
      }

      const artifact = normalizeRuntimeCapabilityManifestArtifact(action.actionData);
      if (!artifact) {
        continue;
      }
      if (args.manifestHash && artifact.manifestHash !== args.manifestHash) {
        continue;
      }
      if (seenHashes.has(artifact.manifestHash)) {
        continue;
      }
      seenHashes.add(artifact.manifestHash);

      records.push({
        performedAt: action.performedAt,
        agentId: String(action.objectId),
        actionId: String(action._id),
        manifestHash: artifact.manifestHash,
        manifestKey: artifact.manifestKey,
        sourceLayerCatalog: artifact.sourceLayerCatalog,
        denyCatalog: artifact.denyCatalog,
        manifest: artifact.manifest as unknown as Record<string, unknown>,
      });

      if (records.length >= clampedLimit) {
        break;
      }
    }

    return {
      windowHours: clampedHours,
      since,
      totalArtifacts: records.length,
      records,
    };
  },
});

export interface DelegationExplainabilityActionRecord {
  _id: string;
  organizationId: string;
  objectId: string;
  actionType: string;
  performedAt: number;
  actionData?: Record<string, unknown>;
}

export interface DelegationExplainabilityExecutionEdgeRecord {
  _id: string;
  organizationId: string;
  sessionId: string;
  turnId: string;
  transition: string;
  occurredAt: number;
  edgeOrdinal?: number;
  metadata?: Record<string, unknown>;
}

export interface DelegationExplainabilityTrace {
  organizationId: string;
  sessionId: string;
  turnId: string;
  authority: {
    agentId: string | null;
    source: string;
  };
  speaker: {
    agentId: string | null;
    source: string;
  };
  handoffProvenance: {
    source: string;
    teamAccessMode: "invisible" | "direct" | "meeting" | "unknown";
    fromAgentId?: string;
    toAgentId?: string;
    handoffNumber?: number;
    selectionStrategy?: string;
    requestedSpecialistType?: string;
    matchedBy?: string;
    candidateCount?: number;
    catalogSize?: number;
  };
  outcome: {
    status: "success" | "blocked" | "error";
    reasonCode: string;
    reason: string;
    source: string;
  };
  trace: {
    actionIds: string[];
    edgeIds: string[];
    actionCount: number;
    edgeCount: number;
  };
}

const DELEGATION_EXPLAINABILITY_ACTION_TYPES = new Set([
  "team_handoff",
  "required_scope_fallback_delegation",
  "required_scope_contract_blocked",
  "message_processed",
]);

function normalizeExplainabilityActionData(
  value: unknown
): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeExplainabilityString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeExplainabilityNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function sortExplainabilityActions(
  actions: DelegationExplainabilityActionRecord[]
): DelegationExplainabilityActionRecord[] {
  const precedence: Record<string, number> = {
    team_handoff: 1,
    required_scope_fallback_delegation: 2,
    required_scope_contract_blocked: 3,
    message_processed: 4,
  };
  return [...actions].sort((left, right) => {
    if (left.performedAt !== right.performedAt) {
      return left.performedAt - right.performedAt;
    }
    const leftPrecedence = precedence[left.actionType] ?? 99;
    const rightPrecedence = precedence[right.actionType] ?? 99;
    if (leftPrecedence !== rightPrecedence) {
      return leftPrecedence - rightPrecedence;
    }
    return String(left._id).localeCompare(String(right._id));
  });
}

function sortExplainabilityEdges(
  edges: DelegationExplainabilityExecutionEdgeRecord[]
): DelegationExplainabilityExecutionEdgeRecord[] {
  return [...edges].sort((left, right) => {
    const leftOrdinal = normalizeExplainabilityNumber(left.edgeOrdinal) ?? 0;
    const rightOrdinal = normalizeExplainabilityNumber(right.edgeOrdinal) ?? 0;
    if (leftOrdinal !== rightOrdinal) {
      return leftOrdinal - rightOrdinal;
    }
    if (left.occurredAt !== right.occurredAt) {
      return left.occurredAt - right.occurredAt;
    }
    return String(left._id).localeCompare(String(right._id));
  });
}

export function buildDelegationExplainabilityTrace(args: {
  organizationId: string;
  sessionId: string;
  turnId: string;
  authorityAgentId?: string;
  sessionTeamState?: {
    activeAgentId?: string;
  };
  actions: DelegationExplainabilityActionRecord[];
  executionEdges?: DelegationExplainabilityExecutionEdgeRecord[];
}): DelegationExplainabilityTrace {
  const scopedActions = sortExplainabilityActions(
    args.actions.filter((action) => {
      if (action.organizationId !== args.organizationId) {
        return false;
      }
      const actionData = normalizeExplainabilityActionData(action.actionData);
      const actionSessionId = normalizeExplainabilityString(actionData.sessionId);
      if (actionSessionId !== args.sessionId) {
        return false;
      }
      if (action.actionType === "team_handoff") {
        const actionTurnId = normalizeExplainabilityString(actionData.turnId);
        if (actionTurnId) {
          return actionTurnId === args.turnId;
        }
        return true;
      }
      const actionTurnId = normalizeExplainabilityString(actionData.turnId);
      return actionTurnId === args.turnId;
    })
  );
  const scopedEdges = sortExplainabilityEdges(
    (args.executionEdges || []).filter(
      (edge) =>
        edge.organizationId === args.organizationId
        && edge.sessionId === args.sessionId
        && edge.turnId === args.turnId
    )
  );

  const messageProcessed = scopedActions.find(
    (action) => action.actionType === "message_processed"
  );
  const blockedAction = scopedActions.find(
    (action) => action.actionType === "required_scope_contract_blocked"
  );
  const fallbackAction = scopedActions.find(
    (action) => action.actionType === "required_scope_fallback_delegation"
  );
  const handoffAction = [...scopedActions]
    .filter((action) => action.actionType === "team_handoff")
    .at(-1);
  const handoffCompletedEdge = [...scopedEdges]
    .filter((edge) => edge.transition === "handoff_completed")
    .at(-1);
  const terminalErrorEdge = [...scopedEdges]
    .reverse()
    .find((edge) => edge.transition === "turn_failed" || edge.transition === "turn_cancelled");

  const messageProcessedData = normalizeExplainabilityActionData(messageProcessed?.actionData);
  const blockedData = normalizeExplainabilityActionData(blockedAction?.actionData);
  const fallbackData = normalizeExplainabilityActionData(fallbackAction?.actionData);
  const fallbackContract = normalizeExplainabilityActionData(fallbackData.fallback);
  const handoffData = normalizeExplainabilityActionData(handoffAction?.actionData);
  const handoffEdgeMetadata = normalizeExplainabilityActionData(handoffCompletedEdge?.metadata);
  const handoffEdgeProvenance = normalizeExplainabilityActionData(
    handoffEdgeMetadata.handoffProvenance
  );
  const handoffActionProvenance = normalizeExplainabilityActionData(
    handoffData.handoffProvenance
  );

  const authorityAgentId =
    normalizeExplainabilityString(messageProcessedData.authorityAgentId)
    || normalizeExplainabilityString(blockedData.authorityAgentId)
    || normalizeExplainabilityString(handoffEdgeMetadata.authorityAgentId)
    || normalizeExplainabilityString(handoffData.authorityAgentId)
    || (blockedAction ? String(blockedAction.objectId) : undefined)
    || (fallbackAction ? String(fallbackAction.objectId) : undefined)
    || args.authorityAgentId
    || null;

  const speakerAgentId =
    normalizeExplainabilityString(messageProcessedData.speakerAgentId)
    || normalizeExplainabilityString(handoffEdgeMetadata.activeAgentId)
    || normalizeExplainabilityString(handoffData.activeAgentId)
    || args.sessionTeamState?.activeAgentId
    || authorityAgentId;

  let outcome: DelegationExplainabilityTrace["outcome"];
  if (blockedAction) {
    const fallbackReasonCode = normalizeExplainabilityString(fallbackContract.reasonCode);
    const fallbackReason = normalizeExplainabilityString(fallbackContract.reason);
    const gap = normalizeExplainabilityActionData(blockedData.gap);
    const gapReasonCode = normalizeExplainabilityString(gap.reasonCode);
    outcome = {
      status: "blocked",
      reasonCode: fallbackReasonCode || gapReasonCode || "required_scope_contract_blocked",
      reason:
        fallbackReason
        || normalizeExplainabilityString(gap.reason)
        || "Required-scope contract blocked without explicit fallback resolution.",
      source: "required_scope_contract_blocked",
    };
  } else if (messageProcessed) {
    const messageFallback = normalizeExplainabilityActionData(
      normalizeExplainabilityActionData(messageProcessedData.toolScoping).requiredScopeFallback
    );
    const messageFallbackReasonCode = normalizeExplainabilityString(messageFallback.reasonCode);
    const messageFallbackReason = normalizeExplainabilityString(messageFallback.reason);
    outcome = {
      status: "success",
      reasonCode: messageFallbackReasonCode || "message_processed",
      reason:
        messageFallbackReason
        || "Turn completed and persisted via message_processed trace.",
      source: "message_processed",
    };
  } else {
    const errorMetadata = normalizeExplainabilityActionData(terminalErrorEdge?.metadata);
    const transition = normalizeExplainabilityString(terminalErrorEdge?.transition);
    outcome = {
      status: "error",
      reasonCode: transition || "turn_outcome_unresolved",
      reason:
        normalizeExplainabilityString(errorMetadata.reason)
        || "No success/blocked audit action was found for the requested turn.",
      source: transition ? "execution_edge" : "unresolved",
    };
  }

  const teamAccessMode =
    normalizeExplainabilityString(handoffEdgeMetadata.teamAccessMode)
    || normalizeExplainabilityString(handoffData.teamAccessMode)
    || normalizeExplainabilityString(fallbackContract.teamAccessMode)
    || "unknown";

  return {
    organizationId: args.organizationId,
    sessionId: args.sessionId,
    turnId: args.turnId,
    authority: {
      agentId: authorityAgentId,
      source: messageProcessed
        ? "message_processed.authorityAgentId"
        : blockedAction
          ? "required_scope_contract_blocked.objectId"
          : args.authorityAgentId
            ? "session.authorityAgentId"
            : "unresolved",
    },
    speaker: {
      agentId: speakerAgentId || null,
      source: messageProcessed
        ? "message_processed.speakerAgentId"
        : handoffCompletedEdge
          ? "execution_edge.handoff_completed.activeAgentId"
          : args.sessionTeamState?.activeAgentId
            ? "session.teamSession.activeAgentId"
            : "authority_fallback",
    },
    handoffProvenance: {
      source: handoffCompletedEdge
        ? "execution_edge.handoff_completed"
        : handoffAction
          ? "object_action.team_handoff"
          : "not_available",
      teamAccessMode:
        teamAccessMode === "invisible"
        || teamAccessMode === "direct"
        || teamAccessMode === "meeting"
          ? teamAccessMode
          : "unknown",
      fromAgentId:
        normalizeExplainabilityString(handoffEdgeMetadata.fromAgentId)
        || normalizeExplainabilityString(handoffData.fromAgentId)
        || undefined,
      toAgentId:
        normalizeExplainabilityString(handoffEdgeMetadata.toAgentId)
        || normalizeExplainabilityString(handoffData.toAgentId)
        || normalizeExplainabilityString(fallbackContract.selectedSpecialistId)
        || undefined,
      handoffNumber:
        normalizeExplainabilityNumber(handoffEdgeMetadata.handoffNumber)
        ?? normalizeExplainabilityNumber(handoffData.handoffNumber),
      selectionStrategy:
        normalizeExplainabilityString(handoffEdgeProvenance.selectionStrategy)
        || normalizeExplainabilityString(handoffActionProvenance.selectionStrategy)
        || undefined,
      requestedSpecialistType:
        normalizeExplainabilityString(handoffEdgeProvenance.requestedSpecialistType)
        || normalizeExplainabilityString(handoffActionProvenance.requestedSpecialistType)
        || normalizeExplainabilityString(fallbackContract.requestedSpecialistType)
        || undefined,
      matchedBy:
        normalizeExplainabilityString(handoffEdgeProvenance.matchedBy)
        || normalizeExplainabilityString(handoffActionProvenance.matchedBy)
        || undefined,
      candidateCount:
        normalizeExplainabilityNumber(handoffEdgeProvenance.candidateCount)
        ?? normalizeExplainabilityNumber(handoffActionProvenance.candidateCount),
      catalogSize:
        normalizeExplainabilityNumber(handoffEdgeProvenance.catalogSize)
        ?? normalizeExplainabilityNumber(handoffActionProvenance.catalogSize),
    },
    outcome,
    trace: {
      actionIds: scopedActions.map((action) => String(action._id)),
      edgeIds: scopedEdges.map((edge) => String(edge._id)),
      actionCount: scopedActions.length,
      edgeCount: scopedEdges.length,
    },
  };
}

/**
 * Inspect deterministic delegation explainability chain for one turn.
 * Reconstructs authority -> speaker -> handoff provenance -> outcome from existing traces.
 */
export const getDelegationExplainabilityTrace = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentSessionId: v.id("agentSessions"),
    turnId: v.id("agentTurns"),
    scanLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);
    const session = await ctx.db.get(args.agentSessionId);
    if (!session || session.organizationId !== args.organizationId) {
      return null;
    }

    const turn = await ctx.db.get(args.turnId);
    if (
      !turn
      || turn.organizationId !== args.organizationId
      || turn.sessionId !== args.agentSessionId
    ) {
      return null;
    }

    const clampedScanLimit = Math.min(Math.max(Math.floor(args.scanLimit ?? 750), 100), 4000);
    const sessionObjectIds = new Set<string>();
    sessionObjectIds.add(String(session.agentId));
    sessionObjectIds.add(String(turn.agentId));
    if (session.teamSession?.activeAgentId) {
      sessionObjectIds.add(String(session.teamSession.activeAgentId));
    }
    for (const participantId of session.teamSession?.participatingAgentIds || []) {
      sessionObjectIds.add(String(participantId));
    }
    for (const handoff of session.teamSession?.handoffHistory || []) {
      if (handoff?.fromAgentId) {
        sessionObjectIds.add(String(handoff.fromAgentId));
      }
      if (handoff?.toAgentId) {
        sessionObjectIds.add(String(handoff.toAgentId));
      }
    }

    const [objectScopedActions, executionEdges] =
      await Promise.all([
        Promise.all(
          Array.from(sessionObjectIds).map((objectId) =>
            ctx.db
              .query("objectActions")
              .withIndex("by_object", (q) => q.eq("objectId", objectId as Id<"objects">))
              .order("desc")
              .take(clampedScanLimit)
          )
        ),
        ctx.db
          .query("executionEdges")
          .withIndex("by_session_time", (q) => q.eq("sessionId", args.agentSessionId))
          .order("desc")
          .take(clampedScanLimit),
      ]);

    const actionMap = new Map<string, DelegationExplainabilityActionRecord>();
    for (const action of objectScopedActions.flat()) {
      const actionType = action.actionType;
      if (!DELEGATION_EXPLAINABILITY_ACTION_TYPES.has(actionType)) {
        continue;
      }
      if (action.organizationId !== args.organizationId) {
        continue;
      }
      const actionId = String(action._id);
      if (actionMap.has(actionId)) {
        continue;
      }
      actionMap.set(actionId, {
        _id: actionId,
        organizationId: String(action.organizationId),
        objectId: String(action.objectId),
        actionType,
        performedAt: action.performedAt,
        actionData: normalizeExplainabilityActionData(action.actionData),
      });
    }
    const actions: DelegationExplainabilityActionRecord[] = Array.from(actionMap.values());

    const edges: DelegationExplainabilityExecutionEdgeRecord[] = executionEdges.map((edge) => ({
      _id: String(edge._id),
      organizationId: String(edge.organizationId),
      sessionId: String(edge.sessionId),
      turnId: String(edge.turnId),
      transition: edge.transition,
      occurredAt: edge.occurredAt,
      edgeOrdinal:
        typeof edge.edgeOrdinal === "number" && Number.isFinite(edge.edgeOrdinal)
          ? edge.edgeOrdinal
          : undefined,
      metadata: normalizeExplainabilityActionData(edge.metadata),
    }));

    return buildDelegationExplainabilityTrace({
      organizationId: String(args.organizationId),
      sessionId: String(args.agentSessionId),
      turnId: String(args.turnId),
      authorityAgentId: String(session.agentId),
      sessionTeamState: {
        activeAgentId: normalizeExplainabilityString(session.teamSession?.activeAgentId),
      },
      actions,
      executionEdges: edges,
    });
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

    const limit = resolveMessageHistoryLimit(args.limit, 50);
    const messages = await ctx.db
      .query("agentSessionMessages")
      .withIndex("by_session_timestamp", (q) => q.eq("sessionId", args.agentSessionId))
      .order("desc")
      .take(limit);

    return messages.reverse();
  },
});

export interface OperatorCollaborationSpecialistSurface {
  agentId: string;
  displayName: string;
  dmThreadId: string;
  roleLabel: "specialist" | "active_specialist";
  visibilityScope: "operator_orchestrator_specialist";
  active: boolean;
}

export interface OperatorCollaborationSyncCheckpointState {
  status: "issued" | "resumed" | "aborted" | "expired";
  tokenId: string;
  token: string;
  lineageId: string;
  dmThreadId: string;
  groupThreadId: string;
  issuedForEventId: string;
  issuedAt: number;
  expiresAt: number;
  abortReason?: string;
}

export interface OperatorCollaborationContextPayload {
  threadId: string;
  sessionId: string;
  groupThreadId: string;
  lineageId: string;
  orchestratorAgentId: string;
  orchestratorLabel: string;
  activeSpecialistAgentId?: string;
  specialists: OperatorCollaborationSpecialistSurface[];
  syncCheckpoint?: OperatorCollaborationSyncCheckpointState;
}

/**
 * Resolve deterministic operator collaboration context for the desktop AI chat surface.
 * Uses conversation ownership + desktop channel route identity to locate the active thread.
 */
export const getOperatorCollaborationContext = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    conversationId: v.id("aiConversations"),
  },
  handler: async (ctx, args): Promise<OperatorCollaborationContextPayload | null> => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return null;
    }
    if (conversation.organizationId !== args.organizationId) {
      return null;
    }
    if (conversation.userId !== auth.userId) {
      return null;
    }

    const externalContactIdentifier = `desktop:${auth.userId}:${args.conversationId}`;
    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_org_channel_contact", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("channel", "desktop")
          .eq("externalContactIdentifier", externalContactIdentifier)
      )
      .collect();

    if (sessions.length === 0) {
      return null;
    }

    const orderedSessions = [...sessions].sort((a, b) => {
      const aActive = a.status === "active" ? 1 : 0;
      const bActive = b.status === "active" ? 1 : 0;
      if (aActive !== bActive) {
        return bActive - aActive;
      }
      const aUpdated = Math.max(a.lastMessageAt || 0, a.startedAt || 0);
      const bUpdated = Math.max(b.lastMessageAt || 0, b.startedAt || 0);
      if (aUpdated !== bUpdated) {
        return bUpdated - aUpdated;
      }
      return String(b._id).localeCompare(String(a._id));
    });
    const thread = orderedSessions[0];
    const threadRecord = thread as unknown as Record<string, unknown>;
    const collaborationRecord =
      threadRecord.collaboration && typeof threadRecord.collaboration === "object"
        ? (threadRecord.collaboration as Record<string, unknown>)
        : undefined;
    const kernelRecord =
      collaborationRecord?.kernel && typeof collaborationRecord.kernel === "object"
        ? (collaborationRecord.kernel as Record<string, unknown>)
        : undefined;

    const groupThreadId =
      normalizeControlCenterTraceString(kernelRecord?.groupThreadId)
      || normalizeControlCenterTraceString(kernelRecord?.threadId)
      || `group_thread:${args.conversationId}`;
    const lineageId =
      normalizeControlCenterTraceString(kernelRecord?.lineageId)
      || `desktop_lineage:${args.organizationId}:${args.conversationId}`;

    const orchestratorAgentId = String(thread.agentId);
    const activeAgentId = thread.teamSession?.activeAgentId
      ? String(thread.teamSession.activeAgentId)
      : orchestratorAgentId;
    const activeSpecialistAgentId =
      activeAgentId !== orchestratorAgentId ? activeAgentId : undefined;

    const instanceAgentIds = new Set<string>();
    instanceAgentIds.add(orchestratorAgentId);
    if (thread.teamSession?.activeAgentId) {
      instanceAgentIds.add(String(thread.teamSession.activeAgentId));
    }
    for (const participantId of thread.teamSession?.participatingAgentIds || []) {
      instanceAgentIds.add(String(participantId));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentMap = new Map<string, any>();
    await Promise.all(
      Array.from(instanceAgentIds).map(async (instanceAgentId) => {
        const agent = await ctx.db.get(instanceAgentId as Id<"objects">);
        if (agent) {
          agentMap.set(instanceAgentId, agent);
        }
      })
    );

    const specialists: OperatorCollaborationSpecialistSurface[] = Array.from(instanceAgentIds)
      .filter((instanceAgentId) => instanceAgentId !== orchestratorAgentId)
      .map((instanceAgentId) => {
        const displayName =
          readAgentDisplayName(agentMap.get(instanceAgentId))
          || instanceAgentId;
        const active = instanceAgentId === activeSpecialistAgentId;
        const roleLabel: OperatorCollaborationSpecialistSurface["roleLabel"] = active
          ? "active_specialist"
          : "specialist";
        const visibilityScope: OperatorCollaborationSpecialistSurface["visibilityScope"] =
          "operator_orchestrator_specialist";
        return {
          agentId: instanceAgentId,
          displayName,
          dmThreadId: `dm_thread:${args.conversationId}:${instanceAgentId}`,
          roleLabel,
          visibilityScope,
          active,
        };
      })
      .sort((a, b) => {
        if (a.active !== b.active) {
          return a.active ? -1 : 1;
        }
        if (a.displayName !== b.displayName) {
          return a.displayName.localeCompare(b.displayName);
        }
        return a.agentId.localeCompare(b.agentId);
      });

    const syncCheckpoint = normalizeCollaborationSyncCheckpointContract(
      collaborationRecord?.syncCheckpoint
    );
    const syncCheckpointState: OperatorCollaborationSyncCheckpointState | undefined =
      syncCheckpoint
        ? {
            status: syncCheckpoint.status,
            tokenId: syncCheckpoint.tokenId,
            token: syncCheckpoint.token,
            lineageId: syncCheckpoint.lineageId,
            dmThreadId: syncCheckpoint.dmThreadId,
            groupThreadId: syncCheckpoint.groupThreadId,
            issuedForEventId: syncCheckpoint.issuedForEventId,
            issuedAt: syncCheckpoint.issuedAt,
            expiresAt: syncCheckpoint.expiresAt,
            abortReason: syncCheckpoint.abortReason,
          }
        : undefined;

    return {
      threadId: String(thread._id),
      sessionId: String(thread._id),
      groupThreadId,
      lineageId,
      orchestratorAgentId,
      orchestratorLabel:
        readAgentDisplayName(agentMap.get(orchestratorAgentId))
        || "Orchestrator",
      activeSpecialistAgentId,
      specialists,
      syncCheckpoint: syncCheckpointState,
    };
  },
});

/**
 * Explicit operator action for DM-to-group summary sync.
 * Uses deterministic sync attempt IDs in the bridge when caller omits one.
 */
export const getOperatorCollaborationSyncThread = internalQuery({
  args: {
    threadId: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId as Id<"agentSessions">);
    if (!thread || thread.organizationId !== args.organizationId) {
      return null;
    }

    const expectedContactPrefix = `desktop:${args.userId}:`;
    if (!thread.externalContactIdentifier.startsWith(expectedContactPrefix)) {
      return null;
    }

    const threadRecord = thread as unknown as Record<string, unknown>;
    const collaborationRecord =
      threadRecord.collaboration && typeof threadRecord.collaboration === "object"
        ? (threadRecord.collaboration as Record<string, unknown>)
        : undefined;
    const persistedCheckpoint = normalizeCollaborationSyncCheckpointContract(
      collaborationRecord?.syncCheckpoint
    );

    return {
      threadId: thread._id,
      requestedByAgentId: thread.agentId,
      persistedSyncCheckpointToken: persistedCheckpoint?.token,
    };
  },
});

export const syncOperatorDmSummaryToGroup = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    threadId: v.string(),
    dmThreadId: v.string(),
    summary: v.string(),
    syncCheckpointToken: v.optional(v.string()),
    syncAttemptId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await ctx.runQuery(
      getInternalRef().rbacHelpers.requireAuthenticatedUserQuery,
      { sessionId: args.sessionId }
    ) as { userId: Id<"users"> };

    const syncThread = await ctx.runQuery(
      getInternalRef().ai.agentSessions.getOperatorCollaborationSyncThread,
      {
        threadId: args.threadId,
        organizationId: args.organizationId,
        userId: auth.userId,
      }
    ) as {
      threadId: Id<"agentSessions">;
      requestedByAgentId: Id<"objects">;
      persistedSyncCheckpointToken?: string;
    } | null;

    if (!syncThread) {
      return {
        status: "error",
        message: "Operator collaboration thread not found.",
      };
    }

    const providedSyncToken = normalizeControlCenterTraceString(args.syncCheckpointToken);
    const resolvedSyncToken =
      providedSyncToken
      || syncThread.persistedSyncCheckpointToken
      || "";

    const bridgeResult = await ctx.runAction(
      getInternalRef().ai.teamHarness.syncDmSummaryToGroupBridge,
      {
        sessionId: syncThread.threadId,
        organizationId: args.organizationId,
        requestedByAgentId: syncThread.requestedByAgentId,
        summary: args.summary,
        dmThreadId: args.dmThreadId,
        syncCheckpointToken: resolvedSyncToken,
        syncAttemptId: args.syncAttemptId,
      }
    ) as {
      status?: string;
      message?: string;
      response?: string;
      sessionId?: string;
      turnId?: string;
      syncAttemptId?: string;
    };

    return {
      status: bridgeResult.status || "error",
      message:
        bridgeResult.response
        || bridgeResult.message
        || "DM summary sync request did not return a message.",
      sessionId: bridgeResult.sessionId,
      turnId: bridgeResult.turnId,
      syncAttemptId: bridgeResult.syncAttemptId,
      tokenSource: providedSyncToken
        ? "request"
        : syncThread.persistedSyncCheckpointToken
          ? "session_checkpoint"
          : "missing",
    };
  },
});

export type ControlCenterEscalationUrgency = "low" | "normal" | "high" | null;

export interface ControlCenterThreadRow {
  threadId: string;
  sessionId: string;
  organizationId: string;
  organizationName?: string;
  organizationSlug?: string;
  organizationLayer?: number;
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
  | "ingress"
  | "routing"
  | "execution"
  | "delivery"
  | "proposal"
  | "commit"
  | "tool"
  | "memory"
  | "soul"
  | "operator";

export type ControlCenterTimelineActorType = "agent" | "operator" | "system";

export type ControlCenterEscalationGate = AgentEscalationGate;
export type ControlCenterOperatorTraceScope = "org_owner" | "super_admin";
export type ControlCenterTimelineThreadType =
  | "group_thread"
  | "dm_thread"
  | "session_thread";
export type ControlCenterTimelinePipelineStage =
  | "ingress"
  | "routing"
  | "execution"
  | "delivery";

export interface ControlCenterTimelineEvent {
  eventId: string;
  eventOrdinal: number;
  sessionId: string;
  turnId?: string;
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
  pipelineStage?: ControlCenterTimelinePipelineStage;
  threadType?: ControlCenterTimelineThreadType;
  lineageId?: string;
  groupThreadId?: string;
  dmThreadId?: string;
  workflowKey?: string;
  authorityIntentType?: string;
  correlationId: string;
  visibilityScope: ControlCenterOperatorTraceScope;
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

export interface ControlCenterThreadRouteContext {
  sessionRoutingKey: string;
  routeIdentity?: SessionChannelRouteIdentityRecord;
  routingMetadata?: SessionRoutingMetadataRecord;
}

export interface ControlCenterSelectedAgentContext {
  instanceAgentId: string;
  templateAgentId: string;
  roleLabel: string;
  displayName?: string;
  templateDisplayName?: string;
}

export interface ControlCenterDeliveryContext {
  lifecycleState: AgentLifecycleState;
  deliveryState: ThreadDeliveryState;
}

export interface ControlCenterLatestTurnContext {
  turnId: string;
  state?: string;
  updatedAt?: number;
  transitionPolicyVersion?: string;
  replayInvariantStatus?: string;
}

export interface ControlCenterThreadContext {
  sessionId: string;
  organizationId: string;
  channel: string;
  externalContactIdentifier: string;
  route: ControlCenterThreadRouteContext;
  selectedAgent: ControlCenterSelectedAgentContext;
  delivery: ControlCenterDeliveryContext;
  latestTurn?: ControlCenterLatestTurnContext;
}

export interface ControlCenterThreadDrillDown {
  threadId: string;
  visibilityScope: ControlCenterOperatorTraceScope;
  context: ControlCenterThreadContext;
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

interface ControlCenterTraceContext {
  threadType: ControlCenterTimelineThreadType;
  threadId: string;
  groupThreadId?: string;
  dmThreadId?: string;
  lineageId?: string;
  correlationId?: string;
  authorityIntentType?: string;
}

type TimelineEventDraft =
  Omit<ControlCenterTimelineEvent, "eventOrdinal" | "correlationId" | "visibilityScope"> & {
    correlationId?: string;
    orderingHint?: number;
    sourceIdForCorrelation?: string;
  };

function normalizeControlCenterTraceString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function resolveControlCenterWorkflowKey(value: unknown): string | undefined {
  const normalized = normalizeControlCenterTraceString(value);
  return normalized ? normalized.toLowerCase() : undefined;
}

function resolveControlCenterTimelineKindFromWorkflow(
  workflowKey: string | undefined,
  fallbackKind: ControlCenterTimelineEventKind
): ControlCenterTimelineEventKind {
  if (!workflowKey) {
    return fallbackKind;
  }
  const surface = resolveTrustTimelineSurfaceFromWorkflow(workflowKey);
  if (surface === "proposal") {
    return "proposal";
  }
  if (surface === "commit") {
    return "commit";
  }
  return fallbackKind;
}

function resolveControlCenterPipelineStage(
  kind: ControlCenterTimelineEventKind
): ControlCenterTimelinePipelineStage | undefined {
  if (kind === "ingress") {
    return "ingress";
  }
  if (kind === "routing") {
    return "routing";
  }
  if (kind === "delivery") {
    return "delivery";
  }
  if (kind === "execution" || kind === "proposal" || kind === "commit") {
    return "execution";
  }
  return undefined;
}

function resolveExecutionTransitionPresentation(
  transition: unknown
): {
  kind: ControlCenterTimelineEventKind;
  pipelineStage: ControlCenterTimelinePipelineStage;
  title: string;
} {
  const normalized = normalizeControlCenterTraceString(transition) ?? "unknown_transition";
  if (normalized === "inbound_received") {
    return {
      kind: "ingress",
      pipelineStage: "ingress",
      title: "Ingress Received",
    };
  }
  if (normalized === "turn_enqueued") {
    return {
      kind: "routing",
      pipelineStage: "routing",
      title: "Queued For Runtime",
    };
  }
  if (normalized === "terminal_deliverable_recorded" || normalized === "turn_completed") {
    return {
      kind: "delivery",
      pipelineStage: "delivery",
      title: "Delivery Artifact Recorded",
    };
  }
  if (normalized === "handoff_initiated" || normalized === "handoff_completed") {
    return {
      kind: "handoff",
      pipelineStage: "execution",
      title: `Execution ${humanizeLifecycleToken(normalized)}`,
    };
  }
  if (normalized === "escalation_started" || normalized === "escalation_resolved") {
    return {
      kind: "escalation",
      pipelineStage: "execution",
      title: `Execution ${humanizeLifecycleToken(normalized)}`,
    };
  }
  return {
    kind: "execution",
    pipelineStage: "execution",
    title: `Execution ${humanizeLifecycleToken(normalized)}`,
  };
}

function resolveReceiptStagePresentation(args: {
  status: unknown;
  phase: "accepted" | "processing" | "terminal";
}): {
  kind: ControlCenterTimelineEventKind;
  pipelineStage: ControlCenterTimelinePipelineStage;
  title: string;
} {
  const status = normalizeControlCenterTraceString(args.status) ?? "unknown";
  if (args.phase === "accepted") {
    return {
      kind: "ingress",
      pipelineStage: "ingress",
      title: "Ingress Receipt Accepted",
    };
  }
  if (args.phase === "processing") {
    return {
      kind: "routing",
      pipelineStage: "routing",
      title: "Receipt Routed To Runtime",
    };
  }
  if (status === "completed") {
    return {
      kind: "delivery",
      pipelineStage: "delivery",
      title: "Receipt Completed",
    };
  }
  if (status === "duplicate") {
    return {
      kind: "routing",
      pipelineStage: "routing",
      title: "Duplicate Receipt Collapsed",
    };
  }
  return {
    kind: "execution",
    pipelineStage: "execution",
    title: "Receipt Failed",
  };
}

function resolveControlCenterTraceContext(args: {
  threadRecord: Record<string, unknown>;
  fallbackThreadId: string;
}): ControlCenterTraceContext {
  const collaboration = args.threadRecord.collaboration;
  if (!collaboration || typeof collaboration !== "object") {
    return {
      threadType: "session_thread",
      threadId: args.fallbackThreadId,
    };
  }
  const collaborationRecord = collaboration as Record<string, unknown>;
  const kernel = collaborationRecord.kernel as Record<string, unknown> | undefined;
  const authority = collaborationRecord.authority as Record<string, unknown> | undefined;
  const kernelThreadType = kernel?.threadType;
  const threadType: ControlCenterTimelineThreadType =
    kernelThreadType === "group_thread" || kernelThreadType === "dm_thread"
      ? kernelThreadType
      : "session_thread";

  return {
    threadType,
    threadId: normalizeControlCenterTraceString(kernel?.threadId) ?? args.fallbackThreadId,
    groupThreadId: normalizeControlCenterTraceString(kernel?.groupThreadId),
    dmThreadId: normalizeControlCenterTraceString(kernel?.dmThreadId),
    lineageId: normalizeControlCenterTraceString(kernel?.lineageId),
    correlationId: normalizeControlCenterTraceString(kernel?.correlationId),
    authorityIntentType: normalizeControlCenterTraceString(authority?.intentType),
  };
}

function resolveControlCenterCorrelationId(args: {
  draft: TimelineEventDraft;
  trace: ControlCenterTraceContext;
}): string {
  const surface: TrustTimelineSurface =
    args.draft.kind === "handoff"
      ? "handoff"
      : args.draft.kind === "proposal"
        ? "proposal"
        : args.draft.kind === "commit"
          ? "commit"
          : args.trace.threadType === "group_thread"
            ? "group"
            : args.trace.threadType === "dm_thread"
              ? "dm"
              : "session";

  return buildTrustTimelineCorrelationId({
    lineageId: args.trace.lineageId,
    threadId: args.trace.threadId,
    fallbackThreadId: args.draft.threadId,
    correlationId: args.draft.correlationId ?? args.trace.correlationId,
    surface,
    sourceId: args.draft.sourceIdForCorrelation ?? args.draft.eventId,
  });
}

function applyControlCenterTimelineOrdering(args: {
  drafts: TimelineEventDraft[];
  trace: ControlCenterTraceContext;
  visibilityScope: ControlCenterOperatorTraceScope;
  limit: number;
}): ControlCenterTimelineEvent[] {
  const ascending = [...args.drafts].sort((a, b) => {
    if (a.occurredAt !== b.occurredAt) {
      return a.occurredAt - b.occurredAt;
    }
    const aOrderingHint = a.orderingHint ?? 0;
    const bOrderingHint = b.orderingHint ?? 0;
    if (aOrderingHint !== bOrderingHint) {
      return aOrderingHint - bOrderingHint;
    }
    return a.eventId.localeCompare(b.eventId);
  });

  const withOrdinals = ascending.map((draft, index): ControlCenterTimelineEvent => {
    const workflowKey = resolveControlCenterWorkflowKey(draft.workflowKey);
    const resolvedKind = resolveControlCenterTimelineKindFromWorkflow(
      workflowKey,
      draft.kind
    );
    const correlationId = resolveControlCenterCorrelationId({
      draft: {
        ...draft,
        kind: resolvedKind,
      },
      trace: args.trace,
    });
    return {
      ...draft,
      kind: resolvedKind,
      workflowKey,
      pipelineStage: draft.pipelineStage ?? resolveControlCenterPipelineStage(resolvedKind),
      eventOrdinal: index + 1,
      correlationId,
      visibilityScope: args.visibilityScope,
      threadType: draft.threadType ?? args.trace.threadType,
      lineageId: draft.lineageId ?? args.trace.lineageId,
      groupThreadId: draft.groupThreadId ?? args.trace.groupThreadId,
      dmThreadId: draft.dmThreadId ?? args.trace.dmThreadId,
      authorityIntentType:
        draft.authorityIntentType ?? args.trace.authorityIntentType,
    };
  });

  return withOrdinals
    .sort((a, b) => b.eventOrdinal - a.eventOrdinal)
    .slice(0, args.limit);
}

function roleScopedTimelineMetadata(args: {
  visibilityScope: ControlCenterOperatorTraceScope;
  base?: Record<string, unknown>;
  superAdminDebug?: Record<string, unknown>;
}): Record<string, unknown> | undefined {
  const base = args.base ? { ...args.base } : {};
  if (args.visibilityScope === "super_admin" && args.superAdminDebug) {
    return {
      ...base,
      debug: args.superAdminDebug,
    };
  }
  return Object.keys(base).length > 0 ? base : undefined;
}

async function resolveControlCenterTraceAccess(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  sessionId: string;
  organizationId: Id<"organizations">;
}): Promise<ControlCenterOperatorTraceScope> {
  const auth = await requireAuthenticatedUser(args.ctx, args.sessionId);
  const userContext = await getUserContext(
    args.ctx,
    auth.userId,
    args.organizationId
  );
  return userContext.isGlobal && userContext.roleName === "super_admin"
    ? "super_admin"
    : "org_owner";
}

interface AgentOpsScopedAccess {
  visibilityScope: ControlCenterOperatorTraceScope;
  scope: Scope;
  scopeOrganizationId: Id<"organizations">;
  scopedOrgs: ScopedOrg[];
}

async function resolveAgentOpsScopedAccess(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  sessionId: string;
  organizationId: Id<"organizations">;
  requestedScope?: Scope;
  requestedScopeOrganizationId?: Id<"organizations">;
}): Promise<AgentOpsScopedAccess> {
  const auth = await requireAuthenticatedUser(args.ctx, args.sessionId);
  const userContext = await getUserContext(
    args.ctx,
    auth.userId,
    args.organizationId
  );
  const isSuperAdmin =
    userContext.isGlobal && userContext.roleName === "super_admin";
  const visibilityScope: ControlCenterOperatorTraceScope = isSuperAdmin
    ? "super_admin"
    : "org_owner";
  const target = resolveScopedOrgTarget({
    viewerOrganizationId: args.organizationId,
    requestedScope: args.requestedScope,
    requestedScopeOrganizationId: args.requestedScopeOrganizationId,
    allowCrossOrg: isSuperAdmin,
  });
  const scopedOrgs = await getOrgIdsForScope(
    args.ctx.db,
    target.scopeOrganizationId,
    target.scope
  );
  return {
    visibilityScope,
    scope: target.scope,
    scopeOrganizationId: target.scopeOrganizationId,
    scopedOrgs,
  };
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

export interface AgentOpsScopeOption {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  layer: 2 | 3;
  hasChildren: boolean;
}

export interface AgentOpsScopeOptionsPayload {
  visibilityScope: ControlCenterOperatorTraceScope;
  canCrossOrg: boolean;
  defaultOrganizationId: string;
  organizations: AgentOpsScopeOption[];
}

export const getAgentOpsScopeOptions = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<AgentOpsScopeOptionsPayload> => {
    const scopedAccess = await resolveAgentOpsScopedAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      requestedScope: "org",
    });

    if (scopedAccess.visibilityScope !== "super_admin") {
      const org = await ctx.db.get(args.organizationId);
      return {
        visibilityScope: scopedAccess.visibilityScope,
        canCrossOrg: false,
        defaultOrganizationId: String(args.organizationId),
        organizations: [
          {
            organizationId: String(args.organizationId),
            organizationName: org?.name || "Current organization",
            organizationSlug: org?.slug || "",
            layer: org ? determineOrgLayer(org) : 2,
            hasChildren: false,
          },
        ],
      };
    }

    const organizations = filterVisibleOrdinaryOrganizations(
      (await ctx.db.query("organizations").collect())
        .filter((organization) => organization.isActive !== false)
    );
    const parentOrgIds = new Set(
      organizations
        .filter((organization) => Boolean(organization.parentOrganizationId))
        .map((organization) => String(organization.parentOrganizationId))
    );

    return {
      visibilityScope: scopedAccess.visibilityScope,
      canCrossOrg: true,
      defaultOrganizationId: String(args.organizationId),
      organizations: organizations
        .map((organization) => ({
          organizationId: String(organization._id),
          organizationName: organization.name || "Unknown organization",
          organizationSlug: organization.slug || "",
          layer: determineOrgLayer(organization),
          hasChildren: parentOrgIds.has(String(organization._id)),
        }))
        .sort((a, b) =>
          a.organizationName.localeCompare(b.organizationName, undefined, {
            sensitivity: "base",
          })
        ),
    };
  },
});

export type AgentOpsIncidentState =
  | "open"
  | "acknowledged"
  | "mitigated"
  | "closed";

export type AgentOpsIncidentSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low";

export type AgentOpsIncidentMetricKey = AgentOpsAlertMetricKey | "manual";

export interface AgentOpsThresholdSnapshot {
  metric: AgentOpsAlertMetricKey;
  ruleId: string;
  displayName: string;
  description: string;
  windowHours: number;
  observedValue: number;
  warningThreshold: number;
  criticalThreshold: number;
  thresholdValue: number | null;
  severity: AgentOpsAlertSeverity;
  sampleSize: number;
  rollbackCriteria: string;
  escalationOwner: "runtime_oncall" | "ops_owner" | "platform_admin";
}

export interface AgentOpsIncidentLogEntry {
  at: number;
  actorUserId: string;
  note: string;
}

export interface AgentOpsClosureEvidence {
  summary: string;
  references: string[];
  closedByUserId: string;
  closedAt: number;
}

export interface AgentOpsIncidentSummary {
  incidentId: string;
  title: string;
  description?: string;
  organizationId: string;
  scopeOrganizationId: string;
  scopeOrganizationName?: string;
  scope: Scope;
  metric: AgentOpsIncidentMetricKey;
  ruleId?: string;
  state: AgentOpsIncidentState;
  severity: AgentOpsIncidentSeverity;
  ownerUserId?: string;
  openedAt: number;
  acknowledgedAt?: number;
  mitigatedAt?: number;
  closedAt?: number;
  mitigationLog: AgentOpsIncidentLogEntry[];
  closureEvidence?: AgentOpsClosureEvidence;
  thresholdSnapshot?: AgentOpsThresholdSnapshot;
  updatedAt: number;
}

export interface AgentOpsIncidentWorkspace {
  visibilityScope: ControlCenterOperatorTraceScope;
  scope: Scope;
  scopeOrganizationId: string;
  scopeOrganizationName: string;
  thresholds: AgentOpsThresholdSnapshot[];
  incidents: AgentOpsIncidentSummary[];
}

const AGENT_OPS_INCIDENT_OBJECT_TYPE = "agent_ops_incident";
const AGENT_OPS_INCIDENT_VERSION = "agent_ops_incident_v1";

function normalizeAgentOpsIncidentState(value: unknown): AgentOpsIncidentState {
  if (
    value === "open"
    || value === "acknowledged"
    || value === "mitigated"
    || value === "closed"
  ) {
    return value;
  }
  return "open";
}

function normalizeAgentOpsIncidentSeverity(
  value: unknown
): AgentOpsIncidentSeverity {
  if (
    value === "critical"
    || value === "high"
    || value === "medium"
    || value === "low"
  ) {
    return value;
  }
  return "medium";
}

function normalizeAgentOpsIncidentMetric(
  value: unknown
): AgentOpsIncidentMetricKey {
  if (
    value === "fallback_spike"
    || value === "tool_failure_spike"
    || value === "ingress_failure_spike"
    || value === "manual"
  ) {
    return value;
  }
  return "manual";
}

function normalizeIncidentScope(value: unknown): Scope {
  return value === "layer" ? "layer" : "org";
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0
    )
    .map((entry) => entry.trim());
}

function readAgentOpsIncidentLog(
  value: unknown
): AgentOpsIncidentLogEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === "object"
    )
    .map((entry) => ({
      at: typeof entry.at === "number" ? entry.at : 0,
      actorUserId:
        typeof entry.actorUserId === "string" ? entry.actorUserId : "unknown",
      note: typeof entry.note === "string" ? entry.note : "",
    }))
    .filter((entry) => entry.at > 0 && entry.note.length > 0);
}

function mapAgentOpsAlertSeverityToIncident(
  severity: AgentOpsAlertSeverity
): AgentOpsIncidentSeverity {
  if (severity === "critical") {
    return "critical";
  }
  if (severity === "warning") {
    return "high";
  }
  return "low";
}

function computeIngressFailureRate(args: {
  statuses: string[];
}): {
  failureRate: number;
  sampleSize: number;
} {
  const sampleSize = args.statuses.length;
  if (sampleSize === 0) {
    return {
      failureRate: 0,
      sampleSize: 0,
    };
  }
  const failed = args.statuses.filter((status) => status === "error").length;
  return {
    failureRate: Number((failed / sampleSize).toFixed(4)),
    sampleSize,
  };
}

async function evaluateAgentOpsThresholdSnapshots(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  scopedOrgs: ScopedOrg[];
}): Promise<AgentOpsThresholdSnapshot[]> {
  const now = Date.now();
  const thresholdDefs = AGENT_OPS_ALERT_THRESHOLD_DEFINITIONS;
  const maxWindowHours = Math.max(
    ...Object.values(thresholdDefs).map((definition) => definition.windowHours)
  );
  const maxWindowSince = now - maxWindowHours * 60 * 60 * 1000;

  const modelFallbackRecords: AgentActionTelemetryRecord[] = [];
  const timedToolResultRecords: Array<AgentToolResultRecord & { performedAt: number }> = [];
  const webhookStatusRecords: Array<{ processedAt: number; status: string }> = [];

  for (const scopedOrg of args.scopedOrgs) {
    const [messageProcessedActions, webhookEvents] = await Promise.all([
      args.ctx.db
        .query("objectActions")
        .withIndex("by_org_action_type", (q: any) =>
          q.eq("organizationId", scopedOrg.orgId).eq("actionType", "message_processed")
        )
        .collect(),
      args.ctx.db
        .query("objects")
        .withIndex("by_org_type", (q: any) =>
          q.eq("organizationId", scopedOrg.orgId).eq("type", "webhook_event")
        )
        .collect(),
    ]);

    for (const action of messageProcessedActions) {
      if (action.performedAt < maxWindowSince) {
        continue;
      }
      const actionData = (action.actionData || {}) as Record<string, unknown>;
      modelFallbackRecords.push({
        performedAt: action.performedAt,
        modelResolution: actionData.modelResolution as
          | AgentModelResolutionTelemetry
          | undefined,
      });
      const toolResults = Array.isArray(actionData.toolResults)
        ? actionData.toolResults
        : [];
      for (const toolResult of toolResults) {
        if (!toolResult || typeof toolResult !== "object") {
          timedToolResultRecords.push({
            performedAt: action.performedAt,
          });
          continue;
        }
        const toolResultRecord = toolResult as Record<string, unknown>;
        timedToolResultRecords.push({
          performedAt: action.performedAt,
          status:
            typeof toolResultRecord.status === "string"
              ? toolResultRecord.status
              : undefined,
          tool:
            typeof toolResultRecord.tool === "string"
              ? toolResultRecord.tool
              : undefined,
        });
      }
    }

    for (const webhook of webhookEvents) {
      const props = (webhook.customProperties || {}) as Record<string, unknown>;
      const processedAt =
        (typeof props.processedAt === "number" ? props.processedAt : 0)
        || webhook.createdAt
        || webhook._creationTime
        || 0;
      if (processedAt < maxWindowSince) {
        continue;
      }
      const eventStatus = typeof props.eventStatus === "string"
        ? props.eventStatus.trim().toLowerCase()
        : "";
      webhookStatusRecords.push({
        processedAt,
        status: eventStatus,
      });
    }
  }

  const snapshots: AgentOpsThresholdSnapshot[] = [];
  for (const [metric, definition] of Object.entries(thresholdDefs) as Array<
    [AgentOpsAlertMetricKey, typeof thresholdDefs[AgentOpsAlertMetricKey]]
  >) {
    const since = now - definition.windowHours * 60 * 60 * 1000;
    if (metric === "fallback_spike") {
      const scopedRecords = modelFallbackRecords.filter(
        (record) => record.performedAt >= since
      );
      const aggregation = aggregateAgentModelFallback(scopedRecords, {
        windowHours: definition.windowHours,
        since,
      });
      const evaluation = evaluateAgentOpsAlertThreshold(
        metric,
        aggregation.fallbackRate
      );
      snapshots.push({
        metric,
        ruleId: definition.ruleId,
        displayName: definition.displayName,
        description: definition.description,
        windowHours: definition.windowHours,
        observedValue: aggregation.fallbackRate,
        warningThreshold: definition.warningThreshold,
        criticalThreshold: definition.criticalThreshold,
        thresholdValue: evaluation.thresholdValue,
        severity: evaluation.severity,
        sampleSize: aggregation.actionsWithModelResolution,
        rollbackCriteria: definition.rollbackCriteria,
        escalationOwner: definition.escalationOwner,
      });
      continue;
    }

    if (metric === "tool_failure_spike") {
      const scopedResults = timedToolResultRecords
        .filter((record) => record.performedAt >= since)
        .map((record) => ({
          tool: record.tool,
          status: record.status,
        }));
      const aggregation = aggregateAgentToolSuccessFailure(scopedResults, {
        windowHours: definition.windowHours,
        since,
      });
      const evaluation = evaluateAgentOpsAlertThreshold(
        metric,
        aggregation.failureRate
      );
      snapshots.push({
        metric,
        ruleId: definition.ruleId,
        displayName: definition.displayName,
        description: definition.description,
        windowHours: definition.windowHours,
        observedValue: aggregation.failureRate,
        warningThreshold: definition.warningThreshold,
        criticalThreshold: definition.criticalThreshold,
        thresholdValue: evaluation.thresholdValue,
        severity: evaluation.severity,
        sampleSize: aggregation.successCount + aggregation.failureCount,
        rollbackCriteria: definition.rollbackCriteria,
        escalationOwner: definition.escalationOwner,
      });
      continue;
    }

    const statuses = webhookStatusRecords
      .filter((record) => record.processedAt >= since)
      .map((record) => record.status);
    const ingressAggregation = computeIngressFailureRate({ statuses });
    const evaluation = evaluateAgentOpsAlertThreshold(
      metric,
      ingressAggregation.failureRate
    );
    snapshots.push({
      metric,
      ruleId: definition.ruleId,
      displayName: definition.displayName,
      description: definition.description,
      windowHours: definition.windowHours,
      observedValue: ingressAggregation.failureRate,
      warningThreshold: definition.warningThreshold,
      criticalThreshold: definition.criticalThreshold,
      thresholdValue: evaluation.thresholdValue,
      severity: evaluation.severity,
      sampleSize: ingressAggregation.sampleSize,
      rollbackCriteria: definition.rollbackCriteria,
      escalationOwner: definition.escalationOwner,
    });
  }

  return snapshots;
}

function mapAgentOpsIncidentObject(
  incidentObject: {
    _id: Id<"objects">;
    organizationId: Id<"organizations">;
    name: string;
    description?: string;
    status: string;
    updatedAt: number;
    customProperties?: Record<string, unknown>;
  }
): AgentOpsIncidentSummary {
  const customProperties = (incidentObject.customProperties || {}) as Record<string, unknown>;
  const scope = normalizeIncidentScope(customProperties.scope);
  const openedAt = typeof customProperties.openedAt === "number"
    ? customProperties.openedAt
    : incidentObject.updatedAt;
  const acknowledgedAt = typeof customProperties.acknowledgedAt === "number"
    ? customProperties.acknowledgedAt
    : undefined;
  const mitigatedAt = typeof customProperties.mitigatedAt === "number"
    ? customProperties.mitigatedAt
    : undefined;
  const closedAt = typeof customProperties.closedAt === "number"
    ? customProperties.closedAt
    : undefined;

  const closureEvidenceRecord =
    customProperties.closureEvidence && typeof customProperties.closureEvidence === "object"
      ? (customProperties.closureEvidence as Record<string, unknown>)
      : undefined;
  const thresholdRecord =
    customProperties.thresholdSnapshot && typeof customProperties.thresholdSnapshot === "object"
      ? (customProperties.thresholdSnapshot as Record<string, unknown>)
      : undefined;

  return {
    incidentId: String(incidentObject._id),
    title: incidentObject.name || "Agent Ops Incident",
    description: incidentObject.description,
    organizationId: String(incidentObject.organizationId),
    scopeOrganizationId:
      typeof customProperties.scopeOrganizationId === "string"
        ? customProperties.scopeOrganizationId
        : String(incidentObject.organizationId),
    scopeOrganizationName:
      typeof customProperties.scopeOrganizationName === "string"
        ? customProperties.scopeOrganizationName
        : undefined,
    scope,
    metric: normalizeAgentOpsIncidentMetric(customProperties.metric),
    ruleId:
      typeof customProperties.ruleId === "string"
        ? customProperties.ruleId
        : undefined,
    state: normalizeAgentOpsIncidentState(incidentObject.status),
    severity: normalizeAgentOpsIncidentSeverity(customProperties.severity),
    ownerUserId:
      typeof customProperties.ownerUserId === "string"
        ? customProperties.ownerUserId
        : undefined,
    openedAt,
    acknowledgedAt,
    mitigatedAt,
    closedAt,
    mitigationLog: readAgentOpsIncidentLog(customProperties.mitigationLog),
    closureEvidence: closureEvidenceRecord
      ? {
          summary:
            typeof closureEvidenceRecord.summary === "string"
              ? closureEvidenceRecord.summary
              : "",
          references: readStringArray(closureEvidenceRecord.references),
          closedByUserId:
            typeof closureEvidenceRecord.closedByUserId === "string"
              ? closureEvidenceRecord.closedByUserId
              : "unknown",
          closedAt:
            typeof closureEvidenceRecord.closedAt === "number"
              ? closureEvidenceRecord.closedAt
              : closedAt || openedAt,
        }
      : undefined,
    thresholdSnapshot: thresholdRecord
      ? {
          metric: normalizeAgentOpsIncidentMetric(thresholdRecord.metric) as AgentOpsAlertMetricKey,
          ruleId:
            typeof thresholdRecord.ruleId === "string"
              ? thresholdRecord.ruleId
              : "unknown",
          displayName:
            typeof thresholdRecord.displayName === "string"
              ? thresholdRecord.displayName
              : "Unknown metric",
          description:
            typeof thresholdRecord.description === "string"
              ? thresholdRecord.description
              : "",
          windowHours:
            typeof thresholdRecord.windowHours === "number"
              ? thresholdRecord.windowHours
              : 24,
          observedValue:
            typeof thresholdRecord.observedValue === "number"
              ? thresholdRecord.observedValue
              : 0,
          warningThreshold:
            typeof thresholdRecord.warningThreshold === "number"
              ? thresholdRecord.warningThreshold
              : 0,
          criticalThreshold:
            typeof thresholdRecord.criticalThreshold === "number"
              ? thresholdRecord.criticalThreshold
              : 0,
          thresholdValue:
            typeof thresholdRecord.thresholdValue === "number"
              ? thresholdRecord.thresholdValue
              : null,
          severity:
            thresholdRecord.severity === "critical"
            || thresholdRecord.severity === "warning"
            || thresholdRecord.severity === "ok"
              ? thresholdRecord.severity
              : "ok",
          sampleSize:
            typeof thresholdRecord.sampleSize === "number"
              ? thresholdRecord.sampleSize
              : 0,
          rollbackCriteria:
            typeof thresholdRecord.rollbackCriteria === "string"
              ? thresholdRecord.rollbackCriteria
              : "",
          escalationOwner:
            thresholdRecord.escalationOwner === "runtime_oncall"
            || thresholdRecord.escalationOwner === "ops_owner"
            || thresholdRecord.escalationOwner === "platform_admin"
              ? thresholdRecord.escalationOwner
              : "ops_owner",
        }
      : undefined,
    updatedAt: incidentObject.updatedAt,
  };
}

async function loadAgentOpsIncidentsForScope(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  scope: Scope;
  scopeOrganizationId: Id<"organizations">;
}): Promise<AgentOpsIncidentSummary[]> {
  const incidents = await args.ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q
        .eq("organizationId", args.scopeOrganizationId)
        .eq("type", AGENT_OPS_INCIDENT_OBJECT_TYPE)
    )
    .collect();

  return incidents
    .filter((incident: any) => {
      const customProperties = (incident.customProperties || {}) as Record<string, unknown>;
      const incidentScope = normalizeIncidentScope(customProperties.scope);
      const incidentScopeOrgId =
        typeof customProperties.scopeOrganizationId === "string"
          ? customProperties.scopeOrganizationId
          : String(incident.organizationId);
      return (
        incidentScope === args.scope
        && incidentScopeOrgId === String(args.scopeOrganizationId)
      );
    })
    .map((incident: any) =>
      mapAgentOpsIncidentObject({
        _id: incident._id,
        organizationId: incident.organizationId,
        name: incident.name,
        description: incident.description,
        status: incident.status,
        updatedAt: incident.updatedAt,
        customProperties: incident.customProperties as Record<string, unknown> | undefined,
      })
    )
    .sort((a: AgentOpsIncidentSummary, b: AgentOpsIncidentSummary) => b.updatedAt - a.updatedAt);
}

export const getAgentOpsIncidentWorkspace = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    scope: v.optional(v.union(v.literal("org"), v.literal("layer"))),
    scopeOrganizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args): Promise<AgentOpsIncidentWorkspace> => {
    const scopedAccess = await resolveAgentOpsScopedAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      requestedScope: args.scope,
      requestedScopeOrganizationId: args.scopeOrganizationId,
    });
    const thresholds = await evaluateAgentOpsThresholdSnapshots({
      ctx,
      scopedOrgs: scopedAccess.scopedOrgs,
    });
    const incidents = await loadAgentOpsIncidentsForScope({
      ctx,
      scope: scopedAccess.scope,
      scopeOrganizationId: scopedAccess.scopeOrganizationId,
    });

    return {
      visibilityScope: scopedAccess.visibilityScope,
      scope: scopedAccess.scope,
      scopeOrganizationId: String(scopedAccess.scopeOrganizationId),
      scopeOrganizationName:
        scopedAccess.scopedOrgs[0]?.orgName || "Unknown organization",
      thresholds,
      incidents,
    };
  },
});

function trimIncidentNote(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const syncAgentOpsThresholdIncidents = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    scope: v.optional(v.union(v.literal("org"), v.literal("layer"))),
    scopeOrganizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const scopedAccess = await resolveAgentOpsScopedAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      requestedScope: args.scope,
      requestedScopeOrganizationId: args.scopeOrganizationId,
    });
    const thresholds = await evaluateAgentOpsThresholdSnapshots({
      ctx,
      scopedOrgs: scopedAccess.scopedOrgs,
    });
    const existingIncidents = await loadAgentOpsIncidentsForScope({
      ctx,
      scope: scopedAccess.scope,
      scopeOrganizationId: scopedAccess.scopeOrganizationId,
    });
    const activeByMetric = new Map<AgentOpsAlertMetricKey, AgentOpsIncidentSummary>();
    for (const incident of existingIncidents) {
      if (
        (incident.state === "open"
          || incident.state === "acknowledged"
          || incident.state === "mitigated")
        && incident.metric !== "manual"
      ) {
        activeByMetric.set(incident.metric, incident);
      }
    }

    const createdIncidentIds: string[] = [];
    const updatedIncidentIds: string[] = [];
    const now = Date.now();

    for (const threshold of thresholds) {
      if (threshold.severity === "ok") {
        continue;
      }

      const existing = activeByMetric.get(threshold.metric);
      if (existing) {
        const incidentId = existing.incidentId as Id<"objects">;
        const incidentObject = await ctx.db.get(incidentId);
        if (!incidentObject) {
          continue;
        }
        const customProperties = (incidentObject.customProperties || {}) as Record<string, unknown>;
        const nextSeverity = mapAgentOpsAlertSeverityToIncident(threshold.severity);
        await ctx.db.patch(incidentId, {
          updatedAt: now,
          customProperties: {
            ...customProperties,
            severity: nextSeverity,
            thresholdSnapshot: threshold,
            updatedByUserId: String(auth.userId),
            incidentVersion: AGENT_OPS_INCIDENT_VERSION,
          },
        });
        await ctx.db.insert("objectActions", {
          organizationId: scopedAccess.scopeOrganizationId,
          objectId: incidentId,
          actionType: "incident.alert_triggered",
          actionData: {
            metric: threshold.metric,
            severity: threshold.severity,
            observedValue: threshold.observedValue,
            thresholdValue: threshold.thresholdValue,
            ruleId: threshold.ruleId,
            scope: scopedAccess.scope,
          },
          performedBy: auth.userId,
          performedAt: now,
        });
        updatedIncidentIds.push(String(incidentId));
        continue;
      }

      const incidentId = await ctx.db.insert("objects", {
        organizationId: scopedAccess.scopeOrganizationId,
        type: AGENT_OPS_INCIDENT_OBJECT_TYPE,
        subtype: "alert_threshold",
        name: `${threshold.displayName} incident`,
        description: `${threshold.description} Escalation rule ${threshold.ruleId}.`,
        status: "open",
        customProperties: {
          incidentVersion: AGENT_OPS_INCIDENT_VERSION,
          metric: threshold.metric,
          ruleId: threshold.ruleId,
          scope: scopedAccess.scope,
          scopeOrganizationId: String(scopedAccess.scopeOrganizationId),
          scopeOrganizationName: scopedAccess.scopedOrgs[0]?.orgName || "Unknown organization",
          scopedOrganizationIds: scopedAccess.scopedOrgs.map((org) => String(org.orgId)),
          severity: mapAgentOpsAlertSeverityToIncident(threshold.severity),
          ownerUserId: null,
          openedAt: now,
          acknowledgedAt: null,
          mitigatedAt: null,
          closedAt: null,
          mitigationLog: [],
          closureEvidence: null,
          thresholdSnapshot: threshold,
          createdByUserId: String(auth.userId),
          updatedByUserId: String(auth.userId),
          stateHistory: [
            {
              state: "open",
              at: now,
              actorUserId: String(auth.userId),
              note: "Opened automatically from threshold breach.",
            },
          ],
        },
        createdBy: auth.userId,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("objectActions", {
        organizationId: scopedAccess.scopeOrganizationId,
        objectId: incidentId,
        actionType: "incident.opened",
        actionData: {
          metric: threshold.metric,
          severity: threshold.severity,
          observedValue: threshold.observedValue,
          thresholdValue: threshold.thresholdValue,
          ruleId: threshold.ruleId,
          scope: scopedAccess.scope,
        },
        performedBy: auth.userId,
        performedAt: now,
      });
      createdIncidentIds.push(String(incidentId));
    }

    return {
      createdIncidentIds,
      updatedIncidentIds,
      thresholds,
    };
  },
});

const INCIDENT_STATE_TRANSITIONS: Record<
  AgentOpsIncidentState,
  AgentOpsIncidentState[]
> = {
  open: ["acknowledged"],
  acknowledged: ["mitigated"],
  mitigated: ["closed"],
  closed: [],
};

export const transitionAgentOpsIncidentState = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    incidentId: v.id("objects"),
    nextState: v.union(
      v.literal("acknowledged"),
      v.literal("mitigated"),
      v.literal("closed")
    ),
    ownerUserId: v.optional(v.string()),
    note: v.optional(v.string()),
    closureSummary: v.optional(v.string()),
    closureEvidenceReferences: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const incident = await ctx.db.get(args.incidentId);
    if (!incident || incident.type !== AGENT_OPS_INCIDENT_OBJECT_TYPE) {
      throw new Error("Agent Ops incident not found.");
    }

    const incidentCustomProps =
      (incident.customProperties || {}) as Record<string, unknown>;
    await resolveAgentOpsScopedAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      requestedScope: normalizeIncidentScope(incidentCustomProps.scope),
      requestedScopeOrganizationId: incident.organizationId,
    });

    const currentState = normalizeAgentOpsIncidentState(incident.status);
    if (!INCIDENT_STATE_TRANSITIONS[currentState].includes(args.nextState)) {
      throw new Error(
        `Invalid incident transition: ${currentState} -> ${args.nextState}.`
      );
    }

    const now = Date.now();
    const history = Array.isArray(incidentCustomProps.stateHistory)
      ? [...incidentCustomProps.stateHistory]
      : [];
    const mitigationLog = readAgentOpsIncidentLog(
      incidentCustomProps.mitigationLog
    );
    const actorUserId = String(auth.userId);

    const note = trimIncidentNote(args.note);
    if (args.nextState === "mitigated" && !note) {
      throw new Error("Mitigated state requires a mitigation note.");
    }
    const closureSummary = trimIncidentNote(args.closureSummary);
    const closureEvidenceReferences = readStringArray(
      args.closureEvidenceReferences
    );
    if (
      args.nextState === "closed"
      && (!closureSummary || closureEvidenceReferences.length === 0)
    ) {
      throw new Error(
        "Closed state requires closure summary and at least one evidence reference."
      );
    }

    const nextCustomProperties: Record<string, unknown> = {
      ...incidentCustomProps,
      incidentVersion: AGENT_OPS_INCIDENT_VERSION,
      updatedByUserId: actorUserId,
      mitigationLog,
      stateHistory: history,
    };

    if (args.nextState === "acknowledged") {
      nextCustomProperties.ownerUserId =
        trimIncidentNote(args.ownerUserId) || actorUserId;
      nextCustomProperties.acknowledgedAt = now;
    } else if (args.nextState === "mitigated") {
      nextCustomProperties.mitigatedAt = now;
      nextCustomProperties.mitigationLog = [
        ...mitigationLog,
        {
          at: now,
          actorUserId,
          note: note as string,
        },
      ];
    } else if (args.nextState === "closed") {
      nextCustomProperties.closedAt = now;
      nextCustomProperties.closureEvidence = {
        summary: closureSummary,
        references: closureEvidenceReferences,
        closedByUserId: actorUserId,
        closedAt: now,
      };
    }

    history.push({
      state: args.nextState,
      at: now,
      actorUserId,
      note:
        args.nextState === "acknowledged"
          ? "Incident acknowledged by operator."
          : args.nextState === "mitigated"
            ? note
            : closureSummary,
    });

    await ctx.db.patch(args.incidentId, {
      status: args.nextState,
      updatedAt: now,
      customProperties: nextCustomProperties,
    });

    await ctx.db.insert("objectActions", {
      organizationId: incident.organizationId,
      objectId: args.incidentId,
      actionType: `incident.${args.nextState}`,
      actionData: {
        previousState: currentState,
        nextState: args.nextState,
        note,
        closureSummary,
        closureEvidenceReferences,
      },
      performedBy: auth.userId,
      performedAt: now,
    });

    const updatedIncident = await ctx.db.get(args.incidentId);
    if (!updatedIncident) {
      throw new Error("Failed to load updated incident.");
    }

    return mapAgentOpsIncidentObject({
      _id: updatedIncident._id,
      organizationId: updatedIncident.organizationId,
      name: updatedIncident.name,
      description: updatedIncident.description,
      status: updatedIncident.status,
      updatedAt: updatedIncident.updatedAt,
      customProperties: updatedIncident.customProperties as Record<string, unknown> | undefined,
    });
  },
});

/**
 * Get control-center thread rows with lifecycle/delivery separation.
 */
export const getControlCenterThreadRows = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    scope: v.optional(v.union(v.literal("org"), v.literal("layer"))),
    scopeOrganizationId: v.optional(v.id("organizations")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ControlCenterThreadRow[]> => {
    const scopedAccess = await resolveAgentOpsScopedAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      requestedScope: args.scope,
      requestedScopeOrganizationId: args.scopeOrganizationId,
    });

    const scopedSessions = (
      await Promise.all(
        scopedAccess.scopedOrgs.map(async (scopedOrg) => {
          const [activeSessions, handedOffSessions] = await Promise.all([
            ctx.db
              .query("agentSessions")
              .withIndex("by_org_status", (q) =>
                q.eq("organizationId", scopedOrg.orgId).eq("status", "active")
              )
              .collect(),
            ctx.db
              .query("agentSessions")
              .withIndex("by_org_status", (q) =>
                q.eq("organizationId", scopedOrg.orgId).eq("status", "handed_off")
              )
              .collect(),
          ]);
          return [...activeSessions, ...handedOffSessions].map((session) => ({
            session,
            scopedOrg,
          }));
        })
      )
    ).flat();

    if (scopedSessions.length === 0) {
      return [];
    }

    const agentIds = new Set<string>();
    for (const { session } of scopedSessions) {
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
      scopedSessions.map(async ({ session, scopedOrg }): Promise<ControlCenterThreadRow | null> => {
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
          organizationName: scopedOrg.orgName,
          organizationSlug: scopedOrg.orgSlug,
          organizationLayer: scopedOrg.layer,
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
    const visibilityScope = await resolveControlCenterTraceAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });

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

    const threadRecord = thread as unknown as Record<string, unknown>;
    const latestTurn = await ctx.db
      .query("agentTurns")
      .withIndex("by_session_created", (q) => q.eq("sessionId", threadId))
      .order("desc")
      .first();
    const lifecycleState = resolveSessionLifecycleState(thread);
    const deliveryState = resolveThreadDeliveryState({
      sessionStatus: thread.status,
      escalationStatus: thread.escalationState?.status,
      latestTurnState: latestTurn?.state,
    });
    const routeIdentity = normalizeSessionChannelRouteIdentity(
      threadRecord.channelRouteIdentity
    );
    const routingMetadata = normalizeSessionRoutingMetadata(
      threadRecord.routingMetadata
    );
    const sessionRoutingKey =
      normalizeControlCenterTraceString(threadRecord.sessionRoutingKey)
      || buildSessionRoutingKey(routeIdentity);
    const traceContext = resolveControlCenterTraceContext({
      threadRecord,
      fallbackThreadId: args.threadId,
    });

    const trustTimelineEvents = trustEvents
      .filter((event) =>
        (
          event.event_name === "trust.lifecycle.transition_checkpoint.v1"
          || event.event_name === "trust.lifecycle.operator_reply_in_stream.v1"
          || isMemoryTrustEventName(event.event_name)
        )
        && event.payload.session_id === args.threadId
      )
      .map((event): TimelineEventDraft => {
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

        const workflowKey = resolveControlCenterWorkflowKey(
          event.payload.lifecycle_transition_reason
        );
        const payloadRecord = event.payload as Record<string, unknown>;
        const trustTurnId =
          normalizeControlCenterTraceString(payloadRecord.turn_id)
          || normalizeControlCenterTraceString(payloadRecord.turnId);

        const payloadEventId =
          typeof event.payload.event_id === "string" && event.payload.event_id.trim().length > 0
            ? event.payload.event_id
            : undefined;

        return {
          eventId: payloadEventId
            ? `${payloadEventId}:${String(event._id)}`
            : String(event._id),
          sessionId: args.threadId,
          turnId: trustTurnId,
          threadId: args.threadId,
          kind,
          occurredAt: event.payload.occurred_at || event.created_at,
          orderingHint: event.payload.occurred_at || event.created_at,
          actorType,
          actorId,
          fromState,
          toState,
          checkpoint,
          escalationGate,
          title,
          summary,
          reason,
          workflowKey,
          trustEventName: event.event_name,
          trustEventId: payloadEventId,
          sourceObjectIds: event.payload.source_object_ids,
          metadata: roleScopedTimelineMetadata({
            visibilityScope,
            base: {
              schemaValidationStatus: event.schema_validation_status,
              eventVersion: event.payload.event_version,
              turnId: trustTurnId,
              ...(isMemoryEvent
                ? {
                    consentScope: event.payload.consent_scope,
                    consentDecision: event.payload.consent_decision,
                    memoryCandidateIds: event.payload.memory_candidate_ids,
                    consentPromptVersion: event.payload.consent_prompt_version,
                  }
                : {}),
            },
            superAdminDebug: {
              schemaErrors: event.schema_errors,
              trustPayload: event.payload,
            },
          }),
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
      .map((action): TimelineEventDraft | null => {
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
        const workflowKey = resolveControlCenterWorkflowKey(
          (actionData.queueContract as Record<string, unknown> | undefined)?.workflowKey
            ?? (actionData.idempotencyContract as Record<string, unknown> | undefined)?.intentType
            ?? actionData.workflowKey
        );
        const authorityIntentType = normalizeControlCenterTraceString(
          (actionData.collaboration as Record<string, unknown> | undefined)?.authorityIntentType
        );
        const lineageId = normalizeControlCenterTraceString(
          (actionData.queueContract as Record<string, unknown> | undefined)?.lineageId
        );
        const threadId = normalizeControlCenterTraceString(
          (actionData.queueContract as Record<string, unknown> | undefined)?.threadId
        );
        const turnId = normalizeControlCenterTraceString(actionData.turnId);

        return {
          eventId: `retrieval:${String(action._id)}`,
          sessionId: args.threadId,
          turnId,
          threadId: threadId ?? args.threadId,
          kind: "tool",
          occurredAt: action.performedAt,
          orderingHint: action.performedAt,
          actorType: "agent",
          actorId: String(action.objectId),
          escalationGate: "not_applicable",
          title: "Retrieval Citation Snapshot",
          summary: `Mode ${retrieval.mode || "unknown"}${retrieval.path ? ` via ${retrieval.path}` : ""}; ${citationCount} citation${citationCount === 1 ? "" : "s"} (${chunkCitationCount} chunk, ${bridgeCitationCount} bridge).`,
          sourceObjectIds: [String(action.objectId)],
          pipelineStage: "execution",
          workflowKey,
          authorityIntentType,
          lineageId,
          dmThreadId: traceContext.dmThreadId,
          groupThreadId: traceContext.groupThreadId,
          metadata: roleScopedTimelineMetadata({
            visibilityScope,
            base: {
              retrieval,
              citationCount,
              chunkCitationCount,
              bridgeCitationCount,
              fallbackUsed: retrieval.fallbackUsed,
              fallbackReason: retrieval.fallbackReason,
              turnId,
            },
            superAdminDebug: {
              actionId: action._id,
              queueContract: actionData.queueContract,
              idempotencyContract: actionData.idempotencyContract,
              executionBundle: actionData.executionBundle,
            },
          }),
          sourceIdForCorrelation: turnId ?? String(action._id),
        };
      })
      .filter((event): event is TimelineEventDraft => event !== null)
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .slice(0, Math.min(eventLimit, 40));

    const executionEdgeScanLimit = Math.max(180, eventLimit * 10);
    const executionEdges = await ctx.db
      .query("executionEdges")
      .withIndex("by_session_time", (q) => q.eq("sessionId", threadId))
      .order("desc")
      .take(executionEdgeScanLimit);

    const turnIds = new Set<string>();
    for (const edge of executionEdges) {
      turnIds.add(String(edge.turnId));
    }
    for (const action of retrievalActions) {
      const actionData = (action.actionData || {}) as Record<string, unknown>;
      const turnId = normalizeControlCenterTraceString(actionData.turnId);
      if (turnId) {
        turnIds.add(turnId);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const turnMap = new Map<string, any>();
    await Promise.all(
      Array.from(turnIds).map(async (turnIdValue) => {
        const turn = await ctx.db.get(turnIdValue as Id<"agentTurns">);
        if (turn) {
          turnMap.set(turnIdValue, turn);
        }
      })
    );

    const executionTimelineEvents = executionEdges
      .map((edge): TimelineEventDraft => {
        const edgeMetadata = (edge.metadata || {}) as Record<string, unknown>;
        const turn = turnMap.get(String(edge.turnId)) as Record<string, unknown> | undefined;
        const queueContract =
          (turn?.queueContract as Record<string, unknown> | undefined)
          || (edgeMetadata.queueContract as Record<string, unknown> | undefined);
        const idempotencyContract =
          (turn?.idempotencyContract as Record<string, unknown> | undefined)
          || (edgeMetadata.idempotencyContract as Record<string, unknown> | undefined);
        const workflowKey = resolveControlCenterWorkflowKey(
          queueContract?.workflowKey ?? idempotencyContract?.intentType
        );
        const presentation = resolveExecutionTransitionPresentation(edge.transition);
        const reason = normalizeControlCenterTraceString(edgeMetadata.reason);
        const transition = normalizeControlCenterTraceString(edge.transition) || "unknown";
        const turnState = normalizeControlCenterTraceString(turn?.state);
        const terminalDeliverable =
          (turn?.terminalDeliverable as Record<string, unknown> | undefined)
          || (edgeMetadata.terminalDeliverable as Record<string, unknown> | undefined);
        const summaryParts = [
          `Transition ${transition} (#${edge.edgeOrdinal}).`,
          turnState ? `Turn state ${turnState}.` : null,
          reason ? `Reason ${reason}.` : null,
          terminalDeliverable?.pointerType
            ? `Deliverable ${String(terminalDeliverable.pointerType)}.`
            : null,
        ].filter((part): part is string => Boolean(part));

        return {
          eventId: `edge:${String(edge._id)}`,
          sessionId: args.threadId,
          turnId: String(edge.turnId),
          threadId: args.threadId,
          kind: presentation.kind,
          occurredAt: edge.occurredAt,
          orderingHint: edge.edgeOrdinal,
          actorType: "system",
          actorId: String(edge.agentId),
          checkpoint: transition,
          escalationGate: "not_applicable",
          title: presentation.title,
          summary: summaryParts.join(" "),
          reason,
          sourceObjectIds: [String(edge.agentId)],
          pipelineStage: presentation.pipelineStage,
          workflowKey,
          lineageId: normalizeControlCenterTraceString(queueContract?.lineageId),
          metadata: roleScopedTimelineMetadata({
            visibilityScope,
            base: {
              edgeOrdinal: edge.edgeOrdinal,
              turnId: String(edge.turnId),
              fromState: edge.fromState,
              toState: edge.toState,
              transitionPolicyVersion: edge.transitionPolicyVersion,
              replayInvariantStatus: edge.replayInvariantStatus,
            },
            superAdminDebug: {
              edgeMetadata,
              queueContract,
              idempotencyContract,
            },
          }),
          sourceIdForCorrelation: `${String(edge.turnId)}:${String(edge.edgeOrdinal)}`,
        };
      })
      .slice(0, Math.max(eventLimit * 2, 120));

    const receiptScanLimit = Math.max(180, eventLimit * 8);
    const receipts = await ctx.db
      .query("agentInboxReceipts")
      .withIndex("by_session", (q) => q.eq("sessionId", threadId))
      .order("desc")
      .take(receiptScanLimit);

    const receiptTimelineEvents: TimelineEventDraft[] = [];
    for (const receipt of receipts) {
      const queueContract = (receipt.queueContract || {}) as Record<string, unknown>;
      const idempotencyContract =
        (receipt.idempotencyContract || {}) as Record<string, unknown>;
      const workflowKey = resolveControlCenterWorkflowKey(
        queueContract.workflowKey ?? idempotencyContract.intentType
      );
      const lineageId = normalizeControlCenterTraceString(queueContract.lineageId);
      const threadIdFromContract = normalizeControlCenterTraceString(queueContract.threadId);
      const turnId = receipt.turnId ? String(receipt.turnId) : undefined;
      const receiptSourceObjectIds = [String(receipt.agentId)];
      const common = {
        sessionId: args.threadId,
        turnId,
        threadId: args.threadId,
        actorType: "system" as const,
        actorId: String(receipt.agentId),
        escalationGate: "not_applicable" as const,
        sourceObjectIds: receiptSourceObjectIds,
        workflowKey,
        lineageId,
        metadata: roleScopedTimelineMetadata({
          visibilityScope,
          base: {
            receiptId: String(receipt._id),
            receiptStatus: receipt.status,
            idempotencyKey: receipt.idempotencyKey,
            duplicateCount: receipt.duplicateCount,
            queueConcurrencyKey: receipt.queueConcurrencyKey,
            queueOrderingKey: receipt.queueOrderingKey,
            turnId,
          },
          superAdminDebug: {
            queueContract: receipt.queueContract,
            idempotencyContract: receipt.idempotencyContract,
            receiptMetadata: receipt.metadata,
          },
        }),
      };

      const acceptedPresentation = resolveReceiptStagePresentation({
        status: receipt.status,
        phase: "accepted",
      });
      receiptTimelineEvents.push({
        eventId: `receipt:${String(receipt._id)}:accepted`,
        ...common,
        kind: acceptedPresentation.kind,
        pipelineStage: acceptedPresentation.pipelineStage,
        occurredAt: receipt.firstSeenAt,
        orderingHint: 1,
        title: acceptedPresentation.title,
        summary: `Ingress receipt accepted for ${receipt.channel}:${receipt.externalContactIdentifier}.`,
        sourceIdForCorrelation: turnId ?? String(receipt._id),
        correlationId: buildTrustTimelineCorrelationId({
          lineageId,
          threadId: threadIdFromContract,
          fallbackThreadId: args.threadId,
          surface: "session",
          sourceId: `receipt:${String(receipt._id)}:accepted`,
        }),
      });

      if (typeof receipt.processingStartedAt === "number") {
        const processingPresentation = resolveReceiptStagePresentation({
          status: receipt.status,
          phase: "processing",
        });
        receiptTimelineEvents.push({
          eventId: `receipt:${String(receipt._id)}:processing`,
          ...common,
          kind: processingPresentation.kind,
          pipelineStage: processingPresentation.pipelineStage,
          occurredAt: receipt.processingStartedAt,
          orderingHint: 2,
          title: processingPresentation.title,
          summary: `Runtime acquired processing lease${turnId ? ` for turn ${turnId}` : ""}.`,
          sourceIdForCorrelation: turnId ?? String(receipt._id),
        });
      }

      const terminalAt = receipt.completedAt ?? receipt.failedAt;
      const hasTerminalEvent =
        receipt.status === "completed"
        || receipt.status === "failed"
        || receipt.status === "duplicate";
      if (hasTerminalEvent && typeof terminalAt === "number") {
        const terminalPresentation = resolveReceiptStagePresentation({
          status: receipt.status,
          phase: "terminal",
        });
        const terminalSummary =
          receipt.status === "failed"
            ? `Runtime failed${receipt.failureReason ? `: ${receipt.failureReason}` : "."}`
            : receipt.status === "duplicate"
              ? "Duplicate ingress collapsed to prior deterministic outcome."
              : "Runtime completed and receipt finalized.";
        receiptTimelineEvents.push({
          eventId: `receipt:${String(receipt._id)}:terminal`,
          ...common,
          kind: terminalPresentation.kind,
          pipelineStage: terminalPresentation.pipelineStage,
          occurredAt: terminalAt,
          orderingHint: 3,
          title: terminalPresentation.title,
          summary: terminalSummary,
          reason: receipt.failureReason ?? undefined,
          sourceIdForCorrelation: turnId ?? String(receipt._id),
        });
      }
    }

    const operatorDeliveryTimelineEvents = retrievalActions
      .filter((action) =>
        action.organizationId === args.organizationId
        && action.actionType === "session_reply_in_stream"
      )
      .map((action): TimelineEventDraft | null => {
        const actionData = (action.actionData || {}) as Record<string, unknown>;
        const actionSessionId = normalizeControlCenterTraceString(actionData.sessionId);
        if (!actionSessionId || actionSessionId !== args.threadId) {
          return null;
        }
        const turnId = normalizeControlCenterTraceString(actionData.turnId);
        const reason = normalizeControlCenterTraceString(actionData.reason);
        return {
          eventId: `delivery:${String(action._id)}`,
          sessionId: args.threadId,
          turnId,
          threadId: args.threadId,
          kind: "delivery",
          occurredAt: action.performedAt,
          orderingHint: action.performedAt,
          actorType: "operator",
          actorId: normalizeControlCenterTraceString(actionData.performedBy) || "operator",
          checkpoint: "operator_reply_in_stream",
          escalationGate: "not_applicable",
          title: "Operator Reply Delivered",
          summary: `In-stream operator reply delivered to ${thread.channel}.`,
          reason,
          sourceObjectIds: [String(action.objectId)],
          pipelineStage: "delivery",
          workflowKey: "operator_reply",
          metadata: roleScopedTimelineMetadata({
            visibilityScope,
            base: {
              providerConversationId: actionData.providerConversationId,
              providerMessageId: actionData.providerMessageId,
              trustEventName: actionData.trustEventName,
              trustEventId: actionData.trustEventId,
            },
            superAdminDebug: {
              actionData,
            },
          }),
          sourceIdForCorrelation: String(action._id),
        };
      })
      .filter((event): event is TimelineEventDraft => event !== null);

    const rootInstanceId = String(thread.agentId);
    const activeInstanceId = String(thread.teamSession?.activeAgentId || thread.agentId);
    const activeAgent = agentMap.get(activeInstanceId);
    const rootAgent = agentMap.get(rootInstanceId);
    const rootTemplateId = readTemplateAgentId(rootAgent) || thread.agentId;
    const selectedTemplateAgentId =
      readTemplateAgentId(activeAgent)
      || rootTemplateId;
    const selectedTemplateAgent = agentMap.get(String(selectedTemplateAgentId));
    const selectedAgentContext: ControlCenterSelectedAgentContext = {
      instanceAgentId: activeInstanceId,
      templateAgentId: String(selectedTemplateAgentId),
      roleLabel: resolveInstanceRoleLabel({
        instanceId: activeInstanceId,
        rootInstanceId,
        activeInstanceId,
      }),
      displayName: readAgentDisplayName(activeAgent) || undefined,
      templateDisplayName: readAgentDisplayName(selectedTemplateAgent) || undefined,
    };
    const latestTurnRecord = latestTurn as Record<string, unknown> | null;
    const latestTurnContext = latestTurn
      ? {
          turnId: String(latestTurn._id),
          state: normalizeControlCenterTraceString(latestTurnRecord?.state),
          updatedAt:
            typeof latestTurnRecord?.updatedAt === "number"
              ? latestTurnRecord.updatedAt
              : undefined,
          transitionPolicyVersion: normalizeControlCenterTraceString(
            latestTurnRecord?.transitionPolicyVersion
          ),
          replayInvariantStatus: normalizeControlCenterTraceString(
            latestTurnRecord?.replayInvariantStatus
          ),
        }
      : undefined;
    const context: ControlCenterThreadContext = {
      sessionId: args.threadId,
      organizationId: String(thread.organizationId),
      channel: thread.channel,
      externalContactIdentifier: thread.externalContactIdentifier,
      route: {
        sessionRoutingKey,
        routeIdentity,
        routingMetadata,
      },
      selectedAgent: selectedAgentContext,
      delivery: {
        lifecycleState,
        deliveryState,
      },
      latestTurn: latestTurnContext,
    };

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

    const handoffTimelineEvents = handoffHistory.map((handoff, index): TimelineEventDraft => {
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
        orderingHint: index + 1,
        actorType: "agent",
        actorId: fromAgentId,
        checkpoint: "handoff_completed",
        escalationGate: "not_applicable",
        title: `Handoff to ${toAgentLabel}`,
        summary: handoff.summary,
        reason: handoff.reason,
        sourceObjectIds: [fromAgentId, toAgentId],
        pipelineStage: "execution",
        metadata: roleScopedTimelineMetadata({
          visibilityScope,
          base: {
            goal: handoff.goal,
          },
          superAdminDebug: {
            handoffIndex: index,
          },
        }),
        sourceIdForCorrelation: `${fromAgentId}:${toAgentId}:${String(index)}`,
      };
    });

    const timelineEvents = applyControlCenterTimelineOrdering({
      drafts: [
        ...trustTimelineEvents,
        ...executionTimelineEvents,
        ...receiptTimelineEvents,
        ...retrievalTimelineEvents,
        ...operatorDeliveryTimelineEvents,
        ...handoffTimelineEvents,
      ],
      trace: traceContext,
      visibilityScope,
      limit: eventLimit,
    });

    return {
      threadId: args.threadId,
      visibilityScope,
      context,
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
  organizationId: Id<"organizations">,
  agentId?: Id<"objects">
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
  const flattened = receipts.flat();
  if (!agentId) {
    return flattened;
  }
  return flattened.filter((receipt) => receipt.agentId === agentId);
}

/**
 * List stale receipts by age (accepted/processing older than threshold).
 */
export const getAgingReceipts = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    minAgeMinutes: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const minAgeMinutes = Math.max(1, Math.floor(args.minAgeMinutes ?? 15));
    const minAgeMs = minAgeMinutes * 60 * 1000;
    const now = Date.now();
    const receipts = await collectOrgReceipts(
      ctx,
      args.organizationId,
      args.agentId
    );

    return receipts
      .filter((receipt) => receipt.status === "accepted" || receipt.status === "processing")
      .map((receipt) => ({
        receiptId: receipt._id,
        agentId: receipt.agentId,
        channel: receipt.channel,
        externalContactIdentifier: receipt.externalContactIdentifier,
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
    agentId: v.optional(v.id("objects")),
    minDuplicateCount: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const minDuplicateCount = Math.max(1, Math.floor(args.minDuplicateCount ?? 1));
    const receipts = await collectOrgReceipts(
      ctx,
      args.organizationId,
      args.agentId
    );

    return receipts
      .filter((receipt) => receipt.duplicateCount >= minDuplicateCount)
      .map((receipt) => ({
        receiptId: receipt._id,
        agentId: receipt.agentId,
        channel: receipt.channel,
        externalContactIdentifier: receipt.externalContactIdentifier,
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
    agentId: v.optional(v.id("objects")),
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
    const filteredProcessingReceipts = args.agentId
      ? processingReceipts.filter((receipt) => receipt.agentId === args.agentId)
      : processingReceipts;

    return filteredProcessingReceipts
      .map((receipt) => {
        const startedAt = receipt.processingStartedAt ?? receipt.firstSeenAt;
        return {
          receiptId: receipt._id,
          agentId: receipt.agentId,
          channel: receipt.channel,
          externalContactIdentifier: receipt.externalContactIdentifier,
          status: receipt.status,
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
      agentId: receipt.agentId,
      channel: receipt.channel,
      externalContactIdentifier: receipt.externalContactIdentifier,
      status: receipt.status,
      turnId: receipt.turnId,
      idempotencyKey: receipt.idempotencyKey,
      duplicateCount: receipt.duplicateCount,
      queueConcurrencyKey: receipt.queueConcurrencyKey,
      queueOrderingKey: receipt.queueOrderingKey,
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
