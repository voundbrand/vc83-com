/**
 * ORGANIZATION TAX SETTINGS
 *
 * Manages tax configuration for organizations using the ontology system.
 * Designed to support multiple payment providers (Stripe, PayPal, etc.)
 *
 * Schema based on Stripe Tax requirements but generic enough for all providers:
 *
 * 1. organization_tax_settings (type: "organization_settings", subtype: "tax")
 *    - Global tax configuration
 *    - Default tax behavior
 *    - Origin address
 *
 * 2. tax_registration (type: "tax_registration")
 *    - Per-jurisdiction tax registration
 *    - Tax IDs and registration numbers
 *    - Active collection jurisdictions
 *
 * 3. Product-level tax codes
 *    - Stored in product customProperties
 *    - Tax codes (e.g., "txcd_10000000")
 *    - Tax behavior per product
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, requirePermission } from "./rbacHelpers";

/**
 * TAX SETTINGS STRUCTURE
 *
 * Stored as organization_settings with subtype "tax"
 *
 * customProperties: {
 *   // Global Settings
 *   taxEnabled: boolean,
 *   defaultTaxBehavior: "inclusive" | "exclusive" | "automatic",
 *   defaultTaxCode: string, // e.g., "txcd_10000000"
 *
 *   // Origin Address (for tax nexus determination)
 *   originAddress: {
 *     addressLine1: string,
 *     addressLine2?: string,
 *     city: string,
 *     state?: string,
 *     postalCode: string,
 *     country: string,
 *   },
 *
 *   // Legal Entity Information
 *   legalEntityType?: string, // e.g., "GmbH", "SAS", "Ltd"
 *   legalEntityName?: string, // Registered business name
 *   vatNumber?: string, // VAT/Tax ID number
 *   taxIdNumber?: string, // Additional tax ID (if different from VAT)
 *
 *   // Provider-Specific Settings
 *   stripeSettings?: {
 *     taxCalculationEnabled: boolean,
 *     taxCodeValidation: boolean,
 *   },
 *
 *   // Custom Tax Rates (for manual calculation)
 *   customRates?: Array<{
 *     jurisdiction: string, // e.g., "US-CA", "DE", "GB"
 *     rate: number, // e.g., 0.19 for 19%
 *     name: string, // e.g., "California Sales Tax"
 *     type: "sales_tax" | "vat" | "gst" | "other",
 *     active: boolean,
 *   }>,
 * }
 */

/**
 * TAX REGISTRATION STRUCTURE
 *
 * Stored as separate objects with type "tax_registration"
 * One registration per jurisdiction
 *
 * {
 *   type: "tax_registration",
 *   subtype: jurisdiction code (e.g., "US-CA", "DE", "GB"),
 *   name: "California Sales Tax Registration",
 *   status: "active" | "pending" | "inactive",
 *   customProperties: {
 *     jurisdiction: string, // e.g., "US-CA"
 *     jurisdictionName: string, // e.g., "California, United States"
 *     country: string, // ISO code, e.g., "US"
 *     state?: string, // For US/Canada/etc.
 *
 *     // Registration Details
 *     registrationNumber: string, // Tax ID
 *     registrationDate: number, // Timestamp
 *     effectiveDate: number, // When to start collecting
 *     expirationDate?: number, // If temporary
 *
 *     // Tax Authority Info
 *     taxAuthority: string, // e.g., "California Department of Tax and Fee Administration"
 *     filingFrequency: "monthly" | "quarterly" | "annually",
 *
 *     // Provider Integration
 *     stripeRegistrationId?: string,
 *     providerMetadata?: Record<string, unknown>,
 *   }
 * }
 */

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET ORGANIZATION TAX SETTINGS
 * Returns global tax configuration for an organization
 */
export const getTaxSettings = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_settings")
      )
      .filter((q) => q.eq(q.field("subtype"), "tax"))
      .first();

    return settings;
  },
});

/**
 * Get tax settings for public checkout pages (no auth required)
 * Returns only the information needed for tax calculation
 */
export const getPublicTaxSettings = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_settings")
      )
      .filter((q) => q.eq(q.field("subtype"), "tax"))
      .first();

    if (!settings) {
      return null;
    }

    // Return only public-safe tax calculation data
    const customProps = settings.customProperties as Record<string, unknown>;
    return {
      taxEnabled: customProps.taxEnabled as boolean || false,
      defaultTaxBehavior: (customProps.defaultTaxBehavior as "inclusive" | "exclusive" | "automatic") || "exclusive",
      defaultTaxCode: customProps.defaultTaxCode as string || "",
      // Get tax rate from custom rates or origin address
      customRates: customProps.customRates as Array<{
        jurisdiction: string;
        rate: number;
        name: string;
        type: string;
        active: boolean;
      }> || [],
      originAddress: customProps.originAddress as {
        country: string;
        state?: string;
        city: string;
      } || { country: "US", city: "" },
    };
  },
});

/**
 * GET TAX REGISTRATIONS
 * Returns all tax registrations for an organization
 */
export const getTaxRegistrations = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    active: v.optional(v.boolean()), // Filter by active status
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    let registrations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "tax_registration")
      )
      .collect();

    // Filter by active status if specified
    if (args.active !== undefined) {
      const statusFilter = args.active ? "active" : "inactive";
      registrations = registrations.filter((r) => r.status === statusFilter);
    }

    return registrations;
  },
});

/**
 * GET TAX REGISTRATION BY JURISDICTION
 * Returns a specific tax registration for a jurisdiction
 */
