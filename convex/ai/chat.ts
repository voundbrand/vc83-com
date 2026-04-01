/**
 * AI Chat Action
 *
 * Main entry point for AI conversations using provider adapters
 */

import { action, internalMutation, internalQuery } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { v, ConvexError } from "convex/values";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");
import { getToolSchemas, executeTool, type ToolExecutionContext } from "./tools/registry";
import { calculateCostFromUsage } from "./model/modelPricing";
import { getAgentMessageCost } from "../credits/index";
import {
  buildEnvApiKeysByProvider,
  detectProvider,
  formatToolResult,
  formatToolError,
  getProviderConfig,
  resolveAuthProfileBaseUrl,
} from "./model/modelAdapters";
import {
  SAFE_FALLBACK_MODEL_ID,
  determineModelSelectionSource,
  isModelAllowedForOrg,
  normalizeCanonicalBillingSource,
  resolveOrgDefaultModel,
  resolveRequestedModel,
  selectFirstPlatformEnabledModel,
} from "./model/modelPolicy";
import { evaluateRoutingCapabilityRequirements } from "./model/modelEnablementGates";
import {
  buildAuthProfileFailureCountMap,
  resolveAuthProfilesForProvider,
} from "./authProfilePolicy";
import { shouldRequireToolApproval, type ToolApprovalAutonomyLevel } from "./escalation";
import { getFeatureRequestMessage, detectUserLanguage } from "./i18nHelper";
import { getPageBuilderPrompt } from "./prompts/pageBuilderSystem";
import { getLayersBuilderPrompt } from "./prompts/layersBuilderSystem";
import { composeKnowledgeContract } from "./systemKnowledge";
import {
  normalizeToolCallsForProvider,
  parseToolCallArguments,
} from "./toolBroker";
import {
  buildConfigureAgentFieldsProposalEnvelope,
  CONFIGURE_AGENT_FIELDS_TOOL_NAME,
} from "./tools/configureAgentFieldsTool";
import {
  buildOpenRouterMessages,
  executeChatCompletionWithFailover,
  shouldSuppressLatestUserImageAttachments as shouldSuppressLatestUserImageAttachmentsForVoiceRuntime,
  type ChatRuntimeFailoverResult,
} from "./chatRuntimeOrchestration";
import { getNodeDefinition } from "../layers/nodeRegistry";
import { normalizeConversationRoutingPin } from "./conversations";
import { evaluateSessionRoutingPinUpdate } from "./sessionRoutingPolicy";
import {
  TRUST_EVENT_TAXONOMY_VERSION,
  validateTrustEventPayload,
  type TrustEventPayload,
} from "./trustEvents";
import {
  EVAL_RUN_FAIL_CLOSED_REASON_CODE_VALUES,
  EVAL_RUN_LIFECYCLE_SNAPSHOT_CONTRACT_VERSION,
  EVAL_RUN_LIFECYCLE_TRUST_EVENT_NAME,
  buildEvalRunLifecycleTrustPayload,
  classifyVoiceProviderFailureReason,
  normalizeEvalRunLifecycleReasonCodes,
  normalizeVoiceRuntimeTelemetryContract,
  resolveEvalRunLifecycleTransitionReasonCode,
  type EvalRunLifecycleNormalizedReasonCode,
  type EvalRunLifecycleState,
  type VoiceRuntimeTelemetryContract,
  type VoiceRuntimeTelemetryEvent,
} from "./trustTelemetry";
import { ONBOARDING_DEFAULT_MODEL_ID } from "./model/modelDefaults";
import { canUsePlatformMotherCustomerFacingSupport } from "../platformMother";
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
    title =
      context === "page_builder"
        ? "New Page"
        : context === "layers_builder"
          ? "New Workflow"
          : "New Chat";
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

interface LayersBuilderNodePayload {
  id: string;
  type: string;
  label?: string;
  position: { x: number; y: number };
  config?: Record<string, unknown>;
}

