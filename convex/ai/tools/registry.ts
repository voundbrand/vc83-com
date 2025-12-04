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
import { api } from "../../_generated/api";
import { internal } from "../../_generated/api";

/**
 * Tool status types
 */
export type ToolStatus = "ready" | "placeholder" | "beta";

/**
 * Tool definition interface
 */
export interface AITool {
  name: string;
  description: string;
  status: ToolStatus;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  permissions?: string[];
  tutorialSteps?: string[]; // For placeholder tools
  windowName?: string; // Which window to open for this feature
  execute: (ctx: any, args: any) => Promise<any>;
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
      toolName: args.suggestedToolName || "unknown_feature",
      toolParameters: {
        featureDescription: args.featureDescription,
        category: args.category || "general",
        userElaboration: args.userElaboration, // Include user's detailed explanation
      },
      errorMessage: `Feature requested by user: ${args.featureDescription}`,
      conversationId: ctx.conversationId,
      userMessage: args.userMessage, // Original request
      aiResponse: undefined,
      occurredAt: Date.now(),
    }).catch((err: any) => {
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
      sessionId: ctx.sessionId,
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
  status: "placeholder",
  windowName: "CRM",
  tutorialSteps: [
    "Click the **CRM** icon in your taskbar",
    "Use the search bar at the top to search by name, email, or company",
    "Click on a contact to view details"
  ],
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query (name, email, or company)" },
      limit: { type: "number", description: "Maximum results", default: 10 }
    },
    required: ["query"]
  },
  execute: async (_ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `Let me help you search for: ${args.query}`,
      tutorialSteps: [
        "Click the **CRM** icon in your taskbar",
        `Use the search bar at the top and search for: **${args.query}**`,
        "Click on any contact to view their full details"
      ]
    };
  }
};

const updateContactTool: AITool = {
  name: "update_contact",
  description: "Update an existing contact's information",
  status: "placeholder",
  windowName: "CRM",
  parameters: {
    type: "object",
    properties: {
      contactId: { type: "string", description: "Contact ID to update" },
      updates: { type: "object", description: "Fields to update (email, phone, etc.)" }
    },
    required: ["contactId", "updates"]
  },
  execute: async (_ctx, _args) => {
    return {
      success: false,
      status: "placeholder",
      message: "I can guide you through updating a contact!",
      tutorialSteps: [
        "Open the **CRM** window",
        "Find and click on the contact you want to update",
        "Click the **Edit** button",
        "Make your changes",
        "Click **Save**"
      ]
    };
  }
};

const tagContactsTool: AITool = {
  name: "tag_contacts",
  description: "Add tags to one or more contacts for organization",
  status: "placeholder",
  windowName: "CRM",
  parameters: {
    type: "object",
    properties: {
      contactIds: { type: "array", items: { type: "string" }, description: "Contact IDs" },
      tags: { type: "array", items: { type: "string" }, description: "Tags to add" }
    },
    required: ["contactIds", "tags"]
  },
  execute: async (_ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `Let me help you add tags: ${args.tags.join(", ")}`,
      tutorialSteps: [
        "Open the **CRM** window",
        "Select the contacts you want to tag (use checkboxes)",
        "Click the **Add Tags** button",
        `Add these tags: **${args.tags.join(", ")}**`,
        "Click **Apply**"
      ]
    };
  }
};

/**
 * 2. EVENTS TOOLS
 */

