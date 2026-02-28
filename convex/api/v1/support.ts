import { httpAction, internalQuery } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { v } from "convex/values";
import { getCorsHeaders, handleOptionsRequest } from "./corsHeaders";
import { authenticateRequest, requireScopes } from "../../middleware/auth";
import { addRateLimitHeaders, checkRateLimit } from "../../middleware/rateLimit";
import { invalidIdResponse, parseJsonBody, type BodySizePreset, validateConvexId } from "./httpHelpers";
import {
  evaluateSupportEscalationCriteria,
  type SupportEscalationCriteriaInput,
} from "../../ai/conversations";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../_generated/api");

type SupportChatBody = {
  message: string;
  supportSessionKey?: string;
  supportContext?: {
    channel?: "support" | "community";
    product?: string;
    account?: string;
    source?: string;
  };
  escalationSignals?: Partial<SupportEscalationCriteriaInput>;
};

type SupportEscalateBody = {
  agentSessionId: string;
  reason: string;
  urgency?: "low" | "normal" | "high";
  contextSummary?: string;
  force?: boolean;
  escalationSignals?: Partial<SupportEscalationCriteriaInput>;
};

const SUPPORT_CHAT_MAX_MESSAGE_LENGTH = 2400;
const SUPPORT_CHAT_URL_LIMIT = 4;
const SUPPORT_CHAT_REPEAT_CHAR_LIMIT = 16;

export type SupportMessageSafetyDecision = {
  allowed: boolean;
  normalizedMessage: string;
  status: 200 | 400 | 413 | 429;
  reason: "ok" | "empty" | "too_long" | "url_spam" | "repeated_character_spam";
};

function errorResponse(
  message: string,
  status: number,
  origin: string | null,
): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(origin),
      },
    },
  );
}

function successResponse(
  payload: Record<string, unknown>,
  origin: string | null,
  status = 200,
): Response {
  return new Response(
    JSON.stringify({ success: true, ...payload }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(origin),
      },
    },
  );
}

function safeSupportSessionKey(value: unknown): string {
  if (typeof value !== "string") {
    return "default";
  }
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return normalized.length > 0 ? normalized.slice(0, 64) : "default";
}

function normalizeSupportEscalationSignals(
  input: Partial<SupportEscalationCriteriaInput> | undefined,
  fallbackReason?: string,
): SupportEscalationCriteriaInput {
  const reason = typeof fallbackReason === "string" ? fallbackReason.toLowerCase() : "";
  return {
    requestedHuman: input?.requestedHuman ?? /human|person|manager/.test(reason),
    billingDispute: input?.billingDispute ?? /billing|refund|chargeback|charged|invoice/.test(reason),
    accountSecurityRisk:
      input?.accountSecurityRisk ?? /security|breach|locked out|cannot access|can't access/.test(reason),
    legalRisk: input?.legalRisk ?? /legal|compliance|law/.test(reason),
    unresolvedCheckFailures: Math.max(0, Math.floor(input?.unresolvedCheckFailures ?? 0)),
    frustrationSignals: Math.max(0, Math.floor(input?.frustrationSignals ?? 0)),
    unsupportedRequest: input?.unsupportedRequest ?? /outside scope|unsupported|cannot help/.test(reason),
  };
}

function toSupportContextToken(context: SupportChatBody["supportContext"]): string | undefined {
  if (!context) {
    return undefined;
  }
  const channel = context.channel || "support";
  const product = context.product || "unknown";
  const account = context.account || "unknown";
  const source = context.source || "support_api";
  return [channel, product, account, source].join(":");
}

function parseBodyPreset(_request: Request): BodySizePreset {
  return "standard";
}

function sanitizeSupportMessage(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }
  return input.replace(/\u0000/g, "").trim();
}

function countUrls(message: string): number {
  const matches = message.match(/https?:\/\/\S+/gi);
  return matches ? matches.length : 0;
}

function hasRepeatedCharacterSpam(message: string): boolean {
  return /(.)\1{15,}/.test(message);
}

