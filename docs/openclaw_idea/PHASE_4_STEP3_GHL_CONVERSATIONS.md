# Phase 4 Step 3: Conversations & Messaging Channel Provider

## Goal

GHL becomes a first-class channel provider in our system. SMS, email, and other GHL-routed messages flow through our existing `ChannelProvider` interface. The agent can send messages to contacts via GHL's Conversations API. Inbound messages from GHL trigger the agent pipeline.

## Depends On

- Phase 4 Step 1 (OAuth Foundation) — authenticated GHL API access
- Phase 4 Step 2 (Contact Sync) — contacts linked with `ghlContactId`
- Channel provider interface (`convex/channels/types.ts`)
- Channel registry (`convex/channels/registry.ts`)
- Channel router (`convex/channels/router.ts`)

## What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| `ChannelProvider` interface | Done | `convex/channels/types.ts` |
| Channel registry with `registerProvider()` | Done | `convex/channels/registry.ts` |
| Channel router with credential resolution | Done | `convex/channels/router.ts` |
| Webhook event routing (InboundMessage, OutboundMessage) | Step 2 | `convex/integrations/ghl.ts` |
| Existing provider examples (WhatsApp, Chatwoot, Infobip) | Done | `convex/channels/providers/` |

## GHL Conversations API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /conversations/` | GET | List conversations for a contact |
| `GET /conversations/{id}` | GET | Get conversation details |
| `POST /conversations/` | POST | Create a new conversation |
| `POST /conversations/messages` | POST | Send a message in a conversation |
| `GET /conversations/{id}/messages` | GET | Get messages in a conversation |
| `PUT /conversations/{id}` | PUT | Update conversation (assign, status) |

### Message Types GHL Supports

| Type | Channel | API Field |
|------|---------|-----------|
| SMS | `TYPE_SMS` | `type: 1` |
| Email | `TYPE_EMAIL` | `type: 2` |
| Phone call | `TYPE_CALL` | `type: 3` |
| WhatsApp | `TYPE_WHATSAPP` | `type: 15` |
| Instagram | `TYPE_INSTAGRAM` | `type: 16` |
| Facebook | `TYPE_FACEBOOK` | `type: 17` |
| Live Chat | `TYPE_LIVE_CHAT` | `type: 18` |

## Architecture

```
┌───────────────────────────────────────────────────────┐
│                 INBOUND (GHL → Agent)                 │
├───────────────────────────────────────────────────────┤
│                                                       │
│  GHL Webhook (InboundMessage)                         │
│         │                                             │
│         ▼                                             │
│  processGhlWebhook → processGhlMessage                │
│         │                                             │
│         ▼                                             │
│  ghlProvider.normalizeInbound()                       │
│         │                                             │
│         ├── Map GHL type → ChannelType                │
│         ├── Extract sender from contactId             │
│         └── Build NormalizedInboundMessage             │
│                                                       │
│         ▼                                             │
│  agentExecution.processInboundMessage()               │
│         │                                             │
│         ▼                                             │
│  Agent generates response                             │
│         │                                             │
│         ▼                                             │
│  channels.router.sendMessage() → ghlProvider          │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│              OUTBOUND (Agent → GHL)                   │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Agent calls send_message tool                        │
│         │                                             │
│         ▼                                             │
│  channels.router.sendMessage()                        │
│         │                                             │
│         ├── getChannelBinding(org, "sms"|"email")     │
│         ├── getProviderCredentials(org, "ghl")        │
│         │                                             │
│         ▼                                             │
│  ghlProvider.sendMessage()                            │
│         │                                             │
│         ├── Find/create GHL conversation              │
│         ├── POST /conversations/messages              │
│         └── Return SendResult                         │
└───────────────────────────────────────────────────────┘
```

## Implementation

### 1. GHL Channel Provider

**File:** `convex/channels/providers/ghlProvider.ts` (new)

