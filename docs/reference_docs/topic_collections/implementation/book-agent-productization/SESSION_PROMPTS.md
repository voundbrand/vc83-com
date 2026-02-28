# Book Agent Productization Session Prompts

Use these prompts to execute this workstream lane-by-lane with deterministic queue behavior.

**Last synced:** 2026-02-25 (`AGP-011` is `DONE`; `AGP-021`..`AGP-035` are `BLOCKED` under one-of-one pivot lock)

Workstream root:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization`

Queue:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`

Pivot lock:
`AGP-021`..`AGP-035` are strategy-frozen per `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md` (`LOC-002`).

---

## Global execution rules

1. Run only tasks in this queue.
2. Before each task, list top 3 risks of duplicating already shipped implementation.
3. Reuse completed stream outputs (`BMF`, `OCO`, `ACE`, `ATX`, `TCG`, `VAC`, `OCG`, `OCC`) before proposing new runtime work.
4. Consume one-agent runtime contracts from `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/` via dependency tokens; do not re-own that runtime here.
5. Run row `Verify` commands exactly as listed.
6. Keep statuses limited to `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
7. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and this file at lane milestones.
8. Do not absorb personal-operator runtime implementation rows from `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/`; consume its published contracts instead.
9. Enforce dependency token semantics from queue rules (`ID`, `ID@READY`, `ID@DONE_GATE`) before any status transitions.
10. For Agent Control Center work, enforce fail-closed super-admin auth on backend and frontend.
11. Phase 1 scope is read-only + `Audit` trigger only; defer write controls to Phase 2 lane rows.
12. For operator-facing catalog/store UX, never expose proprietary soul-mix/framework recipe internals; expose only approved public trait projections.
13. For pricing/store rows, verify parity against `/Users/foundbrand_001/Development/vc83-com/docs/strategy/cash-is-king/` before changing checkout/SKU contracts.
14. Do not run lane `J`/`K`/`L`/`M` tasks while pivot freeze is active.

---

## Session A (Lane A: reality lock + prompt corrections)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `A` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`

Rules:
1. Verify claim-level reality against code before editing docs.
2. Correct stale counts and schema pointers; do not hand-wave.
3. Run `V-DOCS` exactly.
4. Stop when lane `A` has no promotable rows.

---

## Session B (Lane B: product catalog)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `B` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`

Rules:
1. Use deterministic table schema for every row in the catalog.
2. Keep subtype/tool-profile mappings grounded in existing platform enums/profiles.
3. Mark uncertain fields explicitly; do not invent hidden assumptions.
4. Run row `Verify` commands exactly.
5. Stop when lane `B` has no promotable rows.

---

## Session C (Lane C: tool requirement matrix)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `C` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`

Rules:
1. Audit existing tools from registry sources first.
2. New tool proposals must include inputs, outputs, integrations, mutability, and approval level.
3. For booking-capable agents, map full booking ontology semantics (`schedule`/`exception`/`block`, `time_slot`/`date_range_inventory`/`event_bound_seating`/`departure_bound`, capacity/buffer/timezone, model-specific required IDs).
4. Do not relabel shipped tools as "new."
5. Run row `Verify` commands exactly.
6. Stop when lane `C` has no promotable rows.

---

## Session F (Lane F: PRD v1.3 on-ramp alignment)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `F` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`

Rules:
1. Enforce one-primary-agent default packaging language in D1/D2.
2. Preserve Dream Team as soul-powered specialist agents (not knowledge-base snippets).
3. Use `YAI-003` contract outputs for access-mode semantics; do not invent competing runtime contracts.
4. Treat `invisible`/`direct`/`meeting` as contract semantics (not UI-only labels), and keep `meeting` advisory unless an explicit approved mutation path is taken.
5. Run row `Verify` commands exactly.
6. Stop when lane `F` has no promotable rows.

---

## Session D (Lane D: seed library)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `D` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`

Rules:
1. Keep Soul v3 shape aligned with runtime boundaries and approval defaults.
2. Start with full-quality seeds for #1-#6, then produce #7-#104 skeletons.
3. Any seeding code change must reuse protected-template clone policy patterns.
4. Respect cross-gates with `PLO-010` and core `YAI` contracts before marking completion.
5. Run row `Verify` commands exactly.
6. Stop when lane `D` has no promotable rows.

---

## Session E (Lane E: roadmap + closeout)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `E` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`

Rules:
1. Tie roadmap gates to existing release/trust/conformance controls.
2. Include blocked-by notes for unresolved external gates (`OCG`, `OCC`, `OBS`) and cross-workstream `YAI` prerequisites.
3. Sync all workstream docs before closing.
4. Run row `Verify` commands exactly.
5. Enforce dependency token gate: do not move `AGP-010` out of `BLOCKED`/`PENDING` until `YAI-010` is `READY` or `DONE` in the YAI queue.
6. Stop when lane `E` has no promotable rows.

---

## Session G (Lane G: Agent Control Center queue synchronization)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `G` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`

