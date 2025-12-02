/**
 * Email Sender Selection Strategy
 *
 * Determines the best email sender for an organization based on:
 * 1. Active Microsoft OAuth connection (preferred)
 * 2. Custom domain from domainConfig
 * 3. System default (Resend with support@l4yercak3.com)
 *
 * This allows seamless integration with Microsoft Outlook while maintaining
 * fallback to Resend for reliability.
 */

import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Email Sender Configuration
 * Describes how emails should be sent for an organization
 */
export interface EmailSenderConfig {
  type: 'microsoft' | 'resend';
  connectionId?: Id<"oauthConnections">;
  email: string;
  displayName?: string;
  domainConfigId?: Id<"objects">;
}

/**
 * Select the best email sender for an organization
 *
 * Priority order:
 * 1. Active Microsoft OAuth connection (if available and not explicitly avoided)
 * 2. Custom domain from domainConfig
 * 3. System default (Resend)
 *
 * @param organizationId - The organization sending the email
 * @param domainConfigId - Optional domain configuration to use
 * @param preferredType - Force a specific sender type (overrides auto-selection)
 * @returns EmailSenderConfig describing how to send the email
 */
export const selectEmailSender = query({
  args: {
    organizationId: v.id("organizations"),
    domainConfigId: v.optional(v.id("objects")),
    preferredType: v.optional(v.union(v.literal("microsoft"), v.literal("resend"))),
  },
  handler: async (ctx, args): Promise<EmailSenderConfig> => {
    // Check for active Microsoft OAuth connection
    const msConnection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("provider"), "microsoft"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    // If Microsoft connection exists and not explicitly avoiding it
    if (msConnection && args.preferredType !== 'resend') {
      return {
        type: 'microsoft',
        connectionId: msConnection._id,
        email: msConnection.providerEmail,
        displayName: "l4yercak3 Events", // Can be customized per organization
      };
    }

    // Check for custom domain configuration
    if (args.domainConfigId) {
      const domainConfig = await ctx.db.get(args.domainConfigId);
      if (domainConfig) {
        const emailSettings = (domainConfig.customProperties as any)?.email;
        if (emailSettings?.senderEmail) {
          return {
            type: 'resend',
            email: emailSettings.senderEmail,
            domainConfigId: args.domainConfigId,
          };
        }
      }
    }

    // Fall back to system default
    return {
      type: 'resend',
      email: process.env.AUTH_RESEND_FROM || "support@mail.l4yercak3.com",
    };
  },
});

/**
 * Get Microsoft connection for organization (if exists)
 * Internal query for use by other backend functions
 */
export const getMicrosoftConnection = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("provider"), "microsoft"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});

/**
 * Check if organization has an active Microsoft connection
 * Useful for UI to show connection status
 */
export const hasMicrosoftConnection = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const connection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("provider"), "microsoft"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return connection !== null;
  },
});
