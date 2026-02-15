# Phase 2.9: Production Surface — Bridge, UI, Abstraction & Growth

> Ship what we built. Give users control. Make it provider-agnostic. Let new users feel the magic.

## The Play

Phases 2.5–2.8 built a powerful multi-agent system: soul evolution, team coordination, 4-layer hierarchy, rich media, guided interviews, per-org Telegram bots. But it all runs behind a CLI script in a terminal window. Phase 2.9 is about **surfacing this system to users** and **preparing it for scale**.

Four steps, in priority order:

1. **Productionize the Telegram bridge** — eliminate the separate terminal process
2. **Agent Management UI** — give org owners a `/agents` dashboard
3. **Provider abstraction refactor** — clean up Telegram-specific leakage before adding providers
4. **Web-based "aha" experience** — let new users feel the AI without Telegram or login

## Depends On

- Phase 2.8 Step 1 (Per-Org Telegram Bots) — custom bot deployment pipeline
- Phase 2.8 Step 2 (Layer Architecture) — 4-layer hierarchy awareness
- Phase 2.5 Steps 2–10 — team tools, soul evolution, sessions, media pipeline
- Phase 2.6 Layers 1–3 — approval queue, autonomy levels, HITL controls

## Current State

| Component | Status | Location |
|---|---|---|
| Agent execution pipeline (14 steps) | Done | `convex/ai/agentExecution.ts` |
| Agent CRUD (create, list, update, delete) | Done | `convex/agentOntology.ts` |
| Session management + stats | Done | `convex/ai/agentSessions.ts` |
| Soul generator + evolution | Done | `convex/ai/soulGenerator.ts`, `soulEvolution.ts` |
| Approval queue infrastructure | Done | `convex/ai/agentApprovals.ts` |
| Agent harness (self-awareness) | Done | `convex/ai/harness.ts` |
| Interview runner (guided mode) | Done | `convex/ai/interviewRunner.ts` |
| Tool registry (30+ tools) | Done | `convex/ai/tools/registry.ts` |
| Channel provider interface | Done | `convex/channels/types.ts` |
| Telegram bridge (long-polling, dev only) | Done | `scripts/telegram-bridge.ts` |
| Telegram webhook endpoint | Done | `convex/http.ts` |
| Chat-to-org resolver | Done | `convex/onboarding/telegramResolver.ts` |
| Per-org bot deployment | Done | `convex/channels/telegramBotSetup.ts` |
| Team group mirroring | Done | `convex/channels/telegramGroupMirror.ts` |
| Agent management UI | **Missing** | — |
| Provider-agnostic abstractions | **Partial** | 75% done, 25% Telegram-specific |
| Production bridge (no terminal) | **Missing** | — |
| Web-based onboarding (no Telegram) | **Missing** | — |

## Steps

| Step | Doc | What | Effort | Impact |
|------|-----|------|--------|--------|
| 1 | **[Productionize Telegram Bridge](./PHASE_2.9_STEP1_PRODUCTION_BRIDGE.md)** | Webhook mode eliminates separate terminal process | Small | Unblocks production deployment |
| 2 | **[Agent Management UI](./PHASE_2.9_STEP2_AGENT_MANAGEMENT_UI.md)** | `/agents` dashboard for org owners | Medium | Gives existing users control |
| 3 | **[Provider Abstraction Refactor](./PHASE_2.9_STEP3_PROVIDER_ABSTRACTION.md)** | Extract Telegram-specific code into generic patterns | Medium | Prevents tech debt, enables new providers |
| 4 | **[Web-Based Aha Experience](./PHASE_2.9_STEP4_WEB_AHA_EXPERIENCE.md)** | Webchat widget for try-before-you-buy on landing page | Medium | Growth lever for non-Telegram users |

## Build Order

```
Step 1: Production Bridge (~1 session)
    │   Webhook replaces polling script
    │   Multi-org bot support
    │   Health monitoring
    │
Step 2: Agent Management UI (~3 sessions)
    │   Agent list + config + sessions
    │   Soul editor + approval queue
    │   Follows existing window-component pattern
    │
Step 3: Provider Abstraction (~2 sessions)
    │   Generic webhook processor
    │   Generic provider mappings table
    │   Generic team mirroring
    │   Generic bot deployment tool
    │
Step 4: Web Aha Experience (~2 sessions)
        Webchat widget on landing page
        Same onboarding interview, no Telegram required
        Anonymous → auth'd transition
```

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Bridge mode | Telegram Webhook (not polling) | Zero latency, no process to manage, Convex HTTP router already exists |
| UI pattern | Window component + `/agents` page | Matches store, forms, control-panel pattern exactly |
| Provider refactor scope | Interface extension + generic tables | Minimal API changes, maximum reuse |
| Web aha channel | Webchat widget (embedded) | No external app dependency, works for all users |

## Success Criteria

1. No separate terminal process needed to run Telegram agents
2. Org owners can create, configure, pause, and delete agents from the web UI
3. Adding a new channel provider requires only a provider file + registration (no webhook/mirror/mapping duplication)
4. A new user can experience an AI agent on the landing page in < 30 seconds without login
