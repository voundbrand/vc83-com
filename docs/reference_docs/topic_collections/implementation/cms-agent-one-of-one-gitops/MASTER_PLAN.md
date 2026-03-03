# CMS Agent Prototype-to-App GitOps Master Plan

**Date:** 2026-03-01  
**Scope:** Build a customer-facing CMS agent lifecycle that promotes v0 prototypes into dedicated `apps/*` projects, connects them to mother-repo APIs/agent runtime, and manages safe CMS updates through GitHub + Vercel with approvals and rollback.

---

## Mission

Ship a `GitOps CMS Agent` that handles the full lifecycle with strict policy controls:

1. v0 prototype generation,
2. promotion into dedicated `apps/<site-app>` boundary,
3. mother-repo/API + agent-runtime connection,
4. continuous CMS edits via PR/preview/approval,
5. controlled production deploy/redeploy and rollback.

Target flow:

1. Operator runs v0 flow and promotes prototype to `apps/<site-app>`.
2. System applies scaffold + contract wiring (API base URL, org/agent IDs, integration defaults).
3. Site deploys to Vercel via existing publish pipeline.
4. Customer/operator submits structured CMS edit intents.
5. Agent compiles intent to scoped patch set under app policy.
6. System opens branch/PR, runs checks, and posts preview URL.
7. Human/policy approval gates production merge.
8. Merge deploys production with reversible audit trail.

---

## Existing assets in this codebase

1. **Builder deploy pipeline already exists**
   - GitHub commit path: `convex/integrations/github.ts#createRepoFromBuilderApp`
   - Vercel deploy/polling: `convex/integrations/vercel.ts#deployToVercel`, `#checkVercelDeploymentStatus`, `#getVercelBuildLogs`
   - UI deploy controls: `src/components/builder/publish-dropdown.tsx`

2. **Deployment state persistence exists**
   - Builder deployment record mutation: `convex/builderAppOntology.ts#updateBuilderAppDeployment`
   - Publish config persistence: `convex/builderAppOntology.ts#getPublishConfig`

3. **OAuth wiring exists for Vercel**
   - Callback route implemented: `src/app/api/oauth/vercel/callback/route.ts`
   - Webhook route scaffolding exists but does not yet mutate authoritative deployment records: `src/app/api/oauth/vercel/webhook/route.ts`

4. **Reference app boundary exists**
   - Dedicated app: `apps/one-of-one-landing/*`
   - Current content is mostly inline in `apps/one-of-one-landing/app/page.tsx` (large translation object + section copy in code)

5. **CMS request lifecycle foundation now exists (CMS-002)**
   - Shared request contract + state machine: `convex/cmsAgentRequestContracts.ts`
   - Authenticated handlers: `convex/publishingOntology.ts#createCmsRequest`, `#transitionCmsRequestStatus`, `#attachCmsRequestLinkage`
   - Internal handlers: `convex/api/v1/publishingInternal.ts#createCmsRequestInternal`, `#transitionCmsRequestStatusInternal`, `#attachCmsRequestLinkageInternal`
   - Audit trail wired through `objectActions` for create/transition/linkage

---

## Gaps blocking full lifecycle readiness

1. No generalized `prototype -> apps/<site-app>` promotion contract across Builder surfaces.
2. No standardized mother-repo/API connection contract at app-promotion time (org routing, auth posture, agent bindings, webhook config).
3. No structured content boundary for agent-safe edits in generated app surfaces (reference: `apps/one-of-one-landing`).
4. No explicit policy allowlist describing which files/operations agent may mutate per app.
5. Base queue/object model exists, but it is not yet fully integrated into runtime orchestration and still needs approval-state + authority hardening.
6. Current GitHub action writes directly to main branch refs for builder repos; PR-first workflow is not standardized for customer content updates.
7. Vercel webhook processing lacks signed verification + deterministic DB status updates.
8. No explicit diff risk scoring (copy-only vs style-token vs component-code) to drive approval strictness.
9. No first-class rollback primitive tied to edit request IDs.

---

## Reality-check deltas after CMS-002

1. Request lifecycle contract is implemented but not yet fully consumed by PR/preview orchestrators.
2. Terminal status transitions now enforce stricter authority boundaries (`publish_pages`) and merged transition checks approval requirements when `approvalState.required=true` (CMS-020).
3. Idempotency lookup path is currently org-scan based and needs indexed strategy for scale.
4. Public/internal request lifecycle writes are consolidated in shared helpers (`convex/cmsAgentRequestLifecycle.ts`) to avoid drift (CMS-020).
5. Mutation-level tests are still needed for permission denials and fail-closed transition enforcement.

Remaining deltas are now primarily captured in queue task `CMS-021` (idempotency indexing + mutation-level enforcement tests) before lane `B`.

Policy contract status update (2026-03-01):
- `CMS-003` completed with deny-by-default policy artifacts (`config/cms-agent/*`) and typed policy loader/validator modules (`src/lib/cms-agent/policyContracts.ts`, `src/lib/cms-agent/policyLoader.ts`).
- Remaining lane `A` hardening focus is now `CMS-021`.

