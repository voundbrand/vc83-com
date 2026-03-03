# Full Gap Analysis: CMS Agent Prototype-to-App Flow

**Date:** 2026-03-01  
**Workstream:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops`  
**Target lifecycle:** `v0 prototype -> dedicated apps/* app -> deploy/redeploy -> mother-repo/API + agent connection -> agentic CMS updates`

---

## Executive summary

You already have a strong **Builder -> GitHub -> Vercel** base and metadata persistence model. The missing pieces are not core deployment primitives; they are lifecycle contracts and safety rails for customer-facing CMS automation across many apps.

Top blockers:

1. No generalized `prototype -> apps/<site-app>` promotion contract (files live in `builderFiles`, but no deterministic app-folder materialization contract).
2. No explicit “mother-repo/API + agent connection bundle” contract at promotion/publish time.
3. CMS edit lane lacks request schema, policy engine, and PR-first mutation enforcement.
4. Vercel webhook route is mostly TODO and not authoritative for deployment state.
5. Content in the reference app is inline in code, which blocks safe deterministic CMS edits.

---

## Current system reality by lifecycle stage

## 1) Prototype generation (`v0`)

### What exists

- v0 chat + polling + file extraction is productionized in `convex/integrations/v0.ts` (`builderChat`, `pollForCompletion`, `storeChatReference`).
- Builder app records are persisted via `convex/builderAppOntology.ts` (`createBuilderApp`, `updateBuilderApp`).
- Generated files are stored in `builderFiles` table (`convex/schemas/builderFileSchemas.ts`) with per-file metadata.

### Gaps

- No explicit prototype maturity state for promotion readiness (for example: `prototype_ready_for_app_promotion`).
- No immutable snapshot/version pin before promotion.

### Impact

- Operator cannot reliably know which generated state is canonical for promotion.

### Priority

- `P1` (important but not the biggest blocker).

---

## 2) Promotion to dedicated `apps/*` app folder

### What exists

- GitHub publishing action (`convex/integrations/github.ts#createRepoFromBuilderApp`) can push files + scaffold to a repo.
- Builder tool action (`convex/ai/tools/builderToolActions.ts#createWebAppFromSchema`) creates files and builder app metadata.

### Gaps

- No first-class “promote to monorepo app path” action with deterministic path contract (`apps/<site-app>`).
- No app-folder naming/ownership conventions persisted on the builder object.
- Current publish flow is repo-centric; it does not treat app-folder promotion as a lifecycle checkpoint.

### Impact

- Hard to scale from one reference app to many customer app folders in a controlled way.

### Priority

- `P0`.

---

## 3) Mother-repo/API and agent runtime connection

### What exists

- Builder has connection constructs (`linkedObjects`, `connectionStatus`) in `convex/builderAppOntology.ts` and UI in `src/components/builder/connection-panel.tsx`.
- Publish config captures architecture/auth/payments/env requirements in `src/contexts/publish-context.tsx` and wizard UI.
- Reference app has guest-chat bootstrap integration contract in `apps/one-of-one-landing/lib/webchat-api-contract.ts` + route wiring.

### Gaps

- No standardized `connection bundle` contract persisted and injected for every promoted app (API base, org ID, agent/channel binding, runtime mode).
- No explicit “agentic connection template” reusable across apps (one-of-one has app-local wiring).
- No drift detection between connected-object state and deployed app runtime env.

### Impact

- Each new app risks bespoke integration logic and operational drift.

### Priority

- `P0`.

---

## 4) Deploy/redeploy orchestration

### What exists

- End-to-end deployment path is robust in `convex/integrations/vercel.ts` (project creation, env var upsert, polling, build logs).
- Deployment metadata persists on builder app via `updateBuilderAppDeployment`.
- UI supports publish/redeploy and self-heal loops (`src/components/builder/publish-dropdown.tsx`).

### Gaps

- Flow is still primarily builder-app centric, not CMS-request centric.
- No strict separation between deploys triggered by initial publish vs CMS request lifecycle.

### Impact

- Difficult to provide customer-facing “change request timeline” with deterministic lineage.

### Priority

- `P0`.

---

## 5) CMS edit request lifecycle

### What exists

- Broad object/audit infrastructure exists (`objects`, `objectActions`, `objectLinks`), and publishing APIs exist (`convex/api/v1/publishing*.ts`).

### Gaps

- No dedicated request schema for CMS edits (requester, target app path, risk tier, approvals, PR/deploy linkage).
- No idempotent request state machine for retries/replay.
- No operation taxonomy (`copy`, `token`, `layout`, `code`) tied to policies.

### Impact

- Unsafe to expose autonomous CMS behavior to customers.

### Priority

- `P0`.

---

## 6) Safe mutation policy and deterministic compiler

### What exists

- Compatibility patching exists for v0 build correctness in `convex/integrations/github.ts`.
- Reference app confirms current anti-pattern: content embedded directly in `apps/one-of-one-landing/app/page.tsx`.

### Gaps

- No per-app fail-closed policy files (allowlist glob + operation class + verify profile).
- No deterministic edit compiler from structured intent to patch set.
- No structured content boundaries in reference app yet.

### Impact

- High regression and trust risk for customer-driven edits.

### Priority

- `P0`.

---

## 7) PR-first workflow + preview lifecycle

### What exists

- GitHub integration can create repo and commit atomically.
- Vercel preview/prod artifacts are fetchable through existing integration APIs.

### Gaps

- Current GitHub flow updates branch refs directly; CMS lane needs explicit PR-first semantics.
- No request-linked change manifest tying intent -> files -> PR -> preview.

### Impact

- Weak reviewability and approval traceability for customer edits.

### Priority

- `P0`.

---

## 8) Webhook truth, approvals, rollback

### What exists

- Vercel webhook endpoint exists at `src/app/api/oauth/vercel/webhook/route.ts`.
- Deployment status/polling exists in Convex integration actions.

### Gaps

- Webhook handlers are TODO stubs (no authoritative state mutation).
- Signature verification path is not implemented for trusted event ingestion.
- No risk-tier approval matrix bound to request transitions.
- No request-native rollback action (`revert PR + redeploy + linkage`).

### Impact

- Cannot safely run approval-gated production automation at scale.

### Priority

- `P0`.

---

## 9) Multi-app/multi-tenant scale and ops

### What exists

- Multi-tenant organization primitives and OAuth connection storage exist.
- Audit/event tables already used broadly across ontology modules.

### Gaps

- No per-site lock queue for concurrent CMS edits.
- No SLO dashboards focused on request latency/failure/rollback KPIs.
- No formal chaos drills for GitHub/Vercel provider degradations.

### Impact

- Operational instability under parallel customer traffic.

### Priority

- `P1`.

---

## 10) World-class layer

### What exists

- Existing test and visual infrastructure in repo can be reused.

### Gaps

- No policy-gated visual regression thresholds per risk tier.
- No content quality/brand-voice scoring integrated into approvals.
- No tenant governance packs (strict-regulated, sandbox-only, fast-copy).
- No finops/risk budgeting for model-assisted CMS operations.

### Impact

- Difficult to differentiate from basic automation and hard to control long-term cost/risk.

### Priority

- `P2`.

---

## Priority closure map (queue-aligned)

1. `CMS-002` (`P0`): request schema + lifecycle + idempotency + lineage fields.
2. `CMS-003` (`P0`): per-app fail-closed policy contract and validator.
3. `CMS-004` (`P0`): structured content migration in reference app as template for all future apps.
4. `CMS-005` (`P0`): deterministic compiler enforcing policy.
5. `CMS-007` + `CMS-008` (`P0`): PR-first workflow + preview linkage.
6. `CMS-011` + `CMS-012` (`P0`): webhook truth + approval gates.
7. `CMS-013` (`P1`): rollback workflow.
8. `CMS-014` + `CMS-015` (`P1`): locking + SLO/ops.
9. `CMS-017`+ (`P2`): world-class quality/governance layers.

---

## Minimal architecture additions required (concrete)

1. New Convex domain module: `convex/cmsAgentOntology.ts`
   - request create/read/update transitions,
   - idempotency/replay handling,
   - request-to-PR/deployment linkage.

2. New policy layer: `config/cms-agent/apps.<site-app>.policy.json`
   - default-deny per app path,
   - operation-class + verify-profile matrix.

3. New compiler module: `src/lib/cms-agent/edit-compiler.ts` (or Convex action equivalent)
   - intent -> deterministic patch plan,
   - policy evaluation + rejection reasoning.

4. PR orchestration extension in `convex/integrations/github.ts`
   - branch + PR open path,
   - non-default-branch enforcement for CMS lane.

5. Webhook hardening in `src/app/api/oauth/vercel/webhook/route.ts`
   - signature verification,
   - event idempotency,
   - authoritative request/deployment state updates.

6. Reference-app content modularization in `apps/one-of-one-landing`
   - move inline copy/translations to structured files,
   - preserve runtime parity.

---

## Reality check

Your foundation is already advanced enough to ship this quickly once you add lifecycle contracts and trust controls. This is mainly a **productized orchestration and governance gap**, not a missing deployment-engine gap.