```typescript
import type {
  ChannelProvider,
  ChannelProviderCapabilities,
  ChannelType,
  NormalizedInboundMessage,
  OutboundMessage,
  ProviderCredentials,
  SendResult,
} from "../types";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

// Map GHL message type numbers to our ChannelType
const GHL_TYPE_MAP: Record<number, ChannelType> = {
  1: "sms",
  2: "email",
  15: "whatsapp",
  16: "instagram",
  17: "facebook_messenger",
  18: "webchat",
};

// Reverse map for outbound
const CHANNEL_TO_GHL_TYPE: Record<string, number> = {
  sms: 1,
  email: 2,
  whatsapp: 15,
  instagram: 16,
  facebook_messenger: 17,
  webchat: 18,
};

const capabilities: ChannelProviderCapabilities = {
  supportedChannels: ["sms", "email", "whatsapp", "instagram", "facebook_messenger", "webchat"],
  supportsInbound: true,
  supportsOutbound: true,
  supportsWebhooks: true,
  supportsAttachments: true,
  supportsTemplates: false,
  supportsConversationThreading: true,
};

export const ghlProvider: ChannelProvider = {
  id: "ghl" as any, // Will be added to ProviderId type
  name: "GoHighLevel",
  capabilities,

  normalizeInbound(
    rawPayload: Record<string, unknown>,
    credentials: ProviderCredentials
  ): NormalizedInboundMessage | null {
    const messageType = rawPayload.type as number;
    const channel = GHL_TYPE_MAP[messageType];

    if (!channel) {
      console.warn(`[GHL Provider] Unknown message type: ${messageType}`);
      return null;
    }

    // Skip outbound messages echoed back via webhook
    if (rawPayload.direction === "outbound") return null;

    const body = (rawPayload.body || rawPayload.message || "") as string;
    const contactId = rawPayload.contactId as string;
    const conversationId = rawPayload.conversationId as string;

    if (!body || !contactId) return null;

    return {
      organizationId: "", // Set by webhook processor
      channel,
      externalContactIdentifier: contactId,
      message: body,
      messageType: rawPayload.attachments ? "file" : "text",
      metadata: {
        providerId: "ghl" as any,
        providerMessageId: rawPayload.messageId as string,
        providerConversationId: conversationId,
        senderName: rawPayload.contactName as string || undefined,
        attachments: parseGhlAttachments(rawPayload.attachments),
        raw: rawPayload,
      },
    };
  },

  async sendMessage(
    credentials: ProviderCredentials,
    message: OutboundMessage
  ): Promise<SendResult> {
    const accessToken = credentials.ghlAccessToken;
    if (!accessToken) {
      return { success: false, error: "No GHL access token", retryable: false };
    }

    const ghlType = CHANNEL_TO_GHL_TYPE[message.channel];
    if (!ghlType) {
      return { success: false, error: `Unsupported channel: ${message.channel}`, retryable: false };
    }

    try {
      // If we have a conversation ID, send to it directly
      if (message.metadata?.providerConversationId) {
        return await sendToConversation(
          accessToken,
          message.metadata.providerConversationId,
          message.content,
          ghlType
        );
      }

      // Otherwise, find or create a conversation for this contact
      const contactId = credentials.ghlContactId || message.recipientIdentifier;
      const conversationId = await findOrCreateConversation(
        accessToken,
        contactId,
        credentials.ghlLocationId || ""
      );

      return await sendToConversation(accessToken, conversationId, message.content, ghlType);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        retryable: true,
      };
    }
  },

  verifyWebhook(
    body: string,
    headers: Record<string, string>,
    credentials: ProviderCredentials
  ): boolean {
    // GHL doesn't sign webhooks by default
    // Verification is done by checking the locationId maps to a known org
    return true;
  },

  async testConnection(credentials: ProviderCredentials) {
    const accessToken = credentials.ghlAccessToken;
    if (!accessToken) {
      return { success: false, error: "No access token" };
    }

    try {
      const res = await fetch(`${GHL_API_BASE}/locations/${credentials.ghlLocationId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
        },
      });

      if (!res.ok) {
        return { success: false, error: `API returned ${res.status}` };
      }

      const data = await res.json();
      return {
        success: true,
        accountName: data.location?.name || "GHL Location",
      };
    } catch (error) {
      return { success: false, error: "Connection failed" };
    }
  },
};

// --- Helpers ---

async function sendToConversation(
  accessToken: string,
  conversationId: string,
  content: string,
  type: number
): Promise<SendResult> {
  const res = await fetch(`${GHL_API_BASE}/conversations/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify({
      type,
      conversationId,
      message: content,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `GHL send failed: ${err}`, retryable: true };
  }

  const result = await res.json();
  return {
    success: true,
    providerMessageId: result.messageId || result.id,
  };
}

async function findOrCreateConversation(
  accessToken: string,
  contactId: string,
  locationId: string
): Promise<string> {
  // Search for existing conversation
  const searchRes = await fetch(
    `${GHL_API_BASE}/conversations/search?contactId=${contactId}&locationId=${locationId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: "2021-07-28",
      },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.conversations?.length > 0) {
      return searchData.conversations[0].id;
    }
  }

  // Create new conversation
  const createRes = await fetch(`${GHL_API_BASE}/conversations/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify({ contactId, locationId }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create GHL conversation: ${await createRes.text()}`);
  }

  const createData = await createRes.json();
  return createData.conversation?.id || createData.id;
}

function parseGhlAttachments(attachments: unknown): Array<{ type: string; url: string; name?: string }> | undefined {
  if (!Array.isArray(attachments) || attachments.length === 0) return undefined;

  return attachments.map((att: any) => ({
    type: att.contentType || "application/octet-stream",
    url: att.url || "",
    name: att.fileName || undefined,
  }));
}
```

### 2. Register Provider

**File:** `convex/channels/registry.ts` (add)

```typescript
import { ghlProvider } from "./providers/ghlProvider";

