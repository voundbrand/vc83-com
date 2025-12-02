/**
 * EMAIL DELIVERY SERVICE
 *
 * Handles sending emails via Resend API
 * Reads domain configuration for sender settings
 * Includes retry logic for reliability
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const sendEmail = internalAction({
  args: {
    // Domain config to use for sender settings
    domainConfigId: v.id("objects"),

    // Email details
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),

    // Optional overrides
    replyTo: v.optional(v.string()),

    // Attachments
    attachments: v.optional(v.array(v.object({
      filename: v.string(),
      content: v.string(), // base64 encoded
      contentType: v.string(),
    }))),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    attempts: number;
  }> => {
    // 1. Get Resend API key from environment
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured in environment variables");
    }

    // 2. Load domain config directly from database (avoid circular imports)
    const domainConfig = await ctx.runMutation(internal.domainConfigOntology.getDomainConfigInternal, {
      configId: args.domainConfigId,
    });

    if (!domainConfig) {
      throw new Error("Domain configuration not found");
    }

    const emailSettings: any = (domainConfig.customProperties as any)?.email;
    if (!emailSettings) {
      throw new Error("Email settings not configured for this domain");
    }

    // 3. Prepare email payload
    // Note: Resend API accepts base64 strings directly, no need to convert from Buffer
    const emailPayload = {
      from: emailSettings.senderEmail,
      to: args.to,
      replyTo: args.replyTo || emailSettings.replyToEmail,
      subject: args.subject,
      html: args.html,
      text: args.text,
      attachments: args.attachments?.map((a: any) => ({
        filename: a.filename,
        content: a.content, // Already base64 encoded
        contentType: a.contentType,
      })),
    };

    // 4. Send email with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      try {
        console.log(`📧 Sending email (attempt ${attempts + 1}/${maxAttempts})...`);
        console.log(`   To: ${args.to}`);
        console.log(`   From: ${emailSettings.senderEmail}`);
        console.log(`   Subject: ${args.subject}`);

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();

        console.log(`✅ Email sent successfully! Message ID: ${result.id}`);

        return {
          success: true,
          messageId: result.id,
          attempts: attempts + 1,
        };

      } catch (error) {
        attempts++;
        lastError = error;

        console.error(`❌ Email send failed (attempt ${attempts}/${maxAttempts}):`, error);

        if (attempts >= maxAttempts) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            attempts,
          };
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    // Should never reach here, but TypeScript needs it
    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : "Unknown error",
      attempts: maxAttempts,
    };
  },
});

/**
 * Send test email to verify configuration
 * Useful for testing before sending to real customers
 */
export const sendTestEmail = internalAction({
  args: {
    domainConfigId: v.id("objects"),
    testRecipient: v.string(),
    templateHtml: v.string(),
    subject: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    attempts: number;
  }> => {
    return await ctx.runAction(internal.emailDelivery.sendEmail, {
      domainConfigId: args.domainConfigId,
      to: args.testRecipient,
      subject: `[TEST] ${args.subject}`,
      html: args.templateHtml,
      text: "This is a test email",
    });
  },
});

/**
 * Send sales notification email
 * Internal notification sent to sales team when a new order is completed
 */
