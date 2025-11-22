/**
 * API V1: USERS INTERNAL HANDLERS
 *
 * Internal query/mutation handlers for user profile API endpoints.
 * These are called by the HTTP action handlers in users.ts.
 *
 * ========================================================================
 * IMPORTANT: frontend_user OBJECT STRUCTURE
 * ========================================================================
 *
 * frontend_user is stored in the OBJECTS table (NOT the users table!)
 *
 * Location: objects table
 * - Type field: "frontend_user" (objects.type)
 * - Name field: User's email address (objects.name)
 * - OrganizationId: PLATFORM_ORGANIZATION_ID (from environment)
 *
 * Represents: CUSTOMERS/END-USERS who log in to the frontend app
 * NOT: Platform staff (those are in the "users" table)
 *
 * Custom Properties (objects.customProperties):
 * - displayName: string - User's display name
 * - oauthProvider: string - OAuth provider (e.g., "microsoft", "google")
 * - oauthId: string - Provider's unique user ID
 * - lastLogin: number - Timestamp of last login
 * - preferredLanguage: string - UI language preference
 * - timezone: string - User timezone
 *
 * Relationship Chain (via objectLinks table):
 * frontend_user (objects, type="frontend_user")
 *   ↓ linkType: "authenticates_as"
 * crm_contact (objects, type="crm_contact")
 *   ↓ linkType: "works_at"
 * crm_organization (objects, type="crm_organization")
 *   ↓ linkType: "purchased", "has_ticket", "registered_for", "earned"
 * transactions, tickets, events, certificates (objects, various types)
 *
 * SECURITY: All endpoints are session-based (NOT API key based)
 * Users can ONLY access their own data.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

/**
 * HELPER: Get frontend_user from session
 *
 * IMPORTANT: Uses frontendSessions table (not sessions)!
 * Frontend customer sessions are separate from platform staff sessions.
 * Session.organizationId provides org-scoped security - same email can exist in multiple orgs.
 */
async function getFrontendUserFromSession(
  ctx: any,
  sessionId: string
): Promise<{ frontendUser: Doc<"objects">; session: Doc<"frontendSessions"> } | null> {
  // 1. Validate frontend session
  const session = await ctx.db.get(sessionId as Id<"frontendSessions">);
  if (!session) return null;
  if (session.expiresAt < Date.now()) return null;

  // 2. Get frontend_user by email AND organizationId (org-scoped lookup)
  // This ensures we get the right user even if same email exists in multiple orgs
  // The organizationId comes from the API key that created the session - server-side security!
  const frontendUser = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", session.organizationId).eq("type", "frontend_user")
    )
    .filter((q: any) => q.eq(q.field("name"), session.email))
    .first();

  if (!frontendUser) return null;

  return { frontendUser, session };
}

/**
 * HELPER: Get linked CRM contact
 */
async function getLinkedCrmContact(ctx: any, frontendUserId: Id<"objects">) {
  const links = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_object", (q: any) => q.eq("fromObjectId", frontendUserId))
    .filter((q: any) => q.eq(q.field("linkType"), "authenticates_as"))
    .collect();

  if (links.length === 0) return null;

  const contactId = links[0].toObjectId;
  return await ctx.db.get(contactId);
}

/**
 * HELPER: Get linked CRM organization
 */
async function getLinkedCrmOrganization(ctx: any, contactId: Id<"objects">) {
  const links = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_object", (q: any) => q.eq("fromObjectId", contactId))
    .filter((q: any) => q.eq(q.field("linkType"), "works_at"))
    .collect();

  if (links.length === 0) return null;

  const orgId = links[0].toObjectId;
  return await ctx.db.get(orgId);
}

/**
 * HELPER: Get recent transactions
 */
