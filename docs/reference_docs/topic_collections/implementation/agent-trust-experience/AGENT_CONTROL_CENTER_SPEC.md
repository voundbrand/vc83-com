# Agent Control Center Spec (Agents UI-First)

**Date:** 2026-02-18  
**Scope:** Define how the existing AI Agents UI becomes the owner-facing control center for multi-agent operations, including spawned instances, lifecycle governance, and trust/audit optics.

---

## Objective

Use the current Agents surface as the primary control center so business owners can:

1. see what each agent team is doing right now,
2. understand lifecycle risk and escalation state at a glance,
3. intervene safely with full context and auditable outcomes,
4. manage spawned runtime copies without losing a simple thread-first experience.

Data contract companion:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/AGENT_CONTROL_CENTER_DATA_CONTRACT.md`

---

## Foundational contract (locked)

The control center is grounded in five existing primitives and one runtime pipeline:

1. **Turn-Level Concurrency:** crash-safe turn leasing + idempotent ingress.
2. **Four-Layer Tool Scoping:** Platform -> Org -> Agent -> Session capability narrowing.
3. **Lifecycle State Machine:** `draft -> active -> paused -> escalated -> takeover -> resolved -> active`.
4. **Trust Event Taxonomy:** deterministic trust events as the audit spine.
5. **Soul/Core Memory:** identity anchor with consent and drift governance.
6. **13-step runtime pipeline:** orchestrated in `processInboundMessage` (`convex/ai/agentExecution.ts`).

No control-center UX may bypass or rename these contracts.

---

## Domain model for operator optics

1. **Agent Template** (`name`, `soul`, guardrails, tool scope defaults).
2. **Agent Instance** (runtime copy of template, including spawned copies).
3. **Thread** (owner-visible workstream/conversation shell).
4. **Turn** (execution atom under lease/CAS).
5. **Intervention** (approval/escalation/takeover/resolution action).

### Key design rule

Keep **lifecycle state** separate from **delivery status**:

- Lifecycle state: trust/control semantics (from `agentLifecycle.ts`).
- Delivery status: work progress semantics (`queued`, `running`, `done`, `blocked`, `failed`).

---

## UI architecture (existing Agents UI)

### Left rail: thread-first navigation

1. Keep existing thread mental model (similar to Codex-style thread list).
2. Show one row per thread, not per spawned instance.
3. Attach compact badges:
   - lifecycle badge (state color),
   - escalation badge (count),
   - instance badge (active instance count),
   - unread/update marker.

### Center panel: operational timeline

1. Conversation and trust timeline merged by timestamp.
2. Every lifecycle transition displayed with:
   - `from_state`,
   - `to_state`,
   - checkpoint,
   - actor type,
   - reason.
3. Surface checkpoint grouping by the three escalation gates:
   - pre-LLM,
   - post-LLM,
   - tool-failure.

### Right panel: intervention cockpit

1. Active queue item details (approval/escalation/takeover).
2. Effective capability envelope (resolved tool scope across 4 layers).
3. Spawn graph (template -> instances, including handoff path).
4. One-click actions:
   - approve/reject,
   - take over,
   - resolve and resume agent,
   - handoff back to autonomous mode.

---

## Visual status semantics

Lifecycle colors (trust state):

1. `draft`: gray
2. `active`: blue
3. `paused`: amber
4. `escalated`: red
5. `takeover`: orange
6. `resolved`: green (transient, then returns to `active` blue on resume)

Progress indicators (delivery state) must be visually distinct from lifecycle colors.

---

## Spawned-instance behavior

1. Spawned copies inherit template soul + guardrails by default.
2. Session-level tool scope can only narrow, never widen.
3. Each instance writes trust events with:
   - `template_agent_id`,
   - `instance_agent_id`,
   - `thread_id`,
   - `session_id`.
4. Owner view stays thread-first, with drill-down to per-instance timeline when needed.
5. Handoff events must explicitly capture context continuity (`trust.team.*` events).

---

## Required event and query surfaces

### Must-have event classes

1. `trust.lifecycle.*` for state transitions/checkpoints.
2. `trust.team.*` for handoff/spawn continuity.
3. `trust.guardrail.*` for capability policy decisions.
4. `trust.memory.*` and `trust.soul.*` for identity-affecting behavior.
5. `trust.telemetry.*` for KPI checkpoints and rollout gating.

### Must-have operator queries

1. Thread queue sorted by urgency/SLA risk.
2. Escalations waiting on human action.
3. Active instances by agent template.
4. Transition failures or invalid transition attempts.
5. Tool-block decisions by scope layer.

---

## Mapping to existing code anchors

1. Turn concurrency and lease settlement: `convex/ai/agentSessions.ts`, `convex/ai/agentTurnOrchestration.ts`.
2. Tool scoping fence: `convex/ai/toolScoping.ts`.
3. Lifecycle contract: `convex/ai/agentLifecycle.ts`.
4. Trust taxonomy: `convex/ai/trustEvents.ts`.
5. Soul/core memory governance: `convex/ai/soulEvolution.ts`.
6. Runtime orchestration entrypoint: `convex/ai/agentExecution.ts`.
7. Operator UI surface: `src/components/window-content/agents/*`, `src/components/window-content/agents-window.tsx`.

---

## Acceptance criteria for control-center readiness

1. A business owner can identify all escalated threads in one glance from the thread list.
2. Every escalation row can be traced to lifecycle checkpoints and trust events without log digging.
3. Spawned instance activity is visible from thread drill-down with clear parent/child lineage.
4. Tool availability shown in UI matches resolved four-layer scope (no UI/runtime drift).
5. Lifecycle labels and transitions exactly match canonical sequence in all UI copy and telemetry.

---

## Implementation sequence (minimal disruption)

1. Add thread-level lifecycle + escalation + instance badges in Agents list.
2. Add right-panel capability envelope + spawn graph in trust cockpit.
3. Add timeline grouping by escalation checkpoints and handoff continuity.
4. Add KPI board widgets for backlog, MTTR, takeover rate, and blocked-turn rate.
5. Add regression tests for lifecycle-copy parity and scope-visibility parity.

---

## Non-goals

1. Do not create a separate standalone control-center app.
2. Do not bypass `toolScoping.ts` or `agentLifecycle.ts` with UI-local logic.
3. Do not collapse lifecycle and task-progress states into one color/status channel.