const createEventTool: AITool = {
  name: "create_event",
  description: "Create a new event with dates, location, and details",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Event title" },
      description: { type: "string", description: "Event description" },
      startDate: { type: "string", description: "Start date (ISO 8601)" },
      endDate: { type: "string", description: "End date (optional, ISO 8601). If not provided, duration is based on event type." },
      location: { type: "string", description: "Event location" },
      capacity: { type: "number", description: "Maximum attendees (optional)" },
      eventType: { type: "string", enum: ["conference", "workshop", "concert", "meetup", "seminar"], description: "Type of event", default: "meetup" },
      timezone: { type: "string", description: "Timezone (e.g., 'America/Los_Angeles', 'America/New_York'). Defaults to organization timezone.", default: "America/Los_Angeles" },
      published: { type: "boolean", description: "Publish event immediately (true) or keep as draft (false)", default: true }
    },
    required: ["title", "startDate", "location"]
  },
  execute: async (ctx, args) => {
    // Convert ISO dates to timestamps
    const startTimestamp = new Date(args.startDate).getTime();

    // Smart duration defaults based on event type
    const durationDefaults: Record<string, number> = {
      conference: 8 * 60 * 60 * 1000,  // 8 hours
      workshop: 4 * 60 * 60 * 1000,     // 4 hours
      concert: 3 * 60 * 60 * 1000,      // 3 hours
      meetup: 2 * 60 * 60 * 1000,       // 2 hours
      seminar: 90 * 60 * 1000,          // 90 minutes
    };

    const eventType = args.eventType || "meetup";
    const defaultDuration = durationDefaults[eventType] || 2 * 60 * 60 * 1000; // 2 hours fallback

    const endTimestamp = args.endDate
      ? new Date(args.endDate).getTime()
      : startTimestamp + defaultDuration;

    // Validate: end must be after start
    if (endTimestamp <= startTimestamp) {
      throw new Error("Event end time must be after start time");
    }

    // Validate: minimum duration of 15 minutes
    const durationMs = endTimestamp - startTimestamp;
    if (durationMs < 15 * 60 * 1000) {
      throw new Error("Event must be at least 15 minutes long");
    }

    const eventId = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalCreateEvent, {
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
      published: args.published !== false, // Default to true (published)
    });

    // Format duration for display
    const durationHours = Math.round(durationMs / (60 * 60 * 1000) * 10) / 10; // Round to 1 decimal
    const durationDisplay = durationHours < 1
      ? `${Math.round(durationMs / (60 * 1000))} minutes`
      : `${durationHours} hours`;

    return {
      success: true,
      message: `✅ Created event: ${args.title}`,
      eventId,
      details: {
        name: args.title,
        startDate: args.startDate,
        endDate: args.endDate || `Auto: ${durationDisplay} after start`,
        location: args.location,
        capacity: args.capacity || "Unlimited",
        type: eventType,
        timezone: args.timezone || "America/Los_Angeles",
        status: args.published !== false ? "Published" : "Draft",
      }
    };
  }
};

const listEventsTool: AITool = {
  name: "list_events",
  description: "Get a list of all events (upcoming or past)",
  status: "placeholder",
  windowName: "Events",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Maximum results", default: 20 },
      upcoming: { type: "boolean", description: "Only upcoming events", default: true }
    }
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `Let me help you view your ${args.upcoming ? "upcoming" : "all"} events!`,
      tutorialSteps: [
        "Click the **Events** icon in your taskbar (📅)",
        args.upcoming ? "You'll see upcoming events by default" : "Click **View All Events** to see past events too",
        "Click on any event to view details"
      ]
    };
  }
};

const updateEventTool: AITool = {
  name: "update_event",
  description: "Update an existing event's details",
  status: "placeholder",
  windowName: "Events",
  parameters: {
    type: "object",
    properties: {
      eventId: { type: "string", description: "Event ID" },
      updates: { type: "object", description: "Fields to update" }
    },
    required: ["eventId", "updates"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: "I can guide you through updating an event!",
      tutorialSteps: [
        "Open the **Events** window",
        "Find and click on the event you want to update",
        "Click the **Edit** button",
        "Make your changes",
        "Click **Save Changes**"
      ]
    };
  }
};

const registerAttendeeTool: AITool = {
  name: "register_attendee",
  description: "Register an attendee for an event",
  status: "placeholder",
  windowName: "Events",
  parameters: {
    type: "object",
    properties: {
      eventId: { type: "string", description: "Event ID" },
      attendeeEmail: { type: "string", description: "Attendee email" },
      attendeeName: { type: "string", description: "Attendee name" }
    },
    required: ["eventId", "attendeeEmail"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `Let me help you register ${args.attendeeName || args.attendeeEmail} for this event!`,
      tutorialSteps: [
        "Open the **Events** window",
        "Click on the event",
        "Go to the **Attendees** tab",
        "Click **+ Add Attendee**",
        `Enter: **${args.attendeeName || ""} (${args.attendeeEmail})**`,
        "Click **Register**"
      ]
    };
  }
};