interface LayersBuilderEdgePayload {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface LayersBuilderWorkflowPayload {
  nodes: LayersBuilderNodePayload[];
  edges: LayersBuilderEdgePayload[];
  description?: string;
}

function extractLayersBuilderJsonBlock(content: string): string | null {
  const jsonBlock = content.match(/```json\s*([\s\S]*?)```/i);
  if (jsonBlock?.[1]) {
    return jsonBlock[1].trim();
  }
  const genericBlock = content.match(/```\s*([\s\S]*?)```/);
  if (genericBlock?.[1]) {
    const blockBody = genericBlock[1].trim();
    if (blockBody.startsWith("{")) {
      return blockBody;
    }
  }
  const objectMatch = content.match(/(\{[\s\S]*"nodes"\s*:\s*\[[\s\S]*\})/);
  return objectMatch?.[1]?.trim() ?? null;
}

function normalizeFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function normalizeLayersBuilderWorkflowPayload(
  content: string,
): LayersBuilderWorkflowPayload {
  const jsonBlock = extractLayersBuilderJsonBlock(content);
  if (!jsonBlock) {
    throw new ConvexError({
      code: "LAYERS_BUILDER_STRUCTURED_OUTPUT_REQUIRED",
      message: "Layers builder response must include a workflow JSON block.",
    });
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(jsonBlock);
  } catch (error) {
    throw new ConvexError({
      code: "LAYERS_BUILDER_INVALID_JSON",
      message: "Layers builder returned invalid JSON.",
      details: error instanceof Error ? error.message : "json_parse_failed",
    });
  }

  const payloadRecord =
    rawPayload && typeof rawPayload === "object"
      ? (rawPayload as Record<string, unknown>)
      : null;
  if (!payloadRecord) {
    throw new ConvexError({
      code: "LAYERS_BUILDER_INVALID_PAYLOAD",
      message: "Layers builder payload must be a JSON object.",
    });
  }

  const rawNodes = Array.isArray(payloadRecord.nodes) ? payloadRecord.nodes : null;
  const rawEdges = Array.isArray(payloadRecord.edges) ? payloadRecord.edges : null;
  if (!rawNodes || !rawEdges || rawNodes.length === 0) {
    throw new ConvexError({
      code: "LAYERS_BUILDER_INVALID_PAYLOAD",
      message: "Layers builder payload must include non-empty nodes and edges arrays.",
    });
  }

  if (rawNodes.length > 120 || rawEdges.length > 240) {
    throw new ConvexError({
      code: "LAYERS_BUILDER_PAYLOAD_TOO_LARGE",
      message: "Layers builder payload exceeds deterministic safety bounds.",
      maxNodes: 120,
      maxEdges: 240,
    });
  }

  const seenNodeIds = new Set<string>();
  const nodes: LayersBuilderNodePayload[] = rawNodes.map((entry, index) => {
    const record =
      entry && typeof entry === "object"
        ? (entry as Record<string, unknown>)
        : null;
    if (!record) {
      throw new ConvexError({
        code: "LAYERS_BUILDER_INVALID_NODE",
        message: "Each workflow node must be an object.",
        nodeIndex: index,
      });
    }
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const type = typeof record.type === "string" ? record.type.trim() : "";
    const positionRecord =
      record.position && typeof record.position === "object"
        ? (record.position as Record<string, unknown>)
        : null;
    const x = normalizeFiniteNumber(positionRecord?.x);
    const y = normalizeFiniteNumber(positionRecord?.y);
    if (!id || !type || x === null || y === null) {
      throw new ConvexError({
        code: "LAYERS_BUILDER_INVALID_NODE",
        message: "Node entries must include id, type, and finite position coordinates.",
        nodeIndex: index,
      });
    }
    if (seenNodeIds.has(id)) {
      throw new ConvexError({
        code: "LAYERS_BUILDER_DUPLICATE_NODE_ID",
        message: "Node IDs must be unique.",
        nodeId: id,
      });
    }
    seenNodeIds.add(id);

    if (!getNodeDefinition(type)) {
      throw new ConvexError({
        code: "LAYERS_BUILDER_UNKNOWN_NODE_TYPE",
        message: `Unknown node type "${type}" in Layers builder response.`,
        nodeId: id,
        nodeType: type,
      });
    }

    const config =
      record.config && typeof record.config === "object"
        ? (record.config as Record<string, unknown>)
        : undefined;

    return {
      id,
      type,
      label: typeof record.label === "string" ? record.label : undefined,
      position: { x, y },
      config,
    };
  });

  const edges: LayersBuilderEdgePayload[] = rawEdges.map((entry, index) => {
    const record =
      entry && typeof entry === "object"
        ? (entry as Record<string, unknown>)
        : null;
    if (!record) {
      throw new ConvexError({
        code: "LAYERS_BUILDER_INVALID_EDGE",
        message: "Each workflow edge must be an object.",
        edgeIndex: index,
      });
    }
    const source = typeof record.source === "string" ? record.source.trim() : "";
    const target = typeof record.target === "string" ? record.target.trim() : "";
    if (!source || !target || !seenNodeIds.has(source) || !seenNodeIds.has(target)) {
      throw new ConvexError({
        code: "LAYERS_BUILDER_INVALID_EDGE",
        message: "Edges must reference existing node IDs for source and target.",
        edgeIndex: index,
      });
    }
    return {
      source,
      target,
      sourceHandle:
        typeof record.sourceHandle === "string" && record.sourceHandle.trim().length > 0
          ? record.sourceHandle.trim()
          : undefined,
      targetHandle:
        typeof record.targetHandle === "string" && record.targetHandle.trim().length > 0
          ? record.targetHandle.trim()
          : undefined,
    };
  });

  const description =
    typeof payloadRecord.description === "string"
      ? payloadRecord.description.trim()
      : undefined;

  return {
    nodes,
    edges,
    description: description && description.length > 0 ? description : undefined,
  };
}

function formatLayersBuilderResponse(payload: LayersBuilderWorkflowPayload): string {
  const normalizedPayload = {
    nodes: payload.nodes,
    edges: payload.edges,
    description: payload.description,
  };
  const jsonBlock = `\`\`\`json\n${JSON.stringify(normalizedPayload, null, 2)}\n\`\`\``;
  if (payload.description) {
    return `${payload.description}\n\n${jsonBlock}`;
  }
  return `Workflow draft generated.\n\n${jsonBlock}`;
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

export const WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION = "wae_eval_run_envelope_v1" as const;
const WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION = "wae_eval_org_lifecycle_v1" as const;
const WAE_EVAL_TRACE_PLAYBACK_CONTRACT_VERSION = "wae_eval_run_playback_trace_v1" as const;
const WAE_EVAL_TRACE_DIFF_CONTRACT_VERSION = "wae_eval_run_diff_trace_v1" as const;
const WAE_EVAL_PROMOTION_EVIDENCE_PACKET_CONTRACT_VERSION =
  "wae_eval_promotion_evidence_packet_v1" as const;
const WAE_EVAL_LIFECYCLE_EVIDENCE_CONTRACT_VERSION = "wae_eval_lifecycle_evidence_v1" as const;
const WAE_EVAL_ARTIFACT_POINTER_CONTRACT_VERSION = "wae_eval_lifecycle_artifact_pointer_v1" as const;
const EVAL_RUN_FAIL_CLOSED_REASON_CODE_SET = new Set<string>(
  EVAL_RUN_FAIL_CLOSED_REASON_CODE_VALUES,
);

interface EvalRunEnvelopeContext {
  runId: string;
  scenarioId?: string;
  agentId?: string;
  label?: string;
  artifactPointer?: string;
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

function normalizeEvalRunEnvelopeContext(args: {
  rawEnvelope: unknown;
  qaMode?: SuperAdminAgentQaRuntimeContract;
}): EvalRunEnvelopeContext | undefined {
  const raw =
    args.rawEnvelope && typeof args.rawEnvelope === "object" && !Array.isArray(args.rawEnvelope)
      ? (args.rawEnvelope as Record<string, unknown>)
      : undefined;
  const runId =
    normalizeNonEmptyString(raw?.runId)
    || normalizeNonEmptyString(args.qaMode?.runId);
  if (!runId) {
    return undefined;
  }
  return {
    runId,
    scenarioId: normalizeNonEmptyString(raw?.scenarioId),
    agentId:
      normalizeNonEmptyString(raw?.agentId)
      || normalizeNonEmptyString(args.qaMode?.targetAgentId),
    label:
      normalizeNonEmptyString(raw?.label)
      || normalizeNonEmptyString(args.qaMode?.label),
    artifactPointer:
      normalizeEvalArtifactPointer(raw?.artifactPointer)
      || normalizeEvalArtifactPointer(raw?.artifactsPointer),
  };
}

type EvalToolExecutionStatus =
  | "proposed"
  | "approved"
  | "executing"
  | "success"
  | "failed"
  | "rejected"
  | "cancelled";

export interface EvalRunTraceToolExecutionRecord {
  executionId: string;
  conversationId: string;
  organizationId: string;
  userId: string;
  toolName: string;
  status: EvalToolExecutionStatus;
  parameters: unknown;
  result?: unknown;
  error?: string;
  tokensUsed: number;
  costUsd: number;
  executedAt: number;
  durationMs: number;
  evalEnvelope: {
    contractVersion: typeof WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION;
    runId: string;
    scenarioId?: string;
    agentId?: string;
    label?: string;
    toolCallId?: string;
    toolCallRound?: number;
    verdict?: "passed" | "failed" | "blocked";
    artifactPointer?: string;
    timings: {
      turnStartedAt: number;
      toolStartedAt: number;
      toolCompletedAt: number;
      durationMs: number;
    };
  };
}

export interface EvalLifecycleEvidencePaths {
  contractVersion: typeof WAE_EVAL_LIFECYCLE_EVIDENCE_CONTRACT_VERSION;
  lifecycleContractVersion: typeof WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION;
  artifactPointer: string;
  lifecycleRoot?: string;
  pinManifestPath: string;
  createReceiptPath: string;
  resetReceiptPath: string;
  teardownReceiptPath: string;
  evidenceIndexPath: string;
}

export interface EvalRunPlaybackSummary {
  runId: string;
  scenarioId?: string;
  agentId?: string;
  label?: string;
  verdict?: "passed" | "failed" | "blocked";
  lifecycleState: EvalRunLifecycleState;
  lifecycleReasonCodes: EvalRunLifecycleNormalizedReasonCode[];
  totalToolExecutions: number;
  returnedToolExecutions: number;
  truncated: boolean;
  totalDurationMs: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  statusCounts: Record<EvalToolExecutionStatus, number>;
}

export interface EvalRunPlaybackTracePayload {
  contractVersion: typeof WAE_EVAL_TRACE_PLAYBACK_CONTRACT_VERSION;
  envelopeContractVersion: typeof WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION;
  lifecycleContractVersion: typeof WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION;
  lifecycleSnapshotContractVersion: typeof EVAL_RUN_LIFECYCLE_SNAPSHOT_CONTRACT_VERSION;
  status: "ready" | "blocked";
  reasonCodes: string[];
  organizationId: Id<"organizations">;
  run: EvalRunPlaybackSummary;
  lifecycleEvidence: EvalLifecycleEvidencePaths | null;
  toolExecutions: EvalRunTraceToolExecutionRecord[];
}

export interface EvalRunDiffTracePayload {
  contractVersion: typeof WAE_EVAL_TRACE_DIFF_CONTRACT_VERSION;
  envelopeContractVersion: typeof WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION;
  lifecycleContractVersion: typeof WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION;
  lifecycleSnapshotContractVersion: typeof EVAL_RUN_LIFECYCLE_SNAPSHOT_CONTRACT_VERSION;
  status: "ready" | "blocked";
  reasonCodes: string[];
  organizationId: Id<"organizations">;
  baseline: EvalRunPlaybackSummary;
  candidate: EvalRunPlaybackSummary;
  comparison: {
    verdictChanged: boolean;
    lifecycleStateChanged: boolean;
    toolCountDelta: number;
    durationDeltaMs: number;
    tokensDelta: number;
    costDeltaUsd: number;
    addedTools: string[];
    removedTools: string[];
    statusCountDelta: Record<EvalToolExecutionStatus, number>;
    sequenceDiff: Array<{
      position: number;
      changeType: "unchanged" | "modified" | "added" | "removed";
      baseline?: {
        toolName: string;
        status: EvalToolExecutionStatus;
        verdict?: "passed" | "failed" | "blocked";
      };
      candidate?: {
        toolName: string;
        status: EvalToolExecutionStatus;
        verdict?: "passed" | "failed" | "blocked";
      };
    }>;
  };
}

export interface EvalPromotionEvidencePacketPayload {
  contractVersion: typeof WAE_EVAL_PROMOTION_EVIDENCE_PACKET_CONTRACT_VERSION;
  envelopeContractVersion: typeof WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION;
  lifecycleContractVersion: typeof WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION;
  lifecycleSnapshotContractVersion: typeof EVAL_RUN_LIFECYCLE_SNAPSHOT_CONTRACT_VERSION;
  status: "ready" | "blocked";
  reasonCodes: string[];
  organizationId: Id<"organizations">;
  runId: string;
  run: EvalRunPlaybackSummary;
  lifecycleEvidence: EvalLifecycleEvidencePaths | null;
  evidenceChecklist: {
    hasArtifactPointer: boolean;
    hasPinManifest: boolean;
    hasCreateReceipt: boolean;
    hasResetReceipt: boolean;
    hasTeardownReceipt: boolean;
    hasEvidenceIndex: boolean;
    hasTraceRows: boolean;
  };
  traces: Array<{
    executionId: string;
    toolName: string;
    status: EvalToolExecutionStatus;
    verdict?: "passed" | "failed" | "blocked";
    durationMs: number;
    tokensUsed: number;
    costUsd: number;
    toolCallRound?: number;
    toolCallId?: string;
  }>;
}

function collectLexicalReasonCodes(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeNonEmptyString(value))
        .filter((value): value is string => Boolean(value))
    )
  ).sort();
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

export function normalizeEvalArtifactPointer(value: unknown): string | undefined {
  const raw = normalizeNonEmptyString(value);
  if (raw) {
    return raw;
  }
  const record = normalizeRecord(value);
  if (!record) {
    return undefined;
  }
  const lifecycleRoot = normalizeNonEmptyString(record.lifecycleRoot);
  const pinManifestPath = normalizeNonEmptyString(record.pinManifestPath);
  const createReceiptPath = normalizeNonEmptyString(record.createReceiptPath);
  const resetReceiptPath = normalizeNonEmptyString(record.resetReceiptPath);
  const teardownReceiptPath = normalizeNonEmptyString(record.teardownReceiptPath);
  const evidenceIndexPath = normalizeNonEmptyString(record.evidenceIndexPath);
  if (
    !lifecycleRoot
    && !pinManifestPath
    && !createReceiptPath
    && !resetReceiptPath
    && !teardownReceiptPath
    && !evidenceIndexPath
  ) {
    return undefined;
  }
  const normalizedRoot = lifecycleRoot ? trimTrailingSlashes(lifecycleRoot) : undefined;
  const buildPath = (fileName: string) =>
    normalizedRoot ? `${normalizedRoot}/${fileName}` : undefined;
  return JSON.stringify({
    contractVersion: WAE_EVAL_ARTIFACT_POINTER_CONTRACT_VERSION,
    lifecycleRoot: normalizedRoot,
    pinManifestPath: pinManifestPath ?? buildPath("pin-manifest.json"),
    createReceiptPath: createReceiptPath ?? buildPath("create-receipt.json"),
    resetReceiptPath: resetReceiptPath ?? buildPath("reset-receipt.json"),
    teardownReceiptPath: teardownReceiptPath ?? buildPath("teardown-receipt.json"),
    evidenceIndexPath: evidenceIndexPath ?? buildPath("evidence-index.json"),
  });
}

export function resolveEvalLifecycleEvidence(args: {
  artifactPointer?: string;
}): { evidence: EvalLifecycleEvidencePaths | null; reasonCodes: string[] } {
  const pointer = normalizeNonEmptyString(args.artifactPointer);
  if (!pointer) {
    return {
      evidence: null,
      reasonCodes: ["missing_artifact_pointer"],
    };
  }

  const fromStructuredPointer = (() => {
    if (!pointer.startsWith("{")) {
      return null;
    }
    try {
      const parsed = JSON.parse(pointer) as Record<string, unknown>;
      if (
        normalizeNonEmptyString(parsed.contractVersion)
        !== WAE_EVAL_ARTIFACT_POINTER_CONTRACT_VERSION
      ) {
        return null;
      }
      const lifecycleRootRaw = normalizeNonEmptyString(parsed.lifecycleRoot);
      const lifecycleRoot = lifecycleRootRaw ? trimTrailingSlashes(lifecycleRootRaw) : undefined;
      const buildPath = (fileName: string) =>
        lifecycleRoot ? `${lifecycleRoot}/${fileName}` : undefined;
      const pinManifestPath =
        normalizeNonEmptyString(parsed.pinManifestPath) ?? buildPath("pin-manifest.json");
      const createReceiptPath =
        normalizeNonEmptyString(parsed.createReceiptPath) ?? buildPath("create-receipt.json");
      const resetReceiptPath =
        normalizeNonEmptyString(parsed.resetReceiptPath) ?? buildPath("reset-receipt.json");
      const teardownReceiptPath =
        normalizeNonEmptyString(parsed.teardownReceiptPath) ?? buildPath("teardown-receipt.json");
      const evidenceIndexPath =
        normalizeNonEmptyString(parsed.evidenceIndexPath) ?? buildPath("evidence-index.json");
      if (
        !pinManifestPath
        || !createReceiptPath
        || !resetReceiptPath
        || !teardownReceiptPath
        || !evidenceIndexPath
      ) {
        return {
          evidence: null,
          reasonCodes: ["missing_lifecycle_evidence_paths"],
        };
      }
      return {
        evidence: {
          contractVersion: WAE_EVAL_LIFECYCLE_EVIDENCE_CONTRACT_VERSION,
          lifecycleContractVersion: WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION,
          artifactPointer: pointer,
          lifecycleRoot,
          pinManifestPath,
          createReceiptPath,
          resetReceiptPath,
          teardownReceiptPath,
          evidenceIndexPath,
        } satisfies EvalLifecycleEvidencePaths,
        reasonCodes: [],
      };
    } catch {
      return {
        evidence: null,
        reasonCodes: ["invalid_artifact_pointer"],
      };
    }
  })();
  if (fromStructuredPointer) {
    return fromStructuredPointer;
  }

  const normalizedPointer = trimTrailingSlashes(pointer);
  const evidenceIndexSuffix = "/evidence-index.json";
  const lifecycleRoot = normalizedPointer.endsWith(evidenceIndexSuffix)
    ? normalizedPointer.slice(0, -evidenceIndexSuffix.length)
    : normalizedPointer.endsWith("evidence-index.json")
      ? normalizedPointer.slice(0, -"evidence-index.json".length).replace(/\/+$/, "")
      : normalizedPointer.includes(".json")
        ? undefined
        : normalizedPointer;
  if (!lifecycleRoot) {
    return {
      evidence: null,
      reasonCodes: ["missing_lifecycle_evidence_paths"],
    };
  }
  return {
    evidence: {
      contractVersion: WAE_EVAL_LIFECYCLE_EVIDENCE_CONTRACT_VERSION,
      lifecycleContractVersion: WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION,
      artifactPointer: pointer,
      lifecycleRoot,
      pinManifestPath: `${lifecycleRoot}/pin-manifest.json`,
      createReceiptPath: `${lifecycleRoot}/create-receipt.json`,
      resetReceiptPath: `${lifecycleRoot}/reset-receipt.json`,
      teardownReceiptPath: `${lifecycleRoot}/teardown-receipt.json`,
      evidenceIndexPath: `${lifecycleRoot}/evidence-index.json`,
    },
    reasonCodes: [],
  };
}

function clampEvalTraceLimit(value: number | undefined): number {
  const fallback = 500;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(Math.floor(value), 5000));
}

function compareEvalTraceRows(
  left: EvalRunTraceToolExecutionRecord,
  right: EvalRunTraceToolExecutionRecord
): number {
  const leftRound = typeof left.evalEnvelope.toolCallRound === "number"
    ? left.evalEnvelope.toolCallRound
    : Number.MAX_SAFE_INTEGER;
  const rightRound = typeof right.evalEnvelope.toolCallRound === "number"
    ? right.evalEnvelope.toolCallRound
    : Number.MAX_SAFE_INTEGER;
  if (leftRound !== rightRound) {
    return leftRound - rightRound;
  }
  if (left.evalEnvelope.timings.toolStartedAt !== right.evalEnvelope.timings.toolStartedAt) {
    return left.evalEnvelope.timings.toolStartedAt - right.evalEnvelope.timings.toolStartedAt;
  }
  if (left.executedAt !== right.executedAt) {
    return left.executedAt - right.executedAt;
  }
  return left.executionId.localeCompare(right.executionId);
}

function coerceEvalToolExecutionStatus(value: unknown): EvalToolExecutionStatus | null {
  return value === "proposed"
    || value === "approved"
    || value === "executing"
    || value === "success"
    || value === "failed"
    || value === "rejected"
    || value === "cancelled"
    ? value
    : null;
}

export function toEvalRunTraceRecord(
  doc: Doc<"aiToolExecutions">
): EvalRunTraceToolExecutionRecord | null {
  const envelope =
    doc.evalEnvelope
    && typeof doc.evalEnvelope === "object"
    && !Array.isArray(doc.evalEnvelope)
      ? (doc.evalEnvelope as Record<string, unknown>)
      : null;
  if (!envelope) {
    return null;
  }
  const contractVersion = normalizeNonEmptyString(envelope.contractVersion);
  const runId = normalizeNonEmptyString(envelope.runId);
  const toolStartedAt =
    typeof envelope.timings === "object"
    && envelope.timings
    && !Array.isArray(envelope.timings)
      ? (envelope.timings as Record<string, unknown>).toolStartedAt
      : undefined;
  const toolCompletedAt =
    typeof envelope.timings === "object"
    && envelope.timings
    && !Array.isArray(envelope.timings)
      ? (envelope.timings as Record<string, unknown>).toolCompletedAt
      : undefined;
  const turnStartedAt =
    typeof envelope.timings === "object"
    && envelope.timings
    && !Array.isArray(envelope.timings)
      ? (envelope.timings as Record<string, unknown>).turnStartedAt
      : undefined;
  const durationMs =
    typeof envelope.timings === "object"
    && envelope.timings
    && !Array.isArray(envelope.timings)
      ? (envelope.timings as Record<string, unknown>).durationMs
      : undefined;
  const status = coerceEvalToolExecutionStatus(doc.status);
  if (
    contractVersion !== WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION
    || !runId
    || typeof turnStartedAt !== "number"
    || typeof toolStartedAt !== "number"
    || typeof toolCompletedAt !== "number"
    || typeof durationMs !== "number"
    || !status
  ) {
    return null;
  }
  const verdictRaw = normalizeNonEmptyString(envelope.verdict);
  const verdict =
    verdictRaw === "passed" || verdictRaw === "failed" || verdictRaw === "blocked"
      ? verdictRaw
      : undefined;
  return {
    executionId: String(doc._id),
    conversationId: String(doc.conversationId),
    organizationId: String(doc.organizationId),
    userId: String(doc.userId),
    toolName: doc.toolName,
    status,
    parameters: doc.parameters,
    result: doc.result,
    error: doc.error,
    tokensUsed: doc.tokensUsed,
    costUsd: doc.costUsd,
    executedAt: doc.executedAt,
    durationMs: doc.durationMs,
    evalEnvelope: {
      contractVersion: WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION,
      runId,
      scenarioId: normalizeNonEmptyString(envelope.scenarioId),
      agentId: normalizeNonEmptyString(envelope.agentId),
      label: normalizeNonEmptyString(envelope.label),
      toolCallId: normalizeNonEmptyString(envelope.toolCallId),
      toolCallRound:
        typeof envelope.toolCallRound === "number"
          ? envelope.toolCallRound
          : undefined,
      verdict,
      artifactPointer: normalizeNonEmptyString(envelope.artifactPointer),
      timings: {
        turnStartedAt,
        toolStartedAt,
        toolCompletedAt,
        durationMs,
      },
    },
  };
}

function buildEmptyStatusCounts(): Record<EvalToolExecutionStatus, number> {
  return {
    proposed: 0,
    approved: 0,
    executing: 0,
    success: 0,
    failed: 0,
    rejected: 0,
    cancelled: 0,
  };
}

function resolveRunVerdict(
  traces: EvalRunTraceToolExecutionRecord[]
): "passed" | "failed" | "blocked" | undefined {
  let verdict: "passed" | "failed" | "blocked" | undefined;
  for (const trace of traces) {
    if (trace.evalEnvelope.verdict === "failed") {
      return "failed";
    }
    if (trace.evalEnvelope.verdict === "blocked") {
      verdict = "blocked";
      continue;
    }
    if (trace.evalEnvelope.verdict === "passed" && !verdict) {
      verdict = "passed";
    }
  }
  return verdict;
}

function collectEvalLifecycleEvidenceReasonCodes(
  lifecycleEvidence: EvalLifecycleEvidencePaths | null,
): EvalRunLifecycleNormalizedReasonCode[] {
  if (!lifecycleEvidence) {
    return [
      "missing_lifecycle_evidence",
      "missing_pin_manifest",
      "missing_create_receipt",
      "missing_reset_receipt",
      "missing_teardown_receipt",
      "missing_evidence_index",
    ];
  }
  const reasonCodes: string[] = [];
  if (!normalizeNonEmptyString(lifecycleEvidence.pinManifestPath)) {
    reasonCodes.push("missing_pin_manifest");
  }
  if (!normalizeNonEmptyString(lifecycleEvidence.createReceiptPath)) {
    reasonCodes.push("missing_create_receipt");
  }
  if (!normalizeNonEmptyString(lifecycleEvidence.resetReceiptPath)) {
    reasonCodes.push("missing_reset_receipt");
  }
  if (!normalizeNonEmptyString(lifecycleEvidence.teardownReceiptPath)) {
    reasonCodes.push("missing_teardown_receipt");
  }
  if (!normalizeNonEmptyString(lifecycleEvidence.evidenceIndexPath)) {
    reasonCodes.push("missing_evidence_index");
  }
  return normalizeEvalRunLifecycleReasonCodes(reasonCodes);
}

function hasEvalRunFailClosedReasonCodes(
  reasonCodes: EvalRunLifecycleNormalizedReasonCode[],
): boolean {
  return reasonCodes.some((reasonCode) =>
    reasonCode !== "unknown_reason"
    && EVAL_RUN_FAIL_CLOSED_REASON_CODE_SET.has(reasonCode),
  );
}

function resolveEvalRunLifecycleStateForPlayback(args: {
  verdict?: "passed" | "failed" | "blocked";
  statusCounts: Record<EvalToolExecutionStatus, number>;
  totalToolExecutions: number;
  reasonCodes: EvalRunLifecycleNormalizedReasonCode[];
}): EvalRunLifecycleState {
  if (hasEvalRunFailClosedReasonCodes(args.reasonCodes)) {
    return "blocked";
  }
  if (args.verdict === "failed") {
    return "failed";
  }
  if (args.verdict === "blocked") {
    return "blocked";
  }
  if (args.verdict === "passed") {
    return "passed";
  }
  if (args.statusCounts.executing > 0 || args.statusCounts.approved > 0) {
    return "running";
  }
  if (args.totalToolExecutions > 0) {
    return "running";
  }
  return "queued";
}

function resolveEvalRunLifecycleReasonCodesForState(args: {
  state: EvalRunLifecycleState;
  reasonCodes: EvalRunLifecycleNormalizedReasonCode[];
}): EvalRunLifecycleNormalizedReasonCode[] {
  if (args.reasonCodes.length > 0) {
    return args.reasonCodes;
  }
  return normalizeEvalRunLifecycleReasonCodes([
    resolveEvalRunLifecycleTransitionReasonCode(args.state),
  ]);
}

export function buildEvalRunPlaybackTracePayload(args: {
  organizationId: Id<"organizations">;
  runId: string;
  traces: EvalRunTraceToolExecutionRecord[];
  limit?: number;
}): EvalRunPlaybackTracePayload {
  const sorted = [...args.traces].sort(compareEvalTraceRows);
  const clampedLimit = clampEvalTraceLimit(args.limit);
  const returned = sorted.slice(0, clampedLimit);
  const reasonCodes: string[] = [];
  if (sorted.length === 0) {
    reasonCodes.push("eval_run_not_found");
  }

  const scenarioValues = collectLexicalReasonCodes(
    sorted.map((entry) => entry.evalEnvelope.scenarioId)
  );
  if (scenarioValues.length > 1) {
    reasonCodes.push("scenario_id_mismatch");
  }
  const agentValues = collectLexicalReasonCodes(
    sorted.map((entry) => entry.evalEnvelope.agentId)
  );
  if (agentValues.length > 1) {
    reasonCodes.push("agent_id_mismatch");
  }
  const labelValues = collectLexicalReasonCodes(
    sorted.map((entry) => entry.evalEnvelope.label)
  );
  if (labelValues.length > 1) {
    reasonCodes.push("label_mismatch");
  }

  const lifecycleCandidates = sorted.map((entry) =>
    resolveEvalLifecycleEvidence({
      artifactPointer: entry.evalEnvelope.artifactPointer,
    })
  );
  for (const candidate of lifecycleCandidates) {
    reasonCodes.push(...candidate.reasonCodes);
  }
  const uniqueLifecycleSignatures = Array.from(
    new Set(
      lifecycleCandidates
        .map((candidate) =>
          candidate.evidence
            ? [
              candidate.evidence.pinManifestPath,
              candidate.evidence.createReceiptPath,
              candidate.evidence.resetReceiptPath,
              candidate.evidence.teardownReceiptPath,
              candidate.evidence.evidenceIndexPath,
            ].join("|")
            : null
        )
        .filter((value): value is string => Boolean(value))
    )
  );
  if (uniqueLifecycleSignatures.length > 1) {
    reasonCodes.push("lifecycle_evidence_mismatch");
  }
  const lifecycleEvidence = lifecycleCandidates.find((candidate) => candidate.evidence)?.evidence ?? null;
  if (!lifecycleEvidence) {
    reasonCodes.push("missing_lifecycle_evidence");
  }
  reasonCodes.push(...collectEvalLifecycleEvidenceReasonCodes(lifecycleEvidence));

  const statusCounts = buildEmptyStatusCounts();
  let totalDurationMs = 0;
  let totalTokensUsed = 0;
  let totalCostUsd = 0;
  for (const trace of sorted) {
    statusCounts[trace.status] += 1;
    totalDurationMs += trace.durationMs;
    totalTokensUsed += trace.tokensUsed;
    totalCostUsd += trace.costUsd;
  }

  const verdict = resolveRunVerdict(sorted);
  const normalizedReasonCodes = normalizeEvalRunLifecycleReasonCodes(reasonCodes);
  const lifecycleState = resolveEvalRunLifecycleStateForPlayback({
    verdict,
    statusCounts,
    totalToolExecutions: sorted.length,
    reasonCodes: normalizedReasonCodes,
  });
  const lifecycleReasonCodes = resolveEvalRunLifecycleReasonCodesForState({
    state: lifecycleState,
    reasonCodes: normalizedReasonCodes,
  });

  const run: EvalRunPlaybackSummary = {
    runId: args.runId,
    scenarioId: scenarioValues[0],
    agentId: agentValues[0],
    label: labelValues[0],
    verdict,
    lifecycleState,
    lifecycleReasonCodes,
    totalToolExecutions: sorted.length,
    returnedToolExecutions: returned.length,
    truncated: sorted.length > returned.length,
    totalDurationMs,
    totalTokensUsed,
    totalCostUsd: Number(totalCostUsd.toFixed(6)),
    statusCounts,
  };

  return {
    contractVersion: WAE_EVAL_TRACE_PLAYBACK_CONTRACT_VERSION,
    envelopeContractVersion: WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION,
    lifecycleContractVersion: WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION,
    lifecycleSnapshotContractVersion: EVAL_RUN_LIFECYCLE_SNAPSHOT_CONTRACT_VERSION,
    status: normalizedReasonCodes.length > 0 ? "blocked" : "ready",
    reasonCodes: normalizedReasonCodes,
    organizationId: args.organizationId,
    run,
    lifecycleEvidence,
    toolExecutions: returned,
  };
}

export function buildEvalRunDiffTracePayload(args: {
  organizationId: Id<"organizations">;
  baselineRunId: string;
  candidateRunId: string;
  baselineTraces: EvalRunTraceToolExecutionRecord[];
  candidateTraces: EvalRunTraceToolExecutionRecord[];
  limit?: number;
}): EvalRunDiffTracePayload {
  const baseline = buildEvalRunPlaybackTracePayload({
    organizationId: args.organizationId,
    runId: args.baselineRunId,
    traces: args.baselineTraces,
    limit: args.limit,
  });
  const candidate = buildEvalRunPlaybackTracePayload({
    organizationId: args.organizationId,
    runId: args.candidateRunId,
    traces: args.candidateTraces,
    limit: args.limit,
  });
  const baselineTools = collectLexicalReasonCodes(
    baseline.toolExecutions.map((entry) => entry.toolName)
  );
  const candidateTools = collectLexicalReasonCodes(
    candidate.toolExecutions.map((entry) => entry.toolName)
  );
  const sequenceDiffLimit = Math.max(
    baseline.toolExecutions.length,
    candidate.toolExecutions.length
  );
  const sequenceDiff = Array.from({ length: sequenceDiffLimit }, (_, index) => {
    const baselineEntry = baseline.toolExecutions[index];
    const candidateEntry = candidate.toolExecutions[index];
    if (baselineEntry && candidateEntry) {
      const unchanged =
        baselineEntry.toolName === candidateEntry.toolName
        && baselineEntry.status === candidateEntry.status
        && baselineEntry.evalEnvelope.verdict === candidateEntry.evalEnvelope.verdict;
      return {
        position: index + 1,
        changeType: unchanged ? "unchanged" : "modified",
        baseline: {
          toolName: baselineEntry.toolName,
          status: baselineEntry.status,
          verdict: baselineEntry.evalEnvelope.verdict,
        },
        candidate: {
          toolName: candidateEntry.toolName,
          status: candidateEntry.status,
          verdict: candidateEntry.evalEnvelope.verdict,
        },
      } as const;
    }
    if (baselineEntry) {
      return {
        position: index + 1,
        changeType: "removed",
        baseline: {
          toolName: baselineEntry.toolName,
          status: baselineEntry.status,
          verdict: baselineEntry.evalEnvelope.verdict,
        },
      } as const;
    }
    return {
      position: index + 1,
      changeType: "added",
      candidate: {
        toolName: candidateEntry!.toolName,
        status: candidateEntry!.status,
        verdict: candidateEntry!.evalEnvelope.verdict,
      },
    } as const;
  });
  const statusCountDelta = buildEmptyStatusCounts();
  (Object.keys(statusCountDelta) as EvalToolExecutionStatus[]).forEach((key) => {
    statusCountDelta[key] =
      candidate.run.statusCounts[key] - baseline.run.statusCounts[key];
  });
  const reasonCodes = collectLexicalReasonCodes([
    ...baseline.reasonCodes.map((code) => `baseline:${code}`),
    ...candidate.reasonCodes.map((code) => `candidate:${code}`),
  ]);
  return {
    contractVersion: WAE_EVAL_TRACE_DIFF_CONTRACT_VERSION,
    envelopeContractVersion: WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION,
    lifecycleContractVersion: WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION,
    lifecycleSnapshotContractVersion: EVAL_RUN_LIFECYCLE_SNAPSHOT_CONTRACT_VERSION,
    status: reasonCodes.length > 0 ? "blocked" : "ready",
    reasonCodes,
    organizationId: args.organizationId,
    baseline: baseline.run,
    candidate: candidate.run,
    comparison: {
      verdictChanged: baseline.run.verdict !== candidate.run.verdict,
      lifecycleStateChanged:
        baseline.run.lifecycleState !== candidate.run.lifecycleState,
      toolCountDelta:
        candidate.run.totalToolExecutions - baseline.run.totalToolExecutions,
      durationDeltaMs: candidate.run.totalDurationMs - baseline.run.totalDurationMs,
      tokensDelta: candidate.run.totalTokensUsed - baseline.run.totalTokensUsed,
      costDeltaUsd: Number(
        (candidate.run.totalCostUsd - baseline.run.totalCostUsd).toFixed(6)
      ),
      addedTools: candidateTools.filter((tool) => !baselineTools.includes(tool)),
      removedTools: baselineTools.filter((tool) => !candidateTools.includes(tool)),
      statusCountDelta,
      sequenceDiff,
    },
  };
}

export function buildEvalPromotionEvidencePacket(args: {
  organizationId: Id<"organizations">;
  runId: string;
  traces: EvalRunTraceToolExecutionRecord[];
  limit?: number;
}): EvalPromotionEvidencePacketPayload {
  const playback = buildEvalRunPlaybackTracePayload({
    organizationId: args.organizationId,
    runId: args.runId,
    traces: args.traces,
    limit: args.limit,
  });
  const lifecycleEvidence = playback.lifecycleEvidence;
  const evidenceChecklist = {
    hasArtifactPointer: Boolean(lifecycleEvidence?.artifactPointer),
    hasPinManifest: Boolean(lifecycleEvidence?.pinManifestPath),
    hasCreateReceipt: Boolean(lifecycleEvidence?.createReceiptPath),
    hasResetReceipt: Boolean(lifecycleEvidence?.resetReceiptPath),
    hasTeardownReceipt: Boolean(lifecycleEvidence?.teardownReceiptPath),
    hasEvidenceIndex: Boolean(lifecycleEvidence?.evidenceIndexPath),
    hasTraceRows: playback.run.totalToolExecutions > 0,
  };
  return {
    contractVersion: WAE_EVAL_PROMOTION_EVIDENCE_PACKET_CONTRACT_VERSION,
    envelopeContractVersion: WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION,
    lifecycleContractVersion: WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION,
    lifecycleSnapshotContractVersion: EVAL_RUN_LIFECYCLE_SNAPSHOT_CONTRACT_VERSION,
    status: playback.status,
    reasonCodes: playback.reasonCodes,
    organizationId: args.organizationId,
    runId: args.runId,
    run: playback.run,
    lifecycleEvidence,
    evidenceChecklist,
    traces: playback.toolExecutions.map((trace) => ({
      executionId: trace.executionId,
      toolName: trace.toolName,
      status: trace.status,
      verdict: trace.evalEnvelope.verdict,
      durationMs: trace.durationMs,
      tokensUsed: trace.tokensUsed,
      costUsd: trace.costUsd,
      toolCallRound: trace.evalEnvelope.toolCallRound,
      toolCallId: trace.evalEnvelope.toolCallId,
    })),
  };
}

async function loadEvalRunTraceRows(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  runId: string;
}): Promise<EvalRunTraceToolExecutionRecord[]> {
  const rows = await args.ctx.db
    .query("aiToolExecutions")
    .withIndex("by_org_eval_run_id", (q: any) =>
      q.eq("organizationId", args.organizationId).eq("evalEnvelope.runId", args.runId)
    )
    .collect() as Doc<"aiToolExecutions">[];
  return rows
    .map((row) => toEvalRunTraceRecord(row))
    .filter((row): row is EvalRunTraceToolExecutionRecord => Boolean(row));
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

function normalizeNonNegativeInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.floor(value);
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

interface VoiceTurnVisionTelemetrySnapshot {
  contractVersion: string;
  status: "attached" | "degraded";
  reason: string;
  source?: string;
  freshnessBucket?: string;
  frameAgeMs?: number;
  maxFrameAgeMs?: number;
  attached: boolean;
}

function resolveVoiceTurnVisionTelemetrySnapshot(args: {
  voiceRuntime?: Record<string, unknown>;
}): VoiceTurnVisionTelemetrySnapshot | null {
  const resolution = normalizeRecord(args.voiceRuntime?.visionFrameResolution);
  if (!resolution) {
    return null;
  }
  const telemetry = normalizeRecord(resolution.telemetry);
  const statusToken = normalizeNonEmptyString(resolution.status)?.toLowerCase();
  if (statusToken !== "attached" && statusToken !== "degraded") {
    return null;
  }

  const frame = normalizeRecord(resolution.frame);
  const frameStorageUrl = normalizeNonEmptyString(frame?.storageUrl);
  const hasAttachableFrame = statusToken === "attached" && Boolean(frameStorageUrl);
  const normalizedReason =
    normalizeNonEmptyString(resolution.reason)?.toLowerCase()
    ?? normalizeNonEmptyString(telemetry?.reason)?.toLowerCase();
  const reason =
    hasAttachableFrame
      ? "attached"
      : statusToken === "attached"
        ? "vision_frame_dropped_storage_url_missing"
        : normalizedReason ?? "vision_frame_missing";
  const source = normalizeNonEmptyString(telemetry?.source)?.toLowerCase();
  const freshnessBucket = normalizeNonEmptyString(
    telemetry?.freshnessBucket,
  )?.toLowerCase();
  const frameAgeMs = normalizeNonNegativeInteger(
    telemetry?.frameAgeMs
    ?? resolution.freshestCandidateAgeMs
    ?? frame?.ageMs,
  );
  const maxFrameAgeMs = normalizeNonNegativeInteger(
    telemetry?.maxFrameAgeMs ?? resolution.maxFrameAgeMs,
  );
  const contractVersion =
    normalizeNonEmptyString(telemetry?.contractVersion)
    ?? "web_chat_vision_attachment_telemetry_v1";

  return {
    contractVersion,
    status: hasAttachableFrame ? "attached" : "degraded",
    reason,
    source,
    freshnessBucket,
    frameAgeMs,
    maxFrameAgeMs,
    attached: hasAttachableFrame,
  };
}

function resolveVoiceSessionIdFromTelemetryCorrelationKey(
  value: unknown,
): string | undefined {
  const correlationKey = normalizeNonEmptyString(value);
  if (!correlationKey) {
    return undefined;
  }
  const separatorIndex = correlationKey.lastIndexOf("::");
  if (separatorIndex < 0) {
    return undefined;
  }
  const sessionToken = correlationKey.slice(separatorIndex + 2);
  return normalizeNonEmptyString(sessionToken) ?? undefined;
}

function buildDerivedVoiceSessionIdFromLiveSession(
  liveSessionId: unknown,
): string | undefined {
  const normalizedLiveSessionId = normalizeNonEmptyString(liveSessionId);
  if (!normalizedLiveSessionId) {
    return undefined;
  }
  return `derived_from_live:${normalizedLiveSessionId}`;
}

function resolveVoiceRuntimeTrustEventVoiceSessionId(args: {
  contract?: VoiceRuntimeTelemetryContract | null;
  liveSessionId?: unknown;
  voiceRuntime?: unknown;
  transportRuntime?: unknown;
  avObservability?: unknown;
}): string | undefined {
  const voiceRuntime = normalizeRecord(args.voiceRuntime);
  const transportRuntime = normalizeRecord(args.transportRuntime);
  const voiceTransportRuntime = normalizeRecord(transportRuntime?.voiceTransportRuntime);
  const avObservability = normalizeRecord(args.avObservability);
  const telemetryCandidate = normalizeRecord(
    voiceTransportRuntime?.telemetry
      ?? transportRuntime?.telemetry
      ?? avObservability?.voiceRuntimeTelemetry,
  );

  return (
    normalizeNonEmptyString(args.contract?.voiceSessionId)
    ?? normalizeNonEmptyString(voiceRuntime?.voiceSessionId)
    ?? normalizeNonEmptyString(voiceRuntime?.sessionId)
    ?? normalizeNonEmptyString(voiceTransportRuntime?.voiceSessionId)
    ?? normalizeNonEmptyString(transportRuntime?.voiceSessionId)
    ?? normalizeNonEmptyString(avObservability?.voiceSessionId)
    ?? normalizeNonEmptyString(telemetryCandidate?.voiceSessionId)
    ?? resolveVoiceSessionIdFromTelemetryCorrelationKey(
      telemetryCandidate?.correlationKey,
    )
    ?? resolveVoiceSessionIdFromTelemetryCorrelationKey(
      avObservability?.voiceRuntimeTelemetryCorrelationKey,
    )
    ?? buildDerivedVoiceSessionIdFromLiveSession(
      normalizeNonEmptyString(args.liveSessionId)
      ?? normalizeNonEmptyString(voiceRuntime?.liveSessionId)
      ?? normalizeNonEmptyString(voiceTransportRuntime?.liveSessionId)
      ?? normalizeNonEmptyString(transportRuntime?.liveSessionId)
      ?? normalizeNonEmptyString(avObservability?.liveSessionId)
      ?? normalizeNonEmptyString(telemetryCandidate?.liveSessionId),
    )
  );
}

function buildVoiceTurnVisionAdaptiveTrustEvent(args: {
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  sessionId: Id<"agentSessions">;
  channel: string;
  voiceSessionId?: string;
  voiceRuntime?: Record<string, unknown>;
  occurredAtMs: number;
}): PersistedVoiceRuntimeTelemetryTrustEvent | null {
  const voiceSessionId = normalizeNonEmptyString(args.voiceSessionId);
  if (!voiceSessionId) {
    return null;
  }
  const vision = resolveVoiceTurnVisionTelemetrySnapshot({
    voiceRuntime: args.voiceRuntime,
  });
  if (!vision) {
    return null;
  }

  return {
    eventName: VOICE_TRUST_ADAPTIVE_EVENT_NAME,
    payload: {
      event_id: `${VOICE_TRUST_ADAPTIVE_EVENT_NAME}:vision:${voiceSessionId}:${args.occurredAtMs}`,
      event_version: TRUST_EVENT_TAXONOMY_VERSION,
      occurred_at: args.occurredAtMs,
      org_id: args.organizationId,
      mode: "runtime",
      channel: args.channel,
      session_id: String(args.sessionId),
      actor_type: "user",
      actor_id: String(args.userId),
      voice_session_id: voiceSessionId,
      adaptive_phase_id: "vision_turn_attachment",
      adaptive_decision: vision.attached ? "vision_frame_attached" : vision.reason,
      adaptive_confidence: 1,
      consent_checkpoint_id: vision.contractVersion,
      decision_reason: vision.reason,
      vision_attachment_contract_version: vision.contractVersion,
      vision_frame_status: vision.status,
      vision_frame_reason: vision.reason,
      vision_frame_source: vision.source ?? null,
      vision_frame_freshness_bucket: vision.freshnessBucket ?? null,
      vision_frame_age_ms: vision.frameAgeMs ?? null,
      vision_frame_max_age_ms: vision.maxFrameAgeMs ?? null,
      vision_frame_attached: vision.attached,
    },
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
  const voiceRuntime = normalizeRecord(args.voiceRuntime);
  const avObservability = normalizeRecord(args.avObservability);
  const resolvedVoiceSessionId = resolveVoiceRuntimeTrustEventVoiceSessionId({
    contract,
    liveSessionId: args.liveSessionId,
    voiceRuntime,
    transportRuntime: args.transportRuntime,
    avObservability,
  });
  const baselineProviderId = normalizeVoiceRuntimeProviderToken(
    voiceRuntime?.providerId
  );
  const baseOccurredAt =
    typeof args.occurredAt === "number" && Number.isFinite(args.occurredAt)
      ? Math.floor(args.occurredAt)
      : Date.now();
  const events: PersistedVoiceRuntimeTelemetryTrustEvent[] = [];

  if (contract && contract.events.length > 0) {
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
  }

  const visionAdaptiveEvent = buildVoiceTurnVisionAdaptiveTrustEvent({
    organizationId: args.organizationId,
    userId: args.userId,
    sessionId: args.sessionId,
    channel: args.channel,
    voiceSessionId: resolvedVoiceSessionId,
    voiceRuntime,
    occurredAtMs: baseOccurredAt,
  });
  if (visionAdaptiveEvent) {
    events.push(visionAdaptiveEvent);
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
    sessionId: v.optional(v.string()),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    conversationId: v.optional(v.id("aiConversations")),
    forcePrimaryAgent: v.optional(v.boolean()),
    clientSurface: v.optional(v.string()),
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
      generatedApi.internal.agentOntology.ensureOperatorAuthorityAgentForOrgInternal,
      {
        organizationId: args.organizationId,
        appSurface: args.clientSurface,
      }
    );

    const shouldForcePrimaryAgentRouting = args.forcePrimaryAgent === true;
    const normalizedSessionId = normalizeNonEmptyString(args.sessionId);
    let routedOperatorAgent:
      | {
          _id?: Id<"objects">;
          name?: string;
          customProperties?: Record<string, unknown>;
          status?: string;
        }
      | null = null;
    if (shouldForcePrimaryAgentRouting) {
      if (!normalizedSessionId) {
        throw new Error(
          "PRIMARY_AGENT_ROUTING_REQUIRED: sessionId is required when forcePrimaryAgent=true."
        );
      }
      const primaryAgent = await (ctx as any).runQuery(
        generatedApi.api.agentOntology.getPrimaryAgentForOrg,
        {
          sessionId: normalizedSessionId,
          organizationId: args.organizationId,
        }
      ) as {
        _id?: Id<"objects">;
        status?: string;
      } | null;
      if (!primaryAgent?._id || primaryAgent.status !== "active") {
        throw new Error(
          "PRIMARY_AGENT_ROUTING_REQUIRED: active primary agent unavailable."
        );
      }
      routedOperatorAgent = { _id: primaryAgent._id };
    }
    if (!routedOperatorAgent?._id) {
      routedOperatorAgent = await (ctx as any).runQuery(
        generatedApi.internal.agentOntology.getActiveAgentForOrg,
        {
          organizationId: args.organizationId,
          channel: "desktop",
          routeSelectors: routing.operatorRouteSelectors,
        }
      ) as {
        _id?: Id<"objects">;
        name?: string;
        customProperties?: Record<string, unknown>;
        status?: string;
      } | null;
    }

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

    const routedAgentCustomProperties =
      routedOperatorAgent &&
      typeof routedOperatorAgent.customProperties === "object" &&
      routedOperatorAgent.customProperties !== null
        ? (routedOperatorAgent.customProperties as Record<string, unknown>)
        : {};
    const routedAgentDisplayName =
      normalizeNonEmptyString(routedAgentCustomProperties.displayName) ??
      normalizeNonEmptyString(routedOperatorAgent?.name) ??
      null;
    const routedAgentVoiceLanguage =
      normalizeNonEmptyString(routedAgentCustomProperties.voiceLanguage) ??
      normalizeNonEmptyString(routedAgentCustomProperties.language) ??
      null;

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
      agentDisplayName: routedAgentDisplayName,
      agentVoiceLanguage: routedAgentVoiceLanguage,
      externalContactIdentifier: routing.externalContactIdentifier,
      routeKey: routing.operatorRouteIdentity.routeKey,
      threadId: routing.operatorRoutingThreadId,
      lineageId: routing.operatorRoutingLineageId,
    };
  },
});

export const getEvalRunPlaybackTraceInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    runId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<EvalRunPlaybackTracePayload> => {
    const traces = await loadEvalRunTraceRows({
      ctx,
      organizationId: args.organizationId,
      runId: args.runId,
    });
    return buildEvalRunPlaybackTracePayload({
      organizationId: args.organizationId,
      runId: args.runId,
      traces,
      limit: args.limit,
    });
  },
});

export const getEvalRunDiffTraceInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    baselineRunId: v.string(),
    candidateRunId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<EvalRunDiffTracePayload> => {
    const [baselineTraces, candidateTraces] = await Promise.all([
      loadEvalRunTraceRows({
        ctx,
        organizationId: args.organizationId,
        runId: args.baselineRunId,
      }),
      loadEvalRunTraceRows({
        ctx,
        organizationId: args.organizationId,
        runId: args.candidateRunId,
      }),
    ]);
    return buildEvalRunDiffTracePayload({
      organizationId: args.organizationId,
      baselineRunId: args.baselineRunId,
      candidateRunId: args.candidateRunId,
      baselineTraces,
      candidateTraces,
      limit: args.limit,
    });
  },
});

export const getEvalPromotionEvidencePacketInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    runId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<EvalPromotionEvidencePacketPayload> => {
    const traces = await loadEvalRunTraceRows({
      ctx,
      organizationId: args.organizationId,
      runId: args.runId,
    });
    return buildEvalPromotionEvidencePacket({
      organizationId: args.organizationId,
      runId: args.runId,
      traces,
      limit: args.limit,
    });
  },
});

