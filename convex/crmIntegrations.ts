/**
 * CRM INTEGRATIONS
 *
 * Integration points between CRM and other systems:
 * - Auto-create contacts from checkout
 * - Link user accounts to CRM contacts (user-light)
 * - Auto-create contacts from event registration
 *
 * This file handles the workflows that connect CRM to the rest of the platform.
 */

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

/**
 * Get or create system user for internal operations (guest checkout, etc.)
 */
async function getOrCreateSystemUser(ctx: MutationCtx) {
  const systemEmail = "system@l4yercak3.com";
  const existingUser = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("email"), systemEmail))
    .first();

  if (existingUser) {
    return existingUser;
  }

  // Create system user if it doesn't exist
  const userId = await ctx.db.insert("users", {
    email: systemEmail,
    firstName: "System",
    lastName: "User",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const newUser = await ctx.db.get(userId);
  if (!newUser) {
    throw new Error("Failed to create system user");
  }
  return newUser;
}

// ============================================================================
// B2B ORGANIZATION INTEGRATION
// ============================================================================

/**
 * CREATE OR UPDATE CRM ORGANIZATION (INTERNAL - No Auth Required)
 *
 * Creates or updates a CRM organization record for B2B transactions.
 * Features:
 * - Deduplication by company name + organizationId
 * - Stores VAT number, billing address (structured), contact info
 * - Returns organization ID for linking to contacts
 */
export const createCRMOrganization = internalMutation({
  args: {
    organizationId: v.id("organizations"), // Platform org (seller)
    companyName: v.string(),
    vatNumber: v.optional(v.string()),
    // Structured billing address (matches BillingAddress interface)
    billingAddress: v.optional(v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(),
    })),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    // Track if user chose separate billing vs. org address
    useSeparateBillingAddress: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<Id<"objects">> => {
    // 🔍 DEBUG: Log incoming values to trace space-stripping issue
    console.log("🔍 [createCRMOrganization DEBUG] Input values:", {
      companyName_raw: args.companyName,
      companyName_has_space: args.companyName.includes(" "),
      companyName_length: args.companyName.length,
      billingLine1_raw: args.billingAddress?.line1,
      billingLine1_has_space: args.billingAddress?.line1?.includes(" "),
    });

    // Get or create system user for internal operations
    const systemUser = await getOrCreateSystemUser(ctx);
    const userId = systemUser._id;

    // 1. Check if organization already exists by company name (deduplication)
    const existingOrgs = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_organization")
      )
      .collect();

    const existingOrg = existingOrgs.find(
      (org) => org.customProperties?.companyName?.toLowerCase() === args.companyName.toLowerCase()
    );

    if (existingOrg) {
      // Organization exists - update info
      await ctx.db.patch(existingOrg._id, {
        customProperties: {
          ...existingOrg.customProperties,
          vatNumber: args.vatNumber || existingOrg.customProperties?.vatNumber,
          billingAddress: args.billingAddress || existingOrg.customProperties?.billingAddress,
          useSeparateBillingAddress: args.useSeparateBillingAddress ?? existingOrg.customProperties?.useSeparateBillingAddress,
          email: args.email || existingOrg.customProperties?.email,
          phone: args.phone || existingOrg.customProperties?.phone,
          website: args.website || existingOrg.customProperties?.website,
          lastUpdated: Date.now(),
        },
        updatedAt: Date.now(),
      });

      // Log action
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: existingOrg._id,
        actionType: "organization_updated",
        actionData: {
          updatedFields: ["vatNumber", "billingAddress", "contact_info"],
        },
        performedBy: userId,
        performedAt: Date.now(),
      });

      return existingOrg._id;
    }

    // 2. Create new CRM organization
    const orgId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_organization",
      subtype: "business_customer",
      name: args.companyName,
      description: `B2B customer organization - ${new Date().toLocaleDateString()}`,
      status: "active",
      customProperties: {
        companyName: args.companyName,
        vatNumber: args.vatNumber,
        billingAddress: args.billingAddress,
        useSeparateBillingAddress: args.useSeparateBillingAddress ?? false,
        email: args.email,
        phone: args.phone,
        website: args.website,

        // Tracking
        createdFromCheckout: true,
        createdAt: Date.now(),
        lastUpdated: Date.now(),

        // Tagging
        tags: ["b2b", "customer", "organization"],
        source: "checkout",
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 3. Log creation action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: orgId,
      actionType: "organization_created",
      actionData: {
        companyName: args.companyName,
        source: "checkout",
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    // 🔍 DEBUG: Confirm what was stored
    console.log("✅ [createCRMOrganization DEBUG] Created org:", {
      orgId,
      storedName: args.companyName,
      storedName_has_space: args.companyName.includes(" "),
    });

    return orgId;
  },
});

