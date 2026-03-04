/**
 * AI Chat Action
 *
 * Main entry point for AI conversations using provider adapters
 */

import { action, internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v, ConvexError } from "convex/values";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");
import { getToolSchemas, executeTool } from "./tools/registry";
import { calculateCostFromUsage } from "./modelPricing";
import { getAgentMessageCost } from "../credits/index";
import {
  buildEnvApiKeysByProvider,
  detectProvider,
  formatToolResult,
  formatToolError,
  getProviderConfig,
  resolveAuthProfileBaseUrl,
} from "./modelAdapters";
import {
  SAFE_FALLBACK_MODEL_ID,
  determineModelSelectionSource,
  isModelAllowedForOrg,
  normalizeCanonicalBillingSource,
  resolveOrgDefaultModel,
  resolveRequestedModel,
  selectFirstPlatformEnabledModel,
} from "./modelPolicy";
import { evaluateRoutingCapabilityRequirements } from "./modelEnablementGates";
import {
  buildAuthProfileFailureCountMap,
  resolveAuthProfilesForProvider,
} from "./authProfilePolicy";
import { shouldRequireToolApproval, type ToolApprovalAutonomyLevel } from "./escalation";
import { getFeatureRequestMessage, detectUserLanguage } from "./i18nHelper";
import { getPageBuilderPrompt } from "./prompts/pageBuilderSystem";
import { composeKnowledgeContract } from "./systemKnowledge";
import {
  normalizeToolCallsForProvider,
  parseToolCallArguments,
} from "./toolBroker";
import {
  buildOpenRouterMessages,
  executeChatCompletionWithFailover,
  type ChatRuntimeFailoverResult,
} from "./chatRuntimeOrchestration";
import { normalizeConversationRoutingPin } from "./conversations";
import { evaluateSessionRoutingPinUpdate } from "./sessionRoutingPolicy";
import {
  TRUST_EVENT_TAXONOMY_VERSION,
  validateTrustEventPayload,
  type TrustEventPayload,
} from "./trustEvents";
import {
  classifyVoiceProviderFailureReason,
  normalizeVoiceRuntimeTelemetryContract,
  type VoiceRuntimeTelemetryContract,
  type VoiceRuntimeTelemetryEvent,
} from "./trustTelemetry";
import { ONBOARDING_DEFAULT_MODEL_ID } from "./modelDefaults";
import {
  SUPER_ADMIN_AGENT_QA_MODE_VERSION,
  resolveSuperAdminAgentQaDeniedReason,
  type ActionCompletionQaDiagnostics,
} from "./qaModeContracts";
import {
  SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
  SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE,
} from "./samanthaAuditContract";

// Type definitions for OpenRouter API
interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
  // tool_calls format varies between API and DB storage
  tool_calls?: unknown;
  tool_call_id?: string;
}

/**
 * Generate a session title from the first user message
 * Creates a concise, descriptive title based on the context
 */
function generateSessionTitle(
  message: string,
  context?: "normal" | "page_builder" | "layers_builder"
): string {
  // Strip any mode prefixes like [PLANNING MODE] or [DOCS MODE]
  const cleanMessage = message
    .replace(/^\[(PLANNING MODE|DOCS MODE)[^\]]*\]\s*/i, "")
    .replace(/^---[\s\S]*?---\s*/, "") // Remove attached content blocks
    .trim();

  // Extract the core intent (first sentence or up to 60 chars)
  let title = cleanMessage.split(/[.!?\n]/)[0].trim();

  // If too long, truncate intelligently
  if (title.length > 60) {
    // Try to break at a word boundary
    const truncated = title.substring(0, 57);
    const lastSpace = truncated.lastIndexOf(" ");
    title = lastSpace > 30 ? truncated.substring(0, lastSpace) + "..." : truncated + "...";
  }

  // Add context prefix for page builder sessions
  if (context === "page_builder") {
    // Check for common patterns and create descriptive titles
    const lowerMessage = cleanMessage.toLowerCase();

    if (lowerMessage.includes("landing page")) {
      const match = cleanMessage.match(/landing page (?:for |about )?(?:a |an |my )?([^.!?\n]+)/i);
      if (match) {
        title = `Landing: ${match[1].substring(0, 40)}${match[1].length > 40 ? "..." : ""}`;
      }
    } else if (lowerMessage.includes("contact form") || lowerMessage.includes("form")) {
      title = title.startsWith("Create") ? title : `Form: ${title}`;
    } else if (lowerMessage.includes("dashboard")) {
      title = title.startsWith("Create") ? title : `Dashboard: ${title}`;
    } else if (lowerMessage.includes("portfolio")) {
      title = `Portfolio: ${title.replace(/portfolio/i, "").trim() || "Personal"}`;
    }
  }

  // Fallback if title is empty
  if (!title || title.length < 3) {
    title = context === "page_builder" ? "New Page" : "New Chat";
  }

  return title;
}

interface ToolCallFromAPI {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: ToolCallFromAPI[];
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  structuredOutput?: {
    format: "json_object" | "json_code_block";
    value: unknown;
  };
}

interface ToolCallResult {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result: unknown;
  status: "success" | "failed" | "pending_approval";
  error?: string;
}

interface ConversationMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  attachments?: Array<{
    _id: Id<"aiMessageAttachments">;
    kind: "image";
    storageId: Id<"_storage">;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    url?: string;
  }>;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
    status: "success" | "failed";
    error?: string;
  }>;
}

interface ModelResolutionPayload {
  requestedModel?: string;
  selectedModel: string;
  usedModel?: string;
  selectedAuthProfileId?: string;
  usedAuthProfileId?: string;
  selectionSource: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

interface SuperAdminAgentQaRuntimeContract {
  enabled: boolean;
  targetAgentId?: Id<"objects">;
  targetTemplateRole?: string;
  label?: string;
  sessionId?: string;
  runId?: string;
  sourceSessionToken?: string;
  sourceAuditChannel?: "webchat" | "native_guest";
  ingressChannel?: string;
  originSurface?: string;
}

const QA_SAMANTHA_AUDIT_QUESTION_ORDER = [
  "business_revenue",
  "team_size",
  "monday_priority",
  "delegation_gap",
  "reclaimed_time",
] as const;
type QaSamanthaAuditQuestionId = (typeof QA_SAMANTHA_AUDIT_QUESTION_ORDER)[number];

const QA_SAMANTHA_AUDIT_DEFAULT_ANSWERS: Record<QaSamanthaAuditQuestionId, string> = {
  business_revenue: "Service business at approximately €1.2M ARR.",
  team_size: "8",
  monday_priority: "Triage inbound client operations and missed follow-ups.",
  delegation_gap: "Escalation handling for high-priority founder-level exceptions.",
  reclaimed_time: "10 hours weekly on growth partnerships and product improvements.",
};

interface ResolvedSendAttachment {
  attachmentId: Id<"aiMessageAttachments">;
  kind: "image";
  storageId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  url: string;
}

interface SendAttachmentReferenceInput {
  attachmentId: Id<"aiMessageAttachments">;
}

interface SendInlineAttachmentInput {
  type: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
  uri?: string;
  sourceId?: string;
  width?: number;
  height?: number;
}

type SendAttachmentInput = SendAttachmentReferenceInput | SendInlineAttachmentInput;

interface ChatCollaborationRouteInput {
  surface: "group" | "dm";
  dmThreadId?: string;
  specialistAgentId?: string;
  specialistLabel?: string;
}

interface StoredMessageCollaboration {
  surface: "group" | "dm";
  threadType: "group_thread" | "dm_thread";
  threadId: string;
  groupThreadId: string;
  dmThreadId?: string;
  lineageId?: string;
  correlationId?: string;
  workflowKey?: string;
  authorityIntentType?: "read_only" | "proposal" | "commit";
  visibilityScope: "group" | "dm" | "operator_only" | "system";
  specialistAgentId?: string;
  specialistLabel?: string;
}

interface OperatorCollaborationDefaultsPolicy {
  defaultSurface: "group" | "dm";
  allowSpecialistDmRouting: boolean;
  proposalOnlyDmActions: boolean;
}

export const MACOS_COMPANION_INGRESS_TRUST_EVENT_NAME =
  "trust.runtime.macos_companion_ingress_observed.v1" as const;
export const MACOS_COMPANION_DELIVERY_FAILED_TRUST_EVENT_NAME =
  "trust.runtime.macos_companion_delivery_failed.v1" as const;

const MACOS_COMPANION_OBSERVABILITY_POLICY_TYPE = "macos_companion_observability";
const MACOS_COMPANION_OBSERVABILITY_POLICY_ID = "mcr_012_observability_v1";
const MACOS_COMPANION_OBSERVABILITY_TOOL_NAME = "macos_companion_runtime";

type MacosCompanionTrustEventName =
  | typeof MACOS_COMPANION_INGRESS_TRUST_EVENT_NAME
  | typeof MACOS_COMPANION_DELIVERY_FAILED_TRUST_EVENT_NAME;

interface MacosCompanionRuntimeToolResult {
  tool: string;
  status: string;
  result?: unknown;
  error?: string;
}

interface BuildMacosCompanionObservabilityPayloadArgs {
  eventName: MacosCompanionTrustEventName;
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  conversationId: Id<"aiConversations">;
  sessionId: Id<"agentSessions">;
  runtimeStatus: string;
  toolResults?: MacosCompanionRuntimeToolResult[];
  liveSessionId?: string;
  cameraRuntime?: unknown;
  voiceRuntime?: unknown;
  transportRuntime?: unknown;
  avObservability?: unknown;
  geminiLive?: unknown;
  deliveryFailureReason?: string;
  occurredAt?: number;
}

function supportsVisionCapability(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const matrix = value as Record<string, unknown>;
  return matrix.vision === true;
}

function normalizeNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeSuperAdminQaMode(
  value: unknown
): SuperAdminAgentQaRuntimeContract | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const enabled = record.enabled === true;
  if (!enabled) {
    return undefined;
  }
  const sourceAuditChannelRaw = normalizeNonEmptyString(record.sourceAuditChannel);
  const sourceAuditChannel = sourceAuditChannelRaw === "native_guest"
    ? "native_guest"
    : sourceAuditChannelRaw === "webchat"
      ? "webchat"
      : undefined;
  return {
    enabled: true,
    targetAgentId: normalizeNonEmptyString(record.targetAgentId) as Id<"objects"> | undefined,
    targetTemplateRole: normalizeNonEmptyString(record.targetTemplateRole),
    label: normalizeNonEmptyString(record.label),
    sessionId: normalizeNonEmptyString(record.sessionId),
    runId: normalizeNonEmptyString(record.runId),
    sourceSessionToken: normalizeNonEmptyString(record.sourceSessionToken),
    sourceAuditChannel,
    ingressChannel: normalizeNonEmptyString(record.ingressChannel),
    originSurface: normalizeNonEmptyString(record.originSurface),
  };
}

function isSamanthaQaTemplateRole(value: string | undefined): boolean {
  return value === SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE
    || value === SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE;
}

async function ensureSamanthaQaAuditSessionSeed(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  sourceAuditChannel: "webchat" | "native_guest";
  sourceSessionToken: string;
  runId?: string;
}): Promise<void> {
  await args.ctx.runMutation(
    generatedApi.internal.onboarding.auditMode.startAuditModeSession,
    {
      organizationId: args.organizationId,
      agentId: args.agentId,
      channel: args.sourceAuditChannel,
      sessionToken: args.sourceSessionToken,
      metadata: {
        source: "ai.chat.sendMessage.samantha_qa_seed",
        qaRunId: args.runId,
      },
    },
  );

  let loopGuard = 0;
  while (loopGuard < QA_SAMANTHA_AUDIT_QUESTION_ORDER.length + 2) {
    loopGuard += 1;
    const resumed = await args.ctx.runQuery(
      generatedApi.internal.onboarding.auditMode.resumeAuditModeSession,
      {
        organizationId: args.organizationId,
        channel: args.sourceAuditChannel,
        sessionToken: args.sourceSessionToken,
      },
    ) as { session?: { currentQuestionId?: QaSamanthaAuditQuestionId } } | null;
    const currentQuestionId = resumed?.session?.currentQuestionId;
    if (!currentQuestionId) {
      break;
    }
    const answer = QA_SAMANTHA_AUDIT_DEFAULT_ANSWERS[currentQuestionId];
    if (!answer) {
      break;
    }
    const answerResult = await args.ctx.runMutation(
      generatedApi.internal.onboarding.auditMode.answerAuditModeQuestion,
      {
        organizationId: args.organizationId,
        channel: args.sourceAuditChannel,
        sessionToken: args.sourceSessionToken,
        questionId: currentQuestionId,
        answer,
        metadata: {
          source: "ai.chat.sendMessage.samantha_qa_seed",
          qaRunId: args.runId,
        },
      },
    ) as { success?: boolean; errorCode?: string } | null;
    if (!answerResult?.success && answerResult?.errorCode !== "question_already_answered") {
      break;
    }
  }

  await args.ctx.runMutation(
    generatedApi.internal.onboarding.auditMode.completeAuditModeSession,
    {
      organizationId: args.organizationId,
      channel: args.sourceAuditChannel,
      sessionToken: args.sourceSessionToken,
      workflowRecommendation:
        "Automate first-response triage and escalation routing to recover founder capacity while preserving quality.",
      metadata: {
        source: "ai.chat.sendMessage.samantha_qa_seed",
        qaRunId: args.runId,
      },
    },
  );
}

function normalizeRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
}

const LIVE_SESSION_EXECUTION_LANE_CONTRACT_VERSION =
  "live_session_execution_lane_v1" as const;

const CONVERSATION_RUNTIME_STATES = new Set([
  "idle",
  "connecting",
  "live",
  "reconnecting",
  "ending",
  "ended",
  "error",
] as const);

const CONVERSATION_RUNTIME_MODES = new Set(["voice", "voice_with_eyes"] as const);

interface LiveSessionExecutionLaneMetadata {
  contractVersion: typeof LIVE_SESSION_EXECUTION_LANE_CONTRACT_VERSION;
  liveSessionId?: string;
  state?: string;
  mode?: string;
  sourceMode?: string;
  approvalInvariant: "non_bypassable";
  mcpOrchestration: {
    enabled: boolean;
    route: "session_scoped_mcp";
  };
  handoff?: {
    fromAgentId?: string;
    toAgentId?: string;
    handoffId?: string;
    reason?: string;
  };
}

export function resolveLiveSessionExecutionLaneMetadata(args: {
  liveSessionId?: unknown;
  conversationRuntime?: unknown;
  commandPolicy?: unknown;
}): LiveSessionExecutionLaneMetadata | undefined {
  const runtime = normalizeRecord(args.conversationRuntime);
  const policy = normalizeRecord(args.commandPolicy);
  if (!runtime && !policy && !args.liveSessionId) {
    return undefined;
  }

  const mode = normalizeNonEmptyString(runtime?.mode);
  const normalizedMode = mode && CONVERSATION_RUNTIME_MODES.has(mode as "voice")
    ? mode
    : undefined;
  const state = normalizeNonEmptyString(runtime?.state);
  const normalizedState =
    state && CONVERSATION_RUNTIME_STATES.has(state as "idle")
      ? state
      : undefined;
  const sourceMode =
    normalizeNonEmptyString(runtime?.sourceMode)
    ?? normalizeNonEmptyString(runtime?.requestedEyesSource);
  const handoff = normalizeRecord(runtime?.agentHandoff) ?? normalizeRecord(runtime?.handoff);
  const mcp = normalizeRecord(runtime?.mcpOrchestration) ?? normalizeRecord(runtime?.mcp);
  const attemptedCommands = Array.isArray(policy?.attemptedCommands)
    ? policy.attemptedCommands.filter((token): token is string => typeof token === "string")
    : [];
  const mcpEnabled =
    mcp?.enabled === true
    || mcp?.required === true
    || attemptedCommands.some((token) => token.toLowerCase().includes("mcp"));

  return {
    contractVersion: LIVE_SESSION_EXECUTION_LANE_CONTRACT_VERSION,
    liveSessionId:
      normalizeNonEmptyString(args.liveSessionId)
      ?? normalizeNonEmptyString(runtime?.liveSessionId),
    state: normalizedState,
    mode: normalizedMode,
    sourceMode,
    approvalInvariant: "non_bypassable",
    mcpOrchestration: {
      enabled: mcpEnabled,
      route: "session_scoped_mcp",
    },
    handoff: handoff
      ? {
          fromAgentId:
            normalizeNonEmptyString(handoff.fromAgentId)
            ?? normalizeNonEmptyString(handoff.fromAgent),
          toAgentId:
            normalizeNonEmptyString(handoff.toAgentId)
            ?? normalizeNonEmptyString(handoff.toAgent),
          handoffId:
            normalizeNonEmptyString(handoff.handoffId)
            ?? normalizeNonEmptyString(handoff.id),
          reason: normalizeNonEmptyString(handoff.reason),
        }
      : undefined,
  };
}

const VOICE_TRUST_ADAPTIVE_EVENT_NAME =
  "trust.voice.adaptive_flow_decision.v1" as const;
const VOICE_TRUST_FAILOVER_EVENT_NAME =
  "trust.voice.runtime_failover_triggered.v1" as const;

type VoiceRuntimeTelemetryTrustEventName =
  | typeof VOICE_TRUST_ADAPTIVE_EVENT_NAME
  | typeof VOICE_TRUST_FAILOVER_EVENT_NAME;

