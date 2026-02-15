# PHASE 3 STEP 2: Telegram Identity Linking — Existing Org Owner Support

## Context

Quinn (System Bot) handles onboarding for new Telegram users. The pipeline works:
`/start` → `resolveChatToOrg` → `processInboundMessage` → Quinn guided interview → `completeOnboarding` → new org + agent created → routing flips.

**Problem**: If someone who already owns an org on the web platform sends `/start` to the Telegram bot, the system treats them as brand new and creates a **duplicate org**. There's no identity verification — Telegram chat_id is not linked to any platform user account.

**This task**: Build two secure identity-linking paths so existing org owners can connect their Telegram without creating duplicates.

---

## Bugs Fixed Before This Step (Already Done)

These are committed — do NOT re-implement:

1. **`convex/ai/agentExecution.ts:224`** — `ctx.scheduler.runAfter` now uses `await` (was causing Convex unawaited operation warning)
2. **`convex/onboarding/seedPlatformAgents.ts`** — `seedAll` now upserts an enterprise license + unlimited credit balance (`monthlyCreditsTotal: -1`) on the platform org so Quinn's LLM calls aren't blocked by credit checks
3. **`convex/channels/webhooks.ts`** — Webhook event recording now checks `result.status` instead of always recording "success"

**You still need to run `seedAll` in the Convex dashboard** to apply the credit/license seed.

---

## Current Routing Flow (telegramResolver.ts)

```
User sends /start
→ resolveChatToOrg(telegramChatId, senderName, startParam)
  → startParam exists? → deep link sub-org routing (already works)
  → existing mapping status==="active"? → route to their org's agent (already works)
  → existing mapping status==="onboarding"? → route to System Bot (resume interview)
  → no mapping? → create "onboarding" mapping → route to System Bot
```

The gap: there's no branch for "this person already has a web account + org but no telegram mapping."

---

## What To Build

### Path A: Email Verification (Organic Telegram Discovery)

User arrives in Telegram with no mapping, Quinn starts onboarding. Early in the conversation, Quinn should ask if they already have an account.

**Flow:**

1. Quinn's first message after language detection adds: "Do you already have a l4yercak3 account?"
2. If user says yes → Quinn asks for their email
3. Pipeline looks up email in `users` table (index: `by_email`)
4. If match found:
   a. Generate a 6-digit verification code (random, expires in 10 minutes)
   b. Store it: new `objects` row type `"telegram_link_code"` with `{ code, userId, email, telegramChatId, expiresAt }`
   c. Send the code to the user's email (use existing email infrastructure or Convex scheduled action)
   d. Quinn tells user: "I sent a code to your email. Enter it here to connect."
5. User enters code → Quinn extracts it → pipeline verifies:
   a. Look up `telegram_link_code` by code + telegramChatId
   b. Check not expired
   c. If valid: look up user's org via `organizationMembers` (index: `by_user`), create `telegramMappings` with status `"active"` pointing to their org, delete the code
   d. Quinn responds: "Connected to [org name]! Your next message goes to your agent."
6. If no email match or wrong code → offer to continue with normal onboarding (new org)

**Key implementation details:**
- Add a tool to Quinn's `enabledTools`: `"verify_telegram_link"` (or handle it in the interview flow)
- The verification code check should be an `internalMutation` (not exposed publicly)
- Code generation: `Math.random().toString().slice(2, 8)` for 6 digits
- Email sending: check if there's an existing email sending action in `convex/channels/` or use a simple scheduled action

### Path B: Deep Link from Dashboard

User is logged into the web app and wants to connect Telegram.

**Flow:**

1. Dashboard Settings UI → "Connect Telegram" button
2. Frontend calls a mutation that:
   a. Generates a one-time token (UUID or random string)
   b. Stores it: new `objects` row type `"telegram_link_token"` with `{ token, organizationId, userId, expiresAt }` (15 min expiry)
   c. Returns the token
3. Frontend shows a link: `https://t.me/{BOT_USERNAME}?start=link_{token}`
   - Also show a QR code for mobile convenience
4. User clicks link → Telegram sends `/start link_{token}` to the bot
5. In `resolveChatToOrg`, the `startParam` handler already processes `/start <param>`:
   - Add a new branch: if `startParam.startsWith("link_")`:
     a. Extract token: `startParam.slice(5)`
     b. Look up `telegram_link_token` by token
     c. Verify not expired
     d. Create `telegramMappings` entry with status `"active"` pointing to the token's org
     e. Delete the token (one-time use)
     f. Return `{ organizationId, isNew: false, routeToSystemBot: false }`
6. The message routes to their org's agent, which responds normally
7. Optionally, send a confirmation message: "Telegram connected to [org name]!"

**Key implementation details:**
- The token lookup should be an `internalQuery`
- Bot username comes from `TELEGRAM_BOT_USERNAME` env var (or hardcode for now)
- The `resolveChatToOrg` function needs a new branch before the existing deep link logic

---

## Schema Additions

### New fields on `telegramMappings` (optional)
```typescript
// Link the Telegram mapping to a platform user for identity tracking
userId: v.optional(v.id("users")),
```

### New object types (stored in `objects` table)

**`telegram_link_code`** (email verification — Path A):
```typescript
customProperties: {
  code: string,           // 6-digit code
  userId: Id<"users">,
  email: string,
  telegramChatId: string,
  expiresAt: number,      // Date.now() + 10 * 60 * 1000
  used: boolean,
}
```

