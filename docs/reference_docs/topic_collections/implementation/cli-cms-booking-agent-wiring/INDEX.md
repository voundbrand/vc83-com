# SevenLayers CLI Rebuild Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring`  
**Source request date:** 2026-03-24  
**Scope:** Rebuild CLI from scratch with safer defaults, `sevenlayers` brand surface, and production-ready workflows for app wiring, CMS, booking, and agents.

---

## Purpose

This workstream replaces the current static/reference CLI approach with a repo-owned production CLI designed around fail-closed operations, especially `.env*` safety and environment targeting.

Primary outcomes:

- Fresh CLI foundation in `packages/cli`.
- Primary command name `sevenlayers` with compatibility aliases retained.
- Non-destructive env handling by default.
- Strong target guardrails (`env`, `org`, `app`) for all mutation commands.
- First-class command suites for CMS binding, booking setup, and agent bootstrap.
- Release/publish automation with provenance and rollback instructions.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/MASTER_PLAN.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/INDEX.md`

---

## Reality-backed baseline

1. Existing CLI implementation is currently a snapshot in local-only reference docs (`docs/reference_projects/l4yercak3-cli`).
2. Snapshot contains useful app wiring commands but also hardcoded production endpoints.
3. Fresh production CLI package foundation now exists in `packages/cli` with primary `sevenlayers` bin and compatibility aliases.
4. The platform already has working CMS scoped-key logic, booking flows, and agent bootstrap actions.
5. Web Publishing CLI setup UX now reflects the guarded operational flow, including cutover and rollback runbook guidance.
6. Workspace-level package publishing workflow now exists for canary + manual latest promotion.

---

## Current status

- Queue-first artifacts are synchronized to the rebuild direction.
- Completed rows: `SLCLI-001`, `SLCLI-002`, `SLCLI-003`, `SLCLI-004`, `SLCLI-005`, `SLCLI-006`, `SLCLI-007`, `SLCLI-008`, `SLCLI-009`, `SLCLI-010`, `SLCLI-011`, `SLCLI-012`, `SLCLI-013`, `SLCLI-014`, `SLCLI-015`, `SLCLI-016`.
- `packages/cli` currently ships:
  - safe env-update flows (`app init`, `app connect`) and legacy bridges (`init`, `spread`, `connect`, `sync`, `pages`),
  - app wiring API commands (`app register`, `app link`, `app sync`, `app pages sync`) with deterministic `--json` contracts,
  - CMS registry workflows (`cms registry pull/push`, `cms bind`) tied to app-scoped metadata and activity page bindings,
  - CMS content lifecycle commands (`cms migrate legacy`, `cms seed`, `cms doctor`) with locale/field parity diagnostics and dry-run summaries,
  - booking bootstrap diagnostics (`booking setup`, `booking check`) with endpoint reachability and required entity validation,
  - booking smoke command (`booking smoke`) with dry-run default and explicit production override gate,
  - agent bootstrap/template/permission commands (`agent init`, `agent template apply`, `agent permissions check`) with non-interactive Convex wrappers,
  - agent governance commands (`agent drift`, `agent catalog`) for deterministic template drift/catalog JSON outputs in CI pipelines,
  - release/publish plumbing with npm workspaces, Changesets config, and `packages-publish` workflow for canary publish + manual `latest` dist-tag promotion,
  - refreshed Web Publishing CLI guide with safe staged setup, alias compatibility messaging, and alpha/stable cutover + rollback runbook commands,
  - profile commands (`env list`, `env use`, `env set`),
  - target diagnostics (`doctor target`) and mutating target-guard enforcement.
- Next promotable row: none (phase complete).

---

## Operating commands

- Docs policy check: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/cli-cms-booking-agent-wiring/TASK_QUEUE.md`
- Baseline repo checks: `npm run typecheck && npm run test:unit`
