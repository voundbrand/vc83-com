# Personal Life Operator Agent Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent`  
**Last updated:** 2026-03-11

---

## Mission

Deliver a production-safe "personal life organizer" agent that can:

1. understand appointment intents,
2. use connected calendar context,
3. contact providers with deterministic outreach policy,
4. escalate for approval when needed,
5. confirm booked outcomes with audit evidence.

---

## Lane A execution notes

### `PLO-001` risk check (before execution)

1. Regression risk: overstating outbound calling readiness and causing downstream UX promises to drift from runtime reality.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/channels/types.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/channels/registry.ts`.
2. Regression risk: assuming Google tool-readiness parity from OAuth availability, which could skip lane `C` parity work.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/oauth/google.ts`.
3. Regression risk: confusing per-agent autonomy (`supervised`/`autonomous`/`draft_only`) with domain-scoped autonomy (`appointment_booking`) during planning-time baseline capture (later resolved by `YAI-008` + `PLO-010`).
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`.

### `PLO-002` risk check (before execution)

1. Regression risk: acceptance criteria that are not measurable can block deterministic pass/fail pilot closeout.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`; this file.
2. Regression risk: allowing outbound call fallback without explicit approval/consent boundaries can violate trust/compliance gates.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentApprovals.ts`.
3. Regression risk: ambiguous work/private expectations can lead to accidental private-mode mutation behavior.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/docs/prd/YOUR_AI_PRD.md`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts`.

---

## Lane B execution notes

### `PLO-003` risk check (before execution)

1. Regression risk: overpromising autonomous outbound calling in setup copy.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/convex/channels/types.ts`.
2. Regression risk: collapsing work/private context guidance into a single mode and creating policy drift.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/prd/YOUR_AI_PRD.md`.
3. Regression risk: breaking integrations-window license/access behavior while adding setup entry points.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/integrations-window/index.tsx`; `/Users/foundbrand_001/Development/vc83-com/convex/licensing/tierConfigs.ts`.

### `PLO-004` risk check (before execution)

1. Regression risk: name-based heuristics misclassifying role coverage and producing false “covered” states.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents-window.tsx`.
2. Regression risk: one-click recommendations opening generic create flows without deterministic role intent.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/index.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents-window.tsx`.
3. Regression risk: failing to keep “available now” and “planned” boundaries explicit in discovery UI.
   Impacted contracts: this file; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`.

### Lane `B` completion summary (2026-02-24)

1. `PLO-003` shipped setup UI in:
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/integrations-window/personal-operator-setup.tsx`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/integrations-window/index.tsx`
2. `PLO-004` shipped coverage/discovery and one-click specialist handoff in:
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents-window.tsx`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/index.tsx`
3. Row verify outcomes:
   - `V-TYPE` pass (`npm run typecheck`)
   - `V-LINT` pass with baseline warnings (`3126`, `0` errors)
   - `V-UNIT` pass (`109` files, `570` tests)
4. Out-of-lane type-depth blocker was resolved during verification hardening:
   - `/Users/foundbrand_001/Development/vc83-com/src/templates/checkout/behavior-driven/steps/product-selection.tsx`
   - Switched to untyped Convex query access to avoid `TS2589` deep instantiation.

---

## Lane C execution notes

### `PLO-005` risk check (before execution)

1. Regression risk: changing OAuth readiness output shape in ways that break existing assistant/tool expectations for Microsoft.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolScoping.ts`.
2. Regression risk: accidentally broadening Google OAuth scope assumptions instead of only reading currently granted scopes.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/oauth/google.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/coreSchemas.ts`.
3. Regression risk: planner/runtime making calendar mutation decisions without explicit write-readiness signal or mode-routing context.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts`.

### `PLO-006` risk check (before execution)

