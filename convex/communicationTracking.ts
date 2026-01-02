/**
 * COMMUNICATION TRACKING
 *
 * Logs all email communications sent to customers for debugging and compliance.
 * Helps trace if emails were actually sent, when, and to whom.
 *
 * Records are stored in customProperties of organizations and CRM contacts.
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * LOG EMAIL COMMUNICATION
 *
 * Records an email communication in the organization and optionally CRM contact.
 * This creates an audit trail for all emails sent through the platform.
 *
 * @param organizationId - Organization that sent the email
 * @param recipientEmail - Email address of recipient
 * @param subject - Email subject line
 * @param emailType - Type of email (invoice, ticket, notification, etc.)
 * @param success - Whether the email was successfully sent
 * @param messageId - Resend message ID (if successful)
 * @param crmContactId - Optional CRM contact ID
 * @param crmOrganizationId - Optional CRM organization ID (for B2B)
 * @param errorMessage - Error message if failed
 */
export const logEmailCommunication = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    recipientEmail: v.string(),
    subject: v.string(),
    emailType: v.union(
      v.literal("invoice"),
      v.literal("ticket"),
      v.literal("order_confirmation"),
      v.literal("sales_notification"),
      v.literal("survey"),
      v.literal("marketing"),
      v.literal("system")
    ),
    success: v.boolean(),
    messageId: v.optional(v.string()),
    crmContactId: v.optional(v.id("objects")),
    crmOrganizationId: v.optional(v.id("objects")),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    // Create communication log entry
    const communicationLog = {
      timestamp,
      recipientEmail: args.recipientEmail,
      subject: args.subject,
      emailType: args.emailType,
      success: args.success,
      messageId: args.messageId,
      errorMessage: args.errorMessage,
      metadata: args.metadata,
    };

    console.log(`📧 [Communication Log] ${args.success ? "✓" : "✗"} ${args.emailType} to ${args.recipientEmail}`);

    // 1. Log to organization's metadata (as a linked object in the ontology pattern)
    // Organizations use the ontology pattern, so we create a communication_log object instead
    // This will be queryable via objectLinks
    await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "communication_log",
      subtype: args.emailType,
      name: `${args.emailType} to ${args.recipientEmail}`,
      status: args.success ? "sent" : "failed",
      createdAt: timestamp,
      updatedAt: timestamp,
      customProperties: communicationLog,
    });

    // 2. Log to CRM contact if provided
    if (args.crmContactId) {
      const contact = await ctx.db.get(args.crmContactId);
      if (contact && contact.type === "crm_contact") {
        const existingHistory = (contact.customProperties?.communicationHistory as any[]) || [];
        const updatedHistory = [communicationLog, ...existingHistory].slice(0, 50); // Keep last 50 communications

        await ctx.db.patch(args.crmContactId, {
          customProperties: {
            ...(contact.customProperties || {}),
            communicationHistory: updatedHistory,
            lastCommunicationAt: timestamp,
          },
        });
      }
    }

    // 3. Log to CRM organization if provided
    if (args.crmOrganizationId) {
      const crmOrg = await ctx.db.get(args.crmOrganizationId);
      if (crmOrg && crmOrg.type === "crm_organization") {
        const existingHistory = (crmOrg.customProperties?.communicationHistory as any[]) || [];
        const updatedHistory = [communicationLog, ...existingHistory].slice(0, 50); // Keep last 50 communications

        await ctx.db.patch(args.crmOrganizationId, {
          customProperties: {
            ...(crmOrg.customProperties || {}),
            communicationHistory: updatedHistory,
            lastCommunicationAt: timestamp,
          },
        });
      }
    }

    return {
      success: true,
      loggedAt: timestamp,
    };
  },
});

/**
 * GET COMMUNICATION HISTORY
 *
 * Retrieves communication history for an organization or CRM contact.
 *
 * @param organizationId - Organization ID
 * @param limit - Maximum number of communications to return (default: 50)
 */
export const getCommunicationHistory = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Query communication_log objects for this organization
    const logs = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "communication_log")
      )
      .order("desc")
      .take(limit);

    return logs.map(log => log.customProperties);
  },
});
