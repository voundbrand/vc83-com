# Phase 2.9 Step 3: Provider Abstraction Refactor — Multi-Channel Ready

## Goal

Extract all Telegram-specific logic that has leaked outside the provider implementation into generic, provider-agnostic patterns. After this refactor, adding a new channel provider (Discord, Slack, WhatsApp Business bots, etc.) requires only:

1. A provider file implementing `ChannelProvider`
2. Registration in the registry
3. No duplication of webhook processors, mappings tables, mirroring logic, or agent tools

## Depends On

- Phase 2.9 Step 1 (Production Bridge) — webhook processor is the main refactor target
- Phase 2.8 Step 1 (Per-Org Bots) — custom bot deployment pipeline
- Phase 2.5 Step 8 (Telegram Group Chat) — team mirroring (currently Telegram-only)

## Current State: Where Telegram Has Leaked

| Location | What's Leaked | Severity |
|---|---|---|
| `convex/channels/webhooks.ts:256-353` | `processTelegramWebhook` hard-codes `/start` parsing, custom-vs-platform routing | High |
| `convex/channels/webhooks.ts:286-295` | `/start` deep link extraction (Telegram-specific syntax) | High |
| `convex/channels/router.ts:120-185` | Provider-specific env var fallbacks (`if providerId === "telegram"`) | High |
| `convex/ai/agentExecution.ts` step 14 | Hard-coded call to `telegramGroupMirror.mirrorToTeamGroup` | High |
| `convex/ai/tools/agencyTools.ts` | `deploy_telegram_bot` tool (Telegram-specific) | Medium |
| `convex/ai/tools/teamTools.ts` | Calls `telegramGroupMirror.mirrorTagIn` directly | Medium |
| `convex/ai/tools/soulEvolutionTools.ts` | Telegram-specific notification logic | Medium |
| `convex/schema.ts` | `telegramMappings` table (Telegram-specific) | Medium |
| `convex/channels/telegramGroupMirror.ts` | Entire file is Telegram-only mirroring | Medium |
| `convex/channels/telegramGroupSetup.ts` | Telegram-only group management | Medium |
| `convex/channels/telegramBotSetup.ts` | Telegram-only bot deployment | Low (acceptable) |

## Architecture: Target State

### Extended Provider Interface

```typescript
// convex/channels/types.ts

interface ChannelProvider {
  // --- EXISTING (unchanged) ---
  id: ProviderId;
  name: string;
  capabilities: ChannelProviderCapabilities;
  normalizeInbound(rawPayload: unknown, credentials: ProviderCredentials): NormalizedInboundMessage | null;
  sendMessage(credentials: ProviderCredentials, message: OutboundMessage): Promise<SendResult>;
  verifyWebhook?(body: string, headers: Record<string, string>, credentials: ProviderCredentials): boolean;
  testConnection?(credentials: ProviderCredentials): Promise<{ success: boolean; accountName?: string; error?: string }>;

  // --- NEW: Webhook Processing ---
  /**
   * Extract org resolution hints from raw webhook payload.
   * Returns deep link params, org hints, or other provider-specific routing info.
   * Called before org resolution to let the provider parse its own format.
   */
  extractRoutingInfo?(rawPayload: unknown): {
    startParam?: string;      // Deep link parameter (e.g., Telegram /start, Discord invite)
    orgIdHint?: string;       // Direct org reference
    isGroupMessage?: boolean; // Group vs DM
    groupId?: string;         // Provider-specific group identifier
    callbackData?: string;    // Inline button/action callback
    messageType?: "text" | "voice" | "photo" | "document" | "callback" | "member_update";
  } | null;

  /**
   * Transform the human-readable message before feeding to agent pipeline.
   * E.g., replace "/start slug" with "Hello", strip bot commands, etc.
   */
  transformMessageForAgent?(rawMessage: string, routingInfo: Record<string, unknown>): string;

  // --- NEW: Custom Bot Deployment ---
  /**
   * Deploy a custom bot/channel for an organization.
   * Validates credentials, registers webhooks, returns deployment metadata.
   */
  deployCustomChannel?(args: {
    credentials: Record<string, string>;
    webhookUrl: string;
    webhookSecret: string;
    organizationId: string;
  }): Promise<{
    success: boolean;
    error?: string;
    metadata?: Record<string, unknown>;  // Bot username, channel URL, etc.
  }>;

  // --- NEW: Team Mirroring ---
  /**
   * Whether this provider supports team group mirroring.
   */
  supportsTeamMirroring?: boolean;

  /**
   * Format and send a team mirror message (agent conversation visibility).
   * Only called if supportsTeamMirroring is true.
   */
  sendTeamMirror?(credentials: ProviderCredentials, message: TeamMirrorMessage): Promise<SendResult>;

  // --- NEW: Interactive Elements ---
  /**
   * Send a message with interactive elements (inline buttons, menus).
   * Used for soul evolution approvals, confirmation dialogs, etc.
   */
  sendInteractiveMessage?(credentials: ProviderCredentials, message: InteractiveMessage): Promise<SendResult>;

  /**
   * Handle a callback/interaction from an interactive message.
   */
  handleCallback?(credentials: ProviderCredentials, callbackData: string, chatId: string): Promise<unknown>;
}

// New types
interface TeamMirrorMessage {
  groupId: string;
  channelLabel: string;
  contactName: string;
  customerMessage: string;
  agentName: string;
  agentRole?: string;
  agentResponse: string;
}

interface InteractiveMessage {
  chatId: string;
  text: string;
  buttons?: Array<{
    label: string;
    callbackData: string;
  }>[];
}
```

