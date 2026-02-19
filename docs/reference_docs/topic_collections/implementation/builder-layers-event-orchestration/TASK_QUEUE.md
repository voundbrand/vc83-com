# Builder/Layers Orchestration Core + Event Playbook Task Queue

**Last updated:** 2026-02-19  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration`  
**Source request:** Evolve `/builder`, `/layers`, and web publishing from legacy event templates into reusable orchestration agents and runtime flows, with `event` as playbook #1.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless concurrency rules explicitly allow one per lane.
3. Promote a task from `PENDING` to `READY` only when all dependencies are `DONE`.
4. Selection order is deterministic: highest priority (`P0` -> `P1` -> `P2`) then lowest task ID.
5. If a task is `BLOCKED`, capture blocker details in row `Notes` and continue with next `READY` row.
6. Every task must include explicit verification commands before moving to `DONE`.
7. Keep lane ownership strict to reduce merge conflicts.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, and this queue after each completed task.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-DOCS` | `npm run docs:guard` |
| `V-OCO-LINT` | `npx eslint convex/ai/tools/registry.ts convex/ai/toolScoping.ts convex/ai/tools/internalToolMutations.ts convex/ai/tools/builderTools.ts convex/ai/tools/connectionTools.ts convex/ai/workerPool.ts convex/onboarding/seedPlatformAgents.ts convex/publishingOntology.ts` |
| `V-OCO-UNIT` | `npx vitest run tests/unit/ai/activeAgentRouting.test.ts tests/unit/ai/trustEventTaxonomy.test.ts tests/unit/shell/webchat-deployment-snippets.test.ts` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Baseline assessment and feasibility lock | workstream docs + architecture findings | No implementation lanes before `OCO-001` is `DONE` |
| `B` | Core contract and toolchain alignment | `convex/ai/tools/*`; `convex/ai/toolScoping.ts`; ontology status semantics | Avoid UI feature work before `OCO-005` |
| `C` | Reusable orchestration core + event playbook adapter | orchestration actions; playbook contracts; linking flows | Do not add seed/clone runtime changes in lane `C` |
| `D` | Platform seed agents + clone factory | `convex/onboarding/seedPlatformAgents.ts`; `convex/ai/workerPool.ts`; agent ontology internals | Keep trust lifecycle compatibility intact |
| `E` | Soul v2 learning loop and approvals | `convex/ai/soulGenerator.ts`; `convex/ai/soulEvolution.ts`; trust hooks | No unapproved self-mutation paths |
| `F` | Builder/Layers/Web Publishing UX integration | `src/components/builder/*`; `src/components/layers/*`; web publishing window surfaces | Avoid backend contract churn in lane `F` |
| `G` | Tests, smoke flow, and closeout docs | tests + workstream docs | Starts after all `P0` rows are `DONE` or `BLOCKED` |

---

## Dependency-based status flow

