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
  agentTurnStateValidator,
  agentTurnTransitionValidator,
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
    telegramMessageId: v.optional(v.number()),
    telegramChatId: v.optional(v.string()),
  })),

  // ========== END SESSION LIFECYCLE ==========
})
  .index("by_org_channel_contact", [
    "organizationId",
    "channel",
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
  .index("by_session", ["sessionId"]);

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
  inboundMessageHash: v.optional(v.string()),

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
  metadata: v.optional(v.any()),

  occurredAt: v.number(),
  createdAt: v.number(),
})
  .index("by_turn", ["turnId"])
  .index("by_turn_ordinal", ["turnId", "edgeOrdinal"])
  .index("by_session_time", ["sessionId", "occurredAt"])
  .index("by_session_transition", ["sessionId", "transition"])
  .index("by_org_time", ["organizationId", "occurredAt"]);
