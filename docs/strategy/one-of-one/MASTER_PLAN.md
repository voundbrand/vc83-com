# One of One - Master Plan (Audit, Landing, Agent Production Hardening)

**Last updated:** 2026-02-27
**Workstream root:** `docs/strategy/one-of-one`

---

## Objective

Build the One of One acquisition system as three coordinated tracks:

1. Backend audit mode with deterministic five-question flow and PDF deliverable generation.
2. Dedicated landing application in `/apps/one-of-one-landing` that frames the argument and embeds audit chat as primary CTA.
3. Production hardening of the shared agent runtime (release gates, runtime governors, safety boundaries, observability, and rollout controls).

The backend remains shared with the core app. The landing app remains a separate presentation boundary. Hardening work extends existing runtime contracts instead of introducing a second orchestration stack.

---

## Architectural decision

1. Keep one chat infrastructure and one identity/claim pipeline.
2. Keep landing as a dedicated app boundary for cold-traffic framing and conversion control.
3. Keep audit mode as a deterministic overlay on existing `webchat` / `native_guest` flows.
4. Reuse existing API Template.io + Convex storage PDF pipeline used by invoice/ticket generation.
5. Enforce production readiness through policy-as-code gates and runtime guardrails, not ad hoc manual checks.

---

## Execution lanes

| Lane | Scope | Queue IDs |
|----|----|----|
| `Q` | Audit backend, audit state machine, telemetry, PDF deliverable | `OOO-046` -> `OOO-052` |
| `R` | Landing app scaffold, design system, `Codec Pro`, embedded chat, analytics | `OOO-053` -> `OOO-058` |
| `S` | Integration rehearsal, launch/rollback packet | `OOO-059` -> `OOO-060` |
| `T` | Model eval + release-gate hardening | `OOO-061` -> `OOO-063` |
| `U` | Runtime governors + mutating-tool safety boundaries | `OOO-064` -> `OOO-066` |
| `V` | Observability + progressive rollout controls | `OOO-067` -> `OOO-070` |

Lane dependencies:
1. `Q` and `R` can run in parallel.
2. `S` starts only after `Q` and `R` complete.
3. `T` and `U` start only after `S` is complete, then may run in parallel.
4. `V` starts only after `T` and `U` complete.

---

## Delivery plan

### Lane Q (Audit backend)

1. Define audit mode domain contract in schema + telemetry tables.
2. Implement deterministic audit flow orchestration APIs (`start`, `answer`, `resume`, `complete`).
3. Add audit workflow PDF template to registry + seeding.
4. Implement deliverable generation action with existing PDF pipeline.
5. Wire value-first audit tooling (workflow first, email capture second).
6. Extend funnel events with audit lifecycle stages.
7. Add unit/integration tests for idempotency, replay, and PDF failure handling.

Primary anchors:
- `convex/api/v1/webchatApi.ts`
- `convex/schemas/webchatSchemas.ts`
- `convex/onboarding/funnelEvents.ts`
- `convex/lib/generatePdf.ts`
- `convex/pdfTemplateRegistry.ts`
- `convex/pdf/invoicePdf.ts`
- `convex/pdf/ticketPdf.ts`

### Lane R (Landing app)

1. Keep `/apps/one-of-one-landing` as an isolated app boundary.
2. Keep landing design token + typography system with `Codec Pro`.
3. Maintain six-section page structure from `FUNNEL.md`.
4. Keep embedded audit chat as primary CTA with session/claim continuity.
5. Keep handoff CTAs to core app and app downloads.
6. Keep attribution/conversion instrumentation aligned with onboarding telemetry.

Primary anchors:
- `apps/one-of-one-landing/app/layout.tsx`
- `apps/one-of-one-landing/app/page.tsx`
- `apps/one-of-one-landing/app/globals.css`
- `apps/one-of-one-landing/components/audit-chat-surface.tsx`
- `apps/one-of-one-landing/lib/analytics.ts`
- `scripts/ci/check-ui-design-drift.sh`

### Lane S (Integration + launch packet)

1. Rehearse cold entry -> audit chat -> deliverable -> signup handoff -> context-preserved chat.
2. Validate continuity invariants (`sessionToken`, `claimToken`, `identityClaimToken`).
3. Produce launch/rollback packet with owners, triggers, and thresholds.

