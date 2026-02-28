# Template System Rationalization Master Plan

**Date:** 2026-02-25  
**Scope:** Simplify and modernize the template system by preserving only production-critical runtime paths, introducing guaranteed prebuilt templates, converging customization onto a single v0-enabled builder path, adopting a platform-managed credit model (with tiered BYOK), and removing first-run GitHub/Vercel/v0-key gating from default builder workflows without risking invoice/ticket/email/checkout stability.

---

## Mission

Deliver a single, explicit template architecture where:

1. transactional flows (invoice PDF, ticket PDF, confirmation/invoice emails, event checkout page) remain stable and test-guarded,
2. users can operate immediately with prebuilt templates (no forced setup),
3. custom templating uses one intentional path instead of parallel legacy renderers,
4. v0/provider usage defaults to platform-managed credits so customers are not forced through external-provider onboarding,
5. software-engineering agentic teams can create forms/websites on the fly using platform-managed defaults (similar harness ergonomics to CLI coding assistants),
6. deprecated systems are removed only after telemetry and regression gates pass.

---

## Progress checkpoint (2026-02-25)

1. `TSR-001` through `TSR-008` are complete (inventory, telemetry, production contract hardening, canonical capability convergence, and lane-D compatibility deprecations).
2. `TSR-009` is complete: guaranteed starter template sets now include invoice PDF, ticket PDF, transactional email, event page, and checkout defaults with required seed validation.
3. `TSR-010` is complete: phase-1 custom template generation is scoped to web/event/checkout surfaces; invoice/ticket transactional docs remain on stable runtime paths.
4. `TSR-011` is complete: eval-based preview expression execution was removed and replaced with a safe arithmetic parser plus shared PDF preview-document pipeline.
5. `TSR-015` is complete: managed provider credits are default, BYOK is server-gated to Scale+/Enterprise, and premium-credit metering hooks cover v0 generation actions.
6. `TSR-016` is complete: first-run publish UX no longer requires GitHub/Vercel/v0-key setup; managed publish is default and external deploy is explicit advanced mode.
7. `TSR-017` is complete: backend/tool/harness flows are deployment-mode-aware so managed mode avoids integration hard fails while external mode keeps strict checks.
8. `TSR-018` is complete: local deterministic idempotent create/connect/publish implementation was already landed, and the external done-gate dependencies (`AGP-004`, `AGP-006`, `AGP-010`) are now all `DONE`.
9. Lane-E verification stack executed with current workspace state: `V-TYPE` pass, `V-LINT` pass (warnings only), `V-UNIT` pass, `V-TEMPLATE-LINT` pass (warnings only), `V-DOCS` pass.
10. Lane-F canary/rollback validation (`TSR-013`) is complete: rollback-trigger failures were cleared by adding ticket-email render fallback handling in `convex/ticketEmailService.ts`, then rerunning the full required stack in-order with clean results (`V-TYPE` pass, `V-LINT` pass with warnings only, `V-UNIT` pass, `V-TEMPLATE-INTEGRATION` pass with 8 skips, `V-CHECKOUT-TRANSACTIONAL` pass, `V-CHECKOUT-E2E` pass, `V-DOCS` pass).
11. Lane-F shim-removal closeout (`TSR-012`) is complete: deprecated ticket/product/event compatibility override chains were removed from `emailTemplateRenderer` and `pdfTicketTemplateRenderer`, non-core marketing/support email catalogs were moved behind explicit compatibility policy in registry/query surfaces, and transactional fallback defaults were aligned to `event-confirmation-v2` in domain/ticket flows.
12. Lane-F is now fully complete (`TSR-012`, `TSR-013`, `TSR-014` all `DONE`) with closure verify stack passing in order (`V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS`).

---

## Cross-workstream dependency

This workstream owns template/runtime de-gating and builder execution touchpoints, but does not own full agentic-team productization design.

Authoritative team-productization source:

1. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/MASTER_PLAN.md`
2. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`
3. Deliverables:
   - `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/AGENT_PRODUCT_CATALOG.md`
   - `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/TOOL_REQUIREMENT_MATRIX.md`
   - `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/SOUL_SEED_LIBRARY.md`
   - `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/IMPLEMENTATION_ROADMAP.md`

Policy:

1. Do not redefine the global 104-agent architecture in this workstream.
2. `TSR-018` must consume those contracts and implement only template/builder/harness integration points.