interface PersistedVoiceRuntimeTelemetryTrustEvent {
  eventName: VoiceRuntimeTelemetryTrustEventName;
  payload: TrustEventPayload;
}

function normalizeVoiceRuntimeProviderToken(value: unknown): string {
  const normalized = normalizeNonEmptyString(value)?.toLowerCase();
  if (!normalized) {
    return "browser";
  }
  return normalized.replace(/[^a-z0-9_:-]/g, "_");
}

function resolveVoiceRuntimeTelemetryContractFromInbound(args: {
  liveSessionId?: unknown;
  voiceRuntime?: unknown;
  transportRuntime?: unknown;
  avObservability?: unknown;
}): VoiceRuntimeTelemetryContract | null {
  const transportRuntime = normalizeRecord(args.transportRuntime);
  const voiceTransportRuntime = normalizeRecord(transportRuntime?.voiceTransportRuntime);
  const voiceRuntime = normalizeRecord(args.voiceRuntime);
  const avObservability = normalizeRecord(args.avObservability);
  const telemetryCandidate =
    voiceTransportRuntime?.telemetry
    ?? transportRuntime?.telemetry
    ?? avObservability?.voiceRuntimeTelemetry;
  if (!telemetryCandidate || typeof telemetryCandidate !== "object") {
    return null;
  }

  const normalizedLiveSessionId =
    normalizeNonEmptyString((telemetryCandidate as Record<string, unknown>).liveSessionId)
    ?? normalizeNonEmptyString(args.liveSessionId)
    ?? normalizeNonEmptyString(voiceRuntime?.liveSessionId);
  const normalizedVoiceSessionId =
    normalizeNonEmptyString((telemetryCandidate as Record<string, unknown>).voiceSessionId)
    ?? normalizeNonEmptyString(voiceRuntime?.voiceSessionId)
    ?? normalizeNonEmptyString(avObservability?.voiceSessionId);
  if (!normalizedLiveSessionId || !normalizedVoiceSessionId) {
    return null;
  }
  return normalizeVoiceRuntimeTelemetryContract({
    ...(telemetryCandidate as Record<string, unknown>),
    liveSessionId: normalizedLiveSessionId,
    voiceSessionId: normalizedVoiceSessionId,
    interviewSessionId:
      normalizeNonEmptyString((telemetryCandidate as Record<string, unknown>).interviewSessionId)
      ?? normalizeNonEmptyString(voiceRuntime?.interviewSessionId),
  });
}

function buildAdaptiveDecisionFromTelemetryEvent(event: VoiceRuntimeTelemetryEvent): {
  phaseId: string;
  decision: string;
  confidence: number;
} {
  const payload = normalizeRecord(event.payload);
  if (event.eventType === "latency_checkpoint") {
    const stage = normalizeNonEmptyString(payload?.stage) ?? "latency";
    const breached = payload?.breached === true;
    return {
      phaseId: `latency:${stage}`,
      decision: breached ? "latency_budget_breached" : "latency_budget_ok",
      confidence: breached ? 0.3 : 0.95,
    };
  }
  if (event.eventType === "interruption") {
    const source = normalizeNonEmptyString(payload?.source) ?? "unknown_source";
    const reasonCode = normalizeNonEmptyString(payload?.reasonCode) ?? "unknown_reason";
    return {
      phaseId: `interruption:${source}`,
      decision: `interruption:${reasonCode}`,
      confidence: 0.9,
    };
  }
  if (event.eventType === "reconnect") {
    const phase = normalizeNonEmptyString(payload?.phase) ?? "attempt";
    const reasonCode = normalizeNonEmptyString(payload?.reasonCode) ?? "no_reason";
    return {
      phaseId: `reconnect:${phase}`,
      decision: `reconnect:${phase}:${reasonCode}`,
      confidence: phase === "succeeded" ? 0.95 : 0.5,
    };
  }
  if (event.eventType === "fallback_transition") {
    const fromTransport = normalizeNonEmptyString(payload?.fromTransport) ?? "unknown";
    const toTransport = normalizeNonEmptyString(payload?.toTransport) ?? "unknown";
    const reasonCode = normalizeNonEmptyString(payload?.reasonCode) ?? "unknown_reason";
    return {
      phaseId: `fallback:${fromTransport}->${toTransport}`,
      decision: `fallback:${reasonCode}`,
      confidence: 0.85,
    };
  }
  return {
    phaseId: "runtime",
    decision: event.eventType,
    confidence: 0.75,
  };
}

export function buildVoiceRuntimeTelemetryTrustEventPayloads(args: {
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  sessionId: Id<"agentSessions">;
  channel: string;
  liveSessionId?: unknown;
  voiceRuntime?: unknown;
  transportRuntime?: unknown;
  avObservability?: unknown;
  occurredAt?: number;
}): PersistedVoiceRuntimeTelemetryTrustEvent[] {
  const contract = resolveVoiceRuntimeTelemetryContractFromInbound({
    liveSessionId: args.liveSessionId,
    voiceRuntime: args.voiceRuntime,
    transportRuntime: args.transportRuntime,
    avObservability: args.avObservability,
  });
  if (!contract || contract.events.length === 0) {
    return [];
  }

  const voiceRuntime = normalizeRecord(args.voiceRuntime);
  const baselineProviderId = normalizeVoiceRuntimeProviderToken(
    voiceRuntime?.providerId
  );
  const baseOccurredAt =
    typeof args.occurredAt === "number" && Number.isFinite(args.occurredAt)
      ? Math.floor(args.occurredAt)
      : Date.now();
  const events: PersistedVoiceRuntimeTelemetryTrustEvent[] = [];

  for (const event of contract.events) {
    const payload = normalizeRecord(event.payload);
    if (event.eventType === "provider_failure") {
      const runtimeProvider = normalizeVoiceRuntimeProviderToken(
        payload?.providerId ?? baselineProviderId
      );
      const fallbackProvider = normalizeVoiceRuntimeProviderToken(
        payload?.fallbackProviderId ?? "browser"
      );
      const failureClassification = classifyVoiceProviderFailureReason(
        payload?.reasonCode
      );
      events.push({
        eventName: VOICE_TRUST_FAILOVER_EVENT_NAME,
        payload: {
          event_id: `${VOICE_TRUST_FAILOVER_EVENT_NAME}:${event.eventId}:${baseOccurredAt}`,
          event_version: TRUST_EVENT_TAXONOMY_VERSION,
          occurred_at: event.occurredAtMs || baseOccurredAt,
          org_id: args.organizationId,
          mode: "runtime",
          channel: args.channel,
          session_id: String(args.sessionId),
          actor_type: "user",
          actor_id: String(args.userId),
          voice_session_id: contract.voiceSessionId,
          voice_runtime_provider: runtimeProvider,
          voice_failover_provider: fallbackProvider,
          voice_failover_reason: failureClassification.reasonCode,
          voice_provider_health_status: failureClassification.healthStatus,
        },
      });
      continue;
    }

    const adaptive = buildAdaptiveDecisionFromTelemetryEvent(event);
    events.push({
      eventName: VOICE_TRUST_ADAPTIVE_EVENT_NAME,
      payload: {
        event_id: `${VOICE_TRUST_ADAPTIVE_EVENT_NAME}:${event.eventId}:${baseOccurredAt}`,
        event_version: TRUST_EVENT_TAXONOMY_VERSION,
        occurred_at: event.occurredAtMs || baseOccurredAt,
        org_id: args.organizationId,
        mode: "runtime",
        channel: args.channel,
        session_id: String(args.sessionId),
        actor_type: "user",
        actor_id: String(args.userId),
        voice_session_id: contract.voiceSessionId,
        adaptive_phase_id: adaptive.phaseId,
        adaptive_decision: adaptive.decision,
        adaptive_confidence: adaptive.confidence,
        consent_checkpoint_id: contract.contractVersion,
      },
    });
  }

  return events;
}

function appendMacosCompanionFallbackReason(
  reasons: Set<string>,
  value: unknown
) {
  const normalized = normalizeNonEmptyString(value);
  if (normalized) {
    reasons.add(normalized);
  }
}

function appendMacosCompanionFallbackReasonList(
  reasons: Set<string>,
  value: unknown
) {
  if (!Array.isArray(value)) {
    return;
  }
  for (const entry of value) {
    appendMacosCompanionFallbackReason(reasons, entry);
  }
}

function collectMacosCompanionFallbackReasons(args: {
  cameraRuntime?: unknown;
  voiceRuntime?: unknown;
  transportRuntime?: unknown;
  avObservability?: unknown;
}): string[] {
  const reasons = new Set<string>();
  const cameraRuntime = normalizeRecord(args.cameraRuntime);
  const voiceRuntime = normalizeRecord(args.voiceRuntime);
  const transportRuntime = normalizeRecord(args.transportRuntime);
  const transportObservability = normalizeRecord(transportRuntime?.observability);
  const avObservability = normalizeRecord(args.avObservability);

  appendMacosCompanionFallbackReason(reasons, cameraRuntime?.fallbackReason);
  appendMacosCompanionFallbackReason(reasons, cameraRuntime?.stopReason);
  appendMacosCompanionFallbackReason(reasons, voiceRuntime?.fallbackReason);
  appendMacosCompanionFallbackReason(reasons, voiceRuntime?.runtimeError);
  appendMacosCompanionFallbackReason(reasons, voiceRuntime?.transcriptionError);
  appendMacosCompanionFallbackReason(reasons, transportRuntime?.fallbackReason);
  appendMacosCompanionFallbackReason(reasons, transportObservability?.fallbackReason);
  appendMacosCompanionFallbackReason(reasons, avObservability?.fallbackReason);
  appendMacosCompanionFallbackReasonList(
    reasons,
    transportObservability?.fallbackTransitionReasons
  );
  appendMacosCompanionFallbackReasonList(
    reasons,
    avObservability?.fallbackTransitionReasons
  );

  return Array.from(reasons).sort();
}

function collectMacosCompanionApprovalIds(
  toolResults: MacosCompanionRuntimeToolResult[] | undefined
): string[] {
  if (!toolResults || toolResults.length === 0) {
    return [];
  }

  const ids = new Set<string>();
  for (const result of toolResults) {
    const payload = normalizeRecord(result.result);
    if (!payload) {
      continue;
    }
    const approvalId =
      normalizeNonEmptyString(payload.approvalId) ??
      normalizeNonEmptyString(payload.approvalArtifactId) ??
      normalizeNonEmptyString(payload.executionId) ??
      normalizeNonEmptyString(payload.requestId);
    if (approvalId) {
      ids.add(approvalId);
    }
  }

  return Array.from(ids).sort();
}

function resolveMacosCompanionApprovalStatus(
  toolResults: MacosCompanionRuntimeToolResult[] | undefined
): string {
  if (!toolResults || toolResults.length === 0) {
    return "none";
  }
  if (toolResults.some((result) => result.status === "pending_approval")) {
    return "pending";
  }
  if (toolResults.some((result) => result.status === "failed")) {
    return "failed_or_missing";
  }
  if (toolResults.some((result) => result.status === "success")) {
    return "granted_or_not_required";
  }
  return "unknown";
}

function resolveMacosCompanionGateOutcome(args: {
  runtimeStatus: string;
  toolResults: MacosCompanionRuntimeToolResult[] | undefined;
}): string {
  if (
    args.runtimeStatus === "error"
    || args.runtimeStatus === "credits_exhausted"
    || args.runtimeStatus === "rate_limited"
  ) {
    return "blocked";
  }
  if (args.toolResults?.some((result) => result.status === "pending_approval")) {
    return "approval_required";
  }
  if (args.toolResults?.some((result) => result.status === "failed")) {
    return "executed_with_failures";
  }
  return "executed";
}

function resolveMacosCompanionVoiceSessionId(args: {
  voiceRuntime?: unknown;
  avObservability?: unknown;
}): string | undefined {
  const voiceRuntime = normalizeRecord(args.voiceRuntime);
  const avObservability = normalizeRecord(args.avObservability);
  return (
    normalizeNonEmptyString(voiceRuntime?.voiceSessionId) ??
    normalizeNonEmptyString(voiceRuntime?.sessionId) ??
    normalizeNonEmptyString(avObservability?.voiceSessionId)
  );
}