1. Regression risk: breaking existing `crm_contact` reads/updates by requiring new outreach fields on historical records.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/crmOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/ontologySchemas.ts`.
2. Regression risk: introducing outreach-preference field names that diverge between CRM ontology and AI tool payloads.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/crmOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/crmTool.ts`.
3. Regression risk: persisting invalid allowed-hours values that later cause outbound policy/runtime ambiguity.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/crmOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`.

### Lane `C` progress summary (2026-02-24)

1. `PLO-005` shipped Google parity in OAuth readiness checks and added planner-facing calendar write-readiness routing in:
   - `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts`
   - `/Users/foundbrand_001/Development/vc83-com/convex/oauth/google.ts`
   - `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts`
2. `PLO-006` implementation landed for migration-safe contact outreach preferences schema/defaults in:
   - `/Users/foundbrand_001/Development/vc83-com/convex/crmOntology.ts`
   - `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/crmTool.ts`
   - `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/internalToolMutations.ts`
   - `/Users/foundbrand_001/Development/vc83-com/convex/schema.ts`
3. Row verification outcomes:
   - `PLO-005`: `V-TYPE` pass, `V-LINT` pass (`3131` warnings, `0` errors), `V-UNIT` pass (`109` files, `570` tests).
   - `PLO-006` (latest re-verify on 2026-02-24): `V-TYPE` pass after resolving `TS2589` in `/Users/foundbrand_001/Development/vc83-com/src/app/api/webhooks/activecampaign/route.ts`; `V-LINT` pass after shared fixes in `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts` and `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx` (`3214` warnings, `0` errors); `V-UNIT` pass after gating cloud-dependent RBAC/VAT suites behind `RUN_CONVEX_CLOUD_TESTS=1` (`117` files passed, `4` skipped; `544` tests passed, `80` skipped).
4. Supplemental cloud-only check (2026-02-24) for the five RBAC/VAT suites with `RUN_CONVEX_CLOUD_TESTS=1` did not complete in the Codex environment; all suites entered repeated Convex websocket reconnect loops (`Received network error or non-101 status code`) and no final Vitest summary was emitted before termination.
5. Follow-up cloud-only stabilization row `PLO-017` (2026-02-25) re-ran the same path successfully with final Vitest summary (`138` files passed, `732` tests passed); the prior websocket reconnect signature was not reproduced.

---

## Lane D/E completion summary (2026-02-25)

### `PLO-010` risk check (before execution)

1. Regression risk: creating a second template-seeding path that bypasses protected-template clone-policy guardrails.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/workerPool.ts`.
2. Regression risk: widening tool scope beyond personal-operator mission requirements and introducing unintended mutation surface.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolScoping.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`.
3. Regression risk: redefining personal-operator behavior in AGP-owned docs/runtime instead of keeping this queue authoritative.
   Impacted contracts: this file; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`.

### `PLO-010` implementation outcome

1. Added protected `Personal Life Operator` seed contract into the existing shared protected-template upsert loop in:
   - `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts`
2. Added constrained `personal_operator` tool profile (calendar/contacts/booking/outreach scope) in:
   - `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolScoping.ts`
3. Extended protected-template lookup/filtering to include `templateRole` for deterministic contract consumption in:
   - `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts`
4. Seed defaults now enforce one-agent and approval boundaries:
   - `unifiedPersonality: true`
   - `teamAccessMode: "invisible"`
   - `autonomyLevel: "supervised"`
   - `domainAutonomy.appointment_booking.level: "sandbox"`

### Verification outcome (row stack)

1. `V-TYPE` passed (`npm run typecheck`).
2. `V-LINT` passed with baseline warnings (`3229`, `0` errors).
3. `V-UNIT` passed (`121` files passed, `4` skipped; `561` tests passed, `80` skipped).

---

## Lane F compliance policy (`PLO-012`)

### Outbound appointment calling policy (`plo-appointment-call.v1`)

1. **Explicit HITL consent is mandatory.**
   - Any `manage_bookings` execution that can reach outbound `phone_call` (`preferredOutreachChannel=phone_call`, `outreachFallbackMethod=phone_call`, or `autonomyDomainLevel=live`) must pass through `agent_approval` resolution by an authenticated user.
   - No autonomous path may execute call fallback without this approval checkpoint.
2. **Recording disclosure is mandatory before approval.**
   - Approval payload must include non-empty `callConsentDisclosure`.
   - Runtime stamps `recordingDisclosureStatus` as part of compliance evidence.
3. **Medical/PHI handling is constrained to minimum necessary outreach data.**
   - Policy scope is operational scheduling only (`appointment_outbound_call`).
   - No diagnosis generation or treatment guidance; retain only minimum scheduling/contact details needed for booking.
