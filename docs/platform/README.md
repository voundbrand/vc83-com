# Platform Architecture & Implementation

> Comprehensive documentation for the l4yercak3 multi-agent platform. Covers architecture, harness models, error handling, credit systems, session lifecycle, team coordination, tool scoping, and soul evolution.

Naming convention:
- Canonical architecture docs live under `docs/platform/`.
- Legacy `agentic_system` namespace is deprecated and must not be used for new references.

---

## Status Overview

| Phase | Component | Status | Priority |
|-------|-----------|--------|----------|
| P0 | [Error Harness](./ERROR_HANDLING.md) | Planned | CRITICAL |
| P0 | [Session TTL](./SESSION_LIFECYCLE.md) | Planned | CRITICAL |
| P0 | [Credit Caps](./CREDIT_SYSTEM.md) | Planned | CRITICAL |
| P1 | [System Bot Protection](./implementation_plans/P1_SYSTEM_BOT_PROTECTION.md) | Planned | HIGH |
| P1 | [Layered Tool Scoping](./TOOL_SCOPING.md) | Planned | HIGH |
| P1 | [Soul Rollback](./SOUL_EVOLUTION.md) | Planned | HIGH |
| P2 | [Team Harness](./TEAM_COORDINATION.md) | Planned | MEDIUM |
| P2 | [Tool Broker](./TOOL_SCOPING.md#tool-broker) | Planned | MEDIUM |
| P2 | [Human-in-the-Loop](./implementation_plans/P2_HUMAN_IN_THE_LOOP.md) | Planned | MEDIUM |
| P3 | [Group Chat Mirroring](./implementation_plans/P3_GROUP_CHAT.md) | Planned | LOW |
| P4 | [UI Additions](./implementation_plans/P4_UI_ADDITIONS.md) | Planned | UI |

---

## Layer Taxonomy (Canonical)

All architecture work must use the canonical layer contract:
- [FOUR_LAYER_PLATFORM_MODEL.md](./FOUR_LAYER_PLATFORM_MODEL.md)
- [CANONICAL_DOCS_INDEX.md](./CANONICAL_DOCS_INDEX.md)
- [DOC_STATUS_MATRIX.md](./DOC_STATUS_MATRIX.md)

This keeps `BusinessLayer`, `PolicyLayer`, and `MemoryLayer` terminology consistent across docs and code.

---

## Documentation Map

### Architecture & Design

| Document | Description |
|----------|-------------|
| [CANONICAL_DOCS_INDEX.md](./CANONICAL_DOCS_INDEX.md) | Canonical entrypoint + legacy-to-canonical path mapping |
| [DOC_STATUS_MATRIX.md](./DOC_STATUS_MATRIX.md) | Active vs deprecated docs, review cadence, archive map |
| [DOC_CLEANUP_MATRIX.md](./DOC_CLEANUP_MATRIX.md) | Keep/archive/remove matrix for top-level docs folders |
| [CODEBASE_ATLAS.md](./CODEBASE_ATLAS.md) | Full-codebase visualization contract + diagram update protocol |
| [FOUR_LAYER_PLATFORM_MODEL.md](./FOUR_LAYER_PLATFORM_MODEL.md) | Canonical layer contract: Business L1-L4, Policy L1-L4, Memory L1-L5 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full system architecture — pipeline, data model, provider registry, deployment topology |
| [HARNESS_MODEL.md](./HARNESS_MODEL.md) | Agent harness + team harness — scoping, isolation, coordination layers |
| [AI_COMPOSITION_PLATFORM.md](./AI_COMPOSITION_PLATFORM.md) | Knowledge → recipes → skills composition strategy |
| [LAYERS_PRD.md](./LAYERS_PRD.md) | Layers visual automation canvas product requirements |
| [MEMORY_ENGINE_DESIGN.md](./MEMORY_ENGINE_DESIGN.md) | Five-layer memory architecture and operator pinned notes |
| [OPENCLAW_IDEA_INTEGRATION.md](./OPENCLAW_IDEA_INTEGRATION.md) | Integrated OpenClaw idea patterns mapped into canonical docs |
| [TEAM_COORDINATION.md](./TEAM_COORDINATION.md) | Multi-agent sessions, handoff protocol, group chat, human escalation |

### Subsystems

| Document | Description |
|----------|-------------|
| [ERROR_HANDLING.md](./ERROR_HANDLING.md) | Error classification, retry policies, degradation modes, user-facing messages |
| [CREDIT_SYSTEM.md](./CREDIT_SYSTEM.md) | Credit tiers, consumption order, sub-org sharing, caps, safe defaults |
| [SESSION_LIFECYCLE.md](./SESSION_LIFECYCLE.md) | Session TTL, auto-close, idle detection, reset policies, reopen behavior |
| [SOUL_EVOLUTION.md](./SOUL_EVOLUTION.md) | Soul versioning, proposal lifecycle, rollback, rate limiting, reflection triggers |
| [TOOL_SCOPING.md](./TOOL_SCOPING.md) | Layered tool policies, integration-aware filtering, tool broker, subtype defaults |

### Implementation Plans

| Plan | Phase | Description |
|------|-------|-------------|
| [P0_ERROR_HARNESS.md](./implementation_plans/P0_ERROR_HARNESS.md) | P0 | Retry wrappers, error classification, user-facing messages, dead letter queue |
| [P0_SESSION_TTL.md](./implementation_plans/P0_SESSION_TTL.md) | P0 | TTL config, scheduled cleanup cron, session summary on close |
| [P0_CREDIT_CAPS.md](./implementation_plans/P0_CREDIT_CAPS.md) | P0 | maxCreditSharePerChild, daily tracking, notifications, hard stops |
| [P1_SYSTEM_BOT_PROTECTION.md](./implementation_plans/P1_SYSTEM_BOT_PROTECTION.md) | P1 | Protected flag, immutable soul, worker pool spawning |
| [P1_LAYERED_TOOL_SCOPING.md](./implementation_plans/P1_LAYERED_TOOL_SCOPING.md) | P1 | Platform→Org→Agent→Session resolution, integration checks |
| [P1_SOUL_ROLLBACK.md](./implementation_plans/P1_SOUL_ROLLBACK.md) | P1 | Rollback mutation, rate limiting, reflection cron, owner UX |
| [P2_TEAM_HARNESS.md](./implementation_plans/P2_TEAM_HARNESS.md) | P2 | Team session model, handoff protocol, shared context, tag-in tools |
| [P2_TOOL_BROKER.md](./implementation_plans/P2_TOOL_BROKER.md) | P2 | Intent classification, integration-aware filtering, subtype defaults |
| [P2_HUMAN_IN_THE_LOOP.md](./implementation_plans/P2_HUMAN_IN_THE_LOOP.md) | P2 | Escalation triggers, intervention points, owner notification |
| [P3_GROUP_CHAT.md](./implementation_plans/P3_GROUP_CHAT.md) | P3 | Team Telegram groups, message mirroring, human takeover |
| [P4_UI_ADDITIONS.md](./implementation_plans/P4_UI_ADDITIONS.md) | P4 | Web UI surfaces for all agentic features — soul history, credits, health, channels, escalations |

---

## Key Principles

1. **Never swallow errors silently.** Every failure path must produce a user-visible response or an owner notification.

2. **Most-restrictive-wins for tool access.** Platform > Org > Agent > Session — each layer can only further restrict, never grant back.

3. **Human-in-the-loop is not optional.** Every automated action should have an escalation path. Supervised mode is the safe default for new agents.

4. **Sessions are mortal.** Every session has a TTL. Stale context is worse than no context.

5. **Credits have caps.** No unbounded spending. Sub-org sharing requires explicit limits. Safe defaults protect against runaway costs.

6. **System bots are immutable.** Quinn and other platform agents cannot be modified by soul evolution, org admins, or automated processes.

7. **Team coordination is first-class.** Agents should be able to hand off, tag in, and collaborate — not just operate in isolation.

8. **Fail gracefully, degrade visibly.** Retry transient errors, adapt to degraded conditions, escalate fatal failures, and break loops.

---

## Cross-References

- [AGENT_ARCHITECTURE_CONTEXT.md](../AGENT_ARCHITECTURE_CONTEXT.md) — Original architecture walkthrough (13-step pipeline, tool catalog, channel registry)
- [CANONICAL_DOCS_INDEX.md](./CANONICAL_DOCS_INDEX.md) — Canonical architecture docs home and migration mapping
- [DOC_STATUS_MATRIX.md](./DOC_STATUS_MATRIX.md) — Documentation lifecycle and drift control
- [DOC_CLEANUP_MATRIX.md](./DOC_CLEANUP_MATRIX.md) — Keep/archive/remove decisions for top-level docs folders
- [CODEBASE_ATLAS.md](./CODEBASE_ATLAS.md) — Cross-system flow map and CI diagram-impact contract
- [Codebase Atlas Index](./codebase_atlas/README.md) — Boundaries/capabilities catalog, flow catalog, path-to-flow mapping
- [Archive Index](../archive/README.md) — Archived docs sets and archive rules
- [FOUR_LAYER_PLATFORM_MODEL.md](./FOUR_LAYER_PLATFORM_MODEL.md) — Canonical layer taxonomy and invariants
- [OPENCLAW_IDEA_INTEGRATION.md](./OPENCLAW_IDEA_INTEGRATION.md) — OpenClaw-derived ideas integrated into canonical architecture docs
- `convex/ai/agentExecution.ts` — Core 13-step pipeline implementation
- `convex/ai/agentSessions.ts` — Session management
- `convex/ai/agentApprovals.ts` — Approval queue
- `convex/ai/soulEvolution.ts` — Soul proposal system
- `convex/credits/index.ts` — Credit system
- `convex/channels/router.ts` — Outbound message routing

---

## Glossary

| Term | Definition |
|------|-----------|
| **Agent Harness** | The scoping and isolation boundary around a single agent — its soul, tools, credits, autonomy, and session context |
| **Team Harness** | The coordination layer around a group of agents working together — handoff protocol, shared context, escalation rules |
| **Tool Broker** | A deterministic filter that selects which tools to offer the LLM based on message intent, org integrations, and agent subtype |
| **Soul** | An agent's personality configuration — name, traits, communication style, values, rules, and markdown identity document |
| **Soul Evolution** | The self-improvement loop where agents propose personality changes based on conversation patterns, owners approve/reject |
| **Session TTL** | Time-to-live for a session — after this idle period, the session auto-closes and a new one is created on next contact |
| **Escalation** | The process of routing a conversation from an automated agent to a human team member or specialist agent |
| **Protected Agent** | A system-level agent (like Quinn) whose configuration is immutable and exempt from org-level modifications |
| **Credit Cap** | The maximum credits a sub-org can consume from its parent org's pool per day |
| **Dead Letter Queue** | Undeliverable messages stored for retry or manual review when channel sends persistently fail |
