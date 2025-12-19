/**
 * UNIFIED DOMAIN CONFIGURATION ONTOLOGY
 *
 * Single source of truth for all domain-related configurations per organization.
 * Supports: Email, Web Publishing, API Access, Branding
 *
 * Architecture:
 * - Core properties (always present): domainName, verification
 * - Capabilities (feature flags): email, api, branding, webPublishing
 * - Optional context-specific properties based on enabled capabilities
 * - Reusable across multiple systems with unified licensing
 *
 * Licensing:
 * - maxCustomDomains enforced: FREE: 1, STARTER: 1, PRO: 3, AGENCY: 5, ENTERPRISE: unlimited
 * - Badge required ONLY if: tier === "free" AND capabilities.api === true
 */

import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, checkPermission } from "./rbacHelpers";
import { getLicenseInternal } from "./licensing/helpers";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateVerificationToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .trim();
}

function extractDomain(origin: string): string {
  try {
    if (origin.includes("://")) {
      const url = new URL(origin);
      return normalizeDomain(url.hostname);
    }
    return normalizeDomain(origin);
  } catch {
    return normalizeDomain(origin);
  }
}

// ============================================================================
// 1. CREATE DOMAIN CONFIGURATION
// ============================================================================

/**
 * CREATE UNIFIED DOMAIN CONFIGURATION
 *
 * Creates a new domain configuration with specified capabilities.
 * Enforces license limits on maxCustomDomains.
 */
