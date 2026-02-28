# Operator Collaboration Routing Cutover Master Plan

**Date:** 2026-02-21  
**Last updated:** 2026-02-24  
**Scope:** Product-surface execution track for operator collaboration UX and routing cutover. Runtime/kernel collaboration contracts remain in the TCG workstream.

---

## Mission

Deliver the operator-facing collaboration model where orchestrator-first routing is default, specialists can collaborate in direct DM threads, and operators can safely sync DM outcomes back to the group thread.

Primary outcomes:

1. make platform orchestrator routing the default for operator channels,
2. ship explicit group thread + specialist DM thread collaboration UX,
3. support deterministic DM-to-group sync flow with audit visibility,
4. deprecate legacy AI chat routing path with controlled cutover,
5. expose explicit operator channel binding configuration in platform UX.

---

## Why this is split from TCG

1. TCG is the runtime/kernel semantic track (lineage, authority, idempotency, correlation, wait/resume contracts).
2. This workstream is product-surface delivery (routing defaults, chat IA, channel binding UX, deprecation rollout).
3. Keeping these separated prevents a mega-track and preserves deterministic ownership boundaries.

---

## Upstream dependencies (TCG)

| Upstream task | Required for | Dependency reason |
|---|---|---|
| `TCG-014` | `OCC-004`, `OCC-007` | Product routing/UI must consume typed collaboration thread + authority contracts. |
| `TCG-015` | `OCC-005` | Operator routing persistence must align with lineage-aware idempotency/concurrency keys. |
| `TCG-016` | `OCC-008`, `OCC-011` | UI timeline and config state rely on unified correlation identity contracts. |
| `TCG-017` | `OCC-006` | DM summary sync requires typed wait/resume checkpoint token behavior. |

Dependency rule:

- if any required TCG dependency is not `DONE`, downstream OCC implementation rows remain `BLOCKED`.

Upstream dependency status (2026-02-24):

- `TCG-014`, `TCG-015`, `TCG-016`, and `TCG-017` are `DONE`.
- Lane `B` is complete through `OCC-006` (`OCC-005` + `OCC-006` are `DONE` with verification evidence captured in queue notes).
- Lane `C` is complete through `OCC-009` (`DONE`); timeline/correlation markers and explicit DM summary sync UX are now delivered.
- Lane `D` is complete through `OCC-012` (`DONE`); deterministic shell cutover flags, role-gated platform-managed channel binding overrides, and migration/rollback playbooks are published.

---

## Current codebase reality (OCC-002 baseline audit)

Boundary confirmation:

1. Runtime kernel semantics (typed collaboration kernel/authority, idempotency, wait/resume) remain owned by TCG.
2. OCC scope here is product-surface routing behavior, operator UX constraints, and cutover-facing fallback inventory.

Code-reality matrix:

