# Agent Lifecycle HITL Consolidation Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation`  
**Source request:** Keep AI-Endurance/Common Ground contracts as backbone, focus on Soul + lifecycle + HITL operations, and phase out Brain infrastructure only after retrieval/telemetry parity.

---

## Purpose

Queue-first execution surface for consolidating trainable-agent operations into one lifecycle/HITL control model.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/MASTER_PLAN.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/INDEX.md`

---

## Status

1. `ALC-001` (`DONE`): Brain removed from active desktop launch surfaces and `/brain` now redirects to `/agents`.
2. `ALC-002` (`DONE`): removed remaining active shell translation seed (`ui.windows.brain.title`) and published explicit Brain shell-copy deprecation notes for i18n/docs.
3. `ALC-013` (`DONE`): teach-source retrieval parity now bridges non-layercake knowledge ingests into runtime-searchable retrieval context with provenance-aware metadata.
4. `ALC-003` (`DONE`): Brain window is fenced behind internal-only `NEXT_PUBLIC_INTERNAL_BRAIN_WINDOW`; default UI renders archival notice + `/agents` CTA.
5. `ALC-011` (`DONE`): subtype-aware cross-layer PM routing is now hardened with coordinator-flow subtype assertions (`tests/unit/ai/coordinatorSubtypeRouting.test.ts`) and subtype/channel non-fallback coverage (`tests/unit/ai/activeAgentRouting.test.ts`).
6. `ALC-012` (`DONE`): sessions handoff now uses selectable user targets and backend active-member validation, with regression coverage (`tests/unit/ai/sessionHandoffContract.test.ts`).
7. `ALC-004` (`DONE`): canonical lifecycle states, actors, checkpoints, and allowed transitions are now locked in docs + backend contract module (`convex/ai/agentLifecycle.ts`).
8. `ALC-005` (`DONE`): lifecycle transitions are enforced at runtime across approvals/escalation/execution checkpoints and emitted as trust lifecycle telemetry.
9. `ALC-014` (`DONE`): trust taxonomy now uses canonical `lifecycle` mode, with legacy `brain` mode normalization shim for compatibility.
10. `ALC-008` (`DONE`): integration audit matrix now explicitly marks `covered`/`partial` status across Common Ground Core, harnesses, memory systems, knowledge bases, and app-layer concepts with concrete evidence paths, owning queue rows, and unblock criteria aligned to canonical lifecycle naming (`draft -> active -> paused -> escalated -> takeover -> resolved -> active`).
11. `ALC-006` (`DONE`): trust cockpit now ships a contiguous intervention drill-down flow (queue -> blocker context -> session timeline -> action panel) backed by live approval/escalation mutations.
12. `ALC-009` (`DONE`): retrieval convergence hardening now infers missing legacy teach `sourceType` metadata and preserves bridge provenance tags so `pdf/audio/link/text` teach ingests stay runtime-retrievable (`convex/organizationMedia.ts`, `tests/unit/ai/knowledgeItemRetrievalBridge.test.ts`); resume-pass verification re-ran `npm run typecheck`, `npm run lint`, and `npx vitest run tests/unit/ai tests/integration/ai` (all pass, lint with pre-existing warnings).
13. `ALC-007` (`DONE`): intervention action templates are now explicit in trust cockpit (`send_file`, `override_draft`, `handoff_back_to_agent`) with template-aware audit metadata persisted via approvals/escalation mutations (`convex/ai/interventionTemplates.ts`, `convex/ai/agentApprovals.ts`, `convex/ai/escalation.ts`, `src/components/window-content/agents/agent-trust-cockpit.tsx`, `tests/unit/ai/interventionTemplatesContract.test.ts`).
14. `ALC-010` (`DONE`): lane-F hardening is complete with new regression coverage for lifecycle drift + HITL rollback guardrails (`tests/unit/ai/agentLifecycleContract.test.ts`, `tests/unit/ai/trustTelemetryDashboards.test.ts`) and a published operator runbook/rollout checklist in `MASTER_PLAN.md`, including explicit rollback triggers for HITL flow failures.
15. `ALC-015` (`DONE`): harness-context visibility closure (`LC-GAP-01`) is complete; approvals/escalations now emit normalized `harnessContext` envelopes and trust cockpit intervention drill-down renders harness layer/tool/handoff evidence (`convex/ai/harnessContextEnvelope.ts`, `convex/ai/agentApprovals.ts`, `convex/ai/escalation.ts`, `src/components/window-content/agents/agent-trust-cockpit.tsx`, `tests/unit/ai/harnessContextEnvelope.test.ts`). Verify: lane-H lint (pass with existing warnings), `npm run typecheck` (pass), `npx vitest run tests/unit/ai tests/integration/ai` (pass: 56 files, 212 tests), `npm run docs:guard` (pass).
16. `ALC-016` (`DONE`): escalation/takeover intervention drill-down now includes memory provenance visibility (consent scope/decision, candidate attribution, blocked-without-consent signal) sourced from trust-event timeline wiring in `convex/ai/agentSessions.ts` and rendered in `src/components/window-content/agents/agent-trust-cockpit.tsx`; regression coverage added in `tests/unit/ai/interventionEvidence.test.ts`.
17. `ALC-017` (`DONE`): operator drill-down now exposes retrieval citation provenance with chunk-vs-`knowledge_item_bridge` classification and source kind/path explainability, backed by retrieval snapshot wiring in `convex/ai/agentSessions.ts` and mapping helpers in `src/components/window-content/agents/intervention-evidence.ts`; regression coverage added in `tests/unit/ai/interventionEvidence.test.ts`.
18. `ALC-018` (`DONE`): lane-H extension hardening is complete with a published operator acceptance checklist in `MASTER_PLAN.md` and regression pack coverage across harness/memory/knowledge visibility contracts (`tests/unit/ai/harnessContextEnvelope.test.ts`, `tests/unit/ai/interventionEvidence.test.ts`). Verify: `npm run typecheck` (pass), `npm run lint` (pass with pre-existing warnings), `npx vitest run tests/unit/ai tests/integration/ai` (pass: 57 files, 214 tests), `npm run docs:guard` (pass).
19. Historical closure remains intact: `ALC-001`..`ALC-014` are `DONE`.
20. Typecheck blocker cleared (2026-02-18): previous TS7006 implicit-any errors in `src/components/window-content/super-admin-organizations-window/manage-org/index.tsx` are fixed.

---

## Lane progress board

- [x] Lane A bootstrap (`ALC-001`)
- [x] Lane A completion (`ALC-001`, `ALC-002`, `ALC-003`)
- [x] Lane B (`ALC-004`, `ALC-005`, `ALC-014`)
- [x] Lane C (`ALC-006`, `ALC-007`)
- [x] Lane D (`ALC-008`)
- [x] Lane E (`ALC-009`, `ALC-013`)
- [x] Lane F (`ALC-010`)
- [x] Lane G (`ALC-011`, `ALC-012`)
- [x] Lane H (`ALC-015`..`ALC-018` complete)

---

## Lane F rollout quick reference

- Runbook location: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-lifecycle-hitl-consolidation/MASTER_PLAN.md` (`Operator runbook (ALC-010)` + `Rollout and rollback checklist (ALC-010)` sections).
- Immediate rollback triggers for HITL flow failures:
  - `trust_soul_post_approval_rollback_rate > 0.10`
  - `trust_team_handoff_context_loss_rate > 0.08`
  - intervention template contract failures (`send_file` without file reference, invalid template payload shape, or missing template audit metadata)
  - lifecycle transition payload validation failures for `trust.lifecycle.transition_checkpoint.v1`

---

## Lane H extension closure

- Active follow-on tasks: none (`ALC-015`..`ALC-018` are `DONE`).
- Goal: close residual audit visibility gaps tracked as `LC-GAP-01`..`LC-GAP-03`.
- Recent closure: `ALC-015` (`DONE`) closed `LC-GAP-01` by landing canonical harness-context envelope payload + drill-down rendering contract.
- Extension closeout: `ALC-016` + `ALC-017` closed `LC-GAP-02` and `LC-GAP-03`, and `ALC-018` finalized acceptance checklist + regression hardening.

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Run type checks: `npm run typecheck`
- Run AI runtime tests: `npx vitest run tests/unit/ai tests/integration/ai`
- Run lane-focused lint: `npx eslint src/components/window-content/agents-window.tsx src/components/window-content/agents src/app/agents src/hooks/window-registry.tsx src/app/page.tsx`