Primary anchors:
- `tests/e2e/onboarding-audit-handoff.spec.ts`
- `docs/strategy/one-of-one/TASK_QUEUE.md`
- `docs/strategy/one-of-one/INDEX.md`

### Lanes T-U-V (Agent production hardening)

1. Baseline and enforce model release gates (audit mode first, enforce mode second).
2. Enforce runtime model selection against release-ready policy.
3. Introduce deterministic turn governors (`max_steps`, `max_time_ms`, `max_tokens`, `max_cost_usd`, `retry_budget`).
4. Keep mutating tools behind explicit approvals and dry-run parity contracts.
5. Extend telemetry with correlation IDs, governor exits, approval outcomes, and fallback transitions.
6. Implement shadow -> canary -> full rollout controls with automatic rollback criteria.
7. Publish operations runbook with kill-switch and rehearsal evidence.

Primary anchors:
- `scripts/ci/model-release-gate-audit.ts`
- `convex/ai/modelReleaseGateAudit.ts`
- `convex/ai/modelEnablementGates.ts`
- `convex/ai/chat.ts`
- `convex/ai/chatRuntimeOrchestration.ts`
- `convex/ai/sessionPolicy.ts`
- `convex/ai/agentTurnOrchestration.ts`
- `convex/ai/agentApprovals.ts`
- `convex/ai/tools/registry.ts`
- `convex/ai/tools/contracts.ts`
- `convex/ai/trustEvents.ts`
- `convex/ai/trustTelemetry.ts`
- `convex/ai/platformAlerts.ts`
- `convex/ai/platformModelManagement.ts`

---

## Verification matrix

| Profile | Command | Gate |
|----|----|----|
| `DOCS_CI` | `npm run docs:guard` | Required for plan/queue/prompt/doc updates |
| `BACKEND_FAST` | `npm run typecheck` | Required per backend/runtime contract task |
| `BACKEND_TESTS` | `npm run test:unit` | Required before lane `Q` completion |
| `DESIGN_GUARD` | `npm run ui:design:guard` | Required per landing visual task |
| `UI_PRINCIPLES` | `npm run ui:principles:ci` | Required before lane `R` completion |
| `E2E_REHEARSAL` | `npm run test:e2e:desktop` | Required for lane `S` rehearsal |
| `MODEL_GATE_AUDIT` | `npm run model:gate:audit` | Required while tuning lane `T` thresholds |
| `MODEL_GATE_ENFORCE` | `npm run model:gate:enforce` | Required before `OOO-063` completion |
| `AI_USAGE_GUARD` | `npm run ai:usage:guard` | Required when provider/runtime wiring changes |
| `AI_ECONOMICS_GUARD` | `npm run ai:economics:guard` | Required when telemetry/accounting contract changes |
| `TOOL_FOUNDRY_GUARD` | `npm run tool-foundry:guard` | Required when tool contracts or guard scripts change |

---

## Risks and mitigations

1. **Release-gate false positives block healthy models**
Mitigation: audit mode baseline (`OOO-061`) before enforce mode and explicit triage owner in runbook.

2. **Governor thresholds degrade useful autonomous behavior**
Mitigation: start conservative, log every governor trip with correlation IDs, and tune via canary telemetry before full rollout.

3. **Mutating-tool friction slows legitimate operator flows**
Mitigation: keep read-only fast-path, require approvals only for side-effect classes, and add dry-run previews.

4. **Telemetry grows without actionable operations**
Mitigation: bind every alert to runbook action + owner; reject informational-only metrics.

5. **Canary promotion without rollback readiness**
Mitigation: gate promotion on explicit rollback trigger matrix and dated rehearsal evidence.

---

## Exit criteria

1. Lane `Q` complete with deterministic audit flow, deliverable generation, telemetry, and tests.
2. Lane `R` complete with dedicated landing app, embedded audit chat, `Codec Pro` heading system, and design CI pass.
3. Lane `S` complete with end-to-end rehearsal and documented launch/rollback packet.
4. Lanes `T` and `U` complete with enforced model gates, runtime governors, mutating-tool approval boundaries, and dry-run contracts.
5. Lane `V` complete with correlation-ready telemetry, canary rollout controls, automatic rollback criteria, and handoff runbook.
6. `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and this `MASTER_PLAN.md` stay synchronized.
