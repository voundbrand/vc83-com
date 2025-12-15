/**
 * UNIVERSAL PORTAL INVITATION SYSTEM
 *
 * Plug-and-play user management for ANY external portal template.
 * This system enables CRM contacts to be invited to external portals
 * with automatic OAuth/Magic Link authentication.
 *
 * HOW IT WORKS:
 * 1. Organization creates a CRM contact
 * 2. Organization invites contact to a portal (freelancer, client, vendor, etc.)
 * 3. Contact receives email with OAuth/Magic Link login
 * 4. Contact logs in and sees their portal (filtered by their contact ID)
 *
 * PORTAL TYPES:
 * - "freelancer_portal" - Project/invoice management
 * - "client_portal" - Client-facing dashboards
 * - "vendor_portal" - Vendor/supplier portals
 * - "custom_portal" - Any custom deployed portal
 *
 * ONTOLOGY STRUCTURE:
 * - Objects table: portal_invitation (type)
 * - Subtypes: "freelancer", "client", "vendor", "custom"
 * - Links: invitation → contact, invitation → portal_config
 */

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { api, internal } from "./_generated/api";

/**
 * CREATE PORTAL INVITATION
 *
 * Invites a CRM contact to access an external portal.
 * Creates a portal_invitation object and sends invitation email.
 *
 * Args:
 * - contactId: The CRM contact to invite
 * - portalType: "freelancer_portal" | "client_portal" | "vendor_portal" | "custom_portal"
 * - portalUrl: The deployed portal URL (e.g., "https://portal.acme.com")
 * - authMethod: "oauth" | "magic_link" | "both"
 * - expiresInDays: Optional expiration (default: 7 days)
 * - customMessage: Optional personalized message
 */
export const createPortalInvitation = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    contactId: v.id("objects"),
    portalType: v.union(
      v.literal("freelancer_portal"),
      v.literal("client_portal"),
      v.literal("vendor_portal"),
      v.literal("custom_portal")
    ),
    portalUrl: v.string(),
    authMethod: v.union(
      v.literal("oauth"),
      v.literal("magic_link"),
      v.literal("both")
    ),
    expiresInDays: v.optional(v.number()),
    customMessage: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())), // Custom permissions for this portal
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Verify contact exists and belongs to this organization
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.type !== "crm_contact") {
      throw new Error("Contact not found");
    }

    if (contact.organizationId !== args.organizationId) {
      throw new Error("Contact does not belong to this organization");
    }

    // Get contact email
    const contactEmail = contact.customProperties?.email as string;
    if (!contactEmail) {
      throw new Error("Contact must have an email address");
    }

    // Generate unique invitation token
    const invitationToken = crypto.randomUUID();

    // Calculate expiration
    const expiresInMs = (args.expiresInDays || 7) * 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + expiresInMs;

    // Create portal_invitation object
    const invitationId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "portal_invitation",
      subtype: args.portalType,
      name: `Portal Invitation - ${contact.name}`,
      description: `Invitation to ${args.portalType} for ${contact.name}`,
      status: "pending", // "pending" → "accepted" → "expired" → "revoked"
      customProperties: {
        contactId: args.contactId,
        contactEmail: contactEmail,
        portalType: args.portalType,
        portalUrl: args.portalUrl,
        authMethod: args.authMethod,
        invitationToken: invitationToken,
        expiresAt: expiresAt,
        customMessage: args.customMessage,
        permissions: args.permissions || [],
        // Tracking
        sentAt: Date.now(),
        acceptedAt: null,
        lastAccessedAt: null,
        accessCount: 0,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link invitation to contact
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: invitationId,
      toObjectId: args.contactId,
      linkType: "invites",
      properties: {
        portalType: args.portalType,
        invitedAt: Date.now(),
      },
      createdBy: session.userId,
      createdAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: invitationId,
      actionType: "created",
      actionData: {
        contactId: args.contactId,
        contactEmail: contactEmail,
        portalType: args.portalType,
        authMethod: args.authMethod,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    // Schedule invitation email
    await ctx.scheduler.runAfter(0, internal.portalInvitations.sendInvitationEmail, {
      invitationId,
      contactEmail,
      portalUrl: args.portalUrl,
      authMethod: args.authMethod,
      invitationToken,
      customMessage: args.customMessage,
      organizationId: args.organizationId,
    });

    return {
      invitationId,
      invitationToken,
      expiresAt,
    };
  },
});

