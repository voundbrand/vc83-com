# PHASE 3: Seed Platform Agent Team (System Bot "Quinn")

## Context

The platform uses a 4-layer organization hierarchy (L1 Platform → L2 Agency → L3 Client → L4 End-Customer). When a new user sends `/start` to the Telegram bot, the `resolveChatToOrg` flow creates a `telegramMappings` entry with status `"onboarding"` and routes messages to the **platform org** (`PLATFORM_ORG_ID` env var).

The agent pipeline (`processInboundMessage` → `getActiveAgentForOrg`) then looks for an active agent on the platform org with channel binding `telegram`. **This agent does not exist yet**, so new users get silence.

The platform org needs a **System Bot team** — the L1 agent team that handles onboarding, platform-level inquiries, and routes users to their own agents after onboarding completes.

## Architecture

### How agents are stored

Agents live in the `objects` table with `type: "org_agent"`:

```typescript
{
  organizationId: Id<"organizations">,  // Platform org ID
  type: "org_agent",
  subtype: "system" | "pm" | "customer_service" | etc.,
  name: "Quinn",
  status: "active",
  customProperties: {
    displayName: "Quinn",
    personality: "...",
    soul: { /* see soul structure below */ },
    systemPrompt: "...",
    language: "en",
    additionalLanguages: ["de", "pl", "es"],
    enabledTools: ["complete_onboarding", "list_team_agents", ...],
    autonomyLevel: "autonomous",
    maxMessagesPerDay: 1000,
    maxCostPerDay: 50.0,
    modelProvider: "openrouter",
    modelId: "anthropic/claude-sonnet-4.5",
    temperature: 0.7,
    maxTokens: 4096,
    channelBindings: [
      { channel: "telegram", enabled: true },
      { channel: "webchat", enabled: true }
    ],
    faqEntries: [...],
    knowledgeBaseTags: [],
    totalMessages: 0,
    totalCostUsd: 0,
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
}
```

### How the pipeline finds agents

`getActiveAgentForOrg` in `convex/agentOntology.ts` (line 106):
1. Queries `objects` with index `by_org_type` where `organizationId=platformOrgId` and `type="org_agent"`
2. Filters for `status === "active"`
3. If `channel` arg provided, checks `customProperties.channelBindings` for matching enabled binding
4. Falls back to first active agent

### How soul generation works

`bootstrapAgent` in `convex/ai/soulGenerator.ts` (line 195):
1. Calls `createAgentInternal` (creates agent in "draft" status)
2. Calls `generateSoul` via OpenRouter LLM (temperature 0.8)
3. Saves soul via `updateAgentSoulInternal`
4. Calls `activateAgentInternal` (sets status to "active")

Soul is generated from business context — org name, industry, target audience, tone preference.

### How onboarding completes

`completeOnboarding.run` in `convex/onboarding/completeOnboarding.ts`:
1. Reads `extractedData` from interview session (business name, industry, etc.)
2. Creates new organization via `orgBootstrap.createMinimalOrg`
3. Seeds credits
4. Bootstraps customer's agent via `soulGenerator.bootstrapAgent`
5. Flips `telegramMappings` status from `"onboarding"` → `"active"`, repoints to new org
6. Sends intro message from new agent via Telegram API
7. Next message from user goes to their own agent

### The interview system

Sessions can be `"guided"` mode with an interview template (stored as `objects` type="interview_template"). The `interviewRunner.ts` advances through phases, extracts data into `interviewState.extractedData`. Quinn needs to use guided mode for onboarding.

## What to implement

### 1. Create `convex/onboarding/seedPlatformAgents.ts`

A seed mutation that creates the platform agent team. Should be idempotent (check if agents already exist before creating).

**Quinn — System Bot (Primary)**
- `subtype: "system"`
- Channel bindings: `telegram` (enabled), `webchat` (enabled)
- Role: Greets new users, runs onboarding interview, creates their org + agent
- Personality: Warm, efficient, multilingual. Platform ambassador.
- Tools: `complete_onboarding`, guided interview tools
- This is the L1 agent — the first agent every new user talks to

**System Prompt for Quinn** should include:
- "You are Quinn, the l4yercak3 platform assistant."
- "When a new user starts a conversation, guide them through onboarding."
- "Ask about: business name, industry, target audience, what they want their AI agent to do."
- "When you have enough info, use the complete_onboarding tool to create their org and agent."
- "Be concise — this is Telegram, not email."
- "Detect language from user's first message and respond in that language."
- "Supported: English, German, Polish, Spanish, French, Japanese."

**Soul for Quinn** — either:
- (A) Generate via `bootstrapAgent()` after creating the agent, or
- (B) Hardcode a soul directly in the seed (faster, deterministic for platform bot)

