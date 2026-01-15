/**
 * AI Tool Registry
 *
 * Central registry of all AI tools in OpenAI function calling format
 *
 * Tool Status:
 * - "ready": Fully implemented and ready to use
 * - "placeholder": Not yet implemented, AI will provide tutorial guidance
 * - "beta": Implemented but may have bugs or limitations
 */

import { bulkCRMEmailToolDefinition } from "./bulkCRMEmailTool";
import { contactSyncToolDefinition } from "./contactSyncTool";
import { formsToolDefinition } from "./formsTool";
import { projectsToolDefinition } from "./projectsTool";
import { crmToolDefinition } from "./crmTool";
import { webinarToolDefinition } from "./webinarTool";
import { benefitsToolDefinition } from "./benefitsTool";
import { bookingToolDefinition } from "./bookingTool";
import { activeCampaignToolDefinition } from "./activeCampaignTool";
import { activityProtocolToolDefinition } from "./activityProtocolTool";
import { sequencesToolDefinition } from "./sequencesTool";
import { api } from "../../_generated/api";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

/**
 * Tool status types
 */
export type ToolStatus = "ready" | "placeholder" | "beta";

/**
 * Extended context for AI tool execution
 */
export interface ToolExecutionContext extends ActionCtx {
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  conversationId?: Id<"aiConversations">;
  sessionId?: string;
}

/**
 * Tool definition interface
 */
export interface AITool {
  name: string;
  description: string;
  status: ToolStatus;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  permissions?: string[];
  tutorialSteps?: string[]; // For placeholder tools
  windowName?: string; // Which window to open for this feature
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (ctx: ToolExecutionContext, args: any) => Promise<unknown>;
}

/**
 * 0. META TOOLS (System-level tools for the AI assistant)
 */

const requestFeatureTool: AITool = {
  name: "request_feature",
  description: "Send a feature request to the dev team. ONLY call this AFTER the user has explicitly confirmed they want to send a feature request (e.g., user says 'yes' or 'sure' or 'please do').",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      featureDescription: { type: "string", description: "What the user is trying to do" },
      userMessage: { type: "string", description: "The ORIGINAL message the user sent when they first requested this feature" },
      userElaboration: { type: "string", description: "The user's detailed explanation of what they need (from asking them to elaborate)" },
      suggestedToolName: { type: "string", description: "What you think the tool should be called (e.g., 'create_reminder', 'schedule_meeting')" },
      category: { type: "string", description: "Category this feature belongs to (e.g., 'reminders', 'scheduling', 'automation')" }
    },
    required: ["featureDescription", "userMessage", "userElaboration"]
  },
  execute: async (ctx, args) => {
    // Send feature request email immediately (fire and forget)
    ctx.runAction(internal.ai.featureRequestEmail.sendFeatureRequest, {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      toolName: (args.suggestedToolName as string) || "unknown_feature",
      toolParameters: {
        featureDescription: args.featureDescription,
        category: args.category || "general",
        userElaboration: args.userElaboration, // Include user's detailed explanation
      },
      errorMessage: `Feature requested by user: ${args.featureDescription}`,
      conversationId: ctx.conversationId!, // Will be set when called from chat
      userMessage: args.userMessage as string, // Original request
      aiResponse: undefined,
      occurredAt: Date.now(),
    }).catch((err: unknown) => {
      // Don't fail if email fails
      console.error("[request_feature] Email failed:", err);
    });

    return {
      success: true,
      message: `✅ Feature request logged! I've notified the team about: "${args.featureDescription}"`,
      details: {
        feature: args.featureDescription,
        suggestedToolName: args.suggestedToolName || "Not specified",
        status: "Team has been notified and will prioritize based on user demand"
      }
    };
  }
};

/**
 * 0. OAUTH CONNECTION CHECK TOOL
 */

const checkOAuthConnectionTool: AITool = {
  name: "check_oauth_connection",
  description: "Check if user has connected their Microsoft/Google OAuth account. CRITICAL: Always call this tool FIRST before suggesting OAuth-related actions like syncing contacts or sending emails. Returns connection status, available scopes, and connected email.",
  status: "ready",
  parameters: {
    type: "object" as const,
    properties: {
      provider: {
        type: "string",
        enum: ["microsoft", "google"],
        description: "OAuth provider to check"
      }
    },
    required: ["provider"]
  },
  execute: async (ctx, args) => {
    const provider = args.provider || "microsoft";

    // Only support Microsoft for now
    if (provider !== "microsoft") {
      return {
        success: false,
        error: "UNSUPPORTED_PROVIDER",
        message: `Provider ${provider} not yet supported. Only Microsoft is available.`,
        isConnected: false
      };
    }

    // Check if user has connected their Microsoft account
    // @ts-ignore - Deep type instantiation in Convex generated types
    const connection = await ctx.runQuery(api.oauth.microsoft.getUserMicrosoftConnection, {
      sessionId: ctx.sessionId
    });

    if (!connection) {
      return {
        success: true,
        isConnected: false,
        provider: "microsoft",
        message: "❌ No Microsoft account connected",
        requiresConnection: true,
        instructions: [
          "To connect your Microsoft account:",
          "1. Open **Settings** (⚙️ icon in taskbar)",
          "2. Go to **Integrations** tab",
          "3. Click **Connect Microsoft Account**",
          "4. Select which permissions you need",
          "5. Grant access in Microsoft's authorization page"
        ],
        actionButton: {
          label: "Open Settings → Integrations",
          action: "open_settings_integrations",
          variant: "primary"
        }
      };
    }

    // User is connected!
    return {
      success: true,
      isConnected: true,
      provider: "microsoft",
      connectedEmail: connection.providerEmail,
      status: connection.status,
      scopes: connection.scopes,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      message: `✅ Microsoft account connected: ${connection.providerEmail}`,
      availableFeatures: {
        canSyncContacts: connection.scopes.some((s: string) =>
          s === "Contacts.Read" || s === "Contacts.ReadWrite"
        ),
        canSendEmail: connection.scopes.some((s: string) =>
          s === "Mail.Send"
        ),
        canReadEmail: connection.scopes.some((s: string) =>
          s === "Mail.Read" || s === "Mail.ReadWrite"
        ),
        canAccessCalendar: connection.scopes.some((s: string) =>
          s === "Calendars.Read" || s === "Calendars.ReadWrite"
        )
      }
    };
  }
};

/**
 * 1. CRM TOOLS
 */

const manageCRMTool: AITool = {
  name: "manage_crm",
  description: "Universal CRM management tool: search/create companies (organizations), search/create contacts (people), link contacts to companies. CRITICAL: ALWAYS search before creating to avoid duplicates. This is the foundation for ALL business relationships - use it before creating projects, sending invoices, managing events, etc.",
  status: "ready",
  parameters: crmToolDefinition.function.parameters,
  execute: async (ctx, args) => {
    const result = await ctx.runAction(api.ai.tools.crmTool.executeManageCRM, {
      sessionId: ctx.sessionId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      conversationId: ctx.conversationId, // Pass conversationId for work items
      action: args.action,
      mode: args.mode,
      workItemId: args.workItemId,
      // Organization fields
      organizationId_crm: args.organizationId,
      organizationName: args.organizationName,
      organizationType: args.organizationType,
      website: args.website,
      industry: args.industry,
      companySize: args.companySize,
      address: args.address,
      taxId: args.taxId,
      // Contact fields
      contactId: args.contactId,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      jobTitle: args.jobTitle,
      contactType: args.contactType,
      notes: args.notes,
      tags: args.tags,
      // Search
      searchQuery: args.searchQuery,
      filterType: args.filterType,
      limit: args.limit,
    });

    return result;
  }
};

const syncContactsTool: AITool = {
  name: "sync_contacts",
  description: "Sync contacts from Microsoft/Google to CRM. AI intelligently matches, merges, and creates contacts. IMPORTANT: Always use mode='preview' first to show user what will be synced. Only use mode='execute' after user explicitly approves the preview.",
  status: "ready",
  parameters: contactSyncToolDefinition.function.parameters,
  execute: async (ctx, args) => {
    // CRITICAL: Validate Microsoft OAuth connection and scopes BEFORE attempting sync
    const provider = args.provider || "microsoft";

    // Check if user has connected their Microsoft account
    const connection = await ctx.runQuery(api.oauth.microsoft.getUserMicrosoftConnection, {
      sessionId: ctx.sessionId
    });

    if (!connection) {
      return {
        success: false,
        error: "NO_OAUTH_CONNECTION",
        message: `❌ No ${provider} account connected. You need to connect your ${provider} account first.`,
        instructions: [
          `1. Click the **Settings** icon (⚙️) in your taskbar`,
          `2. Go to **Integrations** tab`,
          `3. Click **Connect ${provider} Account**`,
          `4. Grant permission to read contacts (scope: Contacts.Read or Contacts.ReadWrite)`,
          `5. Once connected, come back here and try again`
        ],
        requiredScopes: ["Contacts.Read", "Contacts.ReadWrite"],
        helpUrl: "https://docs.l4yercak3.com/integrations/microsoft-contacts",
        actionButton: {
          label: "Open Settings → Integrations",
          action: "open_settings_integrations",
          variant: "primary"
        }
      };
    }

    // Verify connection has required scopes for contact sync
    const requiredScopes = ["Contacts.Read", "Contacts.ReadWrite"];
    const hasContactScope = connection.scopes.some((scope: string) =>
      requiredScopes.includes(scope)
    );

    if (!hasContactScope) {
      return {
        success: false,
        error: "INSUFFICIENT_SCOPES",
        message: `❌ Your ${provider} connection doesn't have permission to read contacts.`,
        instructions: [
          `Your current permissions: ${connection.scopes.join(", ")}`,
          ``,
          `To fix this:`,
          `1. Go to **Settings** → **Integrations**`,
          `2. Click **Disconnect** next to your ${provider} account`,
          `3. Click **Connect ${provider} Account** again`,
          `4. **IMPORTANT**: When Microsoft asks for permissions, make sure to check the box for "Read your contacts" or "Manage your contacts"`,
          `5. Try syncing again`
        ],
        currentScopes: connection.scopes,
        requiredScopes,
        helpUrl: "https://docs.l4yercak3.com/integrations/microsoft-contacts#scopes",
        actionButton: {
          label: "Reconnect Microsoft Account",
          action: "open_settings_integrations",
          variant: "warning"
        }
      };
    }

    // CRITICAL: Force preview mode first if not specified
    const mode = args.mode || "preview";

    if (mode === "execute") {
      // Warn: User must have seen preview first
      return {
        success: false,
        error: "PREVIEW_REQUIRED",
        message: "⚠️ For safety, you must preview contacts before syncing.",
        instructions: [
          `Please run the sync in **preview mode** first:`,
          ``,
          `Use: mode="preview" to see what contacts will be synced`,
          ``,
          `After reviewing the preview, you can approve the sync.`
        ]
      };
    }

    // Execute the actual contact sync via the implementation
    const result = await ctx.runAction(api.ai.tools.contactSyncTool.executeSyncContacts, {
      sessionId: ctx.sessionId,
      provider,
      mode,
      filters: args.filters,
      targetOrganization: args.targetOrganization
    });

    // Enhance preview results with approval instructions
    if (mode === "preview" && result.success) {
      return {
        ...result,
        message: `📋 Preview complete! Found ${result.totalContacts} contacts from ${provider}.`,
        nextSteps: [
          `Review the preview above carefully:`,
          `  • ${result.stats.toCreate} new contacts will be created`,
          `  • ${result.stats.toUpdate} existing contacts will be updated`,
          `  • ${result.stats.toSkip} contacts will be skipped (duplicates or invalid)`,
          ``,
          `If this looks good, tell me "approve" or "sync now" to proceed.`,
          `If not, tell me "cancel" or ask me to adjust the filters.`
        ],
        syncId: result.syncId // Store for execute mode
      };
    }

    return result;
  }
};

const sendBulkCRMEmailTool: AITool = {
  name: "send_bulk_crm_email",
  description: "Send personalized emails to multiple CRM contacts or organizations. IMPORTANT: Always use mode='preview' first to show user what emails will be sent. Only use mode='execute' after user explicitly approves the preview.",
  status: "ready",
  parameters: bulkCRMEmailToolDefinition.function.parameters,
  execute: async (ctx, args) => {
    // CRITICAL: Validate prerequisites before sending
    // The bulk email tool will handle OAuth connection and scope checking internally

    // Execute the actual bulk email via the implementation
    const result = await ctx.runAction(api.ai.tools.bulkCRMEmailTool.executeSendBulkCRMEmail, {
      sessionId: ctx.sessionId!, // Required by tool
      target: args.target,
      content: args.content,
      options: args.options,
      mode: args.mode || "preview" // Default to preview
    });

    // If error (missing OAuth or scopes), return instructions
    if (!result.success && result.error) {
      return result; // Already has instructions
    }

    // If preview mode, enhance with approval instructions
    if (result.mode === "preview") {
      return {
        ...result,
        message: result.message || `📧 Email preview ready! Found ${result.totalRecipients} recipients.`,
        nextSteps: result.instructions || [
          "Review the email previews above carefully.",
          "If this looks good, tell me 'approve' or 'send now' to proceed.",
          "If not, tell me 'cancel' or ask me to adjust the content."
        ]
      };
    }

    // Execute mode - return results
    return result;
  }
};

