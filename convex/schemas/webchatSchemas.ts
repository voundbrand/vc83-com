/**
 * WEBCHAT SCHEMAS
 *
 * Tables for the webchat widget public API.
 *
 * Tables:
 * - webchatSessions: Anonymous visitor sessions (24h expiry)
 * - anonymousIdentityLedger: Cross-channel identity ledger for anonymous sessions
 * - anonymousClaimTokens: Signed one-time claim token registry
 * - guestOnboardingBindings: Explicit onboarding-scoped guest -> org bindings
 * - webchatRateLimits: IP-based rate limiting for public endpoints
 * - onboardingAuditSessions: Deterministic five-question audit session state
 *
 * Integration with Comms Platform:
 * - Webchat operates at Layer 4 (End User ↔ AI Agent)
 * - Sessions link to agentSessions once a conversation starts
 * - Future: notification events for conversation.started, message.received
 *
 * See: convex/api/v1/webchatApi.ts for queries/mutations/actions
 * See: docs/bring_it_all_together/05-WEBCHAT-WIDGET.md for architecture
 * See: docs/bring_it_all_together/12-COMMS-PLATFORM-SPEC.md for comms platform
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

const visitorInfoValidator = v.object({
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
});

const anonymousChannelValidator = v.union(
  v.literal("webchat"),
  v.literal("native_guest"),
  v.literal("telegram")
);

const guestOnboardingBindingChannelValidator = v.union(
  v.literal("webchat"),
  v.literal("native_guest")
);

export const onboardingChannelValidator = v.union(
  v.literal("webchat"),
  v.literal("native_guest"),
  v.literal("telegram"),
  v.literal("whatsapp"),
  v.literal("slack"),
  v.literal("sms"),
  v.literal("platform_web"),
  v.literal("unknown")
);

export const onboardingAuditQuestionIdValidator = v.union(
  v.literal("business_revenue"),
  v.literal("team_size"),
  v.literal("monday_priority"),
  v.literal("delegation_gap"),
  v.literal("reclaimed_time")
);

export const ONBOARDING_AUDIT_QUESTION_ORDER = [
  "business_revenue",
  "team_size",
  "monday_priority",
  "delegation_gap",
  "reclaimed_time",
] as const;

const onboardingAuditQuestionStateValidator = v.object({
  status: v.union(v.literal("pending"), v.literal("asked"), v.literal("answered")),
  askedAt: v.optional(v.number()),
  answeredAt: v.optional(v.number()),
  answer: v.optional(v.string()),
  answerEventKey: v.optional(v.string()),
});

const onboardingAuditQuestionStateMapValidator = v.object({
  business_revenue: onboardingAuditQuestionStateValidator,
  team_size: onboardingAuditQuestionStateValidator,
  monday_priority: onboardingAuditQuestionStateValidator,
  delegation_gap: onboardingAuditQuestionStateValidator,
  reclaimed_time: onboardingAuditQuestionStateValidator,
});

const onboardingAuditSessionStatusValidator = v.union(
  v.literal("started"),
  v.literal("in_progress"),
  v.literal("workflow_delivered"),
  v.literal("completed"),
  v.literal("deliverable_generated"),
  v.literal("handoff_opened"),
  v.literal("abandoned")
);

/**
 * WEBCHAT SESSIONS
 *
 * Anonymous visitor sessions for webchat widget.
 * Session token is used to identify returning visitors (stored in localStorage).
 * Sessions expire after 24 hours of inactivity.
 *
 * Flow:
 * 1. First message: no sessionToken → create new session → return token
 * 2. Subsequent messages: include sessionToken → resume session
 * 3. When visitor provides contact info → update visitorInfo
 * 4. When agent responds → link to agentSessionId
 */
