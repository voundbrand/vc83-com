# Phase 5 Step 1: Telegram Backend API

## Goal

Create the public backend API that the Telegram settings UI will call. Bridges existing internal functions to the frontend.

## Depends On

- `convex/channels/telegramBotSetup.ts` — `deployBot` internal action
- `convex/channels/telegramGroupSetup.ts` — `getTeamGroupForOrg` internal query
- `convex/schemas/telegramSchemas.ts` — `telegramMappings` table with `by_org` index
- `convex/integrations/chatwoot.ts` — session validation pattern (lines 47-51)

## New File

**`convex/integrations/telegram.ts`**

### 1. `getTelegramIntegrationStatus` (query)

**Args:** `{ sessionId: v.string() }`

**Logic:**
1. Validate session → get user → get `defaultOrgId`
2. Query `telegramMappings` by `by_org` index → platform bot info
3. Query `objects` by `by_org_type` where `type="telegram_settings"` → custom bot info
4. Query `agentSessions` by `by_org_status` where `status="active"`, filter `channel==="telegram"` → chat count

**Returns:**
```typescript
{
  platformBot: {
    connected: boolean;
    chatId: string | null;
    senderName: string | null;
    connectedAt: number | null;
    status: "onboarding" | "active" | "churned" | null;
  };
  customBot: {
    deployed: boolean;
    botUsername: string | null;
    webhookUrl: string | null;
  };
  teamGroup: {
    linked: boolean;
    groupChatId: string | null;
    mirrorEnabled: boolean;
  };
  activeChatCount: number;
}
```

### 2. `deployCustomBot` (action)

**Args:** `{ sessionId: v.string(), botToken: v.string() }`

**Logic:**
1. Validate session → get orgId
2. Call `ctx.runAction(internal.channels.telegramBotSetup.deployBot, { organizationId: orgId, telegramBotToken: args.botToken })`
3. Return result (success/error/botUsername/webhookUrl)

### 3. `disconnectCustomBot` (mutation)

**Args:** `{ sessionId: v.string() }`

**Logic:**
1. Validate session → get orgId
2. Find `telegram_settings` object → delete
3. Find telegram `channel_provider_binding` objects → delete each

### 4. `toggleTeamGroupMirror` (mutation)

**Args:** `{ sessionId: v.string(), enabled: v.boolean() }`

**Logic:**
1. Validate session → get orgId
2. Find mapping by `by_org` index → patch `teamGroupEnabled`

## Session Validation Pattern

```typescript
const session = await ctx.db.get(args.sessionId as Id<"sessions">);
if (!session || session.expiresAt < Date.now()) return null;
const user = await ctx.db.get(session.userId);
if (!user || !user.defaultOrgId) return null;
const orgId = user.defaultOrgId as Id<"organizations">;
```

## Verification

- `npx tsc --noEmit` compiles
- Query returns correct data shape when called with valid session
- Deploy action wraps internal deployBot correctly
