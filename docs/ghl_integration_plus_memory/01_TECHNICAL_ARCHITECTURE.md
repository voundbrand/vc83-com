# Technical Architecture — GHL Integration + Memory Engine

**Last Updated:** 2025-02-05

---

## System Overview

The GHL Memory Engine integrates with our existing agent execution pipeline, adding four layers of intelligent context management between GHL's raw message webhooks and our AI agent responses.

### **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GHL Account (Customer)                       │
│  • Contacts (CRM)                                                    │
│  • Conversations (SMS, Email, WhatsApp, FB Messenger)               │
│  • Workflows (automation)                                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ Webhook: POST /api/webhooks/ghl
                               │ Payload: InboundMessage
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    l4yercak3 Webhook Handler                         │
│  File: convex/http.ts → /webhooks/ghl                               │
│  - Verify webhook signature (HMAC)                                  │
│  - Parse GHL payload                                                │
│  - Resolve organizationId from API key                              │
│  - Schedule async processing                                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ Schedule: processGHLWebhook
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Webhook Processor (Internal Action)                     │
│  File: convex/channels/webhooks.ts                                  │
│  - Normalize GHL payload to NormalizedInboundMessage                │
│  - Extract: channel, contact ID, message content                    │
│  - Pass to agent execution pipeline                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ Action: agentExecution.processInboundMessage
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Agent Execution Pipeline                           │
│  File: convex/ai/agentExecution.ts                                  │
│                                                                      │
│  Step 1: Load Agent Config                                          │
│  Step 2: Check Rate Limits                                          │
│  Step 3: Resolve/Create Session                                     │
│  Step 4: Resolve CRM Contact                                        │
│  ┌────────────────────────────────────────────────────────┐         │
│  │  Step 5: BUILD MEMORY CONTEXT (NEW!)                  │         │
│  │  File: convex/ai/memoryEngine.ts                       │         │
│  │  ┌──────────────────────────────────────────────────┐  │         │
│  │  │ Layer 1: Recent Context (last 10-15 messages)   │  │         │
│  │  │ Layer 2: Session Summary (auto-generated)       │  │         │
│  │  │ Layer 3: Operator Pinned Notes (human-curated)★ │  │         │
│  │  │ Layer 4: Contact Profile (structured facts)     │  │         │
│  │  │ Layer 5: Reactivation Context (if > 7 days)     │  │         │
│  │  └──────────────────────────────────────────────────┘  │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                      │
│  Step 6: Build System Prompt (inject memory context)                │
│  Step 7: Call LLM (Sonnet 4.5 with enriched context)                │
│  Step 8: Handle Tool Calls (if any)                                 │
│  Step 9: Save Messages (user + assistant)                           │
│  ┌────────────────────────────────────────────────────────┐         │
│  │  Step 10: UPDATE MEMORY (NEW!)                        │         │
│  │  - Extract facts → update contact profile             │         │
│  │  - Check if summary needed (every 10 messages)        │         │
│  │  - Generate/update session summary                    │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                      │
│  Step 11: Update Session Stats                                      │
│  Step 12: Audit Log                                                 │
│  Step 13: Route Response (send back to GHL)                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ Action: channels.router.sendMessage
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Channel Router                                   │
│  File: convex/channels/router.ts                                    │
│  - Load GHL provider credentials                                    │
│  - Call ghlProvider.sendMessage()                                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ API: POST /conversations/messages
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GHL API (Outbound)                                │
│  Endpoint: services.leadconnectorhq.com                             │
│  - Delivers response to customer via SMS/Email/WhatsApp             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Model Extensions

### **New Table: `memorySnapshots`**

Stores compressed memory snapshots for efficient context loading.