export function evaluateSupportMessageSafety(input: unknown): SupportMessageSafetyDecision {
  const normalizedMessage = sanitizeSupportMessage(input);
  if (!normalizedMessage) {
    return {
      allowed: false,
      normalizedMessage,
      status: 400,
      reason: "empty",
    };
  }

  if (normalizedMessage.length > SUPPORT_CHAT_MAX_MESSAGE_LENGTH) {
    return {
      allowed: false,
      normalizedMessage,
      status: 413,
      reason: "too_long",
    };
  }

  if (countUrls(normalizedMessage) > SUPPORT_CHAT_URL_LIMIT) {
    return {
      allowed: false,
      normalizedMessage,
      status: 429,
      reason: "url_spam",
    };
  }

  if (hasRepeatedCharacterSpam(normalizedMessage)) {
    return {
      allowed: false,
      normalizedMessage,
      status: 429,
      reason: "repeated_character_spam",
    };
  }

  return {
    allowed: true,
    normalizedMessage,
    status: 200,
    reason: "ok",
  };
}

function mapSupportMessageSafetyError(
  reason: SupportMessageSafetyDecision["reason"],
): string {
  if (reason === "empty") {
    return "Field message is required";
  }
  if (reason === "too_long") {
    return "Message exceeds support chat length limit.";
  }
  if (reason === "url_spam") {
    return "Message was blocked by support anti-abuse controls (too many URLs).";
  }
  if (reason === "repeated_character_spam") {
    return "Message was blocked by support anti-abuse controls (spam pattern).";
  }
  return "Message was blocked by support anti-abuse controls.";
}

function extractClientIpAddress(request: Request): string | null {
  const direct = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip");
  if (direct) {
    return direct.trim();
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) {
    return null;
  }

  const first = forwarded.split(",")[0]?.trim();
  return first || null;
}

export const getSupportEscalationRoleGateInternal = internalQuery({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return {
        isSuperAdmin: false,
        isOrganizationOwner: false,
      };
    }

    let isSuperAdmin = false;
    if (user.global_role_id) {
      const globalRole = await ctx.db.get(user.global_role_id);
      isSuperAdmin = Boolean(globalRole?.name === "super_admin");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    let isOrganizationOwner = false;
    if (membership) {
      const membershipRole = await ctx.db.get(membership.role);
      isOrganizationOwner = Boolean(membershipRole?.name === "org_owner");
    }

    return {
      isSuperAdmin,
      isOrganizationOwner,
    };
  },
});

export const handleOptions = httpAction(async (_ctx, request) => {
  const origin = request.headers.get("origin");
  return handleOptionsRequest(origin);
});

/**
 * POST /api/support/chat
 * Send an authenticated support message through agent runtime.
 */
