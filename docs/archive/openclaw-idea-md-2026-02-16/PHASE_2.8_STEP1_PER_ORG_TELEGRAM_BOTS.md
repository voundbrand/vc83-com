# Phase 2.8 Step 1: Per-Sub-Org Telegram Bots — Test & Deploy Workflow

## Goal

Each client sub-organization gets its own branded Telegram bot (e.g., `@ApothekeMarktBot`) instead of sharing the platform bot. Agency owners create sub-orgs in "testing mode" (deep link through `@l4yercak3_platform_bot`), then "deploy" by registering a custom bot token from @BotFather. This cleanly separates agency testing from production customer channels and prepares the infrastructure for the 4-layer architecture (Step 2).

## Depends On

- Step 11 (Agency Sub-Orgs) — sub-org bootstrap, deep link routing, agency tools
- Step 8 (Telegram Group Chat) — team group mirroring (remains platform-bot-only for now)
- Step 5 (Onboarding Completion) — agent bootstrap + soul generation
- Channel router infrastructure — provider bindings, credential lookup

## What Already Exists

| Component | Status | Location |
|---|---|---|
| `telegramBotToken` field on `ProviderCredentials` | Done | `convex/channels/types.ts:112` |
| `credentials.telegramBotToken \|\| env` fallback in provider | Done | `convex/channels/providers/telegramProvider.ts:102` |
| `getProviderCredentials` with `{providerId}_settings` lookup | Done | `convex/channels/router.ts:73-176` |
| `channel_provider_binding` objects for routing | Done | `convex/channels/router.ts:36-65` |
| Sub-org bootstrap with deep link registration | Done | `convex/onboarding/agencySubOrgBootstrap.ts:40-193` |
| Agency tools (`create_client_org`, `list_client_orgs`, `get_client_org_stats`) | Done | `convex/ai/tools/agencyTools.ts` |
| Deep link resolver (`deeplink:{slug}` entries) | Done | `convex/onboarding/agencySubOrgBootstrap.ts:201-249` |
| `/start?slug=xxx` redirect route | Done | `convex/http.ts:3456-3472` |
| `/telegram-webhook` POST route | Done | `convex/http.ts:3421-3447` |
| Webhook secret verification support | Done | `convex/channels/providers/telegramProvider.ts:146-158` |
| `telegramResolver.resolveChatToOrg` with deep link handling | Done | `convex/onboarding/telegramResolver.ts:37-133` |

## What's Missing

### 1. Router Has No Platform Telegram Fallback

The channel router (`router.ts`) has a platform SMS/Infobip fallback (lines 202-217) but no equivalent for Telegram. When `processTelegramWebhook` stops sending replies directly and delegates to the router, orgs without a `channel_provider_binding` for Telegram will fail.

### 2. Webhook Handler Bypasses the Router

`processTelegramWebhook` (webhooks.ts:256-357) sets `skipOutbound: true` and sends replies directly via `process.env.TELEGRAM_BOT_TOKEN` (line 330). This means **every reply goes through the platform bot**, regardless of whether the org has per-org credentials. This is the critical bug that blocks per-org bots.

### 3. No Per-Org Bot Token Storage

While `ProviderCredentials` has `telegramBotToken`, no code creates `telegram_settings` objects in the DB. There's no pipeline to validate a bot token, register a webhook, and store credentials.

### 4. No `deploy_telegram_bot` Agency Tool

The agency PM can create sub-orgs but has no tool to deploy a custom bot for them. The tool needs to: accept a @BotFather token, validate it, register the webhook, and store credentials.

### 5. No Custom Bot Awareness in Deep Link Redirect

The `/start?slug=xxx` redirect always sends users to the platform bot. After a sub-org deploys its own bot, the redirect should send users to `t.me/<customBotUsername>?start=xxx`.

### 6. No Testing vs Deployed Status Indicator

