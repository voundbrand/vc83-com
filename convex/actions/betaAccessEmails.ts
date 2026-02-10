"use node";

/**
 * BETA ACCESS EMAIL NOTIFICATIONS
 *
 * Sends emails for beta access workflow:
 * - Sales notification when new request comes in
 * - Confirmation to requester
 * - Approval notification
 * - Rejection notification
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// Initialize Resend client
const createResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
};

/**
 * Send sales notification when new beta access request is submitted
 */
export const notifySalesOfBetaRequest = internalAction({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    requestReason: v.optional(v.string()),
    useCase: v.optional(v.string()),
    referralSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";
    const salesEmail = process.env.SALES_EMAIL || "remington@l4yercak3.com";

    const fullName = `${args.firstName || ""} ${args.lastName || ""}`.trim() || "Unknown";

    const subject = `🔒 New Beta Access Request: ${fullName}`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #2A2A2A;
      background-color: #F3F4F6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #FFFFFF;
      border: 3px solid #6B46C1;
      box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.2);
    }
    .header {
      background: linear-gradient(135deg, #6B46C1 0%, #9F7AEA 100%);
      padding: 30px;
      text-align: center;
      border-bottom: 3px solid #6B46C1;
    }
    .header h1 {
      font-family: 'Courier New', Courier, monospace;
      font-size: 20px;
      color: #FFFFFF;
      margin: 0;
      text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.3);
    }
    .content {
      padding: 40px 30px;
    }
    .info-box {
      background: #F9FAFB;
      border-left: 4px solid #6B46C1;
      padding: 20px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 15px 40px;
      background-color: #6B46C1;
      color: #FFFFFF;
      text-decoration: none;
      font-weight: bold;
      border: 3px solid #6B46C1;
      box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.2);
      font-size: 16px;
    }
    .footer {
      background-color: #F9FAFB;
      padding: 20px 30px;
      text-align: center;
      border-top: 3px solid #6B46C1;
      font-size: 14px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 New Beta Access Request</h1>
    </div>

    <div class="content">
      <h2 style="color: #6B46C1;">Someone wants beta access!</h2>

      <div class="info-box">
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${args.email}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' })}</p>
      </div>

      ${args.requestReason ? `
      <h3>Why they want access:</h3>
      <div class="info-box">
        <p>${args.requestReason}</p>
      </div>
      ` : ''}

      ${args.useCase ? `
      <h3>Their use case:</h3>
      <div class="info-box">
        <p>${args.useCase}</p>
      </div>
      ` : ''}

      ${args.referralSource ? `
      <p><strong>How they found us:</strong> ${args.referralSource}</p>
      ` : ''}

      <h2>🎯 Next Steps</h2>
      <ul>
        <li>Review the request in the admin dashboard</li>
        <li>Check their email/profile for legitimacy</li>
        <li>Approve or reject with reason</li>
        <li>They'll receive an email notification of your decision</li>
      </ul>

      <p><a href="https://l4yercak3.com/?openWindow=organizations&panel=beta-access" class="button">Review in Admin Dashboard</a></p>
    </div>

    <div class="footer">
      <p>L4YERCAK3 Beta Access System</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: salesEmail,
        subject,
        html,
        headers: {
          'X-Entity-Ref-ID': `beta-request-${Date.now()}`,
        },
      });

      if (error) {
        console.error("Failed to send sales notification:", error);
        throw new Error(`Email could not be sent: ${error.message}`);
      }

      console.log("✅ Sales notification sent successfully:", data);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending sales notification:", error);
      throw error;
    }
  },
});

/**
 * Send confirmation email to requester
 */
