/**
 * ORGANIZATION ONTOLOGY HELPERS
 *
 * Helper functions for managing organization data in the ontology system.
 * Organizations use the ontology pattern for flexible, extensible data storage.
 *
 * Core Patterns:
 * - organization_profile: Industry, bio, employee count, etc.
 * - organization_legal: Tax ID, VAT, registration numbers
 * - organization_contact: Emails, phones, website
 * - organization_social: Social media links
 * - organization_settings: Branding, locale, invoicing settings
 * - address (with subtypes): Physical, billing, shipping, mailing addresses
 */

import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, requirePermission } from "./rbacHelpers";
import { translateObject, translateObjects } from "./translationResolver";

/**
 * GET ORGANIZATION PROFILE
 * Retrieves profile information (industry, bio, employee count, etc.)
 *
 * @param locale - Optional locale for translation (e.g., "en", "de", "pl")
 */
export const getOrganizationProfile = query({
  args: {
    organizationId: v.id("organizations"),
    locale: v.optional(v.string())
  },
  handler: async (ctx, { organizationId, locale = "en" }) => {
    const profile = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "organization_profile")
      )
      .first();

    if (!profile) return null;

    // ✅ Translate profile fields based on locale
    return await translateObject(ctx, profile, locale);
  },
});

/**
 * GET ORGANIZATION LEGAL INFO
 * Retrieves legal information (tax ID, VAT, registration numbers)
 */
export const getOrganizationLegal = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "organization_legal")
      )
      .first();
  },
});

/**
 * GET ORGANIZATION CONTACT INFO
 * Retrieves contact information (emails, phones, website)
 */
export const getOrganizationContact = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "organization_contact")
      )
      .first();
  },
});

/**
 * GET ORGANIZATION SOCIAL MEDIA
 * Retrieves social media links (LinkedIn, Twitter, Facebook, etc.)
 */
export const getOrganizationSocial = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "organization_social")
      )
      .first();
  },
});

/**
 * GET ORGANIZATION SETTINGS
 * Retrieves settings by subtype (branding, locale, invoicing, etc.)
 */
export const getOrganizationSettings = query({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // "branding", "locale", "invoicing", etc.
  },
  handler: async (ctx, args) => {
    const baseQuery = ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_settings")
      );

    if (args.subtype) {
      return await baseQuery
        .filter(q => q.eq(q.field("subtype"), args.subtype))
        .first();
    }

    return await baseQuery.collect();
  },
});

/**
 * GET ORGANIZATION ADDRESSES
 * Retrieves organization addresses, optionally filtered by subtype
 *
 * @param locale - Optional locale for translation (e.g., "en", "de", "pl")
 */
export const getOrganizationAddresses = query({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // "billing", "shipping", "physical", "mailing", etc.
    locale: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const baseQuery = ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "address")
      );

    let addresses;
    if (args.subtype) {
      addresses = await baseQuery
        .filter(q => q.eq(q.field("subtype"), args.subtype))
        .collect();
    } else {
      addresses = await baseQuery.collect();
    }

    // ✅ Translate all addresses based on locale
    return await translateObjects(ctx, addresses, args.locale || "en");
  },
});

/**
 * GET PRIMARY ADDRESS
 * Retrieves the primary address for an organization
 *
 * @param locale - Optional locale for translation (e.g., "en", "de", "pl")
 */
export const getPrimaryAddress = query({
  args: {
    organizationId: v.id("organizations"),
    locale: v.optional(v.string())
  },
  handler: async (ctx, { organizationId, locale = "en" }) => {
    const address = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "address")
      )
      .filter(q => q.eq(q.field("customProperties.isPrimary"), true))
      .first();

    if (!address) return null;

    // ✅ Translate address fields based on locale
    return await translateObject(ctx, address, locale);
  },
});

// ============================================================================
// INTERNAL QUERIES (for use in actions without triggering deep type instantiation)
// ============================================================================

/**
 * GET ORGANIZATION SETTINGS (INTERNAL)
 * Internal version without auth check, for use in actions
 */
export const getOrganizationSettingsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const baseQuery = ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_settings")
      );

    if (args.subtype) {
      return await baseQuery
        .filter(q => q.eq(q.field("subtype"), args.subtype))
        .first();
    }

    return await baseQuery.collect();
  },
});

/**
 * GET PRIMARY ADDRESS (INTERNAL)
 * Internal version without auth check, for use in actions
 */
export const getPrimaryAddressInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "address")
      )
      .filter(q => q.eq(q.field("customProperties.isPrimary"), true))
      .first();
  },
});

