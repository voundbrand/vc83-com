# GHL API Integration Specifications

**Last Updated:** 2025-02-05

---

## Overview

This document details the technical integration between l4yercak3 and GoHighLevel's REST API and webhook system.

### **Integration Architecture**

```
┌──────────────────┐                    ┌──────────────────┐
│   GHL Platform   │◄────Webhooks───────│   l4yercak3      │
│                  │                    │                  │
│  - Conversations │──────API Calls────►│  - Memory Engine │
│  - Contacts      │                    │  - AI Agent      │
│  - Messages      │                    │  - CRM Sync      │
└──────────────────┘                    └──────────────────┘
```

**Two-way communication:**
1. **Inbound:** GHL sends webhooks when messages arrive
2. **Outbound:** We call GHL API to send responses
3. **Sync:** We read/write GHL contact data for enrichment

---

## GHL API Basics

### **Base URLs**

```
Production: https://services.leadconnectorhq.com
API Version: 2021-07-28 (specified in header)
```

### **Authentication**

GHL uses **OAuth 2.0** for agency/SaaS mode, or **API Keys** for location-level access.

**For MVP:** Use API Keys (simpler onboarding)
**For Scale:** Switch to OAuth (better UX, more secure)

#### **API Key Format**

```http
Authorization: Bearer {api_key}
Version: 2021-07-28
```

### **Rate Limits**

- **Standard:** 60 requests/minute
- **Premium:** 120 requests/minute
- **Enterprise:** Custom limits

**Our strategy:** Implement exponential backoff for 429 responses

---

## Webhook Integration

### **Webhook Events**

GHL can send webhooks for various events. We care about:

| Event Type | Description | Priority |
|------------|-------------|----------|
| `InboundMessage` | New message from contact | **P0** (Must have) |
| `OutboundMessage` | Message sent by agent/workflow | P1 (Nice to track) |
| `ContactUpdate` | Contact field changed | P1 (For sync) |
| `ConversationCreated` | New conversation started | P2 (For analytics) |

### **Webhook Configuration**

Users configure in GHL Settings → Integrations → Webhooks:

```
Webhook URL: https://app.l4yercak3.com/api/webhooks/ghl
Events: InboundMessage, ContactUpdate
Headers: X-API-Key: {l4yercak3_api_key}
```

### **Webhook Payload Format**

#### **InboundMessage Event**

```json
{
  "type": "InboundMessage",
  "id": "msg_abc123xyz",
  "conversationId": "conv_def456abc",
  "contactId": "contact_ghi789def",
  "locationId": "loc_jkl012ghi",
  "messageType": "SMS",
  "body": "Hey, I'm interested in your premium plan",
  "attachments": [],
  "dateAdded": "2024-01-15T14:30:00Z",
  "direction": "inbound",
  "contentType": "text/plain",
  "source": "+15551234567",
  "userId": "user_mno345jkl"
}
```

**Message Types:**
- `SMS` — Text message
- `Email` — Email (includes subject, html)
- `WhatsApp` — WhatsApp message
- `FB` — Facebook Messenger
- `GMB` — Google Business Messages
- `Instagram` — Instagram DM

#### **ContactUpdate Event** (for sync)

```json
{
  "type": "ContactUpdate",
  "id": "contact_ghi789def",
  "locationId": "loc_jkl012ghi",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+15551234567",
  "tags": ["hot_lead", "premium_interest"],
  "customFields": {
    "budget": "$200-400",
    "timeline": "Q2 2025"
  },
  "dateUpdated": "2024-01-15T14:30:00Z"
}
```

### **Webhook Signature Verification**

GHL signs webhooks with HMAC-SHA256.

**Signature Header:** `X-LC-Signature` or `X-LC-Event-Signature`

**Verification:**

```typescript
import crypto from "crypto";

function verifyGHLWebhook(
  body: string,
  signature: string,
  webhookSecret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  return signature === expectedSignature;
}
```

### **Webhook Handler Implementation**

**File:** `convex/http.ts`

