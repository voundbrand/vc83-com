# System Architecture

> Full architecture of the l4yercak3 agentic platform — message pipeline, data model, harness layers, deployment topology.

---

## Layer Taxonomy (Read First)

This architecture uses multiple layer systems. The canonical definitions live in:
- [FOUR_LAYER_PLATFORM_MODEL.md](./FOUR_LAYER_PLATFORM_MODEL.md)
- [CANONICAL_DOCS_INDEX.md](./CANONICAL_DOCS_INDEX.md)
- [DOC_STATUS_MATRIX.md](./DOC_STATUS_MATRIX.md)

Interpretation rules for this document:
- `BusinessLayer`: Platform -> Agency -> Sub-org -> End-customer
- `PolicyLayer`: Platform -> Org -> Agent -> Session (tool/runtime enforcement)
- `MemoryLayer`: five-layer conversation/memory composition model

If section wording appears ambiguous, the canonical layer document wins.

---

## High-Level Topology

```
                    ┌──────────────────────────────────────────────┐
                    │              INBOUND CHANNELS                │
                    │  Telegram  WhatsApp  SMS  Email  Webchat     │
                    └──────────────┬───────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────────────────┐
                    │            HTTP WEBHOOK LAYER                │
                    │         convex/http.ts                       │
                    │  Parse provider payload → resolve org        │
                    └──────────────┬───────────────────────────────┘
                                   │
                    ┌──────────────▼───────────────────────────────┐
                    │         ROUTING & RESOLUTION                 │
                    │                                              │
                    │  telegramResolver → org/agent resolution     │
                    │  channelResolver  → provider binding lookup  │
                    │  sessionResolver  → session reuse/create     │
                    └──────────────┬───────────────────────────────┘
                                   │
                    ┌──────────────▼───────────────────────────────┐
                    │         AGENT EXECUTION PIPELINE             │
                    │         convex/ai/agentExecution.ts          │
                    │                                              │
                    │  ┌─────────────────────────────────────────┐ │
                    │  │          AGENT HARNESS                  │ │
                    │  │  Soul │ Tools │ Credits │ Autonomy      │ │
                    │  │  ┌────────────────────────────────────┐ │ │
                    │  │  │       TEAM HARNESS (if active)     │ │ │
                    │  │  │  Handoffs │ Shared Context │ HITL  │ │ │
                    │  │  └────────────────────────────────────┘ │ │
                    │  └─────────────────────────────────────────┘ │
                    │                                              │
                    │  1.  Load agent config                      │
                    │  2.  Rate limit check                       │
                    │  3.  Resolve/create session                  │
                    │  4.  CRM contact resolution                  │
                    │  4.5 Knowledge base docs                     │
                    │  4.6 Interview mode check                    │
                    │  5.  Build system prompt                     │
                    │  6.  Load conversation history (20 msgs)     │
                    │  7.  Filter tools (layered scoping)          │
                    │  7.5 Pre-flight credit check                 │
                    │  8.  Call LLM (with retry + failover)        │
                    │  9.  Execute tool calls (with approvals)     │
                    │  10. Save messages to session                │
                    │  11. Update stats + deduct credits           │
                    │  12. Audit log                               │
                    │  13. Route response (with retry)             │
                    └──────────────┬───────────────────────────────┘
                                   │
                    ┌──────────────▼───────────────────────────────┐
                    │         OUTBOUND ROUTING                     │
                    │         convex/channels/router.ts            │
                    │                                              │
                    │  Resolve provider binding → get credentials  │
                    │  → provider.sendMessage() (with retry)       │
                    │  → dead letter queue on persistent failure   │
                    └──────────────┬───────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────────────────┐
                    │              OUTBOUND CHANNELS               │
                    │  Telegram Bot API │ Infobip │ Meta Cloud API │
                    │  Resend │ Chatwoot │ ManyChat │ Pushover     │
                    └──────────────────────────────────────────────┘
```

---

## Data Model

### Core Tables