/**
 * LINK CONTACT TO ORGANIZATION (INTERNAL)
 *
 * Creates a relationship between a CRM contact and a CRM organization.
 * Used for B2B transactions where a contact represents a person at a company.
 */
export const linkContactToOrganization = internalMutation({
  args: {
    contactId: v.id("objects"),
    organizationId: v.id("objects"), // CRM organization (not platform org!)
    role: v.optional(v.string()), // e.g., "buyer", "decision_maker", "billing_contact"
  },
  handler: async (ctx, args): Promise<Id<"objectLinks">> => {
    // Get or create system user for internal operations
    const systemUser = await getOrCreateSystemUser(ctx);
    const userId = systemUser._id;

    // 1. Validate contact exists
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.type !== "crm_contact") {
      throw new Error("Invalid contact");
    }

    // 2. Validate organization exists
    const organization = await ctx.db.get(args.organizationId);
    if (!organization || organization.type !== "crm_organization") {
      throw new Error("Invalid organization");
    }

    // 3. Check if link already exists
    const existingLinks = await ctx.db
      .query("objectLinks")
      .filter((q) =>
        q.and(
          q.eq(q.field("fromObjectId"), args.contactId),
          q.eq(q.field("toObjectId"), args.organizationId),
          q.eq(q.field("linkType"), "works_at")
        )
      )
      .collect();

    if (existingLinks.length > 0) {
      // Link already exists, update role if provided
      if (args.role) {
        await ctx.db.patch(existingLinks[0]._id, {
          properties: {
            ...existingLinks[0].properties,
            role: args.role,
            updatedAt: Date.now(),
          },
        });
      }
      return existingLinks[0]._id;
    }

    // 4. Create link
    const linkId = await ctx.db.insert("objectLinks", {
      organizationId: contact.organizationId, // Platform organization
      fromObjectId: args.contactId,
      toObjectId: args.organizationId,
      linkType: "works_at",
      properties: {
        role: args.role || "contact",
        linkedAt: Date.now(),
        source: "checkout",
      },
      createdBy: userId,
      createdAt: Date.now(),
    });

    // 5. Update contact with organization reference
    await ctx.db.patch(args.contactId, {
      customProperties: {
        ...contact.customProperties,
        linkedOrganizationId: args.organizationId,
        organizationRole: args.role || "contact",
      },
      updatedAt: Date.now(),
    });

    // 6. Log action
    await ctx.db.insert("objectActions", {
      organizationId: contact.organizationId,
      objectId: args.contactId,
      actionType: "linked_to_organization",
      actionData: {
        organizationId: args.organizationId,
        role: args.role,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return linkId;
  },
});

// ============================================================================
// CHECKOUT INTEGRATION
// ============================================================================

/**
 * FIND CRM ORGANIZATION BY NAME (NO AUTH)
 *
 * Searches for existing CRM organizations by company name.
 * Used during checkout to link contacts to employer organizations.
 */
export const findCrmOrganizationByName = query({
  args: {
    organizationId: v.id("organizations"),
    searchName: v.string(),
  },
  handler: async (ctx, args) => {
    const orgs = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "crm_organization")
      )
      .collect();

    // Fuzzy match by name (case-insensitive, partial match)
    const normalized = args.searchName.toLowerCase().trim();
    return orgs.find(org => {
      const orgName = (org.name || "").toLowerCase();
      const companyName = (org.customProperties?.companyName as string || "").toLowerCase();
      return orgName.includes(normalized) ||
             normalized.includes(orgName) ||
             companyName.includes(normalized) ||
             normalized.includes(companyName);
    });
  },
});

