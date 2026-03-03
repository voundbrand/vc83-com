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

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Create a minimal organization for a Telegram-only user.
 * Required fields match the organizations schema in coreSchemas.ts.
 */
export const createMinimalOrg = internalMutation({
  args: {
    workspaceName: v.optional(v.string()),
    workspaceContext: v.optional(v.string()),
    name: v.optional(v.string()), // Legacy compatibility alias.
    industry: v.optional(v.string()),
    source: v.string(),
    channelContactIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspaceName =
      normalizeOptionalString(args.workspaceName) ||
      normalizeOptionalString(args.name) ||
      "My Workspace";
    const workspaceContext =
      normalizeOptionalString(args.workspaceContext) ||
      normalizeOptionalString(args.industry);
    const channelContactIdentifier = normalizeOptionalString(args.channelContactIdentifier);

    // Generate a unique slug from the name
    const baseSlug = workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const uniqueSuffix = Date.now().toString(36);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    const now = Date.now();

    const orgId = await ctx.db.insert("organizations", {
      name: workspaceName,
      slug,
      businessName: workspaceName,
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
        workspaceContext,
        industry: workspaceContext,
        channelContactIdentifier,
      },
      success: true,
      createdAt: now,
    });

    return orgId;
  },
});

export const updateOrgFromOnboarding = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    workspaceName: v.optional(v.string()),
    name: v.optional(v.string()), // Legacy compatibility alias.
    source: v.string(),
    channelContactIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const now = Date.now();
    const workspaceName =
      normalizeOptionalString(args.workspaceName) ||
      normalizeOptionalString(args.name) ||
      organization.name;
    await ctx.db.patch(args.organizationId, {
      name: workspaceName,
      businessName: workspaceName,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      action: "onboarding.org_bootstrap.rename_existing",
      resource: "organizations",
      resourceId: String(args.organizationId),
      metadata: {
        source: args.source,
        channelContactIdentifier: args.channelContactIdentifier,
        newName: workspaceName,
      },
      success: true,
      createdAt: now,
    });

    return {
      success: true as const,
      organizationId: args.organizationId,
      renamed: true as const,
    };
  },
});