---

## Product posture decisions

1. **Prebuilt-first:** Every organization should have a working starter set for invoice, ticket, transactional email, and event/checkout.
2. **Custom is opt-in:** v0-based custom template creation is supported, but only after starter and contract stability are guaranteed.
3. **Transactional over generic:** Non-transactional email template sprawl is not a platform priority; preserve only flows with active runtime/business value.
4. **Single resolver contract:** Template selection must resolve through one canonical capability model.
5. **Managed credits by default:** Custom template generation uses our platform-managed provider credits by default and is monetized through internal premium credits; BYOK remains an advanced path for `agency/scale` plans.
6. **Zero-config first run:** New teams should get to generated forms/sites without mandatory GitHub, Vercel, or user-managed v0 key setup; external deploy integrations are advanced options.

---

## Current state snapshot (deep audit)

1. `src/components/template-renderer.tsx` implements a large schema-driven UI renderer (~1.3k lines) for preview/builder contexts.
2. `src/lib/template-renderer.ts` now uses a safe arithmetic parser (no `eval`) and provides a shared PDF preview pipeline consumed by preview modal + thumbnail surfaces.
3. Production PDF generation is already centralized in `convex/pdf/invoicePdf.ts` and `convex/pdf/ticketPdf.ts`, both resolving template IDs via template sets.
4. Invoice email path (`convex/invoiceEmailService.ts`) resolves template metadata but currently renders via a hardcoded component path in practice.
5. Ticket confirmation path combines template resolution with a parallel email-render pipeline (`convex/ticketGeneration.ts`, `convex/ticketEmailService.ts`, `convex/emailTemplateRenderer.ts`), creating drift risk.
6. `convex/pdfTicketTemplateRenderer.ts` is now an explicit compatibility shim over canonical `convex/pdf/ticketPdf.ts` generation paths.
7. Template availability ontologies now keep read APIs and preserve legacy mutation signatures as deprecation no-ops, aligning behavior with the “all published templates available” policy.
8. Builder UX now enforces phase-1 scope guards for custom generation and preserves transactional invoice/ticket updates on stable schema/preview paths.
9. Public event route and event-landing template remain cleanly separated and are currently the primary web-template production surface.
10. Current product direction requires removing customer-provider setup friction for v0 customization by defaulting to platform-managed credits instead of mandatory user-supplied provider keys.
11. Builder context and `integrations.v0` now support managed-provider defaults for base plans, with BYOK as an entitlement-gated advanced mode.
12. Harness guidance and builder tool actions now treat managed publish as default and require GitHub/Vercel checks only in explicit external deployment mode.
13. Publishing/template UI surfaces are now deployment-mode-aware: managed path avoids first-run integration blockers, while external mode keeps strict GitHub/Vercel validation.
14. Dedicated transactional checkout regression coverage now exists in `tests/e2e/checkout-transactional-regression.spec.ts` with isolated fixture seeding (`tests/e2e/utils/checkout-transactional-fixture.ts`) and config in `playwright.transactional.config.ts`.

---

## Production-critical contract surface (must not regress)

| Contract | Required behavior | Source files | Protection strategy |
|---|---|---|---|
| Invoice PDF generation | Generate correct invoice/receipt PDF with resolved template set and attachment-safe output | `convex/pdf/invoicePdf.ts`; `convex/pdfGeneration.ts` | Regression tests + resolver telemetry + rollback gate |
| Ticket PDF generation | Generate ticket PDF with resolved template and stable attachment output | `convex/pdf/ticketPdf.ts`; `convex/pdfGeneration.ts` | Regression tests + fallback coverage |
| Invoice email delivery | Send invoice email with correct recipient, template, and optional PDF attachment | `convex/invoiceEmailService.ts` | Remove hardcoded render drift, assert template-driven output |
| Ticket confirmation delivery | Send confirmation email with ticket PDF/ICS attachments and stable subject/content | `convex/ticketEmailService.ts`; `convex/ticketGeneration.ts`; `convex/emailTemplateRenderer.ts` | Canonical resolver migration + attachment contract tests |
| Event page + checkout | Render published event page and preserve embedded checkout flow | `src/app/p/[orgSlug]/[pageSlug]/page.tsx`; `src/templates/web/event-landing/index.tsx`; `src/components/checkout/checkout-embed.tsx` | Route/render smoke checks + E2E gate |