```typescript
// convex/schemas/memorySchemas.ts

export const memorySnapshots = defineTable({
  // Links to session
  sessionId: v.id("agentSessions"),
  organizationId: v.id("organizations"),

  // Snapshot metadata
  snapshotType: v.union(
    v.literal("session_summary"),
    v.literal("contact_extraction"),
    v.literal("reactivation_context")
  ),

  // Memory content
  content: v.string(), // The actual summary/extraction/context text

  // Structured data (for contact_extraction)
  structuredData: v.optional(v.object({
    preferences: v.optional(v.record(v.string(), v.any())),
    painPoints: v.optional(v.array(v.string())),
    objectionsAddressed: v.optional(v.array(v.object({
      objection: v.string(),
      resolved: v.boolean(),
      resolution: v.optional(v.string()),
    }))),
    productsDiscussed: v.optional(v.array(v.string())),
    currentStage: v.optional(v.string()),
    nextStep: v.optional(v.string()),
  })),

  // Versioning
  messageCountAtSnapshot: v.number(), // Snapshot created after N messages
  createdAt: v.number(),

  // For reactivation detection
  lastInteractionAt: v.optional(v.number()),
})
  .index("by_session", ["sessionId"])
  .index("by_session_type", ["sessionId", "snapshotType"])
  .index("by_org", ["organizationId"]);
```

### **Extended: `agentSessions` Table**

Add memory-related fields to existing table:

```typescript
// Add to convex/schemas/agentSessionSchemas.ts

export const agentSessions = defineTable({
  // ... existing fields ...

  // NEW: Memory management
  currentSummary: v.optional(v.string()), // Latest session summary
  lastSummaryAt: v.optional(v.number()), // When summary was last generated
  messagesSinceSummary: v.optional(v.number()), // Counter for summary trigger

  // NEW: Reactivation detection
  isReactivation: v.optional(v.boolean()), // True if > 7 days since last message
  reactivationContext: v.optional(v.string()), // Pre-generated context for reactivation

  // NEW: Memory tier usage (for analytics)
  memoryTier: v.optional(v.union(
    v.literal("basic"),      // Layer 1 only
    v.literal("standard"),   // Layer 1 + 2
    v.literal("advanced"),   // Layer 1 + 2 + 3
    v.literal("premium"),    // All 4 layers
  )),
});
```

### **Extended: `objects` Table (CRM Contacts)**

Enhance contact profiles with memory-extracted data:

```typescript
// When type="crm_contact", add to customProperties:

{
  type: "crm_contact",
  customProperties: {
    // ... existing contact fields ...

    // NEW: AI-Extracted Memory
    aiMemory: {
      // Preferences (budget, timeline, authority)
      preferences: {
        budget_range?: string,
        timeline?: string,
        decision_maker?: boolean,
        preferred_contact_method?: "sms" | "email" | "whatsapp",
        preferred_contact_time?: string,
      },

      // Pain points mentioned
      painPoints: string[], // ["Current CRM too complex", "Need better automation"]

      // Objections and resolutions
      objectionsAddressed: Array<{
        objection: string,
        resolved: boolean,
        resolution?: string,
        addressedAt: number,
      }>,

      // Products/services discussed
      productsDiscussed: Array<{
        productName: string,
        interest_level: "low" | "medium" | "high",
        discussedAt: number,
      }>,

      // Current stage in buyer journey
      currentStage: "awareness" | "consideration" | "decision" | "customer" | "churned",

      // Next steps agreed upon
      nextStep?: {
        action: string,
        dueDate?: number,
        assignedTo?: string,
      },

      // Last interaction summary
      lastInteractionSummary?: string,

      // Metadata
      lastExtractedAt: number,
      extractionCount: number,
    },

    // NEW: GHL Sync Fields
    ghlContactId?: string, // Map to GHL contact ID
    ghlLocationId?: string, // GHL sub-account location
    ghlTags?: string[], // Sync tags from GHL
    ghlCustomFields?: Record<string, unknown>, // Sync custom fields
  }
}
```

---

## Core Services

### **1. Memory Engine Service**

**File:** `convex/ai/memoryEngine.ts`

**Responsibilities:**
- Build 4-layer memory context for agent
- Trigger summarization when needed
- Extract facts from conversations
- Detect reactivation scenarios

**Key Functions:**

