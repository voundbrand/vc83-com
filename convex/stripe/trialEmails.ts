/**
 * TRIAL EMAIL NOTIFICATIONS
 *
 * Three emails in the trial lifecycle:
 * 1. Trial Started — welcome, features overview, Telegram bot link
 * 2. Trial Reminder — 2-day warning, cancel link, what you'll lose
 * 3. Trial Converted — confirmation of paid subscription
 */

"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
const generatedApi: any = require("../_generated/api");
import { Resend } from "resend";
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
  emailDivider,
} from "../lib/emailBrandConstants";

const createResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  return new Resend(apiKey);
};

/**
 * Send "Trial Started" email.
 */
export const sendTrialStartedEmail = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await (ctx as any).runQuery(
      generatedApi.internal.stripe.platformWebhooks.getOrganizationInternal,
      { organizationId: args.organizationId }
    );
    const members = await (ctx as any).runQuery(
      generatedApi.internal.stripe.platformWebhooks.getOrganizationMembers,
      { organizationId: args.organizationId }
    );

    const primaryMember = members.find((m: { isActive: boolean }) => m.isActive);
    const email = primaryMember?.user?.email;
    if (!email) return;

    const firstName = primaryMember?.user?.firstName || "there";
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <service@mail.l4yercak3.com>";

    await resend.emails.send({
      from: fromEmail,
      replyTo: "support@l4yercak3.com",
      to: email,
      subject: `Your 14-day Agency trial is active — welcome, ${firstName}!`,
      html: emailDarkWrapper(
        emailHeader() +
        emailContentRow(
          emailHeading("Your Agency trial is live!") +
          emailParagraph(`Hey ${firstName},`) +
          emailParagraph(
            `Your <strong>14-day free trial</strong> of the Agency plan is now active for <strong>${org?.name || "your organization"}</strong>.`
          ) +

          emailHeading("What you can do now:", { level: 2 }) +
          `<ul style="margin:0 0 16px;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
            <li><strong style="color:${EMAIL_COLORS.textPrimary};">Create client sub-organizations</strong> — tell your PM agent "I want to build an agent for [client name]"</li>
            <li><strong style="color:${EMAIL_COLORS.textPrimary};">Manage a portfolio</strong> — each client gets their own agent, soul, and Telegram deep link</li>
            <li><strong style="color:${EMAIL_COLORS.textPrimary};">Monitor performance</strong> — ask your PM "how is [client] doing?"</li>
            <li><strong style="color:${EMAIL_COLORS.textPrimary};">Up to 25 sub-organizations</strong> with independent agent teams</li>
          </ul>` +

          emailHeading("Get started:", { level: 2 }) +
          emailParagraph(
            'Message your PM agent on Telegram and say: <em>"I want to create an agent for my first client"</em>'
          ) +

          emailDivider() +
          emailParagraph(
            "Your trial ends in 14 days. You'll be charged €299/month after that unless you cancel. You can cancel anytime from your billing portal — no questions asked.",
            { muted: true, small: true }
          )
        ) +
        emailFooter()
      ),
    });

    console.log(`[Trial Emails] Sent trial started email to ${email}`);
  },
});

/**
 * Send "Trial Ending Soon" reminder email (2 days before).
 */
export const sendTrialReminderEmail = internalAction({
  args: {
    organizationId: v.id("organizations"),
    trialEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const org = await (ctx as any).runQuery(
      generatedApi.internal.stripe.platformWebhooks.getOrganizationInternal,
      { organizationId: args.organizationId }
    );
    const members = await (ctx as any).runQuery(
      generatedApi.internal.stripe.platformWebhooks.getOrganizationMembers,
      { organizationId: args.organizationId }
    );

    const primaryMember = members.find((m: { isActive: boolean }) => m.isActive);
    const email = primaryMember?.user?.email;
    if (!email) return;

    const firstName = primaryMember?.user?.firstName || "there";
    const endDate = new Date(args.trialEnd).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const portalUrl = process.env.STRIPE_BILLING_PORTAL_URL
      || "https://billing.stripe.com/p/login/test_placeholder";

    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <service@mail.l4yercak3.com>";

    await resend.emails.send({
      from: fromEmail,
      replyTo: "support@l4yercak3.com",
      to: email,
      subject: `Your Agency trial ends in 2 days — ${org?.name || "action required"}`,
      html: emailDarkWrapper(
        emailHeader() +
        emailContentRow(
          emailHeading(`Your trial ends on ${endDate}`) +
          emailParagraph(`Hey ${firstName},`) +
          emailParagraph(
            `Just a heads up — your <strong>14-day Agency trial</strong> for <strong>${org?.name || "your organization"}</strong> ends in <strong>2 days</strong>.`
          ) +

          emailHeading("What happens next:", { level: 2 }) +
          `<ul style="margin:0 0 16px;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
            <li><strong style="color:${EMAIL_COLORS.textPrimary};">If you keep it:</strong> You'll be charged €299/month starting ${endDate}. No action needed — your sub-orgs and agents keep running.</li>
            <li><strong style="color:${EMAIL_COLORS.textPrimary};">If you cancel:</strong> Your agency features will be disabled. Existing sub-org agents will stop responding, but data is preserved.</li>
          </ul>` +

          emailButton("Manage Subscription", portalUrl) +

          emailDivider() +
          emailParagraph("Questions? Reply to this email — we read every message.", { muted: true, small: true })
        ) +
        emailFooter()
      ),
    });

    console.log(`[Trial Emails] Sent trial reminder email to ${email}`);
  },
});

/**
 * Send "Trial Converted" confirmation email.
 */
export const sendTrialConvertedEmail = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await (ctx as any).runQuery(
      generatedApi.internal.stripe.platformWebhooks.getOrganizationInternal,
      { organizationId: args.organizationId }
    );
    const members = await (ctx as any).runQuery(
      generatedApi.internal.stripe.platformWebhooks.getOrganizationMembers,
      { organizationId: args.organizationId }
    );

    const primaryMember = members.find((m: { isActive: boolean }) => m.isActive);
    const email = primaryMember?.user?.email;
    if (!email) return;

    const firstName = primaryMember?.user?.firstName || "there";
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <service@mail.l4yercak3.com>";

    await resend.emails.send({
      from: fromEmail,
      replyTo: "support@l4yercak3.com",
      to: email,
      subject: `Welcome to Agency — you're all set, ${firstName}!`,
      html: emailDarkWrapper(
        emailHeader() +
        emailContentRow(
          emailHeading("You're officially on the Agency plan!") +
          emailParagraph(`Hey ${firstName},`) +
          emailParagraph(
            `Your trial has converted to a full <strong>Agency subscription</strong> for <strong>${org?.name || "your organization"}</strong>.`
          ) +

          emailHeading("Your plan includes:", { level: 2 }) +
          `<ul style="margin:0 0 16px;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
            <li>Up to 25 client sub-organizations</li>
            <li>Unlimited agent teams per client</li>
            <li>Priority support (12h response time)</li>
            <li>5,000 monthly AI credits</li>
            <li>Portfolio-wide analytics</li>
          </ul>` +

          emailParagraph("Keep building — your clients' agents are getting smarter every day.") +

          emailDivider() +
          emailParagraph(
            "First charge: €299 today. Next billing: 30 days from now. Manage your subscription anytime from your billing portal.",
            { muted: true, small: true }
          )
        ) +
        emailFooter()
      ),
    });

    console.log(`[Trial Emails] Sent trial converted email to ${email}`);
  },
});
