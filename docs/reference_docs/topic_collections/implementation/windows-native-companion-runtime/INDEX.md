# Windows Native Companion Runtime Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime`  
**Last updated:** 2026-03-10  
**Source request:** Build a full queue-first implementation plan for a native Windows companion that extends local-system access while preserving backend trust and mutation authority.

---

## Purpose

This workstream defines a production implementation path for a native Windows desktop companion that:

1. provides a true native shell surface (tray, hotkeys, notifications, native windows),
2. exposes local capabilities (screen, camera, microphone, scoped system actions),
3. routes all mutating intents through canonical backend authority with explicit approval artifacts,
4. ships with deterministic packaging, update, and rollback contracts.

---

## Core files

1. Queue:
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime/TASK_QUEUE.md`
2. Session prompts:
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime/SESSION_PROMPTS.md`
3. Master plan:
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime/MASTER_PLAN.md`
4. Index (this file):
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime/INDEX.md`

---

## Status snapshot

1. Deterministic queue initialized with rows `WCR-001`..`WCR-026`.
2. Lane `A` kickoff row `WCR-001` is `READY`.
3. All downstream rows are `PENDING` pending dependency gates.
4. Active task count: `0` rows `IN_PROGRESS`.
5. Deterministic next row: `WCR-001`.
6. External dependency tokens referenced by this queue:
   - `AVR-010@DONE_GATE`
   - `YAI-021`

---

## Lane board

- [ ] Lane `A`: contract freeze + trust matrix (`WCR-001`, `WCR-002`)
- [ ] Lane `B`: Windows scaffold + protocol bridge (`WCR-003`, `WCR-004`)
- [ ] Lane `C`: auth/session/startup lifecycle (`WCR-005`, `WCR-006`)
- [ ] Lane `D`: tray shell UX + notifications (`WCR-007`, `WCR-008`)
- [ ] Lane `E`: local capture/system adapters (`WCR-009`, `WCR-010`, `WCR-011`, `WCR-012`)
- [ ] Lane `F`: canonical ingress/trust telemetry parity (`WCR-013`, `WCR-014`)
- [ ] Lane `G`: packaging/signing/update pipeline (`WCR-015`, `WCR-016`)
- [ ] Lane `H`: QA and closeout (`WCR-017`, `WCR-018`)
- [ ] Lane `I`: parity slices (`WCR-019`, `WCR-020`, `WCR-021`, `WCR-022`)
- [ ] Lane `J`: security + reliability hardening (`WCR-023`, `WCR-024`)
- [ ] Lane `K`: credentialed rehearsal + GA (`WCR-025`, `WCR-026`)

---

## Scope boundary

Owned in this workstream:

1. `apps/windows` native runtime and release path.
2. Windows-native adapters for local computer capabilities.
3. Trust/approval/no-bypass alignment with existing backend contracts.
4. Queue-first delivery governance and release evidence expectations.

Not owned in this workstream:

1. Mobile app roadmap scope.
2. Unrelated desktop-web UI redesign tasks.
3. Relaxing backend mutation authority invariants.

---

## Operating commands

1. Docs guard: `npm run docs:guard`
2. Repo baseline checks: `npm run typecheck && npm run lint && npm run test:unit`
3. Desktop parity baseline: `npm run test:e2e:desktop`
4. Windows solution checks (run on Windows machine):
   - `dotnet restore apps/windows/SevenLayers.Windows.sln`
   - `dotnet build apps/windows/SevenLayers.Windows.sln -c Release`
   - `dotnet test apps/windows/SevenLayers.Windows.sln -c Release`
5. Release report-mode check (Windows machine):
   - `pwsh -NoProfile -File apps/windows/scripts/release-pipeline.ps1 -Mode Report`
