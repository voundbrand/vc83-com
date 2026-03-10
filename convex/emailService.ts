import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import {
  getNewUserInvitationText,
  getExistingUserInvitationText,
  getPasswordResetText,
} from "./emailService_plain_text";
import { buildPrefilledPlatformLoginUrl } from "./lib/authLinks";
import {
  EMAIL_BRAND,
  EMAIL_COLORS,
  EMAIL_STYLES,
  emailDarkWrapper,
  emailHeader,
  emailFooter,
  emailButton,
  emailContentRow,
  emailHeading,
  emailParagraph,
  emailInfoBox,
  emailDivider,
} from "./lib/emailBrandConstants";

const generatedApi: any = require("./_generated/api");

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
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    const subject = args.isNewUser
      ? `Du wurdest zu ${args.organizationName} auf ${EMAIL_BRAND.name} eingeladen`
      : `Du wurdest zu ${args.organizationName} hinzugefügt`;

    const issuedPrefill = await (ctx as any).runMutation(
      generatedApi.internal.authPrefill.issueOpaqueAuthPrefillToken,
      {
      email: args.to,
      firstName: args.firstName,
      lastName: args.lastName,
      authMode: args.isNewUser ? "setup" : "check",
      autoCheck: !args.isNewUser,
      source: args.isNewUser ? "inviteNewUserEmail" : "inviteExistingUserEmail",
      ttlMs: 30 * 24 * 60 * 60 * 1000,
      }
    );
    const prefillToken = issuedPrefill.token;

    const deepLinkUrl = buildPrefilledPlatformLoginUrl({
      appBaseUrl: args.setupLink,
      openLoginSource: args.isNewUser ? "inviteNewUserEmail" : "inviteExistingUserEmail",
      prefillToken,
    });
    const templateArgs = {
      ...args,
      setupLink: deepLinkUrl,
    };

    const html = args.isNewUser
      ? getNewUserInvitationEmail(templateArgs)
      : getExistingUserInvitationEmail(templateArgs);

    const text = args.isNewUser
      ? getNewUserInvitationText(templateArgs)
      : getExistingUserInvitationText(templateArgs);

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: process.env.REPLY_TO_EMAIL || "support@l4yercak3.com",
        to: args.to,
        subject,
        html,
        text,
        headers: {
          'X-Entity-Ref-ID': `invite-${Date.now()}`,
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

    const formatPrice = (cents: number, currency: string) => {
      const symbol = currency === "eur" ? "€" : "$";
      return `${symbol}${(cents / 100).toFixed(2)}`;
    };

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

    const subjects: Record<string, string> = {
      en: `AI Subscription Confirmed - ${tierName}`,
      de: `KI-Abonnement bestätigt - ${tierName}`,
      pl: `Subskrypcja AI potwierdzona - ${tierName}`,
      es: `Suscripción de IA confirmada - ${tierName}`,
      fr: `Abonnement IA confirmé - ${tierName}`,
      ja: `AIサブスクリプション確認 - ${tierName}`,
    };

    const isDE = args.language === "de";

    const infoRow = (label: string, value: string) =>
      `<p style="margin:4px 0;font-size:14px;color:${EMAIL_COLORS.textSecondary};"><strong style="color:${EMAIL_COLORS.textPrimary};">${label}:</strong> ${value}</p>`;

    const html = emailDarkWrapper(
      emailHeader({ subtitle: isDE ? "Abonnement aktiviert" : "Subscription Activated" }) +
      emailContentRow(
        emailHeading(isDE ? "Abonnement aktiviert!" : "Subscription Activated!") +
        emailParagraph(isDE ? "Hallo," : "Hello,") +
        emailParagraph(isDE
          ? "Ihr KI-Abonnement wurde erfolgreich aktiviert!"
          : "Your AI subscription has been successfully activated!"
        ) +

        emailInfoBox(`
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">${isDE ? "Abonnement-Details" : "Subscription Details"}</p>
          ${infoRow(isDE ? "Organisation" : "Organization", args.organizationName)}
          ${infoRow(isDE ? "Tarif" : "Plan", tierName)}
          ${infoRow(isDE ? "Betrag" : "Amount", formatPrice(args.amountTotal, args.currency))}
          ${args.isB2B && args.taxIds.length > 0
            ? infoRow(isDE ? "Steuernummer" : "Tax ID", args.taxIds.map(t => `${t.type}: ${t.value}`).join(", "))
            : ""}
        `) +

        emailParagraph(isDE
          ? "Sie können Ihr Abonnement jederzeit in den Einstellungen verwalten."
          : "You can manage your subscription anytime in the settings."
        ) +

        emailButton(
          isDE ? "Zur Plattform" : "Go to Platform",
          process.env.NEXT_PUBLIC_APP_URL || "https://app.l4yercak3.com"
        ) +

        emailParagraph(
          isDE
            ? "Sie erhalten eine separate Rechnung von Stripe per E-Mail."
            : "You will receive a separate invoice from Stripe via email.",
          { muted: true, small: true }
        )
      ) +
      emailFooter({ extra: `${EMAIL_BRAND.name} AI Platform` }),
      { lang: args.language }
    );

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: "support@l4yercak3.com",
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
    const salesEmail = process.env.SALES_EMAIL || "sales@l4yercak3.com";

    const formatPrice = (cents: number, currency: string) => {
      const symbol = currency === "eur" ? "€" : "$";
      return `${symbol}${(cents / 100).toFixed(2)}`;
    };

    const infoRow = (label: string, value: string) =>
      `<p style="margin:4px 0;font-size:13px;color:${EMAIL_COLORS.textSecondary};"><strong style="color:${EMAIL_COLORS.textPrimary};">${label}:</strong> ${value}</p>`;

    const html = emailDarkWrapper(
      emailHeader({ subtitle: "New AI Subscription" }) +
      emailContentRow(
        emailHeading("New Subscription Activated") +

        emailInfoBox(`
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">Customer Details</p>
          ${infoRow("Name", args.customerName)}
          ${infoRow("Email", args.customerEmail)}
          ${infoRow("Organization", args.organizationName)}
          ${infoRow("Type", args.isB2B ? "Business (B2B)" : "Personal")}
          ${args.isB2B && args.taxIds.length > 0
            ? infoRow("Tax IDs", args.taxIds.map(t => `${t.type}: ${t.value}`).join(", "))
            : ""}
        `) +

        emailInfoBox(`
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">Subscription Details</p>
          ${infoRow("Plan", args.tier)}
          ${infoRow("Amount", formatPrice(args.amountTotal, args.currency))}
          ${infoRow("Subscription ID", args.subscriptionId)}
        `, { borderColor: EMAIL_COLORS.success }) +

        emailParagraph("Customer has been sent a confirmation email.", { muted: true })
      ) +
      emailFooter({ extra: `${EMAIL_BRAND.name} Sales Notification` })
    );

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
        from: fromEmail,
        replyTo: process.env.REPLY_TO_EMAIL || "support@l4yercak3.com",
        to: args.to,
        subject: `Reset your ${EMAIL_BRAND.name} password`,
        html,
        text,
        headers: {
          'X-Entity-Ref-ID': `reset-${Date.now()}`,
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
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";
    const salesEmail = process.env.SALES_EMAIL || "sales@l4yercak3.com";

    const subject = `New Enterprise Sales Inquiry from ${args.name} (${args.company})`;

    const html = getContactFormEmail(args);
    const text = getContactFormText(args);

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: args.email,
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

      const customerLocale = args.locale || 'en';
      const confirmationData = await resend.emails.send({
        from: fromEmail,
        replyTo: "sales@l4yercak3.com",
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

/**
 * Send escalation notification email to org owner.
 * Fired when an agent escalates a conversation to a human.
 */
export const sendEscalationEmail = internalAction({
  args: {
    to: v.string(),
    agentName: v.string(),
    reason: v.string(),
    urgency: v.string(),
    contactIdentifier: v.string(),
    channel: v.string(),
    lastMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    const urgencyBadge = args.urgency === "high" ? "HIGH" : args.urgency === "normal" ? "NORMAL" : "LOW";
    const urgencyColor = args.urgency === "high" ? EMAIL_COLORS.error : args.urgency === "normal" ? EMAIL_COLORS.warning : EMAIL_COLORS.info;

    const subject = `Escalation [${urgencyBadge}] — ${args.agentName} needs help`;

    const truncatedMessage = args.lastMessage.length > 200
      ? args.lastMessage.slice(0, 200) + "..."
      : args.lastMessage;

    const infoRow = (label: string, value: string) =>
      `<tr>
        <td style="padding:8px 0;color:${EMAIL_COLORS.textSecondary};width:120px;font-size:13px;">${label}</td>
        <td style="padding:8px 0;color:${EMAIL_COLORS.textPrimary};font-size:13px;">${value}</td>
      </tr>`;

    const html = emailDarkWrapper(
      emailHeader({ subtitle: `Escalation — ${urgencyBadge}` }) +
      emailContentRow(
        emailHeading(`Escalation — ${args.agentName}`) +

        emailInfoBox(`
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            ${infoRow("Urgency", `<span style="background:${urgencyColor};color:#FFFFFF;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">${urgencyBadge}</span>`)}
            ${infoRow("Customer", args.contactIdentifier)}
            ${infoRow("Channel", args.channel)}
            ${infoRow("Reason", `<strong>${args.reason}</strong>`)}
          </table>
        `, { borderColor: urgencyColor }) +

        `<div style="margin:16px 0;padding:12px 16px;background:${EMAIL_COLORS.surfaceRaised};border-radius:${EMAIL_STYLES.cardRadius};border-left:3px solid ${urgencyColor};">
          <p style="margin:0 0 4px;font-size:12px;color:${EMAIL_COLORS.textTertiary};">Last customer message:</p>
          <p style="margin:0;font-style:italic;color:${EMAIL_COLORS.textSecondary};">"${truncatedMessage}"</p>
        </div>` +

        emailParagraph("Log in to your dashboard to take over this conversation or dismiss the escalation.", { muted: true, small: true })
      ) +
      emailFooter()
    );

    const text = `Escalation [${urgencyBadge}] — ${args.agentName}\n\nCustomer: ${args.contactIdentifier} (${args.channel})\nReason: ${args.reason}\nLast message: "${truncatedMessage}"\n\nLog in to your dashboard to take over.`;

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: args.to,
        subject,
        html,
        text,
        headers: {
          "X-Entity-Ref-ID": `escalation-${Date.now()}`,
        },
      });

      if (error) {
        console.error("[Escalation] Failed to send email:", error);
        return { success: false, error: error.message };
      }

      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("[Escalation] Error sending email:", error);
      return { success: false, error: String(error) };
    }
  },
});

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Email template for new user invitations (German)
 */
function getNewUserInvitationEmail(args: {
  to: string;
  organizationName: string;
  inviterName: string;
  setupLink: string;
}) {
  return emailDarkWrapper(
    emailHeader() +
    emailContentRow(
      emailHeading(`Willkommen bei ${EMAIL_BRAND.name}!`) +

      emailParagraph(
        `<strong>${args.inviterName}</strong> hat dich zu <strong>${args.organizationName}</strong> auf ${EMAIL_BRAND.name} eingeladen.`
      ) +
      emailParagraph(
        `${EMAIL_BRAND.name} ist eine B2B-Workflow-Plattform, die Unternehmen hilft, ihre Abläufe zu optimieren. Wir bringen alle digitalen Tools zusammen, die dein Unternehmen braucht — CRM, E-Mail-Workflows, Rechnungsstellung, Projektmanagement, Formular-Builder und mehr — in einem integrierten Arbeitsbereich mit KI-gestützter Automatisierung.`
      ) +
      emailParagraph(
        "Jedes Tool ist eine \"Schicht\", die nahtlos mit den anderen zusammenarbeitet, sodass deine Kundendaten zwischen deinem CRM, Rechnungen, E-Mail-Kampagnen und Projekten fließen. Kein Wechseln mehr zwischen Dutzenden separater Tools."
      ) +

      emailDivider() +
      emailHeading("So fängst du an:", { level: 2 }) +
      `<ol style="margin:0 0 16px;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
        <li>Öffne deinen persönlichen Einladungslink:<br><a href="${args.setupLink}" style="color:${EMAIL_COLORS.accent};">${args.setupLink}</a></li>
        <li>Das Login-Fenster öffnet sich direkt mit vorausgefüllter E-Mail: <strong style="color:${EMAIL_COLORS.textPrimary};">${args.to}</strong></li>
        <li>Erstelle dein Passwort</li>
        <li>Leg los!</li>
      </ol>` +

      emailButton(`${EMAIL_BRAND.name} besuchen`, args.setupLink) +

      emailDivider() +
      emailParagraph("Fragen? Kontaktiere deinen Organisationsadministrator.", { muted: true, small: true })
    ) +
    emailFooter(),
    { lang: "de" }
  );
}

/**
 * Email template for existing user invitations (German)
 */
function getExistingUserInvitationEmail(args: {
  organizationName: string;
  inviterName: string;
  setupLink: string;
}) {
  return emailDarkWrapper(
    emailHeader() +
    emailContentRow(
      emailHeading("Du bist jetzt in einer neuen Organisation!") +

      emailParagraph(
        `<strong>${args.inviterName}</strong> hat dich zu <strong>${args.organizationName}</strong> auf ${EMAIL_BRAND.name} hinzugefügt.`
      ) +
      emailParagraph(
        "Du kannst jetzt auf den Arbeitsbereich dieser Organisation mit allen Apps und Daten zugreifen — CRM-Kontakte, Projekte, Rechnungen, E-Mail-Kampagnen und mehr. Alles ist bereit für dich."
      ) +
      emailParagraph(
        "Melde dich mit deinem bestehenden Konto an, um loszulegen. Dein Einladungslink öffnet das Login-Fenster bereits mit vorausgefüllter E-Mail."
      ) +

      emailButton(`Bei ${EMAIL_BRAND.name} anmelden`, args.setupLink)
    ) +
    emailFooter(),
    { lang: "de" }
  );
}

/**
 * Email template for password reset
 */
function getPasswordResetEmail(args: {
  userName?: string;
  resetLink: string;
}) {
  const greeting = args.userName ? `Hi ${args.userName},` : "Hi there,";

  return emailDarkWrapper(
    emailHeader() +
    emailContentRow(
      emailHeading("Password Reset") +

      emailParagraph(greeting) +
      emailParagraph(
        `We received a request to reset your password for your ${EMAIL_BRAND.name} account. Click the button below to create a new password.`
      ) +

      emailButton("Reset Your Password", args.resetLink) +

      emailInfoBox(`
        <p style="margin:0;font-size:13px;color:${EMAIL_COLORS.warning};">
          <strong>Important:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, you can safely ignore this email.
        </p>
      `, { borderColor: EMAIL_COLORS.warning })
    ) +
    emailFooter()
  );
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
  const infoRow = (label: string, value: string) =>
    `<p style="margin:4px 0;font-size:14px;color:${EMAIL_COLORS.textSecondary};"><strong style="color:${EMAIL_COLORS.textPrimary};">${label}:</strong> ${value}</p>`;

  return emailDarkWrapper(
    emailHeader({ subtitle: "Enterprise Sales Inquiry" }) +
    emailContentRow(
      emailHeading("New Enterprise Sales Inquiry") +
      emailParagraph(
        `A potential customer has contacted you through the ${EMAIL_BRAND.name} store.`
      ) +

      emailInfoBox(`
        ${infoRow("Name", args.name)}
        ${infoRow("Company", args.company)}
        ${infoRow("Email", `<a href="mailto:${args.email}" style="color:${EMAIL_COLORS.accent};">${args.email}</a>`)}
        ${args.phone ? infoRow("Phone", `<a href="tel:${args.phone}" style="color:${EMAIL_COLORS.accent};">${args.phone}</a>`) : ""}
        ${args.productInterest ? infoRow("Product Interest", args.productInterest) : ""}
      `, { borderColor: EMAIL_COLORS.info }) +

      (args.message ? `
      <div style="margin:16px 0;padding:16px 20px;background:${EMAIL_COLORS.surfaceRaised};border:1px solid ${EMAIL_COLORS.border};border-radius:${EMAIL_STYLES.cardRadius};">
        <p style="margin:0 0 8px;font-weight:600;color:${EMAIL_COLORS.textPrimary};font-size:14px;">Message:</p>
        <p style="margin:0;color:${EMAIL_COLORS.textSecondary};font-size:14px;">${args.message}</p>
      </div>
      ` : "") +

      emailDivider() +
      emailParagraph(
        `<strong>Quick Tip:</strong> Reply directly to this email to respond to ${args.name} at ${args.email}.`,
        { muted: true, small: true }
      )
    ) +
    emailFooter({ extra: `${EMAIL_BRAND.name} Sales Notification` })
  );
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
${EMAIL_BRAND.name} - New Enterprise Sales Inquiry
=========================================

A potential customer has contacted you through the ${EMAIL_BRAND.name} store.

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

  text += `\n---\nReply directly to this email to respond to ${args.name}.\n\n© ${new Date().getFullYear()} ${EMAIL_BRAND.name}`;

  return text;
}

/**
 * Get localized confirmation email subject
 */
function getConfirmationSubject(locale: string): string {
  const subjects: Record<string, string> = {
    en: `Thanks for contacting ${EMAIL_BRAND.name}! We'll be in touch soon.`,
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
      greeting: `Hi ${args.name}!`,
      thanks: `Thanks for reaching out to ${EMAIL_BRAND.name}!`,
      received: `I've received your inquiry from <strong>${args.company}</strong> and I'm excited to learn more about your needs.`,
      details: "Here's what I have on file:",
      response: "I'll review your request and get back to you within 24 hours. If you need to reach me sooner, feel free to:",
      meanwhile: `In the meantime, feel free to explore more about ${EMAIL_BRAND.name} at`,
      email: "Email us directly",
      phone: "Call me",
      calendar: "Book a time on my calendar",
      signature: "Looking forward to working with you!",
    },
    de: {
      greeting: `Hallo ${args.name}!`,
      thanks: `Vielen Dank für Ihre Kontaktaufnahme zu ${EMAIL_BRAND.name}!`,
      received: `Ich habe Ihre Anfrage von <strong>${args.company}</strong> erhalten und freue mich darauf, mehr über Ihre Bedürfnisse zu erfahren.`,
      details: "Folgende Informationen habe ich aufgenommen:",
      response: "Ich werde Ihre Anfrage prüfen und mich innerhalb von 24 Stunden bei Ihnen melden. Wenn Sie mich früher erreichen möchten, können Sie gerne:",
      meanwhile: `In der Zwischenzeit können Sie gerne mehr über ${EMAIL_BRAND.name} erfahren unter`,
      email: "Schreiben Sie uns direkt",
      phone: "Rufen Sie mich an",
      calendar: "Buchen Sie einen Termin in meinem Kalender",
      signature: "Ich freue mich auf die Zusammenarbeit mit Ihnen!",
    },
    pl: {
      greeting: `Cześć ${args.name}!`,
      thanks: `Dziękujemy za skontaktowanie się z ${EMAIL_BRAND.name}!`,
      received: `Otrzymałem Twoje zapytanie z <strong>${args.company}</strong> i chętnie dowiem się więcej o Twoich potrzebach.`,
      details: "Oto co mam w dokumentacji:",
      response: "Przejrzę Twoje zapytanie i skontaktuję się z Tobą w ciągu 24 godzin. Jeśli chcesz się skontaktować wcześniej, możesz:",
      meanwhile: `W międzyczasie możesz dowiedzieć się więcej o ${EMAIL_BRAND.name} na`,
      email: "Napisz do nas bezpośrednio",
      phone: "Zadzwoń do mnie",
      calendar: "Zarezerwuj czas w moim kalendarzu",
      signature: "Nie mogę się doczekać współpracy z Tobą!",
    },
    es: {
      greeting: `¡Hola ${args.name}!`,
      thanks: `¡Gracias por ponerte en contacto con ${EMAIL_BRAND.name}!`,
      received: `He recibido tu consulta de <strong>${args.company}</strong> y estoy emocionado de aprender más sobre tus necesidades.`,
      details: "Esto es lo que tengo registrado:",
      response: "Revisaré tu solicitud y me pondré en contacto contigo en 24 horas. Si necesitas contactarme antes, no dudes en:",
      meanwhile: `Mientras tanto, puedes explorar más sobre ${EMAIL_BRAND.name} en`,
      email: "Envíanos un correo directo",
      phone: "Llámame",
      calendar: "Reserva una hora en mi calendario",
      signature: "¡Espero trabajar contigo!",
    },
    fr: {
      greeting: `Salut ${args.name}!`,
      thanks: `Merci de nous avoir contactés chez ${EMAIL_BRAND.name}!`,
      received: `J'ai reçu votre demande de <strong>${args.company}</strong> et je suis ravi d'en savoir plus sur vos besoins.`,
      details: "Voici ce que j'ai enregistré:",
      response: "Je vais examiner votre demande et vous répondre dans les 24 heures. Si vous avez besoin de me joindre plus tôt, n'hésitez pas à:",
      meanwhile: `En attendant, n'hésitez pas à explorer plus sur ${EMAIL_BRAND.name} à`,
      email: "Nous envoyer un e-mail directement",
      phone: "M'appeler",
      calendar: "Réserver un créneau dans mon agenda",
      signature: "Au plaisir de travailler avec vous!",
    },
    ja: {
      greeting: `こんにちは、${args.name}さん！`,
      thanks: `${EMAIL_BRAND.name}へのお問い合わせありがとうございます！`,
      received: `<strong>${args.company}</strong>からのお問い合わせを受け取りました。お客様のニーズについて詳しく知ることを楽しみにしています。`,
      details: "以下の情報を記録しております：",
      response: "24時間以内にご返信させていただきます。お急ぎの場合は、以下の方法でご連絡ください：",
      meanwhile: `それまでの間、${EMAIL_BRAND.name}について詳しくは、以下をご覧ください`,
      email: "直接メールを送る",
      phone: "電話をかける",
      calendar: "カレンダーで予約する",
      signature: "お取引を楽しみにしております！",
    },
  };

  const s = strings[locale] || strings.en;

  return emailDarkWrapper(
    emailHeader() +
    emailContentRow(
      emailHeading(s.greeting) +

      emailParagraph(s.thanks) +
      emailParagraph(s.received) +

      emailInfoBox(`
        <p style="margin:0 0 8px;font-weight:600;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${s.details}</p>
        <p style="margin:4px 0;font-size:14px;color:${EMAIL_COLORS.textSecondary};"><strong style="color:${EMAIL_COLORS.textPrimary};">Name:</strong> ${args.name}</p>
        <p style="margin:4px 0;font-size:14px;color:${EMAIL_COLORS.textSecondary};"><strong style="color:${EMAIL_COLORS.textPrimary};">Company:</strong> ${args.company}</p>
        <p style="margin:4px 0;font-size:14px;color:${EMAIL_COLORS.textSecondary};"><strong style="color:${EMAIL_COLORS.textPrimary};">Email:</strong> ${args.email}</p>
      `) +

      emailParagraph(s.response) +

      `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:12px 0 20px;">
        <tr>
          <td style="padding:6px 0;">
            <a href="mailto:sales@l4yercak3.com" style="display:inline-block;padding:10px 20px;background:${EMAIL_COLORS.surfaceRaised};border:1px solid ${EMAIL_COLORS.border};border-radius:${EMAIL_STYLES.buttonRadius};color:${EMAIL_COLORS.accent};text-decoration:none;font-size:14px;width:100%;box-sizing:border-box;text-align:center;">${s.email}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <a href="tel:+4915140427103" style="display:inline-block;padding:10px 20px;background:${EMAIL_COLORS.surfaceRaised};border:1px solid ${EMAIL_COLORS.border};border-radius:${EMAIL_STYLES.buttonRadius};color:${EMAIL_COLORS.accent};text-decoration:none;font-size:14px;width:100%;box-sizing:border-box;text-align:center;">${s.phone}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <a href="https://cal.com/voundbrand/open-end-meeting" style="display:inline-block;padding:10px 20px;background:${EMAIL_COLORS.surfaceRaised};border:1px solid ${EMAIL_COLORS.border};border-radius:${EMAIL_STYLES.buttonRadius};color:${EMAIL_COLORS.accent};text-decoration:none;font-size:14px;width:100%;box-sizing:border-box;text-align:center;">${s.calendar}</a>
          </td>
        </tr>
      </table>` +

      emailParagraph(
        `${s.meanwhile} <a href="https://l4yercak3.com" style="color:${EMAIL_COLORS.accent};">l4yercak3.com</a>`
      ) +
      emailParagraph(`<strong>${s.signature}</strong>`) +
      emailParagraph(`<strong>- Remington Splettstoesser</strong><br>Founder, ${EMAIL_BRAND.name}`, { muted: true })
    ) +
    emailFooter(),
    { lang: locale }
  );
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
      thanks: `Thanks for reaching out to ${EMAIL_BRAND.name}!`,
      received: `I've received your inquiry from ${args.company} and I'm excited to learn more about your needs.`,
      details: "Here's what I have on file:",
      response: "I'll review your request and get back to you within 24 hours.",
      contactInfo: "If you need to reach me sooner:\n- Email: sales@l4yercak3.com\n- Phone: +49 151 404 27 103\n- Calendar: https://cal.com/voundbrand/open-end-meeting",
      website: "Learn more at: https://l4yercak3.com",
      signature: `Looking forward to working with you!\n\n- Remington Splettstoesser\nFounder, ${EMAIL_BRAND.name}`,
    },
    de: {
      greeting: `Hallo ${args.name}!`,
      thanks: `Vielen Dank für Ihre Kontaktaufnahme zu ${EMAIL_BRAND.name}!`,
      received: `Ich habe Ihre Anfrage von ${args.company} erhalten und freue mich darauf, mehr über Ihre Bedürfnisse zu erfahren.`,
      details: "Folgende Informationen habe ich aufgenommen:",
      response: "Ich werde Ihre Anfrage prüfen und mich innerhalb von 24 Stunden bei Ihnen melden.",
      contactInfo: "Wenn Sie mich früher erreichen möchten:\n- E-Mail: sales@l4yercak3.com\n- Telefon: +49 151 404 27 103\n- Kalender: https://cal.com/voundbrand/open-end-meeting",
      website: "Mehr erfahren unter: https://l4yercak3.com",
      signature: `Ich freue mich auf die Zusammenarbeit mit Ihnen!\n\n- Remington Splettstoesser\nGründer, ${EMAIL_BRAND.name}`,
    },
    pl: {
      greeting: `Cześć ${args.name}!`,
      thanks: `Dziękujemy za skontaktowanie się z ${EMAIL_BRAND.name}!`,
      received: `Otrzymałem Twoje zapytanie z ${args.company} i chętnie dowiem się więcej o Twoich potrzebach.`,
      details: "Oto co mam w dokumentacji:",
      response: "Przejrzę Twoje zapytanie i skontaktuję się z Tobą w ciągu 24 godzin.",
      contactInfo: "Jeśli chcesz się skontaktować wcześniej:\n- Email: sales@l4yercak3.com\n- Telefon: +49 151 404 27 103\n- Kalendarz: https://cal.com/voundbrand/open-end-meeting",
      website: "Dowiedz się więcej na: https://l4yercak3.com",
      signature: `Nie mogę się doczekać współpracy z Tobą!\n\n- Remington Splettstoesser\nZałożyciel, ${EMAIL_BRAND.name}`,
    },
    es: {
      greeting: `¡Hola ${args.name}!`,
      thanks: `¡Gracias por ponerte en contacto con ${EMAIL_BRAND.name}!`,
      received: `He recibido tu consulta de ${args.company} y estoy emocionado de aprender más sobre tus necesidades.`,
      details: "Esto es lo que tengo registrado:",
      response: "Revisaré tu solicitud y me pondré en contacto contigo en 24 horas.",
      contactInfo: "Si necesitas contactarme antes:\n- Email: sales@l4yercak3.com\n- Teléfono: +49 151 404 27 103\n- Calendario: https://cal.com/voundbrand/open-end-meeting",
      website: "Más información en: https://l4yercak3.com",
      signature: `¡Espero trabajar contigo!\n\n- Remington Splettstoesser\nFundador, ${EMAIL_BRAND.name}`,
    },
    fr: {
      greeting: `Salut ${args.name}!`,
      thanks: `Merci de nous avoir contactés chez ${EMAIL_BRAND.name}!`,
      received: `J'ai reçu votre demande de ${args.company} et je suis ravi d'en savoir plus sur vos besoins.`,
      details: "Voici ce que j'ai enregistré:",
      response: "Je vais examiner votre demande et vous répondre dans les 24 heures.",
      contactInfo: "Si vous avez besoin de me joindre plus tôt:\n- Email: sales@l4yercak3.com\n- Téléphone: +49 151 404 27 103\n- Agenda: https://cal.com/voundbrand/open-end-meeting",
      website: "En savoir plus sur: https://l4yercak3.com",
      signature: `Au plaisir de travailler avec vous!\n\n- Remington Splettstoesser\nFondateur, ${EMAIL_BRAND.name}`,
    },
    ja: {
      greeting: `こんにちは、${args.name}さん！`,
      thanks: `${EMAIL_BRAND.name}へのお問い合わせありがとうございます！`,
      received: `${args.company}からのお問い合わせを受け取りました。お客様のニーズについて詳しく知ることを楽しみにしています。`,
      details: "以下の情報を記録しております：",
      response: "24時間以内にご返信させていただきます。",
      contactInfo: "お急ぎの場合は、以下の方法でご連絡ください：\n- メール: sales@l4yercak3.com\n- 電話: +49 151 404 27 103\n- カレンダー: https://cal.com/voundbrand/open-end-meeting",
      website: "詳しくは: https://l4yercak3.com",
      signature: `お取引を楽しみにしております！\n\n- Remington Splettstoesser\n創設者, ${EMAIL_BRAND.name}`,
    },
  };

  const s = strings[locale] || strings.en;

  return `
${EMAIL_BRAND.name}
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
© ${new Date().getFullYear()} ${EMAIL_BRAND.name}
  `.trim();
}
