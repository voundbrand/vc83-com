# DSGVO Kanzlei Agent MVP Task Queue

**Last updated:** 2026-03-25  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp`  
**Source request:** Build a queue-first implementation plan for DSGVO-konformer and §203 StGB-/StBerG-sicherer Kanzlei-Agent MVP execution, grounded in existing legal docs and enforced by docs CI.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one row may be `IN_PROGRESS` globally unless a temporary exception is written here first.
3. Promote `PENDING` to `READY` only when every dependency is `DONE`.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. Every row must run its `Verify` commands before moving to `DONE`.
6. Legal references must use `§203 StGB` (not `StBG`) plus `StBerG §57`, `§62`, `§62a`.
7. `existing-docs/` is source input only; canonical operating docs live at workstream root.
8. No production processing of mandant data until `GO_LIVE_CHECKLIST.md` is fully `erfuellt`.
9. External actions (send/export/sync to third systems) remain human-approval-gated in MVP.
10. Sync `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md` at each lane milestone.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-UNIT` | `npm run test:unit` |
| `V-INTEG` | `npm run test:integration` |
| `V-MODEL` | `npm run test:model` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Queue-first planning baseline and workstream contract freeze | workstream docs only | No implementation lane starts before lane `A` `P0` rows are `DONE` |
| `B` | Legal text normalization and policy corpus from existing docs | `compliance/dsgvo_kanzlei_agent_mvp/*.md` | No runtime code edits in this lane |
| `C` | AVV/Subprocessor/transfer/TOM evidence mapping and vendor decisions | `AVV_62A_CHECKLIST.md` + evidence docs | No feature shipping before this lane has a `P0` closeout |
| `D` | Runtime guardrails in Convex AI agent surfaces | `convex/ai/*`; `convex/compliance.ts` | Keep legal prose untouched in this lane except evidence links |
| `E` | Operational readiness: runbooks, DSR, incident, go-live evidence wiring | workstream docs + compliance docs | No broader roadmap expansion here |
| `F` | Final validation and signoff gate | docs + test evidence | Start only after all prior `P0` rows are `DONE` |

---

## Dependency-based status flow

