/**
 * AGENT SESSION SCHEMAS
 *
 * Tables for managing conversations between org agents and external contacts.
 *
 * Tables:
 * - agentSessions: One record per conversation (org + channel + contact)
 * - agentSessionMessages: Individual messages within a session
 *
 * Session Modes:
 * - "freeform": Standard agent conversation (default)
 * - "guided": Scripted interview following a template
 *
 * See: convex/ai/agentSessions.ts for queries/mutations
 * See: convex/ai/interviewRunner.ts for guided session logic
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  COLLABORATION_CONTRACT_VERSION,
  agentExecutionBundleContractValidator,
  agentTurnRunAttemptContractValidator,
  agentTurnStateValidator,
  agentTurnTransitionValidator,
  collaborationAuthorityContractValidator,
  collaborationKernelContractValidator,
  runtimeIdempotencyContractValidator,
  turnQueueContractValidator,
} from "./aiSchemas";

export const teamHandoffPayloadValidator = v.object({
  reason: v.string(),
  summary: v.string(),
  goal: v.string(),
});

export const teamHandoffHistoryEntryValidator = v.object({
  fromAgentId: v.id("objects"),
  toAgentId: v.id("objects"),
  reason: v.string(),
  summary: v.string(),
  goal: v.string(),
  timestamp: v.number(),
  // Legacy compatibility field retained while consumers migrate.
  contextSummary: v.optional(v.string()),
});

const sessionChannelRouteIdentityValidator = v.object({
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
});

const sessionRoutingMetadataValidator = v.object({
  contractVersion: v.literal("occ_operator_routing_v1"),
  tenantId: v.string(),
  lineageId: v.string(),
  threadId: v.string(),
  workflowKey: v.string(),
  updatedAt: v.number(),
  updatedBy: v.optional(v.string()),
});

/**
 * AGENT SESSIONS
 *
 * Tracks conversations between an org's AI agent and an external contact.
 * Keyed by org + channel + external contact identifier.
 *
 * Guided Mode (Interviews):
 * When sessionMode="guided", the session follows an interview template.
 * The interviewState tracks progress through phases and questions.
 * Extracted data is stored incrementally and saved as Content DNA on completion.
 */