/**
 * UPDATE ORGANIZATION PROFILE
 * Creates or updates organization profile information
 */
export const updateOrganizationProfile = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    industry: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    employeeCount: v.optional(v.string()),
    bio: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId
    });

    // Get existing profile
    const profile = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_profile")
      )
      .first();

    const { organizationId, ...updates } = args;

    if (profile) {
      // Update existing profile
      await ctx.db.patch(profile._id, {
        customProperties: {
          ...profile.customProperties,
          ...updates,
        },
        updatedAt: Date.now(),
      });
      return profile._id;
    } else {
      // Create new profile
      const org = await ctx.db.get(organizationId);
      if (!org) throw new Error("Organisation nicht gefunden");

      return await ctx.db.insert("objects", {
        organizationId,
        type: "organization_profile",
        name: `${org.slug}-profile`,
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
 * UPDATE ORGANIZATION LEGAL
 * Creates or updates organization legal information and tax collection settings
 */
export const updateOrganizationLegal = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    taxId: v.optional(v.string()),
    vatNumber: v.optional(v.string()),
    companyRegistrationNumber: v.optional(v.string()),
    legalEntityType: v.optional(v.string()),
    // Tax Collection Settings
    taxEnabled: v.optional(v.boolean()),
    defaultTaxBehavior: v.optional(v.union(
      v.literal("inclusive"),
      v.literal("exclusive"),
      v.literal("automatic")
    )),
    defaultTaxCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId
    });

    const legal = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_legal")
      )
      .first();

    const { organizationId, ...updates } = args;

    if (legal) {
      await ctx.db.patch(legal._id, {
        customProperties: {
          ...legal.customProperties,
          ...updates,
        },
        updatedAt: Date.now(),
      });
      return legal._id;
    } else {
      const org = await ctx.db.get(organizationId);
      if (!org) throw new Error("Organisation nicht gefunden");

      return await ctx.db.insert("objects", {
        organizationId,
        type: "organization_legal",
        name: `${org.slug}-legal`,
        status: "verified",
        customProperties: updates,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * UPDATE ORGANIZATION CONTACT
 * Creates or updates organization contact information
 */
export const updateOrganizationContact = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    contactEmail: v.optional(v.string()),
    billingEmail: v.optional(v.string()),
    supportEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    faxNumber: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId
    });

    const contact = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_contact")
      )
      .first();

    const { organizationId, ...updates } = args;

    if (contact) {
      await ctx.db.patch(contact._id, {
        customProperties: {
          ...contact.customProperties,
          ...updates,
        },
        updatedAt: Date.now(),
      });
      return contact._id;
    } else {
      const org = await ctx.db.get(organizationId);
      if (!org) throw new Error("Organisation nicht gefunden");

      return await ctx.db.insert("objects", {
        organizationId,
        type: "organization_contact",
        name: `${org.slug}-contact`,
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
 * UPDATE ORGANIZATION SOCIAL
 * Creates or updates organization social media links
 */
export const updateOrganizationSocial = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    linkedin: v.optional(v.string()),
    twitter: v.optional(v.string()),
    facebook: v.optional(v.string()),
    instagram: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId
    });

    const social = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_social")
      )
      .first();

    const { organizationId, ...updates } = args;

    if (social) {
      await ctx.db.patch(social._id, {
        customProperties: {
          ...social.customProperties,
          ...updates,
        },
        updatedAt: Date.now(),
      });
      return social._id;
    } else {
      const org = await ctx.db.get(organizationId);
      if (!org) throw new Error("Organisation nicht gefunden");

      return await ctx.db.insert("objects", {
        organizationId,
        type: "organization_social",
        name: `${org.slug}-social`,
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
 * UPDATE ORGANIZATION SETTINGS
 * Creates or updates organization settings by subtype
 */
export const updateOrganizationSettings = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(), // "branding", "locale", "invoicing", etc.
    settings: v.record(v.string(), v.any()),
  },
  handler: async (ctx, args) => {
    console.log("🟢 [BACKEND] updateOrganizationSettings called");
    console.log("🟢 [BACKEND] organizationId:", args.organizationId);
    console.log("🟢 [BACKEND] subtype:", args.subtype);
    console.log("🟢 [BACKEND] settings:", args.settings);

    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId
    });

    const settingsObj = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_settings")
      )
      .filter(q => q.eq(q.field("subtype"), args.subtype))
      .first();

    console.log("🟢 [BACKEND] Existing settings object found:", !!settingsObj);
    if (settingsObj) {
      console.log("🟢 [BACKEND] Existing customProperties:", settingsObj.customProperties);
    }

    if (settingsObj) {
      const updatedProps = {
        ...settingsObj.customProperties,
        ...args.settings,
      };
      console.log("🟢 [BACKEND] Updating with merged customProperties:", updatedProps);

      await ctx.db.patch(settingsObj._id, {
        customProperties: updatedProps,
        updatedAt: Date.now(),
      });
      console.log("✅ [BACKEND] Settings updated successfully for subtype:", args.subtype);
      return settingsObj._id;
    } else {
      const org = await ctx.db.get(args.organizationId);
      if (!org) throw new Error("Organisation nicht gefunden");

      console.log("🟢 [BACKEND] Creating new settings object with:", args.settings);
      const newId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "organization_settings",
        subtype: args.subtype,
        name: `${org.slug}-settings-${args.subtype}`,
        status: "active",
        customProperties: args.settings,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("✅ [BACKEND] New settings object created with ID:", newId);
      return newId;
    }
  },
});

