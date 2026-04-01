# Convex AI Codebase Organization Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization`  
**Source request date:** 2026-03-26  
**Primary objective:** Consolidate AI/agent implementation ownership under `convex/ai` and produce a deterministic reorganization roadmap across the wider repository.

---

## Purpose

This workstream is the canonical planning and execution surface for:

1. `convex/ai` domain architecture normalization.
2. ElevenLabs source-of-truth ownership in `convex/ai/agents/elevenlabs` plus executable ops relocation into `scripts/ai/elevenlabs`.
3. Runtime kernel/model plane extraction with low-risk compatibility stages.
4. Script surface consolidation.
5. Repo-wide non-`convex/ai` reorganization backlog prioritization.

---

## Current status

1. Workstream initialized on 2026-03-26.
2. Queue rows: `AIORG-001`..`AIORG-013`.
3. Completed rows: `AIORG-001`, `AIORG-002`, `AIORG-003`, `AIORG-004`, `AIORG-005`, `AIORG-006`, `AIORG-007`, `AIORG-008`, `AIORG-009`, `AIORG-010`, `AIORG-011`, `AIORG-012`, `AIORG-013`.
4. Active row: none.
5. Deterministic next row: none (queue complete).
6. Active row count: `0`.

---

## Core files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/MASTER_PLAN.md`
- Index: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/INDEX.md`

Reference anchors:

- `/Users/foundbrand_001/Development/vc83-com/convex/ai`
- `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content`

---

## Baseline inventory snapshot

1. `convex/ai` files: `334`.
2. `convex` files excluding generated artifacts: `1013`.
3. `apps` files excluding generated/build artifacts: `13653`.
4. Largest app code surfaces (excluding generated/build): `apps/macos` (`8069`), `apps/operator-mobile` (`3468`), `apps/guitarfingerstyle` (`689`).
5. High-signal reorg hotspots observed:
   - ElevenLabs operational scripts were app-local and are now migrated to `scripts/ai/elevenlabs`.
   - AI/agent-related scripts spread across `scripts/ai`, root `scripts/*`, and app-local script folders.
   - Domain-heavy Convex runtime files outside `convex/ai` that may need explicit ownership boundaries.
   - Large UI surfaces in `src/components/window-content/*` suited for domain-sliced modularization backlog.

---

## Prioritized non-`convex/ai` backlog snapshot

1. `REORG-NCAI-001` (`P0`): Convex root ownership boundary cleanup for `convex/integrations`, `convex/channels`, and compliance control-plane modules.
2. `REORG-NCAI-002` (`P0`): `src/components/window-content/*` domain slicing with tab-level ownership boundaries.
3. `REORG-NCAI-003` (`P1`): shared utility extraction across apps/packages for stable duplicated helpers.
4. `REORG-NCAI-004` (`P1`): script namespace hygiene outside ElevenLabs with alias-map documentation and no-UX-drift command surface.
5. `REORG-NCAI-005` (`P1`): docs ownership normalization across `docs/reference_docs/topic_collections/*` and `docs/strategy/*`.

---

## Execution log

1. 2026-03-26: Workstream initialized for `convex/ai`-first consolidation planning.
2. 2026-03-26: Queue artifacts created with deterministic dependency flow and verify profiles.
3. 2026-03-26: `AIORG-001` done. Files: queue artifacts in this workstream. Verify: `npm run docs:guard` passed. Promotions: `AIORG-002` `PENDING -> READY`, then `READY -> IN_PROGRESS`. Next row: `AIORG-002`.
4. 2026-03-26: `AIORG-002` done. Files: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/MASTER_PLAN.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/SESSION_PROMPTS.md`, plus synchronized queue docs. Verify: `npm run docs:guard` passed. Dependency promotions: `AIORG-003` `PENDING -> READY`, then `READY -> IN_PROGRESS`. Next row: `AIORG-003`.
5. 2026-03-26: `AIORG-003` done. Files: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/MASTER_PLAN.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/TASK_QUEUE.md`, plus synchronized workstream docs. Verify: `npm run docs:guard` passed. Dependency promotions: `AIORG-004` `PENDING -> READY`, then `READY -> IN_PROGRESS`. Next row: `AIORG-004`.
6. 2026-03-26: `AIORG-004` done. Files: `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/*`, `/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts`, `/Users/foundbrand_001/Development/vc83-com/src/lib/telephony/elevenlabs-agent-sync.ts`, `/Users/foundbrand_001/Development/vc83-com/package.json`, `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/package.json`, targeted tests/docs/runbooks, and synchronized workstream docs. Verify: `npm run typecheck` passed; `npm run test:unit -- tests/unit/telephony/telephonyIntegration.test.ts tests/unit/ai/agentExecutionVoiceRuntime.test.ts` passed (31/31); `npm run docs:guard` passed. Dependency promotions: `AIORG-005`, `AIORG-006`, `AIORG-007` `PENDING -> READY`. Next row: `AIORG-005`.
7. 2026-03-27: `AIORG-005` moved `READY -> IN_PROGRESS`. Files: synchronized workstream docs only. Verify: `npm run docs:guard` passed. Dependency promotions: none. Next row after completion: `AIORG-006`.
8. 2026-03-27: `AIORG-005` done. Files: `/Users/foundbrand_001/Development/vc83-com/convex/ai/kernel/agentExecution.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/kernel/agentTurnOrchestration.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/kernel/agentToolOrchestration.ts`, compatibility exports in `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentTurnOrchestration.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentToolOrchestration.ts`, and synchronized workstream docs. Verify: `npm run typecheck` passed; `npm run test:unit -- tests/unit/ai/runtimeModuleRegistry.test.ts tests/unit/ai/agentExecutionHotspotCharacterization.test.ts` passed (13/13); `npm run docs:guard` passed. Dependency promotions: none. Next row: `AIORG-006`.
9. 2026-03-27: `AIORG-006` moved `READY -> IN_PROGRESS`. Files: synchronized workstream docs only. Verify: `npm run docs:guard` passed. Dependency promotions: `AIORG-008` `PENDING -> READY` (dependency `AIORG-001` already `DONE`). Next row after completion: `AIORG-009` (`P0`).
10. 2026-03-27: `AIORG-006` done. Files: `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelPolicy.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelAdapters.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelFailoverPolicy.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelPricing.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelEnablementGates.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelDefaults.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelDiscovery.ts`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/modelConformance.ts`, compatibility exports at original `convex/ai/model*.ts` paths, and synchronized workstream docs. Verify: `npm run typecheck` passed; `npm run test:unit -- tests/unit/ai/modelPolicy.test.ts tests/unit/ai/modelFailoverPolicy.test.ts` passed (41/41); `npm run docs:guard` passed. Dependency promotions: `AIORG-009` `PENDING -> READY`. Next row: `AIORG-009`.
11. 2026-03-27: `AIORG-009` moved `READY -> IN_PROGRESS`. Files: synchronized workstream docs only. Verify: `npm run docs:guard` passed. Dependency promotions: none. Next row after completion: `AIORG-010`.
12. 2026-03-27: `AIORG-009` done. Files: `/Users/foundbrand_001/Development/vc83-com/convex/ai/kernel/*`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/model/*`, updated import/API call sites across `convex`, `tests`, and `scripts`, removed compatibility-export modules at prior `convex/ai/*` compatibility paths, plus new drift guard `/Users/foundbrand_001/Development/vc83-com/scripts/ci/check-convex-ai-module-boundaries.sh` and package script wiring. Verify: `npm run typecheck` passed; `npm run test:unit` passed (429 passed, 7 skipped); `npm run docs:guard` passed. Dependency promotions: `AIORG-010` `PENDING -> READY`. Next row: `AIORG-010`.
13. 2026-03-27: `AIORG-010` moved `READY -> IN_PROGRESS`. Files: synchronized workstream docs only. Verify: `npm run docs:guard` passed. Dependency promotions: none. Next row after completion: `AIORG-007`.
14. 2026-03-27: `AIORG-010` done. Files: synchronized workstream docs plus final boundary evidence updates from completed hardening rows. Verify: `npm run typecheck` passed; `npm run test:unit` passed (429 passed, 7 skipped); `npm run docs:guard` passed. Dependency promotions: none. Next row: `AIORG-007`.
15. 2026-03-27: `AIORG-007` moved `READY -> IN_PROGRESS`. Files: synchronized workstream docs only. Verify: `npm run docs:guard` passed. Dependency promotions: none. Next row after completion: `AIORG-008`.
16. 2026-03-27: `AIORG-007` done. Files: `/Users/foundbrand_001/Development/vc83-com/package.json`, `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/package.json`, `/Users/foundbrand_001/Development/vc83-com/scripts/ai/README.md`, `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/README.md`, `/Users/foundbrand_001/Development/vc83-com/scripts/README.md`, and synchronized workstream docs. Verify: `npm run typecheck` passed; `npm run docs:guard` passed. Dependency promotions: none. Next row: `AIORG-008`.
17. 2026-03-27: `AIORG-008` moved `READY -> IN_PROGRESS`. Files: synchronized workstream docs only. Verify: `npm run docs:guard` passed. Dependency promotions: none (queue terminal after completion). Next row after completion: none.
18. 2026-03-27: `AIORG-008` done. Files: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/MASTER_PLAN.md`, `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/INDEX.md`, and synchronized workstream docs. Verify: `npm run docs:guard` passed. Dependency promotions: none. Next row: none (queue complete).
19. 2026-03-27: `AIORG-011` moved `READY -> IN_PROGRESS`. Files: synchronized workstream docs only. Verify: `npm run docs:guard` passed. Dependency promotions: none. Next row after completion: none.
20. 2026-03-27: `AIORG-011` done. Files: `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/elevenlabs/landing-demo-agents/clara_v3/system-prompt.md`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/elevenlabs/landing-demo-agents/clara_v3/knowledge-base.md`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/elevenlabs/landing-demo-agents/clara_v3/guardrails.json`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/agents/elevenlabs/landing-demo-agents/clara_v3/README.md`, `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/catalog.ts`, `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/lib/source-of-truth.ts`, `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/sync-elevenlabs-agent.ts`, `/Users/foundbrand_001/Development/vc83-com/scripts/ai/elevenlabs/simulate-elevenlabs-flow.ts`, and `/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/fixtures/elevenlabs/clara-v3-*.json` plus synchronized workstream docs. Verify: `npm run typecheck` passed; `npm run ai:elevenlabs:sync -- --agent clara_v3 --write` passed; `npm run ai:elevenlabs:simulate -- --suite clara-v3-demo-proof --idle-ms 1800 --turn-timeout-ms 25000` passed (all fixtures); `npm run docs:guard` passed. Dependency promotions: none. Next row: none (queue complete).
21. 2026-03-27: `AIORG-012` moved `READY -> IN_PROGRESS`. Files: synchronized workstream docs only. Verify: `npm run docs:guard` passed. Dependency promotions: none. Next row after completion: none.
22. 2026-03-27: `AIORG-012` done. Files: `/Users/foundbrand_001/Development/vc83-com/scripts/seed-schmitt-partner-demo-office.ts`, `/Users/foundbrand_001/Development/vc83-com/scripts/README.md`, and synchronized workstream docs. Verify: `npm run typecheck` passed; `npx tsx scripts/seed-schmitt-partner-demo-office.ts --help` passed; `npm run docs:guard` passed. Dependency promotions: none. Next row: none (queue complete).
23. 2026-03-27: `AIORG-013` moved `READY -> IN_PROGRESS`. Files: synchronized workstream docs only. Verify: `npm run docs:guard` passed. Dependency promotions: none. Next row after completion: none.
24. 2026-03-27: `AIORG-013` done. Files: `/Users/foundbrand_001/Development/vc83-com/scripts/seed-schmitt-partner-demo-office.ts`, `/Users/foundbrand_001/Development/vc83-com/scripts/README.md`, and synchronized workstream docs. Verify: `npm run typecheck` passed; `npx tsx scripts/seed-schmitt-partner-demo-office.ts --help` passed; `npx tsx scripts/seed-schmitt-partner-demo-office.ts --mode signup --suffix aiorg013-live --deploy-kanzlei-mvp` passed (live summary emitted; core-wedge warning surfaced); `npm run docs:guard` passed. Dependency promotions: none. Next row: none (queue complete).

---

## Milestones

- [x] M1: Governance contract and move map (`AIORG-001`..`AIORG-003`)
- [x] M2: ElevenLabs + core extraction (`AIORG-004`..`AIORG-006`)
- [x] M3: Script and backlog consolidation (`AIORG-007`..`AIORG-008`)
- [x] M4: Hardening and final cutover (`AIORG-009`..`AIORG-010`)
- [x] M5: Clara V3 intake-only hardening (`AIORG-011`)
- [x] M6: Synthetic Schmitt & Partner demo-office bootstrap (`AIORG-012`)
- [x] M7: Demo-office telephony preflight hardening + live bootstrap proof (`AIORG-013`)