/**
 * AUTO-CREATE CONTACT FROM CHECKOUT SESSION (INTERNAL - No Auth Required)
 *
 * Internal mutation for creating CRM contacts from checkout without requiring authentication.
 * Used by backend actions (like payment completion) that run without user sessions.
 *
 * Features:
 * - Deduplication by email
 * - Extracts customer info from session
 * - Enriches with purchase history from session
 * - Links to organization if B2B checkout
 */
export const autoCreateContactFromCheckoutInternal = internalMutation({
  args: {
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<{ contactId: Id<"objects">; isNew: boolean }> => {
    // Get or create system user for internal operations
    const systemUser = await getOrCreateSystemUser(ctx);
    const userId = systemUser._id;

    // 1. Get checkout session (single source of truth!)
    const session = await ctx.runQuery(internal.checkoutSessionOntology.getCheckoutSessionInternal, {
      checkoutSessionId: args.checkoutSessionId,
    }) as {
      type: string;
      organizationId: Id<"organizations">;
      customProperties?: Record<string, unknown>;
    };

    if (!session || session.type !== "checkout_session") {
      throw new Error("Checkout session not found");
    }

    const organizationId: Id<"organizations"> = session.organizationId;
    const customerEmail: string = session.customProperties?.customerEmail as string;
    const customerName: string = session.customProperties?.customerName as string;
    const customerPhone: string | undefined = session.customProperties?.customerPhone as string | undefined;
    const selectedProducts: Array<{
      productId: Id<"objects">;
      quantity: number;
      pricePerUnit: number;
      totalPrice: number;
    }> = session.customProperties?.selectedProducts as Array<{
      productId: Id<"objects">;
      quantity: number;
      pricePerUnit: number;
      totalPrice: number;
    }>;
    const totalAmount: number = session.customProperties?.totalAmount as number;

    // Extract form responses (for additional contact data like salutation, title, profession)
    const formResponses = session.customProperties?.formResponses as Array<{
      productId: Id<"objects">;
      ticketNumber: number;
      formId: string;
      responses: Record<string, unknown>;
      addedCosts: number;
      submittedAt: number;
    }> | undefined;

    if (!customerEmail || !customerName) {
      throw new Error("Customer email and name are required");
    }

    // 2. Split name into first/last (simple approach)
    // First try to get firstName/lastName from form responses (more accurate)
    const firstFormResponse = formResponses && formResponses.length > 0 ? formResponses[0] : null;
    const formData = firstFormResponse?.responses || {};
    
    // Use form data if available, otherwise parse from customerName
    let firstName = (formData.firstName as string | undefined) || "";
    let lastName = (formData.lastName as string | undefined) || "";
    
    // If form data doesn't have firstName/lastName, parse from customerName
    if (!firstName && !lastName) {
      const nameParts = customerName.trim().split(" ");
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || "";
    }
    
    // Ensure we have at least something for firstName (fallback to customerName)
    if (!firstName && !lastName) {
      firstName = customerName;
    }

    // 3. Extract additional contact data from form responses (if available)
    const salutation = formData.salutation as string | undefined;
    const title = formData.title as string | undefined;
    const profession = formData.profession as string | undefined; // Fachrichtung
    const attendeeCategory = formData.attendee_category as string | undefined; // external, ameos, haffnet, speaker, sponsor, orga

    // B2B: Extract employer name and link to organization
    const employerName = session.customProperties?.employerName as string | undefined;
    let crmOrganizationId: Id<"objects"> | undefined = undefined;

    // If employer name provided, find or create organization
    if (employerName) {
      // Try to find existing organization
      const orgs = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", organizationId).eq("type", "crm_organization")
        )
        .collect();

      const normalized = employerName.toLowerCase().trim();
      const existingOrg = orgs.find(org => {
        const orgName = (org.name || "").toLowerCase();
        const companyName = (org.customProperties?.companyName as string || "").toLowerCase();
        return orgName.includes(normalized) ||
               normalized.includes(orgName) ||
               companyName.includes(normalized) ||
               normalized.includes(companyName);
      });

      if (existingOrg) {
        crmOrganizationId = existingOrg._id;
      } else {
        // Construct billingAddress from individual session fields (session stores individual fields, not object)
        const billingLine1 = session.customProperties?.billingLine1 as string | undefined;
        const billingLine2 = session.customProperties?.billingLine2 as string | undefined;
        const billingCity = session.customProperties?.billingCity as string | undefined;
        const billingState = session.customProperties?.billingState as string | undefined;
        const billingPostalCode = session.customProperties?.billingPostalCode as string | undefined;
        const billingCountry = session.customProperties?.billingCountry as string | undefined;
        
        // Only create billingAddress if we have required fields
        const billingAddress = (billingLine1 && billingCity && billingPostalCode && billingCountry) ? {
          line1: billingLine1.trim(), // Ensure proper spacing
          line2: billingLine2?.trim() || undefined,
          city: billingCity.trim(),
          state: billingState?.trim() || undefined,
          postalCode: billingPostalCode.trim(),
          country: billingCountry.trim(),
        } : undefined;
        
        // Create new organization using EXISTING function
        crmOrganizationId = await ctx.runMutation(internal.crmIntegrations.createCRMOrganization, {
          organizationId,
          companyName: employerName.trim(), // Ensure proper spacing for company name too
          billingAddress,
          email: session.customProperties?.customerEmail as string | undefined,
        });
      }
    }

    // 3. Check if contact already exists by email (deduplication)
    const existingContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "crm_contact")
      )
      .collect();

    const existingContact = existingContacts.find(
      (c) => c.customProperties?.email === customerEmail
    );

    if (existingContact) {
      // Contact exists - update last purchase info AND enrich with form data if available
      const currentTotalSpent = (existingContact.customProperties?.totalSpent as number) || 0;
      const currentPurchaseCount = (existingContact.customProperties?.purchaseCount as number) || 0;

      await ctx.db.patch(existingContact._id, {
        customProperties: {
          ...existingContact.customProperties,
          totalSpent: currentTotalSpent + totalAmount,
          purchaseCount: currentPurchaseCount + 1,
          lastPurchaseAt: Date.now(),
          lastCheckoutSessionId: args.checkoutSessionId,
          // Enrich with form data (if not already set)
          ...(salutation && !existingContact.customProperties?.salutation ? { salutation } : {}),
          ...(title && !existingContact.customProperties?.title ? { title } : {}),
          ...(profession && !existingContact.customProperties?.profession ? { profession } : {}),
          ...(attendeeCategory && !existingContact.customProperties?.attendeeCategory ? { attendeeCategory } : {}),
        },
        updatedAt: Date.now(),
      });

      // Log action
      await ctx.db.insert("objectActions", {
        organizationId,
        objectId: existingContact._id,
        actionType: "checkout_completed",
        actionData: {
          checkoutSessionId: args.checkoutSessionId,
          totalAmount,
          productCount: selectedProducts.length,
        },
        performedBy: userId,
        performedAt: Date.now(),
      });

      // If B2B organization exists and not already linked, link it
      if (crmOrganizationId && !existingContact.customProperties?.linkedOrganizationId) {
        await ctx.runMutation(internal.crmIntegrations.linkContactToOrganization, {
          contactId: existingContact._id,
          organizationId: crmOrganizationId,
          role: "attendee",
        });
      }

      return { contactId: existingContact._id, isNew: false };
    }

    // 4. Create new contact
    // Use firstName + lastName for name field to ensure proper spacing
    const contactFullName = `${firstName} ${lastName}`.trim() || customerName;
    
    const contactId = await ctx.db.insert("objects", {
      organizationId,
      type: "crm_contact",
      subtype: "customer", // They purchased, so they're a customer
      name: contactFullName,
      description: `Customer from checkout - ${new Date().toLocaleDateString()}`,
      status: "active",
      customProperties: {
        firstName,
        lastName,
        email: customerEmail,
        phone: customerPhone,

        // Form data (from HaffSymposium registration or similar forms)
        ...(salutation ? { salutation } : {}),
        ...(title ? { title } : {}),
        ...(profession ? { profession } : {}), // Fachrichtung
        ...(attendeeCategory ? { attendeeCategory } : {}), // external, ameos, haffnet, speaker, sponsor, orga

        // Purchase tracking
        totalSpent: totalAmount,
        purchaseCount: 1,
        lastPurchaseAt: Date.now(),
        firstPurchaseAt: Date.now(),
        lastCheckoutSessionId: args.checkoutSessionId,

        // Source tracking
        source: "checkout",
        sourceRef: args.checkoutSessionId,
        tags: [
          "customer",
          "checkout",
          "paid",
          ...(attendeeCategory ? [`attendee:${attendeeCategory}`] : []), // Tag for filtering (e.g., "attendee:external", "attendee:speaker")
        ],

        // Lifecycle
        lifecycleStage: "customer",
        createdFromCheckout: true,

        // B2B: Link to organization if exists
        ...(crmOrganizationId ? { linkedOrganizationId: crmOrganizationId } : {}),
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link contact to organization if B2B checkout
    if (crmOrganizationId) {
      await ctx.runMutation(internal.crmIntegrations.linkContactToOrganization, {
        contactId,
        organizationId: crmOrganizationId,
        role: "attendee",
      });
    }

    // 5. Log creation action
    await ctx.db.insert("objectActions", {
      organizationId,
      objectId: contactId,
      actionType: "created_from_checkout",
      actionData: {
        checkoutSessionId: args.checkoutSessionId,
        totalAmount,
        productCount: selectedProducts.length,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { contactId, isNew: true };
  },
});

/**
 * AUTO-CREATE CONTACT FROM CHECKOUT SESSION (PUBLIC - With Auth)
 *
 * Public mutation that requires authentication.
 * This is for authenticated user flows (future enhancement).
 */
export const autoCreateContactFromCheckout = mutation({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<{ contactId: Id<"objects">; isNew: boolean }> => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Delegate to internal mutation with userId
    return await ctx.runMutation(internal.crmIntegrations.autoCreateContactFromCheckoutInternal, {
      checkoutSessionId: args.checkoutSessionId,
    });
  },
});

/**
 * CREATE CONTACT FROM CHECKOUT (LEGACY - Keep for backward compatibility)
 *
 * Old version that accepts scattered data.
 * Auto-create a CRM contact when a checkout is completed.
 * Checks for existing contact by email first to avoid duplicates.
 */
export const createContactFromCheckout = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    checkoutId: v.id("objects"),
    customerInfo: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
    }),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Check if contact already exists by email
    const existingContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    const existingContact = existingContacts.find(
      (c) => c.customProperties?.email === args.customerInfo.email
    );

    if (existingContact) {
      // Contact exists, log action and return
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: existingContact._id,
        actionType: "checkout_completed",
        actionData: {
          checkoutId: args.checkoutId,
          newCheckout: true,
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });

      return existingContact._id;
    }

    // 2. Create new contact
    const contactId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_contact",
      subtype: "customer",
      name: `${args.customerInfo.firstName} ${args.customerInfo.lastName}`,
      description: "Customer from checkout",
      status: "active",
      customProperties: {
        firstName: args.customerInfo.firstName,
        lastName: args.customerInfo.lastName,
        email: args.customerInfo.email,
        phone: args.customerInfo.phone,
        source: "checkout",
        sourceRef: args.checkoutId,
        tags: ["customer", "checkout"],
        createdFromCheckout: true,
      },
      createdBy: args.performedBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 3. Log creation action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: contactId,
      actionType: "created_from_checkout",
      actionData: {
        checkoutId: args.checkoutId,
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return contactId;
  },
});