const createContactTool: AITool = {
  name: "create_contact",
  description: "Create a new contact in your CRM with name, email, phone, and other details",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      firstName: { type: "string", description: "First name" },
      lastName: { type: "string", description: "Last name" },
      email: { type: "string", description: "Email address" },
      phone: { type: "string", description: "Phone number" },
      company: { type: "string", description: "Company name" },
      jobTitle: { type: "string", description: "Job title" },
      tags: { type: "array", items: { type: "string" }, description: "Tags for organization" }
    },
    required: ["firstName", "lastName", "email"]
  },
  execute: async (ctx, args) => {
    // Call internal mutation (bypasses session auth since we're in authenticated action)
    const contactId = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalCreateContact, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      subtype: "customer", // Default to customer
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      jobTitle: args.jobTitle,
      company: args.company,
      tags: args.tags,
    });

    return {
      success: true,
      message: `✅ Created contact: ${args.firstName} ${args.lastName}`,
      contactId,
      details: {
        name: `${args.firstName} ${args.lastName}`,
        email: args.email,
        company: args.company || "No company",
      }
    };
  }
};

const searchContactsTool: AITool = {
  name: "search_contacts",
  description: "Search for contacts by name, email, or company",
  status: "ready",
  windowName: "CRM",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query (name, email, or company)" },
      limit: { type: "number", description: "Maximum results", default: 10 }
    },
    required: ["query"]
  },
  execute: async (ctx, args) => {
    const contacts = await ctx.runQuery(internal.ai.tools.internalToolMutations.internalSearchContacts, {
      organizationId: ctx.organizationId,
      searchQuery: args.query,
      limit: args.limit || 10,
    });

    if (contacts.length === 0) {
      return {
        success: true,
        message: `No contacts found matching "${args.query}"`,
        contacts: [],
        count: 0,
      };
    }

    return {
      success: true,
      message: `Found ${contacts.length} contact(s) matching "${args.query}"`,
      contacts: contacts.map((c: { _id: string; name: string; customProperties?: { email?: string; phone?: string; company?: string; tags?: string[] } }) => ({
        id: c._id,
        name: c.name,
        email: c.customProperties?.email,
        phone: c.customProperties?.phone,
        company: c.customProperties?.company,
        tags: c.customProperties?.tags || [],
      })),
      count: contacts.length,
    };
  }
};

const updateContactTool: AITool = {
  name: "update_contact",
  description: "Update an existing contact's information",
  status: "ready",
  windowName: "CRM",
  parameters: {
    type: "object",
    properties: {
      contactId: { type: "string", description: "Contact ID to update" },
      firstName: { type: "string", description: "First name" },
      lastName: { type: "string", description: "Last name" },
      email: { type: "string", description: "Email address" },
      phone: { type: "string", description: "Phone number" },
      company: { type: "string", description: "Company name" },
      jobTitle: { type: "string", description: "Job title" },
      notes: { type: "string", description: "Notes about the contact" }
    },
    required: ["contactId"]
  },
  execute: async (ctx, args) => {
    const updateArgs: {
      organizationId: Id<"organizations">;
      userId: Id<"users">;
      contactId: Id<"objects">;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      company?: string;
      jobTitle?: string;
      notes?: string;
    } = {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      contactId: args.contactId as Id<"objects">,
    };

    if (args.firstName) updateArgs.firstName = args.firstName;
    if (args.lastName) updateArgs.lastName = args.lastName;
    if (args.email) updateArgs.email = args.email;
    if (args.phone) updateArgs.phone = args.phone;
    if (args.company) updateArgs.company = args.company;
    if (args.jobTitle) updateArgs.jobTitle = args.jobTitle;
    if (args.notes) updateArgs.notes = args.notes;

    await ctx.runMutation(internal.ai.tools.internalToolMutations.internalUpdateContact, updateArgs);

    return {
      success: true,
      message: "Contact updated successfully",
      contactId: args.contactId,
      updatedFields: Object.keys(args).filter(k => k !== "contactId"),
    };
  }
};

const tagContactsTool: AITool = {
  name: "tag_contacts",
  description: "Add tags to one or more contacts for organization",
  status: "ready",
  windowName: "CRM",
  parameters: {
    type: "object",
    properties: {
      contactIds: { type: "array", items: { type: "string" }, description: "Contact IDs" },
      tags: { type: "array", items: { type: "string" }, description: "Tags to add" }
    },
    required: ["contactIds", "tags"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalTagContacts, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      contactIds: args.contactIds.map((id: string) => id as Id<"objects">),
      tags: args.tags,
    });

    return {
      success: true,
      message: `Added tags [${args.tags.join(", ")}] to ${result.success} contact(s)`,
      total: result.total,
      successCount: result.success,
      failedCount: result.failed,
    };
  }
};

/**
 * 2. EVENTS TOOLS
 */

const createEventTool: AITool = {
  name: "create_event",
  description: `Create a new event with dates, location, agenda, and optional ticket types. Supports: conference, workshop, concert, meetup, seminar, webinar, training, networking, exhibition, other.

CRITICAL: Before creating a new event:
1. ALWAYS use list_events first to check if a similar event already exists
2. If an event with a similar name or date exists, use update_event instead of create_event
3. Only create a new event if you're certain no matching event exists

IMPORTANT: Before calling this tool, have a conversation with the user to gather:
1. Event basics: name, date/time (start AND end), location (physical or virtual)
2. Event type and expected duration
3. Agenda/schedule: sessions, speakers, breaks (optional but recommended for conferences/workshops)
4. Ticket types needed: free, paid tiers, early bird, VIP (optional)
5. Capacity limits (optional)

Example agenda array:
[
  { "time": "9:00 AM", "title": "Registration & Coffee", "duration": "30 min" },
  { "time": "9:30 AM", "title": "Keynote: Future of AI", "speaker": "Jane Smith", "duration": "1 hour" },
  { "time": "10:30 AM", "title": "Break", "duration": "15 min" },
  { "time": "10:45 AM", "title": "Workshop: Hands-on ML", "speaker": "John Doe", "duration": "2 hours" }
]

Example ticketTypes array:
[
  { "name": "Early Bird", "price": 49, "description": "Limited early access pricing", "capacity": 50 },
  { "name": "General Admission", "price": 99, "description": "Standard ticket" },
  { "name": "VIP", "price": 199, "description": "Front row + speaker dinner", "capacity": 20 }
]`,
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Event title/name" },
      description: { type: "string", description: "Event description shown to attendees" },
      startDate: { type: "string", description: "Start date and time (ISO 8601, e.g., '2024-03-15T09:00:00')" },
      endDate: { type: "string", description: "End date and time (optional). If not provided, auto-calculated based on event type." },
      location: { type: "string", description: "Event location - physical address or 'Virtual' / 'Online' for webinars" },
      eventType: {
        type: "string",
        enum: ["conference", "workshop", "concert", "meetup", "seminar", "webinar", "training", "networking", "exhibition", "other"],
        description: "Type of event - affects default duration and display",
        default: "meetup"
      },
      capacity: { type: "number", description: "Maximum total attendees (optional, leave empty for unlimited)" },
      timezone: {
        type: "string",
        description: "Timezone (e.g., 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'UTC')",
        default: "America/Los_Angeles"
      },
      agenda: {
        type: "array",
        description: "Event schedule/agenda with sessions. Each item has time, title, optional speaker, and duration.",
        items: {
          type: "object",
          properties: {
            time: { type: "string", description: "Start time (e.g., '9:00 AM', '14:30')" },
            title: { type: "string", description: "Session title" },
            description: { type: "string", description: "Session description (optional)" },
            speaker: { type: "string", description: "Speaker name (optional)" },
            duration: { type: "string", description: "Duration (e.g., '30 min', '1 hour', '2 hours')" },
            type: { type: "string", enum: ["session", "keynote", "workshop", "break", "networking", "meal", "other"], description: "Session type" }
          },
          required: ["time", "title"]
        }
      },
      ticketTypes: {
        type: "array",
        description: "Ticket tiers/types for the event. Leave empty for free events.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Ticket type name (e.g., 'General Admission', 'VIP', 'Early Bird')" },
            price: { type: "number", description: "Price in cents (e.g., 4999 for $49.99). Use 0 for free tickets." },
            description: { type: "string", description: "What's included with this ticket" },
            capacity: { type: "number", description: "Max tickets of this type (optional)" },
            salesStart: { type: "string", description: "When tickets go on sale (ISO 8601, optional)" },
            salesEnd: { type: "string", description: "When ticket sales end (ISO 8601, optional)" }
          },
          required: ["name", "price"]
        }
      },
      virtualEventUrl: { type: "string", description: "URL for virtual/online events (Zoom, Teams, etc.)" },
      registrationRequired: { type: "boolean", description: "Whether registration is required (default: true)", default: true },
      published: { type: "boolean", description: "Publish immediately (true) or keep as draft (false)", default: false }
    },
    required: ["title", "startDate", "location"]
  },
  execute: async (ctx, args) => {
    // CHECK FOR DUPLICATES: Look for existing events with similar names
    const existingEvents = await ctx.runQuery(internal.ai.tools.internalToolMutations.internalListEvents, {
      organizationId: ctx.organizationId,
      upcoming: false, // Check all events, not just upcoming
      limit: 100,
    });

    const normalizedTitle = args.title.toLowerCase().trim();
    const duplicateEvent = existingEvents.find((e: { name: string; _id: string }) =>
      e.name.toLowerCase().trim() === normalizedTitle
    );

    if (duplicateEvent) {
      return {
        success: false,
        requiresUserDecision: true,
        duplicateFound: true,
        error: `An event named "${args.title}" already exists`,
        existingEventId: duplicateEvent._id,
        existingEventName: duplicateEvent.name,
        userPrompt: `I found an existing event called "${duplicateEvent.name}". What would you like me to do?\n\n1. **Update the existing event** - I'll modify the event that's already there\n2. **Create with a different name** - Tell me what to call the new event\n3. **Replace it** - Delete the old one and create fresh`,
        hint: "IMPORTANT: Ask the user which option they prefer. Present the options from userPrompt. Do NOT automatically choose - let the user decide.",
        existingEvents: existingEvents.slice(0, 5).map((e: { _id: string; name: string; status: string; startDate?: number }) => ({
          id: e._id,
          name: e.name,
          status: e.status,
          startDate: e.startDate ? new Date(e.startDate).toISOString() : null
        }))
      };
    }

    // Convert ISO dates to timestamps
    const startTimestamp = new Date(args.startDate).getTime();

    // Validate start date is valid
    if (isNaN(startTimestamp)) {
      return {
        success: false,
        error: `Invalid start date format: "${args.startDate}". Please use ISO 8601 format (e.g., "2024-03-15T09:00:00").`,
        hint: "Ask the user for the event date and time, then format it correctly."
      };
    }

    // Smart duration defaults based on event type
    const durationDefaults: Record<string, number> = {
      conference: 8 * 60 * 60 * 1000,   // 8 hours
      workshop: 4 * 60 * 60 * 1000,     // 4 hours
      concert: 3 * 60 * 60 * 1000,      // 3 hours
      meetup: 2 * 60 * 60 * 1000,       // 2 hours
      seminar: 90 * 60 * 1000,          // 90 minutes
      webinar: 60 * 60 * 1000,          // 1 hour
      training: 6 * 60 * 60 * 1000,     // 6 hours
      networking: 2 * 60 * 60 * 1000,   // 2 hours
      exhibition: 8 * 60 * 60 * 1000,   // 8 hours
      other: 2 * 60 * 60 * 1000,        // 2 hours
    };

    const eventType = args.eventType || "meetup";
    const defaultDuration = durationDefaults[eventType] || 2 * 60 * 60 * 1000;

    const endTimestamp = args.endDate
      ? new Date(args.endDate).getTime()
      : startTimestamp + defaultDuration;

    // Validate: end must be after start
    if (endTimestamp <= startTimestamp) {
      return {
        success: false,
        error: "Event end time must be after start time.",
        hint: "Check the start and end dates - end date should be later than start date."
      };
    }

    // Validate: minimum duration of 15 minutes
    const durationMs = endTimestamp - startTimestamp;
    if (durationMs < 15 * 60 * 1000) {
      return {
        success: false,
        error: "Event must be at least 15 minutes long.",
        hint: "Either extend the end time or remove it to use the default duration."
      };
    }

    // Process agenda items - add IDs
    const processedAgenda = (args.agenda || []).map((item: {
      time: string;
      title: string;
      description?: string;
      speaker?: string;
      duration?: string;
      type?: string;
    }, index: number) => ({
      id: `agenda_${index + 1}_${Date.now()}`,
      time: item.time,
      title: item.title,
      description: item.description || "",
      speaker: item.speaker || null,
      duration: item.duration || "30 min",
      type: item.type || "session",
    }));

    // Process ticket types - will create products later if needed
    const processedTicketTypes = (args.ticketTypes || []).map((ticket: {
      name: string;
      price: number;
      description?: string;
      capacity?: number;
      salesStart?: string;
      salesEnd?: string;
    }, index: number) => ({
      id: `ticket_${index + 1}_${Date.now()}`,
      name: ticket.name,
      price: ticket.price,
      description: ticket.description || "",
      capacity: ticket.capacity || null,
      salesStart: ticket.salesStart ? new Date(ticket.salesStart).getTime() : null,
      salesEnd: ticket.salesEnd ? new Date(ticket.salesEnd).getTime() : null,
    }));

    const eventId = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalCreateEventWithDetails, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      subtype: eventType,
      name: args.title,
      description: args.description,
      startDate: startTimestamp,
      endDate: endTimestamp,
      location: args.location,
      capacity: args.capacity,
      timezone: args.timezone || "America/Los_Angeles",
      published: args.published === true, // Default to draft (false)
      agenda: processedAgenda,
      ticketTypes: processedTicketTypes,
      virtualEventUrl: args.virtualEventUrl,
      registrationRequired: args.registrationRequired !== false,
    });

    // Format duration for display
    const durationHours = Math.round(durationMs / (60 * 60 * 1000) * 10) / 10;
    const durationDisplay = durationHours < 1
      ? `${Math.round(durationMs / (60 * 1000))} minutes`
      : `${durationHours} hours`;

    return {
      success: true,
      message: `Created event "${args.title}"${processedAgenda.length > 0 ? ` with ${processedAgenda.length} agenda item(s)` : ""}${processedTicketTypes.length > 0 ? ` and ${processedTicketTypes.length} ticket type(s)` : ""}`,
      eventId,
      details: {
        name: args.title,
        type: eventType,
        startDate: new Date(startTimestamp).toLocaleString(),
        endDate: new Date(endTimestamp).toLocaleString(),
        duration: durationDisplay,
        location: args.location,
        capacity: args.capacity || "Unlimited",
        timezone: args.timezone || "America/Los_Angeles",
        status: args.published === true ? "Published" : "Draft",
        agendaItems: processedAgenda.length,
        ticketTypes: processedTicketTypes.length,
        isVirtual: args.location?.toLowerCase().includes("virtual") || args.location?.toLowerCase().includes("online") || !!args.virtualEventUrl,
      },
      nextSteps: [
        args.published !== true ? "Event is in draft mode - publish when ready" : null,
        processedAgenda.length === 0 ? "Consider adding an agenda with sessions and speakers" : null,
        processedTicketTypes.length === 0 ? "Add ticket types if this is a paid event" : null,
        "You can update the event details anytime using the update_event tool",
      ].filter(Boolean)
    };
  }
};