export const agentSessions = defineTable({
  agentId: v.id("objects"),
  organizationId: v.id("organizations"),
  // Channel transport identifier (for example: telegram, webchat, native_guest).
  channel: v.string(),
  externalContactIdentifier: v.string(),
  channelRouteIdentity: v.optional(sessionChannelRouteIdentityValidator),
  sessionRoutingKey: v.optional(v.string()),
  routingMetadata: v.optional(sessionRoutingMetadataValidator),

  status: v.union(
    v.literal("active"),
    v.literal("closed"),
    v.literal("expired"),
    v.literal("handed_off")
  ),

  crmContactId: v.optional(v.id("objects")),
  handedOffTo: v.optional(v.id("users")),

  // ========== GUIDED SESSION FIELDS (Interviews) ==========

  // Session mode: "freeform" (default) or "guided" (interview)
  sessionMode: v.optional(v.union(v.literal("freeform"), v.literal("guided"))),

  // Reference to interview template (type="interview_template" in objects)
  interviewTemplateId: v.optional(v.id("objects")),

  // Interview progress state (only populated when sessionMode="guided")
  interviewState: v.optional(v.object({
    // Progress tracking
    currentPhaseIndex: v.number(),
    currentQuestionIndex: v.number(),
    completedPhases: v.array(v.string()),
    skippedPhases: v.array(v.string()),

    // Extracted data (partial Content DNA)
    extractedData: v.record(v.string(), v.any()),

    // Follow-up tracking
    currentFollowUpCount: v.number(),
    pendingFollowUp: v.boolean(),

    // Timing
    startedAt: v.number(),
    lastActivityAt: v.number(),
    phaseStartTimes: v.record(v.string(), v.number()),

    // Completion
    isComplete: v.boolean(),
    completedAt: v.optional(v.number()),
    contentDNAId: v.optional(v.string()),
    memoryConsent: v.optional(v.object({
      status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
      consentScope: v.literal("content_dna_profile"),
      consentPromptVersion: v.string(),
      memoryCandidateIds: v.array(v.string()),
      promptedAt: v.number(),
      decidedAt: v.optional(v.number()),
      decisionSource: v.optional(v.literal("user")),
    })),
    sessionLifecycle: v.optional(v.object({
      state: v.union(
        v.literal("capturing"),
        v.literal("checkpoint_review"),
        v.literal("consent_pending"),
        v.literal("resumable_unsaved"),
        v.literal("saved"),
        v.literal("discarded"),
      ),
      checkpointId: v.union(
        v.literal("cp0_capture_notice"),
        v.literal("cp1_summary_review"),
        v.literal("cp2_save_decision"),
        v.literal("cp3_post_save_revoke"),
      ),
      updatedAt: v.number(),
      updatedBy: v.union(v.literal("system"), v.literal("user")),
    })),
    identityOrigin: v.optional(v.object({
      contractVersion: v.literal("interview_identity_origin.v1"),
      immutableOrigin: v.literal("interview"),
      interviewSessionId: v.string(),
      interviewTemplateId: v.string(),
      interviewTemplateName: v.string(),
      anchoredAt: v.number(),
      immutableAnchorFieldIds: v.array(v.string()),
      midwifeFiveBlockShape: v.object({
        contractVersion: v.literal("midwife_5_block_shape.v1"),
        blockCount: v.literal(5),
        completedBlockCount: v.number(),
        blocks: v.array(v.object({
          blockId: v.union(
            v.literal("business_context"),
            v.literal("communication_style"),
            v.literal("values_identity"),
            v.literal("knowledge_inspiration"),
            v.literal("boundaries_guardrails"),
          ),
          label: v.string(),
          description: v.string(),
          capturedFieldIds: v.array(v.string()),
          missingSignalHints: v.array(v.string()),
          isComplete: v.boolean(),
        })),
      }),
    })),
    firstWordsHandshake: v.optional(v.object({
      contractVersion: v.literal("first_words_handshake.v1"),
      handshakeId: v.string(),
      status: v.literal("ready_for_confirmation"),
      generatedAt: v.number(),
      includesDreamTeamMention: v.literal(true),
      confirmationPrompt: v.string(),
      preview: v.string(),
    })),
    hybridCompositionProvenance: v.optional(v.object({
      contractVersion: v.literal("midwife_hybrid_composition.v1"),
      strategy: v.literal("interview_core_seed_overlay"),
      composedAt: v.number(),
      fallbackApplied: v.boolean(),
      immutableAnchorFieldIds: v.array(v.string()),
      selectedCatalogAgentNumbers: v.array(v.number()),
      missingCoverageAreas: v.array(v.string()),
      inputCount: v.number(),
      selectedInputCount: v.number(),
      inputs: v.array(v.object({
        inputType: v.union(
          v.literal("interview_identity_anchor"),
          v.literal("catalog_profile"),
          v.literal("tool_profile"),
          v.literal("soul_profile"),
          v.literal("generated_fallback_overlay"),
        ),
        sourceId: v.string(),
        sourceLabel: v.string(),
        selected: v.boolean(),
        rank: v.optional(v.number()),
        rankScore: v.optional(v.number()),
        seedCoverage: v.optional(v.union(
          v.literal("full"),
          v.literal("skeleton"),
          v.literal("missing"),
        )),
        signals: v.array(v.string()),
      })),
    })),
  })),

  // ========== END GUIDED SESSION FIELDS ==========

  // ========== TEAM SESSION (Agent-to-Agent Handoffs) ==========

  // Tracks multi-agent handoffs within a single conversation.
  // Activated when an agent calls tag_in_specialist.
  teamSession: v.optional(v.object({
    isTeamSession: v.boolean(),
    participatingAgentIds: v.array(v.id("objects")),
    activeAgentId: v.id("objects"),
    handoffHistory: v.array(teamHandoffHistoryEntryValidator),
    sharedContext: v.optional(v.string()),
    conversationGoal: v.optional(v.string()),
    handoffNotes: v.optional(teamHandoffPayloadValidator),
  })),

  collaboration: v.optional(v.object({
    contractVersion: v.literal(COLLABORATION_CONTRACT_VERSION),
    kernel: collaborationKernelContractValidator,
    authority: collaborationAuthorityContractValidator,
    syncCheckpoint: v.optional(v.object({
      contractVersion: v.literal("tcg_dm_group_sync_v1"),
      tokenId: v.string(),
      token: v.string(),
      status: v.union(
        v.literal("issued"),
        v.literal("resumed"),
        v.literal("aborted"),
        v.literal("expired"),
      ),
      lineageId: v.string(),
      dmThreadId: v.string(),
      groupThreadId: v.string(),
      issuedForEventId: v.string(),
      issuedAt: v.number(),
      expiresAt: v.number(),
      resumeTurnId: v.optional(v.id("agentTurns")),
      resumedAt: v.optional(v.number()),
      abortedAt: v.optional(v.number()),
      abortReason: v.optional(v.string()),
      lastValidatedAt: v.optional(v.number()),
    })),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  })),

  // Legacy: kept for backward compat, superseded by teamSession.participatingAgentIds
  participatingAgentIds: v.optional(v.array(v.id("objects"))),

  // Self-improvement tracking
  metricsRecorded: v.optional(v.boolean()),

  // Session-level routing pin (Plan 08):
  // Keeps model/auth routing sticky across turns unless failover criteria repin it.
  routingPin: v.optional(v.object({
    modelId: v.optional(v.string()),
    authProfileId: v.optional(v.string()),
    pinReason: v.string(),
    pinnedAt: v.number(),
    updatedAt: v.number(),
    unlockReason: v.optional(v.string()),
    unlockedAt: v.optional(v.number()),
  })),

  // Stats
  messageCount: v.number(),
  tokensUsed: v.number(),
  costUsd: v.number(),

  // Timing
  startedAt: v.number(),
  lastMessageAt: v.number(),

  // ========== SESSION LIFECYCLE (TTL & Close) ==========

  // When and why the session was closed
  closedAt: v.optional(v.number()),
  closeReason: v.optional(v.union(
    v.literal("idle_timeout"),
    v.literal("expired"),
    v.literal("manual"),
    v.literal("handed_off")
  )),

  // Canonical lifecycle contract checkpointing (ALC-004/ALC-005).
  lifecycleState: v.optional(v.union(
    v.literal("draft"),
    v.literal("active"),
    v.literal("paused"),
    v.literal("escalated"),
    v.literal("takeover"),
    v.literal("resolved"),
  )),
  lifecycleCheckpoint: v.optional(v.union(
    v.literal("approval_requested"),
    v.literal("approval_resolved"),
    v.literal("escalation_detected"),
    v.literal("escalation_created"),
    v.literal("escalation_taken_over"),
    v.literal("escalation_dismissed"),
    v.literal("escalation_resolved"),
    v.literal("escalation_timed_out"),
    v.literal("agent_resumed"),
  )),
  lifecycleUpdatedAt: v.optional(v.number()),
  lifecycleUpdatedBy: v.optional(v.string()),

  // LLM-generated summary on close (for future context injection)
  summary: v.optional(v.object({
    text: v.string(),
    generatedAt: v.number(),
    messageCount: v.number(),
    topics: v.optional(v.array(v.string())),
  })),

  // Previous session context (for resumed sessions)
  previousSessionId: v.optional(v.id("agentSessions")),
  previousSessionSummary: v.optional(v.string()),

  // Rolling session memory (L2) extracted from user messages + verified tool outputs.
  rollingSummaryMemory: v.optional(v.object({
    contractVersion: v.literal("session_rolling_summary_v1"),
    sourcePolicy: v.literal("user_verified_tool_only_v1"),
    summary: v.string(),
    sourceMessageCount: v.number(),
    userMessageCount: v.number(),
    verifiedToolResultCount: v.number(),
    updatedAt: v.number(),
  })),

  // Reactivation memory (L5) cached on deterministic inactivity reopen.
  reactivationMemory: v.optional(v.object({
    contractVersion: v.literal("session_reactivation_memory_v1"),
    sourcePolicy: v.literal("rolling_summary_close_summary_v1"),
    trigger: v.literal("inactivity_reactivation_v1"),
    cachedContext: v.string(),
    generatedAt: v.number(),
    cacheExpiresAt: v.number(),
    inactivityGapMs: v.number(),
    source: v.object({
      sessionId: v.string(),
      organizationId: v.string(),
      channel: v.string(),
      externalContactIdentifier: v.string(),
      sessionRoutingKey: v.string(),
      closeReason: v.union(v.literal("idle_timeout"), v.literal("expired")),
      closedAt: v.number(),
      lastMessageAt: v.number(),
    }),
    provenance: v.object({
      derivedFromRollingSummary: v.boolean(),
      derivedFromSessionSummary: v.boolean(),
    }),
  })),

  // Per-session credit budget tracking
  sessionBudgetUsed: v.optional(v.number()),

  // ========== ERROR STATE (Error Harness) ==========

  // Tracks tools disabled due to repeated failures in this session
  errorState: v.optional(v.object({
    disabledTools: v.array(v.string()),
    failedToolCounts: v.record(v.string(), v.number()),
    lastErrorAt: v.optional(v.number()),
    // When true, agent operates with reduced capabilities (read-only tools only)
    degraded: v.optional(v.boolean()),
    degradedAt: v.optional(v.number()),
    degradedReason: v.optional(v.string()),
  })),

  // ========== ESCALATION STATE (Human-in-the-Loop) ==========

  // Tracks when a session is escalated to a human team member.
  // One active escalation per session at a time.
  escalationState: v.optional(v.object({
    status: v.union(
      v.literal("pending"),      // Waiting for human response
      v.literal("taken_over"),   // Human has taken control
      v.literal("resolved"),     // Human resolved, agent can resume
      v.literal("dismissed"),    // False positive, agent continues
      v.literal("timed_out")     // No human responded, agent auto-resumed
    ),
    reason: v.string(),
    urgency: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
    triggerType: v.string(),     // "explicit_request" | "blocked_topic" | "tool_failure" | "uncertainty" | "agent_initiated"
    escalatedAt: v.number(),
    respondedAt: v.optional(v.number()),
    respondedBy: v.optional(v.id("users")),
    humanMessages: v.optional(v.array(v.string())),
    resolutionSummary: v.optional(v.string()),
    supportTicketId: v.optional(v.id("objects")),
    supportTicketNumber: v.optional(v.string()),
    supportTicketCreatedAt: v.optional(v.number()),
    telegramMessageId: v.optional(v.number()),
    telegramChatId: v.optional(v.string()),
    hitlWaitpoint: v.optional(v.object({
      contractVersion: v.literal("tcg_hitl_waitpoint_v1"),
      tokenId: v.string(),
      token: v.string(),
      checkpoint: v.union(
        v.literal("session_pending"),
        v.literal("session_taken_over"),
      ),
      status: v.union(
        v.literal("issued"),
        v.literal("resumed"),
        v.literal("aborted"),
        v.literal("expired"),
      ),
      issuedAt: v.number(),
      expiresAt: v.number(),
      issuedForTurnId: v.id("agentTurns"),
      resumeTurnId: v.optional(v.id("agentTurns")),
      resumedAt: v.optional(v.number()),
      abortedAt: v.optional(v.number()),
      abortReason: v.optional(v.string()),
      lastValidatedAt: v.optional(v.number()),
    })),
  })),

  // ========== END SESSION LIFECYCLE ==========
})
  .index("by_org_channel_contact", [
    "organizationId",
    "channel",
    "externalContactIdentifier",
  ])
  .index("by_org_channel_agent_contact", [
    "organizationId",
    "channel",
    "agentId",
    "externalContactIdentifier",
  ])
  .index("by_org_channel_agent_route_contact", [
    "organizationId",
    "channel",
    "agentId",
    "sessionRoutingKey",
    "externalContactIdentifier",
  ])
  .index("by_agent", ["agentId"])
  .index("by_org_status", ["organizationId", "status"])
  .index("by_template", ["interviewTemplateId"])
  .index("by_org_session_mode", ["organizationId", "sessionMode"]);

