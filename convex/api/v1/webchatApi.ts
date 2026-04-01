/**
 * WEBCHAT API
 *
 * Public API endpoints for the webchat widget.
 * Enables visitors to chat with AI agents embedded on any website.
 *
 * Endpoints:
 *   POST /api/v1/webchat/message - Send a message from a webchat visitor
 *   GET /api/v1/webchat/config/:agentId - Get widget configuration for an agent
 *
 * Integration with Comms Platform:
 *   - Webchat operates at Layer 4 (End User ↔ AI Agent)
 *   - Messages flow through the existing agent execution pipeline
 *   - Sessions are anonymous until visitor provides contact info
 *   - Future: notification events for conversation.started, message.received
 */

import { v } from "convex/values";
import { internalAction, internalQuery, internalMutation } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { normalizeClaimTokenForResponse } from "../../onboarding/claimTokenResponse";
import {
  UNIVERSAL_ONBOARDING_POLICY_VERSION,
  normalizePublicEntryChannel,
  resolveExplicitGuestOnboardingSurface,
  shouldOfferOnboardingWarmup,
} from "../../onboarding/universalOnboardingPolicy";
import {
  WEBCHAT_BOOTSTRAP_CONTRACT_VERSION,
  normalizeWebchatCustomizationContract,
  type PublicInboundChannel,
  type WebchatCustomizationContract,
  type WebchatWidgetPosition,
} from "../../webchatCustomizationContract";
import {
  evaluateIngressAdmission,
  type AdmissionDenialV1,
} from "../../ai/admissionController";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../_generated/api");

type InboundRateLimitChannel = PublicInboundChannel | "telegram";

type CampaignAttribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landingPath?: string;
};

type AbuseDecision = {
  allowed: boolean;
  retryAfterMs?: number;
  requiresChallenge?: boolean;
  challengeReason?: string;
  challengeType?: "proof_of_human";
  riskScore?: number;
  reason?: string;
};

const challengeMetadataValidator = v.object({
  source: v.optional(v.string()),
  medium: v.optional(v.string()),
  campaign: v.optional(v.string()),
  content: v.optional(v.string()),
  term: v.optional(v.string()),
  referrer: v.optional(v.string()),
  landingPath: v.optional(v.string()),
});

const auditQuestionIdValidator = v.union(
  v.literal("business_revenue"),
  v.literal("team_size"),
  v.literal("monday_priority"),
  v.literal("delegation_gap"),
  v.literal("reclaimed_time")
);

const rateLimitChannelValidator = v.union(
  v.literal("webchat"),
  v.literal("native_guest"),
  v.literal("telegram")
);

const SESSION_TOKEN_PREFIX: Record<PublicInboundChannel, string> = {
  webchat: "wc",
  native_guest: "ng",
};
const SUPPORTED_PUBLIC_CHAT_LANGUAGES = new Set(["en", "de", "pl", "es", "fr", "ja"]);
const PUBLIC_MESSAGE_CONTEXT_FAILURE_DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const PUBLIC_MESSAGE_CONTEXT_FAILURE_MAX_SCAN = 120;
const PUBLIC_OPERATOR_NAME_FALLBACK = "Operator";
const INTERNAL_OPERATOR_NAME_PATTERN = /\b(midwife|quin|quinn|worker\s*\d+)\b/i;
const GENERIC_AGENT_LABEL_PATTERN = /^(the\s+)?(ai\s+)?agent$/i;

function normalizePublicChannel(channel?: PublicInboundChannel): PublicInboundChannel {
  return normalizePublicEntryChannel(channel);
}

function normalizePublicOperatorName(name?: string): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return PUBLIC_OPERATOR_NAME_FALLBACK;
  }
  if (INTERNAL_OPERATOR_NAME_PATTERN.test(trimmed)) {
    return PUBLIC_OPERATOR_NAME_FALLBACK;
  }
  if (GENERIC_AGENT_LABEL_PATTERN.test(trimmed)) {
    return PUBLIC_OPERATOR_NAME_FALLBACK;
  }
  return trimmed;
}

function resolveChannelCandidates(channel: PublicInboundChannel): PublicInboundChannel[] {
  // Native guest reuses webchat bindings until dedicated channel config is added.
  return channel === "native_guest" ? ["native_guest", "webchat"] : ["webchat"];
}

function normalizeRateLimitChannel(channel?: InboundRateLimitChannel): InboundRateLimitChannel {
  if (channel === "native_guest") return "native_guest";
  if (channel === "telegram") return "telegram";
  return "webchat";
}

function normalizeAttribution(
  attribution?: CampaignAttribution
): CampaignAttribution | undefined {
  if (!attribution) return undefined;
  const normalized: CampaignAttribution = {};

  if (attribution.source?.trim()) normalized.source = attribution.source.trim();
  if (attribution.medium?.trim()) normalized.medium = attribution.medium.trim();
  if (attribution.campaign?.trim()) normalized.campaign = attribution.campaign.trim();
  if (attribution.content?.trim()) normalized.content = attribution.content.trim();
  if (attribution.term?.trim()) normalized.term = attribution.term.trim();
  if (attribution.referrer?.trim()) normalized.referrer = attribution.referrer.trim();
  if (attribution.landingPath?.trim()) normalized.landingPath = attribution.landingPath.trim();

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizePublicChatLanguageHint(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().split(/[-_]/)[0]?.toLowerCase() || "";
  return SUPPORTED_PUBLIC_CHAT_LANGUAGES.has(normalized) ? normalized : undefined;
}

function normalizePublicChatLocaleHint(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (normalized.length === 0) return undefined;
  return normalized.slice(0, 24);
}

function quickHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

function normalizeIdentifier(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? quickHash(trimmed.toLowerCase()) : undefined;
}

function normalizeMessageHash(message?: string): string | undefined {
  if (!message) return undefined;
  const compact = message.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 200);
  return compact.length > 0 ? quickHash(compact) : undefined;
}

function calculateRetryAfter(entries: Array<{ timestamp: number }>, windowMs: number): number | undefined {
  if (entries.length === 0) return undefined;
  const oldest = entries.reduce((min, entry) => (entry.timestamp < min.timestamp ? entry : min));
  return Math.max(0, oldest.timestamp + windowMs - Date.now());
}