// ============================================================================
// USER-LIGHT ACCOUNT INTEGRATION
// ============================================================================

/**
 * CREATE USER-LIGHT ACCOUNT
 *
 * Create a lightweight user account and link it to an existing CRM contact.
 * This allows customers to save their info for future checkouts.
 */
export const createUserLightAccount = mutation({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get session
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // 2. Get CRM contact
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.type !== "crm_contact") {
      throw new Error("Invalid contact");
    }

    const email = contact.customProperties?.email;
    if (!email) {
      throw new Error("Contact must have an email address");
    }

    // 3. Check if account already exists for this email
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();

    if (existingUser) {
      throw new Error("Account already exists for this email");
    }

    // 4. Check if contact already has a linked account
    if (contact.customProperties?.platformUserId) {
      throw new Error("Contact already has a linked account");
    }

    // 5. Create user account (using existing auth system)
    // Note: This would call your existing user creation mutation
    // For now, we'll create a basic user record
    const userId = await ctx.db.insert("users", {
      email,
      firstName: contact.customProperties?.firstName || "",
      lastName: contact.customProperties?.lastName || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create password hash (would use your existing password hashing)
    await ctx.db.insert("userPasswords", {
      userId,
      passwordHash: args.password, // TODO: Actually hash this!
      createdAt: Date.now(),
    });

    // 6. Assign user-light role
    // Note: This assumes you have a user-light role created
    const userLightRole = await ctx.db
      .query("roles")
      .filter((q) => q.eq(q.field("name"), "user-light"))
      .first();

    if (userLightRole) {
      await ctx.db.insert("organizationMembers", {
        organizationId: contact.organizationId,
        userId,
        role: userLightRole._id,
        invitedBy: session.userId,
        invitedAt: Date.now(),
        joinedAt: Date.now(),
        isActive: true,
      });
    }

    // 7. Link user to CRM contact
    await ctx.db.patch(contact._id, {
      customProperties: {
        ...contact.customProperties,
        platformUserId: userId,
        accountCreatedAt: Date.now(),
        accountStatus: "active",
      },
      updatedAt: Date.now(),
    });

    // 8. Track action
    await ctx.db.insert("objectActions", {
      organizationId: contact.organizationId,
      objectId: contact._id,
      actionType: "account_created",
      actionData: {
        userId,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { userId, success: true };
  },
});

/**
 * GET CHECKOUT PREFILL DATA
 *
 * Get saved info for a logged-in user to prefill checkout forms.
 */
export const getCheckoutPrefillData = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get session
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) return null;

    // Get user's organization membership to find organizationId
    const membership = await ctx.db
      .query("organizationMembers")
      .filter((q) => q.eq(q.field("userId"), session.userId))
      .first();

    if (!membership) return null;

    // Find CRM contact linked to this user
    const contacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", membership.organizationId).eq("type", "crm_contact")
      )
      .collect();

    const contact = contacts.find(
      (c) => c.customProperties?.platformUserId === session.userId
    );

    if (!contact) return null;

    // Return prefill data
    return {
      firstName: contact.customProperties?.firstName,
      lastName: contact.customProperties?.lastName,
      email: contact.customProperties?.email,
      phone: contact.customProperties?.phone,
      address: contact.customProperties?.address,
    };
  },
});

