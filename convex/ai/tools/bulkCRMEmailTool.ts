/**
 * Bulk CRM Email Tool
 *
 * Send personalized emails to multiple CRM contacts or organizations
 * Uses AI for email personalization based on CRM context
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// TOOL DEFINITION
// ============================================================================

export const bulkCRMEmailToolDefinition = {
  type: "function" as const,
  function: {
    name: "send_bulk_crm_email",
    description: "Send personalized emails to multiple CRM contacts or organizations",
    parameters: {
      type: "object" as const,
      properties: {
        target: {
          type: "object",
          description: "Who to email",
          properties: {
            type: {
              type: "string",
              enum: ["contacts", "organizations", "pipeline", "tag", "custom_query"],
              description: "Type of recipients"
            },
            contactIds: {
              type: "array",
              items: { type: "string" },
              description: "Specific CRM contact IDs (for type='contacts')"
            },
            organizationIds: {
              type: "array",
              items: { type: "string" },
              description: "Specific CRM organization IDs (for type='organizations')"
            },
            pipeline: {
              type: "string",
              description: "Pipeline name (for type='pipeline')"
            },
            pipelineStage: {
              type: "string",
              description: "Specific stage in pipeline (optional)"
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "CRM tags to filter by (for type='tag')"
            }
          },
          required: ["type"]
        },
        content: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" },
            template: {
              type: "string",
              description: "Use existing email template"
            },
            aiTone: {
              type: "string",
              enum: ["professional", "friendly", "urgent", "casual"],
              description: "AI adjusts tone for each recipient"
            },
            personalization: {
              type: "object",
              description: "Merge fields like {{firstName}}, {{companyName}}, etc."
            }
          }
        },
        options: {
          type: "object",
          properties: {
            requireApproval: {
              type: "boolean",
              description: "Show preview before sending (default: true)"
            },
            sendVia: {
              type: "string",
              enum: ["microsoft", "smtp"],
              description: "Email delivery method"
            },
            batchSize: {
              type: "number",
              description: "Send in batches (avoid rate limits)"
            },
            trackOpens: { type: "boolean" },
            trackClicks: { type: "boolean" }
          }
        }
      },
      required: ["target", "content"]
    }
  }
};

// ============================================================================
// TYPES
// ============================================================================

interface EmailRecipient {
  contactId: string;
  name: string;
  email: string;
  companyName?: string;
  jobTitle?: string;
  customProperties?: Record<string, any>;
}

interface PersonalizedEmail {
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: "pending" | "approved" | "sent" | "failed";
  error?: string;
}

// ============================================================================
// MAIN TOOL HANDLER
// ============================================================================

export const executeSendBulkCRMEmail = action({
  args: {
    sessionId: v.string(),
    target: v.object({
      type: v.string(),
      contactIds: v.optional(v.array(v.string())),
      organizationIds: v.optional(v.array(v.string())),
      pipeline: v.optional(v.string()),
      pipelineStage: v.optional(v.string()),
      tags: v.optional(v.array(v.string()))
    }),
    content: v.object({
      subject: v.optional(v.string()),
      body: v.optional(v.string()),
      template: v.optional(v.string()),
      aiTone: v.optional(v.string()),
      personalization: v.optional(v.any())
    }),
    options: v.optional(v.object({
      requireApproval: v.optional(v.boolean()),
      sendVia: v.optional(v.string()),
      batchSize: v.optional(v.number()),
      trackOpens: v.optional(v.boolean()),
      trackClicks: v.optional(v.boolean())
    })),
    mode: v.optional(v.string()) // "preview" or "execute"
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    mode?: string;
    campaignId?: string;
    totalRecipients: number;
    emails?: PersonalizedEmail[];
    message?: string;
    error?: string;
    instructions?: string[];
    requiredScopes?: string[];
    currentScopes?: string[];
    actionButton?: {
      label: string;
      action: string;
      variant: string;
    };
    results?: {
      sent: number;
      failed: number;
      errors: Array<{ recipient: string; error: string }>;
    };
  }> => {
    // Get user session and organization
    const session = await ctx.runQuery(internal.stripeConnect.validateSession, {
      sessionId: args.sessionId
    });

    if (!session || !session.organizationId) {
      throw new Error("User must belong to an organization");
    }

    const organizationId = session.organizationId;

    // CRITICAL: Validate Microsoft OAuth connection and scopes BEFORE attempting to send
    const sendVia = args.options?.sendVia || "microsoft";

    if (sendVia === "microsoft") {
      // Check if user has connected their Microsoft account
      const connection = await ctx.runQuery(api.oauth.microsoft.getUserMicrosoftConnection, {
        sessionId: args.sessionId
      });

      if (!connection) {
        return {
          success: false,
          error: "NO_OAUTH_CONNECTION",
          message: "❌ No Microsoft account connected. You need to connect your Microsoft account to send emails.",
          instructions: [
            "1. Click the **Settings** icon (⚙️) in your taskbar",
            "2. Go to **Integrations** tab",
            "3. Click **Connect Microsoft Account**",
            "4. **IMPORTANT**: Grant permission to send emails (scope: Mail.Send)",
            "5. Once connected, come back here and try again"
          ],
          requiredScopes: ["Mail.Send"],
          totalRecipients: 0,
          actionButton: {
            label: "Open Settings → Integrations",
            action: "open_settings_integrations",
            variant: "primary"
          }
        };
      }

      // Verify connection has Mail.Send scope
      if (!connection.scopes.includes("Mail.Send")) {
        return {
          success: false,
          error: "INSUFFICIENT_SCOPES",
          message: "❌ Your Microsoft connection doesn't have permission to send emails.",
          instructions: [
            `Your current permissions: ${connection.scopes.join(", ")}`,
            "",
            "To fix this:",
            "1. Go to **Settings** → **Integrations**",
            "2. Click **Disconnect** next to your Microsoft account",
            "3. Click **Connect Microsoft Account** again",
            "4. **IMPORTANT**: When Microsoft asks for permissions, make sure to check the box for 'Send mail as you'",
            "5. Try sending emails again"
          ],
          currentScopes: connection.scopes,
          requiredScopes: ["Mail.Send"],
          totalRecipients: 0,
          actionButton: {
            label: "Reconnect Microsoft Account",
            action: "open_settings_integrations",
            variant: "warning"
          }
        };
      }
    }

    // Get recipients based on target criteria
    const recipients = await getRecipients(ctx, args.sessionId, organizationId, args.target);

    if (recipients.length === 0) {
      return {
        success: true,
        message: "No recipients found matching the criteria",
        totalRecipients: 0,
        emails: []
      };
    }

    // Generate personalized emails
    const emails: PersonalizedEmail[] = [];

    for (const recipient of recipients) {
      const personalizedEmail = await personalizeEmail(
        ctx,
        recipient,
        args.content,
        args.sessionId
      );
      emails.push(personalizedEmail);
    }

    // CRITICAL: Force preview mode first if not specified
    const mode = args.mode || "preview";

    // If user tries to execute without previewing first, block it
    if (mode === "execute" && args.options?.requireApproval !== false) {
      return {
        success: false,
        error: "PREVIEW_REQUIRED",
        message: "⚠️ For safety, you must preview emails before sending.",
        instructions: [
          "Please run in **preview mode** first to see what will be sent:",
          "",
          "After reviewing the preview, you can approve and send."
        ],
        totalRecipients: 0
      };
    }

    if (mode === "preview") {
      return {
        success: true,
        mode: "preview",
        totalRecipients: recipients.length,
        emails: emails.slice(0, 5), // Show first 5 as sample
        message: `📧 Email preview ready! You're about to send ${recipients.length} personalized emails.`,
        instructions: [
          "Review the preview above carefully:",
          `  • ${recipients.length} recipients will receive this email`,
          `  • Sending via: ${sendVia === "microsoft" ? "Your Microsoft account" : "Organization email"}`,
          "",
          "Sample previews show the first 5 recipients.",
          "",
          "If this looks good, tell me 'approve' or 'send now' to proceed.",
          "If not, tell me 'cancel' or ask me to adjust the content."
        ]
      };
    }

    // Execute mode - actually send emails
    if (mode === "execute") {
      const sendResults = {
        sent: 0,
        failed: 0,
        errors: [] as Array<{ recipient: string; error: string }>
      };

      // Get OAuth connection
      const connection = await ctx.runQuery(api.oauth.microsoft.getUserMicrosoftConnection, {
        sessionId: args.sessionId
      });

      if (!connection) {
        throw new Error("No email account connected. Please connect your Microsoft account first.");
      }

      // Send emails in batches
      const batchSize = args.options?.batchSize || 10;

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);

        await Promise.all(batch.map(async (email) => {
          try {
            await sendEmail(ctx, connection.id, email);
            email.status = "sent";
            sendResults.sent++;
          } catch (error) {
            email.status = "failed";
            email.error = error instanceof Error ? error.message : "Unknown error";
            sendResults.failed++;
            sendResults.errors.push({
              recipient: email.recipientName,
              error: email.error
            });
          }
        }));

        // Add delay between batches to avoid rate limits
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        success: true,
        mode: "execute",
        totalRecipients: recipients.length,
        message: `Sent ${sendResults.sent} emails successfully`,
        results: sendResults,
        emails
      };
    }

    throw new Error(`Invalid mode: ${mode}`);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get recipients based on target criteria
 */
