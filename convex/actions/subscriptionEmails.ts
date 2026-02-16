"use node";

/**
 * SUBSCRIPTION EMAIL ACTIONS
 *
 * Sends contextual emails for subscription lifecycle events:
 * - plan_upgrade: "Welcome to {Tier}"
 * - plan_downgrade: "Plan change scheduled"
 * - credit_purchase: "Credits added"
 * - subscription_canceled: "Subscription ending on {date}"
 * - trial_started: "Your 14-day trial has started"
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

const FROM_EMAIL = "l4yercak3 <team@mail.l4yercak3.com>";
const REPLY_TO = "support@l4yercak3.com";

const TIER_DISPLAY: Record<string, { name: string; price: string }> = {
  free: { name: "Free", price: "€0" },
  pro: { name: "Pro", price: "€29/mo" },
  agency: { name: "Agency", price: "€299/mo" },
  enterprise: { name: "Enterprise", price: "Custom" },
};

/**
 * Send subscription lifecycle email
 */
export const sendSubscriptionEmail = internalAction({
  args: {
    to: v.string(),
    event: v.union(
      v.literal("plan_upgrade"),
      v.literal("plan_downgrade"),
      v.literal("credit_purchase"),
      v.literal("subscription_canceled"),
      v.literal("trial_started")
    ),
    organizationName: v.string(),
    tier: v.optional(v.string()),
    fromTier: v.optional(v.string()),
    toTier: v.optional(v.string()),
    credits: v.optional(v.number()),
    amountEur: v.optional(v.number()),
    billingPeriod: v.optional(v.string()),
    effectiveDate: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const resend = createResendClient();

    const { subject, html, text } = buildEmail(args);

    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        replyTo: REPLY_TO,
        to: args.to,
        subject,
        html,
        text,
        headers: {
          "X-Entity-Ref-ID": `sub-${args.event}-${Date.now()}`,
        },
      });

      if (error) {
        console.error(`[Subscription Emails] Failed to send ${args.event} email:`, error);
        throw new Error(`Email send failed: ${error.message}`);
      }

      console.log(`[Subscription Emails] Sent ${args.event} email to ${args.to}`);
    } catch (error) {
      console.error(`[Subscription Emails] Error sending ${args.event} email:`, error);
      throw error;
    }
  },
});

