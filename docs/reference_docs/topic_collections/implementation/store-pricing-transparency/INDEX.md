# Store Pricing Transparency Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency`  
**Source request:** Upgrade store experience to a PostHog-style sectioned pricing/documentation surface with public `/store` parity across desktop window, full-screen, and mobile, plus deep transparency and calculator support.

---

## Purpose

Queue-first execution layer for shipping a transparent pricing experience that is:

1. navigable (section rail + Jump sheet),
2. trustworthy (source-attributed pricing contracts),
3. operable (real trial path, consistent tax/copy semantics),
4. consistent across all store entry modes.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency/MASTER_PLAN.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency/INDEX.md`

---

## Status

Current kickoff:

1. `SPT-001` (`DONE`): baseline audit completed for store UI, deep-link wiring, licensing copy drift, VAT mismatch, and trial-path gaps.
2. `SPT-002` (`DONE`): product decisions locked:
   - sticky mobile Jump sheet,
   - right rail default-expanded and toggleable without persistence,
   - public `/store` as single pricing surface,
   - calculator input contract,
   - active-tier-only visibility,
   - external `Scale` naming,
   - VAT-included presentation,
   - real Scale trial backend alignment.
3. `SPT-003` (`DONE`): canonical source-of-truth contract frozen across docs + pricing modules:
   - hierarchy exports for licensing/Stripe/credits/tax/trial attribution,
   - explicit customer-facing `Scale` to runtime `agency` mapping constants,
   - VAT-included store tax contract anchor in billing docs.
4. `SPT-004` (`DONE`): shipped sectioned store shell with desktop/full-screen right rail (default-expanded, session-local toggle) plus mobile sticky `Jump to` sheet flow.
5. `SPT-005` (`DONE`): restored store deep-link parity (`panel`/`section`) across desktop window and full-screen, and fixed store prop wiring through window registry.
6. `SPT-006` (`DONE`): completed responsive readability/accessibility hardening for desktop window, full-screen, and mobile store flows.
7. `SPT-007` (`DONE`): shipped transparent contract-sourced content sections (`plans`, `limits matrix`, `add-ons`, `billing semantics`, `trial policy`, `FAQ`) with active-tier-only visibility and source hierarchy rendering.
8. `SPT-008` (`DONE`): shipped calculator v1 with required inputs (plan, billing cycle, credits, Scale sub-org count, seat/user count, tax mode) and VAT-inclusive source-attributed outputs.
9. `SPT-009` (`DONE`): added deterministic store calculator/parity unit coverage, including credits boundary parity, monthly/annual + sub-org math, large-input clamps, and missing-price fallback handling.
10. `SPT-010` (`DONE`): removed active-tier upgrade copy drift across licensing/org/super-admin surfaces while preserving legacy runtime compatibility keys.
11. `SPT-011` (`DONE`): aligned Scale trial to live checkout path with backend one-trial guard, webhook `trial` status sync, trial audit/email lifecycle, and CTA parity state.
12. `SPT-012` (`DONE`): standardized VAT-inclusive wording across store UI and translation seeds; `i18n:audit` still reports unrelated pre-existing cross-workstream baseline drift.
13. `SPT-013` (`DONE`): normalized public `scale` naming for store checkout/deep-link paths while preserving runtime `agency` metadata and additive resolver aliases for backward compatibility.
14. `SPT-014` (`DONE`): completed lane-E parity hardening with centralized login-return URL construction, deep-link unit coverage, and hydration-safe full-screen section parity logic for mobile/desktop surfaces.
15. `SPT-015` (`DONE`): completed closeout reconciliation across queue/master/index docs with deployment and rollback notes for trial enforcement and naming/tax copy contracts; docs guard passed.

---

## Lane progress board

- [x] Lane A (`SPT-001`..`SPT-003` complete)
- [x] Lane B (`SPT-004`..`SPT-006` complete)
- [x] Lane C (`SPT-007`..`SPT-009` complete)
- [x] Lane D (`SPT-010`..`SPT-013` complete)
- [x] Lane E (`SPT-014`..`SPT-015` complete)

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/store-pricing-transparency/TASK_QUEUE.md`
- Run core checks: `npm run typecheck && npm run lint && npm run test:unit`
