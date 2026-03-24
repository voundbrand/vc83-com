"use node";

/**
 * SALES NOTIFICATION EMAIL ACTION
 *
 * Sends email to sales team when important events happen:
 * - New free signup
 * - Beta approved
 * - Upgrade to Starter / platform tier upgrade
 * - Build Sprint application
 * - Credit purchase
 * - Downgrade
 * - Cancellation
 * - Pending change reverted (win-back)
 * - Milestone reached
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
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
  emailInfoBox,
  emailMetric,
  emailDivider,
} from "../lib/emailBrandConstants";

const createResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
};

/** Build a standard info row for details boxes */
function infoRow(label: string, value: string): string {
  return `<p style="margin:4px 0;font-size:13px;color:${EMAIL_COLORS.textSecondary};"><strong style="color:${EMAIL_COLORS.textPrimary};">${label}:</strong> ${value}</p>`;
}

/** Common customer details block */
function customerDetails(user: { firstName: string; lastName: string; email: string }, org: { name: string; planTier: string }, extra?: string): string {
  return emailInfoBox(`
    ${infoRow("Name", `${user.firstName} ${user.lastName}`)}
    ${infoRow("Email", user.email)}
    ${infoRow("Organization", org.name)}
    ${infoRow("Plan", org.planTier)}
    ${extra || ""}
    ${infoRow("Time", new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))}
  `);
}