export const sendSalesNotificationEmail = internalAction({
  args: {
    checkoutSessionId: v.id("objects"),
    recipientEmail: v.string(),
    templateId: v.optional(v.id("objects")), // Optional: custom email template
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> => {
    console.log("📧 [sendSalesNotificationEmail] Starting sales notification for session:", args.checkoutSessionId);

    // 1. Get checkout session
    const session = await ctx.runQuery(internal.checkoutSessionOntology.getCheckoutSessionInternal, {
      checkoutSessionId: args.checkoutSessionId,
    });

    if (!session) {
      console.error("❌ Checkout session not found");
      return { success: false, error: "Checkout session not found" };
    }

    const sessionProps = session.customProperties as any;

    // 2. Get customer info
    const customerName = sessionProps.customerName || "Unknown Customer";
    const customerEmail = sessionProps.customerEmail || "No email provided";
    const customerPhone = sessionProps.customerPhone || "No phone provided";
    const companyName = sessionProps.companyName || undefined;
    const transactionType = sessionProps.transactionType || "B2C";

    // 3. Get purchased products
    const selectedProducts = sessionProps.selectedProducts as Array<{
      productId: string;
      quantity: number;
      pricePerUnit: number;
    }> || [];

    // 4. Get organization for domain config
    const organizationId = session.organizationId;
    const organization = await ctx.runQuery(internal.checkoutSessions.getOrganizationInternal, {
      organizationId,
    });

    if (!organization) {
      console.error("❌ Organization not found");
      return { success: false, error: "Organization not found" };
    }

    // Get domain config (use default if not found)
    const domainConfigs = await ctx.runQuery(internal.domainConfigOntology.listDomainConfigsForOrg, {
      organizationId,
    });
    const domainConfig = domainConfigs?.[0];

    if (!domainConfig) {
      console.error("❌ No domain configuration found");
      return { success: false, error: "No domain configuration found" };
    }

    // 5. Format currency amounts
    const subtotal = sessionProps.subtotal || 0;
    const taxAmount = sessionProps.taxAmount || 0;
    const totalAmount = sessionProps.totalAmount || 0;
    const currency = sessionProps.currency || "EUR";

    const formatCurrency = (amountInCents: number) => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amountInCents / 100);
    };

    // 6. Build products list HTML
    const productsListHtml = selectedProducts.map(sp => {
      const price = formatCurrency(sp.pricePerUnit);
      const total = formatCurrency(sp.pricePerUnit * sp.quantity);
      return `<tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${sp.quantity}x Product</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${price}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${total}</td>
      </tr>`;
    }).join('');

    // 7. Generate email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
        🎉 New Order Received!
      </h1>
      <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
        ${new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">

      <!-- Customer Information -->
      <div style="margin-bottom: 32px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #6366f1;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">
          Customer Information
        </h2>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #6b7280; width: 120px;">Name:</td>
            <td style="padding: 6px 0; color: #111827;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Email:</td>
            <td style="padding: 6px 0;"><a href="mailto:${customerEmail}" style="color: #6366f1; text-decoration: none;">${customerEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Phone:</td>
            <td style="padding: 6px 0; color: #111827;">${customerPhone}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Type:</td>
            <td style="padding: 6px 0; color: #111827;">${transactionType}${companyName ? ` - ${companyName}` : ''}</td>
          </tr>
        </table>
      </div>

      <!-- Order Details -->
      <div style="margin-bottom: 32px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">
          Order Details
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Item</th>
              <th style="padding: 12px; text-align: right; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Price</th>
              <th style="padding: 12px; text-align: right; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${productsListHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 12px; text-align: right; font-weight: 600; color: #6b7280;">Subtotal:</td>
              <td style="padding: 12px; text-align: right; font-weight: 600;">${formatCurrency(subtotal)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 12px; text-align: right; font-weight: 600; color: #6b7280;">Tax:</td>
              <td style="padding: 12px; text-align: right; font-weight: 600;">${formatCurrency(taxAmount)}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td colspan="2" style="padding: 12px; text-align: right; font-weight: 700; color: #111827; font-size: 16px;">Total:</td>
              <td style="padding: 12px; text-align: right; font-weight: 700; color: #111827; font-size: 16px;">${formatCurrency(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://app.l4yercak3.com/orders"
           style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 14px;">
          View in Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 24px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 12px;">
        This is an automated sales notification from ${organization.name || 'l4yercak3'}
      </p>
    </div>
  </div>
</body>
</html>`;

    // 8. Send email
    try {
      const emailSubject = `🎉 New Order: ${customerName} - ${formatCurrency(totalAmount)}`;

      const result = await ctx.runAction(internal.emailDelivery.sendEmail, {
        domainConfigId: domainConfig._id,
        to: args.recipientEmail,
        subject: emailSubject,
        html: emailHtml,
      });

      // 9. Log communication for debugging/compliance
      await ctx.runMutation(internal.communicationTracking.logEmailCommunication, {
        organizationId,
        recipientEmail: args.recipientEmail,
        subject: emailSubject,
        emailType: "sales_notification",
        success: result.success,
        messageId: result.messageId,
        errorMessage: result.error,
        metadata: {
          checkoutSessionId: args.checkoutSessionId,
          totalAmount,
          currency,
          customerName,
        },
      });

      console.log("✅ [sendSalesNotificationEmail] Sales notification sent successfully");
      return result;
    } catch (error) {
      console.error("❌ [sendSalesNotificationEmail] Failed to send:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
