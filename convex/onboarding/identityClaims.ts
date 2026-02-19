/**
 * IDENTITY CLAIMS
 *
 * Signed, one-time identity claim tokens used to link:
 * - anonymous webchat/native_guest sessions -> authenticated user/org context
 * - Telegram-first onboarding orgs -> authenticated user/org ownership
 *
 * Requirements:
 * - Idempotent consume operations
 * - Auditable issuance/consume events
 * - Tamper-resistant signed payloads
 */

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const generatedApi: any = require("../_generated/api");

const guestChannelValidator = v.union(v.literal("webchat"), v.literal("native_guest"));

type ClaimChannel = "webchat" | "native_guest" | "telegram";
type ClaimTokenType = "guest_session_claim" | "telegram_org_claim";

type ClaimTokenPayload = {
  v: 1;
  tokenId: string;
  tokenType: ClaimTokenType;
  channel: ClaimChannel;
  organizationId: string;
  sessionToken?: string;
  telegramChatId?: string;
  iat: number;
  exp: number;
};

const GUEST_CLAIM_TTL_MS = 24 * 60 * 60 * 1000;
const TELEGRAM_CLAIM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let warnedFallbackSecret = false;

function getClaimTokenSecret(): string {
  const configured =
    process.env.ANONYMOUS_CLAIM_TOKEN_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET;

  if (configured && configured.length > 0) {
    return configured;
  }

  if (!warnedFallbackSecret) {
    warnedFallbackSecret = true;
    console.warn(
      "[identityClaims] ANONYMOUS_CLAIM_TOKEN_SECRET not set; using deterministic fallback secret. Set a strong secret in production."
    );
  }

  return `fallback-anon-claim-${process.env.PLATFORM_ORG_ID || process.env.TEST_ORG_ID || "local-dev"}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  if (typeof btoa === "function") {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  throw new Error("Base64 encoding is not available in this runtime");
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }

  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  throw new Error("Base64 decoding is not available in this runtime");
}

function encodeBase64Url(input: string): string {
  return toBase64UrlFromBytes(new TextEncoder().encode(input));
}

function decodeBase64Url(input: string): string {
  return new TextDecoder().decode(fromBase64UrlToBytes(input));
}

function toBase64UrlFromBytes(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return base64ToBytes(padded);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

async function signInput(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(getClaimTokenSecret());
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
  return toBase64UrlFromBytes(new Uint8Array(signature));
}

async function verifySignature(input: string, signature: string): Promise<boolean> {
  try {
    const expected = fromBase64UrlToBytes(await signInput(input));
    const provided = fromBase64UrlToBytes(signature);
    return timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}

async function createSignedClaimToken(payload: ClaimTokenPayload): Promise<string> {
  const payloadSegment = encodeBase64Url(JSON.stringify(payload));
  const signature = await signInput(payloadSegment);
  return `${payloadSegment}.${signature}`;
}

async function decodeAndVerifyClaimToken(
  signedToken: string
): Promise<{ payload: ClaimTokenPayload } | null> {
  const [payloadSegment, signature] = signedToken.split(".");
  if (!payloadSegment || !signature) {
    return null;
  }

  const signatureOk = await verifySignature(payloadSegment, signature);
  if (!signatureOk) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(payloadSegment)) as ClaimTokenPayload;
    if (payload.v !== 1) {
      return null;
    }
    if (!payload.tokenId || !payload.tokenType || !payload.channel || !payload.organizationId) {
      return null;
    }
    return { payload };
  } catch {
    return null;
  }
}

function sessionIdentityKey(channel: "webchat" | "native_guest", sessionToken: string): string {
  return `${channel}:${sessionToken}`;
}

function telegramIdentityKey(telegramChatId: string): string {
  return `telegram:${telegramChatId}`;
}

async function ensureOrgOwnerRoleId(ctx: any): Promise<Id<"roles">> {
  let ownerRole = await ctx.db
    .query("roles")
    .filter((q: any) => q.eq(q.field("name"), "org_owner"))
    .first();

  if (!ownerRole) {
    const ownerRoleId = await ctx.db.insert("roles", {
      name: "org_owner",
      description: "Organization owner with full permissions",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    ownerRole = await ctx.db.get(ownerRoleId);
  }

  return ownerRole._id as Id<"roles">;
}

async function upsertGuestLedgerEntry(
  ctx: any,
  args: {
    sessionToken: string;
    organizationId: Id<"organizations">;
    agentId: Id<"objects">;
    channel: "webchat" | "native_guest";
    visitorInfo?: { name?: string; email?: string; phone?: string };
    agentSessionId?: Id<"agentSessions">;
  }
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("anonymousIdentityLedger")
    .withIndex("by_session_token", (q: any) => q.eq("sessionToken", args.sessionToken))
    .first();

  if (!existing) {
    const ledgerEntryId = await ctx.db.insert("anonymousIdentityLedger", {
      identityKey: sessionIdentityKey(args.channel, args.sessionToken),
      channel: args.channel,
      organizationId: args.organizationId,
      agentId: args.agentId,
      sessionToken: args.sessionToken,
      agentSessionId: args.agentSessionId,
      visitorInfo: args.visitorInfo,
      claimStatus: "unclaimed",
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    });
    return { ledgerEntryId, existing: null };
  }

  const updates: Record<string, unknown> = {
    organizationId: args.organizationId,
    agentId: args.agentId,
    updatedAt: now,
    lastActivityAt: now,
  };

  if (args.agentSessionId) {
    updates.agentSessionId = args.agentSessionId;
  }

  if (args.visitorInfo) {
    updates.visitorInfo = {
      ...(existing.visitorInfo || {}),
      ...args.visitorInfo,
    };
  }

  await ctx.db.patch(existing._id, updates);
  return { ledgerEntryId: existing._id, existing };
}

async function upsertTelegramLedgerEntry(
  ctx: any,
  args: {
    telegramChatId: string;
    organizationId: Id<"organizations">;
  }
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("anonymousIdentityLedger")
    .withIndex("by_telegram_chat", (q: any) => q.eq("telegramChatId", args.telegramChatId))
    .first();

  if (!existing) {
    const ledgerEntryId = await ctx.db.insert("anonymousIdentityLedger", {
      identityKey: telegramIdentityKey(args.telegramChatId),
      channel: "telegram",
      organizationId: args.organizationId,
      telegramChatId: args.telegramChatId,
      claimStatus: "unclaimed",
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    });
    return { ledgerEntryId, existing: null };
  }

  await ctx.db.patch(existing._id, {
    organizationId: args.organizationId,
    updatedAt: now,
    lastActivityAt: now,
  });

  return { ledgerEntryId: existing._id, existing };
}

async function writeAuditLog(
  ctx: any,
  args: {
    organizationId?: Id<"organizations">;
    userId?: Id<"users">;
    action: string;
    resource: string;
    resourceId?: string;
    success: boolean;
    metadata?: Record<string, unknown>;
    errorMessage?: string;
  }
) {
  await ctx.db.insert("auditLogs", {
    organizationId: args.organizationId,
    userId: args.userId,
    action: args.action,
    resource: args.resource,
    resourceId: args.resourceId,
    metadata: args.metadata,
    success: args.success,
    errorMessage: args.errorMessage,
    createdAt: Date.now(),
  });
}

export const syncGuestSessionLedger = internalMutation({
  args: {
    sessionToken: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    channel: guestChannelValidator,
    visitorInfo: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
    agentSessionId: v.optional(v.id("agentSessions")),
  },
  handler: async (ctx, args) => {
    const result = await upsertGuestLedgerEntry(ctx, args);
    return {
      ledgerEntryId: result.ledgerEntryId,
      isClaimed: result.existing?.claimStatus === "claimed",
    };
  },
});

export const syncTelegramIdentityLedger = internalMutation({
  args: {
    telegramChatId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const result = await upsertTelegramLedgerEntry(ctx, args);
    return { ledgerEntryId: result.ledgerEntryId };
  },
});

export const issueGuestSessionClaimToken = internalMutation({
  args: {
    sessionToken: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    channel: guestChannelValidator,
    attribution: v.optional(
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
    visitorInfo: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args): Promise<{
    claimToken: string | null;
    tokenId?: string;
    expiresAt?: number;
    alreadyClaimed?: boolean;
  }> => {
    const session = await ctx.db
      .query("webchatSessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session || String(session.organizationId) !== String(args.organizationId)) {
      return { claimToken: null };
    }

    if (session.claimedByUserId) {
      return { claimToken: null, alreadyClaimed: true };
    }

    const now = Date.now();
    const { ledgerEntryId } = await upsertGuestLedgerEntry(ctx, {
      sessionToken: args.sessionToken,
      organizationId: args.organizationId,
      agentId: args.agentId,
      channel: args.channel,
      visitorInfo: args.visitorInfo || session.visitorInfo,
      agentSessionId: session.agentSessionId,
    });

    const tokenId = crypto.randomUUID();
    const expiresAt = now + GUEST_CLAIM_TTL_MS;
    const payload: ClaimTokenPayload = {
      v: 1,
      tokenId,
      tokenType: "guest_session_claim",
      channel: args.channel,
      organizationId: String(args.organizationId),
      sessionToken: args.sessionToken,
      iat: now,
      exp: expiresAt,
    };

    const signedToken = await createSignedClaimToken(payload);

    await ctx.db.insert("anonymousClaimTokens", {
      tokenId,
      tokenType: "guest_session_claim",
      channel: args.channel,
      status: "issued",
      organizationId: args.organizationId,
      sessionToken: args.sessionToken,
      ledgerEntryId,
      signedToken,
      issuedBy: "webchat_api",
      issuedAt: now,
      expiresAt,
      metadata: {
        agentId: args.agentId,
        campaign: args.attribution,
      },
    });

    await ctx.db.patch(ledgerEntryId, {
      lastClaimTokenId: tokenId,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      organizationId: args.organizationId,
      action: "onboarding.identity_claim_token.issued",
      resource: "anonymousClaimTokens",
      resourceId: tokenId,
      success: true,
      metadata: {
        tokenType: "guest_session_claim",
        channel: args.channel,
        sessionToken: args.sessionToken,
        expiresAt,
      },
    });

    return {
      claimToken: signedToken,
      tokenId,
      expiresAt,
    };
  },
});

export const issueTelegramOrgClaimToken = internalMutation({
  args: {
    telegramChatId: v.string(),
    organizationId: v.id("organizations"),
    issuedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { ledgerEntryId } = await upsertTelegramLedgerEntry(ctx, {
      telegramChatId: args.telegramChatId,
      organizationId: args.organizationId,
    });

    const tokenId = crypto.randomUUID();
    const expiresAt = now + TELEGRAM_CLAIM_TTL_MS;
    const payload: ClaimTokenPayload = {
      v: 1,
      tokenId,
      tokenType: "telegram_org_claim",
      channel: "telegram",
      organizationId: String(args.organizationId),
      telegramChatId: args.telegramChatId,
      iat: now,
      exp: expiresAt,
    };

    const signedToken = await createSignedClaimToken(payload);

    await ctx.db.insert("anonymousClaimTokens", {
      tokenId,
      tokenType: "telegram_org_claim",
      channel: "telegram",
      status: "issued",
      organizationId: args.organizationId,
      telegramChatId: args.telegramChatId,
      ledgerEntryId,
      signedToken,
      issuedBy: args.issuedBy || "telegram_onboarding",
      issuedAt: now,
      expiresAt,
      metadata: {
        telegramChatId: args.telegramChatId,
      },
    });

    await ctx.db.patch(ledgerEntryId, {
      lastClaimTokenId: tokenId,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      organizationId: args.organizationId,
      action: "onboarding.identity_claim_token.issued",
      resource: "anonymousClaimTokens",
      resourceId: tokenId,
      success: true,
      metadata: {
        tokenType: "telegram_org_claim",
        channel: "telegram",
        telegramChatId: args.telegramChatId,
        expiresAt,
      },
    });

    return {
      claimToken: signedToken,
      tokenId,
      expiresAt,
    };
  },
});

export const inspectIdentityClaimToken = internalAction({
  args: {
    signedToken: v.string(),
  },
  handler: async (ctx, args): Promise<{
    valid: boolean;
    reason?: string;
    tokenType?: ClaimTokenType;
    channel?: ClaimChannel;
    organizationId?: Id<"organizations">;
    tokenId?: string;
    sessionToken?: string;
    telegramChatId?: string;
    expiresAt?: number;
  }> => {
    const decoded = await decodeAndVerifyClaimToken(args.signedToken);
    if (!decoded) {
      return { valid: false, reason: "invalid_signature" };
    }

    const { payload } = decoded;
    const tokenRecord = await ctx.runQuery(
      generatedApi.internal.onboarding.identityClaims.getClaimTokenById,
      { tokenId: payload.tokenId }
    );

    if (!tokenRecord) {
      return { valid: false, reason: "token_not_found" };
    }

    if (tokenRecord.status !== "issued") {
      return { valid: false, reason: `token_${tokenRecord.status}` };
    }

    if (payload.exp < Date.now() || tokenRecord.expiresAt < Date.now()) {
      return { valid: false, reason: "token_expired" };
    }

    if (String(tokenRecord.organizationId) !== payload.organizationId) {
      return { valid: false, reason: "organization_mismatch" };
    }

    return {
      valid: true,
      tokenType: payload.tokenType,
      channel: payload.channel,
      organizationId: tokenRecord.organizationId,
      tokenId: payload.tokenId,
      sessionToken: payload.sessionToken,
      telegramChatId: payload.telegramChatId,
      expiresAt: tokenRecord.expiresAt,
    };
  },
});

export const getClaimTokenById = internalQuery({
  args: {
    tokenId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("anonymousClaimTokens")
      .withIndex("by_token_id", (q) => q.eq("tokenId", args.tokenId))
      .first();
  },
});

export const consumeIdentityClaimToken = internalMutation({
  args: {
    signedToken: v.string(),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    claimSource: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    alreadyClaimed?: boolean;
    tokenType?: ClaimTokenType;
    linkedOrganizationId?: Id<"organizations">;
    linkedSessionToken?: string;
    errorCode?: string;
  }> => {
    const decoded = await decodeAndVerifyClaimToken(args.signedToken);
    if (!decoded) {
      return { success: false, errorCode: "invalid_signature" };
    }

    const now = Date.now();
    const payload = decoded.payload;

    const tokenRecord = await ctx.db
      .query("anonymousClaimTokens")
      .withIndex("by_token_id", (q) => q.eq("tokenId", payload.tokenId))
      .first();

    if (!tokenRecord) {
      return { success: false, errorCode: "token_not_found" };
    }

    if (tokenRecord.status === "consumed") {
      if (
        tokenRecord.consumedByUserId &&
        String(tokenRecord.consumedByUserId) === String(args.userId)
      ) {
        return {
          success: true,
          alreadyClaimed: true,
          tokenType: tokenRecord.tokenType as ClaimTokenType,
          linkedOrganizationId: tokenRecord.organizationId,
          linkedSessionToken: tokenRecord.sessionToken,
        };
      }
      return { success: false, errorCode: "token_already_consumed" };
    }

    if (tokenRecord.status !== "issued") {
      return { success: false, errorCode: `token_${tokenRecord.status}` };
    }

    if (String(tokenRecord.organizationId) !== payload.organizationId) {
      return { success: false, errorCode: "organization_mismatch" };
    }

    if (payload.exp < now || tokenRecord.expiresAt < now) {
      await ctx.db.patch(tokenRecord._id, { status: "expired" });
      return { success: false, errorCode: "token_expired" };
    }

    let linkedOrganizationId = tokenRecord.organizationId as Id<"organizations">;
    let linkedSessionToken: string | undefined = undefined;
    let alreadyClaimed = false;

    if (tokenRecord.tokenType === "guest_session_claim") {
      const sessionToken = payload.sessionToken || tokenRecord.sessionToken;
      if (!sessionToken) {
        return { success: false, errorCode: "missing_session_token" };
      }

      const webchatSession = await ctx.db
        .query("webchatSessions")
        .withIndex("by_session_token", (q) => q.eq("sessionToken", sessionToken))
        .first();

      if (!webchatSession) {
        return { success: false, errorCode: "session_not_found" };
      }

      if (String(webchatSession.organizationId) !== String(tokenRecord.organizationId)) {
        return { success: false, errorCode: "session_org_mismatch" };
      }

      if (webchatSession.claimedByUserId) {
        if (String(webchatSession.claimedByUserId) !== String(args.userId)) {
          await writeAuditLog(ctx, {
            organizationId: tokenRecord.organizationId,
            userId: args.userId,
            action: "onboarding.identity_claim_token.consume",
            resource: "anonymousClaimTokens",
            resourceId: tokenRecord.tokenId,
            success: false,
            errorMessage: "session_already_claimed",
            metadata: {
              tokenType: tokenRecord.tokenType,
              claimSource: args.claimSource,
              sessionToken,
            },
          });
          return { success: false, errorCode: "session_already_claimed" };
        }
        alreadyClaimed = true;
      } else {
        await ctx.db.patch(webchatSession._id, {
          claimedByUserId: args.userId,
          claimedOrganizationId: args.organizationId,
          claimedAt: now,
        });
      }

      const ledgerEntry = await ctx.db
        .query("anonymousIdentityLedger")
        .withIndex("by_session_token", (q) => q.eq("sessionToken", sessionToken))
        .first();

      if (ledgerEntry) {
        if (ledgerEntry.claimedByUserId && String(ledgerEntry.claimedByUserId) !== String(args.userId)) {
          return { success: false, errorCode: "ledger_claim_conflict" };
        }
        await ctx.db.patch(ledgerEntry._id, {
          claimStatus: "claimed",
          claimedByUserId: args.userId,
          claimedOrganizationId: args.organizationId,
          claimedAt: ledgerEntry.claimedAt || now,
          lastClaimTokenId: tokenRecord.tokenId,
          updatedAt: now,
          lastActivityAt: now,
        });
      } else {
        await ctx.db.insert("anonymousIdentityLedger", {
          identityKey: sessionIdentityKey(
            (tokenRecord.channel as "webchat" | "native_guest") || "webchat",
            sessionToken
          ),
          channel: tokenRecord.channel,
          organizationId: tokenRecord.organizationId,
          agentId: webchatSession.agentId,
          sessionToken,
          agentSessionId: webchatSession.agentSessionId,
          visitorInfo: webchatSession.visitorInfo,
          claimStatus: "claimed",
          claimedByUserId: args.userId,
          claimedOrganizationId: args.organizationId,
          claimedAt: now,
          lastClaimTokenId: tokenRecord.tokenId,
          createdAt: now,
          updatedAt: now,
          lastActivityAt: now,
        });
      }

      linkedSessionToken = sessionToken;
      linkedOrganizationId = tokenRecord.organizationId;
    } else if (tokenRecord.tokenType === "telegram_org_claim") {
      const telegramChatId = payload.telegramChatId || tokenRecord.telegramChatId;

      const orgOwnerRoleId = await ensureOrgOwnerRoleId(ctx);
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", args.userId).eq("organizationId", tokenRecord.organizationId)
        )
        .first();

      if (!membership) {
        await ctx.db.insert("organizationMembers", {
          userId: args.userId,
          organizationId: tokenRecord.organizationId,
          role: orgOwnerRoleId,
          isActive: true,
          joinedAt: now,
          acceptedAt: now,
          invitedBy: args.userId,
        });
      } else if (!membership.isActive) {
        await ctx.db.patch(membership._id, {
          isActive: true,
          acceptedAt: membership.acceptedAt || now,
        });
      } else {
        alreadyClaimed = true;
      }

      const user = await ctx.db.get(args.userId);
      if (user && !user.defaultOrgId) {
        await ctx.db.patch(args.userId, {
          defaultOrgId: tokenRecord.organizationId,
          updatedAt: now,
        });
      }

      if (telegramChatId) {
        const mapping = await ctx.db
          .query("telegramMappings")
          .withIndex("by_chat_id", (q) => q.eq("telegramChatId", telegramChatId))
          .first();
        if (mapping) {
          await ctx.db.patch(mapping._id, {
            organizationId: tokenRecord.organizationId,
            status: "active",
            userId: args.userId,
          });
        }
      }

      const ledgerEntry = telegramChatId
        ? await ctx.db
            .query("anonymousIdentityLedger")
            .withIndex("by_telegram_chat", (q) => q.eq("telegramChatId", telegramChatId))
            .first()
        : null;

      if (ledgerEntry) {
        if (ledgerEntry.claimedByUserId && String(ledgerEntry.claimedByUserId) !== String(args.userId)) {
          return { success: false, errorCode: "ledger_claim_conflict" };
        }
        await ctx.db.patch(ledgerEntry._id, {
          claimStatus: "claimed",
          claimedByUserId: args.userId,
          claimedOrganizationId: tokenRecord.organizationId,
          claimedAt: ledgerEntry.claimedAt || now,
          lastClaimTokenId: tokenRecord.tokenId,
          updatedAt: now,
          lastActivityAt: now,
        });
      } else if (telegramChatId) {
        await ctx.db.insert("anonymousIdentityLedger", {
          identityKey: telegramIdentityKey(telegramChatId),
          channel: "telegram",
          organizationId: tokenRecord.organizationId,
          telegramChatId,
          claimStatus: "claimed",
          claimedByUserId: args.userId,
          claimedOrganizationId: tokenRecord.organizationId,
          claimedAt: now,
          lastClaimTokenId: tokenRecord.tokenId,
          createdAt: now,
          updatedAt: now,
          lastActivityAt: now,
        });
      }

      linkedOrganizationId = tokenRecord.organizationId;
    } else {
      return { success: false, errorCode: "unsupported_token_type" };
    }

    await ctx.db.patch(tokenRecord._id, {
      status: "consumed",
      consumedAt: now,
      consumedByUserId: args.userId,
      consumedByOrganizationId: linkedOrganizationId,
    });

    await writeAuditLog(ctx, {
      organizationId: linkedOrganizationId,
      userId: args.userId,
      action: "onboarding.identity_claim_token.consume",
      resource: "anonymousClaimTokens",
      resourceId: tokenRecord.tokenId,
      success: true,
      metadata: {
        tokenType: tokenRecord.tokenType,
        channel: tokenRecord.channel,
        claimSource: args.claimSource,
        linkedSessionToken,
        alreadyClaimed,
      },
    });

    try {
      await ctx.runMutation(generatedApi.internal.onboarding.funnelEvents.emitFunnelEvent, {
        eventName: "onboarding.funnel.claim",
        channel: tokenRecord.channel,
        organizationId: linkedOrganizationId,
        userId: args.userId,
        sessionToken: linkedSessionToken,
        telegramChatId: tokenRecord.telegramChatId,
        claimTokenId: tokenRecord.tokenId,
        eventKey: `onboarding.funnel.claim:${tokenRecord.tokenId}`,
        campaign:
          tokenRecord.metadata && typeof tokenRecord.metadata === "object"
            ? (tokenRecord.metadata as { campaign?: Record<string, unknown> }).campaign
            : undefined,
        metadata: {
          tokenType: tokenRecord.tokenType,
          claimSource: args.claimSource,
          alreadyClaimed,
        },
      });
    } catch (funnelError) {
      console.error("[identityClaims] Funnel claim event failed (non-blocking):", funnelError);
    }

    return {
      success: true,
      alreadyClaimed,
      tokenType: tokenRecord.tokenType as ClaimTokenType,
      linkedOrganizationId,
      linkedSessionToken,
    };
  },
});

export const revokeTelegramOrgClaimTokensForChat = internalMutation({
  args: {
    telegramChatId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issuedTokens = await ctx.db
      .query("anonymousClaimTokens")
      .withIndex("by_telegram_chat", (q) => q.eq("telegramChatId", args.telegramChatId))
      .filter((q) => q.eq(q.field("status"), "issued"))
      .collect();

    const now = Date.now();
    for (const token of issuedTokens) {
      await ctx.db.patch(token._id, {
        status: "revoked",
        metadata: {
          ...(token.metadata || {}),
          revokedAt: now,
          revokeReason: args.reason || "telegram_link_flow_completed",
        },
      });
    }

    return { revokedCount: issuedTokens.length };
  },
});
