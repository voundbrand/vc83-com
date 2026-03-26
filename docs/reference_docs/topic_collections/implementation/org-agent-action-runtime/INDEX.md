# Org Agent Action Runtime Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/org-agent-action-runtime`  
**Source request:** Define a queue-first implementation plan for a full org-owned agent activity/action runtime that captures structured conversation outcomes, writes canonical CRM data into the platform first, creates durable activity and actionable work items, supports approvals and low-risk auto-execution, routes Veronica-style telephony through the existing One-of-One Operator runtime, and adds a Kanban-style owner control board with agent-based filters. Extend this workstream with explicit reusable-harness finish criteria, including existing-agent topology inventory and migration notes.

---

## Purpose

This workstream defines the implementation contract for an org-level runtime that:

1. turns telephony, webchat, and follow-up execution into one canonical session-to-activity pipeline,
2. captures structured outcomes from org-owned agents into platform-owned state first,
3. writes canonical CRM records before any external CRM sync,
4. persists immutable activity separately from mutable action items,
5. lets org owners approve, assign, complete, retry, or take over work,
6. lets agents auto-execute only low-risk actions permitted by org policy,
7. provides an Action Center list/Kanban pipeline view for controlling execution flow,
8. keeps agent-filter controls aligned to active catalog identities (default `all` plus per-agent filters),
9. preserves auditability, receipts, retries, takeover, and telemetry at every stage.

---

## Runtime Summary

1. **Canonical source of truth:** platform-owned CRM objects, links, activity objects, action items, approvals, and `objectActions`.
2. **Channel model:** telephony, webchat, and follow-up execution all resolve through `agentSessions` and conversations rather than separate runtime silos.
3. **Telephony decision:** Veronica-style telephony agents are operator-runtime participants, not standalone receptionist prompts.
4. **Owner workflow:** Action Center becomes the primary operational queue for org owners, in both list and Kanban modes.
5. **Filter model:** Kanban/list filters are catalog-backed (default `all` plus per-agent identities), not static UI labels.
6. **External CRM stance:** outbound sync is downstream only and starts narrow in internal-only V1.

---

## Platform Topology Contract

OAR now treats topology as an explicit profile rather than an implicit code path:

1. `single_agent_loop`: one authority agent + tools over one turn lifecycle (current default).
2. `pipeline_router`: staged ingress/process/storage routing with deterministic stage contracts.
3. `multi_agent_dag`: directed handoff graph between specialized agents with bounded fan-out.
4. `evaluator_loop`: generation + scoring + retry/selection loops with explicit metric gates.

Reusable harness boundaries:

1. shared kernel: ingress, routing, tool dispatch, delivery, settlement/finalization,
2. profile adapter: topology-specific orchestration behavior,
3. agent package: prompt/tools/policy/memory/eval contracts per agent.

Existing-agent fit requirement:

1. every active agent must declare one topology profile,
2. each declaration must be backed by a tool-calling behavior inventory,
3. profile mismatch or missing declaration blocks production enablement.

---

## Platform-Finished Definition

For OAR, “finished” means:

1. topology profile is declared and enforced for each runtime,
2. kernel contract is versioned and stable,
3. all external awaits are bounded (timeout/retry/fallback) and terminalization is guaranteed,
4. agent package spec is standardized and reusable,
5. promotion is eval-gated with explicit thresholds,
6. operations are SLO-backed with alert/runbook ownership,
7. new-agent launch is mostly configuration, not kernel edits.

---

## Current Status