export const createDomainConfig = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    domainName: v.string(),

    // Capabilities: Which features are enabled for this domain
    capabilities: v.object({
      email: v.optional(v.boolean()),         // Can send emails via Resend
      api: v.optional(v.boolean()),           // Can make API requests
      branding: v.optional(v.boolean()),      // Has custom branding config
      webPublishing: v.optional(v.boolean()), // Has web publishing config
    }),

    // API Access Configuration (if capabilities.api = true)
    apiKeyId: v.optional(v.id("apiKeys")),    // Link to API key
    includeSubdomains: v.optional(v.boolean()), // Match *.domain.com

    // Required: Branding (used across all contexts)
    branding: v.object({
      logoUrl: v.string(),
      primaryColor: v.string(),
      secondaryColor: v.string(),
      accentColor: v.optional(v.string()),
      fontFamily: v.optional(v.string()),
    }),

    // Optional: Email configuration (if capabilities.email = true)
    email: v.optional(v.object({
      emailDomain: v.string(),        // Domain verified in Resend (e.g., "mail.pluseins.gg")
      senderEmail: v.string(),        // Default sender (e.g., "noreply@mail.pluseins.gg")
      systemEmail: v.string(),        // System notifications (e.g., "system@mail.pluseins.gg")
      salesEmail: v.string(),         // Sales inquiries (e.g., "sales@pluseins.gg")
      replyToEmail: v.string(),       // Reply-to address (e.g., "reply@pluseins.gg")
      defaultTemplateCode: v.optional(v.string()), // Default email template code
    })),

    // Optional: Web publishing configuration (if capabilities.webPublishing = true)
    webPublishing: v.optional(v.object({
      templateId: v.optional(v.string()),
      isExternal: v.optional(v.boolean()),
      siteUrl: v.optional(v.string()),
      metaTags: v.optional(v.object({
        title: v.string(),
        description: v.string(),
      })),
    })),

    // Template Set Override
    templateSetId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // 2. Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_integrations",
      args.organizationId
    );

    if (!hasPermission) {
      throw new Error("You don't have permission to manage domains for this organization");
    }

    // 3b. CHECK FEATURE ACCESS: Custom domains require Professional+
    const { checkFeatureAccess } = await import("./licensing/helpers");
    await checkFeatureAccess(ctx, args.organizationId, "customDomainsEnabled");

    // 3c. CHECK DOMAIN LIMIT: Enforce maxCustomDomains limit for organization's tier
    // Note: Domains are stored as type="configuration" with subtype="domain", so we need custom counting
    const license = await getLicenseInternal(ctx, args.organizationId);
    const maxDomains = license.limits.maxCustomDomains;

    // If not unlimited, check current domain count
    if (maxDomains !== -1) {
      const existingDomains = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "configuration")
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("subtype"), "domain"),
            q.eq(q.field("status"), "active")
          )
        )
        .collect();

      const currentCount = existingDomains.length;

      // Check if limit would be exceeded
      if (currentCount >= maxDomains) {
        // Use same tier upgrade path as checkResourceLimit
        const tierNames: Record<string, string> = {
          free: "Starter (€199/month)",
          starter: "Professional (€399/month)",
          professional: "Agency (€599/month)",
          agency: "Enterprise (€1,500+/month)",
          enterprise: "Enterprise (contact sales)",
        };
        const nextTier = tierNames[license.planTier] || "a higher tier";

        throw new Error(
          `You've reached your maxCustomDomains limit (${maxDomains}). ` +
          `Upgrade to ${nextTier} for more capacity.`
        );
      }
    }

    // 5. Normalize domain
    const cleanDomain = normalizeDomain(args.domainName);

    if (!cleanDomain || cleanDomain.includes(" ")) {
      throw new Error("Invalid domain format. Please enter a valid domain (e.g., example.com)");
    }

    // 6. Check if domain already exists
    const existingDomain = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "configuration")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("subtype"), "domain"),
          q.eq(q.field("customProperties.domainName"), cleanDomain),
          q.eq(q.field("status"), "active")
        )
      )
      .first();

    if (existingDomain) {
      throw new Error(`Domain ${cleanDomain} is already configured for this organization`);
    }

    // 7. Determine if this is localhost/development
    const isDevelopment =
      cleanDomain.includes("localhost") ||
      cleanDomain.includes("127.0.0.1") ||
      cleanDomain.endsWith(".local");

    // 8. Generate verification token
    const verificationToken = generateVerificationToken();

    // 9. Determine badge requirement (only for free tier with API enabled)
    const badgeRequired = license.features.badgeRequired && (args.capabilities.api === true);

    // 9b. CHECK LICENSE LIMIT: Enforce websites per key limit (if API capability enabled and API key provided)
    if (args.capabilities.api && args.apiKeyId) {
      // Count how many domain configs are already linked to this API key
      // Check both new type (domain_config) and legacy type (configuration/domain)
      const newTypeConfigs = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "domain_config")
        )
        .collect();

      const legacyTypeConfigs = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "configuration")
        )
        .filter((q) => q.eq(q.field("subtype"), "domain"))
        .collect();

      // Filter in JavaScript to check apiKeyId in customProperties
      const linkedConfigs = [
        ...newTypeConfigs.filter((c) => (c.customProperties as any)?.apiKeyId === args.apiKeyId),
        ...legacyTypeConfigs.filter((c) => (c.customProperties as any)?.apiKeyId === args.apiKeyId),
      ];

      const websitesCount = linkedConfigs.length;
      const limit = license.limits.maxWebsitesPerKey;

      if (limit !== -1 && websitesCount >= limit) {
        const { ConvexError } = await import("convex/values");
        const tierNames: Record<string, string> = {
          free: "Starter (€199/month)",
          starter: "Professional (€399/month)",
          professional: "Agency (€599/month)",
          agency: "Enterprise (€1,500+/month)",
          enterprise: "Enterprise (contact sales)",
        };
        const nextTier = tierNames[license.planTier] || "a higher tier";
        throw new ConvexError({
          code: "LIMIT_EXCEEDED",
          message: `You've reached your maxWebsitesPerKey limit (${limit}). ` +
            `Upgrade to ${nextTier} for more capacity.`,
          limitKey: "maxWebsitesPerKey",
          currentCount: websitesCount,
          limit,
          planTier: license.planTier,
          nextTier,
          isNested: true,
        });
      }
    }

    // 10. Create domain configuration
    const configId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "domain_config",
      subtype: "main",
      name: `${cleanDomain} Configuration`,
      status: isDevelopment ? "active" : "pending", // Pending until verified
      customProperties: {
        // Core domain info
        domainName: cleanDomain,
        includeSubdomains: args.includeSubdomains || false,

        // Verification
        verificationToken,
        domainVerified: isDevelopment, // Auto-verify localhost
        verificationMethod: "badge_endpoint", // Default method
        verifiedAt: isDevelopment ? Date.now() : undefined,

        // Capabilities
        capabilities: {
          email: args.capabilities.email || false,
          api: args.capabilities.api || false,
          branding: args.capabilities.branding || false,
          webPublishing: args.capabilities.webPublishing || false,
        },

        // API Access (if enabled)
        ...(args.capabilities.api && args.apiKeyId && {
          apiKeyId: args.apiKeyId,
          badgeRequired,
          badgeVerified: false,
          lastBadgeCheck: 0,
          badgeCheckInterval: 24 * 60 * 60 * 1000, // 24 hours
          failedBadgeChecks: 0,
        }),

        // Branding
        branding: args.branding,

        // Email config (if provided)
        ...(args.email && {
          email: {
            ...args.email,
            domainVerified: isDevelopment, // Assume verified for localhost
            verifiedAt: isDevelopment ? Date.now() : undefined,
          }
        }),

        // Web publishing config (if provided)
        ...(args.webPublishing && {
          webPublishing: args.webPublishing
        }),
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      configId,
      domain: cleanDomain,
      verificationToken,
      badgeRequired,
      isDevelopment,
      instructions: badgeRequired ? {
        step1: "Add the l4yercak3 badge component to your website",
        step2: "Add the verification endpoint to /.well-known/l4yercak3-verify",
        step3: "Click 'Verify Domain' to complete setup",
      } : {
        step1: "Add the verification endpoint to /.well-known/l4yercak3-verify",
        step2: "Click 'Verify Domain' to complete setup",
      },
    };
  },
});

