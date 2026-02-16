/**
 * Email Sync Module - Ontology Architecture
 *
 * Stores emails as objects with type="email" in the universal objects table.
 * Scoped to organizations for multi-tenancy.
 */

import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("./_generated/api");

/**
 * Sync emails from Microsoft Graph API
 * Stores them as objects with type="email"
 */
export const syncEmailsFromMicrosoft = action({
  args: {
    connectionId: v.id("oauthConnections"),
    top: v.optional(v.number()), // Number of emails to fetch
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    emailsStored: number;
    totalFetched: number;
  }> => {
    // Get the OAuth connection
    const connection = await (ctx as any).runQuery(generatedApi.internal.oauth.microsoft.getConnection, {
      connectionId: args.connectionId,
    });

    if (!connection) {
      throw new Error("OAuth connection not found");
    }

    if (connection.status !== "active") {
      throw new Error("OAuth connection is not active");
    }

    if (!connection.organizationId) {
      throw new Error("Connection must be associated with an organization");
    }

    // Fetch emails from Microsoft Graph API
    const emailsResponse = await (ctx as any).runAction(generatedApi.api.oauth.graphClient.getEmails, {
      connectionId: args.connectionId,
      top: args.top || 50, // Default to 50 most recent emails
    });

    // Type the response - can be null or have a value array
    const emailsData = emailsResponse as { value?: Array<{
      id: string;
      subject?: string;
      from?: { emailAddress?: { address?: string; name?: string } };
      toRecipients?: Array<{ emailAddress?: { address?: string } }>;
      ccRecipients?: Array<{ emailAddress?: { address?: string } }>;
      bccRecipients?: Array<{ emailAddress?: { address?: string } }>;
      receivedDateTime: string;
      sentDateTime?: string;
      isRead?: boolean;
      hasAttachments?: boolean;
      bodyPreview?: string;
      importance?: string;
      conversationId?: string;
      internetMessageId?: string;
    }> } | null;

    // Store emails in objects table using ontology pattern
    const storedEmails: Id<"objects">[] = [];

    for (const email of emailsData?.value || []) {
      try {
        const emailObjectId = await (ctx as any).runMutation(generatedApi.internal.emails.createEmailObject, {
          organizationId: connection.organizationId,
          userId: connection.userId!,
          emailData: {
            messageId: email.id,
            subject: email.subject || "(No Subject)",
            from: email.from?.emailAddress?.address || "unknown",
            fromName: email.from?.emailAddress?.name,
            to: (email.toRecipients?.map((r: { emailAddress?: { address?: string } }) => r.emailAddress?.address).filter((addr): addr is string => !!addr)) || [],
            cc: (email.ccRecipients?.map((r: { emailAddress?: { address?: string } }) => r.emailAddress?.address).filter((addr): addr is string => !!addr)) || [],
            bcc: (email.bccRecipients?.map((r: { emailAddress?: { address?: string } }) => r.emailAddress?.address).filter((addr): addr is string => !!addr)) || [],
            receivedDateTime: email.receivedDateTime,
            sentDateTime: email.sentDateTime,
            isRead: email.isRead || false,
            hasAttachments: email.hasAttachments || false,
            bodyPreview: email.bodyPreview,
            importance: email.importance,
            conversationId: email.conversationId,
            internetMessageId: email.internetMessageId,
          },
        });

        storedEmails.push(emailObjectId);
      } catch (error) {
        console.error(`Failed to store email ${email.id}:`, error);
        // Continue with other emails even if one fails
      }
    }

    // Update lastSyncAt timestamp on the connection
    await (ctx as any).runMutation(generatedApi.internal.oauth.microsoft.updateLastSync, {
      connectionId: args.connectionId,
    });

    return {
      success: true,
      emailsStored: storedEmails.length,
      totalFetched: emailsData?.value?.length || 0,
    };
  },
});

/**
 * Internal mutation to create an email object
 * Follows ontology architecture with type="email"
 */
export const createEmailObject = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    emailData: v.object({
      messageId: v.string(),
      subject: v.string(),
      from: v.string(),
      fromName: v.optional(v.string()),
      to: v.array(v.string()),
      cc: v.optional(v.array(v.string())),
      bcc: v.optional(v.array(v.string())),
      receivedDateTime: v.string(),
      sentDateTime: v.optional(v.string()),
      isRead: v.boolean(),
      hasAttachments: v.boolean(),
      bodyPreview: v.optional(v.string()),
      importance: v.optional(v.string()),
      conversationId: v.optional(v.string()),
      internetMessageId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if email already exists (avoid duplicates)
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "email")
      )
      .filter((q) =>
        q.eq(
          q.field("customProperties.messageId"),
          args.emailData.messageId
        )
      )
      .first();

    if (existing) {
      // Update existing email instead of creating duplicate
      await ctx.db.patch(existing._id, {
        status: args.emailData.isRead ? "read" : "unread",
        customProperties: args.emailData,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new email object following ontology pattern
    const emailObjectId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "email",
      subtype: "inbox", // Could be "sent", "draft", etc. in future
      name: args.emailData.subject,
      description: args.emailData.bodyPreview,
      status: args.emailData.isRead ? "read" : "unread",
      customProperties: args.emailData,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return emailObjectId;
  },
});

/**
 * Query emails for an organization
 * Retrieves objects with type="email"
 */
export const getOrganizationEmails = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    status: v.optional(v.string()), // "read", "unread", or undefined for all
  },
  handler: async (ctx, args) => {
    let emailsQuery = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "email")
      )
      .order("desc");

    if (args.status) {
      emailsQuery = emailsQuery.filter((q) => q.eq(q.field("status"), args.status));
    }

    const emails = await emailsQuery.take(args.limit || 100);

    return emails.map((email) => ({
      id: email._id,
      subject: email.name,
      preview: email.description,
      status: email.status,
      from: email.customProperties?.from as string | undefined,
      fromName: email.customProperties?.fromName as string | undefined,
      receivedDateTime: email.customProperties?.receivedDateTime as string | undefined,
      isRead: email.customProperties?.isRead as boolean | undefined,
      hasAttachments: email.customProperties?.hasAttachments as boolean | undefined,
      createdAt: email.createdAt,
    }));
  },
});

/**
 * Get email sync status for a connection
 */
export const getEmailSyncStatus = query({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);

    if (!connection || !connection.organizationId) {
      return null;
    }

    // Count total emails synced
    const allEmails = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", connection.organizationId!).eq("type", "email")
      )
      .collect();

    const totalEmails = allEmails.length;

    // Count unread emails
    const unreadEmails = allEmails.filter((email) => email.status === "unread").length;

    return {
      totalEmails,
      unreadEmails,
      lastSyncAt: connection.lastSyncAt,
      syncEnabled: connection.syncSettings?.email || false,
    };
  },
});

/**
 * Update sync settings for a connection
 */
export const updateSyncSettings = mutation({
  args: {
    sessionId: v.string(),
    connectionId: v.id("oauthConnections"),
    syncSettings: v.object({
      email: v.optional(v.boolean()),
      calendar: v.optional(v.boolean()),
      onedrive: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    // Verify session owns this connection (sessionId is the document _id)
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session) {
      throw new Error("Invalid session");
    }

    const connection = await ctx.db.get(args.connectionId);

    if (!connection || connection.userId !== session.userId) {
      throw new Error("Connection not found or access denied");
    }

    // Update sync settings
    await ctx.db.patch(args.connectionId, {
      syncSettings: {
        ...connection.syncSettings,
        ...args.syncSettings,
      },
    });

    return { success: true };
  },
});
