# CMS Agent Prototype-to-App GitOps Task Queue

**Last updated:** 2026-03-02  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops`  
**Source request:** Design and stage implementation of a CMS agent lifecycle that supports `v0 prototype -> apps/* promotion -> mother-repo/API/agent connection -> CMS updates -> deploy/redeploy` and evolves from MVP to world-class.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one row may be `IN_PROGRESS` globally unless lane policy explicitly allows concurrency.
3. Promote from `PENDING` to `READY` only after all dependencies are satisfied.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. If `BLOCKED`, capture blocker and fallback in `Notes`.
6. Every row must run listed `Verify` commands before moving to `DONE`.
7. Keep lane boundaries strict to minimize merge conflict risk.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` at each lane milestone.
9. Dependency token rules:
   - `ID`: dependency must be `DONE`.
   - `ID@READY`: dependency must be `READY` or `DONE`.
   - `ID@DONE_GATE`: task can start but cannot move to `DONE` until dependency is `DONE`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-REFERENCE-APP-TYPE` | `npm --prefix apps/one-of-one-landing run typecheck` |
| `V-REFERENCE-APP-BUILD` | `npm --prefix apps/one-of-one-landing run build` |
| `V-CMS-LINT` | `npx eslint convex/integrations/github.ts convex/integrations/vercel.ts convex/builderAppOntology.ts convex/ai/tools/builderToolActions.ts src/app/api/oauth/vercel/webhook/route.ts src/components/builder/publish-dropdown.tsx` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Architecture audit + prototype/app + policy contract | `docs/*`; policy config scaffolds | No runtime edits before `CMS-003` is `DONE` |
| `B` | Structured content model + edit compiler | reference app + shared compiler code/tests | Start after lane `A` `P0` rows are `DONE` |
| `C` | PR + preview orchestration | `convex/integrations/*`; builder publish surfaces | Start after lane `B` `P0` rows are `DONE` |
| `D` | Approval matrix + webhook truth sync + rollback | `src/app/api/oauth/vercel/webhook/route.ts`; Convex request state/actions | Start after lane `C` `P0` rows are `DONE` |
| `E` | Scale + reliability | queue locks, retries, observability, conflict handling | Start after lane `D` `P0` rows are `DONE` |
| `F` | World-class quality + governance | visual/content intelligence, policy packs, finops | Start after lane `E` `P0` rows are `DONE` |

---

## Dependency-based status flow

1. Start with lane `A` to lock contracts and policy boundaries.
2. Lane `B` starts after `CMS-002`, `CMS-003`, and `CMS-020` are `DONE`.
3. Lane `C` starts after `CMS-004` and `CMS-005` are `DONE`.
4. Lane `D` starts after lane `C` `P0` row `CMS-007` is `DONE`.
5. Lane `E` starts after lane `D` `P0` rows are `DONE`.
6. Lane `F` starts after lane `E` `P0` rows are `DONE`.
7. `CMS-019` is final closeout and must include `V-DOCS`.

---

## Post-CMS-002 reality alignment (2026-03-01)

1. Lifecycle contract now exists in Convex (`cms_request` object + transitions + audit), but runtime entrypoints still need full orchestration wiring.
2. Terminal transitions (`merged`, `rolled_back`) are now role-gated via `publish_pages` and merged is approval-aware when `approvalState.required=true` (CMS-020).
3. Idempotency currently relies on org-wide request scans and needs an indexed strategy for scale.
4. Public/internal lifecycle write paths are now consolidated through shared helpers (`convex/cmsAgentRequestLifecycle.ts`) (CMS-020).
5. Current tests validate helper contracts but need mutation-level enforcement coverage.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `CMS-001` | `A` | 1 | `P0` | `DONE` | - | Audit existing Builder/GitHub/Vercel publish stack and document reusable primitives + hard blockers for full CMS-agent lifecycle (`prototype -> app -> connection -> edits -> deploy`) | `convex/integrations/v0.ts`; `convex/integrations/github.ts`; `convex/integrations/vercel.ts`; `convex/builderAppOntology.ts`; `convex/ai/tools/builderToolActions.ts`; `src/components/builder/publish-dropdown.tsx`; `src/app/api/oauth/vercel/webhook/route.ts`; `apps/one-of-one-landing/app/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/GAP_ANALYSIS.md` | `V-DOCS` | Done 2026-03-01: published full code-grounded gap analysis in `GAP_ANALYSIS.md` with stage-by-stage findings and closure priorities; one-of-one retained as reference app, not product scope limit. |
| `CMS-002` | `A` | 1 | `P0` | `DONE` | `CMS-001` | Define app-agnostic CMS intent schema + request lifecycle model + idempotency keys for edit jobs and prototype/app lineage | `convex/publishingOntology.ts`; `convex/builderAppOntology.ts`; `convex/api/v1/publishingInternal.ts`; new `convex/cmsAgent*` modules | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-03-01: Added shared CMS request validators/contracts (`convex/cmsAgentRequestContracts.ts`), authenticated + internal lifecycle handlers (create idempotent request, guarded transitions, linkage attachment, get/list), and objectActions audit events for create/transition/linkage. Includes lineage fields (`sourceBuilderAppId`, `targetAppPath`, `targetRepo`, `targetBranch`) and linkage placeholders (PR + preview/prod deployment metadata). |
| `CMS-003` | `A` | 1 | `P0` | `DONE` | `CMS-001` | Add fail-closed policy contracts for allowed file paths, operation classes, and verify profiles per app | new `config/cms-agent/apps.<site-app>.policy.json`; policy loader/validator modules | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-03-01: Added shared global guardrails policy (`config/cms-agent/global.guardrails.policy.json`) + per-app allowlist policy (`config/cms-agent/apps.one-of-one-landing.policy.json`) with deny-by-default semantics, plus typed parser/validator/decision modules (`src/lib/cms-agent/policyContracts.ts`, `src/lib/cms-agent/policyLoader.ts`) and unit coverage for allow, missing policy fail-closed, and out-of-policy file rejection. |
| `CMS-020` | `A` | 1 | `P0` | `DONE` | `CMS-003` | Harden CMS request lifecycle authority and remove duplication: explicit approval-state contract, role-gated terminal transitions, and shared lifecycle write helper used by public/internal handlers | `convex/cmsAgentRequestContracts.ts`; `convex/cmsAgentRequestLifecycle.ts`; `convex/publishingOntology.ts`; `convex/api/v1/publishingInternal.ts`; `tests/unit/api/cmsAgentRequestContracts.test.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-03-02: Added explicit `approvalState` contract fields + approval status validators, centralized create/transition/linkage/approval writes + auditing in `cmsAgentRequestLifecycle.ts`, enforced `publish_pages` for terminal transitions in public/internal handlers, and added approval-state update mutations (`updateCmsRequestApprovalState*`) with audit events. |
| `CMS-021` | `A` | 1 | `P1` | `DONE` | `CMS-020` | Add scalable idempotency lookup and mutation-level lifecycle test coverage (permission denial, invalid transition, idempotent replay invariants) | `convex/cmsAgentRequestLifecycle.ts`; `convex/schemas/ontologySchemas.ts`; `tests/unit/api/cmsAgentRequestLifecycle.test.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-03-02: Replaced org-scan lookup with indexed idempotency marker strategy (`cms_request_idempotency` via `by_org_type_name`), added lifecycle mutation tests for replay/invalid-transition/terminal-permission-and-approval enforcement, and resolved unrelated typecheck blocker by running Convex codegen so table/index typing is in sync. |
| `CMS-004` | `B` | 2 | `P0` | `DONE` | `CMS-002`, `CMS-003`, `CMS-020` | Refactor reference app copy/i18n payloads from inline code into structured content files with parity tests (blueprint for future apps) | `apps/one-of-one-landing/app/page.tsx`; `apps/one-of-one-landing/app/layout.tsx`; `apps/one-of-one-landing/content/landing.en.json`; `apps/one-of-one-landing/content/landing.de.json`; `apps/one-of-one-landing/content/landing-content.ts`; `tests/unit/apps/one-of-one-landing-content-parity.test.ts` | `V-REFERENCE-APP-TYPE`; `V-REFERENCE-APP-BUILD`; `V-UNIT` | Done 2026-03-02: Moved inline EN/DE landing copy into structured JSON content files with typed content loader, wired page to content module, and added parity/non-empty unit coverage. Added layout font-variable fallbacks so reference-app build is stable in restricted/offline environments. |
| `CMS-005` | `B` | 2 | `P0` | `DONE` | `CMS-004` | Build deterministic content edit compiler (intent -> JSON patch -> repo changes) with policy enforcement | `src/lib/cms-agent/contentEditContracts.ts`; `src/lib/cms-agent/contentEditCompiler.ts`; `tests/unit/api/cmsAgentContentEditCompiler.test.ts` | `V-TYPE`; `V-UNIT`; `V-CMS-LINT` | Done 2026-03-02: Added app-agnostic typed intent/edit-selector contracts and deterministic compiler with canonical intent normalization, stable target resolution (`json_pointer` + `content_key` selectors), stable operation/file ordering, and canonical JSON repo outputs. Compiler enforces fail-closed policy before patch generation (`missing_app_policy`, out-of-policy files/ops) and throws explicit errors for ambiguous selectors and invalid targets. Added unit coverage for deterministic patch output, policy rejection, ambiguous selector rejection, and missing app policy fail-closed behavior. |
| `CMS-006` | `B` | 2 | `P1` | `DONE` | `CMS-005` | Add structured preview diff generator for request review (copy diff + risk summary) | `src/lib/cms-agent/contentDiffManifest.ts`; `src/lib/cms-agent/repoContentAdapter.ts`; `convex/cmsAgentRequestContracts.ts`; `convex/cmsAgentRequestLifecycle.ts`; `convex/publishingOntology.ts`; `convex/api/v1/publishingInternal.ts`; `tests/unit/api/cmsAgentContentDiffManifest.test.ts`; `tests/unit/api/cmsAgentRepoContentAdapter.test.ts`; `tests/unit/api/cmsAgentRequestLifecycle.test.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-03-02: Added deterministic UX diff/change-manifest contract (`cms_content_change_manifest.v1`) that separates semantic value changes from canonical-key ordering noise, added repo snapshot/content loader adapter + compile-from-repo orchestration helper, and added public/internal lifecycle mutations to persist compiler change manifests on `cms_request` records with audit trail. |
| `CMS-007` | `C` | 3 | `P0` | `DONE` | `CMS-004`, `CMS-005`, `CMS-020` | Implement PR-first GitHub update flow for CMS requests (branch, commit, PR open, idempotent retries) | `convex/integrations/github.ts`; new cms integration actions; request status mutations | `V-TYPE`; `V-UNIT`; `V-CMS-LINT` | Done 2026-03-02: Added CMS-specific GitHub PR action (`createCmsRequestPullRequest`) that requires persisted `changeManifest` + `lineage.targetRepo`, derives deterministic branch names from request IDs (`l4yercak3/cms/<request-id>`), applies manifest patches to branch content (no default-branch mutation), reuses existing branch/PR on retries, and persists `prNumber`/`prUrl` via `attachCmsRequestLinkageInternal`. Added unit tests for branch-name determinism and idempotent replay behavior in `tests/unit/api/cmsGithubPrOrchestration.test.ts` plus linkage merge persistence coverage in `tests/unit/api/cmsAgentRequestLifecycle.test.ts`. |
| `CMS-008` | `C` | 3 | `P0` | `DONE` | `CMS-007` | Attach Vercel preview deployment + status tracking to CMS request lifecycle | `convex/integrations/vercel.ts`; request orchestration modules; status queries | `V-TYPE`; `V-UNIT`; `V-CMS-LINT` | Done 2026-03-02: Added CMS preview orchestration actions in `convex/integrations/vercel.ts` (`deployCmsRequestPreview`, `checkCmsRequestPreviewDeploymentStatus`) that derive deterministic request branch refs from `requestId`, resolve linked Vercel project by repo, trigger preview deployments from the CMS branch, persist `previewDeploymentId`/`previewUrl` via `attachCmsRequestLinkageInternal`, and map Vercel terminal states to lifecycle transitions (`READY -> preview_ready`, `ERROR/CANCELED -> failed`) via `transitionCmsRequestStatusInternal`. Added unit coverage for deterministic preview deployment spec and ready-state lifecycle mapping in `tests/unit/api/cmsVercelPreviewOrchestration.test.ts`. |
| `CMS-009` | `C` | 3 | `P1` | `PENDING` | `CMS-008` | Build operator-facing review UI for request timeline (intent, diff, PR, preview, verify) | `src/components/window-content/web-publishing-window/*`; builder/publishing surfaces | `V-TYPE`; `V-UNIT` | UI must display immutable linkage between request ID and Git/Vercel artifacts. |
| `CMS-010` | `C` | 3 | `P1` | `PENDING` | `CMS-008` | Add customer notification hooks for preview-ready/approval-needed/deploy-failed states | Convex notifications/email hooks; request event emitters | `V-TYPE`; `V-UNIT` | Notification payloads should include request ID + action URL. |
| `CMS-011` | `D` | 4 | `P0` | `PENDING` | `CMS-008` | Implement signed Vercel webhook verification + authoritative state updates for CMS requests | `src/app/api/oauth/vercel/webhook/route.ts`; Convex webhook handlers | `V-TYPE`; `V-UNIT`; `V-CMS-LINT` | Replace TODO handlers with verified event processing and replay-safe idempotency. |
| `CMS-012` | `D` | 4 | `P0` | `PENDING` | `CMS-009`, `CMS-020` | Enforce risk-tier approval matrix before merge-to-production actions | approval policy modules; request merge actions; UI approval controls | `V-TYPE`; `V-UNIT` | Require fail-closed behavior when approver identity/scope is missing and enforce stricter authority for terminal lifecycle transitions. |
| `CMS-013` | `D` | 4 | `P1` | `PENDING` | `CMS-011`, `CMS-012` | Add one-click rollback workflow (revert PR + redeploy + request state linking) | GitHub integration actions; request timeline; rollback UI | `V-TYPE`; `V-UNIT` | Rollback artifact must reference original request and deployment IDs. |
| `CMS-014` | `E` | 5 | `P0` | `PENDING` | `CMS-011`, `CMS-012` | Add per-site queue locking, conflict detection, and deterministic retry policies | request scheduler modules; lock tables; orchestrator actions | `V-TYPE`; `V-UNIT` | Prevent concurrent edits on same site from racing or interleaving writes. |
| `CMS-015` | `E` | 5 | `P0` | `PENDING` | `CMS-014` | Add SLO instrumentation and operational dashboards (request latency, failure modes, rollback rates) | telemetry pipelines; dashboard docs; alerting config | `V-TYPE`; `V-UNIT`; `V-DOCS` | Include P50/P95 request-to-preview and request-to-prod metrics. |
| `CMS-016` | `E` | 5 | `P1` | `PENDING` | `CMS-015` | Add chaos/failure drills for provider outages (GitHub/Vercel API degradation) | resilience tests; runbooks; fallback actions | `V-UNIT`; `V-DOCS` | Must document failover behavior and customer-facing status semantics. |
| `CMS-017` | `F` | 6 | `P0` | `PENDING` | `CMS-015` | Add visual regression gating and brand-voice quality scoring to approval process | visual test harness; content quality evaluators; policy thresholds | `V-TYPE`; `V-UNIT`; `V-REFERENCE-APP-BUILD` | Enforce lane-specific thresholds by risk tier before auto-merge eligibility. |
| `CMS-018` | `F` | 6 | `P1` | `PENDING` | `CMS-017` | Add tenant governance packs (strict-regulated mode, sandbox mode, fast-copy mode) | policy pack configs; tenant feature flags; docs | `V-TYPE`; `V-UNIT`; `V-DOCS` | Governance packs must be explicit and auditable per organization. |
| `CMS-019` | `F` | 6 | `P1` | `PENDING` | `CMS-018`, `CMS-013@DONE_GATE` | Final world-class closeout: finops controls, red-team tests, and cross-doc synchronization | workstream docs; security/ops test suites; rollout runbook | `V-TYPE`; `V-UNIT`; `V-DOCS` | Closeout requires docs sync and explicit go/no-go criteria for broad tenant rollout. |

---

## Current kickoff

- Active task: none.
- Next task to execute: `CMS-009`.
- Immediate objective: build operator-facing CMS request timeline UI with immutable request/PR/preview linkage visibility.