export const postSupportChat = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const authResult = await authenticateRequest(ctx, request);
  if (!authResult.success) {
    return errorResponse(authResult.error, authResult.status, origin);
  }
  const scopeCheck = requireScopes(authResult.context, ["conversations:write"]);
  if (!scopeCheck.success) {
    return errorResponse(scopeCheck.error, scopeCheck.status, origin);
  }

  let body: SupportChatBody;
  try {
    body = await parseJsonBody<SupportChatBody>(request, parseBodyPreset(request));
  } catch (error) {
    const statusCode =
      error instanceof Error && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : 400;
    const message = error instanceof Error ? error.message : "Invalid request body";
    return errorResponse(message, statusCode || 400, origin);
  }

  const messageSafety = evaluateSupportMessageSafety(body.message);
  if (!messageSafety.allowed) {
    return errorResponse(
      mapSupportMessageSafetyError(messageSafety.reason),
      messageSafety.status,
      origin,
    );
  }

  const message = messageSafety.normalizedMessage;

  const supportSessionKey = safeSupportSessionKey(body.supportSessionKey);
  const userRateLimitResult = await checkRateLimit(
    ctx as any,
    `support_chat:user:${authResult.context.userId}`,
    "user",
    "free",
  );
  if (!userRateLimitResult.allowed) {
    const response = errorResponse(
      "Too many support messages. Please retry later.",
      429,
      origin,
    );
    return addRateLimitHeaders(response, userRateLimitResult);
  }

  const sessionRateLimitResult = await checkRateLimit(
    ctx as any,
    `support_chat:session:${authResult.context.userId}:${supportSessionKey}`,
    "user",
    "free",
  );
  if (!sessionRateLimitResult.allowed) {
    const response = errorResponse(
      "Support session is receiving messages too quickly. Please retry shortly.",
      429,
      origin,
    );
    return addRateLimitHeaders(response, sessionRateLimitResult);
  }

  let headerRateLimitResult = sessionRateLimitResult;
  const clientIp = extractClientIpAddress(request);
  if (clientIp) {
    const ipRateLimitResult = await checkRateLimit(
      ctx as any,
      `support_chat:ip:${clientIp}`,
      "ip",
      "free",
    );
    if (!ipRateLimitResult.allowed) {
      const response = errorResponse(
        "Support channel is temporarily throttled for this network. Please retry shortly.",
        429,
        origin,
      );
      return addRateLimitHeaders(response, ipRateLimitResult);
    }
    headerRateLimitResult = ipRateLimitResult;
  }

  const supportContextToken = toSupportContextToken(body.supportContext);
  const escalationSignals = normalizeSupportEscalationSignals(
    body.escalationSignals,
    message,
  );
  const escalationDecision = evaluateSupportEscalationCriteria(escalationSignals);

  try {
    const runtimeResult = await (ctx as any).runAction(
      generatedApi.internal.ai.agentExecution.processInboundMessage,
      {
        organizationId: authResult.context.organizationId,
        channel: "desktop",
        externalContactIdentifier: `support:${authResult.context.userId}:${supportSessionKey}`,
        message,
        metadata: {
          source: "support_api",
          intent: "support_intake",
          workflowIntent: "support_intake",
          supportSessionKey,
          supportContext: supportContextToken,
          selectedProduct: body.supportContext?.product,
          selectedAccount: body.supportContext?.account,
          intakeChannel: body.supportContext?.channel || "support",
          entrySource: body.supportContext?.source || "support_api",
          escalationSignals,
          escalationDecision,
          abuseFilter: {
            passed: true,
            rule: messageSafety.reason,
          },
        },
      },
    ) as {
      status?: string;
      message?: string;
      response?: string;
      sessionId?: string;
      turnId?: string;
      waitpoint?: Record<string, unknown>;
      toolResults?: Array<{ tool: string; status: string; result?: unknown; error?: string }>;
    };

    const response = successResponse(
      {
        status: runtimeResult.status || "ok",
        supportSessionKey,
        agentSessionId: runtimeResult.sessionId,
        turnId: runtimeResult.turnId,
        response: runtimeResult.response ?? runtimeResult.message ?? "",
        toolResults: runtimeResult.toolResults ?? [],
        waitpoint: runtimeResult.waitpoint,
        escalationDecision,
      },
      origin,
      201,
    );
    return addRateLimitHeaders(response, headerRateLimitResult);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Failed to process support message";
    const response = errorResponse(messageText, 500, origin);
    return addRateLimitHeaders(response, headerRateLimitResult);
  }
});

/**
 * GET /api/support/chat/:sessionId
 * Fetch support session detail, messages, and escalation/ticket references.
 */