| Area | Current behavior | Evidence | Cutover implication |
|---|---|---|---|
| Active agent routing resolution | Resolution order is route-policy match, then channel binding match, then first active agent fallback (`candidates[0]`). | `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts:306`; `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts:342` | Final fallback is fail-open for operator cutover and must be replaced with deterministic fail-closed behavior in lane B. |
| Legacy routing aliases | `native_guest` reuses `webchat` bindings; legacy binding object shape and legacy route policy keys (`routePolicies`, `dispatchRoutes`) are still accepted. | `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts:35`; `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts:61`; `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts:154` | Backward-compat aliases can silently bypass strict operator-route policy intent if not normalized during cutover. |
| Inbound dispatch selectors and partitioning | Inbound route selectors derive from channel + provider/team/peer/channel refs; missing route identity collapses to `"legacy"` partition key. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts:456`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts:4312`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts:4387` | Missing metadata currently degrades to legacy partitioning rather than strict rejection; operator routing cutover must fail closed. |
| Session routing fallback/promotion | Session routing key defaults to `legacy` without route identity; route-aware inbound can promote an existing legacy session to scoped routing key. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts:75`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts:215`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts:1553` | Legacy session promotion path is a compatibility bridge that must be explicitly gated during operator cutover. |
| Outbound provider fallback paths | If no org binding exists, router falls back to platform/default paths (SMS, Telegram, Slack policy path); markdown parse errors trigger plain-text resend fallback. | `/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts:758`; `/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts:557`; `/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts:1045` | Product cutover must preserve safe delivery fallbacks while removing operator-route fail-open behavior for unresolved routing identity. |
| No-active-agent fallback | Inbound flow falls back to template worker-pool onboarding agent when no active org agent resolves. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts:469`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts:477` | Existing fallback can mask operator-route misconfiguration; lane B must define explicit operator-path handling. |
| Team handoff/thread model | Team session schema stores one `activeAgentId` and one handoff history list; handoff limit is 5 per session with 2-minute cooldown. | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts:155`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/teamHarness.ts:22`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/teamHarness.ts:204` | Current model is sequential handoff orchestration, not explicit `group_thread` + specialist `dm_thread` UX contract. |
| Specialist execution semantics | Runtime swaps effective agent to `teamSession.activeAgentId`; turn lease prevents dual active run for same session+agent. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts:695`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts:1165`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts:1217` | Collaboration remains deterministic but single-active-agent at execution time; OCC UX needs explicit group/DM surface semantics over this base. |
| Queue anchor drift discovered in audit | Queue referenced `/convex/chat.ts`, but active chat path is `/convex/ai/chat.ts`. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/TASK_QUEUE.md:64`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/chat.ts:1` | Queue primary file anchors updated in this lane to avoid implementation drift. |

Primary anchors:

- `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/chat.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/teamHarness.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/teamTools.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/*`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-trust-cockpit.tsx`

---

## Target product architecture

## 1) Routing control plane

1. all operator channels resolve to orchestrator-first collaboration mode,
2. routing resolution is fail-closed when tenant/channel/thread metadata is incomplete,
3. legacy default chat route is behind explicit compatibility flags only.

## 2) Collaboration interaction model

1. one operator-visible group thread coordinated by orchestrator,
2. optional specialist DM threads per active specialist,
3. explicit authority in UI actions (`proposal` by specialist, `commit` by orchestrator).

## 3) DM-to-group sync workflow

1. operator can trigger “sync DM summary to group”,
2. sync call consumes typed wait/resume checkpoint metadata,
3. summary injection is idempotent and auditable.

## 4) Legacy chat deprecation path

1. cutover is staged by feature flags and tenant cohorts,
2. fallback and rollback switches are explicit,
3. support-facing runbook defines incident and rollback criteria.

## 5) Agent channel binding UX

1. admin/operator settings expose explicit channel bindings,
2. desktop behavior reflects orchestration defaults and allowed specialist DMs,
3. privileged binding overrides remain role-gated.

---

## Frozen operator UX contract (OCC-003)

Boundary confirmation:

1. TCG owns typed runtime semantics (`group_thread`/`dm_thread` kernel contract, authority contract validation, wait/resume token rules).
2. OCC owns operator-visible behavior, interaction affordances, and deterministic presentation rules.

### OCC UX contract rules

| Contract ID | Product-surface rule | Authority/visibility expectation | TCG dependency note |
|---|---|---|---|
| `OCC-UX-01` | Each operator conversation has one canonical `group_thread` surface where official progress and outcomes are shown. | Group thread is visible to operators; orchestrator is the authoritative speaker for commit-path outcomes. | Consumes typed thread/kernel identity from `TCG-014`; OCC does not redefine kernel payloads. |
| `OCC-UX-02` | Specialist collaboration happens in explicit per-specialist `dm_thread` surfaces linked to the active group thread context. | DM thread is visible to operator, orchestrator, and the addressed specialist only; no implicit cross-specialist DM fanout. | Thread linkage semantics remain in `TCG-014`; OCC only defines UI affordance and visibility policy. |
| `OCC-UX-03` | Specialist DM actions are always proposal-path only in UI controls. | Specialist cannot trigger commit-path actions from DM surface. | Authority enforcement contract stays in `TCG-014`; OCC mirrors that boundary in UX affordances. |
| `OCC-UX-04` | Commit-path actions are orchestrator-authorized and surfaced in group thread with deterministic status labels. | Operator sees `proposal` vs `commit` status clearly; commit ownership is explicit. | Runtime authority guardrails remain in TCG; OCC displays and routes to allowed actions only. |
| `OCC-UX-05` | DM-to-group sync is an explicit operator action and posts one summary event into the group thread per sync attempt. | Group receives summary card/event with specialist attribution and timestamp; no silent auto-injection. | Wait/resume checkpoint validity and idempotency semantics depend on `TCG-017`. |
| `OCC-UX-06` | Invalid/expired/missing DM sync checkpoint resolves to deterministic blocked UX state (`blocked_sync_checkpoint`) with retry guidance. | No group-thread mutation occurs on blocked sync. | Outcome code semantics are owned by TCG (`TCG-017`); OCC maps them to stable UI messaging. |
| `OCC-UX-07` | Group and DM timelines remain deterministic and auditable (stable ordering, visible lineage/correlation markers where available). | Operator can distinguish official group state from in-progress specialist DM work. | Correlation identity unification depends on `TCG-016`. |
| `OCC-UX-08` | Legacy single-thread chat behavior is treated as compatibility mode, not default operator UX. | Any compatibility mode must remain explicit and reversible. | Deprecation/cutover implementation lands in OCC lane D after upstream TCG gates. |

### Acceptance gates for OCC implementation lanes

1. Lane `B` and beyond must preserve `OCC-UX-01`..`OCC-UX-08` unless a new queue row explicitly revises the contract.
2. If a downstream change conflicts with these UX rules, mark the row `BLOCKED` and record dependency/contract mismatch notes before implementation.
3. Runtime semantics escalations (schema, token contract, authority validation logic) must be routed back to TCG queue rows, not implemented ad hoc in OCC.

---

## Phase mapping

| Phase | Objective | Queue lane | Queue tasks |
|---|---|---|---|
| Phase 1 | Scope split + baseline + UX contract freeze | `A` | `OCC-001`..`OCC-003` |
| Phase 2 | Routing and session metadata cutover | `B` | `OCC-004`..`OCC-006` |
| Phase 3 | Operator collaboration UX delivery | `C` | `OCC-007`..`OCC-009` |
| Phase 4 | Legacy deprecation + channel binding settings | `D` | `OCC-010`..`OCC-012` |
| Phase 5 | Verification + launch closeout | `E` | `OCC-013` |

---

## Verification strategy

1. Code safety: `npm run typecheck`, `npm run lint`.
2. Behavioral safety: `npm run test:unit`, `npm run test:integration`.
3. Docs policy: `npm run docs:guard`.
4. Queue rows control exact verify commands per task.

---

## Rollout and rollback strategy

1. Stage 0: docs + contract freeze only.
2. Stage 1: internal canary with orchestrator-first routing enabled for selected operators.
3. Stage 2: enable group+DM collaboration UI with DM sync path in canary cohorts.
4. Stage 3: deprecate legacy chat path and migrate default operator entrypoints.
5. Rollback path: flip cutover feature flags, restore previous route defaults, preserve timeline evidence for incident review.

---

## OCC-012 migration and rollback playbook

### Feature-flag contract and reversible checkpoints

| Flag | Default | Purpose | Reversible checkpoint |
|---|---|---|---|
| `NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_ENABLED` (and backend alias `OPERATOR_COLLABORATION_SHELL_ENABLED`) | `true` | Global shell enable gate for operator collaboration UI entry. | Set to `false` to force all cohorts to legacy shell path immediately. |
| `NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_ROLLOUT_PERCENT` (and backend alias `OPERATOR_COLLABORATION_SHELL_ROLLOUT_PERCENT`) | `100` | Deterministic org-seeded cohort rollout percentage (`0`..`100`). | Set to `0` to hold all org cohorts back while preserving deterministic bucket math. |
| `NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_FORCE_LEGACY` (and backend alias `OPERATOR_COLLABORATION_SHELL_FORCE_LEGACY`) | `false` | Emergency rollback/override that forces legacy shell even when enabled and cohort-qualified. | Set to `true` as fastest incident rollback switch. |

### Tenant cohort migration sequence

| Phase | Cohort target | Operator/support checks | Promote condition |
|---|---|---|---|
| `M0` | Internal QA orgs only | Confirm deterministic cohort bucket assignment and explicit rollback path behavior (`force_legacy`, `disabled`, `rollout_holdback`, `enabled`). | `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration`, `npm run docs:guard` pass for lane D code/docs. |
| `M1` | 10-25% rollout bucket | Confirm operator group+DM surfaces load consistently and DM default policy obeys agent-level collaboration defaults. | No Sev1/Sev2 operator-routing incidents for 24h, no policy-gate bypass findings. |
| `M2` | 50-75% rollout bucket | Verify platform-managed channel binding overrides remain super-admin gated in live admin workflows. | No unauthorized platform-managed binding mutation events and no rollback drill failure. |
| `M3` | 100% rollout | Confirm support playbook readiness and legacy shell entry remains recoverable only through explicit rollback flags. | 7 days stable operations with no unresolved cutover incidents. |

### Support incident rollback runbook

1. Immediate blast-radius reduction: set `NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_FORCE_LEGACY=true`.
2. If cross-surface instability persists, set `NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_ENABLED=false` and hold `ROLLOUT_PERCENT=0`.
3. Verify operator channels render legacy shell for affected orgs and that orchestrator-first routing guardrails still block unresolved route identity.
4. Capture incident evidence:
   - affected org IDs and deterministic cohort buckets,
   - flag state at incident start/end,
   - role-gate decision logs for platform-managed channel binding changes.
5. Re-enable rollout gradually:
   - reset `FORCE_LEGACY=false`,
   - restore `SHELL_ENABLED=true`,
   - increase `ROLLOUT_PERCENT` in staged increments with support watch windows.

### Legacy fallback retirement timeline

1. Keep legacy fallback available via explicit flags through `M3 + 14 days` stabilization window.
2. During stabilization, run weekly rollback drills using `FORCE_LEGACY` and `SHELL_ENABLED=false` paths.
3. After stabilization window and successful drills, mark legacy fallback as incident-only path and remove non-emergency operational use from support SOPs.

---

## OCC-013 closeout summary (2026-02-24)

### Pre-task rollout/rollback verification risks reviewed

1. Full-profile regressions could expose route/authority contract drift and weaken rollback confidence.
2. Existing lint/test baseline noise could mask true closeout regressions if not classified explicitly.
3. Queue/plan/index/session prompt drift could publish stale launch-readiness state.

### Dependency evidence captured

1. All prior OCC `P0` rows are `DONE` before closeout: `OCC-001`, `OCC-002`, `OCC-004`, `OCC-005`, `OCC-007`, `OCC-010`, `OCC-011`.
2. Upstream TCG dependencies required by OCC routing/collaboration rows remain `DONE`: `TCG-014`, `TCG-015`, `TCG-016`, `TCG-017`.

### Full verification profile evidence

1. `npm run typecheck`: pass.
2. `npm run lint`: pass with warnings only (`3124` warnings, `0` errors; exit `0`).
3. `npm run test:unit`: pass (`109` files, `569` tests).
4. `npm run test:integration`: pass (`21` files passed, `2` skipped; `67` tests passed, `22` skipped).
5. `npm run docs:guard`: pass.

### Launch-readiness statement

1. Lane `E` closeout is complete through `OCC-013` with full verification profile evidence and synchronized queue artifacts.
2. Cutover remains rollback-ready via deterministic shell flags (`SHELL_ENABLED`, `ROLLOUT_PERCENT`, `FORCE_LEGACY`) and documented support runbook triggers.

---

## Acceptance criteria

1. TCG upstream dependencies (`TCG-014`..`TCG-017`) are complete before dependent OCC implementation rows.
2. Operator channels default to orchestrator-first routing without fail-open fallback.
3. Group + DM collaboration UX and DM summary sync are available with deterministic audit traces.
4. Legacy AI chat path deprecation and rollback playbooks are published.
5. Queue artifacts are synchronized and `npm run docs:guard` passes.

---

## Non-goals

1. implementing runtime kernel collaboration semantics inside this workstream,
2. replacing TCG runtime governance ownership,
3. broad redesign of unrelated desktop windows,
4. weakening role gates for platform-managed routing and channel bindings.
