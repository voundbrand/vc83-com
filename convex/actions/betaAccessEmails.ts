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
import { createBetaAutoApproveToken } from "../lib/betaAutoApproveToken";
import { toConvexSiteBaseUrl } from "../integrations/endpointResolver";
import { buildPrefilledPlatformLoginUrl } from "../lib/authLinks";
import {
  EMAIL_BRAND,
  EMAIL_COLORS,
  emailDarkWrapper,
  emailHeader,
  emailFooter,
  emailButton,
  emailContentRow,
  emailHeading,
  emailParagraph,
  emailInfoBox,
  emailDivider,
} from "../lib/emailBrandConstants";

const generatedApi: any = require("../_generated/api");

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
    userId: v.optional(v.id("users")),
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
    const salesEmail = process.env.SALES_EMAIL || "sales@sevenlayers.io";
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://app.l4yercak3.com";
    const backendBaseUrl =
      process.env.CONVEX_SITE_URL
      || process.env.NEXT_PUBLIC_API_ENDPOINT_URL
      || toConvexSiteBaseUrl(process.env.NEXT_PUBLIC_CONVEX_URL)
      || "https://agreeable-lion-828.convex.site";

    const fullName = `${args.firstName || ""} ${args.lastName || ""}`.trim() || "Unknown";
    let autoApproveUrl: string | null = null;
    if (args.userId) {
      const token = await createBetaAutoApproveToken({
        userId: String(args.userId),
        email: args.email,
      });
      autoApproveUrl = `${backendBaseUrl.replace(/\/+$/, "")}/api/beta/auto-approve?token=${encodeURIComponent(token)}`;
    }

    const subject = `New Beta Access Request: ${fullName}`;
    const html = emailDarkWrapper(
      emailHeader({ subtitle: "New Beta Access Request" }) +
      emailContentRow(
        emailHeading("Someone wants beta access!") +

        emailInfoBox(`
          <p style="margin:4px 0;font-size:13px;color:${EMAIL_COLORS.textSecondary};"><strong style="color:${EMAIL_COLORS.textPrimary};">Name:</strong> ${fullName}</p>
          <p style="margin:4px 0;font-size:13px;color:${EMAIL_COLORS.textSecondary};"><strong style="color:${EMAIL_COLORS.textPrimary};">Email:</strong> ${args.email}</p>
          <p style="margin:4px 0;font-size:13px;color:${EMAIL_COLORS.textSecondary};"><strong style="color:${EMAIL_COLORS.textPrimary};">Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' })}</p>
        `) +

        (args.requestReason ? (
          emailHeading("Why they want access:", { level: 3 }) +
          emailInfoBox(`<p style="margin:0;font-size:14px;color:${EMAIL_COLORS.textPrimary};">${args.requestReason}</p>`)
        ) : '') +

        (args.useCase ? (
          emailHeading("Their use case:", { level: 3 }) +
          emailInfoBox(`<p style="margin:0;font-size:14px;color:${EMAIL_COLORS.textPrimary};">${args.useCase}</p>`)
        ) : '') +

        (args.referralSource ? emailParagraph(`<strong>How they found us:</strong> ${args.referralSource}`) : '') +

        emailDivider() +
        emailHeading("Next Steps", { level: 2 }) +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li>Review the request in the admin dashboard</li>
          <li>Check their email/profile for legitimacy</li>
          <li>Approve or reject with reason</li>
          <li>They'll receive an email notification of your decision</li>
        </ul>` +

        (autoApproveUrl ? (
          emailDivider() +
          emailHeading("One-Click Approval", { level: 2 }) +
          emailButton("Auto-Approve Beta User", autoApproveUrl) +
          emailParagraph("Secure link expires in 7 days.", { muted: true, small: true })
        ) : '') +

        emailButton("Review in Admin Dashboard", `${appBaseUrl.replace(/\/+$/, "")}/?openWindow=organizations&panel=beta-access`, { variant: "secondary" })
      ) +
      emailFooter({ extra: `${EMAIL_BRAND.name} Beta Access System` })
    );

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

      console.log("Sales notification sent successfully:", data);
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
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";
    const siteBaseUrl = (process.env.SITE_URL || "https://l4yercak3.com").replace(/\/+$/, "");

    const language = args.language || "en";
    const isDE = language === "de";
    const firstName = args.firstName || (isDE ? "Hallo" : "there");

    const subjects: Record<string, string> = {
      en: "Your Beta Access Request is Being Reviewed",
      de: "Ihre Beta-Zugangsanfrage wird geprüft",
    };

    const html = emailDarkWrapper(
      emailHeader({ subtitle: isDE ? "Anfrage erhalten" : "Request Received" }) +
      emailContentRow(
        emailHeading(isDE ? `Hallo ${firstName}!` : `Hi ${firstName}!`) +
        emailParagraph(isDE
          ? `Vielen Dank für Ihr Interesse an ${EMAIL_BRAND.name}! Wir haben Ihre Beta-Zugangsanfrage erhalten und prüfen sie derzeit.`
          : `Thank you for your interest in ${EMAIL_BRAND.name}! We've received your beta access request and it's currently under review.`
        ) +

        emailInfoBox(`
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">${isDE ? "Wie geht es weiter?" : "What happens next?"}</p>
          <ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:1.8;">
            <li>${isDE ? "Unser Team wird Ihre Anfrage innerhalb von 24–48 Stunden prüfen" : "Our team will review your request within 24-48 hours"}</li>
            <li>${isDE ? "Wir senden Ihnen eine E-Mail, sobald wir eine Entscheidung getroffen haben" : "We'll send you an email when we make a decision"}</li>
            <li>${isDE ? "Bei Genehmigung erhalten Sie sofort Zugang zur Plattform" : "If approved, you'll get instant access to the platform"}</li>
          </ul>
        `) +

        emailParagraph(isDE
          ? "Wir schätzen Ihre Geduld, während wir unsere Beta-Community sorgfältig aufbauen!"
          : "We appreciate your patience as we carefully grow our beta community!"
        ) +

        emailParagraph(isDE ? "In der Zwischenzeit können Sie gerne:" : "In the meantime, feel free to:") +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li>${isDE ? "Unsere" : "Check out our"} <a href="${siteBaseUrl}/docs" style="color:${EMAIL_COLORS.accent};">${isDE ? "Dokumentation ansehen" : "documentation"}</a></li>
          <li>${isDE ? "Folgen Sie uns auf" : "Follow us on"} <a href="https://x.com/notcleverhandle" style="color:${EMAIL_COLORS.accent};">X (Twitter)</a></li>
          <li>${isDE ? "Vernetzen Sie sich auf" : "Connect on"} <a href="https://www.linkedin.com/in/therealremington/" style="color:${EMAIL_COLORS.accent};">LinkedIn</a></li>
        </ul>` +

        emailParagraph(isDE
          ? "<strong>Fragen?</strong> Antworten Sie jederzeit auf diese E-Mail."
          : "<strong>Questions?</strong> Reply to this email anytime."
        )
      ) +
      emailFooter(),
      { lang: language }
    );

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: process.env.REPLY_TO_EMAIL || "support@l4yercak3.com",
        to: args.email,
        subject: subjects[language] || subjects.en,
        html,
        headers: {
          'X-Entity-Ref-ID': `beta-confirmation-${Date.now()}`,
        },
      });

      if (error) {
        console.error("Failed to send confirmation email:", error);
        throw new Error(`Email could not be sent: ${error.message}`);
      }

      console.log("Confirmation email sent successfully:", data);
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
    lastName: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";
    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://app.l4yercak3.com").replace(/\/+$/, "");
    const siteBaseUrl = (process.env.SITE_URL || "https://l4yercak3.com").replace(/\/+$/, "");

    const language = args.language || "en";
    const isDE = language === "de";
    const firstName = args.firstName || (isDE ? "Hallo" : "there");

    const issuedPrefill = await (ctx as any).runMutation(
      generatedApi.internal.authPrefill.issueOpaqueAuthPrefillToken,
      {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        authMode: "check",
        autoCheck: true,
        source: "betaApprovalEmail",
        ttlMs: 14 * 24 * 60 * 60 * 1000,
      }
    );
    const prefillToken = issuedPrefill.token;
    const loginUrl = buildPrefilledPlatformLoginUrl({
      appBaseUrl,
      openLoginSource: "betaApprovalEmail",
      prefillToken,
    });

    const subjects: Record<string, string> = {
      en: "Your Beta Access Has Been Approved!",
      de: "Ihr Beta-Zugang wurde genehmigt!",
    };

    const html = emailDarkWrapper(
      emailHeader({ subtitle: isDE ? `Willkommen bei ${EMAIL_BRAND.name}!` : `Welcome to ${EMAIL_BRAND.name}!` }) +
      emailContentRow(
        emailHeading(isDE ? `Hallo ${firstName}!` : `Hi ${firstName}!`) +
        emailParagraph(isDE
          ? `<strong>Gute Neuigkeiten!</strong> Ihre Beta-Zugangsanfrage wurde genehmigt. Sie haben jetzt vollen Zugang zu ${EMAIL_BRAND.name}!`
          : `<strong>Great news!</strong> Your beta access request has been approved. You now have full access to ${EMAIL_BRAND.name}!`
        ) +

        emailInfoBox(`
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">${isDE ? "Erste Schritte:" : "Getting Started:"}</p>
          <ol style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:1.8;">
            <li>${isDE ? "Öffnen Sie Ihren persönlichen Anmeldelink (E-Mail vorausgefüllt)" : "Open your personal sign-in link (email prefilled)"}</li>
            <li>${isDE ? "Vervollständigen Sie Ihr Profil" : "Complete your profile"}</li>
            <li>${isDE ? "Erkunden Sie die Plattform-Funktionen" : "Explore the platform features"}</li>
            <li>${isDE ? "Starten Sie Ihr erstes Projekt" : "Start building your first project"}</li>
          </ol>
        `, { borderColor: EMAIL_COLORS.success }) +

        emailButton(isDE ? "Jetzt anmelden" : "Sign In Now", loginUrl) +

        emailDivider() +
        emailHeading(isDE ? "Wie geht es weiter?" : "What's Next?", { level: 2 }) +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li><strong style="color:${EMAIL_COLORS.textPrimary};">${isDE ? "Schnellstartanleitung:" : "Quick Start Guide:"}</strong> ${isDE ? "Sehen Sie unsere" : "Check out our"} <a href="${siteBaseUrl}/docs/quickstart" style="color:${EMAIL_COLORS.accent};">${isDE ? "Schnellstartanleitung" : "quick start guide"}</a></li>
          <li><strong style="color:${EMAIL_COLORS.textPrimary};">${isDE ? "Vorlagen:" : "Templates:"}</strong> ${isDE ? "Durchstöbern Sie unsere" : "Browse our"} <a href="${appBaseUrl}/?openWindow=templates" style="color:${EMAIL_COLORS.accent};">${isDE ? "Vorlagen-Bibliothek" : "template library"}</a></li>
          <li><strong style="color:${EMAIL_COLORS.textPrimary};">${isDE ? "Support:" : "Support:"}</strong> ${isDE ? "Kontaktieren Sie uns auf" : "Connect on"} <a href="https://www.linkedin.com/in/therealremington/" style="color:${EMAIL_COLORS.accent};">LinkedIn</a>${isDE ? " für Hilfe" : " for help"}</li>
          <li><strong style="color:${EMAIL_COLORS.textPrimary};">Feedback:</strong> ${isDE ? "Wir freuen uns über Ihre Meinung!" : "We'd love to hear your thoughts!"}</li>
        </ul>` +

        emailParagraph(isDE
          ? "Als Beta-Nutzer ist Ihr Feedback besonders wertvoll. Zögern Sie nicht, sich mit Fragen, Vorschlägen oder Problemen an uns zu wenden."
          : "As a beta user, your feedback is incredibly valuable. Please don't hesitate to reach out with questions, suggestions, or issues."
        ) +
        emailParagraph(isDE ? "<strong>Viel Erfolg!</strong>" : "<strong>Happy building!</strong>")
      ) +
      emailFooter(),
      { lang: language }
    );

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: process.env.REPLY_TO_EMAIL || "support@l4yercak3.com",
        to: args.email,
        subject: subjects[language] || subjects.en,
        html,
        headers: {
          'X-Entity-Ref-ID': `beta-approval-${Date.now()}`,
        },
      });

      if (error) {
        console.error("Failed to send approval email:", error);
        throw new Error(`Email could not be sent: ${error.message}`);
      }

      console.log("Approval email sent successfully:", data);
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
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";
    const siteBaseUrl = (process.env.SITE_URL || "https://l4yercak3.com").replace(/\/+$/, "");

    const language = args.language || "en";
    const isDE = language === "de";
    const firstName = args.firstName || (isDE ? "Hallo" : "there");

    const subjects: Record<string, string> = {
      en: "Your Beta Access Request Update",
      de: "Aktualisierung Ihrer Beta-Zugangsanfrage",
    };

    const html = emailDarkWrapper(
      emailHeader({ subtitle: isDE ? "Aktualisierung der Beta-Anfrage" : "Beta Access Request Update" }) +
      emailContentRow(
        emailHeading(isDE ? `Hallo ${firstName},` : `Hi ${firstName},`) +
        emailParagraph(isDE
          ? `Vielen Dank für Ihr Interesse an ${EMAIL_BRAND.name}. Nach sorgfältiger Prüfung können wir Ihre Beta-Zugangsanfrage derzeit leider nicht genehmigen.`
          : `Thank you for your interest in ${EMAIL_BRAND.name}. After careful review, we're unable to approve your beta access request at this time.`
        ) +

        emailInfoBox(`
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">${isDE ? "Begründung:" : "Reason:"}</p>
          <p style="margin:0;font-size:14px;color:${EMAIL_COLORS.textSecondary};">${args.reason}</p>
        `) +

        emailParagraph(isDE
          ? "Wir schätzen Ihr Interesse und ermutigen Sie:"
          : "We appreciate your interest and encourage you to:"
        ) +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li>${isDE ? "Bleiben Sie mit unserer Community verbunden" : "Stay connected with our community"}</li>
          <li>${isDE ? "Verfolgen Sie unsere Fortschritte auf" : "Follow our progress on"} <a href="https://x.com/notcleverhandle" style="color:${EMAIL_COLORS.accent};">X (Twitter)</a></li>
          <li>${isDE ? "Vernetzen Sie sich auf" : "Connect on"} <a href="https://www.linkedin.com/in/therealremington/" style="color:${EMAIL_COLORS.accent};">LinkedIn</a>${isDE ? " für Updates" : " for updates"}</li>
          <li>${isDE ? "Abonnieren Sie unseren Newsletter für Neuigkeiten zum Launch" : "Sign up for our newsletter for launch announcements"}</li>
        </ul>` +

        emailParagraph(isDE
          ? "Sie können sich gerne erneut bewerben, wenn sich Ihre Situation ändert oder wenn wir weitere Beta-Plätze freigeben."
          : "You're welcome to apply again in the future when your circumstances change or when we open up more beta slots."
        ) +

        emailButton(isDE ? "Unsere Website besuchen" : "Visit Our Website", siteBaseUrl, { variant: "secondary" })
      ) +
      emailFooter(),
      { lang: language }
    );

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: process.env.REPLY_TO_EMAIL || "support@l4yercak3.com",
        to: args.email,
        subject: subjects[language] || subjects.en,
        html,
        headers: {
          'X-Entity-Ref-ID': `beta-rejection-${Date.now()}`,
        },
      });

      if (error) {
        console.error("Failed to send rejection email:", error);
        throw new Error(`Email could not be sent: ${error.message}`);
      }

      console.log("Rejection email sent successfully:", data);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending rejection email:", error);
      throw error;
    }
  },
});