```
organizations
  ├── _id
  ├── name, slug
  ├── plan (free|starter|pro|enterprise)
  ├── parentOrganizationId?        → sub-org hierarchy
  ├── creditSharing                → maxPerChild, maxTotalShared, notifyAt
  └── settings

objects (universal ontology — typed, tenant-isolated)
  ├── _id
  ├── organizationId               → tenant isolation
  ├── type                         → "org_agent" | "crm_contact" | "channel_provider_binding" | ...
  ├── customProperties             → flexible JSON per type
  └── timestamps

agentSessions
  ├── _id
  ├── agentId                      → objects (type="org_agent")
  ├── organizationId
  ├── channel, externalContactIdentifier
  ├── status                       → "active" | "closed" | "handed_off"
  ├── sessionPolicy                → TTL, maxDuration, closeReason
  ├── teamSession?                 → participatingAgentIds, activeAgentId, handoffs
  ├── interviewState?              → guided interview tracking
  └── stats (messageCount, tokensUsed, costUsd, lastMessageAt)

telegramMappings
  ├── telegramChatId (unique)
  ├── organizationId
  ├── status                       → "onboarding" | "active" | "churned"
  ├── teamGroupChatId?
  └── userId?

creditBalances
  ├── organizationId
  ├── dailyCredits, monthlyCredits, purchasedCredits
  └── creditSharing                → per-child caps, daily tracking

soulVersionHistory
  ├── agentId
  ├── version
  ├── previousSoul, newSoul (JSON snapshots)
  ├── proposalId?, changeType
  └── timestamp
```

### Agent Configuration (objects.customProperties where type="org_agent")

```
Identity
  ├── displayName, personality, language, additionalLanguages
  ├── subtype: "system" | "general" | "customer_support" | "sales_assistant" | "booking_agent"
  └── protected: boolean              → NEW: immutable system agents

Soul
  ├── name, tagline, traits[], communicationStyle
  ├── toneGuidelines, coreValues[], neverDo[], alwaysDo[]
  ├── escalationTriggers[], greetingStyle, closingStyle
  ├── emojiUsage, soulMarkdown
  └── version: number

Tools
  ├── enabledTools[], disabledTools[]
  └── toolProfile?: string            → NEW: named presets

Autonomy
  ├── autonomyLevel: "supervised" | "autonomous" | "draft_only"
  ├── requireApprovalFor[]
  └── blockedTopics[]

Guardrails
  ├── maxMessagesPerDay, maxCostPerDay
  └── escalationPolicy               → NEW: triggers + actions

Model
  ├── modelProvider, modelId, temperature, maxTokens
  └── fallbackModels[]                → NEW: model failover chain

Session Policy                         → NEW
  ├── defaultTTL, maxDuration
  ├── perChannel: { [channel]: { ttl } }
  ├── onClose: "archive" | "summarize_and_archive"
  └── onReopen: "new_session" | "resume"

Soul Evolution Policy                  → NEW
  ├── maxProposalsPerDay, maxProposalsPerWeek
  ├── cooldownAfterRejection
  ├── autoReflectionSchedule
  ├── requireMinConversations
  └── maxPendingProposals

Channel Bindings
  └── channelBindings[]               → which channels this agent handles
```

---

## Harness Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ PLATFORM LAYER (l4yercak3 controls)                             │
│                                                                 │
│  platformAllowedTools[]        Master tool availability         │
│  platformBlockedTools[]        Maintenance/disabled tools       │
│  systemBotProtection           Immutable system agents          │
│  globalRateLimits              Platform-wide safety caps        │
│  modelAllowlist                Approved LLM models              │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ORGANIZATION LAYER (org owner controls)                     │ │
│ │                                                             │ │
│ │  orgEnabledTools[]          Org's tool subset               │ │
│ │  orgDisabledTools[]         Org-specific blocks             │ │
│ │  integrationRequirements    Tool→integration mapping        │ │
│ │  creditSharing              Sub-org caps                    │ │
│ │  autonomyPolicy             Default for new agents          │ │
│ │                                                             │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ AGENT LAYER (per-agent config)                          │ │ │
│ │ │                                                         │ │ │
│ │ │  enabledTools[]           Agent whitelist                │ │ │
│ │ │  disabledTools[]          Agent blocks                   │ │ │
│ │ │  autonomyLevel            Supervision mode               │ │ │
│ │ │  requireApprovalFor[]     Tool-specific approvals        │ │ │
│ │ │  channelRestrictions      Per-channel tool access        │ │ │
│ │ │                                                         │ │ │
│ │ │ ┌───────────────────────────────────────────────────┐   │ │ │
│ │ │ │ SESSION LAYER (runtime)                           │   │ │ │
│ │ │ │                                                   │   │ │ │
│ │ │ │  activeTools[]      Resolved tool set             │   │ │ │
│ │ │ │  sessionBudget      Remaining credits             │   │ │ │
│ │ │ │  escalationState    Human tagged in?              │   │ │ │
│ │ │ │  errorState         Degraded mode?                │   │ │ │
│ │ │ │  disabledForSession Tools disabled by errors      │   │ │ │
│ │ │ └───────────────────────────────────────────────────┘   │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

