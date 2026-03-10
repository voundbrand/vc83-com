"use node";

/**
 * FEEDBACK EMAIL ACTION
 *
 * Sends support-routed email notifications for feedback submissions.
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { resolveSupportRecipient } from "../lib/supportRouting";
import {
  EMAIL_COLORS,
  EMAIL_STYLES,
  emailDarkWrapper,
  emailHeader,
  emailFooter,
  emailContentRow,
} from "../lib/emailBrandConstants";

const createResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
};

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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSentimentLabel(sentiment: "negative" | "neutral" | "positive"): string {
  switch (sentiment) {
    case "negative":
      return "Negative";
    case "neutral":
      return "Neutral";
    case "positive":
      return "Positive";
    default:
      return "Unknown";
  }
}

function buildInfoRow(label: string, value?: string | number | null): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return `<p style="margin:4px 0;font-size:13px;color:${EMAIL_COLORS.textSecondary};"><strong style="color:${EMAIL_COLORS.textPrimary};">${escapeHtml(label)}:</strong> ${escapeHtml(String(value))}</p>`;
}

export const sendFeedbackNotification = internalAction({
  args: {
    feedbackId: v.id("objects"),
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
  handler: async (_ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    const resolvedRecipient = resolveSupportRecipient({
      organizationSupportEmail: args.supportRecipient,
      envSupportEmail: process.env.SUPPORT_EMAIL,
      envSalesEmail: process.env.SALES_EMAIL,
    });

    const supportRecipient = resolvedRecipient.email;
    const sentimentLabel = formatSentimentLabel(args.sentiment);
    const submittedAtIso = new Date(args.submittedAt).toISOString();
    const userFullName = [args.userContext.firstName, args.userContext.lastName]
      .filter((token): token is string => Boolean(token && token.length > 0))
      .join(" ");

    const runtimeContextRows = [
      buildInfoRow("App", args.runtimeContext?.app),
      buildInfoRow("Panel", args.runtimeContext?.panel),
      buildInfoRow("Context", args.runtimeContext?.context),
      buildInfoRow("Source", args.runtimeContext?.source),
      buildInfoRow("Path", args.runtimeContext?.pagePath),
      buildInfoRow("URL", args.runtimeContext?.pageUrl),
      buildInfoRow("Title", args.runtimeContext?.pageTitle),
      buildInfoRow("Referrer", args.runtimeContext?.referrer),
      buildInfoRow("Locale", args.runtimeContext?.locale),
      buildInfoRow("Viewport", args.runtimeContext
        ? `${args.runtimeContext.viewportWidth ?? "?"}x${args.runtimeContext.viewportHeight ?? "?"}`
        : undefined),
      buildInfoRow("User Agent", args.runtimeContext?.userAgent),
    ]
      .filter((row) => row.length > 0)
      .join("\n");

    const subject = `[Support Feedback][${sentimentLabel}] ${args.organizationContext.organizationName}`;

    const sentimentColors: Record<string, string> = {
      negative: EMAIL_COLORS.error,
      neutral: EMAIL_COLORS.warning,
      positive: EMAIL_COLORS.success,
    };
    const pillColor = sentimentColors[args.sentiment] || EMAIL_COLORS.textSecondary;

    const html = emailDarkWrapper(
      emailHeader({ subtitle: "Support Feedback Submission" }) +
      emailContentRow(`
        <p style="margin:0 0 4px;font-size:12px;color:${EMAIL_COLORS.textTertiary};">Feedback ID: ${escapeHtml(String(args.feedbackId))}</p>

        <h2 style="margin:16px 0 12px;font-size:15px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">Summary</h2>
        <p style="margin:0 0 8px;">
          <span style="display:inline-block;font-size:12px;font-weight:600;border-radius:9999px;padding:4px 10px;background:${pillColor};color:#FFFFFF;">${escapeHtml(sentimentLabel)}</span>
        </p>
        <p style="margin:4px 0;font-size:13px;color:${EMAIL_COLORS.textSecondary};"><strong style="color:${EMAIL_COLORS.textPrimary};">Submitted At:</strong> ${escapeHtml(submittedAtIso)}</p>
        <p style="margin:4px 0;font-size:13px;color:${EMAIL_COLORS.textSecondary};"><strong style="color:${EMAIL_COLORS.textPrimary};">Recipient Route:</strong> ${escapeHtml(args.recipientSource)}${
          args.preventedSalesRoute ? " (sales route prevented)" : ""
        }</p>

        <hr style="border:none;border-top:1px solid ${EMAIL_COLORS.border};margin:20px 0;" />

        <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">User Context</h2>
        ${buildInfoRow("User ID", args.userContext.userId)}
        ${buildInfoRow("Name", userFullName || undefined)}
        ${buildInfoRow("Email", args.userContext.email)}
        ${buildInfoRow("Session Organization", args.userContext.sessionOrganizationId)}

        <hr style="border:none;border-top:1px solid ${EMAIL_COLORS.border};margin:20px 0;" />

        <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">Organization Context</h2>
        ${buildInfoRow("Organization ID", args.organizationContext.organizationId)}
        ${buildInfoRow("Name", args.organizationContext.organizationName)}
        ${buildInfoRow("Slug", args.organizationContext.organizationSlug)}

        <hr style="border:none;border-top:1px solid ${EMAIL_COLORS.border};margin:20px 0;" />

        <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">Runtime Context</h2>
        ${runtimeContextRows || `<p style="margin:4px 0;font-size:13px;color:${EMAIL_COLORS.textTertiary};">No runtime context provided.</p>`}

        <hr style="border:none;border-top:1px solid ${EMAIL_COLORS.border};margin:20px 0;" />

        <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">Feedback Message</h2>
        <div style="background:${EMAIL_COLORS.surfaceRaised};border:1px solid ${EMAIL_COLORS.border};border-radius:${EMAIL_STYLES.cardRadius};padding:12px;white-space:pre-wrap;font-size:13px;color:${EMAIL_COLORS.textPrimary};">${escapeHtml(args.message)}</div>
      `) +
      emailFooter()
    );

    const replyTo = args.userContext.email.includes("@") ? args.userContext.email : undefined;

    try {
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: supportRecipient,
        subject,
        html,
        replyTo,
        headers: {
          "X-Entity-Ref-ID": `feedback-${String(args.feedbackId)}`,
          "X-Feedback-Sentiment": args.sentiment,
          "X-Feedback-Recipient-Source": args.recipientSource,
        },
      });

      if (error) {
        console.error("[Feedback Email] Failed to send:", error);
        throw new Error(`Email send failed: ${error.message}`);
      }

      console.log(`[Feedback Email] Sent feedback notification to ${supportRecipient}`);
    } catch (error) {
      console.error("[Feedback Email] Error:", error);
      throw error;
    }
  },
});
