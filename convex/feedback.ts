/**
 * USER FEEDBACK
 *
 * Stores user feedback with sentiment and runtime context, then notifies support.
 */

import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { resolveSupportRecipient } from "./lib/supportRouting";

const generatedApi: any = require("./_generated/api");

const feedbackSentimentValidator = v.union(
  v.literal("negative"),
  v.literal("neutral"),
  v.literal("positive"),
);

const feedbackRuntimeContextValidator = v.object({
  app: v.optional(v.string()),
  panel: v.optional(v.string()),
  context: v.optional(v.string()),
  pagePath: v.optional(v.string()),
  pageUrl: v.optional(v.string()),
  pageTitle: v.optional(v.string()),
  referrer: v.optional(v.string()),
  locale: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  viewportWidth: v.optional(v.number()),
  viewportHeight: v.optional(v.number()),
  source: v.optional(v.string()),
});

const feedbackUserContextValidator = v.object({
  userId: v.string(),
  email: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  sessionOrganizationId: v.optional(v.string()),
});

const feedbackOrganizationContextValidator = v.object({
  organizationId: v.string(),
  organizationName: v.string(),
  organizationSlug: v.optional(v.string()),
});

/**
 * Submit feedback (public action)
 */
export const submitFeedback = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    sentiment: feedbackSentimentValidator,
    message: v.string(),
    runtimeContext: v.optional(feedbackRuntimeContextValidator),
  },
  handler: async (ctx, args) => {
    const message = args.message.trim();
    if (!message) {
      throw new Error("Feedback message cannot be empty");
    }

    const currentUser = await (ctx as any).runQuery(generatedApi.api.auth.getCurrentUser, {
      sessionId: args.sessionId,
    });

    if (!currentUser) {
      throw new Error("Session is invalid or expired");
    }

    const userId = currentUser.id as string | undefined;
    const userEmail = currentUser.email as string | undefined;
    if (!userId || !userEmail) {
      throw new Error("Authenticated user context is incomplete");
    }

    const hasOrganizationAccess =
      Boolean(currentUser.isSuperAdmin) ||
      (Array.isArray(currentUser.organizations)
        ? currentUser.organizations.some((candidate: any) => String(candidate?.id) === String(args.organizationId))
        : false);

    if (!hasOrganizationAccess) {
      throw new Error("Access denied for requested organization");
    }

    const organization = await (ctx as any).runQuery(generatedApi.api.organizations.get, {
      id: args.organizationId,
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    const organizationContact = await (ctx as any).runQuery(
      generatedApi.api.organizationOntology.getOrganizationContact,
      {
        organizationId: args.organizationId,
      },
    );

    const organizationContactProps =
      (organizationContact?.customProperties as Record<string, unknown> | undefined) || {};
    const organizationSupportEmail =
      typeof organizationContactProps.supportEmail === "string"
        ? organizationContactProps.supportEmail
        : undefined;

    const supportRecipient = resolveSupportRecipient({
      organizationSupportEmail,
      envSupportEmail: process.env.SUPPORT_EMAIL,
      envSalesEmail: process.env.SALES_EMAIL,
    });

    const submittedAt = Date.now();

    const userContext = {
      userId: String(userId),
      email: String(userEmail),
      firstName:
        typeof currentUser.firstName === "string" && currentUser.firstName.length > 0
          ? currentUser.firstName
          : undefined,
      lastName:
        typeof currentUser.lastName === "string" && currentUser.lastName.length > 0
          ? currentUser.lastName
          : undefined,
      sessionOrganizationId:
        typeof currentUser.currentOrganization?.id === "string"
          ? currentUser.currentOrganization.id
          : undefined,
    };

    const organizationContext = {
      organizationId: String(args.organizationId),
      organizationName: String(organization.name || "Unknown Organization"),
      organizationSlug:
        typeof organization.slug === "string" && organization.slug.length > 0
          ? organization.slug
          : undefined,
    };

    const feedbackId = (await (ctx as any).runMutation(generatedApi.internal.feedback.insertFeedback, {
      organizationId: args.organizationId,
      sentiment: args.sentiment,
      message,
      submittedAt,
      runtimeContext: args.runtimeContext,
      userContext,
      organizationContext,
      supportRecipient: supportRecipient.email,
      recipientSource: supportRecipient.source,
      preventedSalesRoute: supportRecipient.preventedSalesRoute,
    })) as Id<"objects">;

    try {
      await (ctx as any).runAction(generatedApi.internal.actions.feedbackEmail.sendFeedbackNotification, {
        feedbackId,
        sentiment: args.sentiment,
        message,
        submittedAt,
        runtimeContext: args.runtimeContext,
        userContext,
        organizationContext,
        supportRecipient: supportRecipient.email,
        recipientSource: supportRecipient.source,
        preventedSalesRoute: supportRecipient.preventedSalesRoute,
      });
    } catch (error) {
      console.error("[Feedback] Failed to send email notification:", error);
    }

    return {
      success: true,
      feedbackId,
      supportRecipient: supportRecipient.email,
    };
  },
});

/**
 * Insert feedback record (internal mutation)
 */
export const insertFeedback = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    sentiment: feedbackSentimentValidator,
    message: v.string(),
    submittedAt: v.number(),
    runtimeContext: v.optional(feedbackRuntimeContextValidator),
    userContext: feedbackUserContextValidator,
    organizationContext: feedbackOrganizationContextValidator,
    supportRecipient: v.string(),
    recipientSource: v.union(
      v.literal("organization_contact"),
      v.literal("support_env"),
      v.literal("fallback"),
    ),
    preventedSalesRoute: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "user_feedback",
      subtype: args.sentiment,
      name: `${args.sentiment} feedback`,
      status: "active",
      customProperties: {
        sentiment: args.sentiment,
        message: args.message,
        submittedAt: args.submittedAt,
        runtimeContext: args.runtimeContext,
        userContext: args.userContext,
        organizationContext: args.organizationContext,
        supportRecipient: args.supportRecipient,
        recipientSource: args.recipientSource,
        preventedSalesRoute: args.preventedSalesRoute,
      },
      createdBy: args.userContext.userId as Id<"users">,
      createdAt: args.submittedAt,
      updatedAt: args.submittedAt,
    });
  },
});
