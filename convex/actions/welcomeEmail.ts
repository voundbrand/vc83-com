"use node";

/**
 * WELCOME EMAIL ACTION
 *
 * Sends a personalized welcome email with onboarding checklist
 * when a user signs up for a free account.
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
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
} from "../lib/emailBrandConstants";

const createResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
};

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    organizationName: v.string(),
    apiKeyPrefix: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    const subject = `Welcome to sevenlayers, ${args.firstName}!`;
    const html = generateWelcomeEmailHTML(args);
    const text = generateWelcomeEmailText(args);

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: process.env.REPLY_TO_EMAIL || "support@l4yercak3.com",
        to: args.email,
        subject,
        html,
        text,
        headers: {
          'X-Entity-Ref-ID': `welcome-${Date.now()}`,
        },
      });

      if (error) {
        console.error("Failed to send welcome email:", error);
        throw new Error(`Email could not be sent: ${error.message}`);
      }

      console.log("Welcome email sent successfully:", data);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending welcome email:", error);
      throw error;
    }
  },
});

function generateWelcomeEmailHTML(args: {
  firstName: string;
  organizationName: string;
  apiKeyPrefix: string;
}): string {
  const checklistItem = (num: string, title: string, desc: string, link?: { label: string; url: string }) => `
    <div style="padding:16px 0;border-bottom:1px solid ${EMAIL_COLORS.border};">
      <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">${num} ${title}</p>
      <p style="margin:0;font-size:13px;color:${EMAIL_COLORS.textSecondary};">${desc}</p>
      ${link ? `<a href="${link.url}" style="display:inline-block;margin-top:8px;font-size:13px;color:${EMAIL_COLORS.accent};text-decoration:underline;">${link.label}</a>` : ""}
    </div>`;

  return emailDarkWrapper(
    emailHeader() +
    emailContentRow(
      emailHeading(`Welcome to ${EMAIL_BRAND.name}, ${args.firstName}!`) +
      emailParagraph(
        `Your organization <strong>${args.organizationName}</strong> is ready to go. You now have a powerful backend for your freelance business — no backend coding required.`
      ) +

      // API key box
      `<div style="background:${EMAIL_COLORS.surfaceRaised};border-left:3px solid ${EMAIL_COLORS.warning};border-radius:${EMAIL_STYLES.cardRadius};padding:16px 20px;margin:16px 0;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${EMAIL_COLORS.warning};">Your API Key Prefix:</p>
        <code style="font-family:${EMAIL_STYLES.monoStack};font-size:14px;color:${EMAIL_COLORS.textPrimary};word-break:break-all;">${args.apiKeyPrefix}...</code>
        <p style="margin:8px 0 0;font-size:12px;color:${EMAIL_COLORS.textTertiary};">(Full key was shown once during signup. Check your download or signup confirmation.)</p>
      </div>` +

      // Checklist
      emailDivider() +
      emailHeading("Your Next Steps", { level: 2 }) +
      `<div style="background:${EMAIL_COLORS.surfaceRaised};border-left:3px solid ${EMAIL_COLORS.accent};border-radius:${EMAIL_STYLES.cardRadius};padding:4px 20px;">` +
      checklistItem("1.", "Download the Freelancer Portal Template", "Get the free Next.js template that connects to your backend", { label: "Download Template", url: "https://l4yercak3.com/templates/freelancer-portal" }) +
      checklistItem("2.", "Set Up Your API Key", "Add your API key to the template's .env.local file") +
      checklistItem("3.", "Deploy Your Template", "Deploy to Vercel (free) in 2 minutes", { label: "Deploy Now", url: "https://vercel.com/new" }) +
      checklistItem("4.", "Add Your First Contact", "Test the CRM by adding a client or prospect") +
      `<div style="padding:16px 0;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">5. Create Your First Invoice</p>
        <p style="margin:0;font-size:13px;color:${EMAIL_COLORS.textSecondary};">Use the built-in invoicing system</p>
      </div>` +
      `</div>` +

      // Resources
      emailDivider() +
      emailHeading("Helpful Resources", { level: 2 }) +
      `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
        <li><a href="https://docs.l4yercak3.com/quickstart" style="color:${EMAIL_COLORS.accent};">Quickstart Guide</a> — 5-minute setup walkthrough</li>
        <li><a href="https://docs.l4yercak3.com/api" style="color:${EMAIL_COLORS.accent};">API Documentation</a> — Complete API reference</li>
        <li><a href="https://docs.l4yercak3.com/templates" style="color:${EMAIL_COLORS.accent};">Template Library</a> — Pre-built templates for common use cases</li>
        <li><a href="https://l4yercak3.com/support" style="color:${EMAIL_COLORS.accent};">Support</a> — Get help from our team</li>
      </ul>` +

      // What you can build
      emailDivider() +
      emailHeading("What You Can Build", { level: 2 }) +
      emailParagraph(`With ${EMAIL_BRAND.name} as your backend, you can build:`) +
      `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
        <li>Client portals with real-time updates</li>
        <li>Invoice management systems</li>
        <li>Project tracking dashboards</li>
        <li>CRM systems with contact syncing</li>
        <li>AI-powered workflows and automations</li>
        <li>Multi-tenant SaaS applications</li>
      </ul>` +

      // Upgrade
      emailDivider() +
      emailHeading("Ready to Upgrade?", { level: 2 }) +
      emailParagraph("Your free account includes: 100 contacts, 1 API key, 250 MB storage, and core CRM, projects, and invoicing.") +
      emailParagraph("Need more? <strong>Upgrade to Starter (€199/month)</strong> for 1,000 contacts, AI-powered features, advanced analytics, white-label branding, and priority support.") +
      emailButton("View Pricing", "https://l4yercak3.com/pricing")
    ) +
    emailFooter({ extra: `Need help? Reply to this email or visit <a href="https://l4yercak3.com/support" style="color:${EMAIL_COLORS.textTertiary};text-decoration:underline;">our support page</a>.` })
  );
}

function generateWelcomeEmailText(args: {
  firstName: string;
  organizationName: string;
  apiKeyPrefix: string;
}): string {
  return `
Welcome to sevenlayers, ${args.firstName}!

Your organization "${args.organizationName}" is ready to go. You now have a powerful backend for your freelance business — no backend coding required.

YOUR API KEY PREFIX: ${args.apiKeyPrefix}...
(Full key was shown once during signup. Check your download or signup confirmation.)

YOUR NEXT STEPS:

1. Download the Freelancer Portal Template
Get the free Next.js template that connects to your backend
-> https://l4yercak3.com/templates/freelancer-portal

2. Set Up Your API Key
Add your API key to the template's .env.local file:
NEXT_PUBLIC_API_KEY=your_key_here

3. Deploy Your Template
Deploy to Vercel (free) in 2 minutes
-> https://vercel.com/new

4. Add Your First Contact
Test the CRM by adding a client or prospect

5. Create Your First Invoice
Use the built-in invoicing system

HELPFUL RESOURCES:

- Quickstart Guide: https://docs.l4yercak3.com/quickstart
- API Documentation: https://docs.l4yercak3.com/api
- Template Library: https://docs.l4yercak3.com/templates
- Support: https://l4yercak3.com/support

WHAT YOU CAN BUILD:

With sevenlayers as your backend, you can build:
- Client portals with real-time updates
- Invoice management systems
- Project tracking dashboards
- CRM systems with contact syncing
- AI-powered workflows and automations
- Multi-tenant SaaS applications

READY TO UPGRADE?

Your free account includes:
- 100 contacts
- 1 API key
- 250 MB storage
- Core CRM, projects, and invoicing

Need more? Upgrade to Starter (€199/month) for:
- 1,000 contacts
- AI-powered features
- Advanced analytics
- White-label branding
- Priority support

View pricing: https://l4yercak3.com/pricing

---

Need help? Reply to this email or visit https://l4yercak3.com/support

— The sevenlayers Team
  `.trim();
}
