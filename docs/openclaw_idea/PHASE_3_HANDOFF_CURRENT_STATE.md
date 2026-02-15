# PHASE 3: Platform Agent Team — Current State & Debug Handoff

## What Was Built

Quinn (System Bot) and the onboarding interview template have been seeded on the platform org. The agent pipeline has been wired to auto-initialize guided interview mode when a new Telegram user arrives.

### Files Created

| File | What |
|------|------|
| `convex/onboarding/seedPlatformAgents.ts` | Upsert seed for Quinn + onboarding template + admin utilities |

### Files Modified

| File | What Changed |
|------|------|
| `convex/ai/agentExecution.ts` | Step 4.55: auto-init guided mode when `routeToSystemBot=true` and session is new; fixed model ID default to `anthropic/claude-sonnet-4.5` |
| `convex/ai/agentSessions.ts` | Added `initGuidedSession` internal mutation (converts freeform session → guided with interview state) |
| `convex/agentOntology.ts` | Fixed default model ID to `anthropic/claude-sonnet-4.5` |

### Database State (Confirmed via Logs)

- **Quinn** exists: `q972372bxd3js15az458kxz10d816shg` on platform org `kn7ec6jb5dpxyf3bt3y3g20x61816466`
- **Onboarding template** exists: `q9796c0mx5vedkmgb2k604f86d816vw0`
- Both have been upserted with correct model ID (`anthropic/claude-sonnet-4.5`)
- The seed is fully idempotent — re-run `seedAll` anytime to sync changes

### Admin Utilities in seedPlatformAgents.ts

| Function | Args | What |
|----------|------|------|
| `seedAll` | none | Upserts Quinn + template (preserves runtime stats) |
| `activateMappingManual` | `{ telegramChatId, organizationId? }` | Flips mapping to "active" |
| `resetMapping` | `{ telegramChatId }` | Deletes mapping + closes sessions for fresh onboarding test |
| `getOnboardingTemplateId` | `{ organizationId }` | Returns template ID (used by pipeline internally) |

---

## What's Broken — The Current Bug

### Symptom

When user `8129322419` (Remington) sends `/start` to the Telegram bot, no response comes back and no activity shows in the Terminal app. The logs show:

```
[Telegram] Resolved: org=kn7ec6jb5dpxyf3bt3y3g20x61816466 isNew=false systemBot=false
[Telegram] org=kn7ec6jb5dpxyf3bt3y3g20x61816466 chat=8129322419 from=Remington text=/start
```

Then silence — no `processInboundMessage` logs, no errors.

### Root Cause (Diagnosed)

The user's `telegramMappings` record has `status: "active"` pointing at the **platform org** (`kn7ec6jb5dpxyf3bt3y3g20x61816466`). This happened because `activateMappingManual` was run without a target org — it kept the existing platform org but flipped to "active".

When `resolveChatToOrg` sees `status === "active"`, it returns `routeToSystemBot: false`. This means:
1. The guided interview auto-init (step 4.55) is skipped
2. Quinn handles the message in freeform mode (no interview context)
3. But something causes `processInboundMessage` to fail silently after the resolution log

### Likely Secondary Issue

After resolving the mapping issue, `processInboundMessage` still shows no output. Possible causes:
- The webhook event recording (`recordWebhookEvent`) might be failing silently
- The message normalization step might be returning null for `/start` as a bare command
- There may be a credit check failure on the platform org
- The LLM call may be timing out

### Fix Steps

1. **Reset the mapping** so onboarding starts fresh:
   ```
   Run in Convex dashboard:
   onboarding/seedPlatformAgents:resetMapping
   Args: { "telegramChatId": "8129322419" }
   ```

2. **Send `/start` again** in Telegram. Now `resolveChatToOrg` will:
   - See unknown chat → create fresh mapping in `"onboarding"` → return `routeToSystemBot: true`
   - `processInboundMessage` step 4.55 will auto-init guided mode
   - Quinn responds with onboarding interview

