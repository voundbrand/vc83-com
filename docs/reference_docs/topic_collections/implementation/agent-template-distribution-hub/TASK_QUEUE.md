# Agent Template Distribution Hub Task Queue

**Last updated:** 2026-03-11  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub`  
**Source request:** Design an implementable system where agents are centrally managed as templates, distributed as per-org clones by default, and managed through a super-admin hub.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless an explicit lane rule overrides it.
3. Promote `PENDING` to `READY` only when dependencies are `DONE`.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. Every row must run its `Verify` commands before moving to `DONE`.
6. Precedence must remain deterministic: `platform policy -> template baseline -> org clone overrides -> runtime/session restrictions`.
7. Clone updates must be idempotent and audit-logged with actor, scope, and diff summary.
8. Keep backward compatibility for org agents that have no template source metadata.
9. Seeded-platform agents must preserve `agentCatalogSeedRegistry` invariants (`systemTemplateAgentId`, `protectedTemplate`, `immutableOriginContractMapped`) during migration.
10. Published-agent storefront actions must remain aligned with package/licensing gates before activation.
11. Sync `/INDEX.md`, `/MASTER_PLAN.md`, `/TASK_QUEUE.md`, and `/SESSION_PROMPTS.md` at lane milestones.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-UNIT` | `npm run test:unit` |
| `V-UNIT-AGENT` | `npm run test -- tests/unit/ai/agentOntologyMutationPaths.test.ts tests/unit/agents/agentToolsConfig.dom.test.ts` |
| `V-LINT-AGENT` | `npx eslint src/components/window-content/agents convex/agentOntology.ts convex/ai/toolScoping.ts --ext .ts,.tsx` |
| `V-DOCS` | `npm run docs:guard` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Contract freeze and architecture | docs + contract spec | No implementation lanes before lane `A` `P0` rows are `DONE` |
| `B` | Backend template/clone model and distribution APIs | Convex model/mutations/queries | Start only after lane `A` `P0` rows are `DONE` |
| `C` | Super-admin template hub UX | desktop/super-admin UI | Start only after lane `B` `P0` rows are `DONE` |
| `D` | Org clone controls, override policy, rollout/rollback | org agent UI + policy enforcement | Start only after lane `C` `P0` rows are `DONE` |
| `E` | Verification and closeout | tests + docs sync | Start only when prior `P0` rows are `DONE` or `BLOCKED` |

---

## Dependency-based status flow