/**
 * CREATE ORGANIZATION ADDRESS
 * Adds a new address for an organization
 */
export const createOrganizationAddress = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(), // "billing", "shipping", "physical", "mailing", "other"
    name: v.string(),
    description: v.optional(v.string()),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    city: v.string(),
    state: v.optional(v.string()),
    postalCode: v.string(),
    country: v.string(),
    region: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    isPrimary: v.optional(v.boolean()),
    isTaxOrigin: v.optional(v.boolean()),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: args.organizationId
    });

    const { organizationId, subtype, name, description, ...addressProps } = args;

    return await ctx.db.insert("objects", {
      organizationId,
      type: "address",
      subtype,
      name,
      description,
      status: "active",
      customProperties: addressProps,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * UPDATE ORGANIZATION ADDRESS
 * Updates an existing organization address
 */
export const updateOrganizationAddress = mutation({
  args: {
    sessionId: v.string(),
    addressId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    isPrimary: v.optional(v.boolean()),
    isTaxOrigin: v.optional(v.boolean()),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const address = await ctx.db.get(args.addressId);
    if (!address) throw new Error("Adresse nicht gefunden");
    if (address.type !== "address") throw new Error("Ungültiger Objekttyp");

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: address.organizationId
    });

    const { addressId, name, description, ...updates } = args;

    const patch: Partial<typeof address> = { updatedAt: Date.now() };
    if (name) patch.name = name;
    if (description !== undefined) patch.description = description;
    if (Object.keys(updates).length > 0) {
      patch.customProperties = {
        ...address.customProperties,
        ...updates,
      };
    }

    await ctx.db.patch(addressId, patch);
    return addressId;
  },
});

/**
 * DELETE ORGANIZATION ADDRESS
 * Soft deletes an organization address
 */
export const deleteOrganizationAddress = mutation({
  args: {
    sessionId: v.string(),
    addressId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const address = await ctx.db.get(args.addressId);
    if (!address) throw new Error("Adresse nicht gefunden");
    if (address.type !== "address") throw new Error("Ungültiger Objekttyp");

    await requirePermission(ctx, userId, "manage_organization", {
      organizationId: address.organizationId
    });

    await ctx.db.patch(args.addressId, {
      status: "deleted",
      updatedAt: Date.now(),
    });

    return args.addressId;
  },
});

// ============================================================================
// INTERNAL MUTATIONS FOR ORGANIZATION CREATION
// ============================================================================

/**
 * Create organization contact information (internal use only)
 * Used during organization creation to save contact info to ontology
 */
export const createOrgContact = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    createdBy: v.id("users"),
    primaryEmail: v.optional(v.string()),
    supportEmail: v.optional(v.string()),
    primaryPhone: v.optional(v.string()),
    supportPhone: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    // Build custom properties from provided fields
    const customProperties: Record<string, string> = {};
    if (args.primaryEmail) customProperties.primaryEmail = args.primaryEmail;
    if (args.supportEmail) customProperties.supportEmail = args.supportEmail;
    if (args.primaryPhone) customProperties.primaryPhone = args.primaryPhone;
    if (args.supportPhone) customProperties.supportPhone = args.supportPhone;
    if (args.website) customProperties.website = args.website;

    return await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "organization_contact",
      name: `${org.slug}-contact`,
      status: "active",
      customProperties,
      createdBy: args.createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Create organization profile information (internal use only)
 * Used during organization creation to save profile info to ontology
 */
