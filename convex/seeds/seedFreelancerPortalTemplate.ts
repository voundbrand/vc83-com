/**
 * SEED: Freelancer Portal System Template
 *
 * Creates the "Freelancer Portal" system template for free tier users.
 * This is a complete Next.js app template that users can deploy to their own domain.
 *
 * Template Type: Multi-Page Web App (External)
 * Target Users: Freelancers, agencies, consultants
 * Free Tier Access: Yes (counts as 1 system template)
 *
 * The template includes:
 * - Dashboard page (overview of projects and invoices)
 * - Projects list & detail pages
 * - Invoices list & detail pages
 * - Profile page (contact info management)
 * - OAuth authentication flow
 *
 * Deployment:
 * - GitHub template repository with one-click Vercel deploy
 * - Users configure environment variables to connect to their l4yercak3 organization
 * - Entire app counts as 1 published_page in the backend
 */

import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

export const seedFreelancerPortalTemplate = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Starting Freelancer Portal template seed...");

    // 1. Get or create system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Please run seedSystemOrganization first.");
    }

    console.log("✅ System organization found:", systemOrg._id);

    // 2. Check if template already exists
    const existingTemplate = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "web_app"))
      .filter((q) => q.eq(q.field("name"), "Freelancer Portal"))
      .first();

    if (existingTemplate) {
      console.log("⚠️  Freelancer Portal template already exists - updating:", existingTemplate._id);

      // Update existing template (upsert pattern)
      await ctx.db.patch(existingTemplate._id, {
        description: "Professional client portal for freelancers and agencies. Give your clients a branded portal to view projects, invoices, and update their contact information.",
        updatedAt: Date.now(),
        // Note: We don't update customProperties here to preserve any manual changes
        // If you want to force update, uncomment below:
        // customProperties: { ...customPropertiesObject }
      });

      console.log("✅ Updated existing template");
      return {
        success: true,
        templateId: existingTemplate._id,
        message: "Template updated successfully",
      };
    }

    // 3. Create the system template
    const templateId = await ctx.db.insert("objects", {
      organizationId: systemOrg._id,
      type: "template",
      subtype: "web_app", // New subtype for multi-page external apps
      name: "Freelancer Portal",
      description: "Professional client portal for freelancers and agencies. Give your clients a branded portal to view projects, invoices, and update their contact information.",
      status: "published", // Available immediately

      customProperties: {
        // Template metadata
        templateVersion: "1.0.0",
        templateType: "external_multipage_app", // Indicates this is a full Next.js app
        category: "client_portal",
        tags: ["freelancer", "agency", "client-portal", "projects", "invoices", "crm"],

        // Template features
        features: [
          "OAuth 2.0 authentication",
          "Dashboard with project & invoice overview",
          "Projects list with filtering and search",
          "Project detail view with milestones",
          "Invoices list with status filtering",
          "Invoice detail view with PDF download",
          "Profile management (contact info)",
          "Responsive design (mobile-friendly)",
          "Customizable branding (colors, logo)",
        ],

        // API requirements (what endpoints the template needs)
        requiredApiEndpoints: [
          "GET /api/v1/users/me",
          "PATCH /api/v1/users/me",
          "GET /api/v1/projects",
          "GET /api/v1/projects/:id",
          "GET /api/v1/projects/:id/milestones",
          "GET /api/v1/invoices",
          "GET /api/v1/invoices/:id",
          "GET /api/v1/invoices/:id/pdf",
        ],

        // OAuth scopes required
        requiredScopes: [
          "profile:read",
          "profile:write",
          "projects:read",
          "invoices:read",
        ],

        // Deployment information
        deployment: {
          githubRepo: "https://github.com/l4yercak3/freelancer-portal-template",
          vercelDeployButton: "https://vercel.com/new/clone?repository-url=https://github.com/l4yercak3/freelancer-portal-template&env=NEXT_PUBLIC_L4YERCAK3_API_URL,NEXT_PUBLIC_L4YERCAK3_ORG_SLUG,L4YERCAK3_API_KEY&envDescription=Required%20environment%20variables%20for%20l4yercak3%20API%20integration&project-name=freelancer-portal&repository-name=freelancer-portal",
          deploymentGuide: "https://docs.l4yercak3.com/templates/freelancer-portal/deploy",
          demoUrl: "https://freelancer-portal-demo.l4yercak3.com",
        },

        // Environment variables required
        environmentVariables: [
          {
            key: "NEXT_PUBLIC_L4YERCAK3_API_URL",
            description: "Your l4yercak3 API URL",
            default: "https://app.l4yercak3.com",
            required: true,
            type: "string",
          },
          {
            key: "NEXT_PUBLIC_L4YERCAK3_ORG_SLUG",
            description: "Your organization slug",
            required: true,
            type: "string",
            exampleValue: "your-org-slug",
          },
          {
            key: "L4YERCAK3_API_KEY",
            description: "Your API key (from Settings > API Keys)",
            required: true,
            type: "secret",
            exampleValue: "sk_live_xxxxxxxxxxxxx",
          },
          {
            key: "NEXT_PUBLIC_ORG_NAME",
            description: "Your company name (optional branding)",
            required: false,
            type: "string",
            exampleValue: "Acme Agency",
          },
          {
            key: "NEXT_PUBLIC_ORG_LOGO_URL",
            description: "Your company logo URL (optional branding)",
            required: false,
            type: "string",
            exampleValue: "https://yourcompany.com/logo.png",
          },
          {
            key: "NEXT_PUBLIC_PRIMARY_COLOR",
            description: "Primary brand color (optional branding)",
            required: false,
            type: "color",
            exampleValue: "#6B46C1",
          },
        ],

        // Pages included in the template
        pages: [
          {
            path: "/",
            name: "Login",
            description: "OAuth authentication page",
            isPublic: true,
          },
          {
            path: "/dashboard",
            name: "Dashboard",
            description: "Overview of projects and invoices",
            requiresAuth: true,
          },
          {
            path: "/projects",
            name: "Projects List",
            description: "Browse all assigned projects",
            requiresAuth: true,
          },
          {
            path: "/projects/[id]",
            name: "Project Detail",
            description: "View project details and milestones",
            requiresAuth: true,
          },
          {
            path: "/invoices",
            name: "Invoices List",
            description: "Browse all invoices",
            requiresAuth: true,
          },
          {
            path: "/invoices/[id]",
            name: "Invoice Detail",
            description: "View invoice details and download PDF",
            requiresAuth: true,
          },
          {
            path: "/profile",
            name: "Profile",
            description: "View and update contact information",
            requiresAuth: true,
          },
        ],

        // Tech stack
        techStack: {
          framework: "Next.js 15",
          language: "TypeScript 5",
          styling: "Tailwind CSS 4",
          uiComponents: "shadcn/ui",
          authentication: "OAuth 2.0",
        },

        // Branding requirements
        branding: {
          requiresL4yercak3Badge: true, // Required for free tier
          badgeText: "Powered by l4yercak3",
          badgeLink: "https://l4yercak3.com",
          customizableColors: true,
          customizableLogo: true,
        },

        // Licensing
        license: "MIT",
        freeForCommercialUse: true,
        attributionRequired: true, // Must display l4yercak3 badge

        // Support & documentation
        documentation: "https://docs.l4yercak3.com/templates/freelancer-portal",
        supportEmail: "support@l4yercak3.com",
        communityUrl: "https://github.com/l4yercak3/freelancer-portal-template/discussions",

        // Screenshots (URLs to template screenshots)
        screenshots: [
          "https://cdn.l4yercak3.com/templates/freelancer-portal/screenshot-dashboard.png",
          "https://cdn.l4yercak3.com/templates/freelancer-portal/screenshot-projects.png",
          "https://cdn.l4yercak3.com/templates/freelancer-portal/screenshot-invoices.png",
          "https://cdn.l4yercak3.com/templates/freelancer-portal/screenshot-profile.png",
        ],

        // Usage stats (for analytics)
        usageStats: {
          deployCount: 0,
          activeInstances: 0,
          averageRating: 0,
          totalReviews: 0,
        },
      },

      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("✅ Freelancer Portal template created:", templateId);

    // 4. Create audit log
    await ctx.db.insert("objectActions", {
      organizationId: systemOrg._id,
      objectId: templateId,
      actionType: "created",
      actionData: {
        source: "seed_script",
        templateType: "external_multipage_app",
      },
      performedAt: Date.now(),
    });

    console.log("✅ Audit log created");

    // 5. Auto-provision template availability for free tier
    // This will happen automatically in onboarding for new users
    // For existing users, we'll need a migration script
    console.log("ℹ️  Template will be auto-provisioned for free tier users during onboarding");

    console.log("🎉 Freelancer Portal template seed complete!");

    return {
      success: true,
      templateId,
      message: "Freelancer Portal system template created successfully",
    };
  },
});

/**
 * Helper: Run this seed manually via CLI
 *
 * npx convex run seeds/seedFreelancerPortalTemplate:seedFreelancerPortalTemplate
 */
