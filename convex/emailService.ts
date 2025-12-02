import { internalAction, action } from "./_generated/server";
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
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    const subject = args.isNewUser
      ? `Du wurdest zu ${args.organizationName} auf l4yercak3 eingeladen`
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
 * Send AI subscription confirmation email to customer
 */
export const sendAISubscriptionConfirmation = internalAction({
  args: {
    to: v.string(),
    organizationName: v.string(),
    tier: v.string(),
    amountTotal: v.number(),
    currency: v.string(),
    subscriptionId: v.string(),
    isB2B: v.boolean(),
    taxIds: v.array(v.object({
      type: v.string(),
      value: v.string(),
    })),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    // Format price
    const formatPrice = (cents: number, currency: string) => {
      const symbol = currency === "eur" ? "€" : "$";
      return `${symbol}${(cents / 100).toFixed(2)}`;
    };

    // Tier names by language
    const tierNames: Record<string, Record<string, string>> = {
      en: {
        "standard": "AI Standard",
        "privacy-enhanced": "AI Privacy Enhanced",
        "private-llm-starter": "Private LLM Starter",
        "private-llm-professional": "Private LLM Professional",
        "private-llm-enterprise": "Private LLM Enterprise",
      },
      de: {
        "standard": "KI Standard",
        "privacy-enhanced": "KI Datenschutz Plus",
        "private-llm-starter": "Private KI Starter",
        "private-llm-professional": "Private KI Professional",
        "private-llm-enterprise": "Private KI Enterprise",
      },
    };

    const tierName = tierNames[args.language]?.[args.tier] || tierNames.en[args.tier] || args.tier;

    // Subject and content by language
    const subjects: Record<string, string> = {
      en: `AI Subscription Confirmed - ${tierName}`,
      de: `KI-Abonnement bestätigt - ${tierName}`,
      pl: `Subskrypcja AI potwierdzona - ${tierName}`,
      es: `Suscripción de IA confirmada - ${tierName}`,
      fr: `Abonnement IA confirmé - ${tierName}`,
      ja: `AIサブスクリプション確認 - ${tierName}`,
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6B46C1; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .details { background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #6B46C1; }
          .button { display: inline-block; background: #6B46C1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ${args.language === "de" ? "Abonnement aktiviert!" : "Subscription Activated!"}</h1>
          </div>
          <div class="content">
            <p>${args.language === "de" ? "Hallo" : "Hello"},</p>
            <p>${args.language === "de"
              ? "Ihr KI-Abonnement wurde erfolgreich aktiviert!"
              : "Your AI subscription has been successfully activated!"}</p>

            <div class="details">
              <h3>${args.language === "de" ? "Abonnement-Details" : "Subscription Details"}</h3>
              <p><strong>${args.language === "de" ? "Organisation" : "Organization"}:</strong> ${args.organizationName}</p>
              <p><strong>${args.language === "de" ? "Tarif" : "Plan"}:</strong> ${tierName}</p>
              <p><strong>${args.language === "de" ? "Betrag" : "Amount"}:</strong> ${formatPrice(args.amountTotal, args.currency)}</p>
              ${args.isB2B && args.taxIds.length > 0 ? `
                <p><strong>${args.language === "de" ? "Steuernummer" : "Tax ID"}:</strong> ${args.taxIds.map(t => `${t.type}: ${t.value}`).join(", ")}</p>
              ` : ""}
            </div>

            <p>${args.language === "de"
              ? "Sie können Ihr Abonnement jederzeit in den Einstellungen verwalten."
              : "You can manage your subscription anytime in the settings."}</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.l4yercak3.com"}" class="button">
              ${args.language === "de" ? "Zur Plattform" : "Go to Platform"}
            </a>

            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              ${args.language === "de"
                ? "Sie erhalten eine separate Rechnung von Stripe per E-Mail."
                : "You will receive a separate invoice from Stripe via email."}
            </p>
          </div>
          <div class="footer">
            <p>l4yercak3 AI Platform</p>
            <p>${args.language === "de"
              ? "Bei Fragen kontaktieren Sie uns unter team@mail.l4yercak3.com"
              : "For questions, contact us at team@mail.l4yercak3.com"}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: args.to,
        subject: subjects[args.language] || subjects.en,
        html,
      });

      if (error) {
        console.error("Failed to send AI subscription confirmation:", error);
        throw new Error(`Email could not be sent: ${error.message}`);
      }

      console.log("AI subscription confirmation sent:", data);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending AI subscription confirmation:", error);
      throw error;
    }
  },
});

