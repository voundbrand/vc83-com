# Book Agent Productization Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization`  
**Last updated:** 2026-02-25

---

## Mission

Ship the four book-agent productization deliverables with strict code-reality alignment and PRD v1.3 on-ramp consistency:

1. `AGENT_PRODUCT_CATALOG.md`
2. `TOOL_REQUIREMENT_MATRIX.md`
3. `SOUL_SEED_LIBRARY.md`
4. `IMPLEMENTATION_ROADMAP.md`

Plus one operational control surface:

5. `IMPLEMENTATION_OVERVIEW.md` (human-readable "done vs pending" board that links docs to code anchors)
6. `SYSTEM_ORG_AGENT_CONTROL_CENTER_SPEC.md` (super-admin UI + Convex data model contract for zero-drift operations)
7. Phase 1 control-center implementation (`agent-control-center` tab, read-only + audit mode)
8. Phase 2 controlled writes for blocker management + seed overrides (audited + fail-closed)
9. Phase 3 drift automation (scheduled audit/sync runs, CI drift reporting path, gated docs snapshot export hook)
10. Phase 4 scalable recommendation index/resolver foundations for 104+ agents with explainable gap-first ranking (`AGP-018`..`AGP-020`)
11. Phase 5 operator Agent Store baseline foundations (`AGP-023`..`AGP-025`)
12. Strategy-freeze lanes `J`..`M` expansion rows (`AGP-021`..`AGP-035`) under one-of-one pivot lock
13. Preserve traceable docs/contracts for frozen rows without continuing marketplace expansion by default
14. Clone-first birthing guardrail: operator creation defaults to catalog clone activation, the first successful clone sets `isPrimary=true` when no primary exists in `orgId + userId`, and capability limits are visible at activation time

Do this without re-implementing already completed platform capabilities.

Pivot lock (2026-02-25):

1. Remaining marketplace/commercialization expansion rows (`AGP-021`..`AGP-035`) are `BLOCKED`.
2. Unfreeze authority is owned by `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md`.
3. This workstream remains source of truth for completed contract artifacts, but active execution shifts to one-of-one cutover lanes.

---

## Reality Lock (2026-02-24)

These are the baseline corrections that must remain true in this workstream:

1. Tool inventory is currently `87` unique tools (`75` in `TOOL_REGISTRY` + `12` in `INTERVIEW_TOOLS`), not "100+".
2. Trust event literals are currently `40` (`trust.*` literal variants), not "65+".
3. Seed baseline already includes more than Quinn:
   - Quinn template,
   - initial Quinn worker,
   - five protected orchestration/event specialist templates.
4. Soul v2 contract is runtime-shaped across schema + generator/evolution paths; do not treat one table validator as the only source of truth.

---

## PRD v1.3 Delta Scope (Owned Here)

Scope from `/Users/foundbrand_001/Development/vc83-com/docs/prd/YOUR_AI_PRD.md` that this queue owns:

1. Keep Dream Team specialists as soul-powered agents (not KB-only artifacts) in D1/D2 contracts.
2. Represent one-agent-first on-ramp semantics in D1/D2 as contract language consumed from `YAI-003`/`YAI-004`/`YAI-014` (`invisible` default, `direct`/`meeting` specialist modes, and canonical ingress/authority invariants with meeting-mode advisory behavior unless explicit approved mutation path).
3. Carry seed-contract expectations for Soul v3 identity origin metadata and access-mode fields in D3 docs.
4. Reflect upstream dependency gates from `YAI` core queue and `PLO` template runtime queue in D4 roadmap.

Out of scope here (consume only):

1. Core runtime implementation (`harness`, team routing, birthing, privacy, autonomy scaffolding) in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/`.
2. Personal operator runtime/template behavior in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/`.

---

## Do-Not-Rebuild Matrix

