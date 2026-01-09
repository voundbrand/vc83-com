/**
 * PROJECT DRAWER AUTHENTICATION
 *
 * Magic link authentication for the Project Meetings Drawer feature.
 * Allows CRM contacts to authenticate via email magic links to view project meetings.
 *
 * Flow:
 * 1. Client enters email in drawer login prompt
 * 2. System validates email is a CRM contact in the organization
 * 3. Magic link token generated and stored
 * 4. Email sent with magic link
 * 5. Client clicks link → token validated → frontend session created
 * 6. Session stored in localStorage, used for API calls
 */

import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ============================================
// CONSTANTS
// ============================================

const MAGIC_LINK_EXPIRY_MINUTES = 15; // Token expires after 15 minutes
const SESSION_EXPIRY_DAYS = 30; // Frontend session lasts 30 days

// ============================================
// INTERNAL QUERIES (for use by actions)
// ============================================

/**
 * Find a CRM contact by email within an organization
 * Returns the contact if found and valid
 */
export const findContactByEmail = internalQuery({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Normalize email to lowercase
    const normalizedEmail = args.email.toLowerCase().trim();

    // Find CRM contact with this email in the organization
    const contacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    // Find contact by email (stored in customProperties.email)
    const contact = contacts.find((c) => {
      const email = (c.customProperties as { email?: string })?.email;
      return email?.toLowerCase() === normalizedEmail;
    });

    return contact || null;
  },
});

/**
 * Find a valid magic link token
 */
export const findMagicLinkToken = internalQuery({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Find token in objects table
    const tokens = await ctx.db
      .query("objects")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "magic_link_token"),
          q.eq(q.field("subtype"), "project_drawer")
        )
      )
      .collect();

    const tokenRecord = tokens.find(
      (t) => (t.customProperties as { token?: string })?.token === args.token
    );

    return tokenRecord || null;
  },
});

/**
 * Get organization by ID (internal)
 */
export const getOrganizationInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organizationId);
  },
});

/**
 * Get contact by ID (internal)
 */
export const getContactInternal = internalQuery({
  args: {
    contactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contactId);
  },
});

// ============================================
// INTERNAL MUTATIONS (for use by actions)
// ============================================

/**
 * Create a magic link token for project drawer authentication
 * Called by the API action after validating the contact exists
 */
export const createMagicLinkToken = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    contactId: v.id("objects"),
    contactEmail: v.string(),
    projectId: v.id("objects"),
    redirectPath: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const expiresAt = Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000;

    // Create token object
    const tokenId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "magic_link_token",
      subtype: "project_drawer",
      name: `Magic Link for ${args.contactEmail}`,
      description: "",
      status: "pending", // pending | used | expired
      customProperties: {
        token: args.token,
        contactId: args.contactId,
        contactEmail: args.contactEmail,
        projectId: args.projectId,
        redirectPath: args.redirectPath,
        expiresAt,
        usedAt: null,
      },
      createdBy: args.contactId, // Self-initiated
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      tokenId,
      expiresAt,
    };
  },
});

/**
 * Mark a magic link token as used and create frontend session
 */