```typescript
/**
 * Build memory context for an agent conversation
 * Returns formatted string to inject into system prompt
 */
export const buildMemoryContext = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
    crmContactId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args): Promise<{
    contextText: string,
    tokensEstimate: number,
    layersUsed: string[],
  }> => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    const layers: string[] = [];
    let contextText = "";

    // Layer 1: Recent Context (last 10-15 messages)
    const recentMessages = await getRecentMessages(ctx, args.sessionId, 15);
    const layer1 = formatRecentContext(recentMessages);
    contextText += `\n## Recent Conversation\n${layer1}\n`;
    layers.push("recent_context");

    // Layer 2: Session Summary (if exists)
    if (session.currentSummary) {
      contextText += `\n## Conversation Summary\n${session.currentSummary}\n`;
      layers.push("session_summary");
    }

    // Layer 3: Contact Profile (if linked)
    if (args.crmContactId) {
      const contact = await ctx.db.get(args.crmContactId);
      const layer3 = formatContactMemory(contact);
      if (layer3) {
        contextText += `\n## Contact Profile\n${layer3}\n`;
        layers.push("contact_profile");
      }
    }

    // Layer 4: Reactivation Context (if > 7 days)
    const daysSinceLastMessage = (Date.now() - session.lastMessageAt) / (1000 * 60 * 60 * 24);
    if (daysSinceLastMessage > 7 && session.reactivationContext) {
      contextText += `\n## Previous Context\n${session.reactivationContext}\n`;
      layers.push("reactivation_context");
    }

    return {
      contextText,
      tokensEstimate: estimateTokens(contextText),
      layersUsed: layers,
    };
  },
});

/**
 * Determine if session needs summarization
 * Trigger: every 10 messages or when inactive for 24h
 */
export const checkSummarizationNeeded = internalQuery({
  args: { sessionId: v.id("agentSessions") },
  handler: async (ctx, args): Promise<boolean> => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return false;

    // Check message count trigger
    const messagesSinceSummary = session.messagesSinceSummary || 0;
    if (messagesSinceSummary >= 10) return true;

    // Check time trigger (24h inactive)
    const hoursSinceLastSummary = (Date.now() - (session.lastSummaryAt || 0)) / (1000 * 60 * 60);
    const hoursSinceLastMessage = (Date.now() - session.lastMessageAt) / (1000 * 60 * 60);

    if (hoursSinceLastSummary > 24 && hoursSinceLastMessage > 24) {
      return true;
    }

    return false;
  },
});

/**
 * Generate session summary using LLM
 * Reads last N messages and creates compressed summary
 */
