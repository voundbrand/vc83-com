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
  getToolSchemasForNames,
} from "./tools/registry";
import type { ToolExecutionContext } from "./tools/registry";
import {
  buildVacationDecisionResponse,
} from "./tools/bookingTool";
import {
  DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
  buildRuntimeModuleIntentRoutingContext,
  resolveInboundRuntimeModuleIntentRoute,
  type DerTerminmacherRuntimeContract,
} from "./agents/der_terminmacher/runtimeModule";
import {
  DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY,
} from "./agents/david_ogilvy/runtimeModule";
import {
  buildInboundMeetingConciergeRuntimeContext,
  buildMeetingConciergeDecisionTelemetry,
} from "./agents/der_terminmacher/tools";
import {
  resolveInboundMeetingConciergeIntent,
} from "./agents/der_terminmacher/meetingConcierge";
import {
  buildInboundLanguageLockRuntimeContext,
  resolveInboundConversationLanguageLock,
} from "./agents/der_terminmacher/languageLock";
import {
  applyDerTerminmacherToolCallAdjustments,
  resolveDerTerminmacherToolScopeManifest,
} from "./agents/der_terminmacher/orchestration";
import {
  buildSamanthaAuditDeliverableGracefulDegradationMessage,
  buildSamanthaAuditDeliverableVerificationFallbackMessage,
  countTrailingSamanthaFailClosedAssistantMessages,
  countTrailingSamanthaMissingFieldRecoveryMessages,
  sanitizeSamanthaEmailOnlyAssistantContent,
} from "./agents/samantha/prompt";
import {
  isSamanthaLeadCaptureRuntime,
  resolveSamanthaAuditLookupTarget,
  resolveSamanthaAuditSessionContextFailure,
  resolveSamanthaAuditSourceContext,
  resolveSamanthaRoutingAgentSnapshot,
} from "./agents/samantha/policy";
import {
  buildSamanthaMissingFieldRecoveryMessage,
  isLikelyAuditDeliverableInvocationRequest,
  resolveSamanthaAuditAutoDispatchPlan,
  resolveSamanthaAuditLeadData,
  resolveSamanthaAuditDispatchDecision,
  resolveSamanthaClaimRecoveryDecision,
  shouldAttemptSamanthaClaimRecoveryAutoDispatch,
} from "./agents/samantha/tools";
import {
  executeSamanthaAutoDispatchRuntimeFlow,
  executeSamanthaCapabilityGapUnavailableHandling,
  executeSamanthaPostOutputGuardrails,
  executeSamanthaPostDispatchTelemetryFinalization,
  executeSamanthaSourceContextRuntimeInitialization,
} from "./agents/samantha/runtimeModule";
import { createSamanthaDispatchTraceScaffolding } from "./agents/samantha/trace";
import {
  resolveAgentModuleFromConfig,
} from "./agents/runtimeModuleRegistry";
import type { Id } from "../_generated/dataModel";
import { getToolCreditCost } from "../credits/index";
import { composeKnowledgeContract } from "./systemKnowledge/index";
import { LLM_RETRY_POLICY, withRetry } from "./retryPolicy";
import { getUserErrorMessage, classifyError } from "./errorMessages";
import {
  AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION,
  AGENT_RUNTIME_TOPOLOGY_PROFILE_DEFAULT,
  AI_AGENT_MEMORY_RUNTIME_CONTRACT_VERSION,
  AI_AGENT_MEMORY_RUNTIME_DECISION,
  EXECUTION_BUNDLE_CONTRACT_VERSION,
  IDEMPOTENCY_CONTRACT_VERSION,
  KNOWLEDGE_CONTEXT_CONFIDENCE_CONTRACT_VERSION,
  KNOWLEDGE_CONTEXT_PROVENANCE_CONTRACT_VERSION,
  KNOWLEDGE_CONTEXT_SCOPE_CONTRACT_VERSION,
  RUN_ATTEMPT_CONTRACT_VERSION,
  TURN_QUEUE_CONTRACT_VERSION,
  assertAgentExecutionBundleContract,
  assertAgentRuntimeTopologyContract,
  assertRuntimeIdempotencyContract,
  assertTurnQueueContract,
  isAgentRuntimeTopologyProfile,
  resolveAgentRuntimeTopologyAdapter,
  type AgentExecutionBundleContract,
  type AgentRuntimeTopologyContract,
  type AgentRuntimeTopologyProfile,
  type AgentTurnRunAttemptContract,
  type IdempotencyIntentType,
  type KnowledgeContextConfidenceBand,
  type KnowledgeContextConfidenceContract,
  type KnowledgeContextProvenanceContract,
  type KnowledgeContextScopeContract,
  type RuntimeIdempotencyContract,
  type TurnQueueConflictLabel,
  type TurnQueueContract,
} from "../schemas/aiSchemas";
import {
  AGENT_TOOL_SCOPE_RESOLUTION_CONTRACT_VERSION,
  getPlatformBlockedTools,
  resolveAgentToolScopeResolutionContract,
  resolveActiveToolsWithAudit,
  validateRequiredSpecialistScopeContract,
  TOOL_PROFILES,
  type AgentToolScopeResolutionContract,
  type RequiredSpecialistScopeContract,
  type RequiredSpecialistScopeGap,
  SUBTYPE_DEFAULT_PROFILES,
} from "./toolScoping";
import {
  composeAdaptiveRecentContextWindow,
  composeSessionContactMemoryContext,
  composeOperatorPinnedNotesContext,
  composeSessionReactivationMemoryContext,
  composeRollingSessionMemoryContext,
  composeKnowledgeContext,
  extractSessionContactMemoryCandidates,
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
import { toDeployableTelephonyConfig } from "../../src/lib/telephony/agent-telephony";
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
  canUsePlatformMotherCustomerFacingSupport,
  isPlatformMotherAuthorityRecord,
} from "../platformMother";
import { resolveDeterministicVoiceDefaults } from "./voiceDefaults";
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
  isDreamTeamSpecialistContractInWorkspaceScope,
  buildHarnessContext,
  determineAgentLayer,
  normalizeDreamTeamSpecialistContracts,
  normalizeTeamAccessModeToken,
  resolveUnifiedPersonalityFlag,
  type CrossOrgSoulReadOnlyEnrichmentSummary,
  type DreamTeamWorkspaceType,
} from "./harness";
import { resolveTeamSpecialistSelection } from "./tools/teamTools";
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
import { resolveWeekendModeRuntimeContract } from "./weekendMode";
import {
  buildSupportRuntimePolicy,
  resolveSupportRuntimeContext,
} from "./prompts/supportRuntimePolicy";
import {
  buildLayeredContextSystemPrompt,
  buildLayeredContextSystemPromptFromBundles,
} from "./prompts/layeredContextSystem";
import {
  buildConfigureAgentFieldsProposalEnvelope,
  CONFIGURE_AGENT_FIELDS_TOOL_NAME,
} from "./tools/configureAgentFieldsTool";
import {
  type AgentRuntimeToolHooks,
  collectSuccessfulToolNames,
  type AgentToolExecutionStatus,
  type AgentToolResult,
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
  assertInboundRuntimeKernelContract,
  createInboundRuntimeKernelHooks,
  enterInboundRuntimeKernelStage,
  handleTurnLeaseAcquireFailure,
  persistRuntimeTurnArtifacts,
  resolveInboundRuntimeKernelContract,
  resolveInboundRuntimeTopologyAdapterSelection,
  settleRuntimeTurnLease,
  type InboundRuntimeKernelContract,
  type InboundRuntimeKernelStage,
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
  resolveMobileSourceAttestationContract,
  type MobileSourceAttestationContract,
} from "./mobileRuntimeHardening";
import {
  TRUST_EVENT_NAMESPACE,
  TRUST_EVENT_TAXONOMY_VERSION,
  buildTrustTimelineCorrelationId,
} from "./trustEvents";
import { ONBOARDING_DEFAULT_MODEL_ID } from "./modelDefaults";
import {
  KANZLEI_COMPLIANCE_AUDIT_CONTRACT_VERSION,
  SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
  isKanzleiExternalDispatchToolName,
  isKanzleiFailClosedModeToken,
  resolveFailClosedApprovalToolNames,
  resolveAgentRuntimeModuleMetadataFromConfig,
} from "./agentSpecRegistry";
import {
  ACTION_COMPLETION_CLAIM_CONTRACT_VERSION,
  ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION,
  AUDIT_DELIVERABLE_OUTCOME_KEY,
  AUDIT_DELIVERABLE_TOOL_NAME,
  SAMANTHA_RUNTIME_MODULE_ADAPTER,
  SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING,
  SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_NOT_FOUND,
  type SamanthaAuditAutoDispatchPlan,
  type SamanthaAuditAutoDispatchToolArgs,
  type SamanthaAuditDispatchDecision,
  type SamanthaAuditRequiredField,
  type SamanthaAuditRoutingAuditChannel,
  type SamanthaAuditSourceContext,
  type SamanthaAutoDispatchInvocationStatus,
  type SamanthaAutoDispatchSkipReasonCode,
  type SamanthaClaimRecoveryDecision,
  type SamanthaPreflightReasonCode,
} from "./samanthaAuditContract";
import {
  enforceRuntimeGovernorCost,
  enforceRuntimeGovernorStepAndTime,
  resolveRuntimeGovernorContract,
  type RuntimeGovernorContract,
  type RuntimeGovernorLimit,
} from "./runtimeGovernor";
import {
  buildCrossOrgEnrichmentTelemetryLabels,
  resolveCrossOrgEnrichmentCandidateDecision,
  resolveCrossOrgEnrichmentRequestDecision,
  type CrossOrgEnrichmentCandidateDecision,
  type CrossOrgEnrichmentTelemetryLabels,
} from "../lib/layerScope";
import { buildRuntimeIncidentThreadDeepLink } from "./runtimeIncidentAlerts";
import {
  buildAdmissionDenial,
  type AdmissionDecisionStage,
  type AdmissionDenialReasonCode,
  type AdmissionDenialV1,
  type AdmissionIngressChannel,
} from "./admissionController";
import {
  buildDeterministicIdempotencyPayloadHash,
  evaluateInboundIdempotencyTuple,
} from "./idempotencyCoordinator";
import {
  buildActionCompletionQaDiagnostics,
  buildSuperAdminAgentQaTurnTelemetryEnvelope,
  SUPER_ADMIN_AGENT_QA_MODE_VERSION,
  type ActionCompletionQaDiagnostics,
} from "./qaModeContracts";

export {
  buildAgentSystemPrompt,
  mapSemanticChunksToKnowledgeDocuments,
  rankKnowledgeDocsForSemanticRetrieval,
  resolveKnowledgeRetrieval,
} from "./agentPromptAssembly";
export {
  DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
  DER_TERMINMACHER_MUTATION_POLICY_CONTRACT_VERSION,
  DER_TERMINMACHER_PROMPT_CONTRACT_VERSION,
  DER_TERMINMACHER_TOOL_MANIFEST_CONTRACT_VERSION,
  RUNTIME_MODULE_INTENT_ROUTER_CONTRACT_VERSION,
  buildRuntimeModuleIntentRoutingContext,
  resolveDerTerminmacherRuntimeContract,
  resolveInboundRuntimeModuleIntentRoute,
} from "./agents/der_terminmacher/runtimeModule";
export type {
  DerTerminmacherRuntimeContract,
  RuntimeModuleIntentRoutingCandidate,
  RuntimeModuleIntentRoutingDecision,
} from "./agents/der_terminmacher/runtimeModule";
export {
  buildDerTerminmacherRuntimeContext,
} from "./agents/der_terminmacher/prompt";
export {
  buildInboundMeetingConciergeRuntimeContext,
  buildMeetingConciergeDecisionTelemetry,
  enforceDerTerminmacherPreviewFirstToolPolicy,
} from "./agents/der_terminmacher/tools";
export {
  injectAutoPreviewMeetingConciergeToolCall,
  resolveInboundMeetingConciergeIntent,
} from "./agents/der_terminmacher/meetingConcierge";
export type {
  InboundMeetingConciergeIntent,
} from "./agents/der_terminmacher/meetingConcierge";
export {
  buildInboundLanguageLockRuntimeContext,
  resolveInboundConversationLanguageLock,
} from "./agents/der_terminmacher/languageLock";
export {
  applyDerTerminmacherToolCallAdjustments,
  resolveDerTerminmacherToolScopeManifest,
} from "./agents/der_terminmacher/orchestration";
export {
  buildSamanthaAuditDeliverableGracefulDegradationMessage,
  buildSamanthaAuditDeliverableVerificationFallbackMessage,
  countTrailingSamanthaFailClosedAssistantMessages,
  countTrailingSamanthaMissingFieldRecoveryMessages,
  sanitizeSamanthaEmailOnlyAssistantContent,
} from "./agents/samantha/prompt";
export {
  isSamanthaLeadCaptureRuntime,
  resolveSamanthaAuditLookupTarget,
  resolveSamanthaAuditSessionContextFailure,
  resolveSamanthaAuditSourceContext,
  resolveSamanthaRoutingAgentSnapshot,
} from "./agents/samantha/policy";
export {
  buildSamanthaMissingFieldRecoveryMessage,
  isLikelyAuditDeliverableInvocationRequest,
  resolveSamanthaAuditAutoDispatchPlan,
  resolveSamanthaAuditLeadData,
  resolveSamanthaAuditDispatchDecision,
  resolveSamanthaAutoDispatchInvocationStatus,
  resolveSamanthaClaimRecoveryDecision,
  resolveSamanthaDispatchTerminalReasonCode,
  shouldAttemptSamanthaClaimRecoveryAutoDispatch,
} from "./agents/samantha/tools";
export type {
  SamanthaAuditAutoDispatchPlan,
  SamanthaAuditAutoDispatchToolArgs,
  SamanthaAuditDispatchDecision,
  SamanthaAutoDispatchInvocationStatus,
  SamanthaAutoDispatchSkipReasonCode,
  SamanthaClaimRecoveryDecision,
} from "./samanthaAuditContract";

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
  agentClass?: "internal_operator" | "external_customer_facing";
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
  requiredTools?: string[];
  requiredCapabilities?: string[];
  autonomyLevel: AutonomyLevelInput;
  maxMessagesPerDay?: number;
  maxCostPerDay?: number;
  runtimeGovernor?: {
    max_steps?: number;
    max_time_ms?: number;
    max_cost_usd?: number;
  };
  requireApprovalFor?: string[];
  complianceMode?: string;
  industry?: string;
  orgPolicyRef?: string;
  kanzleiFailClosed?: boolean;
  kanzleiApprovedExternalTools?: string[];
  kanzleiApprovedSkills?: string[];
  blockedTopics?: string[];
  runtimeTopologyProfile?: string;
  topologyProfile?: string;
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
  weekendMode?: unknown;
  weekendModeEnabled?: boolean;
  weekendModeActive?: boolean;
  weekendModeReason?: string;
  weekendModeTimezone?: string;
  weekendModeFridayStart?: string;
  weekendModeMondayEnd?: string;
  domainAutonomy?: unknown;
  autonomyTrust?: unknown;
  actionCompletionContract?: {
    contractVersion?: string;
    mode?: "off" | "observe" | "enforce" | string;
    outcomes?: Array<{
      outcome?: string;
      requiredTools?: string[];
      unavailableMessage?: string;
      notObservedMessage?: string;
    }>;
  };
  crossOrgEnrichment?: {
    personalWorkspaceReadOnlyOptIn?: boolean;
  };
  crossOrgPersonalWorkspaceReadOnlyOptIn?: boolean;
}

const RUNTIME_MODULE_TOPOLOGY_PROFILE_BY_KEY: Record<
  string,
  AgentRuntimeTopologyProfile
> = {
  [DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY]: "pipeline_router",
  [SAMANTHA_AGENT_RUNTIME_MODULE_KEY]: "evaluator_loop",
  [DAVID_OGILVY_AGENT_RUNTIME_MODULE_KEY]: "single_agent_loop",
};

function resolveTemplateRoleTopologyProfile(
  templateRole: string | null,
): AgentRuntimeTopologyProfile | null {
  if (!templateRole) {
    return null;
  }
  const normalized = templateRole.toLowerCase();
  if (
    normalized.includes("operator_template")
    || normalized.includes("operator_runtime")
  ) {
    return "multi_agent_dag";
  }
  if (
    normalized.includes("telephony")
    || normalized.includes("booking")
    || normalized.includes("terminmacher")
    || normalized.includes("concierge")
  ) {
    return "pipeline_router";
  }
  if (
    normalized.includes("samantha")
    || normalized.includes("lead_capture")
    || normalized.includes("governance")
  ) {
    return "evaluator_loop";
  }
  if (
    normalized.includes("copywriter")
    || normalized.includes("support")
    || normalized.includes("customer_service")
    || normalized.includes("project_manager")
    || normalized.includes("mvp")
  ) {
    return "single_agent_loop";
  }
  return null;
}

function resolveToolProfileTopologyProfile(
  toolProfile: string | null,
): AgentRuntimeTopologyProfile | null {
  if (!toolProfile) {
    return null;
  }
  const normalized = toolProfile.toLowerCase();
  if (normalized === "personal_operator") {
    return "multi_agent_dag";
  }
  if (normalized === "booking") {
    return "pipeline_router";
  }
  if (
    normalized === "readonly"
    || normalized === "support"
    || normalized === "general"
  ) {
    return "single_agent_loop";
  }
  return null;
}

function resolveRuntimeModuleTopologyProfile(
  runtimeModuleKey: string | null,
): AgentRuntimeTopologyProfile | null {
  if (!runtimeModuleKey) {
    return null;
  }
  return RUNTIME_MODULE_TOPOLOGY_PROFILE_BY_KEY[runtimeModuleKey] ?? null;
}

export function resolveAgentRuntimeTopologyContractFromConfig(args: {
  config: Record<string, unknown> | null | undefined;
  runtimeModuleKey?: string | null;
  now?: number;
}): AgentRuntimeTopologyContract {
  const now = args.now ?? Date.now();
  const config = args.config ?? null;
  const explicitProfileToken = firstInboundString(
    config?.runtimeTopologyProfile,
    config?.topologyProfile,
  );
  const runtimeModuleKey =
    normalizeExecutionString(args.runtimeModuleKey)
    ?? normalizeExecutionString(config?.runtimeModuleKey)
    ?? null;
  const runtimeModuleTopologyProfile =
    resolveRuntimeModuleTopologyProfile(runtimeModuleKey);

  if (explicitProfileToken) {
    if (!isAgentRuntimeTopologyProfile(explicitProfileToken)) {
      return {
        contractVersion: AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION,
        profile: AGENT_RUNTIME_TOPOLOGY_PROFILE_DEFAULT,
        adapter: resolveAgentRuntimeTopologyAdapter(
          AGENT_RUNTIME_TOPOLOGY_PROFILE_DEFAULT,
        ),
        source: "agent_config",
        enforcement: "blocked",
        reasonCode: "topology_profile_invalid",
        resolvedAt: now,
      };
    }
    if (
      runtimeModuleTopologyProfile
      && runtimeModuleTopologyProfile !== explicitProfileToken
    ) {
      return {
        contractVersion: AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION,
        profile: explicitProfileToken,
        adapter: resolveAgentRuntimeTopologyAdapter(explicitProfileToken),
        source: "agent_config",
        enforcement: "blocked",
        reasonCode: "topology_profile_runtime_module_mismatch",
        resolvedAt: now,
      };
    }
    return {
      contractVersion: AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION,
      profile: explicitProfileToken,
      adapter: resolveAgentRuntimeTopologyAdapter(explicitProfileToken),
      source: "agent_config",
      enforcement: "enforced",
      reasonCode: "topology_profile_explicit",
      resolvedAt: now,
    };
  }

  if (runtimeModuleTopologyProfile) {
    return {
      contractVersion: AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION,
      profile: runtimeModuleTopologyProfile,
      adapter: resolveAgentRuntimeTopologyAdapter(runtimeModuleTopologyProfile),
      source: "runtime_module",
      enforcement: "enforced",
      reasonCode: "topology_profile_runtime_module",
      resolvedAt: now,
    };
  }

  const templateRoleTopologyProfile = resolveTemplateRoleTopologyProfile(
    normalizeExecutionString(config?.templateRole),
  );
  if (templateRoleTopologyProfile) {
    return {
      contractVersion: AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION,
      profile: templateRoleTopologyProfile,
      adapter: resolveAgentRuntimeTopologyAdapter(templateRoleTopologyProfile),
      source: "template_role",
      enforcement: "enforced",
      reasonCode: "topology_profile_template_role",
      resolvedAt: now,
    };
  }

  const toolProfileTopologyProfile = resolveToolProfileTopologyProfile(
    normalizeExecutionString(config?.toolProfile),
  );
  if (toolProfileTopologyProfile) {
    return {
      contractVersion: AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION,
      profile: toolProfileTopologyProfile,
      adapter: resolveAgentRuntimeTopologyAdapter(toolProfileTopologyProfile),
      source: "tool_profile",
      enforcement: "enforced",
      reasonCode: "topology_profile_tool_profile",
      resolvedAt: now,
    };
  }

  return {
    contractVersion: AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION,
    profile: AGENT_RUNTIME_TOPOLOGY_PROFILE_DEFAULT,
    adapter: resolveAgentRuntimeTopologyAdapter(
      AGENT_RUNTIME_TOPOLOGY_PROFILE_DEFAULT,
    ),
    source: "default_profile",
    enforcement: "blocked",
    reasonCode: "topology_profile_missing",
    resolvedAt: now,
  };
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
  enabledTools?: string[];
  complianceMode?: string;
  industry?: string;
  orgPolicyRef?: string;
  kanzleiFailClosed?: boolean;
}): string[] | undefined {
  const explicitApprovalTools = args.requireApprovalFor
    ? Array.from(new Set(args.requireApprovalFor))
    : undefined;

  const failClosedApprovalEnabled =
    args.kanzleiFailClosed === true
    || isKanzleiFailClosedModeToken(args.complianceMode)
    || isKanzleiFailClosedModeToken(args.industry)
    || isKanzleiFailClosedModeToken(args.orgPolicyRef);

  if (!failClosedApprovalEnabled) {
    return explicitApprovalTools;
  }

  const failClosedApprovalTools = resolveFailClosedApprovalToolNames({
    toolNames: [
      ...(explicitApprovalTools ?? []),
      ...(args.enabledTools ?? []),
    ],
  });
  return Array.from(
    new Set([
      ...(explicitApprovalTools ?? []),
      ...failClosedApprovalTools,
    ]),
  ).sort((left, right) => left.localeCompare(right));
}

function isBlockedToolResultForKanzleiAudit(result: AgentToolResult): boolean {
  if (result.status === "blocked" || Boolean(result.blocked)) {
    return true;
  }
  if (result.status !== "error") {
    return false;
  }
  const normalizedError = normalizeExecutionString(result.error)?.toLowerCase();
  if (!normalizedError) {
    return false;
  }
  return (
    normalizedError.includes("blocked")
    || normalizedError.includes("fail-closed")
    || normalizedError.includes("fail_closed")
  );
}

function resolveKanzleiAuditReasonCode(result: AgentToolResult): string {
  if (result.blocked?.code) {
    return result.blocked.code;
  }
  const normalizedError = normalizeExecutionString(result.error)?.toLowerCase();
  if (!normalizedError) {
    return "blocked_by_runtime_policy";
  }
  const bracketReasonMatch = normalizedError.match(/\(([a-z0-9:_-]+)\)/);
  if (bracketReasonMatch?.[1]) {
    return bracketReasonMatch[1];
  }
  if (normalizedError.includes("allowlist")) {
    return "kanzlei_external_tool_not_allowlisted";
  }
  return "blocked_by_runtime_policy";
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

export function resolveCrossOrgPersonalWorkspaceEnrichmentOptIn(
  config: Pick<
    AgentConfig,
    "crossOrgPersonalWorkspaceReadOnlyOptIn" | "crossOrgEnrichment"
  > | null | undefined
): boolean {
  if (!config) {
    return false;
  }
  return (
    config.crossOrgPersonalWorkspaceReadOnlyOptIn === true
    || config.crossOrgEnrichment?.personalWorkspaceReadOnlyOptIn === true
  );
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
  authorityConfig: AgentConfig;
  organization: {
    _id: Id<"organizations">;
    isPersonalWorkspace?: boolean;
    parentOrganizationId?: Id<"organizations"> | null;
    customProperties?: Record<string, unknown> | null;
  };
  channel: string;
  externalContactIdentifier: string;
}): Promise<{
  enrichment: CrossOrgSoulReadOnlyEnrichmentSummary[];
  telemetry: CrossOrgEnrichmentTelemetryLabels;
}> {
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
  const workspaceType = resolveWorkspaceTypeFromOrganization(args.organization);
  const operatorUserId = resolveDesktopUserIdFromExternalContactIdentifier({
    channel: args.channel,
    externalContactIdentifier: args.externalContactIdentifier,
  });
  const requestDecisionWithoutMembership = resolveCrossOrgEnrichmentRequestDecision({
    workspaceType,
    operatorUserIdResolved: Boolean(operatorUserId),
    hasActiveViewerMembership: false,
    optInEnabled: resolveCrossOrgPersonalWorkspaceEnrichmentOptIn(args.authorityConfig),
  });
  if (!hasQueryableDb(dbCandidate)) {
    return {
      enrichment: [],
      telemetry: buildCrossOrgEnrichmentTelemetryLabels({
        requestDecision: requestDecisionWithoutMembership,
        viewerOrganization: args.organization,
        candidateOrganizations: [],
      }),
    };
  }
  const db = dbCandidate;

  const optInEnabled = resolveCrossOrgPersonalWorkspaceEnrichmentOptIn(args.authorityConfig);
  const currentMembership = operatorUserId
    ? await db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q: any) =>
          q.eq("userId", operatorUserId).eq("organizationId", args.organization._id)
        )
        .filter((q: any) => q.eq(q.field("isActive"), true))
        .first()
    : null;
  const requestDecision = resolveCrossOrgEnrichmentRequestDecision({
    workspaceType,
    operatorUserIdResolved: Boolean(operatorUserId),
    hasActiveViewerMembership: Boolean(currentMembership),
    optInEnabled,
  });
  if (!requestDecision.allowed || !operatorUserId) {
    return {
      enrichment: [],
      telemetry: buildCrossOrgEnrichmentTelemetryLabels({
        requestDecision,
        viewerOrganization: args.organization,
        candidateOrganizations: [],
      }),
    };
  }

  const memberships = await db
    .query("organizationMembers")
    .withIndex("by_user", (q: any) => q.eq("userId", operatorUserId))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .collect();

  const candidateOrganizationsForTelemetry: Array<{
    _id: Id<"organizations">;
    parentOrganizationId?: Id<"organizations"> | null;
    customProperties?: Record<string, unknown> | null;
  }> = [];
  const candidateDecisionsForTelemetry: CrossOrgEnrichmentCandidateDecision[] = [];
  const enrichments = await Promise.all(
    memberships.map(async (membership: {
      organizationId: Id<"organizations">;
      role: Id<"roles">;
    }) => {
      const org = await db.get(membership.organizationId);
      if (!org) {
        return null;
      }
      const candidateOrganization = {
        _id: org._id,
        parentOrganizationId: org.parentOrganizationId,
        customProperties: org.customProperties ?? null,
      };
      if (org._id !== args.organization._id) {
        candidateOrganizationsForTelemetry.push(candidateOrganization);
      }
      const candidateDecision = resolveCrossOrgEnrichmentCandidateDecision({
        viewerOrganization: args.organization,
        candidateOrganization,
        candidateIsActive: org.isActive === true,
        candidateIsPersonalWorkspace: org.isPersonalWorkspace === true,
      });
      candidateDecisionsForTelemetry.push(candidateDecision);
      if (!candidateDecision.allowed) {
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

  const enrichment = enrichments
    .filter(
      (entry): entry is CrossOrgSoulReadOnlyEnrichmentSummary => entry !== null,
    )
    .sort((a, b) => a.organizationName.localeCompare(b.organizationName))
    .slice(0, 5);
  return {
    enrichment,
    telemetry: buildCrossOrgEnrichmentTelemetryLabels({
      requestDecision,
      viewerOrganization: args.organization,
      candidateOrganizations: candidateOrganizationsForTelemetry,
      candidateDecisions: candidateDecisionsForTelemetry,
    }),
  };
}

export interface DelegationAuthorityRuntimeContract<IdLike extends string = string> {
  authorityAgentId: IdLike;
  speakerAgentId: IdLike;
  authorityAutonomyLevel: AutonomyLevel;
  authorityRequireApprovalFor?: string[];
  authorityToolProfile: string;
  authorityEnabledTools: string[];
  authorityDisabledTools: string[];
  authorityRequiredTools: string[];
  authorityRequiredCapabilities: string[];
  authorityUseToolBroker: boolean;
  authorityActiveSoulMode?: string;
  authorityModeChannelBindings?: unknown;
  authorityRequestedArchetype?: string | null;
  authorityEnabledArchetypes?: unknown;
}

function normalizeDeterministicRuntimeStringArray(values?: string[]): string[] {
  if (!values) {
    return [];
  }
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0)
    )
  ).sort((left, right) => left.localeCompare(right));
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
    | "complianceMode"
    | "industry"
    | "orgPolicyRef"
    | "kanzleiFailClosed"
    | "toolProfile"
    | "enabledTools"
    | "disabledTools"
    | "requiredTools"
    | "requiredCapabilities"
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
  const authorityEnabledTools = normalizeDeterministicRuntimeStringArray(
    args.primaryConfig.enabledTools,
  );
  return {
    authorityAgentId: args.primaryAgentId,
    speakerAgentId: args.speakerAgentId ?? args.primaryAgentId,
    authorityAutonomyLevel,
    authorityRequireApprovalFor: resolveAgentRequireApprovalFor({
      autonomyLevel: authorityAutonomyLevel,
      requireApprovalFor: args.primaryConfig.requireApprovalFor,
      enabledTools: authorityEnabledTools,
      complianceMode: args.primaryConfig.complianceMode,
      industry: args.primaryConfig.industry,
      orgPolicyRef: args.primaryConfig.orgPolicyRef,
      kanzleiFailClosed: args.primaryConfig.kanzleiFailClosed === true,
    }),
    authorityToolProfile:
      args.primaryConfig.toolProfile
      ?? SUBTYPE_DEFAULT_PROFILES[args.primaryAgentSubtype ?? "general"]
      ?? "general",
    authorityEnabledTools,
    authorityDisabledTools: normalizeDeterministicRuntimeStringArray(
      args.primaryConfig.disabledTools,
    ),
    authorityRequiredTools: normalizeDeterministicRuntimeStringArray(
      args.primaryConfig.requiredTools,
    ),
    authorityRequiredCapabilities: normalizeDeterministicRuntimeStringArray(
      args.primaryConfig.requiredCapabilities,
    ),
    authorityUseToolBroker: args.primaryConfig.useToolBroker === true,
    authorityActiveSoulMode: args.primaryConfig.activeSoulMode,
    authorityModeChannelBindings: args.primaryConfig.modeChannelBindings,
    authorityRequestedArchetype: args.primaryConfig.activeArchetype,
    authorityEnabledArchetypes: args.primaryConfig.enabledArchetypes,
  };
}

function mergeRuntimeMandatoryTools(
  baseline: string[],
  mandatory: string[],
): string[] {
  return normalizeDeterministicRuntimeStringArray([
    ...baseline,
    ...mandatory,
  ]);
}

