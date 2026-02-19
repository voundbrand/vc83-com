# Webchat Deployment UI Master Plan

**Date:** 2026-02-19  
**Scope:** Ship a native desktop Webchat Deployment UI with deterministic deployment snippets, configurable widget behavior, and a hardened payload contract.

---

## Mission

Deliver a first-class deployment experience where org owners can:

1. configure webchat behavior from a native desktop surface,
2. copy production-safe embed snippets quickly,
3. validate deployment quickly with smoke checks,
4. rely on backend-enforced payload contracts without client-side `organizationId` drift.

---

## Current state in this codebase

1. Public webchat endpoints exist (`POST /api/v1/webchat/message`, `GET /api/v1/webchat/config/:agentId`) and native guest endpoints reuse the same runtime.
2. `POST /api/v1/webchat/message` currently requires `organizationId` in client payload, while widget and native bootstrap flows naturally center on `agentId` and server-discovered context.
3. `src/components/chat-widget/ChatWidget.tsx` is mature for runtime messaging but not paired with a native deployment-oriented setup UI.
4. The desktop `Web Publishing` window already has deployment affordances, but there is no dedicated webchat deployment flow for snippets + widget config customization.
5. Webchat configuration values (welcome message, brand color, etc.) are returned by backend config queries, but editing UX is fragmented.

---

## WDU-001 findings (captured 2026-02-18)

1. `organizationId` in public message handlers is currently client-trusted, but the canonical trust anchor is `agentId` (or existing `sessionToken`) and should be server-resolved.
2. `ChatWidget` currently sends `{ agentId, message, sessionToken }` without `organizationId`, so current required-field validation in `convex/http.ts` is contract-inconsistent.
3. `handleWebchatMessage` does not enforce strict org/agent/session consistency (for example, mismatched `organizationId` + `agentId` payloads), leaving room for rate-limit skew and identity drift.
4. Native guest bootstrap returns platform `organizationId` and resolved `agentId`, but it does not expose a normalized deployment bootstrap contract (channel metadata, fallback origin, contract version) for downstream deployment UI.
5. Deploy snippet UX has no deterministic backend contract yet (script/React/iframe payload primitives are not centrally defined).
6. Webchat customization values are exposed via config read path, but a typed backend customization update contract is not yet present.

---

## Non-goals

1. No redesign of unrelated desktop shell/window systems.
2. No channel expansion beyond webchat/native guest in this workstream.
3. No migration of external hosting/deployment providers beyond current scope.

---

## Upstream dependencies

1. Webchat functional baseline in `/Users/foundbrand_001/Development/vc83-com/docs/bring_it_all_together/05-WEBCHAT-WIDGET.md`.
2. Existing webchat API/runtime surfaces in `convex/http.ts` and `convex/api/v1/webchatApi.ts`.
3. Desktop shell app/window registration in `src/app/page.tsx` and `src/hooks/window-registry.tsx`.
4. Existing web publishing/deployment surfaces in `src/components/window-content/web-publishing-window/*`.

---

## Architecture slices

| Slice | Requirement | Primary surfaces/files | Initial status |
|---|---|---|---|
| Payload contract hardening | Server-authoritative org resolution and backwards-compatible request handling | `convex/http.ts`; `convex/api/v1/webchatApi.ts`; `src/app/api/native-guest/config/route.ts` | `done` |
| Deploy snippet generator | Deterministic snippet outputs for script/React/iframe embed modes | `src/components/chat-widget/*`; snippet helper module(s) | `done` |
| Config customization contract | Typed schema and validation for widget behavior fields | `convex/api/v1/webchatApi.ts`; `convex/agentOntology.ts`; desktop config form components | `done` |
| Native desktop deployment UX | Dedicated flow for snippet copy, config editing, and quick verify instructions | `src/components/window-content/web-publishing-window/*`; `src/hooks/window-registry.tsx`; `src/app/page.tsx` | `done` |
| Testing and smoke checks | Contract tests + flow-level checks for bootstrap/config/message/snippet behavior | `tests/unit/*`; smoke checklist docs/tests | `done` |