async function getRecentTransactions(
  ctx: any,
  contactId?: Id<"objects">,
  organizationId?: Id<"objects">,
  limit = 10,
  offset = 0
) {
  if (!contactId && !organizationId) return [];

  // Find transaction links (check both contact and organization)
  const contactLinks = contactId
    ? await ctx.db
        .query("objectLinks")
        .withIndex("by_from_object", (q: any) => q.eq("fromObjectId", contactId))
        .filter((q: any) => q.eq(q.field("linkType"), "purchased"))
        .collect()
    : [];

  const orgLinks = organizationId
    ? await ctx.db
        .query("objectLinks")
        .withIndex("by_from_object", (q: any) => q.eq("fromObjectId", organizationId))
        .filter((q: any) => q.eq(q.field("linkType"), "purchased"))
        .collect()
    : [];

  const allLinks = [...contactLinks, ...orgLinks];

  // Get transaction objects
  const transactions = await Promise.all(
    allLinks.map((link: Doc<"objectLinks">) => ctx.db.get(link.toObjectId))
  );

  // Filter, sort, and paginate
  return transactions
    .filter((t): t is Doc<"objects"> => t !== null && t.type === "transaction")
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(offset, offset + limit)
    .map((t) => ({
      id: t._id,
      amount: (t.customProperties as any)?.totalAmount || 0,
      currency: (t.customProperties as any)?.currency || "USD",
      status: t.status,
      items: (t.customProperties as any)?.items || [],
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
}

/**
 * HELPER: Get active tickets
 */
async function getActiveTickets(ctx: any, contactId?: Id<"objects">) {
  if (!contactId) return [];

  // Find ticket links
  const links = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_object", (q: any) => q.eq("fromObjectId", contactId))
    .filter((q: any) => q.eq(q.field("linkType"), "has_ticket"))
    .collect();

  // Get ticket objects with event info
  const tickets = await Promise.all(
    links.map(async (link: Doc<"objectLinks">) => {
      const ticket = await ctx.db.get(link.toObjectId);
      if (!ticket || ticket.type !== "ticket") return null;

      // Get linked event
      const eventLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_object", (q: any) => q.eq("fromObjectId", ticket._id))
        .filter((q: any) => q.eq(q.field("linkType"), "for_event"))
        .collect();

      const eventId = eventLinks[0]?.toObjectId;
      const event = eventId ? await ctx.db.get(eventId) : null;

      return {
        id: ticket._id,
        ticketType: (ticket.customProperties as any)?.ticketType || "General",
        status: ticket.status,
        qrCode: (ticket.customProperties as any)?.qrCode,
        event: event
          ? {
              id: event._id,
              name: event.name,
              startDate: (event.customProperties as any)?.startDate,
              location: (event.customProperties as any)?.location,
            }
          : null,
        createdAt: ticket.createdAt,
      };
    })
  );

  return tickets.filter((t): t is NonNullable<typeof t> => t !== null);
}

/**
 * HELPER: Get upcoming events
 */
async function getUpcomingEvents(ctx: any, contactId?: Id<"objects">, limit = 5) {
  if (!contactId) return [];

  // Find event registration links
  const links = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_object", (q: any) => q.eq("fromObjectId", contactId))
    .filter((q: any) => q.eq(q.field("linkType"), "registered_for"))
    .collect();

  // Get event objects
  const events = await Promise.all(
    links.map((link: Doc<"objectLinks">) => ctx.db.get(link.toObjectId))
  );

  const now = Date.now();

  // Filter for upcoming events, sort by date
  return events
    .filter((e): e is Doc<"objects"> => e !== null && e.type === "event" && ((e.customProperties as any)?.startDate || 0) > now)
    .sort((a, b) => ((a.customProperties as any)?.startDate || 0) - ((b.customProperties as any)?.startDate || 0))
    .slice(0, limit)
    .map((e) => ({
      id: e._id,
      name: e.name,
      startDate: (e.customProperties as any)?.startDate,
      endDate: (e.customProperties as any)?.endDate,
      location: (e.customProperties as any)?.location,
      status: e.status,
    }));
}

/**
 * HELPER: Get certificates
 */
async function getCertificates(ctx: any, contactId?: Id<"objects">) {
  if (!contactId) return [];

  // Find certificate links
  const links = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_object", (q: any) => q.eq("fromObjectId", contactId))
    .filter((q: any) => q.eq(q.field("linkType"), "earned"))
    .collect();

  // Get certificate objects
  const certificates = await Promise.all(
    links.map(async (link: Doc<"objectLinks">) => {
      const cert = await ctx.db.get(link.toObjectId);
      if (!cert || cert.type !== "certificate") return null;

      // Get linked event (if any)
      const eventLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_object", (q: any) => q.eq("fromObjectId", cert._id))
        .filter((q: any) => q.eq(q.field("linkType"), "for_event"))
        .collect();

      const eventId = eventLinks[0]?.toObjectId;
      const event = eventId ? await ctx.db.get(eventId) : null;

      return {
        id: cert._id,
        certificateType: (cert.customProperties as any)?.certificateType || "attendance",
        issuedAt: cert.createdAt,
        downloadUrl: (cert.customProperties as any)?.downloadUrl,
        event: event ? { id: event._id, name: event.name } : null,
      };
    })
  );

  return certificates.filter((c): c is NonNullable<typeof c> => c !== null);
}

/**
 * GET CURRENT USER (INTERNAL)
 * Returns basic user profile
 */
export const getCurrentUserInternal = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const result = await getFrontendUserFromSession(ctx, args.sessionId);
    if (!result) return null;

    const { frontendUser } = result;

    // Get linked CRM contact
    const crmContact = await getLinkedCrmContact(ctx, frontendUser._id);

    // Get linked CRM organization
    const crmOrganization = crmContact
      ? await getLinkedCrmOrganization(ctx, crmContact._id)
      : null;

    return {
      userId: frontendUser._id,
      email: frontendUser.name,
      displayName: (frontendUser.customProperties as any)?.displayName || frontendUser.name,
      accountStatus: frontendUser.status,
      crmContact: crmContact
        ? {
            id: crmContact._id,
            firstName: (crmContact.customProperties as any)?.firstName,
            lastName: (crmContact.customProperties as any)?.lastName,
            company: (crmContact.customProperties as any)?.company,
            phone: (crmContact.customProperties as any)?.phone,
          }
        : null,
      crmOrganization: crmOrganization
        ? {
            id: crmOrganization._id,
            name: crmOrganization.name,
            billingAddress: (crmOrganization.customProperties as any)?.billingAddress,
          }
        : null,
      createdAt: frontendUser.createdAt,
      lastLogin: (frontendUser.customProperties as any)?.lastLogin || frontendUser.createdAt,
    };
  },
});

