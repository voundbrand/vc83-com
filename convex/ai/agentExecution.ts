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
import { getToolSchemas } from "./tools/registry";
import type { ToolExecutionContext } from "./tools/registry";
import type { Id } from "../_generated/dataModel";
import { getToolCreditCost } from "../credits/index";
import { composeKnowledgeContract } from "./systemKnowledge/index";
import { withRetry, LLM_RETRY_POLICY } from "./retryPolicy";
import { getUserErrorMessage, classifyError } from "./errorMessages";
import {
  getPlatformBlockedTools,
  resolveActiveToolsWithAudit,
  SUBTYPE_DEFAULT_PROFILES,
} from "./toolScoping";
import { getAllToolDefinitions } from "./tools/registry";
import {
  composeKnowledgeContext,
  getUtf8ByteLength,
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
  resolveAuthProfileBaseUrl,
} from "./modelAdapters";
import { resolveOrganizationProviderBindingForProvider } from "./providerRegistry";
import {
  buildModelRoutingMatrix,
  determineModelSelectionSource,
  normalizeCanonicalBillingSource,
  SAFE_FALLBACK_MODEL_ID,
  resolveModelRoutingIntent,
  resolveModelRoutingModality,
  resolveOrgDefaultModel,
  resolveRequestedModel,
  selectFirstPlatformEnabledModel,
} from "./modelPolicy";
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
import { buildHarnessContext, determineAgentLayer } from "./harness";
import {
  buildAgentSystemPrompt,
  mapSemanticChunksToKnowledgeDocuments,
  resolveKnowledgeRetrieval,
  type SemanticKnowledgeChunkSearchResult,
} from "./agentPromptAssembly";
import {
  buildToolErrorStatePatch,
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
  additionalLanguages?: string[];
  brandVoiceInstructions?: string;
  systemPrompt?: string;
  faqEntries?: Array<{ q: string; a: string }>;
  knowledgeBaseTags?: string[];
  toolProfile?: string;
  enabledTools?: string[];
  disabledTools?: string[];
  autonomyLevel: "supervised" | "autonomous" | "draft_only";
  maxMessagesPerDay?: number;
  maxCostPerDay?: number;
  requireApprovalFor?: string[];
  blockedTopics?: string[];
  modelProvider?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  channelBindings?: Array<{ channel: string; enabled: boolean }>;
  escalationPolicy?: EscalationPolicy;
  useToolBroker?: boolean;
}

export const THREAD_DELIVERY_STATE_VALUES = [
  "queued",
  "running",
  "done",
  "blocked",
  "failed",
] as const;

