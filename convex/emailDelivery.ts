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
