/**
 * SELF-SERVICE ONBOARDING
 *
 * Handles free account signup with auto-organization creation.
 * Part of Starter Conversion Path: Template → Create free account → Use platform → Upgrade
 *
 * @see .kiro/starter_onboarding_flow/SIGNUP-FLOW-DESIGN.md
 */

import { v } from "convex/values";
import { action, internalMutation, internalAction } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import Stripe from "stripe";

/**
 * Initialize Stripe client
 */
const getStripe = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(apiKey, {
    apiVersion: "2025-10-29.clover",
  });
};

/**
 * Self-Service Signup (Public Action)
 *
 * Creates user, organization, and first API key in one atomic operation.
 * For Free tier users following the Starter conversion path.
 *
 * This is an action because it needs to:
 * 1. Hash password using bcrypt (requires Node.js runtime)
 * 2. Generate and hash API key using bcrypt
 * 3. Call internal mutation to create database records
 */
export const signupFreeAccount = action({
  args: {
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    organizationName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    sessionId: any;
    user: { id: any; email: string; firstName: string; lastName: string };
    organization: { id: any; name: string; slug: string; plan: "free" };
    apiKeyPrefix: string;
    apiKey: string;
  }> => {
    // 1. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new ConvexError({
        code: "INVALID_EMAIL",
        message: "Invalid email format",
      });
    }

    // Normalize email (lowercase)
    const email = args.email.toLowerCase().trim();

    // 2. Validate password strength
    if (args.password.length < 8) {
      throw new ConvexError({
        code: "WEAK_PASSWORD",
        message: "Password must be at least 8 characters long",
      });
    }

    // 3. Block disposable email domains (basic check)
    const disposableDomains = [
      "tempmail.com", "10minutemail.com", "guerrillamail.com",
      "mailinator.com", "throwaway.email", "temp-mail.org"
    ];
    const emailDomain = email.split("@")[1];
    if (disposableDomains.includes(emailDomain)) {
      throw new ConvexError({
        code: "DISPOSABLE_EMAIL",
        message: "Please use a permanent email address",
      });
    }

    // 4. Hash password using bcrypt (requires action)
    const passwordHash: string = await ctx.runAction(internal.cryptoActions.hashPassword, {
      password: args.password,
    });

    // 5. Generate API key with cryptographically secure random bytes
    const keyBytes = new Uint8Array(32);
    crypto.getRandomValues(keyBytes);
    const keySecret = Array.from(keyBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const apiKey = `sk_live_${keySecret}`;
    const keyPrefix = `sk_live_${keySecret.substring(0, 8)}`;

    // 6. Hash the API key for storage (reuse bcrypt action)
    const apiKeyHash: string = await ctx.runAction(internal.cryptoActions.hashPassword, {
      password: apiKey,
    });

    // 7. Call internal mutation to create all records
    const result: {
      success: boolean;
      sessionId: any;
      user: { id: any; email: string; firstName: string; lastName: string };
      organization: { id: any; name: string; slug: string; plan: "free" };
      apiKeyPrefix: string;
    } = await ctx.runMutation(internal.onboarding.createFreeAccountInternal, {
      email,
      passwordHash,
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      organizationName: args.organizationName?.trim(),
      apiKeyHash,
      apiKeyPrefix: keyPrefix,
    });

    // 8. Create Stripe customer for the new organization (enables upgrade path)
    try {
      await ctx.runAction(internal.onboarding.createStripeCustomerForFreeUser, {
        organizationId: result.organization.id,
        organizationName: result.organization.name,
        email,
      });
    } catch (error) {
      // Log but don't fail signup if Stripe customer creation fails
      console.error("Failed to create Stripe customer:", error);
    }

    // 9. Send welcome email (async, don't wait)
    await ctx.scheduler.runAfter(0, internal.actions.welcomeEmail.sendWelcomeEmail, {
      email,
      firstName: args.firstName,
      organizationName: result.organization.name,
      apiKeyPrefix: result.apiKeyPrefix,
    });

    // 10. Send sales notification (async, don't wait)
    await ctx.scheduler.runAfter(0, internal.actions.salesNotificationEmail.sendSalesNotification, {
      eventType: "free_signup",
      user: {
        email,
        firstName: args.firstName,
        lastName: args.lastName,
      },
      organization: {
        name: result.organization.name,
        plan: "free",
      },
    });

    // 11. Return result with plaintext API key (only shown once!)
    return {
      ...result,
      apiKey, // ⚠️ IMPORTANT: Only shown once! Cannot be retrieved later.
    };
  },
});

