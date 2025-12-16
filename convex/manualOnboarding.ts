import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, getUserContext } from "./rbacHelpers";

/**
 * MANUAL ONBOARDING (Quick Start)
 *
 * For existing users who want to run the same onboarding flow as new signups.
 * This provisions apps and templates exactly like new user onboarding does.
 *
 * SAFETY: ADDITIVE ONLY - never deletes existing data.
 */

/**
 * Apply Quick Start Configuration (DEFAULT = AI AGENCY / FOUNDER BUILDER)
 *
 * This runs the EXACT same provisioning as new user signup:
 * 1. Assigns ALL apps (if not already assigned)
 * 2. Provisions Freelancer Portal template (if not already provisioned)
 *
 * This matches what happens in convex/onboarding.ts lines 400-404
 */
export const applyQuickStart = mutation({
  args: {
    sessionId: v.string(),
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

    const results = {
      appsProvisioned: [] as string[],
      templatesProvisioned: [] as string[],
      alreadyInstalled: [] as string[],
    };

    // 3. Get system organization (used for apps and templates)
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found - cannot provision apps or templates");
    }

    // 4. ASSIGN ALL APPS (exactly like onboarding.ts:assignAllAppsToOrgInternal)
    // IMPORTANT: Only get apps created by the SYSTEM organization to prevent cross-org pollution
    const activeApps = await ctx.db
      .query("apps")
      .withIndex("by_creator", (q) => q.eq("creatorOrgId", systemOrg._id))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "approved")
        )
      )
      .collect();

    for (const app of activeApps) {
      // Check if availability already exists
      const existingAvailability = await ctx.db
        .query("appAvailabilities")
        .withIndex("by_org_app", (q) =>
          q.eq("organizationId", organizationId).eq("appId", app._id)
        )
        .first();

      if (!existingAvailability) {
        await ctx.db.insert("appAvailabilities", {
          appId: app._id,
          organizationId,
          isAvailable: true,
          approvedBy: userId,
          approvedAt: Date.now(),
        });
      }

      // Check if installation already exists
      const existingInstallation = await ctx.db
        .query("appInstallations")
        .withIndex("by_org_and_app", (q) =>
          q.eq("organizationId", organizationId).eq("appId", app._id)
        )
        .first();

      if (existingInstallation) {
        results.alreadyInstalled.push(app.name || app.code);
      } else {
        // Create appInstallation record
        await ctx.db.insert("appInstallations", {
          organizationId,
          appId: app._id,
          status: "active",
          permissions: {
            read: true,
            write: true,
            admin: false,
          },
          isVisible: true,
          usageCount: 0,
          installedAt: Date.now(),
          installedBy: userId,
          updatedAt: Date.now(),
        });

        results.appsProvisioned.push(app.name || app.code);
      }
    }

    // 6. PROVISION FREELANCER PORTAL TEMPLATE (exactly like onboarding.ts:provisionStarterTemplatesInternal)
    // Get organization details
    const org = await ctx.db.get(organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Get system templates (web_app subtype)
    const systemTemplates = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", systemOrg._id).eq("type", "template")
        )
        .filter((q) => q.eq(q.field("subtype"), "web_app"))
        .collect();

    // Freelancer Portal configuration (from onboarding.ts lines 627-646)
    const starterConfig = {
        name: "Freelancer Portal",
        templateCode: "freelancer_portal_v1",
        slug: "/portal",
        description: "Client-facing portal for projects, invoices, and profile management",
        requiredScopes: ["contacts:read", "contacts:write", "projects:read", "invoices:read"],
        requiredEndpoints: [
          "GET /api/v1/crm/contacts/:id",
          "PATCH /api/v1/crm/contacts/:id",
          "GET /api/v1/projects",
          "GET /api/v1/projects/:id",
          "GET /api/v1/invoices",
          "GET /api/v1/invoices/:id",
        ],
        connectedObjects: {
          projects: true,
          invoices: true,
          contacts: true,
        },
      };

      // Find matching system template
      const systemTemplate = systemTemplates.find(
        (t) => t.name === starterConfig.name
      );

      if (!systemTemplate) {
        console.warn(`[Quick Start] Template "${starterConfig.name}" not found in system - skipping`);
      } else {
        // Check if template already exists in user's org
        const existingTemplate = await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q.eq("organizationId", organizationId).eq("type", "template")
          )
          .filter((q) => q.eq(q.field("subtype"), "web_app"))
          .filter((q) => q.eq(q.field("name"), starterConfig.name))
          .first();

        let orgTemplateId;

        if (!existingTemplate) {
          // Copy system template to user's organization
          orgTemplateId = await ctx.db.insert("objects", {
            organizationId,
            createdBy: userId,
            type: "template",
            subtype: "web_app",
            name: systemTemplate.name,
            description: systemTemplate.description,
            status: "published",
            customProperties: {
              ...systemTemplate.customProperties,
              sourceTemplateId: systemTemplate._id,
              copiedFromSystem: true,
              copiedAt: Date.now(),
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          results.templatesProvisioned.push(starterConfig.name);
        } else {
          orgTemplateId = existingTemplate._id;
        }

        // Check if published_page already exists
        const existingPage = await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q.eq("organizationId", organizationId).eq("type", "published_page")
          )
          .filter((q) =>
            q.eq(q.field("customProperties.templateCode"), starterConfig.templateCode)
          )
          .first();

        if (!existingPage) {
          // Create published_page
          const publishedPageId = await ctx.db.insert("objects", {
            organizationId,
            type: "published_page",
            subtype: "external_app",
            name: starterConfig.name,
            description: starterConfig.description,
            status: "draft",
            customProperties: {
              slug: starterConfig.slug,
              templateCode: starterConfig.templateCode,
              isExternal: true,
              externalDomain: "",
              metaTitle: `${org.name} - ${starterConfig.name}`,
              metaDescription: starterConfig.description,
              templateContent: {
                isExternal: true,
                requiresAuth: true,
                authType: "oauth",
                connectedObjects: starterConfig.connectedObjects,
                requiredApiEndpoints: starterConfig.requiredEndpoints,
                requiredScopes: starterConfig.requiredScopes,
              },
              deployment: {
                platform: "vercel",
                status: "not_deployed",
                deployedUrl: null,
                deployedAt: null,
                githubRepo: systemTemplate.customProperties?.deployment?.githubRepo || "",
                vercelDeployButton: systemTemplate.customProperties?.deployment?.vercelDeployButton || "",
                deploymentGuide: systemTemplate.customProperties?.deployment?.deploymentGuide || "",
                demoUrl: systemTemplate.customProperties?.deployment?.demoUrl || "",
                deploymentAttempts: 0,
                lastDeploymentAttempt: null,
                deploymentErrors: [],
              },
              branding: {
                orgName: org.name,
                orgLogo: (org as any).customProperties?.logoUrl || "",
                primaryColor: (org as any).customProperties?.primaryColor || "#6B46C1",
              },
            },
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          // Create objectLink: published_page → template
          await ctx.db.insert("objectLinks", {
            organizationId,
            fromObjectId: publishedPageId,
            toObjectId: orgTemplateId,
            linkType: "uses_template",
            properties: {
              templateCode: starterConfig.templateCode,
              version: "1.0.0",
            },
            createdAt: Date.now(),
          });

          results.templatesProvisioned.push(`${starterConfig.name} (published page)`);
        }
      }

    // 7. Update user's completed ICPs
    const currentCompletedICPs = (user as any).completedICPs || [];
    if (!currentCompletedICPs.includes("default")) {
      await ctx.db.patch(userId, {
        completedICPs: [...currentCompletedICPs, "default"],
      } as any);
    }

    // 8. Audit log
    await ctx.db.insert("auditLogs", {
      organizationId,
      userId,
      action: "onboarding.quick_start_applied",
      resource: "organizations",
      resourceId: organizationId,
      metadata: {
        appsProvisioned: results.appsProvisioned,
        templatesProvisioned: results.templatesProvisioned,
        alreadyInstalled: results.alreadyInstalled,
      },
      success: true,
      createdAt: Date.now(),
    });

    return results;
  },
});

/**
 * Get user's Quick Start completion status
 */
export const getQuickStartStatus = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    return {
      hasCompletedQuickStart: ((user as any).completedICPs || []).includes("default"),
      completedICPs: (user as any).completedICPs || [],
    };
  },
});