function buildEmail(args: {
  event: string;
  organizationName: string;
  tier?: string;
  fromTier?: string;
  toTier?: string;
  credits?: number;
  amountEur?: number;
  billingPeriod?: string;
  effectiveDate?: number;
  trialEndsAt?: number;
}): { subject: string; html: string; text: string } {
  const orgName = args.organizationName;

  switch (args.event) {
    case "plan_upgrade": {
      const tierInfo = TIER_DISPLAY[args.tier || "pro"];
      const subject = `Welcome to ${tierInfo.name} - ${orgName}`;
      return {
        subject,
        html: wrapHtml(`
          <h1 style="color:#1a1a2e;margin:0 0 16px">Welcome to ${tierInfo.name}!</h1>
          <p style="color:#333;font-size:16px;line-height:1.6">
            Your organization <strong>${orgName}</strong> has been upgraded to the
            <strong>${tierInfo.name}</strong> plan (${tierInfo.price}).
          </p>
          <p style="color:#333;font-size:16px;line-height:1.6">
            ${args.billingPeriod === "annual" ? "You're on annual billing - saving ~17% compared to monthly." : ""}
          </p>
          <p style="color:#333;font-size:16px;line-height:1.6">
            Your new features are active immediately. Check your dashboard to explore everything that's now available.
          </p>
          ${ctaButton("Go to Dashboard", "https://app.l4yercak3.com")}
        `),
        text: `Welcome to ${tierInfo.name}! Your organization ${orgName} has been upgraded. Your new features are active immediately.`,
      };
    }

    case "plan_downgrade": {
      const fromInfo = TIER_DISPLAY[args.fromTier || "agency"];
      const toInfo = TIER_DISPLAY[args.toTier || "pro"];
      const dateStr = args.effectiveDate ? new Date(args.effectiveDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "your next billing date";
      const subject = `Plan change scheduled - ${orgName}`;
      return {
        subject,
        html: wrapHtml(`
          <h1 style="color:#1a1a2e;margin:0 0 16px">Plan Change Scheduled</h1>
          <p style="color:#333;font-size:16px;line-height:1.6">
            Your plan for <strong>${orgName}</strong> will change from
            <strong>${fromInfo.name}</strong> to <strong>${toInfo.name}</strong>
            on <strong>${dateStr}</strong>.
          </p>
          <p style="color:#333;font-size:16px;line-height:1.6">
            You'll keep all your current ${fromInfo.name} features until the change takes effect.
            No action is needed - the switch will happen automatically.
          </p>
          <p style="color:#666;font-size:14px;line-height:1.6">
            Changed your mind? You can cancel this change from the Store window in your dashboard.
          </p>
        `),
        text: `Plan change scheduled for ${orgName}. Changing from ${fromInfo.name} to ${toInfo.name} on ${dateStr}. You'll keep your current features until then.`,
      };
    }

    case "credit_purchase": {
      const credits = args.credits || 0;
      const amount = args.amountEur || 0;
      const subject = `Credits added - ${credits.toLocaleString()} credits for ${orgName}`;
      return {
        subject,
        html: wrapHtml(`
          <h1 style="color:#1a1a2e;margin:0 0 16px">Credits Added!</h1>
          <div style="background:#f0f9ff;border-radius:8px;padding:20px;margin:16px 0;text-align:center">
            <div style="font-size:32px;font-weight:bold;color:#1a1a2e">${credits.toLocaleString()}</div>
            <div style="color:#666;font-size:14px">credits added to ${orgName}</div>
          </div>
          <p style="color:#333;font-size:16px;line-height:1.6">
            Your purchase of <strong>\u20AC${amount}</strong> has been processed.
            These credits never expire and can be used for AI features, automations, and more.
          </p>
        `),
        text: `${credits.toLocaleString()} credits added to ${orgName}. Your purchase of EUR ${amount} has been processed. Credits never expire.`,
      };
    }

    case "subscription_canceled": {
      const dateStr = args.effectiveDate ? new Date(args.effectiveDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "your next billing date";
      const tierInfo = TIER_DISPLAY[args.tier || "pro"];
      const subject = `Subscription ending - ${orgName}`;
      return {
        subject,
        html: wrapHtml(`
          <h1 style="color:#1a1a2e;margin:0 0 16px">Subscription Ending</h1>
          <p style="color:#333;font-size:16px;line-height:1.6">
            Your <strong>${tierInfo.name}</strong> subscription for <strong>${orgName}</strong>
            will end on <strong>${dateStr}</strong>.
          </p>
          <p style="color:#333;font-size:16px;line-height:1.6">
            After this date, your organization will move to the Free plan.
            You'll keep all your data, but some features will be restricted.
          </p>
          <p style="color:#666;font-size:14px;line-height:1.6">
            Want to keep your plan? You can reactivate from the Store window before ${dateStr}.
          </p>
          ${ctaButton("Reactivate Subscription", "https://app.l4yercak3.com")}
        `),
        text: `Your ${tierInfo.name} subscription for ${orgName} will end on ${dateStr}. After this date, you'll move to the Free plan. Reactivate from your dashboard before then.`,
      };
    }

    case "trial_started": {
      const tierInfo = TIER_DISPLAY[args.tier || "agency"];
      const endsStr = args.trialEndsAt ? new Date(args.trialEndsAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "in 14 days";
      const subject = `Your 14-day ${tierInfo.name} trial has started - ${orgName}`;
      return {
        subject,
        html: wrapHtml(`
          <h1 style="color:#1a1a2e;margin:0 0 16px">Your Trial Has Started!</h1>
          <p style="color:#333;font-size:16px;line-height:1.6">
            Welcome to your <strong>14-day free trial</strong> of the
            <strong>${tierInfo.name}</strong> plan for <strong>${orgName}</strong>.
          </p>
          <p style="color:#333;font-size:16px;line-height:1.6">
            You have full access to all ${tierInfo.name} features until <strong>${endsStr}</strong>.
            No credit card required during your trial.
          </p>
          <p style="color:#333;font-size:16px;line-height:1.6">
            Make the most of your trial by exploring all available features.
          </p>
          ${ctaButton("Explore Features", "https://app.l4yercak3.com")}
        `),
        text: `Your 14-day ${tierInfo.name} trial for ${orgName} has started! Full access until ${endsStr}. No credit card required.`,
      };
    }

    default:
      return {
        subject: `Subscription update - ${orgName}`,
        html: wrapHtml(`<p>Your subscription for ${orgName} has been updated.</p>`),
        text: `Your subscription for ${orgName} has been updated.`,
      };
  }
}

function ctaButton(label: string, url: string): string {
  return `
    <div style="text-align:center;margin:24px 0">
      <a href="${url}" style="display:inline-block;background:#1a1a2e;color:white;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:bold;font-size:14px">${label}</a>
    </div>
  `;
}

function wrapHtml(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="max-width:600px;margin:0 auto;padding:40px 20px">
        <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
          ${content}
        </div>
        <div style="text-align:center;margin-top:24px;color:#999;font-size:12px">
          <p>l4yercak3 - Business Operating System</p>
          <p>
            <a href="https://app.l4yercak3.com" style="color:#999;text-decoration:underline">Dashboard</a> &bull;
            <a href="mailto:support@l4yercak3.com" style="color:#999;text-decoration:underline">Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
