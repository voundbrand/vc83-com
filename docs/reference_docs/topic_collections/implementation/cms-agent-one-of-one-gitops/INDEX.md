# CMS Agent Prototype-to-App GitOps Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops`  
**Source request:** Design a repo-grounded implementation blueprint for a customer-facing CMS agent lifecycle: `v0 prototype -> dedicated apps/* app -> deploy/redeploy -> mother-repo/API connection -> agentic CMS updates`, scaling from MVP to world-class.

---

## Purpose

Queue-first execution layer for shipping a guarded CMS agent system on top of the existing Builder + Convex + GitHub + Vercel stack across multiple generated apps.

Core outcomes:

- deterministic edit intents,
- deterministic prototype-to-app promotion,
- policy-bounded file mutations,
- PR + preview + approval publish flow,
- mother-repo/API connection contracts,
- auditability and rollback,
- multi-tenant hardening for customer operations.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/MASTER_PLAN.md`
- Full gap analysis: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/GAP_ANALYSIS.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/INDEX.md`

---

## Current state snapshot

- Existing external deploy pipeline exists (`convex/integrations/github.ts`, `convex/integrations/vercel.ts`, `src/components/builder/publish-dropdown.tsx`).
- OAuth callbacks are implemented for Vercel (`src/app/api/oauth/vercel/callback/route.ts`).
- Vercel webhook handler exists but is still TODO-heavy for state mutation (`src/app/api/oauth/vercel/webhook/route.ts`).
- One-of-one landing content is largely inline in `apps/one-of-one-landing/app/page.tsx` (first reference app for structured-content migration).
- Builder already creates deployable app files and can persist publish/deployment metadata, which can be extended to a reusable `prototype -> app` promotion contract.

---

## Status

- Workstream initialized.
- Full lifecycle gap analysis completed (`GAP_ANALYSIS.md`).
- CMS-002 completed: app-agnostic CMS request lifecycle schema/actions implemented with idempotency, lineage, linkage placeholders, and guarded status transitions.
- CMS-003 completed: fail-closed CMS mutation policy contracts added with deny-by-default global guardrails, per-app allowlists, and typed loader/validator modules.
- Reality checkpoint applied: identified hardening gaps (runtime wiring, terminal transition authority, idempotency indexing, duplicated lifecycle writes, mutation-level test coverage).
- CMS-020 completed: explicit approval-state contract fields, terminal transition authority hardening, and shared lifecycle write helpers now back both public/internal handlers with audit parity.
- CMS-021 completed: indexed idempotency strategy + lifecycle mutation-level enforcement tests are in place.
- CMS-004 completed: one-of-one reference app now reads EN/DE copy from structured content JSON files with parity tests and typed loader wiring.
- CMS-005 completed: app-agnostic deterministic content edit compiler now transforms typed edit intents into stable JSON patches + canonical repo file updates with fail-closed policy enforcement and explicit selector-target errors.
- CMS-006 completed: structured diff/change-manifest contract now captures semantic value changes separately from canonical key-ordering effects, with repo-snapshot loading and persisted manifest attachment on CMS requests.
- CMS-007 completed: CMS-specific PR-first GitHub orchestration now consumes persisted request change manifests, derives deterministic request-ID branches, opens/reuses PRs with idempotent retry semantics, and persists PR linkage on request records.
- CMS-008 completed: Vercel preview deployment + status tracking is now wired to CMS request lifecycle with linkage persistence and terminal status propagation.
- Current promotable task: `CMS-009`.
- Lane `C` remains active with operator timeline/review UX work (`CMS-009`, `CMS-010`) after preview orchestration completion.
- MVP target: complete lanes `A` and `B` (including promotion + connection contracts).
- World-class target: complete through lane `F`.

---

## Lane progress board

- [ ] Lane A (`CMS-001`..`CMS-003`) - prototype/app contract + policy foundations
- [ ] Lane B (`CMS-004`..`CMS-006`) - structured content model + deterministic edit engine
- [ ] Lane C (`CMS-007`..`CMS-010`) - Git PR + Vercel preview orchestration
- [ ] Lane D (`CMS-011`..`CMS-013`) - approvals, audit, rollback
- [ ] Lane E (`CMS-014`..`CMS-016`) - multi-tenant scale + reliability
- [ ] Lane F (`CMS-017`..`CMS-019`) - world-class optimization and governance

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cms-agent-one-of-one-gitops/TASK_QUEUE.md`
- Core checks: `npm run typecheck && npm run lint && npm run test:unit`
- Reference-app checks: `npm --prefix apps/one-of-one-landing run typecheck && npm --prefix apps/one-of-one-landing run build`