// ============================================================================
// 2. VERIFY DOMAIN OWNERSHIP
// ============================================================================

/**
 * VERIFY DOMAIN OWNERSHIP
 *
 * Triggers HTTP verification of domain ownership via badge endpoint.
 */
export const verifyDomainOwnership = mutation({
  args: {
    sessionId: v.string(),
    configId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // 2. Get domain config
    const config = await ctx.db.get(args.configId);
    if (!config || config.type !== "configuration" || config.subtype !== "domain") {
      throw new Error("Domain configuration not found");
    }

    // 3. Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_integrations",
      config.organizationId
    );

    if (!hasPermission) {
      throw new Error("You don't have permission to verify this domain");
    }

    const props = config.customProperties as any;

    // 4. Check if already verified
    if (props.domainVerified && config.status === "active") {
      return {
        success: true,
        alreadyVerified: true,
        domain: props.domainName,
      };
    }

    // 5. Schedule HTTP verification (async action)
    await ctx.scheduler.runAfter(0, internal.licensing.badgeVerification.verifyDomainBadgeInternal, {
      configId: args.configId,
    });

    return {
      success: true,
      message: "Verification check started. This may take a few seconds.",
      checkBackIn: "5-10 seconds",
    };
  },
});

// ============================================================================
// 3. UPDATE DOMAIN CONFIGURATION
// ============================================================================

/**
 * UPDATE DOMAIN CONFIGURATION
 *
 * Allows editing capabilities and settings for an existing domain.
 */