/**
 * GET COMPLETE PROFILE (INTERNAL)
 * Returns full user profile with all activity
 */
export const getCompleteProfileInternal = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const result = await getFrontendUserFromSession(ctx, args.sessionId);
    if (!result) return null;

    const { frontendUser } = result;

    // Get linked CRM contact
    const crmContact = await getLinkedCrmContact(ctx, frontendUser._id);

    // Get linked CRM organization
    const crmOrganization = crmContact
      ? await getLinkedCrmOrganization(ctx, crmContact._id)
      : null;

    // PARALLEL fetch of all related data
    const [transactions, tickets, events, certificates] = await Promise.all([
      getRecentTransactions(ctx, crmContact?._id, crmOrganization?._id),
      getActiveTickets(ctx, crmContact?._id),
      getUpcomingEvents(ctx, crmContact?._id),
      getCertificates(ctx, crmContact?._id),
    ]);

    return {
      user: {
        id: frontendUser._id,
        email: frontendUser.name,
        displayName: (frontendUser.customProperties as any)?.displayName || frontendUser.name,
        accountStatus: frontendUser.status,
        createdAt: frontendUser.createdAt,
        lastLogin: (frontendUser.customProperties as any)?.lastLogin || frontendUser.createdAt,
      },
      contact: crmContact
        ? {
            id: crmContact._id,
            firstName: (crmContact.customProperties as any)?.firstName,
            lastName: (crmContact.customProperties as any)?.lastName,
            company: (crmContact.customProperties as any)?.company,
            phone: (crmContact.customProperties as any)?.phone,
            email: (crmContact.customProperties as any)?.email,
          }
        : null,
      organization: crmOrganization
        ? {
            id: crmOrganization._id,
            name: crmOrganization.name,
            billingAddress: (crmOrganization.customProperties as any)?.billingAddress,
            taxId: (crmOrganization.customProperties as any)?.taxId,
          }
        : null,
      activity: {
        recentTransactions: transactions,
        upcomingEvents: events,
        activeTickets: tickets,
        certificates: certificates,
      },
    };
  },
});

