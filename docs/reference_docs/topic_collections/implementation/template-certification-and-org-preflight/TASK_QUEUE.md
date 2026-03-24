# Template Certification And Org Preflight Task Queue

**Last updated:** 2026-03-24  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight`  
**Source request:** Refactor WAE rollout gating into scalable reusable template certification plus deploy-time org preflight.

---

## Queue rules

1. Allowed statuses are only `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally.
3. Promote `PENDING` to `READY` only when dependencies are `DONE`.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. Every row must run its `Verify` commands before moving to `DONE`.
6. Keep certification reusable across orgs and invalidated only by meaningful manifest drift.
7. Keep org preflight separate from version quality.
8. Preserve protected-template, managed-clone, and telephony deployment lifecycles.
9. Sync `INDEX.md`, `MASTER_PLAN.md`, `SESSION_PROMPTS.md`, and `TASK_QUEUE.md` at closeout.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-FOCUSED` | `npx vitest run tests/unit/ai/agentCatalogAdmin.waeRolloutGateControl.test.ts tests/unit/ai/templateCertificationPolicyAndEvidence.test.ts tests/unit/ai/agentOntologyOrgPreflight.test.ts tests/unit/ai/workerPool.waeRolloutGate.test.ts tests/unit/telephony/telephonyIntegration.test.ts tests/unit/ai/platformMotherMigrationGates.test.ts tests/unit/ai/platformMotherAdmin.test.ts tests/unit/ai/agentControlCenterTab.templateLifecycle.dom.test.ts tests/unit/agents/agentDetailPanel.dom.test.ts` |
| `V-DOCS` | `npm run docs:guard` |

---

## Execution lanes

| Lane | Purpose | Merge-overlap policy |
|---|---|---|
| `A` | Certification contract and lifecycle enforcement | No UI work before lane `A` `P0` rows are `DONE` |
| `B` | Org preflight and telephony deployment readiness | Start after lane `A` `P0` rows are `DONE` |
| `C` | Admin/operator UX and docs | Start after lane `A` + `B` `P0` rows are `DONE` |

---

## Dependency-based status flow

1. Complete lane `A` first.
2. Complete lane `B` after lane `A`.
3. Complete lane `C` after lanes `A` and `B`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `TCP-001` | `A` | 1 | `P0` | `DONE` | - | Introduce template certification artifacts, risk tiers, required verification, and deterministic dependency manifests | `convex/ai/agentCatalogAdmin.ts` | `V-TYPE`; `V-FOCUSED` | Completed 2026-03-23: certification artifacts now wrap WAE evidence, risk classification, reusable promotion contracts, and digest-based invalidation. |
| `TCP-002` | `A` | 1 | `P0` | `DONE` | `TCP-001` | Enforce certification at publish, distribution, and spawn boundaries while preserving compatibility wrappers | `convex/agentOntology.ts`; `convex/ai/workerPool.ts`; `convex/ai/platformMotherAdmin.ts` | `V-TYPE`; `V-FOCUSED` | Completed 2026-03-23: lifecycle paths fail closed for missing/invalid certification, Platform Mother rollout requirements now point at template certification, and legacy WAE surfaces remain bridged. |
| `TCP-003` | `B` | 2 | `P0` | `DONE` | `TCP-001` | Add org preflight and separate org-specific blockers from certification quality | `convex/agentOntology.ts`; `convex/integrations/telephony.ts` | `V-TYPE`; `V-FOCUSED` | Completed 2026-03-23: org preflight covers telephony readiness, transfer targets, and deployability blockers across distribution, spawn, and telephony sync flows. |
| `TCP-004` | `C` | 3 | `P0` | `DONE` | `TCP-002`, `TCP-003` | Refactor super-admin rollout surfaces to show certification, preflight, rollout, and drift explicitly | `src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx`; `src/components/window-content/super-admin-organizations-window/agent-control-center-wae-gate-card.tsx`; `src/components/window-content/super-admin-organizations-window/platform-mother-rollout-tab.tsx` | `V-TYPE`; `V-FOCUSED`; `V-DOCS` | Completed 2026-03-23: version lists and rollout previews now expose certification state, risk tier, org blockers, and policy lanes directly. |
| `TCP-005` | `C` | 3 | `P0` | `DONE` | `TCP-003` | Simplify agent detail and telephony UX around deployability, provider readiness, sync state, and blockers | `src/components/window-content/agents/agent-detail-panel.tsx`; `src/components/window-content/agents/agent-telephony-panel.tsx` | `V-TYPE`; `V-FOCUSED` | Completed 2026-03-23: agent detail header and telephony panel now surface certification, preflight, and deploy blockers without raw rollout-gate ceremony. |
| `TCP-006` | `C` | 3 | `P0` | `DONE` | `TCP-004`, `TCP-005` | Sync queue-first docs and close verification loop for the new operating model | this workstream folder | `V-TYPE`; `V-FOCUSED`; `V-DOCS` | Completed 2026-03-23 in this turn. |
| `TCP-007` | `C` | 4 | `P1` | `DONE` | `TCP-006` | Broaden automated certification evidence beyond WAE bridge/manual import for additional template families | `convex/ai/agentCatalogAdmin.ts`; future CI/admin hooks | `V-TYPE`; `V-FOCUSED`; `V-DOCS` | Completed 2026-03-24: CI evidence bundle recording now supports runtime smoke, tool-contract, and policy-compliance evidence sources with deterministic certification artifact output. |
| `TCP-008` | `A` | 4 | `P1` | `DONE` | `TCP-006` | Make risk-tier mapping and verification requirements policy-configurable via platform settings | `convex/ai/agentCatalogAdmin.ts` | `V-TYPE`; `V-FOCUSED` | Completed 2026-03-24: risk field tiers, high-risk keyword escalation, per-tier verification requirements, and auto-certification tiers are now configurable without code edits. |
| `TCP-009` | `B` | 4 | `P1` | `DONE` | `TCP-006` | Expand org preflight modules beyond telephony to include channel and known-integration readiness | `convex/agentOntology.ts` | `V-TYPE`; `V-FOCUSED` | Completed 2026-03-24: org preflight now evaluates required non-telephony channel bindings and mapped integration dependencies with concrete blocker codes. |
| `TCP-010` | `A` | 5 | `P1` | `DONE` | `TCP-009` | Add per-template-family risk policy overlays so certification risk/verification rules can diverge by protected template family without global coupling | `convex/ai/agentCatalogAdmin.ts`; `convex/lib/organizationProvisioningDefaults.ts` | `V-TYPE`; `V-FOCUSED` | Completed 2026-03-24: risk policy settings now support normalized family-key overlays with global fallback and backward-compatible legacy policy reads. |
| `TCP-011` | `B` | 5 | `P1` | `DONE` | `TCP-010` | Introduce org preflight adapter modules for domain readiness, billing/credit readiness, and vertical dependency contracts | `convex/agentOntology.ts`; `convex/integrations/telephony.ts`; `convex/credits/index.ts` | `V-TYPE`; `V-FOCUSED` | Completed 2026-03-24: org preflight now evaluates explicit domain requirements, required credit envelope checks, and vertical contract dependencies with deterministic blocker codes. |
| `TCP-012` | `A` | 5 | `P1` | `DONE` | `TCP-010` | Wire CI/admin automation to emit non-WAE certification evidence bundles by default for low/medium-risk template promotions | `convex/ai/agentCatalogAdmin.ts`; `.github/workflows/wae-eval-gate.yml`; `tests/unit/ai/templateCertificationPolicyAndEvidence.test.ts` | `V-TYPE`; `V-FOCUSED`; `V-DOCS` | Completed 2026-03-24: CI now records risk-tier-aware certification evidence from suite outcomes, emits concrete missing/blocked payloads, and only requires WAE gate recording when policy still demands `wae_eval`. |

---

## Current kickoff

1. Active task: none.
2. Release gate status: `PASSED` for this refactor slice.
3. Next move: define `TCP-013` for template-family rollout ownership, alerting, and CI adoption controls on top of the new evidence-ingestion contract.
