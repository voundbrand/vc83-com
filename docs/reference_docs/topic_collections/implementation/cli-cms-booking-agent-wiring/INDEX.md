# CLI + CMS/Booking/Agent Wiring Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring`  
**Source request date:** 2026-03-24  
**Scope:** Production-ready CLI ownership in this repo and end-to-end command support for app registration/linking, CMS binding, booking setup, and agent bootstrap.

---

## Purpose

This workstream replaces the docs-only CLI snapshot with a repo-owned, publishable CLI package and introduces fail-closed environment/org/app targeting for all operational commands.

Primary outcomes:

- `packages/cli` as source of truth for production CLI,
- safe environment targeting (`local`/`staging`/`prod`) with explicit guardrails,
- command support for CMS registry/binding/migration/seed,
- command support for booking setup/check/smoke,
- command support for agent bootstrap/templates/permissions,
- release automation with provenance and rollback playbooks.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/MASTER_PLAN.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/INDEX.md`

---

## Current-state snapshot (discovery-backed)

1. CLI snapshot exists only under local-only docs reference path: `docs/reference_projects/l4yercak3-cli`.
2. `packages/` currently contains `sdk` and `cms`; no production CLI package exists.
3. Snapshot CLI uses hardcoded production URLs (`agreeable-lion-828.convex.site`, `app.l4yercak3.com`) and lacks explicit env profile targeting.
4. Snapshot includes useful foundations for app registration, manifest sync, and page detection (`connect`, `sync`, `pages`).
5. CMS app-scoped registry support exists in backend/UI (`convex/publishingOntology.ts`, `src/lib/web-publishing/cms-copy-field-registry.ts`, web publishing CMS tab).
6. Booking runtime is present in app + Convex (`apps/segelschule-altwarp/app/api/booking/route.ts`, `convex/bookingOntology.ts`) but lacks CLI bootstrap/check tooling.
7. Agent bootstrap logic exists (`scripts/agent-cli.ts`, `convex/ai/soulGenerator.ts`) but is not productized as stable CLI commands.
8. Release automation for npm packages is missing (no `.changeset`, no npm publish workflow with provenance).

---

## Status

- Workstream initialized.
- Queue-first artifacts created.
- No implementation rows executed yet.
- First promotable row: `CLI-001`.

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md`
- Baseline validation: `npm run typecheck && npm run test:unit`