### Generic Provider Mappings Table

Replace `telegramMappings` with a provider-agnostic table:

```typescript
// convex/schema.ts — NEW TABLE

providerMappings: defineTable({
  providerId: v.string(),                    // "telegram", "discord", "slack", etc.
  externalIdentifier: v.string(),            // Chat ID, user ID, channel ID (provider-specific)
  organizationId: v.id("organizations"),
  status: v.union(
    v.literal("onboarding"),
    v.literal("active"),
    v.literal("churned"),
  ),
  senderName: v.optional(v.string()),
  metadata: v.optional(v.any()),             // Provider-specific data
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_provider_external", ["providerId", "externalIdentifier"])
  .index("by_org_provider", ["organizationId", "providerId"])
  .index("by_provider_status", ["providerId", "status"]),
```

### Generic Team Channel Bindings

Replace the Telegram-specific group setup with generic team channel bindings:

```typescript
// Object type in objects table
type: "team_channel_binding"
customProperties: {
  providerId: string,          // "telegram", "discord", "slack"
  channelIdentifier: string,   // Group ID, channel ID, etc.
  channelName: string,         // Human-readable name
  mirroringEnabled: boolean,   // Can be muted
  credentials: {               // Provider-specific creds for this channel
    botToken?: string,
    // ...
  },
}
```

## Implementation

### 1. Extend `ChannelProvider` Interface

**File:** `convex/channels/types.ts`

Add the new optional methods to the interface (all optional to maintain backward compatibility):

```typescript
// Add to ChannelProvider interface:
extractRoutingInfo?(rawPayload: unknown): ProviderRoutingInfo | null;
transformMessageForAgent?(rawMessage: string, routingInfo: ProviderRoutingInfo): string;
deployCustomChannel?(args: DeployChannelArgs): Promise<DeployResult>;
supportsTeamMirroring?: boolean;
sendTeamMirror?(credentials: ProviderCredentials, message: TeamMirrorMessage): Promise<SendResult>;
sendInteractiveMessage?(credentials: ProviderCredentials, message: InteractiveMessage): Promise<SendResult>;
handleCallback?(credentials: ProviderCredentials, callbackData: string, chatId: string): Promise<unknown>;
```

Add type definitions:

```typescript
export interface ProviderRoutingInfo {
  startParam?: string;
  orgIdHint?: string;
  isGroupMessage?: boolean;
  groupId?: string;
  callbackData?: string;
  messageType?: "text" | "voice" | "photo" | "document" | "callback" | "member_update";
}

export interface DeployChannelArgs {
  credentials: Record<string, string>;
  webhookUrl: string;
  webhookSecret: string;
  organizationId: string;
}

export interface DeployResult {
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface TeamMirrorMessage {
  groupId: string;
  channelLabel: string;
  contactName: string;
  customerMessage: string;
  agentName: string;
  agentRole?: string;
  agentResponse: string;
}

export interface InteractiveMessage {
  chatId: string;
  text: string;
  buttons?: Array<Array<{ label: string; callbackData: string }>>;
}
```

### 2. Implement New Methods on Telegram Provider