function removeRuntimeMandatoryTools(
  baseline: string[],
  mandatory: string[],
): string[] {
  if (mandatory.length === 0 || baseline.length === 0) {
    return baseline;
  }
  const blocked = new Set(
    mandatory.map((toolName) => normalizeExecutionString(toolName)?.toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );
  return normalizeDeterministicRuntimeStringArray(
    baseline.filter((toolName) => {
      const normalized = normalizeExecutionString(toolName)?.toLowerCase();
      return !normalized || !blocked.has(normalized);
    }),
  );
}

function resolveNativeGuestMandatoryActionCompletionTools(args: {
  channel: string;
  actionCompletionContractConfig: ActionCompletionRuntimeContractConfig;
}): string[] {
  if (args.channel !== "native_guest") {
    return [];
  }

  const hasAuditDeliverableOutcome = args.actionCompletionContractConfig.outcomes.some(
    (outcome) =>
      outcome.outcome === AUDIT_DELIVERABLE_OUTCOME_KEY
      && outcome.requiredTools.includes(AUDIT_DELIVERABLE_TOOL_NAME),
  );
  if (!hasAuditDeliverableOutcome) {
    return [];
  }

  const contractRequiredTools = args.actionCompletionContractConfig.outcomes.flatMap(
    (outcome) => outcome.requiredTools,
  );
  return normalizeDeterministicRuntimeStringArray([
    "request_audit_deliverable_email",
    ...contractRequiredTools,
  ]);
}

export function resolveNativeGuestRequiredToolInvariant(args: {
  channel: string;
  requiredTools: string[];
  effectiveExecutableToolNames: string[];
}): {
  enforced: boolean;
  missingRequiredTools: string[];
} {
  if (args.channel !== "native_guest" || args.requiredTools.length === 0) {
    return {
      enforced: false,
      missingRequiredTools: [],
    };
  }

  const missingRequiredTools = normalizeDeterministicRuntimeStringArray(
    args.requiredTools.filter(
      (toolName) => !args.effectiveExecutableToolNames.includes(toolName),
    ),
  );

  return {
    enforced: missingRequiredTools.length > 0,
    missingRequiredTools,
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
const DUPLICATE_INGRESS_REPLAY_ALERT_THRESHOLD = 3;

export const AGENT_RUNTIME_HOOK_CONTRACT_VERSION =
  "agent_runtime_hooks_v1" as const;
export const AGENT_RUNTIME_HOOK_ORDER = [
  "preRoute",
  "preLLM",
  "postLLM",
  "preTool",
  "postTool",
  "completionPolicy",
] as const;
export type AgentRuntimeHookName = (typeof AGENT_RUNTIME_HOOK_ORDER)[number];

export interface AgentRuntimeHookPayload {
  contractVersion: typeof AGENT_RUNTIME_HOOK_CONTRACT_VERSION;
  hookName: AgentRuntimeHookName;
  organizationId: string;
  channel: string;
  externalContactIdentifier: string;
  occurredAt: number;
  sessionId?: string;
  turnId?: string;
  agentId?: string;
  toolName?: string;
  toolStatus?: AgentToolExecutionStatus;
  metadata?: Record<string, unknown>;
}

export type AgentRuntimeHookHandler = (
  payload: AgentRuntimeHookPayload
) => Promise<void> | void;

export interface AgentRuntimeHooks {
  preRoute?: AgentRuntimeHookHandler;
  preLLM?: AgentRuntimeHookHandler;
  postLLM?: AgentRuntimeHookHandler;
  preTool?: AgentRuntimeHookHandler;
  postTool?: AgentRuntimeHookHandler;
  completionPolicy?: AgentRuntimeHookHandler;
}

export interface AgentRuntimeHookPayloadValidationResult {
  valid: boolean;
  reasonCode: "ok" | "invalid_hook" | "missing_required_field" | "invalid_occurred_at";
  field?: string;
}

export interface AgentRuntimeHookOrderValidationResult {
  valid: boolean;
  reasonCode: "ok" | "unexpected_hook" | "hook_after_completion";
  index?: number;
  observedHook?: AgentRuntimeHookName;
  expectedHooks?: AgentRuntimeHookName[];
}

function isAgentRuntimeHookName(value: unknown): value is AgentRuntimeHookName {
  return (
    value === "preRoute"
    || value === "preLLM"
    || value === "postLLM"
    || value === "preTool"
    || value === "postTool"
    || value === "completionPolicy"
  );
}

function hasRuntimeHookRequiredString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveAgentRuntimeHookHandler(
  hooks: AgentRuntimeHooks,
  hookName: AgentRuntimeHookName
): AgentRuntimeHookHandler | undefined {
  if (hookName === "preRoute") return hooks.preRoute;
  if (hookName === "preLLM") return hooks.preLLM;
  if (hookName === "postLLM") return hooks.postLLM;
  if (hookName === "preTool") return hooks.preTool;
  if (hookName === "postTool") return hooks.postTool;
  return hooks.completionPolicy;
}

export function createAgentRuntimeHooks(
  hooks?: AgentRuntimeHooks
): AgentRuntimeHooks {
  return hooks ?? {};
}

export function validateAgentRuntimeHookPayload(
  payload: AgentRuntimeHookPayload
): AgentRuntimeHookPayloadValidationResult {
  if (!isAgentRuntimeHookName(payload.hookName)) {
    return {
      valid: false,
      reasonCode: "invalid_hook",
      field: "hookName",
    };
  }
  if (!hasRuntimeHookRequiredString(payload.organizationId)) {
    return {
      valid: false,
      reasonCode: "missing_required_field",
      field: "organizationId",
    };
  }
  if (!hasRuntimeHookRequiredString(payload.channel)) {
    return {
      valid: false,
      reasonCode: "missing_required_field",
      field: "channel",
    };
  }
  if (!hasRuntimeHookRequiredString(payload.externalContactIdentifier)) {
    return {
      valid: false,
      reasonCode: "missing_required_field",
      field: "externalContactIdentifier",
    };
  }
  if (
    typeof payload.occurredAt !== "number"
    || !Number.isFinite(payload.occurredAt)
    || payload.occurredAt <= 0
  ) {
    return {
      valid: false,
      reasonCode: "invalid_occurred_at",
      field: "occurredAt",
    };
  }
  if (
    payload.hookName === "preTool"
    || payload.hookName === "postTool"
    || payload.hookName === "completionPolicy"
  ) {
    if (!hasRuntimeHookRequiredString(payload.sessionId)) {
      return {
        valid: false,
        reasonCode: "missing_required_field",
        field: "sessionId",
      };
    }
    if (!hasRuntimeHookRequiredString(payload.turnId)) {
      return {
        valid: false,
        reasonCode: "missing_required_field",
        field: "turnId",
      };
    }
    if (!hasRuntimeHookRequiredString(payload.agentId)) {
      return {
        valid: false,
        reasonCode: "missing_required_field",
        field: "agentId",
      };
    }
  }
  if (
    (payload.hookName === "preTool" || payload.hookName === "postTool")
    && !hasRuntimeHookRequiredString(payload.toolName)
  ) {
    return {
      valid: false,
      reasonCode: "missing_required_field",
      field: "toolName",
    };
  }
  return {
    valid: true,
    reasonCode: "ok",
  };
}

export function validateAgentRuntimeHookExecutionOrder(
  observedHooks: AgentRuntimeHookName[]
): AgentRuntimeHookOrderValidationResult {
  let state:
    | "start"
    | "after_pre_route"
    | "after_pre_llm"
    | "after_post_llm"
    | "after_pre_tool"
    | "after_post_tool"
    | "after_completion" = "start";

  for (let index = 0; index < observedHooks.length; index += 1) {
    const hook = observedHooks[index];
    if (state === "start") {
      if (hook === "preRoute") {
        state = "after_pre_route";
        continue;
      }
      return {
        valid: false,
        reasonCode: "unexpected_hook",
        index,
        observedHook: hook,
        expectedHooks: ["preRoute"],
      };
    }
    if (state === "after_pre_route") {
      if (hook === "preLLM") {
        state = "after_pre_llm";
        continue;
      }
      return {
        valid: false,
        reasonCode: "unexpected_hook",
        index,
        observedHook: hook,
        expectedHooks: ["preLLM"],
      };
    }
    if (state === "after_pre_llm") {
      if (hook === "postLLM") {
        state = "after_post_llm";
        continue;
      }
      return {
        valid: false,
        reasonCode: "unexpected_hook",
        index,
        observedHook: hook,
        expectedHooks: ["postLLM"],
      };
    }
    if (state === "after_post_llm") {
      if (hook === "preTool") {
        state = "after_pre_tool";
        continue;
      }
      if (hook === "completionPolicy") {
        state = "after_completion";
        continue;
      }
      return {
        valid: false,
        reasonCode: "unexpected_hook",
        index,
        observedHook: hook,
        expectedHooks: ["preTool", "completionPolicy"],
      };
    }
    if (state === "after_pre_tool") {
      if (hook === "postTool") {
        state = "after_post_tool";
        continue;
      }
      return {
        valid: false,
        reasonCode: "unexpected_hook",
        index,
        observedHook: hook,
        expectedHooks: ["postTool"],
      };
    }
    if (state === "after_post_tool") {
      if (hook === "preTool") {
        state = "after_pre_tool";
        continue;
      }
      if (hook === "completionPolicy") {
        state = "after_completion";
        continue;
      }
      return {
        valid: false,
        reasonCode: "unexpected_hook",
        index,
        observedHook: hook,
        expectedHooks: ["preTool", "completionPolicy"],
      };
    }
    return {
      valid: false,
      reasonCode: "hook_after_completion",
      index,
      observedHook: hook,
      expectedHooks: [],
    };
  }

  return {
    valid: true,
    reasonCode: "ok",
  };
}

export async function invokeAgentRuntimeHook(args: {
  hooks?: AgentRuntimeHooks;
  hookName: AgentRuntimeHookName;
  payload: Omit<
    AgentRuntimeHookPayload,
    "contractVersion" | "hookName" | "occurredAt"
  > & { occurredAt?: number };
  onHookError?: (args: {
    hookName: AgentRuntimeHookName;
    error: unknown;
  }) => void;
}): Promise<AgentRuntimeHookPayload> {
  const payload: AgentRuntimeHookPayload = {
    contractVersion: AGENT_RUNTIME_HOOK_CONTRACT_VERSION,
    hookName: args.hookName,
    occurredAt: args.payload.occurredAt ?? Date.now(),
    organizationId: args.payload.organizationId,
    channel: args.payload.channel,
    externalContactIdentifier: args.payload.externalContactIdentifier,
    sessionId: args.payload.sessionId,
    turnId: args.payload.turnId,
    agentId: args.payload.agentId,
    toolName: args.payload.toolName,
    toolStatus: args.payload.toolStatus,
    metadata: args.payload.metadata,
  };
  const validation = validateAgentRuntimeHookPayload(payload);
  if (!validation.valid) {
    throw new Error(
      `agent_runtime_hook_payload_invalid:${validation.reasonCode}:${validation.field || "unknown"}`
    );
  }

  const hookHandler = resolveAgentRuntimeHookHandler(
    args.hooks ?? {},
    args.hookName
  );
  if (!hookHandler) {
    return payload;
  }

  try {
    await hookHandler(payload);
  } catch (error) {
    args.onHookError?.({
      hookName: args.hookName,
      error,
    });
  }

  return payload;
}

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

interface RuntimeCapabilityGapLinearIssueResult {
  issueId: string;
  issueNumber: string;
  issueUrl: string;
}

function detectRuntimeCapabilityGapTicketRequestIntent(args: {
  inboundMessage: string;
}): boolean {
  const normalized = args.inboundMessage.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    /\b(create request|open ticket|create ticket|file ticket|feature request)\b/i.test(normalized)
    || /\b(ticket erstellen|feature request erstellen|anfrage erstellen|ticket aufmachen)\b/i.test(normalized)
  );
}

function formatCapabilityGapLinearIssueLine(args: {
  language: ActionCompletionResponseLanguage;
  linearIssue: RuntimeCapabilityGapLinearIssueResult;
}): string {
  void args.linearIssue;
  if (args.language === "de") {
    return "Feature-Request-Ticket intern erstellt.";
  }
  return "Feature request ticket created internally.";
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
  language?: ActionCompletionResponseLanguage;
  ticketRequestIntent?: boolean;
  linearIssue?: RuntimeCapabilityGapLinearIssueResult | null;
  backlogInsertStatus?: "inserted" | "updated" | "error";
}): string {
  const language = args.language ?? "en";
  const requestedTool = args.blocked.missing.requestedToolName;
  const missingSummary = args.blocked.missing.summary;
  const unblockingSteps = args.blocked.unblockingSteps.map(
    (step, index) => `${index + 1}. ${step}`
  );

  if (language === "de") {
    const ticketLine = args.linearIssue
      ? formatCapabilityGapLinearIssueLine({
          language,
          linearIssue: args.linearIssue,
        })
      : args.ticketRequestIntent
        ? args.backlogInsertStatus === "updated"
          ? "Ihr Request wurde bereits erfasst und an die Foundry-Review-Queue angehaengt."
          : "Ich konnte in diesem Schritt kein Linear-Ticket erstellen, aber die Anfrage wurde intern fuer Review erfasst."
        : "Wenn Sie ein Feature-Request-Ticket wollen, antworten Sie mit: \"Ticket erstellen\".";
    return [
      `Diese Funktion ist in dieser Umgebung noch nicht verfuegbar (${requestedTool}).`,
      "Ich breche fail-closed ab und behaupte keinen Erfolg ohne echte Tool-Ausfuehrung.",
      `Grund: ${args.blocked.reason}`,
      `Fehlende Bausteine: ${args.blocked.missing.missingKinds.join(", ")}`,
      `Zusammenfassung: ${missingSummary}`,
      ticketLine,
      "Naechste Schritte:",
      ...unblockingSteps,
    ].join("\n");
  }

  const ticketLine = args.linearIssue
    ? formatCapabilityGapLinearIssueLine({
        language,
        linearIssue: args.linearIssue,
      })
    : args.ticketRequestIntent
      ? args.backlogInsertStatus === "updated"
        ? "Your request was already captured and attached to the existing foundry review backlog."
        : "I couldn't create a Linear ticket in this turn, but the request was captured internally for review."
      : "If you want a feature request ticket opened, reply with: \"create request\".";

  const lines = [
    `This capability is not available yet in the current runtime scope (${requestedTool}).`,
    "I am fail-closed here and won't claim completion without real tool execution.",
    `Reason code: ${args.blocked.reasonCode}`,
    `Reason: ${args.blocked.reason}`,
    `Missing: ${args.blocked.missing.missingKinds.join(", ")}`,
    `Missing summary: ${missingSummary}`,
    ticketLine,
    "Unblocking steps:",
    ...unblockingSteps,
  ];

  return lines.join("\n");
}

export interface InboundRuntimeContracts {
  queueContract: TurnQueueContract;
  idempotencyContract: RuntimeIdempotencyContract;
}

export interface RequiredScopeToolManifestContract {
  contractVersion: "aoh_required_scope_tool_manifest_v1";
  manifestHash: string;
  finalToolNames: string[];
  agentToolResolution: {
    contractVersion: typeof AGENT_TOOL_SCOPE_RESOLUTION_CONTRACT_VERSION;
    source: AgentToolScopeResolutionContract["source"];
    moduleKey: string | null;
    agentProfile: string | null;
    enabledTools: string[];
    disabledTools: string[];
    manifestRequiredTools: string[];
    manifestOptionalTools: string[];
    manifestDeniedTools: string[];
  };
  removedByLayer: {
    platform: string[];
    orgAllow: string[];
    orgDeny: string[];
    integration: string[];
    agentProfile: string[];
    agentEnable: string[];
    agentDisable: string[];
    autonomy: string[];
    session: string[];
    channel: string[];
  };
}

export interface ProcessInboundMessageResult {
  status: string;
  message?: string;
  response?: string;
  sessionId?: Id<"agentSessions">;
  turnId?: Id<"agentTurns">;
  qaDiagnostics?: ActionCompletionQaDiagnostics;
  requiredScopeContract?: RequiredSpecialistScopeContract;
  requiredScopeGap?: RequiredSpecialistScopeGap;
  requiredScopeManifest?: RequiredScopeToolManifestContract;
  requiredScopeFallback?: RequiredScopeFallbackDelegationContract;
  [key: string]: unknown;
}

type ComplianceShadowModeSurface =
  | "finder"
  | "layers"
  | "ai_chat"
  | "compliance_center"
  | "unknown";
type ComplianceShadowModeEvaluationStatus = "disabled" | "skipped" | "evaluated";

interface ComplianceShadowModeEvaluationResult {
  contractVersion: string;
  evaluatedAt: number;
  surface: ComplianceShadowModeSurface;
  nonComplianceSurface: boolean;
  evaluatorEnabled: boolean;
  surfaceEnabled: boolean;
  strictEnforcementEnabled: boolean;
  evaluationStatus: ComplianceShadowModeEvaluationStatus;
  wouldBlock: boolean;
  effectiveGateStatus: "GO" | "NO_GO";
  blockerCount: number;
  blockerIds: string[];
  reasonCode: string;
}

interface InboundSuperAdminQaModeContract {
  enabled: boolean;
  targetAgentId?: Id<"objects">;
  targetTemplateRole?: string;
  runId?: string;
}

function resolveInboundSuperAdminQaModeContract(
  metadata: Record<string, unknown>
): InboundSuperAdminQaModeContract | null {
  const qaRaw = metadata.qaMode;
  if (!qaRaw || typeof qaRaw !== "object" || Array.isArray(qaRaw)) {
    return null;
  }
  const qa = qaRaw as Record<string, unknown>;
  if (qa.enabled !== true) {
    return null;
  }
  const targetAgentId = firstInboundString(qa.targetAgentId) as Id<"objects"> | undefined;
  const targetTemplateRole = firstInboundString(qa.targetTemplateRole);
  const runId = firstInboundString(qa.runId, qa.qaRunId);
  return {
    enabled: true,
    targetAgentId,
    targetTemplateRole,
    runId,
  };
}

export function buildDeniedTurnAdmissionPayload(args: {
  channel: AdmissionIngressChannel;
  stage: AdmissionDecisionStage;
  reasonCode: AdmissionDenialReasonCode;
  reason?: string;
  httpStatusHint?: number;
  userSafeMessage?: string;
  deniedAtMs?: number;
  manifestHash?: string;
  idempotencyContract?: RuntimeIdempotencyContract | null;
  metadata?: Record<string, string | number | boolean | null>;
}): AdmissionDenialV1 {
  return buildAdmissionDenial({
    channel: args.channel,
    stage: args.stage,
    reasonCode: args.reasonCode,
    reason: args.reason,
    httpStatusHint: args.httpStatusHint,
    userSafeMessage: args.userSafeMessage,
    deniedAtMs: args.deniedAtMs,
    manifestHash: args.manifestHash,
    idempotency: args.idempotencyContract
      ? {
          scopeKey: args.idempotencyContract.scopeKey,
          payloadHash: args.idempotencyContract.payloadHash,
          classification: args.idempotencyContract.intentType,
        }
      : undefined,
    metadata: args.metadata,
  });
}

function resolveAdmissionDenialChannel(channel: string): AdmissionIngressChannel {
  switch (channel) {
    case "webchat":
    case "native_guest":
    case "slack":
    case "email":
    case "sms":
    case "whatsapp":
    case "api_test":
      return channel;
    default:
      return "unknown";
  }
}

export const REQUIRED_SCOPE_FALLBACK_DELEGATION_CONTRACT_VERSION =
  "aoh_required_scope_fallback_delegation_v1" as const;

export type RequiredScopeFallbackReasonCode =
  | "fallback_delegated"
  | "fallback_prerequisites_missing"
  | "fallback_no_specialist_candidate"
  | "fallback_selection_blocked"
  | "fallback_handoff_blocked";

export interface RequiredScopeFallbackDelegationContract {
  contractVersion: typeof REQUIRED_SCOPE_FALLBACK_DELEGATION_CONTRACT_VERSION;
  attempted: boolean;
  outcome: "delegated" | "blocked";
  reasonCode: RequiredScopeFallbackReasonCode;
  reason: string;
  requiredScopeManifestHash: string;
  requestedSpecialistType?: string;
  selectedSpecialistId?: string;
  selectedSpecialistSubtype?: string;
  selectedSpecialistName?: string;
  teamAccessMode?: "invisible" | "direct" | "meeting";
  handoffNumber?: number;
  message?: string;
}

interface RequiredScopeFallbackSpecialistTypeSelection {
  selectedSpecialistType?: string;
  reasonCode?: RequiredScopeFallbackReasonCode;
  reason?: string;
}

interface RequiredScopeFallbackSpecialistSelectionInput {
  requiredScopeContract: RequiredSpecialistScopeContract;
  requiredScopeGap: RequiredSpecialistScopeGap;
  dreamTeamSpecialists: Array<{
    specialistSubtype?: string;
  }>;
  activeAgents: Array<{
    _id: string;
    subtype?: string;
  }>;
  authorityAgentId: string;
}

function normalizeOptionalLowercaseToken(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function buildRequiredScopeFallbackSummary(gap: RequiredSpecialistScopeGap): string {
  const lines: string[] = [];
  if (gap.missingTools.length > 0) {
    lines.push(`Missing tools: ${gap.missingTools.join(", ")}`);
  }
  if (gap.missingCapabilities.length > 0) {
    lines.push(`Missing capabilities: ${gap.missingCapabilities.join(", ")}`);
  }
  if (lines.length === 0) {
    lines.push(`Missing required scope contract fields (${gap.reasonCode}).`);
  }
  return lines.join(" | ");
}

function buildRequiredScopeFallbackMessage(args: {
  specialistName: string;
  teamAccessMode: string;
}): string {
  if (args.teamAccessMode === "invisible") {
    return `${args.specialistName} is advising in invisible mode. Continue in primary-agent voice and synthesize their guidance.`;
  }
  if (args.teamAccessMode === "meeting") {
    return `${args.specialistName} joined the meeting context. Keep the primary agent visible while incorporating specialist input.`;
  }
  return `${args.specialistName} has been tagged in and will respond next. They have the conversation context.`;
}

export function selectRequiredScopeFallbackSpecialistType(
  input: RequiredScopeFallbackSpecialistSelectionInput
): RequiredScopeFallbackSpecialistTypeSelection {
  const missingToolNames = new Set(
    [
      ...input.requiredScopeGap.missingTools,
      ...input.requiredScopeGap.missingCapabilities
        .filter((capability) => capability.startsWith("tool:"))
        .map((capability) => capability.slice("tool:".length)),
    ]
      .map((toolName) => normalizeOptionalLowercaseToken(toolName))
      .filter((toolName): toolName is string => Boolean(toolName))
  );
  if (missingToolNames.size === 0) {
    return {
      reasonCode: "fallback_no_specialist_candidate",
      reason: "No missing tool contract entries available for specialist fallback routing.",
    };
  }

  const capabilityHintSubtypes = input.requiredScopeContract.requiredCapabilities
    .map((capability) => {
      const normalized = normalizeOptionalLowercaseToken(capability);
      if (!normalized) {
        return undefined;
      }
      if (normalized.startsWith("specialist:")) {
        return normalizeOptionalLowercaseToken(
          normalized.slice("specialist:".length)
        );
      }
      if (normalized.startsWith("subtype:")) {
        return normalizeOptionalLowercaseToken(
          normalized.slice("subtype:".length)
        );
      }
      return undefined;
    })
    .filter((subtype): subtype is string => Boolean(subtype));
  const dreamTeamSubtypes = input.dreamTeamSpecialists
    .map((contract) => normalizeOptionalLowercaseToken(contract.specialistSubtype))
    .filter((subtype): subtype is string => Boolean(subtype));
  const activeAgentSubtypes = input.activeAgents
    .filter((agent) => String(agent._id) !== input.authorityAgentId)
    .map((agent) => normalizeOptionalLowercaseToken(agent.subtype))
    .filter((subtype): subtype is string => Boolean(subtype));
  const candidateSubtypes = Array.from(
    new Set([
      ...capabilityHintSubtypes,
      ...dreamTeamSubtypes,
      ...activeAgentSubtypes,
    ])
  ).sort((left, right) => left.localeCompare(right));

  if (candidateSubtypes.length === 0) {
    return {
      reasonCode: "fallback_no_specialist_candidate",
      reason: "No deterministic specialist subtype candidates available for required scope fallback.",
    };
  }

  const scoredCandidates = candidateSubtypes
    .map((subtype) => {
      const profileId = SUBTYPE_DEFAULT_PROFILES[subtype] ?? subtype;
      const profileTools = TOOL_PROFILES[profileId];
      if (!Array.isArray(profileTools)) {
        return {
          subtype,
          coverage: 0,
        };
      }
      const coverage = profileTools.includes("*")
        ? missingToolNames.size
        : profileTools
            .filter((toolName) => missingToolNames.has(toolName))
            .length;
      return {
        subtype,
        coverage,
      };
    })
    .filter((candidate) => candidate.coverage > 0)
    .sort((left, right) => {
      if (left.coverage !== right.coverage) {
        return right.coverage - left.coverage;
      }
      return left.subtype.localeCompare(right.subtype);
    });

  if (scoredCandidates.length === 0) {
    return {
      reasonCode: "fallback_no_specialist_candidate",
      reason: "No subtype profile provides deterministic coverage for missing required scope tools.",
    };
  }

  return {
    selectedSpecialistType: scoredCandidates[0]?.subtype,
  };
}

async function attemptRequiredScopeDelegationFallback(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    sessionId: Id<"agentSessions">;
    authorityAgentId: Id<"objects">;
    requiredScopeContract: RequiredSpecialistScopeContract;
    requiredScopeGap: RequiredSpecialistScopeGap;
    requiredScopeManifest: RequiredScopeToolManifestContract;
  }
): Promise<RequiredScopeFallbackDelegationContract> {
  const [allAgents, authorityAgent, organization] = await Promise.all([
    ctx.runQuery(getInternal().agentOntology.getAllActiveAgentsForOrg, {
      organizationId: args.organizationId,
    }),
    ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
      agentId: args.authorityAgentId,
    }),
    ctx.runQuery(getInternal().organizations.getOrganization, {
      organizationId: args.organizationId,
    }),
  ]);

  if (!authorityAgent || authorityAgent.type !== "org_agent") {
    return {
      contractVersion: REQUIRED_SCOPE_FALLBACK_DELEGATION_CONTRACT_VERSION,
      attempted: true,
      outcome: "blocked",
      reasonCode: "fallback_prerequisites_missing",
      reason: "Primary authority agent is unavailable for required-scope fallback delegation.",
      requiredScopeManifestHash: args.requiredScopeManifest.manifestHash,
    };
  }

  const workspaceType: DreamTeamWorkspaceType =
    organization?.isPersonalWorkspace === true ? "personal" : "business";
  const authorityProps =
    authorityAgent.customProperties as Record<string, unknown> | undefined;
  const dreamTeamSpecialists = normalizeDreamTeamSpecialistContracts(
    authorityProps?.dreamTeamSpecialists
  );
  const scopedDreamTeamSpecialists = dreamTeamSpecialists.filter((contract) =>
    isDreamTeamSpecialistContractInWorkspaceScope({ contract, workspaceType })
  );
  const specialistTypeDecision = selectRequiredScopeFallbackSpecialistType({
    requiredScopeContract: args.requiredScopeContract,
    requiredScopeGap: args.requiredScopeGap,
    dreamTeamSpecialists: scopedDreamTeamSpecialists,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeAgents: (allAgents as any[]).map((agent) => ({
      _id: String(agent._id),
      subtype: typeof agent.subtype === "string" ? agent.subtype : undefined,
    })),
    authorityAgentId: String(args.authorityAgentId),
  });
  if (!specialistTypeDecision.selectedSpecialistType) {
    return {
      contractVersion: REQUIRED_SCOPE_FALLBACK_DELEGATION_CONTRACT_VERSION,
      attempted: true,
      outcome: "blocked",
      reasonCode: specialistTypeDecision.reasonCode ?? "fallback_no_specialist_candidate",
      reason:
        specialistTypeDecision.reason
        || "No deterministic specialist fallback subtype candidate was available.",
      requiredScopeManifestHash: args.requiredScopeManifest.manifestHash,
    };
  }

  const selection = resolveTeamSpecialistSelection({
    requestedSpecialistType: specialistTypeDecision.selectedSpecialistType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeAgents: allAgents as any[],
    authorityAgentId: String(args.authorityAgentId),
    dreamTeamSpecialists,
    workspaceType,
  });
  if (!selection.targetAgent || !selection.provenance) {
    return {
      contractVersion: REQUIRED_SCOPE_FALLBACK_DELEGATION_CONTRACT_VERSION,
      attempted: true,
      outcome: "blocked",
      reasonCode: "fallback_selection_blocked",
      reason:
        selection.error
        || "Specialist fallback selection failed policy and deterministic routing checks.",
      requiredScopeManifestHash: args.requiredScopeManifest.manifestHash,
      requestedSpecialistType: specialistTypeDecision.selectedSpecialistType,
    };
  }

  const handoffResult = await ctx.runMutation(
    getInternal().ai.teamHarness.executeTeamHandoff,
    {
      sessionId: args.sessionId,
      fromAgentId: args.authorityAgentId,
      toAgentId: selection.targetAgent._id,
      organizationId: args.organizationId,
      handoff: {
        reason: `Required scope contract gap (${args.requiredScopeGap.reasonCode}).`,
        summary: buildRequiredScopeFallbackSummary(args.requiredScopeGap),
        goal:
          "Route execution to an in-scope specialist while keeping primary orchestrator authority anchored.",
      },
      handoffProvenance: selection.provenance,
    }
  ) as {
    error?: string;
    targetAgentName?: string;
    teamAccessMode?: "invisible" | "direct" | "meeting";
    handoffNumber?: number;
    authorityAgentId?: string;
  };

  if (handoffResult?.error) {
    return {
      contractVersion: REQUIRED_SCOPE_FALLBACK_DELEGATION_CONTRACT_VERSION,
      attempted: true,
      outcome: "blocked",
      reasonCode: "fallback_handoff_blocked",
      reason: handoffResult.error,
      requiredScopeManifestHash: args.requiredScopeManifest.manifestHash,
      requestedSpecialistType: specialistTypeDecision.selectedSpecialistType,
      selectedSpecialistId: String(selection.targetAgent._id),
      selectedSpecialistSubtype:
        typeof selection.targetAgent.subtype === "string"
          ? selection.targetAgent.subtype
          : specialistTypeDecision.selectedSpecialistType,
    };
  }

  const specialistName =
    handoffResult?.targetAgentName || specialistTypeDecision.selectedSpecialistType;
  const teamAccessMode = handoffResult?.teamAccessMode ?? "invisible";
  return {
    contractVersion: REQUIRED_SCOPE_FALLBACK_DELEGATION_CONTRACT_VERSION,
    attempted: true,
    outcome: "delegated",
    reasonCode: "fallback_delegated",
    reason: "Required-scope fallback delegation completed through Dream Team handoff.",
    requiredScopeManifestHash: args.requiredScopeManifest.manifestHash,
    requestedSpecialistType: specialistTypeDecision.selectedSpecialistType,
    selectedSpecialistId: String(selection.targetAgent._id),
    selectedSpecialistSubtype:
      typeof selection.targetAgent.subtype === "string"
        ? selection.targetAgent.subtype
        : specialistTypeDecision.selectedSpecialistType,
    selectedSpecialistName: specialistName,
    teamAccessMode,
    handoffNumber:
      typeof handoffResult?.handoffNumber === "number"
        ? handoffResult.handoffNumber
        : undefined,
    message: buildRequiredScopeFallbackMessage({
      specialistName,
      teamAccessMode,
    }),
  };
}

function computeDeterministicScopeManifestHash(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildRequiredScopeToolManifestContract(args: {
  finalToolNames: string[];
  agentToolResolution?: {
    contractVersion?: typeof AGENT_TOOL_SCOPE_RESOLUTION_CONTRACT_VERSION;
    source?: AgentToolScopeResolutionContract["source"];
    moduleKey?: string | null;
    agentProfile?: string | null;
    enabledTools?: string[];
    disabledTools?: string[];
    manifestRequiredTools?: string[];
    manifestOptionalTools?: string[];
    manifestDeniedTools?: string[];
  };
  removedByLayer: {
    platform: string[];
    orgAllow: string[];
    orgDeny: string[];
    integration: string[];
    agentProfile: string[];
    agentEnable: string[];
    agentDisable: string[];
    autonomy: string[];
    session: string[];
    channel: string[];
  };
}): RequiredScopeToolManifestContract {
  const agentToolResolution = {
    contractVersion: AGENT_TOOL_SCOPE_RESOLUTION_CONTRACT_VERSION,
    source:
      args.agentToolResolution?.source
      ?? ("legacy_profile_fallback" as AgentToolScopeResolutionContract["source"]),
    moduleKey:
      typeof args.agentToolResolution?.moduleKey === "string"
      && args.agentToolResolution.moduleKey.trim().length > 0
        ? args.agentToolResolution.moduleKey.trim()
        : null,
    agentProfile:
      typeof args.agentToolResolution?.agentProfile === "string"
      && args.agentToolResolution.agentProfile.trim().length > 0
        ? args.agentToolResolution.agentProfile.trim()
        : null,
    enabledTools: normalizeDeterministicRuntimeStringArray(
      args.agentToolResolution?.enabledTools,
    ),
    disabledTools: normalizeDeterministicRuntimeStringArray(
      args.agentToolResolution?.disabledTools,
    ),
    manifestRequiredTools: normalizeDeterministicRuntimeStringArray(
      args.agentToolResolution?.manifestRequiredTools,
    ),
    manifestOptionalTools: normalizeDeterministicRuntimeStringArray(
      args.agentToolResolution?.manifestOptionalTools,
    ),
    manifestDeniedTools: normalizeDeterministicRuntimeStringArray(
      args.agentToolResolution?.manifestDeniedTools,
    ),
  };
  const manifest = {
    contractVersion: "aoh_required_scope_tool_manifest_v1" as const,
    finalToolNames: [...args.finalToolNames].sort((left, right) => left.localeCompare(right)),
    agentToolResolution,
    removedByLayer: {
      platform: [...args.removedByLayer.platform].sort((left, right) => left.localeCompare(right)),
      orgAllow: [...args.removedByLayer.orgAllow].sort((left, right) => left.localeCompare(right)),
      orgDeny: [...args.removedByLayer.orgDeny].sort((left, right) => left.localeCompare(right)),
      integration: [...args.removedByLayer.integration].sort((left, right) => left.localeCompare(right)),
      agentProfile: [...args.removedByLayer.agentProfile].sort((left, right) => left.localeCompare(right)),
      agentEnable: [...args.removedByLayer.agentEnable].sort((left, right) => left.localeCompare(right)),
      agentDisable: [...args.removedByLayer.agentDisable].sort((left, right) => left.localeCompare(right)),
      autonomy: [...args.removedByLayer.autonomy].sort((left, right) => left.localeCompare(right)),
      session: [...args.removedByLayer.session].sort((left, right) => left.localeCompare(right)),
      channel: [...args.removedByLayer.channel].sort((left, right) => left.localeCompare(right)),
    },
    manifestHash: "",
  };

  const manifestHash = computeDeterministicScopeManifestHash(
    JSON.stringify({
      finalToolNames: manifest.finalToolNames,
      agentToolResolution: manifest.agentToolResolution,
      removedByLayer: manifest.removedByLayer,
    })
  );

  return {
    ...manifest,
    manifestHash,
  };
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

function normalizeRuntimeContactMemorySkipReason(
  value: unknown
): "no_eligible_sources" | null {
  const normalized = normalizeRuntimeNonEmptyString(value);
  return normalized === "no_eligible_sources" ? normalized : null;
}

interface RuntimeMemoryRefreshMutationResult {
  success?: boolean;
  reason?: string;
  error?: string;
}

interface RuntimeContactMemoryRefreshMutationResult
  extends RuntimeMemoryRefreshMutationResult {
  skippedReason?: string;
  extractedCandidateCount?: number;
  eligibleCandidateCount?: number;
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
    status: "success" | "skipped" | "blocked";
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
  const legacyNoSourceSkip =
    args.contactMemoryRefresh?.success !== true
    && normalizeRuntimeNonEmptyString(args.contactMemoryRefresh?.reason) === "no_eligible_sources";
  const contactSkipReason =
    normalizeRuntimeContactMemorySkipReason(args.contactMemoryRefresh?.skippedReason)
    ?? (legacyNoSourceSkip ? "no_eligible_sources" : null);
  const contactStatus = contactSkipReason
    ? "skipped"
    : (args.contactMemoryRefresh?.success === true ? "success" : "blocked");

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
      reason: contactSkipReason
        ?? normalizeRuntimeNonEmptyString(args.contactMemoryRefresh?.reason)
        ?? undefined,
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
export const CATALOG_CLONE_ENTITLEMENT_BLOCKED_MESSAGE =
  "Clone activation is blocked until licensing/package entitlement requirements are satisfied.";

export const recordStoreActivationEntitlementDecision = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    actorUserId: v.id("users"),
    templateAgentId: v.id("objects"),
    catalogAgentNumber: v.number(),
    decision: v.union(v.literal("allow"), v.literal("deny")),
    reasonCode: v.string(),
    guidance: v.string(),
    packageAccess: v.union(
      v.literal("included_in_plan"),
      v.literal("add_on_purchase"),
      v.literal("enterprise_concierge"),
    ),
    licenseModel: v.union(
      v.literal("included"),
      v.literal("seat"),
      v.literal("usage"),
      v.literal("custom_contract"),
    ),
    activationHint: v.union(
      v.literal("activate_now"),
      v.literal("purchase_required"),
      v.literal("sales_contact_required"),
    ),
    packageCode: v.optional(v.string()),
    licenseSku: v.optional(v.string()),
    matchedEntitlementKeys: v.array(v.string()),
    planTier: v.string(),
    capabilityBlockedCount: v.number(),
    allowClone: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.templateAgentId,
      actionType: "agent_store_activation_entitlement_evaluated",
      actionData: {
        contractVersion: "ath_store_entitlement_activation_v1",
        catalogAgentNumber: args.catalogAgentNumber,
        decision: args.decision,
        reasonCode: args.reasonCode,
        guidance: args.guidance,
        packageAccess: args.packageAccess,
        licenseModel: args.licenseModel,
        activationHint: args.activationHint,
        packageCode: args.packageCode,
        licenseSku: args.licenseSku,
        matchedEntitlementKeys: [...args.matchedEntitlementKeys].sort((a, b) =>
          a.localeCompare(b),
        ),
        planTier: args.planTier,
        capabilityBlockedCount: args.capabilityBlockedCount,
        allowClone: args.allowClone,
      },
      performedBy: args.actorUserId,
      performedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      userId: args.actorUserId,
      action: "agent_store_activation_entitlement_evaluated",
      resource: "org_agent_template",
      resourceId: String(args.templateAgentId),
      success: args.decision === "allow",
      metadata: {
        contractVersion: "ath_store_entitlement_activation_v1",
        catalogAgentNumber: args.catalogAgentNumber,
        decision: args.decision,
        reasonCode: args.reasonCode,
        guidance: args.guidance,
        packageAccess: args.packageAccess,
        licenseModel: args.licenseModel,
        activationHint: args.activationHint,
        packageCode: args.packageCode,
        licenseSku: args.licenseSku,
        matchedEntitlementKeys: [...args.matchedEntitlementKeys].sort((a, b) =>
          a.localeCompare(b),
        ),
        planTier: args.planTier,
        capabilityBlockedCount: args.capabilityBlockedCount,
        allowClone: args.allowClone,
      },
      createdAt: now,
    });
  },
});

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
        requiredTools: string[];
        requiredCapabilities: string[];
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
        entitlement?: {
          allowed: boolean;
          reasonCode: string;
          guidance: string;
          matchedEntitlementKeys: string[];
          planTier: string;
        };
      }
    | {
        status: "blocked";
        reason:
          | "catalog_template_mismatch"
          | "capability_limits_blocked"
          | "entitlement_blocked";
        message: string;
        reasonCode?: string;
        guidance?: string;
        allowClone: false;
        catalogAgentNumber?: number;
        requiredTools?: string[];
        requiredCapabilities?: string[];
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
        entitlement?: {
          allowed: boolean;
          reasonCode: string;
          guidance: string;
          matchedEntitlementKeys: string[];
          planTier: string;
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
    if (catalogAgentNumber === undefined) {
      return {
        status: "blocked",
        reason: "catalog_template_mismatch",
        message:
          "Catalog clone preflight requires a valid catalogAgentNumber. Owner-facing clone spawning is catalog-bound.",
        allowClone: false,
      };
    }
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
          card: {
            storefrontPackageDescriptor: {
              packageAccess: "included_in_plan" | "add_on_purchase" | "enterprise_concierge";
              licenseModel: "included" | "seat" | "usage" | "custom_contract";
              activationHint: "activate_now" | "purchase_required" | "sales_contact_required";
              packageCode?: string;
              licenseSku?: string;
            };
          };
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
          entitlement: {
            allowed: boolean;
            reasonCode: string;
            guidance: string;
            matchedEntitlementKeys: string[];
            planTier: string;
          };
          requiredTools: string[];
          requiredCapabilities: string[];
          noFitEscalation: {
            minimum: string;
            deposit: string;
            onboarding: string;
          };
        }
      : null;

    const logEntitlementDecision = async (decision: "allow" | "deny") => {
      if (!preflight) {
        return;
      }
      await ctx.runMutation(
        getInternal().ai.agentExecution.recordStoreActivationEntitlementDecision,
        {
          organizationId: args.organizationId,
          actorUserId: auth.userId,
          templateAgentId: args.templateAgentId,
          catalogAgentNumber: preflight.catalogAgentNumber,
          decision,
          reasonCode: preflight.entitlement.reasonCode,
          guidance: preflight.entitlement.guidance,
          packageAccess: preflight.card.storefrontPackageDescriptor.packageAccess,
          licenseModel: preflight.card.storefrontPackageDescriptor.licenseModel,
          activationHint: preflight.card.storefrontPackageDescriptor.activationHint,
          packageCode: preflight.card.storefrontPackageDescriptor.packageCode,
          licenseSku: preflight.card.storefrontPackageDescriptor.licenseSku,
          matchedEntitlementKeys: preflight.entitlement.matchedEntitlementKeys,
          planTier: preflight.entitlement.planTier,
          capabilityBlockedCount: preflight.capabilitySnapshot.blocked.length,
          allowClone: preflight.allowClone,
        },
      );
    };

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
          requiredTools: preflight.requiredTools,
          requiredCapabilities: preflight.requiredCapabilities,
          capabilitySnapshot: preflight.capabilitySnapshot,
          noFitEscalation: preflight.noFitEscalation,
          entitlement: preflight.entitlement,
        };
      }
    }

    if (!preflight?.entitlement || !preflight.entitlement.allowed) {
      if (preflight) {
        await logEntitlementDecision("deny");
      }
      return {
        status: "blocked",
        reason: "entitlement_blocked",
        reasonCode: preflight?.entitlement?.reasonCode ?? "blocked_entitlement_uncertain",
        guidance:
          preflight?.entitlement?.guidance
          ?? "Activation is blocked because entitlement status is uncertain.",
        message: CATALOG_CLONE_ENTITLEMENT_BLOCKED_MESSAGE,
        allowClone: false,
        catalogAgentNumber: preflight?.catalogAgentNumber,
        requiredTools: preflight?.requiredTools,
        requiredCapabilities: preflight?.requiredCapabilities,
        capabilitySnapshot: preflight?.capabilitySnapshot,
        noFitEscalation: preflight?.noFitEscalation,
        entitlement: preflight?.entitlement,
      };
    }

    if (preflight && !preflight.allowClone) {
      await logEntitlementDecision("deny");
      return {
        status: "blocked",
        reason: "capability_limits_blocked",
        reasonCode: preflight.entitlement.reasonCode,
        guidance: preflight.entitlement.guidance,
        message: CATALOG_CLONE_CAPABILITY_LIMITS_BLOCKED_MESSAGE,
        allowClone: false,
        catalogAgentNumber: preflight.catalogAgentNumber,
        requiredTools: preflight.requiredTools,
        requiredCapabilities: preflight.requiredCapabilities,
        capabilitySnapshot: preflight.capabilitySnapshot,
        noFitEscalation: preflight.noFitEscalation,
        entitlement: preflight.entitlement,
      };
    }

    await logEntitlementDecision("allow");

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
        requiredTools: preflight?.requiredTools ?? [],
        requiredCapabilities: preflight?.requiredCapabilities ?? [],
        contractSourceCatalogAgentNumber: preflight?.catalogAgentNumber,
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
      requiredTools: preflight?.requiredTools ?? [],
      requiredCapabilities: preflight?.requiredCapabilities ?? [],
      catalogAgentNumber: preflight?.catalogAgentNumber,
      allowClone: preflight?.allowClone ?? true,
      capabilitySnapshot: preflight?.capabilitySnapshot,
      noFitEscalation: preflight?.noFitEscalation,
      entitlement: preflight?.entitlement,
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