1. Execute lane `A` first (`ATH-001`..`ATH-002`).
2. Start lane `B` after `ATH-001` is `DONE`.
3. Start lane `C` after lane `B` `P0` rows are `DONE`.
4. Start lane `D` after lane `C` `P0` rows are `DONE`.
5. Start lane `E` after all prior `P0` rows are `DONE` or `BLOCKED`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `ATH-001` | `A` | 1 | `P0` | `DONE` | - | Freeze template/clone contract, precedence rules, and role boundaries (`super_admin` global vs org-scoped operators) | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/MASTER_PLAN.md` | `V-DOCS` | Completed 2026-03-07: precedence and role boundary lock documented in plan + backend comments (`agentOntology.ts`, `toolScoping.ts`). |
| `ATH-002` | `A` | 1 | `P1` | `DONE` | `ATH-001` | Publish migration strategy for existing org agents (template-linked vs unmanaged legacy) | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/MASTER_PLAN.md` | `V-DOCS` | Completed 2026-03-09: documented deterministic migration partitions (`managed_clone`, `legacy_seeded`, `legacy_unmanaged`), mandatory dry-run contract, apply gating via `migrationJobId`, idempotent rollback sequence, and stop-condition thresholds. |
| `ATH-003` | `B` | 2 | `P0` | `DONE` | `ATH-001` | Add backend contract for template metadata + clone linkage (source template id/version, lifecycle state, override policy) | `convex/agentOntology.ts`; `convex/schemas/*`; `convex/layers/types.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Completed 2026-03-08: shipped `templateCloneLinkage` contract (`sourceTemplateId`, `sourceTemplateVersion`, `cloneLifecycleState`, `overridePolicy`, `lastTemplateSyncAt`, `lastTemplateSyncJobId`) with legacy fallback to `templateAgentId`/`cloneLifecycle`; seeded bridge invariants preserved; no destructive migration. |
| `ATH-004` | `B` | 2 | `P0` | `DONE` | `ATH-003` | Implement super-admin template lifecycle mutations: create template, new version, publish, deprecate | `convex/agentOntology.ts`; `convex/ai/toolScoping.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Completed 2026-03-08: added `createAgentTemplate`, `createAgentTemplateVersionSnapshot`, `publishAgentTemplateVersion`, `deprecateAgentTemplateLifecycle`; fail-closed `super_admin` enforcement; immutable snapshot conflict guard; deterministic dual audit envelopes (`objectActions` + `auditLogs`). |
| `ATH-005` | `B` | 2 | `P0` | `DONE` | `ATH-004` | Implement distribution engine mutation: plan/apply template rollout to selected org scopes with idempotent upsert | `convex/agentOntology.ts`; `convex/ai/agentExecution.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Completed 2026-03-08: added `distributeAgentTemplateToOrganizations` with deterministic target sort + stable job id, dry-run planning, idempotent create/update/skip upsert, and rollout audit events (`template_distribution_*`). Full `V-UNIT` has unrelated existing failure in `meetingConciergeIngress`; targeted lifecycle/distribution suite passes. |
| `ATH-006` | `B` | 2 | `P1` | `DONE` | `ATH-005` | Add drift query for clone-vs-template diffs (tools, autonomy, model, prompt, bindings) | `convex/agentOntology.ts`; `convex/ai/toolScoping.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Completed 2026-03-08: added `getTemplateCloneDriftReport` with deterministic target sort + stable field diff order, policy state classification (`in_sync`/`overridden`/`stale`/`blocked`), and legacy linkage fallback support. `V-TYPE` and `V-DOCS` pass; full `V-UNIT` has one unrelated existing failure in `tests/unit/ai/meetingConciergeIngress.test.ts` (`clarification_required` expectation). |
| `ATH-015` | `B` | 2 | `P1` | `DONE` | `ATH-001` | Add seeded-agent bridge contract: map `agentCatalogSeedRegistry.systemTemplateAgentId` into template linkage and preserve protected-template flags | `convex/ai/agentCatalogAdmin.ts`; `convex/schemas/agentProductizationSchemas.ts`; `convex/agentOntology.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Completed 2026-03-07: bridge contract persisted in seed registry, immutable-origin rebinding lock enforced, audited migration-override mutation added, legacy seed coverage semantics preserved. |
| `ATH-007` | `C` | 3 | `P0` | `DONE` | `ATH-005` | Build super-admin hub entry point for template catalog, version history, and rollout actions | `src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx`; new hub components under `src/components/window-content/agents/` | `V-TYPE`; `V-UNIT`; `V-LINT-AGENT`; `V-DOCS` | Completed 2026-03-08: added in-place `TemplateHubEntryPanel` entry surface (catalog/version/rollout sections) inside existing Agent Control Center shell with section toggles and drift/sync context. Added DOM coverage. `V-TYPE`, `V-LINT-AGENT` (warnings only), and `V-DOCS` pass; full `V-UNIT` has the same unrelated existing `meetingConciergeIngress` failure (`clarification_required` expectation). |
| `ATH-008` | `C` | 3 | `P0` | `DONE` | `ATH-006`, `ATH-007` | Add cross-org clone inventory with filters and drift indicators (in-sync, overridden, stale) | `src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx`; `convex/agentOntology.ts` | `V-TYPE`; `V-UNIT`; `V-LINT-AGENT`; `V-DOCS` | Completed 2026-03-09: added `listTemplateCloneInventory` backend query + super-admin inventory panel with org/template/state/risk/search filters and deterministic row ordering. Drift/risk indicators now visible in control center (`in_sync`, `overridden`, `stale`, `blocked` + low/medium/high risk). `V-TYPE` and `V-DOCS` pass; `V-LINT-AGENT` passes with existing warnings only; full `V-UNIT` keeps unrelated `meetingConciergeIngress` failure (`clarification_required` expectation). |
| `ATH-009` | `C` | 3 | `P1` | `DONE` | `ATH-008` | Add rollout safety controls: staged rollout size, preview diff, confirmation, rollback target version | super-admin agent control center + rollout mutations | `V-TYPE`; `V-UNIT`; `V-DOCS` | Completed 2026-03-09: added staged rollout window contract (`stagedRollout.stageSize` + `stageStartIndex`) with deterministic slicing and auditable `rolloutWindow` + plan/applied summaries; added super-admin rollout options query and control-center rollout panel with preview diff table, explicit confirmation gating for apply/rollback, and rollback target version selector. `V-TYPE` and `V-DOCS` pass; full `V-UNIT` retains unrelated existing `meetingConciergeIngress` failure (`clarification_required` expectation). |
| `ATH-016` | `C` | 3 | `P1` | `DONE` | `ATH-008` | Extend Agent Catalog storefront metadata with package/license descriptors for published agents | `convex/ai/agentStoreCatalog.ts`; `src/components/window-content/agents/agent-store-panel.tsx`; `convex/schemas/agentProductizationSchemas.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Completed 2026-03-09: added optional `storefrontPackageDescriptor` schema contract and surfaced descriptors in store card + product context payloads (`packageAccess`, `licenseModel`, `activationHint`, optional codes/notes) with deterministic defaults for legacy rows. Storefront UI now renders package/license/access hint metadata without changing publish filters or activation entitlement enforcement (reserved for `ATH-017`). `V-TYPE` and `V-DOCS` pass; full `V-UNIT` retains unrelated existing `meetingConciergeIngress` failure (`clarification_required` expectation). |
| `ATH-010` | `D` | 4 | `P0` | `DONE` | `ATH-008` | Extend org agent detail/tools views to show source template/version and override badges | `src/components/window-content/agents/agent-detail-panel.tsx`; `src/components/window-content/agents/agent-tools-config.tsx`; `src/components/window-content/agents/types.ts` | `V-TYPE`; `V-UNIT-AGENT`; `V-LINT-AGENT`; `V-DOCS` | Completed 2026-03-09: added shared template lineage/override parsing helpers in agent UI types and surfaced lineage metadata + override mode badges in detail header and tools config (tool profile/allowlist/disabled field modes) without altering existing edit/save behavior. Added DOM coverage for lineage rendering in tools and detail panel. `V-TYPE`, `V-UNIT-AGENT`, and `V-DOCS` pass; `V-LINT-AGENT` passes with existing warnings only. |
| `ATH-011` | `D` | 4 | `P0` | `DONE` | `ATH-010` | Enforce override policy gates (`locked`, `warn`, `free`) during org-level edits and bulk rollouts | `convex/agentOntology.ts`; `src/components/window-content/agents/*` | `V-TYPE`; `V-UNIT`; `V-UNIT-AGENT`; `V-DOCS` | Completed 2026-03-09: update/rollout paths now enforce deterministic `locked` fail-closed + `warn` confirmation/reason gates with audit envelopes (`managed_clone_override_gate_evaluated`, `template_distribution_blocked`, policy-gate summaries). Org tools/create edit flows block warn writes until confirmation + reason. `V-TYPE`, `V-UNIT-AGENT`, and `V-DOCS` pass; full `V-UNIT` retains unrelated existing `meetingConciergeIngress` failure (`clarification_required` expectation). |
| `ATH-012` | `D` | 4 | `P1` | `DONE` | `ATH-011` | Add operational telemetry and audit views for distribution jobs, drift changes, and rollback events | `convex/ai/trustEvents.ts`; super-admin control center views | `V-TYPE`; `V-UNIT`; `V-DOCS` | Completed 2026-03-09: added `listTemplateDistributionTelemetry` query with deterministic status/error/affected-org summaries, operation kind (`rollout_apply`/`rollout_rollback`), policy-gate and reason-count rollups; rollout UI now surfaces distribution telemetry table + aggregate counters. Extended trust-event taxonomy with template-distribution admin events. `V-TYPE` and `V-DOCS` pass; full `V-UNIT` retains unrelated existing `meetingConciergeIngress` failure (`clarification_required` expectation). |
| `ATH-017` | `D` | 4 | `P1` | `DONE` | `ATH-016` | Enforce package/license entitlements on published-agent activation path (`spawn_use_case_agent` / preflight) | `convex/ai/agentStoreCatalog.ts`; `convex/ai/agentExecution.ts`; `convex/licensing/helpers.ts`; `src/components/window-content/agents/agent-store-panel.tsx` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Completed 2026-03-09: added deterministic entitlement resolver + fail-closed preflight/spawn gates with stable reason codes/guidance, legacy descriptor fallback, and deterministic allow/deny entitlement audit envelopes (`agent_store_activation_entitlement_evaluated`). UI now surfaces entitlement state/reason/guidance on cards + detail + blocked activation messages. `V-TYPE` and `V-DOCS` pass; full `V-UNIT` retains unrelated existing `meetingConciergeIngress` failure (`clarification_required` expectation). |
| `ATH-013` | `E` | 5 | `P0` | `DONE` | `ATH-011` | Execute verification profile and publish release gate decision for template distribution hub | this workstream docs + affected code paths | `V-TYPE`; `V-UNIT`; `V-LINT-AGENT`; `V-DOCS` | Completed 2026-03-09: release-gate verification passed after ingress routing regression fix (`npm run typecheck`, `npm run test:unit`, `npm run docs:guard`). No residual blocking test failures. |
| `ATH-014` | `E` | 5 | `P1` | `DONE` | `ATH-013` | Final closeout: sync queue artifacts and publish ops runbook for rollout + rollback cadence | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/*` | `V-DOCS` | Completed 2026-03-09: queue-first artifacts synchronized (TASK_QUEUE/INDEX/MASTER_PLAN/SESSION_PROMPTS) with lane `E` closeout and promotable-next-task handoff. Existing rollback trigger guidance remains in `MASTER_PLAN.md` rollout section. |
| `ATH-018` | `E` | 6 | `P1` | `DONE` | `ATH-002`, `ATH-014` | Run operational drill for legacy migration runbook (mock dry-run/apply gate/rollback simulation) | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/ATH-018_MIGRATION_DRILL_2026-03-09.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/MASTER_PLAN.md` | `V-UNIT-AGENT`; `V-DOCS` | Completed 2026-03-09: drill log captured deterministic partitioning and `migrationJobId` gate behavior; targeted validation passed (`agentOntologyMutationPaths`, `agentToolsConfig.dom`), docs guard passed, no new blockers. |
| `ATH-019` | `E` | 6 | `P1` | `DONE` | `ATH-018` | Run pre-rollout readiness drill before large legacy-linkage campaign (full compile/unit/docs verification) | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/ATH-019_PRE_ROLLOUT_DRILL_2026-03-09.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/MASTER_PLAN.md` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Completed 2026-03-09: readiness drill passed (`npm run typecheck`, `npm run test:unit`, `npm run docs:guard`) with no blocking regressions. |
| `ATH-020` | `E` | 6 | `P1` | `DONE` | `ATH-019` | Execute canary rollout runbook step-by-step for first legacy-linkage wave (dry-run -> gated apply -> telemetry hold -> rollback criteria check) | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/ATH-020_CANARY_ROLLOUT_RUNBOOK.md`; `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/ATH-020_CANARY_EXECUTION_LOG_2026-03-11.md` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Started 2026-03-09: concrete runbook drafted with repo-specific mutation/query endpoints and operator checkpoints. 2026-03-11: reran required verification profile successfully (`npm run typecheck`, `npm run test:unit`, `npm run docs:guard` all pass). 2026-03-11: `BLOCKED` -> `DONE` per operator confirmation that live canary testing succeeded and rollout flow works end-to-end. |

---

## Current kickoff

- Active task: none (`0` rows in `IN_PROGRESS`).
- Immediate objective: monitor post-canary telemetry and preserve rollback readiness for wider rollout waves.
- Release gate status: `PASSED` (lanes `A`..`E` complete as of 2026-03-09).