/**
 * SEND INVITATION EMAIL (Internal)
 *
 * Sends the portal invitation email to the contact.
 */
export const sendInvitationEmail = internalMutation({
  args: {
    invitationId: v.id("objects"),
    contactEmail: v.string(),
    portalUrl: v.string(),
    authMethod: v.string(),
    invitationToken: v.string(),
    customMessage: v.optional(v.string()),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get organization details
    const org = await ctx.db.get(args.organizationId);
    if (!org) return;

    // Get invitation
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) return;

    const portalType = invitation.customProperties?.portalType as string;

    // Generate login URL based on auth method
    let loginUrl = args.portalUrl;
    if (args.authMethod === "magic_link" || args.authMethod === "both") {
      loginUrl = `${args.portalUrl}/auth/magic-link?token=${args.invitationToken}`;
    } else {
      loginUrl = `${args.portalUrl}/auth/login?invitation=${args.invitationToken}`;
    }

    // Queue email
    await ctx.db.insert("emailQueue", {
      to: args.contactEmail,
      subject: `You've been invited to ${org.name}'s ${portalType.replace("_", " ")}`,
      type: "transactional",
      status: "pending",
      textBody: `
You've been invited to access ${org.name}'s ${portalType.replace("_", " ")}.

${args.customMessage || ""}

Click here to get started:
${loginUrl}

This invitation expires in 7 days.

---
${org.name}
      `.trim(),
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6B46C1 0%, #9F7AEA 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #E2E8F0; border-top: none; }
    .button { display: inline-block; background: #6B46C1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { color: #718096; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Portal Invitation</h1>
    </div>
    <div class="content">
      <p>You've been invited to access <strong>${org.name}'s ${portalType.replace("_", " ")}</strong>.</p>

      ${args.customMessage ? `<p>${args.customMessage}</p>` : ""}

      <a href="${loginUrl}" class="button">Access Portal</a>

      <p class="footer">This invitation expires in 7 days.</p>
    </div>
  </div>
</body>
</html>
      `,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * GET PORTAL INVITATIONS
 *
 * Returns all portal invitations for an organization.
 */
export const getPortalInvitations = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    status: v.optional(v.string()), // Filter by status
    portalType: v.optional(v.string()), // Filter by portal type
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "portal_invitation")
      );

    let invitations = await query.collect();

    // Apply filters
    if (args.status) {
      invitations = invitations.filter((inv) => inv.status === args.status);
    }

    if (args.portalType) {
      invitations = invitations.filter((inv) => inv.subtype === args.portalType);
    }

    return invitations;
  },
});

/**
 * GET CONTACT PORTAL INVITATIONS
 *
 * Returns all portal invitations for a specific contact.
 */
export const getContactPortalInvitations = query({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all invitations linked to this contact
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.contactId))
      .filter((q) => q.eq(q.field("linkType"), "invites"))
      .collect();

    // Fetch invitation objects
    const invitations = await Promise.all(
      links.map(async (link) => {
        const invitation = await ctx.db.get(link.fromObjectId);
        return invitation;
      })
    );

    return invitations.filter((inv) => inv !== null);
  },
});

/**
 * ACCEPT PORTAL INVITATION
 *
 * Marks invitation as accepted when contact logs in for the first time.
 * This is called by the portal auth flow after successful authentication.
 */
export const acceptPortalInvitation = mutation({
  args: {
    invitationToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Find invitation by token
    const allInvitations = await ctx.db
      .query("objects")
      .collect();

    const invitation = allInvitations.find(
      (inv) =>
        inv.type === "portal_invitation" &&
        inv.customProperties?.invitationToken === args.invitationToken
    );

    if (!invitation) {
      throw new Error("Invalid invitation token");
    }

    // Check expiration
    const expiresAt = invitation.customProperties?.expiresAt as number;
    if (Date.now() > expiresAt) {
      // Mark as expired
      await ctx.db.patch(invitation._id, {
        status: "expired",
        updatedAt: Date.now(),
      });
      throw new Error("Invitation has expired");
    }

    // Check if already accepted
    if (invitation.status === "accepted") {
      // Just update last accessed time
      await ctx.db.patch(invitation._id, {
        customProperties: {
          ...invitation.customProperties,
          lastAccessedAt: Date.now(),
          accessCount: ((invitation.customProperties?.accessCount as number) || 0) + 1,
        },
        updatedAt: Date.now(),
      });
      return {
        success: true,
        alreadyAccepted: true,
        contactEmail: invitation.customProperties?.contactEmail,
      };
    }

    // Mark as accepted
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      customProperties: {
        ...invitation.customProperties,
        acceptedAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 1,
      },
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: invitation.organizationId,
      objectId: invitation._id,
      actionType: "accepted",
      actionData: {
        acceptedAt: Date.now(),
      },
      performedAt: Date.now(),
    });

    return {
      success: true,
      alreadyAccepted: false,
      contactEmail: invitation.customProperties?.contactEmail,
    };
  },
});

/**
 * REVOKE PORTAL INVITATION
 *
 * Revokes access to a portal (e.g., when contact leaves project).
 */
export const revokePortalInvitation = mutation({
  args: {
    sessionId: v.string(),
    invitationId: v.id("objects"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.type !== "portal_invitation") {
      throw new Error("Invitation not found");
    }

    // Mark as revoked
    await ctx.db.patch(args.invitationId, {
      status: "revoked",
      customProperties: {
        ...invitation.customProperties,
        revokedAt: Date.now(),
        revokedBy: session.userId,
        revocationReason: args.reason,
      },
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: invitation.organizationId,
      objectId: args.invitationId,
      actionType: "revoked",
      actionData: {
        reason: args.reason,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * RESEND PORTAL INVITATION
 *
 * Resends invitation email to contact.
 */
export const resendPortalInvitation = mutation({
  args: {
    sessionId: v.string(),
    invitationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.type !== "portal_invitation") {
      throw new Error("Invitation not found");
    }

    // Check if revoked
    if (invitation.status === "revoked") {
      throw new Error("Cannot resend revoked invitation");
    }

    // Update sent timestamp
    await ctx.db.patch(args.invitationId, {
      customProperties: {
        ...invitation.customProperties,
        sentAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    // Resend email
    await ctx.scheduler.runAfter(0, internal.portalInvitations.sendInvitationEmail, {
      invitationId: args.invitationId,
      contactEmail: invitation.customProperties?.contactEmail as string,
      portalUrl: invitation.customProperties?.portalUrl as string,
      authMethod: invitation.customProperties?.authMethod as string,
      invitationToken: invitation.customProperties?.invitationToken as string,
      customMessage: invitation.customProperties?.customMessage as string | undefined,
      organizationId: invitation.organizationId,
    });

    return { success: true };
  },
});

/**
 * VERIFY PORTAL INVITATION (Public)
 *
 * Verifies an invitation token and returns contact info for portal login.
 * Called by external portals during authentication.
 */
export const verifyPortalInvitation = query({
  args: {
    invitationToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Find invitation by token
    const allInvitations = await ctx.db
      .query("objects")
      .collect();

    const invitation = allInvitations.find(
      (inv) =>
        inv.type === "portal_invitation" &&
        inv.customProperties?.invitationToken === args.invitationToken
    );

    if (!invitation) {
      return { valid: false, reason: "Invalid token" };
    }

    // Check expiration
    const expiresAt = invitation.customProperties?.expiresAt as number;
    if (Date.now() > expiresAt) {
      return { valid: false, reason: "Invitation expired" };
    }

    // Check if revoked
    if (invitation.status === "revoked") {
      return { valid: false, reason: "Invitation revoked" };
    }

    // Get organization
    const org = await ctx.db.get(invitation.organizationId);
    if (!org) {
      return { valid: false, reason: "Organization not found" };
    }

    return {
      valid: true,
      contactEmail: invitation.customProperties?.contactEmail,
      portalType: invitation.customProperties?.portalType,
      authMethod: invitation.customProperties?.authMethod,
      organizationSlug: org.slug,
      organizationName: org.name,
      permissions: invitation.customProperties?.permissions || [],
    };
  },
});