---

## Phase-to-lane mapping

| Phase | Objective | Lane | Queue tasks |
|---|---|---|---|
| Phase 1 | Backend payload/bootstrap contract | `A` | `WDU-001`..`WDU-003` |
| Phase 2 | Widget runtime + snippets | `B` | `WDU-004`..`WDU-006` |
| Phase 3 | Native desktop deployment UI | `C` | `WDU-007`..`WDU-009` |
| Phase 4 | Tests, smoke checks, docs closeout | `D` | `WDU-010`..`WDU-012` |

---

## Delivery waves

1. **Wave 0:** lane `A` locks contract invariants and resolves `organizationId` ownership.
2. **Wave 1:** lane `B` adds snippet generation and runtime customization parity.
3. **Wave 2:** lane `C` ships desktop deployment UI with dedicated snippet UX.
4. **Wave 3:** lane `D` completes test expansion, smoke checks, and docs verification gates.

---

## Acceptance criteria

1. Public webchat message flow no longer depends on untrusted client-provided `organizationId` for primary contract correctness.
2. Native Webchat Deployment UI exists and is discoverable from desktop surfaces.
3. Deploy snippet UX supports script/React/iframe snippets with copy feedback and quick validation guidance.
4. Webchat config customization is editable in native UI and reflected in widget runtime behavior.
5. Unit coverage includes payload contract behavior and snippet/config generation paths.
6. Smoke checks validate bootstrap, config fetch, snippet usage, and message send path.
7. Queue verification commands and `npm run docs:guard` pass for closeout.

---

## Risks and mitigations

1. **Risk:** Payload contract changes break existing embeds that still send `organizationId`.
Mitigation: keep compatibility branch while making server resolution canonical; add tests for both old and new payload shapes.

2. **Risk:** UI lane and backend lane collide on shared config field names.
Mitigation: freeze typed contract in lane `A/B` first; lane `C` consumes contract without redefining fields.

3. **Risk:** Snippet generator drifts from actual runtime expectations.
Mitigation: add deterministic tests for snippet output and smoke checks using generated snippets.

4. **Risk:** Desktop UI scope expands into generic publishing redesign.
Mitigation: isolate lane `C` to webchat deployment surfaces only and enforce queue lane boundaries.

---

## Success metrics

1. Time from opening deployment UI to copying a usable snippet.
2. Snippet-related support failures (invalid payload, missing config fields).
3. Webchat deployment completion rate per org.
4. `organizationId` payload mismatch/error rate after contract hardening.

---

## Lane D completion (2026-02-19)

1. Added payload-contract unit coverage via `resolvePublicMessageContextFromDb` test harness in `tests/unit/ai/webchatPublicMessageContext.test.ts`, including negative legacy `organizationId` mismatch coverage.
2. Expanded snippet/customization negative-path coverage in `tests/unit/shell/webchat-deployment-snippets.test.ts`.
3. Added smoke harness `tests/helpers/webchat-deployment-smoke.ts` and end-to-end flow smoke suite `tests/unit/shell/webchat-deployment-flow.smoke.test.ts` for bootstrap -> snippet copy -> config -> message sequencing.
4. Published smoke runbook in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/SMOKE_CHECKLIST.md`.
5. Verification profile executed with lane closeout commands: typecheck, lint (warning-only baseline), unit tests, targeted webchat unit tests, and docs guard.

---

## Status snapshot

- Workstream initialized with queue-first artifacts.
- Lane `A` is complete (`WDU-001`..`WDU-003`).
- Lane `B` is complete (`WDU-004`..`WDU-006`) with deterministic snippet generation, shared customization contract enforcement, and snippet-driven runtime initialization paths.
- Lane `C` is complete (`WDU-007`..`WDU-009`) with native webchat deployment navigation, snippet UX, quick checks, and backend-wired config editing.
- Lane `D` is complete (`WDU-010`..`WDU-012`) with payload/snippet unit expansion, deployment flow smoke harness + checklist, and synchronized docs closeout.