const KNOWLEDGE_CONTEXT_DEFAULT_CONFIDENCE_SCORE = 0.58;
const KNOWLEDGE_EVIDENCE_LINK_CONTRACT_VERSION = "aoh_knowledge_evidence_link_v1";

function clampKnowledgeContextConfidenceScore(
  value: unknown,
  fallback = KNOWLEDGE_CONTEXT_DEFAULT_CONFIDENCE_SCORE,
): number {
  const numeric = typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
  return Math.max(0, Math.min(1, numeric));
}

function resolveKnowledgeContextConfidenceBand(
  value: unknown,
  score: number,
): KnowledgeContextConfidenceBand {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  if (score >= 0.75) {
    return "high";
  }
  if (score >= 0.5) {
    return "medium";
  }
  return "low";
}

function resolveKnowledgeContextSourceKind(
  value: unknown,
): "organization_knowledge_chunk" | "layercake_document" | "knowledge_item_bridge" {
  if (
    value === "organization_knowledge_chunk"
    || value === "layercake_document"
    || value === "knowledge_item_bridge"
  ) {
    return value;
  }
  return "layercake_document";
}

function resolveKnowledgeContextRetrievalMethod(
  value: unknown,
  fallback:
    | "semantic_chunk_index"
    | "semantic_lexical"
    | "tag_recency_fallback"
    | "knowledge_base_docs_scan",
): "semantic_chunk_index" | "semantic_lexical" | "tag_recency_fallback" | "knowledge_base_docs_scan" {
  if (
    value === "semantic_chunk_index"
    || value === "semantic_lexical"
    || value === "tag_recency_fallback"
    || value === "knowledge_base_docs_scan"
  ) {
    return value;
  }
  return fallback;
}

function normalizeKnowledgeContextScopeContract(args: {
  rawValue: unknown;
  fallbackOrganizationId: string;
  fallbackSurface: "semantic_chunks" | "knowledge_base_docs";
  fallbackEnforcedBy:
    | "organizationKnowledgeChunks.by_organization"
    | "organizationMedia.by_organization";
}): KnowledgeContextScopeContract {
  const rawRecord =
    args.rawValue && typeof args.rawValue === "object"
      ? args.rawValue as Record<string, unknown>
      : null;

  const rawProjectId =
    rawRecord && typeof rawRecord.projectId === "string" && rawRecord.projectId.trim().length > 0
      ? rawRecord.projectId.trim()
      : undefined;

  const rawScope =
    rawRecord?.scope === "platform" || rawRecord?.scope === "org" || rawRecord?.scope === "project"
      ? rawRecord.scope
      : "org";
  const scope = rawScope === "project" && !rawProjectId ? "org" : rawScope;

  const organizationId =
    rawRecord && typeof rawRecord.organizationId === "string" && rawRecord.organizationId.trim().length > 0
      ? rawRecord.organizationId.trim()
      : args.fallbackOrganizationId;

  const retrievalSurface =
    rawRecord?.retrievalSurface === "semantic_chunks"
    || rawRecord?.retrievalSurface === "knowledge_base_docs"
      ? rawRecord.retrievalSurface
      : args.fallbackSurface;

  const enforcedBy =
    rawRecord?.enforcedBy === "organizationKnowledgeChunks.by_organization"
    || rawRecord?.enforcedBy === "organizationMedia.by_organization"
      ? rawRecord.enforcedBy
      : args.fallbackEnforcedBy;

  const scopeKey =
    rawRecord && typeof rawRecord.scopeKey === "string" && rawRecord.scopeKey.trim().length > 0
      ? rawRecord.scopeKey.trim()
      : scope === "project" && rawProjectId
        ? `project:${rawProjectId}`
        : scope === "platform"
          ? "platform"
          : `org:${organizationId}`;

  return {
    contractVersion: KNOWLEDGE_CONTEXT_SCOPE_CONTRACT_VERSION,
    scope,
    scopeKey,
    organizationId,
    projectId: scope === "project" ? rawProjectId : undefined,
    retrievalSurface,
    enforcedBy,
  };
}

function buildKnowledgeContextProvenanceContract(args: {
  doc: KnowledgeContextDocument;
  fallbackRetrievalMethod:
    | "semantic_chunk_index"
    | "semantic_lexical"
    | "tag_recency_fallback"
    | "knowledge_base_docs_scan";
  retrievalSurface: "semantic_chunks" | "knowledge_base_docs";
  now: number;
}): KnowledgeContextProvenanceContract {
  const rawRecord =
    args.doc.knowledgeContextProvenance
      ? args.doc.knowledgeContextProvenance as unknown as Record<string, unknown>
      : null;

  const sourceKind = resolveKnowledgeContextSourceKind(
    rawRecord?.sourceKind ?? args.doc.source
  );
  const sourceId =
    (typeof rawRecord?.sourceId === "string" && rawRecord.sourceId.trim().length > 0
      ? rawRecord.sourceId.trim()
      : undefined)
    || (typeof args.doc.chunkId === "string" && args.doc.chunkId.trim().length > 0
      ? args.doc.chunkId
      : undefined)
    || (typeof args.doc.mediaId === "string" && args.doc.mediaId.trim().length > 0
      ? args.doc.mediaId
      : undefined)
    || args.doc.filename;

  const sourceMediaId =
    (typeof rawRecord?.sourceMediaId === "string" && rawRecord.sourceMediaId.trim().length > 0
      ? rawRecord.sourceMediaId.trim()
      : undefined)
    || (typeof args.doc.mediaId === "string" && args.doc.mediaId.trim().length > 0
      ? args.doc.mediaId
      : undefined);

  const sourceUpdatedAt =
    typeof rawRecord?.sourceUpdatedAt === "number"
      ? rawRecord.sourceUpdatedAt
      : typeof args.doc.updatedAt === "number"
        ? args.doc.updatedAt
        : args.now;

  const retrievalMethod = resolveKnowledgeContextRetrievalMethod(
    rawRecord?.retrievalMethod ?? args.doc.retrievalMethod,
    args.fallbackRetrievalMethod,
  );

  return {
    contractVersion: KNOWLEDGE_CONTEXT_PROVENANCE_CONTRACT_VERSION,
    sourceKind,
    sourceId,
    sourceMediaId,
    sourceUpdatedAt,
    retrievalMethod,
    retrievalSurface: args.retrievalSurface,
    indexVersion:
      typeof rawRecord?.indexVersion === "number"
        ? rawRecord.indexVersion
        : undefined,
    indexedAt:
      typeof rawRecord?.indexedAt === "number"
        ? rawRecord.indexedAt
        : undefined,
  };
}