export const createOrgProfile = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    createdBy: v.id("users"),
    industry: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    employeeCount: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    // Build custom properties from provided fields
    const customProperties: Record<string, string | number> = {};
    if (args.industry) customProperties.industry = args.industry;
    if (args.foundedYear) customProperties.foundedYear = args.foundedYear;
    if (args.employeeCount) customProperties.employeeCount = args.employeeCount;
    if (args.bio) customProperties.bio = args.bio;

    return await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "organization_profile",
      name: `${org.slug}-profile`,
      status: "active",
      customProperties,
      createdBy: args.createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * GET CURRENT INVOICE COUNTER (Read-only)
 * Returns the current invoice counter based on settings
 * Shows what the next invoice number WILL be (not what has been used)
 */
export const getCurrentInvoiceCounter = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const settingsObj = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_settings")
      )
      .filter(q => q.eq(q.field("subtype"), "invoicing"))
      .first();

    if (settingsObj) {
      const props = settingsObj.customProperties as {
        prefix?: string;
        nextNumber?: number;
        defaultTerms?: string;
      };
      return {
        nextNumber: props.nextNumber || 1,
        prefix: props.prefix || "INV",
      };
    }

    // No settings exist - check existing invoices to derive next number
    const existingInvoices = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "invoice")
      )
      .collect();

    if (existingInvoices.length === 0) {
      return {
        nextNumber: 1,
        prefix: "INV",
      };
    }

    // Extract all invoice numbers and find the highest sequential number
    let highestNumber = 0;
    let detectedPrefix = "INV";

    for (const invoice of existingInvoices) {
      const invoiceNumber = invoice.customProperties?.invoiceNumber as string;
      if (invoiceNumber) {
        // Extract the last number from invoice number (e.g., "INV-2025-0004" → 4)
        const match = invoiceNumber.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > highestNumber) {
            highestNumber = num;
            // Extract prefix (everything before the last number)
            const prefixMatch = invoiceNumber.match(/^(.+?)-\d+$/);
            if (prefixMatch) {
              // Strip trailing hyphens from detected prefix to avoid double hyphens
              detectedPrefix = prefixMatch[1].replace(/-+$/, '');
            }
          }
        }
      }
    }

    return {
      nextNumber: highestNumber + 1,
      prefix: detectedPrefix,
    };
  },
});

/**
 * GET AND INCREMENT INVOICE NUMBER (ATOMIC) - Internal
 * Gets the next invoice number and increments it atomically
 * This ensures sequential, gap-free invoice numbering for Stripe compatibility and legal compliance
 *
 * This is an internal mutation called from actions (like invoice PDF generation)
 */
export const getAndIncrementInvoiceNumber = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get current invoicing settings
    const settingsObj = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "organization_settings")
      )
      .filter(q => q.eq(q.field("subtype"), "invoicing"))
      .first();

    let currentNumber: number;
    let prefix: string;

    if (settingsObj) {
      const props = settingsObj.customProperties as {
        prefix?: string;
        nextNumber?: number;
        defaultTerms?: string;
      };
      currentNumber = props.nextNumber || 1;
      prefix = props.prefix || "INV";

      // Atomically increment the counter
      await ctx.db.patch(settingsObj._id, {
        customProperties: {
          ...settingsObj.customProperties,
          nextNumber: currentNumber + 1,
        },
        updatedAt: Date.now(),
      });
    } else {
      // Create invoicing settings if they don't exist
      const org = await ctx.db.get(args.organizationId);
      if (!org) throw new Error("Organization not found");

      currentNumber = 1;
      prefix = "INV";

      // Get first user for createdBy field (system requirement)
      const firstUser = await ctx.db.query("users").first();
      if (!firstUser) throw new Error("No users found in database");

      await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "organization_settings",
        subtype: "invoicing",
        name: `${org.slug}-settings-invoicing`,
        status: "active",
        customProperties: {
          prefix,
          nextNumber: 2, // Next invoice will be 2
          defaultTerms: "net_30", // Must match UI dropdown values (lowercase with underscore)
        },
        createdBy: firstUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Return the invoice number that was just allocated
    // Format: PREFIX-NUMBER (e.g., INV-0001 or INV-2025-0001 if user includes year in prefix)
    // Strip trailing hyphens from prefix to avoid double hyphens (handles legacy data)
    const cleanPrefix = prefix.replace(/-+$/, '');
    return {
      invoiceNumber: `${cleanPrefix}-${String(currentNumber).padStart(4, '0')}`,
      prefix,
      number: currentNumber,
    };
  },
});