/**
 * 3. FORMS TOOLS
 */

const createFormTool: AITool = {
  name: "create_form",
  description: "Create a new form (registration, survey, application, etc.)",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Form title" },
      description: { type: "string", description: "Form description" },
      formType: { type: "string", enum: ["registration", "survey", "application"], description: "Type of form", default: "registration" },
      fields: {
        type: "array",
        description: "Form fields (optional, can add later)",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            type: { type: "string", enum: ["text", "email", "number", "select", "textarea"] },
            required: { type: "boolean" }
          }
        }
      }
    },
    required: ["title"]
  },
  execute: async (ctx, args) => {
    const formId = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalCreateForm, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      subtype: args.formType || "registration",
      name: args.title,
      description: args.description,
      fields: args.fields,
    });

    return {
      success: true,
      message: `✅ Created form: ${args.title}`,
      formId,
      details: {
        name: args.title,
        type: args.formType || "registration",
        fieldCount: args.fields?.length || 0,
      }
    };
  }
};

const listFormsTool: AITool = {
  name: "list_forms",
  description: "Get a list of all forms",
  status: "placeholder",
  windowName: "Forms",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Maximum results", default: 20 },
      status: { type: "string", enum: ["active", "inactive", "all"], default: "all" }
    }
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: "Let me help you view your forms!",
      tutorialSteps: [
        "Click the **Forms** icon in your taskbar",
        args.status !== "all" ? `Filter by status: **${args.status}**` : "You'll see all your forms here",
        "Click on any form to view details or edit"
      ]
    };
  }
};

const publishFormTool: AITool = {
  name: "publish_form",
  description: "Make a form live and available for submissions",
  status: "placeholder",
  windowName: "Forms",
  parameters: {
    type: "object",
    properties: {
      formId: { type: "string", description: "Form ID to publish" }
    },
    required: ["formId"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: "I can help you publish your form!",
      tutorialSteps: [
        "Open the **Forms** window",
        "Find and click on your form",
        "Click the **Publish** button",
        "Copy the form URL to share with others"
      ]
    };
  }
};

const getFormResponsesTool: AITool = {
  name: "get_form_responses",
  description: "Retrieve submissions for a specific form",
  status: "placeholder",
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
    return {
      success: false,
      status: "placeholder",
      message: "Let me help you view form responses!",
      tutorialSteps: [
        "Open the **Forms** window",
        "Click on your form",
        "Go to the **Responses** tab",
        "You'll see all submissions here",
        "Click **Export** to download as CSV"
      ]
    };
  }
};

/**
 * 4. PRODUCTS TOOLS
 */

const createProductTool: AITool = {
  name: "create_product",
  description: "Create a new product or service to sell",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Product name" },
      description: { type: "string", description: "Product description" },
      price: { type: "number", description: "Price in dollars (will be converted to cents)" },
      currency: { type: "string", description: "Currency code (USD, EUR, etc.)", default: "USD" },
      inventory: { type: "number", description: "Stock quantity (optional)" },
      productType: { type: "string", enum: ["ticket", "physical", "digital"], description: "Type of product", default: "physical" }
    },
    required: ["name", "price"]
  },
  execute: async (ctx, args) => {
    // Convert dollars to cents
    const priceInCents = Math.round(args.price * 100);

    const productId = await ctx.runMutation(internal.ai.tools.internalToolMutations.internalCreateProduct, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      subtype: args.productType || "physical",
      name: args.name,
      description: args.description,
      price: priceInCents,
      currency: args.currency || "USD",
      inventory: args.inventory,
    });

    return {
      success: true,
      message: `✅ Created product: ${args.name}`,
      productId,
      details: {
        name: args.name,
        price: `$${args.price} ${args.currency || "USD"}`,
        type: args.productType || "physical",
        inventory: args.inventory || "Unlimited",
      }
    };
  }
};

