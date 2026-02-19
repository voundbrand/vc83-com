/**
 * WEBCHAT SCHEMAS
 *
 * Tables for the webchat widget public API.
 *
 * Tables:
 * - webchatSessions: Anonymous visitor sessions (24h expiry)
 * - anonymousIdentityLedger: Cross-channel identity ledger for anonymous sessions
 * - anonymousClaimTokens: Signed one-time claim token registry
 * - webchatRateLimits: IP-based rate limiting for public endpoints
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

const onboardingChannelValidator = v.union(
  v.literal("webchat"),
  v.literal("native_guest"),
  v.literal("telegram"),
  v.literal("platform_web"),
  v.literal("unknown")
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
  .index("by_telegram_chat", ["telegramChatId"]);

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
    v.literal("onboarding.funnel.credit_purchase")
  ),
  channel: onboardingChannelValidator,
  organizationId: v.optional(v.id("organizations")),
  userId: v.optional(v.id("users")),
  sessionToken: v.optional(v.string()),
  telegramChatId: v.optional(v.string()),
  claimTokenId: v.optional(v.string()),
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
  .index("by_org_and_time", ["organizationId", "createdAt"]);