export const getSupportChatSession = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const authResult = await authenticateRequest(ctx, request);
  if (!authResult.success) {
    return errorResponse(authResult.error, authResult.status, origin);
  }
  const scopeCheck = requireScopes(authResult.context, ["conversations:read"]);
  if (!scopeCheck.success) {
    return errorResponse(scopeCheck.error, scopeCheck.status, origin);
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const sessionIdRaw = pathParts[pathParts.length - 1];
  const agentSessionId = validateConvexId(sessionIdRaw, "agentSessions");
  if (!agentSessionId) {
    return invalidIdResponse("sessionId", getCorsHeaders(origin));
  }

  const session = await (ctx as any).runQuery(
    generatedApi.internal.api.v1.conversationsInternal.getConversationInternal,
    {
      organizationId: authResult.context.organizationId,
      sessionId: agentSessionId,
    },
  ) as {
    id: Id<"agentSessions">;
    agentId: Id<"objects">;
    status: string;
    channel: string;
    externalContactIdentifier: string;
    messageCount: number;
    startedAt: number;
    lastMessageAt: number;
    escalationState?: Record<string, unknown>;
  } | null;
  if (!session) {
    return errorResponse("Support session not found", 404, origin);
  }

  const messages = await (ctx as any).runQuery(
    generatedApi.internal.api.v1.conversationsInternal.getConversationMessagesInternal,
    {
      organizationId: authResult.context.organizationId,
      sessionId: agentSessionId,
      limit: 200,
      offset: 0,
    },
  ) as {
    messages?: Array<{
      id: Id<"agentSessionMessages">;
      role: string;
      content: string;
      timestamp: number;
      toolCalls?: unknown[];
    }>;
    total?: number;
  } | null;

  const escalationState = session.escalationState || null;
  const supportTicketId = escalationState?.supportTicketId as Id<"objects"> | undefined;
  const supportTicket = supportTicketId
    ? await (ctx as any).runQuery(
        generatedApi.internal.ticketOntology.getTicketInternal,
        { ticketId: supportTicketId },
      )
    : null;

  return successResponse(
    {
      session: {
        id: session.id,
        status: session.status,
        channel: session.channel,
        externalContactIdentifier: session.externalContactIdentifier,
        messageCount: session.messageCount,
        startedAt: session.startedAt,
        lastMessageAt: session.lastMessageAt,
      },
      escalationState,
      supportTicket: supportTicket
        ? {
            id: supportTicket._id,
            name: supportTicket.name,
            status: supportTicket.status,
            ticketNumber:
              (supportTicket.customProperties as { ticketNumber?: string } | undefined)
                ?.ticketNumber ?? escalationState?.supportTicketNumber,
            createdAt: supportTicket.createdAt,
            updatedAt: supportTicket.updatedAt,
          }
        : null,
      messages: messages?.messages || [],
      totalMessages: messages?.total ?? 0,
    },
    origin,
  );
});

/**
 * POST /api/support/escalate
 * Deterministically escalate an existing support session and return ticket reference.
 */
