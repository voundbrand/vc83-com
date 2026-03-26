# Template Certification And Org Preflight Task Queue

**Last updated:** 2026-03-25  
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
| `TCP-013` | `A` | 6 | `P1` | `DONE` | `TCP-012` | Operationalize per-template-family CI adoption controls, ownership routing, and alert recommendation payloads for certification evidence ingestion | `convex/ai/agentCatalogAdmin.ts`; `tests/unit/ai/templateCertificationPolicyAndEvidence.test.ts` | `V-TYPE`; `V-FOCUSED`; `V-DOCS` | Completed 2026-03-25: added global/family automation policy settings (adoption mode, owner mappings, alert channels), exposed policy read/write APIs, and returned deterministic alert recommendations in evidence-recording summaries. |
| `TCP-014` | `C` | 6 | `P1` | `DONE` | `TCP-013` | Wire certification alert recommendations into delivery channels and super-admin operational views | `convex/ai/agentCatalogAdmin.ts`; `src/components/window-content/super-admin-organizations-window/agent-control-center-wae-gate-card.tsx`; `tests/unit/ai/templateCertificationPolicyAndEvidence.test.ts`; `tests/unit/ai/agentCatalogAdmin.waeRolloutGateControl.test.ts`; `tests/unit/ai/agentControlCenterWaeGateCard.alertOperations.dom.test.ts` | `V-TYPE`; `V-FOCUSED`; `V-DOCS` | Completed 2026-03-25: alert recommendations now emit deterministic dispatch records with version+digest dedupe, in-app/audit-log delivery state is persisted, queue channels are tracked, and super-admin WAE certification UI surfaces policy scope, recommendations, and recent dispatch history. |
| `TCP-015` | `A` | 7 | `P1` | `DONE` | `TCP-014` | Execute queued certification alert dispatches via channel workers (Slack/PagerDuty/Email) and add acknowledgement + alert-noise throttling lifecycle controls without regressing deterministic version+digest dedupe or fail-closed behavior | `convex/ai/agentCatalogAdmin.ts`; `convex/crons.ts`; `src/components/window-content/super-admin-organizations-window/agent-control-center-wae-gate-card.tsx`; `tests/unit/ai/templateCertificationPolicyAndEvidence.test.ts`; `tests/unit/ai/agentCatalogAdmin.waeRolloutGateControl.test.ts`; `tests/unit/ai/agentControlCenterWaeGateCard.alertOperations.dom.test.ts` | `V-TYPE`; `V-FOCUSED`; `V-DOCS` | Completed 2026-03-25: queued channel dispatches now run through deterministic worker mutations + cron sweeps, worker control policy is configurable via platform settings, acknowledgement + manual throttle lifecycle mutations are live, UI/status payloads include worker lifecycle metadata, and dedupe remains version+digest scoped with fail-closed transport checks. |
| `TCP-016` | `C` | 7 | `P1` | `DONE` | `TCP-015` | Harden provider-specific external transport adapters for certification alert worker dispatch (Slack/PagerDuty/Email) behind dispatch-control policy, and add direct super-admin ack + throttle/snooze action controls | `convex/ai/agentCatalogAdmin.ts`; `convex/channels/providers/slackProvider.ts`; `convex/channels/providers/templateCertificationPagerDutyAdapter.ts`; `convex/channels/providers/templateCertificationEmailAdapter.ts`; `src/components/window-content/super-admin-organizations-window/agent-control-center-wae-gate-card.tsx`; `tests/unit/ai/templateCertificationPolicyAndEvidence.test.ts`; `tests/unit/ai/agentCatalogAdmin.waeRolloutGateControl.test.ts`; `tests/unit/ai/agentControlCenterWaeGateCard.alertOperations.dom.test.ts` | `V-TYPE`; `V-FOCUSED`; `V-DOCS` | Completed 2026-03-25: worker dispatch now executes provider-specific Slack webhook/API, PagerDuty events-v2, and Resend email adapters with fail-closed config checks while preserving retry/throttle/ack semantics; super-admin WAE card now exposes direct per-dispatch `Acknowledge` + `Snooze` controls; verification passed (`npm run typecheck`, focused vitest alert suites, `npm run docs:guard`). |
| `TCP-017` | `A` | 8 | `P1` | `DONE` | `TCP-016` | Add transport credential governance + runbook hardening for Slack/PagerDuty/Email alert worker adapters and enforce deterministic requirement-authoring standards for certification/preflight policy surfaces | `convex/ai/agentCatalogAdmin.ts`; `convex/channels/providers/slackProvider.ts`; `convex/channels/providers/templateCertificationPagerDutyAdapter.ts`; `convex/channels/providers/templateCertificationEmailAdapter.ts`; `src/components/window-content/super-admin-organizations-window/agent-control-center-wae-gate-card.tsx`; `tests/unit/ai/templateCertificationPolicyAndEvidence.test.ts`; `tests/unit/ai/agentCatalogAdmin.waeRolloutGateControl.test.ts`; `tests/unit/ai/agentControlCenterWaeGateCard.alertOperations.dom.test.ts`; `docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/TRANSPORT_CREDENTIAL_RUNBOOK.md` | `V-TYPE`; focused vitest alert suites for touched files; `V-DOCS` | Completed 2026-03-25: added per-channel credential governance controls (dedicated-secret and inline-target policy), adapter-level runbook-aware fail-closed error paths, status-query credential health telemetry for super-admin operations, deterministic requirement-authoring standards/coverage metadata, and runbook documentation; verification passed (`npm run typecheck`, focused vitest alert suites, `npm run docs:guard`). |
| `TCP-018` | `A` | 8 | `P1` | `DONE` | `TCP-017` | Implement strict-mode credential-governance rollout automation, policy-drift notifications, and guardrails for requirement-authoring + transport credential standards while preserving TCP-015/TCP-017 worker lifecycle semantics | `convex/ai/agentCatalogAdmin.ts`; `convex/channels/providers/slackProvider.ts`; `convex/channels/providers/templateCertificationPagerDutyAdapter.ts`; `convex/channels/providers/templateCertificationEmailAdapter.ts`; `src/components/window-content/super-admin-organizations-window/agent-control-center-wae-gate-card.tsx`; `tests/unit/ai/templateCertificationPolicyAndEvidence.test.ts`; `tests/unit/ai/agentCatalogAdmin.waeRolloutGateControl.test.ts`; `tests/unit/ai/agentControlCenterWaeGateCard.alertOperations.dom.test.ts`; `docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/TRANSPORT_CREDENTIAL_RUNBOOK.md` | `V-TYPE`; focused vitest alert suites for touched files; `V-DOCS` | Completed 2026-03-25: strict-mode dispatch control (`manual`/`auto_promote_ready_channels`, advisory/enforced guardrails), runtime effective-policy rollout, deterministic `policy_drift_detected` recommendations, and super-admin drift/rollout telemetry are live with no regressions to retry/ack/throttle/snooze/version+digest dedupe semantics; verification passed (`npm run typecheck`, focused vitest alert suites, `npm run docs:guard`). |

---

## Current kickoff

1. Active task: none.
2. Release gate status: `PASSED` through `TCP-018`.
3. Next move: define `TCP-019` candidate for scheduled drift sweeps + owner escalation workflows.