export const sendBetaRequestConfirmation = internalAction({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    const firstName = args.firstName || "there";
    const subject = "Your Beta Access Request is Being Reviewed";
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #2A2A2A;
      background-color: #F3F4F6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #FFFFFF;
      border: 3px solid #6B46C1;
      box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.2);
    }
    .header {
      background: linear-gradient(135deg, #6B46C1 0%, #9F7AEA 100%);
      padding: 30px;
      text-align: center;
      border-bottom: 3px solid #6B46C1;
    }
    .header h1 {
      font-family: 'Courier New', Courier, monospace;
      font-size: 20px;
      color: #FFFFFF;
      margin: 0;
      text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.3);
    }
    .content {
      padding: 40px 30px;
    }
    .info-box {
      background: #F9FAFB;
      border-left: 4px solid #6B46C1;
      padding: 20px;
      margin: 20px 0;
    }
    .footer {
      background-color: #F9FAFB;
      padding: 20px 30px;
      text-align: center;
      border-top: 3px solid #6B46C1;
      font-size: 14px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Request Received</h1>
    </div>

    <div class="content">
      <h2 style="color: #6B46C1;">Hi ${firstName}!</h2>

      <p>Thank you for your interest in l4yercak3! We've received your beta access request and it's currently under review.</p>

      <div class="info-box">
        <p><strong>What happens next?</strong></p>
        <ul>
          <li>Our team will review your request within 24-48 hours</li>
          <li>We'll send you an email when we make a decision</li>
          <li>If approved, you'll get instant access to the platform</li>
        </ul>
      </div>

      <p>We appreciate your patience as we carefully grow our beta community!</p>

      <p>In the meantime, feel free to:</p>
      <ul>
        <li>Check out our <a href="https://l4yercak3.com/docs">documentation</a></li>
        <li>Follow us on <a href="https://twitter.com/l4yercak3">Twitter</a></li>
        <li>Join our <a href="https://discord.gg/l4yercak3">Discord community</a></li>
      </ul>

      <p><strong>Questions?</strong> Reply to this email anytime.</p>
    </div>

    <div class="footer">
      <p>L4YERCAK3 Team</p>
      <p><a href="https://l4yercak3.com">l4yercak3.com</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: process.env.REPLY_TO_EMAIL || "team@mail.l4yercak3.com",
        to: args.email,
        subject,
        html,
        headers: {
          'X-Entity-Ref-ID': `beta-confirmation-${Date.now()}`,
        },
      });

      if (error) {
        console.error("Failed to send confirmation email:", error);
        throw new Error(`Email could not be sent: ${error.message}`);
      }

      console.log("✅ Confirmation email sent successfully:", data);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending confirmation email:", error);
      throw error;
    }
  },
});

/**
 * Send approval notification to user
 */
export const sendBetaApprovalEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    const firstName = args.firstName || "there";
    const subject = "🎉 Your Beta Access Has Been Approved!";
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #2A2A2A;
      background-color: #F3F4F6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #FFFFFF;
      border: 3px solid #10b981;
      box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.2);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
      padding: 30px;
      text-align: center;
      border-bottom: 3px solid #10b981;
    }
    .header h1 {
      font-family: 'Courier New', Courier, monospace;
      font-size: 20px;
      color: #FFFFFF;
      margin: 0;
      text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.3);
    }
    .content {
      padding: 40px 30px;
    }
    .info-box {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 15px 40px;
      background-color: #10b981;
      color: #FFFFFF;
      text-decoration: none;
      font-weight: bold;
      border: 3px solid #10b981;
      box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.2);
      font-size: 16px;
    }
    .footer {
      background-color: #F9FAFB;
      padding: 20px 30px;
      text-align: center;
      border-top: 3px solid #10b981;
      font-size: 14px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to l4yercak3!</h1>
    </div>

    <div class="content">
      <h2 style="color: #10b981;">Hi ${firstName}!</h2>

      <p><strong>Great news!</strong> Your beta access request has been approved. You now have full access to l4yercak3! 🎉</p>

      <div class="info-box">
        <p><strong>Getting Started:</strong></p>
        <ol>
          <li>Sign in at <a href="https://l4yercak3.com">l4yercak3.com</a></li>
          <li>Complete your profile</li>
          <li>Explore the platform features</li>
          <li>Start building your first project</li>
        </ol>
      </div>

      <p><a href="https://l4yercak3.com" class="button">Sign In Now →</a></p>

      <h3>🚀 What's Next?</h3>
      <ul>
        <li><strong>Quick Start Guide:</strong> Check out our <a href="https://l4yercak3.com/docs/quickstart">quick start guide</a></li>
        <li><strong>Templates:</strong> Browse our <a href="https://l4yercak3.com/?openWindow=templates">template library</a></li>
        <li><strong>Support:</strong> Join our <a href="https://discord.gg/l4yercak3">Discord</a> for help</li>
        <li><strong>Feedback:</strong> We'd love to hear your thoughts!</li>
      </ul>

      <p>As a beta user, your feedback is incredibly valuable. Please don't hesitate to reach out with questions, suggestions, or issues.</p>

      <p><strong>Happy building! 🎂</strong></p>
    </div>

    <div class="footer">
      <p>L4YERCAK3 Team</p>
      <p><a href="https://l4yercak3.com">l4yercak3.com</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: process.env.REPLY_TO_EMAIL || "team@mail.l4yercak3.com",
        to: args.email,
        subject,
        html,
        headers: {
          'X-Entity-Ref-ID': `beta-approval-${Date.now()}`,
        },
      });

      if (error) {
        console.error("Failed to send approval email:", error);
        throw new Error(`Email could not be sent: ${error.message}`);
      }

      console.log("✅ Approval email sent successfully:", data);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending approval email:", error);
      throw error;
    }
  },
});

