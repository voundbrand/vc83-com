# Template System Rationalization Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization`  
**Source request:** Reassess the outdated template system, keep production-critical invoice/ticket/email/checkout behavior safe, deprecate obsolete template paths, and provide a queue-first implementation plan validated by docs CI with a managed-credit default, zero-config first-run builder flow, and explicit alignment to `book-agent-productization` for team-productization contracts.

---

## Purpose

Queue-first execution surface for consolidating template runtime behavior around a single canonical resolver model while preserving existing transactional reliability, keeping custom-template onboarding low-friction, and enabling first-run software-engineering agentic teams to generate forms/sites without integration setup blockers.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization/MASTER_PLAN.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/template-system-rationalization/INDEX.md`

---

## Deep audit findings

1. The codebase currently runs multiple parallel template systems: schema renderer (`src/components/template-renderer.tsx`), preview renderer (`src/lib/template-renderer.ts`), template-set resolver (`convex/templateSetResolver.ts`), and separate email/PDF registries.
2. Production-critical flows are concentrated and identifiable:
   - invoice PDF generation (`convex/pdf/invoicePdf.ts`)
   - ticket PDF generation (`convex/pdf/ticketPdf.ts`)
   - invoice email send (`convex/invoiceEmailService.ts`)
   - ticket confirmation email send (`convex/ticketEmailService.ts`, `convex/ticketGeneration.ts`)
   - public event page with embedded checkout (`src/app/p/[orgSlug]/[pageSlug]/page.tsx`, `src/templates/web/event-landing/index.tsx`)
3. Drift exists where resolved template metadata is fetched but not always used to drive final rendering output.
4. Availability ontologies now run as read-only compatibility APIs: mutation endpoints remain for callers but execute as explicit deprecated no-ops.
5. `convex/pdfTicketTemplateRenderer.ts` is now a compatibility shim to canonical `convex/pdf/ticketPdf.ts` paths with self-referential action recursion removed.
6. Builder and preview UX indicate unfinished paths (`Build (Coming Soon)`, `Email Preview Coming Soon`) and duplicate preview pipelines.
7. Product direction for phase-1 v0 customization is now explicit: default to platform-managed provider credits (premium-priced internally), and reserve BYOK for `agency/scale` tiers.
8. Builder/publishing surfaces and harness guidance still contain hard GitHub/Vercel/v0-key assumptions (`publish-dropdown`, `v0-publish-panel`, `vercel-deployment-modal`, `publishingOntology`, `integrations.v0`, and builder tool/harness copy) that must be de-gated for first-run teams.
9. Public page rendering routes through `src/app/p/[orgSlug]/[pageSlug]/page.tsx` and `src/templates/registry.ts`; event pages rely on `event-landing` + `CheckoutEmbed`, which then resolves checkout templates through `src/templates/checkout/registry.ts`.
10. The transactional checkout regression gate now exists as dedicated Playwright coverage (`playwright.transactional.config.ts`, `tests/e2e/checkout-transactional-regression.spec.ts`) and validates end-to-end invoice/ticket/PDF/email persistence outcomes.
11. The broader software-engineering team productization contract is now owned in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/`; this workstream should integrate those outputs rather than duplicate them.

---

## Status

1. `TSR-001` -> `TSR-008` are `DONE` (inventory, telemetry, contract hardening, canonical capability convergence, and lane-D compatibility deprecations).
2. `TSR-009` (`DONE`): starter transacting bundle guarantees invoice PDF, ticket PDF, transactional email, event page, and checkout defaults with required capability validation.
3. `TSR-010` (`DONE`): phase-1 custom builder scope is enforced to web/event/checkout surfaces; invoice/ticket transactional documents stay on stable runtime path.
4. `TSR-011` (`DONE`): preview hardening landed with eval removal in `src/lib/template-renderer.ts` and a unified PDF preview pipeline used by both modal and thumbnail renderers.
5. `TSR-015` (`DONE`): platform-managed provider credits are default, BYOK is server-gated to Scale+/Enterprise entitlements, and premium-credit metering hooks are active for v0 generation actions.
6. `TSR-016` (`DONE`): first-run publish UX no longer blocks on GitHub/Vercel/v0 key setup; managed publish is default and external deployment is explicit advanced mode.
7. `TSR-017` (`DONE`): backend/tools/harness are deployment-mode-aware so managed mode avoids credential-gated hard fails while external mode retains strict validation.
8. `TSR-018` is `DONE`: local deterministic idempotent create/connect/publish implementation was already complete, and its external done-gate dependencies (`AGP-004`, `AGP-006`, `AGP-010`) are now all `DONE` in `book-agent-productization`.
9. Lane-E verification stack was executed with current workspace state: `V-TYPE` pass, `V-LINT` pass (warnings only), `V-UNIT` pass, `V-TEMPLATE-LINT` pass (warnings only), `V-DOCS` pass.
10. Lane-F canary execution (`TSR-013`) is `DONE`: rollback-trigger failures were cleared by ticket-email render fallback hardening in `convex/ticketEmailService.ts`, and the full required verify stack now passes (`V-TYPE`, `V-LINT` warnings-only, `V-UNIT`, `V-TEMPLATE-INTEGRATION` with 8 skips, `V-CHECKOUT-TRANSACTIONAL`, `V-CHECKOUT-E2E`, `V-DOCS`).
11. Lane-F shim-removal closeout (`TSR-012`) is `DONE`: deprecated compatibility override chains were removed from `emailTemplateRenderer` and `pdfTicketTemplateRenderer`, legacy marketing/support email catalogs are now compatibility-archived by default in registry/query surfaces, and fallback defaults were aligned to `event-confirmation-v2`.
12. Lane-F closeout is now complete (`TSR-012`, `TSR-013`, `TSR-014` all `DONE`) with required verify stack passing in order: `V-TYPE`, `V-LINT` (warnings only), `V-UNIT`, `V-DOCS`.

---

## Lane progress board

- [x] Lane A bootstrap (`TSR-001`)
- [x] Lane A instrumentation (`TSR-002`)
- [x] Lane B contract hardening (`TSR-003`)
- [x] Lane C resolver convergence (`TSR-004`, `TSR-005`)
- [x] Lane D deprecations (`TSR-006`, `TSR-007`, `TSR-008`)
- [x] Lane E product strategy (`TSR-009`, `TSR-010`, `TSR-015`, `TSR-016`, `TSR-017`, `TSR-018`, `TSR-011`) - local implementation and external dependency done-gate are complete
- [x] Lane F closeout (`TSR-012`, `TSR-013`, `TSR-014`) - shim-removal, canary gates, and docs closure are complete

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Run type checks: `npm run typecheck`
- Run lint: `npm run lint`
- Run unit tests: `npm run test:unit`
- Run template integration guard: `npx vitest run tests/integration/vat-checkout-invoice-flow.test.ts`
- Run transactional checkout regression: `npm run test:e2e:checkout:transactional`
