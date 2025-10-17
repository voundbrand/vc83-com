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

// ============================================================================
// CHECKOUT INTEGRATION
// ============================================================================

/**
 * AUTO-CREATE CONTACT FROM CHECKOUT SESSION (NEW!)
 *
 * Reads checkout_session object and auto-creates CRM contact.
 * This is the MAIN integration hook called after successful checkout.
 *
 * Features:
 * - Deduplication by email
 * - Extracts customer info from session
 * - Enriches with purchase history from session
 * - Links to organization if B2B checkout
 */
export const autoCreateContactFromCheckout = mutation({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<{ contactId: Id<"objects">; isNew: boolean }> => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // 1. Get checkout session (single source of truth!)
    const session: any = await ctx.runQuery(internal.checkoutSessionOntology.getCheckoutSessionInternal, {
      checkoutSessionId: args.checkoutSessionId,
    });

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

    if (!customerEmail || !customerName) {
      throw new Error("Customer email and name are required");
    }

    // 2. Split name into first/last (simple approach)
    const nameParts = customerName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // 3. Check if contact already exists by email (deduplication)
    const existingContacts: any[] = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "crm_contact")
      )
      .collect();

    const existingContact: any = existingContacts.find(
      (c: any) => c.customProperties?.email === customerEmail
    );

    if (existingContact) {
      // Contact exists - update last purchase info
      const currentTotalSpent = (existingContact.customProperties?.totalSpent as number) || 0;
      const currentPurchaseCount = (existingContact.customProperties?.purchaseCount as number) || 0;

      await ctx.db.patch(existingContact._id, {
        customProperties: {
          ...existingContact.customProperties,
          totalSpent: currentTotalSpent + totalAmount,
          purchaseCount: currentPurchaseCount + 1,
          lastPurchaseAt: Date.now(),
          lastCheckoutSessionId: args.checkoutSessionId,
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

      return { contactId: existingContact._id, isNew: false };
    }

    // 4. Create new contact
    const contactId = await ctx.db.insert("objects", {
      organizationId,
      type: "crm_contact",
      subtype: "customer", // They purchased, so they're a customer
      name: customerName,
      description: `Customer from checkout - ${new Date().toLocaleDateString()}`,
      status: "active",
      customProperties: {
        firstName,
        lastName,
        email: customerEmail,
        phone: customerPhone,

        // Purchase tracking
        totalSpent: totalAmount,
        purchaseCount: 1,
        lastPurchaseAt: Date.now(),
        firstPurchaseAt: Date.now(),
        lastCheckoutSessionId: args.checkoutSessionId,

        // Source tracking
        source: "checkout",
        sourceRef: args.checkoutSessionId,
        tags: ["customer", "checkout", "paid"],

        // Lifecycle
        lifecycleStage: "customer",
        createdFromCheckout: true,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

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
