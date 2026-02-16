"use node";

/**
 * FEEDBACK EMAIL ACTION
 *
 * Sends email notification to support team when user submits feedback.
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

const createResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
};

export const sendFeedbackNotification = internalAction({
  args: {
    category: v.string(),
    rating: v.number(),
    message: v.string(),
    userEmail: v.string(),
    userName: v.string(),
    organizationName: v.string(),
  },
  handler: async (_ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";
    const supportEmail = process.env.SUPPORT_EMAIL || "support@l4yercak3.com";

    const categoryEmoji: Record<string, string> = {
      bug: "🐛",
      feature: "💡",
      feedback: "💬",
      billing: "💳",
    };

    const emoji = categoryEmoji[args.category] || "💬";
    const stars = "★".repeat(args.rating) + "☆".repeat(5 - args.rating);

    const subject = `${emoji} ${args.category.charAt(0).toUpperCase() + args.category.slice(1)}: ${args.organizationName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2A2A2A; background-color: #F3F4F6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #FFFFFF; border: 3px solid #6B46C1; box-shadow: 8px 8px 0px rgba(0,0,0,0.2); }
    .header { background: linear-gradient(135deg, #6B46C1 0%, #9F7AEA 100%); padding: 30px; text-align: center; border-bottom: 3px solid #6B46C1; }
    .header h1 { font-family: 'Courier New', monospace; font-size: 20px; color: #FFFFFF; margin: 0; text-shadow: 2px 2px 0px rgba(0,0,0,0.3); }
    .content { padding: 40px 30px; }
    .info-box { background: #F9FAFB; border-left: 4px solid #6B46C1; padding: 20px; margin: 20px 0; }
    .rating { font-size: 24px; color: #f59e0b; margin-bottom: 10px; }
    .message-box { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 20px; margin: 20px 0; white-space: pre-wrap; }
    .footer { background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 3px solid #6B46C1; font-size: 14px; color: #6B7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>${emoji} User Feedback</h1></div>
    <div class="content">
      <h2 style="color: #6B46C1;">${args.category.charAt(0).toUpperCase() + args.category.slice(1)}</h2>
      <div class="info-box">
        <p class="rating">${stars}</p>
        <p><strong>From:</strong> ${args.userName}</p>
        <p><strong>Email:</strong> ${args.userEmail}</p>
        <p><strong>Organization:</strong> ${args.organizationName}</p>
        <p><strong>Category:</strong> ${args.category}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' })}</p>
      </div>
      <h3>Message</h3>
      <div class="message-box">${args.message}</div>
    </div>
    <div class="footer"><p>L4YERCAK3 Feedback Notification</p></div>
  </div>
</body>
</html>
    `.trim();

    try {
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: supportEmail,
        subject,
        html,
        replyTo: args.userEmail,
        headers: {
          "X-Entity-Ref-ID": `feedback-${args.category}-${Date.now()}`,
        },
      });

      if (error) {
        console.error("[Feedback Email] Failed to send:", error);
        throw new Error(`Email send failed: ${error.message}`);
      }

      console.log(`[Feedback Email] ✓ Sent feedback notification: ${args.category}`);
    } catch (error) {
      console.error("[Feedback Email] Error:", error);
      throw error;
    }
  },
});