When `create_client_org` returns, there's no indication that the deep link is "testing mode." The agent should clearly communicate this and urge deployment.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TESTING MODE                             │
│                                                                 │
│  Agency Owner: "Create agent for Apotheke Schmidt"              │
│       │                                                         │
│       ▼                                                         │
│  create_client_org → bootstrapClientOrg                         │
│       │  Returns: deepLink, telegramMode: "testing"             │
│       │                                                         │
│       ▼                                                         │
│  Deep Link: /start?slug=apotheke-schmidt                        │
│       │  Redirects to: t.me/l4yercak3_platform_bot?start=...    │
│       │                                                         │
│       ▼                                                         │
│  Customer messages platform bot → telegramResolver              │
│       │  Resolves deep link → routes to sub-org agent           │
│       │                                                         │
│       ▼                                                         │
│  Agent replies via platform bot (shared token)                  │
│                                                                 │
│  ⚠️  "This is for testing. When ready, deploy your own bot     │
│       via @BotFather and use deploy_telegram_bot."              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       DEPLOYED MODE                             │
│                                                                 │
│  Agency Owner: "Deploy bot for Apotheke Schmidt"                │
│       │  Provides: @BotFather token                             │
│       ▼                                                         │
│  deploy_telegram_bot tool                                       │
│       │                                                         │
│       ├── 1. Validate token (Telegram getMe API)                │
│       ├── 2. Generate webhook secret                            │
│       ├── 3. Register webhook: /telegram-webhook?org=<orgId>    │
│       ├── 4. Store telegram_settings + channel_provider_binding │
│       └── 5. Return: @ApothekeMarktBot deployed!                │
│                                                                 │
│  Deep Link: /start?slug=apotheke-schmidt                        │
│       │  Now redirects to: t.me/ApothekeMarktBot?start=...      │
│       │                                                         │
│       ▼                                                         │
│  POST /telegram-webhook?org=<orgId>                             │
│       │  X-Telegram-Bot-Api-Secret-Token verified               │
│       │  Skip telegramResolver — route directly to org          │
│       │                                                         │
│       ▼                                                         │
│  Agent replies via custom bot token (per-org credentials)       │
│       │  Router → getProviderCredentials → telegram_settings    │
│       └── telegramProvider.sendMessage(orgToken, ...)           │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation

### 1. Add `telegramBotUsername` to ProviderCredentials

**File:** `convex/channels/types.ts:112`

```typescript
// Telegram
telegramBotToken?: string;
telegramBotUsername?: string;   // NEW: e.g., "ApothekeMarktBot" (for deep link redirects)
```

Additive, zero-risk.

---

### 2. Add Platform Telegram Fallback in Channel Router

**File:** `convex/channels/router.ts`

**A. In `getProviderCredentials` (after Infobip fallback, line ~173):**

```typescript
// Fallback: platform-owned Telegram bot (env vars)
if (args.providerId === "telegram") {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken) {
    return {
      providerId: "telegram",
      telegramBotToken: botToken,
      telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME,
    } as ProviderCredentials;
  }
}
```

This mirrors the existing Infobip fallback pattern (lines 120-172). When an org has no `telegram_settings` object, the platform bot token from env vars is used.

**B. In `sendMessage` handler (line ~204), add telegram fallback alongside SMS:**

```typescript
if (!binding) {
  if (args.channel === "sms" && /* existing SMS check */) {
    providerId = "infobip";
  } else if (args.channel === "telegram" && process.env.TELEGRAM_BOT_TOKEN) {
    providerId = "telegram";  // Platform Telegram fallback
  } else {
    return { success: false, error: `No provider configured for channel: ${args.channel}` };
  }
}
```

**Prerequisite for Step 3** — once `skipOutbound` is removed, the router must handle platform bot sends for orgs without custom bots.

---

### 3. Fix Critical Bug — Route Telegram Replies Through Router

**File:** `convex/channels/webhooks.ts:256-357`

This is the highest-risk change. Currently:
- Line 323: sets `skipOutbound: true` → agent pipeline skips router
- Lines 330-348: sends reply directly via `process.env.TELEGRAM_BOT_TOKEN`

**Changes:**

**A. Add new args for custom bot routing:**

```typescript
export const processTelegramWebhook = internalAction({
  args: {
    payload: v.string(),
    orgIdHint: v.optional(v.id("organizations")),  // NEW: from ?org= query param
    secretToken: v.optional(v.string()),             // NEW: X-Telegram-Bot-Api-Secret-Token header
  },
```

**B. Add custom bot path (before existing resolver logic):**

When `orgIdHint` is provided, skip `telegramResolver` and route directly:

```typescript
if (args.orgIdHint) {
  // CUSTOM BOT PATH — org identity known from webhook URL
  // 1. Fetch telegram_settings for webhook secret verification
  const credentials = await ctx.runQuery(
    internalApi.channels.router.getProviderCredentials,
    { organizationId: args.orgIdHint, providerId: "telegram" }
  );

  // 2. Verify webhook secret (reject tampered requests)
  if (credentials?.webhookSecret && args.secretToken !== credentials.webhookSecret) {
    console.error("[Telegram] Webhook secret mismatch for org", args.orgIdHint);
    return { status: "error", message: "Webhook verification failed" };
  }

  organizationId = args.orgIdHint;
} else {
  // PLATFORM BOT PATH — existing resolver flow (unchanged)
  // ... existing startParam + telegramResolver logic ...
}
```

