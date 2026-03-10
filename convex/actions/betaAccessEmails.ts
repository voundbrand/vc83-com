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
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    const firstName = args.firstName || "there";
    const subject = "Your Beta Access Request is Being Reviewed";
    const html = emailDarkWrapper(
      emailHeader({ subtitle: "Request Received" }) +
      emailContentRow(
        emailHeading(`Hi ${firstName}!`) +
        emailParagraph(`Thank you for your interest in ${EMAIL_BRAND.name}! We've received your beta access request and it's currently under review.`) +

        emailInfoBox(`
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">What happens next?</p>
          <ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:1.8;">
            <li>Our team will review your request within 24-48 hours</li>
            <li>We'll send you an email when we make a decision</li>
            <li>If approved, you'll get instant access to the platform</li>
          </ul>
        `) +

        emailParagraph("We appreciate your patience as we carefully grow our beta community!") +

        emailParagraph("In the meantime, feel free to:") +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li>Check out our <a href="https://l4yercak3.com/docs" style="color:${EMAIL_COLORS.accent};">documentation</a></li>
          <li>Follow us on <a href="https://twitter.com/l4yercak3" style="color:${EMAIL_COLORS.accent};">Twitter</a></li>
          <li>Join our <a href="https://discord.gg/l4yercak3" style="color:${EMAIL_COLORS.accent};">Discord community</a></li>
        </ul>` +

        emailParagraph("<strong>Questions?</strong> Reply to this email anytime.")
      ) +
      emailFooter()
    );

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: process.env.REPLY_TO_EMAIL || "support@l4yercak3.com",
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
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://app.l4yercak3.com";

    const firstName = args.firstName || "there";
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
    const subject = `Your Beta Access Has Been Approved!`;
    const html = emailDarkWrapper(
      emailHeader({ subtitle: `Welcome to ${EMAIL_BRAND.name}!` }) +
      emailContentRow(
        emailHeading(`Hi ${firstName}!`) +
        emailParagraph(`<strong>Great news!</strong> Your beta access request has been approved. You now have full access to ${EMAIL_BRAND.name}!`) +

        emailInfoBox(`
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">Getting Started:</p>
          <ol style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:1.8;">
            <li>Open your personal sign-in link (email prefilled)</li>
            <li>Complete your profile</li>
            <li>Explore the platform features</li>
            <li>Start building your first project</li>
          </ol>
        `, { borderColor: EMAIL_COLORS.success }) +

        emailButton("Sign In Now", loginUrl) +

        emailDivider() +
        emailHeading("What's Next?", { level: 2 }) +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li><strong style="color:${EMAIL_COLORS.textPrimary};">Quick Start Guide:</strong> Check out our <a href="https://l4yercak3.com/docs/quickstart" style="color:${EMAIL_COLORS.accent};">quick start guide</a></li>
          <li><strong style="color:${EMAIL_COLORS.textPrimary};">Templates:</strong> Browse our <a href="https://l4yercak3.com/?openWindow=templates" style="color:${EMAIL_COLORS.accent};">template library</a></li>
          <li><strong style="color:${EMAIL_COLORS.textPrimary};">Support:</strong> Join our <a href="https://discord.gg/l4yercak3" style="color:${EMAIL_COLORS.accent};">Discord</a> for help</li>
          <li><strong style="color:${EMAIL_COLORS.textPrimary};">Feedback:</strong> We'd love to hear your thoughts!</li>
        </ul>` +

        emailParagraph("As a beta user, your feedback is incredibly valuable. Please don't hesitate to reach out with questions, suggestions, or issues.") +
        emailParagraph("<strong>Happy building!</strong>")
      ) +
      emailFooter()
    );

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: process.env.REPLY_TO_EMAIL || "support@l4yercak3.com",
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
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    const firstName = args.firstName || "there";
    const subject = "Your Beta Access Request Update";
    const html = emailDarkWrapper(
      emailHeader({ subtitle: "Beta Access Request Update" }) +
      emailContentRow(
        emailHeading(`Hi ${firstName},`) +
        emailParagraph(`Thank you for your interest in ${EMAIL_BRAND.name}. After careful review, we're unable to approve your beta access request at this time.`) +

        emailInfoBox(`
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">Reason:</p>
          <p style="margin:0;font-size:14px;color:${EMAIL_COLORS.textSecondary};">${args.reason}</p>
        `) +

        emailParagraph("We appreciate your interest and encourage you to:") +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li>Stay connected with our community</li>
          <li>Follow our progress on <a href="https://twitter.com/l4yercak3" style="color:${EMAIL_COLORS.accent};">Twitter</a></li>
          <li>Join our <a href="https://discord.gg/l4yercak3" style="color:${EMAIL_COLORS.accent};">Discord</a> for updates</li>
          <li>Sign up for our newsletter for launch announcements</li>
        </ul>` +

        emailParagraph("You're welcome to apply again in the future when your circumstances change or when we open up more beta slots.") +

        emailButton("Visit Our Website", "https://l4yercak3.com", { variant: "secondary" })
      ) +
      emailFooter()
    );

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: process.env.REPLY_TO_EMAIL || "support@l4yercak3.com",
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

      console.log("Rejection email sent successfully:", data);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending rejection email:", error);
      throw error;
    }
  },
});