export function buildMacosCompanionObservabilityTrustPayload(
  args: BuildMacosCompanionObservabilityPayloadArgs
): TrustEventPayload {
  const occurredAt = typeof args.occurredAt === "number"
    ? Math.floor(args.occurredAt)
    : Date.now();
  const fallbackReasons = collectMacosCompanionFallbackReasons({
    cameraRuntime: args.cameraRuntime,
    voiceRuntime: args.voiceRuntime,
    transportRuntime: args.transportRuntime,
    avObservability: args.avObservability,
  });
  const approvalIds = collectMacosCompanionApprovalIds(args.toolResults);
  const approvalStatus = resolveMacosCompanionApprovalStatus(args.toolResults);
  const gateOutcome = resolveMacosCompanionGateOutcome({
    runtimeStatus: args.runtimeStatus,
    toolResults: args.toolResults,
  });
  const voiceSessionId = resolveMacosCompanionVoiceSessionId({
    voiceRuntime: args.voiceRuntime,
    avObservability: args.avObservability,
  });
  const liveSessionId =
    normalizeNonEmptyString(args.liveSessionId) ??
    normalizeNonEmptyString(normalizeRecord(args.avObservability)?.liveSessionId);

  const sourceObjectIds = [
    `conversation:${String(args.conversationId)}`,
    `agent_session:${String(args.sessionId)}`,
    liveSessionId ? `live_session:${liveSessionId}` : null,
    voiceSessionId ? `voice_session:${voiceSessionId}` : null,
  ].filter((value): value is string => Boolean(value));

  const decisionReason = fallbackReasons.length > 0
    ? `fallback:${fallbackReasons.join("|")}`
    : "fallback:none";
  const baseFailureReason =
    normalizeNonEmptyString(args.deliveryFailureReason) ??
    normalizeNonEmptyString(args.toolResults?.find((result) => result.status === "failed")?.error);
  const failureReason = baseFailureReason ?? "delivery_failure_unreported";
  const approvalId = approvalIds[0] ?? "none";

  return {
    event_id: `trust:${args.eventName}:${String(args.conversationId)}:${occurredAt}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: occurredAt,
    org_id: args.organizationId,
    mode: "runtime",
    channel: "desktop",
    session_id: String(args.sessionId),
    actor_type: "user",
    actor_id: String(args.userId),
    policy_type: MACOS_COMPANION_OBSERVABILITY_POLICY_TYPE,
    policy_id: MACOS_COMPANION_OBSERVABILITY_POLICY_ID,
    tool_name: MACOS_COMPANION_OBSERVABILITY_TOOL_NAME,
    enforcement_decision: gateOutcome,
    approval_id: approvalId,
    approval_status: approvalStatus,
    source_object_ids: sourceObjectIds,
    decision_reason: decisionReason,
    ...(args.eventName === MACOS_COMPANION_DELIVERY_FAILED_TRUST_EVENT_NAME
      ? { failure_reason: failureReason }
      : baseFailureReason
        ? { failure_reason: baseFailureReason }
        : {}),
  };
}

function isSendAttachmentReference(
  value: SendAttachmentInput
): value is SendAttachmentReferenceInput {
  return (
    "attachmentId" in value
    && typeof value.attachmentId === "string"
    && !("type" in value)
  );
}

function normalizeInlineSendAttachments(
  attachments: SendAttachmentInput[] | undefined
): SendInlineAttachmentInput[] {
  if (!attachments || attachments.length === 0) {
    return [];
  }
  const normalized: SendInlineAttachmentInput[] = [];
  for (const attachment of attachments) {
    if (!("type" in attachment)) {
      continue;
    }
    const type = normalizeNonEmptyString(attachment.type)?.toLowerCase();
    if (!type) {
      continue;
    }
    const normalizedAttachment: SendInlineAttachmentInput = { type };
    const name = normalizeNonEmptyString(attachment.name);
    if (name) {
      normalizedAttachment.name = name;
    }
    const mimeType = normalizeNonEmptyString(attachment.mimeType)?.toLowerCase();
    if (mimeType) {
      normalizedAttachment.mimeType = mimeType;
    }
    if (
      typeof attachment.sizeBytes === "number"
      && Number.isFinite(attachment.sizeBytes)
      && attachment.sizeBytes > 0
    ) {
      normalizedAttachment.sizeBytes = Math.max(1, Math.round(attachment.sizeBytes));
    }
    const url = normalizeNonEmptyString(attachment.url);
    if (url) {
      normalizedAttachment.url = url;
    }
    const uri = normalizeNonEmptyString(attachment.uri);
    if (uri) {
      normalizedAttachment.uri = uri;
    }
    const sourceId = normalizeNonEmptyString(attachment.sourceId);
    if (sourceId) {
      normalizedAttachment.sourceId = sourceId;
    }
    if (typeof attachment.width === "number" && Number.isFinite(attachment.width) && attachment.width > 0) {
      normalizedAttachment.width = Math.round(attachment.width);
    }
    if (typeof attachment.height === "number" && Number.isFinite(attachment.height) && attachment.height > 0) {
      normalizedAttachment.height = Math.round(attachment.height);
    }
    normalized.push(normalizedAttachment);
  }
  return normalized.slice(0, 8);
}

function normalizeChatCollaborationRoute(
  value: unknown
): ChatCollaborationRouteInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const surface = record.surface === "dm" ? "dm" : record.surface === "group" ? "group" : null;
  if (!surface) {
    return null;
  }

  const dmThreadId = normalizeNonEmptyString(record.dmThreadId);
  const specialistAgentId = normalizeNonEmptyString(record.specialistAgentId);
  const specialistLabel = normalizeNonEmptyString(record.specialistLabel);

  if (surface === "dm" && !dmThreadId) {
    return null;
  }

  return {
    surface,
    dmThreadId,
    specialistAgentId,
    specialistLabel,
  };
}

function normalizeOperatorCollaborationDefaultsPolicy(
  value: unknown
): OperatorCollaborationDefaultsPolicy {
  if (!value || typeof value !== "object") {
    return {
      defaultSurface: "group",
      allowSpecialistDmRouting: true,
      proposalOnlyDmActions: true,
    };
  }

  const record = value as Record<string, unknown>;
  return {
    defaultSurface: record.defaultSurface === "dm" ? "dm" : "group",
    allowSpecialistDmRouting:
      typeof record.allowSpecialistDmRouting === "boolean"
        ? record.allowSpecialistDmRouting
        : true,
    proposalOnlyDmActions:
      typeof record.proposalOnlyDmActions === "boolean"
        ? record.proposalOnlyDmActions
        : true,
  };
}

interface OperatorCollaborationCutoverConfig {
  shellEnabled: boolean;
  rolloutPercent: number;
  forceLegacyShell: boolean;
  cohortBucket: number;
  collaborationShellEnabled: boolean;
  reason:
    | "cutover_enabled"
    | "legacy_forced"
    | "cutover_disabled"
    | "cohort_holdback";
}

const OPERATOR_COLLAB_CUTOVER_ENABLED_ENV_KEYS = [
  "OPERATOR_COLLABORATION_SHELL_ENABLED",
] as const;
const OPERATOR_COLLAB_CUTOVER_ENABLED_LEGACY_ENV_KEYS = [
  "NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_ENABLED",
] as const;
const OPERATOR_COLLAB_CUTOVER_ROLLOUT_ENV_KEYS = [
  "OPERATOR_COLLABORATION_SHELL_ROLLOUT_PERCENT",
] as const;
const OPERATOR_COLLAB_CUTOVER_ROLLOUT_LEGACY_ENV_KEYS = [
  "NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_ROLLOUT_PERCENT",
] as const;
const OPERATOR_COLLAB_CUTOVER_FORCE_LEGACY_ENV_KEYS = [
  "OPERATOR_COLLABORATION_SHELL_FORCE_LEGACY",
] as const;
const OPERATOR_COLLAB_CUTOVER_FORCE_LEGACY_FALLBACK_ENV_KEYS = [
  "NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_FORCE_LEGACY",
] as const;
const STRICT_ENV_MAX_NAME_LENGTH = 39;

function buildProcessEnvSnapshot():
  | Record<string, string | undefined>
  | undefined {
  if (typeof process === "undefined" || typeof process.env !== "object") {
    return undefined;
  }
  try {
    // Snapshot once so legacy NEXT_PUBLIC_* keys remain readable in non-strict env runtimes.
    return { ...process.env };
  } catch {
    return undefined;
  }
}

function readEnvValueFromRecord(
  env: Record<string, string | undefined> | undefined,
  key: string
): string | undefined {
  if (!env) {
    return undefined;
  }
  const value = env[key];
  return typeof value === "string" ? value : undefined;
}

function readShortProcessEnvValue(key: string): string | undefined {
  if (
    typeof process === "undefined" ||
    typeof process.env !== "object" ||
    key.length > STRICT_ENV_MAX_NAME_LENGTH
  ) {
    return undefined;
  }
  const value = process.env[key];
  return typeof value === "string" ? value : undefined;
}

function readFirstDefinedEnvValue(
  args: {
    primaryKeys: readonly string[];
    legacyKeys?: readonly string[];
    env?: Record<string, string | undefined>;
  }
): string | undefined {
  const env = args.env ?? buildProcessEnvSnapshot();
  for (const key of args.primaryKeys) {
    const value =
      readEnvValueFromRecord(env, key) ??
      (args.env ? undefined : readShortProcessEnvValue(key));
    if (typeof value === "string") {
      return value;
    }
  }
  for (const key of args.legacyKeys ?? []) {
    const value = readEnvValueFromRecord(env, key);
    if (typeof value === "string") {
      return value;
    }
  }
  return undefined;
}

function parseEnvBoolean(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return fallback;
}

function parseEnvPercent(value: string | undefined, fallback: number): number {
  if (typeof value !== "string") {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (parsed < 0) {
    return 0;
  }
  if (parsed > 100) {
    return 100;
  }
  return parsed;
}

function hashSeedToPercent(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

export function resolveOperatorCollaborationCutoverConfig(args: {
  organizationId: Id<"organizations"> | string;
  conversationId: Id<"aiConversations"> | string;
  env?: Record<string, string | undefined>;
}): OperatorCollaborationCutoverConfig {
  const shellEnabled = parseEnvBoolean(
    readFirstDefinedEnvValue({
      primaryKeys: OPERATOR_COLLAB_CUTOVER_ENABLED_ENV_KEYS,
      legacyKeys: OPERATOR_COLLAB_CUTOVER_ENABLED_LEGACY_ENV_KEYS,
      env: args.env,
    }),
    true
  );
  const rolloutPercent = parseEnvPercent(
    readFirstDefinedEnvValue({
      primaryKeys: OPERATOR_COLLAB_CUTOVER_ROLLOUT_ENV_KEYS,
      legacyKeys: OPERATOR_COLLAB_CUTOVER_ROLLOUT_LEGACY_ENV_KEYS,
      env: args.env,
    }),
    100
  );
  const forceLegacyShell = parseEnvBoolean(
    readFirstDefinedEnvValue({
      primaryKeys: OPERATOR_COLLAB_CUTOVER_FORCE_LEGACY_ENV_KEYS,
      legacyKeys: OPERATOR_COLLAB_CUTOVER_FORCE_LEGACY_FALLBACK_ENV_KEYS,
      env: args.env,
    }),
    false
  );
  const seed = `operator_collab_shell:${String(args.organizationId)}:${String(args.conversationId)}`;
  const cohortBucket = hashSeedToPercent(seed);
  const inRolloutCohort = cohortBucket < rolloutPercent;

  if (forceLegacyShell) {
    return {
      shellEnabled,
      rolloutPercent,
      forceLegacyShell,
      cohortBucket,
      collaborationShellEnabled: false,
      reason: "legacy_forced",
    };
  }
  if (!shellEnabled) {
    return {
      shellEnabled,
      rolloutPercent,
      forceLegacyShell,
      cohortBucket,
      collaborationShellEnabled: false,
      reason: "cutover_disabled",
    };
  }
  if (!inRolloutCohort) {
    return {
      shellEnabled,
      rolloutPercent,
      forceLegacyShell,
      cohortBucket,
      collaborationShellEnabled: false,
      reason: "cohort_holdback",
    };
  }
  return {
    shellEnabled,
    rolloutPercent,
    forceLegacyShell,
    cohortBucket,
    collaborationShellEnabled: true,
    reason: "cutover_enabled",
  };
}

function normalizeModelResolutionPayload(
  value: unknown
): ModelResolutionPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const selectedModel = normalizeNonEmptyString(record.selectedModel);
  const selectionSource = normalizeNonEmptyString(record.selectionSource);
  if (!selectedModel || !selectionSource) {
    return null;
  }
  if (typeof record.fallbackUsed !== "boolean") {
    return null;
  }

  return {
    requestedModel: normalizeNonEmptyString(record.requestedModel),
    selectedModel,
    usedModel: normalizeNonEmptyString(record.usedModel),
    selectedAuthProfileId: normalizeNonEmptyString(record.selectedAuthProfileId),
    usedAuthProfileId: normalizeNonEmptyString(record.usedAuthProfileId),
    selectionSource,
    fallbackUsed: record.fallbackUsed,
    fallbackReason: normalizeNonEmptyString(record.fallbackReason),
  };
}

export function buildModelResolutionPayload(args: {
  requestedModel?: string;
  selectedModel: string;
  selectionSource: string;
  usedModel?: string;
  selectedAuthProfileId?: string | null;
  usedAuthProfileId?: string | null;
}): ModelResolutionPayload {
  const modelFallbackUsed =
    typeof args.usedModel === "string" && args.usedModel !== args.selectedModel;
  const authProfileFallbackUsed =
    typeof args.selectedAuthProfileId === "string" &&
    typeof args.usedAuthProfileId === "string" &&
    args.selectedAuthProfileId !== args.usedAuthProfileId;
  const selectionFallbackUsed =
    args.selectionSource !== "preferred" && args.selectionSource !== "session_pinned";
  const fallbackUsed =
    selectionFallbackUsed || modelFallbackUsed || authProfileFallbackUsed;
  const usedModel = args.usedModel ?? args.selectedModel;
  return {
    requestedModel: args.requestedModel,
    selectedModel: args.selectedModel,
    usedModel,
    selectedAuthProfileId: normalizeNonEmptyString(args.selectedAuthProfileId),
    usedAuthProfileId: normalizeNonEmptyString(args.usedAuthProfileId),
    selectionSource: args.selectionSource,
    fallbackUsed,
    fallbackReason: modelFallbackUsed
      ? "retry_chain"
      : authProfileFallbackUsed
      ? "auth_profile_rotation"
      : selectionFallbackUsed
      ? args.selectionSource
      : undefined,
  };
}

const CHAT_DANGEROUS_TOOL_ALLOWLIST = [
  "process_payment",
  "send_bulk_crm_email",
  "send_email_from_template",
  "create_invoice",
  "publish_checkout",
  "publish_all",
  "update_organization_settings",
  "configure_ai_models",
  "propose_soul_update",
];

interface ChatToolApprovalPolicy {
  autonomyLevel: ToolApprovalAutonomyLevel;
  requireApprovalFor: string[];
}

export function resolveChatToolApprovalPolicy(settings: {
  humanInLoopEnabled?: boolean;
  toolApprovalMode?: "all" | "dangerous" | "none";
}): ChatToolApprovalPolicy {
  const approvalMode = settings.toolApprovalMode ?? "all";
  const humanInLoopEnabled = settings.humanInLoopEnabled !== false;

  if (!humanInLoopEnabled || approvalMode === "none") {
    return {
      autonomyLevel: "autonomous",
      requireApprovalFor: [],
    };
  }

  if (approvalMode === "dangerous") {
    return {
      autonomyLevel: "autonomous",
      requireApprovalFor: CHAT_DANGEROUS_TOOL_ALLOWLIST,
    };
  }

  return {
    autonomyLevel: "supervised",
    requireApprovalFor: [],
  };
}

interface DesktopOperatorRoutingContract {
  externalContactIdentifier: string;
  operatorRouteIdentity: {
    providerId: "desktop_operator";
    providerInstallationId: string;
    providerProfileId: string;
    providerProfileType: "organization";
    routeKey: string;
  };
  operatorRouteSelectors: {
    channel: "desktop";
    peer: string;
    channelRef: string;
  };
  operatorRoutingThreadId: string;
  operatorRoutingLineageId: string;
  operatorRoutingTenantId: string;
}

function buildDesktopOperatorRoutingContract(args: {
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  conversationId: Id<"aiConversations">;
}): DesktopOperatorRoutingContract {
  const externalContactIdentifier = `desktop:${args.userId}:${args.conversationId}`;
  const operatorRouteInstallationId = `desktop_operator:${args.organizationId}`;
  const routeKey = `${operatorRouteInstallationId}:${args.conversationId}`;
  const operatorRoutingThreadId = `group_thread:${args.conversationId}`;
  const operatorRoutingLineageId = `desktop_lineage:${args.organizationId}:${args.conversationId}`;
  return {
    externalContactIdentifier,
    operatorRouteIdentity: {
      providerId: "desktop_operator",
      providerInstallationId: operatorRouteInstallationId,
      providerProfileId: operatorRouteInstallationId,
      providerProfileType: "organization",
      routeKey,
    },
    operatorRouteSelectors: {
      channel: "desktop",
      peer: externalContactIdentifier,
      channelRef: String(args.conversationId),
    },
    operatorRoutingThreadId,
    operatorRoutingLineageId,
    operatorRoutingTenantId: String(args.organizationId),
  };
}

export const recordMacosCompanionObservabilityTrustEvent = internalMutation({
  args: {
    eventName: v.union(
      v.literal(MACOS_COMPANION_INGRESS_TRUST_EVENT_NAME),
      v.literal(MACOS_COMPANION_DELIVERY_FAILED_TRUST_EVENT_NAME),
    ),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const payload = args.payload as TrustEventPayload;
    const validation = validateTrustEventPayload(args.eventName, payload);
    await ctx.db.insert("aiTrustEvents", {
      event_name: args.eventName,
      payload,
      schema_validation_status: validation.ok ? "passed" : "failed",
      schema_errors: validation.ok ? undefined : validation.errors,
      created_at: Date.now(),
    });
  },
});

export const resolveVoiceRuntimeSession = action({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    conversationId: v.optional(v.id("aiConversations")),
  },
  handler: async (ctx, args) => {
    let conversationId = args.conversationId;
    if (!conversationId) {
      conversationId = await (ctx as any).runMutation(
        generatedApi.api.ai.conversations.createConversation,
        {
          organizationId: args.organizationId,
          userId: args.userId,
          title: "New Chat",
        }
      ) as Id<"aiConversations">;
    }

    const routing = buildDesktopOperatorRoutingContract({
      organizationId: args.organizationId,
      userId: args.userId,
      conversationId,
    });

    await (ctx as any).runMutation(
      generatedApi.internal.agentOntology.ensureActiveAgentForOrgInternal,
      {
        organizationId: args.organizationId,
        channel: "desktop",
      }
    );

    const routedOperatorAgent = await (ctx as any).runQuery(
      generatedApi.internal.agentOntology.getActiveAgentForOrg,
      {
        organizationId: args.organizationId,
        channel: "desktop",
        routeSelectors: routing.operatorRouteSelectors,
      }
    ) as {
      _id?: Id<"objects">;
    } | null;

    if (!routedOperatorAgent?._id) {
      throw new Error(
        "OPERATOR_ROUTING_UNRESOLVED: Missing orchestrator route for desktop operator channel."
      );
    }

    const operatorSession = await (ctx as any).runMutation(
      generatedApi.internal.ai.agentSessions.resolveSession,
      {
        agentId: routedOperatorAgent._id,
        organizationId: args.organizationId,
        channel: "desktop",
        externalContactIdentifier: routing.externalContactIdentifier,
        channelRouteIdentity: routing.operatorRouteIdentity,
      }
    ) as { _id?: Id<"agentSessions"> } | null;

    if (!operatorSession?._id) {
      throw new Error(
        "OPERATOR_SESSION_UNRESOLVED: Failed to resolve desktop operator session."
      );
    }

    const collaborationUpsert = await (ctx as any).runMutation(
      generatedApi.internal.ai.agentSessions.upsertSessionCollaborationContract,
      {
        sessionId: operatorSession._id,
        kernel: {
          threadType: "group_thread",
          threadId: routing.operatorRoutingThreadId,
          groupThreadId: routing.operatorRoutingThreadId,
          lineageId: routing.operatorRoutingLineageId,
          visibilityScope: "group",
          correlationId: `desktop_corr:${conversationId}`,
        },
        authority: {
          authorityRole: "orchestrator",
          intentType: "read_only",
          mutatesState: false,
        },
        updatedBy: `desktop_chat:${args.userId}`,
      }
    ) as {
      success?: boolean;
      error?: string;
      reason?: string;
    };

    if (!collaborationUpsert?.success) {
      throw new Error(
        `OPERATOR_COLLAB_METADATA_BLOCKED: ${
          collaborationUpsert?.reason || collaborationUpsert?.error || "unknown_error"
        }`
      );
    }

    const routingMetadataUpsert = await (ctx as any).runMutation(
      generatedApi.internal.ai.agentSessions.upsertSessionRoutingMetadata,
      {
        sessionId: operatorSession._id,
        tenantId: routing.operatorRoutingTenantId,
        lineageId: routing.operatorRoutingLineageId,
        threadId: routing.operatorRoutingThreadId,
        workflowKey: "message_ingress",
        updatedBy: `desktop_chat:${args.userId}`,
      }
    ) as {
      success?: boolean;
      error?: string;
      reason?: string;
    };

    if (!routingMetadataUpsert?.success) {
      throw new Error(
        `OPERATOR_ROUTING_METADATA_BLOCKED: ${
          routingMetadataUpsert?.reason || routingMetadataUpsert?.error || "unknown_error"
        }`
      );
    }

    return {
      conversationId,
      agentSessionId: operatorSession._id,
      externalContactIdentifier: routing.externalContactIdentifier,
      routeKey: routing.operatorRouteIdentity.routeKey,
      threadId: routing.operatorRoutingThreadId,
      lineageId: routing.operatorRoutingLineageId,
    };
  },
});

export const sendMessage = action({
  args: {
    conversationId: v.optional(v.id("aiConversations")),
    message: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    sessionId: v.optional(v.string()),
    selectedModel: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("auto"), v.literal("plan"), v.literal("plan_soft"))),
    reasoningEffort: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("extra_high"))
    ),
    privacyMode: v.optional(v.boolean()),
    references: v.optional(v.array(v.object({
      url: v.string(),
      content: v.optional(v.string()),
      status: v.union(v.literal("loading"), v.literal("ready"), v.literal("error")),
      error: v.optional(v.string()),
    }))),
    attachments: v.optional(
      v.array(
        v.union(
          v.object({
            attachmentId: v.id("aiMessageAttachments"),
          }),
          v.object({
            type: v.string(),
            name: v.optional(v.string()),
            mimeType: v.optional(v.string()),
            sizeBytes: v.optional(v.number()),
            url: v.optional(v.string()),
            uri: v.optional(v.string()),
            sourceId: v.optional(v.string()),
            width: v.optional(v.number()),
            height: v.optional(v.number()),
          })
        )
      )
    ),
    collaboration: v.optional(v.object({
      surface: v.union(v.literal("group"), v.literal("dm")),
      dmThreadId: v.optional(v.string()),
      specialistAgentId: v.optional(v.string()),
      specialistLabel: v.optional(v.string()),
    })),
    liveSessionId: v.optional(v.string()),
    cameraRuntime: v.optional(v.any()),
    voiceRuntime: v.optional(v.any()),
    conversationRuntime: v.optional(v.any()),
    kickoffContract: v.optional(v.any()),
    commandPolicy: v.optional(v.any()),
    transportRuntime: v.optional(v.any()),
    avObservability: v.optional(v.any()),
    geminiLive: v.optional(v.any()),
    qaMode: v.optional(v.any()),
    isAutoRecovery: v.optional(v.boolean()), // Flag to bypass proposals for auto-recovery
    context: v.optional(v.union(v.literal("normal"), v.literal("page_builder"), v.literal("layers_builder"))), // Context for system prompt selection
    builderMode: v.optional(v.union(v.literal("prototype"), v.literal("connect"))), // Builder mode for tool filtering
    isSetupMode: v.optional(v.boolean()), // Setup mode for agent creation wizard (injects system knowledge)
  },
  handler: async (ctx, args): Promise<{
    conversationId: Id<"aiConversations">;
    slug?: string;
    message: string;
    toolCalls: ToolCallResult[];
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
    cost: number;
    modelResolution: ModelResolutionPayload;
    qaDiagnostics?: {
      enabled: boolean;
      modeVersion: typeof SUPER_ADMIN_AGENT_QA_MODE_VERSION;
      runId?: string;
      actor: {
        userId: string;
        email?: string;
      };
      target: {
        agentId?: string;
        templateRole?: string;
      };
      diagnostics?: ActionCompletionQaDiagnostics;
    };
  }> => {
    await (ctx as any).runMutation(
      generatedApi.internal.ai.settings.ensureOrganizationModelDefaultsInternal,
      {
        organizationId: args.organizationId,
      }
    );
    await (ctx as any).runMutation(
      generatedApi.internal.agentOntology.ensureActiveAgentForOrgInternal,
      {
        organizationId: args.organizationId,
        channel: "desktop",
      }
    );
    let qaMode = normalizeSuperAdminQaMode(args.qaMode);
    if (qaMode?.enabled && !qaMode.runId) {
      qaMode = {
        ...qaMode,
        runId: `qa_${Date.now()}_${String(args.userId).slice(-8)}`,
      };
    }
    let qaActorEmail: string | undefined;
    if (qaMode?.enabled) {
      const normalizedSessionId =
        normalizeNonEmptyString(args.sessionId) || qaMode.sessionId;
      const session = normalizedSessionId
        ? await (ctx as any).runQuery(generatedApi.internal.auth.getSessionById, {
            sessionId: normalizedSessionId,
          }) as { userId?: Id<"users"> } | null
        : null;
      const sessionUserMatchesActor = Boolean(
        session?.userId && String(session.userId) === String(args.userId),
      );
      const actorContext = sessionUserMatchesActor
        ? await (ctx as any).runQuery(generatedApi.api.auth.getCurrentUser, {
            sessionId: normalizedSessionId,
          }) as { id?: string; email?: string; isSuperAdmin?: boolean } | null
        : null;
      qaActorEmail = normalizeNonEmptyString(actorContext?.email);
      const isSuperAdmin = actorContext?.isSuperAdmin === true
        && String(actorContext?.id) === String(args.userId);
      if (!isSuperAdmin) {
        const denyReason = resolveSuperAdminAgentQaDeniedReason({
          hasSessionId: Boolean(normalizedSessionId),
          isAuthenticated: sessionUserMatchesActor,
          isSuperAdmin,
        });
        try {
          await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
            userId: args.userId,
            organizationId: args.organizationId,
            action: "ai.super_admin_agent_qa_mode_access",
            resource: "ai_chat",
            resourceId: undefined,
            success: false,
            metadata: {
              modeVersion: SUPER_ADMIN_AGENT_QA_MODE_VERSION,
              deniedReason: denyReason,
              targetAgentId: qaMode.targetAgentId ? String(qaMode.targetAgentId) : undefined,
              targetTemplateRole: qaMode.targetTemplateRole,
              label: qaMode.label,
              runId: qaMode.runId,
            },
          });
        } catch (auditError) {
          console.warn("[AI Chat] Failed to persist QA denial audit event (continuing fail-open)", {
            organizationId: String(args.organizationId),
            userId: String(args.userId),
            denyReason,
            auditError: auditError instanceof Error ? auditError.message : String(auditError),
          });
        }
        console.warn("[AI Chat] Super-admin QA mode denied; continuing without QA mode", {
          organizationId: String(args.organizationId),
          userId: String(args.userId),
          denyReason,
        });
        qaMode = undefined;
      } else {
        try {
          await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
            userId: args.userId,
            organizationId: args.organizationId,
            action: "ai.super_admin_agent_qa_mode_access",
            resource: "ai_chat",
            resourceId: undefined,
            success: true,
            metadata: {
              modeVersion: SUPER_ADMIN_AGENT_QA_MODE_VERSION,
              targetAgentId: qaMode.targetAgentId ? String(qaMode.targetAgentId) : undefined,
              targetTemplateRole: qaMode.targetTemplateRole,
              label: qaMode.label,
              runId: qaMode.runId,
            },
          });
        } catch (auditError) {
          console.warn("[AI Chat] Failed to persist QA allow audit event (continuing)", {
            organizationId: String(args.organizationId),
            userId: String(args.userId),
            runId: qaMode.runId,
            auditError: auditError instanceof Error ? auditError.message : String(auditError),
          });
        }
      }
    }

    // 1. Get or create conversation
    let conversationId: Id<"aiConversations"> | undefined = args.conversationId;
    let conversationSlug: string | undefined;
    const isNewConversation = !conversationId;

    if (!conversationId) {
      // Generate a title from the first message based on context
      const sessionTitle = generateSessionTitle(args.message, args.context);

      conversationId = await (ctx as any).runMutation(generatedApi.api.ai.conversations.createConversation, {
        organizationId: args.organizationId,
        userId: args.userId,
        title: sessionTitle,
      }) as Id<"aiConversations">;

      console.log(`[AI Chat] Created new conversation with title: "${sessionTitle}"`);
    }

    if (!conversationId) {
      throw new Error("Failed to initialize conversation");
    }

    const attachmentInputs = (args.attachments || []) as SendAttachmentInput[];
    const requestedAttachmentIds = Array.from(
      new Set(
        attachmentInputs
          .filter(isSendAttachmentReference)
          .map((attachment) => attachment.attachmentId)
      )
    );
    const resolvedAttachments = requestedAttachmentIds.length > 0
      ? await (ctx as any).runQuery(generatedApi.api.ai.chatAttachments.resolveSendAttachments, {
          organizationId: args.organizationId,
          userId: args.userId,
          attachmentIds: requestedAttachmentIds,
        }) as ResolvedSendAttachment[]
      : [];
    const inlineAttachments = normalizeInlineSendAttachments(attachmentInputs);

    const useLegacyPageBuilderFlow = args.context === "page_builder";
    const operatorCollabCutover = resolveOperatorCollaborationCutoverConfig({
      organizationId: args.organizationId,
      conversationId,
    });
    const operatorCollaborationShellEnabled =
      !useLegacyPageBuilderFlow && operatorCollabCutover.collaborationShellEnabled;
    const operatorRoutingLineageId = `desktop_lineage:${args.organizationId}:${conversationId}`;
    const operatorRoutingThreadId = `group_thread:${conversationId}`;
    let requestedCollaborationRoute = !operatorCollaborationShellEnabled
      ? null
      : useLegacyPageBuilderFlow
      ? null
      : normalizeChatCollaborationRoute(args.collaboration);
    let collaborationSurface = requestedCollaborationRoute?.surface ?? "group";
    let activeDmThreadId = collaborationSurface === "dm"
      ? requestedCollaborationRoute?.dmThreadId
      : undefined;
    let inboundThreadId = collaborationSurface === "dm" && activeDmThreadId
      ? activeDmThreadId
      : operatorRoutingThreadId;
    let inboundWorkflowKey = collaborationSurface === "dm"
      ? "proposal"
      : "message_ingress";
    let inboundAuthorityIntentType: StoredMessageCollaboration["authorityIntentType"] =
      collaborationSurface === "dm"
        ? "proposal"
        : "read_only";
    let inboundCorrelationId = collaborationSurface === "dm" && activeDmThreadId
      ? `desktop_corr:${conversationId}:${activeDmThreadId}`
      : `desktop_corr:${conversationId}`;
    const buildMessageCollaboration = (): StoredMessageCollaboration | undefined =>
      useLegacyPageBuilderFlow
        ? undefined
        : {
            surface: collaborationSurface,
            threadType: collaborationSurface === "dm" ? "dm_thread" : "group_thread",
            threadId: inboundThreadId,
            groupThreadId: operatorRoutingThreadId,
            dmThreadId: activeDmThreadId,
            lineageId: operatorRoutingLineageId,
            correlationId: inboundCorrelationId,
            workflowKey: inboundWorkflowKey,
            authorityIntentType: inboundAuthorityIntentType,
            visibilityScope: collaborationSurface === "dm" ? "dm" : "group",
            specialistAgentId: requestedCollaborationRoute?.specialistAgentId,
            specialistLabel: requestedCollaborationRoute?.specialistLabel,
          };
    let messageCollaboration = buildMessageCollaboration();
    let preflightRoutedOperatorAgent:
      | {
          _id?: Id<"objects">;
          customProperties?: Record<string, unknown>;
        }
      | null = null;

    if (!useLegacyPageBuilderFlow) {
      const preflightOperatorRouteSelectors = {
        channel: "desktop",
        peer: `desktop:${args.userId}:${conversationId}`,
        channelRef: String(conversationId),
      };
      preflightRoutedOperatorAgent = await (ctx as any).runQuery(
        generatedApi.internal.agentOntology.getActiveAgentForOrg,
        {
          organizationId: args.organizationId,
          channel: "desktop",
          routeSelectors: preflightOperatorRouteSelectors,
        }
      ) as {
        _id?: Id<"objects">;
        customProperties?: Record<string, unknown>;
      } | null;

      if (!preflightRoutedOperatorAgent?._id) {
        const ensuredOperatorAgent = await (ctx as any).runMutation(
          generatedApi.internal.agentOntology.ensureActiveAgentForOrgInternal,
          {
            organizationId: args.organizationId,
            channel: "desktop",
            routeSelectors: preflightOperatorRouteSelectors,
          }
        ) as { agentId?: Id<"objects"> } | null;

        preflightRoutedOperatorAgent = await (ctx as any).runQuery(
          generatedApi.internal.agentOntology.getActiveAgentForOrg,
          {
            organizationId: args.organizationId,
            channel: "desktop",
            routeSelectors: preflightOperatorRouteSelectors,
          }
        ) as {
          _id?: Id<"objects">;
          customProperties?: Record<string, unknown>;
        } | null;

        if (!preflightRoutedOperatorAgent?._id && ensuredOperatorAgent?.agentId) {
          preflightRoutedOperatorAgent = await (ctx as any).runQuery(
            generatedApi.internal.agentOntology.getAgentInternal,
            {
              agentId: ensuredOperatorAgent.agentId,
            }
          ) as {
            _id?: Id<"objects">;
            customProperties?: Record<string, unknown>;
          } | null;
        }
      }

      if (!preflightRoutedOperatorAgent?._id) {
        throw new Error(
          "OPERATOR_ROUTING_UNRESOLVED: Missing orchestrator route for desktop operator channel."
        );
      }

      const operatorCollaborationDefaults =
        normalizeOperatorCollaborationDefaultsPolicy(
          preflightRoutedOperatorAgent.customProperties?.operatorCollaborationDefaults
        );
      if (
        collaborationSurface === "dm" &&
        !operatorCollaborationDefaults.allowSpecialistDmRouting
      ) {
        requestedCollaborationRoute = null;
        collaborationSurface = "group";
        activeDmThreadId = undefined;
        inboundThreadId = operatorRoutingThreadId;
        inboundWorkflowKey = "message_ingress";
        inboundAuthorityIntentType = "read_only";
        inboundCorrelationId = `desktop_corr:${conversationId}`;
        messageCollaboration = buildMessageCollaboration();
      }
    }

    // 2. Add user message
    const userMessageId = await (ctx as any).runMutation(generatedApi.api.ai.conversations.addMessage, {
      conversationId,
      role: "user",
      content: args.message,
      timestamp: Date.now(),
      collaboration: messageCollaboration,
    }) as Id<"aiMessages">;

    if (resolvedAttachments.length > 0) {
      await (ctx as any).runMutation(generatedApi.internal.ai.chatAttachments.linkAttachmentsToMessage, {
        organizationId: args.organizationId,
        userId: args.userId,
        conversationId,
        messageId: userMessageId,
        attachmentIds: resolvedAttachments.map((attachment) => attachment.attachmentId),
      });
    }

    // 3. Get conversation history
    const conversation = await (ctx as any).runQuery(generatedApi.api.ai.conversations.getConversation, {
      conversationId,
    }) as {
      messages: ConversationMessage[];
      slug?: string;
      modelId?: string | null;
      routingPin?: unknown;
    };
    const conversationHasImageAttachments = conversation.messages.some((message) =>
      (message.attachments || []).some((attachment) => attachment.kind === "image")
    );
    const conversationRoutingPin = normalizeConversationRoutingPin(
      (conversation as Record<string, unknown>).routingPin
    );
    const conversationPinnedModel =
      conversationRoutingPin?.modelId ??
      (typeof conversation.modelId === "string" && conversation.modelId.trim().length > 0
        ? conversation.modelId.trim()
        : null);
    const conversationPinnedAuthProfileId = conversationRoutingPin?.authProfileId ?? null;

    // Capture slug for new conversations (to return for URL update)
    if (isNewConversation && conversation.slug) {
      conversationSlug = conversation.slug;
    }
    if (!useLegacyPageBuilderFlow) {
      const externalContactIdentifier = `desktop:${args.userId}:${conversationId}`;
      const operatorRouteInstallationId = `desktop_operator:${args.organizationId}`;
      const operatorRouteKey = `${operatorRouteInstallationId}:${conversationId}`;
      const operatorRouteIdentity = {
        providerId: "desktop_operator",
        providerInstallationId: operatorRouteInstallationId,
        providerProfileId: operatorRouteInstallationId,
        providerProfileType: "organization" as const,
        routeKey: operatorRouteKey,
      };
      const operatorRouteSelectors = {
        channel: "desktop",
        peer: externalContactIdentifier,
        channelRef: String(conversationId),
      };
      const operatorRoutingTenantId = String(args.organizationId);
      const operatorRoutingWorkflowKey = "message_ingress";
      let routedOperatorAgent = preflightRoutedOperatorAgent;

      if (!routedOperatorAgent?._id) {
        const ensuredOperatorAgent = await (ctx as any).runMutation(
          generatedApi.internal.agentOntology.ensureActiveAgentForOrgInternal,
          {
            organizationId: args.organizationId,
            channel: "desktop",
            routeSelectors: operatorRouteSelectors,
          }
        ) as { agentId?: Id<"objects"> } | null;
        routedOperatorAgent = await (ctx as any).runQuery(
          generatedApi.internal.agentOntology.getActiveAgentForOrg,
          {
            organizationId: args.organizationId,
            channel: "desktop",
            routeSelectors: operatorRouteSelectors,
          }
        ) as {
          _id?: Id<"objects">;
          customProperties?: Record<string, unknown>;
        } | null;
        if (!routedOperatorAgent?._id && ensuredOperatorAgent?.agentId) {
          routedOperatorAgent = await (ctx as any).runQuery(
            generatedApi.internal.agentOntology.getAgentInternal,
            {
              agentId: ensuredOperatorAgent.agentId,
            }
          ) as {
            _id?: Id<"objects">;
            customProperties?: Record<string, unknown>;
          } | null;
        }
      }

      if (!routedOperatorAgent?._id) {
        throw new Error(
          "OPERATOR_ROUTING_UNRESOLVED: Missing orchestrator route for desktop operator channel."
        );
      }
      const operatorCollaborationDefaults =
        normalizeOperatorCollaborationDefaultsPolicy(
          routedOperatorAgent.customProperties?.operatorCollaborationDefaults
        );

      const operatorSession = await (ctx as any).runMutation(
        generatedApi.internal.ai.agentSessions.resolveSession,
        {
          agentId: routedOperatorAgent._id,
          organizationId: args.organizationId,
          channel: "desktop",
          externalContactIdentifier,
          channelRouteIdentity: operatorRouteIdentity,
        }
      ) as { _id?: Id<"agentSessions"> } | null;
      if (!operatorSession?._id) {
        throw new Error(
          "OPERATOR_SESSION_UNRESOLVED: Failed to resolve desktop operator session."
        );
      }
      const operatorSessionId = operatorSession._id;

      const collaborationUpsert = await (ctx as any).runMutation(
        generatedApi.internal.ai.agentSessions.upsertSessionCollaborationContract,
        {
          sessionId: operatorSessionId,
          kernel: {
            threadType: "group_thread",
            threadId: operatorRoutingThreadId,
            groupThreadId: operatorRoutingThreadId,
            lineageId: operatorRoutingLineageId,
            visibilityScope: "group",
            correlationId: `desktop_corr:${conversationId}`,
          },
          authority: {
            authorityRole: "orchestrator",
            intentType: "read_only",
            mutatesState: false,
          },
          updatedBy: `desktop_chat:${args.userId}`,
        }
      ) as {
        success?: boolean;
        error?: string;
        reason?: string;
      };
      if (!collaborationUpsert?.success) {
        throw new Error(
          `OPERATOR_COLLAB_METADATA_BLOCKED: ${
            collaborationUpsert?.reason || collaborationUpsert?.error || "unknown_error"
          }`
        );
      }

      const routingMetadataUpsert = await (ctx as any).runMutation(
        generatedApi.internal.ai.agentSessions.upsertSessionRoutingMetadata,
        {
          sessionId: operatorSessionId,
          tenantId: operatorRoutingTenantId,
          lineageId: operatorRoutingLineageId,
          threadId: operatorRoutingThreadId,
          workflowKey: operatorRoutingWorkflowKey,
          updatedBy: `desktop_chat:${args.userId}`,
        }
      ) as {
        success?: boolean;
        error?: string;
        reason?: string;
      };
      if (!routingMetadataUpsert?.success) {
        throw new Error(
          `OPERATOR_ROUTING_METADATA_BLOCKED: ${
            routingMetadataUpsert?.reason || routingMetadataUpsert?.error || "unknown_error"
          }`
        );
      }

      type DesktopAgentExecutionResult = {
        status: string;
        message?: string;
        response?: string;
        modelResolution?: ModelResolutionPayload;
        toolResults?: MacosCompanionRuntimeToolResult[];
        sessionId?: string;
        turnId?: string;
        agentId?: string;
        qaDiagnostics?: ActionCompletionQaDiagnostics;
      };

      const persistSuperAdminQaRunEvent = async (event: {
        eventType: "start" | "turn";
        outcome?: "success" | "blocked" | "error" | "rate_limited" | "credits_exhausted";
        sessionId?: string;
        turnId?: string;
        agentId?: string;
        diagnostics?: ActionCompletionQaDiagnostics;
        runtimeError?: string;
      }) => {
        if (!qaMode?.enabled || !qaMode.runId) {
          return;
        }
        try {
          await (ctx as any).runMutation(
            generatedApi.internal.ai.qaRuns.upsertQaRunTurnInternal,
            {
              eventType: event.eventType,
              runId: qaMode.runId,
              organizationId: args.organizationId,
              ownerUserId: args.userId,
              ownerEmail: qaActorEmail,
              modeVersion: SUPER_ADMIN_AGENT_QA_MODE_VERSION,
              label: qaMode.label,
              targetAgentId: qaMode.targetAgentId ? String(qaMode.targetAgentId) : undefined,
              targetTemplateRole: qaMode.targetTemplateRole,
              sessionId: event.sessionId,
              turnId: event.turnId,
              agentId: event.agentId,
              occurredAt: Date.now(),
              outcome: event.outcome,
              qaDiagnostics: event.diagnostics,
              runtimeError: normalizeNonEmptyString(event.runtimeError),
            },
          );
        } catch (error) {
          console.error("[AI Chat] Failed to persist super-admin QA run telemetry:", error);
        }
      };

      const emitMacosCompanionObservabilityTrustEvent = async (
        eventName: MacosCompanionTrustEventName,
        runtimeResult: DesktopAgentExecutionResult,
        deliveryFailureReason?: string,
      ) => {
        try {
          const payload = buildMacosCompanionObservabilityTrustPayload({
            eventName,
            organizationId: args.organizationId,
            userId: args.userId,
            conversationId,
            sessionId: operatorSessionId,
            runtimeStatus: runtimeResult.status,
            toolResults: runtimeResult.toolResults,
            liveSessionId: normalizeNonEmptyString(args.liveSessionId),
            cameraRuntime:
              args.cameraRuntime && typeof args.cameraRuntime === "object"
                ? args.cameraRuntime
                : undefined,
            voiceRuntime:
              args.voiceRuntime && typeof args.voiceRuntime === "object"
                ? args.voiceRuntime
                : undefined,
            transportRuntime:
              args.transportRuntime && typeof args.transportRuntime === "object"
                ? args.transportRuntime
                : undefined,
            avObservability:
              args.avObservability && typeof args.avObservability === "object"
                ? args.avObservability
                : undefined,
            geminiLive:
              args.geminiLive && typeof args.geminiLive === "object"
                ? args.geminiLive
                : undefined,
            deliveryFailureReason,
          });
          await (ctx as any).runMutation(
            generatedApi.internal.ai.chat.recordMacosCompanionObservabilityTrustEvent,
            {
              eventName,
              payload,
            }
          );
        } catch (error) {
          console.error(
            "[AI Chat] Failed to persist macOS companion observability trust event:",
            error
          );
        }
      };

      const emitVoiceRuntimeTelemetryTrustEvents = async () => {
        try {
          const telemetryEvents = buildVoiceRuntimeTelemetryTrustEventPayloads({
            organizationId: args.organizationId,
            userId: args.userId,
            sessionId: operatorSessionId,
            channel: "desktop",
            liveSessionId: args.liveSessionId,
            voiceRuntime:
              args.voiceRuntime && typeof args.voiceRuntime === "object"
                ? args.voiceRuntime
                : undefined,
            transportRuntime:
              args.transportRuntime && typeof args.transportRuntime === "object"
                ? args.transportRuntime
                : undefined,
            avObservability:
              args.avObservability && typeof args.avObservability === "object"
                ? args.avObservability
                : undefined,
          });
          for (const event of telemetryEvents) {
            await (ctx as any).runMutation(
              generatedApi.internal.ai.voiceRuntime.recordVoiceTrustEvent,
              {
                eventName: event.eventName,
                payload: event.payload,
              }
            );
          }
        } catch (error) {
          console.error(
            "[AI Chat] Failed to persist voice runtime telemetry trust events:",
            error
          );
        }
      };

      await persistSuperAdminQaRunEvent({
        eventType: "start",
        sessionId: String(operatorSessionId),
        agentId: qaMode?.targetAgentId ? String(qaMode.targetAgentId) : undefined,
      });

      const kickoffContract =
        args.kickoffContract && typeof args.kickoffContract === "object"
          ? args.kickoffContract as Record<string, unknown>
          : undefined;
      const kickoffKind = normalizeNonEmptyString(kickoffContract?.kind);
      const commercialKickoffContract =
        kickoffKind === "commercial_motion_v1"
          ? kickoffContract
          : undefined;
      const kickoffAudienceTemperature = normalizeNonEmptyString(
        commercialKickoffContract?.audienceTemperature
      );
      const kickoffSurface = normalizeNonEmptyString(commercialKickoffContract?.surface);
      const kickoffIntentCode = normalizeNonEmptyString(
        commercialKickoffContract?.intentCode
      );
      const kickoffOfferCode = normalizeNonEmptyString(commercialKickoffContract?.offerCode);
      const kickoffRoutingHint = normalizeNonEmptyString(
        commercialKickoffContract?.routingHint
      );
      const kickoffTargetSpecialistTemplateRole = normalizeNonEmptyString(
        commercialKickoffContract?.targetSpecialistTemplateRole
      );
      const kickoffTargetSpecialistDisplayName = normalizeNonEmptyString(
        commercialKickoffContract?.targetSpecialistDisplayName
      );
      const kickoffChannel = normalizeNonEmptyString(commercialKickoffContract?.channel);
      const qaTargetAgentId = qaMode?.targetAgentId
        ? String(qaMode.targetAgentId)
        : undefined;
      const qaTargetTemplateRole = qaMode?.targetTemplateRole;
      const qaRunId = qaMode?.runId;
      const shouldSeedSamanthaQaSession =
        qaMode?.enabled === true && isSamanthaQaTemplateRole(qaTargetTemplateRole);
      const effectiveSamanthaQaSourceAuditChannel =
        shouldSeedSamanthaQaSession
          ? (qaMode?.sourceAuditChannel || "webchat")
          : undefined;
      const effectiveSamanthaQaSourceSessionToken =
        shouldSeedSamanthaQaSession
          ? (
              qaMode?.sourceSessionToken
              || `qa_samantha_${String(args.organizationId)}_${qaRunId || String(conversationId)}`
            )
          : undefined;
      if (
        shouldSeedSamanthaQaSession
        && effectiveSamanthaQaSourceAuditChannel
        && effectiveSamanthaQaSourceSessionToken
      ) {
        try {
          await ensureSamanthaQaAuditSessionSeed({
            ctx,
            organizationId: args.organizationId,
            agentId: routedOperatorAgent._id as Id<"objects">,
            sourceAuditChannel: effectiveSamanthaQaSourceAuditChannel,
            sourceSessionToken: effectiveSamanthaQaSourceSessionToken,
            runId: qaRunId,
          });
        } catch (seedError) {
          console.error("[AI Chat] Samantha QA audit session auto-seed failed", {
            organizationId: args.organizationId,
            runId: qaRunId,
            sourceAuditChannel: effectiveSamanthaQaSourceAuditChannel,
            seedError,
          });
        }
      }
      const samanthaQaSourceContext =
        qaMode?.enabled && isSamanthaQaTemplateRole(qaTargetTemplateRole)
          ? {
              ingressChannel: qaMode.ingressChannel || "desktop",
              originSurface: qaMode.originSurface || "super_admin_qa_chat",
              sourceSessionToken: effectiveSamanthaQaSourceSessionToken,
              sourceAuditChannel: effectiveSamanthaQaSourceAuditChannel || "webchat",
            }
          : undefined;
      const kickoffCampaign =
        commercialKickoffContract?.campaign && typeof commercialKickoffContract.campaign === "object"
          ? commercialKickoffContract.campaign as Record<string, unknown>
          : undefined;
      const commercialIntentFromKickoff = commercialKickoffContract
        ? {
            offerCode: kickoffOfferCode,
            intentCode: kickoffIntentCode,
            surface: kickoffSurface,
            audienceTemperature: kickoffAudienceTemperature,
            routingHint: kickoffRoutingHint,
            targetSpecialistTemplateRole: qaTargetTemplateRole || kickoffTargetSpecialistTemplateRole,
            targetSpecialistDisplayName: kickoffTargetSpecialistDisplayName,
            sourceChannel: kickoffChannel,
            campaign: kickoffCampaign
              ? {
                  source: normalizeNonEmptyString(kickoffCampaign.source),
                  medium: normalizeNonEmptyString(kickoffCampaign.medium),
                  campaign: normalizeNonEmptyString(kickoffCampaign.campaign),
                  content: normalizeNonEmptyString(kickoffCampaign.content),
                  term: normalizeNonEmptyString(kickoffCampaign.term),
                  referrer: normalizeNonEmptyString(kickoffCampaign.referrer),
                  landingPath: normalizeNonEmptyString(kickoffCampaign.landingPath),
                }
              : undefined,
          }
        : undefined;

      const inboundRuntimeMetadata = {
        skipOutbound: true,
        source: "desktop_chat",
        routingMode: "orchestrator_first",
        operatorRouteEnforced: true,
        providerId: operatorRouteIdentity.providerId,
        providerInstallationId: operatorRouteIdentity.providerInstallationId,
        providerProfileId: operatorRouteIdentity.providerProfileId,
        providerProfileType: operatorRouteIdentity.providerProfileType,
        routeKey: operatorRouteIdentity.routeKey,
        channelRef: String(conversationId),
        providerChannelId: String(conversationId),
        routeSelectors: operatorRouteSelectors,
        tenantId: operatorRoutingTenantId,
        lineageId: operatorRoutingLineageId,
        threadId: inboundThreadId,
        groupThreadId: operatorRoutingThreadId,
        dmThreadId: activeDmThreadId,
        workflowKey: inboundWorkflowKey,
        authorityIntentType: inboundAuthorityIntentType,
        intentType: inboundAuthorityIntentType,
        workflowIntent: inboundAuthorityIntentType,
        collaborationSurface: collaborationSurface,
        visibilityScope: collaborationSurface === "dm" ? "dm" : "group",
        specialistAgentId: requestedCollaborationRoute?.specialistAgentId,
        specialistLabel: requestedCollaborationRoute?.specialistLabel,
        operatorCollaborationShellEnabled,
        operatorCollaborationCutoverReason: operatorCollabCutover.reason,
        operatorCollaborationRolloutPercent: operatorCollabCutover.rolloutPercent,
        operatorCollaborationCohortBucket: operatorCollabCutover.cohortBucket,
        operatorCollaborationDefaultSurface:
          operatorCollaborationDefaults.defaultSurface,
        operatorCollaborationAllowSpecialistDmRouting:
          operatorCollaborationDefaults.allowSpecialistDmRouting,
        operatorCollaborationProposalOnlyDmActions:
          operatorCollaborationDefaults.proposalOnlyDmActions,
        conversationId,
        userId: args.userId,
        selectedModel: args.selectedModel,
        mode: args.mode,
        reasoningEffort: args.reasoningEffort,
        privacyMode: args.privacyMode === true,
        references: args.references,
        attachments: [
          ...resolvedAttachments.map((attachment) => ({
            attachmentId: attachment.attachmentId,
            type: attachment.kind,
            name: attachment.fileName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            url: attachment.url,
            storageId: attachment.storageId,
            width: attachment.width,
            height: attachment.height,
          })),
          ...inlineAttachments.map((attachment) => ({
            type: attachment.type,
            name: attachment.name,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            // `url` is consumed by inbound image normalizer when available.
            url: attachment.url ?? attachment.uri,
            sourceId: attachment.sourceId,
            width: attachment.width,
            height: attachment.height,
          })),
        ],
        liveSessionId: normalizeNonEmptyString(args.liveSessionId),
        cameraRuntime:
          args.cameraRuntime && typeof args.cameraRuntime === "object"
            ? args.cameraRuntime
            : undefined,
        voiceRuntime:
          args.voiceRuntime && typeof args.voiceRuntime === "object"
            ? args.voiceRuntime
            : undefined,
        conversationRuntime:
          args.conversationRuntime && typeof args.conversationRuntime === "object"
            ? args.conversationRuntime
            : undefined,
        liveSessionExecutionLane: resolveLiveSessionExecutionLaneMetadata({
          liveSessionId: args.liveSessionId,
          conversationRuntime: args.conversationRuntime,
          commandPolicy: args.commandPolicy,
        }),
        kickoffContract,
        qaMode: qaMode?.enabled
          ? {
              enabled: true,
              modeVersion: SUPER_ADMIN_AGENT_QA_MODE_VERSION,
              actorUserId: String(args.userId),
              actorEmail: qaActorEmail,
              targetAgentId: qaTargetAgentId,
              targetTemplateRole: qaTargetTemplateRole,
              label: qaMode.label,
              runId: qaRunId,
              sourceSessionToken: effectiveSamanthaQaSourceSessionToken,
              sourceAuditChannel: effectiveSamanthaQaSourceAuditChannel,
              ingressChannel: qaMode.ingressChannel,
              originSurface: qaMode.originSurface,
            }
          : undefined,
        sourceAuditContext: samanthaQaSourceContext,
        commercialIntent: commercialIntentFromKickoff,
        audience_temperature: kickoffAudienceTemperature,
        audienceTemperature: kickoffAudienceTemperature,
        surface: kickoffSurface,
        intent_code: kickoffIntentCode,
        intentCode: kickoffIntentCode,
        offer_code: kickoffOfferCode,
        offerCode: kickoffOfferCode,
        routing_hint: kickoffRoutingHint,
        routingHint: kickoffRoutingHint,
        target_specialist_template_role: qaTargetTemplateRole || kickoffTargetSpecialistTemplateRole,
        targetSpecialistTemplateRole: qaTargetTemplateRole || kickoffTargetSpecialistTemplateRole,
        qa_target_agent_id: qaTargetAgentId,
        qaTargetAgentId: qaTargetAgentId,
        qa_run_id: qaRunId,
        qaRunId: qaRunId,
        target_specialist_display_name: kickoffTargetSpecialistDisplayName,
        targetSpecialistDisplayName: kickoffTargetSpecialistDisplayName,
        source_channel: kickoffChannel,
        sourceChannel: kickoffChannel,
        commandPolicy:
          args.commandPolicy && typeof args.commandPolicy === "object"
            ? args.commandPolicy
            : undefined,
        transportRuntime:
          args.transportRuntime && typeof args.transportRuntime === "object"
            ? args.transportRuntime
            : undefined,
        avObservability:
          args.avObservability && typeof args.avObservability === "object"
            ? args.avObservability
            : undefined,
        geminiLive:
          args.geminiLive && typeof args.geminiLive === "object"
            ? args.geminiLive
            : undefined,
      };

      const runInboundAgentExecution = async (): Promise<DesktopAgentExecutionResult> =>
        await (ctx as any).runAction(
          generatedApi.api.ai.agentExecution.processInboundMessage,
          {
            organizationId: args.organizationId,
            channel: "desktop",
            externalContactIdentifier,
            message: args.message,
            metadata: inboundRuntimeMetadata,
          }
        ) as DesktopAgentExecutionResult;

      let agentResult = await runInboundAgentExecution();
      const noActiveAgentFailure = normalizeNonEmptyString(agentResult.message)
        ?.toLowerCase()
        .includes("no active agent found") === true;
      if (agentResult.status === "error" && noActiveAgentFailure) {
        await (ctx as any).runMutation(
          generatedApi.internal.agentOntology.ensureActiveAgentForOrgInternal,
          {
            organizationId: args.organizationId,
            channel: "desktop",
            routeSelectors: operatorRouteSelectors,
          }
        );
        agentResult = await runInboundAgentExecution();
      }

      await emitMacosCompanionObservabilityTrustEvent(
        MACOS_COMPANION_INGRESS_TRUST_EVENT_NAME,
        agentResult
      );
      await emitVoiceRuntimeTelemetryTrustEvents();
      const runtimeQaDiagnostics =
        agentResult.qaDiagnostics && typeof agentResult.qaDiagnostics === "object"
          ? (agentResult.qaDiagnostics as ActionCompletionQaDiagnostics)
          : undefined;
      const runtimeSessionId =
        normalizeNonEmptyString(agentResult.sessionId) || String(operatorSessionId);
      const runtimeTurnId = normalizeNonEmptyString(agentResult.turnId);
      const runtimeAgentId =
        normalizeNonEmptyString(agentResult.agentId)
        || (qaMode?.targetAgentId ? String(qaMode.targetAgentId) : undefined);

      if (agentResult.status === "credits_exhausted") {
        await emitMacosCompanionObservabilityTrustEvent(
          MACOS_COMPANION_DELIVERY_FAILED_TRUST_EVENT_NAME,
          agentResult,
          "credits_exhausted"
        );
        await persistSuperAdminQaRunEvent({
          eventType: "turn",
          outcome: "credits_exhausted",
          sessionId: runtimeSessionId,
          turnId: runtimeTurnId,
          agentId: runtimeAgentId,
          diagnostics: runtimeQaDiagnostics,
          runtimeError: "credits_exhausted",
        });
        throw new ConvexError({
          code: "CREDITS_EXHAUSTED",
          message: "CREDITS_EXHAUSTED: Not enough credits for this request.",
          actionLabel: "Buy Credits",
          actionUrl: "/?openWindow=store&panel=credits&context=credit_exhausted",
        });
      }
      if (agentResult.status === "rate_limited") {
        await emitMacosCompanionObservabilityTrustEvent(
          MACOS_COMPANION_DELIVERY_FAILED_TRUST_EVENT_NAME,
          agentResult,
          "rate_limited"
        );
        await persistSuperAdminQaRunEvent({
          eventType: "turn",
          outcome: "rate_limited",
          sessionId: runtimeSessionId,
          turnId: runtimeTurnId,
          agentId: runtimeAgentId,
          diagnostics: runtimeQaDiagnostics,
          runtimeError: normalizeNonEmptyString(agentResult.message) || "rate_limited",
        });
        throw new Error(agentResult.message || "Rate limit exceeded. Please try again later.");
      }
      if (agentResult.status === "error") {
        await emitMacosCompanionObservabilityTrustEvent(
          MACOS_COMPANION_DELIVERY_FAILED_TRUST_EVENT_NAME,
          agentResult,
          normalizeNonEmptyString(agentResult.message) ?? "runtime_error"
        );
        const runtimeErrorMessage =
          normalizeNonEmptyString(agentResult.message)
          || "Failed to process message via agent runtime.";
        await persistSuperAdminQaRunEvent({
          eventType: "turn",
          outcome: "error",
          sessionId: runtimeSessionId,
          turnId: runtimeTurnId,
          agentId: runtimeAgentId,
          diagnostics: runtimeQaDiagnostics,
          runtimeError: runtimeErrorMessage,
        });
        const runtimeErrorModelId =
          conversationPinnedModel
          || normalizeNonEmptyString(args.selectedModel)
          || SAFE_FALLBACK_MODEL_ID;
        const runtimeErrorModelResolution = buildModelResolutionPayload({
          requestedModel: normalizeNonEmptyString(args.selectedModel),
          selectedModel: runtimeErrorModelId,
          usedModel: runtimeErrorModelId,
          selectionSource: "runtime_error",
          selectedAuthProfileId: conversationPinnedAuthProfileId,
          usedAuthProfileId: conversationPinnedAuthProfileId,
        });
        await (ctx as any).runMutation(generatedApi.api.ai.conversations.addMessage, {
          conversationId,
          role: "assistant",
          content: runtimeErrorMessage,
          timestamp: Date.now(),
          modelResolution: runtimeErrorModelResolution,
        });
        return {
          conversationId,
          slug: conversationSlug,
          message: runtimeErrorMessage,
          toolCalls: [],
          usage: null,
          cost: 0,
          modelResolution: runtimeErrorModelResolution,
          ...(qaMode?.enabled && {
            qaDiagnostics: {
              enabled: true,
              modeVersion: SUPER_ADMIN_AGENT_QA_MODE_VERSION,
              runId: qaMode.runId,
              actor: {
                userId: String(args.userId),
                email: qaActorEmail,
              },
              target: {
                agentId: qaMode.targetAgentId ? String(qaMode.targetAgentId) : undefined,
                templateRole: qaMode.targetTemplateRole,
              },
            },
          }),
        };
      }
      let replayedAssistantMessage: string | null = null;
      let replayedToolCalls: ToolCallResult[] | null = null;
      let runtimeModelResolution = normalizeModelResolutionPayload(
        agentResult.modelResolution
      );
      if (!runtimeModelResolution && agentResult.status === "duplicate_acknowledged") {
        const replayConversation = await (ctx as any).runQuery(
          generatedApi.api.ai.conversations.getConversation,
          { conversationId }
        ) as {
          modelId?: string | null;
          messages?: Array<Record<string, unknown>>;
        } | null;

        const replayMessages = Array.isArray(replayConversation?.messages)
          ? replayConversation.messages
          : [];
        for (let index = replayMessages.length - 1; index >= 0; index -= 1) {
          const replayMessage = replayMessages[index];
          if (replayMessage?.role !== "assistant") {
            continue;
          }
          const normalizedReplayResolution = normalizeModelResolutionPayload(
            replayMessage.modelResolution
          );
          if (!normalizedReplayResolution) {
            continue;
          }
          runtimeModelResolution = normalizedReplayResolution;
          replayedAssistantMessage =
            typeof replayMessage.content === "string"
              ? replayMessage.content
              : null;
          const rawToolCalls = Array.isArray(replayMessage.toolCalls)
            ? replayMessage.toolCalls
            : [];
          replayedToolCalls = rawToolCalls.map((toolCall, toolIndex) => {
            const record =
              toolCall && typeof toolCall === "object"
                ? (toolCall as Record<string, unknown>)
                : {};
            const toolName = normalizeNonEmptyString(record.name) ?? "tool";
            const rawStatus = normalizeNonEmptyString(record.status);
            const normalizedStatus =
              rawStatus === "success"
                ? "success"
                : rawStatus === "pending_approval"
                  ? "pending_approval"
                  : "failed";
            return {
              id:
                normalizeNonEmptyString(record.id) ??
                `agent_tool_replay_${Date.now()}_${toolIndex}`,
              name: toolName,
              arguments:
                record.arguments && typeof record.arguments === "object"
                  ? (record.arguments as Record<string, unknown>)
                  : {},
              result: record.result,
              status: normalizedStatus,
              error: normalizeNonEmptyString(record.error),
            } satisfies ToolCallResult;
          });
          break;
        }

        if (!runtimeModelResolution) {
          const replayModelId =
            normalizeNonEmptyString(replayConversation?.modelId) ??
            conversationPinnedModel ??
            normalizeNonEmptyString(args.selectedModel);
          if (replayModelId) {
            runtimeModelResolution = buildModelResolutionPayload({
              requestedModel: normalizeNonEmptyString(args.selectedModel),
              selectedModel: replayModelId,
              usedModel: replayModelId,
              selectionSource: "duplicate_acknowledged_replay",
              selectedAuthProfileId: conversationPinnedAuthProfileId,
              usedAuthProfileId: conversationPinnedAuthProfileId,
            });
          }
        }
      }
      if (!runtimeModelResolution) {
        throw new Error(
          "Agent runtime did not return model resolution metadata for desktop chat persistence."
        );
      }
      const runtimeUsedModel =
        runtimeModelResolution.usedModel ?? runtimeModelResolution.selectedModel;
      const hasExplicitModelOverride =
        typeof args.selectedModel === "string" && args.selectedModel.trim().length > 0;
      const conversationRoutingPinDecision = evaluateSessionRoutingPinUpdate({
        pinnedModelId: conversationRoutingPin?.modelId ?? null,
        pinnedAuthProfileId: conversationRoutingPin?.authProfileId ?? null,
        selectedModelId: runtimeModelResolution.selectedModel,
        usedModelId: runtimeUsedModel,
        selectedAuthProfileId: runtimeModelResolution.selectedAuthProfileId ?? null,
        usedAuthProfileId: runtimeModelResolution.usedAuthProfileId ?? null,
        hasExplicitModelOverride,
      });
      if (conversationRoutingPinDecision.shouldUpdateRoutingPin) {
        await (ctx as any).runMutation(
          generatedApi.api.ai.conversations.upsertConversationRoutingPin,
          {
            conversationId,
            modelId: runtimeUsedModel,
            authProfileId: runtimeModelResolution.usedAuthProfileId ?? undefined,
            pinReason: conversationRoutingPinDecision.pinReason!,
            unlockReason: conversationRoutingPinDecision.unlockReason,
          }
        );
      }

      const toolCalls: ToolCallResult[] = replayedToolCalls ?? (agentResult.toolResults || []).map((toolResult, index) => ({
        id: `agent_tool_${Date.now()}_${index}`,
        name: toolResult.tool,
        arguments: {},
        result: toolResult.result,
        status:
          toolResult.status === "success"
            ? "success"
            : toolResult.status === "pending_approval"
              ? "pending_approval"
              : "failed",
        error: toolResult.error,
      }));

      const assistantMessage = (
        replayedAssistantMessage ??
        agentResult.response ??
        (agentResult.status === "duplicate_acknowledged" ? "" : agentResult.message ?? "")
      ).trim();
      if (assistantMessage.length > 0) {
        const executedToolCalls = toolCalls.filter(
          (toolCall): toolCall is ToolCallResult & { status: "success" | "failed" } =>
            toolCall.status === "success" || toolCall.status === "failed"
        );
        await (ctx as any).runMutation(generatedApi.api.ai.conversations.addMessage, {
          conversationId,
          role: "assistant",
          content: assistantMessage,
          timestamp: Date.now(),
          toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
          modelResolution: runtimeModelResolution,
          collaboration: messageCollaboration,
        });
      }

      const qaTurnOutcome: "success" | "blocked" =
        runtimeQaDiagnostics?.blockedReason || agentResult.status === "blocked"
          ? "blocked"
          : "success";
      await persistSuperAdminQaRunEvent({
        eventType: "turn",
        outcome: qaTurnOutcome,
        sessionId: runtimeSessionId,
        turnId: runtimeTurnId,
        agentId: runtimeAgentId,
        diagnostics: runtimeQaDiagnostics,
      });

      return {
        conversationId: conversationId!,
        slug: conversationSlug,
        message: assistantMessage,
        toolCalls,
        usage: null,
        cost: 0,
        modelResolution: runtimeModelResolution,
        ...(qaMode?.enabled && {
          qaDiagnostics: {
            enabled: true,
            modeVersion: SUPER_ADMIN_AGENT_QA_MODE_VERSION,
            runId: qaMode.runId,
            actor: {
              userId: String(args.userId),
              email: qaActorEmail,
            },
            target: {
              agentId: qaMode.targetAgentId ? String(qaMode.targetAgentId) : undefined,
              templateRole: qaMode.targetTemplateRole,
            },
            diagnostics:
              agentResult.qaDiagnostics && typeof agentResult.qaDiagnostics === "object"
                ? (agentResult.qaDiagnostics as ActionCompletionQaDiagnostics)
                : undefined,
          },
        }),
      };
    }

    // 4. Get AI settings for model selection
    let settings = ((await (ctx as any).runQuery(
      generatedApi.api.ai.settings.getAISettings,
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
      Array.isArray(settings?.llm?.enabledModels) &&
      settings.llm.enabledModels.length > 0
        ? settings.llm.enabledModels
        : [
            {
              modelId: ONBOARDING_DEFAULT_MODEL_ID,
              isDefault: true,
              enabledAt: Date.now(),
            },
          ];
    settings = {
      ...settings,
      llm: {
        ...(settings.llm || {}),
        enabledModels: onboardingEnabledModels,
        defaultModelId:
          settings?.llm?.defaultModelId ?? onboardingEnabledModels[0].modelId,
      },
    };

    // Check rate limit
    const rateLimit = await (ctx as any).runQuery(generatedApi.api.ai.settings.checkRateLimit, {
      organizationId: args.organizationId,
    });

    if (rateLimit.exceeded) {
      throw new Error("Rate limit exceeded. Please try again in an hour.");
    }

    // Check budget
    if (settings.monthlyBudgetUsd && settings.currentMonthSpend >= settings.monthlyBudgetUsd) {
      throw new Error("Monthly AI budget exceeded. Please increase your budget or wait until next month.");
    }

    const chatApprovalPolicy = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: settings.humanInLoopEnabled,
      toolApprovalMode: settings.toolApprovalMode,
    });

    const platformEnabledModels = await (ctx as any).runQuery(
      generatedApi.api.ai.platformModels.getEnabledModels,
      {}
    ) as Array<{
      id: string;
      isFreeTierLocked?: boolean;
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
      throw new Error(
        "No release-ready platform AI models are configured. Validate and re-enable at least one model."
      );
    }

    const licenseSnapshot = await (ctx as any).runQuery(
      generatedApi.internal.licensing.helpers.getLicenseInternalQuery,
      { organizationId: args.organizationId }
    ) as { planTier?: string } | null;
    const isFreeTierOrganization = licenseSnapshot?.planTier === "free";

    const explicitRequestedModel = normalizeNonEmptyString(args.selectedModel);
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
      throw new Error(
        "No release-ready free-tier model is configured. Set a free-tier lock in Super Admin > Platform AI Models."
      );
    }

    if (explicitRequestedModel) {
      if (
        isFreeTierOrganization &&
        effectiveFreeTierModelId &&
        explicitRequestedModel !== effectiveFreeTierModelId
      ) {
        throw new Error(
          `Free-tier organizations are pinned to "${effectiveFreeTierModelId}". Select that model to continue.`
        );
      }

      if (
        !isFreeTierOrganization &&
        !isModelAllowedForOrg(settings, explicitRequestedModel)
      ) {
        throw new Error(
          `Model "${explicitRequestedModel}" is not enabled for this organization. Select one of the models configured by your organization owner.`
        );
      }

      const explicitPlatformModel = selectFirstPlatformEnabledModel(
        [explicitRequestedModel],
        platformEnabledModelIds
      );
      if (!explicitPlatformModel) {
        throw new Error(
          `Model "${explicitRequestedModel}" is not currently release-ready on this platform. Select a currently enabled model and retry.`
        );
      }
    }

    const preferredModel =
      isFreeTierOrganization && effectiveFreeTierModelId
        ? effectiveFreeTierModelId
        : resolveRequestedModel(settings, explicitRequestedModel);
    const orgDefaultModel =
      isFreeTierOrganization && effectiveFreeTierModelId
        ? effectiveFreeTierModelId
        : resolveOrgDefaultModel(settings);
    const orgEnabledModelIdsRaw = Array.isArray(settings.llm.enabledModels)
      ? settings.llm.enabledModels.map(
          (enabled: { modelId?: string }) => enabled.modelId
        )
      : [];
    const orgEnabledModelIds =
      isFreeTierOrganization && effectiveFreeTierModelId
        ? [effectiveFreeTierModelId]
        : orgEnabledModelIdsRaw;
    const modelResolutionPoolIds =
      isFreeTierOrganization && effectiveFreeTierModelId
        ? [effectiveFreeTierModelId]
        : platformEnabledModelIds;
    const firstPlatformEnabledModel = platformEnabledModelIds[0] ?? null;
    const model = selectFirstPlatformEnabledModel(
      [
        !explicitRequestedModel && !isFreeTierOrganization ? conversationPinnedModel : null,
        preferredModel,
        orgDefaultModel,
        isFreeTierOrganization ? effectiveFreeTierModelId : SAFE_FALLBACK_MODEL_ID,
        firstPlatformEnabledModel,
      ],
      modelResolutionPoolIds
    );

    if (!model) {
      throw new Error("Unable to resolve a platform-enabled model for this organization");
    }

    if (conversationHasImageAttachments) {
      const selectedPlatformModel = platformEnabledModels.find((platformModel) => platformModel.id === model);
      if (!supportsVisionCapability(selectedPlatformModel?.capabilityMatrix)) {
        throw new Error(
          "The current model does not support image input. Select a vision-capable model and retry."
        );
      }
    }

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

    let runtimeProviderId = detectProvider(model, settings.llm?.providerId);
    let authProfiles = resolveAuthProfilesForProvider({
      providerId: runtimeProviderId,
      llmSettings: settings.llm,
      defaultBillingSource: settings.billingSource,
      envApiKeysByProvider,
      envOpenRouterApiKey: process.env.OPENROUTER_API_KEY,
    });

    if (authProfiles.length === 0 && runtimeProviderId !== "openrouter") {
      console.warn("[AI Chat] Missing provider-specific auth profiles; falling back to OpenRouter", {
        requestedProviderId: runtimeProviderId,
        model,
      });
      runtimeProviderId = "openrouter";
      authProfiles = resolveAuthProfilesForProvider({
        providerId: runtimeProviderId,
        llmSettings: settings.llm,
        defaultBillingSource: settings.billingSource,
        envApiKeysByProvider,
        envOpenRouterApiKey: process.env.OPENROUTER_API_KEY,
      });
    }

    if (authProfiles.length === 0) {
      throw new Error(`No auth profiles are configured for provider ${runtimeProviderId}`);
    }

    const authProfilesWithBaseUrl = authProfiles.map((profile) => ({
      ...profile,
      baseUrl: resolveAuthProfileBaseUrl({
        llmSettings: settings.llm,
        providerId: profile.providerId,
        profileId: profile.profileId,
        envOpenAiCompatibleBaseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL,
      }),
    }));
    const authProfileFailureCounts = buildAuthProfileFailureCountMap({
      providerId: runtimeProviderId,
      llmSettings: settings.llm,
    });
    const providerScopedOrgEnabledModelIds = runtimeProviderId === "openrouter"
      ? orgEnabledModelIds
      : orgEnabledModelIds.filter((candidateModelId: string) =>
          typeof candidateModelId === "string" &&
          detectProvider(candidateModelId, runtimeProviderId) === runtimeProviderId
        );
    const providerScopedPlatformEnabledModelIds = runtimeProviderId === "openrouter"
      ? modelResolutionPoolIds
      : platformEnabledModels
        .map((platformModel) => platformModel.id)
        .filter((candidateModelId: string) =>
          detectProvider(candidateModelId, runtimeProviderId) === runtimeProviderId
        );
    const runtimeModelPool =
      isFreeTierOrganization && effectiveFreeTierModelId
        ? [effectiveFreeTierModelId]
        : providerScopedPlatformEnabledModelIds.length > 0
          ? providerScopedPlatformEnabledModelIds
          : platformEnabledModels.map((platformModel) => platformModel.id);
    const runtimeOrgModelPool =
      providerScopedOrgEnabledModelIds.length > 0
        ? providerScopedOrgEnabledModelIds
        : orgEnabledModelIds;
    const runtimeSafeFallbackModelId =
      isFreeTierOrganization && effectiveFreeTierModelId
        ? effectiveFreeTierModelId
        : runtimeProviderId === "openrouter"
          ? SAFE_FALLBACK_MODEL_ID
          : runtimeModelPool[0] ?? model;
    const authProfileProviderById = new Map(
      authProfilesWithBaseUrl.map((profile) => [profile.profileId, profile.providerId])
    );
    const authProfileBillingSourceById = new Map(
      authProfilesWithBaseUrl.map((profile) => [profile.profileId, profile.billingSource])
    );

    const selectionSource =
      !explicitRequestedModel &&
      !isFreeTierOrganization &&
      conversationPinnedModel &&
      model === conversationPinnedModel
        ? "session_pinned"
        : determineModelSelectionSource({
            selectedModel: model,
            preferredModel,
            orgDefaultModel,
            safeFallbackModelId: runtimeSafeFallbackModelId,
            platformFirstEnabledModelId: firstPlatformEnabledModel,
          });
    const messageCreditCost = getAgentMessageCost(model);
    const resolveLlmBillingSource = (
      profileId?: string | null
    ): "platform" | "byok" | "private" =>
      normalizeCanonicalBillingSource(
        (profileId && authProfileBillingSourceById.get(profileId))
        ?? settings.billingSource
        ?? null
      ) ?? "platform";
    const preflightLlmBillingSource = resolveLlmBillingSource(
      authProfilesWithBaseUrl[0]?.profileId ?? null
    );

    // Ensure users receive daily credits (idempotent) before pre-flight checks.
    try {
      await (ctx as any).runMutation(
        generatedApi.internal.credits.index.grantDailyCreditsInternalMutation,
        { organizationId: args.organizationId }
      );
    } catch (error) {
      console.warn("[AI Chat] Failed to grant daily credits (non-blocking):", error);
    }

    const creditCheck = await (ctx as any).runQuery(
      generatedApi.internal.credits.index.checkCreditsInternalQuery,
      {
        organizationId: args.organizationId,
        requiredAmount: messageCreditCost,
        billingSource: preflightLlmBillingSource,
        requestSource: "llm",
      }
    ) as { hasCredits: boolean; totalCredits: number };

    if (!creditCheck.hasCredits) {
      try {
        await (ctx as any).scheduler.runAfter(
          0,
          generatedApi.internal.credits.notifications.notifyCreditExhausted,
          { organizationId: args.organizationId }
        );
      } catch (error) {
        console.warn("[AI Chat] Failed to schedule exhausted-credit notification:", error);
      }

      throw new ConvexError({
        code: "CREDITS_EXHAUSTED",
        message: `CREDITS_EXHAUSTED: Not enough credits (have ${creditCheck.totalCredits}, need ${messageCreditCost}).`,
        creditsRequired: messageCreditCost,
        creditsAvailable: creditCheck.totalCredits,
        actionLabel: "Buy Credits",
        actionUrl: "/?openWindow=store&panel=credits&context=credit_exhausted",
      });
    }

    const modelPricingCache = new Map<string, {
      promptPerMToken: number;
      completionPerMToken: number;
      source: "aiModels" | "fallback";
      usedFallback: boolean;
      warning?: string;
    }>();
    const getModelPricing = async (modelId: string) => {
      const cached = modelPricingCache.get(modelId);
      if (cached) {
        return cached;
      }

      const resolvedModelPricing = await (ctx as any).runQuery(
        generatedApi.api.ai.modelPricing.getModelPricing,
        { modelId }
      ) as {
        promptPerMToken: number;
        completionPerMToken: number;
        source: "aiModels" | "fallback";
        usedFallback: boolean;
        warning?: string;
      };

      if (resolvedModelPricing.usedFallback) {
        console.warn("[AI Chat][PricingFallback]", {
          modelId,
          source: resolvedModelPricing.source,
          warning: resolvedModelPricing.warning,
        });
      }

      modelPricingCache.set(modelId, resolvedModelPricing);
      return resolvedModelPricing;
    };
    await getModelPricing(model);

    const calculateUsageCost = (
      usage: { prompt_tokens: number; completion_tokens: number } | null | undefined,
      modelId: string
    ) => {
      const pricing = modelPricingCache.get(modelId);
      if (!pricing) {
        throw new Error(`Missing pricing for model ${modelId}`);
      }
      return calculateCostFromUsage(
        usage ?? { prompt_tokens: 0, completion_tokens: 0 },
        pricing
      );
    };

    // 6. Prepare messages for AI (legacy page builder path only).
    // Normal desktop chat now routes through ai.agentExecution.processInboundMessage.
    const isPageBuilderContext = args.context === "page_builder";
    if (!isPageBuilderContext) {
      throw new Error("Deprecated ai.chat non-page_builder path invoked unexpectedly.");
    }

    let systemPrompt = getPageBuilderPrompt(args.builderMode);

    // For setup mode (agent creation wizard), inject ALL system knowledge (~78KB)
    // This includes: meta-context, hero-definition, guide-positioning, plan-and-cta,
    // knowledge-base-structure, follow-up-sequences, and all adapted frameworks
    if (args.isSetupMode && isPageBuilderContext) {
      const setupKnowledgeLoad = composeKnowledgeContract("setup");
      const setupKnowledge = setupKnowledgeLoad.documents;
      if (setupKnowledge.length > 0) {
        const knowledgeBlock = setupKnowledge
          .map((k) => `## ${k.name}\n\n${k.content}`)
          .join("\n\n---\n\n");

        systemPrompt = `${systemPrompt}

---

# SETUP MODE: Agent Creation Wizard

You are helping an agency owner configure an AI agent for their client. Follow the system knowledge frameworks below to guide them through the setup process.

**Your role:**
1. Interview the agency owner about their client's business using the Hero Definition Framework
2. Help position the AI agent as a helpful guide using the Guide Positioning Framework
3. Create a clear action plan using the Plan and CTA Framework
4. Build a comprehensive knowledge base using the Knowledge Base Structure Guide
5. Design effective conversations using the Conversation Design Framework

**Output format:**
Generate files in the builder file explorer:
- \`agent-config.json\` - Agent configuration (system prompt, FAQ, tools, channels)
- \`kb/hero-profile.md\` - Client business profile
- \`kb/guide-positioning.md\` - AI agent personality and voice
- \`kb/action-plan.md\` - Customer journey and CTAs
- \`kb/faq.md\` - Common questions and answers
- \`kb/services.md\` - Products and services offered
- \`kb/policies.md\` - Business policies (hours, returns, etc.)
- \`kb/success-stories.md\` - Testimonials and case studies
- \`kb/industry-context.md\` - Industry-specific knowledge

**Deterministic kickoff contract (required):**
1. On the first setup response, always emit \`agent-config.json\` plus at least one \`kb/*.md\` file.
2. Emit every file as a fenced block with language and filename on the opening fence line.
3. Keep file paths stable between turns and update file contents instead of renaming.
4. If business details are missing, use explicit placeholders instead of skipping required files.

**Fence syntax (required):**
\`\`\`json agent-config.json
{
  "name": "example-agent"
}
\`\`\`

\`\`\`markdown kb/hero-profile.md
# Hero Profile
...
\`\`\`

---

# System Knowledge Library

${knowledgeBlock}`;

        console.log("[AI Chat][KnowledgeLoad]", setupKnowledgeLoad.telemetry);
        console.log(`[AI Chat] Injected ${setupKnowledge.length} setup knowledge documents (~${Math.round(knowledgeBlock.length / 1024)}KB)`);
      }
    }

    // For page builder context, inject RAG design patterns if available
    if (isPageBuilderContext && args.message) {
      try {
        const ragContext = await (ctx as any).runAction(
          generatedApi.internal.designEngine.buildRAGContext,
          {
            userMessage: args.message,
            limit: 5,
          }
        );

        if (ragContext) {
          // Inject RAG context at the end of the system prompt
          systemPrompt = `${systemPrompt}\n\n---\n\n${ragContext}`;
          console.log("[AI Chat] Injected RAG design patterns into system prompt");
        }
      } catch (ragError) {
        // Don't fail the request if RAG fails - just log and continue
        console.log("[AI Chat] RAG retrieval skipped:", ragError instanceof Error ? ragError.message : ragError);
      }
    }

    console.log(`[AI Chat] Using ${isPageBuilderContext ? 'page builder' : 'normal chat'} system prompt`);

    const messages: ChatMessage[] = buildOpenRouterMessages({
      systemPrompt,
      conversationMessages: conversation.messages,
      onFilteredIncompleteToolCall: ({ messageIndex }) => {
        console.log(
          `[AI Chat] Filtering out incomplete tool call from history (message ${messageIndex})`
        );
      },
    });

    console.log(
      `[AI Chat] Built ${messages.length} messages for provider runtime (${conversation.messages.length} in DB)`
    );

    // 7. Call provider adapter with two-stage failover
    // In prototype mode (page_builder context), only provide read-only tools
    const builderMode = isPageBuilderContext ? args.builderMode : undefined;
    const availableTools = getToolSchemas(builderMode);
    if (availableTools.length > 0) {
      const selectedPlatformModel = platformEnabledModels.find(
        (platformModel) => platformModel.id === model
      );
      const toolingCapabilityGate = evaluateRoutingCapabilityRequirements({
        capabilityMatrix: selectedPlatformModel?.capabilityMatrix ?? undefined,
        requiredCapabilities: ["tools", "json"],
      });
      if (!toolingCapabilityGate.passed) {
        throw new Error(
          "Selected model route is not release-ready for tool calling. Enable a validated tools+json model and retry."
        );
      }
    }

    console.log(`[AI Chat] Builder mode: ${builderMode || 'none'}, available tools: ${availableTools.length}`);
    const recordAuthProfileSuccess = async ({
      organizationId,
      profileId,
      providerId,
    }: {
      organizationId: Id<"organizations">;
      profileId: string;
      providerId: string;
    }) => {
      await (ctx as any).runMutation(
        generatedApi.internal.ai.settings.recordAuthProfileSuccess,
        {
          organizationId,
          profileId,
          providerId,
        }
      );
    };
    const recordAuthProfileFailure = async ({
      organizationId,
      profileId,
      providerId,
      reason,
      cooldownUntil,
    }: {
      organizationId: Id<"organizations">;
      profileId: string;
      providerId: string;
      reason: string;
      cooldownUntil: number;
    }) => {
      await (ctx as any).runMutation(
        generatedApi.internal.ai.settings.recordAuthProfileFailure,
        {
          organizationId,
          profileId,
          providerId,
          reason,
          cooldownUntil,
        }
      );
    };

    const initialCompletion = await executeChatCompletionWithFailover({
      organizationId: args.organizationId,
      primaryModelId: model,
      messages,
      tools: availableTools,
      selectedModel: args.selectedModel,
      conversationPinnedModel,
      conversationPinnedAuthProfileId,
      orgEnabledModelIds: runtimeOrgModelPool,
      orgDefaultModelId: orgDefaultModel,
      platformEnabledModelIds: runtimeModelPool,
      safeFallbackModelId: runtimeSafeFallbackModelId,
      authProfiles: authProfilesWithBaseUrl,
      llmTemperature: settings.llm.temperature,
      llmMaxTokens: settings.llm.maxTokens,
      authProfileFailureCounts,
      onAuthProfileSuccess: recordAuthProfileSuccess,
      onAuthProfileFailure: recordAuthProfileFailure,
      onFailoverSuccess: ({
        primaryModelId,
        usedModel,
        selectedAuthProfileId,
        usedAuthProfileId,
        modelFallbackUsed,
        authProfileFallbackUsed,
      }) => {
        const failoverStage = modelFallbackUsed
          ? "model_failover"
          : authProfileFallbackUsed
            ? "auth_profile_rotation"
            : "none";
        console.log("[AI Chat][FailoverStage]", {
          primaryModelId,
          usedModel,
          selectedAuthProfileId,
          usedAuthProfileId,
          failoverStage,
        });
      },
      onAttemptFailure: ({ modelId, profileId, errorMessage }) => {
        console.error(
          `[AI Chat] Model ${modelId} failed with auth profile ${profileId}:`,
          errorMessage
        );
      },
      includeSessionPin: true,
    }) as ChatRuntimeFailoverResult;
    let response: ChatResponse = initialCompletion.response as unknown as ChatResponse;
    let usedModel = initialCompletion.usedModel;
    let selectedAuthProfileId = initialCompletion.selectedAuthProfileId;
    let usedAuthProfileId = initialCompletion.usedAuthProfileId;
    let authProfileFailoverCount = initialCompletion.authProfileFallbackUsed ? 1 : 0;
    let modelFailoverCount = initialCompletion.modelFallbackUsed ? 1 : 0;
    await getModelPricing(usedModel);
    let provider = detectProvider(
      usedModel,
      (usedAuthProfileId && authProfileProviderById.get(usedAuthProfileId)) ??
        (selectedAuthProfileId &&
          authProfileProviderById.get(selectedAuthProfileId)) ??
        runtimeProviderId
    );
    let providerConfig = getProviderConfig(provider);

    // 8. Handle tool calls (with provider-specific max rounds to prevent infinite loops)
    const toolCalls: ToolCallResult[] = [];
    let toolCallRounds = 0;
    let maxToolCallRounds = providerConfig.maxToolCallRounds;
    let hasProposedTools = false; // Track if any tools were proposed (not executed)

    while (toolCallRounds < maxToolCallRounds) {
      const currentToolCalls = response.choices[0].message.tool_calls;
      if (!currentToolCalls) {
        break;
      }

      toolCallRounds++;
      console.log(`[AI Chat] Tool call round ${toolCallRounds}`);

      // Add assistant message with tool calls first
      // Ensure all tool calls contain normalized argument strings before replaying to providers.
      const toolCallsWithArgs = normalizeToolCallsForProvider<ToolCallFromAPI>(
        currentToolCalls
      );

      messages.push({
        role: "assistant" as const,
        content: response.choices[0].message.content || "",
        tool_calls: toolCallsWithArgs,
      });

      // Execute each tool call
      for (const toolCall of toolCallsWithArgs) {
        const startTime = Date.now();

        const parsedArgsResult = parseToolCallArguments(
          toolCall.function.arguments,
          { strict: false }
        );
        const parsedArgs = parsedArgsResult.args;
        if (parsedArgsResult.error) {
          console.error(
            `[AI Chat] Failed to parse tool arguments for ${toolCall.function.name}:`,
            toolCall.function.arguments,
            parsedArgsResult.error
          );
        }

        // CRITICAL DECISION: Should this tool be proposed or executed immediately?
        const needsApproval = shouldRequireToolApproval({
          autonomyLevel: chatApprovalPolicy.autonomyLevel,
          toolName: toolCall.function.name,
          requireApprovalFor: chatApprovalPolicy.requireApprovalFor,
          toolArgs: parsedArgs,
        });
        // Auto-recovery bypasses approval so retries can execute immediately.
        const shouldPropose = !args.isAutoRecovery && needsApproval;

        try {

          let result: unknown;

          if (shouldPropose) {
            // Create a proposal instead of executing
            const executionId = await (ctx as any).runMutation(generatedApi.api.ai.conversations.proposeToolExecution, {
              conversationId,
              organizationId: args.organizationId,
              userId: args.userId,
              toolName: toolCall.function.name,
              parameters: parsedArgs,
              proposalMessage: `AI wants to execute: ${toolCall.function.name}`,
            });

            result = {
              status: "pending_approval",
              executionId,
              message: `I've created a proposal for your review. Please approve it in the Tool Execution panel.`,
            };

            hasProposedTools = true; // Mark that we have proposals pending
            console.log("[AI Chat] Tool proposed for approval:", toolCall.function.name, executionId);
          } else {
            // Execute tool immediately
            result = await executeTool(
              {
                ...ctx,
                organizationId: args.organizationId,
                userId: args.userId,
                conversationId, // Pass conversationId for feature requests
                runtimePolicy: {
                  codeExecution: {
                    autonomyLevel: chatApprovalPolicy.autonomyLevel,
                    requireApprovalFor: chatApprovalPolicy.requireApprovalFor || [],
                    approvalRequired: needsApproval,
                    approvalGranted: !needsApproval,
                    policySource: "chat_tool_approval_policy",
                  },
                },
              },
              toolCall.function.name,
              parsedArgs
            );
          }

          const durationMs = Date.now() - startTime;

          // If this was a proposal, don't log it as executed yet
          // The logging already happened in proposeToolExecution
          if (!shouldPropose) {
            // Determine status based on result.success field
            // Tools can return { success: false, error: "...", actionButton: {...} } for OAuth errors
            const executionStatus = result && typeof result === 'object' && 'success' in result && result.success === false
              ? "failed"
              : "success";

            // Log execution (use parsedArgs, not re-parse!)
            await (ctx as any).runMutation(generatedApi.api.ai.conversations.logToolExecution, {
              conversationId,
              organizationId: args.organizationId,
              userId: args.userId,
              toolName: toolCall.function.name,
              parameters: parsedArgs,
              result,
              status: executionStatus,
              tokensUsed: response.usage?.total_tokens || 0,
              costUsd: calculateUsageCost(response.usage, usedModel),
              executedAt: Date.now(),
              durationMs,
            });
          }

          toolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: parsedArgs,
            result,
            status: shouldPropose ? "pending_approval" : "success",
          });

          // Add tool result to messages ONLY if tool was actually executed
          // (Not when it's just proposed for approval)
          if (!shouldPropose) {
            const toolResultMessage = formatToolResult(
              provider,
              toolCall.id,
              toolCall.function.name,
              result
            );
            messages.push(toolResultMessage as ChatMessage);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[AI Chat] Tool execution failed: ${toolCall.function.name}`, error);

          // Log failed execution (use parsedArgs, not re-parse!)
          await (ctx as any).runMutation(generatedApi.api.ai.conversations.logToolExecution, {
            conversationId,
            organizationId: args.organizationId,
            userId: args.userId,
            toolName: toolCall.function.name,
            parameters: parsedArgs,
            error: errorMessage,
            status: "failed",
            tokensUsed: response.usage?.total_tokens || 0,
            costUsd: calculateUsageCost(response.usage, usedModel),
            executedAt: Date.now(),
            durationMs: Date.now() - startTime,
          });

          toolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: parsedArgs,
            result: undefined,
            error: errorMessage,
            status: "failed",
          });

          // Add tool error to messages (provider-specific format)
          // Create a user-friendly error message for feature requests in the user's language
          const isFeatureRequest = errorMessage.includes("not yet") ||
                                   errorMessage.includes("coming soon") ||
                                   errorMessage.includes("placeholder");

          // Get user's preferred language from organization settings
          const userLanguage = detectUserLanguage(settings);

          const userFriendlyError = isFeatureRequest
            ? getFeatureRequestMessage(toolCall.function.name, userLanguage)
            : errorMessage;

          // Add tool error to messages ONLY if tool was actually executed
          // (Proposals should never error since they don't execute)
          if (!shouldPropose) {
            const toolErrorMessage = formatToolError(
              provider,
              toolCall.id,
              toolCall.function.name,
              userFriendlyError
            );
            messages.push(toolErrorMessage as ChatMessage);
          }

          // 🚨 SEND FEATURE REQUEST EMAIL TO DEV TEAM
          // This helps prioritize which tools to build next based on actual user needs
          try {
            // Get the original user message from conversation
            const conversationData = await (ctx as any).runQuery(generatedApi.api.ai.conversations.getConversation, {
              conversationId,
            }) as { messages: ConversationMessage[] };
            const userMessages = conversationData.messages.filter((m) => m.role === "user");
            const lastUserMessage = userMessages[userMessages.length - 1]?.content || args.message;

            // Send feature request email (don't await - fire and forget)
            (ctx as any).runAction(generatedApi.internal.ai.featureRequestEmail.sendFeatureRequest, {
              userId: args.userId,
              organizationId: args.organizationId,
              toolName: toolCall.function.name,
              toolParameters: parsedArgs,
              errorMessage: errorMessage,
              conversationId: conversationId!, // Guaranteed set at this point
              userMessage: lastUserMessage,
              aiResponse: undefined, // Will be filled after AI responds
              occurredAt: Date.now(),
            }).catch((emailError: unknown) => {
              // Don't fail the main flow if email fails
              console.error("[AI Chat] Failed to send feature request email:", emailError);
            });

            console.log(`[AI Chat] Feature request email triggered for failed tool: ${toolCall.function.name}`);
          } catch (emailError) {
            // Don't fail the main flow if email system fails
            console.error("[AI Chat] Error in feature request email system:", emailError);
          }
        }
      }

      // CRITICAL: If any tools were proposed (not executed), break out of the loop
      // We can't continue the conversation because we don't have tool results yet
      // The user must approve the proposals first, then executeApprovedTool will feed results back
      if (hasProposedTools) {
        console.log("[AI Chat] Breaking tool loop - waiting for user approval");
        break;
      }

      // Get next response after tool execution (without tools to force final answer)
      try {
        const followUpCompletion = await executeChatCompletionWithFailover({
          organizationId: args.organizationId,
          primaryModelId: usedModel,
          messages,
          selectedModel: args.selectedModel,
          conversationPinnedModel,
          orgEnabledModelIds: runtimeOrgModelPool,
          orgDefaultModelId: orgDefaultModel,
          platformEnabledModelIds: runtimeModelPool,
          safeFallbackModelId: runtimeSafeFallbackModelId,
          authProfiles: authProfilesWithBaseUrl,
          llmTemperature: settings.llm.temperature,
          llmMaxTokens: settings.llm.maxTokens,
          authProfileFailureCounts,
          onAuthProfileSuccess: recordAuthProfileSuccess,
          onAuthProfileFailure: recordAuthProfileFailure,
          onFailoverSuccess: ({
            primaryModelId,
            usedModel,
            selectedAuthProfileId,
            usedAuthProfileId,
            modelFallbackUsed,
            authProfileFallbackUsed,
          }) => {
            const failoverStage = modelFallbackUsed
              ? "model_failover"
              : authProfileFallbackUsed
                ? "auth_profile_rotation"
                : "none";
            console.log("[AI Chat][FailoverStage]", {
              primaryModelId,
              usedModel,
              selectedAuthProfileId,
              usedAuthProfileId,
              failoverStage,
            });
          },
          onAttemptFailure: ({ modelId, profileId, errorMessage }) => {
            console.error(
              `[AI Chat] Model ${modelId} failed with auth profile ${profileId}:`,
              errorMessage
            );
          },
          includeSessionPin: false,
          preferredAuthProfileId: usedAuthProfileId ?? selectedAuthProfileId,
        }) as ChatRuntimeFailoverResult;
        response = followUpCompletion.response as unknown as ChatResponse;
        usedModel = followUpCompletion.usedModel;
        selectedAuthProfileId = followUpCompletion.selectedAuthProfileId;
        usedAuthProfileId = followUpCompletion.usedAuthProfileId;
        if (followUpCompletion.authProfileFallbackUsed) {
          authProfileFailoverCount += 1;
        }
        if (followUpCompletion.modelFallbackUsed) {
          modelFailoverCount += 1;
        }
        await getModelPricing(usedModel);
        provider = detectProvider(
          usedModel,
          (usedAuthProfileId && authProfileProviderById.get(usedAuthProfileId)) ??
            (selectedAuthProfileId &&
              authProfileProviderById.get(selectedAuthProfileId)) ??
            runtimeProviderId
        );
        providerConfig = getProviderConfig(provider);
        maxToolCallRounds = Math.max(
          maxToolCallRounds,
          providerConfig.maxToolCallRounds
        );
      } catch (apiError) {
        const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
        console.error("[AI Chat] Provider API error (after tool execution):", errorMessage);
        throw new Error(errorMessage);
      }
    }

    // If we hit max rounds, log a warning
    if (toolCallRounds >= maxToolCallRounds && response.choices[0].message.tool_calls) {
      console.warn(`[AI Chat] Max tool call rounds (${maxToolCallRounds}) reached, forcing final response`);
    }

    // 9. Save assistant message
    const finalMessage = response.choices[0]?.message;
    if (!finalMessage) {
      throw new Error("No message in final provider response");
    }
    const modelResolution = buildModelResolutionPayload({
      requestedModel: args.selectedModel ?? undefined,
      selectedModel: model,
      selectionSource,
      usedModel,
      selectedAuthProfileId,
      usedAuthProfileId,
    });
    const failoverStage =
      modelFailoverCount > 0
        ? "model_failover"
        : authProfileFailoverCount > 0
          ? "auth_profile_rotation"
          : "none";

    await (ctx as any).runMutation(generatedApi.api.ai.conversations.setConversationModel, {
      conversationId,
      modelId: usedModel,
    });

    console.log("[AI Chat][ModelResolution]", {
      selectedModel: model,
      usedModel,
      requestedModel: args.selectedModel ?? null,
      preferredModel,
      orgDefaultModel,
      fallbackModel:
        modelResolution.fallbackUsed
          ? usedModel
          : null,
      selectionSource,
      fallbackReason: modelResolution.fallbackReason ?? null,
      selectedAuthProfileId,
      usedAuthProfileId,
      failoverStage,
      authProfileFailoverCount,
      modelFailoverCount,
      platformEnabledModelCount: platformEnabledModels.length,
      provider,
      context: args.context || "normal",
    });

    // CRITICAL: If tools were proposed (not executed), create a user-friendly message
    // but DON'T include toolCalls in the saved message (they'll break future conversations)
    const executedToolCalls = toolCalls
      .filter((tc): tc is ToolCallResult & { status: "success" | "failed" } =>
        tc.status !== "pending_approval"
      );
    const proposedToolCount = toolCalls.length - executedToolCalls.length;

    // IMPORTANT: Don't add assistant messages to chat when tools are proposed
    // The proposals should ONLY appear in the Tool Execution panel, not in the main chat
    if (proposedToolCount === 0) {
      // No proposals - this is a normal response or executed tool results
      let messageContent = finalMessage.content;
      if (!messageContent) {
        if (executedToolCalls.length > 0) {
          messageContent = `Executed ${executedToolCalls.length} tool(s): ${executedToolCalls.map(t => t.name).join(", ")}`;
        } else {
          messageContent = "I'm here to help, but I didn't generate a response.";
        }
      }

      await (ctx as any).runMutation(generatedApi.api.ai.conversations.addMessage, {
        conversationId,
        role: "assistant",
        content: messageContent,
        timestamp: Date.now(),
        // ONLY save toolCalls if they were actually executed (not just proposed)
        // This prevents breaking the conversation when loading history
        toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
        modelResolution,
      });
    }
    // If proposedToolCount > 0, don't add any chat message - the proposals are in the Tool Execution panel

    // 10. Update monthly spend
    const cost = calculateUsageCost(response.usage, usedModel);
    await (ctx as any).runMutation(generatedApi.api.ai.settings.updateMonthlySpend, {
      organizationId: args.organizationId,
      costUsd: cost,
    });

    // 11. Deduct credits for the successful chat turn.
    const deductionLlmBillingSource = resolveLlmBillingSource(
      usedAuthProfileId ?? selectedAuthProfileId ?? authProfilesWithBaseUrl[0]?.profileId ?? null
    );
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
    const nativeCostInCents = Math.max(0, Math.round(cost * 100));
    let chatCreditsCharged = 0;
    let chatCreditChargeStatus:
      | "charged"
      | "skipped_unmetered"
      | "skipped_insufficient_credits"
      | "skipped_not_required"
      | "failed" = "failed";

    try {
      const chatCreditDeduction = await (ctx as any).runMutation(
        generatedApi.internal.credits.index.deductCreditsInternalMutation,
        {
          organizationId: args.organizationId,
          userId: args.userId,
          amount: messageCreditCost,
          action: "agent_message",
          relatedEntityType: "ai_conversation",
          relatedEntityId: String(conversationId),
          billingSource: deductionLlmBillingSource,
          requestSource: "llm",
          softFailOnExhausted: true,
        }
      );

      if (chatCreditDeduction.success && !chatCreditDeduction.skipped) {
        chatCreditsCharged = messageCreditCost;
        chatCreditChargeStatus = "charged";
      } else if (chatCreditDeduction.success && chatCreditDeduction.skipped) {
        chatCreditChargeStatus = "skipped_not_required";
      } else if (!chatCreditDeduction.success) {
        chatCreditChargeStatus = "skipped_insufficient_credits";
        console.warn("[AI Chat] Credit deduction skipped:", {
          organizationId: args.organizationId,
          errorCode: chatCreditDeduction.errorCode,
          message: chatCreditDeduction.message,
          creditsRequired: chatCreditDeduction.creditsRequired,
          creditsAvailable: chatCreditDeduction.creditsAvailable,
        });
      }
    } catch (error) {
      console.error("[AI Chat] Credit deduction failed after successful response:", error);
      chatCreditChargeStatus = "failed";
    }

    try {
      await (ctx as any).runMutation(generatedApi.api.ai.billing.recordUsage, {
        organizationId: args.organizationId,
        userId: args.userId,
        requestType: "chat",
        provider,
        model: usedModel,
        action: "chat_completion",
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
        creditsCharged: chatCreditsCharged,
        creditChargeStatus: chatCreditChargeStatus,
        success: true,
        billingSource: deductionLlmBillingSource,
        requestSource: "llm",
        ledgerMode: "credits_ledger",
        creditLedgerAction: "agent_message",
        usageMetadata: {
          context: args.context || "normal",
          selectionSource,
          failoverStage,
          selectedAuthProfileId,
          usedAuthProfileId,
          proposedToolCount,
          containsVisionAttachments: conversationHasImageAttachments,
          visionAttachmentCount: conversationHasImageAttachments
            ? resolvedAttachments.length
            : 0,
          visionPreferredProvider: conversationHasImageAttachments
            ? "gemini"
            : null,
        },
      });
    } catch (error) {
      console.error("[AI Chat] Failed to persist AI usage telemetry:", error);
    }

    // 12. Collect training data (silent, non-blocking)
    try {
      const exampleType = args.context === "page_builder" ? "page_generation" : "tool_invocation";

      // Try to parse JSON from response for page builder
      let generatedJson: unknown = undefined;
      if (args.context === "page_builder") {
        generatedJson = response.structuredOutput?.value;

        if (!generatedJson && finalMessage.content) {
          const jsonMatch = finalMessage.content.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            try {
              generatedJson = JSON.parse(jsonMatch[1]);
            } catch {
              // Invalid JSON, leave as undefined
            }
          }
        }
      }

      await (ctx as any).runMutation(generatedApi.internal.ai.trainingData.collectTrainingExample, {
        conversationId: conversationId!,
        organizationId: args.organizationId,
        exampleType,
        input: {
          userMessage: args.message,
          // previousContext could be added if needed
        },
        output: {
          response: finalMessage.content || "",
          generatedJson,
          toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
        },
        modelUsed: usedModel,
      });
    } catch (error) {
      // Don't fail the main request if training data collection fails
      console.error("[Training] Failed to collect training example:", error);
    }

    // Return message only if we saved one (i.e., no proposals)
    const returnMessage = proposedToolCount > 0
      ? "" // No message for proposals - they appear in Tool Execution panel only
      : (finalMessage.content || `Executed ${executedToolCalls.length} tool(s)`);

    return {
      conversationId: conversationId!, // Guaranteed set by createConversation
      slug: conversationSlug,          // Only set for new conversations
      message: returnMessage,
      toolCalls,
      usage: response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      cost,
      modelResolution,
    };
  },
});