/**
 * AGENT SESSION MESSAGES
 *
 * Individual messages within an agent session.
 * Stores the full conversation history for context window management.
 */
export const agentSessionMessages = defineTable({
  sessionId: v.id("agentSessions"),
  role: v.union(
    v.literal("user"),
    v.literal("assistant"),
    v.literal("system")
  ),
  content: v.string(),
  toolCalls: v.optional(v.any()),
  agentId: v.optional(v.id("objects")),
  agentName: v.optional(v.string()),
  timestamp: v.number(),
})
  .index("by_session", ["sessionId"])
  .index("by_session_timestamp", ["sessionId", "timestamp"]);

/**
 * AGENT TURNS
 *
 * Explicit turn lifecycle records for deterministic runtime orchestration.
 * One active turn per (sessionId, agentId) is enforced in runtime helpers.
 */
export const agentTurns = defineTable({
  organizationId: v.id("organizations"),
  sessionId: v.id("agentSessions"),
  agentId: v.id("objects"),

  state: agentTurnStateValidator,
  transitionVersion: v.number(),

  // Lease/CAS fields
  leaseOwner: v.optional(v.string()),
  leaseToken: v.optional(v.string()),
  leaseExpiresAt: v.optional(v.number()),
  lastHeartbeatAt: v.optional(v.number()),

  // Replay/idempotency hooks
  idempotencyKey: v.optional(v.string()),
  idempotencyScopeKey: v.optional(v.string()),
  idempotencyExpiresAt: v.optional(v.number()),
  idempotencyContract: v.optional(runtimeIdempotencyContractValidator),
  inboundMessageHash: v.optional(v.string()),

  // Deterministic queue/concurrency contract
  queueContract: v.optional(turnQueueContractValidator),
  queueConcurrencyKey: v.optional(v.string()),
  queueOrderingKey: v.optional(v.string()),

  // Retry/run-attempt and bundle pinning contracts
  runAttempt: v.optional(agentTurnRunAttemptContractValidator),
  executionBundle: v.optional(agentExecutionBundleContractValidator),

  // Terminal delivery pointer (Plan 15 contract target)
  terminalDeliverable: v.optional(v.object({
    pointerType: v.string(),
    pointerId: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    recordedAt: v.number(),
  })),

  // Lifecycle timing
  queuedAt: v.number(),
  startedAt: v.optional(v.number()),
  suspendedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  failedAt: v.optional(v.number()),
  cancelledAt: v.optional(v.number()),
  failureReason: v.optional(v.string()),

  metadata: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_session_agent_state", ["sessionId", "agentId", "state"])
  .index("by_session_agent_created", ["sessionId", "agentId", "createdAt"])
  .index("by_session_created", ["sessionId", "createdAt"])
  .index("by_org_state", ["organizationId", "state"])
  .index("by_org_idempotency_key", ["organizationId", "idempotencyKey"])
  .index("by_org_idempotency_scope_key", ["organizationId", "idempotencyScopeKey"])
  .index("by_org_queue_concurrency_state", ["organizationId", "queueConcurrencyKey", "state"])
  .index("by_state_lease_expiry", ["state", "leaseExpiresAt"]);

/**
 * EXECUTION EDGES
 *
 * Append-only transition and runtime events for replay and audit.
 */
export const executionEdges = defineTable({
  organizationId: v.id("organizations"),
  sessionId: v.id("agentSessions"),
  agentId: v.id("objects"),
  turnId: v.id("agentTurns"),

  transition: agentTurnTransitionValidator,
  fromState: v.optional(agentTurnStateValidator),
  toState: v.optional(agentTurnStateValidator),

  edgeOrdinal: v.number(),
  idempotencyKey: v.optional(v.string()),
  payloadHash: v.optional(v.string()),
  transitionPolicyVersion: v.optional(v.number()),
  replayInvariantStatus: v.optional(v.union(
    v.literal("validated"),
    v.literal("legacy_compatible")
  )),
  metadata: v.optional(v.any()),

  occurredAt: v.number(),
  createdAt: v.number(),
})
  .index("by_turn", ["turnId"])
  .index("by_turn_ordinal", ["turnId", "edgeOrdinal"])
  .index("by_session_time", ["sessionId", "occurredAt"])
  .index("by_session_transition", ["sessionId", "transition"])
  .index("by_org_time", ["organizationId", "occurredAt"]);