const listProductsTool: AITool = {
  name: "list_products",
  description: "Get a list of all products",
  status: "placeholder",
  windowName: "Products",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Maximum results", default: 20 },
      status: { type: "string", enum: ["active", "inactive", "all"], default: "all" }
    }
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: "Let me help you view your products!",
      tutorialSteps: [
        "Click the **Products** icon in your taskbar",
        args.status !== "all" ? `Filter by status: **${args.status}**` : "You'll see all your products here",
        "Click on any product to edit details or view sales"
      ]
    };
  }
};

const updateProductPriceTool: AITool = {
  name: "set_product_price",
  description: "Update the price of a product",
  status: "placeholder",
  windowName: "Products",
  parameters: {
    type: "object",
    properties: {
      productId: { type: "string", description: "Product ID" },
      newPrice: { type: "number", description: "New price in dollars" }
    },
    required: ["productId", "newPrice"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `Let me help you update the price to $${args.newPrice}!`,
      tutorialSteps: [
        "Open the **Products** window",
        "Find and click on the product",
        "Click the **Edit** button",
        `Change the price to: **$${args.newPrice}**`,
        "Click **Save Changes**"
      ]
    };
  }
};

/**
 * 5. INVOICING/PAYMENTS TOOLS
 */

const createInvoiceTool: AITool = {
  name: "create_invoice",
  description: "Generate a new invoice for a customer",
  status: "placeholder",
  windowName: "Payments",
  tutorialSteps: [
    "Click the **Payments** icon in your taskbar",
    "Go to the **Invoices** tab",
    "Click **+ New Invoice**",
    "Select customer and add line items",
    "Click **Generate Invoice**"
  ],
  parameters: {
    type: "object",
    properties: {
      customerId: { type: "string", description: "Customer ID or email" },
      items: {
        type: "array",
        description: "Invoice line items",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            quantity: { type: "number" },
            price: { type: "number" }
          }
        }
      },
      dueDate: { type: "string", description: "Payment due date (ISO 8601)" }
    },
    required: ["customerId", "items"]
  },
  execute: async (ctx, args) => {
    const total = args.items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0);
    return {
      success: false,
      status: "placeholder",
      message: `I can help you create an invoice for ${args.customerId}!`,
      tutorialSteps: [
        "Click the **Payments** icon in your taskbar",
        "Go to the **Invoices** tab",
        "Click **+ New Invoice**",
        `Select customer: **${args.customerId}**`,
        `Add line items (Total: $${total.toFixed(2)})`,
        args.dueDate ? `Set due date: **${args.dueDate}**` : "Set a due date",
        "Click **Generate Invoice**"
      ]
    };
  }
};

const sendInvoiceTool: AITool = {
  name: "send_invoice",
  description: "Email an invoice to a customer",
  status: "placeholder",
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
    return {
      success: false,
      status: "placeholder",
      message: "Let me help you send this invoice!",
      tutorialSteps: [
        "Open the **Payments** window → **Invoices** tab",
        "Find and click on the invoice",
        "Click the **Send Invoice** button",
        args.emailMessage ? `Add your message: "${args.emailMessage}"` : "Add a message (optional)",
        "Click **Send Email**"
      ]
    };
  }
};

const processPaymentTool: AITool = {
  name: "process_payment",
  description: "Charge a customer's credit card or payment method",
  status: "placeholder",
  windowName: "Payments",
  parameters: {
    type: "object",
    properties: {
      customerId: { type: "string", description: "Customer ID" },
      amount: { type: "number", description: "Amount in dollars" },
      description: { type: "string", description: "Payment description" }
    },
    required: ["customerId", "amount"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `⚠️ Processing payments requires manual confirmation. Let me guide you through charging $${args.amount}:`,
      tutorialSteps: [
        "Open the **Payments** window",
        "Go to the **Process Payment** tab",
        `Select customer: **${args.customerId}**`,
        `Enter amount: **$${args.amount}**`,
        args.description ? `Description: ${args.description}` : "Add a description",
        "**Review carefully before proceeding**",
        "Click **Charge Card**"
      ]
    };
  }
};

/**
 * 6. TICKETS/SUPPORT TOOLS
 */