---

## Definitive inventory snapshot (`TSR-001`)

| Surface | Entry points | Resolver chain | Fallback semantics | Decision |
|---|---|---|---|---|
| Runtime: invoice PDF | `convex/pdf/invoicePdf.ts` | `templateSetQueries.resolveIndividualTemplateInternal("invoice")` -> `pdfTemplateQueries.resolvePdfTemplateInternal` -> Template.io generation | Template set precedence resolves manual -> product -> checkout -> domain -> org -> system; missing template throws | `KEEP` |
| Runtime: ticket PDF | `convex/pdf/ticketPdf.ts` | `templateSetQueries.resolveIndividualTemplateInternal("ticket")` -> `pdfTemplateQueries.resolvePdfTemplateInternal` -> Template.io generation | Same template-set precedence and explicit error on missing template | `KEEP` |
| Runtime: invoice email preview/send | `convex/invoiceEmailService.ts` | Resolves `email` template ID and metadata, then renders with `InvoiceB2BEmailTemplate` | Template metadata lookup can succeed while renderer remains component-coupled | `CONVERGE` |
| Runtime: ticket confirmation email + attachments | `convex/ticketGeneration.ts`; `convex/ticketEmailService.ts`; `convex/emailTemplateRenderer.ts` | `ticketGeneration` resolves email template ID/metadata; `ticketEmailService` calls `emailTemplateRenderer` then registry renderer + PDF/ICS attachments | Multiple resolution/render steps create drift risk across send/preview paths | `CONVERGE` |
| Runtime: public event page + embedded checkout | `src/app/p/[orgSlug]/[pageSlug]/page.tsx`; `src/templates/web/event-landing/index.tsx`; `src/components/checkout/checkout-embed.tsx` | Page route resolves template via `src/templates/registry.ts`; event template injects `CheckoutEmbed`; embed resolves checkout template via `src/templates/checkout/registry.ts` | Web template fallback to `landing-page`; missing checkout template returns explicit error state | `KEEP` |
| Builder renderer | `src/components/template-renderer.tsx`; `src/components/window-content/templates-window/template-builder.tsx` | Schema-driven render path for template design contexts | Feature sections still include "Build (Coming Soon)" and partial preview affordances | `CONVERGE` |
| Preview renderer (legacy) | `src/lib/template-renderer.ts`; `src/components/template-preview-modal.tsx`; `src/components/template-thumbnail.tsx` | String interpolation + loop/conditional parsing with expression evaluation | Uses `eval` for expression math in browser preview | `DEPRECATE` |
| Availability ontologies | `convex/templateAvailability.ts`; `convex/pdfTemplateAvailability.ts`; `convex/checkoutTemplateAvailability.ts`; `convex/templateSetAvailability.ts` | Read queries now return all published templates/template sets | Enable/disable mutations still write availability objects despite read-side "all available" policy | `DEPRECATE` |
| Legacy ticket PDF renderer | `convex/pdfTicketTemplateRenderer.ts` | Internal resolver path and Template.io generation wrapper | Remains callable but is parallel to active `convex/pdf/ticketPdf.ts` runtime | `DEPRECATE` |

---

## Keep / converge / deprecate matrix