**`telegram_link_token`** (dashboard deep link — Path B):
```typescript
customProperties: {
  token: string,          // UUID or random string
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  expiresAt: number,      // Date.now() + 15 * 60 * 1000
  used: boolean,
}
```

Both types go in the `objects` table using existing `by_org_type` index. No schema migration needed.

---

## Files to Create

| File | What |
|------|------|
| `convex/onboarding/telegramLinking.ts` | Mutations/queries for code generation, token generation, verification |

## Files to Modify

| File | What |
|------|------|
| `convex/onboarding/telegramResolver.ts` | Add `link_` token branch in `resolveChatToOrg` startParam handling |
| `convex/onboarding/seedPlatformAgents.ts` | Add `"verify_telegram_link"` to Quinn's `enabledTools` |
| `convex/ai/tools/registry.ts` | Register the `verify_telegram_link` tool |
| `convex/onboarding/completeOnboarding.ts` | Add pre-creation check: look up telegramMappings for prior active mapping before creating org |

---

## Key Existing Code References

### Schema: `users` table (`convex/schemas/coreSchemas.ts:9`)
```typescript
users = defineTable({
  email: v.string(),
  defaultOrgId: v.optional(v.id("organizations")),
  // ...
}).index("by_email", ["email"])
```

### Schema: `organizationMembers` (`convex/schemas/coreSchemas.ts:155`)
```typescript
organizationMembers = defineTable({
  userId: v.id("users"),
  organizationId: v.id("organizations"),
  role: v.id("roles"),
  isActive: v.boolean(),
  // ...
}).index("by_user", ["userId"])
  .index("by_user_and_org", ["userId", "organizationId"])
```

### Schema: `telegramMappings` (`convex/schemas/telegramSchemas.ts`)
```typescript
telegramMappings = defineTable({
  telegramChatId: v.string(),
  organizationId: v.id("organizations"),
  status: v.union(v.literal("onboarding"), v.literal("active"), v.literal("churned")),
  senderName: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_chat_id", ["telegramChatId"])
  .index("by_org", ["organizationId"])
```

### `resolveChatToOrg` startParam branch (`convex/onboarding/telegramResolver.ts:47-116`)
The deep link handler. Path B's `link_` token branch goes BEFORE the existing `resolveDeepLink` call.

### Quinn's enabled tools (`convex/onboarding/seedPlatformAgents.ts:302`)
```typescript
enabledTools: ["complete_onboarding"],
```
Add `"verify_telegram_link"` here.

### `completeOnboarding.ts:66-74` — Org creation (no duplicate check)
```typescript
const orgId = await ctx.runMutation(
  internalApi.onboarding.orgBootstrap.createMinimalOrg,
  { name: extractedData.businessName || "My Business", ... }
);
```
Add a pre-check here: query `telegramMappings` for any prior active mapping for this `telegramChatId`. If found, skip org creation and reuse the existing org.

### Tool registry (`convex/ai/tools/registry.ts`)
All agent tools are registered here with schema + execute function. Follow the existing pattern.

---

## Codebase Patterns

- **Dynamic require** for api imports: `const { api } = require("../_generated/api") as { api: any }`
- **Idempotent upsert**: query first, patch if exists, insert if not
- **`by_org_type` index** on objects table for lookups
- **`customProperties`** is the flexible JSON bag — all config lives here
- **Model ID**: Use `anthropic/claude-sonnet-4.5` (NOT the raw Anthropic ID)
- **`internalMutation`** for backend operations, `internalQuery` for read-only

---

## Quinn Interview Flow Modification

The onboarding interview template (`seedPlatformAgents.ts`) defines Quinn's phases:
1. Welcome & Language
2. Business Context
3. Agent Purpose
4. Confirmation & Creation

For Path A, Quinn needs to detect "existing user" before phase 2. Two options:

**Option 1: Add a new phase** "Account Detection" between Welcome and Business Context:
- Question: "Do you already have a l4yercak3 account?"
- If yes → email verification sub-flow
- If no → continue normal onboarding

**Option 2: Handle it in Quinn's system prompt** without changing the template:
- Add instruction to Quinn's system prompt: "Before asking business questions, ask if they already have an account. If they say yes, ask for their email and use the verify_telegram_link tool."
- The tool handles the rest

Option 2 is simpler and doesn't require template changes. The tool does the heavy lifting.

---

## Priority Order

1. **Path B (deep link)** — quickest to build, no Quinn changes needed, just `telegramResolver.ts` + `telegramLinking.ts` + a frontend button
2. **Duplicate-org guard in `completeOnboarding.ts`** — safety net regardless of linking
3. **Path A (email verification)** — requires new tool, Quinn prompt update, email sending

---

## Platform Org & Test Data

- Platform org ID: `kn7ec6jb5dpxyf3bt3y3g20x61816466` (env: `PLATFORM_ORG_ID`)
- Test Telegram chat_id: `8129322419` (Remington)
- Quinn agent ID: `q972372bxd3js15az458kxz10d816shg`
- Onboarding template ID: `q9796c0mx5vedkmgb2k604f86d816vw0`

---

## Testing Plan

1. **Path B**: Create a link token manually via Convex dashboard → send `/start link_{token}` → verify mapping created with correct org
2. **Path A**: Reset mapping → send `/start` → tell Quinn "I have an account" → provide email → verify code sent → enter code → verify mapping linked
3. **Duplicate guard**: Reset mapping → complete full onboarding → reset again → complete again → verify only one org exists (or second attempt reuses first)