3. **If still no response after reset**, debug the pipeline:
   - Check Convex logs for ANY output from `processInboundMessage`
   - Add a temporary log right at the top of `processInboundMessage` to confirm it's being called
   - Check if the platform org has credits (the pre-flight credit check at step 7.5 may block)
   - Check if `recordWebhookEvent` mutation exists and works (it's called before `processInboundMessage`)
   - Test Quinn directly via the API test channel to isolate Telegram-specific issues

---

## Architecture Reference

### How the Full Flow Should Work

```
User sends /start → Telegram webhook (POST /telegram-webhook)
→ processTelegramWebhook (convex/channels/webhooks.ts:498)
  → resolveChatToOrg (convex/onboarding/telegramResolver.ts:37)
    → Unknown chat → creates mapping status:"onboarding" → returns { routeToSystemBot: true }
  → processInboundMessage (convex/ai/agentExecution.ts:73)
    → getActiveAgentForOrg → finds Quinn (active, telegram binding)
    → resolveSession → creates new session (messageCount=0)
    → Step 4.55: routeToSystemBot=true + messageCount=0 → initGuidedSession
    → Step 4.6: sessionMode="guided" → loads interview context
    → buildAgentSystemPrompt (includes interview phase/question context)
    → LLM call via OpenRouter (claude-sonnet-4.5)
    → Quinn asks first onboarding question
    → sendMessage via Telegram Bot API
→ User responds → same pipeline, session already exists in guided mode
→ Interview phases advance via interviewRunner.ts
→ After confirmation phase → completeOnboarding.run
  → Creates org, bootstraps agent, flips mapping to "active" → new org
  → Next message goes to user's own agent
```

### Key Files

| File | What |
|------|------|
| `convex/onboarding/seedPlatformAgents.ts` | Quinn seed, soul, system prompt, interview template, admin utils |
| `convex/ai/agentExecution.ts` | Main pipeline: `processInboundMessage` (step 4.55 = guided init) |
| `convex/ai/agentSessions.ts` | `resolveSession`, `initGuidedSession`, message storage |
| `convex/ai/interviewRunner.ts` | Guided interview phase advancement, extraction, completion |
| `convex/onboarding/completeOnboarding.ts` | Post-interview: creates org, bootstraps agent, flips mapping |
| `convex/onboarding/telegramResolver.ts` | `resolveChatToOrg`: routes chat_id → org, sets routeToSystemBot |
| `convex/channels/webhooks.ts` | `processTelegramWebhook`: Telegram entry point, calls resolver + pipeline |
| `convex/agentOntology.ts` | `getActiveAgentForOrg`: finds Quinn by org + channel binding |
| `convex/ai/soulGenerator.ts` | `bootstrapAgent`: creates user's agent after onboarding |

### Codebase Patterns

- **Dynamic require** for api imports: `const { api } = require("../_generated/api") as { api: any }`
- **Idempotent upsert seeds** — query first, patch if exists, insert if not
- **`by_org_type` index** on objects table for agent/template lookups
- **`customProperties`** is the flexible JSON bag — all agent config lives here
- **Model ID**: Use `anthropic/claude-sonnet-4.5` (NOT `claude-sonnet-4-20250514`)
- **`internalMutation`** for seed scripts, `internalQuery` for read-only lookups

### Platform Org

- ID: `kn7ec6jb5dpxyf3bt3y3g20x61816466`
- Name: "l4yercak3 Platform"
- Env var: `PLATFORM_ORG_ID` (or `TEST_ORG_ID` fallback)

### Test User

- Telegram chat_id: `8129322419`
- Name: Remington
- Current mapping status: `"active"` → platform org (needs reset)

---

## Next Steps After Fixing the Bug

1. **Test full onboarding flow end-to-end**: `/start` → Quinn asks questions → `completeOnboarding` creates org + agent → mapping flips → next message goes to user's agent
2. **Verify the `complete_onboarding` tool** is registered in the tool registry (`convex/ai/tools/registry.ts`) — Quinn's `enabledTools` includes it but it needs to exist as a callable tool
3. **Verify Terminal app** shows webhook events and agent activity
4. **Test with a second user** to confirm the flow works for genuinely new users (not just reset ones)