4. **Promotion artifact is approval-bound.**
   - Approved call flows are stamped with `autonomyPromotionApprovalId=<approvalId>`, `autonomyDomainLevel=live`, and explicit `autonomyPromotionReason`.
   - If compliance metadata is missing or rejected, execution is blocked and marked as failed.
5. **Trust telemetry parity is required.**
   - Emit trust events for call approval lifecycle:
     - `trust.guardrail.appointment_call_approval_requested.v1`
     - `trust.guardrail.appointment_call_approval_resolved.v1`
     - `trust.guardrail.appointment_call_approval_blocked.v1`
6. **Core `YAI` contract alignment.**
   - Work/private and sensitive-archetype guardrails from `YAI-006` remain authoritative.
   - Private archetype behavior cannot bypass approval or expand PHI surface area.

---

## Lane F timeline evidence (`PLO-013`)

### `PLO-013` risk check (before execution)

1. Regression risk: timeline cards could expose raw contact details or transcript PII in operator-facing UI.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-sessions-viewer.tsx`; `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/conversationsInternal.ts`.
2. Regression risk: mission/attempt correlation could drift from canonical outreach objects if cards are derived only from message text.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/conversationsInternal.ts`.
3. Regression risk: REST/UI parity could diverge if timeline data is available in one surface but not the other.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/conversations.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/conversationsInternal.ts`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-sessions-viewer.tsx`.

### `PLO-013` implementation outcome

1. Added mission-linked outreach/call timeline aggregation with deterministic ordering in:
   - `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/conversationsInternal.ts`
   - Cards now include attempt channel/reason/status/result, failure reason normalization, telephony disposition, and transcript snippets.
2. Added default redaction of transcript snippets (email + phone masking) before UI/API exposure in:
   - `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/conversationsInternal.ts`
3. Surfaced timeline metadata on the conversation messages API contract in:
   - `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/conversations.ts`
4. Rendered operator-facing timeline cards in the Sessions tab with explicit redaction labeling in:
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-sessions-viewer.tsx`

### Verification outcome (row stack)

1. `V-TYPE` passed (`npm run typecheck`).
2. `V-LINT` passed with baseline warnings (`3246`, `0` errors).
3. `V-UNIT` passed (`130` files passed, `4` skipped; `628` tests passed, `80` skipped).

---

## Lane G pilot validation (`PLO-014`)

### `PLO-014` risk check (before execution)

1. Regression risk: checklist-only validation could drift from real appointment outreach ordering if mission ladder logic changes.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts`; this file.
2. Regression risk: phone fallback evidence may pass without explicit consent disclosure artifacts.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentApprovals.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustEvents.ts`; this file.
3. Regression risk: closure semantics may be nondeterministic if outcomes are not bounded to `BOOKED` or `UNRESOLVED_WITH_REASON` inside the 48-hour mission window.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts`; this file.

### Pilot implementation anchors

1. Deterministic pilot scenario matrix and checklist evaluator:
   - `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/personalLifeOperatorPilotChecklist.test.ts`
2. Runtime-derived ladder utility used by pilot scenarios:
   - `/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts` (`buildAppointmentOutreachAttemptLadder`, `APPOINTMENT_OUTREACH_LIMITS`)

### Pilot scenario outcomes

| Scenario | Ladder evidence | Approval evidence | Outcome |
|---|---|---|---|
| Hair appointment | `sms -> email -> phone_call` with deterministic reason codes (`initial_outreach`, `async_fallback_retry`, `approved_call_fallback`) | `approval-hair-call-1` with explicit `callConsentDisclosure` before call execution | `BOOKED` (`provider_confirmed_slot`) within mission window |
| Dermatologist visit | `email -> sms -> phone_call` with deterministic reason codes and explicit call step approval requirement | `approval-derm-call-1` with explicit `callConsentDisclosure` before call execution | `UNRESOLVED_WITH_REASON` (`provider_unreachable_within_retry_window`) within mission window |

Generalization note:

1. Hair + dermatologist are required pilot certification anchors from queue scope.
2. Checklist logic is service-agnostic and also validated against a non-canonical scenario (`physical_therapy_follow_up`) to prevent hard-coded behavior drift.