export const updateDomainConfig = mutation({
  args: {
    sessionId: v.string(),
    configId: v.id("objects"),

    // Update capabilities
    capabilities: v.optional(v.object({
      email: v.optional(v.boolean()),
      api: v.optional(v.boolean()),
      branding: v.optional(v.boolean()),
      webPublishing: v.optional(v.boolean()),
    })),

    // Update API settings
    apiKeyId: v.optional(v.id("apiKeys")),
    includeSubdomains: v.optional(v.boolean()),

    // Update branding
    branding: v.optional(v.object({
      logoUrl: v.string(),
      primaryColor: v.string(),
      secondaryColor: v.string(),
      accentColor: v.optional(v.string()),
      fontFamily: v.optional(v.string()),
    })),

    // Update email config
    email: v.optional(v.object({
      emailDomain: v.string(),
      senderEmail: v.string(),
      systemEmail: v.string(),
      salesEmail: v.string(),
      replyToEmail: v.string(),
      defaultTemplateCode: v.optional(v.string()),
    })),

    // Update web publishing config
    webPublishing: v.optional(v.object({
      templateId: v.optional(v.string()),
      isExternal: v.optional(v.boolean()),
      siteUrl: v.optional(v.string()),
      metaTags: v.optional(v.object({
        title: v.string(),
        description: v.string(),
      })),
    })),

    templateSetId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // 2. Get existing config
    const existing = await ctx.db.get(args.configId);
    if (!existing || existing.type !== "configuration" || existing.subtype !== "domain") {
      throw new Error("Domain configuration not found");
    }

    // 3. Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_integrations",
      existing.organizationId
    );

    if (!hasPermission) {
      throw new Error("You don't have permission to update this domain");
    }

    const customProperties = existing.customProperties as any;

    // 4. If enabling API capability, check license and determine badge requirement
    let badgeRequired = customProperties.badgeRequired;
    if (args.capabilities?.api && !customProperties.capabilities?.api) {
      const license = await getLicenseInternal(ctx, existing.organizationId);
      badgeRequired = license.features.badgeRequired;
    }

    // 4b. CHECK LICENSE LIMIT: Enforce websites per key limit (if API key is being set/changed)
    if (args.apiKeyId && args.capabilities?.api) {
      const apiKeyIdToCheck = args.apiKeyId;
      // Count how many domain configs are already linked to this API key (excluding current one)
      const newTypeConfigs = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", existing.organizationId).eq("type", "domain_config")
        )
        .collect();

      const legacyTypeConfigs = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", existing.organizationId).eq("type", "configuration")
        )
        .filter((q) => q.eq(q.field("subtype"), "domain"))
        .collect();

      // Filter in JavaScript to check apiKeyId in customProperties (excluding current config)
      const linkedConfigs = [
        ...newTypeConfigs.filter((c) => 
          c._id !== args.configId && (c.customProperties as any)?.apiKeyId === apiKeyIdToCheck
        ),
        ...legacyTypeConfigs.filter((c) => 
          c._id !== args.configId && (c.customProperties as any)?.apiKeyId === apiKeyIdToCheck
        ),
      ];

      const websitesCount = linkedConfigs.length;
      const license = await getLicenseInternal(ctx, existing.organizationId);
      const limit = license.limits.maxWebsitesPerKey;

      if (limit !== -1 && websitesCount >= limit) {
        const { ConvexError } = await import("convex/values");
        const tierNames: Record<string, string> = {
          free: "Starter (€199/month)",
          starter: "Professional (€399/month)",
          professional: "Agency (€599/month)",
          agency: "Enterprise (€1,500+/month)",
          enterprise: "Enterprise (contact sales)",
        };
        const nextTier = tierNames[license.planTier] || "a higher tier";
        throw new ConvexError({
          code: "LIMIT_EXCEEDED",
          message: `You've reached your maxWebsitesPerKey limit (${limit}). ` +
            `Upgrade to ${nextTier} for more capacity.`,
          limitKey: "maxWebsitesPerKey",
          currentCount: websitesCount,
          limit,
          planTier: license.planTier,
          nextTier,
          isNested: true,
        });
      }
    }

    // 5. Update configuration
    await ctx.db.patch(args.configId, {
      customProperties: {
        ...customProperties,
        ...(args.capabilities && {
          capabilities: {
            ...customProperties.capabilities,
            ...args.capabilities,
          }
        }),
        ...(args.includeSubdomains !== undefined && { includeSubdomains: args.includeSubdomains }),
        ...(args.apiKeyId && { apiKeyId: args.apiKeyId }),
        ...(args.capabilities?.api && {
          badgeRequired,
          badgeVerified: customProperties.badgeVerified || false,
          lastBadgeCheck: customProperties.lastBadgeCheck || 0,
          badgeCheckInterval: customProperties.badgeCheckInterval || 24 * 60 * 60 * 1000,
          failedBadgeChecks: customProperties.failedBadgeChecks || 0,
        }),
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

// ============================================================================
// 4. DELETE/DEACTIVATE DOMAIN
// ============================================================================

/**
 * DELETE DOMAIN CONFIGURATION
 *
 * Sets status to inactive (soft delete).
 */
export const deleteDomainConfig = mutation({
  args: {
    sessionId: v.string(),
    configId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // 2. Get config
    const config = await ctx.db.get(args.configId);
    if (!config) {
      throw new Error("Domain configuration not found");
    }

    // 3. Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_integrations",
      config.organizationId
    );

    if (!hasPermission) {
      throw new Error("You don't have permission to delete this domain");
    }

    // 4. Soft delete
    await ctx.db.patch(args.configId, {
      status: "inactive",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// 5. QUERY DOMAIN CONFIGURATIONS
// ============================================================================

/**
 * GET DOMAIN CONFIG BY ID
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
 * GET DOMAIN CONFIG BY DOMAIN NAME
 */
export const getDomainConfigByDomain = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    domainName: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanDomain = normalizeDomain(args.domainName);

    const config = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "configuration")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("subtype"), "domain"),
          q.eq(q.field("customProperties.domainName"), cleanDomain),
          q.eq(q.field("status"), "active")
        )
      )
      .first();

    if (!config) {
      throw new Error(`No domain config found for ${cleanDomain}`);
    }

    return config;
  },
});