Recommend **(B)** for the System Bot — a handcrafted soul is more reliable for the platform's public-facing bot.

### 2. Create the onboarding interview template

An `objects` entry with `type: "interview_template"` that defines the onboarding phases:

**Phase 1: Welcome & Language Detection**
- Detect language from user's greeting
- Confirm language, introduce Quinn

**Phase 2: Business Context**
- Business name
- Industry / niche
- Target audience

**Phase 3: Agent Purpose**
- Primary use case (customer support, sales, booking, etc.)
- Tone preference (professional, casual, friendly, etc.)
- Any specific instructions

**Phase 4: Confirmation & Creation**
- Summarize what was collected
- Call `complete_onboarding` to create org + agent
- Hand off to the new agent

### 3. Wire Quinn to guided interview mode

When `routeToSystemBot=true` and the session doesn't exist yet:
- Create session in `"guided"` mode with the onboarding interview template
- The `interviewRunner` handles phase advancement automatically

### 4. Verify the flow works end-to-end

After seeding:
```
User sends /start → Telegram webhook → processTelegramWebhook
→ resolveChatToOrg → new user → "onboarding" → platform org
→ processInboundMessage(platformOrgId, "telegram")
→ getActiveAgentForOrg → finds Quinn (active, telegram binding)
→ resolveSession → creates guided session with onboarding template
→ Quinn asks onboarding questions
→ extractedData collected
→ completeOnboarding.run → creates org, bootstraps agent, flips mapping
→ User's next message → their own agent
```

## Key files to read

| File | What |
|------|------|
| `convex/agentOntology.ts` | Agent CRUD, `getActiveAgentForOrg`, `createAgentInternal` |
| `convex/ai/soulGenerator.ts` | `bootstrapAgent`, `generateSoul`, soul JSON schema |
| `convex/ai/harness.ts` | Agent self-awareness context, `LAYER_NAMES`, `determineAgentLayer` |
| `convex/ai/agentExecution.ts` | `processInboundMessage` — the main pipeline entry point |
| `convex/ai/interviewRunner.ts` | Guided interview system |
| `convex/onboarding/telegramResolver.ts` | `resolveChatToOrg` — routes chat_id → org |
| `convex/onboarding/completeOnboarding.ts` | Post-interview: creates org, bootstraps agent, flips mapping |
| `convex/onboarding/agencySubOrgBootstrap.ts` | Deep links, sub-org agent creation |
| `convex/channels/webhooks.ts` | `processTelegramWebhook` — calls `resolveChatToOrg` → `processInboundMessage` |
| `convex/channels/registry.ts` | Provider registry (telegram now registered) |
| `convex/channels/providers/telegramProvider.ts` | Telegram provider (normalize, send, verify) |
| `convex/http.ts` | HTTP route `/telegram-webhook` (at end of file) |
| `convex/schemas/soulEvolutionSchemas.ts` | Soul proposal/version tables |
| `convex/schemas/agentSessionSchemas.ts` | Session + message schemas |

## Codebase patterns to follow

- **Dynamic require** for api imports to avoid TS2589: `const { api } = require("../_generated/api") as { api: any }`
- **`requireAuthenticatedUser`** for auth in queries
- **Idempotent seeds** — always check `existingX = await ctx.db.query(...).first()` before inserting
- **`internalMutation`** for seed scripts (called from dashboard or other internal actions)
- **`by_org_type` index** on objects table for agent lookups
- **`customProperties`** is the flexible JSON bag on objects — all agent config lives here
- **Soul markdown** should be `<500 words`, first-person voice

## Platform org identification

```typescript
function getPlatformOrgId(): Id<"organizations"> {
  const id = process.env.PLATFORM_ORG_ID || process.env.TEST_ORG_ID;
  if (!id) throw new Error("PLATFORM_ORG_ID or TEST_ORG_ID must be set");
  return id as Id<"organizations">;
}
```

## Also fix: existing user stuck in "onboarding"

The user's Telegram chat_id `8129322419` has a mapping stuck in `"onboarding"` status. The seed script should include a utility mutation `activateMappingManual` that lets an admin flip a specific chat's mapping to `"active"` pointed at the correct org — useful for testing and for recovering stuck users.

## Implementation order

1. Create `convex/onboarding/seedPlatformAgents.ts` with Quinn agent + soul
2. Create the onboarding interview template (in same seed script)
3. Run the seed via Convex dashboard
4. Test: send `/start` to Telegram bot → verify Quinn responds
5. Test: complete onboarding flow → verify mapping flips and new agent takes over
6. Verify Terminal app shows the activity