const listEventsTool: AITool = {
  name: "list_events",
  description: `Get a list of all events (upcoming or past).

IMPORTANT: Use this tool BEFORE creating a new event to check if a similar event already exists.
This helps avoid creating duplicate events when the user wants to modify an existing one.`,
  status: "ready",
  windowName: "Events",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Maximum results", default: 20 },
      upcoming: { type: "boolean", description: "Only upcoming events", default: true }
    }
  },
  execute: async (ctx, args) => {
    const events = await ctx.runQuery(internal.ai.tools.internalToolMutations.internalListEvents, {
      organizationId: ctx.organizationId,
      upcoming: args.upcoming !== false,
      limit: args.limit || 20,
    });

    if (events.length === 0) {
      return {
        success: true,
        message: args.upcoming ? "No upcoming events found." : "No events found.",
        events: [],
        count: 0,
      };
    }

    return {
      success: true,
      message: `Found ${events.length} ${args.upcoming ? "upcoming " : ""}event(s)`,
      events: events.map((e: { _id: string; name: string; startDate?: number; endDate?: number; location?: string; status: string; subtype?: string }) => ({
        id: e._id,
        name: e.name,
        startDate: e.startDate ? new Date(e.startDate).toISOString() : null,
        endDate: e.endDate ? new Date(e.endDate).toISOString() : null,
        location: e.location,
        status: e.status,
        type: e.subtype,
      })),
      count: events.length,
    };
  }
};

const updateEventTool: AITool = {
  name: "update_event",
  description: "Update an existing event's details",
  status: "ready",
  windowName: "Events",
  parameters: {
    type: "object",
    properties: {
      eventId: { type: "string", description: "Event ID" },
      name: { type: "string", description: "New event name" },
      description: { type: "string", description: "New description" },
      startDate: { type: "string", description: "New start date (ISO format)" },
      endDate: { type: "string", description: "New end date (ISO format)" },
      location: { type: "string", description: "New location" },
      capacity: { type: "number", description: "New max capacity" },
      status: { type: "string", description: "New status (draft, active, cancelled)" }
    },
    required: ["eventId"]
  },
  execute: async (ctx, args) => {
    const updateArgs: {
      organizationId: Id<"organizations">;
      userId: Id<"users">;
      eventId: Id<"objects">;
      name?: string;
      description?: string;
      startDate?: number;
      endDate?: number;
      location?: string;
      capacity?: number;
      status?: string;
    } = {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      eventId: args.eventId as Id<"objects">,
    };

    if (args.name) updateArgs.name = args.name;
    if (args.description) updateArgs.description = args.description;
    if (args.startDate) updateArgs.startDate = new Date(args.startDate).getTime();
    if (args.endDate) updateArgs.endDate = new Date(args.endDate).getTime();
    if (args.location) updateArgs.location = args.location;
    if (args.capacity) updateArgs.capacity = args.capacity;
    if (args.status) updateArgs.status = args.status;

    await ctx.runMutation(internal.ai.tools.internalToolMutations.internalUpdateEvent, updateArgs);

    return {
      success: true,
      message: `Event updated successfully`,
      eventId: args.eventId,
      updatedFields: Object.keys(args).filter(k => k !== "eventId"),
    };
  }
};

const registerAttendeeTool: AITool = {
  name: "register_attendee",
  description: "Register an attendee for an event",
  status: "ready",
  windowName: "Events",
  parameters: {
    type: "object",
    properties: {
      eventId: { type: "string", description: "Event ID" },
      attendeeEmail: { type: "string", description: "Attendee email" },
      attendeeName: { type: "string", description: "Attendee name" },
      ticketType: { type: "string", description: "Ticket type (general, vip, etc.)" }
    },
    required: ["eventId", "attendeeEmail", "attendeeName"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalRegisterAttendee, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      eventId: args.eventId as Id<"objects">,
      attendeeName: args.attendeeName,
      attendeeEmail: args.attendeeEmail,
      ticketType: args.ticketType,
    });

    return {
      success: result.success,
      message: result.message,
      contactId: result.contactId,
      registrationId: result.linkId,
    };
  }
};

/**
 * 2B. PROJECTS TOOLS
 */

const manageProjectsTool: AITool = {
  name: "manage_projects",
  description: "Comprehensive project management: create projects, add milestones, create/assign tasks, update status, list projects/tasks. Use this for ALL project management operations including creating client projects, tracking tasks, managing milestones, and assigning work to team members.",
  status: "ready",
  parameters: projectsToolDefinition.function.parameters,
  execute: async (ctx, args) => {
    const result = await ctx.runAction(api.ai.tools.projectsTool.executeManageProjects, {
      sessionId: ctx.sessionId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      conversationId: ctx.conversationId, // Pass conversationId for work items
      action: args.action,
      mode: args.mode,
      workItemId: args.workItemId,
      // Project fields
      projectId: args.projectId,
      projectName: args.projectName,
      projectDescription: args.projectDescription,
      projectType: args.projectType,
      startDate: args.startDate,
      targetEndDate: args.targetEndDate,
      budget: args.budget,
      priority: args.priority,
      status: args.status,
      clientOrgId: args.clientOrgId,
      // Milestone fields
      milestoneId: args.milestoneId,
      milestoneName: args.milestoneName,
      milestoneDescription: args.milestoneDescription,
      milestoneDueDate: args.milestoneDueDate,
      // Task fields
      taskId: args.taskId,
      taskName: args.taskName,
      taskDescription: args.taskDescription,
      taskDueDate: args.taskDueDate,
      taskPriority: args.taskPriority,
      assigneeId: args.assigneeId,
      assigneeEmail: args.assigneeEmail,
      // Filters
      filterStatus: args.filterStatus,
      filterPriority: args.filterPriority,
      limit: args.limit,
    });

    return result;
  }
};

/**
 * 2.5 BENEFITS TOOLS
 */

const manageBenefitsTool: AITool = {
  name: "manage_benefits",
  description: "Comprehensive benefits and commissions management: create benefits, list benefits, create commissions, manage claims, track payouts. Use this for ALL member benefits, discounts, commissions, and referral programs.",
  status: "ready",
  parameters: benefitsToolDefinition.function.parameters,
  execute: async (ctx, args) => {
    const result = await ctx.runAction(api.ai.tools.benefitsTool.executeManageBenefits, {
      sessionId: ctx.sessionId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      conversationId: ctx.conversationId,
      action: args.action,
      mode: args.mode,
      workItemId: args.workItemId,
      // Benefit fields
      benefitId: args.benefitId,
      subtype: args.subtype,
      name: args.name,
      description: args.description,
      discountValue: args.discountValue,
      category: args.category,
      validFrom: args.validFrom,
      validUntil: args.validUntil,
      maxTotalClaims: args.maxTotalClaims,
      maxClaimsPerMember: args.maxClaimsPerMember,
      requirements: args.requirements,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      status: args.status,
      // Commission fields
      commissionId: args.commissionId,
      commissionSubtype: args.commissionSubtype,
      commissionRate: args.commissionRate,
      minDealSize: args.minDealSize,
      maxDealSize: args.maxDealSize,
      payoutTerms: args.payoutTerms,
      // Claim fields
      claimId: args.claimId,
      claimDetails: args.claimDetails,
      claimStatus: args.claimStatus,
      // Filters
      filterSubtype: args.filterSubtype,
      filterCategory: args.filterCategory,
      filterStatus: args.filterStatus,
      includeInactive: args.includeInactive,
      limit: args.limit,
    });

    return result;
  }
};

/**
 * 2.6 BOOKINGS TOOL
 */

const manageBookingsTool: AITool = {
  name: "manage_bookings",
  description: "Comprehensive booking, location, and availability management: create bookings, manage appointments/reservations/rentals, confirm/check-in/complete bookings, manage locations, check available time slots.",
  status: "ready",
  parameters: bookingToolDefinition.function.parameters,
  execute: async (ctx, args) => {
    const result = await ctx.runAction(api.ai.tools.bookingTool.executeManageBookings, {
      sessionId: ctx.sessionId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      conversationId: ctx.conversationId,
      action: args.action,
      mode: args.mode,
      workItemId: args.workItemId,
      // Booking fields
      bookingId: args.bookingId,
      subtype: args.subtype,
      resourceId: args.resourceId,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      startDateTime: args.startDateTime,
      endDateTime: args.endDateTime,
      duration: args.duration,
      participants: args.participants,
      notes: args.notes,
      cancellationReason: args.cancellationReason,
      confirmationRequired: args.confirmationRequired,
      // Location fields
      locationId: args.locationId,
      locationName: args.locationName,
      locationType: args.locationType,
      address: args.address,
      timezone: args.timezone,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      // Filters
      filterStatus: args.filterStatus,
      filterSubtype: args.filterSubtype,
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
      limit: args.limit,
    });

    return result;
  }
};

/**
 * 2.7 ACTIVITY PROTOCOL TOOL
 */

const manageActivityProtocolTool: AITool = {
  name: "manage_activity_protocol",
  description: "Manage activity monitoring for connected applications: view events, check statistics, manage pages, configure bindings. Use for debugging, monitoring data flow, and configuring page-level object access.",
  status: "ready",
  parameters: activityProtocolToolDefinition.function.parameters,
  execute: async (ctx, args) => {
    const result = await ctx.runAction(api.ai.tools.activityProtocolTool.executeManageActivityProtocol, {
      sessionId: ctx.sessionId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: args.action,
      applicationId: args.applicationId,
      // Event filters
      severity: args.severity,
      category: args.category,
      debugMode: args.debugMode,
      timeRange: args.timeRange,
      limit: args.limit,
      // Page fields
      pageId: args.pageId,
      path: args.path,
      pageName: args.pageName,
      pageType: args.pageType,
      // Bindings
      objectBindings: args.objectBindings,
      // Settings
      enabled: args.enabled,
      debugModeDefault: args.debugModeDefault,
      retentionDays: args.retentionDays,
      alertsEnabled: args.alertsEnabled,
    });

    return result;
  }
};

/**
 * 2.8 SEQUENCES TOOL
 */

const manageSequencesTool: AITool = {
  name: "manage_sequences",
  description: "Comprehensive automation sequence management for multi-channel messaging: list sequences, create new sequences, activate/pause/resume sequences, enroll contacts, manage enrollments, view statistics. Use for all sequence automation operations.",
  status: "ready",
  parameters: sequencesToolDefinition.function.parameters,
  execute: async (ctx, args) => {
    const result = await ctx.runAction(api.ai.tools.sequencesTool.executeManageSequences, {
      sessionId: ctx.sessionId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      conversationId: ctx.conversationId,
      action: args.action,
      mode: args.mode,
      workItemId: args.workItemId,
      // Sequence fields
      sequenceId: args.sequenceId,
      name: args.name,
      description: args.description,
      subtype: args.subtype,
      triggerEvent: args.triggerEvent,
      channels: args.channels,
      // Enrollment fields
      enrollmentId: args.enrollmentId,
      contactId: args.contactId,
      bookingId: args.bookingId,
      cancelReason: args.cancelReason,
      // Filters
      filterStatus: args.filterStatus,
      filterTriggerEvent: args.filterTriggerEvent,
      limit: args.limit,
    });

    return result;
  }
};