export const generateSessionSummary = internalAction({
  args: { sessionId: v.id("agentSessions") },
  handler: async (ctx, args): Promise<string> => {
    // Load messages
    const messages = await ctx.runQuery(internal.ai.agentSessions.getSessionMessages, {
      sessionId: args.sessionId,
      limit: 50, // Summarize last 50 messages
    });

    // Build summarization prompt
    const prompt = buildSummarizationPrompt(messages);

    // Call LLM to generate summary
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OpenRouter API key not configured");

    const client = new OpenRouterClient(apiKey);
    const response = await client.chatCompletion({
      model: "anthropic/claude-sonnet-4-20250514",
      messages: [
        { role: "system", content: "You are a conversation summarizer. Create concise summaries of customer conversations." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const summary = response.choices[0]?.message?.content || "No summary generated";

    // Save summary
    await ctx.runMutation(internal.ai.memoryEngine.saveSummary, {
      sessionId: args.sessionId,
      summary,
    });

    return summary;
  },
});

/**
 * Extract facts from conversation and update contact profile
 */
export const extractContactFacts = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
    crmContactId: v.id("objects"),
    conversationContent: v.string(),
  },
  handler: async (ctx, args): Promise<{
    extracted: Record<string, unknown>,
    updatedFields: string[],
  }> => {
    // Build extraction prompt
    const prompt = buildExtractionPrompt(args.conversationContent);

    // Call LLM with structured output
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OpenRouter API key not configured");

    const client = new OpenRouterClient(apiKey);
    const response = await client.chatCompletion({
      model: "anthropic/claude-sonnet-4-20250514",
      messages: [
        {
          role: "system",
          content: `You are a data extraction specialist. Extract structured facts from customer conversations.

Output JSON with these fields:
- preferences: { budget_range?, timeline?, decision_maker?, preferred_contact? }
- painPoints: string[]
- objectionsAddressed: { objection, resolved, resolution? }[]
- productsDiscussed: string[]
- currentStage: "awareness" | "consideration" | "decision"
- nextStep: string?`,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 800,
    });

    const extracted = JSON.parse(response.choices[0]?.message?.content || "{}");

    // Update contact profile
    const updatedFields = await ctx.runMutation(internal.ai.memoryEngine.updateContactMemory, {
      crmContactId: args.crmContactId,
      extractedData: extracted,
    });

    return { extracted, updatedFields };
  },
});
```

---

### **2. GHL Provider Implementation**

**File:** `convex/integrations/gohighlevel.ts`

**Implements:** `ChannelProvider` interface

**Key Methods:**

```typescript
export const ghlProvider: ChannelProvider = {
  id: "gohighlevel",
  name: "GoHighLevel",

  capabilities: {
    supportedChannels: ["sms", "email", "whatsapp", "facebook_messenger"],
    supportsInbound: true,
    supportsOutbound: true,
    supportsWebhooks: true,
    supportsAttachments: false,
    supportsTemplates: true,
    supportsConversationThreading: true,
  },

  /**
   * Normalize GHL webhook payload to our internal format
   */
  normalizeInbound(rawPayload, credentials) {
    // GHL webhook format:
    // {
    //   type: "InboundMessage",
    //   id: "msg_xxx",
    //   conversationId: "conv_xxx",
    //   contactId: "contact_xxx",
    //   locationId: "loc_xxx",
    //   messageType: "SMS" | "Email" | "WhatsApp" | "FB",
    //   body: "message text",
    //   dateAdded: "2024-01-01T00:00:00Z",
    // }

    if (rawPayload.type !== "InboundMessage") {
      return null; // Not a message we handle
    }

    const channelMap: Record<string, ChannelType> = {
      SMS: "sms",
      Email: "email",
      WhatsApp: "whatsapp",
      FB: "facebook_messenger",
      GMB: "google_business_messages",
    };

    const channel = channelMap[rawPayload.messageType as string] || "sms";

    return {
      organizationId: credentials.organizationId as string,
      channel,
      externalContactIdentifier: rawPayload.contactId as string,
      message: rawPayload.body as string,
      messageType: "text",
      metadata: {
        providerId: "gohighlevel",
        providerMessageId: rawPayload.id as string,
        providerConversationId: rawPayload.conversationId as string,
        senderName: rawPayload.contactName as string,
        raw: rawPayload,

        // GHL-specific metadata
        ghlLocationId: rawPayload.locationId as string,
        ghlContactId: rawPayload.contactId as string,
      },
    };
  },

  /**
   * Send message back to GHL
   */
  async sendMessage(credentials, message) {
    const typeMap: Record<ChannelType, string> = {
      sms: "SMS",
      email: "Email",
      whatsapp: "WhatsApp",
      facebook_messenger: "FB",
    };

    const response = await fetch(
      "https://services.leadconnectorhq.com/conversations/messages",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.ghlApiKey}`,
          "Content-Type": "application/json",
          Version: "2021-07-28", // GHL API version
        },
        body: JSON.stringify({
          type: typeMap[message.channel] || "SMS",
          contactId: message.recipientIdentifier,
          conversationId: message.metadata?.providerConversationId,
          message: message.content,
          html: message.contentHtml, // For email
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        providerMessageId: data.messageId,
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        error: `GHL API error: ${response.status} - ${errorText}`,
        retryable: response.status >= 500,
      };
    }
  },

  /**
   * Verify GHL webhook signature
   */
  verifyWebhook(body, headers, credentials) {
    // GHL uses HMAC-SHA256 signature in X-LC-Signature header
    const signature = headers["x-lc-signature"] || headers["x-lc-event-signature"];
    if (!signature) return false;

    const expectedSignature = createHmac("sha256", credentials.webhookSecret || "")
      .update(body)
      .digest("hex");

    return signature === expectedSignature;
  },

  /**
   * Test GHL API connection
   */
  async testConnection(credentials) {
    try {
      const response = await fetch(
        "https://services.leadconnectorhq.com/locations/",
        {
          headers: {
            Authorization: `Bearer ${credentials.ghlApiKey}`,
            Version: "2021-07-28",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          accountName: data.locations?.[0]?.name || "GHL Account",
        };
      } else {
        return {
          success: false,
          error: `Invalid API key or permissions (${response.status})`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
```

---

## Integration Points

### **Webhook Endpoint**

**Route:** `POST /api/webhooks/ghl`

**Handler:** `convex/http.ts`

```typescript
// Add to convex/http.ts

import { httpAction } from "./_generated/server";

const http = httpRouter();

// ... existing routes ...

// GHL Webhook Handler
http.route({
  path: "/webhooks/ghl",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    // 1. Verify signature
    const signature = headers["x-lc-signature"] || headers["x-lc-event-signature"];
    const apiKeyFromHeader = headers["x-api-key"]; // Custom header for org identification

    if (!apiKeyFromHeader) {
      return new Response("Missing API key", { status: 401 });
    }

    // Resolve organization from API key
    const org = await ctx.runQuery(internal.auth.resolveOrgFromApiKey, {
      apiKey: apiKeyFromHeader,
    });

    if (!org) {
      return new Response("Invalid API key", { status: 401 });
    }

    // Load GHL credentials for signature verification
    const ghlSettings = await ctx.runQuery(internal.integrations.ghl.getSettings, {
      organizationId: org._id,
    });

    if (!ghlSettings) {
      return new Response("GHL not configured", { status: 400 });
    }

    // Verify webhook signature
    const provider = getProvider("gohighlevel");
    const isValid = provider?.verifyWebhook(body, headers, {
      webhookSecret: ghlSettings.webhookSecret,
    });

    if (!isValid) {
      console.error("[GHL] Webhook signature verification failed");
      return new Response("Invalid signature", { status: 401 });
    }

    // 2. Schedule async processing (respond quickly to GHL)
    await ctx.scheduler.runAfter(0, internal.channels.webhooks.processGHLWebhook, {
      payload: body,
      organizationId: org._id,
    });

    return new Response("OK", { status: 200 });
  }),
});
```

### **Webhook Processor**

**File:** `convex/channels/webhooks.ts`

```typescript
/**
 * Process GHL webhook asynchronously
 */
export const processGHLWebhook = internalAction({
  args: {
    payload: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const provider = getProvider("gohighlevel");
    if (!provider) {
      console.error("[GHL] Provider not registered");
      return { status: "error", message: "GHL provider not registered" };
    }

    // Normalize inbound message
    const rawPayload = JSON.parse(args.payload);
    const normalized = provider.normalizeInbound(rawPayload, {
      organizationId: args.organizationId,
    } as ProviderCredentials);

    if (!normalized) {
      return { status: "skipped", message: "Not a handleable message" };
    }

    // Feed into agent execution pipeline
    const result = await ctx.runAction(api.ai.agentExecution.processInboundMessage, {
      organizationId: args.organizationId,
      channel: normalized.channel,
      externalContactIdentifier: normalized.externalContactIdentifier,
      message: normalized.message,
      metadata: normalized.metadata,
    });

    return result;
  },
});
```

---

## Performance Considerations

### **Context Window Management**

**Problem:** 4-layer memory could exceed token limits for long conversations

**Solution:** Dynamic layer prioritization

```typescript
function buildOptimizedMemoryContext(
  session: AgentSession,
  contact: CRMContact,
  maxTokens: number = 3000
): string {
  const layers = [];
  let currentTokens = 0;

  // Priority 1: Recent context (always include, but truncate if needed)
  const layer1 = buildRecentContext(session);
  currentTokens += estimateTokens(layer1);
  layers.push(layer1);

  // Priority 2: Contact profile (critical for personalization)
  if (currentTokens < maxTokens * 0.7) {
    const layer3 = buildContactProfile(contact);
    currentTokens += estimateTokens(layer3);
    layers.push(layer3);
  }

  // Priority 3: Session summary (useful but can be omitted)
  if (currentTokens < maxTokens * 0.85 && session.currentSummary) {
    const layer2 = buildSessionSummary(session);
    currentTokens += estimateTokens(layer2);
    layers.push(layer2);
  }

  // Priority 4: Reactivation context (only if space available)
  if (currentTokens < maxTokens * 0.95 && session.reactivationContext) {
    const layer4 = buildReactivationContext(session);
    layers.push(layer4);
  }

  return layers.join("\n\n");
}
```

### **Summarization Performance**

**Problem:** Generating summaries with LLM is slow and expensive

**Solution:** Batch summarization + caching

```typescript
// Run summarization as background job
// Triggered after 10 messages OR when session goes idle for 1 hour

export const scheduleSummarization = internalMutation({
  args: { sessionId: v.id("agentSessions") },
  handler: async (ctx, args) => {
    // Schedule for 5 minutes later (don't block agent response)
    ctx.scheduler.runAfter(
      5 * 60 * 1000,
      internal.ai.memoryEngine.generateSessionSummary,
      { sessionId: args.sessionId }
    );
  },
});
```

### **Contact Extraction Optimization**

**Problem:** Extracting facts on every message is wasteful

**Solution:** Smart extraction triggers

```typescript
// Only extract when conversation indicates new information
function shouldExtractFacts(assistantMessage: string): boolean {
  const extractionTriggers = [
    /what is your budget/i,
    /when do you need/i,
    /who makes the decision/i,
    /what are you looking for/i,
    /what's your biggest challenge/i,
    /how would you describe/i,
  ];

  return extractionTriggers.some((pattern) => pattern.test(assistantMessage));
}
```

---

## Security & Privacy

### **API Key Storage**

GHL API keys stored in `objects` table with encryption:

```typescript
{
  type: "ghl_settings",
  organizationId: v.id("organizations"),
  customProperties: {
    ghlApiKey: encrypt(apiKey), // Encrypted at rest
    ghlLocationId: locationId,
    webhookSecret: secret,
    enabled: true,
  }
}
```

### **Webhook Signature Verification**

All GHL webhooks MUST pass HMAC signature verification before processing.

### **Data Retention**

- **Messages:** Retained indefinitely (user data)
- **Summaries:** Retained with session
- **Memory snapshots:** Retained for 90 days, then archived
- **Contact extractions:** Retained with contact profile

---

## Monitoring & Observability

### **Key Metrics to Track**

```typescript
// Track memory layer usage
interface MemoryMetrics {
  sessionId: string,
  layersUsed: string[], // ["recent", "summary", "contact", "reactivation"]
  tokensUsed: number,
  contextBuildTime: number, // ms
  extractionTriggered: boolean,
  summarizationTriggered: boolean,
}

// Track GHL API performance
interface GHLAPIMetrics {
  endpoint: string,
  responseTime: number,
  statusCode: number,
  success: boolean,
  retried: boolean,
}

// Track conversation quality
interface ConversationQualityMetrics {
  sessionId: string,
  messageCount: number,
  avgResponseTime: number,
  contextRelevanceScore: number, // 0-1 (how relevant was memory?)
  extractedFactsCount: number,
  reactivationSuccess: boolean, // Did lead engage after reactivation?
}
```

### **Logging Strategy**

```typescript
// Structured logging for debugging
console.log("[GHL Memory]", {
  sessionId: session._id,
  action: "build_context",
  layersUsed: ["recent", "summary", "contact"],
  tokensEstimated: 2800,
  buildTime: 45, // ms
});

console.log("[GHL Extraction]", {
  sessionId: session._id,
  extractedFields: ["budget_range", "timeline", "pain_points"],
  updateSuccess: true,
});
```

---

## Testing Strategy

### **Unit Tests**

```typescript
// Test memory context building
describe("memoryEngine.buildMemoryContext", () => {
  it("should include all 4 layers for premium tier", async () => {
    const context = await buildMemoryContext(sessionId, contactId);
    expect(context.layersUsed).toContain("recent_context");
    expect(context.layersUsed).toContain("session_summary");
    expect(context.layersUsed).toContain("contact_profile");
    expect(context.layersUsed).toContain("reactivation_context");
  });

  it("should stay within token budget", async () => {
    const context = await buildMemoryContext(sessionId, contactId);
    expect(context.tokensEstimate).toBeLessThan(3000);
  });
});
```

### **Integration Tests**

```typescript
// Test full GHL webhook → response flow
describe("GHL Integration E2E", () => {
  it("should process inbound SMS and return memory-aware response", async () => {
    // 1. Send webhook
    const response = await fetch("/api/webhooks/ghl", {
      method: "POST",
      headers: {
        "X-API-Key": testApiKey,
        "X-LC-Signature": generateSignature(payload),
      },
      body: JSON.stringify(ghlWebhookPayload),
    });

    expect(response.status).toBe(200);

    // 2. Wait for processing
    await sleep(2000);

    // 3. Check that response was sent to GHL
    const sentMessages = await getMockGHLMessages();
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].message).toContain("budget"); // Memory context used
  });
});
```

---

**Next:** [MEMORY_ENGINE_DESIGN.md](../agentic_system/MEMORY_ENGINE_DESIGN.md) — Detailed memory layer specifications
