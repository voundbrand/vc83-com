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

  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(String(value))}</p>`;
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

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.55; color: #2A2A2A; background-color: #F3F4F6; margin: 0; padding: 0; }
    .container { max-width: 720px; margin: 24px auto; background-color: #FFFFFF; border: 1px solid #D1D5DB; }
    .header { background: #111827; color: #F9FAFB; padding: 20px 24px; }
    .header h1 { margin: 0; font-size: 18px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; color: #D1D5DB; }
    .section { padding: 16px 24px; border-top: 1px solid #E5E7EB; }
    .section h2 { margin: 0 0 10px 0; font-size: 14px; color: #111827; }
    .section p { margin: 4px 0; font-size: 13px; color: #374151; }
    .message-box { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 12px; white-space: pre-wrap; font-size: 13px; }
    .pill { display: inline-block; font-size: 12px; font-weight: 600; border-radius: 9999px; padding: 4px 10px; background: #E5E7EB; color: #111827; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Support Feedback Submission</h1>
      <p>Feedback ID: ${escapeHtml(String(args.feedbackId))}</p>
    </div>

    <div class="section">
      <h2>Summary</h2>
      <p><span class="pill">Sentiment: ${escapeHtml(sentimentLabel)}</span></p>
      <p><strong>Submitted At:</strong> ${escapeHtml(submittedAtIso)}</p>
      <p><strong>Recipient Route:</strong> ${escapeHtml(args.recipientSource)}${
        args.preventedSalesRoute ? " (sales route prevented)" : ""
      }</p>
    </div>

    <div class="section">
      <h2>User Context</h2>
      ${buildInfoRow("User ID", args.userContext.userId)}
      ${buildInfoRow("Name", userFullName || undefined)}
      ${buildInfoRow("Email", args.userContext.email)}
      ${buildInfoRow("Session Organization", args.userContext.sessionOrganizationId)}
    </div>

    <div class="section">
      <h2>Organization Context</h2>
      ${buildInfoRow("Organization ID", args.organizationContext.organizationId)}
      ${buildInfoRow("Name", args.organizationContext.organizationName)}
      ${buildInfoRow("Slug", args.organizationContext.organizationSlug)}
    </div>

    <div class="section">
      <h2>Runtime Context</h2>
      ${runtimeContextRows || "<p>No runtime context provided.</p>"}
    </div>

    <div class="section">
      <h2>Feedback Message</h2>
      <div class="message-box">${escapeHtml(args.message)}</div>
    </div>
  </div>
</body>
</html>
    `.trim();

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