function buildKnowledgeContextConfidenceContract(args: {
  doc: KnowledgeContextDocument;
}): KnowledgeContextConfidenceContract {
  const rawRecord =
    args.doc.knowledgeContextConfidence
      ? args.doc.knowledgeContextConfidence as unknown as Record<string, unknown>
      : null;

  const score = clampKnowledgeContextConfidenceScore(
    rawRecord?.score ?? args.doc.confidence ?? args.doc.semanticScore,
  );
  const band = resolveKnowledgeContextConfidenceBand(
    rawRecord?.band ?? args.doc.confidenceBand,
    score,
  );
  const semanticScoreRaw =
    typeof rawRecord?.semanticScore === "number"
      ? rawRecord.semanticScore
      : args.doc.semanticScore;
  const semanticScore =
    typeof semanticScoreRaw === "number"
      ? Number(clampKnowledgeContextConfidenceScore(semanticScoreRaw, score).toFixed(4))
      : undefined;

  const matchedTokens = Array.isArray(rawRecord?.matchedTokens)
    ? rawRecord.matchedTokens
        .filter((value): value is string => typeof value === "string")
        .slice(0, 24)
    : Array.isArray(args.doc.matchedTokens)
      ? args.doc.matchedTokens
          .filter((value): value is string => typeof value === "string")
          .slice(0, 24)
      : undefined;

  return {
    contractVersion: KNOWLEDGE_CONTEXT_CONFIDENCE_CONTRACT_VERSION,
    score: Number(score.toFixed(4)),
    band,
    semanticScore,
    matchedTokens,
  };
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
  handler: async (ctx, args): Promise<ProcessInboundMessageResult> => {
    const runtimeGovernorStartedAt = Date.now();
    const inboundMetadata = {
      ...((args.metadata as Record<string, unknown>) || {}),
    };
    const superAdminQaMode = resolveInboundSuperAdminQaModeContract(inboundMetadata);
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
    const shouldEmitSamanthaDispatchConsoleTrace =
      args.channel === "native_guest"
      || args.channel === "webchat"
      || args.channel === "desktop";
    const {
      samanthaDispatchTraceEvents,
      samanthaDispatchRouterSelectionPath,
      recordSamanthaDispatchEvent,
      recordSamanthaRouterSelectionStage,
      setSamanthaDispatchTraceCorrelationId,
      getSamanthaDispatchTraceCorrelationId,
    } = createSamanthaDispatchTraceScaffolding({
      organizationId: String(args.organizationId),
      channel: args.channel,
      shouldEmitConsoleTrace: shouldEmitSamanthaDispatchConsoleTrace,
    });
    const inboundRuntimeKernelHooks = createInboundRuntimeKernelHooks();
    const agentRuntimeHooks = createAgentRuntimeHooks();
    const observedAgentRuntimeHookOrder: AgentRuntimeHookName[] = [];
    const enterRuntimeKernelStage = async (
      stage: InboundRuntimeKernelStage,
      context: {
        sessionId?: Id<"agentSessions">;
        turnId?: Id<"agentTurns">;
        agentId?: Id<"objects">;
        correlationId?: string;
        metadata?: Record<string, unknown>;
      } = {}
    ) => {
      await enterInboundRuntimeKernelStage({
        stage,
        hooks: inboundRuntimeKernelHooks,
        context: {
          organizationId: args.organizationId,
          channel: args.channel,
          externalContactIdentifier: args.externalContactIdentifier,
          ...context,
        },
        onHookError: (hookError) => {
          console.warn("[AgentExecution] Inbound runtime kernel hook failed", {
            stage: hookError.stage,
            hookScope: hookError.hookScope,
            error:
              hookError.error instanceof Error
                ? hookError.error.message
                : String(hookError.error),
          });
        },
      });
    };
    const invokeRuntimeAgentHook = async (
      hookName: AgentRuntimeHookName,
      context: {
        sessionId?: Id<"agentSessions">;
        turnId?: Id<"agentTurns">;
        agentId?: Id<"objects">;
        toolName?: string;
        toolStatus?: AgentToolExecutionStatus;
        metadata?: Record<string, unknown>;
      } = {}
    ) => {
      observedAgentRuntimeHookOrder.push(hookName);
      await invokeAgentRuntimeHook({
        hooks: agentRuntimeHooks,
        hookName,
        payload: {
          organizationId: String(args.organizationId),
          channel: args.channel,
          externalContactIdentifier: args.externalContactIdentifier,
          sessionId:
            context.sessionId !== undefined ? String(context.sessionId) : undefined,
          turnId: context.turnId !== undefined ? String(context.turnId) : undefined,
          agentId: context.agentId !== undefined ? String(context.agentId) : undefined,
          toolName: context.toolName,
          toolStatus: context.toolStatus,
          metadata: context.metadata,
        },
        onHookError: (hookError) => {
          console.warn("[AgentExecution] Agent runtime hook failed", {
            hookName: hookError.hookName,
            error:
              hookError.error instanceof Error
                ? hookError.error.message
                : String(hookError.error),
          });
        },
      });
    };
    const routeSelectorCount = Object.values(inboundDispatchRouteSelectors || {}).filter(
      (value) => typeof value === "string" && value.trim().length > 0
    ).length;
    recordSamanthaDispatchEvent({
      stage: "router_entry",
      status: "pass",
      reasonCode: "router_reached",
      detail: {
        channel: args.channel,
        routeSelectorCount,
      },
    });

    await ctx.runMutation(
      getInternal().ai.settings.ensureOrganizationModelDefaultsInternal,
      {
        organizationId: args.organizationId,
      }
    );
    await enterRuntimeKernelStage("routing");
    await invokeRuntimeAgentHook("preRoute");

    const explicitInboundAgentId = firstInboundString(
      inboundMetadata.agentId,
      inboundMetadata.resolvedAgentId,
      inboundMetadata.publicAgentId
    ) as Id<"objects"> | undefined;

    // 1. Load agent config.
    // For public-channel ingress, honor explicit agentId when present and valid.
    let agent = null;
    if (explicitInboundAgentId) {
      const explicitAgent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
        agentId: explicitInboundAgentId,
      });

      const explicitAgentRecord = explicitAgent as
        | (typeof explicitAgent & {
            deletedAt?: number;
            customProperties?: Record<string, unknown>;
          })
        | null;
      const explicitEligibility = resolveExplicitInboundAgentEligibility({
        explicitAgent: explicitAgentRecord,
        organizationId: args.organizationId,
        channel: args.channel,
      });

      if (explicitEligibility.eligible && explicitAgent) {
        agent = explicitAgent;
        recordSamanthaRouterSelectionStage(
          "router_explicit_agent_id",
          "metadata_agent_id_override",
          agent
        );
      } else {
        recordSamanthaDispatchEvent({
          stage: "router_explicit_agent_id",
          status: "skip",
          reasonCode: "metadata_agent_id_unusable",
          detail: {
            explicitInboundAgentId: String(explicitInboundAgentId),
            exists: Boolean(explicitAgent),
            sameOrg: explicitEligibility.sameOrg,
            crossOrgPlatformMotherAccess: explicitEligibility.crossOrgPlatformMotherAccess,
            classAllowed: explicitEligibility.classAllowed,
            channelSupported: explicitEligibility.channelSupported,
          },
        });
      }
    } else {
      recordSamanthaDispatchEvent({
        stage: "router_explicit_agent_id",
        status: "skip",
        reasonCode: "metadata_agent_id_missing",
      });
    }

    if (!agent) {
      agent = await ctx.runQuery(getInternal().agentOntology.getActiveAgentForOrg, {
        organizationId: args.organizationId,
        channel: args.channel,
        routeSelectors: inboundDispatchRouteSelectors,
      });
      recordSamanthaRouterSelectionStage("router_lookup", "active_agent_lookup", agent);
    }

    if (!agent) {
      // No active agent — check if this org has a template agent (worker pool model).
      // If so, spawn/reuse a worker from the pool.
      const template = await ctx.runQuery(getInternal().agentOntology.getTemplateAgent, {
        organizationId: args.organizationId,
      });
      recordSamanthaDispatchEvent({
        stage: "router_template_fallback_lookup",
        status: template ? "pass" : "skip",
        reasonCode: template ? "template_found" : "template_not_found",
      });

      if (template) {
        const workerId = await ctx.runMutation(getInternal().ai.workerPool.getOnboardingWorker, {
          platformOrgId: args.organizationId,
        });
        agent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
          agentId: workerId,
        });
        recordSamanthaRouterSelectionStage(
          "router_template_worker_resolution",
          "template_worker_fallback",
          agent
        );
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
      recordSamanthaDispatchEvent({
        stage: "router_ensure_active_agent",
        status: ensuredAgent?.agentId ? "pass" : "fail",
        reasonCode: ensuredAgent?.agentId
          ? "ensure_active_agent_resolved"
          : "ensure_active_agent_unresolved",
        detail: ensuredAgent?.agentId
          ? {
              ensuredAgentId: String(ensuredAgent.agentId),
              recoveryAction: (ensuredAgent as { recoveryAction?: string }).recoveryAction || null,
            }
          : undefined,
      });
      if (ensuredAgent?.agentId) {
        agent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
          agentId: ensuredAgent.agentId,
        });
        recordSamanthaRouterSelectionStage(
          "router_ensure_active_agent_lookup",
          "ensure_active_agent_fallback",
          agent
        );
      }
    }

    if (!agent) {
      recordSamanthaDispatchEvent({
        stage: "router_terminal",
        status: "fail",
        reasonCode: "no_active_agent_found",
      });
      return { status: "error", message: "No active agent found for this organization" };
    }
    recordSamanthaRouterSelectionStage("router_final_selection", "active_agent_selected", agent);

    if (superAdminQaMode?.targetAgentId) {
      const qaTargetAgent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
        agentId: superAdminQaMode.targetAgentId,
      });
      if (
        qaTargetAgent
        && String(qaTargetAgent.organizationId) === String(args.organizationId)
        && (qaTargetAgent.type === "org_agent" || qaTargetAgent.type === "agent")
        && !(qaTargetAgent as { deletedAt?: number }).deletedAt
      ) {
        agent = qaTargetAgent;
        recordSamanthaRouterSelectionStage("router_qa_override", "qa_target_agent_override", agent);
      } else {
        recordSamanthaDispatchEvent({
          stage: "router_qa_override",
          status: "skip",
          reasonCode: "qa_target_agent_unusable",
          detail: {
            requestedQaTargetAgentId: String(superAdminQaMode.targetAgentId),
          },
        });
      }
    }

    const selectedAgentProps =
      ((agent as { customProperties?: Record<string, unknown> | null } | null)
        ?.customProperties || {}) as Record<string, unknown>;
    if (!isAgentClassAllowedForInboundChannel({
      channel: args.channel,
      rawAgentClass: selectedAgentProps.agentClass,
    })) {
      recordSamanthaDispatchEvent({
        stage: "router_terminal",
        status: "fail",
        reasonCode: "agent_class_channel_mismatch",
        detail: {
          channel: args.channel,
          resolvedAgentId: String(agent._id),
          resolvedAgentClass: normalizeInboundAgentClass(selectedAgentProps.agentClass),
          expectedAgentClass: resolveExpectedInboundAgentClass(args.channel),
        },
      });
      return {
        status: "error",
        message: "Selected agent class is not allowed for this channel.",
      };
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
    if (superAdminQaMode?.targetTemplateRole) {
      authorityConfig = {
        ...authorityConfig,
      };
      (authorityConfig as unknown as Record<string, unknown>).templateRole =
        superAdminQaMode.targetTemplateRole;
      inboundMetadata.target_specialist_template_role = superAdminQaMode.targetTemplateRole;
      inboundMetadata.targetSpecialistTemplateRole = superAdminQaMode.targetTemplateRole;
    }
    let authorityConfigRecord =
      authorityConfig as unknown as Record<string, unknown>;
    let authorityRuntimeModuleMetadata =
      resolveAgentRuntimeModuleMetadataFromConfig(authorityConfigRecord);
    let runtimeTopologyContract: AgentRuntimeTopologyContract | null = null;
    let runtimeKernelContract: InboundRuntimeKernelContract | null = null;

    // 2. Check rate limits
    const rateLimitCheck = await ctx.runQuery(getInternal().ai.agentSessions.checkAgentRateLimit, {
      agentId: agent._id,
      organizationId: args.organizationId,
      maxMessagesPerDay: config.maxMessagesPerDay || 100,
      maxCostPerDay: config.maxCostPerDay || 5.0,
    });

    if (!rateLimitCheck.allowed) {
      recordSamanthaDispatchEvent({
        stage: "router_terminal",
        status: "skip",
        reasonCode: "rate_limited_before_dispatch",
      });
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
      recordSamanthaDispatchEvent({
        stage: "router_terminal",
        status: "fail",
        reasonCode: "session_resolution_failed",
      });
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
        recordSamanthaRouterSelectionStage(
          "router_session_primary_override",
          "session_primary_agent_override",
          primarySessionAgent
        );
      } else {
        recordSamanthaDispatchEvent({
          stage: "router_session_primary_override",
          status: "skip",
          reasonCode: "session_primary_agent_missing",
          detail: {
            sessionAgentId: String(session.agentId),
          },
        });
      }
    }
    if (superAdminQaMode?.targetTemplateRole) {
      authorityConfig = {
        ...authorityConfig,
      };
      (authorityConfig as unknown as Record<string, unknown>).templateRole =
        superAdminQaMode.targetTemplateRole;
    }
    authorityConfigRecord =
      authorityConfig as unknown as Record<string, unknown>;
    authorityRuntimeModuleMetadata =
      resolveAgentRuntimeModuleMetadataFromConfig(authorityConfigRecord);
    runtimeTopologyContract = resolveAgentRuntimeTopologyContractFromConfig({
      config: authorityConfigRecord,
      runtimeModuleKey: authorityRuntimeModuleMetadata?.key ?? null,
    });
    assertAgentRuntimeTopologyContract(runtimeTopologyContract);
    const runtimeTopologyAdapterSelection =
      resolveInboundRuntimeTopologyAdapterSelection(runtimeTopologyContract.profile);
    runtimeKernelContract = resolveInboundRuntimeKernelContract(
      runtimeTopologyContract.profile,
    );
    assertInboundRuntimeKernelContract(runtimeKernelContract);
    inboundMetadata.runtimeTopologyContract = runtimeTopologyContract;
    inboundMetadata.runtimeTopologyAdapter = runtimeTopologyAdapterSelection;
    inboundMetadata.runtimeKernelContract = runtimeKernelContract;
    recordSamanthaDispatchEvent({
      stage: "runtime_topology_contract",
      status: runtimeTopologyContract.enforcement === "enforced" ? "pass" : "fail",
      reasonCode:
        runtimeTopologyContract.reasonCode
        || (runtimeTopologyContract.enforcement === "enforced"
          ? "topology_profile_enforced"
          : "topology_profile_blocked"),
      detail: {
        profile: runtimeTopologyContract.profile,
        adapter: runtimeTopologyContract.adapter,
        source: runtimeTopologyContract.source,
        kernelContractVersion: runtimeKernelContract.contractVersion,
      },
    });
    if (runtimeTopologyContract.enforcement === "blocked") {
      return {
        status: "error",
        message:
          "Agent runtime topology profile is missing or invalid for this agent (fail-closed).",
      };
    }

    const weekendModeRuntime = resolveWeekendModeRuntimeContract({
      weekendModeRaw: authorityConfig.weekendMode,
      timestamp: Date.now(),
    });

    runtimeGovernorContract = resolveRuntimeGovernorContract({
      agentConfig: authorityConfig as unknown as Record<string, unknown>,
      metadata: inboundMetadata,
    });
    inboundMetadata.runtimeGovernor = runtimeGovernorContract;
    await enterRuntimeKernelStage("ingress", {
      sessionId: session._id,
      agentId: authorityAgent._id,
    });

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
    const requestCorrelationId = firstInboundString(
      inboundMetadata.requestCorrelationId,
      inboundMetadata.correlationId,
      inboundMetadata.traceId,
      inboundMetadata.idempotencyKey,
      inboundIdempotencyKey,
    ) || inboundIdempotencyKey;
    setSamanthaDispatchTraceCorrelationId(requestCorrelationId);
    recordSamanthaDispatchEvent({
      stage: "router_correlation",
      status: "pass",
      reasonCode: "correlation_established",
      detail: {
        correlationId: requestCorrelationId,
      },
    });
    const scheduleRuntimeIncidentAlert = async (payload: {
      incidentType:
        | "claim_tool_unavailable"
        | "runtime_capability_gap_blocked"
        | "delivery_blocked_escalated"
        | "response_loop"
        | "duplicate_ingress_replay";
      turnId?: Id<"agentTurns">;
      proposalKey?: string;
      manifestHash?: string;
      idempotencyScopeKey?: string;
      tool?: string;
      reasonCode: string;
      reason?: string;
      linearIssueId?: string;
      linearIssueUrl?: string;
      metadata?: unknown;
    }) => {
      await ctx.scheduler.runAfter(
        0,
        getInternal().ai.runtimeIncidentAlerts.notifyRuntimeIncident,
        {
          incidentType: payload.incidentType,
          organizationId: args.organizationId,
          sessionId: session._id,
          turnId: payload.turnId,
          proposalKey: payload.proposalKey,
          manifestHash: payload.manifestHash,
          tool: payload.tool,
          reasonCode: payload.reasonCode,
          reason: payload.reason,
          idempotencyKey: inboundIdempotencyKey,
          idempotencyScopeKey:
            payload.idempotencyScopeKey
            || payload.proposalKey
            || runtimeContracts.idempotencyContract.scopeKey,
          payloadHash: runtimeContracts.idempotencyContract.payloadHash,
          admissionReasonCode: payload.reasonCode,
          linearIssueId: payload.linearIssueId,
          linearIssueUrl: payload.linearIssueUrl,
          metadata: payload.metadata,
        },
      );
    };

    if (args.channel === "native_guest") {
      console.info("[NativeGuestReplayTrace] ingress_request", {
        correlationId: requestCorrelationId,
        organizationId: String(args.organizationId),
        sessionId: String(session._id),
        externalContactIdentifier: args.externalContactIdentifier,
        idempotencyKey: inboundIdempotencyKey,
        idempotencyScopeKey: runtimeContracts.idempotencyContract.scopeKey,
        payloadHash: runtimeContracts.idempotencyContract.payloadHash,
        intentType: runtimeContracts.idempotencyContract.intentType,
        workflowKey: runtimeContracts.queueContract.workflowKey,
      });
    }

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
        correlationId: requestCorrelationId,
        runtimeKernelContractVersion:
          runtimeKernelContract?.contractVersion ?? null,
        runtimeTopologyProfile:
          runtimeTopologyContract?.profile ?? null,
        runtimeTopologyAdapter:
          runtimeTopologyContract?.adapter ?? null,
      },
    }) as {
      receiptId?: Id<"agentInboxReceipts">;
      duplicate?: boolean;
      status?: string;
      turnId?: Id<"agentTurns">;
      conflictLabel?: TurnQueueConflictLabel;
      replayOutcome?: string;
      duplicateCount?: number;
      idempotencyScopeKey?: string;
      error?: string;
    } | null;

    if (receiptIngress?.error === "conflict_commit_in_progress") {
      return {
        status: "blocked_sync_checkpoint",
        message: "A commit is already processing for this collaboration lineage.",
        sessionId: session._id,
        admissionDenial: buildDeniedTurnAdmissionPayload({
          channel: resolveAdmissionDenialChannel(args.channel),
          stage: "idempotency",
          reasonCode: "precondition_missing",
          reason: "conflict_commit_in_progress",
          httpStatusHint: 409,
          userSafeMessage:
            "A commit is already processing for this conversation. Please retry shortly.",
          idempotencyContract: runtimeContracts.idempotencyContract,
          metadata: {
            conflictLabel: "conflict_commit_in_progress",
            workflowKey: runtimeContracts.queueContract.workflowKey,
          },
        }),
      };
    }

    const runtimeReceiptId = receiptIngress?.receiptId;
    if (args.channel === "native_guest") {
      console.info("[NativeGuestReplayTrace] ingest_inbound_receipt_result", {
        correlationId: requestCorrelationId,
        receiptId: runtimeReceiptId ? String(runtimeReceiptId) : null,
        duplicate: Boolean(receiptIngress?.duplicate),
        status: receiptIngress?.status,
        turnId: receiptIngress?.turnId ? String(receiptIngress.turnId) : null,
        conflictLabel: receiptIngress?.conflictLabel,
        replayOutcome: receiptIngress?.replayOutcome,
        idempotencyScopeKey: receiptIngress?.idempotencyScopeKey
          || runtimeContracts.idempotencyContract.scopeKey,
        payloadHash: runtimeContracts.idempotencyContract.payloadHash,
        idempotencyKey: inboundIdempotencyKey,
      });
    }
    if (!runtimeReceiptId) {
      return {
        status: "error",
        message: "Failed to ingest inbound receipt",
        sessionId: session._id,
      };
    }

    if (receiptIngress?.duplicate) {
      if (
        typeof receiptIngress.duplicateCount === "number"
        && receiptIngress.duplicateCount >= DUPLICATE_INGRESS_REPLAY_ALERT_THRESHOLD
      ) {
        await scheduleRuntimeIncidentAlert({
          incidentType: "duplicate_ingress_replay",
          turnId: receiptIngress.turnId,
          proposalKey: receiptIngress.idempotencyScopeKey || inboundIdempotencyKey,
          reasonCode: receiptIngress.conflictLabel || "replay_duplicate_ingress",
          reason:
            `Duplicate ingress replay detected (${receiptIngress.duplicateCount} duplicate hit(s))`,
          metadata: {
            duplicateCount: receiptIngress.duplicateCount,
            replayOutcome: receiptIngress.replayOutcome,
          },
        });
      }
      return {
        status: "duplicate_acknowledged",
        message: "Duplicate inbound event acknowledged.",
        sessionId: session._id,
        turnId: receiptIngress.turnId,
        admissionDenial: buildDeniedTurnAdmissionPayload({
          channel: resolveAdmissionDenialChannel(args.channel),
          stage: "idempotency",
          reasonCode: "replay_duplicate",
          reason: "replay_duplicate_ingress",
          httpStatusHint: 409,
          userSafeMessage: "Message received. Continuing from your latest step.",
          idempotencyContract: runtimeContracts.idempotencyContract,
          metadata: {
            conflictLabel: receiptIngress.conflictLabel || "replay_duplicate_ingress",
            replayOutcome: receiptIngress.replayOutcome || "duplicate_acknowledged",
            duplicateCount:
              typeof receiptIngress.duplicateCount === "number"
                ? receiptIngress.duplicateCount
                : null,
          },
        }),
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
      kernelContract: runtimeKernelContract ?? undefined,
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
        recordSamanthaRouterSelectionStage(
          "router_team_session_override",
          "team_session_active_agent_override",
          effectiveAgent
        );
      } else {
        recordSamanthaDispatchEvent({
          stage: "router_team_session_override",
          status: "skip",
          reasonCode: "team_session_active_agent_missing",
          detail: {
            requestedActiveAgentId: String(teamSession.activeAgentId),
          },
        });
      }
    }
    const delegationAuthorityContract = resolveDelegationAuthorityRuntimeContract({
      primaryAgentId: authorityAgent._id,
      primaryAgentSubtype: authorityAgent.subtype ?? undefined,
      primaryConfig: authorityConfig,
      speakerAgentId: agent._id,
    });
    recordSamanthaDispatchEvent({
      stage: "router_authority_resolution",
      status: "pass",
      reasonCode: "authority_contract_resolved",
      detail: {
        primaryAgentId: String(authorityAgent._id),
        speakerAgentId: String(agent._id),
        authorityAgentId: String(delegationAuthorityContract.authorityAgentId),
      },
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
        admissionDenial: buildDeniedTurnAdmissionPayload({
          channel: resolveAdmissionDenialChannel(args.channel),
          stage: "runtime",
          reasonCode: "precondition_missing",
          reason: waitpointGate.error || "hitl_waitpoint_precondition_missing",
          httpStatusHint: 409,
          userSafeMessage:
            "A required coordination checkpoint is still pending. Please retry in a moment.",
          idempotencyContract: runtimeContracts.idempotencyContract,
          metadata: {
            checkpoint: "hitl_waitpoint",
            escalationStatus: escalationStatus || "unknown",
          },
        }),
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
          admissionDenial: buildDeniedTurnAdmissionPayload({
            channel: resolveAdmissionDenialChannel(args.channel),
            stage: "runtime",
            reasonCode: "precondition_missing",
            reason: syncGate?.error || "collaboration_sync_checkpoint_missing",
            httpStatusHint: 409,
            userSafeMessage:
              "A collaboration sync checkpoint is required before this commit can continue.",
            idempotencyContract: runtimeContracts.idempotencyContract,
            metadata: {
              checkpoint: "collaboration_sync",
              intentType: inboundCommitIntent || "commit",
            },
          }),
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

    if (
      isFirstInboundMessage &&
      weekendModeRuntime.enabled &&
      weekendModeRuntime.active &&
      args.channel === "phone_call"
    ) {
      try {
        await ctx.runMutation(getInternal().ai.weekendMode.ensureWeekendCallerCoverage, {
          organizationId: args.organizationId,
          agentId: authorityAgent._id,
          sessionId: session._id,
          channel: args.channel,
          externalContactIdentifier: args.externalContactIdentifier,
          observedAt: Date.now(),
        });
      } catch (weekendCoverageError) {
        console.warn("[AgentExecution] Weekend caller automation failed (non-blocking):", {
          organizationId: args.organizationId,
          sessionId: String(session._id),
          agentId: String(authorityAgent._id),
          error:
            weekendCoverageError instanceof Error
              ? weekendCoverageError.message
              : String(weekendCoverageError),
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
    const hasConfiguredEnabledModels =
      Array.isArray(aiSettings?.llm?.enabledModels) &&
      aiSettings.llm.enabledModels.length > 0;
    const hasConfiguredLegacyModel =
      typeof aiSettings?.llm?.model === "string" &&
      aiSettings.llm.model.trim().length > 0;
    const hasConfiguredOrgModelPolicy =
      hasConfiguredEnabledModels || hasConfiguredLegacyModel;
    const onboardingEnabledModels =
      hasConfiguredEnabledModels
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
      const resolvedVoiceLanguage = resolveVoiceRuntimeLanguage({
        inboundVoiceRequest,
        agentConfig: config,
      });
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
          resolvedLanguage: resolvedVoiceLanguage ?? null,
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
              language: resolvedVoiceLanguage,
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
                  resolvedLanguage: resolvedVoiceLanguage ?? null,
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
                  resolvedLanguage: resolvedVoiceLanguage ?? null,
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
          resolvedLanguage: resolvedVoiceLanguage ?? null,
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
                resolvedLanguage: resolvedVoiceLanguage ?? null,
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
    const runtimeRoutingMessage =
      composerRuntimeControls.cleanedMessage.length > 0
        ? composerRuntimeControls.cleanedMessage
        : inboundMessage;
    const runtimeModuleIntentRouting = resolveInboundRuntimeModuleIntentRoute({
      authorityConfig: authorityConfigRecord,
      message: runtimeRoutingMessage,
      channel: args.channel,
      metadata,
    });
    const resolvedRuntimeModuleKey =
      runtimeModuleIntentRouting.selectedModuleKey
      ?? authorityRuntimeModuleMetadata?.key
      ?? null;
    const routedAuthorityConfigRecord =
      resolvedRuntimeModuleKey
      && resolvedRuntimeModuleKey !== authorityRuntimeModuleMetadata?.key
        ? {
            ...authorityConfigRecord,
            runtimeModuleKey: resolvedRuntimeModuleKey,
          }
        : authorityConfigRecord;
    const routedAuthorityRuntimeModuleMetadata =
      resolveAgentRuntimeModuleMetadataFromConfig(routedAuthorityConfigRecord);
    const resolvedAgentModule = resolveAgentModuleFromConfig({
      config: routedAuthorityConfigRecord,
      preferredModuleKey: resolvedRuntimeModuleKey,
    });
    const resolvedRuntimeModulePromptContext = resolvedAgentModule?.module.buildPromptContext?.(
      resolvedAgentModule.contract,
    ) ?? null;
    const derTerminmacherRuntimeContract =
      resolvedAgentModule?.module.key === DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY
        ? (resolvedAgentModule?.contract as DerTerminmacherRuntimeContract)
        : null;
    const resolvedRuntimeModuleKeyFromRegistry =
      normalizeExecutionString(resolvedAgentModule?.module.key)
      ?? normalizeExecutionString(routedAuthorityRuntimeModuleMetadata?.key)
      ?? null;
    inboundMetadata.runtimeModuleIntentRouting = runtimeModuleIntentRouting;
    recordSamanthaDispatchEvent({
      stage: "runtime_module_intent_router",
      status:
        runtimeModuleIntentRouting.decision === "selected"
          ? "pass"
          : runtimeModuleIntentRouting.decision === "clarification_required"
            ? "skip"
            : "skip",
      reasonCode:
        runtimeModuleIntentRouting.decision === "selected"
          ? "module_selected"
          : runtimeModuleIntentRouting.decision === "clarification_required"
            ? "clarification_required"
            : "default_route",
      detail: {
        decision: runtimeModuleIntentRouting.decision,
        selectedModuleKey: runtimeModuleIntentRouting.selectedModuleKey,
        confidence: runtimeModuleIntentRouting.confidence,
        reasonCodes: runtimeModuleIntentRouting.reasonCodes,
      },
    });
    const inboundAttachmentInputs = Array.isArray(metadata.attachments)
      ? [...metadata.attachments]
      : [];
    const resolvedVoiceTurnVisionFrameAttachment =
      resolveInboundVoiceTurnVisionFrameAttachmentInput(metadata);
    if (resolvedVoiceTurnVisionFrameAttachment) {
      inboundAttachmentInputs.push(resolvedVoiceTurnVisionFrameAttachment);
    }
    if (inboundAttachmentInputs.length > 0) {
      metadata.attachments = inboundAttachmentInputs;
    }
    const inboundImageAttachments = normalizeInboundImageAttachments(inboundAttachmentInputs);
    if (composerRuntimeControls.cleanedMessage.length > 0) {
      inboundMessage = composerRuntimeControls.cleanedMessage;
    }
    const meetingConciergeIntent = resolveInboundMeetingConciergeIntent({
      organizationId: args.organizationId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      metadata,
      message: inboundMessage,
      runtimeModuleKey:
        derTerminmacherRuntimeContract?.moduleKey
        ?? resolvedRuntimeModuleKeyFromRegistry
        ?? null,
    });
    const conversationLanguageLock = resolveInboundConversationLanguageLock({
      metadata,
      inboundVoiceRequest,
    });
    const actionCompletionResponseLanguage = resolveActionCompletionResponseLanguage({
      authorityConfig: authorityConfigRecord,
      inboundMessage,
      metadata,
    });
    const actionCompletionTicketRequestIntent =
      detectRuntimeCapabilityGapTicketRequestIntent({
        inboundMessage,
      });
    const actionCompletionContractConfig = resolveActionCompletionContractsForRuntime({
      authorityConfig: authorityConfigRecord,
      preferredLanguage: actionCompletionResponseLanguage,
    });
    const composerRuntimeContextParts = [
      buildInboundComposerRuntimeContext(composerRuntimeControls),
      buildInboundLanguageLockRuntimeContext(conversationLanguageLock),
      buildInboundVoiceTurnVisionRuntimeContext(metadata),
      buildRuntimeModuleIntentRoutingContext(runtimeModuleIntentRouting),
      resolvedRuntimeModulePromptContext,
      buildInboundMeetingConciergeRuntimeContext(meetingConciergeIntent),
      buildActionCompletionRuntimeContext(actionCompletionContractConfig),
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
    let semanticKnowledgeContextScopeContract: KnowledgeContextScopeContract | null = null;
    let fallbackKnowledgeContextScopeContract: KnowledgeContextScopeContract | null = null;
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
        semanticKnowledgeContextScopeContract = normalizeKnowledgeContextScopeContract({
          rawValue: chunkSearchResult.knowledgeContextScope,
          fallbackOrganizationId: String(args.organizationId),
          fallbackSurface: "semantic_chunks",
          fallbackEnforcedBy: "organizationKnowledgeChunks.by_organization",
        });
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
          const semanticDocs = mapSemanticChunksToKnowledgeDocuments(rankedChunks);
          knowledgeBaseDocs = semanticDocs.map((doc) => ({
            ...doc,
            knowledgeContextScope:
              doc.knowledgeContextScope ?? semanticKnowledgeContextScopeContract ?? undefined,
          }));
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
        const firstScopeCandidate = candidateDocs.find(
          (doc) => doc.knowledgeContextScope
        );
        fallbackKnowledgeContextScopeContract = normalizeKnowledgeContextScopeContract({
          rawValue: firstScopeCandidate?.knowledgeContextScope,
          fallbackOrganizationId: String(args.organizationId),
          fallbackSurface: "knowledge_base_docs",
          fallbackEnforcedBy: "organizationMedia.by_organization",
        });
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
        knowledgeBaseDocs = retrievalDecision.documents.map((doc) => ({
          ...doc,
          knowledgeContextScope:
            doc.knowledgeContextScope ?? fallbackKnowledgeContextScopeContract ?? undefined,
        }));
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
        notifyTelegram: async (payload) => {
          await ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationTelegram, payload);
        },
        notifyPushover: async (payload) => {
          await ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationPushover, payload);
        },
        notifyEmail: async (payload) => {
          await ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationEmail, payload);
        },
        notifyHighUrgencyRetry: async (payload) => {
          await ctx.scheduler.runAfter(5 * 60 * 1000, getInternal().ai.escalation.retryHighUrgencyEmail, payload);
        },
        onTransitionError: (error) => {
          console.warn("[AgentExecution] Failed to append pre-LLM escalation turn edge", error);
        },
      });
      await scheduleRuntimeIncidentAlert({
        incidentType: "delivery_blocked_escalated",
        turnId: runtimeTurnId,
        reasonCode: preEscalation.triggerType,
        reason: preEscalation.reason,
        metadata: {
          lifecycleState: "escalated",
          deliveryState: "blocked",
          checkpoint: "pre_llm_escalation",
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

    if (
      runtimeModuleIntentRouting.decision === "clarification_required"
      && typeof runtimeModuleIntentRouting.clarificationQuestion === "string"
      && runtimeModuleIntentRouting.clarificationQuestion.trim().length > 0
    ) {
      const clarificationQuestion = runtimeModuleIntentRouting.clarificationQuestion.trim();
      await ctx.runMutation(getInternal().ai.agentSessions.recordTurnRunAttempt, {
        turnId: runtimeTurnId,
        runAttempt: buildRunAttemptContract({
          attempts: 0,
          maxAttempts: LLM_RETRY_POLICY.maxAttempts,
          delayReason: "none",
          delayMs: 0,
          terminalOutcome: "success",
        }),
      });
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "user",
        content: inboundMessage,
      });
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "assistant",
        content: clarificationQuestion,
      });
      await enterRuntimeKernelStage("delivery", {
        sessionId: session._id,
        turnId: runtimeTurnId,
        agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
        correlationId: getSamanthaDispatchTraceCorrelationId(),
        metadata: {
          routeDecision: runtimeModuleIntentRouting.decision,
          selectedModuleKey: runtimeModuleIntentRouting.selectedModuleKey,
          confidence: runtimeModuleIntentRouting.confidence,
        },
      });
      const clarificationDeliveryContent = formatAssistantContentForDelivery(
        args.channel,
        clarificationQuestion,
        inboundMetadata,
      );
      const clarificationDeliveryResult = await deliverAssistantResponseWithFallback(
        ctx,
        {
          sendMessage: getInternal().channels.router.sendMessage,
          addToDeadLetterQueue: getInternal().ai.deadLetterQueue.addToDeadLetterQueue,
        },
        {
          organizationId: args.organizationId,
          channel: args.channel,
          recipientIdentifier: args.externalContactIdentifier,
          assistantContent: clarificationDeliveryContent,
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
        deliveryResult: clarificationDeliveryResult,
        sessionId: session._id,
        turnId: runtimeTurnId,
      });
      return {
        status: "clarification_required",
        message: clarificationQuestion,
        response: clarificationDeliveryContent,
        sessionId: session._id,
        turnId: runtimeTurnId,
        runtimeModuleIntentRouting,
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
    let explicitModelOverride = metadataSelectedModel ?? configuredModelOverride;
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
        const shouldFallbackToPlatformDefault =
          !hasConfiguredOrgModelPolicy ||
          explicitModelOverride === ONBOARDING_DEFAULT_MODEL_ID;
        if (!shouldFallbackToPlatformDefault) {
          return {
            status: "error",
            message: `Model "${explicitModelOverride}" is not enabled for this organization. Select one of the models configured by your organization owner.`,
            sessionId: session._id,
            turnId: runtimeTurnId,
          };
        }
        explicitModelOverride = undefined;
      }

      if (explicitModelOverride) {
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
    }

    const hasExplicitModelOverride = Boolean(explicitModelOverride);
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
    const effectiveKnowledgeRetrievalSurface =
      retrievalPath === "chunk_index"
        ? "semantic_chunks"
        : "knowledge_base_docs";
    const effectiveKnowledgeScopeContract = normalizeKnowledgeContextScopeContract({
      rawValue:
        effectiveKnowledgeRetrievalSurface === "semantic_chunks"
          ? semanticKnowledgeContextScopeContract
          : fallbackKnowledgeContextScopeContract ?? semanticKnowledgeContextScopeContract,
      fallbackOrganizationId: String(args.organizationId),
      fallbackSurface: effectiveKnowledgeRetrievalSurface,
      fallbackEnforcedBy:
        effectiveKnowledgeRetrievalSurface === "semantic_chunks"
          ? "organizationKnowledgeChunks.by_organization"
          : "organizationMedia.by_organization",
    });
    knowledgeBaseDocs = knowledgeBaseDocs.map((doc) => ({
      ...doc,
      knowledgeContextScope: doc.knowledgeContextScope ?? effectiveKnowledgeScopeContract,
    }));
    const boundedKnowledgeContext = composeKnowledgeContext({
      documents: knowledgeBaseDocs,
      modelContextLength: selectedModelContextLength,
    });
    knowledgeBaseDocs = boundedKnowledgeContext.documents;
    let retrievalCitations = boundedKnowledgeContext.documents.map((doc, index) => {
      const citationScopeContract = normalizeKnowledgeContextScopeContract({
        rawValue: doc.knowledgeContextScope ?? effectiveKnowledgeScopeContract,
        fallbackOrganizationId: String(args.organizationId),
        fallbackSurface: effectiveKnowledgeRetrievalSurface,
        fallbackEnforcedBy:
          effectiveKnowledgeRetrievalSurface === "semantic_chunks"
            ? "organizationKnowledgeChunks.by_organization"
            : "organizationMedia.by_organization",
      });
      const citationProvenance = buildKnowledgeContextProvenanceContract({
        doc,
        fallbackRetrievalMethod:
          effectiveKnowledgeRetrievalSurface === "semantic_chunks"
            ? "semantic_chunk_index"
            : "knowledge_base_docs_scan",
        retrievalSurface: effectiveKnowledgeRetrievalSurface,
        now: Date.now(),
      });
      const citationConfidence = buildKnowledgeContextConfidenceContract({
        doc,
      });

      return {
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
        sourceUpdatedAt: citationProvenance.sourceUpdatedAt,
        relevanceScore:
          typeof doc.semanticScore === "number"
            ? Number(doc.semanticScore.toFixed(4))
            : undefined,
        confidence: citationConfidence.score,
        confidenceBand: citationConfidence.band,
        matchedTokens: citationConfidence.matchedTokens,
        retrievalMethod: citationProvenance.retrievalMethod,
        knowledgeContextScope: citationScopeContract,
        knowledgeContextProvenance: citationProvenance,
        knowledgeContextConfidence: citationConfidence,
      };
    });
    const uniqueCitationMediaIds = Array.from(
      new Set(
        retrievalCitations
          .map((citation) =>
            typeof citation.mediaId === "string" && citation.mediaId.trim().length > 0
              ? citation.mediaId.trim()
              : null,
          )
          .filter((value): value is string => Boolean(value)),
      ),
    );
    let evidenceLookupError: string | undefined;
    let evidenceLookupRows: Array<{
      mediaId: string;
      evidenceObjectId: string;
      evidenceTitle: string;
      subtype: string | null;
      sourceType: string | null;
      lifecycleStatus: string | null;
      riskIds: string[];
      updatedAt: number;
    }> = [];
    if (uniqueCitationMediaIds.length > 0) {
      try {
        evidenceLookupRows = await ctx.runQuery(
          getInternal().complianceEvidenceVault.resolveEvidenceObjectsByMediaIdsInternal,
          {
            organizationId: args.organizationId,
            mediaIds: uniqueCitationMediaIds,
          },
        ) as Array<{
          mediaId: string;
          evidenceObjectId: string;
          evidenceTitle: string;
          subtype: string | null;
          sourceType: string | null;
          lifecycleStatus: string | null;
          riskIds: string[];
          updatedAt: number;
        }>;
      } catch (error) {
        evidenceLookupError =
          error instanceof Error ? error.message : "evidence_lookup_failed";
        console.error(
          `[AgentExecution] Evidence lookup failed for ${args.organizationId}:`,
          error,
        );
      }
    }
    const evidenceByMediaId = new Map<
      string,
      {
        evidenceObjectId: string;
        evidenceTitle: string;
        subtype: string | null;
        sourceType: string | null;
        lifecycleStatus: string | null;
        riskIds: string[];
      }
    >();
    for (const row of evidenceLookupRows) {
      if (!evidenceByMediaId.has(row.mediaId)) {
        evidenceByMediaId.set(row.mediaId, {
          evidenceObjectId: row.evidenceObjectId,
          evidenceTitle: row.evidenceTitle,
          subtype: row.subtype,
          sourceType: row.sourceType,
          lifecycleStatus: row.lifecycleStatus,
          riskIds: Array.isArray(row.riskIds) ? row.riskIds : [],
        });
      }
    }
    let auditableEvidenceCitationCount = 0;
    retrievalCitations = retrievalCitations.map((citation) => {
      const mediaId =
        typeof citation.mediaId === "string" && citation.mediaId.trim().length > 0
          ? citation.mediaId.trim()
          : undefined;
      const evidence = mediaId ? evidenceByMediaId.get(mediaId) : undefined;
      if (!evidence) {
        return {
          ...citation,
          citationClass: "advisory_reference" as const,
          evidenceLink: {
            contractVersion: KNOWLEDGE_EVIDENCE_LINK_CONTRACT_VERSION,
            status: "not_linked" as const,
            linkedBy: "none" as const,
          },
        };
      }
      auditableEvidenceCitationCount += 1;
      return {
        ...citation,
        citationClass: "auditable_evidence" as const,
        evidenceLink: {
          contractVersion: KNOWLEDGE_EVIDENCE_LINK_CONTRACT_VERSION,
          status: "linked" as const,
          linkedBy: "media_id" as const,
          evidenceObjectId: evidence.evidenceObjectId,
          evidenceTitle: evidence.evidenceTitle,
          evidenceSubtype: evidence.subtype ?? undefined,
          evidenceSourceType: evidence.sourceType ?? undefined,
          evidenceLifecycleStatus: evidence.lifecycleStatus ?? undefined,
          riskIds: evidence.riskIds,
        },
      };
    });
    const retrievalTelemetry = {
      mode: retrievalMode,
      path: retrievalPath,
      knowledgeContextContractVersion: effectiveKnowledgeScopeContract.contractVersion,
      knowledgeContextScope: effectiveKnowledgeScopeContract.scope,
      knowledgeContextScopeKey: effectiveKnowledgeScopeContract.scopeKey,
      knowledgeContextOrganizationId: effectiveKnowledgeScopeContract.organizationId,
      knowledgeContextProjectId: effectiveKnowledgeScopeContract.projectId,
      knowledgeContextRetrievalSurface: effectiveKnowledgeScopeContract.retrievalSurface,
      knowledgeContextEnforcedBy: effectiveKnowledgeScopeContract.enforcedBy,
      knowledgeContextProvenanceContractVersion:
        KNOWLEDGE_CONTEXT_PROVENANCE_CONTRACT_VERSION,
      knowledgeContextConfidenceContractVersion:
        KNOWLEDGE_CONTEXT_CONFIDENCE_CONTRACT_VERSION,
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
      auditableEvidenceCitationCount,
      advisoryReferenceCitationCount:
        retrievalCitations.length - auditableEvidenceCitationCount,
      evidenceLookupMediaCount: uniqueCitationMediaIds.length,
      evidenceLookupMatchCount: evidenceByMediaId.size,
      evidenceLookupError,
      knowledgeEvidenceLinkContractVersion:
        KNOWLEDGE_EVIDENCE_LINK_CONTRACT_VERSION,
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

    const mandatorySamanthaTools = resolveNativeGuestMandatoryActionCompletionTools({
      channel: args.channel,
      actionCompletionContractConfig,
    });
    const targetConfigurationAgentId = firstInboundString(
      inboundMetadata.targetAgentId,
    ) as Id<"objects"> | undefined;
    const mandatoryRuntimeTools = normalizeDeterministicRuntimeStringArray([
      ...mandatorySamanthaTools,
      ...(targetConfigurationAgentId ? [CONFIGURE_AGENT_FIELDS_TOOL_NAME] : []),
    ]);
    const effectiveRuntimeModuleManifest = resolveDerTerminmacherToolScopeManifest({
      derTerminmacherRuntimeContract,
      routedAuthorityRuntimeModuleMetadata,
    });
    const agentToolScopeResolution = resolveAgentToolScopeResolutionContract({
      agentProfile: delegationAuthorityContract.authorityToolProfile,
      agentEnabled: delegationAuthorityContract.authorityEnabledTools,
      agentDisabled: delegationAuthorityContract.authorityDisabledTools,
      mandatoryTools: mandatoryRuntimeTools,
      runtimeModuleManifest: effectiveRuntimeModuleManifest,
    });
    const agentProfile = agentToolScopeResolution.agentProfile ?? undefined;

    const scopedOrgEnabledTools =
      orgToolPolicy.orgEnabled.length > 0
        ? mergeRuntimeMandatoryTools(orgToolPolicy.orgEnabled, mandatoryRuntimeTools)
        : orgToolPolicy.orgEnabled;
    const scopedOrgDisabledTools = removeRuntimeMandatoryTools(
      orgToolPolicy.orgDisabled,
      mandatoryRuntimeTools,
    );
    const scopedAgentEnabledTools = agentToolScopeResolution.enabledTools;
    const scopedAgentDisabledTools = agentToolScopeResolution.disabledTools;

    // Session-level disabled tools (from degraded mode / error state)
    const sessionDisabledTools = removeRuntimeMandatoryTools(
      preflightErrorState?.disabledTools ?? [],
      mandatoryRuntimeTools,
    );

    const allToolDefs = getAllToolDefinitions();
    const scopedTools = resolveActiveToolsWithAudit({
      allTools: allToolDefs,
      platformBlocked: getPlatformBlockedTools(),
      orgEnabled: scopedOrgEnabledTools,
      orgDisabled: scopedOrgDisabledTools,
      connectedIntegrations,
      agentProfile,
      agentEnabled: scopedAgentEnabledTools,
      agentDisabled: scopedAgentDisabledTools,
      autonomyLevel: effectiveAutonomyLevel,
      sessionDisabled: sessionDisabledTools,
      channel: args.channel,
    });
    if (mandatoryRuntimeTools.length > 0) {
      const existingToolNames = new Set(scopedTools.tools.map((tool) => tool.name));
      const injectedToolNames: string[] = [];
      for (const requiredToolName of mandatoryRuntimeTools) {
        if (existingToolNames.has(requiredToolName)) {
          continue;
        }
        const requiredToolDef = allToolDefs.find((tool) => tool.name === requiredToolName);
        if (!requiredToolDef) {
          continue;
        }
        scopedTools.tools.push(requiredToolDef);
        existingToolNames.add(requiredToolName);
        injectedToolNames.push(requiredToolName);
      }
      if (injectedToolNames.length > 0) {
        scopedTools.audit.finalToolNames = normalizeDeterministicRuntimeStringArray(
          scopedTools.tools.map((tool) => tool.name),
        );
        scopedTools.audit.finalCount = scopedTools.audit.finalToolNames.length;
      }
    }
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
      agentEnabledCount: scopedAgentEnabledTools.length,
      agentDisabledCount: scopedAgentDisabledTools.length,
      sessionDisabledCount: sessionDisabledTools.length,
      agentToolResolution: {
        contractVersion: agentToolScopeResolution.contractVersion,
        source: agentToolScopeResolution.source,
        moduleKey: agentToolScopeResolution.moduleKey,
        agentProfile: agentToolScopeResolution.agentProfile,
        enabledTools: agentToolScopeResolution.enabledTools,
        disabledTools: agentToolScopeResolution.disabledTools,
        manifestRequiredTools: agentToolScopeResolution.manifestRequiredTools,
        manifestOptionalTools: agentToolScopeResolution.manifestOptionalTools,
        manifestDeniedTools: agentToolScopeResolution.manifestDeniedTools,
      },
      runtimeMandatoryTools: mandatoryRuntimeTools,
      soulMode: soulModeRuntime.mode,
      soulModeSource: soulModeRuntime.source,
      soulModeToolScope: soulModeRuntime.config.toolScope,
      archetypeId: archetypeRuntime.archetype?.id ?? null,
      archetypeSource: archetypeRuntime.source,
      sensitiveArchetypeReadOnly: sensitiveArchetypeConstraint?.forceReadOnlyTools === true,
    };
    const effectiveExecutableToolNames = activeToolDefs.map((toolDef) => toolDef.name);
    const nativeGuestRequiredToolInvariant = resolveNativeGuestRequiredToolInvariant({
      channel: args.channel,
      requiredTools: mandatoryRuntimeTools,
      effectiveExecutableToolNames,
    });
    if (nativeGuestRequiredToolInvariant.enforced) {
      const missingTool = nativeGuestRequiredToolInvariant.missingRequiredTools[0];
      if (missingTool) {
        const removalReasonByLayer = {
          platform: toolScopingAudit.removedByPlatform.includes(missingTool),
          orgAllow: toolScopingAudit.removedByOrgAllow.includes(missingTool),
          orgDeny: toolScopingAudit.removedByOrgDeny.includes(missingTool),
          integration: toolScopingAudit.removedByIntegration.includes(missingTool),
          agentProfile: toolScopingAudit.removedByAgentProfile.includes(missingTool),
          agentEnable: toolScopingAudit.removedByAgentEnable.includes(missingTool),
          agentDisable: toolScopingAudit.removedByAgentDisable.includes(missingTool),
          autonomy: toolScopingAudit.removedByAutonomy.includes(missingTool),
          session: toolScopingAudit.removedBySession.includes(missingTool),
          channel: toolScopingAudit.removedByChannel.includes(missingTool),
          mode: disableAllToolsForMode,
        };
        const invariantDiagnostic = {
          correlationId: requestCorrelationId,
          organizationId: String(args.organizationId),
          sessionId: String(session._id),
          turnId: String(runtimeTurnId),
          channel: args.channel,
          requiredTool: missingTool,
          requiredTools: mandatoryRuntimeTools,
          executableTools: effectiveExecutableToolNames,
          finalScopedTools: toolScopingAudit.finalToolNames,
          runtimeMandatoryTools: toolScopingAudit.runtimeMandatoryTools,
          removedByLayer: removalReasonByLayer,
          idempotencyScopeKey: runtimeContracts.idempotencyContract.scopeKey,
          payloadHash: runtimeContracts.idempotencyContract.payloadHash,
        };
        console.error("[NativeGuestToolInvariant] required tool missing before execution", invariantDiagnostic);
        await ctx.runMutation(getInternal().ai.agentSessions.logAgentAction, {
          agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
          organizationId: args.organizationId,
          actionType: "native_guest_required_tool_missing_preexecution",
          actionData: invariantDiagnostic,
        });
        await scheduleRuntimeIncidentAlert({
          incidentType: "claim_tool_unavailable",
          turnId: runtimeTurnId,
          proposalKey: runtimeContracts.idempotencyContract.scopeKey,
          tool: missingTool,
          reasonCode: "required_tool_missing_preexecution",
          reason:
            "Required audit deliverable tool missing from executable runtime tool set before LLM execution.",
          metadata: invariantDiagnostic,
        });
        return {
          status: "error",
          message: actionCompletionResponseLanguage === "de"
            ? "Wir koennen den Audit-Report aktuell nicht liefern, weil ein erforderliches Runtime-Tool fehlt. Unser Team wurde automatisch informiert."
            : "We can’t deliver the audit report right now because a required runtime tool is missing. Our team has been alerted automatically.",
          sessionId: session._id,
          turnId: runtimeTurnId,
        };
      }
    }
    const harnessToolNames = effectiveExecutableToolNames;
    const activeToolNames = new Set(harnessToolNames);
    let toolSchemas = getToolSchemasForNames([...activeToolNames]);
    if (disableAllToolsForMode || isPlanMode(composerRuntimeControls.mode)) {
      toolSchemas = [];
    }
    const modeDisabledTools = disableAllToolsForMode
      ? scopedTools.tools.map((tool) => tool.name)
      : [];
    const requiredScopeManifest = buildRequiredScopeToolManifestContract({
      finalToolNames: disableAllToolsForMode ? [] : toolScopingAudit.finalToolNames,
      agentToolResolution: toolScopingAudit.agentToolResolution,
      removedByLayer: {
        platform: toolScopingAudit.removedByPlatform,
        orgAllow: toolScopingAudit.removedByOrgAllow,
        orgDeny: toolScopingAudit.removedByOrgDeny,
        integration: toolScopingAudit.removedByIntegration,
        agentProfile: toolScopingAudit.removedByAgentProfile,
        agentEnable: toolScopingAudit.removedByAgentEnable,
        agentDisable: toolScopingAudit.removedByAgentDisable,
        autonomy: toolScopingAudit.removedByAutonomy,
        session: toolScopingAudit.removedBySession,
        channel: [
          ...toolScopingAudit.removedByChannel,
          ...modeDisabledTools,
        ],
      },
    });
    let requiredScopeDelegationDeliveryOverride: {
      requiredScopeContract: RequiredSpecialistScopeContract;
      requiredScopeGap: RequiredSpecialistScopeGap;
      requiredScopeManifest: RequiredScopeToolManifestContract;
      requiredScopeFallback: RequiredScopeFallbackDelegationContract;
      message: string;
    } | null = null;
    const unavailableByPolicyTools = [
      ...toolScopingAudit.removedByPlatform,
      ...toolScopingAudit.removedByOrgDeny,
      ...toolScopingAudit.removedByAgentDisable,
      ...toolScopingAudit.removedBySession,
      ...toolScopingAudit.removedByChannel,
      ...modeDisabledTools,
    ];
    const requiredSpecialistScopeValidation = validateRequiredSpecialistScopeContract({
      requiredTools: delegationAuthorityContract.authorityRequiredTools,
      requiredCapabilities: delegationAuthorityContract.authorityRequiredCapabilities,
      scopedToolNames: disableAllToolsForMode ? [] : toolScopingAudit.finalToolNames,
      connectedIntegrations: toolScopingAudit.connectedIntegrations,
      removedByLayer: {
        platform: toolScopingAudit.removedByPlatform,
        orgAllow: toolScopingAudit.removedByOrgAllow,
        orgDeny: toolScopingAudit.removedByOrgDeny,
        integration: toolScopingAudit.removedByIntegration,
        agentProfile: toolScopingAudit.removedByAgentProfile,
        agentEnable: toolScopingAudit.removedByAgentEnable,
        agentDisable: toolScopingAudit.removedByAgentDisable,
        autonomy: toolScopingAudit.removedByAutonomy,
        session: toolScopingAudit.removedBySession,
        channel: [
          ...toolScopingAudit.removedByChannel,
          ...modeDisabledTools,
        ].sort((left, right) => left.localeCompare(right)),
      },
    });
    if (requiredSpecialistScopeValidation.blocked && requiredSpecialistScopeValidation.gap) {
      const requiredScopeFallback = await attemptRequiredScopeDelegationFallback(ctx, {
        organizationId: args.organizationId,
        sessionId: session._id,
        authorityAgentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
        requiredScopeContract: requiredSpecialistScopeValidation.contract,
        requiredScopeGap: requiredSpecialistScopeValidation.gap,
        requiredScopeManifest,
      });
      await ctx.runMutation(getInternal().ai.agentSessions.logAgentAction, {
        agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
        organizationId: args.organizationId,
        actionType: "required_scope_fallback_delegation",
        actionData: {
          sessionId: String(session._id),
          turnId: String(runtimeTurnId),
          channel: args.channel,
          requiredScopeManifestHash: requiredScopeManifest.manifestHash,
          requiredScopeContract: requiredSpecialistScopeValidation.contract,
          requiredScopeGap: requiredSpecialistScopeValidation.gap,
          fallback: requiredScopeFallback,
          queueContract: runtimeContracts.queueContract,
          idempotencyContract: runtimeContracts.idempotencyContract,
        },
      });
      if (requiredScopeFallback.outcome === "delegated") {
        requiredScopeDelegationDeliveryOverride = {
          requiredScopeContract: requiredSpecialistScopeValidation.contract,
          requiredScopeGap: requiredSpecialistScopeValidation.gap,
          requiredScopeManifest,
          requiredScopeFallback,
          message:
            requiredScopeFallback.message
            || "Specialist fallback delegation completed.",
        };
      } else {
      await ctx.runMutation(getInternal().ai.agentSessions.logAgentAction, {
        agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
        organizationId: args.organizationId,
        actionType: "required_scope_contract_blocked",
        actionData: {
          sessionId: String(session._id),
          turnId: String(runtimeTurnId),
          channel: args.channel,
          contract: requiredSpecialistScopeValidation.contract,
          gap: requiredSpecialistScopeValidation.gap,
          requiredScopeManifest,
          requiredScopeFallback,
          queueContract: runtimeContracts.queueContract,
          idempotencyContract: runtimeContracts.idempotencyContract,
        },
      });
      return {
        status: "blocked",
        message:
          `Curated specialist runtime contract failed after layered scope resolution (${requiredSpecialistScopeValidation.gap.reasonCode}).`,
        requiredScopeContract: requiredSpecialistScopeValidation.contract,
        requiredScopeGap: requiredSpecialistScopeValidation.gap,
        requiredScopeManifest,
        requiredScopeFallback,
        sessionId: session._id,
        turnId: runtimeTurnId,
        admissionDenial: buildDeniedTurnAdmissionPayload({
          channel: resolveAdmissionDenialChannel(args.channel),
          stage: "runtime",
          reasonCode: "precondition_missing",
          reason: `required_scope_contract_blocked:${requiredSpecialistScopeValidation.gap.reasonCode}`,
          httpStatusHint: 422,
          userSafeMessage:
            "A required specialist scope precondition is missing, so this turn was blocked.",
          manifestHash: requiredScopeManifest.manifestHash,
          idempotencyContract: runtimeContracts.idempotencyContract,
          metadata: {
            requiredScopeGap: requiredSpecialistScopeValidation.gap.reasonCode,
            fallbackOutcome: requiredScopeFallback.outcome,
          },
        }),
      };
      }
    }
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
    const crossOrgSoulReadOnlyEnrichmentRuntime =
      await resolveCrossOrgSoulReadOnlyEnrichment({
        ctx,
        authorityConfig,
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
      weekendMode: authorityConfig.weekendMode,
      weekendModeEnabled: weekendModeRuntime.enabled,
      weekendModeActive: weekendModeRuntime.active,
      weekendModeReason: weekendModeRuntime.reason,
      weekendModeTimezone: weekendModeRuntime.timezone,
      weekendModeFridayStart: weekendModeRuntime.fridayStart,
      weekendModeMondayEnd: weekendModeRuntime.mondayEnd,
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
      crossOrgSoulReadOnlyEnrichmentRuntime.enrichment,
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
    const commercialKickoffRuntimeContext = buildInboundCommercialKickoffRuntimeContext(
      resolveInboundCommercialKickoffContract(inboundMetadata)
    );
    const inboundLayerWorkflowId = firstInboundString(
      inboundMetadata.layerWorkflowId,
      inboundMetadata.workflowId,
    ) as Id<"objects"> | undefined;
    const loadLayeredContextPromptForWorkflowIds = async (
      workflowIds: Id<"objects">[],
    ): Promise<string | undefined> => {
      const layeredContextBundles: Array<Parameters<typeof buildLayeredContextSystemPrompt>[0]> = [];
      for (const workflowId of workflowIds) {
        try {
          const layeredContextBundle = await ctx.runQuery(
            getApi().internal.layers.layerWorkflowOntology.internalGetLayeredContextBundle,
            {
              organizationId: args.organizationId,
              workflowId,
            },
          ) as { contractVersion?: string } | null;
          if (layeredContextBundle?.contractVersion === "layered_context_bundle_v1") {
            layeredContextBundles.push(
              layeredContextBundle as Parameters<typeof buildLayeredContextSystemPrompt>[0],
            );
          }
        } catch (error) {
          console.warn("[AgentExecution] Failed to load layered context bundle", {
            organizationId: String(args.organizationId),
            sessionId: String(session._id),
            workflowId: String(workflowId),
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      if (layeredContextBundles.length === 1) {
        return buildLayeredContextSystemPrompt(
          layeredContextBundles[0],
        );
      }
      if (layeredContextBundles.length > 1) {
        return buildLayeredContextSystemPromptFromBundles(
          layeredContextBundles,
        );
      }
      return undefined;
    };
    const linkedLayerWorkflowIds = await ctx.runQuery(
      getApi().internal.agentOntology.getAgentLayeredContextWorkflowIdsInternal,
      {
        agentId: agent._id,
      },
    ) as Id<"objects">[];
    const orderedLayerWorkflowIds: Id<"objects">[] = [];
    const seenLayerWorkflowIds = new Set<string>();
    for (const workflowId of [inboundLayerWorkflowId, ...linkedLayerWorkflowIds]) {
      if (!workflowId) {
        continue;
      }
      const normalizedWorkflowId = String(workflowId);
      if (seenLayerWorkflowIds.has(normalizedWorkflowId)) {
        continue;
      }
      seenLayerWorkflowIds.add(normalizedWorkflowId);
      orderedLayerWorkflowIds.push(workflowId);
      if (orderedLayerWorkflowIds.length >= 4) {
        break;
      }
    }
    const layeredContextSystemPrompt =
      orderedLayerWorkflowIds.length > 0
        ? await loadLayeredContextPromptForWorkflowIds(orderedLayerWorkflowIds)
        : undefined;
    let targetAgentConfigurationContext: string | undefined;
    if (targetConfigurationAgentId) {
      const targetAgent = await ctx.runQuery(
        getInternal().agentOntology.getAgentInternal,
        {
          agentId: targetConfigurationAgentId,
        },
      ) as {
        _id?: Id<"objects">;
        organizationId?: Id<"organizations">;
        type?: string;
        name?: string;
        subtype?: string;
        status?: string;
        customProperties?: Record<string, unknown>;
      } | null;
      if (
        targetAgent?._id
        && targetAgent.organizationId === args.organizationId
        && targetAgent.type === "org_agent"
        && typeof targetAgent.name === "string"
      ) {
        let targetAgentLayeredContextPrompt: string | undefined;
        if (inboundLayerWorkflowId) {
          targetAgentLayeredContextPrompt = await loadLayeredContextPromptForWorkflowIds([
            inboundLayerWorkflowId,
          ]);
        } else {
          const targetAgentLinkedWorkflowIds = await ctx.runQuery(
            getApi().internal.agentOntology.getAgentLayeredContextWorkflowIdsInternal,
            {
              agentId: targetConfigurationAgentId,
            },
          ) as Id<"objects">[];
          const orderedTargetAgentWorkflowIds = targetAgentLinkedWorkflowIds.slice(0, 4);
          if (orderedTargetAgentWorkflowIds.length > 0) {
            targetAgentLayeredContextPrompt = await loadLayeredContextPromptForWorkflowIds(
              orderedTargetAgentWorkflowIds,
            );
          }
        }
        targetAgentConfigurationContext = buildTargetAgentConfigurationContext({
          targetAgent: {
            _id: targetAgent._id,
            name: targetAgent.name,
            subtype: targetAgent.subtype,
            status: targetAgent.status,
            customProperties: targetAgent.customProperties,
          },
          layeredContextSystemPrompt: targetAgentLayeredContextPrompt,
        });
      }
    }
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
      targetAgentConfigurationContext ?? "",
      layeredContextSystemPrompt ?? "",
      planFeasibilityContext ?? "",
      commercialKickoffRuntimeContext ?? "",
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
      targetAgentConfigurationContext,
      layeredContextSystemPrompt,
      planFeasibilityContext,
      commercialKickoffRuntimeContext,
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

    const skipLlmExecutionForRequiredScopeFallback =
      requiredScopeDelegationDeliveryOverride !== null;
    await invokeRuntimeAgentHook("preLLM", {
      sessionId: session._id,
      turnId: runtimeTurnId,
      agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
      metadata: {
        skipLlmExecutionForRequiredScopeFallback,
      },
    });
    if (!skipLlmExecutionForRequiredScopeFallback) {
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
        await ctx.scheduler.runAfter(0, getInternal().credits.notifications.notifyCreditExhausted, {
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
    }

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let choice: any = null;

    if (skipLlmExecutionForRequiredScopeFallback) {
      response = {
        usage: { total_tokens: 0 },
        choices: [
          {
            message: {
              content: requiredScopeDelegationDeliveryOverride?.message
                || "Specialist fallback delegation completed.",
              tool_calls: [],
            },
          },
        ],
      };
      choice = response.choices?.[0] ?? null;
      await ctx.runMutation(getInternal().ai.agentSessions.recordTurnRunAttempt, {
        turnId: runtimeTurnId,
        runAttempt: buildRunAttemptContract({
          attempts: 0,
          maxAttempts: LLM_RETRY_POLICY.maxAttempts,
          delayReason: "none",
          delayMs: 0,
          terminalOutcome: "success",
        }),
      });
    } else {
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
      await ctx.scheduler.runAfter(0, getInternal().credits.notifications.notifyAllModelsFailed, {
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

    choice = response.choices?.[0];
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
    }
    await invokeRuntimeAgentHook("postLLM", {
      sessionId: session._id,
      turnId: runtimeTurnId,
      agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
      metadata: {
        usedModel,
        usedAuthProfileId: usedAuthProfileId ?? null,
        skipLlmExecutionForRequiredScopeFallback,
      },
    });

    let assistantContent = choice.message?.content || "";
    if (composerRuntimeControls.mode === "plan_soft" && !skipLlmExecutionForRequiredScopeFallback) {
      assistantContent = applyPlanSoftReadinessScoring({
        assistantContent,
        availableToolNames: toolScopingAudit.finalToolNames,
        connectedIntegrations: toolScopingAudit.connectedIntegrations,
        unavailableByIntegration: toolScopingAudit.removedByIntegration,
        unavailableByPolicy: unavailableByPolicyTools,
      });
    }
    const runtimePolicyAdvisories: string[] = [];
    if (!skipLlmExecutionForRequiredScopeFallback) {
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
    }
    let toolCalls = Array.isArray(choice.message?.tool_calls)
      ? choice.message.tool_calls as Array<Record<string, unknown>>
      : [];
    toolCalls = applyDerTerminmacherToolCallAdjustments({
      toolCalls,
      skipLlmExecutionForRequiredScopeFallback,
      derTerminmacherRuntimeContract,
      meetingConciergeIntent,
    });
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
      const resolvedVoiceLanguage = resolveVoiceRuntimeLanguage({
        inboundVoiceRequest,
        agentConfig: config,
      });
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
        const voiceResolution = resolveDeterministicVoiceDefaults({
          requestedVoiceId: inboundVoiceRequest.requestedVoiceId,
          agentVoiceId: config?.elevenLabsVoiceId,
          orgDefaultVoiceId: elevenLabsBinding?.defaultVoiceId,
        });
        const voiceId = voiceResolution.resolvedVoiceId;

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
                resolvedLanguage: resolvedVoiceLanguage ?? null,
                voiceResolutionSource: voiceResolution.voiceResolutionSource,
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
                resolvedLanguage: resolvedVoiceLanguage ?? null,
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
          resolvedSynthesisLanguage: resolvedVoiceLanguage ?? null,
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
          resolvedSynthesisLanguage: resolvedVoiceLanguage ?? null,
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
              resolvedLanguage: resolvedVoiceLanguage ?? null,
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
    if (mandatoryRuntimeTools.length > 0) {
      for (const requiredToolName of mandatoryRuntimeTools) {
        disabledTools.delete(requiredToolName);
        delete failedToolCounts[requiredToolName];
      }
    }
    const inboundCommercialRoutingPolicy = resolveInboundCommercialRoutingPolicy({
      inboundMessage: args.message,
      metadata: inboundMetadata,
    });
    const samanthaSourceContextInitialization =
      executeSamanthaSourceContextRuntimeInitialization({
      ingressChannel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      metadata: inboundMetadata,
      recordSamanthaDispatchEvent,
    });
    const samanthaAuditSourceContext =
      samanthaSourceContextInitialization.samanthaAuditSourceContext;
    const toolCtx: ToolExecutionContext = {
      ...ctx,
      organizationId: args.organizationId,
      userId: authorityAgent.createdBy as Id<"users">,
      sessionId: firstInboundString(inboundMetadata.sessionId),
      conversationId: firstInboundString(
        inboundMetadata.conversationId,
      ) as Id<"aiConversations"> | undefined,
      agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
      agentSessionId: session._id,
      channel: args.channel,
      contactId: args.externalContactIdentifier,
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
        commercialRouting: inboundCommercialRoutingPolicy,
        sourceAuditContext: {
          ingressChannel: samanthaAuditSourceContext.ingressChannel,
          originSurface: samanthaAuditSourceContext.originSurface,
          sourceSessionToken: samanthaAuditSourceContext.sourceSessionToken,
          sourceAuditChannel: samanthaAuditSourceContext.sourceAuditChannel,
        },
        runtimeAuthorityPrecedence:
          canonicalIngressEnvelope.nativeVisionEdge.nativeAuthorityPrecedence,
      },
    };
    const createToolApprovalRequest = async (request: {
      actionType: string;
      actionPayload: Record<string, unknown>;
    }) => {
      if (request.actionType === CONFIGURE_AGENT_FIELDS_TOOL_NAME && toolCtx.conversationId) {
        const conversation = await ctx.runQuery(
          getInternal().ai.conversations.getConversationMetadataInternal,
          {
            conversationId: toolCtx.conversationId,
          },
        ) as {
          userId?: Id<"users">;
        } | null;
        const proposal = await buildConfigureAgentFieldsProposalEnvelope(
          toolCtx,
          request.actionPayload as any,
        );

        await ctx.runMutation(getApi().api.ai.conversations.proposeToolExecution, {
          conversationId: toolCtx.conversationId,
          organizationId: args.organizationId,
          userId: conversation?.userId || toolCtx.userId,
          sessionId: toolCtx.sessionId,
          toolName: request.actionType,
          parameters: proposal.parameters,
          proposalMessage: proposal.proposalMessage,
        });
        return;
      }

      await ctx.runMutation(getInternal().ai.agentApprovals.createApprovalRequest, {
        agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
        sessionId: session._id,
        organizationId: args.organizationId,
        actionType: request.actionType,
        actionPayload: request.actionPayload,
      });
    };
    const handleToolDisabled = async (event: {
      toolName: string;
      error: string;
    }) => {
      console.error(
        `[AgentExecution] Tool "${event.toolName}" disabled after 3 failures in session ${session._id}`
      );
      await ctx.scheduler.runAfter(0, getInternal().credits.notifications.notifyToolDisabled, {
        organizationId: args.organizationId,
        toolName: event.toolName,
        error: event.error,
      });
    };
    const runtimeToolHooks: AgentRuntimeToolHooks = {
      preTool: async (payload) => {
        await invokeRuntimeAgentHook("preTool", {
          sessionId: session._id,
          turnId: runtimeTurnId,
          agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
          toolName: payload.toolName,
          metadata: {
            toolArgs: payload.toolArgs,
          },
        });
      },
      postTool: async (payload) => {
        await invokeRuntimeAgentHook("postTool", {
          sessionId: session._id,
          turnId: runtimeTurnId,
          agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
          toolName: payload.toolName,
          toolStatus: payload.status,
          metadata: {
            error: payload.error,
          },
        });
      },
      onHookError: (hookError) => {
        console.warn("[AgentExecution] Agent runtime tool hook failed", {
          hookName: hookError.hookName,
          toolName: hookError.toolName,
          error:
            hookError.error instanceof Error
              ? hookError.error.message
              : String(hookError.error),
        });
      },
    };
    const kanzleiComplianceAuditEnabled =
      authorityConfig.kanzleiFailClosed === true
      || isKanzleiFailClosedModeToken(authorityConfig.complianceMode)
      || isKanzleiFailClosedModeToken(authorityConfig.industry)
      || isKanzleiFailClosedModeToken(authorityConfig.orgPolicyRef);
    const recordKanzleiRuntimeAuditEvent = async (event: {
      eventType: "approval_decision" | "action_blocked" | "external_dispatch_attempt";
      toolName: string;
      decision?: string;
      reasonCode?: string;
      outcome?: AgentToolExecutionStatus;
      metadata?: Record<string, unknown>;
    }) => {
      if (!kanzleiComplianceAuditEnabled) {
        return;
      }
      try {
        await ctx.runMutation(
          getInternal().compliance.recordKanzleiRuntimeAuditEvent,
          {
            organizationId: args.organizationId,
            userId: toolCtx.userId,
            agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
            sessionId: session._id,
            turnId: String(runtimeTurnId),
            eventType: event.eventType,
            toolName: event.toolName,
            decision: event.decision,
            reasonCode: event.reasonCode,
            outcome: event.outcome,
            occurredAt: Date.now(),
            metadata: {
              contractVersion: KANZLEI_COMPLIANCE_AUDIT_CONTRACT_VERSION,
              ...event.metadata,
            },
          },
        );
      } catch (kanzleiAuditError) {
        console.error("[AgentExecution] Failed to record Kanzlei compliance audit event", {
          sessionId: session._id,
          turnId: runtimeTurnId,
          eventType: event.eventType,
          toolName: event.toolName,
          kanzleiAuditError,
        });
      }
    };
    const recordKanzleiToolAuditEvents = async (args: {
      phase: "initial_dispatch" | "samantha_auto_dispatch";
      toolResults: AgentToolResult[];
    }) => {
      if (!kanzleiComplianceAuditEnabled || args.toolResults.length === 0) {
        return;
      }
      for (const toolResult of args.toolResults) {
        const toolName = normalizeExecutionString(toolResult.tool);
        if (!toolName) {
          continue;
        }
        if (toolResult.status === "pending_approval") {
          await recordKanzleiRuntimeAuditEvent({
            eventType: "approval_decision",
            toolName,
            decision: "approval_requested",
            reasonCode: "tool_requires_human_approval",
            outcome: toolResult.status,
            metadata: {
              phase: args.phase,
            },
          });
        }
        if (isBlockedToolResultForKanzleiAudit(toolResult)) {
          await recordKanzleiRuntimeAuditEvent({
            eventType: "action_blocked",
            toolName,
            reasonCode: resolveKanzleiAuditReasonCode(toolResult),
            outcome: toolResult.status,
            metadata: {
              phase: args.phase,
              error: toolResult.error || null,
            },
          });
        }
        if (isKanzleiExternalDispatchToolName(toolName)) {
          await recordKanzleiRuntimeAuditEvent({
            eventType: "external_dispatch_attempt",
            toolName,
            decision:
              toolResult.status === "pending_approval"
                ? "approval_requested"
                : undefined,
            reasonCode:
              toolResult.status === "error"
                ? resolveKanzleiAuditReasonCode(toolResult)
                : undefined,
            outcome: toolResult.status,
            metadata: {
              phase: args.phase,
              error: toolResult.error || null,
            },
          });
        }
      }
    };
    await enterRuntimeKernelStage("tool_dispatch", {
      sessionId: session._id,
      turnId: runtimeTurnId,
      agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
      correlationId: getSamanthaDispatchTraceCorrelationId(),
    });

    const initialToolExecution = await executeToolCallsWithApproval({
      toolCalls: toolCalls as Array<{ function?: { name?: string; arguments?: unknown } }>,
      organizationId: args.organizationId,
      agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
      sessionId: session._id,
      autonomyLevel: effectiveAutonomyLevel,
      requireApprovalFor: delegationAuthorityContract.authorityRequireApprovalFor,
      complianceMode: authorityConfig.complianceMode,
      industry: authorityConfig.industry,
      orgPolicyRef: authorityConfig.orgPolicyRef,
      kanzleiFailClosedMode: authorityConfig.kanzleiFailClosed === true,
      kanzleiApprovedExternalToolNames: authorityConfig.kanzleiApprovedExternalTools,
      kanzleiApprovedSkillIds: authorityConfig.kanzleiApprovedSkills,
      toolExecutionContext: toolCtx,
      failedToolCounts,
      disabledTools,
      nonDisableableTools: mandatoryRuntimeTools,
      createApprovalRequest: createToolApprovalRequest,
      onToolDisabled: handleToolDisabled,
      runtimeHooks: runtimeToolHooks,
    });
    await recordKanzleiToolAuditEvents({
      phase: "initial_dispatch",
      toolResults: initialToolExecution.toolResults,
    });
    const toolResults = [...initialToolExecution.toolResults];
    let errorStateDirty = initialToolExecution.errorStateDirty;
    const blockedCapabilityGap = initialToolExecution.blockedCapabilityGap;
    const runtimeCapabilityGapBlockedResponse = blockedCapabilityGap
      ? buildRuntimeCapabilityGapBlockedResponse({
          capabilityGap: blockedCapabilityGap,
        })
      : null;
    let runtimeCapabilityGapLinearIssue: RuntimeCapabilityGapLinearIssueResult | null = null;
    let runtimeCapabilityGapBacklogInsertStatus: "inserted" | "updated" | "error" = "error";
    const runtimeCapabilityGapTicketRequestIntent =
      detectRuntimeCapabilityGapTicketRequestIntent({
        inboundMessage,
      });
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
        const persistResult = await ctx.runMutation(
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
        runtimeCapabilityGapBacklogInsertStatus =
          persistResult?.status === "inserted" || persistResult?.status === "updated"
            ? persistResult.status
            : "error";

        const shouldCreateLinearIssue =
          runtimeCapabilityGapBacklogInsertStatus === "inserted";
        if (shouldCreateLinearIssue) {
          try {
            const linearIssue = await ctx.runAction(
              getInternal().ai.linearActions.createFeatureRequestIssue,
              {
                userName: "Anonymous Native Guest",
                userEmail: "native-guest@unknown.local",
                organizationName: organization.name,
                toolName: blockedCapabilityGap.missing.requestedToolName,
                featureDescription: blockedCapabilityGap.missing.summary,
                userMessage: inboundMessage,
                userElaboration: undefined,
                category: "runtime_capability_gap",
                conversationId: String(session._id),
                occurredAt: runtimeCapabilityGapBlockedResponse.proposalArtifact.createdAt,
              },
            ) as RuntimeCapabilityGapLinearIssueResult;
            runtimeCapabilityGapLinearIssue = linearIssue;
            try {
              await ctx.runMutation(
                getInternal().ai.toolFoundry.proposalBacklog.attachLinearIssueToProposal,
                {
                  organizationId: args.organizationId,
                  proposalKey: blockedCapabilityGap.proposalArtifact.proposalKey,
                  issueId: linearIssue.issueId,
                  issueNumber: linearIssue.issueNumber,
                  issueUrl: linearIssue.issueUrl,
                  linkedAt: runtimeCapabilityGapBlockedResponse.proposalArtifact.createdAt,
                },
              );
            } catch (persistLinearIssueError) {
              console.error("[AgentExecution] Failed to persist Linear issue link on Tool Foundry backlog", {
                proposalKey: blockedCapabilityGap.proposalArtifact.proposalKey,
                sessionId: session._id,
                persistLinearIssueError,
              });
            }
          } catch (linearError) {
            console.error("[AgentExecution] Failed to create Linear issue for runtime capability gap", {
              proposalKey: blockedCapabilityGap.proposalArtifact.proposalKey,
              sessionId: session._id,
              linearError,
            });
          }
        }
      } catch (error) {
        console.error("[AgentExecution] Failed to persist Tool Foundry proposal backlog", {
          proposalKey: blockedCapabilityGap.proposalArtifact.proposalKey,
          sessionId: session._id,
          error,
        });
      }
    }
    if (runtimeCapabilityGapBlockedResponse) {
      recordSamanthaDispatchEvent({
        stage: "samantha_auto_dispatch_gate",
        status: "skip",
        reasonCode: "runtime_capability_gap_blocked",
        detail: {
          missingTool: runtimeCapabilityGapBlockedResponse.missing.requestedToolName,
        },
      });
      assistantContent = formatRuntimeCapabilityGapBlockedMessage({
        blocked: runtimeCapabilityGapBlockedResponse,
        language: actionCompletionResponseLanguage,
        ticketRequestIntent: runtimeCapabilityGapTicketRequestIntent,
        linearIssue: runtimeCapabilityGapLinearIssue,
        backlogInsertStatus: runtimeCapabilityGapBacklogInsertStatus,
      });
      await scheduleRuntimeIncidentAlert({
        incidentType: "runtime_capability_gap_blocked",
        turnId: runtimeTurnId,
        proposalKey: runtimeCapabilityGapBlockedResponse.proposalArtifact.proposalKey,
        tool: runtimeCapabilityGapBlockedResponse.missing.requestedToolName,
        reasonCode: runtimeCapabilityGapBlockedResponse.reasonCode,
        reason: runtimeCapabilityGapBlockedResponse.reason,
        linearIssueId: runtimeCapabilityGapLinearIssue?.issueId,
        linearIssueUrl: runtimeCapabilityGapLinearIssue?.issueUrl,
        metadata: {
          backlogInsertStatus: runtimeCapabilityGapBacklogInsertStatus,
          ticketRequestIntent: runtimeCapabilityGapTicketRequestIntent,
        },
      });
    }
    const actionCompletionRawAssistantContent = assistantContent;
    const actionCompletionClaims = extractActionCompletionClaimsFromAssistantContent(
      assistantContent
    );
    assistantContent = actionCompletionClaims.sanitizedContent;
    let actionCompletionEnforcementPayload:
      | ActionCompletionContractEnforcementPayload
      | null = null;
    let actionCompletionRewriteApplied = false;
    let actionCompletionLinearIssue: RuntimeCapabilityGapLinearIssueResult | null = null;
    let samanthaCapabilityGapFallbackDelivery:
      | {
          leadEmailDelivery?: {
            success: boolean;
            skipped?: boolean;
            reason?: string;
            error?: string;
            messageId?: string;
          };
          salesEmailDelivery?: {
            success: boolean;
            skipped?: boolean;
            reason?: string;
            error?: string;
            messageId?: string;
          };
        }
      | null = null;
    let samanthaAuditAutoDispatchPlan: SamanthaAuditAutoDispatchPlan | null = null;
    let samanthaAuditAutoDispatchAttempted = false;
    let samanthaAuditAutoDispatchExecuted = false;
    let samanthaAuditRecoveryAttempted = false;
    let samanthaAuditAutoDispatchToolResults: AgentToolResult[] = [];
    let samanthaAuditDispatchDecision: SamanthaAuditDispatchDecision | undefined;
    let samanthaAutoDispatchInvocationStatus: SamanthaAutoDispatchInvocationStatus = "not_attempted";
    let samanthaClaimRecoveryDecision: SamanthaClaimRecoveryDecision = {
      shouldAttempt: false,
      reasonCode: "plan_missing",
    };
    let preflightAuditSessionFound: boolean | undefined;
    let samanthaDispatchTerminalReasonCode = runtimeCapabilityGapBlockedResponse
      ? "runtime_capability_gap_blocked"
      : "auto_dispatch_pending";
    const actionCompletionAuthorityConfig =
      authorityConfig as unknown as Record<string, unknown>;
    const samanthaAutoDispatchRuntime = await executeSamanthaAutoDispatchRuntimeFlow({
      runtimeCapabilityGapBlocked: Boolean(runtimeCapabilityGapBlockedResponse),
      organizationId: String(args.organizationId),
      authorityAgentId: String(delegationAuthorityContract.authorityAgentId),
      sessionId: String(session._id),
      turnId: String(runtimeTurnId),
      authorityConfig: actionCompletionAuthorityConfig,
      inboundMessage,
      assistantContent,
      actionCompletionRawAssistantContent,
      actionCompletionResponseLanguage,
      toolCalls: toolCalls as Array<{ function?: { name?: unknown } }>,
      availableToolNames: toolScopingAudit.finalToolNames,
      toolResults,
      sessionHistorySnapshot,
      contactMemory,
      samanthaAuditSourceContext,
      samanthaDispatchTraceCorrelationId: getSamanthaDispatchTraceCorrelationId(),
      errorStateDirty,
      recordSamanthaDispatchEvent,
      resolveAuditSessionForDeliverableInternal: async ({
        organizationId,
        channel,
        sessionToken,
      }) =>
        await ctx.runQuery(
          getInternal().onboarding.auditDeliverable.resolveAuditSessionForDeliverableInternal,
          {
            organizationId,
            channel,
            sessionToken,
          },
        ) as {
          capturedEmail?: string;
          capturedName?: string;
          workflowRecommendation?: string;
        } | null,
      ensureAuditModeSessionForDeliverable: async (bootstrapArgs) => {
        await ctx.runMutation(
          getInternal().onboarding.auditMode.ensureAuditModeSessionForDeliverable,
          {
            organizationId: bootstrapArgs.organizationId,
            agentId: bootstrapArgs.agentId as Id<"objects">,
            channel: bootstrapArgs.channel,
            sessionToken: bootstrapArgs.sessionToken,
            workflowRecommendation: bootstrapArgs.workflowRecommendation,
            capturedEmail: bootstrapArgs.capturedEmail,
            capturedName: bootstrapArgs.capturedName,
            metadata: bootstrapArgs.metadata,
          },
        );
      },
      executeAutoDispatchToolCall: async ({ toolArgs }) => {
        const autoDispatchExecution = await executeToolCallsWithApproval({
          toolCalls: [
            {
              function: {
                name: AUDIT_DELIVERABLE_TOOL_NAME,
                arguments: JSON.stringify(toolArgs),
              },
            },
          ],
          organizationId: args.organizationId,
          agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
          sessionId: session._id,
          autonomyLevel: effectiveAutonomyLevel,
          requireApprovalFor: delegationAuthorityContract.authorityRequireApprovalFor,
          complianceMode: authorityConfig.complianceMode,
          industry: authorityConfig.industry,
          orgPolicyRef: authorityConfig.orgPolicyRef,
          kanzleiFailClosedMode: authorityConfig.kanzleiFailClosed === true,
          kanzleiApprovedExternalToolNames: authorityConfig.kanzleiApprovedExternalTools,
          kanzleiApprovedSkillIds: authorityConfig.kanzleiApprovedSkills,
          toolExecutionContext: toolCtx,
          failedToolCounts,
          disabledTools,
          nonDisableableTools: mandatoryRuntimeTools,
          createApprovalRequest: createToolApprovalRequest,
          onToolDisabled: handleToolDisabled,
          runtimeHooks: runtimeToolHooks,
        });
        await recordKanzleiToolAuditEvents({
          phase: "samantha_auto_dispatch",
          toolResults: autoDispatchExecution.toolResults,
        });
        return {
          toolResults: autoDispatchExecution.toolResults,
          errorStateDirty: autoDispatchExecution.errorStateDirty,
        };
      },
      resolveAuditDeliverableInvocationGuardrail,
      resolveActionCompletionResponseLanguage,
      extractActionCompletionClaimsFromAssistantContent,
      onError: (message, meta) => {
        console.error(message, meta);
      },
      onWarn: (message, meta) => {
        console.warn(message, meta);
      },
    });
    const preflightAuditLookupTarget = samanthaAutoDispatchRuntime.preflightAuditLookupTarget;
    const preflightAuditSession = samanthaAutoDispatchRuntime.preflightAuditSession;
    const recentUserMessagesForPreflight =
      samanthaAutoDispatchRuntime.recentUserMessagesForPreflight;
    const actionCompletionEnforcement =
      samanthaAutoDispatchRuntime.actionCompletionEnforcement;
    assistantContent = samanthaAutoDispatchRuntime.assistantContent;
    actionCompletionEnforcementPayload =
      samanthaAutoDispatchRuntime.actionCompletionEnforcementPayload;
    actionCompletionRewriteApplied =
      samanthaAutoDispatchRuntime.actionCompletionRewriteApplied;
    samanthaAuditAutoDispatchPlan =
      samanthaAutoDispatchRuntime.samanthaAuditAutoDispatchPlan;
    samanthaAuditAutoDispatchAttempted =
      samanthaAutoDispatchRuntime.samanthaAuditAutoDispatchAttempted;
    samanthaAuditAutoDispatchExecuted =
      samanthaAutoDispatchRuntime.samanthaAuditAutoDispatchExecuted;
    samanthaAuditRecoveryAttempted =
      samanthaAutoDispatchRuntime.samanthaAuditRecoveryAttempted;
    samanthaAuditAutoDispatchToolResults =
      samanthaAutoDispatchRuntime.samanthaAuditAutoDispatchToolResults;
    samanthaAuditDispatchDecision =
      samanthaAutoDispatchRuntime.samanthaAuditDispatchDecision;
    samanthaAutoDispatchInvocationStatus =
      samanthaAutoDispatchRuntime.samanthaAutoDispatchInvocationStatus;
    samanthaClaimRecoveryDecision =
      samanthaAutoDispatchRuntime.samanthaClaimRecoveryDecision;
    preflightAuditSessionFound = samanthaAutoDispatchRuntime.preflightAuditSessionFound;
    samanthaDispatchTerminalReasonCode =
      samanthaAutoDispatchRuntime.samanthaDispatchTerminalReasonCode;
    errorStateDirty = samanthaAutoDispatchRuntime.errorStateDirty;
    const samanthaCapabilityGapUnavailableHandling =
      await executeSamanthaCapabilityGapUnavailableHandling({
        organizationId: String(args.organizationId),
        organizationName: organization.name,
        sessionId: String(session._id),
        turnId: String(runtimeTurnId),
        inboundMessage,
        assistantContent,
        actionCompletionTicketRequestIntent,
        actionCompletionResponseLanguage,
        actionCompletionEnforcement,
        actionCompletionEnforcementPayload,
        actionCompletionLinearIssue,
        samanthaCapabilityGapFallbackDelivery,
        recentUserMessagesForPreflight,
        preflightAuditSession,
        preflightAuditLookupTarget: preflightAuditLookupTarget.ok
          ? {
              ok: true,
              channel: preflightAuditLookupTarget.channel,
              sessionToken: preflightAuditLookupTarget.sessionToken,
            }
          : {
              ok: false,
            },
        sourceAuditContext: samanthaAuditSourceContext,
        runtimeIncident: {
          proposalKey: runtimeContracts.idempotencyContract.scopeKey,
          manifestHash: requiredScopeManifest?.manifestHash,
          idempotencyKey: inboundIdempotencyKey,
          idempotencyScopeKey: runtimeContracts.idempotencyContract.scopeKey,
          payloadHash: runtimeContracts.idempotencyContract.payloadHash,
        },
        formatCapabilityGapLinearIssueLine: ({ language, linearIssue }) =>
          formatCapabilityGapLinearIssueLine({
            language,
            linearIssue,
          }),
        createFeatureRequestIssue: async (payload) =>
          await ctx.runAction(
            getInternal().ai.linearActions.createFeatureRequestIssue,
            payload,
          ) as RuntimeCapabilityGapLinearIssueResult,
        notifyRuntimeIncident: async (payload) =>
          await ctx.runAction(
            getInternal().ai.runtimeIncidentAlerts.notifyRuntimeIncident,
            {
              ...payload,
              organizationId: args.organizationId,
              sessionId: session._id,
              turnId: runtimeTurnId,
            },
          ) as {
            success?: boolean;
            emitted?: boolean;
            deduped?: boolean;
            threadDeepLink?: string;
          } | null,
        scheduleRuntimeIncidentAlert: async (payload) =>
          await scheduleRuntimeIncidentAlert({
            incidentType: payload.incidentType,
            turnId: runtimeTurnId,
            proposalKey: payload.proposalKey,
            tool: payload.tool,
            reasonCode: payload.reasonCode,
            reason: payload.reason,
            linearIssueId: payload.linearIssueId,
            linearIssueUrl: payload.linearIssueUrl,
            metadata: payload.metadata,
          }),
        buildRuntimeIncidentThreadDeepLink: ({ proposalKey }) =>
          buildRuntimeIncidentThreadDeepLink({
            sessionId: session._id,
            proposalKey,
          }),
        resolveAuditSessionForLookupTarget: async ({ channel, sessionToken }) =>
          await ctx.runQuery(
            getInternal().onboarding.auditDeliverable.resolveAuditSessionForDeliverableInternal,
            {
              organizationId: args.organizationId,
              channel,
              sessionToken,
            },
          ) as { capturedEmail?: string; capturedName?: string } | null,
        resolveDomainConfigIdForOrg: async () =>
          await resolveActiveEmailDomainConfigIdForOrg(
            ctx,
            args.organizationId,
          ),
        sendEmail: async ({ domainConfigId, to, subject, html, text }) =>
          await ctx.runAction(
            getInternal().emailDelivery.sendEmail,
            {
              domainConfigId,
              to,
              subject,
              html,
              text,
            },
          ) as { success?: boolean; messageId?: string; error?: string } | null,
        onError: (message, meta) => {
          console.error(message, meta);
        },
      });
    assistantContent = samanthaCapabilityGapUnavailableHandling.assistantContent;
    actionCompletionLinearIssue =
      samanthaCapabilityGapUnavailableHandling.actionCompletionLinearIssue;
    samanthaCapabilityGapFallbackDelivery =
      samanthaCapabilityGapUnavailableHandling.samanthaCapabilityGapFallbackDelivery;
    const samanthaPostOutputGuardrails = executeSamanthaPostOutputGuardrails({
      assistantContent,
      toolResults,
      actionCompletionResponseLanguage,
      authorityConfig: actionCompletionAuthorityConfig,
      resolveActionCompletionSanitizationFallbackMessage: () =>
        buildActionCompletionSanitizationFallbackMessage({
          contractConfig: actionCompletionContractConfig,
          claims: actionCompletionClaims.claims,
          malformedClaimCount: actionCompletionClaims.malformedClaimCount,
          language: actionCompletionResponseLanguage,
        }),
      recordSamanthaDispatchEvent,
    });
    assistantContent = samanthaPostOutputGuardrails.assistantContent;
    const actionCompletionSanitizationFallbackApplied =
      samanthaPostOutputGuardrails.actionCompletionSanitizationFallbackApplied;
    const actionCompletionClaimedOutcomes = Array.from(
      new Set(
        actionCompletionClaims.claims
          .map((claim) => normalizeExecutionString(claim.outcome))
          .filter((outcome): outcome is string => Boolean(outcome))
      )
    ).sort((left, right) => left.localeCompare(right));
    const authorityAgentRoutingSnapshot = resolveSamanthaRoutingAgentSnapshot(authorityAgent);
    const speakerAgentRoutingSnapshot = resolveSamanthaRoutingAgentSnapshot(agent);
    const samanthaTelemetryFinalization = executeSamanthaPostDispatchTelemetryFinalization({
      inboundMessage,
      actionCompletionClaimedOutcomes,
      runtimeCapabilityGapBlocked: Boolean(runtimeCapabilityGapBlockedResponse),
      preflightAuditLookupTarget,
      preflightAuditSessionFound,
      authorityAgentRoutingSnapshot,
      speakerAgentRoutingSnapshot,
      inboundDispatchRouteSelectors,
      samanthaDispatchRouterSelectionPath,
      samanthaDispatchTraceCorrelationId: getSamanthaDispatchTraceCorrelationId(),
      samanthaDispatchTraceEvents,
      samanthaAuditAutoDispatchPlan,
      samanthaAuditAutoDispatchAttempted,
      samanthaAuditAutoDispatchExecuted,
      samanthaAuditRecoveryAttempted,
      samanthaAuditAutoDispatchToolResults,
      samanthaAuditDispatchDecision,
      samanthaAutoDispatchInvocationStatus,
      samanthaClaimRecoveryDecision,
      samanthaDispatchTerminalReasonCode,
      recordSamanthaDispatchEvent,
    });
    samanthaAutoDispatchInvocationStatus =
      samanthaTelemetryFinalization.samanthaAutoDispatchInvocationStatus;
    samanthaDispatchTerminalReasonCode =
      samanthaTelemetryFinalization.samanthaDispatchTerminalReasonCode;
    const actionCompletionTelemetry = {
      contractVersion: ACTION_COMPLETION_ENFORCEMENT_CONTRACT_VERSION,
      templateContractVersion: actionCompletionContractConfig.contractVersion,
      enforcementMode: actionCompletionContractConfig.mode,
      source: actionCompletionContractConfig.source,
      templateRole:
        normalizeExecutionString(authorityConfigRecord?.templateRole) ?? undefined,
      templateAgentId:
        normalizeExecutionString(authorityConfigRecord?.templateAgentId) ?? undefined,
      claimedOutcomes: actionCompletionClaimedOutcomes,
      malformedClaimCount: actionCompletionClaims.malformedClaimCount,
      rewriteApplied: actionCompletionRewriteApplied,
      sanitizationFallbackApplied: actionCompletionSanitizationFallbackApplied,
      responseLanguage: actionCompletionResponseLanguage,
      ticketRequestIntent: actionCompletionTicketRequestIntent,
      linearIssue: actionCompletionLinearIssue
        ? {
            issueNumber: actionCompletionLinearIssue.issueNumber,
            issueUrl: actionCompletionLinearIssue.issueUrl,
          }
        : undefined,
      samanthaCapabilityGapFallbackDelivery:
        samanthaCapabilityGapFallbackDelivery ?? undefined,
      samanthaAutoDispatch: samanthaTelemetryFinalization.samanthaAutoDispatchTelemetry,
      payload: actionCompletionEnforcementPayload ?? undefined,
    };

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
            notifyTelegram: async (payload) => {
              await ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationTelegram, payload);
            },
            notifyPushover: async (payload) => {
              await ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationPushover, payload);
            },
            notifyEmail: async (payload) => {
              await ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationEmail, payload);
            },
            notifyHighUrgencyRetry: async (payload) => {
              await ctx.scheduler.runAfter(5 * 60 * 1000, getInternal().ai.escalation.retryHighUrgencyEmail, payload);
            },
            onTransitionError: (error) => {
              console.warn("[AgentExecution] Failed to append tool escalation turn edge", error);
            },
          });
          await scheduleRuntimeIncidentAlert({
            incidentType: "delivery_blocked_escalated",
            turnId: runtimeTurnId,
            reasonCode: toolEsc.triggerType,
            reason: toolEsc.reason,
            metadata: {
              lifecycleState: "escalated",
              deliveryState: "blocked",
              checkpoint: "tool_failure_escalation",
            },
          });
        }
      }
    }
    await invokeRuntimeAgentHook("completionPolicy", {
      sessionId: session._id,
      turnId: runtimeTurnId,
      agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
      metadata: {
        runtimeCapabilityGapBlocked: Boolean(runtimeCapabilityGapBlockedResponse),
        actionCompletionRewriteApplied,
      },
    });
    const runtimeHookOrderValidation = validateAgentRuntimeHookExecutionOrder(
      observedAgentRuntimeHookOrder
    );
    if (!runtimeHookOrderValidation.valid) {
      throw new Error(
        `[AgentExecution] runtime hook order contract violation (${runtimeHookOrderValidation.reasonCode})`
      );
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
          notifyTelegram: async (payload) => {
            await ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationTelegram, payload);
          },
          notifyPushover: async (payload) => {
            await ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationPushover, payload);
          },
          notifyEmail: async (payload) => {
            await ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationEmail, payload);
          },
          notifyHighUrgencyRetry: async (payload) => {
            await ctx.scheduler.runAfter(5 * 60 * 1000, getInternal().ai.escalation.retryHighUrgencyEmail, payload);
          },
          onTransitionError: (error) => {
            console.warn("[AgentExecution] Failed to append post-LLM escalation turn edge", error);
          },
        });
        await scheduleRuntimeIncidentAlert({
          incidentType: "delivery_blocked_escalated",
          turnId: runtimeTurnId,
          reasonCode: postEscalation.triggerType,
          reason: postEscalation.reason,
          metadata: {
            lifecycleState: "escalated",
            deliveryState: "blocked",
            checkpoint: "post_llm_escalation",
          },
        });
        if (postEscalation.triggerType === "response_loop") {
          await scheduleRuntimeIncidentAlert({
            incidentType: "response_loop",
            turnId: runtimeTurnId,
            reasonCode: "response_loop",
            reason: postEscalation.reason,
            metadata: {
              lifecycleState: "escalated",
              deliveryState: "blocked",
              checkpoint: "post_llm_escalation",
            },
          });
        }
        // Note: still send the LLM response (already generated) but now team is notified
      }
    }

    const runtimeFailureMessageGuard = sanitizeUserFacingRuntimeFailureMessage({
      assistantContent,
      language: actionCompletionResponseLanguage,
    });
    if (runtimeFailureMessageGuard.rewritten) {
      assistantContent = runtimeFailureMessageGuard.assistantContent;
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

    let sessionCrmContactId: Id<"objects"> | undefined;
    try {
      const latestSessionRecord = await ctx.runQuery(
        getInternal().ai.agentSessions.getSessionByIdInternal,
        { sessionId: session._id },
      ) as { crmContactId?: Id<"objects"> } | null;
      sessionCrmContactId =
        latestSessionRecord?.crmContactId
        ?? (session as { crmContactId?: Id<"objects"> }).crmContactId;
    } catch {
      sessionCrmContactId = (session as { crmContactId?: Id<"objects"> }).crmContactId;
    }

    let orgAgentActivityObjectId: Id<"objects"> | undefined;
    try {
      const orgAgentActivityWrite = await ctx.runMutation(
        getInternal().ai.orgAgentActivities.recordSessionOutcomeActivity,
        {
        organizationId: args.organizationId,
        sessionId: session._id,
        agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
        channel: args.channel,
        activityKind: "session_outcome_captured",
        turnId: runtimeTurnId,
        correlationId: requestCorrelationId,
        summary: assistantContent,
        userMessage: inboundMessage,
        assistantMessage: assistantContent,
        crmContactId: sessionCrmContactId,
        metadata: {
          toolResults: toolResults.map((result) => ({
            tool: result.tool,
            status: result.status,
          })),
          actionCompletionClaimCount: actionCompletionClaims.claims.length,
          actionCompletionMalformedClaimCount:
            actionCompletionClaims.malformedClaimCount,
          runtimeCapabilityGapBlocked: Boolean(runtimeCapabilityGapBlockedResponse),
        },
      }) as {
        activityObjectId?: Id<"objects">;
        activityKind?: string;
      } | null;
      orgAgentActivityObjectId = orgAgentActivityWrite?.activityObjectId;

      try {
        await ctx.runMutation(getInternal().activityProtocol.logEvent, {
          organizationId: args.organizationId,
          applicationId:
            delegationAuthorityContract.authorityAgentId as Id<"objects">,
          eventType: "org_agent_activity_recorded",
          severity: "info",
          category: "object",
          summary: "Org agent activity appended to canonical timeline.",
          details: {
            objectType: "org_agent_activity",
            objectId: orgAgentActivityWrite?.activityObjectId,
            inputSummary: `session:${String(session._id)}`,
            outputSummary: orgAgentActivityWrite?.activityKind || "session_outcome_captured",
            correlationId: requestCorrelationId,
            idempotencyKey: inboundIdempotencyKey,
            idempotencyScopeKey: runtimeContracts.idempotencyContract.scopeKey,
            sessionId: String(session._id),
            turnId: runtimeTurnId,
            receiptId: runtimeReceiptId ? String(runtimeReceiptId) : undefined,
            workflowStage: "session_capture",
            activityKind: orgAgentActivityWrite?.activityKind || "session_outcome_captured",
          },
        });
      } catch (activityProtocolError) {
        console.warn("[AgentExecution] Failed to log org agent activity protocol event", {
          organizationId: args.organizationId,
          sessionId: session._id,
          turnId: runtimeTurnId,
          error:
            activityProtocolError instanceof Error
              ? activityProtocolError.message
              : String(activityProtocolError),
        });
      }
    } catch (orgActivityError) {
      console.warn("[AgentExecution] Failed to persist org agent activity", {
        organizationId: args.organizationId,
        sessionId: session._id,
        turnId: runtimeTurnId,
        error:
          orgActivityError instanceof Error
            ? orgActivityError.message
            : String(orgActivityError),
      });
    }

    try {
      const crmProjectionResult = await ctx.runMutation(
        getInternal().ai.orgCrmProjection.projectSessionOutcomeToCanonicalCrm,
        {
          organizationId: args.organizationId,
          sessionId: session._id,
          agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
          channel: args.channel,
          activityObjectId: orgAgentActivityObjectId,
          turnId: runtimeTurnId,
          correlationId: requestCorrelationId,
          summary: assistantContent,
          userMessage: inboundMessage,
          assistantMessage: assistantContent,
          crmContactId: sessionCrmContactId,
          metadata: {
            toolResults: toolResults.map((result) => ({
              tool: result.tool,
              status: result.status,
            })),
            actionCompletionClaimCount: actionCompletionClaims.claims.length,
            actionCompletionMalformedClaimCount:
              actionCompletionClaims.malformedClaimCount,
            runtimeCapabilityGapBlocked: Boolean(runtimeCapabilityGapBlockedResponse),
          },
        },
      ) as {
        projectionObjectId?: Id<"objects">;
        syncCandidateObjectId?: Id<"objects">;
      } | null;

      try {
        await ctx.runMutation(getInternal().activityProtocol.logEvent, {
          organizationId: args.organizationId,
          applicationId:
            delegationAuthorityContract.authorityAgentId as Id<"objects">,
          eventType: "org_crm_projection_applied",
          severity: "info",
          category: "object",
          summary: "Canonical CRM projection completed and sync candidate enqueued.",
          details: {
            objectType: "crm_activity",
            objectId: crmProjectionResult?.projectionObjectId,
            inputSummary: `session:${String(session._id)}`,
            outputSummary: crmProjectionResult?.syncCandidateObjectId
              ? "sync_candidate_enqueued"
              : "projection_only",
            correlationId: requestCorrelationId,
            idempotencyKey: inboundIdempotencyKey,
            idempotencyScopeKey: runtimeContracts.idempotencyContract.scopeKey,
            sessionId: String(session._id),
            turnId: runtimeTurnId,
            receiptId: runtimeReceiptId ? String(runtimeReceiptId) : undefined,
            workflowStage: "canonical_projection",
            activityKind: "crm_projection_applied",
          },
        });
      } catch (crmProjectionActivityProtocolError) {
        console.warn("[AgentExecution] Failed to log CRM projection activity protocol event", {
          organizationId: args.organizationId,
          sessionId: session._id,
          turnId: runtimeTurnId,
          error:
            crmProjectionActivityProtocolError instanceof Error
              ? crmProjectionActivityProtocolError.message
              : String(crmProjectionActivityProtocolError),
        });
      }
    } catch (crmProjectionError) {
      console.warn("[AgentExecution] Failed canonical CRM projection write", {
        organizationId: args.organizationId,
        sessionId: session._id,
        turnId: runtimeTurnId,
        error:
          crmProjectionError instanceof Error
            ? crmProjectionError.message
            : String(crmProjectionError),
      });
    }

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
      skippedReason?: string;
      extractedCandidateCount?: number;
      eligibleCandidateCount?: number;
      insertedCount?: number;
      supersededCount?: number;
      ambiguousFields?: string[];
    } | null;
    const contactMemorySkippedReason =
      normalizeRuntimeContactMemorySkipReason(contactMemoryRefresh?.skippedReason)
      ?? (
        !contactMemoryRefresh?.success
        && normalizeRuntimeNonEmptyString(contactMemoryRefresh?.reason) === "no_eligible_sources"
          ? "no_eligible_sources"
          : null
      );
    if (contactMemorySkippedReason) {
      console.info("[AgentExecution] Structured contact memory refresh skipped", {
        organizationId: args.organizationId,
        sessionId: session._id,
        turnId: runtimeTurnId,
        skippedReason: contactMemorySkippedReason,
        extractedCandidateCount: normalizeRuntimeCount(
          contactMemoryRefresh?.extractedCandidateCount
        ),
        eligibleCandidateCount: normalizeRuntimeCount(
          contactMemoryRefresh?.eligibleCandidateCount
        ),
      });
    } else if (!contactMemoryRefresh?.success) {
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
    const runtimeElapsedMs = Date.now() - runtimeGovernorStartedAt;
    const meetingConciergeDecisionTelemetry = buildMeetingConciergeDecisionTelemetry({
      intent: meetingConciergeIntent,
      toolResults,
      runtimeElapsedMs,
      latencyTargetMs: 60_000,
      demoOutcomeTargetMs: 20_000,
      demoOutcomeIngestBudgetMs: 4_000,
    });
    let complianceShadowModeEvaluation: ComplianceShadowModeEvaluationResult | null = null;
    try {
      const complianceShadowSurface = resolveComplianceShadowModeSurfaceForInbound({
        channel: args.channel,
        metadata: inboundMetadata,
      });
      const evaluation = await ctx.runQuery(
        (getInternal() as any).complianceControlPlane
          .evaluateNonComplianceSurfaceShadowModeInternal,
        {
          organizationId: args.organizationId,
          surface: complianceShadowSurface,
        },
      );
      if (evaluation && typeof evaluation === "object") {
        complianceShadowModeEvaluation =
          evaluation as ComplianceShadowModeEvaluationResult;
      }

      if (shouldEmitComplianceShadowModeWouldBlockTelemetry(complianceShadowModeEvaluation)) {
        await ctx.runMutation(
          (getInternal() as any).complianceControlPlane
            .recordNonComplianceShadowModeTelemetryInternal,
          {
            organizationId: args.organizationId,
            sessionId: session._id,
            turnId: runtimeTurnId,
            channel: args.channel,
            surface: complianceShadowModeEvaluation!.surface,
            evaluationStatus: complianceShadowModeEvaluation!.evaluationStatus,
            wouldBlock: true,
            reasonCode: complianceShadowModeEvaluation!.reasonCode,
            blockerCount: complianceShadowModeEvaluation!.blockerCount,
            blockerIds: complianceShadowModeEvaluation!.blockerIds,
            evaluatorEnabled: complianceShadowModeEvaluation!.evaluatorEnabled,
            surfaceEnabled: complianceShadowModeEvaluation!.surfaceEnabled,
            strictEnforcementEnabled:
              complianceShadowModeEvaluation!.strictEnforcementEnabled,
            metadata: {
              contractVersion: complianceShadowModeEvaluation!.contractVersion,
              effectiveGateStatus:
                complianceShadowModeEvaluation!.effectiveGateStatus,
              nonComplianceSurface:
                complianceShadowModeEvaluation!.nonComplianceSurface,
            },
            occurredAt: complianceShadowModeEvaluation!.evaluatedAt,
          },
        );
      }
    } catch (complianceShadowModeError) {
      console.error(
        "[AgentExecution] Failed to evaluate/record compliance shadow mode telemetry",
        {
          organizationId: args.organizationId,
          channel: args.channel,
          error: complianceShadowModeError,
        },
      );
    }

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
            elapsedMs: runtimeElapsedMs,
          },
          generation: {
            temperature: usedComposerGenerationSettings.temperature,
            maxTokens: usedComposerGenerationSettings.maxTokens,
            reasoningMode: usedReasoningMode,
            reasoningParamKind: usedReasoningParamKind,
            reasoningProviderId: usedReasoningProviderId,
            reasoningResolution: usedReasoningReason,
          },
          runtimeHooks: {
            contractVersion: AGENT_RUNTIME_HOOK_CONTRACT_VERSION,
            observedOrder: observedAgentRuntimeHookOrder,
            orderValidation: runtimeHookOrderValidation,
          },
        },
        complianceShadowMode: complianceShadowModeEvaluation
          ? {
              contractVersion: complianceShadowModeEvaluation.contractVersion,
              evaluatedAt: complianceShadowModeEvaluation.evaluatedAt,
              surface: complianceShadowModeEvaluation.surface,
              nonComplianceSurface:
                complianceShadowModeEvaluation.nonComplianceSurface,
              evaluationStatus: complianceShadowModeEvaluation.evaluationStatus,
              evaluatorEnabled: complianceShadowModeEvaluation.evaluatorEnabled,
              surfaceEnabled: complianceShadowModeEvaluation.surfaceEnabled,
              strictEnforcementEnabled:
                complianceShadowModeEvaluation.strictEnforcementEnabled,
              wouldBlock: complianceShadowModeEvaluation.wouldBlock,
              effectiveGateStatus:
                complianceShadowModeEvaluation.effectiveGateStatus,
              blockerCount: complianceShadowModeEvaluation.blockerCount,
              blockerIds: complianceShadowModeEvaluation.blockerIds,
              reasonCode: complianceShadowModeEvaluation.reasonCode,
            }
          : undefined,
        meetingConcierge: meetingConciergeIntent.enabled
          ? {
              enabled: true,
              runtimeModuleKey: meetingConciergeIntent.runtimeModuleKey ?? null,
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
              decisionTelemetry: meetingConciergeDecisionTelemetry,
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
        runtimeModuleRouting: runtimeModuleIntentRouting,
        memory: runtimeMemoryTelemetry,
        knowledgeLoad: systemKnowledgeLoad.telemetry,
        toolScoping: {
          ...toolScopingAudit,
          requiredScopeManifest,
          ...(requiredScopeDelegationDeliveryOverride ? {
            requiredScopeContract: requiredScopeDelegationDeliveryOverride.requiredScopeContract,
            requiredScopeGap: requiredScopeDelegationDeliveryOverride.requiredScopeGap,
            requiredScopeFallback: requiredScopeDelegationDeliveryOverride.requiredScopeFallback,
          } : {}),
        },
        crossOrgEnrichment: crossOrgSoulReadOnlyEnrichmentRuntime.telemetry,
        actionCompletion: actionCompletionTelemetry,
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
    const actionCompletionIncidentPayload =
      actionCompletionTelemetry.payload?.observedViolation === true
        ? {
            contractVersion: ACTION_COMPLETION_ENFORCEMENT_CONTRACT_VERSION,
            enforcementMode: actionCompletionTelemetry.enforcementMode,
            source: actionCompletionTelemetry.source,
            templateRole: actionCompletionTelemetry.templateRole ?? null,
            templateAgentId: actionCompletionTelemetry.templateAgentId ?? null,
            sessionId: session._id,
            turnId: runtimeTurnId,
            channel: args.channel,
            rewriteApplied: actionCompletionTelemetry.rewriteApplied === true,
            claimedOutcomes: actionCompletionTelemetry.claimedOutcomes,
            malformedClaimCount: actionCompletionTelemetry.malformedClaimCount,
            payload: actionCompletionTelemetry.payload,
          }
        : null;
    if (actionCompletionIncidentPayload) {
      await ctx.runMutation(getInternal().ai.agentSessions.logAgentAction, {
        agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
        organizationId: args.organizationId,
        actionType: "action_completion_mismatch_detected",
        actionData: actionCompletionIncidentPayload,
      });
      if (actionCompletionIncidentPayload.rewriteApplied) {
        await ctx.runMutation(getInternal().ai.agentSessions.logAgentAction, {
          agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
          organizationId: args.organizationId,
          actionType: "action_completion_fail_closed_rewrite_applied",
          actionData: actionCompletionIncidentPayload,
        });
      }
    }

    // 13. Route response back through channel provider (outbound delivery)
    // Skip if: metadata.skipOutbound is true (webhook/native endpoint sends reply itself),
    // or channel is "api_test" (testing via API, no delivery needed),
    // or there's no response content.
    await enterRuntimeKernelStage("delivery", {
      sessionId: session._id,
      turnId: runtimeTurnId,
      agentId: delegationAuthorityContract.authorityAgentId as Id<"objects">,
      correlationId: getSamanthaDispatchTraceCorrelationId(),
    });
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

    const qaDiagnostics = superAdminQaMode?.enabled
      ? buildActionCompletionQaDiagnostics(actionCompletionTelemetry)
      : undefined;

    if (qaDiagnostics && superAdminQaMode?.enabled) {
      const qaTurnTelemetryEnvelope = buildSuperAdminAgentQaTurnTelemetryEnvelope({
        qaRunId: superAdminQaMode.runId,
        sessionId: String(session._id),
        turnId: String(runtimeTurnId),
        agentId: String(authorityAgent._id),
        qaDiagnostics,
      });
      console.log(
        JSON.stringify(qaTurnTelemetryEnvelope),
      );
    }

    return {
      status: runtimeCapabilityGapBlockedResponse ? "blocked" : "success",
      message: assistantContent,
      response: deliveryContent,
      modelResolution: runtimeModelResolution,
      runtimeModuleIntentRouting,
      toolResults,
      agentId: authorityAgent._id,
      sessionId: session._id,
      turnId: runtimeTurnId,
      ...(requiredScopeDelegationDeliveryOverride ? {
        requiredScopeContract: requiredScopeDelegationDeliveryOverride.requiredScopeContract,
        requiredScopeGap: requiredScopeDelegationDeliveryOverride.requiredScopeGap,
        requiredScopeManifest: requiredScopeDelegationDeliveryOverride.requiredScopeManifest,
        requiredScopeFallback: requiredScopeDelegationDeliveryOverride.requiredScopeFallback,
      } : {}),
      ...(runtimeCapabilityGapBlockedResponse ? {
        blocked: runtimeCapabilityGapBlockedResponse,
      } : {}),
      ...(complianceShadowModeEvaluation ? {
        complianceShadowModeEvaluation,
      } : {}),
      ...(voiceRuntimeMetadata ? {
        voiceRuntime: {
          ...voiceRuntimeMetadata,
          synthesis: voiceSynthesisResult ?? undefined,
        },
      } : {}),
      ...(superAdminQaMode?.enabled ? {
        qaDiagnostics,
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
    const idempotencyEvaluation = evaluateInboundIdempotencyTuple({
      channel: args.channel,
      ingressKey: args.idempotencyKey,
      idempotencyContract: args.idempotencyContract,
    });
    const idempotencyScopeKey = idempotencyEvaluation.scopeKey;
    const idempotencyPayloadHash = idempotencyEvaluation.payloadHash;
    const queueConcurrencyKey = normalizeInboundRouteString(
      args.queueContract?.concurrencyKey
    );
    const allowScopePayloadHashReplayMatch = idempotencyEvaluation.allowScopePayloadHashReplayMatch;

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
          status: "conflict_commit_in_progress",
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

        if (!allowScopePayloadHashReplayMatch) {
          return false;
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
      const nextDuplicateCount = existing.duplicateCount + 1;
      await ctx.db.patch(existing._id, {
        duplicateCount: nextDuplicateCount,
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
        conflictLabel: idempotencyEvaluation.replayConflictLabel,
        replayOutcome: idempotencyEvaluation.replayOutcome,
        duplicateCount: nextDuplicateCount,
        idempotencyScopeKey:
          normalizeInboundRouteString(existing.idempotencyScopeKey)
          || idempotencyScopeKey,
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
  providerMessageId?: string;
  providerConversationId?: string;
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

export const MOBILE_TRANSPORT_SESSION_ATTESTATION_CONTRACT_VERSION =
  "tcg_mobile_transport_session_attestation_v1" as const;

export type MobileTransportSessionAttestationStatus =
  | "not_required"
  | "verified"
  | "failed";

export interface MobileTransportSessionAttestationContract {
  contractVersion: typeof MOBILE_TRANSPORT_SESSION_ATTESTATION_CONTRACT_VERSION;
  required: boolean;
  status: MobileTransportSessionAttestationStatus;
  verified: boolean;
  reasonCodes: string[];
  canonicalLiveSessionId?: string;
  observedLiveSessionIds: string[];
  transportMode?: string;
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
  transportSessionAttestation: MobileTransportSessionAttestationContract;
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

function normalizeInboundSessionToken(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeInboundSourceClassToken(value: unknown): string | undefined {
  const normalized = normalizeInboundSessionToken(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return normalized.replace(/[^a-z0-9._:-]+/g, "_");
}

function isInboundMetaGlassesSourceClass(sourceClass: string | undefined): boolean {
  if (!sourceClass) {
    return false;
  }
  return sourceClass === "meta_glasses" || sourceClass === "glasses_stream_meta";
}

function resolveInboundTransportSessionAttestationContract(args: {
  metadata: Record<string, unknown>;
}): MobileTransportSessionAttestationContract {
  const cameraRuntime = normalizeInboundObjectValue(args.metadata.cameraRuntime);
  const voiceRuntime = normalizeInboundObjectValue(args.metadata.voiceRuntime);
  const conversationRuntime = normalizeInboundObjectValue(args.metadata.conversationRuntime);
  const transportRuntime = normalizeInboundObjectValue(args.metadata.transportRuntime);
  const avObservability = normalizeInboundObjectValue(args.metadata.avObservability);
  const transportObservability = normalizeInboundObjectValue(
    transportRuntime?.observability
  );

  const sessionCandidates = [
    normalizeInboundSessionToken(args.metadata.liveSessionId),
    normalizeInboundSessionToken(args.metadata.realtimeSessionId),
    normalizeInboundSessionToken(cameraRuntime?.liveSessionId),
    normalizeInboundSessionToken(voiceRuntime?.liveSessionId),
    normalizeInboundSessionToken(transportRuntime?.liveSessionId),
    normalizeInboundSessionToken(transportObservability?.liveSessionId),
    normalizeInboundSessionToken(avObservability?.liveSessionId),
  ].filter((candidate): candidate is string => Boolean(candidate));
  const observedLiveSessionIds = Array.from(new Set(sessionCandidates));
  const canonicalLiveSessionId = observedLiveSessionIds[0];

  const cameraSourceClass = normalizeInboundSourceClassToken(
    firstInboundString(cameraRuntime?.sourceClass, cameraRuntime?.sourceId)
  );
  const voiceSourceClass = normalizeInboundSourceClassToken(
    firstInboundString(voiceRuntime?.sourceClass, voiceRuntime?.sourceId)
  );
  const metaSourceDetected =
    isInboundMetaGlassesSourceClass(cameraSourceClass)
    || isInboundMetaGlassesSourceClass(voiceSourceClass)
    || normalizeInboundSourceClassToken(args.metadata.sourceMode) === "meta_glasses"
    || normalizeInboundSourceClassToken(conversationRuntime?.sourceMode) === "meta_glasses"
    || normalizeInboundSourceClassToken(conversationRuntime?.requestedEyesSource) === "meta_glasses";
  const required = metaSourceDetected || observedLiveSessionIds.length > 0;

  if (!required) {
    return {
      contractVersion: MOBILE_TRANSPORT_SESSION_ATTESTATION_CONTRACT_VERSION,
      required: false,
      status: "not_required",
      verified: true,
      reasonCodes: [],
      observedLiveSessionIds: [],
    };
  }

  const reasonCodes = new Set<string>();
  if (observedLiveSessionIds.length > 1) {
    reasonCodes.add("live_session_id_mismatch");
  }

  const transportModeRaw = firstInboundString(
    transportRuntime?.transport,
    transportRuntime?.mode,
    transportObservability?.transport,
    transportObservability?.mode,
    cameraRuntime?.transport,
    voiceRuntime?.transport
  );
  const transportMode = transportModeRaw?.trim().toLowerCase();
  if (metaSourceDetected && transportMode !== "webrtc") {
    reasonCodes.add("meta_transport_must_be_webrtc");
  }

  const providerToken = firstInboundString(
    cameraRuntime?.providerId,
    voiceRuntime?.providerId
  )?.toLowerCase();
  if (metaSourceDetected && (!providerToken || !providerToken.startsWith("meta_"))) {
    reasonCodes.add("meta_provider_contract_required");
  }

  const relayPolicy = firstInboundString(
    cameraRuntime?.relayPolicy,
    normalizeInboundObjectValue(cameraRuntime?.metadata)?.relayPolicy,
    args.metadata.relayPolicy
  );
  if (metaSourceDetected && relayPolicy !== "meta_dat_webrtc_required") {
    reasonCodes.add("meta_relay_policy_marker_missing");
  }

  const verified = reasonCodes.size === 0;
  return {
    contractVersion: MOBILE_TRANSPORT_SESSION_ATTESTATION_CONTRACT_VERSION,
    required: true,
    status: verified ? "verified" : "failed",
    verified,
    reasonCodes: Array.from(reasonCodes).sort(),
    canonicalLiveSessionId,
    observedLiveSessionIds,
    transportMode,
  };
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
  const transportSessionAttestation = resolveInboundTransportSessionAttestationContract({
    metadata: args.metadata,
  });
  const transportSessionAttestationBlocked =
    transportSessionAttestation.required && !transportSessionAttestation.verified;
  let observability = resolveInboundNativeVisionObservabilityContract({
    metadata: args.metadata,
  });
  if (sourceAttestationBlocked || transportSessionAttestationBlocked) {
    const deterministicFallbackReasons = Array.from(
      new Set([
        ...observability.deterministicFallbackReasons,
        ...(sourceAttestationBlocked
          ? ["source_attestation_unverified", ...sourceAttestation.reasonCodes]
          : []),
        ...(transportSessionAttestationBlocked
          ? [
              "transport_session_attestation_unverified",
              ...transportSessionAttestation.reasonCodes.map(
                (reasonCode) => `transport_session_attestation:${reasonCode}`
              ),
            ]
          : []),
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
      sourceAttestationBlocked
      || transportSessionAttestationBlocked
      || intents.length > 0
      || nativeCompanionIngressSignal,
    approvalGatePolicy:
      sourceAttestationBlocked
      || transportSessionAttestationBlocked
      || mutatingIntentCount > 0
      || nativeCompanionIngressSignal
        ? "required_for_mutating_intents"
        : "policy_driven",
    directDeviceMutationRequested,
    intents,
    sourceAttestation,
    transportSessionAttestation,
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
    args.nativeVisionEdge?.transportSessionAttestation?.required === true
    && args.nativeVisionEdge.transportSessionAttestation.verified !== true
  ) {
    invariantViolations.push("transport_session_attestation_verification_failed");
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
    providerMessageId: firstInboundString(
      args.metadata.providerMessageId,
      args.metadata.providerCallId,
      args.metadata.callId,
      args.metadata.messageId,
    ),
    providerConversationId: firstInboundString(
      args.metadata.providerConversationId,
      args.metadata.conversationId,
    ),
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

const INTERNAL_OPERATOR_ROUTING_CHANNELS = new Set(["desktop", "slack"]);
const TELEPHONY_ROUTING_CHANNELS = new Set(["phone_call"]);

type AgentClass = "internal_operator" | "external_customer_facing";

function normalizeInboundAgentClass(value: unknown): AgentClass {
  const normalized = normalizeInboundRouteString(value)?.toLowerCase();
  if (normalized === "external_customer_facing" || normalized === "customer_facing") {
    return "external_customer_facing";
  }
  return "internal_operator";
}

function resolveExpectedInboundAgentClass(
  channel: string
): AgentClass | null {
  const normalizedChannel = normalizeInboundRouteString(channel)?.toLowerCase();
  if (!normalizedChannel) {
    return null;
  }
  if (INTERNAL_OPERATOR_ROUTING_CHANNELS.has(normalizedChannel)) {
    return "internal_operator";
  }
  if (TELEPHONY_ROUTING_CHANNELS.has(normalizedChannel)) {
    return "external_customer_facing";
  }
  return null;
}

function isAgentClassAllowedForInboundChannel(args: {
  channel: string;
  rawAgentClass: unknown;
}): boolean {
  const expectedClass = resolveExpectedInboundAgentClass(args.channel);
  if (!expectedClass) {
    return true;
  }
  return normalizeInboundAgentClass(args.rawAgentClass) === expectedClass;
}

type ExplicitInboundAgentEligibilityCandidate = {
  organizationId?: unknown;
  type?: unknown;
  status?: unknown;
  name?: unknown;
  deletedAt?: unknown;
  customProperties?: Record<string, unknown> | null;
};

export function resolveExplicitInboundAgentEligibility(args: {
  explicitAgent: ExplicitInboundAgentEligibilityCandidate | null | undefined;
  organizationId: Id<"organizations"> | string;
  channel: string;
}): {
  eligible: boolean;
  sameOrg: boolean;
  crossOrgPlatformMotherAccess: boolean;
  classAllowed: boolean;
  channelSupported: boolean;
} {
  const explicitAgent = args.explicitAgent;
  const explicitAgentProps =
    (explicitAgent?.customProperties || {}) as Record<string, unknown>;
  const normalizedChannel = normalizeInboundRouteString(args.channel)?.toLowerCase();
  const requiresWebchatBinding =
    normalizedChannel === "native_guest" || normalizedChannel === "webchat";
  const requiredPublicChannels =
    normalizedChannel === "native_guest"
      ? ["native_guest", "webchat"]
      : normalizedChannel === "webchat"
        ? ["webchat"]
        : [];
  const explicitChannelBindings = Array.isArray(explicitAgentProps.channelBindings)
    ? explicitAgentProps.channelBindings
    : [];
  const motherAuthority = Boolean(
    explicitAgent
    && isPlatformMotherAuthorityRecord(explicitAgent.name, explicitAgentProps),
  );
  // Mother must never become an explicit telephony rail, even if runtime metadata drifts.
  const platformMotherTelephonyBlocked = Boolean(
    motherAuthority
    && normalizedChannel
    && TELEPHONY_ROUTING_CHANNELS.has(normalizedChannel),
  );
  const classAllowed = !platformMotherTelephonyBlocked && isAgentClassAllowedForInboundChannel({
    channel: args.channel,
    rawAgentClass: explicitAgentProps.agentClass,
  });
  const channelSupported = !requiresWebchatBinding
    || requiredPublicChannels.some((requiredChannel) =>
      explicitChannelBindings.some((entry) => {
        if (!entry || typeof entry !== "object") {
          return false;
        }
        const record = entry as Record<string, unknown>;
        const boundChannel = normalizeInboundRouteString(record.channel)?.toLowerCase();
        return boundChannel === requiredChannel && record.enabled === true;
      })
    );
  const sameOrg = Boolean(
    explicitAgent
    && String(explicitAgent.organizationId) === String(args.organizationId)
  );
  const motherCustomerFacingRuntime = Boolean(
    explicitAgent
    && canUsePlatformMotherCustomerFacingSupport({
      requestingOrganizationId: String(args.organizationId),
      name: explicitAgent.name,
      status: explicitAgent.status,
      customProperties: explicitAgentProps,
    }),
  );
  const crossOrgPlatformMotherAccess = Boolean(
    explicitAgent
    && !sameOrg
    && !platformMotherTelephonyBlocked
    && motherCustomerFacingRuntime
  );
  const eligible = Boolean(
    explicitAgent
    && (sameOrg || crossOrgPlatformMotherAccess)
    && (explicitAgent.type === "org_agent" || explicitAgent.type === "agent")
    && !explicitAgent.deletedAt
    && classAllowed
    && channelSupported
  );

  return {
    eligible,
    sameOrg,
    crossOrgPlatformMotherAccess,
    classAllowed,
    channelSupported,
  };
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

function resolveComplianceShadowModeSurfaceForInbound(args: {
  channel: string;
  metadata: Record<string, unknown>;
}): ComplianceShadowModeSurface {
  const explicitSurface = firstInboundString(
    args.metadata.complianceShadowSurface,
    args.metadata.surface,
    args.metadata.uiSurface,
    args.metadata.appSurface,
    args.metadata.sourceSurface,
  )?.toLowerCase();

  if (
    explicitSurface === "finder"
    || explicitSurface === "knowledge_finder"
    || explicitSurface === "finder_window"
  ) {
    return "finder";
  }
  if (
    explicitSurface === "layers"
    || explicitSurface === "layers_canvas"
    || explicitSurface === "layers_window"
  ) {
    return "layers";
  }
  if (
    explicitSurface === "compliance"
    || explicitSurface === "compliance_center"
    || explicitSurface === "compliance_window"
    || explicitSurface === "compliance_inbox"
    || explicitSurface === "compliance_vault"
    || explicitSurface === "governance"
  ) {
    return "compliance_center";
  }
  if (
    explicitSurface === "ai_chat"
    || explicitSurface === "chat"
    || explicitSurface === "assistant"
    || explicitSurface === "webchat"
    || explicitSurface === "native_guest"
    || explicitSurface === "store"
  ) {
    return "ai_chat";
  }

  const normalizedChannel = normalizeInboundRouteString(args.channel)?.toLowerCase();
  if (normalizedChannel === "desktop") {
    return "layers";
  }
  if (
    normalizedChannel === "webchat"
    || normalizedChannel === "native_guest"
    || normalizedChannel === "phone_call"
    || normalizedChannel === "email"
    || normalizedChannel === "sms"
    || normalizedChannel === "whatsapp"
    || normalizedChannel === "api_test"
  ) {
    return "ai_chat";
  }
  return "unknown";
}

function shouldEmitComplianceShadowModeWouldBlockTelemetry(
  evaluation: ComplianceShadowModeEvaluationResult | null,
): boolean {
  return Boolean(
    evaluation
    && evaluation.nonComplianceSurface
    && evaluation.evaluationStatus === "evaluated"
    && evaluation.wouldBlock,
  );
}

function extractInboundMessageKeyValue(
  message: string,
  key: string
): string | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(?:^|[\\s\\n\\r])${escapedKey}\\s*=\\s*([^\\s\\n\\r]+)`,
    "i"
  );
  const match = message.match(pattern);
  if (!match || typeof match[1] !== "string") {
    return undefined;
  }
  return normalizeInboundRouteString(match[1]);
}

function normalizeInboundAudienceTemperature(
  value: unknown
): "warm" | "cold" | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "warm") {
    return "warm";
  }
  if (normalized === "cold") {
    return "cold";
  }
  return undefined;
}

function resolveInboundCommercialRoutingPolicy(args: {
  inboundMessage: string;
  metadata: Record<string, unknown>;
}): {
  audienceTemperature?: "warm" | "cold" | "unknown";
  surface?: string;
  intentCode?: string;
  offerCode?: string;
  routingHint?: string;
  targetSpecialistTemplateRole?: string;
  warmLeadEligible: boolean;
  signalSource: "none" | "message" | "metadata" | "mixed";
} {
  const metadataCommercialIntent = normalizeInboundObjectValue(
    args.metadata.commercialIntent
  );
  const messageSurface = extractInboundMessageKeyValue(args.inboundMessage, "surface");
  const messageAudience = normalizeInboundAudienceTemperature(
    extractInboundMessageKeyValue(args.inboundMessage, "audience_temperature")
    || extractInboundMessageKeyValue(args.inboundMessage, "audienceTemperature")
  );
  const messageIntentCode =
    extractInboundMessageKeyValue(args.inboundMessage, "intent_code")
    || extractInboundMessageKeyValue(args.inboundMessage, "intentCode")
    || extractInboundMessageKeyValue(args.inboundMessage, "intent");
  const messageOfferCode =
    extractInboundMessageKeyValue(args.inboundMessage, "offer_code")
    || extractInboundMessageKeyValue(args.inboundMessage, "offerCode");
  const messageRoutingHint =
    extractInboundMessageKeyValue(args.inboundMessage, "routing_hint")
    || extractInboundMessageKeyValue(args.inboundMessage, "routingHint");
  const messageTargetTemplateRole =
    extractInboundMessageKeyValue(
      args.inboundMessage,
      "target_specialist_template_role"
    )
    || extractInboundMessageKeyValue(
      args.inboundMessage,
      "targetSpecialistTemplateRole"
    );

  const metadataAudience = normalizeInboundAudienceTemperature(
    firstInboundString(
      args.metadata.audience_temperature,
      args.metadata.audienceTemperature,
      metadataCommercialIntent?.audience_temperature,
      metadataCommercialIntent?.audienceTemperature
    )
  );
  const metadataSurface = firstInboundString(
    metadataCommercialIntent?.surface,
    args.metadata.surface
  );
  const metadataIntentCode = firstInboundString(
    metadataCommercialIntent?.intent_code,
    metadataCommercialIntent?.intentCode,
    args.metadata.intent_code,
    args.metadata.intentCode
  );
  const metadataOfferCode = firstInboundString(
    metadataCommercialIntent?.offer_code,
    metadataCommercialIntent?.offerCode,
    args.metadata.offer_code,
    args.metadata.offerCode
  );
  const metadataRoutingHint = firstInboundString(
    metadataCommercialIntent?.routing_hint,
    metadataCommercialIntent?.routingHint,
    args.metadata.routing_hint,
    args.metadata.routingHint
  );
  const metadataTargetTemplateRole = firstInboundString(
    metadataCommercialIntent?.target_specialist_template_role,
    metadataCommercialIntent?.targetSpecialistTemplateRole,
    args.metadata.target_specialist_template_role,
    args.metadata.targetSpecialistTemplateRole
  );

  const audienceTemperature =
    metadataAudience || messageAudience || undefined;
  const surface =
    normalizeInboundRouteString(metadataSurface)?.toLowerCase()
    || normalizeInboundRouteString(messageSurface)?.toLowerCase()
    || undefined;
  const intentCode =
    normalizeInboundRouteString(metadataIntentCode)
    || normalizeInboundRouteString(messageIntentCode)
    || undefined;
  const offerCode =
    normalizeInboundRouteString(metadataOfferCode)
    || normalizeInboundRouteString(messageOfferCode)
    || undefined;
  const routingHint =
    normalizeInboundRouteString(metadataRoutingHint)
    || normalizeInboundRouteString(messageRoutingHint)
    || undefined;
  const targetSpecialistTemplateRole =
    normalizeInboundRouteString(metadataTargetTemplateRole)
    || normalizeInboundRouteString(messageTargetTemplateRole)
    || undefined;

  const metadataSignalDetected = Boolean(
    metadataAudience
    || metadataSurface
    || metadataIntentCode
    || metadataOfferCode
    || metadataRoutingHint
    || metadataTargetTemplateRole
  );
  const messageSignalDetected = Boolean(
    messageAudience
    || messageSurface
    || messageIntentCode
    || messageOfferCode
    || messageRoutingHint
    || messageTargetTemplateRole
  );

  const signalSource: "none" | "message" | "metadata" | "mixed" =
    metadataSignalDetected && messageSignalDetected
      ? "mixed"
      : metadataSignalDetected
        ? "metadata"
        : messageSignalDetected
          ? "message"
          : "none";

  const explicitWarm = audienceTemperature === "warm";
  const explicitCold =
    audienceTemperature === "cold" || surface === "one_of_one_landing";
  const warmLeadEligible = explicitWarm && !explicitCold;

  return {
    audienceTemperature:
      audienceTemperature
      || (signalSource === "none" ? undefined : "unknown"),
    surface,
    intentCode,
    offerCode,
    routingHint,
    targetSpecialistTemplateRole,
    warmLeadEligible,
    signalSource,
  };
}

interface InboundCommercialKickoffContract {
  kind: "commercial_motion_v1";
  audienceTemperature: "warm" | "cold";
  targetSpecialistDisplayName?: string;
  targetSpecialistTemplateRole?: string;
  intentCode: string;
  offerCode: string;
  surface: "one_of_one_landing" | "store";
  routingHint?: string;
  channel?: string;
  campaign?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
    referrer?: string;
    landingPath?: string;
  };
}

function resolveInboundCommercialKickoffContract(
  metadata: Record<string, unknown>
): InboundCommercialKickoffContract | null {
  const kickoffContract = normalizeInboundObjectValue(metadata.kickoffContract);
  if (!kickoffContract) {
    return null;
  }

  const kind = firstInboundString(
    kickoffContract.kind,
    kickoffContract.contractVersion
  );
  if (kind !== "commercial_motion_v1") {
    return null;
  }

  const audienceTemperature = normalizeInboundAudienceTemperature(
    firstInboundString(
      kickoffContract.audienceTemperature,
      kickoffContract.audience_temperature
    )
  );
  const intentCode = normalizeInboundRouteString(kickoffContract.intentCode);
  const offerCode = normalizeInboundRouteString(kickoffContract.offerCode);
  const routingHint = normalizeInboundRouteString(kickoffContract.routingHint);
  const channel = normalizeInboundRouteString(kickoffContract.channel);
  const surface = normalizeInboundRouteString(kickoffContract.surface);
  const targetSpecialistDisplayName = normalizeInboundRouteString(
    kickoffContract.targetSpecialistDisplayName
  );
  const targetSpecialistTemplateRole = normalizeInboundRouteString(
    kickoffContract.targetSpecialistTemplateRole
  );
  const campaignRaw = normalizeInboundObjectValue(kickoffContract.campaign);

  if (!audienceTemperature || !intentCode || !offerCode) {
    return null;
  }
  if (surface !== "one_of_one_landing" && surface !== "store") {
    return null;
  }

  return {
    kind: "commercial_motion_v1",
    audienceTemperature,
    targetSpecialistDisplayName,
    targetSpecialistTemplateRole,
    intentCode,
    offerCode,
    surface,
    routingHint,
    channel,
    campaign: campaignRaw
      ? {
          source: normalizeInboundRouteString(campaignRaw.source),
          medium: normalizeInboundRouteString(campaignRaw.medium),
          campaign: normalizeInboundRouteString(campaignRaw.campaign),
          content: normalizeInboundRouteString(campaignRaw.content),
          term: normalizeInboundRouteString(campaignRaw.term),
          referrer: normalizeInboundRouteString(campaignRaw.referrer),
          landingPath: normalizeInboundRouteString(campaignRaw.landingPath),
        }
      : undefined,
  };
}

function buildInboundCommercialKickoffRuntimeContext(
  kickoffContract: InboundCommercialKickoffContract | null
): string | null {
  if (!kickoffContract) {
    return null;
  }

  const lines = [
    "--- COMMERCIAL MOTION KICKOFF CONTRACT ---",
    "Route this conversation through Samantha commercial intake.",
    `audience_temperature=${kickoffContract.audienceTemperature}`,
    `target_specialist_display_name=${kickoffContract.targetSpecialistDisplayName || "Samantha"}`,
    `target_specialist_template_role=${kickoffContract.targetSpecialistTemplateRole || "one_of_one_lead_capture_consultant_template"}`,
    `intent=${kickoffContract.intentCode}`,
    `offer_code=${kickoffContract.offerCode}`,
    `surface=${kickoffContract.surface}`,
    kickoffContract.routingHint
      ? `routing_hint=${kickoffContract.routingHint}`
      : "routing_hint=none",
    kickoffContract.channel
      ? `source_channel=${kickoffContract.channel}`
      : "source_channel=n/a",
    `source=${kickoffContract.campaign?.source || "n/a"}`,
    `medium=${kickoffContract.campaign?.medium || "n/a"}`,
    `campaign=${kickoffContract.campaign?.campaign || "n/a"}`,
    `content=${kickoffContract.campaign?.content || "n/a"}`,
    `term=${kickoffContract.campaign?.term || "n/a"}`,
    `referrer=${kickoffContract.campaign?.referrer || "n/a"}`,
    `landingPath=${kickoffContract.campaign?.landingPath || "n/a"}`,
    "commercial_contract:",
    "1) Free Diagnostic is qualification only.",
    "2) Consulting Sprint is €3,500 scope-only (no implementation delivery).",
    "3) Implementation Start begins at €7,000+.",
    "required_lead_fields=first_name,last_name,email,phone,founder_contact_requested_yes_no",
    "response_contract:",
  ];

  if (kickoffContract.intentCode === "diagnostic_qualification") {
    lines.push(
      "1) Deliver one highest-leverage workflow recommendation first.",
      "2) Then collect qualification details and founder contact preference.",
      "3) Do not imply paid implementation is included in this diagnostic stage."
    );
  } else if (kickoffContract.intentCode === "consulting_sprint_scope_only") {
    lines.push(
      "1) Keep scope in strategy/discovery and implementation roadmap design.",
      "2) State explicitly that consulting sprint excludes production implementation.",
      "3) If user asks for build delivery, route to implementation readiness (starts at €7,000+)."
    );
  } else {
    lines.push(
      "1) Confirm implementation readiness, constraints, and launch priorities.",
      "2) State explicitly that implementation starts at €7,000+.",
      "3) If budget/timing is not ready, route to Consulting Sprint scope-only path."
    );
  }

  lines.push("--- END COMMERCIAL MOTION KICKOFF CONTRACT ---");
  return lines.join("\n");
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

const ORG_ACTION_FOLLOW_UP_RUNTIME_SOURCE = "org_action_follow_up_runtime" as const;
const ORG_ACTION_FOLLOW_UP_WORKFLOW_KEY = "follow_up_execution" as const;

function isOrgActionFollowUpRuntimeSource(
  metadata: Record<string, unknown>,
): boolean {
  const source = firstInboundString(
    metadata.source,
    metadata.entrySource,
    metadata.runtimeSource,
  );
  return source?.toLowerCase() === ORG_ACTION_FOLLOW_UP_RUNTIME_SOURCE;
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
  if (isOrgActionFollowUpRuntimeSource(args.metadata)) {
    return ORG_ACTION_FOLLOW_UP_WORKFLOW_KEY;
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
  if (isOrgActionFollowUpRuntimeSource(args.metadata)) {
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
  return buildDeterministicIdempotencyPayloadHash({
    organizationId: args.organizationId,
    message: args.message,
    metadata: args.metadata,
    workflowKey: args.workflowKey,
    collaboration: args.collaboration,
  });
}

export function shouldAllowScopePayloadHashReplayMatch(args: {
  channel: string;
  intentType?: RuntimeIdempotencyContract["intentType"] | null;
}): boolean {
  return !(
    args.channel === "native_guest"
    && args.intentType !== "proposal"
    && args.intentType !== "commit"
  );
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

function normalizeExecutionString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeExecutionStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeExecutionString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

export const ACTION_COMPLETION_ENFORCEMENT_CONTRACT_VERSION =
  "aoh_action_completion_enforcement_v1" as const;
export const ACTION_COMPLETION_EVIDENCE_CONTRACT_VERSION =
  "action_completion_evidence_v1" as const;
export const ACTION_COMPLETION_CLAIM_BLOCK_LABEL = "action_completion_claim" as const;
export type ActionCompletionClaimStatus = "in_progress" | "completed";
export type ActionCompletionEnforcementMode = "off" | "observe" | "enforce";
export type ActionCompletionEnforcementReasonCode =
  | "claim_tool_not_observed"
  | "claim_tool_unavailable"
  | "claim_payload_invalid";
export type ActionCompletionResponseLanguage = "en" | "de";

function normalizeActionCompletionResponseLanguage(
  value: unknown
): ActionCompletionResponseLanguage | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (
    normalized === "de"
    || normalized.startsWith("de-")
    || normalized === "german"
    || normalized === "deutsch"
  ) {
    return "de";
  }
  if (
    normalized === "en"
    || normalized.startsWith("en-")
    || normalized === "english"
    || normalized === "englisch"
  ) {
    return "en";
  }
  return null;
}

function detectLikelyActionCompletionResponseLanguage(
  text: string | null | undefined
): ActionCompletionResponseLanguage | null {
  if (typeof text !== "string") {
    return null;
  }
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    /\b(auf deutsch|deutsch bitte|in german|bitte auf deutsch)\b/i.test(normalized)
  ) {
    return "de";
  }
  if (/\b(in english|auf englisch|english please)\b/i.test(normalized)) {
    return "en";
  }
  if (/[äöüß]/i.test(normalized)) {
    return "de";
  }

  const germanHintTokens = [
    " bitte ",
    " danke ",
    " ich ",
    " ja ",
    " nein ",
    " urlaub",
    " urlaubs",
    " apotheke",
    " mitarbeit",
    " implementierungsplan",
    " bereitschaftsplan",
    " schulferien",
    " bottleneck",
  ];
  const padded = ` ${normalized} `;
  let hintScore = 0;
  for (const token of germanHintTokens) {
    if (padded.includes(token)) {
      hintScore += 1;
    }
  }
  return hintScore >= 2 ? "de" : null;
}

function resolveActionCompletionResponseLanguage(args: {
  authorityConfig: Record<string, unknown> | null | undefined;
  inboundMessage?: string | null;
  assistantContent?: string | null;
  metadata?: Record<string, unknown> | null;
  preferredLanguage?: string | ActionCompletionResponseLanguage | null;
}): ActionCompletionResponseLanguage {
  const metadata = args.metadata ?? undefined;
  const metadataVisitorInfo =
    metadata?.visitorInfo && typeof metadata.visitorInfo === "object"
      ? (metadata.visitorInfo as Record<string, unknown>)
      : undefined;

  const explicitLanguage =
    normalizeActionCompletionResponseLanguage(args.preferredLanguage)
    ?? normalizeActionCompletionResponseLanguage(
      firstInboundString(
        metadata?.language,
        metadata?.locale,
        metadataVisitorInfo?.language,
      )
    );
  if (explicitLanguage) {
    return explicitLanguage;
  }

  const detectedFromInbound = detectLikelyActionCompletionResponseLanguage(
    args.inboundMessage
  );
  if (detectedFromInbound) {
    return detectedFromInbound;
  }

  const detectedFromAssistant = detectLikelyActionCompletionResponseLanguage(
    args.assistantContent
  );
  if (detectedFromAssistant) {
    return detectedFromAssistant;
  }

  const configLanguage = normalizeActionCompletionResponseLanguage(
    args.authorityConfig?.language
  );
  if (configLanguage) {
    return configLanguage;
  }

  return "en";
}

interface ActionCompletionRuntimeContract {
  outcome: string;
  requiredTools: string[];
  unavailableMessage: string;
  notObservedMessage: string;
}

export interface ActionCompletionRuntimeContractConfig {
  contractVersion: typeof ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION;
  mode: ActionCompletionEnforcementMode;
  outcomes: ActionCompletionRuntimeContract[];
  source: "template_metadata" | "legacy_samantha_fallback" | "none";
}

export interface ParsedActionCompletionClaim {
  contractVersion: typeof ACTION_COMPLETION_CLAIM_CONTRACT_VERSION;
  outcome: string;
  status: ActionCompletionClaimStatus;
}

export interface ActionCompletionContractEnforcementPayload {
  contractVersion: typeof ACTION_COMPLETION_ENFORCEMENT_CONTRACT_VERSION;
  status: "enforced" | "pass";
  enforcementMode: ActionCompletionEnforcementMode;
  observedViolation: boolean;
  reasonCode?: ActionCompletionEnforcementReasonCode;
  preflightReasonCode?: SamanthaPreflightReasonCode;
  preflightMissingRequiredFields?: SamanthaAuditRequiredField[];
  outcome?: string;
  claimStatus?: ActionCompletionClaimStatus;
  requiredTools: string[];
  observedTools: string[];
  availableTools: string[];
  malformedClaimCount: number;
  evidence?: ActionCompletionEvidenceContract;
}

export interface ActionCompletionEvidenceObservedToolCall {
  toolName: string;
  callId: string;
  turnId?: string;
  status: AgentToolExecutionStatus;
  outputRef?: string;
}

export interface ActionCompletionEvidenceContract {
  contractVersion: typeof ACTION_COMPLETION_EVIDENCE_CONTRACT_VERSION;
  outcomeKey: string;
  requiredTools: string[];
  requiredFields: string[];
  observedToolCalls: ActionCompletionEvidenceObservedToolCall[];
  preconditionCheck: {
    passed: boolean;
    missingFields: string[];
  };
  decision: {
    status: "pass" | "fail";
    failureCode: ActionCompletionEnforcementReasonCode | null;
    failureDetail?: string;
  };
}

export interface ActionCompletionContractEnforcementDecision {
  enforced: boolean;
  assistantContent?: string;
  payload: ActionCompletionContractEnforcementPayload;
}

function normalizeDeterministicExecutionToolNames(toolNames: string[]): string[] {
  return Array.from(
    new Set(
      toolNames
        .map((toolName) => normalizeExecutionString(toolName))
        .filter((toolName): toolName is string => Boolean(toolName))
    )
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeActionCompletionEnforcementMode(
  value: unknown
): ActionCompletionEnforcementMode | null {
  if (typeof value !== "string") {
    return null;
  }
  if (value === "off" || value === "observe" || value === "enforce") {
    return value;
  }
  return null;
}

function buildActionCompletionMissingToolUnavailableMessage(args: {
  outcome: string;
  requiredTools: string[];
  language: ActionCompletionResponseLanguage;
}): string {
  if (args.language === "de") {
    return `Ich kann "${args.outcome}" in diesem Schritt nicht bestaetigen, weil erforderliche Tools im Runtime-Umfang noch nicht verfuegbar sind (${args.requiredTools.join(", ")}). Ich bestaetige keinen Abschluss ohne echte Tool-Ausfuehrungsnachweise. Wenn Sie ein Feature-Request-Ticket wuenschen, antworten Sie mit: "Ticket erstellen".`;
  }
  return `I can’t confirm "${args.outcome}" in this turn because required tools are not available yet in runtime scope (${args.requiredTools.join(", ")}). I won’t claim completion without real tool execution evidence. If you want a feature request ticket, reply with: "create request".`;
}

function buildActionCompletionMissingToolObservedMessage(args: {
  outcome: string;
  requiredTools: string[];
  language: ActionCompletionResponseLanguage;
}): string {
  if (args.language === "de") {
    return `Ich kann "${args.outcome}" noch nicht bestaetigen, weil erforderliche Tools in diesem Schritt nicht ausgefuehrt wurden (${args.requiredTools.join(", ")}). Ich bestaetige weder Fortschritt noch Abschluss ohne echte Tool-Ausfuehrungsnachweise.`;
  }
  return `I can’t confirm "${args.outcome}" yet because required tools did not execute in this turn (${args.requiredTools.join(", ")}). I won’t claim progress or completion without real tool execution evidence.`;
}

function buildActionCompletionInvalidPayloadMessage(
  language: ActionCompletionResponseLanguage
): string {
  if (language === "de") {
    return "Ich kann die Ausfuehrung noch nicht bestaetigen, weil das Action-Completion-Contract-Payload in diesem Schritt ungueltig war. Ich bestaetige weder Fortschritt noch Abschluss ohne gueltigen Contract-Marker und echte Tool-Ausfuehrung.";
  }
  return "I can’t confirm execution yet because the action-completion contract payload was invalid for this turn. I won’t claim progress or completion without a valid contract marker and real tool execution.";
}

function buildSamanthaAuditDeliverableActionCompletionMessage(args: {
  kind: "unavailable" | "not_observed";
  language: ActionCompletionResponseLanguage;
}): string {
  if (args.language === "de") {
    if (args.kind === "unavailable") {
      return "Ich kann Ihre Audit-Ergebnisse in diesem Schritt nicht per E-Mail senden, weil das Zustellungs-Tool im aktuellen Runtime-Umfang noch nicht verfuegbar ist. Ich bestaetige keinen Abschluss ohne echte Tool-Ausfuehrung. Wenn Sie ein Feature-Request-Ticket wuenschen, antworten Sie mit: \"Ticket erstellen\".";
    }
    return "Ich kann die Audit-E-Mail-Zustellung noch nicht bestaetigen, weil das Zustellungs-Tool in diesem Schritt nicht ausgefuehrt wurde. Ich bestaetige keinen Abschluss ohne echten Tool-Aufruf. Bitte bestaetigen Sie Vorname, Nachname, E-Mail, Telefonnummer und ob Founder-Kontakt gewuenscht ist (ja/nein), dann fuehre ich es jetzt aus.";
  }
  if (args.kind === "unavailable") {
    return "I can’t send your audit results email in this turn because the delivery tool is not available yet in the current runtime scope. I won’t claim completion without a real tool execution. If you want a feature request ticket, reply with: \"create request\".";
  }
  return "I can’t confirm audit email delivery yet because the delivery tool did not execute in this turn. I won’t claim completion without a real tool call. Please confirm first name, last name, email, phone number, and founder-contact preference (yes/no), and I will run it now.";
}

const USER_FACING_RUNTIME_JARGON_PATTERN =
  /\b(?:claim_tool_unavailable|claim_tool_not_observed|tool_not_observed|missing_required_fields|runtime capability gap|runtime scope|runtime contract|contract payload|tool execution evidence|preflightreasoncode|skipreasons|invocation=|reason=)\b/i;

export function sanitizeUserFacingRuntimeFailureMessage(args: {
  assistantContent: string;
  language: ActionCompletionResponseLanguage;
}): {
  assistantContent: string;
  rewritten: boolean;
} {
  const original = args.assistantContent;
  if (!USER_FACING_RUNTIME_JARGON_PATTERN.test(original.toLowerCase())) {
    return {
      assistantContent: original,
      rewritten: false,
    };
  }

  const replacements: Array<[RegExp, string]> = args.language === "de"
    ? [
        [/\bclaim_tool_unavailable\b/gi, "notwendige Funktion aktuell nicht verfuegbar"],
        [/\bclaim_tool_not_observed\b/gi, "Schritt konnte noch nicht bestaetigt werden"],
        [/\btool_not_observed\b/gi, "Schritt wurde noch nicht ausgefuehrt"],
        [/\bmissing_required_fields\b/gi, "es fehlen noch Angaben"],
        [/\bruntime capability gap\b/gi, "fehlende Funktion im aktuellen Ablauf"],
        [/\bruntime scope\b/gi, "aktueller Ablauf"],
        [/\bruntime contract checks?\b/gi, "Ausfuehrungspruefungen"],
        [/\bruntime contract\b/gi, "Ausfuehrungspruefung"],
        [/\bcontract payload\b/gi, "Anfragedaten"],
        [/\btool execution evidence\b/gi, "bestaetigte Ausfuehrung"],
      ]
    : [
        [/\bclaim_tool_unavailable\b/gi, "required capability is currently unavailable"],
        [/\bclaim_tool_not_observed\b/gi, "step could not be confirmed yet"],
        [/\btool_not_observed\b/gi, "step did not run yet"],
        [/\bmissing_required_fields\b/gi, "some details are still missing"],
        [/\bruntime capability gap\b/gi, "a missing capability in this flow"],
        [/\bruntime scope\b/gi, "current flow"],
        [/\bruntime contract checks?\b/gi, "execution checks"],
        [/\bruntime contract\b/gi, "execution check"],
        [/\bcontract payload\b/gi, "request data"],
        [/\btool execution evidence\b/gi, "confirmed execution"],
      ];

  let rewritten = original;
  for (const [pattern, replacement] of replacements) {
    rewritten = rewritten.replace(pattern, replacement);
  }

  rewritten = rewritten
    .replace(/\b(?:reason|invocation|preflightReasonCode)\s*=\s*[^;\n]+;?/gi, "")
    .replace(/\bskipReasons=\[[^\]]*\];?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  const fallback = args.language === "de"
    ? "Es gab gerade ein Problem bei der Ausfuehrung. Mir fehlen noch Angaben oder ein Schritt wurde nicht erfolgreich abgeschlossen. Bitte bestaetigen Sie kurz die fehlenden Daten, dann versuche ich es sofort erneut."
    : "There was a delivery problem just now. I still need a few details or one step did not complete successfully. Please confirm the missing information and I will retry right away.";

  if (rewritten.length === 0 || USER_FACING_RUNTIME_JARGON_PATTERN.test(rewritten.toLowerCase())) {
    return {
      assistantContent: fallback,
      rewritten: true,
    };
  }

  return {
    assistantContent: rewritten,
    rewritten: rewritten !== original,
  };
}

function isSamanthaAuditDeliverableActionCompletionOutcome(args: {
  outcome: string;
  requiredTools: string[];
}): boolean {
  return (
    args.outcome === AUDIT_DELIVERABLE_OUTCOME_KEY
    && args.requiredTools.includes(AUDIT_DELIVERABLE_TOOL_NAME)
  );
}

function buildActionCompletionSanitizationFallbackMessage(args: {
  contractConfig: ActionCompletionRuntimeContractConfig;
  claims: ParsedActionCompletionClaim[];
  malformedClaimCount: number;
  language: ActionCompletionResponseLanguage;
}): string {
  if (args.malformedClaimCount > 0) {
    return buildActionCompletionInvalidPayloadMessage(args.language);
  }

  const claimedOutcome = normalizeExecutionString(args.claims[0]?.outcome);
  if (claimedOutcome) {
    const matchedContract = args.contractConfig.outcomes.find(
      (contract) => normalizeExecutionString(contract.outcome) === claimedOutcome
    );
    if (matchedContract) {
      return matchedContract.notObservedMessage;
    }
  }

  if (args.contractConfig.mode !== "off" && args.contractConfig.outcomes.length > 0) {
    if (args.language === "de") {
      return "Ich kann den Abschluss in diesem Schritt nicht bestaetigen, weil keine verifizierbare Tool-Ausfuehrung beobachtet wurde. Ich bestaetige keinen Abschluss ohne echte Tool-Ausfuehrungsnachweise.";
    }
    return "I can’t confirm completion in this turn because no verifiable tool execution was observed. I won’t claim completion without real tool execution evidence.";
  }

  if (args.language === "de") {
    return "Ich konnte in diesem Schritt keine sichtbare Antwort abschliessen. Bitte wiederholen Sie Ihre Anfrage.";
  }
  return "I couldn't complete a visible response for this turn. Please retry your request.";
}

function buildLegacySamanthaActionCompletionContract(args: {
  language: ActionCompletionResponseLanguage;
}): ActionCompletionRuntimeContractConfig {
  return {
    contractVersion: ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION,
    mode: "enforce",
    source: "legacy_samantha_fallback",
    outcomes: [
      {
        outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
        requiredTools: [AUDIT_DELIVERABLE_TOOL_NAME],
        unavailableMessage: buildSamanthaAuditDeliverableActionCompletionMessage({
          kind: "unavailable",
          language: args.language,
        }),
        notObservedMessage: buildSamanthaAuditDeliverableActionCompletionMessage({
          kind: "not_observed",
          language: args.language,
        }),
      },
    ],
  };
}

function resolveActionCompletionContractsForRuntime(args: {
  authorityConfig: Record<string, unknown> | null | undefined;
  preferredLanguage?: string | ActionCompletionResponseLanguage | null;
}): ActionCompletionRuntimeContractConfig {
  const responseLanguage = resolveActionCompletionResponseLanguage({
    authorityConfig: args.authorityConfig,
    preferredLanguage: args.preferredLanguage,
  });
  const fallbackContract: ActionCompletionRuntimeContractConfig = {
    contractVersion: ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION,
    mode: "off",
    source: "none",
    outcomes: [],
  };
  if (!args.authorityConfig || typeof args.authorityConfig !== "object") {
    return fallbackContract;
  }

  const metadata = (args.authorityConfig as Record<string, unknown>).actionCompletionContract;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const record = metadata as Record<string, unknown>;
    if (record.contractVersion === ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION) {
      const mode = normalizeActionCompletionEnforcementMode(record.mode) ?? "observe";
      const rawOutcomes = Array.isArray(record.outcomes) ? record.outcomes : [];
      const outcomes = rawOutcomes
        .map((rawOutcome) => {
          if (!rawOutcome || typeof rawOutcome !== "object" || Array.isArray(rawOutcome)) {
            return null;
          }
          const outcomeRecord = rawOutcome as Record<string, unknown>;
          const outcome = normalizeExecutionString(outcomeRecord.outcome);
          const requiredTools = normalizeDeterministicExecutionToolNames(
            normalizeExecutionStringList(outcomeRecord.requiredTools)
          );
          if (!outcome || requiredTools.length === 0) {
            return null;
          }
          const isSamanthaAuditDeliverableOutcome =
            isSamanthaAuditDeliverableActionCompletionOutcome({
              outcome,
              requiredTools,
            });
          return {
            outcome,
            requiredTools,
            unavailableMessage:
              isSamanthaAuditDeliverableOutcome
                ? buildSamanthaAuditDeliverableActionCompletionMessage({
                    kind: "unavailable",
                    language: responseLanguage,
                  })
                : (
              normalizeExecutionString(outcomeRecord.unavailableMessage)
              ?? buildActionCompletionMissingToolUnavailableMessage({
                outcome,
                requiredTools,
                language: responseLanguage,
              })
                ),
            notObservedMessage:
              isSamanthaAuditDeliverableOutcome
                ? buildSamanthaAuditDeliverableActionCompletionMessage({
                    kind: "not_observed",
                    language: responseLanguage,
                  })
                : (
              normalizeExecutionString(outcomeRecord.notObservedMessage)
              ?? buildActionCompletionMissingToolObservedMessage({
                outcome,
                requiredTools,
                language: responseLanguage,
              })
                ),
          } satisfies ActionCompletionRuntimeContract;
        })
        .filter(
          (outcome): outcome is ActionCompletionRuntimeContract => Boolean(outcome)
        );

      return {
        contractVersion: ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION,
        mode: outcomes.length > 0 ? mode : "off",
        source: "template_metadata",
        outcomes,
      };
    }
  }

  // Migration safety: keep Samantha fail-closed until all runtime records are reseeded.
  if (isSamanthaLeadCaptureRuntime(args.authorityConfig)) {
    return buildLegacySamanthaActionCompletionContract({
      language: responseLanguage,
    });
  }
  return fallbackContract;
}

export function buildActionCompletionRuntimeContext(
  contractConfig: ActionCompletionRuntimeContractConfig
): string | null {
  if (
    contractConfig.mode === "off"
    || !Array.isArray(contractConfig.outcomes)
    || contractConfig.outcomes.length === 0
  ) {
    return null;
  }

  const lines = [
    "Action-completion contracts are active for this runtime.",
    `Enforcement mode: ${contractConfig.mode}.`,
    "When claiming progress/completion for a contract-bound outcome, append exactly one fenced JSON block labeled action_completion_claim.",
    "Allowed status values: in_progress, completed.",
    "Never claim a bound outcome without matching tool execution in the same turn.",
    "Block format:",
    "```action_completion_claim",
    JSON.stringify({
      contractVersion: ACTION_COMPLETION_CLAIM_CONTRACT_VERSION,
      outcome: contractConfig.outcomes[0]?.outcome ?? "outcome_key",
      status: "in_progress",
    }),
    "```",
    "Active outcomes:",
  ];

  for (const contract of contractConfig.outcomes) {
    const requiredTools = normalizeDeterministicExecutionToolNames(
      contract.requiredTools
    );
    lines.push(`- ${contract.outcome} (requiredTools: ${requiredTools.join(", ")})`);
  }

  return [
    "--- ACTION COMPLETION CONTRACTS ---",
    lines.join("\n"),
    "--- END ACTION COMPLETION CONTRACTS ---",
  ].join("\n");
}

function parseActionCompletionClaim(
  rawClaimPayload: string
): ParsedActionCompletionClaim | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawClaimPayload);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  if (record.contractVersion !== ACTION_COMPLETION_CLAIM_CONTRACT_VERSION) {
    return null;
  }
  if (
    typeof record.outcome !== "string"
    || (record.status !== "in_progress" && record.status !== "completed")
  ) {
    return null;
  }
  const outcome = record.outcome.trim();
  if (!outcome) {
    return null;
  }
  return {
    contractVersion: ACTION_COMPLETION_CLAIM_CONTRACT_VERSION,
    outcome,
    status: record.status,
  };
}

export function extractActionCompletionClaimsFromAssistantContent(content: string): {
  sanitizedContent: string;
  claims: ParsedActionCompletionClaim[];
  malformedClaimCount: number;
} {
  const claimBlockPattern = new RegExp(
    "```" + ACTION_COMPLETION_CLAIM_BLOCK_LABEL + "\\s*([\\s\\S]*?)```",
    "gi"
  );
  const claims: ParsedActionCompletionClaim[] = [];
  let malformedClaimCount = 0;
  const sanitizedContent = content
    .replace(claimBlockPattern, (_block, payload: string) => {
      const claim = parseActionCompletionClaim(payload.trim());
      if (claim) {
        claims.push(claim);
      } else {
        malformedClaimCount += 1;
      }
      return "";
    })
    .trim();
  return {
    sanitizedContent,
    claims,
    malformedClaimCount,
  };
}

function resolveActionCompletionOutputRef(result: unknown): string | undefined {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return undefined;
  }
  const record = result as Record<string, unknown>;
  const directOutputRef = normalizeExecutionString(record.outputRef);
  if (directOutputRef) {
    return directOutputRef;
  }
  const directId = normalizeExecutionString(record.id);
  if (directId) {
    return directId;
  }
  return undefined;
}

export function buildActionCompletionEvidenceContract(args: {
  outcomeKey: string;
  requiredTools: string[];
  requiredFields?: string[];
  toolResults: AgentToolResult[];
  turnId?: string;
}): ActionCompletionEvidenceContract {
  const outcomeKey = normalizeExecutionString(args.outcomeKey) ?? "unknown_outcome";
  const requiredTools = normalizeDeterministicExecutionToolNames(args.requiredTools);
  const requiredFieldSet = new Set<string>();
  for (const field of args.requiredFields ?? []) {
    const normalized = normalizeExecutionString(field);
    if (normalized) {
      requiredFieldSet.add(normalized);
    }
  }
  const requiredFields = Array.from(requiredFieldSet).sort((a, b) => a.localeCompare(b));

  const observedToolCalls = args.toolResults
    .map((toolResult, index) => ({
      toolName: toolResult.tool,
      callId: `tool_call_${index + 1}`,
      turnId: normalizeExecutionString(args.turnId) ?? undefined,
      status: toolResult.status,
      outputRef: resolveActionCompletionOutputRef(toolResult.result),
    }))
    .sort((left, right) => {
      const toolCompare = left.toolName.localeCompare(right.toolName);
      if (toolCompare !== 0) {
        return toolCompare;
      }
      return left.callId.localeCompare(right.callId);
    });

  return {
    contractVersion: ACTION_COMPLETION_EVIDENCE_CONTRACT_VERSION,
    outcomeKey,
    requiredTools,
    requiredFields,
    observedToolCalls,
    preconditionCheck: {
      passed: true,
      missingFields: [],
    },
    decision: {
      status: "pass",
      failureCode: null,
    },
  };
}

export function verifyActionCompletionEvidenceContract(args: {
  evidence: ActionCompletionEvidenceContract;
  availableToolNames: string[];
}): {
  passed: boolean;
  failureCode?: ActionCompletionEnforcementReasonCode;
  failureDetail?: string;
} {
  const requiredTools = normalizeDeterministicExecutionToolNames(args.evidence.requiredTools);
  const availableTools = new Set(
    normalizeDeterministicExecutionToolNames(args.availableToolNames)
  );
  const missingAvailable = requiredTools.filter((toolName) => !availableTools.has(toolName));
  if (missingAvailable.length > 0) {
    return {
      passed: false,
      failureCode: "claim_tool_unavailable",
      failureDetail: `Required tools unavailable: ${missingAvailable.join(", ")}`,
    };
  }

  const successfulObservedTools = new Set(
    collectSuccessfulToolNames(
      args.evidence.observedToolCalls.map((call) => ({
        tool: call.toolName,
        status: call.status,
      }))
    )
  );
  const missingObserved = requiredTools.filter((toolName) =>
    !successfulObservedTools.has(toolName)
  );
  if (missingObserved.length > 0) {
    return {
      passed: false,
      failureCode: "claim_tool_not_observed",
      failureDetail: `Required tools not observed with success status: ${missingObserved.join(", ")}`,
    };
  }

  return { passed: true };
}

export function resolveActionCompletionContractEnforcement(args: {
  authorityConfig: Record<string, unknown> | null | undefined;
  runtimeContractConfig?: ActionCompletionRuntimeContractConfig;
  claims: ParsedActionCompletionClaim[];
  malformedClaimCount: number;
  toolResults: AgentToolResult[];
  availableToolNames: string[];
  preferredLanguage?: string | ActionCompletionResponseLanguage | null;
  turnId?: string;
}): ActionCompletionContractEnforcementDecision {
  const responseLanguage = resolveActionCompletionResponseLanguage({
    authorityConfig: args.authorityConfig,
    preferredLanguage: args.preferredLanguage,
  });
  const runtimeContractConfig =
    args.runtimeContractConfig
    ?? resolveActionCompletionContractsForRuntime({
      authorityConfig: args.authorityConfig,
      preferredLanguage: responseLanguage,
    });
  const contracts = runtimeContractConfig.outcomes;
  if (contracts.length === 0 || runtimeContractConfig.mode === "off") {
    return {
      enforced: false,
      payload: {
        contractVersion: ACTION_COMPLETION_ENFORCEMENT_CONTRACT_VERSION,
        status: "pass",
        enforcementMode: runtimeContractConfig.mode,
        observedViolation: false,
        requiredTools: [],
        observedTools: normalizeDeterministicExecutionToolNames(
          args.toolResults.map((result) => result.tool)
        ),
        availableTools: normalizeDeterministicExecutionToolNames(
          args.availableToolNames
        ),
        malformedClaimCount: args.malformedClaimCount,
      },
    };
  }

  const observedTools = normalizeDeterministicExecutionToolNames(
    args.toolResults.map((result) => result.tool)
  );
  const availableTools = normalizeDeterministicExecutionToolNames(
    args.availableToolNames
  );
  const contractByOutcome = new Map(contracts.map((contract) => [contract.outcome, contract]));
  const normalizedClaims = args.claims
    .map((claim) => ({
      ...claim,
      outcome: normalizeExecutionString(claim.outcome) ?? "",
    }))
    .filter((claim) => claim.outcome.length > 0);

  const firstClaim = normalizedClaims[0];
  const claimedContract = firstClaim ? contractByOutcome.get(firstClaim.outcome) : undefined;

  let reasonCode: ActionCompletionEnforcementReasonCode | undefined;
  let enforcementMessage: string | undefined;
  let outcome: string | undefined;
  let claimStatus: ActionCompletionClaimStatus | undefined;
  let requiredTools: string[] = [];
  let evidence: ActionCompletionEvidenceContract | undefined;

  if (args.malformedClaimCount > 0) {
    requiredTools = claimedContract
      ? normalizeDeterministicExecutionToolNames(claimedContract.requiredTools)
      : [];
    reasonCode = "claim_payload_invalid";
    enforcementMessage = buildActionCompletionInvalidPayloadMessage(responseLanguage);
    outcome = firstClaim?.outcome;
    claimStatus = firstClaim?.status;
  }

  if (!reasonCode && !claimedContract) {
    return {
      enforced: false,
      payload: {
        contractVersion: ACTION_COMPLETION_ENFORCEMENT_CONTRACT_VERSION,
        status: "pass",
        enforcementMode: runtimeContractConfig.mode,
        observedViolation: false,
        requiredTools: [],
        observedTools,
        availableTools,
        malformedClaimCount: 0,
      },
    };
  }

  if (!reasonCode && claimedContract) {
    requiredTools = normalizeDeterministicExecutionToolNames(
      claimedContract.requiredTools
    );
    outcome = claimedContract.outcome;
    claimStatus = firstClaim?.status;
    evidence = buildActionCompletionEvidenceContract({
      outcomeKey: claimedContract.outcome,
      requiredTools,
      toolResults: args.toolResults,
      turnId: args.turnId,
    });
    const evidenceVerification = verifyActionCompletionEvidenceContract({
      evidence,
      availableToolNames: args.availableToolNames,
    });
    if (!evidenceVerification.passed && evidenceVerification.failureCode) {
      reasonCode = evidenceVerification.failureCode;
      enforcementMessage =
        evidenceVerification.failureCode === "claim_tool_unavailable"
          ? claimedContract.unavailableMessage
          : claimedContract.notObservedMessage;
      evidence = {
        ...evidence,
        decision: {
          status: "fail",
          failureCode: evidenceVerification.failureCode,
          failureDetail: evidenceVerification.failureDetail,
        },
      };
    } else if (evidence) {
      evidence = {
        ...evidence,
        decision: {
          status: "pass",
          failureCode: null,
        },
      };
    }
  }

  if (reasonCode) {
    const shouldEnforce = runtimeContractConfig.mode === "enforce";
    return {
      enforced: shouldEnforce,
      assistantContent: shouldEnforce ? enforcementMessage : undefined,
      payload: {
        contractVersion: ACTION_COMPLETION_ENFORCEMENT_CONTRACT_VERSION,
        status: shouldEnforce ? "enforced" : "pass",
        enforcementMode: runtimeContractConfig.mode,
        observedViolation: true,
        reasonCode,
        outcome,
        claimStatus,
        requiredTools,
        observedTools,
        availableTools,
        malformedClaimCount: args.malformedClaimCount,
        evidence,
      },
    };
  }

  return {
    enforced: false,
    payload: {
      contractVersion: ACTION_COMPLETION_ENFORCEMENT_CONTRACT_VERSION,
      status: "pass",
      enforcementMode: runtimeContractConfig.mode,
      observedViolation: false,
      outcome,
      claimStatus,
      requiredTools,
      observedTools,
      availableTools,
      malformedClaimCount: 0,
      evidence,
    },
  };
}

export function resolveAuditDeliverableInvocationGuardrail(args: {
  authorityConfig: Record<string, unknown> | null | undefined;
  inboundMessage: string;
  assistantContent: string;
  toolResults: AgentToolResult[];
  availableToolNames: string[];
  recentUserMessages?: string[];
  capturedEmail?: string | null;
  capturedName?: string | null;
  contactMemory?: SessionContactMemoryRecord[];
  auditSessionWorkflowRecommendation?: string | null;
  recoveryAttemptCount?: number;
  turnId?: string;
}): {
  enforced: boolean;
  assistantContent?: string;
  reason?:
    | "tool_not_invoked"
    | "tool_unavailable"
    | "missing_required_fields"
    | "missing_audit_session_context"
    | "audit_session_not_found";
  payload: ActionCompletionContractEnforcementPayload;
} {
  const responseLanguage = resolveActionCompletionResponseLanguage({
    authorityConfig: args.authorityConfig,
    inboundMessage: args.inboundMessage,
    assistantContent: args.assistantContent,
  });
  const parsedClaims = extractActionCompletionClaimsFromAssistantContent(
    args.assistantContent
  );
  const runtimeContractConfig = resolveActionCompletionContractsForRuntime({
    authorityConfig: args.authorityConfig,
    preferredLanguage: responseLanguage,
  });
  const auditDeliverableContract = runtimeContractConfig.outcomes.find((contract) =>
    isSamanthaAuditDeliverableActionCompletionOutcome({
      outcome: contract.outcome,
      requiredTools: contract.requiredTools,
    })
  );
  const inferredClaims = parsedClaims.claims.length > 0
    ? parsedClaims.claims
    : (
        parsedClaims.malformedClaimCount === 0
        && auditDeliverableContract
        && isLikelyAuditDeliverableInvocationRequest(args.inboundMessage)
      )
      ? [
          {
            contractVersion: ACTION_COMPLETION_CLAIM_CONTRACT_VERSION,
            outcome: auditDeliverableContract.outcome,
            status: "in_progress" as const,
          },
        ]
      : [];
  const decision = resolveActionCompletionContractEnforcement({
    authorityConfig: args.authorityConfig,
    runtimeContractConfig,
    claims: inferredClaims,
    malformedClaimCount: parsedClaims.malformedClaimCount,
    toolResults: args.toolResults,
    availableToolNames: args.availableToolNames,
    preferredLanguage: responseLanguage,
    turnId: args.turnId,
  });

  const leadData = resolveSamanthaAuditLeadData({
    inboundMessage: args.inboundMessage,
    recentUserMessages: args.recentUserMessages ?? [],
    capturedEmail: args.capturedEmail,
    capturedName: args.capturedName,
    contactMemory: args.contactMemory,
    auditSessionWorkflowRecommendation: args.auditSessionWorkflowRecommendation,
  });
  const missingRequiredFields = leadData.missingRequiredFields;
  const sessionContextFailure = resolveSamanthaAuditSessionContextFailure(args.toolResults);
  const recoveryAttemptCount =
    typeof args.recoveryAttemptCount === "number" && Number.isFinite(args.recoveryAttemptCount)
      ? Math.max(1, Math.floor(args.recoveryAttemptCount))
      : 1;

  let preflightReasonCode: SamanthaPreflightReasonCode | undefined;
  if (decision.payload.reasonCode === "claim_tool_unavailable") {
    preflightReasonCode = "tool_unavailable";
  } else if (decision.payload.reasonCode === "claim_tool_not_observed") {
    if (sessionContextFailure === SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING) {
      preflightReasonCode = "missing_audit_session_context";
    } else if (sessionContextFailure === SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_NOT_FOUND) {
      preflightReasonCode = "audit_session_not_found";
    } else {
      preflightReasonCode =
        missingRequiredFields.length > 0 ? "missing_required_fields" : "tool_not_observed";
    }
  }

  let reason:
    | "tool_not_invoked"
    | "tool_unavailable"
    | "missing_required_fields"
    | "missing_audit_session_context"
    | "audit_session_not_found"
    | undefined;
  if (decision.enforced && decision.payload.reasonCode === "claim_tool_not_observed") {
    if (preflightReasonCode === "missing_required_fields") {
      reason = "missing_required_fields";
    } else if (preflightReasonCode === "missing_audit_session_context") {
      reason = "missing_audit_session_context";
    } else if (preflightReasonCode === "audit_session_not_found") {
      reason = "audit_session_not_found";
    } else {
      reason = "tool_not_invoked";
    }
  } else if (decision.enforced && decision.payload.reasonCode === "claim_tool_unavailable") {
    reason = "tool_unavailable";
  }

  let assistantContent = decision.assistantContent;
  const isSamanthaDeliverableOutcome = isSamanthaAuditDeliverableActionCompletionOutcome({
    outcome: decision.payload.outcome || "",
    requiredTools: decision.payload.requiredTools,
  });
  const isSamanthaRuntime = isSamanthaLeadCaptureRuntime(args.authorityConfig);
  if (
    decision.enforced
    && decision.payload.reasonCode === "claim_tool_not_observed"
    && preflightReasonCode === "missing_required_fields"
    && isSamanthaDeliverableOutcome
    && isSamanthaRuntime
  ) {
    assistantContent = buildSamanthaMissingFieldRecoveryMessage({
      leadData,
      language: responseLanguage,
      recoveryAttemptCount,
    });
  } else if (
    decision.enforced
    && decision.payload.reasonCode === "claim_tool_not_observed"
    && preflightReasonCode === "tool_not_observed"
    && isSamanthaDeliverableOutcome
    && isSamanthaRuntime
  ) {
    assistantContent = buildSamanthaAuditDeliverableVerificationFallbackMessage(
      responseLanguage
    );
  }
  if (isSamanthaRuntime && assistantContent) {
    assistantContent = sanitizeSamanthaEmailOnlyAssistantContent({
      assistantContent,
      language: responseLanguage,
    }).assistantContent;
  }

  return {
    enforced: decision.enforced,
    assistantContent,
    reason,
    payload: {
      ...decision.payload,
      preflightReasonCode,
      preflightMissingRequiredFields:
        preflightReasonCode === "missing_required_fields" ? missingRequiredFields : undefined,
    },
  };
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

async function resolveActiveEmailDomainConfigIdForOrg(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">,
): Promise<Id<"objects"> | undefined> {
  const orgDomainConfigs = await ctx.runQuery(
    getInternal().domainConfigOntology.listDomainConfigsForOrg,
    {
      organizationId,
    },
  );
  const orgActive = orgDomainConfigs?.find(
    (config: { status?: string; _id?: string }) => config.status === "active",
  );
  if (orgActive?._id) {
    return orgActive._id as Id<"objects">;
  }

  const systemOrg = await ctx.runQuery(
    getInternal().helpers.backendTranslationQueries.getSystemOrganization,
    {},
  );
  if (!systemOrg?._id) {
    return undefined;
  }

  const systemDomainConfigs = await ctx.runQuery(
    getInternal().domainConfigOntology.listDomainConfigsForOrg,
    {
      organizationId: systemOrg._id,
    },
  );
  const systemActive = systemDomainConfigs?.find(
    (config: { status?: string; _id?: string }) => config.status === "active",
  );
  if (!systemActive?._id) {
    return undefined;
  }
  return systemActive._id as Id<"objects">;
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

type InboundVoiceTurnVisionUnavailableReason =
  | "camera_not_capturing"
  | "camera_error"
  | "vision_frame_missing"
  | "vision_frame_stale"
  | "vision_policy_blocked"
  | "vision_resolution_failed";

function normalizeInboundVoiceTurnVisionUnavailableReason(
  value: unknown
): InboundVoiceTurnVisionUnavailableReason | null {
  const normalized = firstInboundString(value)?.toLowerCase();
  if (
    normalized === "camera_not_capturing"
    || normalized === "camera_error"
    || normalized === "vision_frame_missing"
    || normalized === "vision_frame_stale"
    || normalized === "vision_policy_blocked"
    || normalized === "vision_resolution_failed"
  ) {
    return normalized;
  }
  return null;
}

function resolveInboundVoiceTurnVisionUnavailableDetail(args: {
  reasonCode: InboundVoiceTurnVisionUnavailableReason;
  cameraSessionState: string | null | undefined;
  cameraFallbackReason: string | null | undefined;
  maxFrameAgeMs: number | null;
  freshestCandidateAgeMs: number | null;
}): string {
  if (args.reasonCode === "camera_not_capturing") {
    return `Camera session state for this turn was ${
      args.cameraSessionState || "not_capturing"
    }.`;
  }
  if (args.reasonCode === "camera_error") {
    if (args.cameraFallbackReason) {
      return `Camera runtime reported fallback reason: ${args.cameraFallbackReason}.`;
    }
    return "Camera runtime reported an unavailable or degraded camera path.";
  }
  if (args.reasonCode === "vision_frame_missing") {
    return "No fresh frame candidate was available at turn assembly time.";
  }
  if (args.reasonCode === "vision_frame_stale") {
    const staleAgeDetail =
      typeof args.freshestCandidateAgeMs === "number"
      && typeof args.maxFrameAgeMs === "number"
        ? ` Freshest frame age ${args.freshestCandidateAgeMs}ms exceeded ${args.maxFrameAgeMs}ms freshness budget.`
        : "";
    return `The freshest frame candidate was stale for turn attachment.${staleAgeDetail}`.trim();
  }
  if (args.reasonCode === "vision_policy_blocked") {
    return "Vision frame attachment was blocked by policy or retention constraints.";
  }
  return "Turn-time vision frame resolution failed before an attachment could be created.";
}

export function buildInboundVoiceTurnVisionRuntimeContext(
  metadata: Record<string, unknown>
): string | null {
  const conversationRuntime = normalizeInboundObjectValue(metadata.conversationRuntime);
  const cameraRuntime = normalizeInboundObjectValue(metadata.cameraRuntime);
  const voiceRuntime = normalizeInboundObjectValue(metadata.voiceRuntime);
  const visionTurnContext = normalizeInboundObjectValue(voiceRuntime?.visionTurnContext);
  const visionResolution = normalizeInboundObjectValue(
    voiceRuntime?.visionFrameResolution ?? metadata.visionFrameResolution
  );

  const conversationMode = firstInboundString(conversationRuntime?.mode)?.toLowerCase();
  const requestedEyesSource =
    firstInboundString(conversationRuntime?.requestedEyesSource)?.toLowerCase();
  const sourceMode = firstInboundString(
    conversationRuntime?.sourceMode,
    voiceRuntime?.sourceMode
  )?.toLowerCase();
  const visionRequested =
    visionTurnContext?.requested === true
    || conversationMode === "voice_with_eyes"
    || requestedEyesSource === "webcam"
    || requestedEyesSource === "meta_glasses"
    || sourceMode === "webcam"
    || sourceMode === "meta_glasses";
  if (!visionRequested) {
    return null;
  }

  const frameAttachmentClaimed =
    visionTurnContext?.frameAttached === true
    || firstInboundString(visionResolution?.status) === "attached";
  const resolvedFrameAttachment =
    resolveInboundVoiceTurnVisionFrameAttachmentInput(metadata);
  const frameAttached = Boolean(resolvedFrameAttachment);
  if (frameAttached) {
    return [
      "--- TURN VISION STATUS ---",
      "Vision mode requested for this turn.",
      "Turn frame attachment status: attached.",
      "Use attached frame context for visual claims and avoid implying continuous live video access.",
      "--- END TURN VISION STATUS ---",
    ].join("\n");
  }

  const explicitReasonCode = normalizeInboundVoiceTurnVisionUnavailableReason(
    visionTurnContext?.unavailableReason
  );
  const degradedReasonCode = normalizeInboundVoiceTurnVisionUnavailableReason(
    visionResolution?.reason
  );
  const cameraSessionState = firstInboundString(
    visionTurnContext?.cameraSessionState,
    cameraRuntime?.sessionState
  );
  const cameraFallbackReason = firstInboundString(
    visionTurnContext?.cameraFallbackReason,
    cameraRuntime?.fallbackReason
  );
  const maxFrameAgeMsRaw =
    visionTurnContext?.maxFrameAgeMs ?? visionResolution?.maxFrameAgeMs;
  const maxFrameAgeMs =
    typeof maxFrameAgeMsRaw === "number" && Number.isFinite(maxFrameAgeMsRaw)
      ? Math.max(0, Math.floor(maxFrameAgeMsRaw))
      : null;
  const freshestCandidateAgeMsRaw =
    visionTurnContext?.freshestCandidateAgeMs
    ?? visionResolution?.freshestCandidateAgeMs;
  const freshestCandidateAgeMs =
    typeof freshestCandidateAgeMsRaw === "number" && Number.isFinite(freshestCandidateAgeMsRaw)
      ? Math.max(0, Math.floor(freshestCandidateAgeMsRaw))
      : null;

  const reasonCode =
    explicitReasonCode
    ?? degradedReasonCode
    ?? (frameAttachmentClaimed ? "vision_resolution_failed" : null)
    ?? (
      cameraSessionState && cameraSessionState.toLowerCase() !== "capturing"
        ? "camera_not_capturing"
        : null
    )
    ?? (cameraFallbackReason ? "camera_error" : "vision_frame_missing");
  const reasonDetail = resolveInboundVoiceTurnVisionUnavailableDetail({
    reasonCode,
    cameraSessionState,
    cameraFallbackReason,
    maxFrameAgeMs,
    freshestCandidateAgeMs,
  });

  const lines: string[] = [
    "Vision mode requested for this turn.",
    "Turn frame attachment status: unavailable.",
    `Reason code: ${reasonCode}.`,
    `Reason detail: ${reasonDetail}`,
    "If the user asks whether you can see them or read live camera input, explain this reason directly and request a fresh camera frame when needed.",
    "Do not claim live visual access without an attached frame.",
  ];
  if (typeof maxFrameAgeMs === "number") {
    lines.push(`Frame freshness budget: ${maxFrameAgeMs}ms.`);
  }
  if (typeof freshestCandidateAgeMs === "number") {
    lines.push(`Freshest candidate age: ${freshestCandidateAgeMs}ms.`);
  }

  return [
    "--- TURN VISION STATUS ---",
    lines.join("\n"),
    "--- END TURN VISION STATUS ---",
  ].join("\n");
}

export function resolveInboundVoiceTurnVisionFrameAttachmentInput(
  metadata: Record<string, unknown>
): Record<string, unknown> | null {
  const voiceRuntime = normalizeInboundObjectValue(metadata.voiceRuntime);
  const resolution = normalizeInboundObjectValue(
    voiceRuntime?.visionFrameResolution ?? metadata.visionFrameResolution
  );
  if (!resolution || firstInboundString(resolution.status) !== "attached") {
    return null;
  }

  const frame = normalizeInboundObjectValue(resolution.frame);
  const url = firstInboundString(
    frame?.storageUrl,
    frame?.url,
    frame?.imageUrl
  );
  const mimeType = firstInboundString(frame?.mimeType, frame?.mime_type)
    ?.toLowerCase();
  const sizeBytesRaw = frame?.sizeBytes;
  const sizeBytes =
    typeof sizeBytesRaw === "number" && Number.isFinite(sizeBytesRaw)
      ? Math.max(0, Math.round(sizeBytesRaw))
      : 0;
  if (!url || !mimeType || !mimeType.startsWith("image/") || sizeBytes <= 0) {
    return null;
  }

  const capturedAt =
    typeof frame?.capturedAt === "number" && Number.isFinite(frame.capturedAt)
      ? Math.floor(frame.capturedAt)
      : undefined;
  const retentionId = firstInboundString(frame?.retentionId);
  return {
    type: "image",
    name: capturedAt ? `voice-turn-frame-${capturedAt}` : "voice-turn-frame",
    mimeType,
    sizeBytes,
    url,
    sourceId: retentionId ?? "voice_turn_freshest_frame",
  };
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

function normalizeRuntimeSystemContext(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildTargetAgentConfigurationContext(args: {
  targetAgent: {
    _id: Id<"objects">;
    name: string;
    subtype?: string;
    status?: string;
    customProperties?: Record<string, unknown>;
  };
  layeredContextSystemPrompt?: string;
}): string {
  const customProperties =
    (args.targetAgent.customProperties as Record<string, unknown> | undefined) ?? {};
  const templateCloneLinkage =
    customProperties.templateCloneLinkage
    && typeof customProperties.templateCloneLinkage === "object"
      ? customProperties.templateCloneLinkage
      : undefined;
  const targetSnapshot = {
    agentId: String(args.targetAgent._id),
    name: args.targetAgent.name,
    displayName: normalizeExecutionString(customProperties.displayName),
    subtype: normalizeExecutionString(args.targetAgent.subtype),
    status: normalizeExecutionString(args.targetAgent.status),
    templateContext: {
      sourceTemplateId: normalizeExecutionString(
        (templateCloneLinkage as Record<string, unknown> | undefined)?.sourceTemplateId
          ?? customProperties.templateAgentId,
      ),
      sourceTemplateVersion: normalizeExecutionString(
        (templateCloneLinkage as Record<string, unknown> | undefined)?.sourceTemplateVersion
          ?? customProperties.templateVersion,
      ),
      cloneLifecycleState: normalizeExecutionString(
        (templateCloneLinkage as Record<string, unknown> | undefined)?.cloneLifecycleState
          ?? customProperties.cloneLifecycle,
      ),
      overridePolicyMode: normalizeExecutionString(
        ((templateCloneLinkage as Record<string, unknown> | undefined)?.overridePolicy as
          | Record<string, unknown>
          | undefined)?.mode
          ?? (customProperties.overridePolicy as Record<string, unknown> | undefined)?.mode,
      ),
    },
    currentSettings: {
      name: normalizeExecutionString(args.targetAgent.name),
      subtype: normalizeExecutionString(args.targetAgent.subtype),
      displayName: normalizeExecutionString(customProperties.displayName),
      agentClass: normalizeExecutionString(customProperties.agentClass),
      personality: normalizeExecutionString(customProperties.personality),
      language: normalizeExecutionString(customProperties.language),
      additionalLanguages: Array.isArray(customProperties.additionalLanguages)
        ? customProperties.additionalLanguages
        : [],
      voiceLanguage: normalizeExecutionString(customProperties.voiceLanguage),
      elevenLabsVoiceId: normalizeExecutionString(customProperties.elevenLabsVoiceId),
      brandVoiceInstructions: normalizeExecutionString(customProperties.brandVoiceInstructions),
      systemPrompt: normalizeExecutionString(customProperties.systemPrompt),
      faqEntries: Array.isArray(customProperties.faqEntries)
        ? customProperties.faqEntries
        : [],
      knowledgeBaseTags: Array.isArray(customProperties.knowledgeBaseTags)
        ? customProperties.knowledgeBaseTags
        : [],
      toolProfile: normalizeExecutionString(customProperties.toolProfile),
      enabledTools: Array.isArray(customProperties.enabledTools)
        ? customProperties.enabledTools
        : [],
      disabledTools: Array.isArray(customProperties.disabledTools)
        ? customProperties.disabledTools
        : [],
      autonomyLevel: normalizeExecutionString(customProperties.autonomyLevel),
      maxMessagesPerDay:
        typeof customProperties.maxMessagesPerDay === "number"
          ? customProperties.maxMessagesPerDay
          : null,
      maxCostPerDay:
        typeof customProperties.maxCostPerDay === "number"
          ? customProperties.maxCostPerDay
          : null,
      requireApprovalFor: Array.isArray(customProperties.requireApprovalFor)
        ? customProperties.requireApprovalFor
        : [],
      modelId: normalizeExecutionString(customProperties.modelId),
      temperature:
        typeof customProperties.temperature === "number"
          ? customProperties.temperature
          : null,
      maxTokens:
        typeof customProperties.maxTokens === "number"
          ? customProperties.maxTokens
          : null,
      channelBindings: Array.isArray(customProperties.channelBindings)
        ? customProperties.channelBindings
        : [],
      blockedTopics: Array.isArray(customProperties.blockedTopics)
        ? customProperties.blockedTopics
        : [],
      escalationPolicy:
        customProperties.escalationPolicy && typeof customProperties.escalationPolicy === "object"
          ? customProperties.escalationPolicy
          : null,
      unifiedPersonality:
        typeof customProperties.unifiedPersonality === "boolean"
          ? customProperties.unifiedPersonality
          : null,
      teamAccessMode: normalizeExecutionString(customProperties.teamAccessMode),
      operatorCollaborationDefaults:
        customProperties.operatorCollaborationDefaults
        && typeof customProperties.operatorCollaborationDefaults === "object"
          ? customProperties.operatorCollaborationDefaults
          : null,
      dreamTeamSpecialists: Array.isArray(customProperties.dreamTeamSpecialists)
        ? customProperties.dreamTeamSpecialists
        : [],
      activeSoulMode: normalizeExecutionString(customProperties.activeSoulMode),
      activeArchetype: normalizeExecutionString(customProperties.activeArchetype),
      modeChannelBindings: Array.isArray(customProperties.modeChannelBindings)
        ? customProperties.modeChannelBindings
        : [],
      enabledArchetypes: Array.isArray(customProperties.enabledArchetypes)
        ? customProperties.enabledArchetypes
        : [],
      soul:
        customProperties.soul && typeof customProperties.soul === "object"
          ? customProperties.soul
          : null,
      telephonyConfig:
        customProperties.telephonyConfig !== undefined
          ? toDeployableTelephonyConfig(customProperties.telephonyConfig)
          : null,
    },
  };

  return [
    "[TARGET_AGENT_CONFIGURATION_CONTEXT_V1]",
    "This chat is scoped to configuring a target agent's saved settings.",
    "When the operator requests concrete agent setting changes, use configure_agent_fields with only the fields you intend to change.",
    `Target agent snapshot:\n${JSON.stringify(targetSnapshot, null, 2)}`,
    args.layeredContextSystemPrompt
      ? `Layered context grounding for the target agent:\n${args.layeredContextSystemPrompt}`
      : "Layered context grounding for the target agent: none.",
  ].join("\n\n");
}

export function assembleRuntimeSystemMessages(args: {
  systemPrompt: string;
  pinnedNotesContext?: string | null;
  rollingSummaryContext?: string | null;
  reactivationMemoryContext?: string | null;
  contactMemoryContext?: string | null;
  composerRuntimeContext?: string | null;
  targetAgentConfigurationContext?: string | null;
  layeredContextSystemPrompt?: string | null;
  planFeasibilityContext?: string | null;
  commercialKickoffRuntimeContext?: string | null;
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
  const targetAgentConfigurationContext = normalizeRuntimeSystemContext(
    args.targetAgentConfigurationContext
  );
  if (targetAgentConfigurationContext) {
    messages.push({
      role: "system",
      content: targetAgentConfigurationContext,
    });
  }
  const layeredContextSystemPrompt = normalizeRuntimeSystemContext(
    args.layeredContextSystemPrompt
  );
  if (layeredContextSystemPrompt) {
    messages.push({
      role: "system",
      content: layeredContextSystemPrompt,
    });
  }
  const planFeasibilityContext = normalizeRuntimeSystemContext(args.planFeasibilityContext);
  if (planFeasibilityContext) {
    messages.push({
      role: "system",
      content: planFeasibilityContext,
    });
  }
  const commercialKickoffRuntimeContext = normalizeRuntimeSystemContext(
    args.commercialKickoffRuntimeContext
  );
  if (commercialKickoffRuntimeContext) {
    messages.push({
      role: "system",
      content: commercialKickoffRuntimeContext,
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
}): string {
  return resolveDeterministicVoiceDefaults({
    requestedVoiceId: args.inboundVoiceRequest.requestedVoiceId,
    agentVoiceId: args.agentConfig?.elevenLabsVoiceId,
    orgDefaultVoiceId: args.orgDefaultVoiceId,
  }).resolvedVoiceId;
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