export const webchatSessions = defineTable({
  // Secure session token (stored in visitor's localStorage)
  sessionToken: v.string(),

  // Which org/agent this session is for
  organizationId: v.id("organizations"),
  agentId: v.id("objects"),

  // Link to the agent conversation session (created on first message to agent)
  agentSessionId: v.optional(v.id("agentSessions")),

  // Source channel for session lineage
  channel: v.optional(
    v.union(
      v.literal("webchat"),
      v.literal("native_guest")
    )
  ),

  // Visitor info (collected during conversation)
  visitorInfo: v.optional(visitorInfoValidator),

  // Optional claim linkage to authenticated account context
  claimedByUserId: v.optional(v.id("users")),
  claimedOrganizationId: v.optional(v.id("organizations")),
  claimedAt: v.optional(v.number()),

  // Timing
  createdAt: v.number(),
  lastActivityAt: v.number(),
})
  .index("by_session_token", ["sessionToken"])
  .index("by_org_agent", ["organizationId", "agentId"])
  .index("by_agent_session", ["agentSessionId"]);

/**
 * ONBOARDING AUDIT SESSIONS
 *
 * Deterministic five-question audit-mode state machine for cold-traffic intake.
 * Tracks question progression, lifecycle timestamps, and handoff metadata.
 */