1. Lane `A` docs freeze is complete.
2. `OAR-001` is complete: code-reality baseline, hard boundaries, and phase sequencing are now documented.
3. `OAR-002` is complete: queue rules, verification profiles, lanes, and gating are frozen.
4. `OAR-003` is `DONE`: canonical schema contracts for policy snapshots, execution receipts, and sync bindings are now in place.
5. `OAR-004` is `DONE`: channel-agnostic outcome-envelope extraction contract is now implemented with reusable session/conversation wrappers.
6. `OAR-005` is `DONE`: immutable activity persistence hardening now enforces deterministic artifact-ref normalization across session/contact/org/action contracts and activity-protocol detail refs.
7. `OAR-006` is `DONE`: canonical CRM projection now records `crm_activity` objects, object-action evidence, and sync-candidate artifacts without external writes.
8. `OAR-007` is `DONE`: telephony route-identity normalization and operator-runtime ingress parity are now validated in runtime/tests.
9. `OAR-008` is `DONE`: telephony transcript/outcome/takeover checkpoint artifacts are now validated on shared runtime timeline rails.
10. `OAR-009` is `DONE`: webchat/conversation routing parity now validates against shared outcome/checkpoint/HITL contracts.
11. `OAR-011` is `DONE`: fail-closed org action policy resolution and durable snapshot persistence contracts are now implemented.
12. `OAR-012` is `DONE`: reusable approval packet + fail-closed action-item transition contracts are now implemented.
13. `OAR-013` is `DONE`: preview-to-receipt execution contract helpers now cover policy/receipt/idempotency/correlation primitives.
14. `OAR-014` is `DONE`: low-risk auto-execution allowlist now fail-closes external/non-low-risk execution paths by contract.
15. `OAR-015` is `DONE`: Action Center list/query plus Kanban owner workflow surface now ships with default `all` and active catalog-backed per-agent filters.
16. `OAR-016` is `DONE`: Action Center detail view now renders policy/receipt/takeover context and executes parity state transitions from list and Kanban controls.
17. `OAR-017` is `DONE`: immutable activity timeline now renders canonical correlated streams (activity, workflow checkpoints, policy, receipts, sync markers) and is embedded in Action Center detail plus Trust Cockpit session drill-down.
18. `OAR-019` is `DONE`: sync outbox contract now supports pending-candidate listing, dispatch-receipt persistence, binding upsert/conflict handling, sync-marker writeback, and telemetry detail extensions.
19. `OAR-020` is `DONE`: narrow outward CRM sync V1 now dispatches pending OAR sync candidates through a fail-closed batch action/API trigger, persists canonical dispatch receipts/bindings, and exposes integration coverage + outbox status query rails.
20. `OAR-022` is `DONE`: reliability receipts/retry/idempotency/correlation guardrails now persist across Action Center transitions, session receipt diagnostics, activity protocol events, and sync dispatch metadata.
21. `OAR-024` is `DONE`: migration/backfill module + rollout-flag contracts now cover action/activity/sync artifacts with dry-run-first batch tooling and documented rollout commands.
22. `OAR-025` is `DONE`: full OAR verification matrix (type/unit/integration/trust e2e/desktop e2e/docs) is complete with captured evidence in `tmp/reports/org-agent-action-runtime/OAR-025-verification-2026-03-25.md`.
23. `OAR-028` is `DONE`: runtime topology profile contract enforcement now ships with fail-closed resolution and explicit adapter selection in runtime + kernel helpers, with evidence at `tmp/reports/org-agent-action-runtime/OAR-028-verification-2026-03-25.md`.
24. `OAR-029` is `DONE`: inbound kernel contract is now versioned/frozen with adapter compatibility assertions and turn-schema persistence hooks, with evidence at `tmp/reports/org-agent-action-runtime/OAR-029-verification-2026-03-25.md`.
25. `OAR-030` and `OAR-034` are `DONE` with evidence captured at `tmp/reports/org-agent-action-runtime/OAR-030-verification-2026-03-25.md` and `tmp/reports/org-agent-action-runtime/OAR-034-verification-2026-03-25.md`.
26. `OAR-010` is `DONE`: follow-up runtime re-entry now enforces fail-closed source context + policy gates, preserves deterministic correlation/idempotency chains, and routes follow-up source through dedicated workflow metadata; evidence is captured at `tmp/reports/org-agent-action-runtime/OAR-010-verification-2026-03-25.md`.
27. `OAR-018` is `DONE`: CRM contact/organization detail panes and control-center surfaces now embed canonical org-action context using existing OAR query/timeline contracts; evidence is captured at `tmp/reports/org-agent-action-runtime/OAR-018-verification-2026-03-25.md`.
28. `OAR-021` is `DONE`: external dispatch contracts now enforce approval-aware org-gated connector allowlists with deterministic dispatch identity and fail-closed rollback/compensation semantics.
29. `OAR-023` is `DONE`: trust telemetry + operator surfaces now expose retry disposition, blocked reason, unblock actor, and retry-safe guidance while replay intent stays fail-closed for blocked/terminal receipts.
30. `OAR-026` is `DONE`: canary rollout runbook now records named owners, rollback trigger matrix, and fail-closed connector-execution proofs with explicit expansion gates.
31. `OAR-031` is `DONE`: reusable package contracts now normalize fail-closed from explicit spec input or deterministic defaults, validate package tool/policy references, and persist package rollout/eval summary fields in registry storage with focused unit coverage in `orgAgentPackageContract.test.ts`.
32. `OAR-032` is `DONE`: production gate evidence now fuses eval thresholds and runtime SLO contracts with fail-closed decisions, exposes runtime gate telemetry in `agentSessions`, and renders blocked-reason diagnostics in Trust Cockpit runtime KPIs.
33. `OAR-027` is `DONE`: platform topology contract and finish-definition docs are now codified in this workstream.
34. `OAR-033` is `DONE`: existing-agent topology/tool-calling inventory and profile mapping are now documented with migration risk notes.
35. `OAR-035` is `DONE`: existing-agent migration evidence contract now publishes deterministic profile/adapter compatibility pass/fail snapshots plus blocked-agent remediation queue output (`oar_existing_agent_topology_migration_v1`) with focused coverage in `runtimeModuleRegistry.test.ts`.
36. Queue rows `OAR-001`..`OAR-035` are now `DONE` for this workstream baseline.