**C. Remove `skipOutbound: true` from metadata:**

```typescript
// BEFORE:
metadata: { ...normalized.metadata, skipOutbound: true }

// AFTER:
metadata: { ...normalized.metadata }
```

This lets `agentExecution.ts` step 13 (line 565) route through the channel router, which calls `getProviderCredentials` → gets per-org token or platform fallback → `telegramProvider.sendMessage`.

**D. Remove the direct Telegram API send (lines 328-348):**

Delete the entire block:
```typescript
// REMOVE THIS ENTIRE BLOCK:
if (result.status === "success" && result.response) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken) {
    const sendRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      { ... }
    );
    // ...
  }
}
```

The router handles delivery now.

---

### 4. Update HTTP Handlers

**File:** `convex/http.ts`

**A. `/telegram-webhook` route (line 3421):**

Parse `?org=` query parameter and extract webhook secret header:

```typescript
http.route({
  path: "/telegram-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const orgParam = url.searchParams.get("org") || undefined;  // NEW
      const secretToken = request.headers.get("x-telegram-bot-api-secret-token") || undefined;  // NEW
      const body = await request.text();

      await ctx.runAction(
        internal.channels.webhooks.processTelegramWebhook,
        {
          payload: body,
          orgIdHint: orgParam,      // NEW: undefined for platform bot, orgId for custom bots
          secretToken,               // NEW: webhook verification
        }
      );

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[Telegram Webhook] Error:", getErrorMessage(error));
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});
```

**B. `/start` redirect route (line 3456):**

Resolve custom bot username for deployed orgs:

```typescript
http.route({
  path: "/start",
  method: "GET",
  handler: httpAction(async (ctx, request) => {  // NOTE: _ctx → ctx (now needed)
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") || "";
    if (!slug) {
      return new Response("Missing slug parameter", { status: 400 });
    }

    // NEW: Check if sub-org has a custom bot
    let botUsername = process.env.TELEGRAM_BOT_USERNAME || "l4yercak3_platform_bot";

    const deepLink = await ctx.runQuery(
      internal.onboarding.agencySubOrgBootstrap.resolveDeepLink,
      { slug }
    );

    if (deepLink?.organizationId) {
      const credentials = await ctx.runQuery(
        internal.channels.router.getProviderCredentials,
        { organizationId: deepLink.organizationId, providerId: "telegram" }
      );
      if (credentials?.telegramBotUsername) {
        botUsername = credentials.telegramBotUsername;
      }
    }

    const telegramUrl = `https://t.me/${botUsername}?start=${slug}`;
    return new Response(null, {
      status: 302,
      headers: { Location: telegramUrl },
    });
  }),
});
```

---

### 5. Create Bot Deployment Pipeline

**New file:** `convex/channels/telegramBotSetup.ts`

Four functions:

**`validateBotToken` (internalAction):**
- Calls `https://api.telegram.org/bot{token}/getMe`
- Returns `{ id, username, first_name }` or `null`

**`registerWebhookWithTelegram` (internalAction):**
- Calls `https://api.telegram.org/bot{token}/setWebhook`
- Passes `url`, `secret_token`, `allowed_updates: ["message", "my_chat_member"]`
- Returns `{ success, description }`

**`storeTelegramSettings` (internalMutation):**
- Upserts `objects` entry with `type: "telegram_settings"`, scoped to org
- `customProperties: { telegramBotToken, telegramBotUsername, webhookSecret }`
- Also upserts `channel_provider_binding` for `telegram` channel if none exists
- Follows same pattern as `chatwoot_settings`, `infobip_settings`

**`deployBot` (internalAction) — orchestrates the pipeline:**
1. Validate token via `validateBotToken`
2. Generate random webhook secret (16 hex bytes via `crypto.getRandomValues`)
3. Build webhook URL: `{CONVEX_SITE_URL}/telegram-webhook?org={orgId}`
4. Register webhook via `registerWebhookWithTelegram`
5. Store settings via `storeTelegramSettings`
6. Return `{ success, botUsername, botName, webhookUrl, message }`

---

### 6. Add `deploy_telegram_bot` Agency Tool

**File:** `convex/ai/tools/agencyTools.ts`

New tool definition:

```typescript
export const deployTelegramBotTool: AITool = {
  name: "deploy_telegram_bot",
  description: `Deploy a custom Telegram bot for a client sub-organization.