/**
 * 3. FORMS TOOLS
 */

const createFormTool: AITool = {
  name: "create_form",
  description: `Create a new form with custom fields/questions. Supports 17 field types: text, textarea, email, phone, number, date, time, datetime, select (dropdown), radio (single choice), checkbox (yes/no), multi_select (multiple choice), file, rating (stars), section_header, text_block, description.

IMPORTANT: Before calling this tool, have a conversation with the user to gather:
1. What information they need to collect (name, email, phone, etc.)
2. Which fields should be required vs optional
3. For select/radio/multi_select fields: what are the options?
4. Any special validation needs (min/max values, patterns)

Example fields array:
[
  { "label": "Full Name", "type": "text", "required": true },
  { "label": "Email", "type": "email", "required": true },
  { "label": "Session", "type": "select", "options": ["Morning", "Afternoon", "Evening"], "required": true },
  { "label": "Dietary Needs", "type": "multi_select", "options": ["Vegetarian", "Vegan", "Gluten-free", "None"] },
  { "label": "Comments", "type": "textarea" }
]`,
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Form title/name" },
      description: { type: "string", description: "Form description shown to users" },
      formType: {
        type: "string",
        enum: ["registration", "survey", "application", "contact", "booking", "order", "donation", "membership", "rsvp", "feedback", "quiz", "volunteer", "other"],
        description: "Type of form - determines icon and categorization",
        default: "survey"
      },
      fields: {
        type: "array",
        description: "Array of form fields/questions. Each field needs at minimum: label and type. For select/radio/multi_select, include options array.",
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "Field label/question text shown to user" },
            type: {
              type: "string",
              enum: ["text", "textarea", "email", "phone", "number", "date", "time", "datetime", "select", "radio", "checkbox", "multi_select", "file", "rating", "section_header", "text_block", "description"],
              description: "Field type"
            },
            required: { type: "boolean", description: "Whether field is required (default: false)" },
            placeholder: { type: "string", description: "Placeholder text for input fields" },
            helpText: { type: "string", description: "Help text shown below the field" },
            options: {
              type: "array",
              items: { type: "string" },
              description: "Options for select/radio/multi_select fields (e.g., ['Option 1', 'Option 2'])"
            },
            validation: {
              type: "object",
              description: "Validation rules",
              properties: {
                min: { type: "number", description: "Minimum value (for number) or length (for text)" },
                max: { type: "number", description: "Maximum value (for number) or length (for text)" },
                pattern: { type: "string", description: "Regex pattern for validation" },
                customMessage: { type: "string", description: "Custom error message" }
              }
            }
          },
          required: ["label", "type"]
        }
      },
      sectionTitle: { type: "string", description: "Optional title for the main section (default: 'Form Fields')" },
      settings: {
        type: "object",
        description: "Form settings",
        properties: {
          submitButtonText: { type: "string", description: "Text for submit button (default: 'Submit')" },
          successMessage: { type: "string", description: "Message shown after successful submission" },
          allowMultipleSubmissions: { type: "boolean", description: "Allow same user to submit multiple times" },
          showProgressBar: { type: "boolean", description: "Show progress bar for multi-section forms" }
        }
      }
    },
    required: ["title", "fields"]
  },
  execute: async (ctx, args) => {
    // Validate fields array
    if (!args.fields || !Array.isArray(args.fields) || args.fields.length === 0) {
      return {
        success: false,
        error: "Fields array is required and must contain at least one field",
        hint: "Ask the user what information they want to collect, then provide a fields array with label and type for each field."
      };
    }

    // Validate each field has required properties
    for (const field of args.fields) {
      if (!field.label || !field.type) {
        return {
          success: false,
          error: `Each field must have a 'label' and 'type'. Invalid field: ${JSON.stringify(field)}`,
          hint: "Ensure every field object has at minimum: { label: 'Question text', type: 'text' }"
        };
      }
    }

    // CHECK FOR DUPLICATES: Look for existing forms with similar names
    const existingForms = await ctx.runQuery(internal.ai.tools.internalToolMutations.internalListForms, {
      organizationId: ctx.organizationId,
      status: "all",
      limit: 100,
    });

    const normalizedTitle = args.title.toLowerCase().trim();
    const duplicateForm = existingForms.find((f: { name: string; _id: string }) =>
      f.name.toLowerCase().trim() === normalizedTitle
    );

    if (duplicateForm) {
      return {
        success: false,
        requiresUserDecision: true,
        duplicateFound: true,
        error: `A form named "${args.title}" already exists`,
        existingFormId: duplicateForm._id,
        existingFormName: duplicateForm.name,
        userPrompt: `I found an existing form called "${duplicateForm.name}". What would you like me to do?\n\n1. **Use the existing form** - I'll use the form that's already there\n2. **Create with a different name** - Tell me what to call the new form\n3. **Replace it** - Delete the old one and create fresh`,
        hint: "IMPORTANT: Ask the user which option they prefer. Present the options from userPrompt. Do NOT automatically choose - let the user decide.",
        existingForms: existingForms.slice(0, 5).map((f: { _id: string; name: string; status: string }) => ({
          id: f._id,
          name: f.name,
          status: f.status
        }))
      };
    }

    const formId = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalCreateFormWithFields, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      subtype: args.formType || "survey",
      name: args.title,
      description: args.description,
      fields: args.fields,
      sectionTitle: args.sectionTitle,
      settings: args.settings,
    });

    return {
      success: true,
      message: `Created form "${args.title}" with ${args.fields.length} field(s)`,
      formId,
      details: {
        name: args.title,
        type: args.formType || "survey",
        fieldCount: args.fields.length,
        fields: args.fields.map((f: { label: string; type: string; required?: boolean }) => ({
          label: f.label,
          type: f.type,
          required: f.required || false
        }))
      },
      nextSteps: [
        "The form is created in 'draft' status",
        "User can view and edit it in the Forms window",
        "To publish, use the publish_form tool or the Forms UI"
      ]
    };
  }
};

const listFormsTool: AITool = {
  name: "list_forms",
  description: "Get a list of all forms",
  status: "ready",
  windowName: "Forms",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Maximum results", default: 20 },
      status: { type: "string", enum: ["active", "inactive", "all"], default: "all" }
    }
  },
  execute: async (ctx, args) => {
    const forms = await ctx.runQuery(internal.ai.tools.internalToolMutations.internalListForms, {
      organizationId: ctx.organizationId,
      status: args.status,
      limit: args.limit || 20,
    });

    if (forms.length === 0) {
      return {
        success: true,
        message: "No forms found",
        forms: [],
        count: 0,
      };
    }

    return {
      success: true,
      message: `Found ${forms.length} form(s)`,
      forms: forms.map((f: { _id: string; name: string; subtype?: string; status: string; stats?: { views: number; submissions: number } }) => ({
        id: f._id,
        name: f.name,
        type: f.subtype,
        status: f.status,
        views: f.stats?.views || 0,
        submissions: f.stats?.submissions || 0,
      })),
      count: forms.length,
    };
  }
};

const publishFormTool: AITool = {
  name: "publish_form",
  description: "Make a form live and available for submissions",
  status: "ready",
  windowName: "Forms",
  parameters: {
    type: "object",
    properties: {
      formId: { type: "string", description: "Form ID to publish" }
    },
    required: ["formId"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalPublishForm, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      formId: args.formId as Id<"objects">,
    });

    return {
      success: result.success,
      message: "Form published successfully! It's now live and accepting submissions.",
      formId: result.formId,
    };
  }
};

const getFormResponsesTool: AITool = {
  name: "get_form_responses",
  description: "Retrieve submissions for a specific form",
  status: "ready",
  windowName: "Forms",
  parameters: {
    type: "object",
    properties: {
      formId: { type: "string", description: "Form ID" },
      limit: { type: "number", description: "Maximum responses", default: 50 }
    },
    required: ["formId"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runQuery(internal.ai.tools.internalToolMutations.internalGetFormResponses, {
      organizationId: ctx.organizationId,
      formId: args.formId as Id<"objects">,
      limit: args.limit || 50,
    });

    return {
      success: true,
      message: `Found ${result.total} response(s) for "${result.formName}"`,
      formId: result.formId,
      formName: result.formName,
      total: result.total,
      responses: result.responses,
    };
  }
};

/**
 * NEW: Comprehensive Forms Management Tool
 */
const manageFormsTool: AITool = {
  name: "manage_forms",
  description: "Comprehensive forms management: list forms, get statistics (including highest/lowest rated questions), view responses, duplicate forms, and update form properties (rename, change description/status). Use this for all forms-related queries.",
  status: "ready",
  parameters: formsToolDefinition.function.parameters,
  execute: async (ctx, args) => {
    const result = await ctx.runAction(api.ai.tools.formsTool.executeManageForms, {
      sessionId: ctx.sessionId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: args.action,
      formId: args.formId,
      formType: args.formType,
      status: args.status,
      includeRatings: args.includeRatings,
      name: args.name,
      description: args.description
    });

    return result;
  }
};

/**
 * 4. PRODUCTS TOOLS
 */

const createProductTool: AITool = {
  name: "create_product",
  description: `Create a new product, ticket, or bookable service. Supports multiple product types:

PRODUCT TYPES:
- ticket: Event tickets (general admission, VIP, early bird, etc.)
- physical: Physical goods (merchandise, swag, equipment)
- digital: Digital products (downloads, access codes, online courses)
- room: Bookable rooms (hotel rooms, meeting rooms, studios)
- staff: Bookable staff (therapists, consultants, instructors)
- equipment: Bookable equipment (vehicles, projectors, tools)
- space: Bookable spaces (desks, parking spots, lockers)
- appointment: 1:1 meetings, consultations
- class: Group sessions with max participants
- treatment: Spa, medical treatments

IMPORTANT: Before calling this tool, have a conversation with the user to gather:
1. Product type and name
2. Price and currency
3. For tickets: tier (standard, VIP, early bird), event to link to, sale dates
4. For bookables: duration, capacity, buffer times
5. Inventory limits (optional)

Example ticket:
{
  "name": "VIP Access Pass",
  "productType": "ticket",
  "price": 199.99,
  "ticketTier": "vip",
  "description": "Front row seating + backstage access",
  "inventory": 50,
  "salesStart": "2024-01-15",
  "salesEnd": "2024-03-01"
}`,
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Product/ticket name" },
      description: { type: "string", description: "Product description - what's included, benefits, etc." },
      productType: {
        type: "string",
        enum: ["ticket", "physical", "digital", "room", "staff", "equipment", "space", "appointment", "class", "treatment"],
        description: "Type of product - determines available options and behavior",
        default: "physical"
      },
      price: { type: "number", description: "Price in dollars (e.g., 49.99). Use 0 for free products." },
      currency: { type: "string", description: "Currency code (USD, EUR, GBP, etc.)", default: "EUR" },
      inventory: { type: "number", description: "Available quantity (leave empty for unlimited)" },
      // Ticket-specific options
      ticketTier: {
        type: "string",
        enum: ["standard", "earlybird", "vip", "premium", "student", "group"],
        description: "For tickets: pricing tier (affects display and may have special rules)"
      },
      eventId: { type: "string", description: "For tickets: ID of the event this ticket is for (REQUIRED for ticket products - links ticket to event)" },
      salesStart: { type: "string", description: "When sales begin (ISO 8601 date, e.g., '2024-01-15')" },
      salesEnd: { type: "string", description: "When sales end (ISO 8601 date)" },
      earlyBirdEndDate: { type: "string", description: "For early bird tickets: when early bird pricing ends" },
      // Bookable-specific options
      bookingSettings: {
        type: "object",
        description: "For bookable products (room, staff, equipment, appointment, class, treatment)",
        properties: {
          minDuration: { type: "number", description: "Minimum booking duration (in minutes or days based on durationUnit)" },
          maxDuration: { type: "number", description: "Maximum booking duration" },
          durationUnit: { type: "string", enum: ["minutes", "hours", "days", "nights"], description: "Unit for duration" },
          slotIncrement: { type: "number", description: "Time slot increment in minutes (15, 30, 60)" },
          bufferBefore: { type: "number", description: "Buffer time before booking (minutes)" },
          bufferAfter: { type: "number", description: "Buffer time after booking (minutes)" },
          capacity: { type: "number", description: "Max participants (for classes) or occupancy (for rooms)" },
          confirmationRequired: { type: "boolean", description: "Require manual confirmation (default: auto-confirm)" },
          priceUnit: { type: "string", enum: ["hour", "day", "night", "session", "flat"], description: "How price is calculated" }
        }
      },
      // Tax settings
      taxBehavior: {
        type: "string",
        enum: ["inclusive", "exclusive", "automatic"],
        description: "Tax handling: inclusive (price includes tax), exclusive (tax added on top), automatic (system decides)"
      },
      // Form linking
      formId: {
        type: "string",
        description: "Link a registration form to this product. Customers buying this product will be asked to fill out this form during checkout. The product-level form overrides any workflow-level forms."
      },
      // Status
      status: {
        type: "string",
        enum: ["draft", "active"],
        description: "Product status: draft (hidden) or active (available for sale)",
        default: "draft"
      }
    },
    required: ["name", "price"]
  },
  execute: async (ctx, args) => {
    // CHECK FOR DUPLICATES: Look for existing products with same name
    const existingProducts = await ctx.runQuery(internal.ai.tools.internalToolMutations.internalListProducts, {
      organizationId: ctx.organizationId,
      limit: 100,
    });

    const normalizedName = args.name.toLowerCase().trim();
    const duplicateProduct = existingProducts.find((p: { name: string; _id: string }) =>
      p.name.toLowerCase().trim() === normalizedName
    );

    if (duplicateProduct) {
      return {
        success: false,
        requiresUserDecision: true,
        duplicateFound: true,
        error: `A product named "${args.name}" already exists`,
        existingProductId: duplicateProduct._id,
        existingProductName: duplicateProduct.name,
        userPrompt: `I found an existing product called "${duplicateProduct.name}". What would you like me to do?\n\n1. **Use the existing product** - I'll use the product that's already there\n2. **Create with a different name** - Tell me what to call the new product\n3. **Replace it** - Delete the old one and create fresh`,
        hint: "IMPORTANT: Ask the user which option they prefer. Present the options from userPrompt. Do NOT automatically choose - let the user decide.",
        existingProducts: existingProducts.slice(0, 5).map((p: { _id: string; name: string; status: string; subtype?: string }) => ({
          id: p._id,
          name: p.name,
          type: p.subtype,
          status: p.status
        }))
      };
    }

    // Convert dollars to cents
    const priceInCents = Math.round(args.price * 100);

    // Validate price
    if (args.price < 0) {
      return {
        success: false,
        error: "Price cannot be negative",
        hint: "Use 0 for free products"
      };
    }

    // Note: Tickets CAN be linked to events but it's not required
    // The eventId is optional - tickets can exist independently

    // Process dates
    const salesStart = args.salesStart ? new Date(args.salesStart).getTime() : null;
    const salesEnd = args.salesEnd ? new Date(args.salesEnd).getTime() : null;
    const earlyBirdEndDate = args.earlyBirdEndDate ? new Date(args.earlyBirdEndDate).getTime() : null;

    // Validate sale dates
    if (salesStart && salesEnd && salesEnd <= salesStart) {
      return {
        success: false,
        error: "Sales end date must be after sales start date",
        hint: "Check your date values"
      };
    }

    const productId = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalCreateProductWithDetails, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      subtype: args.productType || "physical",
      name: args.name,
      description: args.description,
      price: priceInCents,
      currency: args.currency || "EUR",
      inventory: args.inventory,
      status: args.status || "draft",
      // Ticket options
      ticketTier: args.ticketTier,
      eventId: args.eventId,
      salesStart,
      salesEnd,
      earlyBirdEndDate,
      // Bookable options
      bookingSettings: args.bookingSettings,
      // Tax
      taxBehavior: args.taxBehavior,
      // Form linking
      formId: args.formId,
    });

    // Determine product category for message
    const isTicket = args.productType === "ticket";
    const isBookable = ["room", "staff", "equipment", "space", "appointment", "class", "treatment"].includes(args.productType || "");

    return {
      success: true,
      message: `Created ${isTicket ? "ticket" : isBookable ? "bookable" : "product"} "${args.name}" at ${args.currency || "EUR"} ${args.price.toFixed(2)}`,
      productId,
      details: {
        name: args.name,
        type: args.productType || "physical",
        price: `${args.currency || "EUR"} ${args.price.toFixed(2)}`,
        priceInCents,
        inventory: args.inventory || "Unlimited",
        status: args.status || "draft",
        ticketTier: args.ticketTier || null,
        salesWindow: salesStart || salesEnd ? {
          start: salesStart ? new Date(salesStart).toLocaleDateString() : "Immediate",
          end: salesEnd ? new Date(salesEnd).toLocaleDateString() : "No end date"
        } : null,
        isBookable,
      },
      nextSteps: [
        args.status !== "active" ? "Product is in draft mode - set status to 'active' when ready to sell" : null,
        isTicket && !args.eventId ? "Consider linking this ticket to an event using the eventId parameter" : null,
        "You can update the product anytime using update tools",
      ].filter(Boolean)
    };
  }
};