/**
 * Send rejection notification to user
 */
export const sendBetaRejectionEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    const firstName = args.firstName || "there";
    const subject = "Your Beta Access Request Update";
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #2A2A2A;
      background-color: #F3F4F6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #FFFFFF;
      border: 3px solid #6B46C1;
      box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.2);
    }
    .header {
      background: linear-gradient(135deg, #6B46C1 0%, #9F7AEA 100%);
      padding: 30px;
      text-align: center;
      border-bottom: 3px solid #6B46C1;
    }
    .header h1 {
      font-family: 'Courier New', Courier, monospace;
      font-size: 20px;
      color: #FFFFFF;
      margin: 0;
      text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.3);
    }
    .content {
      padding: 40px 30px;
    }
    .info-box {
      background: #F9FAFB;
      border-left: 4px solid #6B46C1;
      padding: 20px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 15px 40px;
      background-color: #6B46C1;
      color: #FFFFFF;
      text-decoration: none;
      font-weight: bold;
      border: 3px solid #6B46C1;
      box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.2);
      font-size: 16px;
    }
    .footer {
      background-color: #F9FAFB;
      padding: 20px 30px;
      text-align: center;
      border-top: 3px solid #6B46C1;
      font-size: 14px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Beta Access Request Update</h1>
    </div>

    <div class="content">
      <h2 style="color: #6B46C1;">Hi ${firstName},</h2>

      <p>Thank you for your interest in l4yercak3. After careful review, we're unable to approve your beta access request at this time.</p>

      <div class="info-box">
        <p><strong>Reason:</strong></p>
        <p>${args.reason}</p>
      </div>

      <p>We appreciate your interest and encourage you to:</p>
      <ul>
        <li>Stay connected with our community</li>
        <li>Follow our progress on <a href="https://twitter.com/l4yercak3">Twitter</a></li>
        <li>Join our <a href="https://discord.gg/l4yercak3">Discord</a> for updates</li>
        <li>Sign up for our newsletter for launch announcements</li>
      </ul>

      <p>You're welcome to apply again in the future when your circumstances change or when we open up more beta slots.</p>

      <p><a href="https://l4yercak3.com" class="button">Visit Our Website</a></p>
    </div>

    <div class="footer">
      <p>L4YERCAK3 Team</p>
      <p><a href="https://l4yercak3.com">l4yercak3.com</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: process.env.REPLY_TO_EMAIL || "team@mail.l4yercak3.com",
        to: args.email,
        subject,
        html,
        headers: {
          'X-Entity-Ref-ID': `beta-rejection-${Date.now()}`,
        },
      });

      if (error) {
        console.error("Failed to send rejection email:", error);
        throw new Error(`Email could not be sent: ${error.message}`);
      }

      console.log("✅ Rejection email sent successfully:", data);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending rejection email:", error);
      throw error;
    }
  },
});