### Deterministic checklist result (`PO-SLA-01`..`PO-SLA-06`)

| Checklist ID | Hair appointment | Dermatologist visit |
|---|---|---|
| `PO-SLA-01` Mission intake contract | Pass | Pass |
| `PO-SLA-02` Calendar-awareness gate | Pass | Pass |
| `PO-SLA-03` Attempt ladder determinism | Pass | Pass |
| `PO-SLA-04` Approval boundary for calling | Pass | Pass |
| `PO-SLA-05` Outcome closure | Pass | Pass |
| `PO-SLA-06` Audit completeness | Pass | Pass |

### Negative control

1. Added explicit failing control case where a `phone_call` attempt has no approval artifact.
2. Expected result is `PO-SLA-04 = false`, proving the checklist rejects non-compliant call execution evidence.

### Verification outcome (row stack)

1. `V-TYPE` passed (`npm run typecheck`).
2. `V-LINT` passed with baseline warnings (`3253`, `0` errors).
3. `V-UNIT` passed (`125` files passed, `4` skipped; `596` tests passed, `80` skipped).
4. `V-E2E` passed (`1` desktop Playwright test); first sandboxed run hit local bind `EPERM` on `127.0.0.1:3000`, rerun outside sandbox passed.
5. `V-DOCS` passed (`npm run docs:guard`).

---

## Lane G closeout (`PLO-015`)

### Launch recommendation

1. Recommend **limited production rollout** for personal-operator appointment flows with existing safeguards enabled:
   - `appointment_booking` default autonomy remains `sandbox`.
   - Outbound `phone_call` fallback remains explicit-approval only.
   - Timeline cards are redacted-by-default for operator review.
2. Cross-org broad-launch gate is now cleared by `PLO-016` evidence, and the cloud-only RBAC/VAT verification gate is now cleared by `PLO-017` in this environment.

### Blocker status (current)

1. No active cloud-only RBAC/VAT blocker remains in this environment after `PLO-017` verification.
2. Historical note: the prior 2026-02-24 environment-limited Convex websocket reconnect failure signature (`Received network error or non-101 status code`) was not reproduced in the 2026-02-25 re-run.

### Rollback plan

1. If outreach/call behavior regresses, disable new timeline-surface reliance and continue operations through existing session transcript view while root-causing API aggregation.
2. If call compliance or consent artifacts drift, force all appointment missions to `sandbox` autonomy and block live call fallback by withholding promotion approvals.
3. If cross-org isolation concerns appear, pause personal-operator template activation for affected organizations and route operations through supervised/manual approval mode until `PLO-016` evidence is restored.

---

## Lane G cross-org validation (`PLO-016`)

### `PLO-016` risk check (before execution)