| Capability | Evidence anchor | Status | Productization action |
|---|---|---|---|
| Provider registry + org binding resolver | `BMF-005` | `DONE` | Reuse for "Required Integrations" and provider assumptions; do not design a second registry |
| Provider adapter normalization (OpenRouter/OpenAI/Anthropic/Gemini/custom) | `BMF-008` | `DONE` | Reuse in tool/autonomy assumptions for catalog and matrix |
| Model conformance harness + enablement gates | `BMF-015` | `DONE` | Reuse as quality gate references in roadmap |
| Voice multimodal routing baseline | `BMF-016`, `VAC` lane closeout | `DONE` | Reuse for channel-affinity recommendations (voice-ready paths already exist) |
| Protected template specialists + deterministic clone factory | `OCO-008`, `OCO-009` | `DONE` | Reuse template/clone semantics for 104-agent seed library |
| Soul v2 overlays + approval-gated learning loop | `OCO-010`, `OCO-011` | `DONE` | Reuse immutable/mutable boundaries and approval checkpoints |
| Trust taxonomy + trust telemetry + HITL in-stream controls | `ATX-003`, `ATX-013`, `ATX-019`, `ATX-020` | `DONE` | Reuse trust evidence model and event naming conventions |
| Release-gate reduction framework (`proceed/hold/rollback`) | `ACE-010`, `ACE-011`, `ACE-016` | `DONE` | Reuse for productization rollout gates |
| Collaboration runtime contracts (`group_thread`, `dm_thread`, lineage/checkpoint semantics) | `TCG-014`..`TCG-017` | `DONE` | Reuse collaboration contracts for team-agent recommendations |

---

## Active Risk Dependencies

These are out-of-workstream risks that can affect rollout confidence:

1. `OCG-004` is `BLOCKED` (shared failover extraction landed but model-validation baseline drift remains).
2. `OCC` lane `C/D/E` cutover rows are still open (`OCC-008`..`OCC-013`).
3. `OBS` release gate remains `FAILED` on desktop e2e deep-link regressions.
4. `YAI` dependency lanes consumed by AGP are complete (`YAI-003`, `YAI-004`, `YAI-010`, `YAI-014` are `DONE`); keep AGP docs aligned to those canonical contracts and avoid legacy/pre-PRD autonomy wording drift.
5. `AGP-016` controlled-write hardening intentionally deferred two deeper test layers: DOM click-through interaction coverage (needs repo-supported jsdom harness) and live Convex integration coverage (needs stable fixture wiring); `AGP-017` is complete and these remain explicit follow-up candidates.
6. Pricing/store UX may drift from GTM strategy docs if not explicitly locked (`00_EXECUTIVE_BRIEF.md`, `01_PRICING_LADDER.md`, `02_GTM_HORMOZI.md`).

Policy:

1. Do not block docs deliverables on external runtime rows unless marked dependency tokens in queue.
2. Do block "ready for broad production rollout" claims until external gates clear.

---

## Deliverable Plan

### D1: Agent Product Catalog

Scope:

1. Core specialists (#1-#6) with concrete subtype/tool-profile/tool requirements.
2. Industry rows (#7-#104) mapped by vertical and phase.
3. One-agent on-ramp metadata (`invisible` default + optional direct/meeting modes).

Status:

1. Row-level catalog expansion and one-agent on-ramp contract alignment are complete (`AGP-004` and `AGP-012` done 2026-02-25), including primary-agent-first packaging and contract-semantic specialist access modes.

Output:

- `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/AGENT_PRODUCT_CATALOG.md`

### D2: Tool Requirement Matrix

Scope:

1. Existing tool audit from current registries.
2. Net-new tool proposals grouped as universal, vertical-specific, specialist.
3. Vertical profile expansion proposal (`legal`, `finance`, `health`, `coaching`, `agency`, `trades`, `ecommerce`).
4. Work-vs-private mutability defaults for specialist/tool rows.

Status:

1. Tool gap matrix and seven vertical profile contracts are complete (`AGP-006` done 2026-02-25), and `AGP-012` now locks access-mode semantics as runtime contracts (not UI labels) with meeting-mode advisory mutation constraints.

Output:

- `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/TOOL_REQUIREMENT_MATRIX.md`

### D3: Soul Seed Library

Scope:

1. Full production-ready seeds for #1-#6.
2. Skeleton seeds for #7-#104 with soul-file gap flags.
3. Integration notes for `seedPlatformAgents.ts` with ownership preserved for `PLO-010`.

Status:

1. Core production seed contracts for #1-#6 are complete (`AGP-007` done 2026-02-25), including concrete prompts, identity traits, guardrails, tool bindings, clone-policy defaults, and Soul v3 `immutableOrigin` metadata expectations.
2. `AGP-009` ingestion wiring is complete (2026-02-25) after the cross-queue handshake cleared `PLO-010@DONE_GATE`.
3. #7-#104 skeleton seed contracts are complete (`AGP-008` done 2026-02-25).

Output:

- `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/SOUL_SEED_LIBRARY.md`

### D4: Implementation Roadmap

Scope:

1. Four-phase execution plan.
2. Gate criteria tied to existing release/trust/conformance guardrails.
3. Explicit reuse of completed infrastructure lanes.
4. Explicit dependency notes for `YAI` core queue and `PLO` seed-contract done gate.

Status:

1. Roadmap draft is refreshed with phased release/trust/conformance gates and explicit blocked-by registers (`OCG`, `OCC`, `OBS`, `YAI`) in `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/IMPLEMENTATION_ROADMAP.md`.
2. `AGP-010` is `DONE` (2026-02-25) after dependency token `YAI-010@READY` was satisfied and `V-DOCS` was re-run clean.

Output:

- `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/IMPLEMENTATION_ROADMAP.md`

### D5: Agent Control Center (System Org, Phase 1-3)

Scope:

1. Add Convex productization schema tables for catalog, tool requirements, seed registry, and sync runs.
2. Add super-admin-only read API contract (overview/list/details/drift/sync-run history).
3. Add audit-only Phase 1 mutation path (`triggerCatalogSync` with `read_only_audit`/`sync_apply` mode flags).
4. Wire System Org tab id `agent-control-center` with dataset selector, drift badge, KPI cards, filters, table, and read-only drawer tabs (`Summary`, `Tools`, `Seed`, `Runtime`, `Dependencies`, `Audit`).
5. Ship Phase 2 controlled writes for blockers + seed overrides with deterministic confirm modal text, actor/timestamp override badges, and `agent_catalog.*` audit actions.
6. Ship Phase 3 drift automation with scheduled audit/sync jobs, non-blocking CI drift report path (`agents:catalog:audit`), and a gated docs snapshot export hook that stays non-breaking until explicitly enabled.

Output:

- `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentProductizationSchemas.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentCatalogAdmin.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentCatalogSync.ts`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/super-admin-organizations-window/index.tsx`

### D6: Scalable Agent Recommendation Index (Phase 4)

Scope:

1. Replace hardcoded recommendation mappings with a catalog-backed resolver that can evaluate 104+ agents.
2. Extend catalog contracts with additive recommendation metadata (intent tags, keyword aliases, ranking hints) and backward-compatible defaults.
3. Enforce explainable recommendation payloads: intent-match signals, missing integrations, tool/runtime gaps, and access-mode constraints before activation.
4. Preserve one-agent delegation/authority semantics from `YAI-003`/`YAI-014` and personal-operator boundary ownership from `PLO-011`.
5. Add deterministic regression coverage for ranking + explanation quality across broad catalog slices.

Status:

1. `AGP-018` is complete (2026-02-25): D1 now defines canonical intent taxonomy + keyword normalization/alias rules, and D2 now defines weighted scoring + gap-first explanation payload contracts.
2. `AGP-019` is complete (2026-02-25): additive productization schema fields and admin query/search surfaces now carry intent tags, keyword aliases, and recommendation metadata with backward-compatible default resolution; sync hash contract now includes recommendation metadata coverage.
3. `AGP-020` is complete (2026-02-25): reusable resolver runtime now ships deterministic AGP-018 weighted scoring/penalty semantics, gap-first explainability payloads, additive admin query surfaces, and midwife-composer reuse under one-agent authority constraints.
4. Remaining lane `J` rows are frozen (`AGP-021`, `AGP-022` set to `BLOCKED`) under pivot lock.

Output:

- `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentProductizationSchemas.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentCatalogAdmin.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentRecommendationResolver.ts`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-recommender.ts`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents-window.tsx`
- `/Users/foundbrand_001/Development/vc83-com/tests/unit/agents/agentRecommender.test.ts`

### D7: Operator Agent Store + Clone Activation (Phase 5)

Scope:

1. Add operator-facing catalog shopping across 104+ agents with browse/filter/compare UX.
2. Show clear abilities/tools/framework tags and readiness gaps without exposing proprietary soul recipe internals.
3. Support deterministic “add agent” activation via existing protected-template clone lifecycle.
4. Enforce operator clone-first birthing defaults and fail-closed non-admin direct free-form creation paths.
5. Ensure first successful clone sets `isPrimary=true` when no primary exists in the same `orgId + userId` scope.
6. Surface capability-limit snapshots at birthing time (available now vs blocked by integrations/autonomy/channel readiness).

Status:

1. Lane `K` contract baseline is now established: `AGP-023` is `DONE` with published Agent Store card schema, privacy-safe projection rules, avatar-slot metadata requirements, clone-first birthing guardrails, capability-limit snapshot contract, and purchase-only concierge fallback policy.
2. Dependency progression updated: `AGP-024` and `AGP-025` are `DONE`; remaining lane `K` rows (`AGP-026`, `AGP-027`) are frozen (`BLOCKED`) under pivot lock.

Output:

- `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/AGENT_STORE_EXPERIENCE.md`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentStoreCatalog.ts`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-store-panel.tsx`

### D8: GTM Pricing + Add-On Packs + Custom Concierge (Phase 6)

Scope:

1. Audit and lock store pricing/SKU contracts against `cash-is-king` strategy docs.
2. Add individual-agent and pack-based add-on commerce with entitlement-safe checkout paths.
3. Implement purchase-only custom-agent concierge order flow for operators who cannot find the needed mix.
4. Encode required commercial terms in UX + checkout + docs:
   - `€5,000 minimum`,
   - `€2,500 deposit`,
   - `includes 90-minute onboarding with engineer`.

Status:

1. Lane `L` rows (`AGP-028`..`AGP-031`) are frozen (`BLOCKED`) under pivot lock.

Output:

- `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/AGENT_STORE_PRICING.md`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/store-window.tsx`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/customAgentOrders.ts`

### D9: RPG Trait Projection + Avatar/Game-Like Agent Forge (Phase 7)

Scope:

1. Project private soul/framework mixes into rich public RPG traits (strengths, weaknesses, archetypes, behavior vectors).
2. Keep proprietary blend internals private while presenting compelling operator-facing characteristics.
3. Add avatar manifest + ingest contracts for user-supplied avatar assets.
4. Redesign creation UX into a game-like Agent Forge with clear capability panels and custom-order escalation.
5. Agent Forge composes/tunes premade catalog clones only; it is not a free-form raw builder for operators.

Status:

1. Lane `M` rows (`AGP-032`..`AGP-035`) are frozen (`BLOCKED`) under pivot lock.

Output:

- `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/AGENT_TRAIT_TAXONOMY.md`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-forge-builder.tsx`
- `/Users/foundbrand_001/Development/vc83-com/tests/unit/agents/agentForgeBuilder.test.tsx`

---

## Acceptance Criteria

1. All four deliverable docs exist and are internally consistent.
2. Every claim of "existing capability" points to shipped workstream evidence.
3. No deliverable asks for rebuilding capabilities that are already `DONE`.
4. One-agent default + three access-mode semantics are reflected in D1/D2 contracts.
5. Queue, plan, index, and session prompts remain synchronized.
6. Agent Control Center tab keeps computed status fields read-only and fail-closed for non-super-admins.
7. Controlled writes (blockers + seed overrides) require explicit reason/confirmation and emit `agent_catalog.*` audit actions.
8. Runtime promotion remains explicit and is not implicitly toggled by Phase 2 write controls.
9. Drift automation is active via schedule + CI, with non-blocking-by-default rollout and explicit promotion path to blocking mode after stability.
10. `npm run docs:guard` passes after every docs milestone.
11. Completed lane `J` and lane `K` foundations (`AGP-018`..`AGP-020`, `AGP-023`..`AGP-025`) remain documented and test-backed.
12. Frozen rows `AGP-021`..`AGP-035` remain `BLOCKED` until explicit cutover override is recorded.
13. Operator-default free-form agent creation paths remain disallowed in delivered contracts.
14. Existing clone-first safeguards and first-primary assignment semantics remain preserved in completed artifacts.