**File:** `convex/channels/providers/telegramProvider.ts`

```typescript
export const telegramProvider: ChannelProvider = {
  // ... existing methods unchanged ...

  extractRoutingInfo(rawPayload: unknown): ProviderRoutingInfo | null {
    const payload = rawPayload as Record<string, any>;

    // Callback query (inline button click)
    if (payload.callback_query) {
      return {
        messageType: "callback",
        callbackData: payload.callback_query.data,
      };
    }

    // Member update (bot added/removed)
    if (payload.my_chat_member) {
      return { messageType: "member_update" };
    }

    const msg = payload.message || payload.edited_message;
    if (!msg) return null;

    // Detect message type
    let messageType: ProviderRoutingInfo["messageType"] = "text";
    if (msg.voice || msg.audio) messageType = "voice";
    else if (msg.photo) messageType = "photo";
    else if (msg.document) messageType = "document";

    // Deep link extraction
    const text = msg.text || "";
    let startParam: string | undefined;
    if (text.startsWith("/start ")) {
      startParam = text.slice(7).trim();
    }

    return {
      messageType,
      startParam,
      isGroupMessage: msg.chat?.type !== "private",
      groupId: msg.chat?.type !== "private" ? String(msg.chat?.id) : undefined,
    };
  },

  transformMessageForAgent(rawMessage: string, routingInfo: ProviderRoutingInfo): string {
    // Replace "/start slug" with greeting
    if (rawMessage.startsWith("/start")) return "Hello";
    return rawMessage;
  },

  supportsTeamMirroring: true,

  async sendTeamMirror(credentials, message): Promise<SendResult> {
    const botToken = credentials.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return { success: false, error: "No bot token" };

    const lines = [
      `[${message.channelLabel}] *${message.contactName || "Customer"}:*`,
      `"${message.customerMessage.slice(0, 500)}"`,
      "",
      `*${message.agentName}*${message.agentRole ? ` (${message.agentRole})` : ""}:`,
      message.agentResponse.slice(0, 1000),
    ];

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: message.groupId,
          text: lines.join("\n"),
          parse_mode: "Markdown",
        }),
      }
    );

    return { success: response.ok };
  },

  async deployCustomChannel(args): Promise<DeployResult> {
    const token = args.credentials.botToken;
    if (!token) return { success: false, error: "Missing bot token" };

    // Validate token
    const meResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meResponse.json();
    if (!meData.ok) return { success: false, error: `Invalid token: ${meData.description}` };

    // Register webhook
    const webhookResponse = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: args.webhookUrl,
          secret_token: args.webhookSecret,
          allowed_updates: ["message", "callback_query", "my_chat_member"],
        }),
      }
    );

    const webhookData = await webhookResponse.json();
    if (!webhookData.ok) return { success: false, error: `Webhook failed: ${webhookData.description}` };

    return {
      success: true,
      metadata: {
        botUsername: meData.result.username,
        botId: meData.result.id,
        botFirstName: meData.result.first_name,
      },
    };
  },

  async sendInteractiveMessage(credentials, message): Promise<SendResult> {
    const botToken = credentials.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return { success: false, error: "No bot token" };

    const inlineKeyboard = message.buttons?.map((row) =>
      row.map((btn) => ({
        text: btn.label,
        callback_data: btn.callbackData,
      }))
    );

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: message.chatId,
          text: message.text,
          parse_mode: "Markdown",
          reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined,
        }),
      }
    );

    return { success: response.ok };
  },
};
```

### 3. Generic Webhook Processor

**File:** `convex/channels/webhooks.ts`

Replace `processTelegramWebhook` with a generic processor that delegates to the provider:

```typescript
/**
 * GENERIC WEBHOOK PROCESSOR
 *
 * Provider-agnostic webhook handler. Uses the provider's methods to:
 * 1. Extract routing info (deep links, message type, etc.)
 * 2. Normalize the inbound message
 * 3. Transform the message for the agent pipeline
 * 4. Resolve the organization
 * 5. Feed into agent execution
 *
 * Provider-specific logic stays in the provider. This handler orchestrates.
 */
export const processProviderWebhook = internalAction({
  args: {
    providerId: v.string(),
    payload: v.string(),
    orgIdHint: v.optional(v.id("organizations")),
    secretToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const provider = getProvider(args.providerId);
    if (!provider) {
      return { status: "error", message: `Provider ${args.providerId} not registered` };
    }

    const rawPayload = JSON.parse(args.payload);

    // 1. Let provider extract routing info
    const routingInfo = provider.extractRoutingInfo?.(rawPayload) || {};

    // 2. Handle non-message updates (callbacks, member changes)
    if (routingInfo.messageType === "callback" && provider.handleCallback) {
      // Route to provider's callback handler
      const chatId = rawPayload.callback_query?.message?.chat?.id;
      await provider.handleCallback(
        {} as ProviderCredentials,
        routingInfo.callbackData || "",
        String(chatId)
      );
      return { status: "callback_handled" };
    }

    if (routingInfo.messageType === "member_update") {
      // Handle group membership changes generically
      return handleMemberUpdate(ctx, args.providerId, rawPayload);
    }

    // 3. Normalize the inbound message
    const normalized = provider.normalizeInbound(rawPayload, {} as ProviderCredentials);
    if (!normalized) return { status: "skipped", message: "Not processable" };

    // 4. Transform message (e.g., replace /start with Hello)
    let messageForAgent = normalized.message;
    if (provider.transformMessageForAgent) {
      messageForAgent = provider.transformMessageForAgent(normalized.message, routingInfo);
    }

    // 5. Resolve organization
    let organizationId: Id<"organizations">;

    if (args.orgIdHint) {
      // Custom bot path — org known from webhook URL
      organizationId = args.orgIdHint;
    } else {
      // Platform bot path — use generic resolver
      const resolution = await resolveProviderChat(ctx, {
        providerId: args.providerId,
        externalId: normalized.externalContactIdentifier,
        senderName: normalized.metadata.senderName,
        startParam: routingInfo.startParam,
      });
      organizationId = resolution.organizationId;
    }

    // 6. Feed to agent pipeline
    const result = await (ctx.runAction as Function)(
      api.ai.agentExecution.processInboundMessage,
      {
        organizationId,
        channel: normalized.channel,
        externalContactIdentifier: normalized.externalContactIdentifier,
        message: messageForAgent,
        metadata: {
          ...normalized.metadata,
          messageType: routingInfo.messageType,
          isGroupMessage: routingInfo.isGroupMessage,
          groupId: routingInfo.groupId,
        },
      }
    );

    return result;
  },
});

// Keep processTelegramWebhook as a thin wrapper for backward compatibility
export const processTelegramWebhook = internalAction({
  args: {
    payload: v.string(),
    orgIdHint: v.optional(v.id("organizations")),
    secretToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return (ctx.runAction as Function)(
      internalApi.channels.webhooks.processProviderWebhook,
      { providerId: "telegram", ...args }
    );
  },
});
```

### 4. Generic Chat-to-Org Resolver

**File:** `convex/onboarding/providerResolver.ts` (new file, generalizes telegramResolver)

```typescript
/**
 * GENERIC PROVIDER CHAT-TO-ORG RESOLVER
 *
 * Maps (providerId, externalIdentifier) → organization.
 * Replaces telegramMappings with providerMappings.
 * Maintains backward compatibility with existing telegramResolver.
 */

export const resolveProviderChat = internalAction({
  args: {
    providerId: v.string(),
    externalId: v.string(),
    senderName: v.optional(v.string()),
    startParam: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Handle deep links (any provider)
    if (args.startParam) {
      return resolveDeepLink(ctx, args);
    }

    // Look up existing mapping
    const existing = await (ctx.runQuery as Function)(
      internalApi.onboarding.providerResolver.getMappingByExternalId,
      { providerId: args.providerId, externalIdentifier: args.externalId }
    );

    if (existing?.status === "active") {
      return { organizationId: existing.organizationId, isNew: false, routeToSystemBot: false };
    }

    if (existing?.status === "onboarding") {
      return { organizationId: PLATFORM_ORG_ID, isNew: false, routeToSystemBot: true };
    }

    // New user — create mapping, route to System Bot
    await (ctx.runMutation as Function)(
      internalApi.onboarding.providerResolver.createMapping,
      {
        providerId: args.providerId,
        externalIdentifier: args.externalId,
        senderName: args.senderName,
      }
    );

    return { organizationId: PLATFORM_ORG_ID, isNew: true, routeToSystemBot: true };
  },
});
```

### 5. Generic Team Mirroring

**File:** `convex/channels/teamMirror.ts` (new file, replaces telegramGroupMirror)