```typescript
// Add to httpRouter
http.route({
  path: "/webhooks/ghl",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // 1. Parse body and headers
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    const signature = headers["x-lc-signature"] || headers["x-lc-event-signature"];

    // 2. Authenticate request
    // Option A: Via custom header (for API key mode)
    const apiKey = headers["x-api-key"];
    if (!apiKey) {
      return new Response("Missing API key", { status: 401 });
    }

    // Resolve org from API key
    const org = await ctx.runQuery(internal.auth.resolveOrgFromApiKey, { apiKey });
    if (!org) {
      return new Response("Invalid API key", { status: 401 });
    }

    // 3. Verify webhook signature
    const ghlSettings = await ctx.runQuery(internal.integrations.ghl.getSettings, {
      organizationId: org._id,
    });

    if (!ghlSettings?.webhookSecret) {
      return new Response("GHL not configured", { status: 400 });
    }

    if (!verifyGHLWebhook(body, signature, ghlSettings.webhookSecret)) {
      console.error("[GHL] Invalid webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    // 4. Schedule async processing (respond quickly)
    await ctx.scheduler.runAfter(0, internal.channels.webhooks.processGHLWebhook, {
      payload: body,
      organizationId: org._id,
    });

    // 5. Return 200 OK immediately (GHL expects fast response)
    return new Response(JSON.stringify({ status: "accepted" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
```

---

## Outbound API Calls

### **Send Message API**

**Endpoint:** `POST /conversations/messages`

**Purpose:** Send AI response back to customer

**Request:**

```typescript
interface SendMessageRequest {
  type: "SMS" | "Email" | "WhatsApp" | "FB";
  contactId: string;           // GHL contact ID
  conversationId?: string;     // Optional: thread messages
  message?: string;            // For SMS/WhatsApp/FB
  html?: string;               // For Email
  subject?: string;            // For Email
  templateId?: string;         // Optional: use GHL template
  attachments?: Array<{
    url: string;
    name: string;
  }>;
}

// Example
const response = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${ghlApiKey}`,
    "Version": "2021-07-28",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    type: "SMS",
    contactId: "contact_ghi789def",
    conversationId: "conv_def456abc",
    message: "Great! I can help you with our premium plan. What's your budget range?",
  }),
});
```

**Response:**

```json
{
  "messageId": "msg_newmsg123",
  "conversationId": "conv_def456abc",
  "status": "pending",
  "dateAdded": "2024-01-15T14:31:00Z"
}
```

**Error Handling:**

```typescript
if (!response.ok) {
  const errorData = await response.json();

  // Common errors:
  // 400 - Invalid request (bad contactId, missing fields)
  // 401 - Unauthorized (invalid API key)
  // 404 - Contact/conversation not found
  // 429 - Rate limit exceeded
  // 500 - GHL server error

  if (response.status === 429) {
    // Retry with exponential backoff
    await sleep(5000);
    return sendMessageRetry(payload);
  }

  throw new Error(`GHL API error: ${response.status} - ${errorData.message}`);
}
```

### **Get Contact API**

**Endpoint:** `GET /contacts/{contactId}`

**Purpose:** Fetch contact details for enrichment

**Request:**

```typescript
const response = await fetch(
  `https://services.leadconnectorhq.com/contacts/${contactId}`,
  {
    headers: {
      Authorization: `Bearer ${ghlApiKey}`,
      Version: "2021-07-28",
    },
  }
);
```

**Response:**

```json
{
  "contact": {
    "id": "contact_ghi789def",
    "locationId": "loc_jkl012ghi",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+15551234567",
    "tags": ["hot_lead", "premium_interest"],
    "customFields": [
      { "id": "field_1", "key": "budget", "value": "$200-400" },
      { "id": "field_2", "key": "timeline", "value": "Q2 2025" }
    ],
    "dateAdded": "2024-01-01T00:00:00Z",
    "source": "manual"
  }
}
```

### **Update Contact API**

**Endpoint:** `PUT /contacts/{contactId}`

**Purpose:** Write back extracted facts to GHL

**Request:**

```typescript
const response = await fetch(
  `https://services.leadconnectorhq.com/contacts/${contactId}`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${ghlApiKey}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tags: ["premium_interest", "decision_maker"],
      customFields: [
        { key: "ai_extracted_budget", value: "$200-400/month" },
        { key: "ai_extracted_timeline", value: "Q2 2025" },
        { key: "ai_extracted_stage", value: "consideration" },
      ],
    }),
  }
);
```

**Best Practices:**
- Use custom fields prefixed with `ai_extracted_*` to avoid collisions
- Don't overwrite manually-entered data
- Batch updates when possible (GHL rate limits apply)

---

## Contact Sync Strategy

### **Sync Direction**

```
GHL Contact ◄──────────► l4yercak3 CRM Contact
            (bidirectional)
