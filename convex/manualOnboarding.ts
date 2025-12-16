import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, getUserContext } from "./rbacHelpers";
import { Id } from "./_generated/dataModel";

/**
 * MANUAL ONBOARDING (Quick Start)
 *
 * For existing users who want to configure their workspace with ICP templates.
 * This provisions apps and templates based on selected profile.
 *
 * ADDITIVE ONLY - never deletes existing data.
 */

/**
 * ICP definitions matching frontend types
 */
const ICP_CONFIGURATIONS = {
  "ai-agency": {
    name: "AI Agency",
    apps: ["ai-assistant", "crm", "invoices", "analytics"],
    templates: {
      invoice: ["modern-minimal", "luxury-bold"],
      email: ["modern-minimal"],
    },
  },
  "founder-builder": {
    name: "Founder/Builder",
    apps: ["ai-assistant", "crm", "analytics"],
    templates: {
      email: ["modern-minimal"],
    },
  },
  "event-manager": {
    name: "Event Manager",
    apps: ["events", "crm", "invoices", "calendar"],
    templates: {
      invoice: ["modern-minimal"],
      email: ["modern-minimal"],
      ticket: ["standard"],
    },
  },
  "freelancer": {
    name: "Freelancer",
    apps: ["invoices", "crm", "time-tracking"],
    templates: {
      invoice: ["modern-minimal", "luxury-bold"],
      email: ["modern-minimal"],
    },
  },
  "enterprise": {
    name: "Enterprise",
    apps: ["ai-assistant", "crm", "invoices", "analytics", "team-management"],
    templates: {
      invoice: ["modern-minimal"],
      email: ["modern-minimal"],
    },
  },
} as const;

/**
 * Apply ICP configuration to existing user's organization
 *
 * SAFETY GUARANTEES:
 * 1. Only provisions MISSING apps/templates (idempotent)
 * 2. Never deletes existing data
 * 3. Validates organization membership
 * 4. Requires authentication
 * 5. Stores completion status
 */
export const applyICPConfiguration = mutation({
  args: {
    sessionId: v.string(),
    icpId: v.union(
      v.literal("ai-agency"),
      v.literal("founder-builder"),
      v.literal("event-manager"),
      v.literal("freelancer"),
      v.literal("enterprise")
    ),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // 2. Get organization context
    const organizationId = user.defaultOrgId;
    if (!organizationId) {
      throw new Error("User has no default organization");
    }

    const userContext = await getUserContext(ctx, userId, organizationId);
    if (!userContext.organizationId) {
      throw new Error("User is not a member of this organization");
    }

    // 3. Get ICP configuration
    const icpConfig = ICP_CONFIGURATIONS[args.icpId];
    if (!icpConfig) {
      throw new Error(`Invalid ICP ID: ${args.icpId}`);
    }

    const results = {
      icpId: args.icpId,
      icpName: icpConfig.name,
      appsProvisioned: [] as string[],
      templatesProvisioned: [] as { type: string; name: string }[],
      alreadyInstalled: [] as string[],
    };

    // 4. Get system organization (for templates)
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // 5. Provision Apps
    const existingInstallations = await ctx.db
      .query("appInstallations")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    const installedAppIds = new Set(
      existingInstallations.map((install) => install.appId)
    );

    for (const appCode of icpConfig.apps) {
      const app = await ctx.db
        .query("apps")
        .withIndex("by_code", (q) => q.eq("code", appCode))
        .first();

      if (!app) {
        console.warn(`App not found: ${appCode}`);
        continue;
      }

      if (installedAppIds.has(app._id)) {
        results.alreadyInstalled.push(appCode);
        continue;
      }

      await ctx.db.insert("appInstallations", {
        organizationId,
        appId: app._id,
        installedBy: userId,
        installedAt: Date.now(),
        status: "active",
        permissions: {
          read: true,
          write: true,
          admin: false,
        },
        isVisible: true,
        usageCount: 0,
        updatedAt: Date.now(),
      });

      results.appsProvisioned.push(appCode);
    }

    // 6. Provision Templates
    for (const [templateType, templateNames] of Object.entries(icpConfig.templates)) {
      for (const templateName of templateNames) {
        // Check if link exists
        const existingLink = await ctx.db
          .query("objectLinks")
          .withIndex("by_org_link_type", (q) =>
            q.eq("organizationId", organizationId).eq("linkType", "has_template")
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("properties.templateType"), templateType),
              q.eq(q.field("properties.templateName"), templateName)
            )
          )
          .first();

        if (existingLink) continue;

        // Find system template
        const template = await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q.eq("organizationId", systemOrg._id).eq("type", "template")
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("subtype"), templateType),
              q.eq(q.field("status"), "published"),
              q.or(
                q.eq(q.field("customProperties.templateCode"), templateName),
                q.eq(q.field("name"), templateName)
              )
            )
          )
          .first();

        if (!template) {
          console.warn(`Template not found: ${templateType}/${templateName}`);
          continue;
        }

        // Create organization settings object for template if needed
        const orgSettingsId = await ctx.db.insert("objects", {
          organizationId,
          type: "organization_settings",
          subtype: "quick_start_templates",
          name: `Quick Start Templates - ${icpConfig.name}`,
          status: "active",
          customProperties: {
            icpId: args.icpId,
            templateType,
            templateName,
          },
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Link settings object to template
        await ctx.db.insert("objectLinks", {
          fromObjectId: orgSettingsId,
          toObjectId: template._id,
          linkType: "has_template",
          organizationId,
          properties: {
            templateType,
            templateName,
            linkedAt: Date.now(),
            linkedBy: userId,
            source: "quick_start",
            icpId: args.icpId,
          },
          createdBy: userId,
          createdAt: Date.now(),
        });

        results.templatesProvisioned.push({ type: templateType, name: templateName });
      }
    }

    // 7. Update user's completed ICPs
    const currentCompletedICPs = (user as any).completedICPs || [];
    if (!currentCompletedICPs.includes(args.icpId)) {
      await ctx.db.patch(userId, {
        completedICPs: [...currentCompletedICPs, args.icpId],
      } as any);
    }

    // 8. Audit log
    await ctx.db.insert("auditLogs", {
      organizationId,
      userId,
      action: "quick_start.icp_applied",
      resource: "organizations",
      resourceId: organizationId,
      metadata: {
        icpId: args.icpId,
        icpName: icpConfig.name,
        appsProvisioned: results.appsProvisioned,
        templatesProvisioned: results.templatesProvisioned,
      },
      success: true,
      createdAt: Date.now(),
    });

    return results;
  },
});

/**
 * Get user's completed ICP configurations
 */
export const getUserCompletedICPs = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    return (user as any).completedICPs || [];
  },
});