const listProductsTool: AITool = {
  name: "list_products",
  description: "Get a list of all products",
  status: "ready",
  windowName: "Products",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Maximum results", default: 20 },
      status: { type: "string", enum: ["active", "inactive", "all"], default: "all" }
    }
  },
  execute: async (ctx, args) => {
    const products = await ctx.runQuery(internal.ai.tools.internalToolMutations.internalListProducts, {
      organizationId: ctx.organizationId,
      status: args.status,
      limit: args.limit || 20,
    });

    if (products.length === 0) {
      return {
        success: true,
        message: "No products found",
        products: [],
        count: 0,
      };
    }

    return {
      success: true,
      message: `Found ${products.length} product(s)`,
      products: products.map((p) => ({
        id: p._id,
        name: p.name,
        type: p.subtype,
        status: p.status,
        price: p.priceDollars ? `$${p.priceDollars} ${p.currency || "USD"}` : "No price set",
        sold: p.sold || 0,
      })),
      count: products.length,
    };
  }
};

const updateProductPriceTool: AITool = {
  name: "set_product_price",
  description: "Update the price of a product",
  status: "ready",
  windowName: "Products",
  parameters: {
    type: "object",
    properties: {
      productId: { type: "string", description: "Product ID" },
      newPrice: { type: "number", description: "New price in dollars" },
      currency: { type: "string", description: "Currency (USD, EUR, etc.)" }
    },
    required: ["productId", "newPrice"]
  },
  execute: async (ctx, args) => {
    const priceInCents = Math.round(args.newPrice * 100);

    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalSetProductPrice, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      productId: args.productId as Id<"objects">,
      priceInCents,
      currency: args.currency,
    });

    return {
      success: result.success,
      message: `Price updated from $${(result.oldPrice as number) / 100} to $${args.newPrice}`,
      productId: result.productId,
      oldPrice: result.oldPrice ? `$${(result.oldPrice as number) / 100}` : null,
      newPrice: `$${args.newPrice}`,
    };
  }
};

const activateProductTool: AITool = {
  name: "activate_product",
  description: "Activate a product to make it available for sale. Changes status from 'draft' to 'active'.",
  status: "ready",
  windowName: "Products",
  parameters: {
    type: "object",
    properties: {
      productId: { type: "string", description: "Product ID to activate" }
    },
    required: ["productId"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalActivateProduct, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      productId: args.productId as Id<"objects">,
    });

    return {
      success: result.success,
      message: "Product activated! It's now available for purchase.",
      productId: result.productId,
      previousStatus: result.previousStatus,
    };
  }
};

const setProductFormTool: AITool = {
  name: "set_product_form",
  description: `Link a registration form to a product. When customers purchase this product, they'll be asked to fill out the form during checkout.

Product-level forms OVERRIDE workflow-level forms. This allows:
- Default form for all products via workflow
- Specific products can have their own custom form

Use cases:
- Link a dietary preferences form to meal tickets
- Link a t-shirt size form to merchandise
- Link a safety waiver form to adventure activities
- Remove form by setting formId to null`,
  status: "ready",
  windowName: "Products",
  parameters: {
    type: "object",
    properties: {
      productId: { type: "string", description: "Product ID to link form to" },
      formId: { type: "string", description: "Form ID to link. Use null to remove existing form link." }
    },
    required: ["productId"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalSetProductForm, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      productId: args.productId as Id<"objects">,
      formId: args.formId || null,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    const message = args.formId
      ? `Linked form to product "${result.productName}". Customers will now fill out the form when purchasing this product.`
      : `Removed form link from product "${result.productName}".`;

    return {
      success: true,
      message,
      productId: result.productId,
      productName: result.productName,
      formId: args.formId || null,
      previousFormId: result.previousFormId,
    };
  }
};

const deactivateProductTool: AITool = {
  name: "deactivate_product",
  description: "Deactivate a product to remove it from sale. Changes status from 'active' to 'draft'.",
  status: "ready",
  windowName: "Products",
  parameters: {
    type: "object",
    properties: {
      productId: { type: "string", description: "Product ID to deactivate" }
    },
    required: ["productId"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalDeactivateProduct, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      productId: args.productId as Id<"objects">,
    });

    return {
      success: result.success,
      message: "Product deactivated. It's no longer available for purchase.",
      productId: result.productId,
      previousStatus: result.previousStatus,
    };
  }
};

const publishCheckoutTool: AITool = {
  name: "publish_checkout",
  description: "Publish a checkout page to make it live and ready to accept orders. Generates a public URL.",
  status: "ready",
  windowName: "Checkout",
  parameters: {
    type: "object",
    properties: {
      checkoutId: { type: "string", description: "Checkout page ID to publish" }
    },
    required: ["checkoutId"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalPublishCheckout, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      checkoutId: args.checkoutId as Id<"objects">,
    });

    return {
      success: result.success,
      message: `Checkout published! Public URL: ${result.publicUrl}`,
      checkoutId: result.checkoutId,
      publicUrl: result.publicUrl,
      previousStatus: result.previousStatus,
    };
  }
};

const publishAllTool: AITool = {
  name: "publish_all",
  description: `Publish/activate multiple entities at once. Use this when the user asks to "publish everything", "activate all", or "make everything live".

This tool takes arrays of IDs and publishes/activates them all:
- Events: status changed to "active"
- Products: status changed to "active"
- Forms: status changed to "published"
- Checkouts: status changed to "published" with public URL generated

Example: After creating an event with tickets and a checkout, use this to make them all live at once.`,
  status: "ready",
  windowName: "Settings",
  parameters: {
    type: "object",
    properties: {
      eventIds: {
        type: "array",
        items: { type: "string" },
        description: "Array of event IDs to activate"
      },
      productIds: {
        type: "array",
        items: { type: "string" },
        description: "Array of product/ticket IDs to activate"
      },
      formIds: {
        type: "array",
        items: { type: "string" },
        description: "Array of form IDs to publish"
      },
      checkoutIds: {
        type: "array",
        items: { type: "string" },
        description: "Array of checkout page IDs to publish"
      }
    }
  },
  execute: async (ctx, args) => {
    const results: {
      events: { id: string; success: boolean }[];
      products: { id: string; success: boolean }[];
      forms: { id: string; success: boolean }[];
      checkouts: { id: string; success: boolean; publicUrl?: string }[];
    } = {
      events: [],
      products: [],
      forms: [],
      checkouts: [],
    };

    // Activate events
    if (args.eventIds && Array.isArray(args.eventIds)) {
      for (const eventId of args.eventIds) {
        try {
          await ctx.runMutation(internal.ai.tools.internalToolMutations.internalUpdateEvent, {
            organizationId: ctx.organizationId,
            userId: ctx.userId,
            eventId: eventId as Id<"objects">,
            status: "active",
          });
          results.events.push({ id: eventId, success: true });
        } catch {
          results.events.push({ id: eventId, success: false });
        }
      }
    }

    // Activate products
    if (args.productIds && Array.isArray(args.productIds)) {
      for (const productId of args.productIds) {
        try {
          await ctx.runMutation(internal.ai.tools.internalToolMutations.internalActivateProduct, {
            organizationId: ctx.organizationId,
            userId: ctx.userId,
            productId: productId as Id<"objects">,
          });
          results.products.push({ id: productId, success: true });
        } catch {
          results.products.push({ id: productId, success: false });
        }
      }
    }

    // Publish forms
    if (args.formIds && Array.isArray(args.formIds)) {
      for (const formId of args.formIds) {
        try {
          await ctx.runMutation(internal.ai.tools.internalToolMutations.internalPublishForm, {
            organizationId: ctx.organizationId,
            userId: ctx.userId,
            formId: formId as Id<"objects">,
          });
          results.forms.push({ id: formId, success: true });
        } catch {
          results.forms.push({ id: formId, success: false });
        }
      }
    }

    // Publish checkouts
    if (args.checkoutIds && Array.isArray(args.checkoutIds)) {
      for (const checkoutId of args.checkoutIds) {
        try {
          const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalPublishCheckout, {
            organizationId: ctx.organizationId,
            userId: ctx.userId,
            checkoutId: checkoutId as Id<"objects">,
          });
          results.checkouts.push({ id: checkoutId, success: true, publicUrl: result.publicUrl });
        } catch {
          results.checkouts.push({ id: checkoutId, success: false });
        }
      }
    }

    const totalSuccessful =
      results.events.filter(r => r.success).length +
      results.products.filter(r => r.success).length +
      results.forms.filter(r => r.success).length +
      results.checkouts.filter(r => r.success).length;

    const totalAttempted =
      results.events.length +
      results.products.length +
      results.forms.length +
      results.checkouts.length;

    return {
      success: totalSuccessful > 0,
      message: `Published ${totalSuccessful}/${totalAttempted} items successfully`,
      summary: {
        events: `${results.events.filter(r => r.success).length}/${results.events.length} activated`,
        products: `${results.products.filter(r => r.success).length}/${results.products.length} activated`,
        forms: `${results.forms.filter(r => r.success).length}/${results.forms.length} published`,
        checkouts: `${results.checkouts.filter(r => r.success).length}/${results.checkouts.length} published`,
      },
      results,
      checkoutUrls: results.checkouts.filter(c => c.publicUrl).map(c => c.publicUrl),
    };
  }
};

