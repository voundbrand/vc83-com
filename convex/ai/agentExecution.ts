/**
 * AGENT EXECUTION PIPELINE
 *
 * Core runtime for processing inbound messages through an org's AI agent.
 * Reuses provider adapter client and tool registry from the existing chat system.
 *
 * Pipeline:
 * 1. Load agent config → 2. Check rate limits → 3. Resolve session →
 * 4. Resolve CRM contact → 5. Build context → 6. Call LLM →
 * 7. Execute tools (with autonomy checks) → 8. Store messages →
 * 9. Update stats → 10. Return response
 */

import { action, internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { OpenRouterClient } from "./openrouter";
import {
  getAllToolDefinitions,
  getToolSchemas,
} from "./tools/registry";
import type { ToolExecutionContext } from "./tools/registry";
import { buildVacationDecisionResponse } from "./tools/bookingTool";
import type { Id } from "../_generated/dataModel";
import { getToolCreditCost } from "../credits/index";
import { composeKnowledgeContract } from "./systemKnowledge/index";
import { LLM_RETRY_POLICY, withRetry } from "./retryPolicy";
import { getUserErrorMessage, classifyError } from "./errorMessages";
import {
  AI_AGENT_MEMORY_RUNTIME_CONTRACT_VERSION,
  AI_AGENT_MEMORY_RUNTIME_DECISION,
  EXECUTION_BUNDLE_CONTRACT_VERSION,
  IDEMPOTENCY_CONTRACT_VERSION,
  RUN_ATTEMPT_CONTRACT_VERSION,
  TURN_QUEUE_CONTRACT_VERSION,
  assertAgentExecutionBundleContract,
  assertRuntimeIdempotencyContract,
  assertTurnQueueContract,
  type AgentExecutionBundleContract,
  type AgentTurnRunAttemptContract,
  type IdempotencyIntentType,
  type RuntimeIdempotencyContract,
  type TurnQueueConflictLabel,
  type TurnQueueContract,
} from "../schemas/aiSchemas";
import {
  getPlatformBlockedTools,
  resolveActiveToolsWithAudit,
  SUBTYPE_DEFAULT_PROFILES,
} from "./toolScoping";
import {
  composeAdaptiveRecentContextWindow,
  composeSessionContactMemoryContext,
  composeOperatorPinnedNotesContext,
  composeSessionReactivationMemoryContext,
  composeRollingSessionMemoryContext,
  composeKnowledgeContext,
  estimateTokensFromText,
  getUtf8ByteLength,
  type SessionHistoryContextMessage,
  type SessionContactMemoryRecord,
  type SessionReactivationMemoryRecord,
  type SessionRollingSummaryMemoryRecord,
  type OperatorPinnedNoteContextRecord,
  type KnowledgeContextDocument,
} from "./memoryComposer";
import {
  buildAuthProfileFailureCountMap,
  getAuthProfileCooldownMs,
  isAuthProfileRotatableError,
  orderAuthProfilesForSession,
  type ResolvedAuthProfile,
  resolveAuthProfilesForProvider,
} from "./authProfilePolicy";
import {
  calculateCostFromUsage,
  convertUsdToCredits,
  estimateCreditsFromPricing,
} from "./modelPricing";
import {
  buildEnvApiKeysByProvider,
  detectProvider,
  normalizeLocalConnectionContract,
  normalizePrivacyMode,
  resolvePrivacyModeProviderDecision,
  resolveProviderReasoningResolution,
  type LocalConnectionContract,
  type ProviderReasoningParamKind,
  type PrivacyMode,
  resolveAuthProfileBaseUrl,
} from "./modelAdapters";
import { resolveOrganizationProviderBindingForProvider } from "./providerRegistry";
import {
  buildModelRoutingMatrix,
  determineModelSelectionSource,
  isModelAllowedForOrg,
  normalizeCanonicalBillingSource,
  type ModelQualityTier,
  type ModelRoutingMatrixEntry,
  SAFE_FALLBACK_MODEL_ID,
  resolveModelRoutingIntent,
  resolveModelRoutingModality,
  resolveOrgDefaultModel,
  resolveRequestedModel,
  selectFirstPlatformEnabledModel,
} from "./modelPolicy";
import { evaluateRoutingCapabilityRequirements } from "./modelEnablementGates";
import {
  normalizeVoiceRuntimeProviderId,
  resolveVoiceRuntimeAdapter,
  type VoiceRuntimeProviderId,
} from "./voiceRuntimeAdapter";
import {
  checkPreLLMEscalation,
  checkPostLLMEscalation,
  checkToolFailureEscalation,
  DEFAULT_HOLD_MESSAGE,
  UNCERTAINTY_PHRASES,
  resolvePolicy,
  type EscalationCounters,
  type EscalationPolicy,
} from "./escalation";
import {
  brokerTools,
  detectIntents,
  extractRecentToolNames,
  type BrokerMetrics,
} from "./toolBroker";
import { deliverAssistantResponseWithFallback } from "./outboundDelivery";
import { evaluateSessionRoutingPinUpdate } from "./sessionRoutingPolicy";
import {
  normalizeAutonomyLevel,
  resolveDomainAutonomyLevel,
  type AutonomyLevel,
  type AutonomyLevelInput,
} from "./autonomy";
import {
  buildHarnessContext,
  determineAgentLayer,
  normalizeDreamTeamSpecialistContracts,
  normalizeTeamAccessModeToken,
  resolveUnifiedPersonalityFlag,
  type CrossOrgSoulReadOnlyEnrichmentSummary,
  type DreamTeamWorkspaceType,
} from "./harness";
import {
  resolveActiveArchetypeRuntimeContract,
  resolveSensitiveArchetypeRuntimeConstraint,
} from "./archetypes";
import {
  buildAgentSystemPrompt,
  mapSemanticChunksToKnowledgeDocuments,
  resolveKnowledgeRetrieval,
  type SemanticKnowledgeChunkSearchResult,
} from "./agentPromptAssembly";
import {
  resolveModeScopedAutonomyLevel,
  resolveSoulModeRuntimeContract,
} from "./soulModes";
import {
  buildSupportRuntimePolicy,
  resolveSupportRuntimeContext,
} from "./prompts/supportRuntimePolicy";
import {
  buildToolErrorStatePatch,
  type ToolCapabilityGapBlockedPayload,
  executeToolCallsWithApproval,
  initializeToolFailureState,
} from "./agentToolOrchestration";
import {
  createAndDispatchEscalation,
  recordEscalationCheckpoint,
  resolveEscalationAgentName,
} from "./agentEscalationOrchestration";
import {
  handleTurnLeaseAcquireFailure,
  persistRuntimeTurnArtifacts,
  settleRuntimeTurnLease,
  type TurnLeaseFailArgs,
  type TurnLeaseMutationResult,
  type TurnLeaseReleaseArgs,
  type TurnTerminalDeliverablePointer,
} from "./agentTurnOrchestration";
import {
  executeTwoStageFailover,
  TwoStageFailoverError,
  type TwoStageFailoverModelSkipReason,
} from "./twoStageFailoverExecutor";
import {
  MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
  resolveMobileNodeCommandPolicyDecision,
  resolveMobileSourceAttestationContract,
  type MobileNodeCommandPolicyDecision,
  type MobileSourceAttestationContract,
} from "./mobileRuntimeHardening";
import {
  TRUST_EVENT_NAMESPACE,
  TRUST_EVENT_TAXONOMY_VERSION,
  buildTrustTimelineCorrelationId,
} from "./trustEvents";
import { ONBOARDING_DEFAULT_MODEL_ID } from "./modelDefaults";
import {
  enforceRuntimeGovernorCost,
  enforceRuntimeGovernorStepAndTime,
  resolveRuntimeGovernorContract,
  type RuntimeGovernorContract,
  type RuntimeGovernorLimit,
} from "./runtimeGovernor";

export {
  buildAgentSystemPrompt,
  mapSemanticChunksToKnowledgeDocuments,
  rankKnowledgeDocsForSemanticRetrieval,
  resolveKnowledgeRetrieval,
} from "./agentPromptAssembly";

// Lazy-load api/internal to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getApi(): any {
  if (!_apiCache) {
    _apiCache = require("../_generated/api");
  }
  return _apiCache;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any { return getApi().internal; }

// ============================================================================
// TYPES
// ============================================================================

interface AgentConfig {
  displayName?: string;
  personality?: string;
  language?: string;
  voiceLanguage?: string;
  additionalLanguages?: string[];
  brandVoiceInstructions?: string;
  elevenLabsVoiceId?: string;
  systemPrompt?: string;
  faqEntries?: Array<{ q: string; a: string }>;
  knowledgeBaseTags?: string[];
  toolProfile?: string;
  enabledTools?: string[];
  disabledTools?: string[];
  autonomyLevel: AutonomyLevelInput;
  maxMessagesPerDay?: number;
  maxCostPerDay?: number;
  runtimeGovernor?: {
    max_steps?: number;
    max_time_ms?: number;
    max_cost_usd?: number;
  };
  requireApprovalFor?: string[];
  blockedTopics?: string[];
  modelProvider?: string;
  modelId?: string;
  privacyMode?: PrivacyMode | string;
  qualityTierFloor?: ModelQualityTier | string;
  localConnection?: LocalConnectionContract | null;
  localModelIds?: string[];
  selectedPolicyGuardrail?: string;
  selectedModelDriftWarning?: string;
  selectedModelQualityTier?: ModelQualityTier;
  selectedRouteIsLocal?: boolean;
  temperature?: number;
  maxTokens?: number;
  channelBindings?: Array<{ channel: string; enabled: boolean }>;
  escalationPolicy?: EscalationPolicy;
  useToolBroker?: boolean;
  unifiedPersonality?: boolean;
  teamAccessMode?: "invisible" | "direct" | "meeting" | string;
  dreamTeamSpecialists?: unknown;
  activeSoulMode?: string;
  activeArchetype?: string | null;
  modeChannelBindings?: unknown;
  enabledArchetypes?: unknown;
  activeChannel?: string;
  domainAutonomy?: unknown;
  autonomyTrust?: unknown;
}

function resolveAppointmentBookingDomainDefault(
  config: AgentConfig
): "sandbox" | "live" {
  const domainResolution = resolveDomainAutonomyLevel({
    domain: "appointment_booking",
    autonomyLevel: config.autonomyLevel,
    domainAutonomy: config.domainAutonomy,
  });
  return domainResolution.effectiveLevel;
}

function resolvePolymarketDomainDefault(
  config: AgentConfig
): "paper" | "live" {
  const domainResolution = resolveDomainAutonomyLevel({
    domain: "polymarket_operator",
    autonomyLevel: config.autonomyLevel,
    domainAutonomy: config.domainAutonomy,
  });
  return domainResolution.effectiveLevel === "live" ? "live" : "paper";
}

export function resolveAgentRequireApprovalFor(args: {
  autonomyLevel: AutonomyLevelInput;
  requireApprovalFor?: string[];
}): string[] | undefined {
  if (!args.requireApprovalFor) {
    return args.requireApprovalFor;
  }
  return Array.from(new Set(args.requireApprovalFor));
}

function resolveWorkspaceTypeFromOrganization(
  organization: { isPersonalWorkspace?: boolean } | null | undefined,
): DreamTeamWorkspaceType {
  return organization?.isPersonalWorkspace === true ? "personal" : "business";
}

function resolveDesktopUserIdFromExternalContactIdentifier(args: {
  channel: string;
  externalContactIdentifier: string;
}): Id<"users"> | undefined {
  if (args.channel !== "desktop") {
    return undefined;
  }
  const segments = args.externalContactIdentifier.split(":");
  if (segments.length < 3 || segments[0] !== "desktop") {
    return undefined;
  }
  const userId = segments[1]?.trim();
  return userId && userId.length > 0 ? (userId as Id<"users">) : undefined;
}

function resolveAgentDisplayNameForEnrichment(agent: {
  name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customProperties?: Record<string, any>;
}): string {
  const customProperties = agent.customProperties;
  const displayName = typeof customProperties?.displayName === "string"
    ? customProperties.displayName.trim()
    : "";
  if (displayName.length > 0) {
    return displayName;
  }
  const soulRecord = customProperties?.soul;
  const soulName =
    soulRecord && typeof soulRecord === "object" && typeof soulRecord.name === "string"
      ? soulRecord.name.trim()
      : "";
  if (soulName.length > 0) {
    return soulName;
  }
  return typeof agent.name === "string" && agent.name.trim().length > 0
    ? agent.name
    : "Primary Agent";
}

function resolvePrimaryBusinessAgentForOperator(args: {
  agents: Array<{
    _id: Id<"objects">;
    name: string;
    subtype?: string;
    status?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customProperties?: Record<string, any>;
  }>;
  operatorUserId: Id<"users">;
}): {
  _id: Id<"objects">;
  name: string;
  subtype?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customProperties?: Record<string, any>;
} | undefined {
  const activeAgents = args.agents.filter((agent) => agent.status === "active");
  if (activeAgents.length === 0) {
    return undefined;
  }
  const operatorToken = String(args.operatorUserId);
  const primaryForOperator = activeAgents.find((agent) => {
    const props = agent.customProperties;
    return props?.isPrimary === true && String(props?.operatorId ?? "") === operatorToken;
  });
  if (primaryForOperator) {
    return primaryForOperator;
  }
  const primaryFallback = activeAgents.find(
    (agent) => agent.customProperties?.isPrimary === true,
  );
  if (primaryFallback) {
    return primaryFallback;
  }
  return activeAgents[0];
}

async function resolveCrossOrgSoulReadOnlyEnrichment(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organization: {
    _id: Id<"organizations">;
    isPersonalWorkspace?: boolean;
  };
  channel: string;
  externalContactIdentifier: string;
}): Promise<CrossOrgSoulReadOnlyEnrichmentSummary[]> {
  type QueryableDb = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: (...args: any[]) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: (...args: any[]) => any;
  };
  const hasQueryableDb = (candidate: unknown): candidate is QueryableDb =>
    Boolean(
      candidate &&
        typeof candidate === "object" &&
        typeof (candidate as { query?: unknown }).query === "function" &&
        typeof (candidate as { get?: unknown }).get === "function",
    );

  // `processInboundMessage` runs as an action context where `ctx.db` may be absent.
  // Keep enrichment best-effort and avoid hard failures when only runQuery/runMutation are exposed.
  const dbCandidate = (args.ctx as { db?: unknown })?.db;
  if (!hasQueryableDb(dbCandidate)) {
    return [];
  }
  const db = dbCandidate;

  const workspaceType = resolveWorkspaceTypeFromOrganization(args.organization);
  if (workspaceType !== "personal") {
    return [];
  }

  const operatorUserId = resolveDesktopUserIdFromExternalContactIdentifier({
    channel: args.channel,
    externalContactIdentifier: args.externalContactIdentifier,
  });
  if (!operatorUserId) {
    return [];
  }

  const currentMembership = await db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q: any) =>
      q.eq("userId", operatorUserId).eq("organizationId", args.organization._id)
    )
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .first();
  if (!currentMembership) {
    return [];
  }

  const memberships = await db
    .query("organizationMembers")
    .withIndex("by_user", (q: any) => q.eq("userId", operatorUserId))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .collect();

  const enrichments = await Promise.all(
    memberships.map(async (membership: {
      organizationId: Id<"organizations">;
      role: Id<"roles">;
    }) => {
      if (membership.organizationId === args.organization._id) {
        return null;
      }

      const org = await db.get(membership.organizationId);
      if (!org || org.isActive !== true || org.isPersonalWorkspace === true) {
        return null;
      }

      const [role, agents] = await Promise.all([
        db.get(membership.role),
        db
          .query("objects")
          .withIndex("by_org_type", (q: any) =>
            q.eq("organizationId", org._id).eq("type", "org_agent")
          )
          .collect(),
      ]);
      const primaryAgent = resolvePrimaryBusinessAgentForOperator({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        agents: agents as any[],
        operatorUserId,
      });
      if (!primaryAgent) {
        return null;
      }

      const primaryProps = primaryAgent.customProperties;
      return {
        organizationName: org.name,
        roleName:
          role && typeof role.name === "string" && role.name.trim().length > 0
            ? role.name
            : undefined,
        workspaceType: "business" as const,
        primaryAgentName: resolveAgentDisplayNameForEnrichment(primaryAgent),
        primaryAgentSubtype:
          typeof primaryAgent.subtype === "string" && primaryAgent.subtype.trim().length > 0
            ? primaryAgent.subtype
            : undefined,
        dreamTeamContractCount: normalizeDreamTeamSpecialistContracts(
          primaryProps?.dreamTeamSpecialists,
        ).length,
      };
    }),
  );

  return enrichments
    .filter(
      (entry): entry is CrossOrgSoulReadOnlyEnrichmentSummary => entry !== null,
    )
    .sort((a, b) => a.organizationName.localeCompare(b.organizationName))
    .slice(0, 5);
}

export interface DelegationAuthorityRuntimeContract<IdLike extends string = string> {
  authorityAgentId: IdLike;
  speakerAgentId: IdLike;
  authorityAutonomyLevel: AutonomyLevel;
  authorityRequireApprovalFor?: string[];
  authorityToolProfile: string;
  authorityEnabledTools: string[];
  authorityDisabledTools: string[];
  authorityUseToolBroker: boolean;
  authorityActiveSoulMode?: string;
  authorityModeChannelBindings?: unknown;
  authorityRequestedArchetype?: string | null;
  authorityEnabledArchetypes?: unknown;
}

export function resolveDelegationAuthorityRuntimeContract<
  IdLike extends string = string,
>(args: {
  primaryAgentId: IdLike;
  primaryAgentSubtype?: string;
  primaryConfig: Pick<
    AgentConfig,
    | "autonomyLevel"
    | "requireApprovalFor"
    | "toolProfile"
    | "enabledTools"
    | "disabledTools"
    | "useToolBroker"
    | "activeSoulMode"
    | "modeChannelBindings"
    | "activeArchetype"
    | "enabledArchetypes"
  >;
  speakerAgentId?: IdLike;
}): DelegationAuthorityRuntimeContract<IdLike> {
  const authorityAutonomyLevel = normalizeAutonomyLevel(
    args.primaryConfig.autonomyLevel,
  );
  return {
    authorityAgentId: args.primaryAgentId,
    speakerAgentId: args.speakerAgentId ?? args.primaryAgentId,
    authorityAutonomyLevel,
    authorityRequireApprovalFor: resolveAgentRequireApprovalFor({
      autonomyLevel: authorityAutonomyLevel,
      requireApprovalFor: args.primaryConfig.requireApprovalFor,
    }),
    authorityToolProfile:
      args.primaryConfig.toolProfile
      ?? SUBTYPE_DEFAULT_PROFILES[args.primaryAgentSubtype ?? "general"]
      ?? "general",
    authorityEnabledTools: [...(args.primaryConfig.enabledTools ?? [])],
    authorityDisabledTools: [...(args.primaryConfig.disabledTools ?? [])],
    authorityUseToolBroker: args.primaryConfig.useToolBroker === true,
    authorityActiveSoulMode: args.primaryConfig.activeSoulMode,
    authorityModeChannelBindings: args.primaryConfig.modeChannelBindings,
    authorityRequestedArchetype: args.primaryConfig.activeArchetype,
    authorityEnabledArchetypes: args.primaryConfig.enabledArchetypes,
  };
}

export type InboundComposerMode = "auto" | "plan" | "plan_soft";
export type InboundComposerReasoningEffort =
  | "low"
  | "medium"
  | "high"
  | "extra_high";
export type InboundComposerReferenceStatus = "loading" | "ready" | "error";

export interface InboundComposerReference {
  url: string;
  content?: string;
  status: InboundComposerReferenceStatus;
  error?: string;
}

export interface InboundImageAttachment {
  attachmentId?: string;
  type: "image";
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  storageId?: string;
  width?: number;
  height?: number;
}

export interface InboundComposerRuntimeControls {
  mode: InboundComposerMode;
  reasoningEffort: InboundComposerReasoningEffort;
  references: InboundComposerReference[];
  cleanedMessage: string;
  strippedFallbackEnvelope: boolean;
}

export const THREAD_DELIVERY_STATE_VALUES = [
  "queued",
  "running",
  "done",
  "blocked",
  "failed",
] as const;

export type ThreadDeliveryState = (typeof THREAD_DELIVERY_STATE_VALUES)[number];

const HITL_WAITPOINT_CONTRACT_VERSION = "tcg_hitl_waitpoint_v1" as const;
const DEFAULT_HITL_WAITPOINT_TTL_MS = 10 * 60_000;
const MIN_HITL_WAITPOINT_TTL_MS = 60_000;
const MAX_HITL_WAITPOINT_TTL_MS = 60 * 60_000;

export const HITL_WAITPOINT_CHECKPOINT_VALUES = [
  "session_pending",
  "session_taken_over",
] as const;
export type HitlWaitpointCheckpoint = (typeof HITL_WAITPOINT_CHECKPOINT_VALUES)[number];

export const HITL_WAITPOINT_STATUS_VALUES = [
  "issued",
  "resumed",
  "aborted",
  "expired",
] as const;
export type HitlWaitpointStatus = (typeof HITL_WAITPOINT_STATUS_VALUES)[number];

export interface HitlWaitpointTokenPayload {
  contractVersion: typeof HITL_WAITPOINT_CONTRACT_VERSION;
  tokenId: string;
  sessionId: string;
  issuedForTurnId: string;
  checkpoint: HitlWaitpointCheckpoint;
  issuedAt: number;
  expiresAt: number;
}

export interface HitlWaitpointContract {
  contractVersion: typeof HITL_WAITPOINT_CONTRACT_VERSION;
  tokenId: string;
  token: string;
  checkpoint: HitlWaitpointCheckpoint;
  status: HitlWaitpointStatus;
  issuedAt: number;
  expiresAt: number;
  issuedForTurnId: Id<"agentTurns">;
  resumeTurnId?: Id<"agentTurns">;
  resumedAt?: number;
  abortedAt?: number;
  abortReason?: string;
  lastValidatedAt?: number;
}

export interface HitlWaitpointPublicState {
  tokenId: string;
  token: string;
  checkpoint: HitlWaitpointCheckpoint;
  status: HitlWaitpointStatus;
  issuedAt: number;
  expiresAt: number;
}

const COLLAB_SYNC_CHECKPOINT_CONTRACT_VERSION = "tcg_dm_group_sync_v1" as const;
const DEFAULT_COLLAB_SYNC_CHECKPOINT_TTL_MS = 10 * 60_000;
const MIN_COLLAB_SYNC_CHECKPOINT_TTL_MS = 60_000;
const MAX_COLLAB_SYNC_CHECKPOINT_TTL_MS = 60 * 60_000;

export const COLLAB_SYNC_CHECKPOINT_STATUS_VALUES = [
  "issued",
  "resumed",
  "aborted",
  "expired",
] as const;
export type CollaborationSyncCheckpointStatus =
  (typeof COLLAB_SYNC_CHECKPOINT_STATUS_VALUES)[number];

export interface CollaborationSyncCheckpointTokenPayload {
  contractVersion: typeof COLLAB_SYNC_CHECKPOINT_CONTRACT_VERSION;
  tokenId: string;
  lineageId: string;
  dmThreadId: string;
  groupThreadId: string;
  issuedForEventId: string;
  issuedAt: number;
  expiresAt: number;
}

export interface CollaborationSyncCheckpointContract {
  contractVersion: typeof COLLAB_SYNC_CHECKPOINT_CONTRACT_VERSION;
  tokenId: string;
  token: string;
  status: CollaborationSyncCheckpointStatus;
  lineageId: string;
  dmThreadId: string;
  groupThreadId: string;
  issuedForEventId: string;
  issuedAt: number;
  expiresAt: number;
  resumeTurnId?: Id<"agentTurns">;
  resumedAt?: number;
  abortedAt?: number;
  abortReason?: string;
  lastValidatedAt?: number;
}

const DEFAULT_RUNTIME_IDEMPOTENCY_TTL_MS = 30 * 60_000;
const MIN_RUNTIME_IDEMPOTENCY_TTL_MS = 60_000;
const MAX_RUNTIME_IDEMPOTENCY_TTL_MS = 24 * 60 * 60_000;
const DEFAULT_WORKFLOW_KEY = "message_ingress";
const DEFAULT_RUNTIME_POLICY_VERSION = "tcg_runtime_policy_v1";
export const RUNTIME_CAPABILITY_GAP_BLOCKED_RESPONSE_CONTRACT_VERSION =
  "tool_foundry_runtime_blocked_response_v1" as const;

export interface RuntimeCapabilityGapBlockedResponse {
  contractVersion: typeof RUNTIME_CAPABILITY_GAP_BLOCKED_RESPONSE_CONTRACT_VERSION;
  status: "blocked";
  reasonCode: ToolCapabilityGapBlockedPayload["code"];
  reason: string;
  missing: ToolCapabilityGapBlockedPayload["missing"];
  unblockingSteps: string[];
  proposalArtifact: ToolCapabilityGapBlockedPayload["proposalArtifact"];
}

export function buildRuntimeCapabilityGapBlockedResponse(args: {
  capabilityGap: ToolCapabilityGapBlockedPayload;
}): RuntimeCapabilityGapBlockedResponse {
  return {
    contractVersion: RUNTIME_CAPABILITY_GAP_BLOCKED_RESPONSE_CONTRACT_VERSION,
    status: "blocked",
    reasonCode: args.capabilityGap.code,
    reason: args.capabilityGap.reason,
    missing: {
      ...args.capabilityGap.missing,
      missingKinds: [...args.capabilityGap.missing.missingKinds],
    },
    unblockingSteps: [...args.capabilityGap.unblockingSteps],
    proposalArtifact: args.capabilityGap.proposalArtifact,
  };
}

export function formatRuntimeCapabilityGapBlockedMessage(args: {
  blocked: RuntimeCapabilityGapBlockedResponse;
}): string {
  const lines = [
    "Execution blocked: requested capability is not implemented in the trusted internal runtime contracts.",
    `Reason code: ${args.blocked.reasonCode}`,
    `Reason: ${args.blocked.reason}`,
    `Missing: ${args.blocked.missing.missingKinds.join(", ")}`,
    `Requested tool: ${args.blocked.missing.requestedToolName}`,
    `Missing summary: ${args.blocked.missing.summary}`,
    "Unblocking steps:",
    ...args.blocked.unblockingSteps.map(
      (step, index) => `${index + 1}. ${step}`
    ),
    "ToolSpec proposal artifact (draft metadata):",
    JSON.stringify(args.blocked.proposalArtifact, null, 2),
  ];

  return lines.join("\n");
}

export interface InboundRuntimeContracts {
  queueContract: TurnQueueContract;
  idempotencyContract: RuntimeIdempotencyContract;
}

interface SessionCollaborationSnapshot {
  threadType?: "group_thread" | "dm_thread";
  threadId?: string;
  groupThreadId?: string;
  dmThreadId?: string;
  lineageId?: string;
  authorityIntentType?: IdempotencyIntentType | "read_only";
}

/**
 * Resolve delivery/work status for operator thread rows.
 * This is intentionally separate from lifecycle state semantics.
 */
export function resolveThreadDeliveryState(args: {
  sessionStatus?: string;
  escalationStatus?: string;
  latestTurnState?: string;
}): ThreadDeliveryState {
  const sessionStatus = typeof args.sessionStatus === "string"
    ? args.sessionStatus.trim().toLowerCase()
    : "";
  const escalationStatus = typeof args.escalationStatus === "string"
    ? args.escalationStatus.trim().toLowerCase()
    : "";
  const latestTurnState = typeof args.latestTurnState === "string"
    ? args.latestTurnState.trim().toLowerCase()
    : "";

  if (
    sessionStatus === "handed_off"
    || escalationStatus === "pending"
    || escalationStatus === "taken_over"
    || latestTurnState === "suspended"
  ) {
    return "blocked";
  }
  if (latestTurnState === "failed") {
    return "failed";
  }
  if (latestTurnState === "running") {
    return "running";
  }
  if (latestTurnState === "queued") {
    return "queued";
  }
  if (
    latestTurnState === "completed"
    || latestTurnState === "cancelled"
    || sessionStatus === "closed"
    || sessionStatus === "expired"
  ) {
    return "done";
  }
  return "queued";
}

export interface RuntimeModelRoutingPolicyDecision {
  modelId: string;
  providerId: string | null;
  privacyAllowed: boolean;
  privacyBlockReason?: string;
  privacyUserVisibleGuardrail?: string;
  firewallAllowed: boolean;
  firewallBlockReason?: string;
  firewallUserVisibleMessage?: string;
  routingReason: string;
  isLocalModel: boolean;
  modelSwitchDriftSeverity?: "low" | "medium" | "high";
  modelSwitchDriftOverall?: number;
}

export interface RuntimeModelRoutingPolicyContract {
  privacyMode: PrivacyMode;
  qualityTierFloor: ModelQualityTier;
  localConnection: LocalConnectionContract | null;
  localModelIds: string[];
  decisions: RuntimeModelRoutingPolicyDecision[];
  allowedModelIds: string[];
  blocked: boolean;
  blockMessage?: string;
  selectedGuardrail?: string;
  selectedModelDriftWarning?: string;
}

interface RuntimeModelRoutingPolicySeed {
  privacyMode: PrivacyMode;
  qualityTierFloor: ModelQualityTier;
  localConnection: LocalConnectionContract | null;
  localModelIds: string[];
}

function normalizeRuntimeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRuntimeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const deduped = new Set<string>();
  for (const entry of value) {
    const normalized = normalizeRuntimeNonEmptyString(entry);
    if (normalized) {
      deduped.add(normalized);
    }
  }
  return Array.from(deduped);
}

export const RUNTIME_MEMORY_LAYER_ORDER = ["L3", "L2", "L5", "L4"] as const;
export type RuntimeMemoryLayer = (typeof RUNTIME_MEMORY_LAYER_ORDER)[number];

export type AiAgentMemoryRuntimeContractReason =
  | "missing_scope"
  | "session_org_mismatch"
  | "channel_mismatch"
  | "contact_mismatch"
  | "route_mismatch"
  | "deprecated_contract";

export interface AiAgentMemoryRuntimeContractDecision {
  contractVersion: typeof AI_AGENT_MEMORY_RUNTIME_CONTRACT_VERSION;
  decision: typeof AI_AGENT_MEMORY_RUNTIME_DECISION;
  policyMode: "fail_closed";
  allowed: false;
  reason: AiAgentMemoryRuntimeContractReason;
}

export function evaluateAiAgentMemoryRuntimeContract(args: {
  sessionOrganizationId?: Id<"organizations"> | string | null;
  requestedOrganizationId?: Id<"organizations"> | string | null;
  sessionChannel?: string | null;
  requestedChannel?: string | null;
  sessionExternalContactIdentifier?: string | null;
  requestedExternalContactIdentifier?: string | null;
  sessionRoutingKey?: string | null;
  requestedSessionRoutingKey?: string | null;
}): AiAgentMemoryRuntimeContractDecision {
  const sessionOrganizationId = normalizeRuntimeNonEmptyString(args.sessionOrganizationId);
  const requestedOrganizationId = normalizeRuntimeNonEmptyString(args.requestedOrganizationId);
  const sessionChannel = normalizeRuntimeNonEmptyString(args.sessionChannel);
  const requestedChannel = normalizeRuntimeNonEmptyString(args.requestedChannel);
  const sessionExternalContactIdentifier = normalizeRuntimeNonEmptyString(
    args.sessionExternalContactIdentifier,
  );
  const requestedExternalContactIdentifier = normalizeRuntimeNonEmptyString(
    args.requestedExternalContactIdentifier,
  );
  const sessionRoutingKey = normalizeRuntimeNonEmptyString(args.sessionRoutingKey);
  const requestedSessionRoutingKey = normalizeRuntimeNonEmptyString(
    args.requestedSessionRoutingKey,
  );

  const resolveReason = (): AiAgentMemoryRuntimeContractReason => {
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
      return "missing_scope";
    }
    if (sessionOrganizationId !== requestedOrganizationId) {
      return "session_org_mismatch";
    }
    if (sessionChannel !== requestedChannel) {
      return "channel_mismatch";
    }
    if (sessionExternalContactIdentifier !== requestedExternalContactIdentifier) {
      return "contact_mismatch";
    }
    if (sessionRoutingKey !== requestedSessionRoutingKey) {
      return "route_mismatch";
    }
    return "deprecated_contract";
  };

  return {
    contractVersion: AI_AGENT_MEMORY_RUNTIME_CONTRACT_VERSION,
    decision: AI_AGENT_MEMORY_RUNTIME_DECISION,
    policyMode: "fail_closed",
    allowed: false,
    reason: resolveReason(),
  };
}

function normalizeRuntimeCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.trunc(value));
}

interface RuntimeMemoryRefreshMutationResult {
  success?: boolean;
  reason?: string;
  error?: string;
}

interface RuntimeContactMemoryRefreshMutationResult
  extends RuntimeMemoryRefreshMutationResult {
  insertedCount?: number;
  supersededCount?: number;
  ambiguousFields?: string[];
}

export interface RuntimeMemoryLaneTelemetry {
  contractVersion: "occ_memory_lane_telemetry_v1";
  layerOrder: RuntimeMemoryLayer[];
  aiAgentMemory: AiAgentMemoryRuntimeContractDecision;
  rollingSummaryRefresh: {
    status: "success" | "blocked";
    reason?: string;
    error?: string;
  };
  contactMemoryRefresh: {
    status: "success" | "blocked";
    reason?: string;
    error?: string;
    insertedCount: number;
    supersededCount: number;
    ambiguousFieldCount: number;
    ambiguousFields: string[];
  };
}

export function buildRuntimeMemoryLaneTelemetry(args: {
  aiAgentMemoryContract: AiAgentMemoryRuntimeContractDecision;
  rollingMemoryRefresh?: RuntimeMemoryRefreshMutationResult | null;
  contactMemoryRefresh?: RuntimeContactMemoryRefreshMutationResult | null;
}): RuntimeMemoryLaneTelemetry {
  const rollingStatus = args.rollingMemoryRefresh?.success === true ? "success" : "blocked";
  const contactStatus = args.contactMemoryRefresh?.success === true ? "success" : "blocked";

  const ambiguousFieldSet = new Set<string>();
  for (const field of args.contactMemoryRefresh?.ambiguousFields ?? []) {
    const normalized = normalizeRuntimeNonEmptyString(field);
    if (normalized) {
      ambiguousFieldSet.add(normalized);
    }
  }
  const ambiguousFields = Array.from(ambiguousFieldSet).sort((a, b) => a.localeCompare(b));

  return {
    contractVersion: "occ_memory_lane_telemetry_v1",
    layerOrder: [...RUNTIME_MEMORY_LAYER_ORDER],
    aiAgentMemory: args.aiAgentMemoryContract,
    rollingSummaryRefresh: {
      status: rollingStatus,
      reason: normalizeRuntimeNonEmptyString(args.rollingMemoryRefresh?.reason) ?? undefined,
      error: normalizeRuntimeNonEmptyString(args.rollingMemoryRefresh?.error) ?? undefined,
    },
    contactMemoryRefresh: {
      status: contactStatus,
      reason: normalizeRuntimeNonEmptyString(args.contactMemoryRefresh?.reason) ?? undefined,
      error: normalizeRuntimeNonEmptyString(args.contactMemoryRefresh?.error) ?? undefined,
      insertedCount: normalizeRuntimeCount(args.contactMemoryRefresh?.insertedCount),
      supersededCount: normalizeRuntimeCount(args.contactMemoryRefresh?.supersededCount),
      ambiguousFieldCount: ambiguousFields.length,
      ambiguousFields,
    },
  };
}

function normalizeModelQualityTierFloorToken(value: unknown): ModelQualityTier {
  if (
    value === "gold"
    || value === "silver"
    || value === "bronze"
    || value === "unrated"
  ) {
    return value;
  }

  return "unrated";
}

function resolveRuntimeLocalConnectionContract(
  value: unknown
): LocalConnectionContract | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  return normalizeLocalConnectionContract({
    connectorId: record.connectorId,
    baseUrl: record.baseUrl,
    status: record.status,
    modelIds: record.modelIds,
    defaultModelId: record.defaultModelId,
    capabilityLimits: record.capabilityLimits,
    detectedAt: record.detectedAt,
  });
}

function resolveModelSwitchDriftWarning(
  decision: RuntimeModelRoutingPolicyDecision
): string | undefined {
  if (decision.modelSwitchDriftSeverity !== "high") {
    return undefined;
  }

  return "Model switch may reduce response quality consistency. Consider restoring your previous model or using a higher quality tier.";
}

export function hasReleaseReadyToolRoutingCandidate(args: {
  platformEnabledModels: Array<{
    capabilityMatrix?: {
      text?: boolean;
      vision?: boolean;
      audio_in?: boolean;
      audio_out?: boolean;
      tools?: boolean;
      json?: boolean;
    } | null;
  }>;
}): boolean {
  return args.platformEnabledModels.some((platformModel) =>
    evaluateRoutingCapabilityRequirements({
      capabilityMatrix: platformModel.capabilityMatrix ?? undefined,
      requiredCapabilities: ["tools", "json"],
    }).passed
  );
}

export function resolveRuntimeModelRoutingPolicyContract(args: {
  llmSettings?: Record<string, unknown> | null;
  modelRoutingMatrix: ModelRoutingMatrixEntry[];
  selectedModelId?: string | null;
}): RuntimeModelRoutingPolicyContract {
  const seed = resolveRuntimeModelRoutingPolicySeed(args.llmSettings);
  const localConnection = seed.localConnection;
  const privacyMode = seed.privacyMode;
  const qualityTierFloor = seed.qualityTierFloor;
  const localModelIds = seed.localModelIds;

  const decisions: RuntimeModelRoutingPolicyDecision[] =
    args.modelRoutingMatrix.map((entry) => {
      const privacyDecision = resolvePrivacyModeProviderDecision({
        privacyMode,
        providerId: entry.providerId ?? entry.modelId,
        localConnection,
        isLocalRoute: entry.isLocalModel,
      });
      return {
        modelId: entry.modelId,
        providerId: entry.providerId,
        privacyAllowed: privacyDecision.allowed,
        privacyBlockReason: privacyDecision.blockReason,
        privacyUserVisibleGuardrail: privacyDecision.userVisibleGuardrail,
        firewallAllowed: entry.firewallAllowed,
        firewallBlockReason: entry.firewallBlockReason,
        firewallUserVisibleMessage: entry.firewallUserVisibleMessage,
        routingReason: entry.reason,
        isLocalModel: entry.isLocalModel,
        modelSwitchDriftSeverity: entry.modelSwitchDrift?.severity,
        modelSwitchDriftOverall: entry.modelSwitchDrift?.overall,
      };
    });

  const allowedModelIds = decisions
    .filter((decision) => decision.privacyAllowed && decision.firewallAllowed)
    .map((decision) => decision.modelId);

  const firstPrivacyBlocked = decisions.find((decision) => !decision.privacyAllowed);
  const firstFirewallBlocked = decisions.find((decision) => !decision.firewallAllowed);
  const blockMessage =
    firstPrivacyBlocked?.privacyUserVisibleGuardrail
    ?? firstFirewallBlocked?.firewallUserVisibleMessage
    ?? (allowedModelIds.length === 0
      ? "No model route satisfies your privacy and quality policy. Update AI settings and retry."
      : undefined);

  const selectedDecision =
    decisions.find((decision) => decision.modelId === args.selectedModelId)
    ?? decisions[0];
  const selectedGuardrail = selectedDecision?.privacyUserVisibleGuardrail;
  const selectedModelDriftWarning = selectedDecision
    ? resolveModelSwitchDriftWarning(selectedDecision)
    : undefined;

  return {
    privacyMode,
    qualityTierFloor,
    localConnection,
    localModelIds,
    decisions,
    allowedModelIds,
    blocked: allowedModelIds.length === 0,
    blockMessage,
    selectedGuardrail,
    selectedModelDriftWarning,
  };
}

function resolveRuntimeModelRoutingPolicySeed(
  llmSettings?: Record<string, unknown> | null
): RuntimeModelRoutingPolicySeed {
  const settings = llmSettings ?? null;
  const localConnection = resolveRuntimeLocalConnectionContract(
    settings?.localConnection
  );

  return {
    privacyMode: normalizePrivacyMode(settings?.privacyMode),
    qualityTierFloor: normalizeModelQualityTierFloorToken(
      settings?.qualityTierFloor
    ),
    localConnection,
    localModelIds: Array.from(
      new Set<string>([
        ...normalizeRuntimeStringArray(settings?.localModelIds),
        ...(localConnection?.modelIds ?? []),
      ])
    ),
  };
}

export const CATALOG_CLONE_CAPABILITY_LIMITS_BLOCKED_MESSAGE =
  "Clone activation is blocked until required capabilities move from blocked to available now.";

/**
 * Spawn (or reuse) an org/user-scoped use-case agent clone from a protected template.
 * This action is approval-gated by org RBAC and delegates lifecycle management
 * to the worker pool clone factory.
 */
export const spawn_use_case_agent = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateAgentId: v.id("objects"),
    catalogAgentNumber: v.optional(v.number()),
    requestedAccessMode: v.optional(
      v.union(v.literal("invisible"), v.literal("direct"), v.literal("meeting")),
    ),
    requestedChannel: v.optional(v.string()),
    useCase: v.string(),
    ownerUserId: v.optional(v.id("users")),
    playbook: v.optional(v.string()),
    spawnReason: v.optional(v.string()),
    preferredCloneName: v.optional(v.string()),
    reuseExisting: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<
    | {
        status: "success";
        cloneAgentId: Id<"objects">;
        cloneAgentName: string;
        templateAgentId: Id<"objects">;
        ownerUserId: Id<"users">;
        reused: boolean;
        created: boolean;
        isPrimary: boolean;
        useCase: string;
        useCaseKey: string;
        quota: {
          orgUsed: number;
          templateUsed: number;
          ownerUsed: number;
          limits: {
            spawnEnabled: boolean;
            maxClonesPerOrg: number;
            maxClonesPerTemplatePerOrg: number;
            maxClonesPerOwner: number;
            allowedPlaybooks: string[] | null;
          };
        };
        catalogAgentNumber?: number;
        allowClone: boolean;
        capabilitySnapshot?: {
          availableNow: Array<{
            capabilityId: string;
            label: string;
          }>;
          blocked: Array<{
            capabilityId: string;
            label: string;
            blockerType: string;
            blockerKey?: string;
          }>;
        };
        noFitEscalation?: {
          minimum: string;
          deposit: string;
          onboarding: string;
        };
      }
    | {
        status: "blocked";
        reason: "catalog_template_mismatch" | "capability_limits_blocked";
        message: string;
        allowClone: false;
        catalogAgentNumber?: number;
        capabilitySnapshot?: {
          availableNow: Array<{
            capabilityId: string;
            label: string;
          }>;
          blocked: Array<{
            capabilityId: string;
            label: string;
            blockerType: string;
            blockerKey?: string;
          }>;
        };
        noFitEscalation?: {
          minimum: string;
          deposit: string;
          onboarding: string;
        };
      }
  > => {
    const auth = await ctx.runQuery(
      getInternal().rbacHelpers.requireAuthenticatedUserQuery,
      { sessionId: args.sessionId },
    ) as {
      userId: Id<"users">;
      organizationId: Id<"organizations">;
    };

    await ctx.runMutation(getInternal().rbacHelpers.requirePermissionMutation, {
      userId: auth.userId,
      permission: "manage_organization",
      organizationId: args.organizationId,
    });

    const ownerUserId = args.ownerUserId ?? auth.userId;
    const catalogAgentNumber =
      typeof args.catalogAgentNumber === "number" && Number.isFinite(args.catalogAgentNumber)
        ? Math.floor(args.catalogAgentNumber)
        : undefined;
    const preflight = catalogAgentNumber !== undefined
      ? await ctx.runQuery(getApi().api.ai.agentStoreCatalog.getClonePreflight, {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          catalogAgentNumber,
          ownerUserId,
          requestedAccessMode: args.requestedAccessMode,
          requestedChannel: args.requestedChannel,
        }) as {
          catalogAgentNumber: number;
          template: {
            templateAgentId?: Id<"objects">;
            hasTemplate: boolean;
            protectedTemplate: boolean;
          };
          capabilitySnapshot: {
            availableNow: Array<{
              capabilityId: string;
              label: string;
            }>;
            blocked: Array<{
              capabilityId: string;
              label: string;
              blockerType: string;
              blockerKey?: string;
            }>;
          };
          allowClone: boolean;
          noFitEscalation: {
            minimum: string;
            deposit: string;
            onboarding: string;
          };
        }
      : null;

    if (preflight?.template?.templateAgentId) {
      const expectedTemplateId = String(preflight.template.templateAgentId);
      const requestedTemplateId = String(args.templateAgentId);
      if (expectedTemplateId !== requestedTemplateId) {
        return {
          status: "blocked",
          reason: "catalog_template_mismatch",
          message:
            "Catalog clone preflight failed because the selected template does not match the requested catalog entry.",
          allowClone: false,
          catalogAgentNumber: preflight.catalogAgentNumber,
          capabilitySnapshot: preflight.capabilitySnapshot,
          noFitEscalation: preflight.noFitEscalation,
        };
      }
    }

    if (preflight && !preflight.allowClone) {
      return {
        status: "blocked",
        reason: "capability_limits_blocked",
        message: CATALOG_CLONE_CAPABILITY_LIMITS_BLOCKED_MESSAGE,
        allowClone: false,
        catalogAgentNumber: preflight.catalogAgentNumber,
        capabilitySnapshot: preflight.capabilitySnapshot,
        noFitEscalation: preflight.noFitEscalation,
      };
    }

    const spawnResult = await ctx.runMutation(
      getInternal().ai.workerPool.spawnUseCaseAgent,
      {
        organizationId: args.organizationId,
        templateAgentId: args.templateAgentId,
        ownerUserId,
        requestedByUserId: auth.userId,
        useCase: args.useCase,
        playbook: args.playbook,
        spawnReason: args.spawnReason,
        preferredCloneName: args.preferredCloneName,
        reuseExisting: args.reuseExisting,
        metadata: args.metadata,
      },
    ) as {
      cloneAgentId: Id<"objects">;
      reused: boolean;
      created: boolean;
      useCase: string;
      useCaseKey: string;
      quota: {
        orgUsed: number;
        templateUsed: number;
        ownerUsed: number;
        limits: {
          spawnEnabled: boolean;
          maxClonesPerOrg: number;
          maxClonesPerTemplatePerOrg: number;
          maxClonesPerOwner: number;
          allowedPlaybooks: string[] | null;
        };
      };
    };

    const cloneAgent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
      agentId: spawnResult.cloneAgentId,
    }) as { name?: string; customProperties?: Record<string, unknown> } | null;
    const cloneCustomProperties =
      cloneAgent?.customProperties && typeof cloneAgent.customProperties === "object"
        ? cloneAgent.customProperties
        : {};

    return {
      status: "success",
      cloneAgentId: spawnResult.cloneAgentId,
      cloneAgentName:
        typeof cloneAgent?.name === "string" && cloneAgent.name.trim().length > 0
          ? cloneAgent.name
          : "Use Case Agent Clone",
      templateAgentId: args.templateAgentId,
      ownerUserId,
      reused: spawnResult.reused,
      created: spawnResult.created,
      isPrimary: cloneCustomProperties.isPrimary === true,
      useCase: spawnResult.useCase,
      useCaseKey: spawnResult.useCaseKey,
      quota: spawnResult.quota,
      catalogAgentNumber: preflight?.catalogAgentNumber,
      allowClone: preflight?.allowClone ?? true,
      capabilitySnapshot: preflight?.capabilitySnapshot,
      noFitEscalation: preflight?.noFitEscalation,
    };
  },
});

const VACATION_DAY_MS = 24 * 60 * 60 * 1000;
const VACATION_ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const VACATION_GOOGLE_WRITE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];
const VACATION_POLICY_TYPE = "pharmacist_vacation_policy";
const VACATION_POLICY_TOOL = "slack_vacation_scheduler";
const VACATION_OVERRIDE_SOURCE = "none";

type VacationDecisionVerdict = "approved" | "conflict" | "denied" | "blocked";

function normalizeVacationString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeVacationStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => normalizeVacationString(entry))
        .filter((entry): entry is string => Boolean(entry))
    )
  );
}

function normalizeVacationVerdict(value: unknown): VacationDecisionVerdict | undefined {
  if (
    value === "approved" ||
    value === "conflict" ||
    value === "denied" ||
    value === "blocked"
  ) {
    return value;
  }
  return undefined;
}

function parseVacationIsoDateToUtcStart(value: string): number | undefined {
  const match = VACATION_ISO_DATE_PATTERN.exec(value);
  if (!match) return undefined;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!valid) return undefined;
  return Date.UTC(year, month - 1, day);
}

function formatVacationUtcDay(value: number): string {
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToVacationIsoDate(value: string, days: number): string | undefined {
  const utcStart = parseVacationIsoDateToUtcStart(value);
  if (utcStart === undefined) return undefined;
  return formatVacationUtcDay(utcStart + days * VACATION_DAY_MS);
}

function resolveVacationRangeDays(
  requestedStartDate?: string,
  requestedEndDate?: string
): number | undefined {
  if (!requestedStartDate || !requestedEndDate) return undefined;
  const start = parseVacationIsoDateToUtcStart(requestedStartDate);
  const end = parseVacationIsoDateToUtcStart(requestedEndDate);
  if (start === undefined || end === undefined || end < start) return undefined;
  return Math.floor((end - start) / VACATION_DAY_MS) + 1;
}

function hasGoogleCalendarWriteScope(scopes: unknown): boolean {
  if (!Array.isArray(scopes)) return false;
  const normalized = scopes
    .map((scope) => normalizeVacationString(scope))
    .filter((scope): scope is string => Boolean(scope));
  return normalized.some((scope) => VACATION_GOOGLE_WRITE_SCOPES.includes(scope));
}

function toBoundedPositiveInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.floor(value);
  if (rounded < minimum) return minimum;
  if (rounded > maximum) return maximum;
  return rounded;
}

function resolveVacationBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

async function persistVacationSessionReply(args: {
  ctx: unknown;
  organizationId: Id<"organizations">;
  sessionId: Id<"agentSessions">;
  channel: string;
  externalContactIdentifier: string;
  inboundMessage: string;
  assistantMessage: string;
  metadata: Record<string, unknown>;
}): Promise<string> {
  await (args.ctx as any).runMutation(getInternal().ai.agentSessions.addSessionMessage, {
    sessionId: args.sessionId,
    role: "user",
    content: args.inboundMessage,
  });
  await (args.ctx as any).runMutation(getInternal().ai.agentSessions.addSessionMessage, {
    sessionId: args.sessionId,
    role: "assistant",
    content: args.assistantMessage,
  });

  const formattedContent = formatAssistantContentForDelivery(
    args.channel,
    args.assistantMessage,
    args.metadata
  );
  if (!args.metadata.skipOutbound && args.channel !== "api_test") {
    try {
      await (args.ctx as any).runAction(getInternal().channels.router.sendMessage, {
        organizationId: args.organizationId,
        channel: args.channel,
        recipientIdentifier: args.externalContactIdentifier,
        content: formattedContent,
        providerConversationId: args.metadata.providerConversationId as
          | string
          | undefined,
      });
    } catch {
      // Best-effort delivery: message is still persisted in session history.
    }
  }

  return formattedContent;
}

async function recordVacationGuardrailTrustEvent(args: {
  ctx: unknown;
  organizationId: Id<"organizations">;
  sessionId: Id<"agentSessions">;
  channel: string;
  eventName:
    | "trust.guardrail.vacation_request_received.v1"
    | "trust.guardrail.vacation_policy_evaluated.v1"
    | "trust.guardrail.vacation_decision_recorded.v1"
    | "trust.guardrail.vacation_calendar_mutation.v1"
    | "trust.guardrail.vacation_override_requested.v1";
  policyId: string;
  enforcementDecision: string;
  failureReason?: string;
  now: number;
}): Promise<string | null> {
  const payload = {
    event_id: `trust:${args.eventName}:${String(args.sessionId)}:${args.now}:${args.enforcementDecision}`,
    event_version: "v1",
    occurred_at: args.now,
    org_id: args.organizationId,
    mode: "runtime" as const,
    channel: args.channel,
    session_id: String(args.sessionId),
    actor_type: "system" as const,
    actor_id: "agent_execution",
    policy_type: VACATION_POLICY_TYPE,
    policy_id: args.policyId,
    tool_name: VACATION_POLICY_TOOL,
    enforcement_decision: args.enforcementDecision,
    override_source: VACATION_OVERRIDE_SOURCE,
    failure_reason: args.failureReason,
  };

  try {
    await (args.ctx as any).runMutation(
      getInternal().ai.voiceRuntime.recordVoiceTrustEvent,
      {
        eventName: args.eventName,
        payload,
      }
    );
    return payload.event_id;
  } catch (error) {
    console.error("[AgentExecution] Failed to record vacation guardrail trust event", {
      eventName: args.eventName,
      error: String(error),
    });
    return null;
  }
}

const FRONTLINE_INTAKE_TRIGGER_PATTERN = /(?:^|\n)trigger=([a-z_]+)/i;
const FRONTLINE_BOUNDARY_REASON_PATTERN = /(?:^|\n)boundary_reason=([^\n]+)/i;

function resolveFrontlineIntakeTrigger(args: {
  inboundMessage: string;
  inboundMetadata: Record<string, unknown>;
}): string {
  const metadataTrigger = normalizeVacationString(
    args.inboundMetadata.frontlineIntakeTrigger
  );
  if (metadataTrigger) {
    return metadataTrigger.toLowerCase();
  }

  const kickoffTriggerMatch = FRONTLINE_INTAKE_TRIGGER_PATTERN.exec(
    args.inboundMessage,
  );
  if (kickoffTriggerMatch && kickoffTriggerMatch[1]) {
    return kickoffTriggerMatch[1].trim().toLowerCase();
  }

  return "runtime_capability_gap";
}

function resolveFrontlineBoundaryReason(args: {
  inboundMessage: string;
  inboundMetadata: Record<string, unknown>;
  fallbackReason: string;
}): string {
  const metadataBoundaryReason = normalizeVacationString(
    args.inboundMetadata.frontlineBoundaryReason
  ) || normalizeVacationString(args.inboundMetadata.boundaryReason);
  if (metadataBoundaryReason) {
    return metadataBoundaryReason;
  }

  const kickoffBoundaryMatch = FRONTLINE_BOUNDARY_REASON_PATTERN.exec(
    args.inboundMessage,
  );
  if (kickoffBoundaryMatch && kickoffBoundaryMatch[1]) {
    return kickoffBoundaryMatch[1].trim();
  }

  return normalizeVacationString(args.fallbackReason) || "runtime_boundary_unspecified";
}

async function recordToolFoundryExecutionBlockedTrustEvent(args: {
  ctx: unknown;
  organizationId: Id<"organizations">;
  sessionId: Id<"agentSessions">;
  channel: string;
  blockedCapabilityGap: ToolCapabilityGapBlockedPayload;
  now: number;
  actorId?: string;
  lineageId?: string;
  threadId?: string;
  workflowKey?: string;
  correlationId?: string;
  frontlineIntakeTrigger?: string;
  boundaryReason?: string;
}): Promise<string | null> {
  const proposalKey = args.blockedCapabilityGap.proposalArtifact.proposalKey;
  const requestedToolName = args.blockedCapabilityGap.missing.requestedToolName;
  const resolvedRiskLevel = args.blockedCapabilityGap.proposalArtifact.draft.riskLabels
    .map((value) => value.trim().toLowerCase())
    .find((value) => value === "critical" || value === "high" || value === "medium" || value === "low")
    || "unknown";
  const lineageId =
    normalizeVacationString(args.lineageId)
    || `lineage:tool_foundry:${String(args.organizationId)}`;
  const threadId =
    normalizeVacationString(args.threadId)
    || `thread:tool_foundry:${proposalKey}`;
  const correlationId = normalizeVacationString(args.correlationId)
    || buildTrustTimelineCorrelationId({
      lineageId,
      threadId,
      surface: "proposal",
      sourceId: proposalKey,
    });
  const rollbackTarget = `rollback:${proposalKey}:${args.blockedCapabilityGap.code}`;
  const payload = {
    event_id: `trust:trust.tool_foundry.execution_blocked.v1:${proposalKey}:${args.now}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: args.now,
    org_id: args.organizationId,
    mode: "runtime" as const,
    channel: args.channel,
    session_id: String(args.sessionId),
    actor_type: "system" as const,
    actor_id: args.actorId || "agent_execution",
    proposal_id: proposalKey,
    proposal_version: args.blockedCapabilityGap.proposalArtifact.contractVersion,
    tool_name: requestedToolName,
    risk_level: resolvedRiskLevel,
    review_decision: "blocked",
    rollback_target: rollbackTarget,
    decision_reason: args.blockedCapabilityGap.code,
    correlation_id: correlationId,
    lineage_id: lineageId,
    thread_id: threadId,
    workflow_key: normalizeVacationString(args.workflowKey) || "tool_foundry_review",
    frontline_intake_trigger:
      normalizeVacationString(args.frontlineIntakeTrigger)
      || "runtime_capability_gap",
    boundary_reason:
      normalizeVacationString(args.boundaryReason)
      || normalizeVacationString(args.blockedCapabilityGap.reason)
      || args.blockedCapabilityGap.code,
    event_namespace: `${TRUST_EVENT_NAMESPACE}.tool_foundry`,
  };

  try {
    await (args.ctx as any).runMutation(
      getInternal().ai.voiceRuntime.recordVoiceTrustEvent,
      {
        eventName: "trust.tool_foundry.execution_blocked.v1",
        payload,
      }
    );
    return payload.event_id;
  } catch (error) {
    console.error("[AgentExecution] Failed to record tool foundry execution-blocked trust event", {
      proposalKey,
      sessionId: args.sessionId,
      error: String(error),
    });
    return null;
  }
}

async function maybeHandleSlackVacationPolicyDecision(args: {
  ctx: unknown;
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  sessionId: Id<"agentSessions">;
  turnId: Id<"agentTurns">;
  channel: string;
  externalContactIdentifier: string;
  inboundMessage: string;
  inboundMetadata: Record<string, unknown>;
}): Promise<{
  status: string;
  message: string;
  response: string;
  sessionId: Id<"agentSessions">;
  turnId: Id<"agentTurns">;
} | null> {
  if (args.channel !== "slack") {
    return null;
  }

  const vacationRequestObjectId = normalizeVacationString(
    args.inboundMetadata.slackVacationRequestObjectId
  );
  const hasVacationSignal =
    args.inboundMetadata.slackVacationRequestDetected === true ||
    Boolean(vacationRequestObjectId);
  if (!hasVacationSignal) {
    return null;
  }

  const blockedWithoutRequest = () =>
    buildVacationDecisionResponse({
      verdict: "blocked",
      reasonCodes: ["missing_vacation_request_object_id"],
      requestedStartDate: normalizeVacationString(
        args.inboundMetadata.slackVacationRequestStartDate
      ),
      requestedEndDate: normalizeVacationString(
        args.inboundMetadata.slackVacationRequestEndDate
      ),
    });

  if (!vacationRequestObjectId) {
    const blockedResponse = blockedWithoutRequest();
    const formattedResponse = await persistVacationSessionReply({
      ctx: args.ctx,
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      inboundMessage: args.inboundMessage,
      assistantMessage: blockedResponse.responseMessage,
      metadata: args.inboundMetadata,
    });
    return {
      status: "blocked",
      message: blockedResponse.responseMessage,
      response: formattedResponse,
      sessionId: args.sessionId,
      turnId: args.turnId,
    };
  }

  const vacationRequests = (await (args.ctx as any).runQuery(
    getInternal().channels.router.listObjectsByOrgTypeInternal,
    {
      organizationId: args.organizationId,
      type: "vacation_request",
    }
  )) as Array<{
    _id: Id<"objects">;
    status?: string;
    customProperties?: unknown;
  }>;
  const requestRecord = vacationRequests.find(
    (request) => String(request._id) === vacationRequestObjectId
  );

  if (!requestRecord) {
    const blockedResponse = buildVacationDecisionResponse({
      verdict: "blocked",
      reasonCodes: ["vacation_request_not_found"],
    });
    const formattedResponse = await persistVacationSessionReply({
      ctx: args.ctx,
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      inboundMessage: args.inboundMessage,
      assistantMessage: blockedResponse.responseMessage,
      metadata: args.inboundMetadata,
    });
    return {
      status: "blocked",
      message: blockedResponse.responseMessage,
      response: formattedResponse,
      sessionId: args.sessionId,
      turnId: args.turnId,
    };
  }

  const requestProps = (requestRecord.customProperties || {}) as Record<string, unknown>;
  const now = Date.now();
  const sourceMetadata = (requestProps.sourceMetadata || {}) as Record<string, unknown>;
  const storedTeamId = normalizeVacationString(sourceMetadata.teamId);
  const storedChannelId = normalizeVacationString(sourceMetadata.channelId);
  const inboundTeamId = normalizeVacationString(args.inboundMetadata.slackTeamId);
  const inboundChannelId = normalizeVacationString(args.inboundMetadata.slackChannelId);
  const requestedStartDate =
    normalizeVacationString(requestProps.requestedStartDate) ||
    normalizeVacationString(args.inboundMetadata.slackVacationRequestStartDate);
  const requestedEndDate =
    normalizeVacationString(requestProps.requestedEndDate) ||
    normalizeVacationString(args.inboundMetadata.slackVacationRequestEndDate);
  const blockedReasons = normalizeVacationStringArray([
    ...normalizeVacationStringArray(requestProps.blockedReasons),
    ...normalizeVacationStringArray(
      args.inboundMetadata.slackVacationRequestBlockedReasons
    ),
  ]);
  const evaluationReasonCodes = normalizeVacationStringArray([
    ...normalizeVacationStringArray(requestProps.policyEvaluationReasonCodes),
    ...normalizeVacationStringArray(
      args.inboundMetadata.slackVacationRequestEvaluationReasonCodes
    ),
  ]);

  let verdict =
    normalizeVacationVerdict(args.inboundMetadata.slackVacationRequestEvaluationVerdict) ||
    normalizeVacationVerdict(requestProps.policyEvaluationVerdict);
  if (!verdict) {
    const failClosed =
      requestProps.failClosed === true ||
      args.inboundMetadata.slackVacationRequestFailClosed === true;
    verdict = failClosed ? "blocked" : "blocked";
  }

  let reasonCodes =
    verdict === "blocked"
      ? blockedReasons
      : evaluationReasonCodes;
  if (reasonCodes.length === 0 && verdict === "blocked") {
    reasonCodes = ["policy_prerequisites_unresolved"];
  }
  if (storedTeamId && inboundTeamId !== storedTeamId) {
    verdict = "blocked";
    reasonCodes = Array.from(
      new Set([...reasonCodes, "slack_team_scope_mismatch"])
    );
  }
  if (storedChannelId && inboundChannelId !== storedChannelId) {
    verdict = "blocked";
    reasonCodes = Array.from(
      new Set([...reasonCodes, "slack_channel_scope_mismatch"])
    );
  }

  const policyObjectIdString = normalizeVacationString(requestProps.policyObjectId);
  const policyIdForTrust = policyObjectIdString || "missing_policy_id";
  const requestReceivedTrustEventId = await recordVacationGuardrailTrustEvent({
    ctx: args.ctx,
    organizationId: args.organizationId,
    sessionId: args.sessionId,
    channel: args.channel,
    eventName: "trust.guardrail.vacation_request_received.v1",
    policyId: policyIdForTrust,
    enforcementDecision: "vacation_request_received",
    failureReason:
      blockedReasons.length > 0 ? blockedReasons.join(",") : undefined,
    now,
  });

  const policies = (await (args.ctx as any).runQuery(
    getInternal().channels.router.listObjectsByOrgTypeInternal,
    {
      organizationId: args.organizationId,
      type: "vacation_policy",
    }
  )) as Array<{
    _id: Id<"objects">;
    customProperties?: unknown;
  }>;
  const policyRecord = policyObjectIdString
    ? policies.find((policy) => String(policy._id) === policyObjectIdString)
    : undefined;
  if (!policyObjectIdString || !policyRecord) {
    verdict = "blocked";
    reasonCodes = Array.from(
      new Set([...reasonCodes, "missing_matching_vacation_policy"])
    );
  }
  const policyProps = (policyRecord?.customProperties || {}) as Record<string, unknown>;
  const conflictResolution = (policyProps.conflictResolution || {}) as Record<
    string,
    unknown
  >;
  const maxAlternativeWindows = toBoundedPositiveInteger(
    conflictResolution.maxAlternativeWindows,
    3,
    1,
    10
  );
  const alternativeWindowDays = toBoundedPositiveInteger(
    conflictResolution.alternativeWindowDays,
    14,
    1,
    90
  );
  const requireDirectColleagueDiscussion = resolveVacationBoolean(
    conflictResolution.requireDirectColleagueDiscussion,
    true
  );
  const colleagueDiscussionTemplate = normalizeVacationString(
    conflictResolution.colleagueDiscussionTemplate
  );

  const requesterRecord = (requestProps.requester || {}) as Record<string, unknown>;
  const requesterSlackUserId =
    normalizeVacationString(requesterRecord.slackUserId) ||
    normalizeVacationString(args.inboundMetadata.slackUserId);

  const alternatives: Array<{ startDate: string; endDate: string }> = [];
  const requestRangeDays = resolveVacationRangeDays(
    requestedStartDate,
    requestedEndDate
  );
  if (
    verdict === "conflict" &&
    policyRecord &&
    requestedStartDate &&
    requestedEndDate &&
    requestRangeDays
  ) {
    for (
      let dayOffset = 1;
      dayOffset <= alternativeWindowDays && alternatives.length < maxAlternativeWindows;
      dayOffset += 1
    ) {
      const candidateStartDate = addDaysToVacationIsoDate(
        requestedStartDate,
        dayOffset
      );
      const candidateEndDate = addDaysToVacationIsoDate(
        requestedEndDate,
        dayOffset
      );
      if (!candidateStartDate || !candidateEndDate) {
        continue;
      }

      const candidateEvaluation = (await (args.ctx as any).runAction(
        getInternal().bookingOntology.evaluatePharmacistVacationRequestInternal,
        {
          organizationId: args.organizationId,
          policyObjectId: policyRecord._id,
          requestObjectId: requestRecord._id,
          requestedStartDate: candidateStartDate,
          requestedEndDate: candidateEndDate,
          requesterSlackUserId,
        }
      )) as {
        verdict?: string;
      } | null;

      if (candidateEvaluation?.verdict === "approved") {
        alternatives.push({
          startDate: candidateStartDate,
          endDate: candidateEndDate,
        });
      }
    }
  }

  const decisionTrustEventId = await recordVacationGuardrailTrustEvent({
    ctx: args.ctx,
    organizationId: args.organizationId,
    sessionId: args.sessionId,
    channel: args.channel,
    eventName: "trust.guardrail.vacation_policy_evaluated.v1",
    policyId: policyIdForTrust,
    enforcementDecision: `vacation_request_${verdict}`,
    failureReason: reasonCodes.join(",") || undefined,
    now,
  });

  let calendarMutationStatus: "succeeded" | "skipped" | "failed" = "skipped";
  let calendarMutationAttempted = false;
  let calendarMutationSucceeded = false;
  let calendarMutationEventId: string | undefined;

  if (verdict === "approved" && policyRecord && requestedStartDate && requestedEndDate) {
    const integrations = (policyProps.integrations || {}) as Record<string, unknown>;
    const googleCalendarIntegration = (integrations.googleCalendar || {}) as Record<
      string,
      unknown
    >;
    const googleConnectionId = normalizeVacationString(
      googleCalendarIntegration.providerConnectionId
    );
    const pushCalendarId =
      normalizeVacationString(googleCalendarIntegration.pushCalendarId) ||
      normalizeVacationStringArray(googleCalendarIntegration.blockingCalendarIds)[0] ||
      "primary";

    let writeReady = false;
    if (googleConnectionId) {
      try {
        const connection = (await (args.ctx as any).runQuery(
          getInternal().oauth.google.getConnection,
          { connectionId: googleConnectionId as Id<"oauthConnections"> }
        )) as
          | {
              organizationId?: Id<"organizations">;
              provider?: string;
              status?: string;
              scopes?: unknown;
              syncSettings?: unknown;
            }
          | null;
        const syncSettings = (connection?.syncSettings || {}) as Record<
          string,
          unknown
        >;
        writeReady =
          Boolean(connection) &&
          String(connection?.organizationId || "") === String(args.organizationId) &&
          connection?.provider === "google" &&
          connection?.status === "active" &&
          syncSettings.calendar === true &&
          hasGoogleCalendarWriteScope(connection?.scopes);
      } catch {
        writeReady = false;
      }
    }

    if (writeReady && googleConnectionId && decisionTrustEventId) {
      calendarMutationAttempted = true;
      try {
        const endExclusiveDate = addDaysToVacationIsoDate(requestedEndDate, 1);
        if (!endExclusiveDate) {
          throw new Error("invalid_request_end_date");
        }
        const createdCalendarEvent = (await (args.ctx as any).runAction(
          getApi().oauth.googleClient.createCalendarEvent,
          {
            connectionId: googleConnectionId as Id<"oauthConnections">,
            calendarId: pushCalendarId,
            eventData: {
              summary: `Vacation: ${normalizeVacationString(requesterRecord.displayName) || requesterSlackUserId || "team member"}`,
              description: `Vacation request ${vacationRequestObjectId} approved by policy runtime.`,
              start: { date: requestedStartDate },
              end: { date: endExclusiveDate },
              transparency: "opaque",
            },
          }
        )) as Record<string, unknown>;

        calendarMutationEventId = normalizeVacationString(createdCalendarEvent.id);
        calendarMutationSucceeded = Boolean(calendarMutationEventId);
        calendarMutationStatus = calendarMutationSucceeded ? "succeeded" : "failed";
      } catch (error) {
        console.error("[AgentExecution] Failed to create Google calendar event for vacation request", {
          requestObjectId: vacationRequestObjectId,
          error: String(error),
        });
        calendarMutationStatus = "failed";
      }
    }
  }

  const mutationTrustEventId =
    verdict === "approved"
      ? await recordVacationGuardrailTrustEvent({
          ctx: args.ctx,
          organizationId: args.organizationId,
          sessionId: args.sessionId,
          channel: args.channel,
          eventName: "trust.guardrail.vacation_calendar_mutation.v1",
          policyId: policyIdForTrust,
          enforcementDecision:
            calendarMutationStatus === "succeeded"
              ? "vacation_calendar_mutation_succeeded"
              : calendarMutationStatus === "failed"
                ? "vacation_calendar_mutation_failed"
                : "vacation_calendar_mutation_skipped_write_not_ready",
          failureReason:
            calendarMutationStatus === "failed"
              ? "vacation_calendar_mutation_failed"
              : undefined,
          now: now + 1,
        })
      : null;

  const responseContract = buildVacationDecisionResponse({
    verdict,
    requestedStartDate,
    requestedEndDate,
    reasonCodes,
    alternatives,
    requireDirectColleagueDiscussion,
    colleagueDiscussionTemplate,
    calendarMutationStatus,
  });

  const nextStatus =
    verdict === "approved"
      ? "approved"
      : verdict === "conflict"
        ? "conflict"
        : verdict === "denied"
          ? "denied"
          : "pending";
  const existingDecision = (requestProps.decision || {}) as Record<string, unknown>;
  const existingCalendarMutation = (requestProps.calendarMutation || {}) as Record<
    string,
    unknown
  >;
  const existingTrustEvidence = (requestProps.trustEvidence || {}) as Record<
    string,
    unknown
  >;
  await (args.ctx as any).runMutation(getInternal().channels.router.patchObjectInternal, {
    objectId: requestRecord._id,
    status: nextStatus,
    customProperties: {
      ...requestProps,
      policyEvaluationVerdict: verdict,
      policyEvaluationReasonCodes: reasonCodes,
      decision: {
        ...existingDecision,
        verdict,
        reasonCodes,
        rationale: responseContract.rationale,
        alternatives,
        colleagueResolutionSuggested: responseContract.colleagueResolutionSuggested,
        responseMessage: responseContract.responseMessage,
        decidedAt: now,
        decidedBy: "agent_execution",
      },
      calendarMutation: {
        ...existingCalendarMutation,
        attempted: calendarMutationAttempted,
        succeeded: calendarMutationSucceeded,
        status: calendarMutationStatus,
        calendarEventId: calendarMutationEventId,
      },
      trustEvidence: {
        ...existingTrustEvidence,
        policyDecisionTrustEventId: decisionTrustEventId,
        calendarMutationTrustEventId: mutationTrustEventId,
      },
    },
    updatedAt: now,
  });

  const decisionRecordedTrustEventId = await recordVacationGuardrailTrustEvent({
    ctx: args.ctx,
    organizationId: args.organizationId,
    sessionId: args.sessionId,
    channel: args.channel,
    eventName: "trust.guardrail.vacation_decision_recorded.v1",
    policyId: policyIdForTrust,
    enforcementDecision: `vacation_decision_${verdict}`,
    failureReason: reasonCodes.join(",") || undefined,
    now: now + 2,
  });

  await (args.ctx as any).runMutation(getInternal().ai.agentSessions.logAgentAction, {
    agentId: args.agentId,
    organizationId: args.organizationId,
    actionType: "vacation_request_policy_decision",
    actionData: {
      sessionId: args.sessionId,
      turnId: args.turnId,
      vacationRequestObjectId,
      verdict,
      reasonCodes,
      alternatives,
      colleagueResolutionSuggested: responseContract.colleagueResolutionSuggested,
      calendarMutationStatus,
      requestReceivedTrustEventId,
      policyDecisionTrustEventId: decisionTrustEventId,
      calendarMutationTrustEventId: mutationTrustEventId,
      decisionRecordedTrustEventId,
    },
  });

  const formattedResponse = await persistVacationSessionReply({
    ctx: args.ctx,
    organizationId: args.organizationId,
    sessionId: args.sessionId,
    channel: args.channel,
    externalContactIdentifier: args.externalContactIdentifier,
    inboundMessage: args.inboundMessage,
    assistantMessage: responseContract.responseMessage,
    metadata: args.inboundMetadata,
  });

  return {
    status: verdict === "approved" ? "success" : verdict,
    message: responseContract.responseMessage,
    response: formattedResponse,
    sessionId: args.sessionId,
    turnId: args.turnId,
  };
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

/**
 * Process an inbound message through the agent pipeline.
 * Entry point for all channels (WhatsApp, email, webchat, native_guest, SMS, API test).
 */
export const processInboundMessage = action({
  args: {
    organizationId: v.id("organizations"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<{
    status: string;
    message?: string;
    response?: string;
    modelResolution?: {
      requestedModel?: string;
      selectedModel: string;
      usedModel?: string;
      selectedAuthProfileId?: string;
      usedAuthProfileId?: string;
      selectionSource: string;
      fallbackUsed: boolean;
      fallbackReason?: string;
    };
    toolResults?: Array<{ tool: string; status: string; result?: unknown; error?: string }>;
    sessionId?: string;
    turnId?: string;
    voiceRuntime?: Record<string, unknown>;
    waitpoint?: HitlWaitpointPublicState;
  }> => {
    const runtimeGovernorStartedAt = Date.now();
    const inboundMetadata = {
      ...((args.metadata as Record<string, unknown>) || {}),
    };
    let runtimeGovernorContract: RuntimeGovernorContract = resolveRuntimeGovernorContract({
      metadata: inboundMetadata,
    });
    let runtimeGovernorToolCallsTrimmed = 0;
    let runtimeGovernorLimitTriggered: RuntimeGovernorLimit = "none";
    const inboundChannelRouteIdentity = resolveInboundChannelRouteIdentity(
      inboundMetadata
    );
    const inboundDispatchRouteSelectors = resolveInboundDispatchRouteSelectors({
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      metadata: inboundMetadata,
    });

    await ctx.runMutation(
      getInternal().ai.settings.ensureOrganizationModelDefaultsInternal,
      {
        organizationId: args.organizationId,
      }
    );

    // 1. Load agent config (with worker pool fallback for system bot)
    let agent = await ctx.runQuery(getInternal().agentOntology.getActiveAgentForOrg, {
      organizationId: args.organizationId,
      channel: args.channel,
      routeSelectors: inboundDispatchRouteSelectors,
    });

    if (!agent) {
      // No active agent — check if this org has a template agent (worker pool model).
      // If so, spawn/reuse a worker from the pool.
      const template = await ctx.runQuery(getInternal().agentOntology.getTemplateAgent, {
        organizationId: args.organizationId,
      });

      if (template) {
        const workerId = await ctx.runMutation(getInternal().ai.workerPool.getOnboardingWorker, {
          platformOrgId: args.organizationId,
        });
        agent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
          agentId: workerId,
        });
      }
    }

    if (!agent) {
      const ensuredAgent = await ctx.runMutation(
        getInternal().agentOntology.ensureActiveAgentForOrgInternal,
        {
          organizationId: args.organizationId,
          channel: args.channel,
          routeSelectors: inboundDispatchRouteSelectors,
        }
      );
      if (ensuredAgent?.agentId) {
        agent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
          agentId: ensuredAgent.agentId,
        });
      }
    }

    if (!agent) {
      return { status: "error", message: "No active agent found for this organization" };
    }

    // Update worker's last active timestamp if this is a worker
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentProps = (agent.customProperties || {}) as Record<string, any>;
    if (agentProps.templateAgentId) {
      try {
        await ctx.runMutation(getInternal().ai.workerPool.touchWorker, {
          workerId: agent._id,
        });
      } catch {
        // Non-fatal — worker touch is best-effort
      }
    }

    const config = (agent.customProperties || {}) as unknown as AgentConfig;
    let authorityAgent = agent;
    let authorityConfig = {
      ...config,
    } as AgentConfig;

    // 2. Check rate limits
    const rateLimitCheck = await ctx.runQuery(getInternal().ai.agentSessions.checkAgentRateLimit, {
      agentId: agent._id,
      organizationId: args.organizationId,
      maxMessagesPerDay: config.maxMessagesPerDay || 100,
      maxCostPerDay: config.maxCostPerDay || 5.0,
    });

    if (!rateLimitCheck.allowed) {
      return { status: "rate_limited", message: rateLimitCheck.message };
    }

    // 3. Resolve or create session
    const session = await ctx.runMutation(getInternal().ai.agentSessions.resolveSession, {
      agentId: agent._id,
      organizationId: args.organizationId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      channelRouteIdentity: inboundChannelRouteIdentity,
    });

    if (!session) {
      return { status: "error", message: "Failed to create session" };
    }

    const isFirstInboundMessage = session.messageCount === 0;
    let effectiveSessionMode = session.sessionMode;
    let effectiveInterviewTemplateId = session.interviewTemplateId as Id<"objects"> | undefined;

    if (isFirstInboundMessage) {
      try {
        const ensuredOnboardingSession = await ctx.runAction(
          getInternal().onboarding.universalOnboardingRuntime.ensureOnboardingSessionMode,
          {
            sessionId: session._id,
            organizationId: args.organizationId,
            agentId: agent._id,
            channel: args.channel,
            externalContactIdentifier: args.externalContactIdentifier,
          }
        ) as {
          applied?: boolean;
          sessionMode?: string;
          interviewTemplateId?: Id<"objects">;
        };

        if (ensuredOnboardingSession?.applied) {
          effectiveSessionMode = ensuredOnboardingSession.sessionMode || "guided";
          effectiveInterviewTemplateId =
            ensuredOnboardingSession.interviewTemplateId || effectiveInterviewTemplateId;
        }
      } catch (onboardingInitError) {
        console.error(
          "[AgentExecution] Failed to initialize universal onboarding session mode (non-blocking):",
          onboardingInitError
        );
      }
    }

    try {
      const bootstrapResult = await ctx.runAction(
        getInternal().onboarding.channelBootstrap.processInboundFirstMessageBootstrap,
        {
          organizationId: args.organizationId,
          channel: args.channel,
          externalContactIdentifier: args.externalContactIdentifier,
          sessionId: session._id,
          message: args.message,
          isFirstInboundMessage,
          providerConnectionId: firstInboundString(
            inboundMetadata.providerConnectionId,
            inboundMetadata.oauthConnectionId
          ),
          providerAccountId: firstInboundString(
            inboundMetadata.providerAccountId,
            inboundMetadata.accountId,
            inboundMetadata.slackTeamId,
            inboundMetadata.teamId
          ),
          routeKey: firstInboundString(
            inboundMetadata.routeKey,
            inboundMetadata.bindingRouteKey,
            inboundMetadata.providerRouteKey
          ),
          occurredAt: resolveInboundIngressOccurredAt(inboundMetadata, Date.now()),
        }
      ) as {
        detectedCode?: string;
        validation?: {
          isValid?: boolean;
          reason?: string;
          channelTag?: string;
          sourceDetail?: string;
        };
        latencyMetric?: Record<string, unknown>;
      } | null;

      if (bootstrapResult?.detectedCode) {
        inboundMetadata.bootstrapDetectedBetaCode = bootstrapResult.detectedCode;
        inboundMetadata.bootstrapBetaCodeValidation = bootstrapResult.validation;
        if (bootstrapResult.validation?.isValid) {
          inboundMetadata.betaCode = bootstrapResult.detectedCode;
        }
      }
      if (bootstrapResult?.latencyMetric) {
        inboundMetadata.channelFirstMessageLatency = bootstrapResult.latencyMetric;
      }
    } catch (bootstrapError) {
      console.warn(
        "[agentExecution] Channel bootstrap failed (non-blocking):",
        bootstrapError
      );
    }

    if (String(session.agentId) !== String(authorityAgent._id)) {
      const primarySessionAgent = await ctx.runQuery(
        getInternal().agentOntology.getAgentInternal,
        {
          agentId: session.agentId,
        }
      );
      if (primarySessionAgent) {
        authorityAgent = primarySessionAgent;
        authorityConfig = {
          ...(
            primarySessionAgent.customProperties || {}
          ) as AgentConfig,
        };
      }
    }

    runtimeGovernorContract = resolveRuntimeGovernorContract({
      agentConfig: authorityConfig as unknown as Record<string, unknown>,
      metadata: inboundMetadata,
    });
    inboundMetadata.runtimeGovernor = runtimeGovernorContract;

    await ctx.runMutation(getInternal().ai.agentSessions.recoverStaleRunningTurns, {
      organizationId: args.organizationId,
      sessionId: session._id,
      agentId: authorityAgent._id,
      reason: "inbound_turn_start",
    });

    const collaborationSnapshot = resolveSessionCollaborationSnapshot(session);
    const baseIngressEnvelope = resolveInboundIngressEnvelope({
      organizationId: args.organizationId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      metadata: inboundMetadata,
      routeIdentity: inboundChannelRouteIdentity,
      authority: {
        primaryAgentId: authorityAgent._id,
        authorityAgentId: authorityAgent._id,
        speakerAgentId: authorityAgent._id,
      },
    });
    const runtimeContracts = resolveInboundRuntimeContracts({
      organizationId: args.organizationId,
      channel: args.channel,
      message: args.message,
      metadata: inboundMetadata,
      routeIdentity: inboundChannelRouteIdentity,
      collaboration: collaborationSnapshot,
    });
    const inboundIdempotencyKey = resolveInboundIdempotencyKey({
      providedKey: inboundMetadata.idempotencyKey,
      metadata: inboundMetadata,
      organizationId: args.organizationId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      message: args.message,
      channelRouteIdentity: inboundChannelRouteIdentity,
      runtimeContracts,
    });

    const receiptIngress = await ctx.runMutation(getInternal().ai.agentExecution.ingestInboundReceipt, {
      organizationId: args.organizationId,
      sessionId: session._id,
      agentId: authorityAgent._id,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      idempotencyKey: inboundIdempotencyKey,
      idempotencyContract: runtimeContracts.idempotencyContract,
      queueContract: runtimeContracts.queueContract,
      metadata: {
        channel: args.channel,
        externalContactIdentifier: args.externalContactIdentifier,
        channelRouteIdentity: inboundChannelRouteIdentity,
        routeSelectors: inboundDispatchRouteSelectors,
        ingressEnvelope: baseIngressEnvelope,
      },
    }) as {
      receiptId?: Id<"agentInboxReceipts">;
      duplicate?: boolean;
      status?: string;
      turnId?: Id<"agentTurns">;
      conflictLabel?: TurnQueueConflictLabel;
      replayOutcome?: string;
      error?: string;
    } | null;

    if (receiptIngress?.error === "conflict_commit_in_progress") {
      return {
        status: "blocked_sync_checkpoint",
        message: "A commit is already processing for this collaboration lineage.",
        sessionId: session._id,
      };
    }

    const runtimeReceiptId = receiptIngress?.receiptId;
    if (!runtimeReceiptId) {
      return {
        status: "error",
        message: "Failed to ingest inbound receipt",
        sessionId: session._id,
      };
    }

    if (receiptIngress?.duplicate) {
      return {
        status: "duplicate_acknowledged",
        message: "Duplicate inbound event acknowledged.",
        sessionId: session._id,
        turnId: receiptIngress.turnId,
      };
    }

    const inboundTurn = await ctx.runMutation(getInternal().ai.agentSessions.createInboundTurn, {
      organizationId: args.organizationId,
      sessionId: session._id,
      agentId: authorityAgent._id,
      idempotencyKey: inboundIdempotencyKey,
      idempotencyContract: runtimeContracts.idempotencyContract,
      queueContract: runtimeContracts.queueContract,
      runAttempt: buildInitialRunAttemptContract(),
      metadata: {
        channel: args.channel,
        externalContactIdentifier: args.externalContactIdentifier,
        ingressEnvelope: baseIngressEnvelope,
      },
    }) as {
      turnId?: Id<"agentTurns">;
      transitionVersion?: number;
      duplicate?: boolean;
    } | null;

    const runtimeTurnId = inboundTurn?.turnId;
    if (!runtimeTurnId) {
      await ctx.runMutation(getInternal().ai.agentExecution.completeInboundReceipt, {
        receiptId: runtimeReceiptId,
        status: "failed",
        failureReason: "turn_initialization_failed",
      });
      return { status: "error", message: "Failed to initialize runtime turn", sessionId: session._id };
    }

    let runtimeTurnVersion =
      typeof inboundTurn?.transitionVersion === "number"
        ? inboundTurn.transitionVersion
        : 0;
    let runtimeLeaseToken: string | undefined;
    let turnRuntimeError: string | null = null;
    let terminalDeliverablePointer: TurnTerminalDeliverablePointer | undefined;

    const leaseAcquire = await acquireTurnLease(ctx, {
      turnId: runtimeTurnId,
      sessionId: session._id,
      agentId: authorityAgent._id,
      organizationId: args.organizationId,
      leaseOwner: `agentExecution:${args.channel}`,
      expectedVersion: runtimeTurnVersion,
      leaseDurationMs: 3 * 60_000,
      queueConcurrencyKey: runtimeContracts.queueContract.concurrencyKey,
    });

    if (!leaseAcquire.success || !leaseAcquire.leaseToken || typeof leaseAcquire.transitionVersion !== "number") {
      const leaseAcquireFailure = await handleTurnLeaseAcquireFailure({
        turnId: runtimeTurnId,
        receiptId: runtimeReceiptId,
        expectedVersion: runtimeTurnVersion,
        leaseAcquireError: leaseAcquire.error,
        duplicateTurn: Boolean(inboundTurn?.duplicate),
        failTurnLease: (leaseFailArgs) => failTurnLease(ctx, leaseFailArgs),
        recordTurnTerminalDeliverable: async (terminalWriteArgs) =>
          await ctx.runMutation(
            getInternal().ai.agentSessions.recordTurnTerminalDeliverable,
            terminalWriteArgs,
          ) as { success?: boolean; error?: string } | null,
        completeInboundReceipt: async (receiptFinalizeArgs) =>
          await ctx.runMutation(
            getInternal().ai.agentExecution.completeInboundReceipt,
            receiptFinalizeArgs,
          ) as { success?: boolean; error?: string } | null,
      });
      terminalDeliverablePointer = leaseAcquireFailure.terminalDeliverable;
      return {
        status: "error",
        message:
          leaseAcquire.error === "dual_active_turn"
          && (leaseAcquire as { conflictLabel?: string }).conflictLabel === "conflict_commit_in_progress"
            ? "A commit is already running for this collaboration lineage."
            : "Another turn is already running for this session.",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    runtimeTurnVersion = leaseAcquire.transitionVersion;
    runtimeLeaseToken = leaseAcquire.leaseToken;
    const receiptProcessing = await ctx.runMutation(getInternal().ai.agentExecution.markReceiptProcessing, {
      receiptId: runtimeReceiptId,
      turnId: runtimeTurnId,
    }) as { success?: boolean; error?: string } | null;
    if (!receiptProcessing?.success) {
      await ctx.runMutation(getInternal().ai.agentExecution.completeInboundReceipt, {
        receiptId: runtimeReceiptId,
        status: "failed",
        turnId: runtimeTurnId,
        failureReason: `receipt_processing_mark_failed:${receiptProcessing?.error ?? "unknown"}`,
      });
      return {
        status: "error",
        message: "Failed to mark inbound receipt as processing",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    try {
    const oneAgentRuntimeContract = {
      unifiedPersonality: resolveUnifiedPersonalityFlag(
        authorityConfig.unifiedPersonality
      ),
      teamAccessMode:
        normalizeTeamAccessModeToken(authorityConfig.teamAccessMode, "invisible")
        ?? "invisible",
      dreamTeamSpecialists: normalizeDreamTeamSpecialistContracts(
        authorityConfig.dreamTeamSpecialists,
      ),
    };

    // 3.25. Team session — if a specialist was tagged in, swap to the effective agent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamSession = (session as any).teamSession as {
      isTeamSession?: boolean;
      activeAgentId?: Id<"objects">;
      sharedContext?: string;
      handoffHistory?: Array<{
        fromAgentId: Id<"objects">;
        toAgentId: Id<"objects">;
        reason: string;
        summary?: string;
        goal?: string;
        contextSummary?: string;
        timestamp: number;
      }>;
    } | undefined;

    if (teamSession?.isTeamSession && teamSession.activeAgentId && teamSession.activeAgentId !== agent._id) {
      const effectiveAgent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
        agentId: teamSession.activeAgentId,
      });
      if (effectiveAgent) {
        agent = effectiveAgent;
        // Reload config from new agent's customProperties
        Object.assign(config, (effectiveAgent.customProperties || {}) as unknown as AgentConfig);
        // One-agent contracts remain anchored to the primary agent runtime config.
        config.unifiedPersonality = oneAgentRuntimeContract.unifiedPersonality;
        config.teamAccessMode = oneAgentRuntimeContract.teamAccessMode;
        config.dreamTeamSpecialists = oneAgentRuntimeContract.dreamTeamSpecialists;
      }
    }
    const delegationAuthorityContract = resolveDelegationAuthorityRuntimeContract({
      primaryAgentId: authorityAgent._id,
      primaryAgentSubtype: authorityAgent.subtype ?? undefined,
      primaryConfig: authorityConfig,
      speakerAgentId: agent._id,
    });
    const canonicalIngressEnvelope = resolveInboundIngressEnvelope({
      organizationId: args.organizationId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      metadata: inboundMetadata,
      routeIdentity: inboundChannelRouteIdentity,
      authority: {
        primaryAgentId: authorityAgent._id,
        authorityAgentId: delegationAuthorityContract.authorityAgentId,
        speakerAgentId: delegationAuthorityContract.speakerAgentId,
      },
    });

    // 3.5. Check if session has an active escalation (human-in-the-loop)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionEsc = (session as any).escalationState;
    const escalationStatus = typeof sessionEsc?.status === "string"
      ? sessionEsc.status
      : undefined;
    const inboundWaitpointToken = resolveInboundHitlWaitpointToken(inboundMetadata);
    const waitpointGate = escalationStatus === "pending"
      || escalationStatus === "taken_over"
      || escalationStatus === "resolved"
      || escalationStatus === "dismissed"
      || escalationStatus === "timed_out"
      ? await ctx.runMutation(getInternal().ai.agentExecution.enforceHitlWaitpointContract, {
          sessionId: session._id,
          turnId: runtimeTurnId,
          escalationStatus,
          providedToken: inboundWaitpointToken,
        }) as {
          success?: boolean;
          error?: string;
          waitpoint?: unknown;
          resumed?: boolean;
        } | null
      : null;
    const waitpointState = toPublicHitlWaitpointState(
      normalizeHitlWaitpointContract(waitpointGate?.waitpoint)
    );

    if (
      waitpointGate
      && !waitpointGate.success
      && (
        escalationStatus === "resolved"
        || escalationStatus === "dismissed"
        || escalationStatus === "timed_out"
        || waitpointGate.error === "escalation_status_mismatch"
      )
    ) {
      await ctx.runMutation(getInternal().ai.agentSessions.recordTurnRunAttempt, {
        turnId: runtimeTurnId,
        runAttempt: buildRunAttemptContract({
          attempts: 0,
          maxAttempts: LLM_RETRY_POLICY.maxAttempts,
          delayReason: "none",
          delayMs: 0,
          terminalOutcome: "blocked_sync_checkpoint",
        }),
      });
      return {
        status: "blocked_sync_checkpoint",
        message: resolveHitlWaitpointFailureMessage(waitpointGate.error),
        sessionId: session._id,
        turnId: runtimeTurnId,
        waitpoint: waitpointState,
      };
    }

    const collaborationSyncToken = resolveInboundCollaborationSyncCheckpointToken(
      inboundMetadata
    );
    const collaborationSyncRequired = (
      inboundMetadata.requireSyncCheckpoint === true
      || inboundMetadata.collaborationSyncRequired === true
      || Boolean(collaborationSyncToken)
      || Boolean(
        (session as Record<string, unknown>).collaboration
        && typeof (session as Record<string, unknown>).collaboration === "object"
        && Boolean(
          ((session as Record<string, unknown>).collaboration as Record<string, unknown>)
            .syncCheckpoint
        )
      )
    );
    const inboundCommitIntent = firstInboundString(
      inboundMetadata.authorityIntentType,
      inboundMetadata.intentType,
      inboundMetadata.workflowIntent,
      inboundMetadata.workflowKey,
      inboundMetadata.workflow
    )?.toLowerCase();
    const commitIntentRequiresSync =
      collaborationSnapshot.authorityIntentType === "commit"
      || inboundCommitIntent === "commit"
      || inboundCommitIntent === "collaboration_commit";
    if (commitIntentRequiresSync && collaborationSyncRequired) {
      const syncGate = await ctx.runMutation(
        getInternal().ai.agentExecution.enforceCollaborationSyncCheckpointContract,
        {
          sessionId: session._id,
          turnId: runtimeTurnId,
          requireSync: true,
          lineageId:
            collaborationSnapshot.lineageId
            ?? firstInboundString(inboundMetadata.lineageId)
            ?? "",
          dmThreadId:
            collaborationSnapshot.dmThreadId
            ?? firstInboundString(inboundMetadata.dmThreadId, inboundMetadata.proposalThreadId)
            ?? "",
          groupThreadId:
            collaborationSnapshot.groupThreadId
            ?? firstInboundString(inboundMetadata.groupThreadId)
            ?? "",
          issuedForEventId:
            firstInboundString(
              inboundMetadata.collaborationEventId,
              inboundMetadata.eventId,
              inboundMetadata.providerEventId
            ) ?? `turn:${runtimeTurnId}`,
          providedToken: collaborationSyncToken,
        }
      ) as {
        success?: boolean;
        error?: string;
        checkpoint?: unknown;
      } | null;

      if (!syncGate?.success) {
        await ctx.runMutation(getInternal().ai.agentSessions.recordTurnRunAttempt, {
          turnId: runtimeTurnId,
          runAttempt: buildRunAttemptContract({
            attempts: 0,
            maxAttempts: LLM_RETRY_POLICY.maxAttempts,
            delayReason: "none",
            delayMs: 0,
            terminalOutcome: "blocked_sync_checkpoint",
          }),
        });
        return {
          status: "blocked_sync_checkpoint",
          message: resolveCollaborationSyncCheckpointFailureMessage(syncGate?.error),
          sessionId: session._id,
          turnId: runtimeTurnId,
        };
      }
    }

    if (sessionEsc?.status === "taken_over") {
      // Human has control — save message but skip LLM
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "user",
        content: args.message,
      });
      await recordEscalationCheckpoint({
        turnId: runtimeTurnId,
        checkpoint: "session_taken_over",
        recordTurnTransition: async (transitionArgs) => {
          await ctx.runMutation(
            getInternal().ai.agentSessions.recordTurnTransition,
            transitionArgs
          );
        },
        onRecordError: (error) => {
          console.warn("[AgentExecution] Failed to append taken_over escalation turn edge", error);
        },
      });
      return {
        status: "escalated_to_human",
        message: "This conversation is being handled by a team member.",
        sessionId: session._id,
        turnId: runtimeTurnId,
        waitpoint: waitpointState,
      };
    }
    if (sessionEsc?.status === "pending") {
      // Still waiting for human — save message, remind customer
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "user",
        content: args.message,
      });
      const waitMessage = "My team has been notified and will be with you shortly. Please hang tight!";
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "assistant",
        content: waitMessage,
      });
      await recordEscalationCheckpoint({
        turnId: runtimeTurnId,
        checkpoint: "session_pending",
        recordTurnTransition: async (transitionArgs) => {
          await ctx.runMutation(
            getInternal().ai.agentSessions.recordTurnTransition,
            transitionArgs
          );
        },
        onRecordError: (error) => {
          console.warn("[AgentExecution] Failed to append pending escalation turn edge", error);
        },
      });
      // Route wait message outbound
      const waitMeta = inboundMetadata;
      const formattedWaitMessage = formatAssistantContentForDelivery(
        args.channel,
        waitMessage,
        waitMeta
      );
      if (!waitMeta.skipOutbound && args.channel !== "api_test") {
        try {
          await ctx.runAction(getInternal().channels.router.sendMessage, {
            organizationId: args.organizationId,
            channel: args.channel,
            recipientIdentifier: args.externalContactIdentifier,
            content: formattedWaitMessage,
            providerConversationId: waitMeta.providerConversationId as string | undefined,
          });
        } catch { /* best effort */ }
      }
      return {
        status: "escalation_pending",
        message: waitMessage,
        sessionId: session._id,
        turnId: runtimeTurnId,
        waitpoint: waitpointState,
      };
    }

    const sessionRoutingPin = (session as Record<string, unknown>).routingPin as
      | {
          modelId?: string;
          authProfileId?: string;
          pinReason?: string;
        }
      | undefined;
    const pinnedSessionModelId =
      typeof sessionRoutingPin?.modelId === "string" &&
      sessionRoutingPin.modelId.trim().length > 0
        ? sessionRoutingPin.modelId.trim()
        : null;
    const pinnedAuthProfileId =
      typeof sessionRoutingPin?.authProfileId === "string" &&
      sessionRoutingPin.authProfileId.trim().length > 0
        ? sessionRoutingPin.authProfileId.trim()
        : null;

    // 4. Auto-resolve CRM contact
    if (!(session as any).crmContactId) {
      const contact = await ctx.runQuery(getInternal().ai.agentSessions.resolveContact, {
        organizationId: args.organizationId,
        identifier: args.externalContactIdentifier,
        channel: args.channel,
      });
      if (contact) {
        await ctx.runMutation(getInternal().ai.agentSessions.linkContactToSession, {
          sessionId: session._id,
          crmContactId: contact._id,
        });
      }
    }

    let aiSettings = ((await ctx.runQuery(
      getApi().api.ai.settings.getAISettings,
      {
        organizationId: args.organizationId,
      }
    )) ?? {
      enabled: true,
      billingMode: "platform",
      billingSource: "platform",
      currentMonthSpend: 0,
      humanInLoopEnabled: true,
      toolApprovalMode: "all",
      llm: {
        enabledModels: [
          {
            modelId: ONBOARDING_DEFAULT_MODEL_ID,
            isDefault: true,
            enabledAt: Date.now(),
          },
        ],
        defaultModelId: ONBOARDING_DEFAULT_MODEL_ID,
        providerId: "openrouter",
        temperature: 0.7,
        maxTokens: 4000,
      },
    }) as any;
    const onboardingEnabledModels =
      Array.isArray(aiSettings?.llm?.enabledModels) &&
      aiSettings.llm.enabledModels.length > 0
        ? aiSettings.llm.enabledModels
        : [
            {
              modelId: ONBOARDING_DEFAULT_MODEL_ID,
              isDefault: true,
              enabledAt: Date.now(),
            },
          ];
    aiSettings = {
      ...aiSettings,
      llm: {
        ...(aiSettings.llm || {}),
        enabledModels: onboardingEnabledModels,
        defaultModelId:
          aiSettings?.llm?.defaultModelId ?? onboardingEnabledModels[0].modelId,
      },
    };
    const metadata = inboundMetadata;

    let inboundMessage = args.message;
    const inboundVoiceRequest = resolveInboundVoiceRuntimeRequest(inboundMetadata);
    let voiceRuntimeMetadata: Record<string, unknown> | undefined;

    if (inboundVoiceRequest) {
      const elevenLabsBinding = resolveElevenLabsRuntimeBinding({ aiSettings });
      try {
        const resolvedVoiceAdapter = await resolveVoiceRuntimeAdapter({
          requestedProviderId: inboundVoiceRequest.requestedProviderId,
          elevenLabsBinding,
          fetchFn: fetch,
        });
        const transcriptionBillingSource = resolveVoiceRuntimeBillingSource({
          providerId: resolvedVoiceAdapter.adapter.providerId,
          elevenLabsBinding,
          fallbackBillingSource:
            aiSettings?.billingSource ??
            (aiSettings?.billingMode === "byok" ? "byok" : "platform"),
        });
        voiceRuntimeMetadata = {
          requestedProviderId: inboundVoiceRequest.requestedProviderId,
          providerId: resolvedVoiceAdapter.adapter.providerId,
          fallbackProviderId: resolvedVoiceAdapter.fallbackFromProviderId ?? null,
          healthStatus: resolvedVoiceAdapter.health.status,
          healthReason: resolvedVoiceAdapter.health.reason ?? null,
        };

        if (inboundVoiceRequest.audioBase64) {
          try {
            const transcription = await resolvedVoiceAdapter.adapter.transcribe({
              voiceSessionId:
                inboundVoiceRequest.voiceSessionId ??
                `voice-turn:${runtimeTurnId}`,
              audioBytes: decodeInboundVoiceAudioBase64(
                inboundVoiceRequest.audioBase64
              ),
              mimeType: inboundVoiceRequest.mimeType ?? "audio/webm",
              language: resolveVoiceRuntimeLanguage({
                inboundVoiceRequest,
                agentConfig: config,
              }),
            });
            const transcriptText = transcription.text.trim();
            if (transcriptText.length > 0) {
              inboundMessage = transcriptText;
            }
            voiceRuntimeMetadata = {
              ...voiceRuntimeMetadata,
              transcribeSuccess: true,
              transcriptPreview: transcriptText.slice(0, 160),
            };
            try {
              await recordVoiceUsageTelemetry({
                ctx,
                organizationId: args.organizationId,
                sessionId: session._id,
                turnId: runtimeTurnId,
                billingSource: transcriptionBillingSource,
                requestType: "voice_stt",
                action: "voice_transcription",
                creditLedgerAction: "voice_transcription",
                providerId: transcription.providerId,
                usage: transcription.usage ?? null,
                success: true,
                metadata: {
                  requestedProviderId: inboundVoiceRequest.requestedProviderId,
                  fallbackProviderId: resolvedVoiceAdapter.fallbackFromProviderId ?? null,
                  voiceSessionId:
                    inboundVoiceRequest.voiceSessionId ?? `voice-turn:${runtimeTurnId}`,
                  channel: args.channel,
                },
              });
            } catch (error) {
              console.error("[AgentExecution] Failed to record voice STT usage:", error);
            }
          } catch (error) {
            const transcriptionError =
              error instanceof Error ? error.message : "voice_transcription_failed";
            voiceRuntimeMetadata = {
              ...voiceRuntimeMetadata,
              transcribeSuccess: false,
              transcriptionError,
            };
            try {
              await recordVoiceUsageTelemetry({
                ctx,
                organizationId: args.organizationId,
                sessionId: session._id,
                turnId: runtimeTurnId,
                billingSource: transcriptionBillingSource,
                requestType: "voice_stt",
                action: "voice_transcription",
                creditLedgerAction: "voice_transcription",
                providerId: resolvedVoiceAdapter.adapter.providerId,
                usage: null,
                success: false,
                errorMessage: transcriptionError,
                metadata: {
                  requestedProviderId: inboundVoiceRequest.requestedProviderId,
                  fallbackProviderId: resolvedVoiceAdapter.fallbackFromProviderId ?? null,
                  voiceSessionId:
                    inboundVoiceRequest.voiceSessionId ?? `voice-turn:${runtimeTurnId}`,
                  channel: args.channel,
                },
              });
            } catch (recordError) {
              console.error(
                "[AgentExecution] Failed to record failed voice STT usage:",
                recordError
              );
            }
          }
        }
      } catch (error) {
        const runtimeError =
          error instanceof Error ? error.message : "voice_runtime_resolution_failed";
        voiceRuntimeMetadata = {
          requestedProviderId: inboundVoiceRequest.requestedProviderId,
          transcribeSuccess: false,
          synthesisSuccess: false,
          runtimeError,
        };
        if (inboundVoiceRequest.audioBase64) {
          const fallbackBillingSource = resolveVoiceRuntimeBillingSource({
            providerId: inboundVoiceRequest.requestedProviderId,
            elevenLabsBinding,
            fallbackBillingSource:
              aiSettings?.billingSource ??
              (aiSettings?.billingMode === "byok" ? "byok" : "platform"),
          });
          try {
            await recordVoiceUsageTelemetry({
              ctx,
              organizationId: args.organizationId,
              sessionId: session._id,
              turnId: runtimeTurnId,
              billingSource: fallbackBillingSource,
              requestType: "voice_stt",
              action: "voice_transcription",
              creditLedgerAction: "voice_transcription",
              providerId: inboundVoiceRequest.requestedProviderId,
              usage: null,
              success: false,
              errorMessage: runtimeError,
              metadata: {
                requestedProviderId: inboundVoiceRequest.requestedProviderId,
                voiceSessionId:
                  inboundVoiceRequest.voiceSessionId ?? `voice-turn:${runtimeTurnId}`,
                channel: args.channel,
              },
            });
          } catch (recordError) {
            console.error(
              "[AgentExecution] Failed to record voice STT runtime error usage:",
              recordError
            );
          }
        }
      }
    }

    const composerRuntimeControls = resolveInboundComposerRuntimeControls({
      metadata,
      inboundMessage,
    });
    const inboundImageAttachments = normalizeInboundImageAttachments(metadata.attachments);
    if (composerRuntimeControls.cleanedMessage.length > 0) {
      inboundMessage = composerRuntimeControls.cleanedMessage;
    }
    const meetingConciergeIntent = resolveInboundMeetingConciergeIntent({
      organizationId: args.organizationId,
      channel: args.channel,
      metadata,
      message: inboundMessage,
    });
    const composerRuntimeContextParts = [
      buildInboundComposerRuntimeContext(composerRuntimeControls),
      buildInboundMeetingConciergeRuntimeContext(meetingConciergeIntent),
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    const composerRuntimeContext =
      composerRuntimeContextParts.length > 0
        ? composerRuntimeContextParts.join("\n\n")
        : null;
    const composerHeuristicGenerationSettings = resolveInboundComposerGenerationSettings({
      reasoningEffort: composerRuntimeControls.reasoningEffort,
      baseTemperature: config.temperature,
      baseMaxTokens: config.maxTokens,
    });
    const composerBaselineGenerationSettings = resolveInboundComposerGenerationSettings({
      reasoningEffort: "medium",
      baseTemperature: config.temperature,
      baseMaxTokens: config.maxTokens,
    });

    // 4.5. Fetch org knowledge context:
    //      prefer chunk-index semantic retrieval, fallback to legacy doc retrieval path.
    let knowledgeBaseDocs: KnowledgeContextDocument[] = [];
    let knowledgeDocsRetrievedCount = 0;
    let knowledgeBytesRetrieved = 0;
    let retrievalMode: "semantic" | "fallback" = "fallback";
    let retrievalPath: "chunk_index" | "legacy_doc" = "legacy_doc";
    let retrievalFallbackUsed = false;
    let retrievalFallbackReason: string | undefined;
    let semanticCandidateCount = 0;
    let semanticFilteredCandidateCount = 0;
    let semanticQueryTokenCount = 0;
    let semanticChunkCount = 0;
    const normalizedKnowledgeTags = (config.knowledgeBaseTags || [])
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);

    let shouldRunLegacyFallback = true;
    try {
      const chunkSearchResult = await ctx.runQuery(
        getInternal().organizationMedia.searchKnowledgeChunksInternal,
        {
          organizationId: args.organizationId,
          queryText: inboundMessage,
          tags: normalizedKnowledgeTags.length > 0 ? normalizedKnowledgeTags : undefined,
        }
      ) as SemanticKnowledgeChunkSearchResult | null;

      if (chunkSearchResult) {
        const rankedChunks = Array.isArray(chunkSearchResult.chunks)
          ? chunkSearchResult.chunks
          : [];
        semanticQueryTokenCount =
          typeof chunkSearchResult.queryTokenCount === "number"
            ? chunkSearchResult.queryTokenCount
            : 0;
        semanticFilteredCandidateCount =
          typeof chunkSearchResult.filteredCandidates === "number"
            ? chunkSearchResult.filteredCandidates
            : rankedChunks.length;
        semanticChunkCount =
          typeof chunkSearchResult.returned === "number"
            ? chunkSearchResult.returned
            : rankedChunks.length;
        semanticCandidateCount = semanticChunkCount;

        if (rankedChunks.length > 0) {
          knowledgeBaseDocs = mapSemanticChunksToKnowledgeDocuments(rankedChunks);
          knowledgeDocsRetrievedCount = rankedChunks.length;
          knowledgeBytesRetrieved = rankedChunks.reduce(
            (sum, chunk) => sum + getUtf8ByteLength(chunk.chunkText),
            0
          );
          retrievalMode = "semantic";
          retrievalPath = "chunk_index";
          shouldRunLegacyFallback = false;
        } else {
          retrievalFallbackUsed = true;
          retrievalFallbackReason = "semantic_chunk_no_match";
        }
      } else {
        retrievalFallbackUsed = true;
        retrievalFallbackReason = "semantic_chunk_unavailable";
      }
    } catch (error) {
      console.error(
        `[AgentExecution] Failed semantic chunk retrieval for ${args.organizationId}:`,
        error
      );
      retrievalFallbackUsed = true;
      retrievalFallbackReason = "semantic_chunk_search_failed";
    }

    if (shouldRunLegacyFallback) {
      try {
        const retrievedDocs = await ctx.runQuery(
          getInternal().organizationMedia.getKnowledgeBaseDocsInternal,
          {
            organizationId: args.organizationId,
            tags: normalizedKnowledgeTags.length > 0 ? normalizedKnowledgeTags : undefined,
          }
        ) as KnowledgeContextDocument[] | null;

        const candidateDocs = (retrievedDocs || []).filter(
          (doc) => typeof doc.content === "string" && doc.content.trim().length > 0
        );
        knowledgeDocsRetrievedCount = candidateDocs.length;
        knowledgeBytesRetrieved = candidateDocs.reduce(
          (sum, doc) =>
            sum + (
              typeof doc.sizeBytes === "number"
                ? doc.sizeBytes
                : getUtf8ByteLength(doc.content)
            ),
          0
        );

        const retrievalDecision = resolveKnowledgeRetrieval({
          queryText: inboundMessage,
          candidateDocs,
        });
        knowledgeBaseDocs = retrievalDecision.documents;
        retrievalMode = retrievalDecision.mode;
        semanticCandidateCount = Math.max(
          semanticCandidateCount,
          retrievalDecision.semanticCandidates
        );

        if (!retrievalFallbackUsed) {
          retrievalFallbackUsed = retrievalDecision.fallbackUsed;
          retrievalFallbackReason = retrievalDecision.fallbackReason;
        } else if (
          retrievalDecision.documents.length === 0
          && retrievalDecision.fallbackReason
        ) {
          retrievalFallbackReason = retrievalDecision.fallbackReason;
        }
      } catch (error) {
        console.error(
          `[AgentExecution] Failed to load organization knowledge docs for ${args.organizationId}:`,
          error
        );
        retrievalFallbackUsed = true;
        retrievalFallbackReason = "knowledge_docs_load_failed";
      }
    }

    // 4.6. Check for guided interview mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let interviewContext: any = null;
    const sessionData = {
      sessionMode: effectiveSessionMode,
      interviewTemplateId: effectiveInterviewTemplateId,
    };

    if (sessionData.sessionMode === "guided" && sessionData.interviewTemplateId) {
      interviewContext = await ctx.runQuery(
        getInternal().ai.interviewRunner.getInterviewContextInternal,
        { sessionId: session._id }
      );
    }

    // 4.7. Pre-LLM escalation check (pattern matching + sentiment on inbound message)
    // Load a single per-turn history snapshot and derive all local windows from it.
    const sessionHistorySnapshot = await ctx.runQuery(getInternal().ai.agentSessions.getSessionMessages, {
      sessionId: session._id,
      limit: 120,
    }) as SessionHistoryContextMessage[];
    const recentForSentiment = sessionHistorySnapshot.slice(-5);
    const recentUserMsgs = recentForSentiment
      .filter((m) => m.role === "user")
      .map((m) => m.content);

    const preEscalation = checkPreLLMEscalation(inboundMessage, config, recentUserMsgs);
    if (preEscalation) {
      await ctx.runMutation(getInternal().ai.agentLifecycle.recordLifecycleTransition, {
        sessionId: session._id,
        fromState: "active",
        toState: "paused",
        actor: "system",
        actorId: "agent_execution",
        checkpoint: "escalation_detected",
        reason: preEscalation.triggerType,
        metadata: {
          checkpoint: "pre_llm_escalation",
          urgency: preEscalation.urgency,
        },
      });

      const escAgentName = resolveEscalationAgentName(agent);
      await createAndDispatchEscalation({
        sessionId: session._id,
        organizationId: args.organizationId,
        agentId: agent._id,
        turnId: runtimeTurnId,
        trigger: preEscalation,
        checkpoint: "pre_llm_escalation",
        contactIdentifier: args.externalContactIdentifier,
        channel: args.channel,
        lastMessage: inboundMessage.slice(0, 200),
        agentName: escAgentName,
        createEscalation: async (escalationArgs) => {
          await ctx.runMutation(getInternal().ai.escalation.createEscalation, escalationArgs);
        },
        recordTurnTransition: async (transitionArgs) => {
          await ctx.runMutation(getInternal().ai.agentSessions.recordTurnTransition, transitionArgs);
        },
        notifyTelegram: (payload) => {
          ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationTelegram, payload);
        },
        notifyPushover: (payload) => {
          ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationPushover, payload);
        },
        notifyEmail: (payload) => {
          ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationEmail, payload);
        },
        notifyHighUrgencyRetry: (payload) => {
          ctx.scheduler.runAfter(5 * 60 * 1000, getInternal().ai.escalation.retryHighUrgencyEmail, payload);
        },
        onTransitionError: (error) => {
          console.warn("[AgentExecution] Failed to append pre-LLM escalation turn edge", error);
        },
      });

      // Save user message + hold message (skip LLM call entirely)
      const resolvedPol = resolvePolicy(config.escalationPolicy);
      const holdMessage = resolvedPol.holdMessage;
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "user",
        content: inboundMessage,
      });
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "assistant",
        content: holdMessage,
      });

      // Route hold message outbound
      const escMeta = inboundMetadata;
      const formattedHoldMessage = formatAssistantContentForDelivery(
        args.channel,
        holdMessage,
        escMeta
      );
      if (!escMeta.skipOutbound && args.channel !== "api_test") {
        try {
          await ctx.runAction(getInternal().channels.router.sendMessage, {
            organizationId: args.organizationId,
            channel: args.channel,
            recipientIdentifier: args.externalContactIdentifier,
            content: formattedHoldMessage,
            providerConversationId: escMeta.providerConversationId as string | undefined,
          });
        } catch { /* best effort — message saved in session */ }
      }

      return {
        status: "escalated",
        response: holdMessage,
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    const vacationDecisionResponse = await maybeHandleSlackVacationPolicyDecision({
      ctx,
      organizationId: args.organizationId,
      agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
      sessionId: session._id,
      turnId: runtimeTurnId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      inboundMessage,
      inboundMetadata,
    });
    if (vacationDecisionResponse) {
      return vacationDecisionResponse;
    }

    const platformEnabledModels = await ctx.runQuery(
      getApi().api.ai.platformModels.getEnabledModels,
      {}
    ) as Array<{
      id: string;
      isFreeTierLocked?: boolean;
      contextLength?: number;
      providerId?: string | null;
      supportsNativeReasoning?: boolean;
      capabilityMatrix?: {
        text?: boolean;
        vision?: boolean;
        audio_in?: boolean;
        audio_out?: boolean;
        tools?: boolean;
        json?: boolean;
      } | null;
    }>;

    if (platformEnabledModels.length === 0) {
      return {
        status: "error",
        message:
          "No release-ready platform AI models are configured. Validate and re-enable at least one model.",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    const licenseSnapshot = await ctx.runQuery(
      getInternal().licensing.helpers.getLicenseInternalQuery,
      { organizationId: args.organizationId }
    ) as { planTier?: string } | null;
    const isFreeTierOrganization = licenseSnapshot?.planTier === "free";

    const metadataSelectedModel =
      typeof metadata.selectedModel === "string" && metadata.selectedModel.trim().length > 0
        ? metadata.selectedModel.trim()
        : undefined;
    const configuredModelOverride =
      typeof config.modelId === "string" && config.modelId.trim().length > 0
        ? config.modelId.trim()
        : undefined;
    const explicitModelOverride = metadataSelectedModel ?? configuredModelOverride;
    const hasExplicitModelOverride = Boolean(explicitModelOverride);
    const platformEnabledModelIds = platformEnabledModels.map(
      (platformModel) => platformModel.id
    );
    const configuredFreeTierModelId =
      platformEnabledModels.find((platformModel) => platformModel.isFreeTierLocked === true)?.id ?? null;
    const fallbackFreeTierModelId = selectFirstPlatformEnabledModel(
      [ONBOARDING_DEFAULT_MODEL_ID, platformEnabledModelIds[0]],
      platformEnabledModelIds
    );
    const effectiveFreeTierModelId =
      configuredFreeTierModelId ?? fallbackFreeTierModelId;

    if (isFreeTierOrganization && !effectiveFreeTierModelId) {
      return {
        status: "error",
        message:
          "No release-ready free-tier model is configured. Set a free-tier lock in Super Admin > Platform AI Models.",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    if (explicitModelOverride) {
      if (
        isFreeTierOrganization &&
        effectiveFreeTierModelId &&
        explicitModelOverride !== effectiveFreeTierModelId
      ) {
        return {
          status: "error",
          message: `Free-tier organizations are pinned to "${effectiveFreeTierModelId}". Select that model to continue.`,
          sessionId: session._id,
          turnId: runtimeTurnId,
        };
      }

      if (
        !isFreeTierOrganization &&
        !isModelAllowedForOrg(aiSettings, explicitModelOverride)
      ) {
        return {
          status: "error",
          message: `Model "${explicitModelOverride}" is not enabled for this organization. Select one of the models configured by your organization owner.`,
          sessionId: session._id,
          turnId: runtimeTurnId,
        };
      }

      const explicitPlatformModel = selectFirstPlatformEnabledModel(
        [explicitModelOverride],
        platformEnabledModelIds
      );
      if (!explicitPlatformModel) {
        return {
          status: "error",
          message: `Model "${explicitModelOverride}" is not currently release-ready on this platform. Select a currently enabled model and retry.`,
          sessionId: session._id,
          turnId: runtimeTurnId,
        };
      }
    }

    const preferredModel =
      isFreeTierOrganization && effectiveFreeTierModelId
        ? effectiveFreeTierModelId
        : resolveRequestedModel(aiSettings, explicitModelOverride);
    const orgDefaultModel =
      isFreeTierOrganization && effectiveFreeTierModelId
        ? effectiveFreeTierModelId
        : resolveOrgDefaultModel(aiSettings);
    const envApiKeysByProvider = buildEnvApiKeysByProvider({
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
      GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      OPENAI_COMPATIBLE_API_KEY: process.env.OPENAI_COMPATIBLE_API_KEY,
      XAI_API_KEY: process.env.XAI_API_KEY,
      MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
      KIMI_API_KEY: process.env.KIMI_API_KEY,
      ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    });
    const orgEnabledModelIdsRaw = Array.isArray(aiSettings?.llm?.enabledModels)
      ? aiSettings.llm.enabledModels
          .map((modelSetting: { modelId?: string }) =>
            typeof modelSetting.modelId === "string" ? modelSetting.modelId : null
          )
          .filter((modelId: string | null): modelId is string => Boolean(modelId))
      : [];
    const orgEnabledModelIds =
      isFreeTierOrganization && effectiveFreeTierModelId
        ? [effectiveFreeTierModelId]
        : orgEnabledModelIdsRaw;
    const configuredRoutingProviderToken =
      typeof aiSettings?.llm?.providerId === "string" &&
      aiSettings.llm.providerId.trim().length > 0
        ? aiSettings.llm.providerId.trim()
        : null;
    const platformRoutingModels = platformEnabledModels.map((platformModel) => ({
      modelId: platformModel.id,
      providerId:
        typeof platformModel.providerId === "string" &&
        platformModel.providerId.trim().length > 0
          ? platformModel.providerId
          : configuredRoutingProviderToken
            ? detectProvider(configuredRoutingProviderToken, aiSettings?.llm?.providerId)
          : detectProvider(platformModel.id, aiSettings?.llm?.providerId),
      capabilityMatrix: platformModel.capabilityMatrix ?? undefined,
    }));
    const firstPlatformEnabledModel = platformEnabledModelIds[0] ?? null;
    const modelRoutingPolicySeed = resolveRuntimeModelRoutingPolicySeed(
      aiSettings?.llm as Record<string, unknown> | null
    );
    const providerIdsToResolve = new Set<string>([
      "openrouter",
      detectProvider(preferredModel, aiSettings?.llm?.providerId),
    ]);
    if (
      modelRoutingPolicySeed.privacyMode !== "off"
      || modelRoutingPolicySeed.localModelIds.length > 0
    ) {
      providerIdsToResolve.add("openai_compatible");
    }
    for (const localModelId of modelRoutingPolicySeed.localModelIds) {
      providerIdsToResolve.add(
        detectProvider(localModelId, aiSettings?.llm?.providerId)
      );
    }
    for (const platformModel of platformRoutingModels) {
      providerIdsToResolve.add(
        detectProvider(platformModel.providerId ?? platformModel.modelId, aiSettings?.llm?.providerId)
      );
    }

    const providerAuthProfilesById = new Map<
      string,
      Array<ResolvedAuthProfile & { baseUrl?: string }>
    >();
    const authProfileFailureCountsByProvider = new Map<string, Map<string, number>>();
    const availableProviderIds = new Set<string>();
    for (const providerIdCandidate of providerIdsToResolve) {
      const providerId = detectProvider(providerIdCandidate, aiSettings?.llm?.providerId);
      const resolvedProfiles = resolveAuthProfilesForProvider({
        providerId,
        llmSettings: aiSettings?.llm,
        defaultBillingSource: aiSettings?.billingSource,
        envApiKeysByProvider,
        envOpenRouterApiKey: process.env.OPENROUTER_API_KEY,
      });
      if (resolvedProfiles.length === 0) {
        continue;
      }

      availableProviderIds.add(providerId);
      providerAuthProfilesById.set(
        providerId,
        resolvedProfiles.map((profile) => ({
          ...profile,
          baseUrl: resolveAuthProfileBaseUrl({
            llmSettings: aiSettings?.llm,
            providerId: profile.providerId,
            profileId: profile.profileId,
            envOpenAiCompatibleBaseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL,
          }),
        }))
      );
      authProfileFailureCountsByProvider.set(
        providerId,
        buildAuthProfileFailureCountMap({
          providerId,
          llmSettings: aiSettings?.llm,
        })
      );
    }

    if (availableProviderIds.size === 0) {
      return {
        status: "error",
        message: "No auth profiles are configured for any available AI provider",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    const routingIntent = resolveModelRoutingIntent({
      detectedIntents: detectIntents(inboundMessage),
      requiresTools:
        delegationAuthorityContract.authorityUseToolBroker
        && !isStrictPlanMode(composerRuntimeControls.mode),
    });
    if (routingIntent === "tooling") {
      const hasReleaseReadyToolRoute = hasReleaseReadyToolRoutingCandidate({
        platformEnabledModels,
      });
      if (!hasReleaseReadyToolRoute) {
        return {
          status: "error",
          message:
            "No release-ready tool-calling model route is available. Validate and enable at least one model with tools+json support.",
          sessionId: session._id,
          turnId: runtimeTurnId,
        };
      }
    }
    const routingModality = resolveModelRoutingModality({
      message: inboundMessage,
      metadata,
    });
    const effectivePinnedSessionModelId =
      isFreeTierOrganization ? null : pinnedSessionModelId;
    const modelRoutingMatrix = buildModelRoutingMatrix({
      preferredModelId: preferredModel,
      sessionPinnedModelId:
        !hasExplicitModelOverride ? effectivePinnedSessionModelId : null,
      orgDefaultModelId: orgDefaultModel,
      orgEnabledModelIds,
      platformModels: platformRoutingModels,
      safeFallbackModelId: SAFE_FALLBACK_MODEL_ID,
      platformFirstEnabledModelId: firstPlatformEnabledModel,
      hasExplicitModelOverride,
      routingIntent,
      routingModality,
      availableProviderIds,
      privacyMode: modelRoutingPolicySeed.privacyMode,
      qualityTierFloor: modelRoutingPolicySeed.qualityTierFloor,
      localModelIds: modelRoutingPolicySeed.localModelIds,
      previousSelectedModelId:
        !hasExplicitModelOverride ? effectivePinnedSessionModelId : null,
    });
    const initialRoutingPolicyContract = resolveRuntimeModelRoutingPolicyContract({
      llmSettings: aiSettings?.llm as Record<string, unknown> | null,
      modelRoutingMatrix,
    });
    if (initialRoutingPolicyContract.blocked) {
      return {
        status: "error",
        message:
          initialRoutingPolicyContract.blockMessage
          ?? "No model route satisfies your privacy and quality policy. Update AI settings and retry.",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }
    const policyAllowedModelIdSet = new Set(
      initialRoutingPolicyContract.allowedModelIds.filter((modelId) =>
        !isFreeTierOrganization || modelId === effectiveFreeTierModelId
      )
    );

    if (isFreeTierOrganization && policyAllowedModelIdSet.size === 0) {
      return {
        status: "error",
        message:
          `Free-tier organizations are pinned to "${effectiveFreeTierModelId}", but that route is currently unavailable for this request.`,
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    if (inboundImageAttachments.length > 0) {
      const hasVisionCapableRoute = modelRoutingMatrix.some(
        (entry) =>
          policyAllowedModelIdSet.has(entry.modelId)
          && entry.providerAvailable
          && entry.supportsModality
      );
      if (!hasVisionCapableRoute) {
        return {
          status: "error",
          message:
            "No vision-capable model is enabled for this workspace. Enable a model with image support and retry.",
          sessionId: session._id,
          turnId: runtimeTurnId,
        };
      }
    }

    const modelRoutingById = new Map(
      modelRoutingMatrix.map((entry) => [entry.modelId, entry])
    );
    const resolveProviderCandidatesForRoutedModel = (modelId: string): string[] => {
      const candidates: string[] = [];
      const pushUnique = (providerId: string) => {
        if (!candidates.includes(providerId)) {
          candidates.push(providerId);
        }
      };

      const routedProviderId = modelRoutingById.get(modelId)?.providerId;
      if (typeof routedProviderId === "string" && routedProviderId.trim().length > 0) {
        pushUnique(routedProviderId.trim());
      }

      const detectedProviderId = detectProvider(modelId, aiSettings?.llm?.providerId);
      pushUnique(detectedProviderId);

      // OpenRouter can execute prefixed model routes (e.g. anthropic/*, openai/*)
      // when direct-provider credentials are unavailable.
      if (modelId.includes("/")) {
        pushUnique("openrouter");
      }

      return candidates;
    };
    const resolveProviderForRoutedModel = (modelId: string) => {
      return resolveProviderCandidatesForRoutedModel(modelId)[0];
    };
    const modelNativeReasoningSupportById = new Map(
      platformEnabledModels.map((platformModel) => [
        platformModel.id,
        platformModel.supportsNativeReasoning === true,
      ])
    );
    const modelsToTry = modelRoutingMatrix
      .filter((entry) => policyAllowedModelIdSet.has(entry.modelId))
      .map((entry) => entry.modelId);
    const modelResolutionPoolIds =
      isFreeTierOrganization && effectiveFreeTierModelId
        ? [effectiveFreeTierModelId]
        : platformEnabledModelIds;
    const model =
      modelsToTry[0] ??
      selectFirstPlatformEnabledModel(
        [
          !hasExplicitModelOverride ? effectivePinnedSessionModelId : null,
          preferredModel,
          orgDefaultModel,
          isFreeTierOrganization ? effectiveFreeTierModelId : SAFE_FALLBACK_MODEL_ID,
          firstPlatformEnabledModel,
        ],
        modelResolutionPoolIds
      );
    const selectionSource =
      !hasExplicitModelOverride &&
      !isFreeTierOrganization &&
      effectivePinnedSessionModelId &&
      model === effectivePinnedSessionModelId
        ? "session_pinned"
        : determineModelSelectionSource({
            selectedModel: model ?? SAFE_FALLBACK_MODEL_ID,
            preferredModel,
            orgDefaultModel,
            safeFallbackModelId: SAFE_FALLBACK_MODEL_ID,
            platformFirstEnabledModelId: firstPlatformEnabledModel,
          });
    const selectedRoutingReason = model
      ? modelRoutingById.get(model)?.reason
      : undefined;
    const routingPolicyContract = resolveRuntimeModelRoutingPolicyContract({
      llmSettings: aiSettings?.llm as Record<string, unknown> | null,
      modelRoutingMatrix,
      selectedModelId: model ?? null,
    });
    const selectedPolicyDecision = model
      ? routingPolicyContract.decisions.find(
          (decision) => decision.modelId === model
        )
      : undefined;
    const selectedPolicyGuardrail = routingPolicyContract.selectedGuardrail;
    const selectedModelDriftWarning = routingPolicyContract.selectedModelDriftWarning;
    const selectedModelQualityTier = model
      ? modelRoutingById.get(model)?.qualityTier
      : undefined;
    const selectedRouteIsLocal = selectedPolicyDecision?.isLocalModel ?? false;
    const selectedRouteDriftOverall = selectedPolicyDecision?.modelSwitchDriftOverall;

    if (!model) {
      return {
        status: "error",
        message: "Unable to resolve a platform-enabled model for this organization",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    const selectedModelContextLength = platformEnabledModels.find(
      (platformModel) => platformModel.id === model
    )?.contextLength;
    const boundedKnowledgeContext = composeKnowledgeContext({
      documents: knowledgeBaseDocs,
      modelContextLength: selectedModelContextLength,
    });
    knowledgeBaseDocs = boundedKnowledgeContext.documents;
    const retrievalCitations = boundedKnowledgeContext.documents.map((doc, index) => ({
      citationId:
        typeof doc.citationId === "string" && doc.citationId.trim().length > 0
          ? doc.citationId
          : `KB-${index + 1}`,
      citationRank: index + 1,
      mediaId: typeof doc.mediaId === "string" ? doc.mediaId : undefined,
      chunkId: typeof doc.chunkId === "string" ? doc.chunkId : undefined,
      chunkOrdinal:
        typeof doc.chunkOrdinal === "number" ? doc.chunkOrdinal : undefined,
      filename: doc.filename,
      source: doc.source ?? "layercake_document",
      sourceTags: Array.isArray(doc.tags)
        ? doc.tags.filter((tag): tag is string => typeof tag === "string")
        : undefined,
      sourceUpdatedAt:
        typeof doc.updatedAt === "number" ? doc.updatedAt : undefined,
      relevanceScore:
        typeof doc.semanticScore === "number"
          ? Number(doc.semanticScore.toFixed(4))
          : undefined,
      confidence:
        typeof doc.confidence === "number"
          ? Number(doc.confidence.toFixed(4))
          : undefined,
      confidenceBand:
        doc.confidenceBand === "high"
        || doc.confidenceBand === "medium"
        || doc.confidenceBand === "low"
          ? doc.confidenceBand
          : undefined,
      matchedTokens: Array.isArray(doc.matchedTokens)
        ? doc.matchedTokens
            .filter((token): token is string => typeof token === "string")
            .slice(0, 12)
        : undefined,
      retrievalMethod:
        typeof doc.retrievalMethod === "string"
          ? doc.retrievalMethod
          : undefined,
    }));
    const retrievalTelemetry = {
      mode: retrievalMode,
      path: retrievalPath,
      fallbackUsed: retrievalFallbackUsed,
      fallbackReason: retrievalFallbackReason,
      semanticCandidateCount,
      semanticFilteredCandidateCount,
      semanticQueryTokenCount,
      semanticChunkCount,
      docsRetrieved: knowledgeDocsRetrievedCount,
      docsInjected: boundedKnowledgeContext.documents.length,
      bytesRetrieved: knowledgeBytesRetrieved,
      bytesInjected: boundedKnowledgeContext.bytesUsed,
      sourceTags: boundedKnowledgeContext.sourceTags,
      requestedTags: (config.knowledgeBaseTags || [])
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0),
      citationCount: retrievalCitations.length,
      chunkCitationCount: retrievalCitations.filter(
        (citation) =>
          typeof citation.chunkId === "string" && citation.chunkId.trim().length > 0
      ).length,
      citations: retrievalCitations,
    };

    if (
      boundedKnowledgeContext.truncatedDocumentCount > 0
      || boundedKnowledgeContext.droppedDocumentCount > 0
    ) {
      console.log("[AgentExecution][KnowledgeContextBudget]", {
        organizationId: args.organizationId,
        model,
        tokenBudget: boundedKnowledgeContext.tokenBudget,
        estimatedTokensUsed: boundedKnowledgeContext.estimatedTokensUsed,
        docsIncluded: retrievalTelemetry.docsInjected,
        docsDropped: boundedKnowledgeContext.droppedDocumentCount,
        docsTruncated: boundedKnowledgeContext.truncatedDocumentCount,
      });
    }

    // 5. Build system prompt (with previous session context if resuming)
    const sessionRecord = session as Record<string, unknown>;
    const previousSessionSummary = sessionRecord.previousSessionSummary as string | undefined;

    // Check for degraded mode (tools disabled from prior failures)
    const preflightErrorState = await ctx.runQuery(
      getInternal().ai.agentSessions.getSessionErrorState,
      { sessionId: session._id }
    ) as { degraded?: boolean; disabledTools?: string[]; degradedReason?: string } | null;

    const baseAutonomyLevel =
      delegationAuthorityContract.authorityAutonomyLevel;
    const soulModeRuntime = resolveSoulModeRuntimeContract({
      activeSoulMode: delegationAuthorityContract.authorityActiveSoulMode,
      modeChannelBindings:
        delegationAuthorityContract.authorityModeChannelBindings,
      channel: args.channel,
    });
    const archetypeRuntime = resolveActiveArchetypeRuntimeContract({
      requestedArchetype:
        delegationAuthorityContract.authorityRequestedArchetype,
      enabledArchetypes:
        delegationAuthorityContract.authorityEnabledArchetypes,
      mode: soulModeRuntime.mode,
      modeDefaultArchetype: soulModeRuntime.config.archetypeDefault,
    });
    const sensitiveArchetypeConstraint = resolveSensitiveArchetypeRuntimeConstraint(
      archetypeRuntime.archetype?.id ?? null,
    );
    const modeScopedAutonomyLevel = resolveModeScopedAutonomyLevel({
      autonomyLevel: baseAutonomyLevel,
      modeToolScope: soulModeRuntime.config.toolScope,
    });
    const effectiveAutonomyLevel =
      sensitiveArchetypeConstraint?.forceReadOnlyTools
        ? "sandbox"
        : modeScopedAutonomyLevel;
    const disableAllToolsForMode = soulModeRuntime.config.toolScope === "none";

    // 5.25. Layered tool scoping (platform → org → agent → session)
    const connectedIntegrations = await ctx.runQuery(
      getInternal().ai.toolScoping.getConnectedIntegrations,
      { organizationId: args.organizationId }
    ) as string[];
    const orgToolPolicy = await ctx.runQuery(
      getInternal().ai.toolScoping.getOrgToolPolicy,
      { organizationId: args.organizationId }
    ) as {
      orgEnabled: string[];
      orgDisabled: string[];
      policySource: "none" | "ai_tool_policy";
      policyObjectId?: string;
    };

    // Resolve agent's effective tool profile
    const agentProfile = delegationAuthorityContract.authorityToolProfile;

    // Session-level disabled tools (from degraded mode / error state)
    const sessionDisabledTools = preflightErrorState?.disabledTools ?? [];

    const allToolDefs = getAllToolDefinitions();
    const scopedTools = resolveActiveToolsWithAudit({
      allTools: allToolDefs,
      platformBlocked: getPlatformBlockedTools(),
      orgEnabled: orgToolPolicy.orgEnabled,
      orgDisabled: orgToolPolicy.orgDisabled,
      connectedIntegrations,
      agentProfile,
      agentEnabled: delegationAuthorityContract.authorityEnabledTools,
      agentDisabled: delegationAuthorityContract.authorityDisabledTools,
      autonomyLevel: effectiveAutonomyLevel,
      sessionDisabled: sessionDisabledTools,
      channel: args.channel,
    });
    const activeToolDefs = disableAllToolsForMode ? [] : scopedTools.tools;
    const toolScopingAudit = {
      ...scopedTools.audit,
      policySource: orgToolPolicy.policySource,
      policyObjectId: orgToolPolicy.policyObjectId,
      connectedIntegrations: [...connectedIntegrations].sort(),
      agentProfile,
      channel: args.channel,
      authorityAgentId: delegationAuthorityContract.authorityAgentId,
      speakerAgentId: delegationAuthorityContract.speakerAgentId,
      agentEnabledCount: delegationAuthorityContract.authorityEnabledTools.length,
      agentDisabledCount: delegationAuthorityContract.authorityDisabledTools.length,
      sessionDisabledCount: sessionDisabledTools.length,
      soulMode: soulModeRuntime.mode,
      soulModeSource: soulModeRuntime.source,
      soulModeToolScope: soulModeRuntime.config.toolScope,
      archetypeId: archetypeRuntime.archetype?.id ?? null,
      archetypeSource: archetypeRuntime.source,
      sensitiveArchetypeReadOnly: sensitiveArchetypeConstraint?.forceReadOnlyTools === true,
    };
    const harnessToolNames = activeToolDefs.map((toolDef) => toolDef.name);
    const activeToolNames = new Set(harnessToolNames);
    let toolSchemas = getToolSchemas().filter((schema) => activeToolNames.has(schema.function.name));
    if (disableAllToolsForMode || isPlanMode(composerRuntimeControls.mode)) {
      toolSchemas = [];
    }
    const modeDisabledTools = disableAllToolsForMode
      ? scopedTools.tools.map((tool) => tool.name)
      : [];
    const unavailableByPolicyTools = [
      ...toolScopingAudit.removedByPlatform,
      ...toolScopingAudit.removedByOrgDeny,
      ...toolScopingAudit.removedByAgentDisable,
      ...toolScopingAudit.removedBySession,
      ...toolScopingAudit.removedByChannel,
      ...modeDisabledTools,
    ];
    const planFeasibilityContext = buildInboundPlanFeasibilityContext({
      mode: composerRuntimeControls.mode,
      userMessage: inboundMessage,
      availableToolNames: disableAllToolsForMode ? [] : toolScopingAudit.finalToolNames,
      connectedIntegrations: toolScopingAudit.connectedIntegrations,
      unavailableByIntegration: toolScopingAudit.removedByIntegration,
      unavailableByPolicy: unavailableByPolicyTools,
    });

    // Build team handoff context if this is a specialist session
    let handoffCtx: {
      sharedContext?: string;
      teamAccessMode?: "invisible" | "direct" | "meeting";
      lastHandoff?: {
        fromAgent: string;
        reason: string;
        summary?: string;
        goal?: string;
        contextSummary?: string;
      };
    } | undefined;
    if (teamSession?.isTeamSession && teamSession.handoffHistory?.length) {
      const lastHandoff = teamSession.handoffHistory[teamSession.handoffHistory.length - 1];
      // Resolve the "from" agent name
      let fromName = "a team member";
      try {
        const fromAgent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
          agentId: lastHandoff.fromAgentId,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fromName = (fromAgent?.customProperties as any)?.displayName || fromAgent?.name || fromName;
      } catch { /* best effort */ }

      handoffCtx = {
        sharedContext: teamSession.sharedContext,
        teamAccessMode:
          normalizeTeamAccessModeToken(config.teamAccessMode, "invisible")
          ?? "invisible",
        lastHandoff: {
          fromAgent: fromName,
          reason: lastHandoff.reason,
          summary: lastHandoff.summary ?? lastHandoff.contextSummary,
          goal:
            lastHandoff.goal ??
            ((teamSession as any).conversationGoal as string | undefined),
          contextSummary: lastHandoff.contextSummary,
        },
      };
    }

    const organization = await ctx.runQuery(getInternal().organizations.getOrganization, {
      organizationId: args.organizationId,
    }) as {
      _id: Id<"organizations">;
      name: string;
      slug: string;
      plan?: string;
      isPersonalWorkspace?: boolean;
      parentOrganizationId?: Id<"organizations">;
    };
    const parentOrganization = organization.parentOrganizationId
      ? await ctx.runQuery(getInternal().organizations.getOrganization, {
          organizationId: organization.parentOrganizationId,
        }) as {
          name: string;
          plan?: string;
        }
      : null;
    const layer = determineAgentLayer(
      {
        _id: organization._id,
        parentOrganizationId: organization.parentOrganizationId,
      },
      agent.subtype ?? undefined,
      organization.slug === "system",
    );
    const crossOrgSoulReadOnlyEnrichment =
      await resolveCrossOrgSoulReadOnlyEnrichment({
        ctx,
        organization,
        channel: args.channel,
        externalContactIdentifier: args.externalContactIdentifier,
      });
    const runtimeConfig: AgentConfig = {
      ...config,
      autonomyLevel: effectiveAutonomyLevel,
      activeSoulMode: soulModeRuntime.mode,
      activeArchetype: archetypeRuntime.archetype?.id ?? null,
      activeChannel: args.channel,
      privacyMode: routingPolicyContract.privacyMode,
      qualityTierFloor: routingPolicyContract.qualityTierFloor,
      localConnection: routingPolicyContract.localConnection,
      localModelIds: routingPolicyContract.localModelIds,
      selectedPolicyGuardrail,
      selectedModelDriftWarning,
      selectedModelQualityTier,
      selectedRouteIsLocal,
    };
    const harnessContext = buildHarnessContext(
      runtimeConfig,
      harnessToolNames,
      {
        messageCount: typeof sessionRecord.messageCount === "number" ? sessionRecord.messageCount : 0,
        channel: args.channel,
        startedAt: typeof sessionRecord.startedAt === "number" ? sessionRecord.startedAt : undefined,
        lastMessageAt: typeof sessionRecord.lastMessageAt === "number" ? sessionRecord.lastMessageAt : undefined,
        hasCrmContact: Boolean(sessionRecord.crmContactId),
      },
      await ctx.runQuery(getInternal().agentOntology.getAllActiveAgentsForOrg, {
        organizationId: args.organizationId,
      }) as Array<{
        _id: Id<"objects">;
        name: string;
        subtype?: string;
        customProperties?: Record<string, unknown>;
      }>,
      agent._id,
      {
        name: organization.name,
        slug: organization.slug,
        planTier: typeof organization.plan === "string" ? organization.plan : "free",
      },
      {
        layer,
        parentOrgName: parentOrganization?.name,
        parentOrgPlanTier:
          parentOrganization && typeof parentOrganization.plan === "string"
            ? parentOrganization.plan
            : undefined,
        testingMode: args.channel === "api_test",
      },
      crossOrgSoulReadOnlyEnrichment,
    );

    const handoffPromptContext = handoffCtx
      ? { ...handoffCtx, harnessContext }
      : { harnessContext };
    const supportRuntimeContext = resolveSupportRuntimeContext({
      message: inboundMessage,
      agentSubtype: agent.subtype ?? undefined,
      agentProfile,
      metadata: inboundMetadata,
    });
    const supportPolicyPrompt = supportRuntimeContext.enabled
      ? buildSupportRuntimePolicy(supportRuntimeContext)
      : undefined;
    const promptConfig = supportPolicyPrompt
      ? {
          ...runtimeConfig,
          systemPrompt: [runtimeConfig.systemPrompt, supportPolicyPrompt]
            .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
            .join("\n\n"),
        }
      : runtimeConfig;
    const systemKnowledgeLoad = composeKnowledgeContract(
      "customer",
      supportRuntimeContext.triggers
    );
    const operatorPinnedNotes = await ctx.runQuery(
      getInternal().ai.agentSessions.getRuntimeOperatorPinnedNotes,
      {
        organizationId: args.organizationId,
        limit: 25,
      }
    ) as OperatorPinnedNoteContextRecord[];
    const pinnedNotesContext = composeOperatorPinnedNotesContext(
      operatorPinnedNotes
    );
    const rollingSummaryMemory = await ctx.runQuery(
      getInternal().ai.agentSessions.getSessionRollingSummaryMemory,
      {
        sessionId: session._id,
        organizationId: args.organizationId,
      }
    ) as SessionRollingSummaryMemoryRecord | null;
    const rollingSummaryContext = composeRollingSessionMemoryContext(
      rollingSummaryMemory
    );
    const sessionRoutingKey =
      typeof sessionRecord.sessionRoutingKey === "string"
      && sessionRecord.sessionRoutingKey.trim().length > 0
        ? sessionRecord.sessionRoutingKey.trim()
        : "legacy";
    const aiAgentMemoryContract = evaluateAiAgentMemoryRuntimeContract({
      sessionOrganizationId: args.organizationId,
      requestedOrganizationId: args.organizationId,
      sessionChannel: args.channel,
      requestedChannel: args.channel,
      sessionExternalContactIdentifier: args.externalContactIdentifier,
      requestedExternalContactIdentifier: args.externalContactIdentifier,
      sessionRoutingKey,
      requestedSessionRoutingKey: sessionRoutingKey,
    });
    if (aiAgentMemoryContract.reason !== "deprecated_contract") {
      console.warn("[AgentExecution][AiAgentMemoryContract] Deprecated memory contract blocked by scope", {
        organizationId: args.organizationId,
        sessionId: session._id,
        turnId: runtimeTurnId,
        reason: aiAgentMemoryContract.reason,
      });
    }
    const shouldLoadReactivationMemory = session.messageCount === 0;
    const reactivationMemory = shouldLoadReactivationMemory
      ? await ctx.runQuery(
          getInternal().ai.agentSessions.getSessionReactivationMemory,
          {
            sessionId: session._id,
            organizationId: args.organizationId,
            channel: args.channel,
            externalContactIdentifier: args.externalContactIdentifier,
            sessionRoutingKey,
          }
        ) as SessionReactivationMemoryRecord | null
      : null;
    const reactivationMemoryContext = composeSessionReactivationMemoryContext(
      reactivationMemory
    );
    const contactMemory = await ctx.runQuery(
      getInternal().ai.agentSessions.getSessionContactMemory,
      {
        sessionId: session._id,
        organizationId: args.organizationId,
        channel: args.channel,
        externalContactIdentifier: args.externalContactIdentifier,
        sessionRoutingKey,
        limit: 16,
      }
    ) as SessionContactMemoryRecord[];
    const contactMemoryContext = composeSessionContactMemoryContext(contactMemory);

    const systemPrompt = buildAgentSystemPrompt(
      promptConfig,
      knowledgeBaseDocs,
      interviewContext,
      previousSessionSummary,
      preflightErrorState?.degraded ? preflightErrorState.disabledTools : undefined,
      handoffPromptContext,
      systemKnowledgeLoad,
    );

    // 6. Load conversation history
    const rawHistory = sessionHistorySnapshot;
    const reservedRecentContextTokens = estimateTokensFromText([
      systemPrompt,
      pinnedNotesContext ?? "",
      rollingSummaryContext ?? "",
      reactivationMemoryContext ?? "",
      contactMemoryContext ?? "",
      composerRuntimeContext ?? "",
      planFeasibilityContext ?? "",
      inboundMessage,
    ].join("\n\n"));
    const adaptiveHistoryWindow = composeAdaptiveRecentContextWindow({
      messages: rawHistory,
      modelContextLength: selectedModelContextLength,
      reservedTokens: reservedRecentContextTokens,
    });
    const history = adaptiveHistoryWindow.messages;
    if (
      adaptiveHistoryWindow.droppedMessageCount > 0
      || adaptiveHistoryWindow.truncatedMessageCount > 0
    ) {
      console.log("[AgentExecution][RecentContextBudget]", {
        organizationId: args.organizationId,
        sessionId: session._id,
        model,
        tokenBudget: adaptiveHistoryWindow.tokenBudget,
        estimatedTokensUsed: adaptiveHistoryWindow.estimatedTokensUsed,
        messagesIncluded: history.length,
        messagesDropped: adaptiveHistoryWindow.droppedMessageCount,
        messagesTruncated: adaptiveHistoryWindow.truncatedMessageCount,
      });
    }

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content:
        | string
        | Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string } }
          >;
    }> = assembleRuntimeSystemMessages({
      systemPrompt,
      pinnedNotesContext,
      rollingSummaryContext,
      reactivationMemoryContext,
      contactMemoryContext,
      composerRuntimeContext,
      planFeasibilityContext,
    });

    for (const msg of history as Array<{ role: string; content: string }>) {
      messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }

    messages.push({
      role: "user",
      content: buildMultimodalUserMessageContent({
        text: inboundMessage,
        imageAttachments: inboundImageAttachments,
      }),
    });

    // 7. Tool broker — narrow tools by intent + recent usage (feature-flagged)
    let brokerMetrics: BrokerMetrics | undefined;
    if (
      delegationAuthorityContract.authorityUseToolBroker
      && !isPlanMode(composerRuntimeControls.mode)
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recentToolNames = extractRecentToolNames(history as Array<{ role: string; toolCalls?: any }>);
      const brokerResult = brokerTools(inboundMessage, toolSchemas, recentToolNames);
      toolSchemas = brokerResult.tools;
      brokerMetrics = brokerResult.metrics;
    }

    const resolvedModelPricing = await ctx.runQuery(
      getApi().api.ai.modelPricing.getModelPricing,
      { modelId: model }
    ) as {
      modelId: string;
      promptPerMToken: number;
      completionPerMToken: number;
      source: "aiModels" | "fallback";
      usedFallback: boolean;
      warning?: string;
    };

    if (resolvedModelPricing.usedFallback) {
      console.warn("[AgentExecution][PricingFallback]", {
        modelId: resolvedModelPricing.modelId,
        source: resolvedModelPricing.source,
        warning: resolvedModelPricing.warning,
      });
    }

    const selectedModelProviderId = resolveProviderForRoutedModel(model);
    const selectedModelAuthProfiles = orderAuthProfilesForSession(
      providerAuthProfilesById.get(selectedModelProviderId) ?? [],
      pinnedAuthProfileId
    ) as Array<ResolvedAuthProfile & { baseUrl?: string }>;
    const primaryAuthProfileId =
      selectedModelAuthProfiles[0]?.profileId ?? null;
    const executionBundle = buildExecutionBundleContract({
      modelId: model,
      providerId: selectedModelProviderId,
      authProfileId: primaryAuthProfileId,
      systemPrompt,
      toolSchemas,
    });
    const executionBundlePersist = await ctx.runMutation(
      getInternal().ai.agentSessions.recordTurnExecutionBundle,
      {
        turnId: runtimeTurnId,
        executionBundle,
      }
    ) as { success?: boolean; error?: string } | null;
    if (!executionBundlePersist?.success) {
      return {
        status: "error",
        message: "Failed to persist execution bundle contract.",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }
    const resolveLlmBillingSource = (args: {
      providerId: string;
      profileId?: string | null;
    }): "platform" | "byok" | "private" => {
      const profileBillingSource =
        providerAuthProfilesById
          .get(args.providerId)
          ?.find((profile) => profile.profileId === args.profileId)?.billingSource;
      return (
        normalizeCanonicalBillingSource(
          profileBillingSource ?? aiSettings?.billingSource ?? null
        ) ?? "platform"
      );
    };

    // 7.5. Pre-flight credit check
    const estimatedCost = estimateCreditsFromPricing(resolvedModelPricing);
    const preflightLlmBillingSource = resolveLlmBillingSource({
      providerId: selectedModelProviderId,
      profileId: primaryAuthProfileId,
    });

    try {
      await ctx.runMutation(getInternal().credits.index.grantDailyCreditsInternalMutation, {
        organizationId: args.organizationId,
      });
    } catch (error) {
      console.warn("[AgentExecution] Failed to grant daily credits (non-blocking):", error);
    }

    const creditCheck = await ctx.runQuery(
      getInternal().credits.index.checkCreditsInternalQuery,
      {
        organizationId: args.organizationId,
        requiredAmount: estimatedCost,
        billingSource: preflightLlmBillingSource,
        requestSource: "llm",
      }
    );

    if (!creditCheck.hasCredits) {
      // Fire-and-forget notification to org owner
      ctx.scheduler.runAfter(0, getInternal().credits.notifications.notifyCreditExhausted, {
        organizationId: args.organizationId,
      });

      return {
        status: "credits_exhausted",
        // Customer-facing: never expose credit internals
        message: "Our team is currently unavailable. Please try again later or contact us directly.",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    // 8. Call LLM with retry + model/auth-profile failover
    if (!runtimeLeaseToken) {
      return {
        status: "error",
        message: "Turn lease token missing before model execution.",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    const leaseHeartbeat = await heartbeatTurnLease(ctx, {
      turnId: runtimeTurnId,
      expectedVersion: runtimeTurnVersion,
      leaseToken: runtimeLeaseToken,
      leaseDurationMs: 3 * 60_000,
    });
    if (!leaseHeartbeat.success || typeof leaseHeartbeat.transitionVersion !== "number") {
      return {
        status: "error",
        message: "Failed to refresh turn lease before model execution.",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }
    runtimeTurnVersion = leaseHeartbeat.transitionVersion;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let response: any = null;
    let usedModel = model;
    let usedAuthProfileId = primaryAuthProfileId;
    let usedAuthProviderId = selectedModelProviderId;
    let usedModelRoutingReason = selectedRoutingReason;
    let usedComposerGenerationSettings = composerHeuristicGenerationSettings;
    let usedReasoningMode: "native" | "heuristic" = "heuristic";
    let usedReasoningParamKind: ProviderReasoningParamKind = "none";
    let usedReasoningReason:
      | "provider_not_supported"
      | "model_not_supported"
      | "model_capability_missing"
      | "native_reasoning_applied" = "provider_not_supported";
    let usedReasoningProviderId = selectedModelProviderId;
    let lastModelErrorMessage: string | undefined;
    let llmAttemptCount = 0;
    let llmDelayReason: "none" | "retry_backoff" | "provider_failover" | "auth_profile_rotation" =
      "none";
    let skippedModelNoAuthProfileCount = 0;
    let skippedModelCooldownCount = 0;

    const logSkippedModel = (
      modelId: string,
      providerId: string,
      reason: TwoStageFailoverModelSkipReason
    ) => {
      const message =
        reason === "all_profiles_in_cooldown"
          ? "[AgentExecution] Skipping model because all provider auth profiles are in cooldown"
          : "[AgentExecution] Skipping model due to missing provider auth profiles";
      console.warn(message, {
        modelId,
        providerId,
        organizationId: args.organizationId,
      });
    };

    try {
      const failoverResult = await executeTwoStageFailover<
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        any,
        ResolvedAuthProfile & { baseUrl?: string }
      >({
        modelIds: modelsToTry,
        resolveModelPlan: ({ modelId, cooledProfileKeys }) => {
          const providerCandidates = resolveProviderCandidatesForRoutedModel(modelId);
          let sawProviderWithProfiles = false;
          const mergedAuthProfiles: Array<ResolvedAuthProfile & { baseUrl?: string }> = [];
          for (const providerId of providerCandidates) {
            const providerAuthProfiles = providerAuthProfilesById.get(providerId) ?? [];
            if (providerAuthProfiles.length === 0) {
              continue;
            }
            sawProviderWithProfiles = true;
            const authProfilesToTry = orderAuthProfilesForSession(
              providerAuthProfiles.filter(
                (profile) =>
                  !cooledProfileKeys.has(`${profile.providerId}:${profile.profileId}`)
              ),
              pinnedAuthProfileId
            ) as Array<ResolvedAuthProfile & { baseUrl?: string }>;
            mergedAuthProfiles.push(...authProfilesToTry);
          }
          if (mergedAuthProfiles.length > 0) {
            return { authProfiles: mergedAuthProfiles };
          }
          return {
            authProfiles: [],
            skipReason: sawProviderWithProfiles
              ? "all_profiles_in_cooldown"
              : "no_auth_profiles",
          };
        },
        getAuthProfileKey: (authProfile) =>
          `${authProfile.providerId}:${authProfile.profileId}`,
        executeAttempt: async ({ modelId, authProfile }) => {
          const tryProviderId = authProfile.providerId;
          const client = new OpenRouterClient(authProfile.apiKey, {
            providerId: authProfile.providerId,
            baseUrl: authProfile.baseUrl,
          });
          const reasoningResolution = resolveProviderReasoningResolution({
            providerId: authProfile.providerId,
            modelSupportsNativeReasoning:
              modelNativeReasoningSupportById.get(modelId) ?? null,
            reasoningEffort: composerRuntimeControls.reasoningEffort,
          });
          const generationSettingsForAttempt =
            reasoningResolution.mode === "native"
              ? composerBaselineGenerationSettings
              : composerHeuristicGenerationSettings;
          const retryResult = await withRetry(
            () =>
              client.chatCompletion({
                model: modelId,
                messages,
                tools: toolSchemas.length > 0 ? toolSchemas : undefined,
                temperature: generationSettingsForAttempt.temperature,
                max_tokens: generationSettingsForAttempt.maxTokens,
                extraBody: reasoningResolution.requestPatch,
              }),
            LLM_RETRY_POLICY
          );

          usedModelRoutingReason = modelRoutingById.get(modelId)?.reason;
          usedComposerGenerationSettings = generationSettingsForAttempt;
          usedReasoningMode = reasoningResolution.mode;
          usedReasoningParamKind = reasoningResolution.paramKind;
          usedReasoningReason = reasoningResolution.reason;
          usedReasoningProviderId = tryProviderId;

          if (authProfile.source === "profile") {
            await ctx.runMutation(getInternal().ai.settings.recordAuthProfileSuccess, {
              organizationId: args.organizationId,
              profileId: authProfile.profileId,
              providerId: authProfile.providerId,
            });
          }

          return {
            result: retryResult.result,
            attempts: retryResult.attempts,
          };
        },
        failedAttemptCount: LLM_RETRY_POLICY.maxAttempts,
        onModelSkipped: ({ modelId, reason }) => {
          const providerId = resolveProviderForRoutedModel(modelId);
          if (reason === "no_auth_profiles") {
            skippedModelNoAuthProfileCount += 1;
          } else if (reason === "all_profiles_in_cooldown") {
            skippedModelCooldownCount += 1;
          }
          logSkippedModel(modelId, providerId, reason);
        },
        onRetryBackoff: ({ modelId, authProfile, attempts }) => {
          console.warn(
            `[AgentExecution] LLM call succeeded on attempt ${attempts} with model ${modelId} using auth profile ${authProfile.profileId}`
          );
        },
        onAttemptFailure: ({ modelId, authProfile, errorMessage }) => {
          lastModelErrorMessage = errorMessage;
          console.error(
            `[AgentExecution] Model ${modelId} failed with auth profile ${authProfile.profileId}:`,
            errorMessage
          );
        },
        shouldRotateAuthProfile: ({ authProfile, error }) =>
          authProfile.source === "profile" &&
          isAuthProfileRotatableError(error),
        onAuthProfileRotated: async ({ authProfile, errorMessage }) => {
          const authProfileFailureCounts =
            authProfileFailureCountsByProvider.get(authProfile.providerId) ??
            new Map<string, number>();
          authProfileFailureCountsByProvider.set(
            authProfile.providerId,
            authProfileFailureCounts
          );
          const previousFailureCount =
            authProfileFailureCounts.get(authProfile.profileId) ?? 0;
          const nextFailureCount = previousFailureCount + 1;
          authProfileFailureCounts.set(authProfile.profileId, nextFailureCount);
          const cooldownUntil =
            Date.now() + getAuthProfileCooldownMs(nextFailureCount);
          await ctx.runMutation(getInternal().ai.settings.recordAuthProfileFailure, {
            organizationId: args.organizationId,
            profileId: authProfile.profileId,
            providerId: authProfile.providerId,
            reason: errorMessage.slice(0, 300),
            cooldownUntil,
          });
        },
      });
      response = failoverResult.result;
      usedModel = failoverResult.usedModelId;
      usedAuthProfileId = failoverResult.usedAuthProfile.profileId;
      usedAuthProviderId = failoverResult.usedAuthProfile.providerId;
      llmAttemptCount = failoverResult.attempts;
      llmDelayReason = failoverResult.delayReason;
    } catch (error) {
      if (error instanceof TwoStageFailoverError) {
        llmAttemptCount = error.attempts;
        llmDelayReason = error.delayReason;
        lastModelErrorMessage = error.lastErrorMessage;
      } else {
        llmAttemptCount += LLM_RETRY_POLICY.maxAttempts;
        llmDelayReason = "provider_failover";
        lastModelErrorMessage = error instanceof Error ? error.message : String(error);
      }
    }

    // All models failed — send user error message and notify owner
    if (!response) {
      const redactTerminalFailureHint = (value: string): string => value
        .replace(/sk-[A-Za-z0-9_-]{12,}/g, "[redacted_key]")
        .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
        .replace(/api[_-]?key\s*[=:]\s*[^,\s)]+/gi, "api_key=[redacted]");
      const terminalFailureHintRaw =
        typeof lastModelErrorMessage === "string" ? lastModelErrorMessage.trim() : "";
      const hasDiagnosticTerminalFailureHint =
        terminalFailureHintRaw.length > 0 &&
        terminalFailureHintRaw !== "Provider request failed";
      const terminalFailureHint =
        hasDiagnosticTerminalFailureHint
          ? redactTerminalFailureHint(terminalFailureHintRaw).replace(/\s+/g, " ").slice(0, 220)
          : null;
      const classifiedTerminalError = terminalFailureHint
        ? classifyError({ message: terminalFailureHint })
        : null;
      const allModelsSkippedForAuthProfileState =
        modelsToTry.length > 0 &&
        skippedModelNoAuthProfileCount + skippedModelCooldownCount >= modelsToTry.length &&
        !hasDiagnosticTerminalFailureHint;
      const imageCapabilityFailure =
        inboundImageAttachments.length > 0
          && typeof lastModelErrorMessage === "string"
          && /(image|vision|multimodal|image_url|unsupported content|content part)/i.test(lastModelErrorMessage);
      const errorMessage = imageCapabilityFailure
        ? "This model/provider could not process the attached images. Try a different vision-capable model and resend."
        : getUserErrorMessage("ALL_MODELS_FAILED");
      const modelAvailabilityMessage = allModelsSkippedForAuthProfileState
        ? skippedModelNoAuthProfileCount > 0
          ? "No auth profiles are available for the selected model routes. Check provider routing and API key configuration."
          : "All auth profiles are temporarily in cooldown. Wait a few minutes and retry, or clear profile cooldowns in AI settings."
        : classifiedTerminalError?.code === "RATE_LIMITED"
          ? "AI providers are currently rate limited. Please retry in a moment."
          : terminalFailureHint
            ? `All model routes failed: ${terminalFailureHint}`
        : "All AI models are currently unavailable";

      // Save error message as assistant response
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "user",
        content: inboundMessage,
      });
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "assistant",
        content: errorMessage,
      });

      // Send error to user via channel
      const meta = inboundMetadata;
      const formattedErrorMessage = formatAssistantContentForDelivery(
        args.channel,
        errorMessage,
        meta
      );
      if (!meta.skipOutbound && args.channel !== "api_test") {
        try {
          await ctx.runAction(getInternal().channels.router.sendMessage, {
            organizationId: args.organizationId,
            channel: args.channel,
            recipientIdentifier: args.externalContactIdentifier,
            content: formattedErrorMessage,
          });
        } catch {
          // Best effort — if channel also fails, message is at least saved in session
        }
      }

      // Notify owner — this is a model failure, not a credit issue
      ctx.scheduler.runAfter(0, getInternal().credits.notifications.notifyAllModelsFailed, {
        organizationId: args.organizationId,
        error: "All retry attempts and fallback models exhausted",
      });
      await ctx.runMutation(getInternal().ai.agentSessions.recordTurnRunAttempt, {
        turnId: runtimeTurnId,
        runAttempt: buildRunAttemptContract({
          attempts: llmAttemptCount > 0 ? llmAttemptCount : LLM_RETRY_POLICY.maxAttempts,
          maxAttempts: LLM_RETRY_POLICY.maxAttempts,
          delayReason: llmDelayReason,
          delayMs: 0,
          terminalOutcome: "failed",
        }),
      });

      return {
        status: "error",
        message: modelAvailabilityMessage,
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    const choice = response.choices?.[0];
    if (!choice) {
      await ctx.runMutation(getInternal().ai.agentSessions.recordTurnRunAttempt, {
        turnId: runtimeTurnId,
        runAttempt: buildRunAttemptContract({
          attempts: llmAttemptCount > 0 ? llmAttemptCount : 1,
          maxAttempts: LLM_RETRY_POLICY.maxAttempts,
          delayReason: llmDelayReason,
          delayMs: 0,
          terminalOutcome: "failed",
        }),
      });
      return {
        status: "error",
        message: "No response from LLM",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    await ctx.runMutation(getInternal().ai.agentSessions.recordTurnRunAttempt, {
      turnId: runtimeTurnId,
      runAttempt: buildRunAttemptContract({
        attempts: llmAttemptCount > 0 ? llmAttemptCount : 1,
        maxAttempts: LLM_RETRY_POLICY.maxAttempts,
        delayReason:
          (llmAttemptCount > 1 && llmDelayReason !== "none")
            ? llmDelayReason
            : llmAttemptCount > 1
              ? "retry_backoff"
              : "none",
        delayMs: 0,
        terminalOutcome: "success",
      }),
    });

    let assistantContent = choice.message?.content || "";
    if (composerRuntimeControls.mode === "plan_soft") {
      assistantContent = applyPlanSoftReadinessScoring({
        assistantContent,
        availableToolNames: toolScopingAudit.finalToolNames,
        connectedIntegrations: toolScopingAudit.connectedIntegrations,
        unavailableByIntegration: toolScopingAudit.removedByIntegration,
        unavailableByPolicy: unavailableByPolicyTools,
      });
    }
    const runtimePolicyAdvisories: string[] = [];
    if (
      typeof selectedPolicyGuardrail === "string"
      && selectedPolicyGuardrail.trim().length > 0
      && modelRoutingPolicySeed.privacyMode !== "off"
      && !selectedRouteIsLocal
    ) {
      runtimePolicyAdvisories.push(`Privacy safeguard: ${selectedPolicyGuardrail}`);
    }
    if (
      typeof selectedModelDriftWarning === "string"
      && selectedModelDriftWarning.trim().length > 0
    ) {
      runtimePolicyAdvisories.push(`Model safety note: ${selectedModelDriftWarning}`);
    }
    if (runtimePolicyAdvisories.length > 0) {
      const advisoryBlock = runtimePolicyAdvisories.join("\n");
      assistantContent = assistantContent.trim().length > 0
        ? `${advisoryBlock}\n\n${assistantContent}`
        : advisoryBlock;
    }
    let toolCalls = Array.isArray(choice.message?.tool_calls)
      ? choice.message.tool_calls as Array<Record<string, unknown>>
      : [];
    if (!hasMeetingConciergeToolCall(toolCalls)) {
      const previewToolCall = buildAutoPreviewMeetingConciergeToolCall(
        meetingConciergeIntent
      );
      if (previewToolCall) {
        toolCalls = [...toolCalls, previewToolCall];
      }
    }
    const runtimeElapsedBeforeTools = Date.now() - runtimeGovernorStartedAt;
    const stepAndTimeEnforcement = enforceRuntimeGovernorStepAndTime({
      contract: runtimeGovernorContract,
      assistantContent,
      toolCalls,
      elapsedMsBeforeTools: runtimeElapsedBeforeTools,
      limitTriggered: runtimeGovernorLimitTriggered,
    });
    assistantContent = stepAndTimeEnforcement.assistantContent;
    toolCalls = stepAndTimeEnforcement.toolCalls;
    runtimeGovernorToolCallsTrimmed = stepAndTimeEnforcement.toolCallsTrimmed;
    runtimeGovernorLimitTriggered = stepAndTimeEnforcement.limitTriggered;

    let runtimeGovernorEstimatedCostUsd: number | undefined;
    try {
      let governorPricingModel = resolvedModelPricing;
      if (usedModel !== model) {
        governorPricingModel = await ctx.runQuery(
          getApi().api.ai.modelPricing.getModelPricing,
          { modelId: usedModel }
        ) as typeof resolvedModelPricing;
      }
      runtimeGovernorEstimatedCostUsd = calculateCostFromUsage(response.usage, governorPricingModel);
      const costEnforcement = enforceRuntimeGovernorCost({
        contract: runtimeGovernorContract,
        assistantContent,
        toolCalls,
        toolCallsTrimmed: runtimeGovernorToolCallsTrimmed,
        estimatedCostUsd: runtimeGovernorEstimatedCostUsd,
        limitTriggered: runtimeGovernorLimitTriggered,
      });
      assistantContent = costEnforcement.assistantContent;
      toolCalls = costEnforcement.toolCalls;
      runtimeGovernorToolCallsTrimmed = costEnforcement.toolCallsTrimmed;
      runtimeGovernorLimitTriggered = costEnforcement.limitTriggered;
    } catch (governorCostError) {
      console.warn("[AgentExecution] Runtime governor cost estimation failed", governorCostError);
    }

    let voiceSynthesisResult:
      | {
          success: boolean;
          requestedProviderId: VoiceRuntimeProviderId;
          providerId: VoiceRuntimeProviderId;
          fallbackProviderId: VoiceRuntimeProviderId | null;
          mimeType?: string | null;
          audioBase64?: string | null;
          fallbackText?: string | null;
          error?: string;
        }
      | null = null;

    if (inboundVoiceRequest?.synthesizeResponse) {
      const requestedProviderId = inboundVoiceRequest.requestedProviderId;
      const elevenLabsBinding = resolveElevenLabsRuntimeBinding({ aiSettings });
      try {
        const resolvedVoiceAdapter = await resolveVoiceRuntimeAdapter({
          requestedProviderId,
          elevenLabsBinding,
          fetchFn: fetch,
        });
        const synthesisBillingSource = resolveVoiceRuntimeBillingSource({
          providerId: resolvedVoiceAdapter.adapter.providerId,
          elevenLabsBinding,
          fallbackBillingSource:
            aiSettings?.billingSource ??
            (aiSettings?.billingMode === "byok" ? "byok" : "platform"),
        });
        const voiceId =
          resolveVoiceRuntimeVoiceId({
            inboundVoiceRequest,
            agentConfig: config,
            orgDefaultVoiceId: elevenLabsBinding?.defaultVoiceId,
          });

        try {
          const synthesis = await resolvedVoiceAdapter.adapter.synthesize({
            voiceSessionId:
              inboundVoiceRequest.voiceSessionId ??
              `voice-turn:${runtimeTurnId}`,
            text: assistantContent,
            voiceId,
          });
          voiceSynthesisResult = {
            success: true,
            requestedProviderId,
            providerId: synthesis.providerId,
            fallbackProviderId: resolvedVoiceAdapter.fallbackFromProviderId ?? null,
            mimeType: synthesis.mimeType,
            audioBase64: synthesis.audioBase64 ?? null,
            fallbackText: synthesis.fallbackText ?? null,
          };
          try {
            await recordVoiceUsageTelemetry({
              ctx,
              organizationId: args.organizationId,
              sessionId: session._id,
              turnId: runtimeTurnId,
              billingSource: synthesisBillingSource,
              requestType: "voice_tts",
              action: "voice_synthesis",
              creditLedgerAction: "voice_synthesis",
              providerId: synthesis.providerId,
              usage: synthesis.usage ?? null,
              success: true,
              metadata: {
                requestedProviderId,
                fallbackProviderId: resolvedVoiceAdapter.fallbackFromProviderId ?? null,
                voiceSessionId:
                  inboundVoiceRequest.voiceSessionId ?? `voice-turn:${runtimeTurnId}`,
                channel: args.channel,
              },
            });
          } catch (error) {
            console.error("[AgentExecution] Failed to record voice TTS usage:", error);
          }
        } catch (error) {
          const synthesisError =
            error instanceof Error
              ? error.message
              : "voice_synthesis_failed";
          voiceSynthesisResult = {
            success: false,
            requestedProviderId,
            providerId: resolvedVoiceAdapter.adapter.providerId,
            fallbackProviderId: resolvedVoiceAdapter.fallbackFromProviderId ?? null,
            error: synthesisError,
          };
          try {
            await recordVoiceUsageTelemetry({
              ctx,
              organizationId: args.organizationId,
              sessionId: session._id,
              turnId: runtimeTurnId,
              billingSource: synthesisBillingSource,
              requestType: "voice_tts",
              action: "voice_synthesis",
              creditLedgerAction: "voice_synthesis",
              providerId: resolvedVoiceAdapter.adapter.providerId,
              usage: null,
              success: false,
              errorMessage: synthesisError,
              metadata: {
                requestedProviderId,
                fallbackProviderId: resolvedVoiceAdapter.fallbackFromProviderId ?? null,
                voiceSessionId:
                  inboundVoiceRequest.voiceSessionId ?? `voice-turn:${runtimeTurnId}`,
                channel: args.channel,
              },
            });
          } catch (recordError) {
            console.error(
              "[AgentExecution] Failed to record failed voice TTS usage:",
              recordError
            );
          }
        }

        voiceRuntimeMetadata = {
          ...voiceRuntimeMetadata,
          synthesizeSuccess: voiceSynthesisResult.success,
          synthesizeProviderId: voiceSynthesisResult.providerId,
          synthesizeFallbackProviderId: voiceSynthesisResult.fallbackProviderId,
        };
      } catch (error) {
        const runtimeError =
          error instanceof Error
            ? error.message
            : "voice_runtime_resolution_failed";
        voiceSynthesisResult = {
          success: false,
          requestedProviderId,
          providerId: "browser",
          fallbackProviderId: null,
          error: runtimeError,
        };
        voiceRuntimeMetadata = {
          ...voiceRuntimeMetadata,
          synthesizeSuccess: false,
          runtimeError,
        };
        const fallbackBillingSource = resolveVoiceRuntimeBillingSource({
          providerId: requestedProviderId,
          elevenLabsBinding,
          fallbackBillingSource:
            aiSettings?.billingSource ??
            (aiSettings?.billingMode === "byok" ? "byok" : "platform"),
        });
        try {
          await recordVoiceUsageTelemetry({
            ctx,
            organizationId: args.organizationId,
            sessionId: session._id,
            turnId: runtimeTurnId,
            billingSource: fallbackBillingSource,
            requestType: "voice_tts",
            action: "voice_synthesis",
            creditLedgerAction: "voice_synthesis",
            providerId: requestedProviderId,
            usage: null,
            success: false,
            errorMessage: runtimeError,
            metadata: {
              requestedProviderId,
              voiceSessionId:
                inboundVoiceRequest.voiceSessionId ?? `voice-turn:${runtimeTurnId}`,
              channel: args.channel,
            },
          });
        } catch (recordError) {
          console.error(
            "[AgentExecution] Failed to record voice TTS runtime error usage:",
            recordError
          );
        }
      }
    }

    // Load persisted error state from session (survives across action invocations)
    const existingErrorState = await ctx.runQuery(
      getInternal().ai.agentSessions.getSessionErrorState,
      { sessionId: session._id }
    ) as { disabledTools?: string[]; failedToolCounts?: Record<string, number> } | null;

    const { failedToolCounts, disabledTools } = initializeToolFailureState(existingErrorState);
    const toolCtx: ToolExecutionContext = {
      ...ctx,
      organizationId: args.organizationId,
      userId: authorityAgent.createdBy as Id<"users">,
      sessionId: undefined,
      conversationId: undefined,
      agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
      agentSessionId: session._id,
      runtimePolicy: {
        appointmentBookingDomainDefault: resolveAppointmentBookingDomainDefault(
          authorityConfig
        ),
        polymarketDomainDefault: resolvePolymarketDomainDefault(
          authorityConfig
        ),
        ingressEnvelope: canonicalIngressEnvelope,
        mutationAuthority: canonicalIngressEnvelope.authority,
        nativeVisionEdge: canonicalIngressEnvelope.nativeVisionEdge,
        meetingConcierge: {
          explicitConfirmDetected: meetingConciergeIntent.explicitConfirmDetected,
          previewIntentDetected: meetingConciergeIntent.previewIntentDetected,
          extractedPayloadReady: meetingConciergeIntent.extractedPayloadReady,
          missingRequiredFields: meetingConciergeIntent.missingRequiredFields,
          fallbackReasons: meetingConciergeIntent.fallbackReasons,
          ingestLatencyMs: meetingConciergeIntent.ingestLatencyMs,
          sourceAttestation: meetingConciergeIntent.sourceAttestation,
          commandPolicy: meetingConciergeIntent.commandPolicy,
        },
        runtimeAuthorityPrecedence:
          canonicalIngressEnvelope.nativeVisionEdge.nativeAuthorityPrecedence,
      },
    };
    const {
      toolResults,
      errorStateDirty,
      blockedCapabilityGap,
    } = await executeToolCallsWithApproval({
      toolCalls: toolCalls as Array<{ function?: { name?: string; arguments?: unknown } }>,
      organizationId: args.organizationId,
      agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
      sessionId: session._id,
      autonomyLevel: effectiveAutonomyLevel,
      requireApprovalFor: delegationAuthorityContract.authorityRequireApprovalFor,
      toolExecutionContext: toolCtx,
      failedToolCounts,
      disabledTools,
      createApprovalRequest: async ({ actionType, actionPayload }) => {
        await ctx.runMutation(getInternal().ai.agentApprovals.createApprovalRequest, {
          agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
          sessionId: session._id,
          organizationId: args.organizationId,
          actionType,
          actionPayload,
        });
      },
      onToolDisabled: ({ toolName, error }) => {
        console.error(
          `[AgentExecution] Tool "${toolName}" disabled after 3 failures in session ${session._id}`
        );
        ctx.scheduler.runAfter(0, getInternal().credits.notifications.notifyToolDisabled, {
          organizationId: args.organizationId,
          toolName,
          error,
        });
      },
    });
    const runtimeCapabilityGapBlockedResponse = blockedCapabilityGap
      ? buildRuntimeCapabilityGapBlockedResponse({
          capabilityGap: blockedCapabilityGap,
        })
      : null;
    if (blockedCapabilityGap && runtimeCapabilityGapBlockedResponse) {
      const toolFoundryLineageId = runtimeContracts.queueContract.lineageId;
      const toolFoundryThreadId = runtimeContracts.queueContract.threadId;
      const toolFoundryCorrelationId = buildTrustTimelineCorrelationId({
        lineageId: toolFoundryLineageId,
        threadId: toolFoundryThreadId,
        correlationId: firstInboundString(
          inboundMetadata.correlationId,
          inboundMetadata.collaborationCorrelationId,
          inboundMetadata.traceId,
          inboundMetadata.workflowCorrelationId,
        ),
        surface: "proposal",
        sourceId: blockedCapabilityGap.proposalArtifact.proposalKey,
      });
      const toolFoundryFrontlineIntakeTrigger = resolveFrontlineIntakeTrigger({
        inboundMessage,
        inboundMetadata,
      });
      const toolFoundryBoundaryReason = resolveFrontlineBoundaryReason({
        inboundMessage,
        inboundMetadata,
        fallbackReason: blockedCapabilityGap.reason,
      });

      await recordToolFoundryExecutionBlockedTrustEvent({
        ctx,
        organizationId: args.organizationId,
        sessionId: session._id,
        channel: args.channel,
        blockedCapabilityGap,
        now: runtimeCapabilityGapBlockedResponse.proposalArtifact.createdAt,
        lineageId: toolFoundryLineageId,
        threadId: toolFoundryThreadId,
        workflowKey: runtimeContracts.queueContract.workflowKey,
        correlationId: toolFoundryCorrelationId,
        frontlineIntakeTrigger: toolFoundryFrontlineIntakeTrigger,
        boundaryReason: toolFoundryBoundaryReason,
      });
      try {
        await ctx.runMutation(
          getInternal().ai.toolFoundry.proposalBacklog.persistRuntimeCapabilityGapProposal,
          {
            organizationId: args.organizationId,
            blockedCapabilityGap,
            sourceTrace: {
              agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
              sessionId: session._id,
              turnId: runtimeTurnId,
              receiptId: runtimeReceiptId ? String(runtimeReceiptId) : undefined,
              channel: args.channel,
              externalContactIdentifier: args.externalContactIdentifier,
              idempotencyScopeKey: runtimeContracts.idempotencyContract.scopeKey,
              payloadHash: runtimeContracts.idempotencyContract.payloadHash,
              queueConcurrencyKey: runtimeContracts.queueContract.concurrencyKey,
              workflowKey: runtimeContracts.queueContract.workflowKey,
              lineageId: toolFoundryLineageId,
              threadId: toolFoundryThreadId,
              correlationId: toolFoundryCorrelationId,
              frontlineIntakeTrigger: toolFoundryFrontlineIntakeTrigger,
              boundaryReason: toolFoundryBoundaryReason,
            },
            observedAt: runtimeCapabilityGapBlockedResponse.proposalArtifact.createdAt,
          },
        );
      } catch (error) {
        console.error("[AgentExecution] Failed to persist Tool Foundry proposal backlog", {
          proposalKey: blockedCapabilityGap.proposalArtifact.proposalKey,
          sessionId: session._id,
          error,
        });
      }
    }
    if (runtimeCapabilityGapBlockedResponse) {
      assistantContent = formatRuntimeCapabilityGapBlockedMessage({
        blocked: runtimeCapabilityGapBlockedResponse,
      });
    }

    // Persist error state to session if anything changed
    if (errorStateDirty) {
      const nextToolErrorState = buildToolErrorStatePatch({
        disabledTools,
        failedToolCounts,
      });
      await ctx.runMutation(getInternal().ai.agentSessions.updateSessionErrorState, {
        sessionId: session._id,
        ...nextToolErrorState,
      });

      // Tool failure escalation — check if threshold met (per-agent configurable)
      if (!sessionEsc) {
        const toolEsc = checkToolFailureEscalation(
          nextToolErrorState.disabledTools.length,
          config.escalationPolicy
        );
        if (toolEsc) {
          await ctx.runMutation(getInternal().ai.agentLifecycle.recordLifecycleTransition, {
            sessionId: session._id,
            fromState: "active",
            toState: "paused",
            actor: "system",
            actorId: "agent_execution",
            checkpoint: "escalation_detected",
            reason: toolEsc.triggerType,
            metadata: {
              checkpoint: "tool_failure_escalation",
              urgency: toolEsc.urgency,
            },
          });

          const tfAgentName = resolveEscalationAgentName(agent);
          await createAndDispatchEscalation({
            sessionId: session._id,
            organizationId: args.organizationId,
            agentId: agent._id,
            turnId: runtimeTurnId,
            trigger: toolEsc,
            checkpoint: "tool_failure_escalation",
            contactIdentifier: args.externalContactIdentifier,
            channel: args.channel,
            lastMessage: inboundMessage.slice(0, 200),
            agentName: tfAgentName,
            createEscalation: async (escalationArgs) => {
              await ctx.runMutation(getInternal().ai.escalation.createEscalation, escalationArgs);
            },
            recordTurnTransition: async (transitionArgs) => {
              await ctx.runMutation(getInternal().ai.agentSessions.recordTurnTransition, transitionArgs);
            },
            notifyTelegram: (payload) => {
              ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationTelegram, payload);
            },
            notifyPushover: (payload) => {
              ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationPushover, payload);
            },
            notifyEmail: (payload) => {
              ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationEmail, payload);
            },
            notifyHighUrgencyRetry: (payload) => {
              ctx.scheduler.runAfter(5 * 60 * 1000, getInternal().ai.escalation.retryHighUrgencyEmail, payload);
            },
            onTransitionError: (error) => {
              console.warn("[AgentExecution] Failed to append tool escalation turn edge", error);
            },
          });
        }
      }
    }

    // 9.5. Post-LLM escalation checks (uncertainty phrases, response loops)
    // Load last 2 assistant responses + uncertainty counter for this session
    const sessionHistory = sessionHistorySnapshot;

    const recentAssistantMessages = sessionHistory
      .filter((m) => m.role === "assistant")
      .map((m) => m.content)
      .slice(-2);

    // Count existing uncertainty responses from this session
    let existingUncertaintyCount = 0;
    for (const msg of sessionHistory.filter((m) => m.role === "assistant")) {
      const lower = msg.content.toLowerCase();
      if (UNCERTAINTY_PHRASES.some((p) => lower.includes(p))) {
        existingUncertaintyCount++;
      }
    }

    const escalationCounters: EscalationCounters = {
      uncertaintyCount: existingUncertaintyCount,
      recentResponses: recentAssistantMessages,
    };

    if (!runtimeCapabilityGapBlockedResponse) {
      const postEscalation = checkPostLLMEscalation(
        assistantContent,
        escalationCounters,
        config.escalationPolicy
      );
      if (postEscalation.shouldEscalate && !sessionEsc) {
        // Only escalate if not already escalated
        await ctx.runMutation(getInternal().ai.agentLifecycle.recordLifecycleTransition, {
          sessionId: session._id,
          fromState: "active",
          toState: "paused",
          actor: "system",
          actorId: "agent_execution",
          checkpoint: "escalation_detected",
          reason: postEscalation.triggerType,
          metadata: {
            checkpoint: "post_llm_escalation",
            urgency: postEscalation.urgency,
          },
        });

        const postAgentName = resolveEscalationAgentName(agent);
        await createAndDispatchEscalation({
          sessionId: session._id,
          organizationId: args.organizationId,
          agentId: agent._id,
          turnId: runtimeTurnId,
          trigger: {
            reason: postEscalation.reason,
            urgency: postEscalation.urgency,
            triggerType: postEscalation.triggerType,
          },
          checkpoint: "post_llm_escalation",
          contactIdentifier: args.externalContactIdentifier,
          channel: args.channel,
          lastMessage: inboundMessage.slice(0, 200),
          agentName: postAgentName,
          createEscalation: async (escalationArgs) => {
            await ctx.runMutation(getInternal().ai.escalation.createEscalation, escalationArgs);
          },
          recordTurnTransition: async (transitionArgs) => {
            await ctx.runMutation(getInternal().ai.agentSessions.recordTurnTransition, transitionArgs);
          },
          notifyTelegram: (payload) => {
            ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationTelegram, payload);
          },
          notifyPushover: (payload) => {
            ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationPushover, payload);
          },
          notifyEmail: (payload) => {
            ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationEmail, payload);
          },
          notifyHighUrgencyRetry: (payload) => {
            ctx.scheduler.runAfter(5 * 60 * 1000, getInternal().ai.escalation.retryHighUrgencyEmail, payload);
          },
          onTransitionError: (error) => {
            console.warn("[AgentExecution] Failed to append post-LLM escalation turn edge", error);
          },
        });
        // Note: still send the LLM response (already generated) but now team is notified
      }
    }

    // 10. Save messages
    await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
      sessionId: session._id,
      role: "user",
      content: inboundMessage,
    });

    await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
      sessionId: session._id,
      role: "assistant",
      content: assistantContent,
      toolCalls: toolResults.length > 0 ? toolResults : undefined,
    });
    const rollingMemoryRefresh = await ctx.runMutation(
      getInternal().ai.agentSessions.refreshSessionRollingSummaryMemory,
      {
        sessionId: session._id,
        organizationId: args.organizationId,
      }
    ) as { success?: boolean; error?: string; reason?: string } | null;
    if (!rollingMemoryRefresh?.success) {
      console.warn("[AgentExecution] Rolling session memory refresh blocked", {
        organizationId: args.organizationId,
        sessionId: session._id,
        error: rollingMemoryRefresh?.error,
        reason: rollingMemoryRefresh?.reason,
      });
    }
    const contactMemoryRefresh = await ctx.runMutation(
      getInternal().ai.agentSessions.refreshSessionContactMemory,
      {
        sessionId: session._id,
        turnId: runtimeTurnId,
        organizationId: args.organizationId,
        channel: args.channel,
        externalContactIdentifier: args.externalContactIdentifier,
        sessionRoutingKey,
        userMessage: inboundMessage,
        toolResults: toolResults.map((result) => ({
          tool: result.tool,
          status: result.status,
          result: result.result,
        })),
        provenance: {
          contractVersion: "session_contact_memory_v1",
          sourcePolicy: "explicit_user_verified_tool_v1",
          actor: "agent_execution_pipeline",
          trustEventName: "trust.memory.consent_decided.v1",
        },
      }
    ) as {
      success?: boolean;
      error?: string;
      reason?: string;
      insertedCount?: number;
      supersededCount?: number;
      ambiguousFields?: string[];
    } | null;
    if (!contactMemoryRefresh?.success) {
      console.warn("[AgentExecution] Structured contact memory refresh blocked", {
        organizationId: args.organizationId,
        sessionId: session._id,
        turnId: runtimeTurnId,
        error: contactMemoryRefresh?.error,
        reason: contactMemoryRefresh?.reason,
      });
    }
    const runtimeMemoryTelemetry = buildRuntimeMemoryLaneTelemetry({
      aiAgentMemoryContract,
      rollingMemoryRefresh,
      contactMemoryRefresh,
    });
    console.info("[AgentExecution][MemoryLaneTelemetry]", {
      organizationId: args.organizationId,
      sessionId: session._id,
      turnId: runtimeTurnId,
      aiAgentMemoryDecision: runtimeMemoryTelemetry.aiAgentMemory.decision,
      aiAgentMemoryReason: runtimeMemoryTelemetry.aiAgentMemory.reason,
      layerOrder: runtimeMemoryTelemetry.layerOrder,
      rollingSummaryRefreshStatus: runtimeMemoryTelemetry.rollingSummaryRefresh.status,
      contactMemoryRefreshStatus: runtimeMemoryTelemetry.contactMemoryRefresh.status,
      contactMemoryInsertedCount: runtimeMemoryTelemetry.contactMemoryRefresh.insertedCount,
      contactMemorySupersededCount: runtimeMemoryTelemetry.contactMemoryRefresh.supersededCount,
    });

    // 10.3. Process interview extraction (guided mode only)
    if (interviewContext && assistantContent) {
      const extractionResults = parseExtractionResults(assistantContent);
      if (extractionResults.length > 0) {
        await ctx.runMutation(getInternal().ai.interviewRunner.advanceInterview, {
          sessionId: session._id,
          extractionResults,
        });
      }
    }

    let usageModelPricing = resolvedModelPricing;
    if (usedModel !== model) {
      usageModelPricing = await ctx.runQuery(
        getApi().api.ai.modelPricing.getModelPricing,
        { modelId: usedModel }
      ) as typeof resolvedModelPricing;

      if (usageModelPricing.usedFallback) {
        console.warn("[AgentExecution][PricingFallback]", {
          modelId: usageModelPricing.modelId,
          source: usageModelPricing.source,
          warning: usageModelPricing.warning,
        });
      }
    }

    const costUsd = calculateCostFromUsage(response.usage, usageModelPricing);
    const usageSnapshot = response.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };
    const promptTokens = Math.max(0, usageSnapshot.prompt_tokens || 0);
    const completionTokens = Math.max(0, usageSnapshot.completion_tokens || 0);
    const totalTokens = Math.max(
      0,
      usageSnapshot.total_tokens ?? promptTokens + completionTokens
    );
    const nativeCostInCents = Math.max(0, Math.round(costUsd * 100));

    // 10.5. Deduct credits for LLM call
    const llmCreditCost = convertUsdToCredits(costUsd);
    const usedModelProviderId = usedAuthProviderId;
    const llmBillingSource = resolveLlmBillingSource({
      providerId: usedModelProviderId,
      profileId: usedAuthProfileId,
    });
    let llmCreditsCharged = 0;
    let llmCreditChargeStatus:
      | "charged"
      | "skipped_unmetered"
      | "skipped_insufficient_credits"
      | "skipped_not_required"
      | "failed" = "failed";
    try {
      const llmCreditDeduction = await ctx.runMutation(
        getInternal().credits.index.deductCreditsInternalMutation,
        {
          organizationId: args.organizationId,
          amount: llmCreditCost,
          action: "agent_message",
          relatedEntityType: "agent_session",
          relatedEntityId: session._id,
          billingSource: llmBillingSource,
          requestSource: "llm",
          softFailOnExhausted: true,
        }
      );

      if (llmCreditDeduction.success && !llmCreditDeduction.skipped) {
        llmCreditsCharged = llmCreditCost;
        llmCreditChargeStatus = "charged";
      } else if (llmCreditDeduction.success && llmCreditDeduction.skipped) {
        llmCreditChargeStatus = "skipped_not_required";
      } else if (!llmCreditDeduction.success) {
        llmCreditChargeStatus = "skipped_insufficient_credits";
        console.warn("[AgentExecution] LLM credit deduction skipped:", {
          organizationId: args.organizationId,
          errorCode: llmCreditDeduction.errorCode,
          message: llmCreditDeduction.message,
          creditsRequired: llmCreditDeduction.creditsRequired,
          creditsAvailable: llmCreditDeduction.creditsAvailable,
        });
      }
    } catch (e) {
      // Log but don't fail - the message was already processed
      console.error("[AgentExecution] Credit deduction failed:", e);
      llmCreditChargeStatus = "failed";
    }

    try {
      await ctx.runMutation(getApi().api.ai.billing.recordUsage, {
        organizationId: args.organizationId,
        requestType: "chat",
        provider: usedModelProviderId,
        model: usedModel,
        action: "agent_completion",
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
        creditsCharged: llmCreditsCharged,
        creditChargeStatus: llmCreditChargeStatus,
        success: true,
        billingSource: llmBillingSource,
        requestSource: "llm",
        ledgerMode: "credits_ledger",
        creditLedgerAction: "agent_message",
        usageMetadata: {
          channel: args.channel,
          sessionId: session._id,
          turnId: runtimeTurnId,
          selectedModel: model,
          usedAuthProfileId,
          selectedAuthProfileId: primaryAuthProfileId,
          selectionSource,
          usedModelRoutingReason: usedModelRoutingReason ?? null,
          routingIntent,
          routingModality,
          selectedRoutingReason: selectedRoutingReason ?? null,
          privacyMode: routingPolicyContract.privacyMode,
          qualityTierFloor: routingPolicyContract.qualityTierFloor,
          localConnectorId: routingPolicyContract.localConnection?.connectorId ?? null,
          localConnectionStatus: routingPolicyContract.localConnection?.status ?? null,
          localModelCount: routingPolicyContract.localModelIds.length,
          selectedRouteIsLocal,
          selectedModelQualityTier: selectedModelQualityTier ?? null,
          selectedRouteDriftOverall: selectedRouteDriftOverall ?? null,
          selectedPolicyGuardrail: selectedPolicyGuardrail ?? null,
          selectedModelDriftWarning: selectedModelDriftWarning ?? null,
          containsVisionAttachments: inboundImageAttachments.length > 0,
          visionAttachmentCount: inboundImageAttachments.length,
          visionPreferredProvider:
            routingModality === "vision" ? "gemini" : null,
          runtimeGovernor: {
            contractVersion: runtimeGovernorContract.contract_version,
            source: runtimeGovernorContract.source,
            maxSteps: runtimeGovernorContract.max_steps,
            maxTimeMs: runtimeGovernorContract.max_time_ms,
            maxCostUsd: runtimeGovernorContract.max_cost_usd,
            estimatedCostUsd: runtimeGovernorEstimatedCostUsd ?? null,
            toolCallsTrimmed: runtimeGovernorToolCallsTrimmed,
            limitTriggered:
              runtimeGovernorLimitTriggered !== "none"
                ? runtimeGovernorLimitTriggered
                : null,
            elapsedMs: Date.now() - runtimeGovernorStartedAt,
          },
        },
      });
    } catch (error) {
      console.error("[AgentExecution] Failed to persist LLM usage telemetry:", error);
    }

    // 10.6. Deduct credits for tool executions (only successful ones)
    for (const result of toolResults) {
      if (result.status === "success") {
        const toolCost = getToolCreditCost(result.tool);
        if (toolCost > 0) {
          try {
            const toolCreditDeduction = await ctx.runMutation(
              getInternal().credits.index.deductCreditsInternalMutation,
              {
                organizationId: args.organizationId,
                amount: toolCost,
                action: `tool_${result.tool}`,
                relatedEntityType: "agent_session",
                relatedEntityId: session._id,
                billingSource: "platform",
                requestSource: "platform_action",
                softFailOnExhausted: true,
              }
            );

            if (!toolCreditDeduction.success) {
              console.warn(`[AgentExecution] Tool credit deduction skipped for ${result.tool}:`, {
                organizationId: args.organizationId,
                errorCode: toolCreditDeduction.errorCode,
                message: toolCreditDeduction.message,
                creditsRequired: toolCreditDeduction.creditsRequired,
                creditsAvailable: toolCreditDeduction.creditsAvailable,
              });
            }
          } catch (e) {
            console.error(`[AgentExecution] Tool credit deduction failed for ${result.tool}:`, e);
          }
        }
      }
    }

    const routingPinDecision = evaluateSessionRoutingPinUpdate({
      pinnedModelId: pinnedSessionModelId,
      pinnedAuthProfileId,
      selectedModelId: model,
      usedModelId: usedModel,
      selectedAuthProfileId: primaryAuthProfileId,
      usedAuthProfileId,
      hasExplicitModelOverride,
    });
    const usedAuthProfileFallback = routingPinDecision.usedAuthProfileFallback;

    if (routingPinDecision.shouldUpdateRoutingPin) {
      await ctx.runMutation(getInternal().ai.agentSessions.upsertSessionRoutingPin, {
        sessionId: session._id,
        modelId: usedModel,
        authProfileId: usedAuthProfileId ?? undefined,
        pinReason: routingPinDecision.pinReason!,
        unlockReason: routingPinDecision.unlockReason,
      });
    }
    const modelResolutionFallbackUsed =
      (selectionSource !== "preferred" && selectionSource !== "session_pinned")
      || (
        typeof selectedRoutingReason === "string"
        && selectedRoutingReason !== "preferred"
        && selectedRoutingReason !== "session_pinned"
      )
      || usedModel !== model
      || usedAuthProfileFallback;
    const modelResolutionFallbackReason =
      usedModel !== model
        ? usedModelRoutingReason ?? "retry_chain"
        : usedAuthProfileFallback
          ? "auth_profile_rotation"
          : selectionSource !== "preferred" && selectionSource !== "session_pinned"
            ? selectedRoutingReason ?? selectionSource
            : typeof selectedRoutingReason === "string"
                && selectedRoutingReason !== "preferred"
                && selectedRoutingReason !== "session_pinned"
              ? selectedRoutingReason
              : undefined;
    const runtimeModelResolution = {
      requestedModel: explicitModelOverride,
      selectedModel: model,
      usedModel,
      selectedAuthProfileId: primaryAuthProfileId ?? undefined,
      usedAuthProfileId: usedAuthProfileId ?? undefined,
      selectionSource,
      fallbackUsed: modelResolutionFallbackUsed,
      fallbackReason: modelResolutionFallbackReason,
    };

    // 11. Update stats
    const tokensUsed = response.usage?.total_tokens || 0;

    await ctx.runMutation(getInternal().ai.agentSessions.updateSessionStats, {
      sessionId: session._id,
      tokensUsed,
      costUsd,
    });

    // 12. Audit log
    await ctx.runMutation(getInternal().ai.agentSessions.logAgentAction, {
      agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
      organizationId: args.organizationId,
      actionType: "message_processed",
      actionData: {
        authorityAgentId: delegationAuthorityContract.authorityAgentId,
        speakerAgentId: delegationAuthorityContract.speakerAgentId,
        channel: args.channel,
        sessionId: session._id,
        turnId: runtimeTurnId,
        toolsUsed: toolResults.map((t) => t.tool),
        toolResults: toolResults.map((result) => ({
          tool: result.tool,
          status: result.status,
        })),
        tokensUsed,
        costUsd,
        modelResolution: {
          ...runtimeModelResolution,
          preferredModel,
          orgDefaultModel,
          routingIntent,
          routingModality,
          selectedRoutingReason,
          usedModelRoutingReason,
          privacyMode: routingPolicyContract.privacyMode,
          qualityTierFloor: routingPolicyContract.qualityTierFloor,
          localConnectionStatus: routingPolicyContract.localConnection?.status ?? null,
          localConnectorId: routingPolicyContract.localConnection?.connectorId ?? null,
          localModelCount: routingPolicyContract.localModelIds.length,
          selectedRouteIsLocal,
          selectedModelQualityTier,
          selectedRouteDriftOverall,
          selectedPolicyGuardrail,
          selectedModelDriftWarning,
        },
        executionBundle,
        runtimeControls: {
          mode: composerRuntimeControls.mode,
          reasoningEffort: composerRuntimeControls.reasoningEffort,
          referencesProvided: composerRuntimeControls.references.length,
          referencesReady: composerRuntimeControls.references.filter(
            (reference) => reference.status === "ready"
          ).length,
          referencesErrored: composerRuntimeControls.references.filter(
            (reference) => reference.status === "error"
          ).length,
          strippedFallbackEnvelope: composerRuntimeControls.strippedFallbackEnvelope,
          runtimeGovernor: {
            contractVersion: runtimeGovernorContract.contract_version,
            source: runtimeGovernorContract.source,
            maxSteps: runtimeGovernorContract.max_steps,
            maxTimeMs: runtimeGovernorContract.max_time_ms,
            maxCostUsd: runtimeGovernorContract.max_cost_usd,
            estimatedCostUsd: runtimeGovernorEstimatedCostUsd ?? null,
            toolCallsTrimmed: runtimeGovernorToolCallsTrimmed,
            limitTriggered:
              runtimeGovernorLimitTriggered !== "none"
                ? runtimeGovernorLimitTriggered
                : null,
            elapsedMs: Date.now() - runtimeGovernorStartedAt,
          },
          generation: {
            temperature: usedComposerGenerationSettings.temperature,
            maxTokens: usedComposerGenerationSettings.maxTokens,
            reasoningMode: usedReasoningMode,
            reasoningParamKind: usedReasoningParamKind,
            reasoningProviderId: usedReasoningProviderId,
            reasoningResolution: usedReasoningReason,
          },
        },
        meetingConcierge: meetingConciergeIntent.enabled
          ? {
              enabled: true,
              extractedPayloadReady: meetingConciergeIntent.extractedPayloadReady,
              autoTriggerPreview: meetingConciergeIntent.autoTriggerPreview,
              explicitConfirmDetected: meetingConciergeIntent.explicitConfirmDetected,
              previewIntentDetected: meetingConciergeIntent.previewIntentDetected,
              missingRequiredFields: meetingConciergeIntent.missingRequiredFields,
              fallbackReasons: meetingConciergeIntent.fallbackReasons,
              ingestLatencyMs: meetingConciergeIntent.ingestLatencyMs,
              toolInvocationAttempted: toolResults.some(
                (result) => result.tool === "manage_bookings"
              ),
              toolInvocationSuccess: toolResults.some(
                (result) =>
                  result.tool === "manage_bookings" && result.status === "success"
              ),
              sourceAttestation: meetingConciergeIntent.sourceAttestation,
              commandPolicy: meetingConciergeIntent.commandPolicy,
              payload: meetingConciergeIntent.payload,
            }
          : {
              enabled: false,
            },
        mobileBridgeHardening: {
          bridgeHealth: canonicalIngressEnvelope.nativeVisionEdge.observability,
          sourceAttestation: canonicalIngressEnvelope.nativeVisionEdge.sourceAttestation,
          commandPolicy: meetingConciergeIntent.commandPolicy,
          policyBlocked:
            meetingConciergeIntent.commandPolicy.policyRequired
            && !meetingConciergeIntent.commandPolicy.allowed,
        },
        retrieval: {
          ...retrievalTelemetry,
          docsDropped: boundedKnowledgeContext.droppedDocumentCount,
          docsTruncated: boundedKnowledgeContext.truncatedDocumentCount,
          estimatedTokensInjected: boundedKnowledgeContext.estimatedTokensUsed,
          tokenBudget: boundedKnowledgeContext.tokenBudget,
        },
        memory: runtimeMemoryTelemetry,
        knowledgeLoad: systemKnowledgeLoad.telemetry,
        toolScoping: toolScopingAudit,
        ...(voiceRuntimeMetadata ? {
          voiceRuntime: {
            ...voiceRuntimeMetadata,
            synthesis: voiceSynthesisResult ?? undefined,
          },
        } : {}),
        ...(brokerMetrics ? {
          broker: {
            brokered: brokerMetrics.brokered,
            toolsBefore: brokerMetrics.toolsBeforeBroker,
            toolsAfter: brokerMetrics.toolsOffered,
            intents: brokerMetrics.intentsDetected,
            toolSelected: toolResults[0]?.tool,
            toolInBrokeredSet: toolResults[0]?.tool
              ? toolSchemas.some(s => s.function.name === toolResults[0]?.tool)
              : undefined,
          },
        } : {}),
      },
    });

    // 13. Route response back through channel provider (outbound delivery)
    // Skip if: metadata.skipOutbound is true (webhook/native endpoint sends reply itself),
    // or channel is "api_test" (testing via API, no delivery needed),
    // or there's no response content.
    const deliveryContent = formatAssistantContentForDelivery(
      args.channel,
      assistantContent,
      inboundMetadata
    );
    const deliveryResult = await deliverAssistantResponseWithFallback(
      ctx,
      {
        sendMessage: getInternal().channels.router.sendMessage,
        addToDeadLetterQueue: getInternal().ai.deadLetterQueue.addToDeadLetterQueue,
      },
      {
        organizationId: args.organizationId,
        channel: args.channel,
        recipientIdentifier: args.externalContactIdentifier,
        assistantContent: deliveryContent,
        sessionId: session._id,
        turnId: runtimeTurnId,
        receiptId: runtimeReceiptId,
        metadata: {
          ...inboundMetadata,
          turnId: runtimeTurnId,
        },
      },
    );
    terminalDeliverablePointer = buildTerminalDeliverablePointer({
      deliveryResult,
      sessionId: session._id,
      turnId: runtimeTurnId,
    });

    return {
      status: runtimeCapabilityGapBlockedResponse ? "blocked" : "success",
      message: assistantContent,
      response: deliveryContent,
      modelResolution: runtimeModelResolution,
      toolResults,
      sessionId: session._id,
      turnId: runtimeTurnId,
      ...(runtimeCapabilityGapBlockedResponse ? {
        blocked: runtimeCapabilityGapBlockedResponse,
      } : {}),
      ...(voiceRuntimeMetadata ? {
        voiceRuntime: {
          ...voiceRuntimeMetadata,
          synthesis: voiceSynthesisResult ?? undefined,
        },
      } : {}),
    };
    } catch (error) {
      turnRuntimeError = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      runtimeTurnVersion = await settleRuntimeTurnLease({
        turnId: runtimeTurnId,
        expectedVersion: runtimeTurnVersion,
        leaseToken: runtimeLeaseToken,
        runtimeError: turnRuntimeError,
        releaseTurnLease: (leaseReleaseArgs) => releaseTurnLease(ctx, leaseReleaseArgs),
        failTurnLease: (leaseFailArgs) => failTurnLease(ctx, leaseFailArgs),
        onSettleFailure: ({ mode, error }) => {
          if (mode === "fail") {
            console.error("[AgentExecution] Failed to mark turn as failed", {
              turnId: runtimeTurnId,
              error,
            });
            return;
          }
          console.error("[AgentExecution] Failed to release turn lease", {
            turnId: runtimeTurnId,
            error,
          });
        },
      });

      terminalDeliverablePointer = await persistRuntimeTurnArtifacts({
        receiptId: runtimeReceiptId,
        turnId: runtimeTurnId,
        runtimeError: turnRuntimeError,
        terminalDeliverable: terminalDeliverablePointer,
        recordTurnTerminalDeliverable: async (terminalWriteArgs) =>
          await ctx.runMutation(
            getInternal().ai.agentSessions.recordTurnTerminalDeliverable,
            terminalWriteArgs,
          ) as { success?: boolean; error?: string } | null,
        completeInboundReceipt: async (receiptFinalizeArgs) =>
          await ctx.runMutation(
            getInternal().ai.agentExecution.completeInboundReceipt,
            receiptFinalizeArgs,
          ) as { success?: boolean; error?: string } | null,
        onTerminalPersistFailure: (error) => {
          console.error("[AgentExecution] Failed to persist terminal deliverable pointer", {
            turnId: runtimeTurnId,
            error,
          });
        },
        onReceiptFinalizeFailure: (error) => {
          console.error("[AgentExecution] Failed to finalize inbound receipt", {
            receiptId: runtimeReceiptId,
            turnId: runtimeTurnId,
            error,
          });
        },
      });
    }
  },
});

/**
 * Receipt-first ingress: create or update durable inbound receipt row.
 */
export const ingestInboundReceipt = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.id("agentSessions"),
    agentId: v.id("objects"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
    idempotencyKey: v.string(),
    idempotencyContract: v.optional(v.object({
      contractVersion: v.literal(IDEMPOTENCY_CONTRACT_VERSION),
      scopeKind: v.union(
        v.literal("org"),
        v.literal("route_workflow"),
        v.literal("collaboration"),
      ),
      scopeKey: v.string(),
      intentType: v.union(
        v.literal("ingress"),
        v.literal("orchestration"),
        v.literal("proposal"),
        v.literal("commit"),
      ),
      payloadHash: v.string(),
      ttlMs: v.number(),
      issuedAt: v.number(),
      expiresAt: v.number(),
      replayOutcome: v.union(
        v.literal("accepted"),
        v.literal("duplicate_acknowledged"),
        v.literal("replay_previous_result"),
        v.literal("conflict_commit_in_progress"),
      ),
    })),
    queueContract: v.optional(v.object({
      contractVersion: v.literal(TURN_QUEUE_CONTRACT_VERSION),
      tenantId: v.string(),
      routeKey: v.string(),
      workflowKey: v.string(),
      lineageId: v.optional(v.string()),
      threadId: v.optional(v.string()),
      concurrencyKey: v.string(),
      orderingKey: v.string(),
      conflictLabel: v.union(
        v.literal("conflict_turn_in_progress"),
        v.literal("conflict_commit_in_progress"),
        v.literal("conflict_queue_ordering"),
        v.literal("replay_duplicate_ingress"),
        v.literal("replay_duplicate_proposal"),
        v.literal("replay_duplicate_commit"),
      ),
    })),
    payloadHash: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    if (args.idempotencyContract) {
      assertRuntimeIdempotencyContract(args.idempotencyContract);
    }
    if (args.queueContract) {
      assertTurnQueueContract(args.queueContract);
    }

    const now = Date.now();
    const idempotencyScopeKey = normalizeInboundRouteString(
      args.idempotencyContract?.scopeKey
    );
    const idempotencyPayloadHash = normalizeInboundRouteString(
      args.idempotencyContract?.payloadHash
    );
    const queueConcurrencyKey = normalizeInboundRouteString(
      args.queueContract?.concurrencyKey
    );
    const intentType = args.idempotencyContract?.intentType;
    const replayConflictLabel =
      intentType === "proposal"
        ? "replay_duplicate_proposal"
        : intentType === "commit"
          ? "replay_duplicate_commit"
          : "replay_duplicate_ingress";
    const replayOutcome =
      intentType === "proposal" || intentType === "commit"
        ? "replay_previous_result"
        : "duplicate_acknowledged";

    if (
      queueConcurrencyKey
      && (args.queueContract?.workflowKey === "commit"
        || args.idempotencyContract?.intentType === "commit")
    ) {
      const inFlightCommit = await ctx.db
        .query("agentInboxReceipts")
        .withIndex("by_org_queue_concurrency_status", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("queueConcurrencyKey", queueConcurrencyKey)
            .eq("status", "processing")
        )
        .first();

      if (inFlightCommit && inFlightCommit.idempotencyKey !== args.idempotencyKey) {
        return {
          success: false,
          error: "conflict_commit_in_progress" as const,
          receiptId: inFlightCommit._id,
          turnId: inFlightCommit.turnId,
          conflictLabel: "conflict_commit_in_progress" as const,
        };
      }
    }

    let existing = null as {
      _id: Id<"agentInboxReceipts">;
      idempotencyKey: string;
      idempotencyScopeKey?: string;
      idempotencyExpiresAt?: number;
      idempotencyContract?: Record<string, unknown>;
      payloadHash?: string;
      duplicateCount: number;
      status:
        | "accepted"
        | "processing"
        | "completed"
        | "failed"
        | "duplicate";
      turnId?: Id<"agentTurns">;
      metadata?: unknown;
      firstSeenAt?: number;
      createdAt: number;
      lastSeenAt: number;
      updatedAt: number;
    } | null;

    if (idempotencyScopeKey) {
      const scopeCandidates = await ctx.db
        .query("agentInboxReceipts")
        .withIndex("by_org_idempotency_scope_key", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("idempotencyScopeKey", idempotencyScopeKey)
        )
        .collect();
      const sortedScopeCandidates = scopeCandidates.sort((a, b) => {
        const firstSeenA =
          typeof a.firstSeenAt === "number" ? a.firstSeenAt : a.createdAt;
        const firstSeenB =
          typeof b.firstSeenAt === "number" ? b.firstSeenAt : b.createdAt;
        if (firstSeenA !== firstSeenB) {
          return firstSeenA - firstSeenB;
        }
        return String(a._id).localeCompare(String(b._id));
      });
      existing = sortedScopeCandidates.find((candidate) => {
        if (
          typeof candidate.idempotencyExpiresAt === "number" &&
          candidate.idempotencyExpiresAt <= now
        ) {
          return false;
        }

        const candidatePayloadHash = normalizeInboundRouteString(
          (candidate.idempotencyContract as Record<string, unknown> | undefined)
            ?.payloadHash ?? candidate.payloadHash
        );
        if (
          idempotencyPayloadHash &&
          candidatePayloadHash &&
          candidatePayloadHash !== idempotencyPayloadHash
        ) {
          return false;
        }

        if (candidate.idempotencyKey === args.idempotencyKey) {
          return true;
        }

        if (!idempotencyPayloadHash || !candidatePayloadHash) {
          return false;
        }
        return candidatePayloadHash === idempotencyPayloadHash;
      }) ?? null;
    }

    if (!existing) {
      const keyCandidates = await ctx.db
        .query("agentInboxReceipts")
        .withIndex("by_org_idempotency_key", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("idempotencyKey", args.idempotencyKey)
        )
        .collect();
      existing = keyCandidates
        .sort((a, b) => {
          const firstSeenA =
            typeof a.firstSeenAt === "number" ? a.firstSeenAt : a.createdAt;
          const firstSeenB =
            typeof b.firstSeenAt === "number" ? b.firstSeenAt : b.createdAt;
          if (firstSeenA !== firstSeenB) {
            return firstSeenA - firstSeenB;
          }
          return String(a._id).localeCompare(String(b._id));
        })
        .find((candidate) => {
          if (
            typeof candidate.idempotencyExpiresAt === "number" &&
            candidate.idempotencyExpiresAt <= now
          ) {
            return false;
          }

          const candidatePayloadHash = normalizeInboundRouteString(
            (candidate.idempotencyContract as Record<string, unknown> | undefined)
              ?.payloadHash ?? candidate.payloadHash
          );
          if (
            idempotencyPayloadHash &&
            candidatePayloadHash &&
            candidatePayloadHash !== idempotencyPayloadHash
          ) {
            return false;
          }
          return true;
        }) ?? null;
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        duplicateCount: existing.duplicateCount + 1,
        lastSeenAt: now,
        updatedAt: now,
        metadata: args.metadata ?? existing.metadata,
      });

      return {
        success: true,
        receiptId: existing._id,
        duplicate: true,
        status: existing.status,
        turnId: existing.turnId,
        conflictLabel: replayConflictLabel as TurnQueueConflictLabel,
        replayOutcome,
      };
    }

    const receiptId = await ctx.db.insert("agentInboxReceipts", {
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      agentId: args.agentId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      idempotencyKey: args.idempotencyKey,
      idempotencyScopeKey,
      idempotencyExpiresAt: args.idempotencyContract?.expiresAt,
      idempotencyContract: args.idempotencyContract,
      queueContract: args.queueContract,
      queueConcurrencyKey,
      queueOrderingKey: args.queueContract?.orderingKey,
      payloadHash: args.payloadHash ?? idempotencyPayloadHash,
      status: "accepted",
      duplicateCount: 0,
      firstSeenAt: now,
      lastSeenAt: now,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      receiptId,
      duplicate: false,
      status: "accepted" as const,
      conflictLabel: args.queueContract?.conflictLabel,
      replayOutcome: "accepted" as const,
    };
  },
});

/**
 * Mark a receipt as actively processing and attach turn pointer.
 */
export const markReceiptProcessing = internalMutation({
  args: {
    receiptId: v.id("agentInboxReceipts"),
    turnId: v.optional(v.id("agentTurns")),
  },
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) {
      return { success: false, error: "receipt_not_found" as const };
    }

    const now = Date.now();
    await ctx.db.patch(args.receiptId, {
      status: "processing",
      turnId: args.turnId ?? receipt.turnId,
      processingStartedAt: receipt.processingStartedAt ?? now,
      lastSeenAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Mark receipt terminal lifecycle status once runtime handling exits.
 */
export const completeInboundReceipt = internalMutation({
  args: {
    receiptId: v.id("agentInboxReceipts"),
    status: v.union(v.literal("completed"), v.literal("failed"), v.literal("duplicate")),
    turnId: v.optional(v.id("agentTurns")),
    failureReason: v.optional(v.string()),
    terminalDeliverable: v.optional(v.object({
      pointerType: v.string(),
      pointerId: v.string(),
      status: v.union(v.literal("success"), v.literal("failed")),
      recordedAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) {
      return { success: false, error: "receipt_not_found" as const };
    }

    const now = Date.now();
    await ctx.db.patch(args.receiptId, {
      status: args.status,
      turnId: args.turnId ?? receipt.turnId,
      completedAt: args.status === "completed" ? now : receipt.completedAt,
      failedAt: args.status === "failed" ? now : receipt.failedAt,
      failureReason: args.status === "failed" ? args.failureReason : receipt.failureReason,
      terminalDeliverable: receipt.terminalDeliverable ?? args.terminalDeliverable,
      lastSeenAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * HITL waitpoint contract gate for escalation checkpoints.
 *
 * Pending/taken_over statuses always stay blocked and issue or reuse a waitpoint token.
 * Resolved/dismissed/timed_out statuses require a valid token resume when a waitpoint exists.
 */
export const enforceHitlWaitpointContract = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    turnId: v.id("agentTurns"),
    escalationStatus: v.union(
      v.literal("pending"),
      v.literal("taken_over"),
      v.literal("resolved"),
      v.literal("dismissed"),
      v.literal("timed_out"),
    ),
    providedToken: v.optional(v.string()),
    tokenTtlMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { success: false, error: "session_not_found" as const };
    }

    const escalationState = (session as any).escalationState as Record<string, unknown> | undefined;
    if (!escalationState) {
      return { success: false, error: "escalation_not_found" as const };
    }

    const observedStatus =
      typeof escalationState.status === "string" ? escalationState.status : null;
    if (!observedStatus) {
      return { success: false, error: "escalation_not_found" as const };
    }
    if (observedStatus !== args.escalationStatus) {
      return {
        success: false,
        error: "escalation_status_mismatch" as const,
        observedStatus,
      };
    }

    const now = Date.now();
    const persistedWaitpoint = normalizeHitlWaitpointContract(escalationState.hitlWaitpoint);
    const providedToken = typeof args.providedToken === "string"
      ? args.providedToken.trim()
      : "";

    const patchEscalationWaitpoint = async (waitpoint: HitlWaitpointContract) => {
      await ctx.db.patch(args.sessionId, {
        escalationState: {
          ...(escalationState as any),
          hitlWaitpoint: waitpoint,
        } as any,
      });
    };

    if (observedStatus === "pending" || observedStatus === "taken_over") {
      const checkpoint: HitlWaitpointCheckpoint = observedStatus === "pending"
        ? "session_pending"
        : "session_taken_over";

      if (persistedWaitpoint?.status === "issued") {
        if (now >= persistedWaitpoint.expiresAt) {
          const expiredWaitpoint: HitlWaitpointContract = {
            ...persistedWaitpoint,
            status: "expired",
            abortedAt: now,
            abortReason: "waitpoint_token_expired",
          };
          await patchEscalationWaitpoint(expiredWaitpoint);
          return {
            success: false,
            error: "waitpoint_token_expired" as const,
            waitpoint: expiredWaitpoint,
          };
        }

        if (providedToken && providedToken !== persistedWaitpoint.token) {
          const abortedWaitpoint: HitlWaitpointContract = {
            ...persistedWaitpoint,
            status: "aborted",
            abortedAt: now,
            abortReason: "waitpoint_token_mismatch",
          };
          await patchEscalationWaitpoint(abortedWaitpoint);
          return {
            success: false,
            error: "waitpoint_token_mismatch" as const,
            waitpoint: abortedWaitpoint,
          };
        }

        return {
          success: false,
          error: "waitpoint_blocked" as const,
          waitpoint: persistedWaitpoint,
        };
      }

      const issuedWaitpoint = issueHitlWaitpointContract({
        sessionId: args.sessionId,
        turnId: args.turnId,
        checkpoint,
        now,
        ttlMs: args.tokenTtlMs,
      });
      await patchEscalationWaitpoint(issuedWaitpoint);
      return {
        success: false,
        error: "waitpoint_blocked" as const,
        waitpoint: issuedWaitpoint,
      };
    }

    if (!persistedWaitpoint) {
      return { success: true, resumed: false };
    }
    if (persistedWaitpoint.status === "resumed") {
      return { success: true, resumed: true, waitpoint: persistedWaitpoint };
    }
    if (persistedWaitpoint.status === "aborted") {
      return {
        success: false,
        error: "waitpoint_aborted" as const,
        waitpoint: persistedWaitpoint,
      };
    }
    if (persistedWaitpoint.status === "expired") {
      return {
        success: false,
        error: "waitpoint_expired" as const,
        waitpoint: persistedWaitpoint,
      };
    }

    if (!providedToken) {
      return {
        success: false,
        error: "waitpoint_token_required" as const,
        waitpoint: persistedWaitpoint,
      };
    }

    const validationError = resolveHitlWaitpointTokenValidationError({
      contract: persistedWaitpoint,
      providedToken,
      sessionId: args.sessionId,
      now,
    });
    if (validationError) {
      const failedWaitpoint: HitlWaitpointContract = validationError === "waitpoint_token_expired"
        ? {
            ...persistedWaitpoint,
            status: "expired",
            abortedAt: now,
            abortReason: validationError,
          }
        : {
            ...persistedWaitpoint,
            status: "aborted",
            abortedAt: now,
            abortReason: validationError,
          };
      await patchEscalationWaitpoint(failedWaitpoint);
      return {
        success: false,
        error: validationError as
          | "waitpoint_token_expired"
          | "waitpoint_token_mismatch"
          | "waitpoint_token_invalid",
        waitpoint: failedWaitpoint,
      };
    }

    const resumedWaitpoint: HitlWaitpointContract = {
      ...persistedWaitpoint,
      status: "resumed",
      resumedAt: now,
      resumeTurnId: args.turnId,
      lastValidatedAt: now,
    };
    await patchEscalationWaitpoint(resumedWaitpoint);
    return {
      success: true,
      resumed: true,
      waitpoint: resumedWaitpoint,
    };
  },
});

/**
 * Collaboration DM-to-group sync checkpoint gate for commit execution.
 * Issues or validates lineage-aware sync tokens before commit intents proceed.
 */
export const enforceCollaborationSyncCheckpointContract = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    turnId: v.id("agentTurns"),
    requireSync: v.boolean(),
    lineageId: v.string(),
    dmThreadId: v.string(),
    groupThreadId: v.string(),
    issuedForEventId: v.string(),
    providedToken: v.optional(v.string()),
    tokenTtlMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { success: false, error: "session_not_found" as const };
    }

    const sessionRecord = session as Record<string, unknown>;
    const collaborationRecord = (
      sessionRecord.collaboration && typeof sessionRecord.collaboration === "object"
    )
      ? sessionRecord.collaboration as Record<string, unknown>
      : null;
    if (!collaborationRecord) {
      return { success: false, error: "collaboration_contract_missing" as const };
    }

    const now = Date.now();
    const persisted = normalizeCollaborationSyncCheckpointContract(
      collaborationRecord.syncCheckpoint
    );
    const providedToken = typeof args.providedToken === "string"
      ? args.providedToken.trim()
      : "";

    const patchCheckpoint = async (checkpoint: CollaborationSyncCheckpointContract) => {
      await ctx.db.patch(args.sessionId, {
        collaboration: {
          ...(collaborationRecord as any),
          syncCheckpoint: checkpoint,
          updatedAt: now,
        } as any,
      });
    };

    if (!args.requireSync) {
      return {
        success: true,
        required: false,
        resumed: persisted?.status === "resumed",
        checkpoint: persisted,
      };
    }

    if (!args.lineageId.trim() || !args.dmThreadId.trim() || !args.groupThreadId.trim()) {
      return {
        success: false,
        error: "sync_checkpoint_contract_invalid" as const,
      };
    }

    if (!persisted) {
      const issued = issueCollaborationSyncCheckpointContract({
        lineageId: args.lineageId,
        dmThreadId: args.dmThreadId,
        groupThreadId: args.groupThreadId,
        issuedForEventId: args.issuedForEventId,
        now,
        ttlMs: args.tokenTtlMs,
      });
      await patchCheckpoint(issued);
      return {
        success: false,
        error: "sync_checkpoint_waiting" as const,
        checkpoint: issued,
      };
    }

    if (persisted.status === "resumed") {
      return { success: true, required: true, resumed: true, checkpoint: persisted };
    }
    if (persisted.status === "aborted") {
      return { success: false, error: "waitpoint_aborted" as const, checkpoint: persisted };
    }
    if (persisted.status === "expired") {
      return { success: false, error: "waitpoint_expired" as const, checkpoint: persisted };
    }

    if (!providedToken) {
      return {
        success: false,
        error: "waitpoint_token_required" as const,
        checkpoint: persisted,
      };
    }

    const validationError = resolveCollaborationSyncCheckpointTokenValidationError({
      contract: persisted,
      providedToken,
      lineageId: args.lineageId,
      dmThreadId: args.dmThreadId,
      groupThreadId: args.groupThreadId,
      issuedForEventId: args.issuedForEventId,
      now,
    });
    if (validationError) {
      const failedCheckpoint: CollaborationSyncCheckpointContract =
        validationError === "waitpoint_token_expired"
          ? {
              ...persisted,
              status: "expired",
              abortedAt: now,
              abortReason: validationError,
            }
          : {
              ...persisted,
              status: "aborted",
              abortedAt: now,
              abortReason: validationError,
            };
      await patchCheckpoint(failedCheckpoint);
      return {
        success: false,
        error: validationError as
          | "waitpoint_token_expired"
          | "waitpoint_token_mismatch"
          | "waitpoint_token_invalid",
        checkpoint: failedCheckpoint,
      };
    }

    const resumedCheckpoint: CollaborationSyncCheckpointContract = {
      ...persisted,
      status: "resumed",
      resumedAt: now,
      resumeTurnId: args.turnId,
      lastValidatedAt: now,
    };
    await patchCheckpoint(resumedCheckpoint);
    return {
      success: true,
      required: true,
      resumed: true,
      checkpoint: resumedCheckpoint,
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export interface InboundChannelRouteIdentity {
  bindingId?: string;
  providerId?: string;
  providerConnectionId?: string;
  providerAccountId?: string;
  providerInstallationId?: string;
  providerProfileId?: string;
  providerProfileType?: "platform" | "organization";
  routeKey?: string;
}

export const INGRESS_ENVELOPE_CONTRACT_VERSION = "tcg_ingress_envelope_v1" as const;
export const NATIVE_VISION_EDGE_BRIDGE_CONTRACT_VERSION =
  "tcg_native_vision_edge_bridge_v1" as const;
export const VC83_NATIVE_RUNTIME_AUTHORITY_PRECEDENCE =
  "vc83_runtime_policy" as const;
export const VC83_NATIVE_TOOL_REGISTRY_ROUTE = "vc83_tool_registry" as const;
export const INGRESS_EVENT_SURFACE_VALUES = [
  "chat",
  "voice",
  "camera",
  "desktop",
] as const;
export type IngressEventSurface = (typeof INGRESS_EVENT_SURFACE_VALUES)[number];

export interface InboundMutationAuthorityContract<IdLike extends string = string> {
  organizationId: IdLike;
  operatorId?: IdLike;
  scopeKey: string;
  primaryAgentId: IdLike;
  authorityAgentId: IdLike;
  speakerAgentId: IdLike;
  mutatingToolExecutionAllowed: boolean;
  invariantViolations: string[];
}

export interface InboundIngressEnvelope<IdLike extends string = string> {
  contractVersion: typeof INGRESS_ENVELOPE_CONTRACT_VERSION;
  ingressSurface: IngressEventSurface;
  channel: string;
  routeKey: string;
  externalContactIdentifier: string;
  ingressEventId: string;
  occurredAt: number;
  authority: InboundMutationAuthorityContract<IdLike>;
  nativeVisionEdge: InboundNativeVisionEdgeBridgeContract;
}

export type InboundNativeVisionEdgeIntentType = "read_only" | "mutating";
export type InboundNativeVisionEdgeExecutionMode = "paper" | "live" | "unknown";
export type InboundVisionLifecycleState =
  | "capturing"
  | "stopped"
  | "error"
  | "idle"
  | "unknown";
export type InboundVoiceLifecycleState =
  | "capturing"
  | "transcribed"
  | "fallback"
  | "closed"
  | "unknown";
export type InboundSessionLifecycleState =
  | "idle"
  | "session_started"
  | "running"
  | "session_stopped"
  | "unknown";
export type InboundSourceHealthStatus =
  | "healthy"
  | "provider_failover"
  | "device_unavailable"
  | "policy_restricted"
  | "unknown";

export interface InboundSourceHealthContract {
  status: InboundSourceHealthStatus;
  deviceAvailable?: boolean;
  providerFailoverActive?: boolean;
  policyRestricted?: boolean;
}

export interface InboundNativeVisionEdgeIntent {
  intentId: string;
  intentType: InboundNativeVisionEdgeIntentType;
  toolName?: string;
  action?: string;
  executionMode: InboundNativeVisionEdgeExecutionMode;
  routeTarget: typeof VC83_NATIVE_TOOL_REGISTRY_ROUTE;
  requestedRoute?: string;
  directDeviceMutationRequested: boolean;
}

export interface InboundNativeVisionObservabilityContract {
  liveSessionId?: string;
  voiceSessionId?: string;
  sessionStartedAtMs?: number;
  sessionStoppedAtMs?: number;
  sessionLifecycleState: InboundSessionLifecycleState;
  visionLifecycleState: InboundVisionLifecycleState;
  voiceLifecycleState: InboundVoiceLifecycleState;
  frameCadenceMs?: number;
  frameCadenceFps?: number;
  jitterMsP95?: number;
  mouthToEarEstimateMs?: number;
  fallbackTransitionCount?: number;
  sourceHealth?: InboundSourceHealthContract;
  deterministicFallbackReasons: string[];
  sessionCorrelationId?: string;
}

export interface InboundNativeVisionEdgeBridgeContract {
  contractVersion: typeof NATIVE_VISION_EDGE_BRIDGE_CONTRACT_VERSION;
  ingressSurface: IngressEventSurface;
  liveSessionSignal: boolean;
  nativeCompanionIngressSignal: boolean;
  providerPattern:
    | "gemini_live_reference"
    | "generic_edge_reference"
    | "not_applicable";
  nativeAuthorityPrecedence: typeof VC83_NATIVE_RUNTIME_AUTHORITY_PRECEDENCE;
  registryRoute: typeof VC83_NATIVE_TOOL_REGISTRY_ROUTE;
  normalizedIntentCount: number;
  actionableIntentCount: number;
  mutatingIntentCount: number;
  trustGateRequired: boolean;
  approvalGatePolicy: "required_for_mutating_intents" | "policy_driven";
  directDeviceMutationRequested: boolean;
  intents: InboundNativeVisionEdgeIntent[];
  sourceAttestation: MobileSourceAttestationContract;
  observability: InboundNativeVisionObservabilityContract;
}

function normalizeInboundTimestamp(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.floor(value);
}

function resolveInboundIngressOccurredAt(
  metadata: Record<string, unknown>,
  now: number
): number {
  return (
    normalizeInboundTimestamp(metadata.timestamp)
    ?? normalizeInboundTimestamp(metadata.receivedAt)
    ?? normalizeInboundTimestamp(metadata.providerTimestamp)
    ?? now
  );
}

function hasInboundVoiceIngressSignal(metadata: Record<string, unknown>): boolean {
  const voiceRuntimeRaw = metadata.voiceRuntime;
  if (!voiceRuntimeRaw || typeof voiceRuntimeRaw !== "object") {
    return false;
  }
  const voiceRuntime = voiceRuntimeRaw as Record<string, unknown>;
  if (voiceRuntime.synthesizeResponse === true) {
    return true;
  }
  return Boolean(
    firstInboundString(
      voiceRuntime.audioBase64,
      voiceRuntime.voiceSessionId,
      voiceRuntime.requestedVoiceId,
      voiceRuntime.requestedProviderId,
      voiceRuntime.providerId,
      voiceRuntime.mimeType,
    )
  );
}

function hasInboundCameraIngressSignal(metadata: Record<string, unknown>): boolean {
  if (normalizeInboundImageAttachments(metadata.attachments).length > 0) {
    return true;
  }
  if (typeof metadata.imageAttachmentCount === "number" && metadata.imageAttachmentCount > 0) {
    return true;
  }
  const cameraRuntime = metadata.cameraRuntime;
  if (cameraRuntime && typeof cameraRuntime === "object") {
    return true;
  }
  return Boolean(
    firstInboundString(
      metadata.cameraCaptureId,
      metadata.cameraFrameId,
      metadata.imageCaptureId,
    )
  );
}

function hasInboundLiveIngressSignal(metadata: Record<string, unknown>): boolean {
  if (metadata.liveRuntime && typeof metadata.liveRuntime === "object") {
    return true;
  }
  if (metadata.geminiLive && typeof metadata.geminiLive === "object") {
    return true;
  }
  return Boolean(
    firstInboundString(
      metadata.liveSessionId,
      metadata.geminiLiveSessionId,
      metadata.realtimeSessionId,
      metadata.liveEventId,
      metadata.geminiLiveEventId,
    )
  );
}

function hasInboundNativeCompanionIngressSignal(args: {
  channel: string;
  metadata: Record<string, unknown>;
}): boolean {
  if (args.channel !== "desktop") {
    return false;
  }
  return Boolean(
    hasInboundLiveIngressSignal(args.metadata)
      || normalizeInboundObjectValue(args.metadata.cameraRuntime)
      || normalizeInboundObjectValue(args.metadata.voiceRuntime)
  );
}

function normalizeInboundNativeVisionEdgeExecutionMode(
  value: unknown
): InboundNativeVisionEdgeExecutionMode {
  if (typeof value !== "string") {
    return "unknown";
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "live") {
    return "live";
  }
  if (normalized === "paper" || normalized === "sandbox" || normalized === "simulation") {
    return "paper";
  }
  return "unknown";
}

function normalizeInboundNumericValue(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function firstInboundNumericValue(
  ...values: unknown[]
): number | undefined {
  for (const value of values) {
    const normalized = normalizeInboundNumericValue(value);
    if (typeof normalized === "number") {
      return normalized;
    }
  }
  return undefined;
}

function firstInboundTimestamp(
  ...values: unknown[]
): number | undefined {
  for (const value of values) {
    const normalized = normalizeInboundTimestamp(value);
    if (typeof normalized === "number") {
      return normalized;
    }
  }
  return undefined;
}

function normalizeInboundBooleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  return undefined;
}

function normalizeInboundObjectValue(
  value: unknown
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeInboundLifecycleState(
  value: unknown,
  allowed: readonly string[],
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return allowed.includes(normalized) ? normalized : undefined;
}

function appendInboundFallbackReason(target: Set<string>, value: unknown) {
  if (typeof value !== "string") {
    return;
  }
  const normalized = value.trim();
  if (!normalized) {
    return;
  }
  target.add(normalized);
}

function appendInboundFallbackReasonList(target: Set<string>, value: unknown) {
  if (!Array.isArray(value)) {
    return;
  }
  for (const candidate of value) {
    appendInboundFallbackReason(target, candidate);
  }
}

function normalizeInboundSourceHealthStatus(
  value: unknown
): InboundSourceHealthStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === "healthy") {
    return "healthy";
  }
  if (normalized === "provider_failover") {
    return "provider_failover";
  }
  if (normalized === "device_unavailable") {
    return "device_unavailable";
  }
  if (normalized === "policy_restricted") {
    return "policy_restricted";
  }
  if (normalized === "unknown") {
    return "unknown";
  }
  return undefined;
}

function resolveInboundDerivedSourceHealthStatus(args: {
  deviceAvailable?: boolean;
  providerFailoverActive?: boolean;
  policyRestricted?: boolean;
}): InboundSourceHealthStatus | undefined {
  if (args.policyRestricted === true) {
    return "policy_restricted";
  }
  if (args.deviceAvailable === false) {
    return "device_unavailable";
  }
  if (args.providerFailoverActive === true) {
    return "provider_failover";
  }
  if (
    typeof args.deviceAvailable === "boolean" ||
    typeof args.providerFailoverActive === "boolean" ||
    typeof args.policyRestricted === "boolean"
  ) {
    return "healthy";
  }
  return undefined;
}

function resolveInboundSourceHealthContract(
  candidates: Array<Record<string, unknown> | undefined>
): InboundSourceHealthContract | undefined {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const deviceAvailable = normalizeInboundBooleanValue(candidate.deviceAvailable);
    const providerFailoverActive = normalizeInboundBooleanValue(
      candidate.providerFailoverActive
    );
    const policyRestricted = normalizeInboundBooleanValue(candidate.policyRestricted);
    const explicitStatus = normalizeInboundSourceHealthStatus(
      firstInboundString(
        candidate.status,
        candidate.healthStatus,
        candidate.sourceHealthStatus,
      )
    );
    const derivedStatus = resolveInboundDerivedSourceHealthStatus({
      deviceAvailable,
      providerFailoverActive,
      policyRestricted,
    });
    if (
      explicitStatus === undefined &&
      derivedStatus === undefined &&
      typeof deviceAvailable !== "boolean" &&
      typeof providerFailoverActive !== "boolean" &&
      typeof policyRestricted !== "boolean"
    ) {
      continue;
    }
    return {
      status: explicitStatus ?? derivedStatus ?? "unknown",
      ...(typeof deviceAvailable === "boolean" ? { deviceAvailable } : {}),
      ...(typeof providerFailoverActive === "boolean"
        ? { providerFailoverActive }
        : {}),
      ...(typeof policyRestricted === "boolean" ? { policyRestricted } : {}),
    };
  }
  return undefined;
}

function collectInboundDeterministicFallbackReasons(
  metadata: Record<string, unknown>
): string[] {
  const fallbackReasons = new Set<string>();
  const cameraRuntime = normalizeInboundObjectValue(metadata.cameraRuntime);
  const voiceRuntime = normalizeInboundObjectValue(metadata.voiceRuntime);
  const liveRuntime = normalizeInboundObjectValue(metadata.liveRuntime);
  const geminiLive = normalizeInboundObjectValue(metadata.geminiLive);
  const transportRuntime = normalizeInboundObjectValue(metadata.transportRuntime);
  const avObservability = normalizeInboundObjectValue(metadata.avObservability);
  const transportObservability = normalizeInboundObjectValue(
    transportRuntime?.observability
  );

  appendInboundFallbackReason(fallbackReasons, metadata.fallbackReason);
  appendInboundFallbackReason(fallbackReasons, metadata.runtimeFallbackReason);
  appendInboundFallbackReason(fallbackReasons, cameraRuntime?.fallbackReason);
  appendInboundFallbackReason(fallbackReasons, cameraRuntime?.stopReason);
  appendInboundFallbackReason(fallbackReasons, voiceRuntime?.fallbackReason);
  appendInboundFallbackReason(fallbackReasons, voiceRuntime?.runtimeError);
  appendInboundFallbackReason(fallbackReasons, voiceRuntime?.transcriptionError);
  appendInboundFallbackReason(fallbackReasons, liveRuntime?.fallbackReason);
  appendInboundFallbackReason(fallbackReasons, geminiLive?.fallbackReason);
  appendInboundFallbackReason(fallbackReasons, transportRuntime?.fallbackReason);
  appendInboundFallbackReason(fallbackReasons, transportObservability?.fallbackReason);
  appendInboundFallbackReason(fallbackReasons, avObservability?.fallbackReason);
  appendInboundFallbackReasonList(
    fallbackReasons,
    avObservability?.fallbackTransitionReasons
  );
  appendInboundFallbackReasonList(
    fallbackReasons,
    transportObservability?.fallbackTransitionReasons
  );

  return Array.from(fallbackReasons).sort();
}

function resolveInboundNativeVisionObservabilityContract(args: {
  metadata: Record<string, unknown>;
}): InboundNativeVisionObservabilityContract {
  const cameraRuntime = normalizeInboundObjectValue(args.metadata.cameraRuntime);
  const voiceRuntime = normalizeInboundObjectValue(args.metadata.voiceRuntime);
  const liveRuntime = normalizeInboundObjectValue(args.metadata.liveRuntime);
  const geminiLive = normalizeInboundObjectValue(args.metadata.geminiLive);
  const transportRuntime = normalizeInboundObjectValue(args.metadata.transportRuntime);
  const avObservability = normalizeInboundObjectValue(args.metadata.avObservability);
  const transportObservability = normalizeInboundObjectValue(
    transportRuntime?.observability
  );
  const liveSessionId = firstInboundString(
    args.metadata.liveSessionId,
    args.metadata.geminiLiveSessionId,
    args.metadata.realtimeSessionId,
    avObservability?.liveSessionId,
    transportObservability?.liveSessionId,
    cameraRuntime?.liveSessionId,
    voiceRuntime?.liveSessionId,
  );
  const voiceSessionId = firstInboundString(
    avObservability?.voiceSessionId,
    transportObservability?.voiceSessionId,
    voiceRuntime?.voiceSessionId,
    args.metadata.voiceSessionId,
  );
  const sessionStartedAtMs = firstInboundTimestamp(
    avObservability?.sessionStartedAtMs,
    avObservability?.sessionStartAtMs,
    transportObservability?.sessionStartedAtMs,
    transportObservability?.sessionStartAtMs,
    cameraRuntime?.startedAt,
    voiceRuntime?.startedAt,
    args.metadata.sessionStartedAtMs,
    args.metadata.sessionStartAtMs,
  );
  const sessionStoppedAtMs = firstInboundTimestamp(
    avObservability?.sessionStoppedAtMs,
    avObservability?.sessionStopAtMs,
    transportObservability?.sessionStoppedAtMs,
    transportObservability?.sessionStopAtMs,
    cameraRuntime?.stoppedAt,
    voiceRuntime?.stoppedAt,
    args.metadata.sessionStoppedAtMs,
    args.metadata.sessionStopAtMs,
  );

  const visionLifecycleState =
    normalizeInboundLifecycleState(
      firstInboundString(
        cameraRuntime?.sessionState,
        cameraRuntime?.streamState,
        cameraRuntime?.lifecycleState,
      ),
      ["capturing", "stopped", "error", "idle"],
    ) as InboundVisionLifecycleState | undefined;
  const voiceLifecycleState =
    normalizeInboundLifecycleState(
      firstInboundString(
        voiceRuntime?.sessionState,
        voiceRuntime?.lifecycleState,
      ),
      ["capturing", "transcribed", "fallback", "closed"],
    ) as InboundVoiceLifecycleState | undefined;
  const sessionLifecycleState =
    normalizeInboundLifecycleState(
      firstInboundString(
        avObservability?.sessionLifecycleState,
        avObservability?.lifecycleState,
        transportObservability?.sessionLifecycleState,
        transportObservability?.lifecycleState,
        args.metadata.sessionLifecycleState,
      ),
      ["idle", "session_started", "running", "session_stopped"],
    ) as InboundSessionLifecycleState | undefined;

  let frameCadenceMs = firstInboundNumericValue(
    avObservability?.frameCadenceMs,
    transportObservability?.frameCadenceMs,
    cameraRuntime?.frameCadenceMs
  );
  let frameCadenceFps = firstInboundNumericValue(
    avObservability?.frameCadenceFps,
    transportObservability?.frameCadenceFps,
    cameraRuntime?.frameCadenceFps
  );
  const frameCaptureCount = firstInboundNumericValue(
    cameraRuntime?.frameCaptureCount,
    avObservability?.frameCaptureCount,
    transportObservability?.frameCaptureCount,
  );
  const startedAt = firstInboundNumericValue(
    cameraRuntime?.startedAt,
    sessionStartedAtMs
  );
  const lastFrameCapturedAt = firstInboundNumericValue(
    cameraRuntime?.lastFrameCapturedAt,
    avObservability?.lastFrameCapturedAt,
    transportObservability?.lastFrameCapturedAt
  );
  if (
    frameCadenceMs === undefined
    && frameCadenceFps === undefined
    && startedAt !== undefined
    && lastFrameCapturedAt !== undefined
    && frameCaptureCount !== undefined
    && frameCaptureCount > 1
    && lastFrameCapturedAt > startedAt
  ) {
    frameCadenceMs = Math.max(
      1,
      (lastFrameCapturedAt - startedAt) / (frameCaptureCount - 1)
    );
    frameCadenceFps = Number((1000 / frameCadenceMs).toFixed(2));
  }
  if (frameCadenceFps === undefined && frameCadenceMs !== undefined && frameCadenceMs > 0) {
    frameCadenceFps = Number((1000 / frameCadenceMs).toFixed(2));
  }
  if (frameCadenceMs === undefined && frameCadenceFps !== undefined && frameCadenceFps > 0) {
    frameCadenceMs = Number((1000 / frameCadenceFps).toFixed(2));
  }
  const primaryTransportDiagnostics = normalizeInboundObjectValue(
    transportRuntime?.diagnostics
  );
  const cameraTransportDiagnostics = normalizeInboundObjectValue(
    normalizeInboundObjectValue(cameraRuntime?.transportRuntime)?.diagnostics
  );
  const voiceTransportDiagnostics = normalizeInboundObjectValue(
    normalizeInboundObjectValue(voiceRuntime?.transportRuntime)?.diagnostics
  );
  const liveTransportDiagnostics = normalizeInboundObjectValue(
    normalizeInboundObjectValue(liveRuntime?.transportRuntime)?.diagnostics
  );
  const geminiTransportDiagnostics = normalizeInboundObjectValue(
    normalizeInboundObjectValue(geminiLive?.transportRuntime)?.diagnostics
  );
  const transportObservabilityDiagnostics = normalizeInboundObjectValue(
    transportObservability?.diagnostics
  );
  const jitterMsP95 = firstInboundNumericValue(
    avObservability?.jitterMsP95,
    transportObservability?.jitterMsP95,
    transportObservabilityDiagnostics?.jitterMsP95,
    primaryTransportDiagnostics?.jitterMsP95,
    cameraTransportDiagnostics?.jitterMsP95,
    voiceTransportDiagnostics?.jitterMsP95,
    liveTransportDiagnostics?.jitterMsP95,
    geminiTransportDiagnostics?.jitterMsP95,
  );
  const mouthToEarEstimateMs = firstInboundNumericValue(
    avObservability?.mouthToEarEstimateMs,
    transportObservability?.mouthToEarEstimateMs,
    voiceRuntime?.mouthToEarEstimateMs,
    voiceRuntime?.mouthToEarMs,
  );
  const fallbackTransitionCountRaw = firstInboundNumericValue(
    avObservability?.fallbackTransitionCount,
    transportObservability?.fallbackTransitionCount,
    transportObservabilityDiagnostics?.fallbackTransitionCount,
    primaryTransportDiagnostics?.fallbackTransitionCount,
    cameraTransportDiagnostics?.fallbackTransitionCount,
    voiceTransportDiagnostics?.fallbackTransitionCount,
    liveTransportDiagnostics?.fallbackTransitionCount,
    geminiTransportDiagnostics?.fallbackTransitionCount,
  );
  const fallbackTransitionCount =
    typeof fallbackTransitionCountRaw === "number"
      ? Math.max(0, Math.floor(fallbackTransitionCountRaw))
      : undefined;
  const sourceHealth = resolveInboundSourceHealthContract([
    normalizeInboundObjectValue(avObservability?.sourceHealth),
    normalizeInboundObjectValue(transportObservability?.sourceHealth),
    normalizeInboundObjectValue(transportRuntime?.sourceHealth),
    normalizeInboundObjectValue(transportRuntime?.healthState),
    transportRuntime,
    normalizeInboundObjectValue(cameraRuntime?.sourceHealth),
    normalizeInboundObjectValue(voiceRuntime?.sourceHealth),
  ]);

  const deterministicFallbackReasons = collectInboundDeterministicFallbackReasons(
    args.metadata
  );

  return {
    liveSessionId,
    voiceSessionId,
    sessionStartedAtMs,
    sessionStoppedAtMs,
    sessionLifecycleState:
      sessionLifecycleState
      ?? (sessionStoppedAtMs !== undefined
        ? "session_stopped"
        : sessionStartedAtMs !== undefined
          ? "session_started"
          : "unknown"),
    visionLifecycleState: visionLifecycleState ?? "unknown",
    voiceLifecycleState: voiceLifecycleState ?? "unknown",
    frameCadenceMs,
    frameCadenceFps,
    jitterMsP95,
    mouthToEarEstimateMs,
    fallbackTransitionCount,
    sourceHealth,
    deterministicFallbackReasons,
    sessionCorrelationId:
      liveSessionId && voiceSessionId
        ? `${liveSessionId}:${voiceSessionId}`
        : undefined,
  };
}

const NATIVE_VISION_EDGE_MUTATING_ACTION_HINTS = [
  "commit",
  "mutat",
  "write",
  "create",
  "update",
  "delete",
  "publish",
  "send",
  "book",
  "process",
  "execute",
  "trade",
  "live",
] as const;

const DIRECT_DEVICE_MUTATION_ROUTE_HINTS = [
  "device",
  "on_device",
  "openclaw",
  "visionclaw",
  "edge_device",
  "client_direct",
] as const;

function hasNativeVisionEdgeMutatingActionHint(actionToken?: string): boolean {
  if (!actionToken) {
    return false;
  }
  return NATIVE_VISION_EDGE_MUTATING_ACTION_HINTS.some((hint) =>
    actionToken.includes(hint)
  );
}

function isDirectDeviceMutationRoute(routeToken?: string): boolean {
  if (!routeToken) {
    return false;
  }
  return DIRECT_DEVICE_MUTATION_ROUTE_HINTS.some((hint) =>
    routeToken.includes(hint)
  );
}

function appendInboundNativeVisionEdgeIntentCandidates(
  candidates: unknown[],
  value: unknown,
) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      candidates.push(entry);
    }
    return;
  }
  if (value !== null && value !== undefined) {
    candidates.push(value);
  }
}

function collectInboundNativeVisionEdgeIntentCandidates(
  metadata: Record<string, unknown>
): unknown[] {
  const candidates: unknown[] = [];
  appendInboundNativeVisionEdgeIntentCandidates(candidates, metadata.toolIntents);
  appendInboundNativeVisionEdgeIntentCandidates(candidates, metadata.toolIntent);
  appendInboundNativeVisionEdgeIntentCandidates(candidates, metadata.nativeToolIntents);
  appendInboundNativeVisionEdgeIntentCandidates(candidates, metadata.nativeToolIntent);
  appendInboundNativeVisionEdgeIntentCandidates(candidates, metadata.liveToolIntents);
  appendInboundNativeVisionEdgeIntentCandidates(candidates, metadata.liveToolIntent);

  const runtimeRecords = [
    metadata.cameraRuntime,
    metadata.voiceRuntime,
    metadata.liveRuntime,
    metadata.geminiLive,
    metadata.visionRuntime,
  ];
  for (const runtimeValue of runtimeRecords) {
    if (!runtimeValue || typeof runtimeValue !== "object") {
      continue;
    }
    const runtimeRecord = runtimeValue as Record<string, unknown>;
    appendInboundNativeVisionEdgeIntentCandidates(candidates, runtimeRecord.toolIntents);
    appendInboundNativeVisionEdgeIntentCandidates(candidates, runtimeRecord.toolIntent);
    appendInboundNativeVisionEdgeIntentCandidates(candidates, runtimeRecord.intent);
    appendInboundNativeVisionEdgeIntentCandidates(candidates, runtimeRecord.intents);
  }

  return candidates;
}

function normalizeInboundNativeVisionEdgeIntent(args: {
  intent: unknown;
  index: number;
}): InboundNativeVisionEdgeIntent | null {
  if (!args.intent || typeof args.intent !== "object") {
    return null;
  }
  const intentRecord = args.intent as Record<string, unknown>;
  const intentId =
    firstInboundString(
      intentRecord.intentId,
      intentRecord.id,
      intentRecord.toolCallId,
      intentRecord.callId,
      intentRecord.eventId,
    ) ?? `edge_intent_${args.index + 1}`;
  const toolName = firstInboundString(
    intentRecord.toolName,
    intentRecord.tool,
    intentRecord.name,
    intentRecord.actionName,
  );
  const actionToken = firstInboundString(
    intentRecord.action,
    intentRecord.intentType,
    intentRecord.intent,
    intentRecord.operation,
    intentRecord.type,
  )?.toLowerCase();
  const requestedRoute = firstInboundString(
    intentRecord.routeTarget,
    intentRecord.route,
    intentRecord.executionTarget,
    intentRecord.executor,
    intentRecord.path,
  )?.toLowerCase();
  const executionMode = normalizeInboundNativeVisionEdgeExecutionMode(
    firstInboundString(
      intentRecord.executionMode,
      intentRecord.liveMode,
      intentRecord.mode,
      intentRecord.environment,
    )
  );
  const directDeviceMutationRequested =
    intentRecord.deviceMutation === true
    || intentRecord.executeOnDevice === true
    || isDirectDeviceMutationRoute(requestedRoute);
  const explicitMutatingSignal =
    intentRecord.mutating === true
    || intentRecord.requiresMutation === true
    || intentRecord.liveExecution === true;
  const mutatingIntent =
    explicitMutatingSignal
    || hasNativeVisionEdgeMutatingActionHint(actionToken)
    || executionMode === "live"
    || directDeviceMutationRequested;

  const actionable =
    Boolean(toolName)
    || Boolean(actionToken)
    || directDeviceMutationRequested;
  if (!actionable) {
    return null;
  }

  return {
    intentId,
    intentType: mutatingIntent ? "mutating" : "read_only",
    toolName,
    action: actionToken,
    executionMode,
    routeTarget: VC83_NATIVE_TOOL_REGISTRY_ROUTE,
    requestedRoute,
    directDeviceMutationRequested,
  };
}

export function resolveInboundNativeVisionEdgeBridgeContract(args: {
  ingressSurface: IngressEventSurface;
  channel: string;
  metadata: Record<string, unknown>;
  now?: number;
}): InboundNativeVisionEdgeBridgeContract {
  const liveSessionSignal = hasInboundLiveIngressSignal(args.metadata);
  const nativeCompanionIngressSignal = hasInboundNativeCompanionIngressSignal({
    channel: args.channel,
    metadata: args.metadata,
  });
  const now = typeof args.now === "number" ? args.now : Date.now();
  const sourceAttestation = resolveMobileSourceAttestationContract({
    metadata: args.metadata,
    nowMs: now,
  });
  const sourceAttestationBlocked =
    sourceAttestation.verificationRequired && !sourceAttestation.verified;
  let observability = resolveInboundNativeVisionObservabilityContract({
    metadata: args.metadata,
  });
  if (sourceAttestationBlocked) {
    const deterministicFallbackReasons = Array.from(
      new Set([
        ...observability.deterministicFallbackReasons,
        "source_attestation_unverified",
        ...sourceAttestation.reasonCodes,
      ])
    ).sort();
    observability = {
      ...observability,
      visionLifecycleState: "unknown",
      voiceLifecycleState: "unknown",
      frameCadenceMs: undefined,
      frameCadenceFps: undefined,
      sourceHealth: {
        status: "policy_restricted",
        deviceAvailable: false,
        providerFailoverActive: false,
        policyRestricted: true,
      },
      deterministicFallbackReasons,
    };
  }
  const normalizedIntents = collectInboundNativeVisionEdgeIntentCandidates(
    args.metadata
  )
    .map((intent, index) =>
      normalizeInboundNativeVisionEdgeIntent({ intent, index })
    )
    .filter((intent): intent is InboundNativeVisionEdgeIntent => Boolean(intent));
  const intents = normalizedIntents.slice(0, 16);
  const mutatingIntentCount = intents.filter(
    (intent) => intent.intentType === "mutating"
  ).length;
  const directDeviceMutationRequested = intents.some(
    (intent) => intent.directDeviceMutationRequested
  );
  const liveProviderToken = firstInboundString(
    (args.metadata.geminiLive as Record<string, unknown> | undefined)?.provider,
    args.metadata.liveProvider,
    args.metadata.realtimeProvider,
  )?.toLowerCase();
  const providerPattern = (
    liveSessionSignal
    || Boolean(liveProviderToken && liveProviderToken.includes("gemini"))
  )
    ? "gemini_live_reference"
    : intents.length > 0 || args.ingressSurface === "camera" || args.ingressSurface === "voice"
      ? "generic_edge_reference"
      : "not_applicable";

  return {
    contractVersion: NATIVE_VISION_EDGE_BRIDGE_CONTRACT_VERSION,
    ingressSurface: args.ingressSurface,
    liveSessionSignal,
    nativeCompanionIngressSignal,
    providerPattern,
    nativeAuthorityPrecedence: VC83_NATIVE_RUNTIME_AUTHORITY_PRECEDENCE,
    registryRoute: VC83_NATIVE_TOOL_REGISTRY_ROUTE,
    normalizedIntentCount: normalizedIntents.length,
    actionableIntentCount: intents.length,
    mutatingIntentCount,
    trustGateRequired:
      sourceAttestationBlocked || intents.length > 0 || nativeCompanionIngressSignal,
    approvalGatePolicy:
      sourceAttestationBlocked || mutatingIntentCount > 0 || nativeCompanionIngressSignal
        ? "required_for_mutating_intents"
        : "policy_driven",
    directDeviceMutationRequested,
    intents,
    sourceAttestation,
    observability,
  };
}

function resolveInboundIngressSurface(args: {
  channel: string;
  metadata: Record<string, unknown>;
}): IngressEventSurface {
  if (hasInboundVoiceIngressSignal(args.metadata)) {
    return "voice";
  }
  if (hasInboundCameraIngressSignal(args.metadata)) {
    return "camera";
  }
  if (args.channel === "desktop") {
    return "desktop";
  }
  return "chat";
}

function resolveInboundIngressEventId(args: {
  organizationId: string;
  channel: string;
  externalContactIdentifier: string;
  routeKey: string;
  metadata: Record<string, unknown>;
  ingressSurface: IngressEventSurface;
}): string {
  const explicitEventId = firstInboundString(
    args.metadata.ingressEventId,
    args.metadata.collaborationEventId,
    args.metadata.providerEventId,
    args.metadata.eventId,
    args.metadata.providerMessageId,
    args.metadata.messageId,
    args.metadata.deliveryId,
    args.metadata.webhookEventId,
  );
  if (explicitEventId) {
    return explicitEventId;
  }
  const seed = [
    args.organizationId,
    args.channel,
    args.externalContactIdentifier,
    args.routeKey,
    args.ingressSurface,
  ].join(":");
  return `ingress:${hashRuntimeSeed(seed)}`;
}

export function resolveInboundMutationAuthorityContract<
  IdLike extends string = string,
>(args: {
  organizationId: IdLike;
  channel: string;
  externalContactIdentifier: string;
  primaryAgentId: IdLike;
  authorityAgentId: IdLike;
  speakerAgentId: IdLike;
  nativeVisionEdge?: InboundNativeVisionEdgeBridgeContract;
}): InboundMutationAuthorityContract<IdLike> {
  const organizationId = normalizeInboundRouteString(args.organizationId) as IdLike | undefined;
  const operatorId = resolveDesktopUserIdFromExternalContactIdentifier({
    channel: args.channel,
    externalContactIdentifier: args.externalContactIdentifier,
  }) as IdLike | undefined;
  const primaryAgentId = normalizeInboundRouteString(args.primaryAgentId) as IdLike | undefined;
  const authorityAgentId = normalizeInboundRouteString(args.authorityAgentId) as IdLike | undefined;
  const speakerAgentId = normalizeInboundRouteString(args.speakerAgentId) as IdLike | undefined;

  const invariantViolations: string[] = [];
  if (!organizationId) {
    invariantViolations.push("missing_organization_context");
  }
  if (args.channel === "desktop" && !operatorId) {
    invariantViolations.push("desktop_requires_operator_context");
  }
  if (!primaryAgentId) {
    invariantViolations.push("missing_primary_agent");
  }
  if (!authorityAgentId) {
    invariantViolations.push("missing_authority_agent");
  }
  if (!speakerAgentId) {
    invariantViolations.push("missing_speaker_agent");
  }
  if (
    primaryAgentId
    && authorityAgentId
    && String(primaryAgentId) !== String(authorityAgentId)
  ) {
    invariantViolations.push("authority_agent_must_match_primary");
  }
  if (
    args.nativeVisionEdge
    && (
      args.nativeVisionEdge.actionableIntentCount > 0
      || args.nativeVisionEdge.nativeCompanionIngressSignal === true
    )
    && args.nativeVisionEdge.registryRoute !== VC83_NATIVE_TOOL_REGISTRY_ROUTE
  ) {
    invariantViolations.push("native_tool_registry_route_required");
  }
  if (
    args.nativeVisionEdge
    && (
      args.nativeVisionEdge.actionableIntentCount > 0
      || args.nativeVisionEdge.nativeCompanionIngressSignal === true
    )
    && args.nativeVisionEdge.nativeAuthorityPrecedence
      !== VC83_NATIVE_RUNTIME_AUTHORITY_PRECEDENCE
  ) {
    invariantViolations.push("native_runtime_authority_precedence_required");
  }
  if (
    args.nativeVisionEdge
    && (
      args.nativeVisionEdge.actionableIntentCount > 0
      || args.nativeVisionEdge.nativeCompanionIngressSignal === true
    )
    && args.nativeVisionEdge.trustGateRequired !== true
  ) {
    invariantViolations.push("native_edge_trust_gate_required");
  }
  if (
    args.nativeVisionEdge?.nativeCompanionIngressSignal === true
    && args.nativeVisionEdge.approvalGatePolicy !== "required_for_mutating_intents"
  ) {
    invariantViolations.push("native_companion_mutation_approval_required");
  }
  if (
    args.nativeVisionEdge?.sourceAttestation?.verificationRequired === true
    && args.nativeVisionEdge.sourceAttestation.verified !== true
  ) {
    invariantViolations.push("source_attestation_verification_failed");
  }
  if (
    Array.isArray(args.nativeVisionEdge?.sourceAttestation?.quarantinedSourceIds)
    && args.nativeVisionEdge.sourceAttestation.quarantinedSourceIds.length > 0
  ) {
    invariantViolations.push("source_metadata_quarantined");
  }
  if (args.nativeVisionEdge?.directDeviceMutationRequested) {
    invariantViolations.push("direct_device_mutation_path_not_allowed");
  }

  const scopeKey = [organizationId ?? "org:unknown", operatorId ?? "operator:anonymous"].join(":");
  return {
    organizationId: (organizationId ?? args.organizationId) as IdLike,
    operatorId,
    scopeKey,
    primaryAgentId: (primaryAgentId ?? args.primaryAgentId) as IdLike,
    authorityAgentId: (authorityAgentId ?? args.authorityAgentId) as IdLike,
    speakerAgentId: (speakerAgentId ?? args.speakerAgentId) as IdLike,
    mutatingToolExecutionAllowed: invariantViolations.length === 0,
    invariantViolations,
  };
}

export function assertInboundMutationAuthorityInvariant(
  contract: InboundMutationAuthorityContract
) {
  if (contract.mutatingToolExecutionAllowed) {
    return;
  }
  const violationSummary = contract.invariantViolations.join(", ");
  throw new Error(
    `Inbound mutation authority invariant violation: ${violationSummary || "unknown_violation"}.`
  );
}

export function resolveInboundIngressEnvelope<IdLike extends string = string>(args: {
  organizationId: IdLike;
  channel: string;
  externalContactIdentifier: string;
  metadata: Record<string, unknown>;
  routeIdentity?: InboundChannelRouteIdentity;
  authority: {
    primaryAgentId: IdLike;
    authorityAgentId: IdLike;
    speakerAgentId: IdLike;
  };
  now?: number;
}): InboundIngressEnvelope<IdLike> {
  const routeKey = deriveInboundRoutePartitionKey(args.routeIdentity);
  const now = typeof args.now === "number" ? args.now : Date.now();
  const ingressSurface = resolveInboundIngressSurface({
    channel: args.channel,
    metadata: args.metadata,
  });
  const nativeVisionEdge = resolveInboundNativeVisionEdgeBridgeContract({
    ingressSurface,
    channel: args.channel,
    metadata: args.metadata,
    now,
  });
  const authority = resolveInboundMutationAuthorityContract({
    organizationId: args.organizationId,
    channel: args.channel,
    externalContactIdentifier: args.externalContactIdentifier,
    primaryAgentId: args.authority.primaryAgentId,
    authorityAgentId: args.authority.authorityAgentId,
    speakerAgentId: args.authority.speakerAgentId,
    nativeVisionEdge,
  });

  return {
    contractVersion: INGRESS_ENVELOPE_CONTRACT_VERSION,
    ingressSurface,
    channel: args.channel,
    routeKey,
    externalContactIdentifier: args.externalContactIdentifier,
    ingressEventId: resolveInboundIngressEventId({
      organizationId: String(args.organizationId),
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      routeKey,
      metadata: args.metadata,
      ingressSurface,
    }),
    occurredAt: resolveInboundIngressOccurredAt(args.metadata, now),
    authority,
    nativeVisionEdge,
  };
}

function normalizeInboundRouteString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeInboundRouteProfileType(
  value: unknown
): "platform" | "organization" | undefined {
  return value === "platform" || value === "organization" ? value : undefined;
}

function firstInboundString(
  ...values: unknown[]
): string | undefined {
  for (const value of values) {
    const normalized = normalizeInboundRouteString(value);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

function hashRuntimeSeed(seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function clampRuntimeIdempotencyTtlMs(ttlMs?: unknown): number {
  const value = typeof ttlMs === "number" && Number.isFinite(ttlMs)
    ? ttlMs
    : DEFAULT_RUNTIME_IDEMPOTENCY_TTL_MS;
  return Math.min(
    MAX_RUNTIME_IDEMPOTENCY_TTL_MS,
    Math.max(MIN_RUNTIME_IDEMPOTENCY_TTL_MS, Math.floor(value))
  );
}

function resolveSessionCollaborationSnapshot(
  session: Record<string, unknown>
): SessionCollaborationSnapshot {
  const collaboration = session.collaboration;
  if (!collaboration || typeof collaboration !== "object") {
    return {};
  }
  const record = collaboration as Record<string, unknown>;
  const kernel = record.kernel as Record<string, unknown> | undefined;
  const authority = record.authority as Record<string, unknown> | undefined;
  return {
    threadType:
      kernel?.threadType === "group_thread" || kernel?.threadType === "dm_thread"
        ? kernel.threadType
        : undefined,
    threadId: normalizeInboundRouteString(kernel?.threadId),
    groupThreadId: normalizeInboundRouteString(kernel?.groupThreadId),
    dmThreadId: normalizeInboundRouteString(kernel?.dmThreadId),
    lineageId: normalizeInboundRouteString(kernel?.lineageId),
    authorityIntentType:
      authority?.intentType === "ingress"
      || authority?.intentType === "orchestration"
      || authority?.intentType === "proposal"
      || authority?.intentType === "commit"
      || authority?.intentType === "read_only"
        ? authority.intentType
        : undefined,
  };
}

function resolveInboundWorkflowKey(args: {
  metadata: Record<string, unknown>;
  collaboration?: SessionCollaborationSnapshot;
}): string {
  const workflowFromMetadata = firstInboundString(
    args.metadata.workflowKey,
    args.metadata.workflow,
    args.metadata.intentType,
    args.metadata.operation
  );
  if (workflowFromMetadata) {
    return workflowFromMetadata.toLowerCase();
  }
  const collaborationIntent = args.collaboration?.authorityIntentType;
  if (collaborationIntent === "proposal" || collaborationIntent === "commit") {
    return collaborationIntent;
  }
  return DEFAULT_WORKFLOW_KEY;
}

function resolveInboundIdempotencyIntentType(args: {
  metadata: Record<string, unknown>;
  workflowKey: string;
  collaboration?: SessionCollaborationSnapshot;
}): IdempotencyIntentType {
  const metadataIntent = firstInboundString(
    args.metadata.intentType,
    args.metadata.orchestrationIntent,
    args.metadata.workflowIntent,
  );
  if (metadataIntent === "proposal" || metadataIntent === "commit") {
    return metadataIntent;
  }
  if (metadataIntent === "orchestration") {
    return "orchestration";
  }
  if (args.collaboration?.authorityIntentType === "proposal") {
    return "proposal";
  }
  if (args.collaboration?.authorityIntentType === "commit") {
    return "commit";
  }
  if (args.workflowKey === "proposal" || args.workflowKey === "commit") {
    return args.workflowKey;
  }
  if (args.workflowKey === "orchestration") {
    return "orchestration";
  }
  return "ingress";
}

function buildInboundPayloadHash(args: {
  organizationId: Id<"organizations">;
  message: string;
  metadata: Record<string, unknown>;
  workflowKey: string;
  collaboration?: SessionCollaborationSnapshot;
}): string {
  const providerEventId = firstInboundString(
    args.metadata.providerEventId,
    args.metadata.eventId,
    args.metadata.providerMessageId
  );
  const normalizedMessage = args.message
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 240);
  const seed = [
    args.organizationId,
    args.workflowKey,
    args.collaboration?.lineageId ?? "",
    args.collaboration?.threadId ?? "",
    providerEventId ?? "",
    normalizedMessage,
  ].join(":");
  return hashRuntimeSeed(seed);
}

export function resolveInboundRuntimeContracts(args: {
  organizationId: Id<"organizations">;
  channel: string;
  message: string;
  metadata: Record<string, unknown>;
  routeIdentity?: InboundChannelRouteIdentity;
  collaboration?: SessionCollaborationSnapshot;
}): InboundRuntimeContracts {
  const now = Date.now();
  const routeKey = deriveInboundRoutePartitionKey(args.routeIdentity);
  const workflowKey = resolveInboundWorkflowKey({
    metadata: args.metadata,
    collaboration: args.collaboration,
  });
  const idempotencyIntentType = resolveInboundIdempotencyIntentType({
    metadata: args.metadata,
    workflowKey,
    collaboration: args.collaboration,
  });
  const conflictLabel: TurnQueueConflictLabel =
    idempotencyIntentType === "commit"
      ? "conflict_commit_in_progress"
      : "conflict_turn_in_progress";
  const tenantId = String(args.organizationId);
  const lineageId = args.collaboration?.lineageId;
  const threadId = args.collaboration?.threadId;
  const queueConcurrencyKey = lineageId && threadId
    ? [tenantId, lineageId, threadId, workflowKey].join(":")
    : [tenantId, routeKey, workflowKey].join(":");
  const queueOrderingKey = `${queueConcurrencyKey}:fifo`;
  const payloadHash = firstInboundString(args.metadata.payloadHash)
    ?? buildInboundPayloadHash({
      organizationId: args.organizationId,
      message: args.message,
      metadata: args.metadata,
      workflowKey,
      collaboration: args.collaboration,
    });
  const ttlMs = clampRuntimeIdempotencyTtlMs(args.metadata.idempotencyTtlMs);
  const idempotencyScopeKey = lineageId && threadId
    ? [tenantId, lineageId, threadId, idempotencyIntentType].join(":")
    : [tenantId, routeKey, workflowKey].join(":");

  const queueContract: TurnQueueContract = {
    contractVersion: TURN_QUEUE_CONTRACT_VERSION,
    tenantId,
    routeKey,
    workflowKey,
    lineageId,
    threadId,
    concurrencyKey: queueConcurrencyKey,
    orderingKey: queueOrderingKey,
    conflictLabel,
  };
  const idempotencyContract: RuntimeIdempotencyContract = {
    contractVersion: IDEMPOTENCY_CONTRACT_VERSION,
    scopeKind: lineageId && threadId ? "collaboration" : "route_workflow",
    scopeKey: idempotencyScopeKey,
    intentType: idempotencyIntentType,
    payloadHash,
    ttlMs,
    issuedAt: now,
    expiresAt: now + ttlMs,
    replayOutcome:
      idempotencyIntentType === "proposal" || idempotencyIntentType === "commit"
        ? "replay_previous_result"
        : "duplicate_acknowledged",
  };

  assertTurnQueueContract(queueContract);
  assertRuntimeIdempotencyContract(idempotencyContract);

  return {
    queueContract,
    idempotencyContract,
  };
}

function buildInitialRunAttemptContract(): AgentTurnRunAttemptContract {
  return {
    contractVersion: RUN_ATTEMPT_CONTRACT_VERSION,
    attempts: 0,
    maxAttempts: LLM_RETRY_POLICY.maxAttempts,
    delayReason: "none",
    delayMs: 0,
    terminalOutcome: "failed",
    updatedAt: Date.now(),
  };
}

function buildRunAttemptContract(args: {
  attempts: number;
  maxAttempts: number;
  delayReason: "none" | "retry_backoff" | "provider_failover" | "auth_profile_rotation";
  delayMs: number;
  terminalOutcome: "success" | "failed" | "blocked_sync_checkpoint";
}): AgentTurnRunAttemptContract {
  return {
    contractVersion: RUN_ATTEMPT_CONTRACT_VERSION,
    attempts: Math.max(0, Math.floor(args.attempts)),
    maxAttempts: Math.max(1, Math.floor(args.maxAttempts)),
    delayReason: args.delayReason,
    delayMs: Math.max(0, Math.floor(args.delayMs)),
    terminalOutcome: args.terminalOutcome,
    updatedAt: Date.now(),
  };
}

function buildExecutionBundleContract(args: {
  modelId: string;
  providerId: string;
  authProfileId?: string | null;
  systemPrompt: string;
  toolSchemas: Array<{ function: { name: string } }>;
}): AgentExecutionBundleContract {
  const toolCatalogSeed = args.toolSchemas
    .map((schema) => schema.function.name)
    .sort((a, b) => a.localeCompare(b))
    .join(",");
  const executionBundle: AgentExecutionBundleContract = {
    contractVersion: EXECUTION_BUNDLE_CONTRACT_VERSION,
    modelId: args.modelId,
    providerId: args.providerId,
    authProfileId: args.authProfileId ?? undefined,
    systemPromptHash: hashRuntimeSeed(args.systemPrompt.trim()),
    toolCatalogHash: hashRuntimeSeed(toolCatalogSeed || "no_tools"),
    runtimePolicyVersion: DEFAULT_RUNTIME_POLICY_VERSION,
    pinnedAt: Date.now(),
  };
  assertAgentExecutionBundleContract(executionBundle);
  return executionBundle;
}

function clampHitlWaitpointTtlMs(ttlMs?: number): number {
  const resolved = typeof ttlMs === "number" ? ttlMs : DEFAULT_HITL_WAITPOINT_TTL_MS;
  return Math.min(MAX_HITL_WAITPOINT_TTL_MS, Math.max(MIN_HITL_WAITPOINT_TTL_MS, resolved));
}

function hashHitlWaitpointSeed(seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function isHitlWaitpointCheckpoint(value: unknown): value is HitlWaitpointCheckpoint {
  return value === "session_pending" || value === "session_taken_over";
}

function isHitlWaitpointStatus(value: unknown): value is HitlWaitpointStatus {
  return value === "issued"
    || value === "resumed"
    || value === "aborted"
    || value === "expired";
}

function buildHitlWaitpointToken(payload: HitlWaitpointTokenPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const checksum = hashHitlWaitpointSeed(encodedPayload);
  return `hitl_wp.${encodedPayload}.${checksum}`;
}

export function parseHitlWaitpointToken(token: string): HitlWaitpointTokenPayload | null {
  const [prefix, encodedPayload, checksum, trailing] = token.split(".");
  if (prefix !== "hitl_wp" || !encodedPayload || !checksum || trailing) {
    return null;
  }
  if (hashHitlWaitpointSeed(encodedPayload) !== checksum) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const payload = parsed as Record<string, unknown>;
  if (payload.contractVersion !== HITL_WAITPOINT_CONTRACT_VERSION) {
    return null;
  }
  if (
    typeof payload.tokenId !== "string"
    || typeof payload.sessionId !== "string"
    || typeof payload.issuedForTurnId !== "string"
    || !isHitlWaitpointCheckpoint(payload.checkpoint)
    || typeof payload.issuedAt !== "number"
    || !Number.isFinite(payload.issuedAt)
    || typeof payload.expiresAt !== "number"
    || !Number.isFinite(payload.expiresAt)
  ) {
    return null;
  }

  return {
    contractVersion: HITL_WAITPOINT_CONTRACT_VERSION,
    tokenId: payload.tokenId,
    sessionId: payload.sessionId,
    issuedForTurnId: payload.issuedForTurnId,
    checkpoint: payload.checkpoint,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  };
}

export function issueHitlWaitpointContract(args: {
  sessionId: Id<"agentSessions">;
  turnId: Id<"agentTurns">;
  checkpoint: HitlWaitpointCheckpoint;
  now: number;
  ttlMs?: number;
}): HitlWaitpointContract {
  const issuedAt = args.now;
  const expiresAt = issuedAt + clampHitlWaitpointTtlMs(args.ttlMs);
  const tokenId = `wp:${args.sessionId}:${args.turnId}:${issuedAt}`;
  const tokenPayload: HitlWaitpointTokenPayload = {
    contractVersion: HITL_WAITPOINT_CONTRACT_VERSION,
    tokenId,
    sessionId: String(args.sessionId),
    issuedForTurnId: String(args.turnId),
    checkpoint: args.checkpoint,
    issuedAt,
    expiresAt,
  };
  const token = buildHitlWaitpointToken(tokenPayload);
  return {
    contractVersion: HITL_WAITPOINT_CONTRACT_VERSION,
    tokenId,
    token,
    checkpoint: args.checkpoint,
    status: "issued",
    issuedAt,
    expiresAt,
    issuedForTurnId: args.turnId,
  };
}

export function normalizeHitlWaitpointContract(value: unknown): HitlWaitpointContract | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.contractVersion !== HITL_WAITPOINT_CONTRACT_VERSION) {
    return null;
  }
  if (
    typeof record.tokenId !== "string"
    || typeof record.token !== "string"
    || !isHitlWaitpointCheckpoint(record.checkpoint)
    || !isHitlWaitpointStatus(record.status)
    || typeof record.issuedAt !== "number"
    || !Number.isFinite(record.issuedAt)
    || typeof record.expiresAt !== "number"
    || !Number.isFinite(record.expiresAt)
    || typeof record.issuedForTurnId !== "string"
  ) {
    return null;
  }

  const normalized: HitlWaitpointContract = {
    contractVersion: HITL_WAITPOINT_CONTRACT_VERSION,
    tokenId: record.tokenId,
    token: record.token,
    checkpoint: record.checkpoint,
    status: record.status,
    issuedAt: record.issuedAt,
    expiresAt: record.expiresAt,
    issuedForTurnId: record.issuedForTurnId as Id<"agentTurns">,
  };
  if (typeof record.resumeTurnId === "string") {
    normalized.resumeTurnId = record.resumeTurnId as Id<"agentTurns">;
  }
  if (typeof record.resumedAt === "number" && Number.isFinite(record.resumedAt)) {
    normalized.resumedAt = record.resumedAt;
  }
  if (typeof record.abortedAt === "number" && Number.isFinite(record.abortedAt)) {
    normalized.abortedAt = record.abortedAt;
  }
  if (typeof record.abortReason === "string") {
    normalized.abortReason = record.abortReason;
  }
  if (typeof record.lastValidatedAt === "number" && Number.isFinite(record.lastValidatedAt)) {
    normalized.lastValidatedAt = record.lastValidatedAt;
  }
  return normalized;
}

export function resolveHitlWaitpointTokenValidationError(args: {
  contract: HitlWaitpointContract;
  providedToken: string;
  sessionId: Id<"agentSessions">;
  now: number;
}): string | null {
  if (args.now >= args.contract.expiresAt) {
    return "waitpoint_token_expired";
  }
  if (args.providedToken !== args.contract.token) {
    return "waitpoint_token_mismatch";
  }
  const parsed = parseHitlWaitpointToken(args.providedToken);
  if (!parsed) {
    return "waitpoint_token_invalid";
  }
  if (
    parsed.contractVersion !== HITL_WAITPOINT_CONTRACT_VERSION
    || parsed.tokenId !== args.contract.tokenId
    || parsed.sessionId !== String(args.sessionId)
    || parsed.issuedForTurnId !== String(args.contract.issuedForTurnId)
    || parsed.checkpoint !== args.contract.checkpoint
    || parsed.issuedAt !== args.contract.issuedAt
    || parsed.expiresAt !== args.contract.expiresAt
  ) {
    return "waitpoint_token_mismatch";
  }
  return null;
}

export function toPublicHitlWaitpointState(
  waitpoint: HitlWaitpointContract | null | undefined
): HitlWaitpointPublicState | undefined {
  if (!waitpoint) {
    return undefined;
  }
  return {
    tokenId: waitpoint.tokenId,
    token: waitpoint.token,
    checkpoint: waitpoint.checkpoint,
    status: waitpoint.status,
    issuedAt: waitpoint.issuedAt,
    expiresAt: waitpoint.expiresAt,
  };
}

export function resolveInboundHitlWaitpointToken(
  metadata: Record<string, unknown>
): string | undefined {
  const directToken = firstInboundString(metadata.hitlWaitpointToken, metadata.waitpointToken);
  if (directToken) {
    return directToken;
  }
  const nested = metadata.hitlWaitpoint;
  if (!nested || typeof nested !== "object") {
    return undefined;
  }
  return firstInboundString((nested as Record<string, unknown>).token);
}

export function resolveHitlWaitpointFailureMessage(error?: string): string {
  switch (error) {
    case "waitpoint_token_required":
      return "A HITL waitpoint token is required to resume this escalation checkpoint.";
    case "waitpoint_token_expired":
      return "The HITL waitpoint token has expired. Resume is blocked until a new token is issued.";
    case "waitpoint_token_mismatch":
      return "The provided HITL waitpoint token does not match the active checkpoint.";
    case "waitpoint_token_invalid":
      return "The HITL waitpoint token is malformed or failed checksum validation.";
    case "waitpoint_aborted":
      return "The HITL waitpoint token has been aborted and cannot be resumed.";
    case "waitpoint_expired":
      return "The active HITL waitpoint has already expired.";
    case "escalation_status_mismatch":
      return "Escalation status changed while validating HITL waitpoint token. Retry required.";
    case "waitpoint_blocked":
    default:
      return "This conversation is waiting at a HITL checkpoint and cannot resume yet.";
  }
}

function clampCollaborationSyncCheckpointTtlMs(ttlMs?: number): number {
  const resolved =
    typeof ttlMs === "number" ? ttlMs : DEFAULT_COLLAB_SYNC_CHECKPOINT_TTL_MS;
  return Math.min(
    MAX_COLLAB_SYNC_CHECKPOINT_TTL_MS,
    Math.max(MIN_COLLAB_SYNC_CHECKPOINT_TTL_MS, resolved)
  );
}

function buildCollaborationSyncCheckpointToken(
  payload: CollaborationSyncCheckpointTokenPayload
): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const checksum = hashHitlWaitpointSeed(encodedPayload);
  return `sync_wp.${encodedPayload}.${checksum}`;
}

export function parseCollaborationSyncCheckpointToken(
  token: string
): CollaborationSyncCheckpointTokenPayload | null {
  const [prefix, encodedPayload, checksum, trailing] = token.split(".");
  if (prefix !== "sync_wp" || !encodedPayload || !checksum || trailing) {
    return null;
  }
  if (hashHitlWaitpointSeed(encodedPayload) !== checksum) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const payload = parsed as Record<string, unknown>;
  if (payload.contractVersion !== COLLAB_SYNC_CHECKPOINT_CONTRACT_VERSION) {
    return null;
  }
  if (
    typeof payload.tokenId !== "string"
    || typeof payload.lineageId !== "string"
    || typeof payload.dmThreadId !== "string"
    || typeof payload.groupThreadId !== "string"
    || typeof payload.issuedForEventId !== "string"
    || typeof payload.issuedAt !== "number"
    || !Number.isFinite(payload.issuedAt)
    || typeof payload.expiresAt !== "number"
    || !Number.isFinite(payload.expiresAt)
  ) {
    return null;
  }

  return {
    contractVersion: COLLAB_SYNC_CHECKPOINT_CONTRACT_VERSION,
    tokenId: payload.tokenId,
    lineageId: payload.lineageId,
    dmThreadId: payload.dmThreadId,
    groupThreadId: payload.groupThreadId,
    issuedForEventId: payload.issuedForEventId,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  };
}

export function issueCollaborationSyncCheckpointContract(args: {
  lineageId: string;
  dmThreadId: string;
  groupThreadId: string;
  issuedForEventId: string;
  now: number;
  ttlMs?: number;
}): CollaborationSyncCheckpointContract {
  const issuedAt = args.now;
  const expiresAt = issuedAt + clampCollaborationSyncCheckpointTtlMs(args.ttlMs);
  const tokenId = `sync:${args.lineageId}:${args.groupThreadId}:${issuedAt}`;
  const payload: CollaborationSyncCheckpointTokenPayload = {
    contractVersion: COLLAB_SYNC_CHECKPOINT_CONTRACT_VERSION,
    tokenId,
    lineageId: args.lineageId,
    dmThreadId: args.dmThreadId,
    groupThreadId: args.groupThreadId,
    issuedForEventId: args.issuedForEventId,
    issuedAt,
    expiresAt,
  };
  return {
    ...payload,
    token: buildCollaborationSyncCheckpointToken(payload),
    status: "issued",
  };
}

function isCollaborationSyncCheckpointStatus(
  value: unknown
): value is CollaborationSyncCheckpointStatus {
  return value === "issued"
    || value === "resumed"
    || value === "aborted"
    || value === "expired";
}

export function normalizeCollaborationSyncCheckpointContract(
  value: unknown
): CollaborationSyncCheckpointContract | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.contractVersion !== COLLAB_SYNC_CHECKPOINT_CONTRACT_VERSION) {
    return null;
  }
  if (
    typeof record.tokenId !== "string"
    || typeof record.token !== "string"
    || !isCollaborationSyncCheckpointStatus(record.status)
    || typeof record.lineageId !== "string"
    || typeof record.dmThreadId !== "string"
    || typeof record.groupThreadId !== "string"
    || typeof record.issuedForEventId !== "string"
    || typeof record.issuedAt !== "number"
    || !Number.isFinite(record.issuedAt)
    || typeof record.expiresAt !== "number"
    || !Number.isFinite(record.expiresAt)
  ) {
    return null;
  }
  const normalized: CollaborationSyncCheckpointContract = {
    contractVersion: COLLAB_SYNC_CHECKPOINT_CONTRACT_VERSION,
    tokenId: record.tokenId,
    token: record.token,
    status: record.status,
    lineageId: record.lineageId,
    dmThreadId: record.dmThreadId,
    groupThreadId: record.groupThreadId,
    issuedForEventId: record.issuedForEventId,
    issuedAt: record.issuedAt,
    expiresAt: record.expiresAt,
  };
  if (typeof record.resumeTurnId === "string") {
    normalized.resumeTurnId = record.resumeTurnId as Id<"agentTurns">;
  }
  if (typeof record.resumedAt === "number" && Number.isFinite(record.resumedAt)) {
    normalized.resumedAt = record.resumedAt;
  }
  if (typeof record.abortedAt === "number" && Number.isFinite(record.abortedAt)) {
    normalized.abortedAt = record.abortedAt;
  }
  if (typeof record.abortReason === "string") {
    normalized.abortReason = record.abortReason;
  }
  if (typeof record.lastValidatedAt === "number" && Number.isFinite(record.lastValidatedAt)) {
    normalized.lastValidatedAt = record.lastValidatedAt;
  }
  return normalized;
}

export function resolveCollaborationSyncCheckpointTokenValidationError(args: {
  contract: CollaborationSyncCheckpointContract;
  providedToken: string;
  lineageId: string;
  dmThreadId: string;
  groupThreadId: string;
  issuedForEventId: string;
  now: number;
}): string | null {
  if (args.now >= args.contract.expiresAt) {
    return "waitpoint_token_expired";
  }
  if (args.providedToken !== args.contract.token) {
    return "waitpoint_token_mismatch";
  }
  const parsed = parseCollaborationSyncCheckpointToken(args.providedToken);
  if (!parsed) {
    return "waitpoint_token_invalid";
  }
  if (
    parsed.contractVersion !== COLLAB_SYNC_CHECKPOINT_CONTRACT_VERSION
    || parsed.tokenId !== args.contract.tokenId
    || parsed.lineageId !== args.lineageId
    || parsed.dmThreadId !== args.dmThreadId
    || parsed.groupThreadId !== args.groupThreadId
    || parsed.issuedForEventId !== args.issuedForEventId
    || parsed.issuedAt !== args.contract.issuedAt
    || parsed.expiresAt !== args.contract.expiresAt
  ) {
    return "waitpoint_token_mismatch";
  }
  return null;
}

export function resolveInboundCollaborationSyncCheckpointToken(
  metadata: Record<string, unknown>
): string | undefined {
  const direct = firstInboundString(
    metadata.collaborationSyncToken,
    metadata.syncCheckpointToken
  );
  if (direct) {
    return direct;
  }
  const nested = metadata.collaborationSyncCheckpoint;
  if (!nested || typeof nested !== "object") {
    return undefined;
  }
  return firstInboundString((nested as Record<string, unknown>).token);
}

export function resolveCollaborationSyncCheckpointFailureMessage(error?: string): string {
  switch (error) {
    case "sync_checkpoint_waiting":
      return "A DM-to-group sync checkpoint is pending. Commit remains blocked until resume.";
    case "sync_checkpoint_contract_invalid":
      return "The collaboration sync checkpoint contract is invalid for this commit intent.";
    case "waitpoint_token_required":
      return "A sync checkpoint token is required before this commit can continue.";
    case "waitpoint_token_expired":
      return "The sync checkpoint token has expired and must be re-issued.";
    case "waitpoint_token_mismatch":
      return "The sync checkpoint token does not match the active lineage checkpoint.";
    case "waitpoint_token_invalid":
      return "The sync checkpoint token is malformed or failed checksum validation.";
    case "waitpoint_aborted":
      return "The active sync checkpoint token was aborted and cannot be resumed.";
    case "waitpoint_expired":
      return "The active sync checkpoint has already expired.";
    case "collaboration_contract_missing":
      return "Collaboration runtime metadata is missing, so commit execution is blocked.";
    default:
      return "Commit execution is blocked by the collaboration sync checkpoint gate.";
  }
}

const COMPOSER_CONTROL_BLOCK_PATTERN = /\[COMPOSER CONTROLS\][\s\S]*?\[\/COMPOSER CONTROLS\]\s*/i;
const COMPOSER_REFERENCE_BLOCK_PATTERN = /--- URL REFERENCES ---[\s\S]*?--- END URL REFERENCES ---\s*/i;
const COMPOSER_IMAGE_BLOCK_PATTERN = /--- IMAGE ATTACHMENTS ---[\s\S]*?--- END IMAGE ATTACHMENTS ---\s*/i;
const COMPOSER_USER_MESSAGE_PREFIX_PATTERN = /^USER MESSAGE:\s*/i;
const COMPOSER_REFERENCE_LIMIT = 6;
const COMPOSER_REFERENCE_CONTENT_LIMIT = 4000;
const COMPOSER_REFERENCE_TOTAL_CONTENT_LIMIT = 14000;
const COMPOSER_REFERENCE_SUMMARY_CHAR_LIMIT = 900;
const COMPOSER_REFERENCE_SUMMARY_SENTENCE_LIMIT = 4;
const COMPOSER_REFERENCE_SUMMARY_TOP_RANKED_LIMIT = 3;
const COMPOSER_REFERENCE_QUERY_TOKEN_LIMIT = 24;
const COMPOSER_FEASIBILITY_LIST_LIMIT = 14;
const COMPOSER_IMAGE_ATTACHMENT_LIMIT = 8;
const COMPOSER_IMAGE_ATTACHMENT_TOTAL_BYTES_LIMIT = 40 * 1024 * 1024;
const COMPOSER_PLAN_SOFT_READINESS_MARKER = "--- PLAN SOFT READINESS SCORES ---";
const COMPOSER_PLAN_SOFT_STEP_PATTERN = /^\s*(\d+)[.)]\s+(.+)\s*$/;
const COMPOSER_PLAN_SOFT_BULLET_PATTERN = /^\s*(?:[-*•]|[a-zA-Z][.)])\s+(.+)\s*$/;
const COMPOSER_PLAN_SOFT_ANALYSIS_HINT_PATTERN =
  /\b(review|analy[sz]e|assess|investigate|document|outline|plan|design|summarize|audit)\b/i;
const COMPOSER_PLAN_SOFT_ACTION_HINT_PATTERN =
  /\b(create|update|delete|publish|deploy|run|execute|send|sync|configure|connect|install|migrate|query|build|generate|book|launch)\b/i;
const MEETING_CONCIERGE_CONFIRM_PATTERN =
  /\b(confirm|book it|book this|go ahead|proceed|schedule it|yes[,]?\s+book|execute now)\b/i;
const MEETING_CONCIERGE_NEGATION_PATTERN =
  /\b(don't|do not|not yet|cancel|stop|hold off)\b/i;
const MEETING_CONCIERGE_PREVIEW_PATTERN =
  /\b(preview|draft|show me|propose|plan first|before booking)\b/i;
const MEETING_CONCIERGE_EMAIL_PATTERN =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const MEETING_CONCIERGE_PHONE_PATTERN =
  /(?:\+?\d{1,2}[\s-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}/;
const COMPOSER_REFERENCE_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "their",
  "this",
  "to",
  "we",
  "with",
  "you",
  "your",
]);

interface MeetingConciergeExtractedPayload {
  personName?: string;
  personEmail?: string;
  personPhone?: string;
  company?: string;
  meetingTitle?: string;
  meetingDurationMinutes: number;
  schedulingWindowStart: string;
  schedulingWindowEnd: string;
  confirmationChannel: "auto" | "sms" | "email" | "none";
  confirmationRecipient?: string;
  conciergeIdempotencyKey: string;
}

export interface InboundMeetingConciergeIntent {
  enabled: boolean;
  extractedPayloadReady: boolean;
  autoTriggerPreview: boolean;
  explicitConfirmDetected: boolean;
  previewIntentDetected: boolean;
  missingRequiredFields: string[];
  fallbackReasons: string[];
  ingestLatencyMs?: number;
  sourceAttestation: MobileSourceAttestationContract;
  commandPolicy: MobileNodeCommandPolicyDecision;
  payload?: MeetingConciergeExtractedPayload;
}

function normalizeConciergeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeConciergeNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function collectMeetingConciergeTextCandidates(args: {
  metadata: Record<string, unknown>;
  message: string;
}): string[] {
  const segments = new Set<string>();
  const push = (value: unknown) => {
    const normalized = normalizeConciergeOptionalString(value);
    if (normalized) {
      segments.add(normalized);
    }
  };

  const voiceRuntime = normalizeInboundObjectValue(args.metadata.voiceRuntime);
  const cameraRuntime = normalizeInboundObjectValue(args.metadata.cameraRuntime);
  const concierge = normalizeInboundObjectValue(args.metadata.concierge);

  push(args.message);
  push(concierge?.notes);
  push(concierge?.meetingTitle);
  push(concierge?.personName);
  push(concierge?.company);
  push(voiceRuntime?.transcript);
  push(voiceRuntime?.text);
  push(voiceRuntime?.finalTranscript);
  push(voiceRuntime?.latestTranscript);
  push(cameraRuntime?.detectedText);
  push(cameraRuntime?.ocrText);
  push(cameraRuntime?.sceneSummary);

  const attachments = Array.isArray(args.metadata.attachments)
    ? args.metadata.attachments
    : [];
  for (const attachment of attachments.slice(0, 8)) {
    if (!attachment || typeof attachment !== "object") {
      continue;
    }
    const record = attachment as Record<string, unknown>;
    push(record.name);
    push(record.description);
    push(record.caption);
  }

  return Array.from(segments);
}

function resolveMeetingConciergeWindow(args: {
  metadata: Record<string, unknown>;
  now: number;
}): {
  schedulingWindowStart: string;
  schedulingWindowEnd: string;
  fallbackApplied: boolean;
} {
  const concierge = normalizeInboundObjectValue(args.metadata.concierge);
  const voiceRuntime = normalizeInboundObjectValue(args.metadata.voiceRuntime);
  const cameraRuntime = normalizeInboundObjectValue(args.metadata.cameraRuntime);

  const explicitStart = firstInboundString(
    concierge?.schedulingWindowStart,
    voiceRuntime?.schedulingWindowStart,
    cameraRuntime?.schedulingWindowStart,
    args.metadata.schedulingWindowStart
  );
  const explicitEnd = firstInboundString(
    concierge?.schedulingWindowEnd,
    voiceRuntime?.schedulingWindowEnd,
    cameraRuntime?.schedulingWindowEnd,
    args.metadata.schedulingWindowEnd
  );

  if (explicitStart && explicitEnd) {
    return {
      schedulingWindowStart: explicitStart,
      schedulingWindowEnd: explicitEnd,
      fallbackApplied: false,
    };
  }

  const windowStart = args.now + 30 * 60 * 1000;
  const windowEnd = args.now + 7 * 24 * 60 * 60 * 1000;
  return {
    schedulingWindowStart: new Date(windowStart).toISOString(),
    schedulingWindowEnd: new Date(windowEnd).toISOString(),
    fallbackApplied: true,
  };
}

function extractMeetingConciergeDurationMinutes(args: {
  metadata: Record<string, unknown>;
  textCandidates: string[];
}): number {
  const concierge = normalizeInboundObjectValue(args.metadata.concierge);
  const explicitDuration = normalizeConciergeNumber(concierge?.meetingDurationMinutes);
  if (typeof explicitDuration === "number" && explicitDuration > 0) {
    return Math.max(15, Math.min(180, Math.round(explicitDuration)));
  }
  for (const candidate of args.textCandidates) {
    const match = candidate.match(/(\d{1,3})\s*(minutes?|mins?|hours?|hrs?)/i);
    if (!match) {
      continue;
    }
    const quantity = Number.parseInt(match[1], 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }
    const unit = match[2].toLowerCase();
    const minutes = unit.startsWith("hour") || unit.startsWith("hr")
      ? quantity * 60
      : quantity;
    return Math.max(15, Math.min(180, minutes));
  }
  return 30;
}

function resolveMeetingConciergeIngestLatencyMs(args: {
  metadata: Record<string, unknown>;
  now: number;
}): number | undefined {
  const voiceRuntime = normalizeInboundObjectValue(args.metadata.voiceRuntime);
  const cameraRuntime = normalizeInboundObjectValue(args.metadata.cameraRuntime);
  const observedAt = firstInboundTimestamp(
    args.metadata.timestamp,
    args.metadata.receivedAt,
    args.metadata.providerTimestamp,
    voiceRuntime?.capturedAt,
    voiceRuntime?.stoppedAt,
    cameraRuntime?.lastFrameCapturedAt,
    cameraRuntime?.capturedAt
  );
  if (typeof observedAt !== "number" || observedAt > args.now) {
    return undefined;
  }
  return Math.max(0, args.now - observedAt);
}

export function resolveInboundMeetingConciergeIntent(args: {
  organizationId: Id<"organizations">;
  channel: string;
  metadata: Record<string, unknown>;
  message: string;
  now?: number;
}): InboundMeetingConciergeIntent {
  const now = typeof args.now === "number" ? args.now : Date.now();
  const sourceAttestation = resolveMobileSourceAttestationContract({
    metadata: args.metadata,
    nowMs: now,
  });
  const liveSignal = Boolean(
    firstInboundString(args.metadata.liveSessionId)
    || normalizeInboundObjectValue(args.metadata.cameraRuntime)
    || normalizeInboundObjectValue(args.metadata.voiceRuntime)
  );
  const enabled = args.channel === "desktop" && liveSignal;
  const messageLower = args.message.toLowerCase();
  const explicitConfirmDetected =
    MEETING_CONCIERGE_CONFIRM_PATTERN.test(messageLower)
    && !MEETING_CONCIERGE_NEGATION_PATTERN.test(messageLower);
  const previewIntentDetected =
    MEETING_CONCIERGE_PREVIEW_PATTERN.test(messageLower) || !explicitConfirmDetected;
  const commandPolicy = resolveMobileNodeCommandPolicyDecision({
    metadata: args.metadata,
    requiredCommands: [
      "assemble_concierge_payload",
      "preview_meeting_concierge",
      ...(explicitConfirmDetected ? ["execute_meeting_concierge"] : []),
    ],
    enforceForLiveIngress: enabled,
  });
  const cameraRuntimeRaw = normalizeInboundObjectValue(args.metadata.cameraRuntime);
  const voiceRuntimeRaw = normalizeInboundObjectValue(args.metadata.voiceRuntime);
  const avObservabilityRaw = normalizeInboundObjectValue(args.metadata.avObservability);
  const sourceModeToken = firstInboundString(
    args.metadata.sourceMode,
    avObservabilityRaw?.sourceMode,
    cameraRuntimeRaw?.sourceMode,
    voiceRuntimeRaw?.sourceMode,
  )?.toLowerCase();
  const metaSourceRequested =
    sourceModeToken === "meta_glasses"
    || firstInboundString(cameraRuntimeRaw?.sourceClass)?.toLowerCase() === "meta_glasses"
    || firstInboundString(voiceRuntimeRaw?.sourceClass)?.toLowerCase() === "meta_glasses";
  const metaSourceVerified =
    Array.isArray(sourceAttestation.evidences)
    && sourceAttestation.evidences.some(
      (evidence) =>
        evidence.sourceClass === "meta_glasses"
        && evidence.verificationStatus === "verified"
    );
  if (!enabled) {
    return {
      enabled: false,
      extractedPayloadReady: false,
      autoTriggerPreview: false,
      explicitConfirmDetected,
      previewIntentDetected,
      missingRequiredFields: [],
      fallbackReasons: [],
      sourceAttestation,
      commandPolicy,
    };
  }

  const sourceMetadataTrusted =
    !sourceAttestation.verificationRequired || sourceAttestation.verified;
  const metaSourceTrusted = !metaSourceRequested || metaSourceVerified;
  const trustedSourceContext = sourceMetadataTrusted && metaSourceTrusted;
  const metadataForExtraction = trustedSourceContext
    ? args.metadata
    : {
        ...args.metadata,
        cameraRuntime: undefined,
        voiceRuntime: undefined,
      };
  const textCandidates = collectMeetingConciergeTextCandidates({
    metadata: metadataForExtraction,
    message: args.message,
  });
  const normalizedCorpus = textCandidates.join("\n");
  const concierge = normalizeInboundObjectValue(metadataForExtraction.concierge);
  const voiceRuntime = normalizeInboundObjectValue(metadataForExtraction.voiceRuntime);

  const emailMatch = normalizedCorpus.match(MEETING_CONCIERGE_EMAIL_PATTERN);
  const phoneMatch = normalizedCorpus.match(MEETING_CONCIERGE_PHONE_PATTERN);
  const personNamePattern =
    normalizedCorpus.match(/\b(?:my name is|this is|i am)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})/i)
    || normalizedCorpus.match(/\bmeet(?:ing)?\s+with\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})/i);
  const companyPattern =
    normalizedCorpus.match(/\b(?:at|from)\s+([A-Z][A-Za-z0-9&.\- ]{2,40})/);

  const personEmail =
    normalizeConciergeOptionalString(concierge?.personEmail)
    || normalizeConciergeOptionalString(voiceRuntime?.personEmail)
    || (emailMatch ? emailMatch[0].toLowerCase() : undefined);
  const personPhone =
    normalizeConciergeOptionalString(concierge?.personPhone)
    || normalizeConciergeOptionalString(voiceRuntime?.personPhone)
    || (phoneMatch ? phoneMatch[0] : undefined);
  const personName =
    normalizeConciergeOptionalString(concierge?.personName)
    || normalizeConciergeOptionalString(voiceRuntime?.personName)
    || (personNamePattern ? personNamePattern[1].trim() : undefined);
  const company =
    normalizeConciergeOptionalString(concierge?.company)
    || normalizeConciergeOptionalString(voiceRuntime?.company)
    || (companyPattern ? companyPattern[1].trim() : undefined);

  const { schedulingWindowStart, schedulingWindowEnd, fallbackApplied } =
    resolveMeetingConciergeWindow({
      metadata: metadataForExtraction,
      now,
    });
  const meetingDurationMinutes = extractMeetingConciergeDurationMinutes({
    metadata: metadataForExtraction,
    textCandidates,
  });
  const meetingTitle =
    normalizeConciergeOptionalString(concierge?.meetingTitle)
    || normalizeConciergeOptionalString(voiceRuntime?.meetingTitle)
    || (personName ? `Meeting with ${personName}` : undefined);

  const missingRequiredFields: string[] = [];
  if (!personEmail) {
    missingRequiredFields.push("personEmail");
  }

  const fallbackReasons: string[] = [];
  if (fallbackApplied) {
    fallbackReasons.push("scheduling_window_defaulted_7d");
  }
  if (!personEmail) {
    fallbackReasons.push("missing_person_email");
  }
  if (!sourceMetadataTrusted) {
    fallbackReasons.push("source_metadata_quarantined");
    for (const reasonCode of sourceAttestation.reasonCodes) {
      fallbackReasons.push(`source_attestation:${reasonCode}`);
    }
  }
  if (!metaSourceTrusted) {
    fallbackReasons.push("meta_source_attestation_missing_or_unverified");
  }
  if (!commandPolicy.allowed) {
    fallbackReasons.push(`command_policy_blocked:${commandPolicy.reasonCode}`);
  }

  const payloadReady =
    missingRequiredFields.length === 0
    && trustedSourceContext
    && commandPolicy.allowed;
  const idempotencySeed = [
    args.organizationId,
    firstInboundString(args.metadata.liveSessionId) ?? "live",
    personEmail ?? "unknown",
    schedulingWindowStart,
    schedulingWindowEnd,
  ].join(":");

  return {
    enabled: true,
    extractedPayloadReady: payloadReady,
    autoTriggerPreview: payloadReady && commandPolicy.allowed,
    explicitConfirmDetected,
    previewIntentDetected,
    missingRequiredFields,
    fallbackReasons,
    sourceAttestation,
    commandPolicy,
    ingestLatencyMs: resolveMeetingConciergeIngestLatencyMs({
      metadata: metadataForExtraction,
      now,
    }),
    payload: payloadReady
      ? {
          personName,
          personEmail,
          personPhone,
          company,
          meetingTitle,
          meetingDurationMinutes,
          schedulingWindowStart,
          schedulingWindowEnd,
          confirmationChannel: personPhone ? "sms" : personEmail ? "email" : "none",
          confirmationRecipient: personPhone ?? personEmail,
          conciergeIdempotencyKey: `mobile_concierge:${hashRuntimeSeed(idempotencySeed)}`,
        }
      : undefined,
  };
}

function hasMeetingConciergeToolCall(toolCalls: Array<Record<string, unknown>>): boolean {
  return toolCalls.some((toolCall) => {
    const toolName = normalizeConciergeOptionalString(
      (toolCall.function as Record<string, unknown> | undefined)?.name
    );
    if (toolName !== "manage_bookings") {
      return false;
    }
    const rawArguments = (toolCall.function as Record<string, unknown> | undefined)?.arguments;
    if (typeof rawArguments !== "string") {
      return false;
    }
    try {
      const parsed = JSON.parse(rawArguments) as Record<string, unknown>;
      return normalizeConciergeOptionalString(parsed.action) === "run_meeting_concierge_demo";
    } catch {
      return false;
    }
  });
}

function buildAutoPreviewMeetingConciergeToolCall(
  intent: InboundMeetingConciergeIntent
): Record<string, unknown> | null {
  if (!intent.autoTriggerPreview || !intent.payload) {
    return null;
  }

  return {
    id: `mobile_concierge_preview_${Date.now().toString(36)}`,
    type: "function",
    function: {
      name: "manage_bookings",
      arguments: JSON.stringify({
        action: "run_meeting_concierge_demo",
        mode: "preview",
        ...intent.payload,
      }),
    },
  };
}

function normalizeComposerMode(value: unknown): InboundComposerMode | undefined {
  if (value === "auto" || value === "plan" || value === "plan_soft") {
    return value;
  }
  return undefined;
}

function isStrictPlanMode(mode: InboundComposerMode): boolean {
  return mode === "plan";
}

function isPlanMode(mode: InboundComposerMode): boolean {
  return mode === "plan" || mode === "plan_soft";
}

function normalizeComposerReasoningEffort(
  value: unknown
): InboundComposerReasoningEffort | undefined {
  if (
    value === "low"
    || value === "medium"
    || value === "high"
    || value === "extra_high"
  ) {
    return value;
  }
  return undefined;
}

function normalizeComposerReferenceStatus(
  value: unknown
): InboundComposerReferenceStatus | undefined {
  if (value === "loading" || value === "ready" || value === "error") {
    return value;
  }
  return undefined;
}

function normalizeInboundImageAttachments(value: unknown): InboundImageAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const attachments: InboundImageAttachment[] = [];
  const seenUrls = new Set<string>();
  let totalBytes = 0;

  for (const item of value) {
    if (attachments.length >= COMPOSER_IMAGE_ATTACHMENT_LIMIT) {
      break;
    }
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;

    const typeCandidate = firstInboundString(
      record.type,
      record.kind
    )?.toLowerCase();
    if (typeCandidate !== "image") {
      continue;
    }

    const rawUrl = firstInboundString(
      record.url,
      (record.image_url as { url?: unknown } | undefined)?.url
    );
    if (!rawUrl) {
      continue;
    }

    let normalizedUrl: string | null = null;
    try {
      normalizedUrl = new URL(rawUrl).toString();
    } catch {
      normalizedUrl = null;
    }
    if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
      continue;
    }
    const isHttpImageUrl =
      normalizedUrl.startsWith("http://") || normalizedUrl.startsWith("https://");
    const isInlineDataImageUrl = normalizedUrl.startsWith("data:image/");
    if (!isHttpImageUrl && !isInlineDataImageUrl) {
      continue;
    }

    const normalizedMimeType = firstInboundString(record.mimeType, record.mime_type)?.toLowerCase();
    if (!normalizedMimeType || !normalizedMimeType.startsWith("image/")) {
      continue;
    }

    const sizeBytes = clampComposerNumber(
      typeof record.sizeBytes === "number" ? Math.round(record.sizeBytes) : 0,
      0,
      COMPOSER_IMAGE_ATTACHMENT_TOTAL_BYTES_LIMIT
    );
    if (sizeBytes <= 0) {
      continue;
    }

    if (totalBytes + sizeBytes > COMPOSER_IMAGE_ATTACHMENT_TOTAL_BYTES_LIMIT) {
      break;
    }

    const width =
      typeof record.width === "number" && Number.isFinite(record.width) && record.width > 0
        ? Math.round(record.width)
        : undefined;
    const height =
      typeof record.height === "number" && Number.isFinite(record.height) && record.height > 0
        ? Math.round(record.height)
        : undefined;
    const name = firstInboundString(record.name, record.fileName, record.filename) || "image";

    attachments.push({
      attachmentId: firstInboundString(record.attachmentId),
      type: "image",
      name,
      mimeType: normalizedMimeType,
      sizeBytes,
      url: normalizedUrl,
      storageId: firstInboundString(record.storageId),
      width,
      height,
    });

    seenUrls.add(normalizedUrl);
    totalBytes += sizeBytes;
  }

  return attachments;
}

function buildMultimodalUserMessageContent(args: {
  text: string;
  imageAttachments: InboundImageAttachment[];
}):
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > {
  if (args.imageAttachments.length === 0) {
    return args.text;
  }

  const parts: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [];

  if (args.text.trim().length > 0) {
    parts.push({
      type: "text",
      text: args.text,
    });
  }

  for (const attachment of args.imageAttachments) {
    parts.push({
      type: "image_url",
      image_url: { url: attachment.url },
    });
  }

  return parts;
}

function clampComposerNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function stripComposerFallbackEnvelope(message: string): {
  message: string;
  stripped: boolean;
} {
  const originalMessage = typeof message === "string" ? message : "";
  let cleanedMessage = originalMessage;
  let stripped = false;

  const withoutControlBlock = cleanedMessage.replace(COMPOSER_CONTROL_BLOCK_PATTERN, "");
  if (withoutControlBlock !== cleanedMessage) {
    cleanedMessage = withoutControlBlock;
    stripped = true;
  }

  const withoutReferenceBlock = cleanedMessage.replace(COMPOSER_REFERENCE_BLOCK_PATTERN, "");
  if (withoutReferenceBlock !== cleanedMessage) {
    cleanedMessage = withoutReferenceBlock;
    stripped = true;
  }

  const withoutImageBlock = cleanedMessage.replace(COMPOSER_IMAGE_BLOCK_PATTERN, "");
  if (withoutImageBlock !== cleanedMessage) {
    cleanedMessage = withoutImageBlock;
    stripped = true;
  }

  if (stripped) {
    cleanedMessage = cleanedMessage.replace(COMPOSER_USER_MESSAGE_PREFIX_PATTERN, "");
  }

  cleanedMessage = cleanedMessage.trim();

  if (cleanedMessage.length === 0) {
    return {
      message: stripped ? "" : originalMessage.trim(),
      stripped,
    };
  }

  return {
    message: cleanedMessage,
    stripped,
  };
}

function normalizeInboundComposerReferences(value: unknown): InboundComposerReference[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const references: InboundComposerReference[] = [];
  let remainingContentBudget = COMPOSER_REFERENCE_TOTAL_CONTENT_LIMIT;

  for (const item of value) {
    if (references.length >= COMPOSER_REFERENCE_LIMIT) {
      break;
    }
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;
    const rawUrl = firstInboundString(record.url);
    if (!rawUrl) {
      continue;
    }

    let normalizedUrl: string | null = null;
    try {
      normalizedUrl = new URL(rawUrl).toString();
    } catch {
      normalizedUrl = null;
    }
    if (!normalizedUrl) {
      continue;
    }

    const explicitStatus = normalizeComposerReferenceStatus(record.status);
    const error = firstInboundString(record.error);
    const rawContent =
      typeof record.content === "string" && record.content.trim().length > 0
        ? record.content.trim()
        : undefined;
    let content: string | undefined;
    if (rawContent && remainingContentBudget > 0) {
      const allowedChars = Math.min(
        COMPOSER_REFERENCE_CONTENT_LIMIT,
        remainingContentBudget
      );
      const truncated = rawContent.slice(0, allowedChars).trim();
      if (truncated.length > 0) {
        content = truncated;
        remainingContentBudget -= truncated.length;
      }
    }

    const status =
      explicitStatus ??
      (error
        ? "error"
        : content
        ? "ready"
        : "loading");

    references.push({
      url: normalizedUrl,
      content,
      status,
      error,
    });
  }

  return references;
}

type ComposerReferenceRelevanceSignal = "high" | "medium" | "low";

interface RankedComposerReferenceSummary {
  reference: InboundComposerReference;
  originalIndex: number;
  relevanceScore: number;
  relevanceSignal: ComposerReferenceRelevanceSignal;
  summary?: string;
  summaryOriginalLength?: number;
  summaryWasCompressed: boolean;
}

function tokenizeComposerReferenceText(text: string): string[] {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const tokens = normalized
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) =>
      token.length >= 3 && !COMPOSER_REFERENCE_STOP_WORDS.has(token)
    );

  return Array.from(new Set(tokens)).slice(0, COMPOSER_REFERENCE_QUERY_TOKEN_LIMIT);
}

function countTokenMatches(text: string, queryTokens: string[]): number {
  if (!text || queryTokens.length === 0) {
    return 0;
  }
  let matches = 0;
  const normalized = text.toLowerCase();
  for (const token of queryTokens) {
    if (normalized.includes(token)) {
      matches += 1;
    }
  }
  return matches;
}

function toComposerReferenceRelevanceSignal(
  score: number
): ComposerReferenceRelevanceSignal {
  if (score >= 0.67) {
    return "high";
  }
  if (score >= 0.34) {
    return "medium";
  }
  return "low";
}

function summarizeComposerReferenceForQuery(args: {
  referenceContent: string;
  queryTokens: string[];
}): {
  summary: string;
  originalLength: number;
  wasCompressed: boolean;
} {
  const normalizedContent = args.referenceContent.replace(/\s+/g, " ").trim();
  const originalLength = normalizedContent.length;
  if (originalLength === 0) {
    return {
      summary: "",
      originalLength: 0,
      wasCompressed: false,
    };
  }

  const sentences = normalizedContent
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 18);
  const fallbackSentences =
    sentences.length > 0
      ? sentences
      : [normalizedContent.slice(0, COMPOSER_REFERENCE_SUMMARY_CHAR_LIMIT)];

  const scoredSentences = fallbackSentences.map((sentence, index) => {
    const tokenMatches = countTokenMatches(sentence, args.queryTokens);
    const startsEarlyBoost = index < 2 ? 0.3 : 0;
    const score = tokenMatches * 2 + startsEarlyBoost + sentence.length / 240;
    return {
      sentence,
      index,
      score,
      tokenMatches,
    };
  });

  scoredSentences.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.index - b.index;
  });

  const selected = scoredSentences
    .filter((candidate) =>
      args.queryTokens.length === 0 || candidate.tokenMatches > 0
    )
    .slice(0, COMPOSER_REFERENCE_SUMMARY_SENTENCE_LIMIT);
  const candidates =
    selected.length > 0
      ? selected
      : scoredSentences.slice(0, COMPOSER_REFERENCE_SUMMARY_SENTENCE_LIMIT);

  candidates.sort((a, b) => a.index - b.index);

  const summaryParts: string[] = [];
  let usedChars = 0;
  for (const candidate of candidates) {
    const nextChars =
      usedChars + candidate.sentence.length + (summaryParts.length > 0 ? 1 : 0);
    if (nextChars > COMPOSER_REFERENCE_SUMMARY_CHAR_LIMIT) {
      break;
    }
    summaryParts.push(candidate.sentence);
    usedChars = nextChars;
  }

  const summary =
    summaryParts.length > 0
      ? summaryParts.join(" ").trim()
      : normalizedContent.slice(0, COMPOSER_REFERENCE_SUMMARY_CHAR_LIMIT).trim();

  return {
    summary,
    originalLength,
    wasCompressed: summary.length < originalLength,
  };
}

function rankComposerReferencesForRuntimeContext(args: {
  references: InboundComposerReference[];
  queryText: string;
}): RankedComposerReferenceSummary[] {
  const queryTokens = tokenizeComposerReferenceText(args.queryText);
  const ranked = args.references.map((reference, originalIndex) => {
    const statusScore =
      reference.status === "ready"
        ? 0.24
        : reference.status === "loading"
          ? 0.08
          : -0.18;
    const content = reference.content?.trim() || "";
    const contentMatches = countTokenMatches(content, queryTokens);
    const urlMatches = countTokenMatches(reference.url, queryTokens);
    const overlapRatio =
      queryTokens.length > 0
        ? Math.min(1, (contentMatches + urlMatches * 0.5) / queryTokens.length)
        : 0.45;
    const contentScore = content.length > 0 ? 0.16 : -0.06;
    const errorPenalty = reference.error ? -0.12 : 0;
    const relevanceScore = clampComposerNumber(
      overlapRatio * 0.58 + statusScore + contentScore + errorPenalty,
      0,
      1
    );

    const summaryResult =
      content.length > 0
        ? summarizeComposerReferenceForQuery({
            referenceContent: content,
            queryTokens,
          })
        : null;

    return {
      reference,
      originalIndex,
      relevanceScore: Number(relevanceScore.toFixed(3)),
      relevanceSignal: toComposerReferenceRelevanceSignal(relevanceScore),
      summary: summaryResult?.summary,
      summaryOriginalLength: summaryResult?.originalLength,
      summaryWasCompressed: summaryResult?.wasCompressed ?? false,
    } satisfies RankedComposerReferenceSummary;
  });

  ranked.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return a.originalIndex - b.originalIndex;
  });

  return ranked;
}

function formatComposerList(items: string[]): string {
  const normalized = Array.from(
    new Set(items.map((item) => item.trim()).filter((item) => item.length > 0))
  ).sort();

  if (normalized.length === 0) {
    return "none";
  }

  const visible = normalized.slice(0, COMPOSER_FEASIBILITY_LIST_LIMIT);
  const overflow = normalized.length - visible.length;
  if (overflow > 0) {
    return `${visible.join(", ")}, +${overflow} more`;
  }
  return visible.join(", ");
}

export function resolveInboundComposerRuntimeControls(args: {
  metadata: Record<string, unknown>;
  inboundMessage: string;
}): InboundComposerRuntimeControls {
  const mode = normalizeComposerMode(args.metadata.mode) ?? "auto";
  const reasoningEffort =
    normalizeComposerReasoningEffort(args.metadata.reasoningEffort) ?? "medium";
  const references = normalizeInboundComposerReferences(args.metadata.references);
  const sanitizedMessage = stripComposerFallbackEnvelope(args.inboundMessage);

  return {
    mode,
    reasoningEffort,
    references,
    cleanedMessage: sanitizedMessage.message || args.inboundMessage.trim(),
    strippedFallbackEnvelope: sanitizedMessage.stripped,
  };
}

export function buildInboundComposerRuntimeContext(
  controls: InboundComposerRuntimeControls
): string | null {
  const lines: string[] = [];

  if (isStrictPlanMode(controls.mode)) {
    lines.push("Planning mode is active for this turn.");
    lines.push("Provide a numbered plan before proposing tool execution.");
    lines.push("Do not execute tools or irreversible actions until the user confirms.");
    lines.push("");
  } else if (controls.mode === "plan_soft") {
    lines.push("Plan-with-hints mode is active for this turn.");
    lines.push("Provide a numbered plan with feasibility notes per step.");
    lines.push("Do not execute tools or irreversible actions until the user confirms.");
    lines.push("");
  }

  if (controls.reasoningEffort !== "medium") {
    if (controls.reasoningEffort === "low") {
      lines.push("Reasoning effort preference: low.");
      lines.push("Prioritize concise, direct output and avoid over-expanding analysis.");
      lines.push("");
    } else if (controls.reasoningEffort === "high") {
      lines.push("Reasoning effort preference: high.");
      lines.push("Do deeper analysis and include key edge cases before final recommendations.");
      lines.push("");
    } else if (controls.reasoningEffort === "extra_high") {
      lines.push("Reasoning effort preference: extra_high.");
      lines.push("Use maximum depth: evaluate alternatives, tradeoffs, and failure modes before concluding.");
      lines.push("");
    }
  }

  if (controls.references.length > 0) {
    const rankedReferences = rankComposerReferencesForRuntimeContext({
      references: controls.references,
      queryText: controls.cleanedMessage,
    });
    const selectedReferences = rankedReferences.slice(
      0,
      COMPOSER_REFERENCE_SUMMARY_TOP_RANKED_LIMIT
    );
    lines.push("User-provided URL references are available for this turn (query-ranked):");
    for (let i = 0; i < selectedReferences.length; i += 1) {
      const ranked = selectedReferences[i];
      lines.push(`[${i + 1}] URL: ${ranked.reference.url}`);
      lines.push(`Status: ${ranked.reference.status}`);
      lines.push(
        `Relevance signal: ${ranked.relevanceSignal} (${ranked.relevanceScore.toFixed(2)})`
      );
      if (ranked.reference.error) {
        lines.push(`Error: ${ranked.reference.error}`);
      }
      if (ranked.summary && ranked.summary.length > 0) {
        lines.push("Reference summary:");
        lines.push(ranked.summary);
        if (ranked.summaryWasCompressed && typeof ranked.summaryOriginalLength === "number") {
          lines.push(
            `Summary compressed from ${ranked.summaryOriginalLength} chars.`
          );
        }
      } else {
        lines.push("Reference summary unavailable (source not ready).");
      }
      lines.push("");
    }
    const hiddenReferenceCount = rankedReferences.length - selectedReferences.length;
    if (hiddenReferenceCount > 0) {
      lines.push(`Omitted lower-ranked references: ${hiddenReferenceCount}.`);
      lines.push("");
    }
  }

  const context = lines.join("\n").trim();
  if (!context) {
    return null;
  }

  return [
    "--- COMPOSER RUNTIME CONTROLS ---",
    context,
    "--- END COMPOSER RUNTIME CONTROLS ---",
  ].join("\n");
}

export function buildInboundMeetingConciergeRuntimeContext(
  intent: InboundMeetingConciergeIntent
): string | null {
  if (!intent.enabled) {
    return null;
  }

  const lines: string[] = [];
  lines.push("Mobile live concierge context detected (voice/camera ingress).");
  lines.push("Guardrail: run preview first before any mutating booking execution.");
  lines.push(
    "Guardrail: execute mode requires explicit user confirmation and approval-gated mutation."
  );
  if (intent.sourceAttestation.verificationRequired) {
    lines.push(
      `Source attestation: ${intent.sourceAttestation.verified ? "verified" : "quarantined"} (${intent.sourceAttestation.verificationStatus}).`
    );
  }
  lines.push(
    `Node command policy (${MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION}): ${intent.commandPolicy.status}.`
  );
  if (!intent.commandPolicy.allowed) {
    lines.push(
      `Node command policy blocked execution (${intent.commandPolicy.reasonCode}) and runtime remains fail-closed.`
    );
  }

  if (intent.payload) {
    lines.push("Extracted concierge payload candidate:");
    lines.push(JSON.stringify(intent.payload));
  }
  if (intent.missingRequiredFields.length > 0) {
    lines.push(
      `Missing required fields: ${intent.missingRequiredFields.join(", ")}. Ask the user for these fields before booking.`
    );
  } else {
    lines.push(
      "When appropriate, call manage_bookings with action=run_meeting_concierge_demo and mode=preview."
    );
  }
  if (intent.fallbackReasons.length > 0) {
    lines.push(`Fallback signals: ${intent.fallbackReasons.join(", ")}.`);
  }
  if (typeof intent.ingestLatencyMs === "number") {
    lines.push(`Ingress latency estimate: ${intent.ingestLatencyMs}ms.`);
  }

  return [
    "--- MOBILE MEETING CONCIERGE CONTEXT ---",
    lines.join("\n"),
    "--- END MOBILE MEETING CONCIERGE CONTEXT ---",
  ].join("\n");
}

function normalizeRuntimeSystemContext(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function assembleRuntimeSystemMessages(args: {
  systemPrompt: string;
  pinnedNotesContext?: string | null;
  rollingSummaryContext?: string | null;
  reactivationMemoryContext?: string | null;
  contactMemoryContext?: string | null;
  composerRuntimeContext?: string | null;
  planFeasibilityContext?: string | null;
}): Array<{ role: "system"; content: string }> {
  const messages: Array<{ role: "system"; content: string }> = [
    { role: "system", content: args.systemPrompt },
  ];
  const pinnedNotesContext = normalizeRuntimeSystemContext(args.pinnedNotesContext);
  if (pinnedNotesContext) {
    messages.push({
      role: "system",
      content: pinnedNotesContext,
    });
  }
  const rollingSummaryContext = normalizeRuntimeSystemContext(args.rollingSummaryContext);
  if (rollingSummaryContext) {
    messages.push({
      role: "system",
      content: rollingSummaryContext,
    });
  }
  const reactivationMemoryContext = normalizeRuntimeSystemContext(
    args.reactivationMemoryContext
  );
  if (reactivationMemoryContext) {
    messages.push({
      role: "system",
      content: reactivationMemoryContext,
    });
  }
  const contactMemoryContext = normalizeRuntimeSystemContext(
    args.contactMemoryContext
  );
  if (contactMemoryContext) {
    messages.push({
      role: "system",
      content: contactMemoryContext,
    });
  }
  const composerRuntimeContext = normalizeRuntimeSystemContext(args.composerRuntimeContext);
  if (composerRuntimeContext) {
    messages.push({
      role: "system",
      content: composerRuntimeContext,
    });
  }
  const planFeasibilityContext = normalizeRuntimeSystemContext(args.planFeasibilityContext);
  if (planFeasibilityContext) {
    messages.push({
      role: "system",
      content: planFeasibilityContext,
    });
  }
  return messages;
}

export type PlanSoftReadinessStatus = "READY" | "BLOCKED" | "NEEDS_INFO";

interface PlanSoftStepReadinessScore {
  status: PlanSoftReadinessStatus;
  reason: string;
  matchedTools: string[];
}

function normalizeComposerToolToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findComposerToolMatches(content: string, tools: string[]): string[] {
  const normalizedContent = normalizeComposerToolToken(content);
  if (!normalizedContent || tools.length === 0) {
    return [];
  }

  const matches: string[] = [];
  for (const tool of tools) {
    const normalizedTool = normalizeComposerToolToken(tool);
    if (!normalizedTool || normalizedTool.length < 3) {
      continue;
    }
    if (normalizedContent.includes(normalizedTool)) {
      matches.push(tool);
    }
  }

  return Array.from(new Set(matches));
}

export function scorePlanSoftStepReadiness(args: {
  stepText: string;
  availableToolNames: string[];
  connectedIntegrations: string[];
  unavailableByIntegration: string[];
  unavailableByPolicy: string[];
}): PlanSoftStepReadinessScore {
  const blockedByIntegration = findComposerToolMatches(
    args.stepText,
    args.unavailableByIntegration
  );
  if (blockedByIntegration.length > 0) {
    return {
      status: "BLOCKED",
      reason: `Requires ${blockedByIntegration[0]}, blocked until the integration is connected.`,
      matchedTools: blockedByIntegration,
    };
  }

  const blockedByPolicy = findComposerToolMatches(
    args.stepText,
    args.unavailableByPolicy
  );
  if (blockedByPolicy.length > 0) {
    return {
      status: "BLOCKED",
      reason: `Requires ${blockedByPolicy[0]}, currently blocked by policy/scope.`,
      matchedTools: blockedByPolicy,
    };
  }

  const availableToolMatches = findComposerToolMatches(
    args.stepText,
    args.availableToolNames
  );
  if (availableToolMatches.length > 0) {
    return {
      status: "READY",
      reason: `Mapped to available tool ${availableToolMatches[0]}.`,
      matchedTools: availableToolMatches,
    };
  }

  if (COMPOSER_PLAN_SOFT_ANALYSIS_HINT_PATTERN.test(args.stepText)) {
    return {
      status: "READY",
      reason: "No blocked tooling dependency detected for this analysis/planning step.",
      matchedTools: [],
    };
  }

  if (COMPOSER_PLAN_SOFT_ACTION_HINT_PATTERN.test(args.stepText)) {
    const integrationHint =
      args.connectedIntegrations.length > 0
        ? ` Connected integrations: ${formatComposerList(args.connectedIntegrations)}.`
        : "";
    return {
      status: "NEEDS_INFO",
      reason:
        `Action step does not map to a known available tool; specify required tool/integration.` +
        integrationHint,
      matchedTools: [],
    };
  }

  return {
    status: "NEEDS_INFO",
    reason: "Insufficient detail to map this step to tooling/integration readiness.",
    matchedTools: [],
  };
}

function extractNumberedPlanSteps(content: string): Array<{
  stepNumber: number;
  content: string;
}> {
  const normalizedContent = content.trim();
  if (!normalizedContent) {
    return [];
  }
  const lines = content.split(/\r?\n/);
  const steps: Array<{ stepNumber: number; content: string }> = [];
  let activeStep:
    | { stepNumber: number; contentLines: string[] }
    | null = null;

  for (const line of lines) {
    const matchedStep = line.match(COMPOSER_PLAN_SOFT_STEP_PATTERN);
    if (matchedStep) {
      if (activeStep) {
        steps.push({
          stepNumber: activeStep.stepNumber,
          content: activeStep.contentLines.join(" ").trim(),
        });
      }
      activeStep = {
        stepNumber: Number.parseInt(matchedStep[1] ?? "0", 10) || steps.length + 1,
        contentLines: [matchedStep[2] ?? ""],
      };
      continue;
    }

    if (activeStep && line.trim().length > 0) {
      activeStep.contentLines.push(line.trim());
    }
  }

  if (activeStep) {
    steps.push({
      stepNumber: activeStep.stepNumber,
      content: activeStep.contentLines.join(" ").trim(),
    });
  }

  const numberedSteps = steps.filter((step) => step.content.length > 0);
  if (numberedSteps.length > 0) {
    return numberedSteps;
  }

  const bulletSteps = lines
    .map((line) => line.match(COMPOSER_PLAN_SOFT_BULLET_PATTERN)?.[1]?.trim() ?? null)
    .filter((line): line is string => Boolean(line && line.length > 0))
    .map((line, index) => ({
      stepNumber: index + 1,
      content: line,
    }));
  if (bulletSteps.length > 0) {
    return bulletSteps;
  }

  const paragraphSteps = normalizedContent
    .split(/\n{2,}|(?<=[.!?])\s+/)
    .map((fragment) =>
      fragment
        .replace(/^\s*(?:[-*•]|[a-zA-Z][.)]|\d+[.)])\s+/, "")
        .trim()
    )
    .filter((fragment) => fragment.length >= 24)
    .slice(0, 8)
    .map((fragment, index) => ({
      stepNumber: index + 1,
      content: fragment,
    }));
  if (paragraphSteps.length > 0) {
    return paragraphSteps;
  }

  return [];
}

function buildPlanSoftReadinessScoreBlock(args: {
  assistantContent: string;
  availableToolNames: string[];
  connectedIntegrations: string[];
  unavailableByIntegration: string[];
  unavailableByPolicy: string[];
}): string | null {
  const extractedSteps = extractNumberedPlanSteps(args.assistantContent);
  if (extractedSteps.length === 0) {
    return null;
  }

  const lines: string[] = [COMPOSER_PLAN_SOFT_READINESS_MARKER];
  for (const step of extractedSteps) {
    const score = scorePlanSoftStepReadiness({
      stepText: step.content,
      availableToolNames: args.availableToolNames,
      connectedIntegrations: args.connectedIntegrations,
      unavailableByIntegration: args.unavailableByIntegration,
      unavailableByPolicy: args.unavailableByPolicy,
    });
    lines.push(
      `Step ${step.stepNumber}: ${score.status} | Reason: ${score.reason}`
    );
    if (score.matchedTools.length > 0) {
      lines.push(`Matched tools: ${formatComposerList(score.matchedTools)}`);
    }
  }
  lines.push("--- END PLAN SOFT READINESS SCORES ---");
  return lines.join("\n");
}

export function applyPlanSoftReadinessScoring(args: {
  assistantContent: string;
  availableToolNames: string[];
  connectedIntegrations: string[];
  unavailableByIntegration: string[];
  unavailableByPolicy: string[];
}): string {
  const normalizedContent = args.assistantContent.trim();
  if (!normalizedContent) {
    return args.assistantContent;
  }
  if (normalizedContent.includes(COMPOSER_PLAN_SOFT_READINESS_MARKER)) {
    return args.assistantContent;
  }

  const readinessBlock = buildPlanSoftReadinessScoreBlock(args);
  if (!readinessBlock) {
    return args.assistantContent;
  }

  return `${normalizedContent}\n\n${readinessBlock}`;
}

export function buildInboundPlanFeasibilityContext(args: {
  mode: InboundComposerMode;
  userMessage: string;
  availableToolNames: string[];
  connectedIntegrations: string[];
  unavailableByIntegration: string[];
  unavailableByPolicy: string[];
}): string | null {
  if (args.mode !== "plan_soft") {
    return null;
  }

  const sampleUserSteps = extractNumberedPlanSteps(args.userMessage);
  const sampleTargets =
    sampleUserSteps.length > 0
      ? sampleUserSteps
      : [{ stepNumber: 1, content: args.userMessage.trim() }].filter(
          (step) => step.content.length > 0
        );
  const readinessPreview = sampleTargets
    .slice(0, 3)
    .map((step) => ({
      stepNumber: step.stepNumber,
      score: scorePlanSoftStepReadiness({
        stepText: step.content,
        availableToolNames: args.availableToolNames,
        connectedIntegrations: args.connectedIntegrations,
        unavailableByIntegration: args.unavailableByIntegration,
        unavailableByPolicy: args.unavailableByPolicy,
      }),
    }));

  const lines = [
    "Plan feasibility hints are available for this turn.",
    "Do not execute tools in this mode; provide prerequisites and owner actions only.",
    "For every plan step (numbered, bulleted, or clear action sentence), include readiness output in this exact format:",
    "Readiness: READY|BLOCKED|NEEDS_INFO - <reason>",
    "Use deterministic gates in this order:",
    "1) Integration gate -> BLOCKED if required tool is unavailable due to missing integration.",
    "2) Policy gate -> BLOCKED if required tool is blocked by platform/org/agent/session/channel scope.",
    "3) Tool mapping gate -> READY when a required tool matches currently available tools.",
    "4) Information gate -> NEEDS_INFO when owner/tool/prerequisite is ambiguous.",
    "",
    `Available tools: ${formatComposerList(args.availableToolNames)}`,
    `Connected integrations: ${formatComposerList(args.connectedIntegrations)}`,
    `Unavailable (integration missing): ${formatComposerList(args.unavailableByIntegration)}`,
    `Unavailable (policy/scope): ${formatComposerList(args.unavailableByPolicy)}`,
  ];

  if (readinessPreview.length > 0) {
    lines.push("");
    lines.push("Pre-scored request cues (deterministic):");
    for (const preview of readinessPreview) {
      lines.push(
        `Request step ${preview.stepNumber}: ${preview.score.status} - ${preview.score.reason}`
      );
    }
  }

  return [
    "--- PLAN FEASIBILITY HINTS ---",
    lines.join("\n"),
    "--- END PLAN FEASIBILITY HINTS ---",
  ].join("\n");
}

function resolveInboundComposerGenerationSettings(args: {
  reasoningEffort: InboundComposerReasoningEffort;
  baseTemperature?: number;
  baseMaxTokens?: number;
}): { temperature: number; maxTokens: number } {
  const normalizedBaseTemperature =
    typeof args.baseTemperature === "number" && Number.isFinite(args.baseTemperature)
      ? clampComposerNumber(args.baseTemperature, 0, 2)
      : 0.7;
  const rawBaseMaxTokens =
    typeof args.baseMaxTokens === "number" && Number.isFinite(args.baseMaxTokens)
      ? Math.floor(args.baseMaxTokens)
      : 4096;
  const normalizedBaseMaxTokens = clampComposerNumber(rawBaseMaxTokens, 512, 8192);

  switch (args.reasoningEffort) {
    case "low":
      return {
        temperature: clampComposerNumber(normalizedBaseTemperature + 0.1, 0, 2),
        maxTokens: Math.min(normalizedBaseMaxTokens, 2048),
      };
    case "high":
      return {
        temperature: clampComposerNumber(normalizedBaseTemperature - 0.1, 0, 2),
        maxTokens: Math.min(8192, Math.max(normalizedBaseMaxTokens, 4096)),
      };
    case "extra_high":
      return {
        temperature: clampComposerNumber(normalizedBaseTemperature - 0.15, 0, 2),
        maxTokens: Math.min(8192, Math.max(normalizedBaseMaxTokens, 6144)),
      };
    case "medium":
    default:
      return {
        temperature: normalizedBaseTemperature,
        maxTokens: normalizedBaseMaxTokens,
      };
  }
}

function deriveInboundRoutePartitionKey(
  routeIdentity?: InboundChannelRouteIdentity
): string {
  if (!routeIdentity) {
    return "legacy";
  }

  if (routeIdentity.routeKey) {
    return `route:${routeIdentity.routeKey}`;
  }

  const providerId = routeIdentity.providerId || "provider";
  const identitySeed =
    routeIdentity.providerInstallationId ||
    routeIdentity.providerAccountId ||
    routeIdentity.providerConnectionId ||
    routeIdentity.providerProfileId;

  if (!identitySeed) {
    return "legacy";
  }

  return `${providerId}:${identitySeed}`;
}

export function resolveInboundChannelRouteIdentity(
  metadata: Record<string, unknown>
): InboundChannelRouteIdentity | undefined {
  const providerId = firstInboundString(metadata.providerId);
  const providerConnectionId = firstInboundString(
    metadata.providerConnectionId,
    metadata.oauthConnectionId
  );
  const providerAccountId = firstInboundString(
    metadata.providerAccountId,
    metadata.slackTeamId,
    metadata.teamId
  );
  const providerInstallationId = firstInboundString(
    metadata.providerInstallationId,
    metadata.installationId,
    metadata.slackTeamId
  );
  const providerProfileId = firstInboundString(
    metadata.providerProfileId,
    metadata.appProfileId
  );
  const providerProfileType = normalizeInboundRouteProfileType(
    metadata.providerProfileType
  );
  const routeKey = firstInboundString(
    metadata.routeKey,
    metadata.bindingRouteKey,
    metadata.providerRouteKey
  ) || (
    providerId && providerInstallationId ? `${providerId}:${providerInstallationId}` : undefined
  );
  const bindingId = firstInboundString(metadata.bindingId);

  const identity: InboundChannelRouteIdentity = {
    bindingId,
    providerId,
    providerConnectionId,
    providerAccountId,
    providerInstallationId,
    providerProfileId,
    providerProfileType,
    routeKey,
  };

  return Object.values(identity).some((value) => Boolean(value))
    ? identity
    : undefined;
}

export function resolveInboundDispatchRouteSelectors(args: {
  channel: string;
  externalContactIdentifier: string;
  metadata: Record<string, unknown>;
}): {
  channel?: string;
  providerId?: string;
  account?: string;
  team?: string;
  peer?: string;
  channelRef?: string;
} {
  const metadata = args.metadata;
  return {
    channel: normalizeInboundRouteString(args.channel),
    providerId: firstInboundString(metadata.providerId),
    account: firstInboundString(
      metadata.providerAccountId,
      metadata.accountId,
      metadata.slackTeamId,
      metadata.teamId
    ),
    team: firstInboundString(
      metadata.team,
      metadata.teamId,
      metadata.providerTeamId,
      metadata.slackTeamId
    ),
    peer: firstInboundString(
      metadata.peer,
      metadata.peerId,
      metadata.providerPeerId,
      metadata.slackUserId,
      args.externalContactIdentifier
    ),
    channelRef: firstInboundString(
      metadata.channelRef,
      metadata.channelId,
      metadata.providerChannelId,
      metadata.slackChannelId
    ),
  };
}

export interface InboundVoiceRuntimeRequest {
  requestedProviderId: VoiceRuntimeProviderId;
  voiceSessionId?: string;
  requestedVoiceId?: string;
  audioBase64?: string;
  mimeType?: string;
  language?: string;
  synthesizeResponse: boolean;
}

interface ElevenLabsRuntimeBinding {
  apiKey: string;
  baseUrl?: string;
  defaultVoiceId?: string;
  profileId: string;
  billingSource: "platform" | "byok" | "private";
}

function decodeInboundVoiceAudioBase64(payload: string): Uint8Array {
  const base64Payload = payload.includes(",")
    ? payload.split(",", 2)[1] ?? ""
    : payload;
  return new Uint8Array(Buffer.from(base64Payload, "base64"));
}

function extractElevenLabsDefaultVoiceId(args: {
  providerAuthProfiles?: unknown;
  profileId?: string;
}): string | undefined {
  if (!Array.isArray(args.providerAuthProfiles)) {
    return undefined;
  }

  for (const profile of args.providerAuthProfiles) {
    if (typeof profile !== "object" || profile === null) {
      continue;
    }
    const typedProfile = profile as Record<string, unknown>;
    if (typedProfile.providerId !== "elevenlabs") {
      continue;
    }
    if (
      args.profileId &&
      firstInboundString(typedProfile.profileId) !== args.profileId
    ) {
      continue;
    }
    const metadata = typedProfile.metadata;
    if (typeof metadata !== "object" || metadata === null) {
      continue;
    }
    const defaultVoiceId = firstInboundString(
      (metadata as Record<string, unknown>).defaultVoiceId
    );
    if (defaultVoiceId) {
      return defaultVoiceId;
    }
  }

  return undefined;
}

function resolveElevenLabsRuntimeBinding(args: {
  aiSettings?: {
    llm?: {
      providerAuthProfiles?: unknown;
    } | null;
    billingSource?: "platform" | "byok" | "private";
    billingMode?: "platform" | "byok";
  } | null;
}): ElevenLabsRuntimeBinding | null {
  if (!args.aiSettings?.llm) {
    return null;
  }

  const binding = resolveOrganizationProviderBindingForProvider({
    providerId: "elevenlabs",
    llmSettings: args.aiSettings.llm as any,
    defaultBillingSource:
      args.aiSettings.billingSource ??
      (args.aiSettings.billingMode === "byok" ? "byok" : "platform"),
    now: Date.now(),
  });
  if (!binding) {
    return null;
  }

  const defaultVoiceId = extractElevenLabsDefaultVoiceId({
    providerAuthProfiles: args.aiSettings.llm.providerAuthProfiles,
    profileId: binding.profileId,
  });

  return {
    apiKey: binding.apiKey,
    baseUrl: binding.baseUrl,
    defaultVoiceId,
    profileId: binding.profileId,
    billingSource: binding.billingSource,
  };
}

function resolveVoiceRuntimeBillingSource(args: {
  providerId: VoiceRuntimeProviderId;
  elevenLabsBinding?: ElevenLabsRuntimeBinding | null;
  fallbackBillingSource?: "platform" | "byok" | "private";
}): "platform" | "byok" | "private" {
  if (args.providerId === "elevenlabs") {
    return (
      args.elevenLabsBinding?.billingSource ??
      args.fallbackBillingSource ??
      "platform"
    );
  }
  return "private";
}

function resolveVoiceUsageModelId(args: {
  providerId: VoiceRuntimeProviderId;
  usageMetadata?: unknown;
}): string {
  if (args.usageMetadata && typeof args.usageMetadata === "object") {
    const usageModelId = firstInboundString(
      (args.usageMetadata as Record<string, unknown>).modelId
    );
    if (usageModelId) {
      return usageModelId;
    }
  }
  return args.providerId === "elevenlabs"
    ? "elevenlabs_voice_runtime"
    : "browser_voice_runtime";
}

async function recordVoiceUsageTelemetry(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  sessionId: Id<"agentSessions">;
  turnId: Id<"agentTurns">;
  billingSource: "platform" | "byok" | "private";
  requestType: "voice_stt" | "voice_tts";
  action: string;
  creditLedgerAction: string;
  providerId: VoiceRuntimeProviderId;
  usage: {
    nativeUsageUnit?: string;
    nativeUsageQuantity?: number;
    nativeInputUnits?: number;
    nativeOutputUnits?: number;
    nativeTotalUnits?: number;
    nativeCostInCents?: number;
    nativeCostCurrency?: string;
    nativeCostSource?:
      | "provider_reported"
      | "estimated_model_pricing"
      | "estimated_unit_pricing"
      | "not_available";
    providerRequestId?: string;
    metadata?: unknown;
  } | null;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const nativeCostInCents =
    typeof args.usage?.nativeCostInCents === "number"
    && Number.isFinite(args.usage.nativeCostInCents)
    && args.usage.nativeCostInCents > 0
      ? Math.floor(args.usage.nativeCostInCents)
      : 0;
  const creditsToCharge =
    nativeCostInCents > 0
      ? convertUsdToCredits(nativeCostInCents / 100)
      : 0;
  let creditsCharged = 0;
  let creditChargeStatus:
    | "charged"
    | "skipped_unmetered"
    | "skipped_insufficient_credits"
    | "skipped_not_required"
    | "failed" =
    args.billingSource === "platform"
      ? "skipped_unmetered"
      : "skipped_not_required";

  if (args.success && args.billingSource === "platform" && creditsToCharge > 0) {
    try {
      const deduction = await args.ctx.runMutation(
        getInternal().credits.index.deductCreditsInternalMutation,
        {
          organizationId: args.organizationId,
          amount: creditsToCharge,
          action: args.creditLedgerAction,
          relatedEntityType: "agent_session",
          relatedEntityId: args.sessionId,
          billingSource: args.billingSource,
          requestSource: "llm",
          softFailOnExhausted: true,
        }
      );
      if (deduction.success && !deduction.skipped) {
        creditsCharged = creditsToCharge;
        creditChargeStatus = "charged";
      } else if (deduction.success && deduction.skipped) {
        creditChargeStatus = "skipped_not_required";
      } else {
        creditChargeStatus = "skipped_insufficient_credits";
      }
    } catch (error) {
      creditChargeStatus = "failed";
      console.error("[AgentExecution] Voice credit deduction failed:", error);
    }
  }

  const modelId = resolveVoiceUsageModelId({
    providerId: args.providerId,
    usageMetadata: args.usage?.metadata,
  });
  await args.ctx.runMutation(getApi().api.ai.billing.recordUsage, {
    organizationId: args.organizationId,
    requestType: args.requestType,
    provider: args.providerId,
    model: modelId,
    action: args.action,
    requestCount: 1,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    costInCents: nativeCostInCents,
    nativeUsageUnit: firstInboundString(args.usage?.nativeUsageUnit),
    nativeUsageQuantity: args.usage?.nativeUsageQuantity,
    nativeInputUnits: args.usage?.nativeInputUnits,
    nativeOutputUnits: args.usage?.nativeOutputUnits,
    nativeTotalUnits: args.usage?.nativeTotalUnits,
    nativeCostInCents: nativeCostInCents > 0 ? nativeCostInCents : undefined,
    nativeCostCurrency: args.usage?.nativeCostCurrency,
    nativeCostSource: args.usage?.nativeCostSource ?? "not_available",
    providerRequestId: args.usage?.providerRequestId,
    usageMetadata: {
      sessionId: args.sessionId,
      turnId: args.turnId,
      ...(args.metadata ?? {}),
      ...(args.usage?.metadata && typeof args.usage.metadata === "object"
        ? { providerUsage: args.usage.metadata }
        : {}),
    },
    creditsCharged,
    creditChargeStatus,
    success: args.success,
    errorMessage: args.errorMessage,
    billingSource: args.billingSource,
    requestSource: "llm",
    ledgerMode: "credits_ledger",
    creditLedgerAction: args.creditLedgerAction,
  });
}

export function resolveInboundVoiceRuntimeRequest(
  metadata: Record<string, unknown>
): InboundVoiceRuntimeRequest | null {
  const voiceRuntimeRaw = metadata.voiceRuntime;
  if (typeof voiceRuntimeRaw !== "object" || voiceRuntimeRaw === null) {
    return null;
  }

  const voiceRuntime = voiceRuntimeRaw as Record<string, unknown>;
  const audioBase64 = firstInboundString(voiceRuntime.audioBase64);
  const synthesizeResponse = voiceRuntime.synthesizeResponse === true;

  if (!audioBase64 && !synthesizeResponse) {
    return null;
  }

  return {
    requestedProviderId: normalizeVoiceRuntimeProviderId(
      firstInboundString(
        voiceRuntime.requestedProviderId,
        voiceRuntime.providerId
      )
    ),
    voiceSessionId: firstInboundString(voiceRuntime.voiceSessionId),
    requestedVoiceId: firstInboundString(voiceRuntime.requestedVoiceId),
    audioBase64,
    mimeType: firstInboundString(voiceRuntime.mimeType),
    language: firstInboundString(voiceRuntime.language),
    synthesizeResponse,
  };
}

export function resolveVoiceRuntimeLanguage(args: {
  inboundVoiceRequest: InboundVoiceRuntimeRequest;
  agentConfig?: {
    voiceLanguage?: string;
    language?: string;
  } | null;
}): string | undefined {
  return (
    args.inboundVoiceRequest.language ??
    firstInboundString(
      args.agentConfig?.voiceLanguage,
      args.agentConfig?.language
    )
  );
}

export function resolveVoiceRuntimeVoiceId(args: {
  inboundVoiceRequest: InboundVoiceRuntimeRequest;
  agentConfig?: {
    elevenLabsVoiceId?: string;
  } | null;
  orgDefaultVoiceId?: string;
}): string | undefined {
  return (
    args.inboundVoiceRequest.requestedVoiceId ??
    firstInboundString(args.agentConfig?.elevenLabsVoiceId) ??
    firstInboundString(args.orgDefaultVoiceId)
  );
}

function resolveInboundIdempotencyKey(args: {
  providedKey: unknown;
  metadata?: Record<string, unknown>;
  organizationId: Id<"organizations">;
  channel: string;
  externalContactIdentifier: string;
  message: string;
  channelRouteIdentity?: InboundChannelRouteIdentity;
  runtimeContracts?: InboundRuntimeContracts;
}): string {
  if (typeof args.providedKey === "string" && args.providedKey.trim().length > 0) {
    return args.providedKey.trim();
  }

  const metadata = args.metadata ?? {};
  const runtimeScopeKey = normalizeInboundRouteString(
    args.runtimeContracts?.idempotencyContract.scopeKey
  );
  const runtimeIntentType = args.runtimeContracts?.idempotencyContract.intentType;
  const runtimePayloadHash = normalizeInboundRouteString(
    args.runtimeContracts?.idempotencyContract.payloadHash
  );
  const runtimeScopePrefix = runtimeScopeKey
    ? `${runtimeScopeKey}:${runtimeIntentType ?? "ingress"}`
    : undefined;
  const providerKeyCandidates = [
    metadata.providerMessageId,
    metadata.providerEventId,
    metadata.eventId,
    metadata.messageId,
    metadata.deliveryId,
    metadata.webhookEventId,
  ];
  const routePartitionKey = deriveInboundRoutePartitionKey(args.channelRouteIdentity);
  for (const candidate of providerKeyCandidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      if (runtimeScopePrefix) {
        return [
          "provider",
          args.organizationId,
          runtimeScopePrefix,
          candidate.trim(),
        ].join(":");
      }
      return [
        "provider",
        args.organizationId,
        args.channel,
        routePartitionKey,
        args.externalContactIdentifier,
        candidate.trim(),
      ].join(":");
    }
  }

  if (runtimeScopePrefix && runtimePayloadHash) {
    return `scope:${runtimeScopePrefix}:${runtimePayloadHash}`;
  }

  const metadataTimestampCandidate = [
    metadata.timestamp,
    metadata.receivedAt,
    metadata.providerTimestamp,
  ].find((value) => typeof value === "number") as number | undefined;
  const timeBucket =
    typeof metadataTimestampCandidate === "number"
      ? Math.floor(metadataTimestampCandidate / 1000)
      : Math.floor(Date.now() / 1000);

  const normalizedMessage = args.message
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 240);
  const base =
    `${args.organizationId}:${args.channel}:${routePartitionKey}:` +
    `${args.externalContactIdentifier}:${timeBucket}:${normalizedMessage}:` +
    `${runtimeScopePrefix ?? "scope:legacy"}`;

  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = ((hash << 5) - hash) + base.charCodeAt(i);
    hash |= 0;
  }

  return `auto:${Math.abs(hash).toString(36)}:${base.length}`;
}

function buildTerminalDeliverablePointer(args: {
  deliveryResult: {
    skipped: boolean;
    delivered: boolean;
    queuedToDeadLetter: boolean;
    deadLetterEntryId?: string;
  };
  sessionId: Id<"agentSessions">;
  turnId: Id<"agentTurns">;
}): {
  pointerType: string;
  pointerId: string;
  status: "success" | "failed";
  recordedAt: number;
} {
  const now = Date.now();

  if (args.deliveryResult.delivered) {
    return {
      pointerType: "channel_delivery",
      pointerId: `session:${args.sessionId}:turn:${args.turnId}`,
      status: "success",
      recordedAt: now,
    };
  }

  if (args.deliveryResult.queuedToDeadLetter) {
    return {
      pointerType: "dead_letter_queue",
      pointerId:
        args.deliveryResult.deadLetterEntryId
        ?? `session:${args.sessionId}:turn:${args.turnId}:dlq`,
      status: "failed",
      recordedAt: now,
    };
  }

  if (args.deliveryResult.skipped) {
    return {
      pointerType: "outbound_skipped",
      pointerId: `session:${args.sessionId}:turn:${args.turnId}`,
      status: "success",
      recordedAt: now,
    };
  }

  return {
    pointerType: "delivery_unconfirmed",
    pointerId: `session:${args.sessionId}:turn:${args.turnId}`,
    status: "failed",
    recordedAt: now,
  };
}

interface TurnLeaseAcquireArgs {
  turnId: Id<"agentTurns">;
  sessionId: Id<"agentSessions">;
  agentId: Id<"objects">;
  organizationId: Id<"organizations">;
  leaseOwner: string;
  expectedVersion: number;
  leaseDurationMs?: number;
  queueConcurrencyKey?: string;
}

interface TurnLeaseHeartbeatArgs {
  turnId: Id<"agentTurns">;
  expectedVersion: number;
  leaseToken: string;
  leaseDurationMs?: number;
}

async function acquireTurnLease(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: TurnLeaseAcquireArgs
): Promise<TurnLeaseMutationResult> {
  return await ctx.runMutation(
    getInternal().ai.agentSessions.acquireTurnLease,
    args
  ) as TurnLeaseMutationResult;
}

async function heartbeatTurnLease(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: TurnLeaseHeartbeatArgs
): Promise<TurnLeaseMutationResult> {
  return await ctx.runMutation(
    getInternal().ai.agentSessions.heartbeatTurnLease,
    args
  ) as TurnLeaseMutationResult;
}

async function releaseTurnLease(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: TurnLeaseReleaseArgs
): Promise<TurnLeaseMutationResult> {
  return await ctx.runMutation(
    getInternal().ai.agentSessions.releaseTurnLease,
    args
  ) as TurnLeaseMutationResult;
}

async function failTurnLease(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: TurnLeaseFailArgs
): Promise<TurnLeaseMutationResult> {
  return await ctx.runMutation(
    getInternal().ai.agentSessions.failTurnLease,
    args
  ) as TurnLeaseMutationResult;
}

// filterToolsForAgent — REMOVED
// Replaced by resolveActiveTools() in convex/ai/toolScoping.ts
// which implements 4-layer scoping: platform → org → agent → session

function formatAssistantContentForDelivery(
  channel: string,
  content: string,
  metadata: Record<string, unknown>
): string {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return content;
  }

  if (channel !== "slack") {
    return content;
  }

  const slackInvocationType =
    typeof metadata.slackInvocationType === "string"
      ? metadata.slackInvocationType
      : undefined;
  const slackUserId =
    typeof metadata.slackUserId === "string"
      ? metadata.slackUserId.trim()
      : "";

  if (slackInvocationType === "slash_command" && slackUserId) {
    return `<@${slackUserId}> ${trimmedContent}`;
  }

  return trimmedContent;
}

/**
 * Parse extraction results from LLM response (interview mode).
 * Looks for ```extraction code blocks containing JSON.
 */
function parseExtractionResults(content: string): Array<{
  field: string;
  value: unknown;
  confidence: number;
  needsFollowUp: boolean;
  followUpReason?: string;
}> {
  const results: Array<{
    field: string;
    value: unknown;
    confidence: number;
    needsFollowUp: boolean;
    followUpReason?: string;
  }> = [];

  // Match ```extraction ... ``` blocks
  const extractionBlockRegex = /```extraction\s*([\s\S]*?)```/gi;
  let match;

  while ((match = extractionBlockRegex.exec(content)) !== null) {
    const jsonContent = match[1].trim();
    try {
      const parsed = JSON.parse(jsonContent);

      // Handle single extraction or array of extractions
      const extractions = Array.isArray(parsed) ? parsed : [parsed];

      for (const extraction of extractions) {
        if (extraction.field && extraction.value !== undefined) {
          results.push({
            field: extraction.field,
            value: extraction.value,
            confidence: extraction.confidence ?? 0.8,
            needsFollowUp: extraction.needsFollowUp ?? false,
            followUpReason: extraction.followUpReason,
          });
        }
      }
    } catch {
      // Invalid JSON in extraction block - skip it
      console.warn("[AgentExecution] Failed to parse extraction block:", jsonContent);
    }
  }

  return results;
}