Rules:
1. Convert the approved control-center spec into deterministic AGP queue rows with explicit dependency and verify contracts.
2. Keep all queue artifacts synchronized (`TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, `MASTER_PLAN.md`) in this workstream root.
3. Run row `Verify` commands exactly.
4. Stop when lane `G` has no promotable rows.

---

## Session H (Lane H: Agent Control Center Phase 1 implementation)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `H` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`

Rules:
1. Land Convex schema + API contracts before UI wiring.
2. Keep UI scope read-only: overview, filters, details, drift, and `Audit` action only.
3. Enforce super-admin checks in both backend handlers and tab rendering states.
4. Use tab id `agent-control-center` in the System Org super-admin window.
5. Run row `Verify` commands exactly.
6. Stop when lane `H` has no promotable rows.

---

## Session I (Lane I: Agent Control Center hardening)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `I` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`

Rules:
1. Preserve Phase 2 controlled-write contracts (`AGP-016`): blocker management + seed overrides stay super-admin-only, fail-closed, and fully audited.
2. Phase 3 automation is active: scheduled sync/audit actions + CI drift reporting via `npm run agents:catalog:audit`; keep non-blocking default until stability, then promote with `AGENT_CATALOG_AUDIT_ENFORCE=true`.
3. Keep runtime promotion paths explicit; do not add implicit live toggles.
4. Keep AGP-016 deferred test-hardening notes visible for later revisit (DOM click-through UI tests when jsdom is supported, live Convex integration wiring tests when fixtures are stable).
5. Run row `Verify` commands exactly.
6. Stop when lane `I` has no promotable rows.

---

## Session J (Lane J: 104-agent recommender index + matrix resolver)

Frozen by pivot lock (`LOC-002`). Do not execute lane `J` rows unless cutover queue publishes explicit unfreeze.

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `J` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`

Rules:
1. Treat this lane as the scalable recommendation contract for 100+ agents; avoid hardcoded outcome-to-specialist maps.
2. Keep ranking explainable: every recommendation must surface intent-match signals plus tool/integration/access-mode/runtime gaps before activation.
3. Preserve one-agent authority contracts from `YAI-003`/`YAI-004`/`YAI-014`; recommendation logic must not bypass primary-agent delegation semantics or canonical ingress authority gates.
4. Keep schema/API changes additive and migration-safe for existing `agentCatalogEntries` consumers.
5. Preserve personal-operator queue boundaries: consume `PLO-011` outputs without re-owning personal template runtime behavior here.
6. Run row `Verify` commands exactly as listed.
7. Stop when lane `J` has no promotable rows.

---

## Session K (Lane K: operator Agent Store + clone activation)

Frozen by pivot lock (`LOC-002`). Do not execute lane `K` rows unless cutover queue publishes explicit unfreeze.

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `K` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`

Rules:
1. Treat this lane as the operator shopping surface for agents: browse, compare, and activate from a catalog.
2. Show abilities, tools, frameworks, strengths, and weaknesses clearly, but keep soul-recipe internals private.
3. Reuse existing protected-template clone lifecycle (`spawn_use_case_agent` + worker-pool policies); do not introduce a parallel clone path.
4. Enforce clone-first birthing defaults: no operator-default free-form creation path.
5. Keep one-agent authority semantics intact; selection and activation flows must not bypass primary-agent contracts.
6. Implement `isPrimary=true` for the first successful clone when no primary exists in `orgId + userId`, and show capability limits (`available now` vs `blocked`) during activation.
7. Run row `Verify` commands exactly.
8. Stop when lane `K` has no promotable rows.

---

## Session L (Lane L: GTM pricing, add-ons, and custom-order commerce)

Frozen by pivot lock (`LOC-002`). Do not execute lane `L` rows unless cutover queue publishes explicit unfreeze.

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `L` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`

Rules:
1. Validate pricing and SKU copy against `cash-is-king` strategy docs before implementation.
2. Add-on commerce must support individual agents and pack-based bundles with deterministic entitlement behavior.
3. Custom-agent concierge flow must be purchase-only and encode the commercial terms exactly: `€5,000 minimum`, `€2,500 deposit`, `includes 90-minute onboarding with engineer`.
4. Keep checkout changes additive and non-breaking for existing plan/credit purchases.
5. Run row `Verify` commands exactly.
6. Stop when lane `L` has no promotable rows.

---

## Session M (Lane M: RPG traits, avatars, and game-like Agent Forge)

Frozen by pivot lock (`LOC-002`). Do not execute lane `M` rows unless cutover queue publishes explicit unfreeze.

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `M` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`

Rules:
1. Build rich public trait systems (strengths/weaknesses/archetype vectors) while keeping private soul/blend internals redacted.
2. Treat avatar support as contract-driven (manifest, metadata, deterministic ingest); user-supplied assets are expected.
3. Redesign creation UX as game-like “Agent Forge,” but preserve runtime authority and autonomy safety defaults.
4. Agent Forge must compose/tune premade catalog clones only; do not reintroduce operator free-form raw build defaults.
5. Ensure “can’t find my mix/tool/framework” path routes into purchase-only custom-agent concierge flow from lane `L` with exact terms (`€5,000 minimum`, `€2,500 deposit`, `includes 90-minute onboarding with engineer`).
6. Run row `Verify` commands exactly.
7. Stop when lane `M` has no promotable rows.