```

**GHL → l4yercak3 (On webhook):**
- Contact created/updated in GHL
- We receive `ContactUpdate` webhook
- Create or update CRM contact in our `objects` table

**l4yercak3 → GHL (After extraction):**
- AI extracts facts from conversation
- We update GHL custom fields with extracted data
- GHL becomes "enriched source of truth"

### **Mapping Strategy**

**Store GHL ID in our contact:**

```typescript
{
  type: "crm_contact",
  organizationId: "org_123",
  customProperties: {
    // Standard contact fields
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+15551234567",

    // GHL sync fields
    ghlContactId: "contact_ghi789def",
    ghlLocationId: "loc_jkl012ghi",
    ghlSyncedAt: 1706189400000,

    // AI memory (our enhancement)
    aiMemory: {
      preferences: { budget_range: "$200-400/month" },
      painPoints: ["Current CRM too complex"],
      // ...
    },
  }
}
```

**Store l4yercak3 ID in GHL:**

Create custom field in GHL: `l4yercak3_contact_id`

```typescript
// When syncing contact to GHL
await updateGHLContact(ghlContactId, {
  customFields: [
    { key: "l4yercak3_contact_id", value: ourContactId },
  ],
});
```

### **Conflict Resolution**

**Scenario:** User updates contact in GHL, AI also updates via extraction

**Strategy:**
1. **Last-write-wins** for most fields
2. **Merge** for arrays (tags, pain points)
3. **GHL takes precedence** for core fields (name, email, phone)
4. **We take precedence** for AI-extracted insights

---

## Provider Implementation

**File:** `convex/integrations/gohighlevel.ts`

```typescript
import { ChannelProvider, ChannelType, NormalizedInboundMessage, OutboundMessage, SendResult, ProviderCredentials } from "../channels/types";
import crypto from "crypto";

