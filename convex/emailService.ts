import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import {
  getNewUserInvitationText,
  getExistingUserInvitationText,
  getPasswordResetText,
} from "./emailService_plain_text";

// Initialize Resend client (will be created in the action)
const createResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY ist nicht konfiguriert");
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
    // AUTH_RESEND_FROM should already be in the format "Name <email@domain.com>" or "email@domain.com"
    // Use 'team' or 'support' instead of 'noreply' for better deliverability
    const fromEmail = process.env.AUTH_RESEND_FROM || "L4YERCAK3 <team@mail.l4yercak3.com>";

    const subject = args.isNewUser
      ? `Du wurdest zu ${args.organizationName} auf L4YERCAK3 eingeladen`
      : `Du wurdest zu ${args.organizationName} hinzugefügt`;

    const html = args.isNewUser
      ? getNewUserInvitationEmail(args)
      : getExistingUserInvitationEmail(args);

    // Generate plain text version for better deliverability
    const text = args.isNewUser
      ? getNewUserInvitationText(args)
      : getExistingUserInvitationText(args);

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail, // Use the value directly, don't wrap it again
        replyTo: process.env.REPLY_TO_EMAIL || "team@mail.l4yercak3.com", // Allow users to reply (better deliverability)
        to: args.to,
        subject,
        html,
        text, // Include plain text version to avoid spam filters
        headers: {
          'X-Entity-Ref-ID': `invite-${Date.now()}`, // Add tracking header
        },
      });

      if (error) {
        console.error("Failed to send invitation email:", error);
        throw new Error(`E-Mail konnte nicht gesendet werden: ${error.message}`);
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
    // AUTH_RESEND_FROM should already be in the format "Name <email@domain.com>" or "email@domain.com"
    // Use 'team' or 'support' instead of 'noreply' for better deliverability
    const fromEmail = process.env.AUTH_RESEND_FROM || "L4YERCAK3 <team@mail.l4yercak3.com>";

    const html = getPasswordResetEmail({
      userName: args.userName,
      resetLink: args.resetLink,
    });

    const text = getPasswordResetText({
      userName: args.userName,
      resetLink: args.resetLink,
    });

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail, // Use the value directly, don't wrap it again
        replyTo: process.env.REPLY_TO_EMAIL || "team@mail.l4yercak3.com", // Allow users to reply (better deliverability)
        to: args.to,
        subject: "Reset your L4YERCAK3 password",
        html,
        text, // Include plain text version to avoid spam filters
        headers: {
          'X-Entity-Ref-ID': `reset-${Date.now()}`, // Add tracking header
        },
      });

      if (error) {
        console.error("Failed to send password reset email:", error);
        throw new Error(`E-Mail konnte nicht gesendet werden: ${error.message}`);
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
  to: string;
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
    /* Removed Google Fonts import for better email deliverability */
    /* Using system fonts only to avoid external resource loading */

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
      font-family: 'Courier New', Courier, monospace; /* Changed from Press Start 2P to avoid external fonts */
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
      <div class="greeting">Willkommen bei L4YERCAK3! 🎉</div>

      <div class="message">
        <p><strong>${args.inviterName}</strong> hat dich zu <strong>${args.organizationName}</strong> auf L4YERCAK3 eingeladen.</p>

        <p>L4YERCAK3 (ausgesprochen "Layer Cake") ist eine B2B-Workflow-Plattform, die Unternehmen hilft, ihre Abläufe zu optimieren. Wir bringen alle digitalen Tools zusammen, die dein Unternehmen braucht—CRM, E-Mail-Workflows, Rechnungsstellung, Projektmanagement, Formular-Builder und mehr—in einem integrierten Arbeitsbereich mit KI-gestützter Automatisierung.</p>

        <p>Jedes Tool ist eine "Schicht", die nahtlos mit den anderen zusammenarbeitet, sodass deine Kundendaten zwischen deinem CRM, Rechnungen, E-Mail-Kampagnen und Projekten fließen. Kein Wechseln mehr zwischen Dutzenden separater Tools.</p>

        <p><strong>So fängst du an:</strong></p>
        <ol style="margin-left: 20px;">
          <li>Besuche <a href="${args.setupLink}" style="color: #6B46C1;">${args.setupLink}</a></li>
          <li>Klicke auf das Startmenü und öffne das Login-Fenster</li>
          <li>Gib diese E-Mail-Adresse ein: <strong>${args.to}</strong></li>
          <li>Erstelle dein Passwort</li>
          <li>Leg los!</li>
        </ol>
      </div>

      <div class="button-wrapper">
        <a href="${args.setupLink}" class="button">L4YERCAK3 besuchen</a>
      </div>

      <div class="divider"></div>

      <div class="message">
        <p>Fragen? Kontaktiere deinen Organisationsadministrator.</p>
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
    /* Removed Google Fonts import for better email deliverability */
    /* Using system fonts only to avoid external resource loading */

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
      font-family: 'Courier New', Courier, monospace; /* Changed from Press Start 2P to avoid external fonts */
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
      <div class="greeting">Du bist jetzt in einer neuen Organisation! 🎯</div>

      <div class="message">
        <p><strong>${args.inviterName}</strong> hat dich zu <strong>${args.organizationName}</strong> auf L4YERCAK3 hinzugefügt.</p>

        <p>Du kannst jetzt auf den Arbeitsbereich dieser Organisation mit allen Apps und Daten zugreifen—CRM-Kontakte, Projekte, Rechnungen, E-Mail-Kampagnen und mehr. Alles ist bereit für dich.</p>

        <p>Melde dich mit deinem bestehenden Konto an, um loszulegen.</p>
      </div>

      <div class="button-wrapper">
        <a href="${args.setupLink}" class="button">Bei L4YERCAK3 anmelden</a>
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
    /* Removed Google Fonts import for better email deliverability */
    /* Using system fonts only to avoid external resource loading */

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
      font-family: 'Courier New', Courier, monospace; /* Changed from Press Start 2P to avoid external fonts */
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