```typescript
/**
 * GENERIC TEAM CHANNEL MIRRORING
 *
 * Mirrors agent conversations to team channels (Telegram groups, Discord channels, Slack channels).
 * Provider-agnostic — delegates formatting and delivery to the provider.
 */

export const mirrorToTeamChannel = internalAction({
  args: {
    organizationId: v.id("organizations"),
    channel: v.string(),
    contactName: v.optional(v.string()),
    customerMessage: v.string(),
    agentName: v.string(),
    agentResponse: v.string(),
    agentSubtype: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Find team channel binding for this org
    const binding = await (ctx.runQuery as Function)(
      internalApi.channels.teamMirror.getTeamChannelBinding,
      { organizationId: args.organizationId }
    );

    if (!binding || !binding.customProperties?.mirroringEnabled) return;

    const providerId = binding.customProperties.providerId;
    const provider = getProvider(providerId);
    if (!provider?.supportsTeamMirroring || !provider.sendTeamMirror) return;

    // 2. Get credentials
    const credentials = await getCredentials(ctx, args.organizationId, providerId, binding);

    // 3. Delegate to provider
    await provider.sendTeamMirror(credentials, {
      groupId: binding.customProperties.channelIdentifier,
      channelLabel: args.channel,
      contactName: args.contactName || "Customer",
      customerMessage: args.customerMessage,
      agentName: args.agentName,
      agentRole: args.agentSubtype,
      agentResponse: args.agentResponse,
    });
  },
});
```

### 6. Generic Bot Deployment Tool

**File:** `convex/ai/tools/agencyTools.ts`

Replace `deploy_telegram_bot` with a generic tool:

```typescript
export const deployChannelBotTool: AITool = {
  name: "deploy_channel_bot",
  description: "Deploy a custom bot/channel for a client sub-organization. Supports Telegram, Discord, Slack, etc.",
  parameters: {
    type: "object",
    properties: {
      clientSlug: { type: "string", description: "Client org slug" },
      providerId: { type: "string", description: "Provider: telegram, discord, slack" },
      credentials: {
        type: "object",
        description: "Provider-specific credentials (e.g., { botToken: '...' } for Telegram)",
      },
    },
    required: ["clientSlug", "providerId", "credentials"],
  },
  execute: async (ctx, args) => {
    const provider = getProvider(args.providerId);
    if (!provider?.deployCustomChannel) {
      return { error: `Provider ${args.providerId} does not support custom bot deployment` };
    }

    const siteUrl = process.env.CONVEX_SITE_URL;
    const webhookSecret = generateSecret();
    const webhookUrl = `${siteUrl}/webhook/${args.providerId}?org=${clientOrg._id}`;

    const result = await provider.deployCustomChannel({
      credentials: args.credentials,
      webhookUrl,
      webhookSecret,
      organizationId: String(clientOrg._id),
    });

    if (result.success) {
      // Store credentials
      await storeProviderCredentials(ctx, clientOrg._id, args.providerId, {
        ...args.credentials,
        webhookSecret,
        ...result.metadata,
      });
    }

    return result;
  },
};
```

### 7. Update Agent Execution Pipeline

**File:** `convex/ai/agentExecution.ts`

Replace the Telegram-specific mirroring call with the generic one:

```typescript
// Step 14: Mirror to team channel (was: telegramGroupMirror.mirrorToTeamGroup)
if (assistantContent) {
  try {
    await ctx.scheduler.runAfter(0,
      internal.channels.teamMirror.mirrorToTeamChannel,
      {
        organizationId: args.organizationId,
        channel: args.channel,
        contactName: meta.senderName,
        customerMessage: args.message,
        agentName: config.displayName || agent.name,
        agentResponse: assistantContent,
        agentSubtype,
      }
    );
  } catch (e) {
    // Non-blocking
  }
}
```

### 8. Router Fallback Cleanup

**File:** `convex/channels/router.ts`

Replace provider-specific env var fallbacks with a generic pattern:

```typescript
// Instead of:
//   if (args.providerId === "telegram") { ... }
//   if (args.providerId === "infobip") { ... }
//
// Use a fallback registry:

const PLATFORM_FALLBACKS: Record<string, () => ProviderCredentials | null> = {
  telegram: () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    return token ? { telegramBotToken: token } as ProviderCredentials : null;
  },
  infobip: () => {
    const apiKey = process.env.INFOBIP_API_KEY;
    const baseUrl = process.env.INFOBIP_BASE_URL;
    return apiKey ? { infobipApiKey: apiKey, infobipBaseUrl: baseUrl } as ProviderCredentials : null;
  },
};

// In getProviderCredentials:
if (!storedCredentials) {
  const fallback = PLATFORM_FALLBACKS[args.providerId];
  if (fallback) return fallback();
  return null;
}
```

## Migration Strategy

1. **Phase A: Add new interface methods** — extend `ChannelProvider`, implement on Telegram provider
2. **Phase B: Create generic processor** — `processProviderWebhook` with backward-compat wrapper
3. **Phase C: Create generic resolver** — `providerResolver` alongside existing `telegramResolver`
4. **Phase D: Create generic mirroring** — `teamMirror.ts` alongside existing `telegramGroupMirror.ts`
5. **Phase E: Swap call sites** — update `agentExecution.ts`, `agencyTools.ts`, `teamTools.ts`
6. **Phase F: Data migration** — move `telegramMappings` to `providerMappings` (one-time script)
7. **Phase G: Deprecate** — mark old files as deprecated, remove after verification

**Critical:** Keep backward-compat wrappers throughout. Don't break existing Telegram functionality.

## Files Summary

| File | Change | Risk |
|---|---|---|
| `convex/channels/types.ts` | Extend ChannelProvider interface with 7 new optional methods + types | Low (additive) |
| `convex/channels/providers/telegramProvider.ts` | Implement new interface methods | Medium |
| `convex/channels/webhooks.ts` | Add generic `processProviderWebhook`, keep `processTelegramWebhook` as wrapper | Medium |
| `convex/onboarding/providerResolver.ts` | **New** — generic chat-to-org resolver | Low |
| `convex/channels/teamMirror.ts` | **New** — generic team mirroring | Low |
| `convex/ai/agentExecution.ts` | Step 14: swap `telegramGroupMirror` → `teamMirror` | Medium |
| `convex/ai/tools/agencyTools.ts` | Replace `deploy_telegram_bot` with `deploy_channel_bot` | Medium |
| `convex/ai/tools/teamTools.ts` | Swap `telegramGroupMirror.mirrorTagIn` → generic | Low |
| `convex/channels/router.ts` | Replace if/else fallbacks with fallback registry | Low |
| `convex/schema.ts` | Add `providerMappings` table | Low |

## What Each New Provider Needs After This

| Component | Before Refactor | After Refactor |
|---|---|---|
| Provider file | Required | Required |
| Registry entry | Required | Required |
| Webhook processor | **Duplicate entire function** | **None (generic)** |
| Mappings table | **New table per provider** | **None (shared)** |
| Group mirroring | **Duplicate entire file** | **Implement `sendTeamMirror`** |
| Bot deployment | **Duplicate setup file** | **Implement `deployCustomChannel`** |
| Deep link parsing | **Duplicate /start logic** | **Implement `extractRoutingInfo`** |
| Agent tools | **New provider-specific tool** | **None (generic)** |
| **Total new files** | **3-4 files** | **1 file** |

## Verification

1. **Telegram still works**: All existing Telegram functionality passes (text, voice, photo, groups, deep links)
2. **Generic processor**: `processProviderWebhook("telegram", ...)` produces same results as old `processTelegramWebhook`
3. **Generic resolver**: `providerResolver.resolveProviderChat("telegram", ...)` matches `telegramResolver`
4. **Generic mirroring**: Team group messages appear correctly
5. **Generic deployment**: `deploy_channel_bot("telegram", ...)` matches old `deploy_telegram_bot`
6. **Router fallbacks**: Platform bot still works without stored credentials
7. **New provider test**: Stub a minimal Discord provider — verify it works through generic processor without new files

## Estimated Effort

| Task | Effort |
|------|--------|
| Extend ChannelProvider interface + types | 0.25 session |
| Implement new methods on Telegram provider | 0.5 session |
| Generic webhook processor | 0.5 session |
| Generic resolver | 0.5 session |
| Generic team mirroring | 0.25 session |
| Generic bot deployment tool | 0.25 session |
| Update call sites (agentExecution, teamTools, etc.) | 0.25 session |
| Router fallback cleanup | 0.15 session |
| Testing + backward compatibility | 0.5 session |
| **Total** | **~3 sessions** |