/**
 * Send sales team notification about new AI subscription
 */
export const sendSalesNotification = internalAction({
  args: {
    customerEmail: v.string(),
    customerName: v.string(),
    organizationName: v.string(),
    tier: v.string(),
    amountTotal: v.number(),
    currency: v.string(),
    isB2B: v.boolean(),
    taxIds: v.array(v.object({
      type: v.string(),
      value: v.string(),
    })),
    subscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";
    const salesEmail = process.env.SALES_EMAIL || "team@mail.l4yercak3.com";

    const formatPrice = (cents: number, currency: string) => {
      const symbol = currency === "eur" ? "€" : "$";
      return `${symbol}${(cents / 100).toFixed(2)}`;
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6B46C1; color: white; padding: 20px; }
          .content { background: #f9f9f9; padding: 30px; }
          .details { background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #6B46C1; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New AI Subscription</h1>
          </div>
          <div class="content">
            <h2>New Subscription Activated</h2>

            <div class="details">
              <h3>Customer Details</h3>
              <p><strong>Name:</strong> ${args.customerName}</p>
              <p><strong>Email:</strong> ${args.customerEmail}</p>
              <p><strong>Organization:</strong> ${args.organizationName}</p>
              <p><strong>Type:</strong> ${args.isB2B ? "Business (B2B)" : "Personal"}</p>
              ${args.isB2B && args.taxIds.length > 0 ? `
                <p><strong>Tax IDs:</strong></p>
                <ul>
                  ${args.taxIds.map(t => `<li>${t.type}: ${t.value}</li>`).join("")}
                </ul>
              ` : ""}
            </div>

            <div class="details">
              <h3>Subscription Details</h3>
              <p><strong>Plan:</strong> ${args.tier}</p>
              <p><strong>Amount:</strong> ${formatPrice(args.amountTotal, args.currency)}</p>
              <p><strong>Subscription ID:</strong> ${args.subscriptionId}</p>
            </div>

            <p>Customer has been sent a confirmation email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: salesEmail,
        subject: `New AI Subscription: ${args.tier} - ${args.organizationName}`,
        html,
      });

      if (error) {
        console.error("Failed to send sales notification:", error);
        throw new Error(`Email could not be sent: ${error.message}`);
      }

      console.log("Sales notification sent:", data);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending sales notification:", error);
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
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

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
        subject: "Reset your l4yercak3 password",
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

/**
 * Send contact form submission email (Enterprise Sales Inquiry)
 * This is a public action that can be called from the client
 */
export const sendContactFormEmail = action({
  args: {
    name: v.string(),
    company: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.optional(v.string()),
    productInterest: v.optional(v.string()),
    locale: v.optional(v.string()), // Customer's chosen language
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";
    const salesEmail = process.env.SALES_EMAIL || "remington@l4yercak3.com";

    // Sales notification is always in English
    const subject = `New Enterprise Sales Inquiry from ${args.name} (${args.company})`;

    const html = getContactFormEmail(args); // English for sales team
    const text = getContactFormText(args); // English for sales team

    try {
      // Send to sales team
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: args.email, // Allow direct reply to the customer
        to: salesEmail,
        subject,
        html,
        text,
        headers: {
          'X-Entity-Ref-ID': `contact-${Date.now()}`,
        },
      });

      if (error) {
        console.error("Failed to send contact form email:", error);
        throw new Error(`E-Mail konnte nicht gesendet werden: ${error.message}`);
      }

      console.log("Contact form email sent successfully:", data);

      // Send confirmation email to customer in their language
      const customerLocale = args.locale || 'en';
      const confirmationData = await resend.emails.send({
        from: fromEmail,
        to: args.email,
        subject: getConfirmationSubject(customerLocale),
        html: getContactFormConfirmationEmail(args, customerLocale),
        text: getContactFormConfirmationText(args, customerLocale),
        headers: {
          'X-Entity-Ref-ID': `contact-confirm-${Date.now()}`,
        },
      });

      return { success: true, emailId: data?.id, confirmationId: confirmationData.data?.id };
    } catch (error) {
      console.error("Error sending contact form email:", error);
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
      <h1>l4yercak3</h1>
    </div>

    <div class="content">
      <div class="greeting">Willkommen bei l4yercak3! 🎉</div>

      <div class="message">
        <p><strong>${args.inviterName}</strong> hat dich zu <strong>${args.organizationName}</strong> auf l4yercak3 eingeladen.</p>

        <p>l4yercak3 (ausgesprochen "Layer Cake") ist eine B2B-Workflow-Plattform, die Unternehmen hilft, ihre Abläufe zu optimieren. Wir bringen alle digitalen Tools zusammen, die dein Unternehmen braucht—CRM, E-Mail-Workflows, Rechnungsstellung, Projektmanagement, Formular-Builder und mehr—in einem integrierten Arbeitsbereich mit KI-gestützter Automatisierung.</p>

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
        <a href="${args.setupLink}" class="button">l4yercak3 besuchen</a>
      </div>

      <div class="divider"></div>

      <div class="message">
        <p>Fragen? Kontaktiere deinen Organisationsadministrator.</p>
      </div>
    </div>

    <div class="footer">
      <div class="footer-text">
        © ${new Date().getFullYear()} l4yercak3. All rights reserved.<br>
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
      <h1>l4yercak3</h1>
    </div>

    <div class="content">
      <div class="greeting">Du bist jetzt in einer neuen Organisation! 🎯</div>

      <div class="message">
        <p><strong>${args.inviterName}</strong> hat dich zu <strong>${args.organizationName}</strong> auf l4yercak3 hinzugefügt.</p>

        <p>Du kannst jetzt auf den Arbeitsbereich dieser Organisation mit allen Apps und Daten zugreifen—CRM-Kontakte, Projekte, Rechnungen, E-Mail-Kampagnen und mehr. Alles ist bereit für dich.</p>

        <p>Melde dich mit deinem bestehenden Konto an, um loszulegen.</p>
      </div>

      <div class="button-wrapper">
        <a href="${args.setupLink}" class="button">Bei l4yercak3 anmelden</a>
      </div>
    </div>

    <div class="footer">
      <div class="footer-text">
        © ${new Date().getFullYear()} l4yercak3. All rights reserved.<br>
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
      <h1>l4yercak3</h1>
    </div>

    <div class="content">
      <div class="greeting">${greeting}</div>

      <div class="message">
        <p>We received a request to reset your password for your l4yercak3 account. Click the button below to create a new password.</p>
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
        © ${new Date().getFullYear()} l4yercak3. All rights reserved.<br>
        Layer on the superpowers. 🚀
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Email template for contact form submission (Sales Team Notification - English)
 */
function getContactFormEmail(args: {
  name: string;
  company: string;
  email: string;
  phone?: string;
  message?: string;
  productInterest?: string;
}) {
  return `
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

    .alert {
      padding: 15px;
      background-color: #DBEAFE;
      border-left: 4px solid #3B82F6;
      margin-bottom: 30px;
    }

    .alert-title {
      font-size: 18px;
      font-weight: bold;
      color: #1E40AF;
      margin-bottom: 5px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 15px;
      margin: 20px 0;
    }

    .info-label {
      font-weight: bold;
      color: #6B46C1;
    }

    .info-value {
      color: #2A2A2A;
    }

    .message-box {
      padding: 20px;
      background-color: #F9FAFB;
      border: 2px solid #E5E7EB;
      margin: 20px 0;
    }

    .message-label {
      font-weight: bold;
      color: #6B46C1;
      margin-bottom: 10px;
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
      <h1>l4yercak3</h1>
    </div>

    <div class="content">
      <div class="alert">
        <div class="alert-title">🚀 New Enterprise Sales Inquiry</div>
        <div>A potential customer has contacted you through the l4yercak3 store.</div>
      </div>

      <div class="info-grid">
        <div class="info-label">Name:</div>
        <div class="info-value">${args.name}</div>

        <div class="info-label">Company:</div>
        <div class="info-value">${args.company}</div>

        <div class="info-label">Email:</div>
        <div class="info-value"><a href="mailto:${args.email}" style="color: #6B46C1;">${args.email}</a></div>

        ${args.phone ? `
        <div class="info-label">Phone:</div>
        <div class="info-value"><a href="tel:${args.phone}" style="color: #6B46C1;">${args.phone}</a></div>
        ` : ''}

        ${args.productInterest ? `
        <div class="info-label">Product Interest:</div>
        <div class="info-value">${args.productInterest}</div>
        ` : ''}
      </div>

      ${args.message ? `
      <div class="message-box">
        <div class="message-label">Message:</div>
        <div>${args.message}</div>
      </div>
      ` : ''}

      <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #E5E7EB;">
        <p style="color: #6B7280; font-size: 14px; margin: 0;">
          💡 <strong>Quick Tip:</strong> Reply directly to this email to respond to ${args.name} at ${args.email}.
        </p>
      </div>
    </div>

    <div class="footer">
      <div class="footer-text">
        © ${new Date().getFullYear()} l4yercak3. All rights reserved.<br>
        Layer on the superpowers. 🚀
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Plain text version of contact form email (Sales Team Notification)
 */
function getContactFormText(args: {
  name: string;
  company: string;
  email: string;
  phone?: string;
  message?: string;
  productInterest?: string;
}) {
  let text = `
l4yercak3 - New Enterprise Sales Inquiry
=========================================

A potential customer has contacted you through the l4yercak3 store.

Contact Information:
--------------------
Name: ${args.name}
Company: ${args.company}
Email: ${args.email}
`;

  if (args.phone) {
    text += `Phone: ${args.phone}\n`;
  }

  if (args.productInterest) {
    text += `Product Interest: ${args.productInterest}\n`;
  }

  if (args.message) {
    text += `\nMessage:\n--------\n${args.message}\n`;
  }

  text += `\n---\nReply directly to this email to respond to ${args.name}.\n\n© ${new Date().getFullYear()} l4yercak3 - Layer on the superpowers. 🚀`;

  return text;
}

/**
 * Get localized confirmation email subject
 */
function getConfirmationSubject(locale: string): string {
  const subjects: Record<string, string> = {
    en: "Thanks for contacting l4yercak3! We'll be in touch soon.",
    de: "Vielen Dank für Ihre Kontaktaufnahme! Wir melden uns bald.",
    pl: "Dziękujemy za kontakt! Wkrótce się odezwiemy.",
    es: "¡Gracias por contactarnos! Nos pondremos en contacto pronto.",
    fr: "Merci de nous avoir contactés! Nous vous répondrons bientôt.",
    ja: "お問い合わせありがとうございます！すぐにご連絡いたします。",
  };

  return subjects[locale] || subjects.en;
}

/**
 * Email template for customer confirmation (Localized)
 */
function getContactFormConfirmationEmail(
  args: {
    name: string;
    company: string;
    email: string;
  },
  locale: string
) {
  // Localized strings
  const strings: Record<string, {
    greeting: string;
    thanks: string;
    received: string;
    details: string;
    response: string;
    meanwhile: string;
    email: string;
    phone: string;
    calendar: string;
    signature: string;
  }> = {
    en: {
      greeting: `Hi ${args.name}! 👋`,
      thanks: "Thanks for reaching out to l4yercak3!",
      received: `I've received your inquiry from <strong>${args.company}</strong> and I'm excited to learn more about your needs.`,
      details: "Here's what I have on file:",
      response: "I'll review your request and get back to you within 24 hours. If you need to reach me sooner, feel free to:",
      meanwhile: "In the meantime, feel free to explore more about l4yercak3 at",
      email: "Email me directly",
      phone: "Call me",
      calendar: "Book a time on my calendar",
      signature: "Looking forward to working with you!",
    },
    de: {
      greeting: `Hallo ${args.name}! 👋`,
      thanks: "Vielen Dank für Ihre Kontaktaufnahme zu l4yercak3!",
      received: `Ich habe Ihre Anfrage von <strong>${args.company}</strong> erhalten und freue mich darauf, mehr über Ihre Bedürfnisse zu erfahren.`,
      details: "Folgende Informationen habe ich aufgenommen:",
      response: "Ich werde Ihre Anfrage prüfen und mich innerhalb von 24 Stunden bei Ihnen melden. Wenn Sie mich früher erreichen möchten, können Sie gerne:",
      meanwhile: "In der Zwischenzeit können Sie gerne mehr über l4yercak3 erfahren unter",
      email: "Schreiben Sie mir direkt",
      phone: "Rufen Sie mich an",
      calendar: "Buchen Sie einen Termin in meinem Kalender",
      signature: "Ich freue mich auf die Zusammenarbeit mit Ihnen!",
    },
    pl: {
      greeting: `Cześć ${args.name}! 👋`,
      thanks: "Dziękujemy za skontaktowanie się z l4yercak3!",
      received: `Otrzymałem Twoje zapytanie z <strong>${args.company}</strong> i chętnie dowiem się więcej o Twoich potrzebach.`,
      details: "Oto co mam w dokumentacji:",
      response: "Przejrzę Twoje zapytanie i skontaktuję się z Tobą w ciągu 24 godzin. Jeśli chcesz się skontaktować wcześniej, możesz:",
      meanwhile: "W międzyczasie możesz dowiedzieć się więcej o l4yercak3 na",
      email: "Napisz do mnie bezpośrednio",
      phone: "Zadzwoń do mnie",
      calendar: "Zarezerwuj czas w moim kalendarzu",
      signature: "Nie mogę się doczekać współpracy z Tobą!",
    },
    es: {
      greeting: `¡Hola ${args.name}! 👋`,
      thanks: "¡Gracias por ponerte en contacto con l4yercak3!",
      received: `He recibido tu consulta de <strong>${args.company}</strong> y estoy emocionado de aprender más sobre tus necesidades.`,
      details: "Esto es lo que tengo registrado:",
      response: "Revisaré tu solicitud y me pondré en contacto contigo en 24 horas. Si necesitas contactarme antes, no dudes en:",
      meanwhile: "Mientras tanto, puedes explorar más sobre l4yercak3 en",
      email: "Envíame un correo directo",
      phone: "Llámame",
      calendar: "Reserva una hora en mi calendario",
      signature: "¡Espero trabajar contigo!",
    },
    fr: {
      greeting: `Salut ${args.name}! 👋`,
      thanks: "Merci de nous avoir contactés chez l4yercak3!",
      received: `J'ai reçu votre demande de <strong>${args.company}</strong> et je suis ravi d'en savoir plus sur vos besoins.`,
      details: "Voici ce que j'ai enregistré:",
      response: "Je vais examiner votre demande et vous répondre dans les 24 heures. Si vous avez besoin de me joindre plus tôt, n'hésitez pas à:",
      meanwhile: "En attendant, n'hésitez pas à explorer plus sur l4yercak3 à",
      email: "M'envoyer un e-mail directement",
      phone: "M'appeler",
      calendar: "Réserver un créneau dans mon agenda",
      signature: "Au plaisir de travailler avec vous!",
    },
    ja: {
      greeting: `こんにちは、${args.name}さん！👋`,
      thanks: "l4yercak3へのお問い合わせありがとうございます！",
      received: `<strong>${args.company}</strong>からのお問い合わせを受け取りました。お客様のニーズについて詳しく知ることを楽しみにしています。`,
      details: "以下の情報を記録しております：",
      response: "24時間以内にご返信させていただきます。お急ぎの場合は、以下の方法でご連絡ください：",
      meanwhile: "それまでの間、l4yercak3について詳しくは、以下をご覧ください",
      email: "直接メールを送る",
      phone: "電話をかける",
      calendar: "カレンダーで予約する",
      signature: "お取引を楽しみにしております！",
    },
  };

  const s = strings[locale] || strings.en;

  return `
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

    .info-box {
      padding: 20px;
      background-color: #F9FAFB;
      border-left: 4px solid #6B46C1;
      margin: 20px 0;
    }

    .contact-links {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 20px 0;
    }

    .contact-link {
      display: inline-block;
      padding: 10px 20px;
      background-color: #6B46C1;
      color: #FFFFFF;
      text-decoration: none;
      border: 2px solid #6B46C1;
      text-align: center;
    }

    .contact-link:hover {
      background-color: #9F7AEA;
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
      <h1>l4yercak3</h1>
    </div>

    <div class="content">
      <div class="greeting">${s.greeting}</div>

      <div class="message">
        <p>${s.thanks}</p>
        <p>${s.received}</p>
      </div>

      <div class="info-box">
        <p style="font-weight: bold; margin-bottom: 10px;">${s.details}</p>
        <p><strong>Name:</strong> ${args.name}</p>
        <p><strong>Company:</strong> ${args.company}</p>
        <p><strong>Email:</strong> ${args.email}</p>
      </div>

      <div class="message">
        <p>${s.response}</p>
        <div class="contact-links">
          <a href="mailto:remington@l4yercak3.com" class="contact-link">📧 ${s.email}</a>
          <a href="tel:+4915140427103" class="contact-link">📞 ${s.phone}</a>
          <a href="https://cal.com/voundbrand/open-end-meeting" class="contact-link">📅 ${s.calendar}</a>
        </div>
      </div>

      <div class="message">
        <p>${s.meanwhile} <a href="https://l4yercak3.com" style="color: #6B46C1;">l4yercak3.com</a></p>
        <p style="margin-top: 30px;"><strong>${s.signature}</strong></p>
        <p style="margin-top: 10px;"><strong>- Remington Splettstoesser</strong><br>Founder, l4yercak3</p>
      </div>
    </div>

    <div class="footer">
      <div class="footer-text">
        © ${new Date().getFullYear()} l4yercak3. All rights reserved.<br>
        Layer on the superpowers. 🚀
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Plain text version of customer confirmation email (Localized)
 */
function getContactFormConfirmationText(
  args: {
    name: string;
    company: string;
    email: string;
  },
  locale: string
): string {
  const strings: Record<string, {
    greeting: string;
    thanks: string;
    received: string;
    details: string;
    response: string;
    contactInfo: string;
    website: string;
    signature: string;
  }> = {
    en: {
      greeting: `Hi ${args.name}!`,
      thanks: "Thanks for reaching out to l4yercak3!",
      received: `I've received your inquiry from ${args.company} and I'm excited to learn more about your needs.`,
      details: "Here's what I have on file:",
      response: "I'll review your request and get back to you within 24 hours.",
      contactInfo: "If you need to reach me sooner:\n- Email: remington@l4yercak3.com\n- Phone: +49 151 404 27 103\n- Calendar: https://cal.com/voundbrand/open-end-meeting",
      website: "Learn more at: https://l4yercak3.com",
      signature: "Looking forward to working with you!\n\n- Remington Splettstoesser\nFounder, l4yercak3",
    },
    de: {
      greeting: `Hallo ${args.name}!`,
      thanks: "Vielen Dank für Ihre Kontaktaufnahme zu l4yercak3!",
      received: `Ich habe Ihre Anfrage von ${args.company} erhalten und freue mich darauf, mehr über Ihre Bedürfnisse zu erfahren.`,
      details: "Folgende Informationen habe ich aufgenommen:",
      response: "Ich werde Ihre Anfrage prüfen und mich innerhalb von 24 Stunden bei Ihnen melden.",
      contactInfo: "Wenn Sie mich früher erreichen möchten:\n- E-Mail: remington@l4yercak3.com\n- Telefon: +49 151 404 27 103\n- Kalender: https://cal.com/voundbrand/open-end-meeting",
      website: "Mehr erfahren unter: https://l4yercak3.com",
      signature: "Ich freue mich auf die Zusammenarbeit mit Ihnen!\n\n- Remington Splettstoesser\nGründer, l4yercak3",
    },
    pl: {
      greeting: `Cześć ${args.name}!`,
      thanks: "Dziękujemy za skontaktowanie się z l4yercak3!",
      received: `Otrzymałem Twoje zapytanie z ${args.company} i chętnie dowiem się więcej o Twoich potrzebach.`,
      details: "Oto co mam w dokumentacji:",
      response: "Przejrzę Twoje zapytanie i skontaktuję się z Tobą w ciągu 24 godzin.",
      contactInfo: "Jeśli chcesz się skontaktować wcześniej:\n- Email: remington@l4yercak3.com\n- Telefon: +49 151 404 27 103\n- Kalendarz: https://cal.com/voundbrand/open-end-meeting",
      website: "Dowiedz się więcej na: https://l4yercak3.com",
      signature: "Nie mogę się doczekać współpracy z Tobą!\n\n- Remington Splettstoesser\nZałożyciel, l4yercak3",
    },
    es: {
      greeting: `¡Hola ${args.name}!`,
      thanks: "¡Gracias por ponerte en contacto con l4yercak3!",
      received: `He recibido tu consulta de ${args.company} y estoy emocionado de aprender más sobre tus necesidades.`,
      details: "Esto es lo que tengo registrado:",
      response: "Revisaré tu solicitud y me pondré en contacto contigo en 24 horas.",
      contactInfo: "Si necesitas contactarme antes:\n- Email: remington@l4yercak3.com\n- Teléfono: +49 151 404 27 103\n- Calendario: https://cal.com/voundbrand/open-end-meeting",
      website: "Más información en: https://l4yercak3.com",
      signature: "¡Espero trabajar contigo!\n\n- Remington Splettstoesser\nFundador, l4yercak3",
    },
    fr: {
      greeting: `Salut ${args.name}!`,
      thanks: "Merci de nous avoir contactés chez l4yercak3!",
      received: `J'ai reçu votre demande de ${args.company} et je suis ravi d'en savoir plus sur vos besoins.`,
      details: "Voici ce que j'ai enregistré:",
      response: "Je vais examiner votre demande et vous répondre dans les 24 heures.",
      contactInfo: "Si vous avez besoin de me joindre plus tôt:\n- Email: remington@l4yercak3.com\n- Téléphone: +49 151 404 27 103\n- Agenda: https://cal.com/voundbrand/open-end-meeting",
      website: "En savoir plus sur: https://l4yercak3.com",
      signature: "Au plaisir de travailler avec vous!\n\n- Remington Splettstoesser\nFondateur, l4yercak3",
    },
    ja: {
      greeting: `こんにちは、${args.name}さん！`,
      thanks: "l4yercak3へのお問い合わせありがとうございます！",
      received: `${args.company}からのお問い合わせを受け取りました。お客様のニーズについて詳しく知ることを楽しみにしています。`,
      details: "以下の情報を記録しております：",
      response: "24時間以内にご返信させていただきます。",
      contactInfo: "お急ぎの場合は、以下の方法でご連絡ください：\n- メール: remington@l4yercak3.com\n- 電話: +49 151 404 27 103\n- カレンダー: https://cal.com/voundbrand/open-end-meeting",
      website: "詳しくは: https://l4yercak3.com",
      signature: "お取引を楽しみにしております！\n\n- Remington Splettstoesser\n創設者, l4yercak3",
    },
  };

  const s = strings[locale] || strings.en;

  return `
l4yercak3
=========

${s.greeting}

${s.thanks}

${s.received}

${s.details}
--------------
Name: ${args.name}
Company: ${args.company}
Email: ${args.email}

${s.response}

${s.contactInfo}

${s.website}

${s.signature}

---
© ${new Date().getFullYear()} l4yercak3 - Layer on the superpowers. 🚀
  `.trim();
}