export const ghlProvider: ChannelProvider = {
  id: "gohighlevel",
  name: "GoHighLevel",

  capabilities: {
    supportedChannels: ["sms", "email", "whatsapp", "facebook_messenger"],
    supportsInbound: true,
    supportsOutbound: true,
    supportsWebhooks: true,
    supportsAttachments: false, // Phase 2
    supportsTemplates: true,    // Phase 2
    supportsConversationThreading: true,
  },

  /**
   * Normalize GHL webhook to our internal format
   */
  normalizeInbound(rawPayload: Record<string, unknown>, credentials: ProviderCredentials): NormalizedInboundMessage | null {
    // Only handle InboundMessage events
    if (rawPayload.type !== "InboundMessage") {
      return null;
    }

    // Map GHL message types to our channel types
    const channelMap: Record<string, ChannelType> = {
      "SMS": "sms",
      "Email": "email",
      "WhatsApp": "whatsapp",
      "FB": "facebook_messenger",
      "Instagram": "instagram",
      "GMB": "google_business_messages",
    };

    const messageType = rawPayload.messageType as string;
    const channel = channelMap[messageType] || "sms";

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
        senderName: `${rawPayload.contactName || "Contact"}`,
        raw: rawPayload,

        // GHL-specific
        ghlLocationId: rawPayload.locationId as string,
        ghlContactId: rawPayload.contactId as string,
        ghlSource: rawPayload.source as string,
      },
    };
  },

  /**
   * Send message via GHL API
   */
  async sendMessage(credentials: ProviderCredentials, message: OutboundMessage): Promise<SendResult> {
    const typeMap: Record<ChannelType, string> = {
      "sms": "SMS",
      "email": "Email",
      "whatsapp": "WhatsApp",
      "facebook_messenger": "FB",
      "instagram": "Instagram",
    };

    const ghlType = typeMap[message.channel] || "SMS";

    const payload: Record<string, unknown> = {
      type: ghlType,
      contactId: message.recipientIdentifier,
      conversationId: message.metadata?.providerConversationId,
    };

    // Add message content based on type
    if (ghlType === "Email") {
      payload.subject = message.subject || "Message from AI Assistant";
      payload.html = message.contentHtml || message.content;
      payload.message = message.content; // Plain text fallback
    } else {
      payload.message = message.content;
    }

    try {
      const response = await fetch(
        "https://services.leadconnectorhq.com/conversations/messages",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${credentials.ghlApiKey}`,
            "Version": "2021-07-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
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
          retryable: response.status >= 500 || response.status === 429,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
        retryable: true,
      };
    }
  },

  /**
   * Verify webhook signature
   */
  verifyWebhook(body: string, headers: Record<string, string>, credentials: ProviderCredentials): boolean {
    const signature = headers["x-lc-signature"] || headers["x-lc-event-signature"];
    if (!signature || !credentials.webhookSecret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", credentials.webhookSecret)
      .update(body)
      .digest("hex");

    return signature === expectedSignature;
  },

  /**
   * Test GHL connection
   */
  async testConnection(credentials: ProviderCredentials): Promise<{ success: boolean; accountName?: string; error?: string }> {
    try {
      const response = await fetch(
        "https://services.leadconnectorhq.com/locations/",
        {
          headers: {
            "Authorization": `Bearer ${credentials.ghlApiKey}`,
            "Version": "2021-07-28",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const locations = data.locations || [];
        const accountName = locations[0]?.name || "GHL Account";

        return {
          success: true,
          accountName,
        };
      } else {
        return {
          success: false,
          error: `Authentication failed (${response.status})`,
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

// Register provider
import { registerProvider } from "../channels/registry";
registerProvider(ghlProvider);
```

---

## Settings UI & Onboarding

### **GHL Settings Object**

Store in `objects` table:

```typescript
{
  _id: "settings_ghl_123",
  type: "ghl_settings",
  organizationId: "org_abc",
  customProperties: {
    // Authentication
    ghlApiKey: "encrypted_api_key",
    ghlLocationId: "loc_jkl012ghi",

    // Webhook config
    webhookSecret: "webhook_secret_xyz",
    webhookUrl: "https://app.l4yercak3.com/api/webhooks/ghl",

    // Sync settings
    bidirectionalSync: true,
    syncCustomFields: true,
    customFieldPrefix: "ai_extracted_",

    // Feature flags
    enableMemoryEngine: true,
    memoryTier: "premium", // basic, standard, advanced, premium

    // Status
    enabled: true,
    connectedAt: 1706189400000,
    lastSyncAt: 1706189400000,
  }
}
```

### **Setup Flow for Users**

**Step 1:** Install GHL Integration

```
1. User clicks "Connect GoHighLevel" in l4yercak3 settings
2. We show onboarding modal with instructions
3. User generates GHL API key from their GHL account
4. User pastes API key into our form
5. We test connection (call /locations/ endpoint)
6. If success, save settings
```

**Step 2:** Configure Webhook in GHL

```
1. User goes to GHL → Settings → Integrations → Webhooks
2. Clicks "Add Webhook"
3. Fills in:
   - URL: https://app.l4yercak3.com/api/webhooks/ghl
   - Events: InboundMessage, ContactUpdate
   - Custom Header: X-API-Key: {their_l4yercak3_api_key}
4. Copies webhook secret
5. Pastes secret into l4yercak3 settings
6. We save and enable integration
```

**Step 3:** Test Integration

```
1. We trigger test message from GHL
2. Verify webhook arrives
3. Verify we can send response
4. Show success confirmation
```

### **Setup UI Mockup**

```typescript
// convex/integrations/ghlSetup.ts

export const connectGHL = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    ghlApiKey: v.string(),
    webhookSecret: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // 1. Test API key
    const testResult = await testGHLConnection(args.ghlApiKey);
    if (!testResult.success) {
      throw new Error(`Failed to connect: ${testResult.error}`);
    }

    // 2. Encrypt API key
    const encryptedKey = encrypt(args.ghlApiKey);

    // 3. Save settings
    const settingsId = await ctx.db.insert("objects", {
      type: "ghl_settings",
      organizationId: args.organizationId,
      customProperties: {
        ghlApiKey: encryptedKey,
        ghlLocationId: testResult.locationId,
        webhookSecret: args.webhookSecret,
        webhookUrl: `https://app.l4yercak3.com/api/webhooks/ghl`,
        enabled: true,
        connectedAt: Date.now(),
        enableMemoryEngine: true,
        memoryTier: "premium",
      },
    });

    return { success: true, settingsId };
  },
});
```

---

## Error Handling & Retry Logic

### **Webhook Processing Errors**

```typescript
export const processGHLWebhook = internalAction({
  args: {
    payload: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    try {
      // Process webhook...

    } catch (error) {
      // Log error for debugging
      console.error("[GHL Webhook] Processing failed:", error);

      // Save to error log
      await ctx.runMutation(internal.auditLogs.logError, {
        source: "ghl_webhook",
        error: error instanceof Error ? error.message : String(error),
        payload: args.payload,
        organizationId: args.organizationId,
      });

      // Don't throw - webhook already acknowledged
      return { status: "error", message: String(error) };
    }
  },
});
```

### **Outbound Message Retry**

```typescript
async function sendMessageWithRetry(
  credentials: ProviderCredentials,
  message: OutboundMessage,
  maxRetries: number = 3
): Promise<SendResult> {
  let lastError: string = "";

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await ghlProvider.sendMessage(credentials, message);

    if (result.success) {
      return result;
    }

    // Retry if error is retryable (500, 429)
    if (!result.retryable) {
      return result; // Don't retry 400 errors
    }

    lastError = result.error || "Unknown error";

    // Exponential backoff: 1s, 2s, 4s
    const backoffMs = Math.pow(2, attempt) * 1000;
    await sleep(backoffMs);
  }

  return {
    success: false,
    error: `Failed after ${maxRetries} retries: ${lastError}`,
    retryable: false,
  };
}
```

---

## Testing Strategy

### **Unit Tests**

```typescript
describe("ghlProvider", () => {
  it("should normalize inbound SMS webhook", () => {
    const webhook = {
      type: "InboundMessage",
      id: "msg_123",
      conversationId: "conv_456",
      contactId: "contact_789",
      locationId: "loc_abc",
      messageType: "SMS",
      body: "Test message",
    };

    const normalized = ghlProvider.normalizeInbound(webhook, {
      organizationId: "org_test",
    } as ProviderCredentials);

    expect(normalized).not.toBeNull();
    expect(normalized!.channel).toBe("sms");
    expect(normalized!.message).toBe("Test message");
  });

  it("should verify webhook signature", () => {
    const body = '{"type":"InboundMessage"}';
    const secret = "test_secret";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const isValid = ghlProvider.verifyWebhook(
      body,
      { "x-lc-signature": signature },
      { webhookSecret: secret } as ProviderCredentials
    );

    expect(isValid).toBe(true);
  });
});
```

### **Integration Tests**

```typescript
describe("GHL E2E", () => {
  it("should process webhook and send response", async () => {
    // 1. Send webhook
    const webhookPayload = {
      type: "InboundMessage",
      id: "msg_test",
      contactId: "contact_test",
      conversationId: "conv_test",
      messageType: "SMS",
      body: "What's your premium plan price?",
    };

    const signature = generateSignature(webhookPayload, webhookSecret);

    const response = await fetch("/api/webhooks/ghl", {
      method: "POST",
      headers: {
        "X-API-Key": testApiKey,
        "X-LC-Signature": signature,
      },
      body: JSON.stringify(webhookPayload),
    });

    expect(response.status).toBe(200);

    // 2. Wait for async processing
    await sleep(3000);

    // 3. Verify response was sent to GHL
    const sentMessages = await mockGHLAPI.getSentMessages();
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].contactId).toBe("contact_test");
    expect(sentMessages[0].message).toContain("premium");
  });
});
```

---

**Next:** [04_IMPLEMENTATION_TIMELINE.md](./04_IMPLEMENTATION_TIMELINE.md) — Week-by-week development plan
