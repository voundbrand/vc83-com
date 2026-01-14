/**
 * Microsoft Graph Email Sending
 *
 * Handles sending emails via Microsoft Graph API (/me/sendMail endpoint).
 * Benefits:
 * - Emails sent from user's actual Microsoft account
 * - Better deliverability (Microsoft's infrastructure)
 * - Sent emails stored in user's "Sent Items" folder
 * - Supports attachments, CC, BCC, etc.
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Send email via Microsoft Graph API
 *
 * Uses the /me/sendMail endpoint which:
 * - Sends from the authenticated user's mailbox
 * - Stores sent email in "Sent Items"
 * - Supports HTML, attachments, tracking
 *
 * @param connectionId - OAuth connection to use
 * @param to - Recipient email(s)
 * @param subject - Email subject line
 * @param body - HTML email body
 * @param attachments - Optional file attachments (base64 encoded)
 * @param cc - Optional CC recipients
 * @param bcc - Optional BCC recipients
 * @param replyTo - Optional reply-to address
 * @param importance - Email importance level
 * @returns Result with success status and message ID
 */
export const sendEmailViaMicrosoft = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
    to: v.union(v.string(), v.array(v.string())), // Single or multiple recipients
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    subject: v.string(),
    body: v.string(), // HTML content
    attachments: v.optional(v.array(v.object({
      filename: v.string(),
      content: v.string(), // Base64 encoded
      contentType: v.string(),
    }))),
    replyTo: v.optional(v.string()),
    importance: v.optional(v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high")
    )),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> => {
    try {
      // Prepare recipients
      const toRecipients = Array.isArray(args.to)
        ? args.to.map(email => ({ emailAddress: { address: email } }))
        : [{ emailAddress: { address: args.to } }];

      const ccRecipients = args.cc?.map(email => ({
        emailAddress: { address: email }
      }));

      const bccRecipients = args.bcc?.map(email => ({
        emailAddress: { address: email }
      }));

      // Prepare attachments for Microsoft Graph format
      const graphAttachments = args.attachments?.map(att => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: att.filename,
        contentType: att.contentType,
        contentBytes: att.content, // Already base64
      }));

      // Build message object according to Microsoft Graph API spec
      const message: any = {
        subject: args.subject,
        body: {
          contentType: "HTML",
          content: args.body,
        },
        toRecipients,
        importance: args.importance || "normal",
      };

      // Add optional fields only if present
      if (ccRecipients && ccRecipients.length > 0) {
        message.ccRecipients = ccRecipients;
      }

      if (bccRecipients && bccRecipients.length > 0) {
        message.bccRecipients = bccRecipients;
      }

      if (graphAttachments && graphAttachments.length > 0) {
        message.attachments = graphAttachments;
      }

      // Add replyTo if specified
      if (args.replyTo) {
        message.replyTo = [{ emailAddress: { address: args.replyTo } }];
      }

      console.log(`📧 Sending email via Microsoft Graph to ${Array.isArray(args.to) ? args.to.join(', ') : args.to}`);

      // Send via Microsoft Graph
      const response = await ctx.runAction(internal.oauth.graphClient.graphRequest, {
        connectionId: args.connectionId,
        endpoint: "/me/sendMail",
        method: "POST",
        body: {
          message,
          saveToSentItems: true, // Store in Sent Items folder
        },
      });

      // Microsoft Graph API returns 202 Accepted (usually no body)
      console.log(`✅ Email sent successfully via Microsoft Graph`);

      return {
        success: true,
        messageId: (response?.id as string | undefined) || "sent", // Graph API doesn't always return message ID
      };

    } catch (error) {
      console.error("❌ Failed to send email via Microsoft:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Send bulk emails via Microsoft (with rate limiting)
 *
 * Microsoft Graph has rate limits:
 * - ~30 emails per minute for personal accounts
 * - ~1000 emails per minute for work/school accounts
 *
 * This function automatically rate-limits to avoid hitting these limits.
 *
 * @param connectionId - OAuth connection to use
 * @param emails - Array of emails to send
 * @param delayBetweenSends - Milliseconds to wait between sends (default: 2000)
 * @returns Statistics about sent/failed emails
 */
export const sendBulkEmailsViaMicrosoft = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
    organizationId: v.id("organizations"), // Added for tier check
    emails: v.array(v.object({
      to: v.string(),
      subject: v.string(),
      body: v.string(),
      attachments: v.optional(v.array(v.any())),
    })),
    delayBetweenSends: v.optional(v.number()), // Milliseconds
  },
  handler: async (ctx, args): Promise<{
    totalSent: number;
    totalFailed: number;
    failures: Array<{ email: string; error: string }>;
  }> => {
    // CHECK FEATURE ACCESS: Bulk email requires Starter+
    const { internal: internalApi } = await import("../_generated/api");
    await ctx.runQuery(internalApi.licensing.helpers.checkFeatureAccessInternal, {
      organizationId: args.organizationId,
      featureFlag: "bulkEmailEnabled",
    });
    const results = {
      totalSent: 0,
      totalFailed: 0,
      failures: [] as Array<{ email: string; error: string }>,
    };

    const delay = args.delayBetweenSends || 2000; // Default 2 seconds

    console.log(`📧 Starting bulk send: ${args.emails.length} emails with ${delay}ms delay`);

    for (const email of args.emails) {
      try {
        const result = await ctx.runAction(internal.oauth.emailSending.sendEmailViaMicrosoft, {
          connectionId: args.connectionId,
          to: email.to,
          subject: email.subject,
          body: email.body,
          attachments: email.attachments,
        });

        if (result.success) {
          results.totalSent++;
          console.log(`✅ Sent ${results.totalSent}/${args.emails.length}: ${email.to}`);
        } else {
          results.totalFailed++;
          results.failures.push({
            email: email.to,
            error: result.error || "Unknown error",
          });
          console.error(`❌ Failed ${results.totalFailed}/${args.emails.length}: ${email.to} - ${result.error}`);
        }
      } catch (error) {
        results.totalFailed++;
        results.failures.push({
          email: email.to,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(`❌ Exception sending to ${email.to}:`, error);
      }

      // Rate limiting delay (skip on last email)
      if (delay > 0 && results.totalSent + results.totalFailed < args.emails.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`✅ Bulk send complete: ${results.totalSent} sent, ${results.totalFailed} failed`);

    return results;
  },
});