1. Regression risk: cross-org checklist could false-pass org-aware booking behavior without concrete mutation evidence (vacuous `every()` on empty mutation arrays).
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/personalLifeOperatorPilotChecklist.test.ts`; this file.
2. Regression risk: personal/business switching could look valid while context labels are ambiguous, reducing operator clarity and increasing mode-mixup risk.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/auth.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/personalLifeOperatorPilotChecklist.test.ts`.
3. Regression risk: queue may drift into redefining `YAI` org-isolation rules instead of consuming shared contracts.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md`; this file.

### Validation implementation anchors

1. Cross-org pilot checklist evaluator + controls:
   - `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/personalLifeOperatorPilotChecklist.test.ts`
2. Core contract references consumed (not redefined in this queue):
   - `/Users/foundbrand_001/Development/vc83-com/convex/auth.ts` (`switchOrganization` workspace-switch audit metadata)
   - `/Users/foundbrand_001/Development/vc83-com/convex/ai/harness.ts` (cross-org enrichment stays read-only; no cross-org writes)

### Cross-org checklist outcomes (`PO-ORG-01`..`PO-ORG-03`)

| Scenario | `PO-ORG-01` no personal-data leakage | `PO-ORG-02` context-switch clarity | `PO-ORG-03` org-aware booking behavior |
|---|---|---|---|
| Personal/business baseline snapshots with isolated mission + booking visibility and scoped mutations | Pass | Pass | Pass |
| Booking-visibility leakage control (`booking-business` visible inside personal context) | Fail | Pass | Pass |
| Context-banner ambiguity control (business banner missing explicit business mode label) | Pass | Fail | Pass |
| Cross-org booking mutation control (personal context records business mutation IDs/org) | Pass | Pass | Fail |
| Missing mutation evidence control (personal context mutation log empty) | Pass | Pass | Fail |

### Verification outcome (row stack)

1. `V-TYPE` passed (`npm run typecheck`).
2. `V-UNIT` passed (`133` files passed, `4` skipped; `645` tests passed, `80` skipped).
3. `V-DOCS` passed (`npm run docs:guard`).

### Cross-workstream ownership closeout note

1. AGP lane `J` now owns global 104+ recommender index/matrix scaling.
2. This PLO queue remains owner of personal-operator template/runtime behavior.

---

## Lane G cloud-only RBAC/VAT follow-up (`PLO-017`)

### `PLO-017` risk check (before execution)

1. Regression risk: cloud-only RBAC/VAT suites may re-enter Convex websocket reconnect loops and fail to emit deterministic Vitest summaries.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/tests/unit/permissions/basic-checks.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/permissions/organization-scoped.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/permissions/wildcards.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/roles/role-assignment.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/vat-calculation.test.ts`.
2. Regression risk: `RUN_CONVEX_CLOUD_TESTS=1` gating could drift and silently skip intended cloud-only assertions while still returning green status.
   Impacted contracts: the five suite files above; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`.
3. Regression risk: closeout messaging could blur AGP lane `J` ownership by treating global recommender index/matrix scaling as PLO scope.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`; this file.

### Verification outcome (row stack)

1. `V-TYPE` passed (`npm run typecheck`) from `2026-02-25T15:12:47Z` to `2026-02-25T15:12:56Z`.
2. `V-UNIT` passed (`RUN_CONVEX_CLOUD_TESTS=1 npm run test:unit -- tests/unit/permissions/basic-checks.test.ts tests/unit/permissions/organization-scoped.test.ts tests/unit/permissions/wildcards.test.ts tests/unit/roles/role-assignment.test.ts tests/unit/vat-calculation.test.ts`) with final Vitest summary: `138` files passed, `732` tests passed (from `2026-02-25T15:13:00Z` to `2026-02-25T15:13:22Z`).
3. `V-DOCS` passed (`npm run docs:guard`) with `Docs guard passed.` from `2026-02-25T15:13:22Z` to `2026-02-25T15:13:31Z`.
4. Deterministic result: prior Convex websocket reconnect blocker signature (`Received network error or non-101 status code`) was not reproduced in this environment.

### Cross-workstream ownership closeout note

1. AGP lane `J` owns global 104+ recommender index/matrix scaling.
2. This PLO queue remains owner of personal-operator template/runtime behavior.

---

## Lane H weekend mode operations extension (`PLO-018`..`PLO-020`)

### Lane `H` risk check (before execution)