function sanitizeChallengeToken(token?: string): string | undefined {
  if (!token) return undefined;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function createSessionToken(channel: PublicInboundChannel): string {
  const tokenPrefix = SESSION_TOKEN_PREFIX[channel];
  return `${tokenPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function isChannelSessionToken(sessionToken: string, channel: PublicInboundChannel): boolean {
  return sessionToken.startsWith(`${SESSION_TOKEN_PREFIX[channel]}_`);
}

function getEnabledChannelConfig(
  config: Record<string, unknown> | undefined,
  channel: PublicInboundChannel
): Record<string, unknown> | null {
  const candidates = resolveChannelCandidates(channel);
  const rawChannelBindings = config?.channelBindings;

  if (Array.isArray(rawChannelBindings)) {
    for (const candidate of candidates) {
      const binding = rawChannelBindings.find((entry) => {
        if (!entry || typeof entry !== "object") return false;
        const bindingRecord = entry as Record<string, unknown>;
        return bindingRecord.channel === candidate && bindingRecord.enabled === true;
      }) as Record<string, unknown> | undefined;

      if (binding) {
        return binding;
      }
    }
  }

  if (rawChannelBindings && typeof rawChannelBindings === "object") {
    const legacyBindings = rawChannelBindings as Record<string, unknown>;
    for (const candidate of candidates) {
      const legacyConfig = legacyBindings[candidate];
      if (!legacyConfig || typeof legacyConfig !== "object") {
        continue;
      }

      const legacyConfigRecord = legacyConfig as Record<string, unknown>;
      if (legacyConfigRecord.enabled === true) {
        return legacyConfigRecord;
      }
    }
  }

  return null;
}

export type ResolvedPublicMessageContext = {
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  channel: PublicInboundChannel;
  source: "session" | "agent";
  organizationIdStatus: "resolved" | "matched_legacy" | "overrode_legacy";
};

export type PublicMessageDeploymentMode = "platform_entry" | "direct_agent_entry";

type PublicMessageContextResolutionArgs = {
  organizationId?: Id<"organizations">;
  agentId?: Id<"objects">;
  channel?: PublicInboundChannel;
  sessionToken?: string;
  deploymentMode?: PublicMessageDeploymentMode;
};

type PublicMessageContextResolutionSessionRecord = {
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  channel?: PublicInboundChannel;
};

type PublicMessageContextResolutionAgentRecord = {
  type: string;
  organizationId: Id<"organizations">;
  customProperties?: Record<string, unknown>;
  deletedAt?: number;
};

export type PublicMessageContextResolutionDb = {
  get: (id: Id<"objects">) => Promise<PublicMessageContextResolutionAgentRecord | null>;
  query: (tableName: "webchatSessions") => {
    withIndex: (
      indexName: "by_session_token",
      cb: (q: { eq: (fieldName: "sessionToken", value: string) => unknown }) => unknown
    ) => {
      first: () => Promise<PublicMessageContextResolutionSessionRecord | null>;
    };
  };
};

function resolveLegacyOrganizationStatus(
  providedOrganizationId: Id<"organizations"> | undefined,
  canonicalOrganizationId: Id<"organizations">
): "resolved" | "matched_legacy" | "overrode_legacy" {
  if (!providedOrganizationId) {
    return "resolved";
  }
  return providedOrganizationId === canonicalOrganizationId ? "matched_legacy" : "overrode_legacy";
}

function normalizePublicMessageDeploymentMode(
  mode?: PublicMessageDeploymentMode
): PublicMessageDeploymentMode {
  return mode === "direct_agent_entry" ? "direct_agent_entry" : "platform_entry";
}

export async function resolvePublicMessageContextFromDb(
  db: PublicMessageContextResolutionDb,
  args: PublicMessageContextResolutionArgs
): Promise<ResolvedPublicMessageContext | null> {
  const channel = normalizePublicChannel(args.channel);
  const normalizedSessionToken = args.sessionToken?.trim();
  const deploymentMode = normalizePublicMessageDeploymentMode(args.deploymentMode);

  if (
    deploymentMode === "platform_entry"
    && normalizedSessionToken
    && isChannelSessionToken(normalizedSessionToken, channel)
  ) {
    const session = await db
      .query("webchatSessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", normalizedSessionToken))
      .first();

    if (session && (!session.channel || session.channel === channel)) {
      if (args.agentId && args.agentId !== session.agentId) {
        return null;
      }

      return {
        organizationId: session.organizationId,
        agentId: session.agentId,
        channel,
        source: "session",
        organizationIdStatus: resolveLegacyOrganizationStatus(
          args.organizationId,
          session.organizationId
        ),
      };
    }
  }

  if (!args.agentId) {
    return null;
  }

  const agent = await db.get(args.agentId);
  if (!agent || (agent.type !== "org_agent" && agent.type !== "agent")) {
    return null;
  }

  if (agent.deletedAt) {
    return null;
  }

  const config = agent.customProperties as Record<string, unknown> | undefined;
  if (!getEnabledChannelConfig(config, channel)) {
    return null;
  }

  return {
    organizationId: agent.organizationId,
    agentId: args.agentId,
    channel,
    source: "agent",
    organizationIdStatus: resolveLegacyOrganizationStatus(args.organizationId, agent.organizationId),
  };
}

export const resolvePublicMessageContext = internalQuery({
  args: {
    organizationId: v.optional(v.id("organizations")),
    agentId: v.optional(v.id("objects")),
    channel: v.optional(v.union(v.literal("webchat"), v.literal("native_guest"))),
    sessionToken: v.optional(v.string()),
    deploymentMode: v.optional(v.union(v.literal("platform_entry"), v.literal("direct_agent_entry"))),
  },
  handler: async (ctx, args): Promise<ResolvedPublicMessageContext | null> =>
    resolvePublicMessageContextFromDb(ctx.db as PublicMessageContextResolutionDb, args),
});

// ============================================================================
// TYPES
// ============================================================================

export interface WebchatSession {
  sessionToken: string;
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  channel?: "webchat" | "native_guest";
  agentSessionId?: Id<"agentSessions">;
  visitorInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  claimedByUserId?: Id<"users">;
  claimedOrganizationId?: Id<"organizations">;
  claimedAt?: number;
  createdAt: number;
  lastActivityAt: number;
}

export interface WebchatConfig extends WebchatCustomizationContract {
  agentId: string;
  agentName: string;
  avatar?: string;
}

export interface PublicWebchatBootstrapContract {
  contractVersion: string;
  resolvedAt: number;
  channel: PublicInboundChannel;
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  config: WebchatConfig;
  deploymentDefaults: {
    snippetMode: "script";
    iframe: {
      width: number;
      height: number;
      offsetPx: number;
      position: WebchatWidgetPosition;
    };
  };
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Create a new webchat session token
 */
export const createWebchatSession = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    channel: v.optional(v.union(v.literal("webchat"), v.literal("native_guest"))),
    visitorInfo: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args): Promise<{ sessionToken: string }> => {
    // Generate a secure session token
    const channel = normalizePublicChannel(args.channel);
    const sessionToken = createSessionToken(channel);

    // Store session in database
    await ctx.db.insert("webchatSessions", {
      sessionToken,
      organizationId: args.organizationId,
      agentId: args.agentId,
      channel,
      visitorInfo: args.visitorInfo,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    return { sessionToken };
  },
});

/**
 * Get an existing webchat session by token
 */
export const getWebchatSession = internalQuery({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("webchatSessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) return null;

    // Check if session expired (24 hours of inactivity)
    const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;
    if (Date.now() - session.lastActivityAt > SESSION_EXPIRY_MS) {
      return null;
    }

    return session;
  },
});

async function requireEvalTraceSessionScope(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  sessionToken: string;
  channel?: PublicInboundChannel;
}) {
  const session = await args.ctx.runQuery(generatedApi.internal.api.v1.webchatApi.getWebchatSession, {
    sessionToken: args.sessionToken,
  });
  if (!session) {
    throw new Error("Unauthorized eval trace access: session not found.");
  }
  if (String(session.organizationId) !== String(args.organizationId)) {
    throw new Error("Unauthorized eval trace access: session organization mismatch.");
  }
  if (args.channel && session.channel && session.channel !== args.channel) {
    throw new Error("Unauthorized eval trace access: session channel mismatch.");
  }
  return session;
}

export const getWebchatEvalRunPlaybackTrace = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    sessionToken: v.string(),
    channel: v.optional(v.union(v.literal("webchat"), v.literal("native_guest"))),
    runId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const normalizedSessionToken = args.sessionToken.trim();
    const channel =
      typeof args.channel === "undefined" ? undefined : normalizePublicChannel(args.channel);
    await requireEvalTraceSessionScope({
      ctx,
      organizationId: args.organizationId,
      sessionToken: normalizedSessionToken,
      channel,
    });
    return await (ctx as any).runQuery(
      generatedApi.internal.ai.chat.getEvalRunPlaybackTraceInternal,
      {
        organizationId: args.organizationId,
        runId: args.runId,
        limit: args.limit,
      }
    );
  },
});

export const getWebchatEvalRunDiffTrace = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    sessionToken: v.string(),
    channel: v.optional(v.union(v.literal("webchat"), v.literal("native_guest"))),
    baselineRunId: v.string(),
    candidateRunId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const normalizedSessionToken = args.sessionToken.trim();
    const channel =
      typeof args.channel === "undefined" ? undefined : normalizePublicChannel(args.channel);
    await requireEvalTraceSessionScope({
      ctx,
      organizationId: args.organizationId,
      sessionToken: normalizedSessionToken,
      channel,
    });
    return await (ctx as any).runQuery(
      generatedApi.internal.ai.chat.getEvalRunDiffTraceInternal,
      {
        organizationId: args.organizationId,
        baselineRunId: args.baselineRunId,
        candidateRunId: args.candidateRunId,
        limit: args.limit,
      }
    );
  },
});

export const getWebchatEvalPromotionEvidencePacket = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    sessionToken: v.string(),
    channel: v.optional(v.union(v.literal("webchat"), v.literal("native_guest"))),
    runId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const normalizedSessionToken = args.sessionToken.trim();
    const channel =
      typeof args.channel === "undefined" ? undefined : normalizePublicChannel(args.channel);
    await requireEvalTraceSessionScope({
      ctx,
      organizationId: args.organizationId,
      sessionToken: normalizedSessionToken,
      channel,
    });
    return await (ctx as any).runQuery(
      generatedApi.internal.ai.chat.getEvalPromotionEvidencePacketInternal,
      {
        organizationId: args.organizationId,
        runId: args.runId,
        limit: args.limit,
      }
    );
  },
});

/**
 * Update session activity timestamp
 */
export const updateSessionActivity = internalMutation({
  args: {
    sessionToken: v.string(),
    agentSessionId: v.optional(v.id("agentSessions")),
    visitorInfo: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("webchatSessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) return;

    const now = Date.now();
    const updates: Partial<typeof session> = {
      lastActivityAt: now,
    };

    if (args.agentSessionId) {
      updates.agentSessionId = args.agentSessionId;
    }

    if (args.visitorInfo) {
      updates.visitorInfo = {
        ...session.visitorInfo,
        ...args.visitorInfo,
      };
    }

    await ctx.db.patch(session._id, updates);

    const binding = await ctx.db
      .query("guestOnboardingBindings")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();
    if (binding) {
      await ctx.db.patch(binding._id, {
        updatedAt: now,
        lastActivityAt: now,
      });
    }
  },
});

/**
 * Rebind an existing webchat/native_guest session to a new org+agent context.
 * Used when onboarding handoff promotes a guest session from the platform bot
 * to the user's newly provisioned workspace.
 */
export const rebindSessionContext = internalMutation({
  args: {
    sessionToken: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    agentSessionId: v.optional(v.id("agentSessions")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("webchatSessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) return { success: false as const, reason: "session_not_found" as const };

    const now = Date.now();
    await ctx.db.patch(session._id, {
      organizationId: args.organizationId,
      agentId: args.agentId,
      agentSessionId: args.agentSessionId ?? session.agentSessionId,
      lastActivityAt: now,
    });

    const binding = await ctx.db
      .query("guestOnboardingBindings")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();
    if (binding) {
      await ctx.db.patch(binding._id, {
        resolvedAgentId: args.agentId,
        updatedAt: now,
        lastActivityAt: now,
      });
    }

    return { success: true as const };
  },
});

async function ensureAuditChannelSession(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  channel: PublicInboundChannel;
  sessionToken?: string;
  visitorInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}) {
  const normalizedSessionToken = args.sessionToken?.trim();
  let existingSession = null as any;
  let sessionToken = normalizedSessionToken;
  let createdNewSession = false;

  if (sessionToken && isChannelSessionToken(sessionToken, args.channel)) {
    existingSession = await args.ctx.runQuery(generatedApi.internal.api.v1.webchatApi.getWebchatSession, {
      sessionToken,
    });
  }

  if (existingSession) {
    if (existingSession.channel && existingSession.channel !== args.channel) {
      throw new Error("Session token channel mismatch");
    }
    if (
      existingSession.organizationId !== args.organizationId
      || existingSession.agentId !== args.agentId
    ) {
      throw new Error("Session context mismatch");
    }
  }

  if (!existingSession) {
    const result = await args.ctx.runMutation(generatedApi.internal.api.v1.webchatApi.createWebchatSession, {
      organizationId: args.organizationId,
      agentId: args.agentId,
      channel: args.channel,
      visitorInfo: args.visitorInfo,
    });
    sessionToken = result.sessionToken;
    createdNewSession = true;
    existingSession = await args.ctx.runQuery(generatedApi.internal.api.v1.webchatApi.getWebchatSession, {
      sessionToken,
    });
  } else {
    await args.ctx.runMutation(generatedApi.internal.api.v1.webchatApi.updateSessionActivity, {
      sessionToken,
      visitorInfo: args.visitorInfo,
    });
  }

  if (!existingSession || !sessionToken) {
    throw new Error("Unable to initialize session");
  }

  return {
    sessionToken,
    session: existingSession,
    createdNewSession,
  };
}

async function issueGuestClaimTokenForSession(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  channel: PublicInboundChannel;
  sessionToken: string;
  visitorInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  attribution?: CampaignAttribution;
  agentSessionId?: Id<"agentSessions">;
}): Promise<string | null> {
  try {
    await args.ctx.runMutation(generatedApi.internal.onboarding.identityClaims.syncGuestSessionLedger, {
      sessionToken: args.sessionToken,
      organizationId: args.organizationId,
      agentId: args.agentId,
      channel: args.channel,
      visitorInfo: args.visitorInfo,
      agentSessionId: args.agentSessionId,
    });

    const tokenResult = await args.ctx.runMutation(
      generatedApi.internal.onboarding.identityClaims.issueGuestSessionClaimToken,
      {
        sessionToken: args.sessionToken,
        organizationId: args.organizationId,
        agentId: args.agentId,
        channel: args.channel,
        visitorInfo: args.visitorInfo,
        attribution: args.attribution,
      }
    );

    return normalizeClaimTokenForResponse(tokenResult?.claimToken);
  } catch (claimError) {
    console.error("[Webchat] Claim token issuance failed (non-blocking):", claimError);
    return null;
  }
}

// ============================================================================
// AGENT CONFIG
// ============================================================================

/**
 * Get webchat configuration for an agent
 */
export const getWebchatConfig = internalQuery({
  args: {
    agentId: v.id("objects"),
    channel: v.optional(v.union(v.literal("webchat"), v.literal("native_guest"))),
  },
  handler: async (ctx, args): Promise<WebchatConfig | null> => {
    const channel = normalizePublicChannel(args.channel);

    // Get the agent object
    const agent = await ctx.db.get(args.agentId);
    if (!agent || (agent.type !== "org_agent" && agent.type !== "agent")) {
      return null;
    }

    // Check for soft delete (field may not exist on type)
    const agentRecord = agent as typeof agent & { deletedAt?: number };
    if (agentRecord.deletedAt) {
      return null;
    }

    // Check if webchat channel is enabled
    const config = agent.customProperties as Record<string, unknown> | undefined;
    const webchatConfig = getEnabledChannelConfig(config, channel);

    if (!webchatConfig) {
      return null;
    }

    // Get organization for branding defaults
    const org = await ctx.db.get(agent.organizationId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgBranding = (org as any)?.customProperties as Record<string, unknown> | undefined;
    const customization = normalizeWebchatCustomizationContract(webchatConfig, {
      brandColor:
        typeof orgBranding?.primaryColor === "string"
          ? orgBranding.primaryColor
          : undefined,
    });

    return {
      agentId: args.agentId,
      agentName: normalizePublicOperatorName(
        (config?.displayName as string) ||
        (config?.name as string) ||
        agent.name ||
        PUBLIC_OPERATOR_NAME_FALLBACK
      ),
      avatar: (config?.avatar as string) || undefined,
      ...customization,
    };
  },
});

export const getPublicWebchatBootstrap = internalQuery({
  args: {
    agentId: v.id("objects"),
    channel: v.optional(v.union(v.literal("webchat"), v.literal("native_guest"))),
  },
  handler: async (ctx, args): Promise<PublicWebchatBootstrapContract | null> => {
    const channel = normalizePublicChannel(args.channel);
    const resolvedContext = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.webchatApi.resolvePublicMessageContext,
      {
        agentId: args.agentId,
        channel,
        deploymentMode: "direct_agent_entry",
      }
    );

    if (!resolvedContext) {
      return null;
    }

    const config = await (ctx as any).runQuery(generatedApi.internal.api.v1.webchatApi.getWebchatConfig, {
      agentId: resolvedContext.agentId,
      channel,
    });

    if (!config) {
      return null;
    }

    return {
      contractVersion: WEBCHAT_BOOTSTRAP_CONTRACT_VERSION,
      resolvedAt: Date.now(),
      channel,
      organizationId: resolvedContext.organizationId,
      agentId: resolvedContext.agentId,
      config,
      deploymentDefaults: {
        snippetMode: "script",
        iframe: {
          width: 400,
          height: 600,
          offsetPx: 20,
          position: config.position,
        },
      },
    };
  },
});

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Handle an incoming webchat message
 *
 * This is the main entry point for webchat messages.
 * It creates/resumes a session, routes through the agent pipeline,
 * and returns the AI response.
 */
export const handleWebchatMessage = internalAction({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    channel: v.optional(v.union(v.literal("webchat"), v.literal("native_guest"))),
    sessionToken: v.optional(v.string()),
    onboardingSurface: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    requestCorrelationId: v.optional(v.string()),
    message: v.string(),
    attachments: v.optional(v.array(v.any())),
    language: v.optional(v.string()),
    locale: v.optional(v.string()),
    attribution: v.optional(challengeMetadataValidator),
    visitorInfo: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    sessionToken: string;
    claimToken: string | null;
    response?: string;
    agentName?: string;
    error?: string;
    admissionDenial?: AdmissionDenialV1;
  }> => {
    try {
      const channel = normalizePublicChannel(args.channel);
      const attribution = normalizeAttribution(args.attribution);
      const localeHint = normalizePublicChatLocaleHint(args.locale);
      const languageHint =
        normalizePublicChatLanguageHint(args.language)
        ?? normalizePublicChatLanguageHint(localeHint);
      const onboardingSurface = resolveExplicitGuestOnboardingSurface({
        channel,
        onboardingSurface: args.onboardingSurface,
      });
      let sessionToken = args.sessionToken;
      let existingSession = null;
      let createdNewSession = false;
      const onboardingWarmupOffered = shouldOfferOnboardingWarmup(channel);

      // Try to get existing session
      if (sessionToken && isChannelSessionToken(sessionToken, channel)) {
        existingSession = await (ctx as any).runQuery(generatedApi.internal.api.v1.webchatApi.getWebchatSession, {
          sessionToken,
        });
      }

      if (existingSession) {
        if (existingSession.channel && existingSession.channel !== channel) {
          return {
            success: false,
            sessionToken: sessionToken!,
            claimToken: null,
            error: "Session token channel mismatch",
          };
        }

        if (
          existingSession.organizationId !== args.organizationId ||
          existingSession.agentId !== args.agentId
        ) {
          return {
            success: false,
            sessionToken: sessionToken!,
            claimToken: null,
            error: "Session context mismatch",
          };
        }
      }

      // Create new session if needed
      if (!existingSession) {
        const result = await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.createWebchatSession, {
          organizationId: args.organizationId,
          agentId: args.agentId,
          channel,
          visitorInfo: args.visitorInfo,
        });
        sessionToken = result.sessionToken;
        createdNewSession = true;
      } else {
        // Update existing session activity
        await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.updateSessionActivity, {
          sessionToken: sessionToken!,
          visitorInfo: args.visitorInfo,
        });
      }

      if (onboardingSurface && sessionToken) {
        await (ctx as any).runMutation(
          generatedApi.internal.onboarding.orgBootstrap.ensureGuestOnboardingOrgBinding,
          {
            channel,
            onboardingSurface,
            sessionToken,
            source: `${channel}:${onboardingSurface}:guest_onboarding`,
          }
        );
      }

      // Get agent config for response
      const agentConfig = await (ctx as any).runQuery(generatedApi.internal.api.v1.webchatApi.getWebchatConfig, {
        agentId: args.agentId,
        channel,
      });

      if (!agentConfig) {
        const admission = evaluateIngressAdmission({
          channel,
          contextResolved: true,
          agentFound: true,
          channelAllowed: false,
        });
        return {
          success: false,
          sessionToken: sessionToken!,
          claimToken: null,
          error: admission.allowed
            ? "Agent not found or webchat not enabled"
            : admission.denial.reason,
          admissionDenial: admission.allowed ? undefined : admission.denial,
        };
      }

      // Route message through the agent execution pipeline
      // The sessionToken becomes the externalContactIdentifier for webchat channel
      const skipOutbound = channel === "native_guest";
      if (channel === "native_guest") {
        console.info("[NativeGuestReplayTrace] webchat_handle_message", {
          requestCorrelationId: args.requestCorrelationId || null,
          organizationId: String(args.organizationId),
          agentId: String(args.agentId),
          sessionToken: sessionToken!,
          idempotencyKey: args.idempotencyKey || null,
        });
      }
      const result = await (ctx as any).runAction(generatedApi.api["ai/kernel/agentExecution"].processInboundMessage, {
        organizationId: args.organizationId,
        channel,
        externalContactIdentifier: sessionToken!,
        message: args.message,
        metadata: {
          agentId: args.agentId,
          idempotencyKey: args.idempotencyKey,
          payloadHash: args.idempotencyKey,
          requestCorrelationId: args.requestCorrelationId,
          correlationId: args.requestCorrelationId,
          visitorInfo: args.visitorInfo,
          attachments: args.attachments,
          imageAttachmentCount: Array.isArray(args.attachments) ? args.attachments.length : 0,
          onboardingPolicyVersion: UNIVERSAL_ONBOARDING_POLICY_VERSION,
          onboardingWarmupOffered,
          ...(languageHint ? { language: languageHint } : {}),
          ...(localeHint ? { locale: localeHint } : {}),
          ...(onboardingSurface ? { onboardingSurface } : {}),
          ...(skipOutbound ? { skipOutbound: true, transport: "native_guest_http" } : {}),
        },
      });

      // Update session with agent session ID if created
      if (result.sessionId) {
        await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.updateSessionActivity, {
          sessionToken: sessionToken!,
          agentSessionId: result.sessionId as Id<"agentSessions">,
        });
      }

      // Keep anonymous identity ledger in sync and issue claim token.
      // Failures here are non-blocking for chat response.
      let claimToken: string | null = null;
      try {
        await (ctx as any).runMutation(generatedApi.internal.onboarding.identityClaims.syncGuestSessionLedger, {
          sessionToken: sessionToken!,
          organizationId: args.organizationId,
          agentId: args.agentId,
          channel,
          visitorInfo: args.visitorInfo,
          agentSessionId: result.sessionId as Id<"agentSessions"> | undefined,
        });

        const tokenResult = await (ctx as any).runMutation(
          generatedApi.internal.onboarding.identityClaims.issueGuestSessionClaimToken,
          {
            sessionToken: sessionToken!,
            organizationId: args.organizationId,
            agentId: args.agentId,
            channel,
            visitorInfo: args.visitorInfo,
            attribution,
          }
        );

        claimToken = normalizeClaimTokenForResponse(tokenResult?.claimToken);
      } catch (claimError) {
        console.error("[Webchat] Claim token issuance failed (non-blocking):", claimError);
      }

      const runtimeResponse =
        (typeof result.response === "string" && result.response.length > 0
          ? result.response
          : undefined) ||
        (typeof result.message === "string" && result.message.length > 0
          ? result.message
          : undefined);
      if (channel === "native_guest") {
        console.info("[NativeGuestReplayTrace] webchat_process_inbound_result", {
          requestCorrelationId: args.requestCorrelationId || null,
          status: result.status,
          sessionId: result.sessionId ? String(result.sessionId) : null,
          turnId: result.turnId ? String(result.turnId) : null,
          hasResponse: Boolean(runtimeResponse),
        });
      }

      // Emit deterministic funnel stages for first touch and activation.
      // Event emitter handles idempotent dedupe by eventKey.
      try {
        if (createdNewSession) {
          await (ctx as any).runMutation(generatedApi.internal.onboarding.funnelEvents.emitFunnelEvent, {
            eventName: "onboarding.funnel.first_touch",
            channel,
            organizationId: args.organizationId,
            sessionToken: sessionToken!,
            eventKey: `onboarding.funnel.first_touch:${channel}:${sessionToken}`,
            campaign: attribution,
            metadata: {
              agentId: String(args.agentId),
            },
          });
        }

        await (ctx as any).runMutation(generatedApi.internal.onboarding.funnelEvents.emitFunnelEvent, {
          eventName: "onboarding.funnel.activation",
          channel,
          organizationId: args.organizationId,
          sessionToken: sessionToken!,
          eventKey: `onboarding.funnel.activation:${channel}:${sessionToken}`,
          campaign: attribution,
          metadata: {
            agentId: String(args.agentId),
            hasRuntimeResponse: Boolean(runtimeResponse),
          },
        });
      } catch (eventError) {
        console.error("[Webchat] Funnel event emission failed (non-blocking):", eventError);
      }

      return {
        success:
          result.status === "success"
          || (
            Boolean(runtimeResponse)
            && channel === "native_guest"
          ),
        sessionToken: sessionToken!,
        claimToken,
        response: runtimeResponse,
        agentName: agentConfig.agentName,
        error:
          (result.status !== "success" && !runtimeResponse)
            ? "Unable to process message"
            : undefined,
      };
    } catch (error) {
      console.error("[Webchat] Error handling message:", error);
      return {
        success: false,
        sessionToken: args.sessionToken || "",
        claimToken: null,
        error: error instanceof Error ? error.message : "An error occurred",
      };
    }
  },
});

/**
 * Start deterministic audit-mode intake for webchat/native_guest.
 */
export const startAuditModeSession = internalAction({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    channel: v.optional(v.union(v.literal("webchat"), v.literal("native_guest"))),
    sessionToken: v.optional(v.string()),
    attribution: v.optional(challengeMetadataValidator),
    visitorInfo: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    try {
      const channel = normalizePublicChannel(args.channel);
      const attribution = normalizeAttribution(args.attribution);

      const agentConfig = await (ctx as any).runQuery(generatedApi.internal.api.v1.webchatApi.getWebchatConfig, {
        agentId: args.agentId,
        channel,
      });

      if (!agentConfig) {
        return {
          success: false,
          error: "Agent not found or webchat not enabled",
          claimToken: null,
          sessionToken: args.sessionToken || "",
        };
      }

      const sessionResult = await ensureAuditChannelSession({
        ctx,
        organizationId: args.organizationId,
        agentId: args.agentId,
        channel,
        sessionToken: args.sessionToken,
        visitorInfo: args.visitorInfo,
      });

      const claimToken = await issueGuestClaimTokenForSession({
        ctx,
        organizationId: args.organizationId,
        agentId: args.agentId,
        channel,
        sessionToken: sessionResult.sessionToken,
        visitorInfo: args.visitorInfo,
        attribution,
        agentSessionId: sessionResult.session.agentSessionId as Id<"agentSessions"> | undefined,
      });

      const auditResult = await (ctx as any).runMutation(
        generatedApi.internal.onboarding.auditMode.startAuditModeSession,
        {
          organizationId: args.organizationId,
          agentId: args.agentId,
          channel,
          sessionToken: sessionResult.sessionToken,
          agentSessionId: sessionResult.session.agentSessionId as Id<"agentSessions"> | undefined,
          sourceIdentityKey: `${channel}:${sessionResult.sessionToken}`,
          campaign: attribution,
          metadata: {
            createdNewWebchatSession: sessionResult.createdNewSession,
          },
        }
      );

      return {
        success: Boolean(auditResult?.success),
        sessionToken: sessionResult.sessionToken,
        claimToken,
        agentName: agentConfig.agentName,
        audit: auditResult,
      };
    } catch (error) {
      console.error("[Webchat] Error starting audit mode:", error);
      return {
        success: false,
        sessionToken: args.sessionToken || "",
        claimToken: null,
        error: error instanceof Error ? error.message : "Unable to start audit mode",
      };
    }
  },
});

/**
 * Answer the current audit-mode question with strict ordering guarantees.
 */
export const answerAuditModeSession = internalAction({
  args: {
    organizationId: v.id("organizations"),
    channel: v.optional(v.union(v.literal("webchat"), v.literal("native_guest"))),
    sessionToken: v.string(),
    questionId: auditQuestionIdValidator,
    answer: v.string(),
    attribution: v.optional(challengeMetadataValidator),
    visitorInfo: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    try {
      const channel = normalizePublicChannel(args.channel);
      const attribution = normalizeAttribution(args.attribution);
      const sessionToken = args.sessionToken.trim();

      const session = await (ctx as any).runQuery(generatedApi.internal.api.v1.webchatApi.getWebchatSession, {
        sessionToken,
      });

      if (!session || String(session.organizationId) !== String(args.organizationId)) {
        return {
          success: false,
          sessionToken,
          claimToken: null,
          error: "Session not found",
        };
      }

      if (session.channel && session.channel !== channel) {
        return {
          success: false,
          sessionToken,
          claimToken: null,
          error: "Session token channel mismatch",
        };
      }

      await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.updateSessionActivity, {
        sessionToken,
        visitorInfo: args.visitorInfo,
      });

      const claimToken = await issueGuestClaimTokenForSession({
        ctx,
        organizationId: args.organizationId,
        agentId: session.agentId,
        channel,
        sessionToken,
        visitorInfo: args.visitorInfo,
        attribution,
        agentSessionId: session.agentSessionId as Id<"agentSessions"> | undefined,
      });

      const auditResult = await (ctx as any).runMutation(
        generatedApi.internal.onboarding.auditMode.answerAuditModeQuestion,
        {
          organizationId: args.organizationId,
          channel,
          sessionToken,
          questionId: args.questionId,
          answer: args.answer,
          campaign: attribution,
          metadata: {
            source: "api.v1.webchatApi.answerAuditModeSession",
          },
        }
      );

      if (!auditResult?.success) {
        return {
          success: false,
          sessionToken,
          claimToken,
          error: auditResult?.errorCode || "Unable to record audit answer",
          audit: auditResult?.session,
        };
      }

      return {
        success: true,
        sessionToken,
        claimToken,
        audit: auditResult.session,
      };
    } catch (error) {
      console.error("[Webchat] Error answering audit mode session:", error);
      return {
        success: false,
        sessionToken: args.sessionToken,
        claimToken: null,
        error: error instanceof Error ? error.message : "Unable to answer audit session",
      };
    }
  },
});

/**
 * Resume audit-mode state for an existing webchat/native_guest session.
 */
export const resumeAuditModeSession = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    channel: v.optional(v.union(v.literal("webchat"), v.literal("native_guest"))),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const channel = normalizePublicChannel(args.channel);
    const sessionToken = args.sessionToken.trim();
    const session = await (ctx as any).runQuery(generatedApi.internal.api.v1.webchatApi.getWebchatSession, {
      sessionToken,
    });

    if (!session || String(session.organizationId) !== String(args.organizationId)) {
      return null;
    }

    if (session.channel && session.channel !== channel) {
      return null;
    }

    return await (ctx as any).runQuery(
      generatedApi.internal.onboarding.auditMode.resumeAuditModeSession,
      {
        organizationId: args.organizationId,
        channel,
        sessionToken,
      }
    );
  },
});

/**
 * Complete audit-mode by storing the workflow recommendation summary.
 */
export const completeAuditModeSession = internalAction({
  args: {
    organizationId: v.id("organizations"),
    channel: v.optional(v.union(v.literal("webchat"), v.literal("native_guest"))),
    sessionToken: v.string(),
    workflowRecommendation: v.string(),
    attribution: v.optional(challengeMetadataValidator),
  },
  handler: async (ctx, args) => {
    try {
      const channel = normalizePublicChannel(args.channel);
      const attribution = normalizeAttribution(args.attribution);
      const sessionToken = args.sessionToken.trim();
      const session = await (ctx as any).runQuery(generatedApi.internal.api.v1.webchatApi.getWebchatSession, {
        sessionToken,
      });

      if (!session || String(session.organizationId) !== String(args.organizationId)) {
        return {
          success: false,
          sessionToken,
          claimToken: null,
          error: "Session not found",
        };
      }

      if (session.channel && session.channel !== channel) {
        return {
          success: false,
          sessionToken,
          claimToken: null,
          error: "Session token channel mismatch",
        };
      }

      await (ctx as any).runMutation(generatedApi.internal.api.v1.webchatApi.updateSessionActivity, {
        sessionToken,
      });

      const claimToken = await issueGuestClaimTokenForSession({
        ctx,
        organizationId: args.organizationId,
        agentId: session.agentId,
        channel,
        sessionToken,
        attribution,
        agentSessionId: session.agentSessionId as Id<"agentSessions"> | undefined,
      });

      const auditResult = await (ctx as any).runMutation(
        generatedApi.internal.onboarding.auditMode.completeAuditModeSession,
        {
          organizationId: args.organizationId,
          channel,
          sessionToken,
          workflowRecommendation: args.workflowRecommendation,
          campaign: attribution,
          metadata: {
            source: "api.v1.webchatApi.completeAuditModeSession",
          },
        }
      );

      if (!auditResult?.success) {
        return {
          success: false,
          sessionToken,
          claimToken,
          error: auditResult?.errorCode || "Unable to complete audit session",
          audit: auditResult?.session,
        };
      }

      let auditSessionSnapshot = auditResult.session;
      try {
        const handoffResult = await (ctx as any).runMutation(
          generatedApi.internal.onboarding.auditMode.openAuditModeHandoff,
          {
            organizationId: args.organizationId,
            channel,
            sessionToken,
            campaign: attribution,
            metadata: {
              source: "api.v1.webchatApi.completeAuditModeSession",
              trigger: "workflow_completion",
            },
          }
        );

        if (handoffResult?.success && handoffResult.session) {
          auditSessionSnapshot = handoffResult.session;
        }
      } catch (handoffError) {
        console.error("[Webchat] Audit handoff telemetry emission failed (non-blocking):", handoffError);
      }

      return {
        success: true,
        sessionToken,
        claimToken,
        audit: auditSessionSnapshot,
      };
    } catch (error) {
      console.error("[Webchat] Error completing audit mode session:", error);
      return {
        success: false,
        sessionToken: args.sessionToken,
        claimToken: null,
        error: error instanceof Error ? error.message : "Unable to complete audit session",
      };
    }
  },
});

// ============================================================================
// CONTEXT FAILURE SIGNALS
// ============================================================================

export const recordPublicMessageContextFailure = internalMutation({
  args: {
    channel: v.union(v.literal("webchat"), v.literal("native_guest")),
    requestId: v.optional(v.string()),
    reason: v.string(),
    error: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    agentId: v.optional(v.id("objects")),
    sessionToken: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionToken = args.sessionToken?.trim();
    const dedupeKey = [
      args.channel,
      args.reason.trim().toLowerCase() || "unknown_reason",
      args.organizationId ? String(args.organizationId) : "org:none",
      args.agentId ? String(args.agentId) : "agent:none",
      sessionToken?.slice(0, 24) || "session:none",
    ].join("|");

    const recentLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(PUBLIC_MESSAGE_CONTEXT_FAILURE_MAX_SCAN);
    const dedupeCutoff = now - PUBLIC_MESSAGE_CONTEXT_FAILURE_DEDUPE_WINDOW_MS;
    const deduped = recentLogs.some((entry) => {
      if (entry.createdAt < dedupeCutoff) {
        return false;
      }
      if (entry.action !== "onboarding.public_message_context_failure") {
        return false;
      }
      const metadata = (entry.metadata || {}) as Record<string, unknown>;
      return metadata.dedupeKey === dedupeKey;
    });

    if (deduped) {
      return { deduped: true };
    }

    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      action: "onboarding.public_message_context_failure",
      resource: "public_message_context",
      resourceId: args.requestId,
      metadata: {
        channel: args.channel,
        reason: args.reason,
        error: args.error,
        agentId: args.agentId ? String(args.agentId) : undefined,
        hasSessionToken: Boolean(sessionToken),
        dedupeKey,
      },
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      success: false,
      errorMessage: args.error,
      createdAt: now,
    });

    return { deduped: false };
  },
});

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Check rate limit for a webchat request
 * Returns an abuse decision with optional challenge requirement.
 */
export const checkRateLimit = internalQuery({
  args: {
    ipAddress: v.string(),
    organizationId: v.id("organizations"),
    channel: v.optional(rateLimitChannelValidator),
    deviceFingerprint: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<AbuseDecision> => {
    // Get organization tier for rate limit
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return { allowed: false };
    }

    const channel = normalizeRateLimitChannel(args.channel);
    const deviceFingerprintHash = normalizeIdentifier(args.deviceFingerprint);
    const normalizedSessionToken = args.sessionToken?.trim() || undefined;
    const messageHash = normalizeMessageHash(args.message);
    const userAgentMissing = !args.userAgent || args.userAgent.trim().length === 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tier = (((org as any).customProperties as Record<string, unknown>)?.tier as string) || org.plan || "free";
    const multiplier = tier === "free" ? 1 : 2;

    const baseQuotas: Record<
      InboundRateLimitChannel,
      {
        softIpPerMinute: number;
        hardIpPerMinute: number;
        burstPerTenSeconds: number;
        softDevicePerMinute: number;
        softSessionPerMinute: number;
        channelPerDay: number;
      }
    > = {
      webchat: {
        softIpPerMinute: 30,
        hardIpPerMinute: 90,
        burstPerTenSeconds: 12,
        softDevicePerMinute: 24,
        softSessionPerMinute: 18,
        channelPerDay: 900,
      },
      native_guest: {
        softIpPerMinute: 45,
        hardIpPerMinute: 120,
        burstPerTenSeconds: 16,
        softDevicePerMinute: 36,
        softSessionPerMinute: 24,
        channelPerDay: 1500,
      },
      telegram: {
        softIpPerMinute: 25,
        hardIpPerMinute: 80,
        burstPerTenSeconds: 10,
        softDevicePerMinute: 25,
        softSessionPerMinute: 25,
        channelPerDay: 1200,
      },
    };

    const channelQuota = baseQuotas[channel];
    const quotas = {
      softIpPerMinute: channelQuota.softIpPerMinute * multiplier,
      hardIpPerMinute: channelQuota.hardIpPerMinute * multiplier,
      burstPerTenSeconds: channelQuota.burstPerTenSeconds * multiplier,
      softDevicePerMinute: channelQuota.softDevicePerMinute * multiplier,
      softSessionPerMinute: channelQuota.softSessionPerMinute * multiplier,
      channelPerDay: channelQuota.channelPerDay * multiplier,
    };

    const now = Date.now();
    const oneMinuteCutoff = now - 60 * 1000;
    const tenSecondCutoff = now - 10 * 1000;
    const oneDayCutoff = now - 24 * 60 * 60 * 1000;

    const ipRecentDay = await ctx.db
      .query("webchatRateLimits")
      .withIndex("by_ip_and_time", (q) =>
        q.eq("ipAddress", args.ipAddress).gt("timestamp", oneDayCutoff)
      )
      .collect();

    const sameChannelEntries = ipRecentDay.filter((entry) => {
      const entryChannel = normalizeRateLimitChannel((entry.channel as InboundRateLimitChannel | undefined) || "webchat");
      return entryChannel === channel;
    });

    const channelMinuteEntries = sameChannelEntries.filter((entry) => entry.timestamp > oneMinuteCutoff);
    const burstEntries = sameChannelEntries.filter((entry) => entry.timestamp > tenSecondCutoff);
    const channelDailyEntries = sameChannelEntries;

    const deviceMinuteEntries = deviceFingerprintHash
      ? await ctx.db
          .query("webchatRateLimits")
          .withIndex("by_device_and_time", (q) =>
            q.eq("deviceFingerprintHash", deviceFingerprintHash).gt("timestamp", oneMinuteCutoff)
          )
          .collect()
      : [];

    const sessionMinuteEntries = normalizedSessionToken
      ? await ctx.db
          .query("webchatRateLimits")
          .withIndex("by_session_and_time", (q) =>
            q.eq("sessionToken", normalizedSessionToken).gt("timestamp", oneMinuteCutoff)
          )
          .collect()
      : [];

    const repeatedMessageCount = messageHash
      ? channelMinuteEntries.filter((entry) => entry.messageHash === messageHash).length
      : 0;

    let riskScore = 0;
    if (userAgentMissing) riskScore += 5;
    if (repeatedMessageCount >= 4) riskScore += 30;
    if (burstEntries.length >= quotas.burstPerTenSeconds) riskScore += 35;
    if (channelMinuteEntries.length >= quotas.softIpPerMinute) riskScore += 20;
    if (deviceMinuteEntries.length >= quotas.softDevicePerMinute) riskScore += 15;
    if (sessionMinuteEntries.length >= quotas.softSessionPerMinute) riskScore += 10;
    if (channelDailyEntries.length >= quotas.channelPerDay) riskScore += 20;

    if (
      channelMinuteEntries.length >= quotas.hardIpPerMinute ||
      burstEntries.length >= quotas.burstPerTenSeconds * 2 ||
      deviceMinuteEntries.length >= quotas.softDevicePerMinute * 2 ||
      channelDailyEntries.length >= quotas.channelPerDay * 2
    ) {
      return {
        allowed: false,
        retryAfterMs:
          calculateRetryAfter(channelMinuteEntries, 60 * 1000) ||
          calculateRetryAfter(burstEntries, 10 * 1000) ||
          calculateRetryAfter(channelDailyEntries, 24 * 60 * 60 * 1000),
        riskScore,
        reason: "velocity_block",
      };
    }

    if (
      channelMinuteEntries.length >= quotas.softIpPerMinute ||
      deviceMinuteEntries.length >= quotas.softDevicePerMinute ||
      sessionMinuteEntries.length >= quotas.softSessionPerMinute ||
      riskScore >= 45
    ) {
      return {
        allowed: true,
        requiresChallenge: true,
        challengeReason:
          repeatedMessageCount >= 4
            ? "repeated_message_pattern"
            : burstEntries.length >= quotas.burstPerTenSeconds
              ? "burst_velocity"
              : "adaptive_throttle",
        challengeType: "proof_of_human",
        retryAfterMs: calculateRetryAfter(channelMinuteEntries, 60 * 1000),
        riskScore,
        reason: "challenge_required",
      };
    }

    return {
      allowed: true,
      riskScore,
      reason: "allowed",
    };
  },
});

/**
 * Verify challenge token for suspicious requests.
 * Supports external verification hook and local bypass token.
 */
export const verifyAbuseChallenge = internalAction({
  args: {
    channel: rateLimitChannelValidator,
    ipAddress: v.string(),
    challengeToken: v.string(),
    requestId: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{
    verified: boolean;
    provider: "none" | "local_bypass" | "external_hook";
    reason?: string;
    score?: number;
  }> => {
    const challengeToken = sanitizeChallengeToken(args.challengeToken);
    if (!challengeToken) {
      return { verified: false, provider: "none", reason: "missing_token" };
    }

    const bypassToken = sanitizeChallengeToken(process.env.ONBOARDING_CHALLENGE_BYPASS_TOKEN);
    if (bypassToken && challengeToken === bypassToken) {
      return { verified: true, provider: "local_bypass", score: 1 };
    }

    const verifyUrl = process.env.ONBOARDING_CHALLENGE_VERIFY_URL;
    if (!verifyUrl) {
      return { verified: false, provider: "none", reason: "challenge_hook_not_configured" };
    }

    try {
      const secret = sanitizeChallengeToken(process.env.ONBOARDING_CHALLENGE_VERIFY_SECRET);
      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({
          token: challengeToken,
          channel: args.channel,
          ipAddress: args.ipAddress,
          requestId: args.requestId,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        verified?: boolean;
        score?: number;
        reason?: string;
      };

      const verified = payload.success === true || payload.verified === true;
      return {
        verified,
        provider: "external_hook",
        score: typeof payload.score === "number" ? payload.score : undefined,
        reason: verified ? undefined : payload.reason || "challenge_verification_failed",
      };
    } catch (error) {
      console.error("[Webchat] Challenge verification hook failed:", error);
      return {
        verified: false,
        provider: "external_hook",
        reason: "challenge_hook_error",
      };
    }
  },
});

/**
 * Record a rate limit entry and suspicious abuse signals.
 */
export const recordRateLimitEntry = internalMutation({
  args: {
    ipAddress: v.string(),
    organizationId: v.id("organizations"),
    channel: v.optional(rateLimitChannelValidator),
    deviceFingerprint: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    message: v.optional(v.string()),
    outcome: v.optional(
      v.union(v.literal("allowed"), v.literal("throttled"), v.literal("blocked"))
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
    shouldLogSignal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const channel = normalizeRateLimitChannel(args.channel);
    const deviceFingerprintHash = normalizeIdentifier(args.deviceFingerprint);
    const sessionToken = args.sessionToken?.trim() || undefined;
    const messageHash = normalizeMessageHash(args.message);
    const userAgentHash = normalizeIdentifier(args.userAgent);
    const timestamp = Date.now();

    await ctx.db.insert("webchatRateLimits", {
      ipAddress: args.ipAddress,
      organizationId: args.organizationId,
      channel,
      deviceFingerprintHash,
      sessionToken,
      messageHash,
      userAgentHash,
      outcome: args.outcome || "allowed",
      challengeState: args.challengeState || "not_required",
      reason: args.reason,
      riskScore: args.riskScore,
      requestId: args.requestId,
      timestamp,
    });

    const shouldLogSignal =
      args.shouldLogSignal === true ||
      args.outcome === "blocked" ||
      args.challengeState === "required" ||
      args.challengeState === "failed" ||
      (typeof args.riskScore === "number" && args.riskScore >= 45) ||
      (typeof args.reason === "string" &&
        (args.reason.includes("pattern") || args.reason.includes("velocity")));

    if (shouldLogSignal) {
      await ctx.db.insert("auditLogs", {
        organizationId: args.organizationId,
        action: "onboarding.abuse.signal",
        resource: "webchatRateLimits",
        resourceId: args.requestId,
        metadata: {
          channel,
          ipAddress: args.ipAddress,
          outcome: args.outcome || "allowed",
          challengeState: args.challengeState || "not_required",
          reason: args.reason,
          riskScore: args.riskScore,
          hasDeviceFingerprint: Boolean(deviceFingerprintHash),
          hasSessionToken: Boolean(sessionToken),
        },
        success: args.outcome !== "blocked",
        createdAt: timestamp,
      });
    }

    // Cleanup old entries (older than 26 hours)
    const cutoff = timestamp - 26 * 60 * 60 * 1000;
    const oldEntries = await ctx.db
      .query("webchatRateLimits")
      .withIndex("by_ip_and_time", (q) =>
        q.eq("ipAddress", args.ipAddress).lt("timestamp", cutoff)
      )
      .collect();
    const staleEntryIds = new Set<string>(oldEntries.map((entry) => String(entry._id)));

    if (deviceFingerprintHash) {
      const oldDeviceEntries = await ctx.db
        .query("webchatRateLimits")
        .withIndex("by_device_and_time", (q) =>
          q.eq("deviceFingerprintHash", deviceFingerprintHash).lt("timestamp", cutoff)
        )
        .collect();
      for (const entry of oldDeviceEntries) {
        staleEntryIds.add(String(entry._id));
      }
    }

    if (sessionToken) {
      const oldSessionEntries = await ctx.db
        .query("webchatRateLimits")
        .withIndex("by_session_and_time", (q) =>
          q.eq("sessionToken", sessionToken).lt("timestamp", cutoff)
        )
        .collect();
      for (const entry of oldSessionEntries) {
        staleEntryIds.add(String(entry._id));
      }
    }

    for (const entryId of staleEntryIds) {
      await ctx.db.delete(entryId as Id<"webchatRateLimits">);
    }
  },
});