export const getTaxRegistrationByJurisdiction = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    jurisdiction: v.string(), // e.g., "US-CA", "DE"
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const registration = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "tax_registration")
      )
      .filter((q) => q.eq(q.field("subtype"), args.jurisdiction))
      .first();

    return registration;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * UPDATE TAX SETTINGS
 * Creates or updates organization tax settings
 */
export const updateTaxSettings = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),

    // Global Settings
    taxEnabled: v.optional(v.boolean()),
    defaultTaxBehavior: v.optional(v.union(
      v.literal("inclusive"),
      v.literal("exclusive"),
      v.literal("automatic")
    )),
    defaultTaxCode: v.optional(v.string()),

    // Origin Address
    originAddress: v.optional(v.object({
      addressLine1: v.string(),
      addressLine2: v.optional(v.string()),
      city: v.string(),
      state: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(),
    })),

    // Legal Entity Information
    legalEntityType: v.optional(v.string()),
    legalEntityName: v.optional(v.string()),
    vatNumber: v.optional(v.string()),
    taxIdNumber: v.optional(v.string()),

    // Provider-Specific
    stripeSettings: v.optional(v.object({
      taxCalculationEnabled: v.optional(v.boolean()),
      taxCodeValidation: v.optional(v.boolean()),
    })),

    // Custom Rates
    customRates: v.optional(v.array(v.object({
      jurisdiction: v.string(),
      rate: v.number(),
      name: v.string(),
      type: v.union(
        v.literal("sales_tax"),
        v.literal("vat"),
        v.literal("gst"),
        v.literal("other")
      ),
      active: v.boolean(),
    }))),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId
    });

    // Get existing settings
    const existingSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_settings")
      )
      .filter((q) => q.eq(q.field("subtype"), "tax"))
      .first();

    const { sessionId, organizationId, ...updates } = args;

    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, {
        customProperties: {
          ...existingSettings.customProperties,
          ...updates,
        },
        updatedAt: Date.now(),
      });
      return existingSettings._id;
    } else {
      // Create new settings
      const org = await ctx.db.get(organizationId);
      if (!org) throw new Error("Organization not found");

      return await ctx.db.insert("objects", {
        organizationId,
        type: "organization_settings",
        subtype: "tax",
        name: `${org.slug}-tax-settings`,
        status: "active",
        customProperties: updates,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * CREATE TAX REGISTRATION
 * Adds a new tax registration for a jurisdiction
 */
export const createTaxRegistration = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),

    // Jurisdiction
    jurisdiction: v.string(), // e.g., "US-CA", "DE"
    jurisdictionName: v.string(), // e.g., "California, United States"
    country: v.string(), // ISO code
    state: v.optional(v.string()),

    // Registration Details
    registrationNumber: v.string(),
    registrationDate: v.number(),
    effectiveDate: v.number(),
    expirationDate: v.optional(v.number()),

    // Tax Authority
    taxAuthority: v.string(),
    filingFrequency: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("annually")
    ),

    // Provider Integration
    stripeRegistrationId: v.optional(v.string()),
    providerMetadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId
    });

    // Check if registration already exists for this jurisdiction
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "tax_registration")
      )
      .filter((q) => q.eq(q.field("subtype"), args.jurisdiction))
      .first();

    if (existing) {
      throw new Error(`Tax registration already exists for ${args.jurisdictionName}`);
    }

    const { sessionId, organizationId, jurisdiction, ...registrationData } = args;

    return await ctx.db.insert("objects", {
      organizationId,
      type: "tax_registration",
      subtype: jurisdiction,
      name: `Tax Registration: ${args.jurisdictionName}`,
      status: "active",
      customProperties: {
        jurisdiction,
        ...registrationData,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * UPDATE TAX REGISTRATION
 * Updates an existing tax registration
 */
export const updateTaxRegistration = mutation({
  args: {
    sessionId: v.string(),
    registrationId: v.id("objects"),

    // Fields that can be updated
    registrationNumber: v.optional(v.string()),
    effectiveDate: v.optional(v.number()),
    expirationDate: v.optional(v.number()),
    filingFrequency: v.optional(v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("annually")
    )),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("pending"),
      v.literal("inactive")
    )),
    stripeRegistrationId: v.optional(v.string()),
    providerMetadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const registration = await ctx.db.get(args.registrationId);
    if (!registration || registration.type !== "tax_registration") {
      throw new Error("Tax registration not found");
    }

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: registration.organizationId
    });

    const { sessionId, registrationId, status, ...updates } = args;

    const patch: Partial<typeof registration> = {
      updatedAt: Date.now(),
    };

    if (status) patch.status = status;

    if (Object.keys(updates).length > 0) {
      patch.customProperties = {
        ...registration.customProperties,
        ...updates,
      };
    }

    await ctx.db.patch(registrationId, patch);
    return registrationId;
  },
});

/**
 * DELETE TAX REGISTRATION
 * Soft deletes a tax registration (sets status to inactive)
 */
export const deleteTaxRegistration = mutation({
  args: {
    sessionId: v.string(),
    registrationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const registration = await ctx.db.get(args.registrationId);
    if (!registration || registration.type !== "tax_registration") {
      throw new Error("Tax registration not found");
    }

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: registration.organizationId
    });

    await ctx.db.patch(args.registrationId, {
      status: "inactive",
      updatedAt: Date.now(),
    });

    return args.registrationId;
  },
});
