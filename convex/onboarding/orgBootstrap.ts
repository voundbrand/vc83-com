/**
 * ORG BOOTSTRAP — Minimal Organization Creation for Telegram Users
 *
 * Creates a lightweight organization for users who onboard via Telegram.
 * These users don't have a web account yet — they can link one later.
 *
 * The org gets:
 * - A name derived from their business name
 * - A unique slug
 * - Free plan tier
 * - Source metadata for attribution
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Create a minimal organization for a Telegram-only user.
 * Required fields match the organizations schema in coreSchemas.ts.
 */
export const createMinimalOrg = internalMutation({
  args: {
    name: v.string(),
    industry: v.optional(v.string()),
    source: v.string(),
    telegramChatId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate a unique slug from the name
    const baseSlug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const uniqueSuffix = Date.now().toString(36);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    const now = Date.now();

    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug,
      businessName: args.name,
      plan: "free",
      isPersonalWorkspace: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId: orgId,
      action: "onboarding.telegram_org_bootstrap.create",
      resource: "organizations",
      resourceId: String(orgId),
      metadata: {
        source: args.source,
        industry: args.industry,
        telegramChatId: args.telegramChatId,
      },
      success: true,
      createdAt: now,
    });

    return orgId;
  },
});