/**
 * GET TRANSACTIONS (INTERNAL)
 */
export const getTransactionsInternal = internalQuery({
  args: {
    sessionId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const result = await getFrontendUserFromSession(ctx, args.sessionId);
    if (!result) return null;

    const { frontendUser } = result;

    // Get linked CRM contact and organization
    const crmContact = await getLinkedCrmContact(ctx, frontendUser._id);
    const crmOrganization = crmContact
      ? await getLinkedCrmOrganization(ctx, crmContact._id)
      : null;

    const transactions = await getRecentTransactions(
      ctx,
      crmContact?._id,
      crmOrganization?._id,
      args.limit || 20,
      args.offset || 0
    );

    return {
      transactions,
      total: transactions.length, // TODO: Get actual count for pagination
      limit: args.limit || 20,
      offset: args.offset || 0,
    };
  },
});

/**
 * GET TICKETS (INTERNAL)
 */
export const getTicketsInternal = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const result = await getFrontendUserFromSession(ctx, args.sessionId);
    if (!result) return null;

    const { frontendUser } = result;
    const crmContact = await getLinkedCrmContact(ctx, frontendUser._id);

    const tickets = await getActiveTickets(ctx, crmContact?._id);

    return { tickets, total: tickets.length };
  },
});

/**
 * GET EVENTS (INTERNAL)
 */
export const getEventsInternal = internalQuery({
  args: {
    sessionId: v.string(),
    upcoming: v.optional(v.boolean()),
    past: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const result = await getFrontendUserFromSession(ctx, args.sessionId);
    if (!result) return null;

    const { frontendUser } = result;
    const crmContact = await getLinkedCrmContact(ctx, frontendUser._id);

    if (!crmContact) return { upcomingEvents: [], pastEvents: [], totalAttended: 0 };

    // Find all event registration links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q: any) => q.eq("fromObjectId", crmContact._id))
      .filter((q: any) => q.eq(q.field("linkType"), "registered_for"))
      .collect();

    // Get all event objects
    const events = await Promise.all(links.map((link: Doc<"objectLinks">) => ctx.db.get(link.toObjectId)));

    const now = Date.now();
    const validEvents = events.filter((e): e is Doc<"objects"> => e !== null && e.type === "event");

    const upcomingEvents = validEvents
      .filter((e) => ((e.customProperties as any)?.startDate || 0) > now)
      .sort((a, b) => ((a.customProperties as any)?.startDate || 0) - ((b.customProperties as any)?.startDate || 0))
      .map((e) => ({
        id: e._id,
        name: e.name,
        startDate: (e.customProperties as any)?.startDate,
        endDate: (e.customProperties as any)?.endDate,
        location: (e.customProperties as any)?.location,
        status: e.status,
      }));

    const pastEvents = validEvents
      .filter((e) => ((e.customProperties as any)?.startDate || 0) <= now)
      .sort((a, b) => ((b.customProperties as any)?.startDate || 0) - ((a.customProperties as any)?.startDate || 0))
      .map((e) => ({
        id: e._id,
        name: e.name,
        startDate: (e.customProperties as any)?.startDate,
        endDate: (e.customProperties as any)?.endDate,
        location: (e.customProperties as any)?.location,
        status: e.status,
      }));

    return {
      upcomingEvents: args.upcoming === false ? [] : upcomingEvents,
      pastEvents: args.past === false ? [] : pastEvents,
      totalAttended: pastEvents.length,
    };
  },
});

/**
 * UPDATE CURRENT USER (INTERNAL)
 */
export const updateCurrentUserInternal = internalMutation({
  args: {
    sessionId: v.string(),
    updates: v.object({
      displayName: v.optional(v.string()),
      preferredLanguage: v.optional(v.string()),
      timezone: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const result = await getFrontendUserFromSession(ctx, args.sessionId);
    if (!result) throw new Error("Invalid session");

    const { frontendUser } = result;

    // Update frontend_user object (in objects table)
    await ctx.db.patch(frontendUser._id, {
      customProperties: {
        ...frontendUser.customProperties,
        ...args.updates,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