// ============================================================================
// EVENT INTEGRATION
// ============================================================================

/**
 * CREATE CONTACT FROM EVENT REGISTRATION
 *
 * Auto-create a CRM contact when someone registers for an event.
 */
export const createContactFromEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    eventId: v.id("objects"),
    attendeeInfo: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      company: v.optional(v.string()),
    }),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Check if contact already exists by email
    const existingContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    const existingContact = existingContacts.find(
      (c) => c.customProperties?.email === args.attendeeInfo.email
    );

    if (existingContact) {
      // Contact exists, link to event
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: existingContact._id,
        toObjectId: args.eventId,
        linkType: "registered_for",
        properties: {
          registeredAt: Date.now(),
        },
        createdBy: args.performedBy,
        createdAt: Date.now(),
      });

      return existingContact._id;
    }

    // 2. Create new contact
    const contactId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_contact",
      subtype: "lead", // Event attendees start as leads
      name: `${args.attendeeInfo.firstName} ${args.attendeeInfo.lastName}`,
      description: "Contact from event registration",
      status: "active",
      customProperties: {
        firstName: args.attendeeInfo.firstName,
        lastName: args.attendeeInfo.lastName,
        email: args.attendeeInfo.email,
        phone: args.attendeeInfo.phone,
        company: args.attendeeInfo.company,
        source: "event",
        sourceRef: args.eventId,
        tags: ["event-attendee"],
        createdFromEvent: true,
      },
      createdBy: args.performedBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 3. Link contact to event
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: contactId,
      toObjectId: args.eventId,
      linkType: "registered_for",
      properties: {
        registeredAt: Date.now(),
      },
      createdBy: args.performedBy,
      createdAt: Date.now(),
    });

    // 4. Log creation action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: contactId,
      actionType: "created_from_event",
      actionData: {
        eventId: args.eventId,
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return contactId;
  },
});