/**
 * 5. INVOICING/PAYMENTS TOOLS
 */

const createInvoiceTool: AITool = {
  name: "create_invoice",
  description: "Generate a new invoice for a customer",
  status: "ready",
  windowName: "Payments",
  parameters: {
    type: "object",
    properties: {
      customerId: { type: "string", description: "Customer ID (optional)" },
      customerEmail: { type: "string", description: "Customer email address" },
      customerName: { type: "string", description: "Customer name" },
      items: {
        type: "array",
        description: "Invoice line items",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            quantity: { type: "number" },
            unitPrice: { type: "number", description: "Price per unit in cents" }
          }
        }
      },
      dueDate: { type: "string", description: "Payment due date (ISO 8601)" },
      notes: { type: "string", description: "Additional notes" },
      currency: { type: "string", description: "Currency (USD, EUR, etc.)", default: "USD" }
    },
    required: ["items"]
  },
  execute: async (ctx, args) => {
    const items = (args.items as Array<{ description: string; quantity: number; unitPrice: number }>).map(item => ({
      description: item.description || "Item",
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
    }));

    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalCreateInvoice, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      customerId: args.customerId ? (args.customerId as Id<"objects">) : undefined,
      customerEmail: args.customerEmail,
      customerName: args.customerName,
      items,
      dueDate: args.dueDate ? new Date(args.dueDate).getTime() : undefined,
      notes: args.notes,
      currency: args.currency,
    });

    return {
      success: true,
      message: `Invoice ${result.invoiceNumber} created for $${(result.total / 100).toFixed(2)} ${result.currency}`,
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
      total: `$${(result.total / 100).toFixed(2)}`,
      currency: result.currency,
      status: result.status,
    };
  }
};

const sendInvoiceTool: AITool = {
  name: "send_invoice",
  description: "Email an invoice to a customer",
  status: "ready",
  windowName: "Payments",
  parameters: {
    type: "object",
    properties: {
      invoiceId: { type: "string", description: "Invoice ID to send" },
      emailMessage: { type: "string", description: "Optional message to include" }
    },
    required: ["invoiceId"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalSendInvoice, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      invoiceId: args.invoiceId as Id<"objects">,
      emailMessage: args.emailMessage,
    });

    return {
      success: result.success,
      message: `Invoice ${result.invoiceNumber} sent to ${result.customerEmail}`,
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
      customerEmail: result.customerEmail,
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
    };
  }
};

const processPaymentTool: AITool = {
  name: "process_payment",
  description: "Record a payment or mark an invoice as paid",
  status: "ready",
  windowName: "Payments",
  parameters: {
    type: "object",
    properties: {
      invoiceId: { type: "string", description: "Invoice ID to mark as paid (optional)" },
      customerId: { type: "string", description: "Customer ID (optional)" },
      amount: { type: "number", description: "Amount in cents" },
      paymentMethod: { type: "string", description: "Payment method (card, cash, bank_transfer)", default: "manual" },
      description: { type: "string", description: "Payment description" },
      transactionId: { type: "string", description: "External transaction ID (optional)" }
    },
    required: ["amount"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalProcessPayment, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      invoiceId: args.invoiceId ? (args.invoiceId as Id<"objects">) : undefined,
      customerId: args.customerId ? (args.customerId as Id<"objects">) : undefined,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      description: args.description,
      transactionId: args.transactionId,
    });

    return {
      success: result.success,
      message: `Payment of $${(args.amount / 100).toFixed(2)} recorded`,
      paymentId: result.paymentId,
      amount: `$${(result.amount / 100).toFixed(2)}`,
      invoiceId: result.invoiceId,
      transactionId: result.transactionId,
    };
  }
};

/**
 * 6. TICKETS/SUPPORT TOOLS
 */

const createTicketTool: AITool = {
  name: "create_ticket",
  description: "Create a support ticket or help desk request",
  status: "ready",
  windowName: "Tickets",
  parameters: {
    type: "object",
    properties: {
      subject: { type: "string", description: "Ticket subject/title" },
      description: { type: "string", description: "Detailed description" },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"], default: "medium" }
    },
    required: ["subject", "description"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalCreateTicket, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      subject: args.subject,
      description: args.description,
      priority: args.priority || "medium",
    });

    return {
      success: true,
      message: `Created ticket ${result.ticketNumber}: "${args.subject}"`,
      ticketId: result.ticketId,
      ticketNumber: result.ticketNumber,
      priority: args.priority || "medium",
    };
  }
};

const updateTicketStatusTool: AITool = {
  name: "update_ticket_status",
  description: "Change a ticket's status (open, in-progress, resolved, closed)",
  status: "ready",
  windowName: "Tickets",
  parameters: {
    type: "object",
    properties: {
      ticketId: { type: "string", description: "Ticket ID" },
      newStatus: { type: "string", enum: ["open", "in_progress", "resolved", "closed"] }
    },
    required: ["ticketId", "newStatus"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalUpdateTicketStatus, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ticketId: args.ticketId as Id<"objects">,
      newStatus: args.newStatus,
    });

    return {
      success: result.success,
      message: `Ticket status updated from "${result.oldStatus}" to "${result.newStatus}"`,
      ticketId: args.ticketId,
      oldStatus: result.oldStatus,
      newStatus: result.newStatus,
    };
  }
};

const listTicketsTool: AITool = {
  name: "list_tickets",
  description: "Get a list of all support tickets",
  status: "ready",
  windowName: "Tickets",
  parameters: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["open", "in_progress", "resolved", "closed", "all"], default: "all" },
      limit: { type: "number", description: "Maximum results", default: 20 }
    }
  },
  execute: async (ctx, args) => {
    const tickets = await ctx.runQuery(internal.ai.tools.internalToolMutations.internalListTickets, {
      organizationId: ctx.organizationId,
      status: args.status !== "all" ? args.status : undefined,
      limit: args.limit || 20,
    });

    if (tickets.length === 0) {
      return {
        success: true,
        message: "No tickets found",
        tickets: [],
        count: 0,
      };
    }

    return {
      success: true,
      message: `Found ${tickets.length} ticket(s)`,
      tickets: tickets.map((t) => ({
        id: t._id,
        ticketNumber: t.ticketNumber,
        subject: t.name,
        status: t.status,
        priority: t.priority,
        createdAt: new Date(t.createdAt).toISOString(),
      })),
      count: tickets.length,
    };
  }
};

/**
 * 7. WORKFLOWS/AUTOMATION TOOLS
 */

const createWorkflowTool: AITool = {
  name: "create_workflow",
  description: `Create an automated workflow with behaviors.

WORKFLOW CREATION PROCESS:
1. First use "list_workflows" to check existing workflows
2. Create workflow with this tool, specifying trigger and behaviors
3. Use "enable_workflow" to activate it

AVAILABLE TRIGGERS:
- checkout_start: Runs when checkout begins (use for form collection during checkout)
- form_submitted: Runs when a form is submitted
- event_registered: Runs when someone registers for an event
- contact_created: Runs when a new contact is created

BEHAVIOR TYPES (for checkout_start workflows):
- form_linking: Show a form during checkout
  Config: { formId: "form_id", timing: "duringCheckout" }
- addon_calculation: Calculate add-on prices
- payment_provider_selection: Select payment provider

EXAMPLE - To show a form during checkout:
{
  name: "Checkout Registration Form",
  trigger: "checkout_start",
  behaviors: [{
    type: "form_linking",
    config: { formId: "FORM_ID_HERE", timing: "duringCheckout" }
  }]
}`,
  status: "ready",
  windowName: "Workflows",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Workflow name" },
      trigger: { type: "string", description: "What triggers this workflow (checkout_start, form_submitted, event_registered, contact_created)" },
      behaviors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", description: "Behavior type (form_linking, addon_calculation, etc.)" },
            config: { type: "object", description: "Behavior-specific configuration" },
            enabled: { type: "boolean", description: "Whether behavior is enabled (default: true)" },
            priority: { type: "number", description: "Execution priority (higher = first, default: 100)" }
          },
          required: ["type"]
        },
        description: "Behaviors to add to the workflow with their configs"
      },
      status: { type: "string", description: "Initial status: 'draft' or 'active' (default: draft)" }
    },
    required: ["name", "trigger"]
  },
  execute: async (ctx, args) => {
    const workflowId = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalCreateWorkflow, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      name: args.name,
      trigger: args.trigger,
      behaviors: args.behaviors,
      status: args.status,
    });

    return {
      success: true,
      message: `Created workflow "${args.name}" (${args.status || "draft"} mode).${args.status !== "active" ? " Use enable_workflow to activate." : ""}`,
      workflowId,
      name: args.name,
      trigger: args.trigger,
      behaviors: args.behaviors || [],
      status: args.status || "draft",
    };
  }
};

const enableWorkflowTool: AITool = {
  name: "enable_workflow",
  description: "Activate or deactivate an automation workflow",
  status: "ready",
  windowName: "Workflows",
  parameters: {
    type: "object",
    properties: {
      workflowId: { type: "string", description: "Workflow ID to enable/disable" },
      enabled: { type: "boolean", description: "True to enable, false to disable", default: true }
    },
    required: ["workflowId"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalSetWorkflowStatus, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      workflowId: args.workflowId as Id<"objects">,
      enabled: args.enabled !== false,
    });

    return {
      success: result.success,
      message: args.enabled !== false
        ? "Workflow enabled and now active!"
        : "Workflow disabled",
      workflowId: args.workflowId,
      oldStatus: result.oldStatus,
      newStatus: result.newStatus,
    };
  }
};

/**
 * LIST WORKFLOWS TOOL
 *
 * Lists all workflows with their triggers and behaviors.
 * Use this to understand what workflows exist before creating or modifying them.
 */
const listWorkflowsTool: AITool = {
  name: "list_workflows",
  description: `List all workflows in the organization with their triggers and behaviors.

Use this tool to:
- See what workflows already exist before creating new ones
- Find checkout_start workflows that control form display
- Understand what behaviors are configured
- Debug why forms aren't showing in checkout

The response includes:
- Workflow name, status, and trigger (checkout_start, form_submit, etc.)
- All behaviors attached to each workflow with their configs
- Whether the workflow is active or draft`,
  status: "ready",
  windowName: "Workflows",
  parameters: {
    type: "object",
    properties: {},
    required: []
  },
  execute: async (ctx) => {
    const workflows = await ctx.runQuery(internal.ai.tools.internalToolMutations.internalListWorkflows, {
      organizationId: ctx.organizationId,
    });

    // Format for readability
    type WorkflowResult = {
      _id: string;
      name: string;
      status: string;
      triggerOn?: string;
      behaviors: Array<{ type: string; enabled: boolean; config?: Record<string, unknown> }>;
    };
    const formatted = (workflows as unknown as WorkflowResult[]).map(w => ({
      id: w._id,
      name: w.name,
      status: w.status,
      triggerOn: w.triggerOn || "none",
      behaviorCount: w.behaviors.length,
      behaviors: w.behaviors.map(b => ({
        type: b.type,
        enabled: b.enabled,
        config: b.config,
      })),
    }));

    // Find checkout workflows specifically
    const checkoutWorkflows = formatted.filter(w => w.triggerOn === "checkout_start");

    return {
      success: true,
      totalWorkflows: workflows.length,
      checkoutWorkflows: checkoutWorkflows.length,
      workflows: formatted,
      hint: checkoutWorkflows.length === 0
        ? "No checkout_start workflows found. Use create_workflow with trigger 'checkout_start' and a form_linking behavior."
        : `Found ${checkoutWorkflows.length} checkout workflow(s). Check their behaviors to see if form_linking is configured.`,
    };
  }
};

/**
 * ADD BEHAVIOR TO WORKFLOW TOOL
 *
 * Adds a behavior with proper configuration to an existing workflow.
 */