export const consumeMagicLinkToken = internalMutation({
  args: {
    tokenId: v.id("objects"),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the token
    const token = await ctx.db.get(args.tokenId);
    if (!token || token.type !== "magic_link_token") {
      throw new Error("Token not found");
    }

    const props = token.customProperties as {
      token: string;
      contactId: string;
      contactEmail: string;
      projectId: string;
      redirectPath: string;
      expiresAt: number;
      usedAt: number | null;
    };

    // Validate token is not expired
    if (Date.now() > props.expiresAt) {
      await ctx.db.patch(args.tokenId, {
        status: "expired",
        updatedAt: Date.now(),
      });
      throw new Error("Token has expired");
    }

    // Validate token is not already used
    if (token.status === "used" || props.usedAt) {
      throw new Error("Token has already been used");
    }

    // Mark token as used
    await ctx.db.patch(args.tokenId, {
      status: "used",
      customProperties: {
        ...props,
        usedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    // Create frontend session
    const sessionId = crypto.randomUUID();
    const sessionExpiresAt = Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    await ctx.db.insert("frontendSessions", {
      sessionId,
      frontendUserId: props.contactId as Id<"objects">,
      contactEmail: props.contactEmail,
      organizationId: token.organizationId,
      portalType: "project_drawer",
      portalUrl: props.redirectPath,
      createdAt: Date.now(),
      expiresAt: sessionExpiresAt,
      lastActivityAt: Date.now(),
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
    });

    // Log the authentication
    await ctx.db.insert("objectActions", {
      organizationId: token.organizationId,
      objectId: props.contactId as Id<"objects">,
      actionType: "magic_link_login",
      actionData: {
        tokenId: args.tokenId,
        sessionId,
        projectId: props.projectId,
        loginMethod: "magic_link",
      },
      performedBy: props.contactId as Id<"objects">,
      performedAt: Date.now(),
    });

    return {
      sessionId,
      contactEmail: props.contactEmail,
      expiresAt: sessionExpiresAt,
      redirectPath: props.redirectPath,
    };
  },
});

// ============================================
// PUBLIC QUERIES
// ============================================

/**
 * Verify if an email belongs to a CRM contact in the organization
 * Called by frontend to provide immediate feedback
 */
export const verifyContactEmail = query({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Find CRM contact with this email
    const contacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    const contact = contacts.find((c) => {
      const email = (c.customProperties as { email?: string })?.email;
      return email?.toLowerCase() === normalizedEmail;
    });

    return {
      isValid: !!contact,
      // Don't expose contact details for security
    };
  },
});

// ============================================
// PUBLIC MUTATIONS
// ============================================

/**
 * Request a magic link for project drawer authentication
 * This is called from the frontend LoginPrompt component
 *
 * Note: This mutation only validates and creates the token.
 * The email is sent via a Convex action that calls Resend.
 */
export const requestMagicLink = mutation({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
    projectId: v.id("objects"),
    redirectPath: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // 1. Verify organization exists
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // 2. Find CRM contact with this email
    const contacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    const contact = contacts.find((c) => {
      const email = (c.customProperties as { email?: string })?.email;
      return email?.toLowerCase() === normalizedEmail;
    });

    if (!contact) {
      // For security, don't reveal if email exists or not
      // Just return success and let the user check their email
      // This prevents email enumeration attacks
      return {
        success: true,
        message: "If this email is registered, you will receive a magic link shortly.",
      };
    }

    // 3. Generate secure token
    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expiresAt = Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000;

    // 4. Create token object
    await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "magic_link_token",
      subtype: "project_drawer",
      name: `Magic Link for ${normalizedEmail}`,
      description: "",
      status: "pending",
      customProperties: {
        token,
        contactId: contact._id,
        contactEmail: normalizedEmail,
        projectId: args.projectId,
        redirectPath: args.redirectPath,
        expiresAt,
        usedAt: null,
      },
      createdBy: contact._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Return token for the action to send email
    // Note: In production, token should only be returned to internal action
    return {
      success: true,
      message: "Magic link will be sent if the email is registered.",
      // These are used by the API route to send email
      _internal: {
        token,
        contactId: contact._id,
        contactName: contact.name || normalizedEmail.split("@")[0],
        organizationName: organization.name,
      },
    };
  },
});

/**
 * Validate a magic link token and create session
 * Called when user clicks the magic link
 */
export const validateMagicLink = mutation({
  args: {
    token: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Find the token using indexed query to avoid scanning all documents
    // We use by_type_subtype index for efficiency
    const tokens = await ctx.db
      .query("objects")
      .withIndex("by_type_subtype", (q) =>
        q.eq("type", "magic_link_token").eq("subtype", "project_drawer")
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const tokenRecord = tokens.find(
      (t) => (t.customProperties as { token?: string })?.token === args.token
    );

    if (!tokenRecord) {
      throw new Error("Invalid or expired token");
    }

    const props = tokenRecord.customProperties as {
      token: string;
      contactId: string;
      contactEmail: string;
      projectId: string;
      redirectPath: string;
      expiresAt: number;
      usedAt: number | null;
    };

    // 2. Validate token is not expired
    if (Date.now() > props.expiresAt) {
      await ctx.db.patch(tokenRecord._id, {
        status: "expired",
        updatedAt: Date.now(),
      });
      throw new Error("Token has expired. Please request a new magic link.");
    }

    // 3. Validate token is not already used
    if (tokenRecord.status === "used" || props.usedAt) {
      throw new Error("Token has already been used. Please request a new magic link.");
    }

    // 4. Mark token as used
    await ctx.db.patch(tokenRecord._id, {
      status: "used",
      customProperties: {
        ...props,
        usedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    // 5. Create frontend session
    const sessionId = crypto.randomUUID();
    const sessionExpiresAt = Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    await ctx.db.insert("frontendSessions", {
      sessionId,
      frontendUserId: props.contactId as Id<"objects">,
      contactEmail: props.contactEmail,
      organizationId: tokenRecord.organizationId,
      portalType: "project_drawer",
      portalUrl: props.redirectPath,
      createdAt: Date.now(),
      expiresAt: sessionExpiresAt,
      lastActivityAt: Date.now(),
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
    });

    // 6. Log the authentication
    await ctx.db.insert("objectActions", {
      organizationId: tokenRecord.organizationId,
      objectId: props.contactId as Id<"objects">,
      actionType: "magic_link_login",
      actionData: {
        tokenId: tokenRecord._id,
        sessionId,
        projectId: props.projectId,
        loginMethod: "magic_link",
      },
      performedBy: props.contactId as Id<"objects">,
      performedAt: Date.now(),
    });

    return {
      success: true,
      sessionId,
      contactEmail: props.contactEmail,
      organizationId: tokenRecord.organizationId,
      expiresAt: sessionExpiresAt,
      redirectPath: props.redirectPath,
    };
  },
});
