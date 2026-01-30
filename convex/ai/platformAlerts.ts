/**
 * PLATFORM ALERTS
 *
 * Sends alerts to platform administrators for critical issues
 * like OpenRouter API failures, payment issues, etc.
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// Admin email for platform alerts
const ADMIN_EMAIL = "service@l4yercak3.com";

export const sendPlatformAlert = action({
  args: {
    alertType: v.union(
      v.literal("openrouter_payment"),
      v.literal("openrouter_error"),
      v.literal("rate_limit"),
      v.literal("service_outage")
    ),
    errorMessage: v.string(),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    context: v.optional(v.string()), // e.g., "page_builder", "chat"
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error("[Platform Alert] RESEND_API_KEY not configured");
      return { success: false, error: "Email service not configured" };
    }

    const resend = new Resend(resendApiKey);

    // Build alert subject and body based on type
    let subject: string;
    let urgency: string;

    switch (args.alertType) {
      case "openrouter_payment":
        subject = "🚨 URGENT: OpenRouter Payment Issue (402)";
        urgency = "HIGH";
        break;
      case "openrouter_error":
        subject = "⚠️ OpenRouter API Error";
        urgency = "MEDIUM";
        break;
      case "rate_limit":
        subject = "⚠️ OpenRouter Rate Limit Hit";
        urgency = "LOW";
        break;
      case "service_outage":
        subject = "🚨 URGENT: AI Service Outage";
        urgency = "HIGH";
        break;
      default:
        subject = "⚠️ Platform Alert";
        urgency = "MEDIUM";
    }

    const timestamp = new Date().toISOString();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${urgency === "HIGH" ? "#dc2626" : "#f59e0b"}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 12px; }
    .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
    .value { margin-top: 4px; padding: 8px 12px; background: white; border: 1px solid #e5e7eb; border-radius: 4px; font-family: monospace; font-size: 14px; }
    .error { color: #dc2626; }
    .action { margin-top: 20px; padding: 16px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; }
    .action-title { font-weight: 600; color: #92400e; margin-bottom: 8px; }
    .action-link { display: inline-block; margin-top: 8px; padding: 8px 16px; background: #f59e0b; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 20px;">${subject}</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">Platform Alert - ${timestamp}</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Alert Type</div>
        <div class="value">${args.alertType}</div>
      </div>

      <div class="field">
        <div class="label">Error Message</div>
        <div class="value error">${args.errorMessage}</div>
      </div>

      ${args.context ? `
      <div class="field">
        <div class="label">Context</div>
        <div class="value">${args.context}</div>
      </div>
      ` : ""}

      ${args.organizationId ? `
      <div class="field">
        <div class="label">Organization ID</div>
        <div class="value">${args.organizationId}</div>
      </div>
      ` : ""}

      ${args.userId ? `
      <div class="field">
        <div class="label">User ID</div>
        <div class="value">${args.userId}</div>
      </div>
      ` : ""}

      <div class="field">
        <div class="label">Timestamp</div>
        <div class="value">${timestamp}</div>
      </div>

      ${args.alertType === "openrouter_payment" ? `
      <div class="action">
        <div class="action-title">Recommended Action</div>
        <p style="margin: 0;">OpenRouter API credits may be depleted. Please check and top up the account.</p>
        <a href="https://openrouter.ai/credits" class="action-link">Go to OpenRouter Credits →</a>
      </div>
      ` : ""}
    </div>
  </div>
</body>
</html>
    `;

    const textBody = `
${subject}

Alert Type: ${args.alertType}
Error Message: ${args.errorMessage}
${args.context ? `Context: ${args.context}` : ""}
${args.organizationId ? `Organization ID: ${args.organizationId}` : ""}
${args.userId ? `User ID: ${args.userId}` : ""}
Timestamp: ${timestamp}

${args.alertType === "openrouter_payment" ? `
RECOMMENDED ACTION:
OpenRouter API credits may be depleted. Please check and top up the account.
https://openrouter.ai/credits
` : ""}
    `.trim();

    try {
      const result = await resend.emails.send({
        from: "l4yercak3 <alerts@mail.l4yercak3.com>",
        to: ADMIN_EMAIL,
        subject,
        html: htmlBody,
        text: textBody,
      });

      console.log(`[Platform Alert] Sent ${args.alertType} alert to ${ADMIN_EMAIL}`);

      return { success: true, emailId: result.data?.id };
    } catch (error) {
      console.error("[Platform Alert] Failed to send email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send alert email",
      };
    }
  },
});