const addBehaviorToWorkflowTool: AITool = {
  name: "add_behavior_to_workflow",
  description: `Add a behavior to an existing workflow.

Use this to add behaviors to workflows without recreating them.

BEHAVIOR TYPES:
- form_linking: Show a form during checkout
  Config: { formId: "form_id", timing: "duringCheckout" }
- addon_calculation: Calculate add-on prices
- payment_provider_selection: Select payment provider
- email_notification: Send email notifications
- webhook: Call external webhook

EXAMPLE - Add form to existing checkout workflow:
{
  workflowId: "WORKFLOW_ID",
  behavior: {
    type: "form_linking",
    config: { formId: "FORM_ID", timing: "duringCheckout" }
  }
}`,
  status: "ready",
  windowName: "Workflows",
  parameters: {
    type: "object",
    properties: {
      workflowId: { type: "string", description: "ID of the workflow to modify" },
      behavior: {
        type: "object",
        properties: {
          type: { type: "string", description: "Behavior type (form_linking, addon_calculation, etc.)" },
          config: { type: "object", description: "Behavior-specific configuration" },
          enabled: { type: "boolean", description: "Whether behavior is enabled (default: true)" },
          priority: { type: "number", description: "Execution priority (higher = first, default: 100)" }
        },
        required: ["type"],
        description: "The behavior to add"
      }
    },
    required: ["workflowId", "behavior"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalAddBehaviorToWorkflow, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      workflowId: args.workflowId as Id<"objects">,
      behavior: args.behavior,
    });

    return {
      success: true,
      message: `Added ${result.behaviorType} behavior to workflow "${result.workflowName}". Total behaviors: ${result.totalBehaviors}`,
      workflowId: result.workflowId,
      workflowName: result.workflowName,
      behaviorId: result.behaviorId,
      behaviorType: result.behaviorType,
      totalBehaviors: result.totalBehaviors,
    };
  }
};

/**
 * REMOVE BEHAVIOR FROM WORKFLOW TOOL
 *
 * Removes a behavior from an existing workflow.
 */
const removeBehaviorFromWorkflowTool: AITool = {
  name: "remove_behavior_from_workflow",
  description: `Remove a behavior from a workflow.

Use this to remove specific behaviors without deleting the entire workflow.
You can remove by behavior ID (specific) or by type (all of that type).

EXAMPLE - Remove form_linking from checkout workflow:
{
  workflowId: "WORKFLOW_ID",
  behaviorType: "form_linking"
}`,
  status: "ready",
  windowName: "Workflows",
  parameters: {
    type: "object",
    properties: {
      workflowId: { type: "string", description: "ID of the workflow to modify" },
      behaviorId: { type: "string", description: "Specific behavior ID to remove" },
      behaviorType: { type: "string", description: "Remove behavior(s) of this type" }
    },
    required: ["workflowId"]
  },
  execute: async (ctx, args) => {
    if (!args.behaviorId && !args.behaviorType) {
      return {
        success: false,
        error: "Must provide either behaviorId or behaviorType to identify which behavior to remove",
      };
    }

    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalRemoveBehaviorFromWorkflow, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      workflowId: args.workflowId as Id<"objects">,
      behaviorId: args.behaviorId,
      behaviorType: args.behaviorType,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      message: `Removed ${result.removedBehaviorType} behavior from workflow "${result.workflowName}". Remaining behaviors: ${result.remainingBehaviors}`,
      workflowId: result.workflowId,
      workflowName: result.workflowName,
      removedBehaviorId: result.removedBehaviorId,
      removedBehaviorType: result.removedBehaviorType,
      remainingBehaviors: result.remainingBehaviors,
    };
  }
};

/**
 * 8. MEDIA LIBRARY TOOLS
 */

const uploadMediaTool: AITool = {
  name: "upload_media",
  description: "Create a media library entry for tracking uploaded files",
  status: "ready",
  windowName: "Media",
  parameters: {
    type: "object",
    properties: {
      fileName: { type: "string", description: "File name" },
      fileType: { type: "string", description: "File type (image, video, document)" },
      mimeType: { type: "string", description: "MIME type (e.g., image/png)" },
      size: { type: "number", description: "File size in bytes" },
      folder: { type: "string", description: "Folder to organize file" },
      description: { type: "string", description: "File description" },
      tags: { type: "array", items: { type: "string" }, description: "Tags for searching" },
      url: { type: "string", description: "URL if already hosted" },
      storageId: { type: "string", description: "Convex storage ID if uploaded" }
    },
    required: ["fileName"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalCreateMediaEntry, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      fileName: args.fileName,
      fileType: args.fileType,
      mimeType: args.mimeType,
      size: args.size,
      folder: args.folder,
      description: args.description,
      tags: args.tags as string[] | undefined,
      url: args.url,
      storageId: args.storageId,
    });

    return {
      success: true,
      message: `Media entry created for "${args.fileName}"`,
      mediaId: result.mediaId,
      fileName: result.fileName,
      folder: args.folder,
    };
  }
};

const searchMediaTool: AITool = {
  name: "search_media",
  description: "Search for files in your media library",
  status: "ready",
  windowName: "Media",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search term (file name, tag, etc.)" },
      fileType: { type: "string", enum: ["all", "images", "videos", "documents"], default: "all" },
      limit: { type: "number", description: "Maximum results", default: 20 }
    },
    required: ["query"]
  },
  execute: async (ctx, args) => {
    const media = await ctx.runQuery(internal.ai.tools.internalToolMutations.internalSearchMedia, {
      organizationId: ctx.organizationId,
      query: args.query,
      fileType: args.fileType,
      limit: args.limit || 20,
    });

    if (media.length === 0) {
      return {
        success: true,
        message: `No media found matching "${args.query}"`,
        results: [],
        count: 0,
      };
    }

    return {
      success: true,
      message: `Found ${media.length} file(s) matching "${args.query}"`,
      results: media.map((m) => ({
        id: m._id,
        name: m.name,
        fileName: m.fileName,
        fileType: m.fileType,
        mimeType: m.mimeType,
        size: m.size ? `${(m.size / 1024).toFixed(1)} KB` : undefined,
        url: m.url,
      })),
      count: media.length,
    };
  }
};

/**
 * 9. EMAIL TEMPLATES TOOLS
 */

const createTemplateTool: AITool = {
  name: "create_template",
  description: "Create an email template for reuse",
  status: "ready",
  windowName: "Templates",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Template name" },
      subject: { type: "string", description: "Email subject line" },
      body: { type: "string", description: "Email body (supports HTML)" },
      variables: { type: "array", items: { type: "string" }, description: "Merge variables (e.g., firstName, company)" }
    },
    required: ["name", "subject", "body"]
  },
  execute: async (ctx, args) => {
    const templateId = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalCreateEmailTemplate, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      name: args.name,
      subject: args.subject,
      body: args.body,
      variables: args.variables,
    });

    return {
      success: true,
      message: `Created email template "${args.name}"`,
      templateId,
      name: args.name,
      subject: args.subject,
      variables: args.variables || [],
    };
  }
};

const sendEmailFromTemplateTool: AITool = {
  name: "send_email_from_template",
  description: "Send an email using a saved template",
  status: "ready",
  windowName: "Templates",
  parameters: {
    type: "object",
    properties: {
      templateId: { type: "string", description: "Template ID to use" },
      recipientEmail: { type: "string", description: "Recipient email address" },
      recipientName: { type: "string", description: "Recipient name (for personalization)" },
      variables: { type: "object", description: "Variables to fill in (firstName, company, etc.)" }
    },
    required: ["templateId", "recipientEmail"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalSendEmailFromTemplate, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      templateId: args.templateId as Id<"objects">,
      recipientEmail: args.recipientEmail,
      recipientName: args.recipientName,
      variables: args.variables,
    });

    return {
      success: result.success,
      message: `Email queued to ${args.recipientEmail} using template "${result.templateName}"`,
      emailLogId: result.emailLogId,
      templateName: result.templateName,
      recipientEmail: result.recipientEmail,
      subject: result.subject,
    };
  }
};

/**
 * 10. WEB PUBLISHING TOOLS
 */

const createPageTool: AITool = {
  name: "create_page",
  description: "Create a new website page",
  status: "ready",
  windowName: "Web Publishing",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Page title" },
      slug: { type: "string", description: "URL slug (e.g., 'about-us')" },
      template: { type: "string", description: "Template to use" },
      content: { type: "object", description: "Page content (blocks structure)" },
      metaTitle: { type: "string", description: "SEO meta title" },
      metaDescription: { type: "string", description: "SEO meta description" }
    },
    required: ["title", "slug"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalCreatePage, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      title: args.title,
      slug: args.slug,
      template: args.template,
      content: args.content,
      metaTitle: args.metaTitle,
      metaDescription: args.metaDescription,
    });

    return {
      success: true,
      message: `Page "${args.title}" created at /${args.slug}`,
      pageId: result.pageId,
      title: args.title,
      slug: result.slug,
      status: "draft",
    };
  }
};

const publishPageTool: AITool = {
  name: "publish_page",
  description: "Make a page live on your website",
  status: "ready",
  windowName: "Web Publishing",
  parameters: {
    type: "object",
    properties: {
      pageId: { type: "string", description: "Page ID to publish" }
    },
    required: ["pageId"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalPublishPage, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      pageId: args.pageId as Id<"objects">,
    });

    return {
      success: result.success,
      message: `Page "${result.title}" is now live at /${result.slug}`,
      pageId: result.pageId,
      title: result.title,
      slug: result.slug,
      previousStatus: result.oldStatus,
      newStatus: result.newStatus,
    };
  }
};

/**
 * 11. CHECKOUT TOOLS
 */

/**
 * Enhanced checkout page tool using behavior-driven checkout template
 *
 * This tool ties together products, forms, and events into a complete checkout experience.
 * It uses the behavior-driven checkout template which provides:
 * - 6-step adaptive flow: Product → Form → Customer Info → Review → Payment → Confirmation
 * - Smart step skipping (auto-skips payment for invoice checkouts)
 * - Dynamic form collection
 * - Employer detection and B2B invoice mapping
 * - Full behavior system integration
 *
 * CONVERSATIONAL GUIDANCE:
 * When a user wants to create a checkout, guide them through these questions:
 *
 * 1. "What is this checkout for?" → Determines naming and context
 * 2. "What products or tickets should be available?" → Use create_product first if needed
 * 3. "Do you need to collect additional information?" → Use create_form first if needed
 * 4. "Is this for B2B (invoicing) or B2C (direct payment)?" → Sets payment mode
 * 5. "Any specific payment methods needed?" → stripe-connect, invoice, manual
 *
 * WORKFLOW INTEGRATION:
 * This tool works best when combined with other tools in sequence:
 * 1. create_event → Creates the event (if event-related)
 * 2. create_product → Creates tickets/products linked to the event
 * 3. create_form → Creates registration forms if needed
 * 4. create_checkout_page → Ties everything together into a purchasable experience
 */