Immediate objective:

1. keep the OAR runtime contracts stable under regression checks,
2. preserve internal-only V1 execution gates until explicit expansion signoff.

---

## Core Files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/org-agent-action-runtime/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/org-agent-action-runtime/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/org-agent-action-runtime/MASTER_PLAN.md`
- Index:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/org-agent-action-runtime/INDEX.md`

Upstream reality anchors:

- `/Users/foundbrand_001/Development/vc83-com/convex/crmOntology.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/crmIntegrations.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/conversations.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/conversations.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentApprovals.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts`
- `/Users/foundbrand_001/Development/vc83-com/src/lib/telephony/agent-telephony.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/activityProtocol.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustTelemetry.ts`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-approval-queue.tsx`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-trust-cockpit.tsx`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/AGENT_CONTROL_CENTER_DATA_CONTRACT.md`

---

## Lane Progress Board

- [x] Lane A architecture freeze and queue contract (`OAR-001`, `OAR-002`)
- [ ] Lane B canonical data model and platform-first CRM projection (`OAR-003`..`OAR-006`)
- [x] Lane C telephony/webchat/follow-up runtime convergence (`OAR-007`..`OAR-010`)
- [ ] Lane D policy, approvals, and action execution (`OAR-011`..`OAR-014`)
- [x] Lane E owner Action Center list/Kanban pipeline and activity timeline UI (`OAR-015`..`OAR-018`)
- [x] Lane F downstream CRM sync architecture and gated connector execution (`OAR-019`..`OAR-021`)
- [x] Lane G receipts, retries, idempotency, and telemetry (`OAR-022`, `OAR-023`)
- [x] Lane H migration, rollout, and full test closeout (`OAR-024`..`OAR-026`)
- [x] Lane I platform-finished hardening (topology profiles, kernel stability, bounded execution, package/eval/SLO gates, and existing-agent migration) (`OAR-028`..`OAR-035`)

---

## Operating Commands

- Docs guard:
  `npm run docs:guard`
- Type safety:
  `npm run typecheck`
- Integration subset:
  `npx vitest run tests/integration/ai/sessionRouting.integration.test.ts tests/integration/ai/approvalPolicy.integration.test.ts tests/integration/ai/orgActionRuntime.integration.test.ts`
- Trust/owner surface e2e:
  `npx playwright test tests/e2e/agent-trust-experience.spec.ts`