The agency owner must first create a bot via @BotFather in Telegram and provide the token.
After deployment, customers message @CustomBotName directly instead of using the platform bot.`,
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      clientSlug: {
        type: "string",
        description: "The client org slug (e.g., 'apotheke-schmidt')",
      },
      botToken: {
        type: "string",
        description: "The bot token from @BotFather (e.g., '1234567890:ABCdef...')",
      },
    },
    required: ["clientSlug", "botToken"],
  },
  execute: async (ctx, args) => {
    // 1. Look up child org by slug
    // 2. Verify parentOrganizationId matches caller's org
    // 3. Call telegramBotSetup.deployBot
    // 4. Return result
  },
};
```

**Gating:** Same `subOrgsEnabled` check — add `"deploy_telegram_bot"` to `agencyOnlyTools` set in `agentExecution.ts:filterToolsForAgent`.

**File:** `convex/ai/tools/registry.ts`

Add import + register alongside other agency tools (line 3485-3487):

```typescript
import { ..., deployTelegramBotTool } from "./agencyTools";

// In TOOL_REGISTRY:
deploy_telegram_bot: deployTelegramBotTool,
```

---

### 7. Update Outputs for Testing/Deployed Awareness

**File:** `convex/ai/tools/agencyTools.ts` — `listClientOrgsTool`

For each child org, query `getProviderCredentials(org, "telegram")`:
- If custom `telegramBotUsername` exists → `telegramMode: "deployed"`, show `@BotUsername`
- Otherwise → `telegramMode: "testing"`, show deep link only
- Update `_note`: "Clients in 'testing' mode use the platform bot. Use deploy_telegram_bot to give them their own branded bot."

**File:** `convex/onboarding/agencySubOrgBootstrap.ts` — `bootstrapClientOrg` return (line 184)

Add `telegramMode: "testing"` and update message:

```typescript
return {
  success: true,
  childOrganizationId: childOrgId,
  slug,
  agentId: bootstrapResult?.agentId,
  agentName: finalAgentName,
  deepLink: `${siteUrl}/start?slug=${slug}`,
  telegramMode: "testing",
  message: `Created "${args.businessName}" with agent "${finalAgentName}". ` +
    `The deep link is for TESTING — messages go through the platform bot. ` +
    `When ready to go live, create a bot via @BotFather and use deploy_telegram_bot.`,
};
```

## Files Summary

| File | Change | Risk |
|---|---|---|
| `convex/channels/types.ts` | Add `telegramBotUsername` field | None |
| `convex/channels/router.ts` | Platform Telegram fallback in credentials + sendMessage | Low |
| `convex/channels/webhooks.ts` | Remove direct API call, add orgIdHint routing, remove skipOutbound | **High** |
| `convex/http.ts` | Parse `?org=` param, resolve custom bot in `/start` redirect | Medium |
| `convex/channels/telegramBotSetup.ts` | **New file** — bot validation, webhook registration, credential storage | Low |
| `convex/ai/tools/agencyTools.ts` | Add `deploy_telegram_bot` tool, update `list_client_orgs` output | Low |
| `convex/ai/tools/registry.ts` | Register new tool | None |
| `convex/ai/agentExecution.ts` | Add `deploy_telegram_bot` to `agencyOnlyTools` set | None |
| `convex/onboarding/agencySubOrgBootstrap.ts` | Update return value with testing mode indicator | None |

## Security Considerations

- **Webhook secret verification**: Each custom bot gets a random 32-char hex secret registered via `setWebhook`. Incoming updates are verified via `X-Telegram-Bot-Api-Secret-Token` header before processing.
- **Org ID in URL is not sufficient auth**: The `?org=<orgId>` query param is paired with webhook secret verification. Without the matching secret, requests are rejected.
- **Bot token storage**: Follows existing plaintext pattern (same as Infobip API keys, Chatwoot tokens in objects table). Future: encrypt via `oauth.encryption` module.
- **Parent-child enforcement**: `deploy_telegram_bot` tool verifies `parentOrganizationId` matches the caller's org before deploying.

## Verification

1. **Regression**: Message platform bot → reply arrives (now via router, not direct API call)
2. **Deep link (testing)**: `/start?slug=xxx` redirects to platform bot for orgs without custom bot
3. **Custom bot deploy**: Create test bot via @BotFather → `deploy_telegram_bot` → message custom bot → reply arrives from custom bot
4. **Deep link (deployed)**: After deploying custom bot, `/start?slug=xxx` redirects to `t.me/<customBot>`
5. **Webhook secret**: Tampered requests to `?org=<id>` without valid secret → rejected
6. **Isolation**: Custom bot on org A doesn't affect org B using platform bot
7. **Fallback**: If custom bot fails (token revoked), platform bot still works for other orgs