export const sendSalesNotification = internalAction({
  args: {
    eventType: v.union(
      v.literal("free_signup"),
      v.literal("beta_approved"),
      v.literal("starter_upgrade"),
      v.literal("platform_tier_upgrade"),
      v.literal("credit_purchase"),
      v.literal("platform_tier_downgrade"),
      v.literal("subscription_canceled"),
      v.literal("pending_change_reverted"),
      v.literal("build_sprint_app"),
      v.literal("milestone_reached")
    ),
    user: v.object({
      email: v.string(),
      firstName: v.string(),
      lastName: v.string(),
    }),
    organization: v.object({
      name: v.string(),
      planTier: v.string(),
    }),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";
    const salesEmail = process.env.SALES_EMAIL || "sales@sevenlayers.io";

    const emailContent = generateSalesNotificationEmail(args);

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: salesEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        headers: {
          'X-Entity-Ref-ID': `sales-${args.eventType}-${Date.now()}`,
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

function generateSalesNotificationEmail(args: {
  eventType: string;
  user: { email: string; firstName: string; lastName: string };
  organization: { name: string; planTier: string };
  metadata?: any;
}) {
  const { eventType, user, organization, metadata } = args;
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://app.l4yercak3.com").replace(/\/+$/, "");

  let subject = "";
  let content = "";
  let headerSubtitle = "";

  switch (eventType) {
    case "free_signup":
      subject = `New Free Signup: ${user.firstName} ${user.lastName}`;
      headerSubtitle = "New Free Signup";
      content =
        emailHeading("New Free Account Signup!") +
        customerDetails(user, organization) +

        emailDivider() +
        emailHeading("Next Steps", { level: 2 }) +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li>Monitor their usage in the admin dashboard</li>
          <li>Check if they download the template</li>
          <li>Follow up in 3 days if no activity</li>
          <li>Track for upgrade opportunity (€199/month Starter)</li>
        </ul>` +
        emailButton("View User Profile", `${appBaseUrl}/admin/users/${user.email}`);
      break;

    case "beta_approved":
      subject = `Beta Access Approved: ${user.firstName} ${user.lastName}`;
      headerSubtitle = "Beta User Approved";
      content =
        emailHeading("Beta Access Granted!") +
        customerDetails(user, organization,
          infoRow("Approved", new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))
        ) +

        emailDivider() +
        emailHeading("Next Steps", { level: 2 }) +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li>User has been sent welcome email and can now access the platform</li>
          <li>Monitor their onboarding progress in the admin dashboard</li>
          <li>Follow up in 7 days to check on their experience</li>
          <li>Track for upgrade opportunity (€199/month Starter)</li>
        </ul>` +
        emailButton("View User Profile", `${appBaseUrl}/admin/users/${user.email}`);
      break;

    case "platform_tier_upgrade":
    case "starter_upgrade": {
      const tierName = organization.planTier.charAt(0).toUpperCase() + organization.planTier.slice(1);
      const amountTotal = metadata?.amountTotal || 0;
      const currency = metadata?.currency || "eur";
      const billingPeriod = metadata?.billingPeriod || "monthly";
      const monthlyPrice = billingPeriod === "annual" ? Math.round(amountTotal / 12) : amountTotal;
      const annualPrice = billingPeriod === "annual" ? amountTotal : amountTotal * 12;
      const ltv = monthlyPrice * 24;
      const currencySymbol = currency === "eur" ? "€" : currency === "usd" ? "$" : currency.toUpperCase() + " ";
      const formatPrice = (cents: number) => `${currencySymbol}${(cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 0 })}`;

      subject = eventType === "platform_tier_upgrade"
        ? `Upgrade Alert: ${user.firstName} ${user.lastName} → ${tierName}`
        : `Upgrade Alert: ${user.firstName} ${user.lastName} → Starter (€199/mo)`;
      headerSubtitle = `${tierName} Upgrade`;

      content =
        emailHeading(`New ${tierName} Customer!`) +
        emailMetric(`+${formatPrice(monthlyPrice)}/month MRR`, `${tierName} (${billingPeriod})`, { color: EMAIL_COLORS.success }) +

        customerDetails(user, organization,
          infoRow("Plan", `${tierName} (${billingPeriod})`)
        ) +

        emailDivider() +
        emailHeading("Revenue Impact", { level: 2 }) +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li><strong style="color:${EMAIL_COLORS.textPrimary};">MRR:</strong> +${formatPrice(monthlyPrice)}/month</li>
          <li><strong style="color:${EMAIL_COLORS.textPrimary};">ARR:</strong> +${formatPrice(annualPrice)}/year</li>
          <li><strong style="color:${EMAIL_COLORS.textPrimary};">Lifetime Value:</strong> ~${formatPrice(ltv)} (24 months)</li>
        </ul>` +

        emailDivider() +
        emailHeading("Next Steps", { level: 2 }) +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li>Send thank you email</li>
          <li>Monitor for usage patterns</li>
          <li>Check in after 30 days for feedback</li>
          <li>Consider for case study (3-6 months)</li>
        </ul>` +
        emailParagraph("<strong>Celebrate this win!</strong>");
      break;
    }

    case "build_sprint_app":
      subject = `Build Sprint Application: ${user.firstName} ${user.lastName}`;
      headerSubtitle = "Build Sprint Application";
      content =
        emailHeading("New Build Sprint Application!") +
        emailMetric("Potential €12,500", "Build Sprint Revenue", { color: EMAIL_COLORS.warning }) +

        customerDetails(user, organization) +

        emailDivider() +
        emailHeading("Immediate Actions", { level: 2 }) +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li><strong style="color:${EMAIL_COLORS.textPrimary};">Respond within 24 hours</strong></li>
          <li>Review their application details</li>
          <li>Schedule discovery call</li>
          <li>Send Build Sprint one-pager</li>
          <li>Prepare proposal template</li>
        </ul>` +
        emailButton("View Application", `${appBaseUrl}/admin/build-sprint-apps`);
      break;

    case "credit_purchase": {
      const creditAmount = metadata?.amountEur || 0;
      const creditCount = metadata?.credits || 0;
      subject = `Credits Purchased: ${organization.name} — ${creditCount.toLocaleString()} credits (€${creditAmount})`;
      headerSubtitle = "Credit Purchase";
      content =
        emailHeading("Credits Purchased!") +
        emailMetric(`+€${creditAmount} Revenue`, `${creditCount.toLocaleString()} credits`, { color: EMAIL_COLORS.warning }) +

        customerDetails(user, organization,
          infoRow("Credits", creditCount.toLocaleString())
        ) +

        emailDivider() +
        emailHeading("Next Steps", { level: 2 }) +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li>One-time revenue: <strong style="color:${EMAIL_COLORS.textPrimary};">€${creditAmount}</strong></li>
          <li>Monitor credit usage patterns</li>
          <li>Consider upgrade opportunity if credits usage is high</li>
        </ul>`;
      break;
    }

    case "platform_tier_downgrade": {
      const fromTier = metadata?.fromTier || "agency";
      const toTier = metadata?.toTier || "pro";
      const fromName = fromTier.charAt(0).toUpperCase() + fromTier.slice(1);
      const toName = toTier.charAt(0).toUpperCase() + toTier.slice(1);
      const effectiveDate = metadata?.effectiveDate ? new Date(metadata.effectiveDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "next billing date";
      subject = `Downgrade Alert: ${organization.name} ${fromName} → ${toName}`;
      headerSubtitle = "Downgrade Alert";
      content =
        emailHeading("Plan Downgrade Scheduled") +
        emailMetric(`${fromName} → ${toName}`, "Plan Change", { color: EMAIL_COLORS.warning }) +

        emailInfoBox(`
          ${infoRow("Customer", `${user.firstName} ${user.lastName}`)}
          ${infoRow("Email", user.email)}
          ${infoRow("Organization", organization.name)}
          ${infoRow("Effective Date", effectiveDate)}
          ${infoRow("Time", new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))}
        `, { borderColor: EMAIL_COLORS.warning }) +

        emailDivider() +
        emailHeading("Retention Actions", { level: 2 }) +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li><strong style="color:${EMAIL_COLORS.textPrimary};">Reach out within 24 hours</strong></li>
          <li>Ask about their experience and reasons for downgrading</li>
          <li>Offer personalized onboarding for underused features</li>
          <li>Consider a retention offer if appropriate</li>
        </ul>`;
      break;
    }

    case "subscription_canceled": {
      const cancelTier = metadata?.tier || organization.planTier || "pro";
      const cancelTierName = cancelTier.charAt(0).toUpperCase() + cancelTier.slice(1);
      const cancelDate = metadata?.effectiveDate ? new Date(metadata.effectiveDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "next billing date";
      subject = `Cancellation Alert: ${organization.name} canceling ${cancelTierName}`;
      headerSubtitle = "Cancellation Alert";
      content =
        emailHeading("Subscription Canceled") +
        emailMetric(`Churn Risk: ${cancelTierName}`, organization.name, { color: EMAIL_COLORS.error }) +

        emailInfoBox(`
          ${infoRow("Customer", `${user.firstName} ${user.lastName}`)}
          ${infoRow("Email", user.email)}
          ${infoRow("Organization", organization.name)}
          ${infoRow("Plan", cancelTierName)}
          ${infoRow("Cancellation Date", cancelDate)}
          ${infoRow("Time", new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))}
        `, { borderColor: EMAIL_COLORS.error }) +

        emailDivider() +
        emailHeading("Win-Back Actions", { level: 2 }) +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li><strong style="color:${EMAIL_COLORS.textPrimary};">Reach out immediately</strong> — they can still revert</li>
          <li>Understand the reason for cancellation</li>
          <li>Offer a personalized retention deal if applicable</li>
          <li>Document feedback for product improvements</li>
        </ul>`;
      break;
    }

    case "pending_change_reverted": {
      const keptTier = metadata?.tier || organization.planTier || "pro";
      const keptTierName = keptTier.charAt(0).toUpperCase() + keptTier.slice(1);
      subject = `Win-back: ${organization.name} kept ${keptTierName}`;
      headerSubtitle = "Retention Win";
      content =
        emailHeading("Customer Retained!") +
        emailMetric(`Kept ${keptTierName}`, organization.name, { color: EMAIL_COLORS.success }) +

        customerDetails(user, organization) +

        emailDivider() +
        emailHeading("Next Steps", { level: 2 }) +
        `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
          <li>Customer reverted their pending change — they're staying!</li>
          <li>Follow up to ensure satisfaction</li>
          <li>Monitor usage to prevent future churn risk</li>
        </ul>` +
        emailParagraph("<strong>Great news — celebrate this retention win!</strong>");
      break;
    }

    case "milestone_reached": {
      const milestone = metadata?.milestoneName || "Unknown Milestone";
      const value = metadata?.value || 0;
      subject = `Milestone Reached: ${milestone}`;
      headerSubtitle = "Milestone Reached";
      content =
        emailHeading("Milestone Reached!") +
        emailMetric(String(milestone), `Value: ${value}`, { color: EMAIL_COLORS.accent }) +

        emailParagraph("<strong>Take a moment to celebrate!</strong>") +
        emailParagraph("This is progress. Keep shipping.");
      break;
    }
  }

  const html = emailDarkWrapper(
    emailHeader({ subtitle: headerSubtitle }) +
    emailContentRow(content) +
    emailFooter({ extra: `${EMAIL_BRAND.name} Sales Notification` })
  );

  return { subject, html };
}