---

## Target architecture

### Slice 1: Intent and policy contract

- Add `cmsEditRequests` object model in Convex (or typed object subtype) with:
  - requester,
  - org,
  - target app/site,
  - structured edits,
  - risk classification,
  - lifecycle state (`queued`, `planning`, `awaiting_approval`, `applying`, `preview_ready`, `merged`, `failed`, `rolled_back`).
- Add policy contract file(s) under repo, e.g. `config/cms-agent/apps.<site-app>.policy.json`:
  - allowed file globs,
  - allowed operations,
  - prohibited imports/commands,
  - max diff size,
  - required verify profiles by risk level.

### Slice 2: Prototype-to-app promotion and connection contract

- Define deterministic promotion action:
  - source: builder app artifacts (`builderFiles` + publish config),
  - destination: `apps/<site-app>` folder + metadata record,
  - naming/versioning conventions and ownership.
- Define connection bundle contract injected at promotion time:
  - runtime API endpoint mapping,
  - org/site/app identifiers,
  - selected agent/channel bindings,
  - deployment mode defaults and environment variable requirements.
- Persist contract checksum in app metadata for drift detection.

### Slice 3: Deterministic edit compiler

- Convert `apps/one-of-one-landing/app/page.tsx` inline content to structured content modules (e.g. `content/landing.en.json`, `content/landing.de.json`).
- Build mutation compiler that maps edit intents -> JSON patch operations first.
- Escalate to code edits only for approved operation classes.

### Slice 4: Git PR orchestration

- Add new integration action for PR-based updates (branch create, commit, PR open) rather than direct branch update.
- Attach machine-readable change manifest per request:
  - modified files,
  - operation class,
  - verification matrix,
  - preview URL.

### Slice 5: Preview/deploy orchestration

- Use Vercel preview deployment per PR and persist to request record.
- Upgrade webhook route to verify signatures and update request + deployment states.
- Keep production merge path gated by explicit approval policy.

### Slice 6: Trust and operations

- Approval matrix by risk:
  - copy/content-only: optional single approver,
  - style-token: required approver,
  - layout/component: two-step approver.
- Audit event stream linked to request + PR + deployment IDs.
- One-click rollback that opens revert PR and re-deploys.

---

## Phase plan

| Phase | Outcome | Queue lanes |
|---|---|---|
| Phase 1 (MVP Foundations) | Prototype-to-app promotion + intent/policy + deterministic content edit compiler | `A`, `B` |
| Phase 2 (MVP Shipping) | PR + preview orchestration with basic approval gate | `C` |
| Phase 3 (Production Hardening) | Webhook truth sync, rollback, full auditability | `D` |
| Phase 4 (Scale) | Multi-tenant queueing, conflict handling, SLOs | `E` |
| Phase 5 (World-class) | Quality intelligence, experiment rails, governance/finops | `F` |

---

## Acceptance criteria

1. Prototype can be promoted to dedicated `apps/<site-app>` with deterministic conventions and metadata.
2. Promoted app can be connected to mother-repo/API and agent runtime through a typed contract.
3. Customer edit request can be expressed without free-form code prompt dependence.
4. CMS agent cannot modify files outside allowlisted policy boundaries.
5. Every change is represented as branch + PR + preview URL before production merge.
6. Approval gate enforces risk-based policy deterministically.
7. Deploy status is webhook-driven and reflected in Convex records.
8. Rollback can be executed from request history with a deterministic revert path.
9. Reference app (`apps/one-of-one-landing`) passes build/typecheck/lint gates during workflow.

---

## World-class extension targets

1. Automated visual regression scoring on critical breakpoints with policy thresholds.
2. Content quality scoring (readability, brand voice conformance, legal phrase checks).
3. Multi-region publish windows and scheduled launch orchestration.
4. Drift detection between repo state, deployed state, and CMS request ledger.
5. Per-tenant governance packs (regulated mode, strict approval mode, sandbox-only mode).
6. Cost/performance observability for model/tool usage per edit lifecycle.

---

## Risks and mitigations

1. **Risk:** Agent makes unsafe code mutations.
   - Mitigation: file/operation allowlist + diff-size caps + PR-only mode.
2. **Risk:** Parallel edits conflict and cause deployment churn.
   - Mitigation: per-site queue lock, optimistic concurrency checks, auto-rebase/retry policy.
3. **Risk:** Preview/prod state divergence.
   - Mitigation: signed webhook source-of-truth and immutable deployment linkage.
4. **Risk:** Customer wants WYSIWYG-like speed.
   - Mitigation: fast content-only lane for low-risk edits, staged advanced edits.

---

## Full gap analysis

See `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/GAP_ANALYSIS.md` for the code-grounded, stage-by-stage readiness audit and closure priorities.

---

## Current recommendation

Start with a reference implementation on `apps/one-of-one-landing`, but keep contracts app-agnostic from day one so the same flow can onboard any new `apps/<site-app>` created from v0. Then expand from content edits to style-token edits, then guarded component edits.