export const PLATFORM_MOTHER_SUPPORT_ENTRYPOINT_CONTRACT_VERSION =
  "platform_mother_support_entrypoint_v1" as const;

export const startPlatformMotherSupportConversation = action({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    title: v.optional(v.string()),
    reuseExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    contractVersion: typeof PLATFORM_MOTHER_SUPPORT_ENTRYPOINT_CONTRACT_VERSION;
    conversationId: Id<"aiConversations">;
    targetAgentId: Id<"objects">;
    targetOrganizationId: Id<"organizations">;
    runtimeMode: "support";
    conversationStatus: "active";
    entrypointStatus: "created" | "reused";
    displayName?: string;
  }> => {
    const resolvedTarget = await (ctx as any).runAction(
      generatedApi.internal.ai.platformMotherControlPlane.resolvePlatformMotherInvocationTargetInternal,
      {
        mode: "support",
      }
    ) as {
      agentId: Id<"objects">;
      organizationId: Id<"organizations">;
      runtimeMode: "support";
      name?: string;
      status?: string;
      customProperties?: Record<string, unknown> | null;
    };

    if (
      !canUsePlatformMotherCustomerFacingSupport({
        requestingOrganizationId: String(args.organizationId),
        name: resolvedTarget.name,
        status: resolvedTarget.status,
        customProperties: resolvedTarget.customProperties ?? undefined,
      })
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_SUPPORT_ROUTE_DISABLED",
        message:
          "Platform Mother support entry is not enabled for this organization.",
        organizationId: String(args.organizationId),
        targetAgentId: String(resolvedTarget.agentId),
      });
    }

    if (args.reuseExisting !== false) {
      const existingConversation = await (ctx as any).runQuery(
        generatedApi.internal.ai.conversations.findLatestConversationByUserTargetInternal,
        {
          organizationId: args.organizationId,
          userId: args.userId,
          targetAgentId: resolvedTarget.agentId,
          status: "active",
        }
      ) as {
        _id: Id<"aiConversations">;
        status: "active";
      } | null;

      if (existingConversation) {
        return {
          contractVersion: PLATFORM_MOTHER_SUPPORT_ENTRYPOINT_CONTRACT_VERSION,
          conversationId: existingConversation._id,
          targetAgentId: resolvedTarget.agentId,
          targetOrganizationId: resolvedTarget.organizationId,
          runtimeMode: resolvedTarget.runtimeMode,
          conversationStatus: existingConversation.status,
          entrypointStatus: "reused",
          displayName: resolvedTarget.name,
        };
      }
    }

    const conversationId = await (ctx as any).runMutation(
      generatedApi.api.ai.conversations.createConversation,
      {
        organizationId: args.organizationId,
        userId: args.userId,
        title: args.title,
        targetAgentId: resolvedTarget.agentId,
      }
    ) as Id<"aiConversations">;

    return {
      contractVersion: PLATFORM_MOTHER_SUPPORT_ENTRYPOINT_CONTRACT_VERSION,
      conversationId,
      targetAgentId: resolvedTarget.agentId,
      targetOrganizationId: resolvedTarget.organizationId,
      runtimeMode: resolvedTarget.runtimeMode,
      conversationStatus: "active",
      entrypointStatus: "created",
      displayName: resolvedTarget.name,
    };
  },
});