async function getRecipients(
  ctx: any,
  sessionId: string,
  organizationId: Id<"organizations">,
  target: {
    type: string;
    contactIds?: string[];
    organizationIds?: string[];
    pipeline?: string;
    pipelineStage?: string;
    tags?: string[];
  }
): Promise<EmailRecipient[]> {
  const recipients: EmailRecipient[] = [];

  if (target.type === "contacts" && target.contactIds) {
    // Specific contacts
    for (const contactId of target.contactIds) {
      const contact = await ctx.runQuery(api.crmOntology.getContact, {
        sessionId,
        contactId: contactId as Id<"objects">
      });

      if (contact && contact.customProperties?.email) {
        recipients.push({
          contactId: contact._id,
          name: contact.name,
          email: contact.customProperties.email,
          companyName: contact.customProperties.company,
          jobTitle: contact.customProperties.jobTitle,
          customProperties: contact.customProperties
        });
      }
    }
  } else if (target.type === "organizations" && target.organizationIds) {
    // Organization primary contacts
    for (const orgId of target.organizationIds) {
      const contacts = await ctx.runQuery(api.crmOntology.getOrganizationContacts, {
        sessionId,
        crmOrganizationId: orgId as Id<"objects">
      });

      // Find primary contact
      const primaryContact = contacts.find((c: any) => c.relationship?.isPrimaryContact);
      const contact = primaryContact || contacts[0];

      if (contact && contact.customProperties?.email) {
        recipients.push({
          contactId: contact._id,
          name: contact.name,
          email: contact.customProperties.email,
          companyName: contact.customProperties.company,
          jobTitle: contact.customProperties.jobTitle,
          customProperties: contact.customProperties
        });
      }
    }
  } else if (target.type === "tag" && target.tags) {
    // Contacts with specific tags
    const allContacts = await ctx.runQuery(api.crmOntology.getContacts, {
      sessionId,
      organizationId
    });

    for (const contact of allContacts) {
      const contactTags = contact.customProperties?.tags || [];
      const hasTag = target.tags.some(tag => contactTags.includes(tag));

      if (hasTag && contact.customProperties?.email) {
        recipients.push({
          contactId: contact._id,
          name: contact.name,
          email: contact.customProperties.email,
          companyName: contact.customProperties.company,
          jobTitle: contact.customProperties.jobTitle,
          customProperties: contact.customProperties
        });
      }
    }
  } else {
    // Default: get all active contacts
    const allContacts = await ctx.runQuery(api.crmOntology.getContacts, {
      sessionId,
      organizationId,
      status: "active"
    });

    for (const contact of allContacts) {
      if (contact.customProperties?.email) {
        recipients.push({
          contactId: contact._id,
          name: contact.name,
          email: contact.customProperties.email,
          companyName: contact.customProperties.company,
          jobTitle: contact.customProperties.jobTitle,
          customProperties: contact.customProperties
        });
      }
    }
  }

  return recipients;
}

