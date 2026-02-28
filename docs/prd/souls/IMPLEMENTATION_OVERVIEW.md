# Agent Productization Implementation Overview

**Status:** Active tracker (human-readable source of truth)  
**Last updated:** 2026-02-25

This is the single implementation board that connects:

1. agent catalog scope,
2. tool coverage requirements,
3. soul seed readiness,
4. roadmap phase gates,
5. code anchors that must move with docs updates.

---

## Canonical artifacts (docs + code linkage)

| Artifact | Purpose | Current status | Queue linkage | Primary code anchors |
|---|---|---|---|---|
| `BEHAVIORAL_SYSTEM_CONTRACT.md` | Canonical layered differentiation contract (`prompt + memory + policy + tools + eval + trust`) | Active | `LOC-007` done | `convex/ai/agentPromptAssembly.ts`; `convex/ai/memoryComposer.ts`; `convex/ai/toolScoping.ts`; `convex/ai/agentApprovals.ts`; `convex/ai/trustEvents.ts` |
| `AGENT_PRODUCT_CATALOG.md` | Per-agent product contract (104 total) | Full row set complete (#1-#104) | `AGP-003` done, `AGP-004` done | `convex/ai/toolScoping.ts`; `convex/ai/harness.ts`; `convex/ai/teamHarness.ts` |
| `TOOL_REQUIREMENT_MATRIX.md` | Existing tool baseline + net-new gap map | Baseline + gap contract complete | `AGP-005` done, `AGP-006` done | `convex/ai/tools/registry.ts`; `convex/ai/tools/interviewTools.ts`; `convex/ai/toolScoping.ts` |
| `SOUL_SEED_LIBRARY.md` | Seed object contracts + readiness flags | Contract scaffold ready; seed payloads pending | `AGP-007`/`AGP-008` pending | `convex/onboarding/seedPlatformAgents.ts`; soul runtime schemas/contracts |
| `IMPLEMENTATION_ROADMAP.md` | Phased rollout plan and gates | Draft complete; closeout pending | `AGP-010` pending | Cross-workstream gates (`YAI`, `PLO`, trust/release guards) |

---

## Agent build tracker (live vs pending)

Definitions:

1. `CATALOG_DONE`: row fully specified in D1.
2. `SEED_DONE`: D3 seed payload contract is implemented for that row.
3. `RUNTIME_LIVE`: template/agent behavior is executable in runtime with required tools/contracts.

| Agent slice | Count | Catalog | Seed | Runtime | Notes |
|---|---:|---|---|---|---|
| Core specialists (#1-#6) | 6 | `CATALOG_DONE` | pending | partial | D1 complete; D3 production seeds are next (`AGP-007`). |
| Legal (#7-#20) | 14 | `CATALOG_DONE` | pending | pending | D1 + D2 contracts complete (`AGP-004`, `AGP-006`). |
| Finance (#21-#34) | 14 | `CATALOG_DONE` | pending | pending | D1 + D2 contracts complete (`AGP-004`, `AGP-006`). |
| Health (#35-#48) | 14 | `CATALOG_DONE` | pending | pending | D1 + D2 contracts complete (`AGP-004`, `AGP-006`). |
| Coaching (#49-#62) | 14 | `CATALOG_DONE` | pending | pending | D1 + D2 contracts complete (`AGP-004`, `AGP-006`). |
| Agencies (#63-#76) | 14 | `CATALOG_DONE` | pending | pending | D1 + D2 contracts complete (`AGP-004`, `AGP-006`). |
| Trades (#77-#90) | 14 | `CATALOG_DONE` | pending | pending | First-wave focus slice now fully cataloged and profile-mapped. |
| E-Commerce (#91-#104) | 14 | `CATALOG_DONE` | pending | pending | First-wave focus slice now fully cataloged and profile-mapped. |

Current totals:

1. Agents in catalog scope: `104`.
2. Catalog-complete rows: `104`.
3. Catalog-pending rows: `0`.
4. First-wave vertical backlog (Legal + Trades + E-Commerce): `42`.

---

## Tool readiness tracker

| Scope | Status | Source of truth | Code anchors |
|---|---|---|---|
| Existing modeled tools | complete baseline | D2 section A | `convex/ai/tools/registry.ts`; `convex/ai/tools/interviewTools.ts` |
| Vertical profile expansion (`legal`/`finance`/`health`/`coaching`/`agency`/`trades`/`ecommerce`) | complete contract mapping | D2 section C | `convex/ai/toolScoping.ts` |
| Net-new tool backlog (universal + vertical + specialist) | complete contract mapping (implementation pending) | D2 section B | `convex/ai/tools/registry.ts` + future tool modules |
| Work/private + access mode tool constraints | complete contract mapping | D2 sections A1 + E | `convex/ai/harness.ts`; `convex/ai/teamHarness.ts`; trust gates |

---

## Soul seed readiness tracker

| Scope | Status | Queue linkage | Code anchors |
|---|---|---|---|
| Core seed payloads (#1-#6) | pending | `AGP-007` | `convex/onboarding/seedPlatformAgents.ts` |
| Industry skeleton seeds (#7-#104) | pending | `AGP-008` | `convex/onboarding/seedPlatformAgents.ts` |
| Seed ingestion wiring + ownership-safe rollout | pending | `AGP-009` | `convex/onboarding/seedPlatformAgents.ts`; ownership gate with `PLO-010` |

---

## Update protocol (required for every new agent)

When adding or changing any agent capability (example: new domain agent):

1. Update the row in `AGENT_PRODUCT_CATALOG.md` with subtype, profile, required tools/integrations, and access modes.
2. Update `TOOL_REQUIREMENT_MATRIX.md` for required tools:
   - map to existing tool(s), or
   - add explicit net-new tool contract rows.
3. Update `SOUL_SEED_LIBRARY.md` with seed status:
   - full seed object, or
   - skeleton + `[REQUIRES_SOUL_BUILD]`.
4. Update implementation queue status in `/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`.
5. If runtime/tool behavior changed, update code anchors in:
   - `convex/ai/tools/registry.ts`
   - `convex/ai/toolScoping.ts`
   - `convex/onboarding/seedPlatformAgents.ts` (where applicable)
6. Re-run `npm run docs:guard` before closeout.

---

## Cross-workstream dependency reminders

1. One-agent runtime contracts are owned in `/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/`.
2. Personal-operator template behavior ownership remains in `/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/`.
3. This productization stack must consume those contracts, not redefine them.