export const capturePlatformMotherSupportProposal = action({
  args: {
    conversationId: v.id("aiConversations"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    proposalSummary: v.string(),
    proposalDetails: v.optional(v.string()),
    sourceMessageId: v.optional(v.id("aiMessages")),
  },
  handler: async (ctx, args) => {
    const conversation = await (ctx as any).runQuery(
      generatedApi.internal.ai.conversations.getConversationMetadataInternal,
      {
        conversationId: args.conversationId,
      }
    ) as {
      _id: Id<"aiConversations">;
      organizationId: Id<"organizations">;
      userId: Id<"users">;
    } | null;

    if (
      !conversation
      || String(conversation.organizationId) !== String(args.organizationId)
      || String(conversation.userId) !== String(args.userId)
    ) {
      throw new ConvexError({
        code: "INVALID_PLATFORM_MOTHER_SUPPORT_PROPOSAL_CONTEXT",
        message: "Mother support proposal capture requires an owned support conversation.",
        conversationId: String(args.conversationId),
      });
    }

    return await (ctx as any).runMutation(
      generatedApi.internal.ai.platformMotherReviewArtifacts.capturePlatformMotherProposalInternal,
      {
        runtimeMode: "support",
        actorUserId: args.userId,
        requestingOrganizationId: args.organizationId,
        sourceConversationId: args.conversationId,
        sourceMessageId: args.sourceMessageId,
        proposalSummary: args.proposalSummary,
        proposalDetails: args.proposalDetails,
      }
    );
  },
});

export const sendMessage = action({
  args: {
    conversationId: v.optional(v.id("aiConversations")),
    message: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    sessionId: v.optional(v.string()),
    layerWorkflowId: v.optional(v.id("objects")),
    targetAgentId: v.optional(v.id("objects")),
    forcePrimaryAgent: v.optional(v.boolean()),
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
    evalEnvelope: v.optional(v.any()),
    isAutoRecovery: v.optional(v.boolean()), // Flag to bypass proposals for auto-recovery
    context: v.optional(v.union(v.literal("normal"), v.literal("page_builder"), v.literal("layers_builder"))), // Context for system prompt selection
    builderMode: v.optional(v.union(v.literal("prototype"), v.literal("connect"))), // Builder mode for tool filtering
    isSetupMode: v.optional(v.boolean()), // Setup mode for agent creation wizard (injects system knowledge)
    clientSurface: v.optional(v.string()),
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
      generatedApi.internal.agentOntology.ensureOperatorAuthorityAgentForOrgInternal,
      {
        organizationId: args.organizationId,
        appSurface: args.clientSurface,
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
    const evalEnvelopeContext = normalizeEvalRunEnvelopeContext({
      rawEnvelope: args.evalEnvelope,
      qaMode,
    });
    const evalTurnStartedAt = Date.now();

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
        layerWorkflowId: args.layerWorkflowId,
        targetAgentId: args.targetAgentId,
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

    const useLegacyBuilderFlow =
      args.context === "page_builder" || args.context === "layers_builder";
    const operatorCollabCutover = resolveOperatorCollaborationCutoverConfig({
      organizationId: args.organizationId,
      conversationId,
    });
    const operatorCollaborationShellEnabled =
      !useLegacyBuilderFlow && operatorCollabCutover.collaborationShellEnabled;
    const operatorRoutingLineageId = `desktop_lineage:${args.organizationId}:${conversationId}`;
    const operatorRoutingThreadId = `group_thread:${conversationId}`;
    let requestedCollaborationRoute = !operatorCollaborationShellEnabled
      ? null
      : useLegacyBuilderFlow
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
      useLegacyBuilderFlow
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
          status?: string;
        }
      | null = null;
    const shouldForcePrimaryAgentRouting = args.forcePrimaryAgent === true;
    const normalizedAuthSessionId = normalizeNonEmptyString(args.sessionId);

    if (!useLegacyBuilderFlow) {
      if (shouldForcePrimaryAgentRouting) {
        if (!normalizedAuthSessionId) {
          throw new Error(
            "PRIMARY_AGENT_ROUTING_REQUIRED: sessionId is required when forcePrimaryAgent=true."
          );
        }
        preflightRoutedOperatorAgent = await (ctx as any).runQuery(
          generatedApi.api.agentOntology.getPrimaryAgentForOrg,
          {
            sessionId: normalizedAuthSessionId,
            organizationId: args.organizationId,
          }
        ) as {
          _id?: Id<"objects">;
          customProperties?: Record<string, unknown>;
          status?: string;
        } | null;
        if (!preflightRoutedOperatorAgent?._id || preflightRoutedOperatorAgent.status !== "active") {
          throw new Error(
            "PRIMARY_AGENT_ROUTING_REQUIRED: active primary agent unavailable."
          );
        }
      }

      const preflightOperatorRouteSelectors = {
        channel: "desktop",
        peer: `desktop:${args.userId}:${conversationId}`,
        channelRef: String(conversationId),
      };
      if (!preflightRoutedOperatorAgent?._id) {
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
          status?: string;
        } | null;
      }

      if (!preflightRoutedOperatorAgent?._id) {
        const ensuredOperatorAgent = await (ctx as any).runMutation(
          generatedApi.internal.agentOntology.ensureOperatorAuthorityAgentForOrgInternal,
          {
            organizationId: args.organizationId,
            appSurface: args.clientSurface,
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
          status?: string;
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
            status?: string;
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

    let persistedUserMessageId: Id<"aiMessages"> | null = null;
    const persistInboundUserMessage = async (): Promise<Id<"aiMessages">> => {
      if (persistedUserMessageId) {
        return persistedUserMessageId;
      }

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

      persistedUserMessageId = userMessageId;
      return userMessageId;
    };

    // Legacy page-builder flow composes against conversation history immediately.
    if (useLegacyBuilderFlow) {
      await persistInboundUserMessage();
    }

    // 3. Get conversation history
    const conversation = await (ctx as any).runQuery(generatedApi.api.ai.conversations.getConversation, {
      conversationId,
    }) as {
      messages: ConversationMessage[];
      slug?: string;
      modelId?: string | null;
      routingPin?: unknown;
      targetAgentId?: Id<"objects">;
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
    const conversationLayerWorkflowId =
      (conversation as { layerWorkflowId?: Id<"objects"> }).layerWorkflowId
      ?? args.layerWorkflowId;
    const conversationTargetAgentId =
      (conversation as { targetAgentId?: Id<"objects"> }).targetAgentId
      ?? args.targetAgentId;

    // Capture slug for new conversations (to return for URL update)
    if (isNewConversation && conversation.slug) {
      conversationSlug = conversation.slug;
    }
    if (!useLegacyBuilderFlow) {
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
          generatedApi.internal.agentOntology.ensureOperatorAuthorityAgentForOrgInternal,
          {
            organizationId: args.organizationId,
            appSurface: args.clientSurface,
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
        layerWorkflowId: conversationLayerWorkflowId,
        targetAgentId: conversationTargetAgentId,
        userId: args.userId,
        sessionId: args.sessionId,
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
          generatedApi.api["ai/kernel/agentExecution"].processInboundMessage,
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
          generatedApi.internal.agentOntology.ensureOperatorAuthorityAgentForOrgInternal,
          {
            organizationId: args.organizationId,
            appSurface: args.clientSurface,
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
        await persistInboundUserMessage();
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
        await persistInboundUserMessage();
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
        await persistInboundUserMessage();
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
        const runtimeStatusForResolution =
          normalizeNonEmptyString(agentResult.status) ?? "unknown_status";
        const synthesizedModelId =
          conversationPinnedModel ??
          normalizeNonEmptyString(args.selectedModel) ??
          SAFE_FALLBACK_MODEL_ID;
        runtimeModelResolution = buildModelResolutionPayload({
          requestedModel: normalizeNonEmptyString(args.selectedModel),
          selectedModel: synthesizedModelId,
          usedModel: synthesizedModelId,
          selectionSource: `runtime_missing_model_resolution_${runtimeStatusForResolution}`,
          selectedAuthProfileId: conversationPinnedAuthProfileId,
          usedAuthProfileId: conversationPinnedAuthProfileId,
        });
        console.warn(
          "[AI Chat] Missing model resolution metadata from agent runtime; synthesized fallback for persistence.",
          {
            conversationId: String(conversationId),
            status: runtimeStatusForResolution,
            selectedModel: synthesizedModelId,
          }
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
      const isDuplicateAcknowledged = agentResult.status === "duplicate_acknowledged";
      if (!isDuplicateAcknowledged) {
        await persistInboundUserMessage();
      }

      if (!isDuplicateAcknowledged && assistantMessage.length > 0) {
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
    const hasConfiguredEnabledModels =
      Array.isArray(settings?.llm?.enabledModels) &&
      settings.llm.enabledModels.length > 0;
    const hasConfiguredLegacyModel =
      typeof settings?.llm?.model === "string" &&
      settings.llm.model.trim().length > 0;
    const hasConfiguredOrgModelPolicy =
      hasConfiguredEnabledModels || hasConfiguredLegacyModel;
    const onboardingEnabledModels =
      hasConfiguredEnabledModels
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

    let explicitRequestedModel = normalizeNonEmptyString(args.selectedModel);
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
        const shouldFallbackToPlatformDefault =
          !hasConfiguredOrgModelPolicy ||
          explicitRequestedModel === ONBOARDING_DEFAULT_MODEL_ID;
        if (!shouldFallbackToPlatformDefault) {
          throw new Error(
            `Model "${explicitRequestedModel}" is not enabled for this organization. Select one of the models configured by your organization owner.`
          );
        }
        explicitRequestedModel = undefined;
      }

      if (explicitRequestedModel) {
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

    // 6. Prepare messages for AI (legacy builder contexts only).
    // Normal desktop chat routes through ai.agentExecution.processInboundMessage.
    const isPageBuilderContext = args.context === "page_builder";
    const isLayersBuilderContext = args.context === "layers_builder";
    if (!isPageBuilderContext && !isLayersBuilderContext) {
      throw new Error("Deprecated ai.chat non-builder path invoked unexpectedly.");
    }

    let systemPrompt = isPageBuilderContext
      ? getPageBuilderPrompt(args.builderMode)
      : getLayersBuilderPrompt();

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

    console.log(
      `[AI Chat] Using ${isPageBuilderContext ? "page builder" : "layers builder"} system prompt`
    );
    const inboundVoiceRuntime = normalizeRecord(args.voiceRuntime);
    const suppressLatestUserImageAttachments =
      shouldSuppressLatestUserImageAttachmentsForVoiceRuntime({
        sessionTransportPath: normalizeNonEmptyString(
          inboundVoiceRuntime?.sessionTransportPath
        ),
        voiceSessionId: normalizeNonEmptyString(inboundVoiceRuntime?.voiceSessionId),
        turnStitchAttachmentPolicy: normalizeNonEmptyString(
          inboundVoiceRuntime?.turnStitchAttachmentPolicy
        ),
      });

    const messages: ChatMessage[] = buildOpenRouterMessages({
      systemPrompt,
      conversationMessages: conversation.messages,
      suppressLatestUserImageAttachments,
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
    // In prototype mode (page_builder context), only provide read-only tools.
    // Layers builder uses a deterministic no-tool JSON workflow path.
    const builderMode = isPageBuilderContext ? args.builderMode : undefined;
    const availableTools = isLayersBuilderContext ? [] : getToolSchemas(builderMode);
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
    const evalLifecycleSessionId =
      normalizeNonEmptyString(args.sessionId) ?? `conversation:${String(conversationId)}`;
    const emitEvalLifecycleTrustEvent = async (event: {
      fromState?: EvalRunLifecycleState;
      toState: EvalRunLifecycleState;
      reasonCodes?: Array<unknown>;
      transitionSource: string;
      traceStatus?: "ready" | "blocked";
    }) => {
      if (!evalEnvelopeContext) {
        return;
      }
      try {
        const payload = buildEvalRunLifecycleTrustPayload({
          orgId: args.organizationId,
          sessionId: evalLifecycleSessionId,
          channel: "desktop",
          actorType: "system",
          actorId: String(args.userId),
          runId: evalEnvelopeContext.runId,
          scenarioId: evalEnvelopeContext.scenarioId,
          agentId: evalEnvelopeContext.agentId,
          fromState: event.fromState,
          toState: event.toState,
          reasonCodes: event.reasonCodes,
          envelopeContractVersion: WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION,
          lifecycleContractVersion: WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION,
          transitionSource: event.transitionSource,
          traceStatus: event.traceStatus,
        });
        await (ctx as any).runMutation(
          generatedApi.internal.ai.voiceRuntime.recordVoiceTrustEvent,
          {
            eventName: EVAL_RUN_LIFECYCLE_TRUST_EVENT_NAME,
            payload,
          },
        );
      } catch (error) {
        console.error("[AI Chat] Failed to persist eval lifecycle trust event:", error);
      }
    };

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
        const buildEvalEnvelopeForToolExecution = (args: {
          verdict?: "passed" | "failed" | "blocked";
          toolCompletedAt: number;
          durationMs: number;
        }) =>
          evalEnvelopeContext
            ? {
                contractVersion: WAE_EVAL_RUN_ENVELOPE_CONTRACT_VERSION,
                runId: evalEnvelopeContext.runId,
                scenarioId: evalEnvelopeContext.scenarioId,
                agentId: evalEnvelopeContext.agentId,
                label: evalEnvelopeContext.label,
                toolCallId: toolCall.id,
                toolCallRound: toolCallRounds,
                verdict: args.verdict,
                artifactPointer: evalEnvelopeContext.artifactPointer,
                timings: {
                  turnStartedAt: evalTurnStartedAt,
                  toolStartedAt: startTime,
                  toolCompletedAt: args.toolCompletedAt,
                  durationMs: args.durationMs,
                },
              }
            : undefined;

        await emitEvalLifecycleTrustEvent({
          toState: "queued",
          reasonCodes: ["queued_for_execution"],
          transitionSource: "chat_tool_call_enqueued",
          traceStatus: "ready",
        });
        await emitEvalLifecycleTrustEvent({
          fromState: "queued",
          toState: "running",
          reasonCodes: ["execution_started"],
          transitionSource: "chat_tool_call_started",
          traceStatus: "ready",
        });

        try {

          let result: unknown;

          if (shouldPropose) {
            // Create a proposal instead of executing
            const proposalRecordedAt = Date.now();
            const configureAgentFieldProposal =
              toolCall.function.name === CONFIGURE_AGENT_FIELDS_TOOL_NAME
                ? await buildConfigureAgentFieldsProposalEnvelope(
                    {
                      ...ctx,
                      organizationId: args.organizationId,
                      userId: args.userId,
                      sessionId: args.sessionId,
                      conversationId,
                    } as ToolExecutionContext,
                    parsedArgs as any,
                  )
                : null;
            const executionId = await (ctx as any).runMutation(generatedApi.api.ai.conversations.proposeToolExecution, {
              conversationId,
              organizationId: args.organizationId,
              userId: args.userId,
              sessionId: args.sessionId,
              toolName: toolCall.function.name,
              parameters: configureAgentFieldProposal?.parameters ?? parsedArgs,
              proposalMessage:
                configureAgentFieldProposal?.proposalMessage
                || `AI wants to execute: ${toolCall.function.name}`,
              evalEnvelope: buildEvalEnvelopeForToolExecution({
                verdict: "blocked",
                toolCompletedAt: proposalRecordedAt,
                durationMs: Math.max(0, proposalRecordedAt - startTime),
              }),
            });

            result = {
              status: "pending_approval",
              executionId,
              message: `I've created a proposal for your review. Please approve it in the Tool Execution panel.`,
            };

            hasProposedTools = true; // Mark that we have proposals pending
            console.log("[AI Chat] Tool proposed for approval:", toolCall.function.name, executionId);
            await emitEvalLifecycleTrustEvent({
              fromState: "running",
              toState: "blocked",
              reasonCodes: ["execution_blocked"],
              transitionSource: "chat_tool_call_blocked_pending_approval",
              traceStatus: "blocked",
            });
          } else {
            // Execute tool immediately
            result = await executeTool(
              {
                ...ctx,
                organizationId: args.organizationId,
                userId: args.userId,
                sessionId: args.sessionId,
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

          const toolCompletedAt = Date.now();
          const durationMs = toolCompletedAt - startTime;

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
              executedAt: toolCompletedAt,
              durationMs,
              evalEnvelope: buildEvalEnvelopeForToolExecution({
                verdict: executionStatus === "success" ? "passed" : "failed",
                toolCompletedAt,
                durationMs,
              }),
            });

            await emitEvalLifecycleTrustEvent({
              fromState: "running",
              toState: executionStatus === "success" ? "passed" : "failed",
              reasonCodes: [
                executionStatus === "success"
                  ? "execution_succeeded"
                  : "execution_failed",
              ],
              transitionSource: "chat_tool_call_execution_outcome",
              traceStatus: executionStatus === "success" ? "ready" : "blocked",
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
          const toolCompletedAt = Date.now();
          const durationMs = toolCompletedAt - startTime;
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
            executedAt: toolCompletedAt,
            durationMs,
            evalEnvelope: buildEvalEnvelopeForToolExecution({
              verdict: "failed",
              toolCompletedAt,
              durationMs,
            }),
          });

          await emitEvalLifecycleTrustEvent({
            fromState: "running",
            toState: "failed",
            reasonCodes: ["execution_failed"],
            transitionSource: "chat_tool_call_execution_exception",
            traceStatus: "blocked",
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
    let normalizedLayersBuilderMessageContent: string | null = null;
    if (proposedToolCount === 0) {
      // No proposals - this is a normal response or executed tool results
      let messageContent = finalMessage.content;
      if (isLayersBuilderContext) {
        if (!messageContent || messageContent.trim().length === 0) {
          throw new ConvexError({
            code: "LAYERS_BUILDER_EMPTY_RESPONSE",
            message: "Layers builder returned an empty response.",
          });
        }
        const normalizedWorkflow = normalizeLayersBuilderWorkflowPayload(messageContent);
        messageContent = formatLayersBuilderResponse(normalizedWorkflow);
        normalizedLayersBuilderMessageContent = messageContent;
      }
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
      if (args.context === "page_builder" || args.context === "layers_builder") {
        generatedJson = response.structuredOutput?.value;

        const trainingMessageContent =
          normalizedLayersBuilderMessageContent ?? finalMessage.content;
        if (!generatedJson && trainingMessageContent) {
          const jsonMatch = trainingMessageContent.match(/```json\s*([\s\S]*?)\s*```/);
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
      : (
          normalizedLayersBuilderMessageContent
          || finalMessage.content
          || `Executed ${executedToolCalls.length} tool(s)`
        );

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