1. Regression risk: weekend schedule activation/deactivation could mutate soul mode at the wrong times and produce inconsistent runtime behavior across timezones.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/ai/weekendMode.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/crons.ts`.
2. Regression risk: weekend caller automation could create duplicate contacts/pipeline links or fail to map sessions into deterministic follow-up stages.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/ai/weekendMode.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts`.
3. Regression risk: Monday reports could over-deliver stale/noisy summaries or fail silently on channel delivery (email/telegram) without artifact persistence.
   Impacted contracts: `/Users/foundbrand_001/Development/vc83-com/convex/ai/weekendMode.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/crons.ts`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/integrations-window/personal-operator-setup.tsx`.

### Implementation outcome (2026-03-11)

1. Added weekend mode runtime/config contract and schedule enforcement in `/Users/foundbrand_001/Development/vc83-com/convex/ai/weekendMode.ts` with timezone-aware Friday-evening -> Monday-morning window evaluation, onboarding default seeding, and cron-driven state synchronization.
2. Added weekend prompt overlay + runtime wiring in:
   - `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`
   - `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentPromptAssembly.ts`
3. Added weekend caller automation in `/Users/foundbrand_001/Development/vc83-com/convex/ai/weekendMode.ts`:
   - contact auto-create/resolve from inbound phone calls,
   - deterministic `Weekend Calls` pipeline creation with stages (`New Call`, `Needs Follow-up`, `Appointment Set`, `Resolved`, `Escalated`),
   - conversation-to-task extraction that enriches CRM pipeline placement and creates follow-up task objects.
4. Added Monday briefing generation/delivery in `/Users/foundbrand_001/Development/vc83-com/convex/ai/weekendMode.ts` with persisted in-app report artifacts plus optional email/Telegram dispatch.
5. Added setup UI toggle wiring in `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/integrations-window/personal-operator-setup.tsx` using `getWeekendModeConfig` + `saveWeekendModeConfig`.

### Verification outcome (row stack)

1. `V-TYPE` passed (`npm run typecheck`).
2. `V-UNIT` passed (`npx vitest run tests/unit/ai/weekendMode.test.ts`) with `4` tests passed.
3. `V-CODEGEN` passed (`npx convex codegen`).
4. `V-DOCS` passed (`npm run docs:guard`).

---

## Reality lock (`PLO-001`) - code-anchored on 2026-02-24

### Available now

| Capability | Evidence anchors | Decision |
|---|---|---|
| Google + Microsoft calendar sync exists, including booking pushes into external calendars. | `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts:755`; `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts:768`; `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts:773`; `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts:879`; `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts:946`; `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncOntology.ts:965` | `AVAILABLE_NOW` |
| Google sub-calendar fetch + per-resource blocking/push settings exist. | `/Users/foundbrand_001/Development/vc83-com/convex/oauth/google.ts:225`; `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncSubcalendars.ts:2`; `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncSubcalendars.ts:27`; `/Users/foundbrand_001/Development/vc83-com/convex/calendarSyncSubcalendars.ts:140` | `AVAILABLE_NOW` |
| Booking management and booking workflow tools are `ready` and wired to runtime actions. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts:1177`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts:1182`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts:3528`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts:3535` | `AVAILABLE_NOW` |
| ElevenLabs voice provider integration and voice runtime adapter exist. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/providerRegistry.ts:151`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/voiceRuntimeAdapter.ts:227`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/voiceRuntimeAdapter.ts:324`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/voiceRuntimeAdapter.ts:366`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts:5694` | `AVAILABLE_NOW` |
| Multi-channel messaging providers are runtime-registered for text/chat surfaces. | `/Users/foundbrand_001/Development/vc83-com/convex/channels/registry.ts:63`; `/Users/foundbrand_001/Development/vc83-com/convex/channels/registry.ts:68`; `/Users/foundbrand_001/Development/vc83-com/convex/channels/types.ts:13` | `AVAILABLE_NOW` |

### Historical future-required baseline (2026-02-24 snapshot; superseded where noted)

