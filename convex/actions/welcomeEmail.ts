"use node";

/**
 * WELCOME EMAIL ACTION
 *
 * Sends a personalized welcome email with onboarding checklist
 * when a user signs up for a free account.
 *
 * Email includes:
 * - Welcome message
 * - Next steps checklist (API setup, template download, etc.)
 * - Links to documentation
 * - Support contact info
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

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    organizationName: v.string(),
    apiKeyPrefix: v.string(), // Show prefix for reference
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    const subject = `Welcome to L4YERCAK3, ${args.firstName}! 🎉`;
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

      console.log("✅ Welcome email sent successfully:", data);
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
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
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

    .api-key {
      background: #FEF3C7;
      border-left: 4px solid #F59E0B;
      padding: 20px;
      margin: 20px 0;
      font-family: monospace;
      word-break: break-all;
    }

    .checklist {
      background: #F9FAFB;
      border-left: 4px solid #6B46C1;
      padding: 20px;
      margin: 20px 0;
    }

    .checklist-item {
      margin: 20px 0;
      padding-bottom: 15px;
      border-bottom: 1px solid #E5E7EB;
    }

    .checklist-item:last-child {
      border-bottom: none;
    }

    .button-wrapper {
      text-align: center;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>l4yercak3</h1>
    </div>

    <div class="content">
      <div class="greeting">Welcome to l4yercak3, ${args.firstName}! 🎉</div>

      <p>Your organization <strong>${args.organizationName}</strong> is ready to go. You now have a powerful backend for your freelance business—no backend coding required.</p>

      <div class="api-key">
        <strong>⚠️ Your API Key Prefix:</strong><br>
        <code>${args.apiKeyPrefix}...</code><br>
        <small>(Full key was shown once during signup. Check your download or signup confirmation.)</small>
      </div>

      <div class="checklist">
        <h2>🚀 Your Next Steps</h2>

        <div class="checklist-item">
          <strong>1️⃣ Download the Freelancer Portal Template</strong><br>
          <small>Get the free Next.js template that connects to your backend</small><br>
          <a href="https://l4yercak3.com/templates/freelancer-portal" class="button">Download Template</a>
        </div>

        <div class="checklist-item">
          <strong>2️⃣ Set Up Your API Key</strong><br>
          <small>Add your API key to the template's <code>.env.local</code> file:</small><br>
          <code>NEXT_PUBLIC_API_KEY=your_key_here</code>
        </div>

        <div class="checklist-item">
          <strong>3️⃣ Deploy Your Template</strong><br>
          <small>Deploy to Vercel (free) in 2 minutes</small><br>
          <a href="https://vercel.com/new" class="button">Deploy Now</a>
        </div>

        <div class="checklist-item">
          <strong>4️⃣ Add Your First Contact</strong><br>
          <small>Test the CRM by adding a client or prospect</small>
        </div>

        <div class="checklist-item">
          <strong>5️⃣ Create Your First Invoice</strong><br>
          <small>Use the built-in invoicing system</small>
        </div>
      </div>

      <h2>📚 Helpful Resources</h2>
      <ul>
        <li><a href="https://docs.l4yercak3.com/quickstart">Quickstart Guide</a> — 5-minute setup walkthrough</li>
        <li><a href="https://docs.l4yercak3.com/api">API Documentation</a> — Complete API reference</li>
        <li><a href="https://docs.l4yercak3.com/templates">Template Library</a> — Pre-built templates for common use cases</li>
        <li><a href="https://l4yercak3.com/support">Support</a> — Get help from our team</li>
      </ul>

      <h2>💡 What You Can Build</h2>
      <p>With L4YERCAK3 as your backend, you can build:</p>
      <ul>
        <li>Client portals with real-time updates</li>
        <li>Invoice management systems</li>
        <li>Project tracking dashboards</li>
        <li>CRM systems with contact syncing</li>
        <li>AI-powered workflows and automations</li>
        <li>Multi-tenant SaaS applications</li>
      </ul>

      <h2>🚀 Ready to Upgrade?</h2>
      <p>Your free account includes:</p>
      <ul>
        <li>✅ 100 contacts</li>
        <li>✅ 1 API key</li>
        <li>✅ 250 MB storage</li>
        <li>✅ Core CRM, projects, and invoicing</li>
      </ul>

      <p>Need more? <strong>Upgrade to Starter (€199/month)</strong> for:</p>
      <ul>
        <li>🚀 1,000 contacts</li>
        <li>🤖 AI-powered features</li>
        <li>📊 Advanced analytics</li>
        <li>🎨 White-label branding</li>
        <li>⚡ Priority support</li>
      </ul>

      <a href="https://l4yercak3.com/pricing" class="button">View Pricing</a>
    </div>

    <div class="footer">
      <p><strong>Need help?</strong> Reply to this email or visit <a href="https://l4yercak3.com/support">our support page</a>.</p>
      <p>Happy building! 🎉<br>— The L4YERCAK3 Team</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generateWelcomeEmailText(args: {
  firstName: string;
  organizationName: string;
  apiKeyPrefix: string;
}): string {
  return `
Welcome to L4YERCAK3, ${args.firstName}! 🎉

Your organization "${args.organizationName}" is ready to go. You now have a powerful backend for your freelance business—no backend coding required.

⚠️ YOUR API KEY PREFIX: ${args.apiKeyPrefix}...
(Full key was shown once during signup. Check your download or signup confirmation.)

🚀 YOUR NEXT STEPS:

1️⃣ Download the Freelancer Portal Template
Get the free Next.js template that connects to your backend
→ https://l4yercak3.com/templates/freelancer-portal

2️⃣ Set Up Your API Key
Add your API key to the template's .env.local file:
NEXT_PUBLIC_API_KEY=your_key_here

3️⃣ Deploy Your Template
Deploy to Vercel (free) in 2 minutes
→ https://vercel.com/new

4️⃣ Add Your First Contact
Test the CRM by adding a client or prospect

5️⃣ Create Your First Invoice
Use the built-in invoicing system

📚 HELPFUL RESOURCES:

- Quickstart Guide: https://docs.l4yercak3.com/quickstart
- API Documentation: https://docs.l4yercak3.com/api
- Template Library: https://docs.l4yercak3.com/templates
- Support: https://l4yercak3.com/support

💡 WHAT YOU CAN BUILD:

With L4YERCAK3 as your backend, you can build:
- Client portals with real-time updates
- Invoice management systems
- Project tracking dashboards
- CRM systems with contact syncing
- AI-powered workflows and automations
- Multi-tenant SaaS applications

🚀 READY TO UPGRADE?

Your free account includes:
✅ 100 contacts
✅ 1 API key
✅ 250 MB storage
✅ Core CRM, projects, and invoicing

Need more? Upgrade to Starter (€199/month) for:
🚀 1,000 contacts
🤖 AI-powered features
📊 Advanced analytics
🎨 White-label branding
⚡ Priority support

View pricing: https://l4yercak3.com/pricing

---

Need help? Reply to this email or visit https://l4yercak3.com/support

Happy building! 🎉
— The L4YERCAK3 Team
  `.trim();
}