Resolution: platform ∩ org ∩ agent ∩ session = activeTools
(most-restrictive-wins at every layer)
```

---

## Agent Hierarchy

This section is `BusinessLayer` hierarchy (tenant/value chain), not `PolicyLayer` tool resolution.

```
Platform Org (l4yercak3)
  │
  ├── Quinn Prime (template, protected=true, never executes)
  │   └── Frozen soul + config, version-controlled
  │
  ├── Quinn Workers (spawned instances)
  │   ├── Worker 1 → handling onboarding session A
  │   ├── Worker 2 → handling onboarding session B
  │   └── Worker N → auto-scaled, max MAX_SYSTEM_WORKERS
  │
  └── Platform Tools Agent (future)
      └── Handles /help, status checks, diagnostics

Per-Org Agents
  │
  ├── Primary Agent (bootstrapped after onboarding)
  │   ├── subtype: pm | general | customer_support | sales_assistant | booking_agent
  │   ├── Full tool access (within org scope)
  │   └── Soul: AI-generated from interview
  │
  ├── Specialist Agent (optional, created by owner)
  │   ├── Focused tool subset (e.g., billing only)
  │   └── Tagged in by primary agent when needed
  │
  └── Sub-Org Agents (agency model)
      ├── Child org PM agent (L3 operations)
      ├── Child org customer_service agent (L4 end-customer conversations)
      └── Credit fallback to parent (with caps)
```

---

## Pipeline Error Flow (Enhanced)

```
Step 8: LLM Call
  ├── Success → continue
  ├── 429/rate-limit → retry with backoff (3x)
  ├── 500/502/503 → retry with backoff (3x)
  ├── Timeout → retry once (shorter maxTokens)
  ├── All retries failed → try fallbackModels[]
  ├── All models failed → send "having trouble" message + notify owner
  └── Auth error → notify owner + tell user to try later

Step 9: Tool Execution
  ├── Success → continue
  ├── Tool error → capture error, pass to LLM as tool result
  ├── Approval needed → queue approval + tell user "checking with team"
  ├── Approval expired → notify user + owner
  ├── 3+ failures → disable tool for session + notify owner
  └── Credit insufficient → tell user + notify owner

Step 13: Channel Send
  ├── Success → done
  ├── 429 → retry with provider retry_after
  ├── 403 (blocked) → mark binding unhealthy + notify owner
  ├── Timeout → retry 3x
  ├── Message too long → split + retry
  ├── All retries failed → dead letter queue + notify owner
  └── Parse error → strip to plain text + retry once
```

---

## Key File Map

| File | Layer | Purpose |
|------|-------|---------|
| `convex/http.ts` | Inbound | HTTP webhook routes for all providers |
| `convex/onboarding/telegramResolver.ts` | Routing | Telegram chat → org/agent resolution |
| `convex/channels/registry.ts` | Routing | Provider registration (5 providers) |
| `convex/channels/router.ts` | Outbound | Provider binding resolution + send |
| `convex/ai/agentExecution.ts` | Pipeline | Core 13-step execution pipeline |
| `convex/ai/agentSessions.ts` | Sessions | Session CRUD + stats |
| `convex/ai/agentApprovals.ts` | HITL | Approval queue + expiry |
| `convex/ai/soulEvolution.ts` | Evolution | Proposal lifecycle + self-reflection |
| `convex/ai/soulGenerator.ts` | Bootstrap | AI-generated agent personalities |
| `convex/ai/tools/registry.ts` | Tools | 63-tool catalog with schemas |
| `convex/agentOntology.ts` | Config | Agent CRUD + config schema |
| `convex/credits/index.ts` | Credits | Balance management + deduction |
| `convex/onboarding/completeOnboarding.ts` | Bootstrap | Post-interview org+agent creation |
| `convex/onboarding/seedPlatformAgents.ts` | Bootstrap | Quinn system bot seed |

---

## Inspired By

Patterns adapted from OpenClaw research and integrated canonically in:
- [OPENCLAW_IDEA_INTEGRATION.md](./OPENCLAW_IDEA_INTEGRATION.md)

- **Queue-based concurrency** — per-session + global lanes (adapted as Convex session locking)
- **Sub-agent spawning** — `sessions_spawn` with auto-archive (adapted as Quinn worker pool)
- **Session TTL** — daily reset + idle reset + per-type/channel overrides
- **Retry + failover** — 3 attempts, exponential backoff, auth rotation, model fallback
- **Layered tool policy** — 8-level restriction model (adapted as 4-layer platform→session)
- **Hook events** — lifecycle hooks at every boundary (adapted as escalation triggers)
- **Memory flush** — auto-save before compaction (adapted as session summary on close)