const createCheckoutPageTool: AITool = {
  name: "create_checkout_page",
  description: `Create a behavior-driven checkout page that ties together products, forms, and payment methods.

IMPORTANT: Before creating a checkout, ensure you have:
1. Created products/tickets using create_product (get the productIds)
2. Created registration forms using create_form if needed (get the formId)
3. Created events using create_event if this is event-related

ASK THE USER about these aspects before creating the checkout:
- What products/tickets to include (or help them create products first)
- Whether they need a registration form (or help them create one first)
- Payment mode: B2C (Stripe payments) or B2B (invoicing)
- Any special settings (language, max quantity, etc.)

The checkout uses the behavior-driven template with a 6-step flow:
Product Selection → Form Collection → Customer Info → Review → Payment → Confirmation

This template automatically adapts based on product behaviors and can skip steps when appropriate.`,
  status: "ready",
  windowName: "Checkout",
  parameters: {
    type: "object",
    properties: {
      // Basic info
      name: {
        type: "string",
        description: "Checkout page name (e.g., 'Conference 2024 Registration', 'Workshop Booking')"
      },
      description: {
        type: "string",
        description: "Description shown to customers during checkout"
      },

      // Product linking
      productIds: {
        type: "array",
        items: { type: "string" },
        description: "Array of product IDs to include in checkout (from create_product tool)"
      },

      // Form integration
      formId: {
        type: "string",
        description: "Optional form ID for registration/data collection (from create_form tool)"
      },

      // Event linking (for context)
      eventId: {
        type: "string",
        description: "Optional event ID if this checkout is for event registration"
      },

      // Payment configuration
      paymentMode: {
        type: "string",
        enum: ["b2c", "b2b", "hybrid"],
        description: "Payment mode: 'b2c' for direct Stripe payments, 'b2b' for invoicing, 'hybrid' for both options"
      },
      paymentProviders: {
        type: "array",
        items: {
          type: "string",
          enum: ["stripe-connect", "invoice", "manual", "free"]
        },
        description: "Payment methods: stripe-connect (card payments), invoice (B2B billing), manual (offline), free (no payment)"
      },

      // Behaviors
      behaviors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["employer-detection", "invoice-mapping", "capacity-checking", "discount-rules", "form-collection"],
              description: "Behavior type"
            },
            config: { type: "object", description: "Behavior-specific configuration" },
            priority: { type: "number", description: "Execution priority (higher = earlier)" }
          }
        },
        description: "Checkout behaviors for dynamic logic (employer detection, invoice mapping, etc.)"
      },

      // Settings
      settings: {
        type: "object",
        properties: {
          language: {
            type: "string",
            enum: ["en", "de", "es", "fr", "pl", "ja"],
            description: "Checkout language (en=English, de=German, es=Spanish, fr=French, pl=Polish, ja=Japanese)"
          },
          maxQuantityPerOrder: {
            type: "number",
            description: "Maximum items per order (default: 10)"
          },
          requiresAccount: {
            type: "boolean",
            description: "Require user account to checkout"
          },
          showProgressBar: {
            type: "boolean",
            description: "Show progress indicator (default: true)"
          },
          allowBackNavigation: {
            type: "boolean",
            description: "Allow going back to previous steps (default: true)"
          },
          debugMode: {
            type: "boolean",
            description: "Enable debug panel for testing (default: false)"
          },
          currency: {
            type: "string",
            enum: ["USD", "EUR", "GBP", "CAD", "AUD", "CHF"],
            description: "Display currency (default: from organization)"
          },
          successRedirectUrl: {
            type: "string",
            description: "URL to redirect after successful checkout"
          },
          cancelRedirectUrl: {
            type: "string",
            description: "URL to redirect if checkout is cancelled"
          }
        },
        description: "Checkout page settings"
      },

      // Branding
      branding: {
        type: "object",
        properties: {
          headerText: { type: "string", description: "Custom header text" },
          footerText: { type: "string", description: "Custom footer text" },
          primaryColor: { type: "string", description: "Primary brand color (hex)" },
          logoUrl: { type: "string", description: "Logo URL to display" },
          theme: {
            type: "string",
            enum: ["light", "dark", "auto"],
            description: "Color theme"
          }
        },
        description: "Visual branding options"
      }
    },
    required: ["name", "productIds"]
  },
  execute: async (ctx, args) => {
    // CHECK FOR DUPLICATES: Look for existing checkout pages with same name
    const existingCheckouts = await ctx.runQuery(internal.ai.tools.internalToolMutations.internalListCheckouts, {
      organizationId: ctx.organizationId,
      limit: 100,
    });

    const normalizedName = args.name.toLowerCase().trim();
    const duplicateCheckout = existingCheckouts.find((c: { name: string; _id: string }) =>
      c.name.toLowerCase().trim() === normalizedName
    );

    if (duplicateCheckout) {
      return {
        success: false,
        requiresUserDecision: true,
        duplicateFound: true,
        error: `A checkout page named "${args.name}" already exists`,
        existingCheckoutId: duplicateCheckout._id,
        existingCheckoutName: duplicateCheckout.name,
        userPrompt: `I found an existing checkout page called "${duplicateCheckout.name}". What would you like me to do?\n\n1. **Use the existing checkout** - I'll use the checkout page that's already there\n2. **Create with a different name** - Tell me what to call the new checkout page\n3. **Replace it** - Delete the old one and create fresh`,
        hint: "IMPORTANT: Ask the user which option they prefer. Present the options from userPrompt. Do NOT automatically choose - let the user decide.",
        existingCheckouts: existingCheckouts.slice(0, 5).map((c: { _id: string; name: string; status: string }) => ({
          id: c._id,
          name: c.name,
          status: c.status
        }))
      };
    }

    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalCreateCheckoutPageWithDetails, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      name: args.name,
      description: args.description,
      productIds: args.productIds.map((id: string) => id as Id<"objects">),
      formId: args.formId ? (args.formId as Id<"objects">) : undefined,
      eventId: args.eventId ? (args.eventId as Id<"objects">) : undefined,
      paymentMode: args.paymentMode,
      paymentProviders: args.paymentProviders,
      behaviors: args.behaviors,
      settings: args.settings,
      branding: args.branding,
    });

    // Build helpful response message
    let message = `Created checkout page "${args.name}" using the behavior-driven template.\n\n`;
    message += `📋 6-Step Flow: Product → Form → Customer → Review → Payment → Confirmation\n`;

    if (args.productIds.length > 0) {
      message += `📦 ${args.productIds.length} product(s) linked\n`;
    }
    if (args.formId) {
      message += `📝 Registration form attached\n`;
    }
    if (args.eventId) {
      message += `📅 Linked to event\n`;
    }

    const paymentInfo = args.paymentMode === "b2b" ? "Invoice billing" :
                        args.paymentMode === "hybrid" ? "Card + Invoice" : "Card payments";
    message += `💳 Payment: ${paymentInfo}\n`;

    message += `\n🔗 Checkout URL: https://checkout.l4yercak3.com/${result.publicSlug}`;

    return {
      success: true,
      message,
      checkoutId: result.checkoutId,
      publicSlug: result.publicSlug,
      checkoutUrl: `https://checkout.l4yercak3.com/${result.publicSlug}`,
      template: "behavior-driven-checkout",
      linkedProducts: args.productIds.length,
      linkedForm: args.formId || null,
      linkedEvent: args.eventId || null,
      paymentMode: args.paymentMode || "b2c",
      status: "draft",
      nextSteps: [
        "Preview your checkout page",
        "Test the checkout flow",
        "Publish when ready to accept orders"
      ]
    };
  }
};

/**
 * 12. CERTIFICATES TOOLS
 */

const generateCertificateTool: AITool = {
  name: "generate_certificate",
  description: "Create a certificate of completion or achievement",
  status: "ready",
  windowName: "Certificates",
  parameters: {
    type: "object",
    properties: {
      recipientName: { type: "string", description: "Certificate recipient name" },
      recipientEmail: { type: "string", description: "Certificate recipient email (for delivery)" },
      certificateType: { type: "string", description: "Type of certificate (completion, achievement, attendance)" },
      eventName: { type: "string", description: "Related event or course name" },
      issueDate: { type: "string", description: "Date of issue (ISO 8601 format)" },
      pointsAwarded: { type: "number", description: "Points/credits to award", default: 1 }
    },
    required: ["recipientName", "certificateType"]
  },
  execute: async (ctx, args) => {
    const result = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalGenerateCertificate, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      recipientName: args.recipientName,
      recipientEmail: args.recipientEmail,
      certificateType: args.certificateType,
      eventName: args.eventName,
      issueDate: args.issueDate ? new Date(args.issueDate).getTime() : undefined,
      pointsAwarded: args.pointsAwarded,
    });

    return {
      success: true,
      message: `Certificate generated for ${args.recipientName}`,
      certificateId: result.certificateId,
      certificateNumber: result.certificateNumber,
      recipientName: args.recipientName,
      certificateType: args.certificateType,
      eventName: args.eventName,
      verificationUrl: `https://l4yercak3.com/verify/${result.certificateNumber}`,
    };
  }
};

/**
 * 13. SETTINGS TOOLS
 */

const updateOrganizationSettingsTool: AITool = {
  name: "update_organization_settings",
  description: "Modify organization-wide settings",
  status: "placeholder",
  windowName: "Settings",
  parameters: {
    type: "object",
    properties: {
      settingKey: { type: "string", description: "Setting to update (e.g., 'timezone', 'currency')" },
      settingValue: { type: "string", description: "New value" }
    },
    required: ["settingKey", "settingValue"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `Let me help you update ${args.settingKey} to "${args.settingValue}"!`,
      tutorialSteps: [
        "Click the **Settings** icon in your taskbar (⚙️)",
        "Go to the **Organization** tab",
        `Find the **${args.settingKey}** setting`,
        `Change it to: **${args.settingValue}**`,
        "Click **Save Settings**"
      ]
    };
  }
};

const configureAIModelsTool: AITool = {
  name: "configure_ai_models",
  description: "Setup AI assistant models and API keys",
  status: "placeholder",
  windowName: "Settings",
  parameters: {
    type: "object",
    properties: {
      provider: { type: "string", enum: ["openai", "anthropic", "openrouter"], description: "AI provider" },
      apiKey: { type: "string", description: "API key for the provider" },
      model: { type: "string", description: "Model to use (e.g., gpt-4, claude-3-sonnet)" }
    },
    required: ["provider"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `Let me help you configure ${args.provider} AI models!`,
      tutorialSteps: [
        "Click the **Settings** icon in your taskbar (⚙️)",
        "Go to the **AI Settings** tab",
        `Select provider: **${args.provider}**`,
        args.apiKey ? "⚠️ **Important**: Never share your API key!" : "Enter your API key securely",
        args.model ? `Choose model: **${args.model}**` : "Select your preferred model",
        "Click **Save AI Settings**"
      ]
    };
  }
};

/**
 * ALL TOOLS REGISTRY
 */
export const TOOL_REGISTRY: Record<string, AITool> = {
  // Meta Tools
  request_feature: requestFeatureTool,

  // OAuth Connection Check
  check_oauth_connection: checkOAuthConnectionTool,

  // CRM
  manage_crm: manageCRMTool,
  sync_contacts: syncContactsTool,
  send_bulk_crm_email: sendBulkCRMEmailTool,
  create_contact: createContactTool,
  search_contacts: searchContactsTool,
  update_contact: updateContactTool,
  tag_contacts: tagContactsTool,

  // Events
  create_event: createEventTool,
  list_events: listEventsTool,
  update_event: updateEventTool,
  register_attendee: registerAttendeeTool,

  // Projects
  manage_projects: manageProjectsTool,

  // Benefits
  manage_benefits: manageBenefitsTool,

  // Bookings
  manage_bookings: manageBookingsTool,

  // Activity Protocol
  manage_activity_protocol: manageActivityProtocolTool,

  // Sequences
  manage_sequences: manageSequencesTool,

  // Forms
  create_form: createFormTool,
  list_forms: listFormsTool,
  publish_form: publishFormTool,
  get_form_responses: getFormResponsesTool,
  manage_forms: manageFormsTool,

  // Products
  create_product: createProductTool,
  list_products: listProductsTool,
  set_product_price: updateProductPriceTool,
  set_product_form: setProductFormTool,
  activate_product: activateProductTool,
  deactivate_product: deactivateProductTool,

  // Payments/Invoicing
  create_invoice: createInvoiceTool,
  send_invoice: sendInvoiceTool,
  process_payment: processPaymentTool,

  // Tickets
  create_ticket: createTicketTool,
  update_ticket_status: updateTicketStatusTool,
  list_tickets: listTicketsTool,

  // Workflows
  create_workflow: createWorkflowTool,
  enable_workflow: enableWorkflowTool,
  list_workflows: listWorkflowsTool,
  add_behavior_to_workflow: addBehaviorToWorkflowTool,
  remove_behavior_from_workflow: removeBehaviorFromWorkflowTool,

  // Media
  upload_media: uploadMediaTool,
  search_media: searchMediaTool,

  // Templates
  create_template: createTemplateTool,
  send_email_from_template: sendEmailFromTemplateTool,

  // Web Publishing
  create_page: createPageTool,
  publish_page: publishPageTool,

  // Checkout
  create_checkout_page: createCheckoutPageTool,
  publish_checkout: publishCheckoutTool,

  // Batch Operations
  publish_all: publishAllTool,

  // Certificates
  generate_certificate: generateCertificateTool,

  // Settings
  update_organization_settings: updateOrganizationSettingsTool,
  configure_ai_models: configureAIModelsTool,

// Webinars
  manage_webinars: {
    name: "manage_webinars",
    description: webinarToolDefinition.function.description,
    status: "ready" as ToolStatus,
    parameters: webinarToolDefinition.function.parameters,
    execute: async (ctx, args) => {
      const result = await ctx.runAction(api.ai.tools.webinarTool.executeManageWebinars, {
        sessionId: ctx.sessionId,
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        conversationId: ctx.conversationId,
        action: args.action,
        mode: args.mode,
        workItemId: args.workItemId,
        webinarId: args.webinarId,
        name: args.name,
        description: args.description,
        subtype: args.subtype,
        scheduledAt: args.scheduledAt,
        durationMinutes: args.durationMinutes,
        timezone: args.timezone,
        maxRegistrants: args.maxRegistrants,
        offerEnabled: args.offerEnabled,
        offerTimestamp: args.offerTimestamp,
        offerCtaText: args.offerCtaText,
        offerCheckoutId: args.offerCheckoutId,
        offerExternalUrl: args.offerExternalUrl,
        status: args.status,
        registrantStatus: args.registrantStatus,
        limit: args.limit,
      });
      return result;
    }
  },

  // Integrations - ActiveCampaign
  activecampaign: activeCampaignToolDefinition,
};

/**
 * Get tools grouped by status
 */
export function getToolsByStatus() {
  const ready: AITool[] = [];
  const placeholder: AITool[] = [];
  const beta: AITool[] = [];

  Object.values(TOOL_REGISTRY).forEach(tool => {
    if (tool.status === "ready") ready.push(tool);
    else if (tool.status === "placeholder") placeholder.push(tool);
    else if (tool.status === "beta") beta.push(tool);
  });

  return { ready, placeholder, beta };
}

// OpenAI function schema type
interface OpenAIFunctionSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Convert tool definitions to OpenAI function calling format
 * ONLY return tools that are "ready" - placeholder tools handled by AI system prompt
 */
export function getToolSchemas(): OpenAIFunctionSchema[] {
  // Return ALL tools (ready + placeholder) so AI can attempt to use them
  // The execute() function will return tutorial guidance for placeholder tools
  return Object.values(TOOL_REGISTRY).map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: `${tool.description} [Status: ${tool.status.toUpperCase()}]`,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  ctx: ToolExecutionContext,
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
): Promise<unknown> {
  const tool = TOOL_REGISTRY[toolName];
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  // TODO: Check permissions
  // if (!checkPermissions(ctx, tool.permissions)) {
  //   throw new Error(`Missing permissions for ${toolName}`);
  // }

  // Execute tool (will return tutorial guidance if status is "placeholder")
  return await tool.execute(ctx, args);
}
