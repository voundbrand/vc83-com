# Phase 2.9 Step 1: Productionize Telegram Bridge — Webhook Mode

## Goal

Eliminate the separate `npx tsx scripts/telegram-bridge.ts` terminal process. All Telegram message handling runs inside Convex via webhook — no external processes, no manual restarts, no monitoring gaps. The bridge script remains available for local development but is no longer required for production.

## Depends On

- Phase 2.8 Step 1 (Per-Org Telegram Bots) — custom bot webhook registration
- Phase 2.5 (Telegram Onboarding) — telegramResolver, System Bot routing
- Existing webhook endpoint at `/telegram-webhook` in `convex/http.ts`

## What Already Exists

| Component | Status | Location |
|---|---|---|
| `/telegram-webhook` HTTP route | Done | `convex/http.ts:3421-3447` |
| `processTelegramWebhook` internal action | Done | `convex/channels/webhooks.ts:256-353` |
| Webhook secret verification | Done | `convex/channels/webhooks.ts:308-311` |
| Platform bot path (telegramResolver) | Done | `convex/channels/webhooks.ts:316-330` |
| Custom bot path (orgIdHint) | Done | `convex/channels/webhooks.ts:300-313` |
| Provider `normalizeInbound()` | Done | `convex/channels/providers/telegramProvider.ts` |
| Agent pipeline `processInboundMessage` | Done | `convex/ai/agentExecution.ts` |
| Outbound via channel router | Done | `convex/channels/router.ts:sendMessage` |
| Bridge script (long-polling, 503 lines) | Done (dev only) | `scripts/telegram-bridge.ts` |

## What's Missing

### 1. Bridge Features Not in Webhook

The bridge script handles several message types that the webhook processor does not:

| Feature | Bridge | Webhook |
|---------|--------|---------|
| Text messages | Yes | Yes |
| `/start` deep links | Yes | Yes |
| Voice notes (transcription) | Yes | **No** |
| Photo analysis | Yes | **No** |
| Document parsing | Yes | **No** |
| Callback queries (soul evolution buttons) | Yes | **No** |
| `my_chat_member` (bot added to group) | Yes | **No** |
| Group message routing | Yes | **No** |
| Markdown → plain text fallback on error | Yes | **No** |
| `/mute` and `/unmute` group commands | Yes | **No** |

### 2. Outbound Reply Delivery

The webhook processor currently relies on the agent pipeline's step 13 (outbound routing via `channels.router.sendMessage`) to send replies. This works when the org has a `channel_provider_binding` for Telegram with stored credentials. But:

- **Platform bot replies** need a fallback to `process.env.TELEGRAM_BOT_TOKEN`
- The router's platform-Telegram fallback was added in Step 1 (Phase 2.8) but should be verified end-to-end

### 3. Error Recovery for Failed Replies

If the Telegram API rejects a reply (e.g., Markdown parse error), the bridge retries with plain text. The webhook processor does not have this retry logic.

### 4. Multi-Bot Webhook Registration

When a custom bot is deployed via `deploy_telegram_bot`, its webhook must be registered to point to `/telegram-webhook?org=<orgId>`. This registration exists in `telegramBotSetup.ts` but hasn't been tested end-to-end with the webhook processor.

### 5. Health Monitoring

No way to know if webhook processing is working. Need basic observability.

## Architecture

```
CURRENT (dev mode):
┌──────────┐    Long-poll     ┌──────────────────┐     Action      ┌─────────┐
│ Telegram │ ◄──────────────► │ telegram-bridge   │ ──────────────► │ Convex  │
│ Bot API  │                  │ (terminal process)│                 │ Backend │
└──────────┘                  └──────────────────┘                 └─────────┘

PRODUCTION (webhook mode):
┌──────────┐    Webhook POST  ┌──────────────────┐
│ Telegram │ ────────────────►│ Convex HTTP Route │
│ Bot API  │                  │ /telegram-webhook │
└──────────┘                  └────────┬─────────┘
                                       │ schedule
                                       ▼
                              ┌──────────────────┐     Action      ┌─────────┐
                              │ processTelegram   │ ──────────────► │ Agent   │
                              │ Webhook (internal)│                 │Pipeline │
                              └──────────────────┘                 └─────────┘
```

## Implementation

### 1. Extend `processTelegramWebhook` for Full Message Type Support

**File:** `convex/channels/webhooks.ts`

Add handling for all message types the bridge currently supports:

```typescript
export const processTelegramWebhook = internalAction({
  args: {
    payload: v.string(),
    orgIdHint: v.optional(v.id("organizations")),
    secretToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rawPayload = JSON.parse(args.payload);

    // --- CALLBACK QUERIES (soul evolution buttons, inline actions) ---
    if (rawPayload.callback_query) {
      return handleCallbackQuery(ctx, rawPayload.callback_query);
    }

    // --- MY_CHAT_MEMBER (bot added/removed from group) ---
    if (rawPayload.my_chat_member) {
      return handleChatMemberUpdate(ctx, rawPayload.my_chat_member);
    }

    // --- MESSAGES (text, voice, photo, document) ---
    const msg = rawPayload.message || rawPayload.edited_message;
    if (!msg) return { status: "skipped", message: "No processable update" };

    // Determine message type and extract content
    const messageType = detectMessageType(msg);

    // For media messages, download + process via media tools
    let messageForAgent: string;
    let mediaMetadata: Record<string, unknown> = {};

    switch (messageType) {
      case "voice":
      case "audio":
        // Get file URL from Telegram, pass to agent with transcription hint
        const audioFileId = msg.voice?.file_id || msg.audio?.file_id;
        mediaMetadata = { mediaType: "audio", telegramFileId: audioFileId };
        messageForAgent = "[Voice message received — please transcribe]";
        break;

      case "photo":
        const photoFileId = msg.photo?.[msg.photo.length - 1]?.file_id;
        mediaMetadata = { mediaType: "image", telegramFileId: photoFileId };
        messageForAgent = msg.caption || "[Photo received — please analyze]";
        break;

      case "document":
        mediaMetadata = { mediaType: "document", telegramFileId: msg.document?.file_id };
        messageForAgent = msg.caption || "[Document received — please parse]";
        break;

      default:
        // Text message (existing logic)
        messageForAgent = msg.text || "";
    }

    // Handle /start deep link (existing logic, unchanged)
    // ...

    // Resolve org (existing logic, unchanged)
    // ...

    // Handle group commands (/mute, /unmute)
    if (msg.chat?.type !== "private" && messageForAgent.startsWith("/")) {
      return handleGroupCommand(ctx, msg, organizationId);
    }

    // Feed to agent pipeline
    const result = await processInboundMessage({
      organizationId,
      channel: "telegram",
      externalContactIdentifier: chatId,
      message: messageForAgent,
      metadata: {
        ...normalized.metadata,
        ...mediaMetadata,
      },
    });

    return result;
  },
});
```

**Helper functions to add:**

```typescript
function detectMessageType(msg: Record<string, unknown>): string {
  if (msg.voice) return "voice";
  if (msg.audio) return "audio";
  if (msg.photo) return "photo";
  if (msg.document) return "document";
  if (msg.text) return "text";
  return "unknown";
}

async function handleCallbackQuery(ctx, query) {
  // Route soul_* callbacks to soulEvolution.handleTelegramCallback
  // Route other callbacks to appropriate handlers
  // Answer the callback query to dismiss the loading spinner
}

async function handleChatMemberUpdate(ctx, update) {
  // If bot was added to a group → register group for team mirroring
  // If bot was removed → deregister group
  // Delegates to telegramGroupSetup
}

async function handleGroupCommand(ctx, msg, orgId) {
  // /mute → pause mirroring for this group
  // /unmute → resume mirroring
  // Other commands → ignore
}
```

### 2. Outbound Reply Resilience

**File:** `convex/channels/providers/telegramProvider.ts`

Add Markdown-to-plain-text fallback in `sendMessage`:

```typescript
async sendMessage(credentials, message): Promise<SendResult> {
  const botToken = credentials.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;

  // Attempt with Markdown
  let response = await telegramSend(botToken, {
    chat_id: message.recipientId,
    text: escapeTelegramMarkdownUrls(message.content),
    parse_mode: "Markdown",
  });

  // Fallback: if Markdown parse fails (400), retry as plain text
  if (!response.ok) {
    const errorBody = await response.json();
    if (errorBody?.description?.includes("can't parse")) {
      response = await telegramSend(botToken, {
        chat_id: message.recipientId,
        text: message.content, // No parse_mode
      });
    }
  }

  return { success: response.ok, messageId: result?.message_id };
}
```

### 3. Webhook Registration Utility

**File:** `convex/channels/telegramBotSetup.ts` (extend existing)

Add a setup function for the platform bot webhook:

```typescript
/**
 * Register the platform bot's webhook with Telegram.
 * Call this once during deployment or via admin action.
 */
export const registerPlatformWebhook = internalAction({
  args: {},
  handler: async (ctx) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!botToken || !siteUrl) throw new Error("Missing TELEGRAM_BOT_TOKEN or CONVEX_SITE_URL");

    const webhookUrl = `${siteUrl}/telegram-webhook`;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET || generateSecret();

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret,
          allowed_updates: ["message", "callback_query", "my_chat_member"],
          drop_pending_updates: false,
        }),
      }
    );

    const result = await response.json();
    if (!result.ok) throw new Error(`Webhook registration failed: ${result.description}`);

    console.log(`[Telegram] Platform webhook registered: ${webhookUrl}`);
    return { success: true, webhookUrl };
  },
});
```

