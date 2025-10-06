import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// Initialize Resend client (will be created in the action)
const createResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
};

/**
 * Send invitation email to new or existing users
 */
export const sendInvitationEmail = internalAction({
  args: {
    to: v.string(),
    organizationName: v.string(),
    inviterName: v.string(),
    isNewUser: v.boolean(),
    setupLink: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@l4yercak3.com";

    const subject = args.isNewUser
      ? `You're invited to join ${args.organizationName} on L4YERCAK3`
      : `You've been added to ${args.organizationName} on L4YERCAK3`;

    const html = args.isNewUser
      ? getNewUserInvitationEmail(args)
      : getExistingUserInvitationEmail(args);

    try {
      const { data, error } = await resend.emails.send({
        from: `L4YERCAK3 <${fromEmail}>`,
        to: args.to,
        subject,
        html,
      });

      if (error) {
        console.error("Failed to send invitation email:", error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log("Invitation email sent successfully:", data);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending invitation email:", error);
      throw error;
    }
  },
});

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = internalAction({
  args: {
    to: v.string(),
    resetLink: v.string(),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@l4yercak3.com";

    const html = getPasswordResetEmail({
      userName: args.userName,
      resetLink: args.resetLink,
    });

    try {
      const { data, error } = await resend.emails.send({
        from: `L4YERCAK3 <${fromEmail}>`,
        to: args.to,
        subject: "Reset your L4YERCAK3 password",
        html,
      });

      if (error) {
        console.error("Failed to send password reset email:", error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log("Password reset email sent successfully:", data);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  },
});

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Email template for new user invitations
 */
function getNewUserInvitationEmail(args: {
  organizationName: string;
  inviterName: string;
  setupLink: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

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
      font-family: 'Press Start 2P', monospace;
      font-size: 20px;
      color: #FFFFFF;
      margin: 0;
      text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.3);
    }

    .content {
      padding: 40px 30px;
    }

    .greeting {
      font-size: 18px;
      color: #6B46C1;
      margin-bottom: 20px;
      font-weight: bold;
    }

    .message {
      font-size: 16px;
      color: #2A2A2A;
      margin-bottom: 30px;
    }

    .button-wrapper {
      text-align: center;
      margin: 40px 0;
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
      transition: all 0.2s;
      font-size: 16px;
    }

    .button:hover {
      background-color: #9F7AEA;
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.2);
    }

    .divider {
      height: 2px;
      background-color: #E5E5E5;
      margin: 30px 0;
    }

    .footer {
      background-color: #F9FAFB;
      padding: 20px 30px;
      text-align: center;
      border-top: 3px solid #6B46C1;
    }

    .footer-text {
      font-size: 14px;
      color: #6B7280;
    }

    .link-fallback {
      margin-top: 20px;
      padding: 15px;
      background-color: #F3F4F6;
      border-left: 4px solid #6B46C1;
      word-break: break-all;
    }

    .link-fallback-label {
      font-size: 12px;
      color: #6B7280;
      margin-bottom: 5px;
    }

    .link-fallback-url {
      font-family: monospace;
      font-size: 12px;
      color: #6B46C1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>L4YERCAK3</h1>
    </div>

    <div class="content">
      <div class="greeting">Welcome to L4YERCAK3! 🎉</div>

      <div class="message">
        <p><strong>${args.inviterName}</strong> has invited you to join <strong>${args.organizationName}</strong> on L4YERCAK3.</p>

        <p>L4YERCAK3 is a retro desktop-style workflow tool where you can layer on marketing superpowers: invoicing that syncs with your CRM, analytics that visualize your funnels, scheduling that automates your workflows—all in one cozy workspace.</p>

        <p>To get started, you'll need to set up your password and complete your profile.</p>
      </div>

      <div class="button-wrapper">
        <a href="${args.setupLink}" class="button">Set Up Your Account</a>
      </div>

      <div class="link-fallback">
        <div class="link-fallback-label">Or copy and paste this link into your browser:</div>
        <div class="link-fallback-url">${args.setupLink}</div>
      </div>

      <div class="divider"></div>

      <div class="message">
        <p>This invitation link will expire in 7 days. If you have any questions, please contact your organization administrator.</p>
      </div>
    </div>

    <div class="footer">
      <div class="footer-text">
        © ${new Date().getFullYear()} L4YERCAK3. All rights reserved.<br>
        Layer on the superpowers. 🚀
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Email template for existing user invitations
 */
function getExistingUserInvitationEmail(args: {
  organizationName: string;
  inviterName: string;
  setupLink: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

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
      font-family: 'Press Start 2P', monospace;
      font-size: 20px;
      color: #FFFFFF;
      margin: 0;
      text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.3);
    }

    .content {
      padding: 40px 30px;
    }

    .greeting {
      font-size: 18px;
      color: #6B46C1;
      margin-bottom: 20px;
      font-weight: bold;
    }

    .message {
      font-size: 16px;
      color: #2A2A2A;
      margin-bottom: 30px;
    }

    .button-wrapper {
      text-align: center;
      margin: 40px 0;
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
      transition: all 0.2s;
      font-size: 16px;
    }

    .button:hover {
      background-color: #9F7AEA;
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.2);
    }

    .footer {
      background-color: #F9FAFB;
      padding: 20px 30px;
      text-align: center;
      border-top: 3px solid #6B46C1;
    }

    .footer-text {
      font-size: 14px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>L4YERCAK3</h1>
    </div>

    <div class="content">
      <div class="greeting">You've been added to a new organization! 🎯</div>

      <div class="message">
        <p><strong>${args.inviterName}</strong> has added you to <strong>${args.organizationName}</strong> on L4YERCAK3.</p>

        <p>You can now access this organization's workspace with all its apps and data. Sign in with your existing account to get started.</p>
      </div>

      <div class="button-wrapper">
        <a href="${args.setupLink}" class="button">Sign In to L4YERCAK3</a>
      </div>
    </div>

    <div class="footer">
      <div class="footer-text">
        © ${new Date().getFullYear()} L4YERCAK3. All rights reserved.<br>
        Layer on the superpowers. 🚀
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Email template for password reset
 */
function getPasswordResetEmail(args: {
  userName?: string;
  resetLink: string;
}) {
  const greeting = args.userName ? `Hi ${args.userName},` : "Hi there,";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

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
      font-family: 'Press Start 2P', monospace;
      font-size: 20px;
      color: #FFFFFF;
      margin: 0;
      text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.3);
    }

    .content {
      padding: 40px 30px;
    }

    .greeting {
      font-size: 18px;
      color: #6B46C1;
      margin-bottom: 20px;
      font-weight: bold;
    }

    .message {
      font-size: 16px;
      color: #2A2A2A;
      margin-bottom: 30px;
    }

    .button-wrapper {
      text-align: center;
      margin: 40px 0;
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
      transition: all 0.2s;
      font-size: 16px;
    }

    .button:hover {
      background-color: #9F7AEA;
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.2);
    }

    .warning {
      padding: 15px;
      background-color: #FEF3C7;
      border-left: 4px solid #F59E0B;
      margin: 20px 0;
    }

    .warning-text {
      font-size: 14px;
      color: #92400E;
    }

    .footer {
      background-color: #F9FAFB;
      padding: 20px 30px;
      text-align: center;
      border-top: 3px solid #6B46C1;
    }

    .footer-text {
      font-size: 14px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>L4YERCAK3</h1>
    </div>

    <div class="content">
      <div class="greeting">${greeting}</div>

      <div class="message">
        <p>We received a request to reset your password for your L4YERCAK3 account. Click the button below to create a new password.</p>
      </div>

      <div class="button-wrapper">
        <a href="${args.resetLink}" class="button">Reset Your Password</a>
      </div>

      <div class="warning">
        <div class="warning-text">
          <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, you can safely ignore this email.
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-text">
        © ${new Date().getFullYear()} L4YERCAK3. All rights reserved.<br>
        Layer on the superpowers. 🚀
      </div>
    </div>
  </div>
</body>
</html>
  `;
}