export const postSupportEscalate = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const authResult = await authenticateRequest(ctx, request);
  if (!authResult.success) {
    return errorResponse(authResult.error, authResult.status, origin);
  }
  const scopeCheck = requireScopes(authResult.context, ["conversations:write"]);
  if (!scopeCheck.success) {
    return errorResponse(scopeCheck.error, scopeCheck.status, origin);
  }

  const escalationRateLimitResult = await checkRateLimit(
    ctx as any,
    `support_escalate:user:${authResult.context.userId}`,
    "user",
    "free",
  );
  if (!escalationRateLimitResult.allowed) {
    const response = errorResponse(
      "Too many escalation requests. Please retry later.",
      429,
      origin,
    );
    return addRateLimitHeaders(response, escalationRateLimitResult);
  }

  let body: SupportEscalateBody;
  try {
    body = await parseJsonBody<SupportEscalateBody>(request, parseBodyPreset(request));
  } catch (error) {
    const statusCode =
      error instanceof Error && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : 400;
    const message = error instanceof Error ? error.message : "Invalid request body";
    return errorResponse(message, statusCode || 400, origin);
  }

  if (!body.agentSessionId || typeof body.agentSessionId !== "string") {
    return errorResponse("Field agentSessionId is required", 400, origin);
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return errorResponse("Field reason is required", 400, origin);
  }

  const agentSessionId = validateConvexId(body.agentSessionId, "agentSessions");
  if (!agentSessionId) {
    return invalidIdResponse("agentSessionId", getCorsHeaders(origin));
  }

  const session = await (ctx as any).runQuery(
    generatedApi.internal.api.v1.conversationsInternal.getConversationInternal,
    {
      organizationId: authResult.context.organizationId,
      sessionId: agentSessionId,
    },
  ) as {
    id: Id<"agentSessions">;
    agentId: Id<"objects">;
    status: string;
    channel: string;
    externalContactIdentifier: string;
  } | null;
  if (!session) {
    return errorResponse("Support session not found", 404, origin);
  }

  const escalationSignals = normalizeSupportEscalationSignals(
    body.escalationSignals,
    reason,
  );
  const escalationDecision = evaluateSupportEscalationCriteria(escalationSignals);
  const urgency = body.urgency || escalationDecision.urgency || "normal";

  const roleGate = await (ctx as any).runQuery(
    generatedApi.internal.api.v1.support.getSupportEscalationRoleGateInternal,
    {
      userId: authResult.context.userId,
      organizationId: authResult.context.organizationId,
    },
  ) as {
    isSuperAdmin: boolean;
    isOrganizationOwner: boolean;
  };

  if (body.force && !roleGate.isSuperAdmin) {
    const response = errorResponse(
      "Force escalation requires super-admin access.",
      403,
      origin,
    );
    return addRateLimitHeaders(response, escalationRateLimitResult);
  }

  if (urgency === "high" && !roleGate.isSuperAdmin && !roleGate.isOrganizationOwner) {
    const response = errorResponse(
      "High-urgency escalation requires organization-owner or super-admin access.",
      403,
      origin,
    );
    return addRateLimitHeaders(response, escalationRateLimitResult);
  }

  if (!body.force && !escalationDecision.shouldEscalate) {
    const response = errorResponse(
      "Deterministic escalation criteria were not met. Provide escalation signals or set force=true.",
      409,
      origin,
    );
    return addRateLimitHeaders(response, escalationRateLimitResult);
  }

  const triggerType = escalationDecision.matchedCriteria[0] || "manual_support_escalation";

  await (ctx as any).runMutation(generatedApi.internal.ai.escalation.createEscalation, {
    sessionId: agentSessionId,
    agentId: session.agentId,
    organizationId: authResult.context.organizationId,
    reason,
    urgency,
    triggerType,
  });

  const escalationState = await (ctx as any).runQuery(
    generatedApi.internal.ai.escalation.getSessionEscalationState,
    {
      sessionId: agentSessionId,
    },
  );
  const supportTicketId = escalationState?.supportTicketId as Id<"objects"> | undefined;
  const supportTicket = supportTicketId
    ? await (ctx as any).runQuery(
        generatedApi.internal.ticketOntology.getTicketInternal,
        { ticketId: supportTicketId },
      )
    : null;

  const agent = await (ctx as any).runQuery(
    generatedApi.internal.agentOntology.getAgentInternal,
    {
      agentId: session.agentId,
    },
  );
  const agentName =
    (agent?.customProperties as { displayName?: string } | undefined)?.displayName
    || agent?.name
    || "Agent";

  const notifyPayload = {
    organizationId: authResult.context.organizationId,
    agentName,
    reason,
    urgency,
    contactIdentifier: session.externalContactIdentifier,
    channel: session.channel,
    lastMessage: body.contextSummary || reason,
  };

  (ctx as any).scheduler.runAfter(0, generatedApi.internal.ai.escalation.notifyEscalationTelegram, {
    sessionId: agentSessionId,
    ...notifyPayload,
  });
  (ctx as any).scheduler.runAfter(0, generatedApi.internal.ai.escalation.notifyEscalationPushover, notifyPayload);
  (ctx as any).scheduler.runAfter(0, generatedApi.internal.ai.escalation.notifyEscalationEmail, notifyPayload);

  const response = successResponse(
    {
      agentSessionId,
      escalationState,
      escalationDecision,
      supportTicket: supportTicket
        ? {
            id: supportTicket._id,
            status: supportTicket.status,
            ticketNumber:
              (supportTicket.customProperties as { ticketNumber?: string } | undefined)
                ?.ticketNumber ?? escalationState?.supportTicketNumber,
            createdAt: supportTicket.createdAt,
          }
        : null,
    },
    origin,
    201,
  );
  return addRateLimitHeaders(response, escalationRateLimitResult);
});
