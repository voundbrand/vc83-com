"use node";

/**
 * SALES NOTIFICATION EMAIL ACTION
 *
 * Sends email to sales team when important events happen:
 * - New free signup
 * - Upgrade to Starter
 * - Build Sprint application
 * - Milestone reached
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// Initialize Resend client
const createResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
};

export const sendSalesNotification = internalAction({
  args: {
    eventType: v.union(
      v.literal("free_signup"),
      v.literal("starter_upgrade"),
      v.literal("platform_tier_upgrade"), // Generic tier upgrade (starter, professional, agency, enterprise)
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
      planTier: v.string(), // Changed from 'plan' to 'planTier' to match license system
    }),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";
    const salesEmail = process.env.SALES_EMAIL || "remington@l4yercak3.com";

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

      console.log("✅ Sales notification sent successfully:", data);
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

  let subject = "";
  let html = "";

  switch (eventType) {
    case "free_signup":
      subject = `🎉 New Free Signup: ${user.firstName} ${user.lastName}`;
      html = `
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
    .info-box {
      background: #F9FAFB;
      border-left: 4px solid #6B46C1;
      padding: 20px;
      margin: 20px 0;
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
      font-size: 16px;
    }
    .footer {
      background-color: #F9FAFB;
      padding: 20px 30px;
      text-align: center;
      border-top: 3px solid #6B46C1;
      font-size: 14px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 New Free Signup</h1>
    </div>

    <div class="content">
      <h2 style="color: #6B46C1;">New Free Account Signup!</h2>

      <div class="info-box">
        <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Organization:</strong> ${organization.name}</p>
        <p><strong>Plan:</strong> ${organization.planTier}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' })}</p>
      </div>

      <h2>📊 Next Steps</h2>
      <ul>
        <li>Monitor their usage in the admin dashboard</li>
        <li>Check if they download the template</li>
        <li>Follow up in 3 days if no activity</li>
        <li>Track for upgrade opportunity (€199/month Starter)</li>
      </ul>

      <p><a href="https://l4yercak3.com/admin/users/${user.email}" class="button">View User Profile</a></p>
    </div>

    <div class="footer">
      <p>L4YERCAK3 Sales Notification</p>
    </div>
  </div>
</body>
</html>
      `.trim();
      break;

    case "platform_tier_upgrade":
    case "starter_upgrade":
      // Use dynamic pricing from Stripe
      const tierName = organization.planTier.charAt(0).toUpperCase() + organization.planTier.slice(1);
      const isGenericUpgrade = eventType === "platform_tier_upgrade";

      // Get actual amount from Stripe checkout (in cents)
      const amountTotal = metadata?.amountTotal || 0;
      const currency = metadata?.currency || "eur";
      const billingPeriod = metadata?.billingPeriod || "monthly";

      // Calculate MRR from the actual Stripe amount
      // If annual billing, divide by 12 to get monthly equivalent
      const monthlyPrice = billingPeriod === "annual"
        ? Math.round(amountTotal / 12)
        : amountTotal;
      const annualPrice = billingPeriod === "annual"
        ? amountTotal
        : amountTotal * 12;
      const ltv = monthlyPrice * 24; // 24 month LTV estimate

      // Format price for display
      const currencySymbol = currency === "eur" ? "€" : currency === "usd" ? "$" : currency.toUpperCase() + " ";
      const formatPrice = (cents: number) => `${currencySymbol}${(cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 0 })}`;

      subject = isGenericUpgrade
        ? `💰 Upgrade Alert: ${user.firstName} ${user.lastName} → ${tierName}`
        : `💰 Upgrade Alert: ${user.firstName} ${user.lastName} → Starter (€199/mo)`;
      html = `
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
      border: 3px solid #10b981;
      box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.2);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
      padding: 30px;
      text-align: center;
      border-bottom: 3px solid #10b981;
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
    .info-box {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 20px 0;
    }
    .metric {
      font-size: 28px;
      font-weight: bold;
      color: #10b981;
      margin-bottom: 15px;
    }
    .footer {
      background-color: #F9FAFB;
      padding: 20px 30px;
      text-align: center;
      border-top: 3px solid #10b981;
      font-size: 14px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 ${tierName} Upgrade</h1>
    </div>

    <div class="content">
      <h2 style="color: #10b981;">New ${tierName} Customer!</h2>

      <div class="info-box">
        <p class="metric">+${formatPrice(monthlyPrice)}/month MRR 🎉</p>
        <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Organization:</strong> ${organization.name}</p>
        <p><strong>Plan:</strong> ${tierName} (${billingPeriod})</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' })}</p>
      </div>

      <h2>📊 Revenue Impact</h2>
      <ul>
        <li><strong>MRR:</strong> +${formatPrice(monthlyPrice)}/month</li>
        <li><strong>ARR:</strong> +${formatPrice(annualPrice)}/year</li>
        <li><strong>Lifetime Value:</strong> ~${formatPrice(ltv)} (24 months)</li>
      </ul>

      <h2>🎯 Next Steps</h2>
      <ul>
        <li>Send thank you email</li>
        <li>Monitor for usage patterns</li>
        <li>Check in after 30 days for feedback</li>
        <li>Consider for case study (3-6 months)</li>
      </ul>

      <p><strong>Celebrate this win! 🎉</strong></p>
    </div>

    <div class="footer">
      <p>L4YERCAK3 Sales Notification</p>
    </div>
  </div>
</body>
</html>
      `.trim();
      break;

    case "build_sprint_app":
      subject = `🚀 Build Sprint Application: ${user.firstName} ${user.lastName}`;
      html = `
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
      border: 3px solid #f59e0b;
      box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.2);
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
      padding: 30px;
      text-align: center;
      border-bottom: 3px solid #f59e0b;
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
    .info-box {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin: 20px 0;
    }
    .metric {
      font-size: 28px;
      font-weight: bold;
      color: #f59e0b;
      margin-bottom: 15px;
    }
    .button {
      display: inline-block;
      padding: 15px 40px;
      background-color: #f59e0b;
      color: #FFFFFF;
      text-decoration: none;
      font-weight: bold;
      border: 3px solid #f59e0b;
      box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.2);
      font-size: 16px;
    }
    .footer {
      background-color: #F9FAFB;
      padding: 20px 30px;
      text-align: center;
      border-top: 3px solid #f59e0b;
      font-size: 14px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Build Sprint Application</h1>
    </div>

    <div class="content">
      <h2 style="color: #f59e0b;">New Build Sprint Application!</h2>

      <div class="info-box">
        <p class="metric">Potential €12,500 💰</p>
        <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Organization:</strong> ${organization.name}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' })}</p>
      </div>

      <h2>🎯 Immediate Actions</h2>
      <ul>
        <li><strong>Respond within 24 hours</strong></li>
        <li>Review their application details</li>
        <li>Schedule discovery call</li>
        <li>Send Build Sprint one-pager</li>
        <li>Prepare proposal template</li>
      </ul>

      <p><a href="https://l4yercak3.com/admin/build-sprint-apps" class="button">View Application</a></p>
    </div>

    <div class="footer">
      <p>L4YERCAK3 Sales Notification</p>
    </div>
  </div>
</body>
</html>
      `.trim();
      break;

    case "milestone_reached":
      const milestone = metadata?.milestoneName || "Unknown Milestone";
      const value = metadata?.value || 0;
      subject = `🎉 Milestone Reached: ${milestone}`;
      html = `
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
    .info-box {
      background: #fdf4ff;
      border-left: 4px solid #6B46C1;
      padding: 20px;
      margin: 20px 0;
    }
    .metric {
      font-size: 32px;
      font-weight: bold;
      color: #6B46C1;
      margin-bottom: 15px;
    }
    .footer {
      background-color: #F9FAFB;
      padding: 20px 30px;
      text-align: center;
      border-top: 3px solid #6B46C1;
      font-size: 14px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Milestone Reached</h1>
    </div>

    <div class="content">
      <h2 style="color: #6B46C1;">Milestone Reached!</h2>

      <div class="info-box">
        <p class="metric">${milestone}</p>
        <p><strong>Value:</strong> ${value}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' })}</p>
      </div>

      <p><strong>Take a moment to celebrate! 🎉</strong></p>
      <p>This is progress. Keep shipping.</p>
    </div>

    <div class="footer">
      <p>L4YERCAK3 Sales Notification</p>
    </div>
  </div>
</body>
</html>
      `.trim();
      break;
  }

  return { subject, html };
}