/**
 * LIST ALL DOMAIN CONFIGS FOR ORGANIZATION
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
 * GET DOMAIN STATUS (with API key info)
 */
export const getDomainStatus = query({
  args: {
    sessionId: v.string(),
    configId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // 2. Get domain config
    const config = await ctx.db.get(args.configId);
    if (!config || config.type !== "configuration" || config.subtype !== "domain") {
      throw new Error("Domain configuration not found");
    }

    // 3. Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_integrations",
      config.organizationId
    );

    if (!hasPermission) {
      throw new Error("You don't have permission to view this domain");
    }

    const props = config.customProperties as any;

    // 4. Get API key details if linked
    let apiKey = null;
    if (props.apiKeyId) {
      const key = await ctx.db.get(props.apiKeyId);
      if (key && 'name' in key && 'status' in key && 'key' in key) {
        apiKey = {
          _id: key._id,
          name: key.name as string,
          status: key.status as string,
          keyPreview: `${(key.key as string).substring(0, 20)}...`,
        };
      }
    }

    return {
      ...config,
      apiKey,
    };
  },
});

// ============================================================================
// 6. INTERNAL QUERIES FOR API MIDDLEWARE
// ============================================================================

/**
 * INTERNAL: Verify API request with domain validation
 *
 * Used by API middleware to check if a request origin is authorized.
 */
export const verifyApiRequestWithDomain = internalQuery({
  args: {
    apiKey: v.string(),
    origin: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Verify API key exists and is active (hashed keys only)
    if (!args.apiKey.startsWith("sk_live_") && !args.apiKey.startsWith("sk_test_")) {
      return {
        valid: false,
        error: "Invalid API key format",
        errorCode: "INVALID_API_KEY",
      };
    }

    const keyPrefix = args.apiKey.substring(0, 12);
    const possibleKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_key_prefix", (q) => q.eq("keyPrefix", keyPrefix))
      .collect();

    const apiKeyRecord = possibleKeys.find(k => k.status === "active");

    if (!apiKeyRecord) {
      return {
        valid: false,
        error: "Invalid API key",
        errorCode: "INVALID_API_KEY",
      };
    }

    if (apiKeyRecord.status !== "active") {
      return {
        valid: false,
        error: "API key has been revoked",
        errorCode: "API_KEY_REVOKED",
      };
    }

    // 2. Extract domain from origin
    const requestDomain = extractDomain(args.origin);

    // 3. Check for localhost/development (allow without configuration)
    const isDevelopment =
      requestDomain.includes("localhost") ||
      requestDomain.includes("127.0.0.1") ||
      requestDomain.endsWith(".local");

    if (isDevelopment) {
      console.log(`[API Auth] Development request from ${requestDomain}`);
      return {
        valid: true,
        organizationId: apiKeyRecord.organizationId,
        userId: apiKeyRecord.createdBy,
        apiKeyId: apiKeyRecord._id,
        domain: requestDomain,
        isDevelopment: true,
      };
    }

    // 4. Find domain configuration linked to this API key
    const domainConfig = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", apiKeyRecord.organizationId)
         .eq("type", "configuration")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("subtype"), "domain"),
          q.eq(q.field("customProperties.apiKeyId"), apiKeyRecord._id),
          q.eq(q.field("customProperties.domainName"), requestDomain),
          q.eq(q.field("status"), "active")
        )
      )
      .first();

    if (!domainConfig) {
      return {
        valid: false,
        error: `Domain ${requestDomain} is not configured for this API key. Please add domain configuration in Settings → Domains.`,
        errorCode: "DOMAIN_NOT_CONFIGURED",
        requestDomain,
      };
    }

    const props = domainConfig.customProperties as any;

    // 5. Check if API capability is enabled
    if (!props.capabilities?.api) {
      return {
        valid: false,
        error: `API access is not enabled for domain ${requestDomain}. Please enable API capability in domain configuration.`,
        errorCode: "API_NOT_ENABLED",
        requestDomain,
      };
    }

    // 6. Check domain verification
    if (!props.domainVerified) {
      return {
        valid: false,
        error: `Domain ${requestDomain} has not been verified. Please complete verification in Settings → Domains.`,
        errorCode: "DOMAIN_NOT_VERIFIED",
        requestDomain,
      };
    }

    // 7. Check if domain is suspended (badge removed on free tier)
    if (domainConfig.status === "suspended") {
      return {
        valid: false,
        error:
          `API access suspended for ${requestDomain}. ` +
          (props.badgeRequired
            ? `Please ensure the "Powered by l4yercak3" badge is visible on your site, or upgrade to Starter (€199/month) to remove the badge requirement.`
            : "Please contact support."),
        errorCode: "DOMAIN_SUSPENDED",
        requestDomain,
        badgeRequired: props.badgeRequired,
      };
    }

    // 8. All checks passed - request is valid
    return {
      valid: true,
      organizationId: apiKeyRecord.organizationId,
      userId: apiKeyRecord.createdBy,
      apiKeyId: apiKeyRecord._id,
      domainId: domainConfig._id,
      domain: requestDomain,
      badgeRequired: props.badgeRequired || false,
      isDevelopment: false,
    };
  },
});

