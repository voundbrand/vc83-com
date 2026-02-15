/**
 * TELEGRAM IDENTITY LINKING
 *
 * Two secure paths for existing org owners to connect their Telegram:
 *
 * Path A — Email Verification (organic Telegram discovery):
 *   Quinn asks "do you have an account?" → user provides email →
 *   6-digit code sent to email → user enters code → mapping links to existing org
 *
 * Path B — Deep Link from Dashboard:
 *   Settings → "Connect Telegram" → generates t.me/bot?start=link_{token} →
 *   one-click link, no onboarding needed
 */

import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const { internal: internalApi } = require("../_generated/api") as {
  internal: Record<string, Record<string, Record<string, unknown>>>;
};

// ============================================================================
// PATH B: DASHBOARD DEEP LINK — Token Generation & Validation
// ============================================================================

/**
 * Generate a one-time link token for connecting Telegram from the dashboard.
 * Called by the frontend when user clicks "Connect Telegram" in settings.
 *
 * Returns a token that becomes part of: t.me/{BOT_USERNAME}?start=link_{token}
 */
export const generateLinkToken = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Find the platform user
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) throw new Error("User not found");

    // Verify user is a member of this org
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .first();
    if (!membership || !membership.isActive) {
      throw new Error("Not a member of this organization");
    }

    // Generate a secure random token
    const token = generateSecureToken();

    // Store in objects table (type: telegram_link_token)
    await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "telegram_link_token",
      name: `Link token for ${identity.email}`,
      status: "active",
      customProperties: {
        token,
        organizationId: args.organizationId,
        userId: user._id,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
        used: false,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "l4yercak3_bot";

    return {
      token,
      telegramLink: `https://t.me/${botUsername}?start=link_${token}`,
      expiresInMinutes: 15,
    };
  },
});

/**
 * Look up a link token (internal — called by resolveChatToOrg).
 */
export const lookupLinkToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // Search objects table for matching token
    const objects = await ctx.db
      .query("objects")
      .withIndex("by_org_type")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "telegram_link_token"),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    // Find the one with matching token in customProperties
    for (const obj of objects) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = obj.customProperties as Record<string, any>;
      if (props?.token === args.token && !props?.used) {
        if (props.expiresAt && props.expiresAt < Date.now()) {
          return null; // Expired
        }
        return {
          objectId: obj._id,
          organizationId: props.organizationId as Id<"organizations">,
          userId: props.userId as Id<"users">,
        };
      }
    }

    return null;
  },
});

/**
 * Mark a link token as used (one-time use).
 */
export const consumeLinkToken = internalMutation({
  args: { objectId: v.id("objects") },
  handler: async (ctx, args) => {
    const obj = await ctx.db.get(args.objectId);
    if (!obj) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = obj.customProperties as Record<string, any>;
    await ctx.db.patch(args.objectId, {
      status: "consumed",
      customProperties: { ...props, used: true },
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// PATH A: EMAIL VERIFICATION — Code Generation & Validation
// ============================================================================

/**
 * Look up a user by email (internal — called by the verify_telegram_link tool).
 * Returns the user's ID and their org if found.
 */
export const lookupUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) return null;

    // Find their org membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!membership) return null;

    // Get org name
    const org = await ctx.db.get(membership.organizationId);

    return {
      userId: user._id,
      email: user.email,
      organizationId: membership.organizationId,
      organizationName: org?.name || "Unknown",
    };
  },
});

/**
 * Generate a 6-digit verification code and store it.
 * Called by the verify_telegram_link tool when user provides their email.
 */
export const generateVerificationCode = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    telegramChatId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const code = generateSixDigitCode();

    // Store in objects table (type: telegram_link_code)
    // Use platform org for storage since onboarding user doesn't have an org yet
    const platformOrgId = process.env.PLATFORM_ORG_ID || process.env.TEST_ORG_ID;
    if (!platformOrgId) throw new Error("PLATFORM_ORG_ID must be set");

    await ctx.db.insert("objects", {
      organizationId: platformOrgId as Id<"organizations">,
      type: "telegram_link_code",
      name: `Verification code for ${args.email}`,
      status: "active",
      customProperties: {
        code,
        userId: args.userId,
        email: args.email,
        telegramChatId: args.telegramChatId,
        targetOrganizationId: args.organizationId,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        used: false,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { code };
  },
});

/**
 * Verify a 6-digit code and link the Telegram chat to the user's org.
 * Called by the verify_telegram_link tool when user enters the code.
 */
export const verifyCodeAndLink = internalMutation({
  args: {
    code: v.string(),
    telegramChatId: v.string(),
  },
  handler: async (ctx, args) => {
    const platformOrgId = process.env.PLATFORM_ORG_ID || process.env.TEST_ORG_ID;
    if (!platformOrgId) throw new Error("PLATFORM_ORG_ID must be set");

    // Find matching code
    const codeObjects = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", platformOrgId as Id<"organizations">).eq("type", "telegram_link_code")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const obj of codeObjects) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = obj.customProperties as Record<string, any>;
      if (
        props?.code === args.code &&
        props?.telegramChatId === args.telegramChatId &&
        !props?.used
      ) {
        // Check expiry
        if (props.expiresAt && props.expiresAt < Date.now()) {
          // Mark as expired
          await ctx.db.patch(obj._id, {
            status: "expired",
            updatedAt: Date.now(),
          });
          return { success: false, error: "Code expired. Ask for a new one." };
        }

        // Valid! Mark code as used
        await ctx.db.patch(obj._id, {
          status: "consumed",
          customProperties: { ...props, used: true },
          updatedAt: Date.now(),
        });

        const targetOrgId = props.targetOrganizationId as Id<"organizations">;
        const userId = props.userId as Id<"users">;

        // Update the existing telegramMapping from "onboarding" → "active" pointing to user's org
        const mapping = await ctx.db
          .query("telegramMappings")
          .withIndex("by_chat_id", (q) =>
            q.eq("telegramChatId", args.telegramChatId)
          )
          .first();

        if (mapping) {
          await ctx.db.patch(mapping._id, {
            organizationId: targetOrgId,
            status: "active" as const,
            userId,
          });
        } else {
          // Create a new active mapping
          await ctx.db.insert("telegramMappings", {
            telegramChatId: args.telegramChatId,
            organizationId: targetOrgId,
            status: "active",
            userId,
            createdAt: Date.now(),
          });
        }

        // Get org name for confirmation message
        const org = await ctx.db.get(targetOrgId);

        return {
          success: true,
          organizationId: targetOrgId,
          organizationName: org?.name || "your organization",
          userId,
        };
      }
    }

    return { success: false, error: "Invalid code. Please check and try again." };
  },
});

// ============================================================================
// QUERY: Check if Telegram is already connected (for dashboard UI)
// ============================================================================

/**
 * Check if an org already has a Telegram mapping.
 * Used by the dashboard to show connection status.
 */
export const getTelegramConnectionStatus = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const mapping = await ctx.db
      .query("telegramMappings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return {
      connected: !!mapping,
      telegramChatId: mapping?.telegramChatId ?? null,
      senderName: mapping?.senderName ?? null,
    };
  },
});

// ============================================================================
// HELPERS
// ============================================================================

function generateSecureToken(): string {
  // Crypto-quality random token (32 hex chars)
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSixDigitCode(): string {
  // 6-digit numeric code
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const num = ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0;
  return String(num % 1000000).padStart(6, "0");
}