export type ThreadDeliveryState = (typeof THREAD_DELIVERY_STATE_VALUES)[number];

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
    useCase: v.string(),
    ownerUserId: v.optional(v.id("users")),
    playbook: v.optional(v.string()),
    spawnReason: v.optional(v.string()),
    preferredCloneName: v.optional(v.string()),
    reuseExisting: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<{
    status: "success";
    cloneAgentId: Id<"objects">;
    cloneAgentName: string;
    templateAgentId: Id<"objects">;
    ownerUserId: Id<"users">;
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
  }> => {
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
    }) as { name?: string } | null;

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
      useCase: spawnResult.useCase,
      useCaseKey: spawnResult.useCaseKey,
      quota: spawnResult.quota,
    };
  },
});

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
    toolResults?: Array<{ tool: string; status: string; result?: unknown; error?: string }>;
    sessionId?: string;
    turnId?: string;
    voiceRuntime?: Record<string, unknown>;
  }> => {
    const inboundMetadata = (args.metadata as Record<string, unknown>) || {};
    const inboundChannelRouteIdentity = resolveInboundChannelRouteIdentity(
      inboundMetadata
    );
    const inboundDispatchRouteSelectors = resolveInboundDispatchRouteSelectors({
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      metadata: inboundMetadata,
    });

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

    await ctx.runMutation(getInternal().ai.agentSessions.recoverStaleRunningTurns, {
      organizationId: args.organizationId,
      sessionId: session._id,
      agentId: agent._id,
      reason: "inbound_turn_start",
    });

    const inboundIdempotencyKey = resolveInboundIdempotencyKey({
      providedKey: inboundMetadata.idempotencyKey,
      metadata: inboundMetadata,
      organizationId: args.organizationId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      message: args.message,
      channelRouteIdentity: inboundChannelRouteIdentity,
    });

    const receiptIngress = await ctx.runMutation(getInternal().ai.agentExecution.ingestInboundReceipt, {
      organizationId: args.organizationId,
      sessionId: session._id,
      agentId: agent._id,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      idempotencyKey: inboundIdempotencyKey,
      metadata: {
        channel: args.channel,
        externalContactIdentifier: args.externalContactIdentifier,
        channelRouteIdentity: inboundChannelRouteIdentity,
        routeSelectors: inboundDispatchRouteSelectors,
      },
    }) as {
      receiptId?: Id<"agentInboxReceipts">;
      duplicate?: boolean;
      status?: string;
      turnId?: Id<"agentTurns">;
    } | null;

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
      agentId: agent._id,
      idempotencyKey: inboundIdempotencyKey,
      metadata: {
        channel: args.channel,
        externalContactIdentifier: args.externalContactIdentifier,
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
      agentId: agent._id,
      organizationId: args.organizationId,
      leaseOwner: `agentExecution:${args.channel}`,
      expectedVersion: runtimeTurnVersion,
      leaseDurationMs: 3 * 60_000,
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
        message: "Another turn is already running for this session.",
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
      }
    }

    // 3.5. Check if session has an active escalation (human-in-the-loop)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionEsc = (session as any).escalationState;
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

    const aiSettings = await ctx.runQuery(getApi().api.ai.settings.getAISettings, {
      organizationId: args.organizationId,
    }) as any;

    let inboundMessage = args.message;
    const inboundVoiceRequest = resolveInboundVoiceRuntimeRequest(inboundMetadata);
    let voiceRuntimeMetadata: Record<string, unknown> | undefined;

    if (inboundVoiceRequest) {
      try {
        const elevenLabsBinding = resolveElevenLabsRuntimeBinding({ aiSettings });
        const resolvedVoiceAdapter = await resolveVoiceRuntimeAdapter({
          requestedProviderId: inboundVoiceRequest.requestedProviderId,
          elevenLabsBinding,
          fetchFn: fetch,
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
              language: inboundVoiceRequest.language,
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
          } catch (error) {
            voiceRuntimeMetadata = {
              ...voiceRuntimeMetadata,
              transcribeSuccess: false,
              transcriptionError:
                error instanceof Error ? error.message : "voice_transcription_failed",
            };
          }
        }
      } catch (error) {
        voiceRuntimeMetadata = {
          requestedProviderId: inboundVoiceRequest.requestedProviderId,
          transcribeSuccess: false,
          synthesisSuccess: false,
          runtimeError:
            error instanceof Error ? error.message : "voice_runtime_resolution_failed",
        };
      }
    }

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
    const sessionData = session as { sessionMode?: string; interviewTemplateId?: Id<"objects"> };

    if (sessionData.sessionMode === "guided" && sessionData.interviewTemplateId) {
      interviewContext = await ctx.runQuery(
        getInternal().ai.interviewRunner.getInterviewContextInternal,
        { sessionId: session._id }
      );
    }

    // 4.7. Pre-LLM escalation check (pattern matching + sentiment on inbound message)
    // Gather recent user messages for sentiment sliding window
    const recentForSentiment = await ctx.runQuery(getInternal().ai.agentSessions.getSessionMessages, {
      sessionId: session._id,
      limit: 5,
    }) as Array<{ role: string; content: string }>;
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

    const platformEnabledModels = await ctx.runQuery(
      getApi().api.ai.platformModels.getEnabledModels,
      {}
    ) as Array<{
      id: string;
      contextLength?: number;
      providerId?: string | null;
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
        message: "No platform-enabled AI models are currently configured",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    const metadata = inboundMetadata;
    const metadataSelectedModel =
      typeof metadata.selectedModel === "string" && metadata.selectedModel.trim().length > 0
        ? metadata.selectedModel.trim()
        : undefined;
    const configuredModelOverride =
      typeof config.modelId === "string" && config.modelId.trim().length > 0
        ? config.modelId.trim()
        : undefined;
    const explicitModelOverride = metadataSelectedModel ?? configuredModelOverride;
    const hasExplicitModelOverride = typeof explicitModelOverride === "string";
    const preferredModel = resolveRequestedModel(aiSettings, explicitModelOverride);
    const orgDefaultModel = resolveOrgDefaultModel(aiSettings);
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
    const orgEnabledModelIds = Array.isArray(aiSettings?.llm?.enabledModels)
      ? aiSettings.llm.enabledModels
          .map((modelSetting: { modelId?: string }) =>
            typeof modelSetting.modelId === "string" ? modelSetting.modelId : null
          )
          .filter((modelId: string | null): modelId is string => Boolean(modelId))
      : [];
    const platformRoutingModels = platformEnabledModels.map((platformModel) => ({
      modelId: platformModel.id,
      providerId:
        typeof platformModel.providerId === "string" &&
        platformModel.providerId.trim().length > 0
          ? platformModel.providerId
          : detectProvider(platformModel.id, aiSettings?.llm?.providerId),
      capabilityMatrix: platformModel.capabilityMatrix ?? undefined,
    }));
    const firstPlatformEnabledModel = platformEnabledModels[0]?.id ?? null;
    const providerIdsToResolve = new Set<string>([
      "openrouter",
      detectProvider(preferredModel, aiSettings?.llm?.providerId),
    ]);
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
      requiresTools: config.useToolBroker === true,
    });
    const routingModality = resolveModelRoutingModality({
      message: inboundMessage,
      metadata,
    });
    const modelRoutingMatrix = buildModelRoutingMatrix({
      preferredModelId: preferredModel,
      sessionPinnedModelId: !hasExplicitModelOverride ? pinnedSessionModelId : null,
      orgDefaultModelId: orgDefaultModel,
      orgEnabledModelIds,
      platformModels: platformRoutingModels,
      safeFallbackModelId: SAFE_FALLBACK_MODEL_ID,
      platformFirstEnabledModelId: firstPlatformEnabledModel,
      hasExplicitModelOverride,
      routingIntent,
      routingModality,
      availableProviderIds,
    });
    const modelRoutingById = new Map(
      modelRoutingMatrix.map((entry) => [entry.modelId, entry])
    );
    const modelsToTry = modelRoutingMatrix.map((entry) => entry.modelId);
    const model =
      modelsToTry[0] ??
      selectFirstPlatformEnabledModel(
        [
          !hasExplicitModelOverride ? pinnedSessionModelId : null,
          preferredModel,
          orgDefaultModel,
          SAFE_FALLBACK_MODEL_ID,
          firstPlatformEnabledModel,
        ],
        platformEnabledModels.map((platformModel) => platformModel.id)
      );
    const selectionSource =
      !hasExplicitModelOverride &&
      pinnedSessionModelId &&
      model === pinnedSessionModelId
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
    const agentProfile = config.toolProfile
      ?? SUBTYPE_DEFAULT_PROFILES[agent.subtype ?? "general"]
      ?? "general";

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
      agentEnabled: config.enabledTools ?? [],
      agentDisabled: config.disabledTools ?? [],
      autonomyLevel: config.autonomyLevel,
      sessionDisabled: sessionDisabledTools,
      channel: args.channel,
    });
    const activeToolDefs = scopedTools.tools;
    const toolScopingAudit = {
      ...scopedTools.audit,
      policySource: orgToolPolicy.policySource,
      policyObjectId: orgToolPolicy.policyObjectId,
      connectedIntegrations: [...connectedIntegrations].sort(),
      agentProfile,
      channel: args.channel,
      agentEnabledCount: (config.enabledTools ?? []).length,
      agentDisabledCount: (config.disabledTools ?? []).length,
      sessionDisabledCount: sessionDisabledTools.length,
    };
    const harnessToolNames = activeToolDefs.map((toolDef) => toolDef.name);
    const activeToolNames = new Set(harnessToolNames);
    let toolSchemas = getToolSchemas().filter((schema) => activeToolNames.has(schema.function.name));

    // Build team handoff context if this is a specialist session
    let handoffCtx: {
      sharedContext?: string;
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
    const harnessContext = buildHarnessContext(
      config,
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
    );

    const handoffPromptContext = handoffCtx
      ? { ...handoffCtx, harnessContext }
      : { harnessContext };
    const systemKnowledgeLoad = composeKnowledgeContract("customer");

    const systemPrompt = buildAgentSystemPrompt(
      config,
      knowledgeBaseDocs,
      interviewContext,
      previousSessionSummary,
      preflightErrorState?.degraded ? preflightErrorState.disabledTools : undefined,
      handoffPromptContext,
      systemKnowledgeLoad,
    );

    // 6. Load conversation history
    const history = await ctx.runQuery(getInternal().ai.agentSessions.getSessionMessages, {
      sessionId: session._id,
      limit: 20,
    });

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of history as Array<{ role: string; content: string }>) {
      messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }

    messages.push({ role: "user", content: inboundMessage });

    // 7. Tool broker — narrow tools by intent + recent usage (feature-flagged)
    let brokerMetrics: BrokerMetrics | undefined;
    if (config.useToolBroker) {
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

    const selectedModelProviderId = detectProvider(model, aiSettings?.llm?.providerId);
    const selectedModelAuthProfiles = orderAuthProfilesForSession(
      providerAuthProfilesById.get(selectedModelProviderId) ?? [],
      pinnedAuthProfileId
    ) as Array<ResolvedAuthProfile & { baseUrl?: string }>;
    const primaryAuthProfileId =
      selectedModelAuthProfiles[0]?.profileId ?? null;
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
    let usedModelRoutingReason = selectedRoutingReason;
    const cooledProfileIds = new Set<string>();

    for (const tryModel of modelsToTry) {
      let succeededOnThisModel = false;
      const tryProviderId = detectProvider(tryModel, aiSettings?.llm?.providerId);
      const providerAuthProfiles = providerAuthProfilesById.get(tryProviderId) ?? [];

      if (providerAuthProfiles.length === 0) {
        console.warn(
          "[AgentExecution] Skipping model due to missing provider auth profiles",
          {
            modelId: tryModel,
            providerId: tryProviderId,
            organizationId: args.organizationId,
          }
        );
        continue;
      }

      const authProfilesToTry = orderAuthProfilesForSession(
        providerAuthProfiles.filter((profile) =>
          !cooledProfileIds.has(`${profile.providerId}:${profile.profileId}`)
        ),
        pinnedAuthProfileId
      ) as Array<ResolvedAuthProfile & { baseUrl?: string }>;

      if (authProfilesToTry.length === 0) {
        console.warn(
          "[AgentExecution] Skipping model because all provider auth profiles are in cooldown",
          {
            modelId: tryModel,
            providerId: tryProviderId,
            organizationId: args.organizationId,
          }
        );
        continue;
      }

      const authProfileFailureCounts =
        authProfileFailureCountsByProvider.get(tryProviderId) ?? new Map<string, number>();
      authProfileFailureCountsByProvider.set(tryProviderId, authProfileFailureCounts);

      for (const authProfile of authProfilesToTry) {
        const client = new OpenRouterClient(authProfile.apiKey, {
          providerId: authProfile.providerId,
          baseUrl: authProfile.baseUrl,
        });
        try {
          const retryResult = await withRetry(
            () =>
              client.chatCompletion({
                model: tryModel,
                messages,
                tools: toolSchemas.length > 0 ? toolSchemas : undefined,
                temperature: config.temperature ?? 0.7,
                max_tokens: config.maxTokens || 4096,
              }),
            LLM_RETRY_POLICY
          );
          response = retryResult.result;
          usedModel = tryModel;
          usedAuthProfileId = authProfile.profileId;
          usedModelRoutingReason = modelRoutingById.get(tryModel)?.reason;
          succeededOnThisModel = true;

          if (authProfile.source === "profile") {
            await ctx.runMutation(getInternal().ai.settings.recordAuthProfileSuccess, {
              organizationId: args.organizationId,
              profileId: authProfile.profileId,
              providerId: authProfile.providerId,
            });
          }

          if (retryResult.attempts > 1) {
            console.warn(
              `[AgentExecution] LLM call succeeded on attempt ${retryResult.attempts} with model ${tryModel} using auth profile ${authProfile.profileId}`
            );
          }
          break;
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.error(
            `[AgentExecution] Model ${tryModel} failed with auth profile ${authProfile.profileId}:`,
            errorMessage
          );

          if (authProfile.source === "profile" && isAuthProfileRotatableError(e)) {
            cooledProfileIds.add(`${authProfile.providerId}:${authProfile.profileId}`);
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
          }
        }
      }

      if (succeededOnThisModel) {
        break;
      }
    }

    // All models failed — send user error message and notify owner
    if (!response) {
      const errorMessage = getUserErrorMessage("ALL_MODELS_FAILED");

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

      return {
        status: "error",
        message: "All AI models are currently unavailable",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    const choice = response.choices?.[0];
    if (!choice) {
      return {
        status: "error",
        message: "No response from LLM",
        sessionId: session._id,
        turnId: runtimeTurnId,
      };
    }

    const assistantContent = choice.message?.content || "";
    const toolCalls = choice.message?.tool_calls || [];
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
        const voiceId =
          inboundVoiceRequest.requestedVoiceId ??
          elevenLabsBinding?.defaultVoiceId;

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
        } catch (error) {
          voiceSynthesisResult = {
            success: false,
            requestedProviderId,
            providerId: resolvedVoiceAdapter.adapter.providerId,
            fallbackProviderId: resolvedVoiceAdapter.fallbackFromProviderId ?? null,
            error:
              error instanceof Error
                ? error.message
                : "voice_synthesis_failed",
          };
        }

        voiceRuntimeMetadata = {
          ...voiceRuntimeMetadata,
          synthesizeSuccess: voiceSynthesisResult.success,
          synthesizeProviderId: voiceSynthesisResult.providerId,
          synthesizeFallbackProviderId: voiceSynthesisResult.fallbackProviderId,
        };
      } catch (error) {
        voiceSynthesisResult = {
          success: false,
          requestedProviderId,
          providerId: "browser",
          fallbackProviderId: null,
          error:
            error instanceof Error
              ? error.message
              : "voice_runtime_resolution_failed",
        };
        voiceRuntimeMetadata = {
          ...voiceRuntimeMetadata,
          synthesizeSuccess: false,
          runtimeError:
            error instanceof Error
              ? error.message
              : "voice_runtime_resolution_failed",
        };
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
      userId: agent.createdBy as Id<"users">,
      sessionId: undefined,
      conversationId: undefined,
    };
    const { toolResults, errorStateDirty } = await executeToolCallsWithApproval({
      toolCalls: toolCalls as Array<{ function?: { name?: string; arguments?: unknown } }>,
      organizationId: args.organizationId,
      agentId: agent._id,
      sessionId: session._id,
      autonomyLevel: config.autonomyLevel,
      requireApprovalFor: config.requireApprovalFor,
      toolExecutionContext: toolCtx,
      failedToolCounts,
      disabledTools,
      createApprovalRequest: async ({ actionType, actionPayload }) => {
        await ctx.runMutation(getInternal().ai.agentApprovals.createApprovalRequest, {
          agentId: agent._id,
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
    const sessionHistory = await ctx.runQuery(getInternal().ai.agentSessions.getSessionMessages, {
      sessionId: session._id,
      limit: 10,
    }) as Array<{ role: string; content: string }>;

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

    const postEscalation = checkPostLLMEscalation(assistantContent, escalationCounters, config.escalationPolicy);
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

    // 10.5. Deduct credits for LLM call
    const llmCreditCost = convertUsdToCredits(costUsd);
    const usedModelProviderId = detectProvider(usedModel, aiSettings?.llm?.providerId);
    const llmBillingSource = resolveLlmBillingSource({
      providerId: usedModelProviderId,
      profileId: usedAuthProfileId,
    });
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

      if (!llmCreditDeduction.success) {
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

    // 11. Update stats
    const tokensUsed = response.usage?.total_tokens || 0;

    await ctx.runMutation(getInternal().ai.agentSessions.updateSessionStats, {
      sessionId: session._id,
      tokensUsed,
      costUsd,
    });

    // 12. Audit log
    await ctx.runMutation(getInternal().ai.agentSessions.logAgentAction, {
      agentId: agent._id,
      organizationId: args.organizationId,
      actionType: "message_processed",
      actionData: {
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
          requestedModel: explicitModelOverride,
          preferredModel,
          orgDefaultModel,
          selectedModel: model,
          usedModel,
          selectedAuthProfileId: primaryAuthProfileId,
          usedAuthProfileId,
          selectionSource,
          routingIntent,
          routingModality,
          selectedRoutingReason,
          usedModelRoutingReason,
          fallbackUsed:
            (selectionSource !== "preferred" && selectionSource !== "session_pinned")
            || (
              typeof selectedRoutingReason === "string" &&
              selectedRoutingReason !== "preferred" &&
              selectedRoutingReason !== "session_pinned"
            )
            || usedModel !== model
            || usedAuthProfileFallback,
          fallbackReason:
            usedModel !== model
              ? usedModelRoutingReason ?? "retry_chain"
              : usedAuthProfileFallback
                ? "auth_profile_rotation"
                : selectionSource !== "preferred" && selectionSource !== "session_pinned"
                ? selectedRoutingReason ?? selectionSource
                : typeof selectedRoutingReason === "string" &&
                    selectedRoutingReason !== "preferred" &&
                    selectedRoutingReason !== "session_pinned"
                ? selectedRoutingReason
                : undefined,
        },
        retrieval: {
          ...retrievalTelemetry,
          docsDropped: boundedKnowledgeContext.droppedDocumentCount,
          docsTruncated: boundedKnowledgeContext.truncatedDocumentCount,
          estimatedTokensInjected: boundedKnowledgeContext.estimatedTokensUsed,
          tokenBudget: boundedKnowledgeContext.tokenBudget,
        },
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
      status: "success",
      message: assistantContent,
      response: deliveryContent,
      toolResults,
      sessionId: session._id,
      turnId: runtimeTurnId,
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
    payloadHash: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("agentInboxReceipts")
      .withIndex("by_org_idempotency_key", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("idempotencyKey", args.idempotencyKey)
      )
      .first();

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
      };
    }

    const receiptId = await ctx.db.insert("agentInboxReceipts", {
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      agentId: args.agentId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      idempotencyKey: args.idempotencyKey,
      payloadHash: args.payloadHash,
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
  };
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

function resolveInboundIdempotencyKey(args: {
  providedKey: unknown;
  metadata?: Record<string, unknown>;
  organizationId: Id<"organizations">;
  channel: string;
  externalContactIdentifier: string;
  message: string;
  channelRouteIdentity?: InboundChannelRouteIdentity;
}): string {
  if (typeof args.providedKey === "string" && args.providedKey.trim().length > 0) {
    return args.providedKey.trim();
  }

  const metadata = args.metadata ?? {};
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
    `${args.externalContactIdentifier}:${timeBucket}:${normalizedMessage}`;

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