1. Complete lane `A` before any implementation rows.
2. Start lane `B` after `KAMVP-001` and `KAMVP-002` are `DONE`.
3. Start lane `C` after `KAMVP-003` is `DONE`.
4. Start lane `D` after `KAMVP-006` and `KAMVP-008` are `DONE`.
5. Start lane `E` after `KAMVP-010` and `KAMVP-013` are `DONE`.
6. Start lane `F` after all prior `P0` rows are `DONE` or explicitly `BLOCKED` with named owner and mitigation.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `KAMVP-001` | `A` | 1 | `P0` | `DONE` | - | Create queue-first workstream scaffolding and canonical folder contract under `compliance/dsgvo_kanzlei_agent_mvp` | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/README.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/GO_LIVE_CHECKLIST.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/AVV_62A_CHECKLIST.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/MVP_AGENT_POLICY.md` | `V-DOCS` | Completed in this session as docs baseline. |
| `KAMVP-002` | `A` | 1 | `P0` | `DONE` | `KAMVP-001` | Inventory current legal source package in `existing-docs/` and expose it as planning input | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/existing-docs/dpa_template.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/existing-docs/privacy_policy.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/existing-docs/terms_of_service.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/existing-docs/reseller_agreement.md` | `V-DOCS` | Completed as intake read. PDF annexes remain to be parsed and mapped. |
| `KAMVP-003` | `B` | 2 | `P0` | `DONE` | `KAMVP-002` | Create canonical legal source inventory with document status (`authoritative`, `template`, `outdated`, `unknown`) and owner per artifact | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/LEGAL_SOURCE_INVENTORY.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/existing-docs/*` | `V-DOCS` | Completed 2026-03-24 with role-based ownership map, status criteria, and follow-up actions per artifact. |
| `KAMVP-004` | `B` | 2 | `P0` | `DONE` | `KAMVP-003` | Produce German MVP privacy policy draft mapped to actual systems and legal bases, with open-issue markers | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PRIVACY_POLICY_MVP_DE.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/existing-docs/privacy_policy.md` | `V-DOCS` | Completed 2026-03-24 as German MVP working draft with code-grounded processing map and explicit TODO register. |
| `KAMVP-005` | `B` | 2 | `P1` | `DONE` | `KAMVP-003` | Produce German MVP terms draft aligned with current runtime behavior and support boundaries | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/TERMS_MVP_DE.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/existing-docs/terms_of_service.md` | `V-DOCS` | Completed 2026-03-25 as MVP terms draft with runtime-bound scope, human-approval boundaries, and explicit legal TODO register; verified by `npm run docs:guard`. |
| `KAMVP-006` | `B` | 2 | `P0` | `DONE` | `KAMVP-003` | Build German DPA/AVV clause pack that explicitly covers Art. 28 GDPR plus `§203 StGB` and `StBerG §62a` safeguards | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/DPA_AVV_MVP_DE.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/existing-docs/dpa_template.md` | `V-DOCS` | Completed 2026-03-24 as clause-based German draft with explicit confidentiality, subprocessor, transfer, incident, and deletion sections. |
| `KAMVP-007` | `B` | 3 | `P0` | `DONE` | `KAMVP-003` | Create subprocessors and transfer matrix with per-vendor processing purpose, region, mechanism, and review date | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/SUBPROCESSOR_TRANSFER_MATRIX.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/AVV_62A_CHECKLIST.md` | `V-DOCS` | Completed 2026-03-24 with code-evidenced provider list, ownership mapping, and transfer follow-up actions. |
| `KAMVP-008` | `C` | 4 | `P0` | `DONE` | `KAMVP-006`, `KAMVP-007` | Fill `AVV_62A_CHECKLIST.md` per active provider with evidence links and explicit `freigegeben/abgelehnt` decision | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/AVV_62A_CHECKLIST.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/existing-docs/*.pdf` | `V-DOCS` | Completed 2026-03-24 with fail-closed provider decisions and provider-level TODO evidence markers. |
| `KAMVP-009` | `C` | 4 | `P0` | `DONE` | `KAMVP-008` | Publish transfer impact register for every non-EEA path with fallback decision and re-check trigger | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/TRANSFER_IMPACT_REGISTER.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/SUBPROCESSOR_TRANSFER_MATRIX.md` | `V-DOCS` | Completed 2026-03-24 with provider-level fail-closed transfer decisions and re-check triggers. |
| `KAMVP-010` | `C` | 4 | `P0` | `DONE` | `KAMVP-008` | Build TOM control matrix mapping provider TOM claims to MVP technical controls and known gaps | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/TOM_CONTROL_MATRIX.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/existing-docs/Anlage_III_TOMs.pdf` | `V-DOCS` | Completed 2026-03-24 with baseline controls, provider-claim mapping, gap owners, and remediation dates. |
| `KAMVP-011` | `D` | 5 | `P0` | `DONE` | `KAMVP-006`, `KAMVP-008` | Enforce action-level human approval requirement for sensitive agent actions and external sends | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSpecRegistry.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/skills/index.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Completed 2026-03-24. `V-TYPE` passed (`npm run typecheck`), `V-UNIT` passed via scoped lane verification (`npm run test:unit -- tests/unit/ai/delegationAuthorityRuntime.test.ts tests/unit/ai/agentSpecRegistry.contract.test.ts`), and `V-DOCS` passed (`npm run docs:guard`). |
| `KAMVP-012` | `D` | 5 | `P0` | `DONE` | `KAMVP-011` | Add skill/tool allowlist policy for Kanzlei mode to block unapproved external tool calls | `/Users/foundbrand_001/Development/vc83-com/convex/ai/skills/index.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentToolOrchestration.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Completed 2026-03-24 with fail-closed external-send allowlist enforcement and explicit deny-reason logging (`kanzlei_external_tool_not_allowlisted`). Verified by `npm run typecheck`, `npm run test:unit -- tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts tests/unit/ai/skillRegistryPolicy.test.ts`, and `npm run docs:guard`. |
| `KAMVP-013` | `D` | 5 | `P0` | `DONE` | `KAMVP-011` | Add audit events for approval decisions, blocked actions, and external dispatch attempts | `/Users/foundbrand_001/Development/vc83-com/convex/compliance.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/workerPool.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSpecRegistry.ts` | `V-TYPE`; `V-UNIT`; `V-INTEG`; `V-DOCS` | Completed 2026-03-24 with structured Kanzlei runtime audit events for approval requests, blocked actions, and external dispatch attempts. Verified by `npm run typecheck`, `npm run test:unit -- tests/unit/ai/agentSpecRegistry.contract.test.ts tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts tests/unit/ai/skillRegistryPolicy.test.ts`, scoped integration `npx vitest run tests/integration/ai/approvalPolicy.integration.test.ts`, and `npm run docs:guard`. |
| `KAMVP-014` | `D` | 6 | `P1` | `DONE` | `KAMVP-012`, `KAMVP-013` | Add prompt-input minimization hook for Kanzlei mode (`need-to-know` payload trimming) | `/Users/foundbrand_001/Development/vc83-com/convex/ai/workerPool.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSpecRegistry.ts` | `V-TYPE`; `V-UNIT`; `V-MODEL`; `V-DOCS` | Completed 2026-03-25 after fixing direct-runtime validation model-resolution handling and enforcing strict fail-closed model selection in `scripts/test-model-validation.ts`. Release baseline is explicit and green: `TEST_MODEL_ID=anthropic/claude-opus-4.5`, `MODEL_VALIDATION_TRANSPORT=direct_runtime`, `MODEL_VALIDATION_STRICT_MODEL=1`; `npm run test:model` PASS (`6/6`, conformance PASS), `npm run typecheck` PASS, scoped `npm run test:unit -- tests/unit/ai/toolRegistrySchemaResilience.test.ts` PASS, `npm run docs:guard` PASS. |
| `KAMVP-015` | `E` | 7 | `P0` | `DONE` | `KAMVP-010`, `KAMVP-013` | Wire objective evidence links into `GO_LIVE_CHECKLIST.md` and set real status values from artifacts | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/GO_LIVE_CHECKLIST.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/LEGAL_SOURCE_INVENTORY.md` | `V-DOCS` | Completed 2026-03-24 with evidence-backed status updates and canonical artifact mapping; verified via `npm run docs:guard`. |
| `KAMVP-016` | `E` | 7 | `P0` | `DONE` | `KAMVP-015` | Add DSR and incident response runbooks specific to Kanzlei agent data classes and escalation owners | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/DSR_RUNBOOK.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/INCIDENT_RUNBOOK.md` | `V-DOCS` | Completed 2026-03-24 with explicit SLA tables, escalation ownership, fail-closed criteria, and evidence storage paths; verified via `npm run docs:guard`. |
| `KAMVP-017` | `F` | 8 | `P0` | `DONE` | `KAMVP-016`, `KAMVP-013` | Execute validation set (`docs`, `typecheck`, `unit`, `integration`) and capture evidence summary for MVP gate | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/VALIDATION_EVIDENCE.md`; `/Users/foundbrand_001/Development/vc83-com/tmp/reports/kanzlei-agent-mvp/` | `V-DOCS`; `V-TYPE`; `V-UNIT`; `V-INTEG` | Completed 2026-03-25. Validation set is green: `npm run docs:guard` PASS, `npm run typecheck` PASS, `npm run test:unit` PASS (380 files passed, 7 skipped), `npm run test:integration` PASS. |
| `KAMVP-018` | `F` | 8 | `P0` | `DONE` | `KAMVP-017` | Publish signed MVP release gate decision with named owner approvals and unresolved risk list | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/RELEASE_GATE_DECISION.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/GO_LIVE_CHECKLIST.md` | `V-DOCS` | Completed and refreshed 2026-03-25 with documented release-board `NO_GO` decision, named owner approvals, unresolved risk register, and updated next decision. Verified via `npm run docs:guard`. |

---

## Current kickoff

- Active task: none (no row is currently `IN_PROGRESS`).
- Deterministic next row: `none` (all queued rows are `DONE`).
- Immediate objective: close remaining release-board risks (`R-002`..`R-005`) before flipping gate from `NO_GO` to `GO`.