| Area | Current implementation | Decision | Why | Migration path |
|---|---|---|---|---|
| Invoice/ticket PDF runtime | `convex/pdf/invoicePdf.ts`, `convex/pdf/ticketPdf.ts` + template-set resolution | `KEEP` | Already aligned with transactional reliability and template-set precedence | Add tests/telemetry, then keep as canonical document runtime |
| Public event web template with checkout | `src/templates/web/event-landing/index.tsx`, route in `src/app/p/[orgSlug]/[pageSlug]/page.tsx` | `KEEP` | Active production surface with direct checkout dependency | Harden tests and keep as web baseline |
| Template set resolver | `convex/templateSetResolver.ts`, `convex/templateSetQueries.ts` | `KEEP + CONVERGE` | Correct conceptual center, but taxonomy mapping is inconsistent across systems | Introduce canonical capability names and compatibility mappings |
| Invoice email rendering behavior | `convex/invoiceEmailService.ts` | `CONVERGE` | Resolver output and renderer execution are partially disconnected | Ensure resolved template metadata determines final render path |
| Ticket/email resolver chain | `convex/ticketGeneration.ts`, `convex/emailTemplateRenderer.ts`, `convex/ticketEmailService.ts` | `CONVERGE` | Parallel chains increase drift and maintenance | Route through canonical template capability resolver |
| Schema UI renderer | `src/components/template-renderer.tsx` | `CONVERGE` | Useful for builder/preview but should not define runtime transactional behavior | Keep builder-focused role; remove runtime coupling |
| Legacy preview engine | `src/lib/template-renderer.ts` | `DEPRECATE` | Duplicate rendering semantics plus eval-based expression execution risk | Replace with unified preview pipeline, then remove |
| Legacy ticket PDF renderer | `convex/pdfTicketTemplateRenderer.ts` | `DEPRECATE` | Overlaps with active ticket PDF runtime and appears isolated | Telemetry-confirm no active dependency, then delete |
| Availability mutations | `convex/templateAvailability.ts`, `convex/pdfTemplateAvailability.ts`, `convex/checkoutTemplateAvailability.ts`, `convex/templateSetAvailability.ts` | `DEPRECATE` | Mutations conflict with current “all available” policy comments | Convert to compatibility/no-op wrappers and remove eventually |
| Non-core email template catalog sprawl | marketing/support/event variants in `src/templates/emails/registry.ts` | `DEPRECATE (UI-default)` | Agentic system can generate ad-hoc content; only transactional templates are business-critical | Hide from default selection, retain compatibility window, archive after telemetry shows no use |
| Builder/preview split surfaces | `template-builder.tsx`, `template-preview-modal.tsx` | `CONVERGE` | “Coming soon” and duplicate preview paths fragment user mental model | Ship one clear custom-template path via v0 builder plus unified preview |
| v0/provider access + monetization path | builder/provider integration + billing controls | `CONVERGE` | Forcing user provider signup/API keys adds onboarding friction and support burden | Default to platform-managed credits and premium pricing; gate BYOK behind `agency/scale` plan policy |
| Builder publish gating UX | `publish-dropdown.tsx`, `v0-publish-panel.tsx`, `web-apps-tab.tsx`, `vercel-deployment-modal.tsx` | `CONVERGE` | Mandatory GitHub/Vercel setup blocks first-run value for new teams | Default to platform-managed publish path; keep external deploy as opt-in advanced mode |
| Agentic deployment instructions + tool chain | `convex/ai/harness.ts`, `convex/ai/tools/builderToolActions.ts`, `convex/ai/tools/builderTools.ts` | `CONVERGE` | Harness currently steers every web build through GitHub+Vercel assumptions | Add deployment-mode-aware flows and deterministic on-the-fly form/site generation sequence |

---

## Target architecture

1. **Capability-first resolver contract**
   - Canonical capabilities:
   - `document_invoice`
   - `document_ticket`
   - `transactional_email`
   - `web_event_page`
   - `checkout_surface`
2. **Runtime split by intent**
   - Transactional runtime: Convex services generating/sending legally and operationally sensitive outputs.
   - Builder runtime: v0-based customization for non-critical or explicitly enabled surfaces.
3. **Provider access + billing model**
   - Default mode: platform-managed provider credits (no required customer provider account/API key setup).
   - Monetization: charge internal premium credits mapped to observed generation usage and margin policy.
   - Advanced mode: optional BYOK for `agency/scale` plans with clear entitlement gating.
4. **Publish/deploy mode split**
   - Default mode: platform-managed publish path for generated forms/websites (no required GitHub/Vercel connection).
   - Advanced mode: optional GitHub/Vercel export/deploy when explicitly enabled by user and plan entitlement.
   - Agent/tool routing must detect mode and avoid suggesting blocked integration steps in default path.
5. **Prebuilt template baseline**
   - Every org receives starter sets at onboarding.
   - No user is blocked on template authoring to begin operations.
6. **Deprecation lifecycle**
   - Inventory and telemetry.
   - Compatibility shim.
   - Guarded cutover.
   - Removal.

---

## Implementation phases

1. **Phase 1: Inventory and guardrails (`TSR-001`, `TSR-002`, `TSR-003`)**
   - Lock current contract map.
   - Add resolver-source telemetry.
   - Add do-not-break regression coverage.
2. **Phase 2: Resolver convergence (`TSR-004`, `TSR-005`)**
   - Introduce canonical template capability taxonomy.
   - Eliminate resolver/renderer drift in invoice and ticket email paths.