/**
 * Personalize email for a recipient using merge fields
 */
async function personalizeEmail(
  ctx: any,
  recipient: EmailRecipient,
  content: {
    subject?: string;
    body?: string;
    template?: string;
    aiTone?: string;
    personalization?: any;
  },
  sessionId: string
): Promise<PersonalizedEmail> {
  const firstName = recipient.customProperties?.firstName || recipient.name.split(" ")[0];
  const lastName = recipient.customProperties?.lastName || recipient.name.split(" ").slice(1).join(" ");

  // Simple merge field replacement
  const mergeFields: Record<string, string> = {
    "{{firstName}}": firstName,
    "{{lastName}}": lastName,
    "{{fullName}}": recipient.name,
    "{{email}}": recipient.email,
    "{{companyName}}": recipient.companyName || "",
    "{{jobTitle}}": recipient.jobTitle || "",
    ...content.personalization
  };

  let subject = content.subject || "Hello {{firstName}}";
  let body = content.body || "Dear {{firstName}},\n\nThis is a personalized email.";

  // Replace merge fields
  Object.entries(mergeFields).forEach(([field, value]) => {
    subject = subject.replace(new RegExp(field, "g"), value);
    body = body.replace(new RegExp(field, "g"), value);
  });

  return {
    recipientId: recipient.contactId,
    recipientName: recipient.name,
    recipientEmail: recipient.email,
    subject,
    body,
    status: "pending"
  };
}

/**
 * Send email via Microsoft Graph
 */
async function sendEmail(
  ctx: any,
  connectionId: Id<"oauthConnections">,
  email: PersonalizedEmail
): Promise<void> {
  const message = {
    message: {
      subject: email.subject,
      body: {
        contentType: "Text",
        content: email.body
      },
      toRecipients: [
        {
          emailAddress: {
            address: email.recipientEmail,
            name: email.recipientName
          }
        }
      ]
    }
  };

  await ctx.runAction(internal.oauth.graphClient.graphRequest, {
    connectionId,
    endpoint: "/me/sendMail",
    method: "POST",
    body: message
  });
}

// Campaign tracking functions moved to convex/ai/campaigns.ts
