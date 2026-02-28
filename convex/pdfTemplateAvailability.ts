import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, getUserContext, checkPermission } from "./rbacHelpers";

/**
 * PDF TEMPLATE AVAILABILITY ONTOLOGY
 *
 * Manages which PDF template objects are available to each organization.
 * Follows the same pattern as formTemplateAvailability and checkoutTemplateAvailability.
 *
 * Templates include: ticket PDFs, invoice PDFs, certificate PDFs
 */

/**
 * Enable a PDF template for an organization
 *
 * Only super admins can enable templates.
 * Creates a template_availability object with subtype: "pdf".
 */
export const enablePdfTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateCode: v.string(),
    customSettings: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can call compatibility mutations.
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    let isSuperAdmin = false;
    if (user.global_role_id) {
      const globalRole = await ctx.db.get(user.global_role_id);
      if (globalRole && globalRole.name === "super_admin") {
        isSuperAdmin = true;
      }
    }

    if (!isSuperAdmin) {
      throw new Error("Permission denied: Only super admins can enable PDF templates");
    }

    // Keep validation behavior for compatibility callers.
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    console.warn(
      `⚠️ [Template Availability] enablePdfTemplate is deprecated. No write performed for ${args.templateCode}.`
    );
    return {
      success: true,
      deprecated: true,
      noop: true,
      action: "enable",
      organizationId: args.organizationId,
      templateCode: args.templateCode,
      message:
        "PDF template availability writes are deprecated. Published templates are globally available by policy.",
    };
  },
});

/**
 * Disable a PDF template for an organization
 *
 * Only super admins can disable templates.
 */
export const disablePdfTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateCode: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can call compatibility mutations.
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    let isSuperAdmin = false;
    if (user.global_role_id) {
      const globalRole = await ctx.db.get(user.global_role_id);
      if (globalRole && globalRole.name === "super_admin") {
        isSuperAdmin = true;
      }
    }

    if (!isSuperAdmin) {
      throw new Error("Permission denied: Only super admins can disable PDF templates");
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    console.warn(
      `⚠️ [Template Availability] disablePdfTemplate is deprecated. No write performed for ${args.templateCode}.`
    );
    return {
      success: true,
      deprecated: true,
      noop: true,
      action: "disable",
      organizationId: args.organizationId,
      templateCode: args.templateCode,
      message:
        "PDF template availability writes are deprecated. Published templates are globally available by policy.",
    };
  },
});

/**
 * Get available PDF templates for an organization
 *
 * UPDATED: All published PDF templates are now available to all organizations.
 * The tier-based licensing system (tierConfigs.ts) handles feature limits.
 * Legacy availability rules are no longer checked.
 */
export const getAvailablePdfTemplates = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    category: v.optional(v.string()), // Filter by category (ticket, invoice, certificate)
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId, args.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_templates",
      args.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: view_templates required");
    }

    // Validate organization membership
    if (!userContext.isGlobal && userContext.organizationId !== args.organizationId) {
      throw new Error("Cannot view PDF templates for another organization");
    }

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get all system PDF templates
    let allTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "pdf"))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Filter by category if specified
    if (args.category) {
      allTemplates = allTemplates.filter(
        (template) => template.customProperties?.category === args.category
      );
    }

    // All published templates are now available to all organizations
    // Feature limits are enforced by the tier system (tierConfigs.ts)
    return allTemplates.map((template) => ({
      ...template,
      availability: {
        customSettings: {},
        enabledAt: undefined,
      },
    }));
  },
});

/**
 * Get all PDF template availabilities (super admin view)
 *
 * Shows which PDF templates are enabled for which orgs.
 * Used in super admin UI.
 */
export const getAllPdfTemplateAvailabilities = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")), // Filter by org
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can view all availabilities
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    let isSuperAdmin = false;
    if (user.global_role_id) {
      const globalRole = await ctx.db.get(user.global_role_id);
      if (globalRole && globalRole.name === "super_admin") {
        isSuperAdmin = true;
      }
    }

    if (!isSuperAdmin) {
      throw new Error("Permission denied: Only super admins can view all PDF template availabilities");
    }

    // Get PDF template availabilities
    const queryBuilder = ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "template_availability"));

    // Get all availabilities and filter for PDF subtype
    const allAvailabilities = await queryBuilder.collect();
    let pdfAvailabilities = allAvailabilities.filter((a) => a.subtype === "pdf");

    // Filter by org if specified
    if (args.organizationId) {
      pdfAvailabilities = pdfAvailabilities.filter(
        (a) => a.organizationId === args.organizationId
      );
    }

    // Enhance with org info
    return await Promise.all(
      pdfAvailabilities.map(async (availability) => {
        const org = await ctx.db.get(availability.organizationId);
        return {
          ...availability,
          organizationName: org?.name || "Unknown",
          organizationSlug: org?.slug || "unknown",
        };
      })
    );
  },
});

/**
 * Get all system PDF templates (super admin view)
 *
 * Used in super admin UI to see which PDF templates can be enabled.
 */
export const getAllSystemPdfTemplates = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can view all templates
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    let isSuperAdmin = false;
    if (user.global_role_id) {
      const globalRole = await ctx.db.get(user.global_role_id);
      if (globalRole && globalRole.name === "super_admin") {
        isSuperAdmin = true;
      }
    }

    if (!isSuperAdmin) {
      throw new Error("Permission denied: Only super admins can view all PDF templates");
    }

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get all system PDF templates
    // Include all PDF template types (not just "pdf" - also "invoice", "ticket", "certificate", etc.)
    // Exclude email and page templates only
    const allTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Filter to PDF templates only (exclude email and page templates)
    const templates = allTemplates.filter((t) => {
      const subtype = t.subtype;
      if (!subtype) return false; // Skip templates without subtype
      // Exclude email templates and page templates
      if (subtype === "email" || subtype === "page") return false;
      // Exclude all email template types
      const emailTypes = ["transactional", "event_confirmation", "event_reminder", "event_followup",
                         "newsletter", "marketing", "promotional", "receipt", "shipping",
                         "support", "account", "notification", "welcome"];
      if (emailTypes.includes(subtype)) return false;
      // Include everything else (legacy "pdf", "pdf_ticket", and modern PDF types like "invoice", "ticket", etc.)
      return true;
    });

    return templates;
  },
});