3. **Phase 3: Legacy migration (`TSR-006`, `TSR-007`, `TSR-008`)**
   - Replace legacy email resolver path.
   - Remove isolated ticket PDF renderer.
   - Retire no-longer-meaningful availability mutation surface.
4. **Phase 4: Product strategy execution (`TSR-009`, `TSR-010`, `TSR-015`, `TSR-016`, `TSR-017`, `TSR-018`, `TSR-011`)**
   - Ship guaranteed starter sets.
   - Enable v0 custom-template path with strict phase-1 scope and platform-managed credits as default.
   - Implement usage metering and premium-credit charging for managed provider spend, with BYOK gated to `agency/scale`.
   - Remove mandatory GitHub/Vercel/v0-key setup from first-run builder and publish UX in default mode.
   - Refactor backend/harness gating so managed mode works without customer-owned integration credentials.
   - Deliver deterministic software-engineering agentic-team run path for on-the-fly forms/websites by consuming contracts from `book-agent-productization` deliverables.
   - Unify preview stack and remove eval-based preview engine.
5. **Phase 5: Rollout and closure (`TSR-012`, `TSR-013`, `TSR-014`)**
   - Remove deprecated code after telemetry confirms readiness.
   - Run canary/rollback gates.
   - Complete documentation and operator handoff.
   - Current gate status (2026-02-25): lane-F closeout is complete (`TSR-012`, `TSR-013`, `TSR-014` all `DONE`) and required verify gates remain green after shim removal.

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Resolver migration breaks attachment emails | Invoice/ticket communications fail in production | Lock tests before migration, keep compatibility shims, add rollback gate |
| Template taxonomy rename causes silent fallback behavior | Wrong template rendered without visible error | Add capability-to-legacy mapping table + telemetry for fallback source |
| Removing legacy availability mutations breaks admin screens | UI/runtime confusion for super admins | Preserve read APIs and transitional no-op mutations with deprecation notices |
| Preview unification removes required design-time features | Builder UX regressions | Migrate previews incrementally and keep feature parity checklist |
| Aggressive deprecation of non-core templates causes hidden regressions | Niche org workflows break | Move to hidden/compatibility tier first; remove only after measured zero usage window |
| Platform-managed provider spend exceeds margin assumptions | Unit economics degrade as usage scales | Add usage metering, premium credit pricing controls, and plan-based throttles before broad rollout |
| BYOK entitlement leaks to lower tiers | Product packaging confusion and support load | Enforce server-side plan gates for provider-key configuration APIs and UI visibility |
| De-gating first-run publish flow breaks advanced external deploy UX | Existing GitHub/Vercel users lose expected behavior | Keep explicit external-mode path with strict validation and regression coverage for legacy deploy flow |
| Agentic team “auto-create” flow causes noisy or duplicate artifacts | Credit waste and messy org data | Add deterministic idempotency keys, confidence thresholds, and confirmation prompts for low-confidence links |
| Local team-flow docs diverge from productization source of truth | Conflicting implementation contracts and churn | Treat `book-agent-productization` as authoritative and consume its published deliverables in `TSR-018` |

---

## Validation

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:unit`
4. `npx vitest run tests/integration/vat-checkout-invoice-flow.test.ts`
5. `npm run test:e2e:checkout:transactional`
6. `npm run test:e2e:desktop`
7. `npm run docs:guard`

---

## Exit criteria

1. All production-critical template contracts are covered by deterministic tests and passing in CI.
2. Template selection logic runs through one canonical capability resolver model.
3. Starter template sets are guaranteed for new org onboarding.
4. Legacy renderers and obsolete availability mutation paths are removed or explicitly fenced with documented sunset policy.
5. Builder customization path is clear, scoped, and no longer split across duplicate preview/build surfaces.
6. Workstream docs (`TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, `MASTER_PLAN.md`) remain synchronized and docs guard passes.
7. Default custom-template onboarding requires no customer provider signup/API key configuration; BYOK is available only for approved `agency/scale` tiers.
8. Newly created software-engineering agentic teams can generate forms/websites on the fly and reach a publishable state without GitHub/Vercel/v0-key setup in default mode.
9. Optional GitHub/Vercel/BYOK flows remain available only when explicitly enabled and entitlement-validated.
10. `TSR-018` implementation is aligned with and references `book-agent-productization` deliverables without redefining global team contracts here.
