/**
 * PROVISION TEMPLATES FOR EXISTING ORGANIZATION
 *
 * Helper mutation to provision web app templates for organizations
 * that were created before the auto-provisioning feature was added.
 *
 * This does the same thing as onboarding auto-provisioning, but for existing orgs.
 *
 * Usage:
 * npx convex run seeds/provisionTemplatesForExistingOrg:provisionTemplates --orgSlug "your-org-slug"
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const provisionTemplates = internalMutation({
  args: {
    orgSlug: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`🚀 [Provisioning] Starting for org: ${args.orgSlug}`);

    // 1. Get the organization
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .first();

    if (!org) {
      throw new Error(`Organization not found: ${args.orgSlug}`);
    }

    console.log(`✅ [Provisioning] Found organization:`, org._id);

    // 2. Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // 3. Get first org member (for createdBy field)
    const firstMember = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
      .first();

    if (!firstMember) {
      throw new Error("No members found for this organization");
    }

    const userId = firstMember.userId;

    // 4. Define starter templates (matching onboarding.ts)
    const STARTER_TEMPLATES = [
      {
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
      },
    ];

    // 5. Get all system web app templates
    const systemTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "web_app"))
      .collect();

    console.log(`✅ [Provisioning] Found ${systemTemplates.length} web app templates`);

    let provisioned = 0;
    let skipped = 0;

    // 6. Provision each template
    for (const starterConfig of STARTER_TEMPLATES) {
      const systemTemplate = systemTemplates.find(
        (t) => t.name === starterConfig.name
      );

      if (!systemTemplate) {
        console.warn(`⚠️  Template "${starterConfig.name}" not found in system`);
        skipped++;
        continue;
      }

      console.log(`📦 [Provisioning] Processing: ${starterConfig.name}`);

      // Check if already provisioned
      const existingAvailability = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", org._id).eq("type", "template_availability")
        )
        .filter((q) =>
          q.eq(q.field("customProperties.templateCode"), starterConfig.templateCode)
        )
        .first();

      if (!existingAvailability) {
        // Create template_availability
        await ctx.db.insert("objects", {
          organizationId: org._id,
          type: "template_availability",
          name: `${starterConfig.name} Availability`,
          status: "active",
          customProperties: {
            templateId: systemTemplate._id,
            templateCode: starterConfig.templateCode,
            available: true,
            enabledAt: Date.now(),
            autoProvisioned: true,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        console.log(`  ✅ Created template_availability`);
      } else {
        console.log(`  ⏭️  template_availability already exists`);
      }

      // Check if published_page already exists
      const existingPage = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", org._id).eq("type", "published_page")
        )
        .filter((q) =>
          q.eq(q.field("customProperties.templateCode"), starterConfig.templateCode)
        )
        .first();

      if (!existingPage) {
        // Create published_page
        const publishedPageId = await ctx.db.insert("objects", {
          organizationId: org._id,
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

            // SEO
            metaTitle: `${org.name} - ${starterConfig.name}`,
            metaDescription: starterConfig.description,

            // Configuration
            templateContent: {
              isExternal: true,
              requiresAuth: true,
              authType: "oauth",
              connectedObjects: starterConfig.connectedObjects,
              requiredApiEndpoints: starterConfig.requiredEndpoints,
              requiredScopes: starterConfig.requiredScopes,
            },

            // Deployment
            deployment: {
              platform: "vercel",
              status: "not_deployed",
              deployedUrl: null,
              deployedAt: null,
            },

            // Branding
            branding: {
              orgName: org.name,
              orgLogo: "",
              primaryColor: "#6B46C1",
            },
          },
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Create objectLink
        await ctx.db.insert("objectLinks", {
          organizationId: org._id,
          fromObjectId: publishedPageId,
          toObjectId: systemTemplate._id,
          linkType: "uses_template",
          properties: {
            templateCode: starterConfig.templateCode,
            version: "1.0.0",
          },
          createdAt: Date.now(),
        });

        console.log(`  ✅ Created published_page`);
        provisioned++;
      } else {
        console.log(`  ⏭️  published_page already exists`);
        skipped++;
      }
    }

    console.log(`🎉 [Provisioning] Complete!`);
    console.log(`   Provisioned: ${provisioned}`);
    console.log(`   Skipped: ${skipped}`);

    return {
      success: true,
      organizationId: org._id,
      organizationSlug: args.orgSlug,
      provisioned,
      skipped,
      message: `Successfully provisioned ${provisioned} templates for ${org.name}`,
    };
  },
});