/**
 * INTERNAL: Get domain config for verification
 */
export const getDomainConfigInternal = internalQuery({
  args: {
    configId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.configId);
  },
});

/**
 * INTERNAL: Get domains needing badge verification
 */
export const getDomainsNeedingVerification = internalQuery({
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    // Get all active domain configs with API capability and badge required
    const allDomains = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "configuration"))
      .filter((q) =>
        q.and(
          q.eq(q.field("subtype"), "domain"),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    // Filter for domains that need verification
    return allDomains.filter((domain) => {
      const props = domain.customProperties as any;
      return (
        props.capabilities?.api &&
        props.badgeRequired &&
        props.lastBadgeCheck < oneDayAgo
      );
    });
  },
});

/**
 * INTERNAL: Update badge status after verification
 */
export const updateBadgeStatusInternal = internalMutation({
  args: {
    configId: v.id("objects"),
    domainVerified: v.optional(v.boolean()),
    badgeVerified: v.optional(v.boolean()),
    lastBadgeCheck: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("suspended")
    )),
    suspensionReason: v.optional(v.string()),
    failedBadgeChecks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db.get(args.configId);
    if (!config) return;

    const props = config.customProperties as any;

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.domainVerified !== undefined) {
      props.domainVerified = args.domainVerified;
      if (args.domainVerified) {
        props.verifiedAt = Date.now();
      }
    }

    if (args.badgeVerified !== undefined) {
      props.badgeVerified = args.badgeVerified;
    }

    if (args.lastBadgeCheck !== undefined) {
      props.lastBadgeCheck = args.lastBadgeCheck;
    }

    if (args.failedBadgeChecks !== undefined) {
      props.failedBadgeChecks = args.failedBadgeChecks;
    }

    if (args.status !== undefined && args.status !== config.status) {
      updates.status = args.status;

      if (args.status === "suspended") {
        props.suspendedAt = Date.now();
        props.suspensionReason = args.suspensionReason || "Badge verification failed";
      }
    }

    updates.customProperties = props;

    await ctx.db.patch(args.configId, updates);
  },
});

/**
 * INTERNAL: List domain configs for an organization (for use from actions)
 * Supports both new type (domain_config) and legacy type (configuration/domain)
 */
export const listDomainConfigsForOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Try new type first (domain_config)
    const newTypeConfigs = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "domain_config")
      )
      .collect();

    // Also check legacy type (configuration/domain)
    const legacyConfigs = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "configuration")
      )
      .filter((q) => q.eq(q.field("subtype"), "domain"))
      .collect();

    return [...newTypeConfigs, ...legacyConfigs];
  },
});

// ============================================================================
// 7. BADGE VERIFICATION ACTION (HTTP CHECK)
// ============================================================================

/**
 * INTERNAL ACTION: Verify domain badge via HTTP
 *
 * Makes HTTP request to customer's website to verify badge presence.
 * Implementation is in licensing/badgeVerification.ts
 */
// Export reference - actual implementation in licensing/badgeVerification.ts
// This prevents circular dependency issues