export const onboardingAuditSessions = defineTable({
  // Stable deterministic session key for idempotent replay handling.
  auditSessionKey: v.string(),

  // Routing context shared with webchat/native_guest session lineage.
  channel: onboardingChannelValidator,
  organizationId: v.id("organizations"),
  agentId: v.id("objects"),
  sessionToken: v.optional(v.string()),
  telegramChatId: v.optional(v.string()),
  agentSessionId: v.optional(v.id("agentSessions")),
  sourceIdentityKey: v.optional(v.string()),
  claimTokenId: v.optional(v.string()),

  // Five-question progression contract.
  questionSetVersion: v.string(),
  status: onboardingAuditSessionStatusValidator,
  currentQuestionId: v.optional(onboardingAuditQuestionIdValidator),
  answeredQuestionCount: v.number(),
  questionState: onboardingAuditQuestionStateMapValidator,

  // Value-first lifecycle milestones.
  workflowRecommendation: v.optional(v.string()),
  workflowDeliveredAt: v.optional(v.number()),
  emailCaptureRequestedAt: v.optional(v.number()),
  capturedEmail: v.optional(v.string()),
  capturedName: v.optional(v.string()),
  completedAt: v.optional(v.number()),
  deliverableGeneratedAt: v.optional(v.number()),
  handoffOpenedAt: v.optional(v.number()),
  lastLifecycleEventKey: v.optional(v.string()),

  // Diagnostics/attribution context for downstream orchestration.
  metadata: v.optional(v.any()),

  // Timing fields.
  startedAt: v.number(),
  lastActivityAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_audit_session_key", ["auditSessionKey"])
  .index("by_session_token", ["sessionToken"])
  .index("by_telegram_chat", ["telegramChatId"])
  .index("by_agent_session", ["agentSessionId"])
  .index("by_org_status_time", ["organizationId", "status", "updatedAt"])
  .index("by_channel_status_time", ["channel", "status", "updatedAt"]);

/**
 * ANONYMOUS IDENTITY LEDGER
 *
 * Durable ledger to preserve anonymous identity continuity across channels
 * and link that identity to authenticated users after signup/login.
 */
export const anonymousIdentityLedger = defineTable({
  // Stable identity key for replay-safe idempotency
  identityKey: v.string(),

  // Channel and routing context
  channel: anonymousChannelValidator,
  organizationId: v.id("organizations"),
  agentId: v.optional(v.id("objects")),
  sessionToken: v.optional(v.string()),
  telegramChatId: v.optional(v.string()),
  agentSessionId: v.optional(v.id("agentSessions")),
  visitorInfo: v.optional(visitorInfoValidator),

  // Claim lifecycle
  claimStatus: v.union(v.literal("unclaimed"), v.literal("claimed")),
  claimedByUserId: v.optional(v.id("users")),
  claimedOrganizationId: v.optional(v.id("organizations")),
  claimedAt: v.optional(v.number()),
  lastClaimTokenId: v.optional(v.string()),

  // Auditable timing fields
  createdAt: v.number(),
  updatedAt: v.number(),
  lastActivityAt: v.number(),
})
  .index("by_identity_key", ["identityKey"])
  .index("by_session_token", ["sessionToken"])
  .index("by_telegram_chat", ["telegramChatId"])
  .index("by_org_status", ["organizationId", "claimStatus"])
  .index("by_claimed_user", ["claimedByUserId"]);

/**
 * ANONYMOUS CLAIM TOKENS
 *
 * Registry for signed one-time claim tokens. Signature verification happens
 * server-side while this table provides state transitions and auditability.
 */
export const anonymousClaimTokens = defineTable({
  tokenId: v.string(),
  tokenType: v.union(
    v.literal("guest_session_claim"),
    v.literal("guest_onboarding_org_claim"),
    v.literal("telegram_org_claim")
  ),
  channel: anonymousChannelValidator,
  status: v.union(
    v.literal("issued"),
    v.literal("consumed"),
    v.literal("expired"),
    v.literal("revoked")
  ),

  // Linkage context for deterministic claim routing
  organizationId: v.id("organizations"),
  sessionToken: v.optional(v.string()),
  telegramChatId: v.optional(v.string()),
  ledgerEntryId: v.optional(v.id("anonymousIdentityLedger")),
  bindingId: v.optional(v.id("guestOnboardingBindings")),
  onboardingSurface: v.optional(v.string()),

  // Signed token payload is retained for idempotent replay handling
  signedToken: v.string(),
  issuedBy: v.string(),
  issuedAt: v.number(),
  expiresAt: v.number(),
  consumedAt: v.optional(v.number()),
  consumedByUserId: v.optional(v.id("users")),
  consumedByOrganizationId: v.optional(v.id("organizations")),

  // Free-form context for analytics/debugging
  metadata: v.optional(v.any()),
})
  .index("by_token_id", ["tokenId"])
  .index("by_status_expiry", ["status", "expiresAt"])
  .index("by_session_token", ["sessionToken"])
  .index("by_telegram_chat", ["telegramChatId"])
  .index("by_binding_id", ["bindingId"]);

/**
 * GUEST ONBOARDING BINDINGS
 *
 * Explicit source-of-truth for onboarding-owned guest surfaces that mint a
 * provisional onboarding org on first touch before any account is claimed.
 */
export const guestOnboardingBindings = defineTable({
  sourceIdentityKey: v.string(),
  channel: guestOnboardingBindingChannelValidator,
  onboardingSurface: v.string(),
  sessionToken: v.string(),
  onboardingOrganizationId: v.id("organizations"),

  // Snapshot the org lifecycle directly on the binding so completion and claim
  // flows do not need to infer onboarding state from webchat session records.
  organizationLifecycleState: v.union(
    v.literal("provisional_onboarding"),
    v.literal("live_unclaimed_workspace"),
    v.literal("claimed_workspace")
  ),
  bindingStatus: v.union(
    v.literal("active"),
    v.literal("claimed"),
    v.literal("expired")
  ),
  resolvedAgentId: v.optional(v.id("objects")),
  completedAt: v.optional(v.number()),
  claimedByUserId: v.optional(v.id("users")),
  claimedAt: v.optional(v.number()),
  expiredAt: v.optional(v.number()),
  lastClaimTokenId: v.optional(v.string()),

  createdAt: v.number(),
  updatedAt: v.number(),
  lastActivityAt: v.number(),
})
  .index("by_source_identity_key", ["sourceIdentityKey"])
  .index("by_session_token", ["sessionToken"])
  .index("by_org", ["onboardingOrganizationId"])
  .index("by_binding_status_activity", ["bindingStatus", "lastActivityAt"]);

/**
 * WEBCHAT RATE LIMITS
 *
 * IP-based rate limiting for public webchat endpoints.
 * Tracks request timestamps per IP address.
 *
 * Rate limits:
 * - Free tier: 30 requests/minute
 * - Pro tier: 60 requests/minute
 *
 * Old entries are cleaned up on write (entries older than 2 minutes).
 */
export const webchatRateLimits = defineTable({
  ipAddress: v.string(),
  organizationId: v.id("organizations"),
  channel: v.optional(anonymousChannelValidator),
  deviceFingerprintHash: v.optional(v.string()),
  sessionToken: v.optional(v.string()),
  messageHash: v.optional(v.string()),
  userAgentHash: v.optional(v.string()),
  outcome: v.optional(
    v.union(
      v.literal("allowed"),
      v.literal("throttled"),
      v.literal("blocked")
    )
  ),
  challengeState: v.optional(
    v.union(
      v.literal("not_required"),
      v.literal("required"),
      v.literal("passed"),
      v.literal("failed")
    )
  ),
  reason: v.optional(v.string()),
  riskScore: v.optional(v.number()),
  requestId: v.optional(v.string()),
  timestamp: v.number(),
})
  .index("by_ip_and_time", ["ipAddress", "timestamp"])
  .index("by_org", ["organizationId"])
  .index("by_channel_and_time", ["channel", "timestamp"])
  .index("by_device_and_time", ["deviceFingerprintHash", "timestamp"])
  .index("by_session_and_time", ["sessionToken", "timestamp"])
  .index("by_org_channel_and_time", ["organizationId", "channel", "timestamp"]);

/**
 * ONBOARDING FUNNEL EVENTS
 *
 * Deterministic funnel telemetry for free onboarding journeys across channels.
 */
export const onboardingFunnelEvents = defineTable({
  eventKey: v.string(),
  eventName: v.union(
    v.literal("onboarding.funnel.first_touch"),
    v.literal("onboarding.funnel.activation"),
    v.literal("onboarding.funnel.signup"),
    v.literal("onboarding.funnel.claim"),
    v.literal("onboarding.funnel.upgrade"),
    v.literal("onboarding.funnel.credit_purchase"),
    v.literal("onboarding.funnel.channel_first_message_latency"),
    v.literal("onboarding.funnel.audit_started"),
    v.literal("onboarding.funnel.audit_question_answered"),
    v.literal("onboarding.funnel.audit_completed"),
    v.literal("onboarding.funnel.audit_deliverable_generated"),
    v.literal("onboarding.funnel.audit_handoff_opened")
  ),
  channel: onboardingChannelValidator,
  organizationId: v.optional(v.id("organizations")),
  userId: v.optional(v.id("users")),
  sessionToken: v.optional(v.string()),
  telegramChatId: v.optional(v.string()),
  claimTokenId: v.optional(v.string()),
  auditSessionKey: v.optional(v.string()),
  auditQuestionId: v.optional(onboardingAuditQuestionIdValidator),
  auditStepOrdinal: v.optional(v.number()),
  campaign: v.optional(
    v.object({
      source: v.optional(v.string()),
      medium: v.optional(v.string()),
      campaign: v.optional(v.string()),
      content: v.optional(v.string()),
      term: v.optional(v.string()),
      referrer: v.optional(v.string()),
      landingPath: v.optional(v.string()),
    })
  ),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
})
  .index("by_event_key", ["eventKey"])
  .index("by_event_name_and_time", ["eventName", "createdAt"])
  .index("by_channel_and_time", ["channel", "createdAt"])
  .index("by_org_and_time", ["organizationId", "createdAt"])
  .index("by_audit_session_and_time", ["auditSessionKey", "createdAt"]);

const onboardingNurtureStepStatusValidator = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("failed")
);

const onboardingNurtureStepStateValidator = v.object({
  status: onboardingNurtureStepStatusValidator,
  scheduledFor: v.number(),
  processedAt: v.optional(v.number()),
  deliveryChannel: v.optional(onboardingChannelValidator),
  recipientIdentifier: v.optional(v.string()),
  error: v.optional(v.string()),
});

const onboardingNurtureStepMapValidator = v.object({
  day0_first_win: onboardingNurtureStepStateValidator,
  day1_activation: onboardingNurtureStepStateValidator,
  day2_value_capture: onboardingNurtureStepStateValidator,
  day3_momentum: onboardingNurtureStepStateValidator,
});

/**
 * ONBOARDING NURTURE JOURNEYS
 *
 * Per-user Day 0-3 nurture lifecycle tracking.
 * Stores deterministic schedule state and first-win SLA timing.
 */
export const onboardingNurtureJourneys = defineTable({
  journeyKey: v.string(),
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  sourceChannel: onboardingChannelValidator,
  preferredChannel: v.optional(onboardingChannelValidator),
  recipientIdentifier: v.optional(v.string()),
  status: v.union(
    v.literal("active"),
    v.literal("completed"),
    v.literal("cancelled")
  ),
  firstWinDueAt: v.number(),
  firstWinDeliveredAt: v.optional(v.number()),
  firstWinBreachedAt: v.optional(v.number()),
  stepState: onboardingNurtureStepMapValidator,
  metadata: v.optional(v.any()),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_journey_key", ["journeyKey"])
  .index("by_user_and_time", ["userId", "updatedAt"])
  .index("by_status_and_first_win_due", ["status", "firstWinDueAt"]);

const onboardingSoulReportStatusValidator = v.union(
  v.literal("pending"),
  v.literal("ready"),
  v.literal("insufficient_data"),
  v.literal("delivered"),
  v.literal("failed")
);

const onboardingSoulReportFirstWinStateValidator = v.union(
  v.literal("met"),
  v.literal("pending"),
  v.literal("breached")
);

const onboardingSpecialistAccessModeValidator = v.union(
  v.literal("invisible"),
  v.literal("direct"),
  v.literal("meeting")
);

const onboardingSpecialistPreviewStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("ready"),
  v.literal("sent"),
  v.literal("blocked"),
  v.literal("expired")
);

/**
 * ONBOARDING SOUL REPORTS
 *
 * Day 3 data-backed summary for the onboarding journey.
 */
export const onboardingSoulReports = defineTable({
  reportKey: v.string(),
  journeyId: v.id("onboardingNurtureJourneys"),
  journeyKey: v.string(),
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  status: onboardingSoulReportStatusValidator,
  reportVersion: v.string(),
  summary: v.string(),
  highlights: v.array(v.string()),
  evidence: v.object({
    completedNurtureSteps: v.number(),
    funnelEventCount: v.number(),
    firstWinSlaState: onboardingSoulReportFirstWinStateValidator,
    firstMessageLatencyChannelCount: v.number(),
  }),
  qualityGates: v.object({
    dataBacked: v.boolean(),
    channelSafe: v.boolean(),
  }),
  generatedAt: v.optional(v.number()),
  deliveredAt: v.optional(v.number()),
  deliveryChannel: v.optional(onboardingChannelValidator),
  recipientIdentifier: v.optional(v.string()),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_report_key", ["reportKey"])
  .index("by_journey", ["journeyId"])
  .index("by_status_and_time", ["status", "updatedAt"]);

/**
 * ONBOARDING SPECIALIST PREVIEW CONTRACTS
 *
 * Day 5 timer contract for specialist preview delivery.
 */
export const onboardingSpecialistPreviewContracts = defineTable({
  contractKey: v.string(),
  journeyId: v.id("onboardingNurtureJourneys"),
  journeyKey: v.string(),
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  status: onboardingSpecialistPreviewStatusValidator,
  teamAccessMode: onboardingSpecialistAccessModeValidator,
  availableAt: v.number(),
  readyAt: v.optional(v.number()),
  deliveredAt: v.optional(v.number()),
  sourceSoulReportId: v.optional(v.id("onboardingSoulReports")),
  previewMessage: v.string(),
  deliveryChannel: v.optional(onboardingChannelValidator),
  recipientIdentifier: v.optional(v.string()),
  qualityGateStatus: v.union(v.literal("pass"), v.literal("blocked")),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_contract_key", ["contractKey"])
  .index("by_status_and_available", ["status", "availableAt"])
  .index("by_user_and_time", ["userId", "updatedAt"]);

const onboardingPostCaptureDispatchRunStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("retry_scheduled"),
  v.literal("succeeded"),
  v.literal("failed_terminal"),
  v.literal("dead_lettered"),
  v.literal("replay_requested")
);

const onboardingPostCaptureDispatchStepStatusValidator = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("succeeded"),
  v.literal("failed_retryable"),
  v.literal("failed_terminal"),
  v.literal("skipped_policy")
);

const onboardingPostCaptureDispatchStepStateValidator = v.object({
  stepKey: v.string(),
  status: onboardingPostCaptureDispatchStepStatusValidator,
  attemptCount: v.number(),
  lastAttemptAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  lastReasonCode: v.optional(v.string()),
  lastError: v.optional(v.string()),
  outputRef: v.optional(v.string()),
  externalSideEffectId: v.optional(v.string()),
});

export const onboardingPostCaptureDispatchRuns = defineTable({
  dispatchKey: v.string(),
  idempotencyKey: v.string(),
  correlationId: v.string(),
  organizationId: v.id("organizations"),
  auditSessionKey: v.string(),
  channel: onboardingChannelValidator,
  status: onboardingPostCaptureDispatchRunStatusValidator,
  attemptCount: v.number(),
  maxAttempts: v.number(),
  nextRetryAt: v.optional(v.number()),
  leaseOwner: v.optional(v.string()),
  leaseToken: v.optional(v.string()),
  leaseExpiresAt: v.optional(v.number()),
  stepState: v.array(onboardingPostCaptureDispatchStepStateValidator),
  payloadSnapshotRef: v.optional(v.string()),
  payloadSnapshot: v.optional(v.any()),
  outputs: v.optional(v.any()),
  reasonCode: v.optional(v.string()),
  error: v.optional(v.string()),
  replayOfRunId: v.optional(v.id("onboardingPostCaptureDispatchRuns")),
  deadLetterId: v.optional(v.id("onboardingPostCaptureDispatchDeadLetters")),
  createdAt: v.number(),
  updatedAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_dispatch_key", ["organizationId", "dispatchKey"])
  .index("by_idempotency_key", ["organizationId", "idempotencyKey"])
  .index("by_status_next_retry", ["status", "nextRetryAt"])
  .index("by_org_status_updated", ["organizationId", "status", "updatedAt"]);

const onboardingPostCaptureDispatchAttemptStatusValidator = v.union(
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed_retryable"),
  v.literal("failed_terminal")
);

export const onboardingPostCaptureDispatchAttempts = defineTable({
  runId: v.id("onboardingPostCaptureDispatchRuns"),
  organizationId: v.id("organizations"),
  dispatchKey: v.string(),
  attemptNumber: v.number(),
  status: onboardingPostCaptureDispatchAttemptStatusValidator,
  leaseOwner: v.string(),
  leaseToken: v.string(),
  leaseExpiresAt: v.number(),
  reasonCode: v.optional(v.string()),
  error: v.optional(v.string()),
  backoffMs: v.optional(v.number()),
  stepStateSnapshot: v.optional(v.array(onboardingPostCaptureDispatchStepStateValidator)),
  createdAt: v.number(),
  updatedAt: v.number(),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_run_attempt", ["runId", "attemptNumber"])
  .index("by_status_started", ["status", "startedAt"])
  .index("by_org_started", ["organizationId", "startedAt"]);

const onboardingPostCaptureDispatchDeadLetterStatusValidator = v.union(
  v.literal("open"),
  v.literal("triaging"),
  v.literal("replay_queued"),
  v.literal("replayed"),
  v.literal("resolved")
);

export const onboardingPostCaptureDispatchDeadLetters = defineTable({
  runId: v.id("onboardingPostCaptureDispatchRuns"),
  organizationId: v.id("organizations"),
  dispatchKey: v.string(),
  status: onboardingPostCaptureDispatchDeadLetterStatusValidator,
  reasonCode: v.string(),
  error: v.optional(v.string()),
  payloadSnapshotRef: v.optional(v.string()),
  payloadSnapshot: v.optional(v.any()),
  stepStateSnapshot: v.optional(v.array(onboardingPostCaptureDispatchStepStateValidator)),
  latestAttemptNumber: v.number(),
  replayCount: v.number(),
  lastReplayedAt: v.optional(v.number()),
  triageNotes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  resolvedAt: v.optional(v.number()),
})
  .index("by_run", ["runId"])
  .index("by_status_updated", ["status", "updatedAt"])
  .index("by_org_status_updated", ["organizationId", "status", "updatedAt"]);