const createTicketTool: AITool = {
  name: "create_ticket",
  description: "Create a support ticket or help desk request",
  status: "placeholder",
  windowName: "Tickets",
  tutorialSteps: [
    "Click the **Tickets** icon in your taskbar",
    "Click **+ New Ticket**",
    "Fill in ticket subject and description",
    "Set priority and assign to team member",
    "Click **Create Ticket**"
  ],
  parameters: {
    type: "object",
    properties: {
      subject: { type: "string", description: "Ticket subject/title" },
      description: { type: "string", description: "Detailed description" },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"], default: "medium" },
      assignee: { type: "string", description: "Team member to assign" }
    },
    required: ["subject", "description"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `I can help you create a ticket: "${args.subject}"`,
      tutorialSteps: [
        "Click the **Tickets** icon in your taskbar",
        "Click **+ New Ticket**",
        `Fill in:
   - Subject: **${args.subject}**
   - Description: ${args.description}
   - Priority: **${args.priority || "Medium"}**
   - Assignee: ${args.assignee || "[Select team member]"}`,
        "Click **Create Ticket**"
      ]
    };
  }
};

const updateTicketStatusTool: AITool = {
  name: "update_ticket_status",
  description: "Change a ticket's status (open, in-progress, resolved, closed)",
  status: "placeholder",
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
    return {
      success: false,
      status: "placeholder",
      message: `Let me help you update the ticket status to "${args.newStatus}"!`,
      tutorialSteps: [
        "Open the **Tickets** window",
        "Find and click on the ticket",
        "Click the **Status** dropdown",
        `Select: **${args.newStatus}**`,
        "The ticket status will update automatically"
      ]
    };
  }
};

const listTicketsTool: AITool = {
  name: "list_tickets",
  description: "Get a list of all support tickets",
  status: "placeholder",
  windowName: "Tickets",
  parameters: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["open", "in_progress", "resolved", "closed", "all"], default: "all" },
      limit: { type: "number", description: "Maximum results", default: 20 }
    }
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: "Let me help you view your tickets!",
      tutorialSteps: [
        "Click the **Tickets** icon in your taskbar",
        args.status !== "all" ? `Filter by status: **${args.status}**` : "You'll see all tickets here",
        "Click on any ticket to view details and add comments"
      ]
    };
  }
};

/**
 * 7. WORKFLOWS/AUTOMATION TOOLS
 */

const createWorkflowTool: AITool = {
  name: "create_workflow",
  description: "Create an automated workflow (if-this-then-that style)",
  status: "placeholder",
  windowName: "Workflows",
  tutorialSteps: [
    "Click the **Workflows** icon in your taskbar",
    "Click **+ New Workflow**",
    "Choose a trigger (event happens, form submitted, etc.)",
    "Add actions (send email, create contact, etc.)",
    "Click **Save & Enable Workflow**"
  ],
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Workflow name" },
      trigger: { type: "string", description: "What triggers this workflow" },
      actions: { type: "array", items: { type: "string" }, description: "Actions to perform" }
    },
    required: ["name", "trigger"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `I can help you create the "${args.name}" workflow!`,
      tutorialSteps: [
        "Click the **Workflows** icon in your taskbar",
        "Click **+ New Workflow**",
        `Name it: **${args.name}**`,
        `Set trigger: ${args.trigger}`,
        args.actions ? `Add these actions: ${args.actions.join(", ")}` : "Add your actions",
        "Click **Save & Enable Workflow**"
      ]
    };
  }
};

const enableWorkflowTool: AITool = {
  name: "enable_workflow",
  description: "Activate an automation workflow",
  status: "placeholder",
  windowName: "Workflows",
  parameters: {
    type: "object",
    properties: {
      workflowId: { type: "string", description: "Workflow ID to enable" }
    },
    required: ["workflowId"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: "Let me help you enable this workflow!",
      tutorialSteps: [
        "Open the **Workflows** window",
        "Find your workflow in the list",
        "Click the **Enable** toggle switch",
        "The workflow is now active! ✅"
      ]
    };
  }
};

/**
 * 8. MEDIA LIBRARY TOOLS
 */