/**
 * Create Stripe Customer for Free User (Internal Action)
 *
 * Creates a Stripe customer for the new free organization.
 * This enables:
 * - Upgrade path to paid plans via Stripe Checkout
 * - Promo code application
 * - Unified billing tracking
 *
 * Called during free account signup.
 */
export const createStripeCustomerForFreeUser = internalAction({
  args: {
    organizationId: v.id("organizations"),
    organizationName: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    // Create Stripe customer with Free tier metadata
    const customer = await stripe.customers.create({
      name: args.organizationName,
      email: args.email,
      metadata: {
        organizationId: args.organizationId,
        platform: "l4yercak3",
        tier: "free",
        signupDate: new Date().toISOString(),
      },
    });

    // Store customer ID in organization
    await ctx.runMutation(internal.organizations.updateStripeCustomer, {
      organizationId: args.organizationId,
      stripeCustomerId: customer.id,
    });

    console.log(`[Onboarding] Created Stripe customer ${customer.id} for org ${args.organizationId}`);

    return customer.id;
  },
});

/**
 * Create Free Account (Internal Mutation)
 *
 * Creates user, organization, storage, API key, and session.
 * Called by signupFreeAccount action after password and API key hashing.
 *
 * This is internal to ensure atomic database operations.
 */
export const createFreeAccountInternal = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    organizationName: v.optional(v.string()),
    apiKeyHash: v.string(),
    apiKeyPrefix: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new ConvexError({
        code: "EMAIL_EXISTS",
        message: "An account with this email already exists. Please sign in instead.",
      });
    }

    // 2. Create user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      isPasswordSet: true,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 3. Store password
    await ctx.db.insert("userPasswords", {
      userId,
      passwordHash: args.passwordHash,
      createdAt: Date.now(),
    });

    // 4. Create organization (auto-name if not provided)
    const orgName = args.organizationName || `${args.firstName}'s Organization`;
    const orgSlug = await generateUniqueSlug(ctx, orgName);

    const organizationId = await ctx.db.insert("organizations", {
      name: orgName,
      slug: orgSlug,
      businessName: orgName,
      plan: "free",
      isPersonalWorkspace: true,
      isActive: true,
      email: args.email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 5. Get or create "org_owner" role (standard RBAC role name)
    // Note: RBAC should be seeded before onboarding (run: npx convex run rbac:seedRBAC)
    let ownerRole = await ctx.db
      .query("roles")
      .filter((q) => q.eq(q.field("name"), "org_owner"))
      .first();

    if (!ownerRole) {
      // Create org_owner role if doesn't exist (should exist from RBAC seeding)
      const ownerRoleId = await ctx.db.insert("roles", {
        name: "org_owner",
        description: "Organization owner with full permissions",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      ownerRole = await ctx.db.get(ownerRoleId);
    }

    // 6. Add user as organization owner
    await ctx.db.insert("organizationMembers", {
      userId,
      organizationId,
      role: ownerRole!._id,
      isActive: true,
      joinedAt: Date.now(),
      acceptedAt: Date.now(), // Auto-accepted (they created it)
      invitedBy: userId, // Self-invited - enables isOwner check in auth
    });

    // 7. Set as default organization
    await ctx.db.patch(userId, {
      defaultOrgId: organizationId,
      updatedAt: Date.now(),
    });

    // 8. Initialize organization storage (matching schema)
    await ctx.db.insert("organizationStorage", {
      organizationId,
      totalSizeBytes: 0,
      totalSizeGB: 0,
      fileCount: 0,
      byCategoryBytes: {},
      lastCalculated: Date.now(),
      updatedAt: Date.now(),
    });

    // 10. Initialize user storage quota (matching schema)
    await ctx.db.insert("userStorageQuotas", {
      organizationId,
      userId,
      storageUsedBytes: 0,
      fileCount: 0,
      isEnforced: true,
      storageLimitBytes: 250 * 1024 * 1024, // 250 MB for Free tier
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 9a. Initialize API settings - enable API keys by default (per tier config)
    await ctx.db.insert("objects", {
      organizationId,
      type: "organization_settings",
      subtype: "api",
      name: "API Settings",
      status: "active",
      customProperties: {
        apiKeysEnabled: true, // Enabled by default for all tiers (per tierConfigs.ts)
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 10. Create API key record (matching schema)
    await ctx.db.insert("apiKeys", {
      organizationId,
      name: "Freelancer Portal Template",
      keyHash: args.apiKeyHash,
      keyPrefix: args.apiKeyPrefix,
      scopes: ["contacts:read", "contacts:write", "projects:read", "projects:write", "invoices:read", "invoices:write"],
      type: "simple",
      status: "active",
      createdBy: userId,
      createdAt: Date.now(),
    });

    // 11. Create session
    const sessionId = await ctx.db.insert("sessions", {
      userId,
      email: args.email,
      organizationId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    });

    // 12. Log audit event (matching schema)
    await ctx.db.insert("auditLogs", {
      organizationId,
      userId,
      action: "user.signup",
      resource: "users",
      resourceId: userId,
      metadata: {
        signupMethod: "self_service",
        planTier: "free",
        organizationName: orgName,
      },
      success: true,
      createdAt: Date.now(),
    });

    // 13. Record signup event for growth tracking
    await ctx.scheduler.runAfter(0, internal.growthTracking.recordSignupEvent, {
      userId,
      organizationId,
      email: args.email,
      plan: "free",
    });

    // 14. Assign all apps to the new organization (teaser model)
    // This enables the "show all apps, upgrade when they try to use premium features" approach
    await assignAllAppsToOrgInternal(ctx, organizationId, userId);

    // 15. Provision starter web app templates (Freelancer Portal, etc.)
    // This makes templates immediately available for one-click deployment
    await provisionStarterTemplatesInternal(ctx, organizationId, userId);

    // 16. Return session and metadata (API key returned by action)
    return {
      success: true,
      sessionId,
      user: {
        id: userId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
      },
      organization: {
        id: organizationId,
        name: orgName,
        slug: orgSlug,
        plan: "free" as const,
      },
      apiKeyPrefix: args.apiKeyPrefix,
    };
  },
});

/**
 * Generate Unique Organization Slug
 *
 * Creates a URL-friendly slug from organization name.
 * Appends numbers if slug already exists.
 *
 * Examples:
 * - "John's Organization" → "johns-organization"
 * - "John's Organization" (taken) → "johns-organization-2"
 */
async function generateUniqueSlug(ctx: any, name: string): Promise<string> {
  // Create base slug from name
  let baseSlug = name
    .toLowerCase()
    .replace(/'/g, '') // Remove apostrophes
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .slice(0, 50); // Max 50 characters

  // Ensure slug is not empty
  if (!baseSlug) {
    baseSlug = "organization";
  }

  let slug = baseSlug;
  let counter = 2; // Start at 2 for clarity (org, org-2, org-3, etc.)

  // Check for uniqueness
  while (true) {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q: any) => q.eq("slug", slug))
      .first();

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;

    // Safety: prevent infinite loop
    if (counter > 1000) {
      // Add random suffix
      const randomSuffix = Math.floor(Math.random() * 100000);
      return `${baseSlug}-${randomSuffix}`;
    }
  }
}

/**
 * Assign All Apps to Organization (Internal Helper)
 *
 * Creates appAvailabilities and appInstallations records for all active/approved apps.
 * Used during onboarding to enable the "teaser model" where users see all apps
 * but get upgrade prompts when they try to use premium features.
 *
 * @param ctx - Mutation context
 * @param organizationId - Organization to assign apps to
 * @param userId - User who triggered the assignment (for audit trail)
 */
async function assignAllAppsToOrgInternal(
  ctx: any,
  organizationId: any,
  userId: any
): Promise<void> {
  // Get system organization to ensure we only assign system-owned apps
  const systemOrg = await ctx.db
    .query("organizations")
    .withIndex("by_slug", (q: any) => q.eq("slug", "system"))
    .first();

  if (!systemOrg) {
    console.warn("[Onboarding] System organization not found - skipping app assignment");
    return;
  }

  // Get all active and approved apps created by the SYSTEM organization
  // IMPORTANT: This prevents cross-org pollution of apps
  const activeApps = await ctx.db
    .query("apps")
    .withIndex("by_creator", (q: any) => q.eq("creatorOrgId", systemOrg._id))
    .filter((q: any) =>
      q.or(
        q.eq(q.field("status"), "active"),
        q.eq(q.field("status"), "approved")
      )
    )
    .collect();

  console.log(`[Onboarding] Assigning ${activeApps.length} system apps to org ${organizationId}`);

  for (const app of activeApps) {
    // Check if availability already exists (shouldn't for new orgs, but be safe)
    const existingAvailability = await ctx.db
      .query("appAvailabilities")
      .withIndex("by_org_app", (q: any) =>
        q.eq("organizationId", organizationId).eq("appId", app._id)
      )
      .first();

    if (!existingAvailability) {
      // Create appAvailability record
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
      .withIndex("by_org_and_app", (q: any) =>
        q.eq("organizationId", organizationId).eq("appId", app._id)
      )
      .first();

    if (!existingInstallation) {
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
    }
  }

  console.log(`[Onboarding] Successfully assigned ${activeApps.length} apps to org ${organizationId}`);
}

/**
 * Assign All Apps to Organization (Internal Mutation)
 *
 * Exported internal mutation for use by other modules (webhooks, backfill, etc.)
 * Creates appAvailabilities and appInstallations for all active/approved apps.
 *
 * This enables the "teaser model" approach:
 * - All users see all apps
 * - Premium features show upgrade prompts based on licensing
 *
 * @param organizationId - Organization to assign apps to
 * @param userId - User who triggered the assignment (for audit trail)
 */
export const assignAllAppsToOrg = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assignAllAppsToOrgInternal(ctx, args.organizationId, args.userId);
    return { success: true };
  },
});

/**
 * Provision Starter Templates (Internal Helper)
 *
 * Auto-provisions web app templates for new organizations.
 * This creates template_availability + published_page objects for seamless deployment.
 *
 * SCALABLE DESIGN:
 * - Easy to add new templates (just add to STARTER_TEMPLATES array)
 * - Each template gets its own template_availability + published_page
 * - Published pages are in "draft" status until deployed
 *
 * Templates like Freelancer Portal, Client Portal, Marketing Site, etc.
 * can be added here for future expansion (like Go High Level's template system).
 *
 * @param ctx - Mutation context
 * @param organizationId - Organization to provision templates for
 * @param userId - User who triggered provisioning (for audit trail)
 */
async function provisionStarterTemplatesInternal(
  ctx: any,
  organizationId: any,
  userId: any
): Promise<void> {
  console.log(`[Onboarding] Starting template provisioning for org ${organizationId}`);

  // 1. Get system organization (where templates are stored)
  const systemOrg = await ctx.db
    .query("organizations")
    .withIndex("by_slug", (q: any) => q.eq("slug", "system"))
    .first();

  if (!systemOrg) {
    console.warn("[Onboarding] System organization not found - skipping template provisioning");
    return;
  }

  // 2. Get organization details for metadata
  const org = await ctx.db.get(organizationId);
  if (!org) {
    console.warn("[Onboarding] Organization not found - skipping template provisioning");
    return;
  }

  // 3. Define starter templates to provision
  // 🎯 SCALABLE: Add new templates here as they become available
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
    // 🚀 FUTURE: Add more templates here
    // {
    //   name: "Marketing Landing Page",
    //   templateCode: "marketing_landing_v1",
    //   slug: "/",
    //   description: "Professional marketing site with lead capture",
    //   ...
    // },
  ];

  // 4. Get all system templates (web_app subtype)
  const systemTemplates = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", systemOrg._id).eq("type", "template")
    )
    .filter((q: any) => q.eq(q.field("subtype"), "web_app"))
    .collect();

  console.log(`[Onboarding] Found ${systemTemplates.length} web app templates in system`);

  // 5. Provision each starter template
  for (const starterConfig of STARTER_TEMPLATES) {
    // Find matching system template
    const systemTemplate = systemTemplates.find(
      (t: any) => t.name === starterConfig.name
    );

    if (!systemTemplate) {
      console.warn(`[Onboarding] Template "${starterConfig.name}" not found in system - skipping`);
      continue;
    }

    console.log(`[Onboarding] Provisioning template: ${starterConfig.name}`);

    // Check if template already exists in user's org
    const existingTemplate = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q: any) =>
        q.eq("organizationId", organizationId).eq("type", "template")
      )
      .filter((q: any) =>
        q.eq(q.field("subtype"), "web_app")
      )
      .filter((q: any) =>
        q.eq(q.field("name"), starterConfig.name)
      )
      .first();

    let orgTemplateId;

    if (!existingTemplate) {
      // 🎯 COPY system template to user's organization
      // This follows the pattern you use for other templates
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
          sourceTemplateId: systemTemplate._id, // Track origin
          copiedFromSystem: true,
          copiedAt: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log(`✅ [Onboarding] Copied template "${starterConfig.name}" to org`);
    } else {
      console.log(`✅ [Onboarding] Template "${starterConfig.name}" already exists in org`);
      orgTemplateId = existingTemplate._id;
    }

    // Check if published_page already exists
    const existingPage = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q: any) =>
        q.eq("organizationId", organizationId).eq("type", "published_page")
      )
      .filter((q: any) =>
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
        status: "draft", // Draft until deployed
        customProperties: {
          slug: starterConfig.slug,
          templateCode: starterConfig.templateCode,
          isExternal: true,
          externalDomain: "", // Will be filled when deployed to Vercel

          // SEO metadata
          metaTitle: `${org.name} - ${starterConfig.name}`,
          metaDescription: starterConfig.description,

          // Template configuration
          templateContent: {
            isExternal: true,
            requiresAuth: true,
            authType: "oauth",
            connectedObjects: starterConfig.connectedObjects,
            requiredApiEndpoints: starterConfig.requiredEndpoints,
            requiredScopes: starterConfig.requiredScopes,
          },

          // Deployment metadata - Copy from system template
          deployment: {
            platform: "vercel",
            status: "not_deployed",
            deployedUrl: null,
            deployedAt: null,
            // Copy deployment URLs from system template
            githubRepo: systemTemplate.customProperties?.deployment?.githubRepo || "",
            vercelDeployButton: systemTemplate.customProperties?.deployment?.vercelDeployButton || "",
            deploymentGuide: systemTemplate.customProperties?.deployment?.deploymentGuide || "",
            demoUrl: systemTemplate.customProperties?.deployment?.demoUrl || "",
            // Analytics tracking
            deploymentAttempts: 0,
            lastDeploymentAttempt: null,
            deploymentErrors: [],
          },

          // Branding
          branding: {
            orgName: org.name,
            orgLogo: org.customProperties?.logoUrl || "",
            primaryColor: org.customProperties?.primaryColor || "#6B46C1",
          },
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create objectLink: published_page → user's template (not system template!)
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

      console.log(`✅ [Onboarding] Created published_page for ${starterConfig.name}`);
    }
  }

  console.log(`🎉 [Onboarding] Template provisioning complete for org ${organizationId}`);
}
