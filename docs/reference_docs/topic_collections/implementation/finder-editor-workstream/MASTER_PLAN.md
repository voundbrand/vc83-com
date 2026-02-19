# Finder + Text Editor Master Plan

**Date:** 2026-02-17  
**Scope:** Deliver VSCode-like file creation in Finder and a first-class desktop Text Editor app, with safe backend normalization and test coverage.

---

## Mission

Ship a cohesive authoring workflow where users can:

1. create common file types directly from Finder (like VSCode `New File`),
2. edit those files in a robust tabbed editor surface,
3. launch editing from both Finder and desktop navigation surfaces.

---

## Scope decision: broad support now, controlled rollout

Recommendation for phase 1:

1. Support a broad set of common text-centric files immediately:
- `md`, `txt`, `html`, `css`, `js`, `jsx`, `ts`, `tsx`, `json`, `yaml`, `yml`, `xml`, `sql`, `sh`, `py`, `csv`, `toml`, `env`.
2. Keep binary and media behavior constrained to existing flows (upload + dedicated viewers).
3. Use a centralized file-type registry with deterministic fallback so unsupported text-like extensions still open safely.

Why this balance:

- It gives users near-VSCode flexibility right away for practical formats.
- It avoids overcommitting to risky binary/editing edge cases in the first release.
- It keeps expansion cheap by extending registry entries instead of rewriting UI logic.

---

## Decision log

1. **2026-02-17: Phase-1 type support locked for launch**
- Ship with registry-backed support for:
  `md`, `mdx`, `txt`, `html`, `css`, `js`, `jsx`, `ts`, `tsx`, `json`, `yaml`, `yml`, `xml`, `sql`, `sh`, `py`, `csv`, `toml`, `env`.
- Unknown extensions remain text-safe via fallback (`text/plain` + code editor) to avoid open failures.

2. **2026-02-17: Phase-2 expansion policy**
- Add new text-like mappings only through the shared registry + backend helper mapping.
- Expansion candidates are prioritized by observed creation/open frequency and error telemetry, then shipped with targeted registry tests and migration-safe metadata checks.
- Binary/complex formats remain out of scope unless a dedicated editor/viewer path exists.

---

## Non-goals (phase 1)

1. No attempt to replicate full VSCode extension ecosystem.
2. No rich binary editing for PDFs/images/media (existing viewers stay in place).
3. No broad Finder IA redesign beyond New File/editor integration.
4. No broad permission model rewrite beyond required backend guards.

---

## Workstream architecture

- Queue control: `TASK_QUEUE.md`
- Lane prompts: `SESSION_PROMPTS.md`
- Status snapshot + navigation: `INDEX.md`
- Program-level strategy + decisions: this file

---

## Phase-to-lane mapping

| Phase | Objective | Queue lanes | Queue tasks |
|---|---|---|---|
| Phase 1 | File-type contract foundation | `A` | `FTE-001`..`FTE-002` |
| Phase 2 | Finder VSCode-like `New File` workflow | `B` | `FTE-003`..`FTE-004` |
| Phase 3 | Standalone Text Editor app + launch points | `C` | `FTE-005`..`FTE-007` |
| Phase 4 | Backend normalization + metadata consistency | `D` | `FTE-008`..`FTE-009` |
| Phase 5 | Tests, hardening, and docs closeout | `E` | `FTE-010`..`FTE-012` |

---

## Delivery waves

1. **Wave 0:** finalize file-type registry contract (lane `A`).
2. **Wave 1:** implement Finder New File UX and standalone Text Editor in parallel (`B` + `C` after dependencies).
3. **Wave 2:** harden backend file creation metadata/guards (`D`).
4. **Wave 3:** complete tests, unsaved-change safety, and docs closeout (`E`).

---

## Acceptance criteria

1. Finder `New` flow supports creation of common text file types from one primary UX.
2. Users can create/open/edit from both Finder and Text Editor app entry points.
3. Text Editor is available from desktop navigation and All Apps.
4. File-type routing is registry-driven and not scattered hardcoded checks.
5. Backend rejects unsafe virtual-file payload patterns and normalizes metadata.
6. Finder/editor tests pass for creation, routing, and launch flows.
7. `npm run docs:guard` passes at workstream updates and closeout.

---

## Program risks

1. **Routing regressions:** existing file open behavior could change unexpectedly.
Mitigation: central registry with explicit fallback + targeted routing tests.

2. **Data-loss risk:** unsaved editor content across tab/window close.
Mitigation: dirty-state prompts, explicit save/close tests, and focus-flow hardening.

3. **Scope creep:** trying to support every file ecosystem nuance in phase 1.
Mitigation: bounded common-type set now, registry extensions in subsequent phases.

---

## Current status snapshot

- Queue initialized and ready for execution.
- Lane `A` complete: `FTE-001` and `FTE-002` are `DONE` (registry contract + editor routing integration).
- Lane `B` complete: `FTE-003` and `FTE-004` are `DONE` (VSCode-like New File flow + keyboard/context parity + immediate-open behavior).
- Lane `C` complete: `FTE-005` through `FTE-007` are `DONE` (standalone Text Editor app, desktop/all-app registration, Finder open/new-file bridge).
- Lane `D` complete: `FTE-008` and `FTE-009` are `DONE` (backend virtual-file metadata normalization + idempotent metadata backfill migration).
- Lane `E` complete: `FTE-010` through `FTE-012` are `DONE` (tests, hardening, and docs closeout complete).