const uploadMediaTool: AITool = {
  name: "upload_media",
  description: "Upload a file or image to your media library",
  status: "placeholder",
  windowName: "Media",
  tutorialSteps: [
    "Click the **Media** icon in your taskbar",
    "Click **Upload File** or drag-and-drop",
    "Select your file",
    "Add a title and description (optional)",
    "Click **Upload**"
  ],
  parameters: {
    type: "object",
    properties: {
      fileName: { type: "string", description: "File name" },
      fileType: { type: "string", description: "File type (image, video, document)" },
      folder: { type: "string", description: "Folder to organize file" }
    },
    required: ["fileName"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `I can help you upload "${args.fileName}"!`,
      tutorialSteps: [
        "Click the **Media** icon in your taskbar",
        "Click **Upload File** or drag-and-drop your file",
        `Select your file: **${args.fileName}**`,
        args.folder ? `Choose folder: **${args.folder}**` : "Choose a folder (optional)",
        "Click **Upload**"
      ]
    };
  }
};

const searchMediaTool: AITool = {
  name: "search_media",
  description: "Search for files in your media library",
  status: "placeholder",
  windowName: "Media",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search term (file name, tag, etc.)" },
      fileType: { type: "string", enum: ["all", "images", "videos", "documents"], default: "all" }
    },
    required: ["query"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `Let me help you search for: ${args.query}`,
      tutorialSteps: [
        "Open the **Media** window",
        `Use the search bar and type: **${args.query}**`,
        args.fileType !== "all" ? `Filter by: **${args.fileType}**` : "You'll see all matching files",
        "Click on any file to view details or download"
      ]
    };
  }
};

/**
 * 9. EMAIL TEMPLATES TOOLS
 */

const createTemplateTool: AITool = {
  name: "create_template",
  description: "Create an email template for reuse",
  status: "placeholder",
  windowName: "Templates",
  tutorialSteps: [
    "Click the **Templates** icon in your taskbar",
    "Click **+ New Template**",
    "Design your email (subject, body, variables)",
    "Click **Save Template**"
  ],
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Template name" },
      subject: { type: "string", description: "Email subject line" },
      body: { type: "string", description: "Email body (supports HTML)" },
      variables: { type: "array", items: { type: "string" }, description: "Merge variables (e.g., {{firstName}})" }
    },
    required: ["name", "subject", "body"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `I can help you create the "${args.name}" email template!`,
      tutorialSteps: [
        "Click the **Templates** icon in your taskbar",
        "Click **+ New Template**",
        `Template name: **${args.name}**`,
        `Subject: ${args.subject}`,
        "Write your email body (use {{firstName}}, {{company}}, etc. for personalization)",
        "Click **Save Template**"
      ]
    };
  }
};

const sendEmailFromTemplateTool: AITool = {
  name: "send_email_from_template",
  description: "Send an email using a saved template",
  status: "placeholder",
  windowName: "Templates",
  parameters: {
    type: "object",
    properties: {
      templateId: { type: "string", description: "Template ID to use" },
      recipientEmail: { type: "string", description: "Recipient email address" },
      variables: { type: "object", description: "Variables to fill in (firstName, company, etc.)" }
    },
    required: ["templateId", "recipientEmail"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `Let me help you send an email to ${args.recipientEmail}!`,
      tutorialSteps: [
        "Open the **Templates** window",
        "Find and click on your template",
        "Click **Use Template**",
        `Enter recipient: **${args.recipientEmail}**`,
        args.variables ? "Fill in personalization variables" : "Review the email content",
        "Click **Send Email**"
      ]
    };
  }
};

/**
 * 10. WEB PUBLISHING TOOLS
 */

const createPageTool: AITool = {
  name: "create_page",
  description: "Create a new website page",
  status: "placeholder",
  windowName: "Web Publishing",
  tutorialSteps: [
    "Click the **Web Publishing** icon in your taskbar",
    "Click **+ New Page**",
    "Choose a template or start blank",
    "Design your page with the visual editor",
    "Click **Publish Page**"
  ],
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Page title" },
      slug: { type: "string", description: "URL slug (e.g., 'about-us')" },
      template: { type: "string", description: "Template to use" }
    },
    required: ["title", "slug"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `I can help you create a page: "${args.title}"!`,
      tutorialSteps: [
        "Click the **Web Publishing** icon in your taskbar",
        "Click **+ New Page**",
        `Page title: **${args.title}**`,
        `URL slug: **${args.slug}**`,
        args.template ? `Choose template: **${args.template}**` : "Choose a template or start blank",
        "Design your page content",
        "Click **Publish Page**"
      ]
    };
  }
};