1. Start with lane `A` (`OCO-001`).
2. Lane `B` starts after `OCO-001` is `DONE`.
3. Lane `C` starts after `OCO-003` and `OCO-005` are `DONE`.
4. Lane `D` starts after `OCO-003` is `DONE`.
5. Lane `E` starts after `OCO-008` is `DONE`.
6. Lane `F` starts after `OCO-006` and `OCO-009` are `DONE`.
7. Lane `G` starts after all `P0` tasks in lanes `B`..`F` are `DONE` or `BLOCKED`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `OCO-001` | `A` | 1 | `P0` | `DONE` | - | Baseline audit of builder/layers/publishing primitives, orchestration capabilities, and seed/clone/soul mechanics | `convex/ai/tools/registry.ts`; `convex/ai/tools/internalToolMutations.ts`; `convex/ai/tools/builderTools.ts`; `convex/ai/tools/connectionTools.ts`; `convex/checkoutOntology.ts`; `convex/eventOntology.ts`; `convex/formsOntology.ts`; `convex/onboarding/seedPlatformAgents.ts`; `convex/ai/workerPool.ts`; `convex/ai/soulEvolution.ts` | `V-DOCS` | Completed 2026-02-19: feasibility confirmed. Key gaps captured in `MASTER_PLAN.md`: builder/connection/layers tools exist but are not registered in `TOOL_REGISTRY`; `internalPublishCheckout` validates `type === "checkout"` instead of `checkout_instance`; legacy `active` status is still used in some AI internal paths while core event ontology uses `published`; auto-connection currently cannot create `checkout`/`ticket`/`booking` records. |
| `OCO-002` | `B` | 2 | `P0` | `DONE` | `OCO-001` | Define canonical orchestration-core contract (`experience`, `artifact graph`, `playbook interface`) and normalize status model (`draft`/`published`) across linked objects | `convex/eventOntology.ts`; `convex/checkoutOntology.ts`; `convex/publishingOntology.ts`; `convex/ai/tools/internalToolMutations.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/MASTER_PLAN.md` | `V-TYPE`; `V-LINT`; `V-DOCS` | Completed 2026-02-19: added canonical contract module (`convex/orchestrationContract.ts`) with experience/playbook/artifact-graph vocabulary and centralized lifecycle sets; wired status normalization into event/checkout/publishing and internal AI wrappers. Verify run: `npm run typecheck`, `npm run lint` (warnings only), `npm run docs:guard`. |
| `OCO-003` | `B` | 2 | `P0` | `DONE` | `OCO-002` | Wire missing builder/layers/connection tools into AI tool registry and scoping (`create_webapp`, `deploy_webapp`, `check_deploy_status`, `detect_webapp_connections`, `connect_webapp_data`, `create_layers_workflow`, `link_objects`) | `convex/ai/tools/registry.ts`; `convex/ai/toolScoping.ts`; `convex/ai/harness.ts` | `V-TYPE`; `V-LINT`; `V-OCO-LINT`; `V-OCO-UNIT` | Completed 2026-02-19: registered all seven tools in `TOOL_REGISTRY`, added scoping/profile/channel coverage, and added harness guidance for layers/link orchestration. Verify run: `npm run typecheck` (fails in unrelated pre-existing files: `src/components/window-content/store-window.tsx`, `src/lib/store-pricing-calculator.ts`), `npm run lint` (warnings only), `npx eslint ...` (warnings only), `npx vitest run ...` (pass). |
| `OCO-004` | `B` | 2 | `P1` | `READY` | `OCO-003` | De-prioritize legacy page/template tools in primary orchestration path and route generated-web outcomes through core orchestration + publishing contract | `convex/ai/tools/registry.ts`; `convex/ai/toolScoping.ts`; `convex/ai/tools/internalToolMutations.ts` | `V-TYPE`; `V-LINT`; `V-OCO-LINT` | Keep backward compatibility for existing users relying on `create_page`/`publish_page`. |
| `OCO-005` | `B` | 2 | `P0` | `DONE` | `OCO-002` | Fix legacy contract mismatches (`internalPublishCheckout` type guard, event status normalization, batch publish semantics) | `convex/ai/tools/internalToolMutations.ts`; `convex/checkoutOntology.ts`; `convex/eventOntology.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-OCO-LINT` | Completed 2026-02-19: fixed `internalPublishCheckout` to require `checkout_instance`, normalized legacy event status paths to canonical `published`, aligned `publish_all` event batch semantics to `published`, and added regression coverage in `tests/unit/ai/publishFlowStatusTransitions.test.ts`. Verify run: `npm run typecheck` (fails in unrelated pre-existing file `convex/integrations/aiConnections.ts`: implicit `any`), `npm run lint` (warnings only), `npm run test:unit` (pass), `npx eslint ...` (warnings only). |
| `OCO-006` | `C` | 3 | `P0` | `DONE` | `OCO-003`, `OCO-005` | Implement reusable orchestration runtime/action (`create_experience`) that executes a playbook and produces a deterministic artifact bundle from one conversation payload | `convex/ai/tools/registry.ts`; `convex/ai/tools/internalToolMutations.ts`; new orchestration action under `convex/ai/tools/*`; `convex/checkoutOntology.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-OCO-LINT` | Completed 2026-02-19: shipped core runtime action `createExperience` (`convex/ai/tools/orchestrationRuntimeActions.ts`) plus deterministic idempotency key + per-step signature replay, and added internal artifact lookup/stamping helpers (`internalFindOrchestrationArtifact`, `internalStampOrchestrationMetadata`). Step-level semantics now record `status`, `attempts`, `retryable`, `retryStrategy`, and duplicate resolution (`signature_replay`, `name_reuse`, `none`) for each step. Verify run: `npm run typecheck` (fails in unrelated pre-existing file `src/components/window-content/login-window.tsx:39`), `npm run lint` (warnings only), `npm run test:unit` (pass), `npx eslint convex/ai/tools/registry.ts convex/ai/toolScoping.ts convex/ai/tools/internalToolMutations.ts convex/ai/tools/builderTools.ts convex/ai/tools/connectionTools.ts convex/ai/workerPool.ts convex/onboarding/seedPlatformAgents.ts convex/publishingOntology.ts` (warnings only). |
| `OCO-007` | `C` | 3 | `P1` | `DONE` | `OCO-006` | Implement event playbook v1 on top of core runtime and expose `create_event_experience` as playbook-scoped convenience tool | `convex/ai/tools/connectionToolActions.ts`; `convex/ai/tools/internalToolMutations.ts`; `src/lib/builder/v0-file-analyzer.ts`; new playbook module under `convex/ai/tools/*` | `V-TYPE`; `V-LINT`; `V-UNIT` | Completed 2026-02-19: added event playbook adapter module (`convex/ai/tools/orchestrationPlaybooks.ts`) and convenience tool wrapper (`create_event_experience` in `convex/ai/tools/orchestrationTools.ts`) on top of `create_experience`; added event-signal detection in both `src/lib/builder/v0-file-analyzer.ts` and `convex/lib/connectionDetector.ts`; and centralized unsupported-type safe failures via `convex/ai/tools/connectionTypeSupport.ts` + `convex/ai/tools/connectionToolActions.ts`. Unsupported detections are now preserved as explicit skipped steps with non-retryable/manual-follow-up reasons rather than hard runtime crashes. Verify run: `npm run typecheck` (fails in unrelated pre-existing file `src/components/window-content/login-window.tsx:39`), `npm run lint` (warnings only), `npm run test:unit` (pass). |
| `OCO-008` | `D` | 4 | `P0` | `DONE` | `OCO-003` | Seed specialized platform template agents for orchestration core + event playbook roles with protected templates and worker pool support | `convex/onboarding/seedPlatformAgents.ts`; `convex/ai/workerPool.ts`; `convex/agentOntology.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-OCO-LINT` | Completed 2026-02-19: seeded five protected specialist templates (runtime planner, data-link specialist, publishing operator, event architect, form/checkout specialist) with explicit `templateLayer`/`templateRole`/`templatePlaybook` metadata and default clone policies; kept Quinn as the explicit onboarding template (`templateRole=platform_system_bot_template`); and made onboarding worker selection deterministic in both `agentOntology.getTemplateAgent` and `workerPool.getOnboardingWorker` so additional protected templates do not break onboarding routing. Verify run: `npm run typecheck` (pass), `npm run lint` (warnings only), `npm run test:unit` (pass), `npx eslint convex/ai/tools/registry.ts convex/ai/toolScoping.ts convex/ai/tools/internalToolMutations.ts convex/ai/tools/builderTools.ts convex/ai/tools/connectionTools.ts convex/ai/workerPool.ts convex/onboarding/seedPlatformAgents.ts convex/publishingOntology.ts` (warnings only). |
| `OCO-009` | `D` | 4 | `P1` | `DONE` | `OCO-008` | Add org/user-specific clone spawn flow (`spawn_use_case_agent`) so platform templates can produce dedicated agents per customer use case | `convex/ai/workerPool.ts`; `convex/agentOntology.ts`; new action under `convex/ai/*`; `convex/ai/agentExecution.ts` | `V-TYPE`; `V-LINT`; `V-UNIT` | Completed 2026-02-19: added managed clone factory mutation `ai.workerPool.spawnUseCaseAgent` and public action `ai.agentExecution.spawn_use_case_agent` with RBAC (`manage_organization`) enforcement, owner/requester membership checks, per-org/per-template/per-owner quotas, protected-template inheritance controls (cross-org spawn allowed only for `templateScope=platform`), and audit traces via `objectActions` + `auditLogs`; also added lane-D unit coverage in `tests/unit/ai/templateAgentSelection.test.ts` and `tests/unit/ai/useCaseClonePolicy.test.ts`. Verify run: `npm run typecheck` (pass), `npm run lint` (warnings only), `npm run test:unit` (pass). |
| `OCO-010` | `E` | 5 | `P0` | `DONE` | `OCO-008` | Define and implement Soul v2 model overlays (immutable identity anchors + mutable execution preferences) without breaking current soul schema | `convex/ai/soulGenerator.ts`; `convex/ai/soulEvolution.ts`; `convex/schemas/soulEvolutionSchemas.ts` | `V-TYPE`; `V-LINT`; `V-UNIT` | Completed 2026-02-19: introduced Soul v2 overlay projection (`soulV2`) with immutable identity anchors and mutable execution preferences while preserving legacy `customProperties.soul` fields; updated generator bootstrap to emit v2 overlays; extended schema metadata for approval/version tracking. Verify run: `npm run typecheck` (pass), `npm run lint` (warnings only), `npm run test:unit` (pass). |
| `OCO-011` | `E` | 5 | `P1` | `DONE` | `OCO-010`, `OCO-009` | Add controlled learning loop: outcome telemetry -> proposal generation -> explicit owner approval -> applied soul updates | `convex/ai/soulEvolution.ts`; `convex/ai/tools/soulEvolutionTools.ts`; trust event modules | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-OCO-UNIT` | Completed 2026-02-19: wired 7-day outcome telemetry summaries into reflection proposal generation, enforced explicit owner-review checkpoints before apply, hardened tool behavior when proposals are guardrail-blocked, and emitted soul trust events for proposal create/review/rollback paths. Verify run: `npm run typecheck` (pass), `npm run lint` (warnings only), `npm run test:unit` (pass), `npx vitest run tests/unit/ai/activeAgentRouting.test.ts tests/unit/ai/trustEventTaxonomy.test.ts tests/unit/shell/webchat-deployment-snippets.test.ts` (pass). |
| `OCO-012` | `F` | 6 | `P0` | `READY` | `OCO-006`, `OCO-009` | Build one-conversation launch UX in builder/layers/publishing with playbook selection (default `event`), progress checkpoints, and publish controls | `src/components/builder/*`; `src/components/layers/*`; `src/components/window-content/web-publishing-window/*`; `src/app/builder/*` | `V-TYPE`; `V-LINT`; `V-UNIT` | Keep current design system and mobile/desktop compatibility. |
| `OCO-013` | `G` | 7 | `P0` | `PENDING` | `OCO-012`, `OCO-011` | Add smoke tests for conversation -> core orchestrator -> event playbook artifacts -> payment-ready checkout -> published experience | `tests/unit/ai/*`; new integration/smoke tests; relevant helper scripts | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-OCO-UNIT` | Include negative-path checks for duplicate event detection and publish guardrails. |
| `OCO-014` | `G` | 7 | `P1` | `PENDING` | `OCO-013` | Final hardening, docs synchronization, release checklist, and closeout validation | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/builder-layers-event-orchestration/*` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Do not mark `DONE` until docs guard passes and queue/index/master are synchronized. |

---

## Current kickoff

- Active task: none.
- Next task to execute: `OCO-012` (lane `F`).
- Immediate objective: lane `E` is complete; no promotable lane-`E` tasks remain.
