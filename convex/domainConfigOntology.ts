/**
 * Domain Configuration Ontology
 *
 * General-purpose domain configurations per organization.
 * NOT just for email - supports email, web publishing, and future contexts.
 *
 * Architecture:
 * - Core properties (always present): domainName, branding
 * - Optional context-specific properties: email, webPublishing
 * - Reusable across multiple systems (email behaviors, web templates, APIs)
 */

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

/**
 * CREATE domain configuration
 * Stores domain settings per organization - reusable across email, web, etc.
 */
export const createDomainConfig = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    domainName: v.string(),

    // Required: Branding (used across all contexts)
    branding: v.object({
      logoUrl: v.string(),
      primaryColor: v.string(),
      secondaryColor: v.string(),
      accentColor: v.optional(v.string()),
      fontFamily: v.optional(v.string()),
    }),

    // Optional: Email configuration
    email: v.optional(v.object({
      emailDomain: v.string(),        // Domain verified in Resend (e.g., "mail.pluseins.gg")
      senderEmail: v.string(),        // Default sender (e.g., "noreply@mail.pluseins.gg")
      systemEmail: v.string(),        // System notifications (e.g., "system@mail.pluseins.gg")
      salesEmail: v.string(),         // Sales inquiries (e.g., "sales@pluseins.gg")
      replyToEmail: v.string(),       // Reply-to address (e.g., "reply@pluseins.gg")
      defaultTemplateCode: v.optional(v.string()), // Default email template code (e.g., "luxury-confirmation")
    })),

    // Optional: Web publishing configuration
    webPublishing: v.optional(v.object({
      templateId: v.optional(v.string()),
      isExternal: v.optional(v.boolean()),
      siteUrl: v.optional(v.string()),
      metaTags: v.optional(v.object({
        title: v.string(),
        description: v.string(),
      })),
    })),
  },
  handler: async (ctx, args) => {
    // Verify session and get authenticated user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const configId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "configuration",
      subtype: "domain", // Generalized, not "email_domain"
      name: `${args.domainName} Configuration`,
      status: "active",
      customProperties: {
        domainName: args.domainName,
        branding: args.branding,

        // Add email config if provided
        ...(args.email && {
          email: {
            ...args.email,
            domainVerified: true, // Assume verified if created
            verifiedAt: Date.now(),
          }
        }),

        // Add web publishing config if provided
        ...(args.webPublishing && {
          webPublishing: args.webPublishing
        }),
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, configId };
  },
});

/**
 * GET domain config by ID
 * Used internally by email service and other backend operations
 */
export const getDomainConfig = query({
  args: {
    configId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db.get(args.configId);
    if (!config || config.type !== "configuration" || config.subtype !== "domain") {
      throw new Error("Domain config not found");
    }
    return config;
  },
});

/**
 * GET domain config by domain name
 * Used by API and templates to look up domain settings
 */
export const getDomainConfigByDomain = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    domainName: v.string(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "configuration")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("subtype"), "domain"),
          q.eq(q.field("customProperties.domainName"), args.domainName),
          q.eq(q.field("status"), "active")
        )
      )
      .first();

    if (!config) {
      throw new Error(`No domain config found for ${args.domainName}`);
    }

    return config;
  },
});

/**
 * LIST all domain configs for organization
 * For UI management
 */
export const listDomainConfigs = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "configuration")
      )
      .filter((q) => q.eq(q.field("subtype"), "domain"))
      .collect();
  },
});

/**
 * UPDATE domain config
 * Allows editing branding and settings
 */
export const updateDomainConfig = mutation({
  args: {
    sessionId: v.string(),
    configId: v.id("objects"),
    branding: v.optional(v.object({
      logoUrl: v.string(),
      primaryColor: v.string(),
      secondaryColor: v.string(),
      accentColor: v.optional(v.string()),
      fontFamily: v.optional(v.string()),
    })),
    email: v.optional(v.object({
      emailDomain: v.string(),        // Domain configured in Resend (e.g., "mail.pluseins.gg")
      senderEmail: v.string(),        // Default sender (e.g., "noreply@mail.pluseins.gg")
      systemEmail: v.string(),        // System notifications (e.g., "system@mail.pluseins.gg")
      salesEmail: v.string(),         // Sales inquiries (e.g., "sales@pluseins.gg")
      replyToEmail: v.string(),       // Reply-to address (e.g., "reply@pluseins.gg")
      defaultTemplateCode: v.optional(v.string()), // Default email template code (e.g., "luxury-confirmation")
    })),
    webPublishing: v.optional(v.object({
      templateId: v.optional(v.string()),
      isExternal: v.optional(v.boolean()),
      siteUrl: v.optional(v.string()),
      metaTags: v.optional(v.object({
        title: v.string(),
        description: v.string(),
      })),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.configId);
    if (!existing || existing.type !== "configuration" || existing.subtype !== "domain") {
      throw new Error("Domain config not found");
    }

    const customProperties = existing.customProperties as any;

    await ctx.db.patch(args.configId, {
      customProperties: {
        ...customProperties,
        ...(args.branding && { branding: args.branding }),
        ...(args.email && {
          email: {
            ...args.email,
            domainVerified: customProperties.email?.domainVerified || false,
            verifiedAt: customProperties.email?.verifiedAt || Date.now(),
          }
        }),
        ...(args.webPublishing && { webPublishing: args.webPublishing }),
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DELETE domain config
 * Sets status to inactive (soft delete)
 */
export const deleteDomainConfig = mutation({
  args: {
    sessionId: v.string(),
    configId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.configId, {
      status: "inactive",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Internal mutation to get domain config (for use from actions)
 * Avoids circular imports with api
 */
export const getDomainConfigInternal = internalMutation({
  args: {
    configId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db.get(args.configId);
    if (!config || config.type !== "configuration" || config.subtype !== "domain") {
      throw new Error("Domain config not found");
    }
    return config;
  },
});