const publishPageTool: AITool = {
  name: "publish_page",
  description: "Make a page live on your website",
  status: "placeholder",
  windowName: "Web Publishing",
  parameters: {
    type: "object",
    properties: {
      pageId: { type: "string", description: "Page ID to publish" }
    },
    required: ["pageId"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: "Let me help you publish this page!",
      tutorialSteps: [
        "Open the **Web Publishing** window",
        "Find and click on your page",
        "Click the **Publish** button",
        "Your page is now live! 🚀",
        "Click **View Live Page** to see it"
      ]
    };
  }
};

/**
 * 11. CHECKOUT TOOLS
 */

const createCheckoutPageTool: AITool = {
  name: "create_checkout_page",
  description: "Create a custom checkout page for products",
  status: "placeholder",
  windowName: "Checkout",
  tutorialSteps: [
    "Click the **Checkout** icon in your taskbar",
    "Click **+ New Checkout**",
    "Select products to include",
    "Configure payment methods (Stripe, PayPal)",
    "Click **Create Checkout**"
  ],
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Checkout page name" },
      productIds: { type: "array", items: { type: "string" }, description: "Products to include" },
      paymentMethods: { type: "array", items: { type: "string" }, description: "Payment methods (stripe, paypal, etc.)" }
    },
    required: ["name", "productIds"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `I can help you create a checkout page: "${args.name}"!`,
      tutorialSteps: [
        "Click the **Checkout** icon in your taskbar",
        "Click **+ New Checkout**",
        `Name: **${args.name}**`,
        "Select products to sell",
        args.paymentMethods ? `Enable: **${args.paymentMethods.join(", ")}**` : "Configure payment methods",
        "Click **Create Checkout**",
        "Copy the checkout URL to share"
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
  status: "placeholder",
  windowName: "Certificates",
  tutorialSteps: [
    "Click the **Certificates** icon in your taskbar",
    "Click **+ New Certificate**",
    "Choose a template",
    "Fill in recipient details",
    "Click **Generate**"
  ],
  parameters: {
    type: "object",
    properties: {
      recipientName: { type: "string", description: "Certificate recipient name" },
      certificateType: { type: "string", description: "Type of certificate (completion, achievement, etc.)" },
      eventName: { type: "string", description: "Related event or course name" },
      issueDate: { type: "string", description: "Date of issue" }
    },
    required: ["recipientName", "certificateType"]
  },
  execute: async (ctx, args) => {
    return {
      success: false,
      status: "placeholder",
      message: `I can help you generate a certificate for ${args.recipientName}!`,
      tutorialSteps: [
        "Click the **Certificates** icon in your taskbar",
        "Click **+ New Certificate**",
        "Choose a certificate template",
        `Recipient: **${args.recipientName}**`,
        `Type: **${args.certificateType}**`,
        args.eventName ? `For: **${args.eventName}**` : "Add event/course name",
        "Click **Generate Certificate**",
        "Download PDF or send via email"
      ]
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

  // Forms
  create_form: createFormTool,
  list_forms: listFormsTool,
  publish_form: publishFormTool,
  get_form_responses: getFormResponsesTool,

  // Products
  create_product: createProductTool,
  list_products: listProductsTool,
  set_product_price: updateProductPriceTool,

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

  // Certificates
  generate_certificate: generateCertificateTool,

  // Settings
  update_organization_settings: updateOrganizationSettingsTool,
  configure_ai_models: configureAIModelsTool,
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

/**
 * Convert tool definitions to OpenAI function calling format
 * ONLY return tools that are "ready" - placeholder tools handled by AI system prompt
 */
export function getToolSchemas(): Array<any> {
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
  ctx: any,
  toolName: string,
  args: any
): Promise<any> {
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