### 4. Health Monitoring

**File:** `convex/channels/webhooks.ts` (add to existing)

Track webhook processing stats:

```typescript
/**
 * Record webhook processing result for monitoring.
 * Stored as lightweight objects for dashboard queries.
 */
export const recordWebhookEvent = internalMutation({
  args: {
    provider: v.string(),
    status: v.string(),
    organizationId: v.optional(v.id("organizations")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("objects", {
      organizationId: args.organizationId || ("system" as any),
      type: "webhook_event",
      subtype: args.provider,
      name: `${args.provider}_${args.status}`,
      status: args.status === "success" ? "active" : "draft",
      customProperties: {
        provider: args.provider,
        status: args.status,
        errorMessage: args.errorMessage,
        processedAt: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

Add a health check query:

```typescript
/**
 * Get webhook health for the last N minutes.
 * Used by admin dashboard and monitoring alerts.
 */
export const getWebhookHealth = internalQuery({
  args: {
    provider: v.string(),
    sinceMinutesAgo: v.number(),
  },
  handler: async (ctx, args) => {
    const since = Date.now() - args.sinceMinutesAgo * 60_000;
    const events = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "webhook_event"))
      .filter((q) => q.gte(q.field("createdAt"), since))
      .collect();

    const filtered = events.filter(
      (e) => (e.customProperties as any)?.provider === args.provider
    );

    return {
      total: filtered.length,
      success: filtered.filter((e) => e.status === "active").length,
      errors: filtered.filter((e) => e.status === "draft").length,
      lastProcessed: filtered[filtered.length - 1]?.createdAt || null,
    };
  },
});
```

### 5. HTTP Route Enhancement

**File:** `convex/http.ts`

The existing route is functional. One enhancement — verify the webhook secret for the platform bot:

```typescript
http.route({
  path: "/telegram-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.text();

      // Extract org hint from query param (custom bots)
      const url = new URL(request.url);
      const orgIdHint = url.searchParams.get("org") || undefined;

      // Extract webhook secret header
      const secretToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || undefined;

      // Schedule async processing (respond immediately to Telegram)
      await ctx.scheduler.runAfter(0, internal.channels.webhooks.processTelegramWebhook, {
        payload: body,
        orgIdHint: orgIdHint ? (orgIdHint as Id<"organizations">) : undefined,
        secretToken,
      });

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("[Telegram Webhook] Error:", error);
      return new Response("Error", { status: 500 });
    }
  }),
});
```

## Migration Plan

1. **Deploy webhook processor changes** — extend `processTelegramWebhook` with full message type support
2. **Test in parallel** — run both bridge script and webhook simultaneously (Telegram allows only one, so test sequentially)
3. **Register platform webhook** — call `registerPlatformWebhook` action once
4. **Verify** — send messages via Telegram, confirm responses arrive without bridge running
5. **Keep bridge script** — for local dev, the bridge remains useful (no webhook needed for `npx convex dev`)

## Files Summary

| File | Change | Risk |
|---|---|---|
| `convex/channels/webhooks.ts` | Extend with voice/photo/doc/callback/group handling, health tracking | Medium |
| `convex/channels/providers/telegramProvider.ts` | Add Markdown fallback retry in sendMessage | Low |
| `convex/channels/telegramBotSetup.ts` | Add `registerPlatformWebhook` action | Low |
| `convex/http.ts` | Add secret token header extraction (minor) | Low |
| `scripts/telegram-bridge.ts` | No changes (keep for dev) | None |

## Verification

1. **Text messages**: Send text → get response (no bridge running)
2. **Voice notes**: Send voice → agent transcribes and responds
3. **Photos**: Send photo → agent describes/analyzes
4. **Documents**: Send doc → agent parses content
5. **Soul evolution buttons**: Click approve/reject → callback handled
6. **Group mirroring**: Bot added to group → mirroring starts
7. **Deep links**: `/start slug` → routes to correct sub-org agent
8. **Markdown fallback**: Agent response with bad markdown → retries as plain text
9. **Health monitoring**: Admin query shows successful webhook events
10. **Custom bots**: Per-org bot receives webhook at `/telegram-webhook?org=<id>`

## Estimated Effort

| Task | Effort |
|------|--------|
| Extend webhook processor (message types) | 0.5 session |
| Reply resilience + fallback | 0.25 session |
| Webhook registration utility | 0.25 session |
| Health monitoring | 0.25 session |
| Testing + migration | 0.5 session |
| **Total** | **~1.5 sessions** |