| Gap | Evidence anchors | Decision |
|---|---|---|
| Tool-level OAuth readiness checker is Microsoft-only in execution path; Google is declared but explicitly rejected. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts:200`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts:210`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts:214`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md` (`PLO-005`) | `RESOLVED (PLO-005)` |
| No call channel contract exists and no telephony provider is currently registered in runtime registry. | `/Users/foundbrand_001/Development/vc83-com/convex/channels/types.ts:13`; `/Users/foundbrand_001/Development/vc83-com/convex/channels/registry.ts:63`; `/Users/foundbrand_001/Development/vc83-com/convex/channels/registry.ts:68`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md` (`PLO-008`, `PLO-009`) | `RESOLVED (PLO-008/PLO-009)` |
| Fully automatic tool-approval modes are disabled in UI and marked "Coming soon". | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/four-pane/ai-settings-view.tsx:121`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/four-pane/ai-settings-view.tsx:134`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/four-pane/ai-settings-view.tsx:152`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md` (`PLO-012`) | `INTENTIONAL_GUARDRAIL (approval-gated calling)` |
| Historical pre-PRD autonomy baseline used per-agent values (`supervised`/`autonomous`/`draft_only`); superseded by canonical runtime contract (`supervised`/`sandbox`/`autonomous`/`delegation`) and `appointment_booking=sandbox` domain default. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md` (`YAI-008`); `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md` (`PLO-010`) | `RESOLVED (YAI-008 + PLO-010)` |
| Work/private mode behavior was originally tracked as future-required for appointment runtime; this queue now consumes core mode/guardrail contracts from `YAI-006` with approval/compliance enforcement retained in `PLO-012`. | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md` (`YAI-006`); `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md` (`PLO-012`) | `RESOLVED (consumed contract)` |

### Supersession note (2026-02-25 closeout)

1. The stale pre-PRD autonomy wording above is retained only as historical baseline context and is not an active blocker.
2. Canonical autonomy language for this queue is `supervised`/`sandbox`/`autonomous`/`delegation`, with legacy `draft_only` accepted only as an alias normalized to `sandbox`.
3. Remaining rollout constraint is intentional: outbound appointment calling stays explicit HITL approval-gated (`PLO-012`) rather than fully automatic.

### Historical product answer on 2026-02-24 baseline

`Partially.` Calendar sync, booking objects/workflows, and voice runtime foundations are present. Production-safe autonomous appointment completion via outbound phone calling is not present yet.

---

## Acceptance contract freeze (`PLO-002`)

### Scenario scope

1. Hair appointment booking mission.
2. Dermatologist appointment booking mission.

### Default autonomy and mode policy

1. Domain key: `appointment_booking`.
2. Default domain autonomy at template seed/runtime start: `sandbox`.
3. `work` mode expectation: tool-enabled planning + booking mutation attempts allowed only within queue-defined approval gates.
4. `private` mode expectation: advisory-only; no external outreach/call side effects or booking mutations.
5. Any call fallback remains blocked until explicit consent + approval artifacts exist.

### LOC-008 memory graph + permission ladder adoption (appointment domain)

This queue consumes the one-agent-core `LOC-008` contract and applies stricter appointment-domain policy where required.

1. Appointment-domain memory graph nodes:
   `mission_artifact`, `availability_snapshot`, `contact_outreach_preference`, `outreach_attempt`, `approval_artifact`, `booking_outcome`, `rollback_artifact`.
2. Domain scope envelope remains mandatory on each durable node:
   `organizationId`, `channel`, `contact`, `route`, `appointment_booking`.
3. Permission ladder semantics in this domain:
   - `suggest`: advisory plan only; no outreach mutation.
   - `ask`: draft outreach/call plan plus approval request.
   - `delegated_auto`: asynchronous outreach (`sms`/`email`/messaging) allowed within policy limits.
   - `full_auto`: still cannot bypass explicit call-consent + approval artifacts for outbound phone-call fallback.
4. Rollback guarantees:
   - queued outreach cancellations must be logged as rollback artifacts,
   - booking-hold reversals must preserve pre-state + post-state evidence,
   - rollback artifacts must be trust-linked and reconstructable in timeline evidence.
5. Any missing consent/scope/provenance artifact fails closed and blocks execution.

### Deterministic retry policy

1. Attempt ladder order: asynchronous outreach first (`sms`/`email`/`messaging`), phone call fallback only after explicit approval.
2. Minimum asynchronous attempts before call fallback: 2 (when two channels exist).
3. Maximum total attempts per mission: 4.
4. Retry window: bounded to 48 hours from mission start.
5. Call fallback timing guard: local business-hours only; never back-to-back retries inside the same attempt window.

### Measurable success criteria (must be testable)

| ID | Requirement | Pass condition | Evidence artifact |
|---|---|---|---|
| `PO-SLA-01` | Mission intake contract | Structured mission record contains service type, date window, location preference, and contact method constraints before first outbound action. | Mission payload + normalized constraints snapshot. |
| `PO-SLA-02` | Calendar-awareness gate | Calendar availability check runs before first outbound attempt and is referenced in mission plan. | Calendar check record + referenced connection/resource IDs. |
| `PO-SLA-03` | Attempt ladder determinism | Attempt log shows ordered channel escalation with timestamps and deterministic reason codes for each retry. | Attempt timeline with `attemptIndex`, `channel`, `reason`, `result`. |
| `PO-SLA-04` | Approval boundary for calling | Any phone-call attempt has explicit approval decision + consent disclosure metadata before execution. | Approval event ID + consent record + call request envelope. |
| `PO-SLA-05` | Outcome closure | Each scenario ends within 48 hours as either `BOOKED` (slot + provider confirmation) or `UNRESOLVED_WITH_REASON` (explicit blocker taxonomy). | Outcome object + final status reason. |
| `PO-SLA-06` | Audit completeness | End-to-end evidence package can be reconstructed without inference for every external action. | Unified artifact bundle: mission, attempts, approvals, transcript snippets/outcomes, final booking/cancel state. |

### Definition of done for lane-gate release

1. `PLO-001` and `PLO-002` are both `DONE` with `V-DOCS` pass evidence.
2. Capability claims remain split as `AVAILABLE_NOW` vs historical future-required baseline, with superseded gaps explicitly marked as resolved.
3. `appointment_booking` default and `work`/`private` expectations are explicitly frozen in this file.
4. Lane `B`/`C` work may start only after this contract remains unchanged unless queue-approved amendment is recorded.

---

## PRD v1.3 delta integration

Source:
`/Users/foundbrand_001/Development/vc83-com/docs/prd/YOUR_AI_PRD.md`

This queue consumes core `YAI` contracts for:

1. one-agent config defaults (`unifiedPersonality`, team-access behavior),
2. work/private mode and archetype guardrails,
3. domain-scoped autonomy progression,
4. personal/business org context switching constraints.

Ownership retained here:

1. personal-operator template behavior in `seedPlatformAgents.ts` and `toolScoping.ts`,
2. outbound appointment execution policy and call compliance,
3. pilot evidence for real appointment scenarios.

---

## Screen implementation plan

### Screen 1: Personal Operator Setup

Purpose:

1. Connect Google Calendar.
2. Capture default outreach preferences and allowed hours.
3. Choose deployment path (`Webchat`, `Telegram`, `Both`).

Primary lane: `B` (`PLO-003`)

### Screen 2: Agent Coverage

Purpose:

1. Show which agents are active now.
2. Show capability gaps for desired outcomes.
3. Offer one-click recommendation to add missing specialist templates.

Primary lane: `B` (`PLO-004`) and `E` (`PLO-011`)

### Screen 3: Appointment Mission Console

Purpose:

1. Capture appointment intent and hard constraints.
2. Show attempt ladder (email/SMS/call) before execution.
3. Display approval checkpoints before high-impact actions.

Primary lanes: `D` and `F`

### Screen 4: Call/Outreach Timeline

Purpose:

1. Show each outreach attempt with status and timestamps.
2. Display transcript snippets and failure reasons.
3. Preserve redaction and trust-event parity.

Primary lane: `F` (`PLO-013`)

---

## Phase map

1. **Phase 1 (reality + contract):** `PLO-001`, `PLO-002`.
2. **Phase 2 (screen and integration foundations):** `PLO-003`..`PLO-006`.
3. **Phase 3 (execution runtime):** `PLO-007`..`PLO-009`.
4. **Phase 4 (agent template + recommendation):** `PLO-010`, `PLO-011`.
5. **Phase 5 (trust/compliance hardening):** `PLO-012`, `PLO-013`.
6. **Phase 6 (pilot + closeout):** `PLO-014`..`PLO-017`.

---

## Risk ledger

1. **Compliance risk:** outbound medical-office calling without explicit consent/recording policy.
   Mitigation: gate outbound calling behind explicit approval + compliance policy (`PLO-012`).
2. **Execution risk:** duplicate outreach and conflicting bookings.
   Mitigation: idempotent attempt keys + bounded retries (`PLO-007`, `PLO-009`).
3. **Expectation risk:** UI promises autonomy beyond implemented behavior.
   Mitigation: align setup/welcome copy to real behavior and label planned capability clearly (`PLO-003`, `PLO-004`).
4. **Security risk:** scope creep beyond existing BYOA boundaries.
   Mitigation: additive contracts only; no credential model rewrites (`PLO-005`, lane policies).
5. **Cross-org leakage risk:** personal-context data bleeding into business-context views.
   Mitigation: consume `YAI-007` org-isolation contract and validate via `PLO-016`.

---

## Exit criteria

1. All `P0` rows are `DONE` or `BLOCKED` with reasons.
2. Pilot scenarios complete with deterministic evidence artifacts.
3. `npm run docs:guard` passes at closeout.
4. Launch recommendation includes explicit constraints if any `P1` rows remain open.