// Add to existing registrations
registerProvider(ghlProvider);
```

### 3. Update Types

**File:** `convex/channels/types.ts` (modify)

```typescript
export type ProviderId =
  | "chatwoot"
  | "manychat"
  | "pushover"
  | "resend"
  | "infobip"
  | "twilio"
  | "whatsapp"
  | "telegram"
  | "direct"
  | "ghl";  // ADD

export interface ProviderCredentials {
  // ... existing fields ...

  // GoHighLevel
  ghlAccessToken?: string;
  ghlLocationId?: string;
  ghlContactId?: string;
}
```

### 4. Add Credential Resolution to Router

**File:** `convex/channels/router.ts` (extend `getProviderCredentials`)

```typescript
if (args.providerId === "ghl") {
  // GHL credentials come from oauthConnections
  const conn = await ctx.db
    .query("oauthConnections")
    .withIndex("by_org_provider", (q) =>
      q.eq("organizationId", args.organizationId).eq("provider", "ghl")
    )
    .first();

  if (conn) {
    // Decrypt access token
    const accessToken = await ctx.runAction(
      internal.oauth.encryption.decryptToken,
      { encryptedToken: conn.accessToken }
    );

    return {
      providerId: "ghl",
      ghlAccessToken: accessToken,
      ghlLocationId: (conn.customProperties as any)?.locationId,
    } as ProviderCredentials;
  }
}
```

### 5. Inbound Message Processor

**File:** `convex/integrations/ghlConversations.ts` (new)

```typescript
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { getProvider } from "../channels/registry";

/**
 * Process inbound GHL conversation message.
 * Routes through channel provider normalization → agent pipeline.
 */
export const processGhlMessage = internalAction({
  args: {
    organizationId: v.id("organizations"),
    event: v.any(),
  },
  handler: async (ctx, args) => {
    const provider = getProvider("ghl");
    if (!provider) {
      console.error("[GHL] Provider not registered");
      return { status: "error", reason: "provider_not_found" };
    }

    const normalized = provider.normalizeInbound(args.event, {} as any);
    if (!normalized) {
      return { status: "skipped", reason: "not_normalizable" };
    }

    normalized.organizationId = args.organizationId as string;

    // Resolve contact identifier
    // GHL uses contactId — we need to find our contact's external identifier
    const contactId = args.event.contactId;

    // Route to agent pipeline
    const result = await (ctx.runAction as Function)(
      api.ai.agentExecution.processInboundMessage,
      {
        organizationId: args.organizationId,
        channel: normalized.channel,
        externalContactIdentifier: contactId,
        message: normalized.message,
        metadata: {
          ...normalized.metadata,
          source: "ghl",
          ghlConversationId: args.event.conversationId,
        },
      }
    );

    return result;
  },
});
```

### 6. Create Channel Bindings on Connection

After GHL OAuth completes (Step 1), automatically create channel bindings:

**File:** `convex/integrations/ghl.ts` (add to `exchangeGhlCode`)

```typescript
// After storing connection, create channel bindings
for (const channel of ["sms", "email"] as const) {
  await ctx.runMutation(internal.integrations.ghl.createGhlChannelBinding, {
    organizationId: args.organizationId,
    channel,
  });
}
```

**File:** `convex/integrations/ghl.ts` (add)

```typescript
export const createGhlChannelBinding = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    channel: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if binding already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId)
          .eq("type", "channel_provider_binding")
      )
      .collect();

    const hasBinding = existing.some(
      (b) =>
        (b.customProperties as any)?.channel === args.channel &&
        (b.customProperties as any)?.providerId === "ghl"
    );

    if (!hasBinding) {
      await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "channel_provider_binding",
        name: `GHL ${args.channel}`,
        status: "active",
        customProperties: {
          channel: args.channel,
          providerId: "ghl",
          priority: 1,
          enabled: true,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});
```

## Files Summary

| File | Change | Risk |
|------|--------|------|
| `convex/channels/providers/ghlProvider.ts` | **New** — ChannelProvider implementation | Medium |
| `convex/channels/registry.ts` | Register GHL provider | Low |
| `convex/channels/types.ts` | Add `"ghl"` to ProviderId, GHL credential fields | Low |
| `convex/channels/router.ts` | Add GHL credential resolution | Low |
| `convex/integrations/ghlConversations.ts` | **New** — inbound message processor | Medium |
| `convex/integrations/ghl.ts` | Add channel binding creation on connect | Low |

## Verification

1. **Inbound SMS**: Customer texts GHL number → webhook → agent responds via GHL
2. **Inbound email**: Customer emails GHL inbox → webhook → agent responds via GHL
3. **Outbound SMS**: Agent calls `send_message` with channel="sms" → delivered via GHL
4. **Outbound email**: Agent calls `send_message` with channel="email" → delivered via GHL
5. **Conversation threading**: Multiple messages in same conversation stay threaded
6. **Channel binding**: After GHL connect, `channel_provider_binding` records exist for sms + email
7. **Provider test**: `testConnection()` returns location name
8. **Attachment handling**: Inbound message with attachment → normalized with attachment metadata
