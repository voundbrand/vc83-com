# Capability Pack Taxonomy

**Status:** Active contract (`LOC-011` complete)  
**Last updated:** 2026-02-26

Purpose:

1. Convert the 104-row catalog into deterministic capability packs.
2. Keep one visible primary operator in UX.
3. Route specialist depth behind the scenes by pack, not by exposing multi-agent complexity.

Canonical behavior contract:

`prompt + memory + policy + tools + eval + trust`

`Soul` meaning in this taxonomy:

1. A soul is behavioral packaging for operator/specialist context.
2. Soul flavor is secondary to deterministic layers, trust controls, and outcomes.

---

## Deterministic Pack Schema (Canonical)

| Field | Description |
|---|---|
| `packId` | Stable identifier (example: `pack_exec_daily_checkup`) |
| `userIntentTags` | Canonical intents handled by the pack |
| `defaultHiddenSpecialists` | Catalog slices used behind the operator by default |
| `requiredContext` | Inputs/state required before execution |
| `toolChain` | Ordered tools for execution |
| `approvalProfile` | `suggest` / `ask` / `delegated_auto` / `full_auto` |
| `trustEvents` | Required audit events for sensitive/mutating steps |
| `availabilityContract` | Deterministic `available_now` vs `blocked` contract |
| `demoHook` | Crisp observable moment for founder demo |

Availability contract invariants:

1. Pack status is only `available_now` or `blocked`.
2. `blocked` must include concrete unblocking steps.
3. Unknown prerequisites fail closed to `blocked`.
4. Mutating flows remain approval/trust-governed.

---

## Catalog Slice Mapping (104-Row Source)

| `packId` | Source slices (`AGENT_PRODUCT_CATALOG`) | Primary intent tags |
|---|---|---|
| `pack_personal_inbox_defense` | `7-34`, `49-62`, `91-104` | `provider_or_client_outreach`, `retention_and_reviews` |
| `pack_wearable_operator_companion` | `1-6`, `49-62` | `platform_operations`, `program_or_session_tracking` |
| `pack_exec_daily_checkup` | `1-6`, `21-34`, `63-76` | `platform_operations`, `financial_modeling`, `resource_capacity_planning` |
| `pack_visual_todo_shopping` | `1-6`, `49-62`, `91-104` | `program_or_session_tracking`, `inventory_restock_or_fulfillment` |
| `pack_note_capture_memory` | `1-6`, `49-62`, `63-76` | `case_or_account_brief`, `platform_operations` |
| `pack_vacation_delegate_guard` | `35-48`, `63-76` | `resource_capacity_planning`, `reschedule_conflict`, `compliance_hold` |
| `pack_event_manager_full_lifecycle` | `1-6`, `21-34`, `49-76` | `platform_operations`, `provider_or_client_outreach`, `document_or_quote_packet` |

---

## Founder Demo Pack Registry (Final v1)

### `pack_personal_inbox_defense`

1. `requiredContext`: inbox linkage, allow/deny rule set, escalation contacts.
2. `toolChain`: inbox classification -> priority tagging -> spam defense -> escalation router.
3. `approvalProfile`: `ask` for new auto-rules, `delegated_auto` for existing known-safe spam rules.
4. `trustEvents`: rule-create approval event, escalation emit event, audit summary event.
5. `availabilityContract.available_now`: inbox linked, at least one customer-support/sales specialist active, trust approvals enabled.
6. `availabilityContract.blocked`: inbox linkage missing, specialist coverage missing, or inbox prerequisite unknown.
7. `availabilityContract.unblockingSteps`: connect inbox provider, create specialist coverage, confirm rule baseline.
8. `demoHook`: defend inbox and show urgent-only queue with explicit rationale.

### `pack_wearable_operator_companion`

1. `requiredContext`: active session objective, wearable/mobile capture permissions.
2. `toolChain`: live AV ingress -> context memory update -> operator planning loop.
3. `approvalProfile`: `ask`.
4. `trustEvents`: memory-write checkpoint event.
5. `availabilityContract.available_now`: general specialist coverage active and AV permissions verified.
6. `availabilityContract.blocked`: AV permission prerequisites unknown or missing coverage.
7. `availabilityContract.unblockingSteps`: grant camera/mic permissions, open live session, add general specialist coverage.
8. `demoHook`: in-the-moment guidance with explicit “what I learned and stored” recap.

### `pack_exec_daily_checkup`

1. `requiredContext`: KPI inputs, inbox/calendar summaries, due-task ledger, risk thresholds.
2. `toolChain`: daily briefing synthesis -> prioritization -> follow-up routing.
3. `approvalProfile`: `ask` for outbound actions, `delegated_auto` for internal summaries.
4. `trustEvents`: outbound-approval event, daily-checkpoint event.
5. `availabilityContract.available_now`: calendar + messaging integrations connected and general/sales coverage active.
6. `availabilityContract.blocked`: missing integrations, missing coverage, or unresolved compliance hold.
7. `availabilityContract.unblockingSteps`: connect calendar/messaging integrations, create missing specialist coverage, clear hold via trust policy.
8. `demoHook`: produce morning executive brief with owners, actions, and risks.

### `pack_visual_todo_shopping`

1. `requiredContext`: visual capture permissions, list destination, store preference.
2. `toolChain`: visual capture -> item extraction -> list sync -> reminder routing.
3. `approvalProfile`: `ask` for purchase/outbound steps.
4. `trustEvents`: capture-consent checkpoint event, mutation-approval event.
5. `availabilityContract.available_now`: general specialist coverage active and visual pipeline verified.
6. `availabilityContract.blocked`: camera/capture prerequisite unknown or coverage missing.
7. `availabilityContract.unblockingSteps`: enable device capture permissions, verify visual extraction pipeline, add general specialist coverage.
8. `demoHook`: convert live capture into synced todo/shopping entries.

### `pack_note_capture_memory`

1. `requiredContext`: note source (audio/text), destination notebook, tag rules.
2. `toolChain`: capture -> summarization -> structured storage -> retrieval hooks.
3. `approvalProfile`: `ask` for external sharing.
4. `trustEvents`: memory-write event, share-approval event (when outbound).
5. `availabilityContract.available_now`: general specialist coverage active.
6. `availabilityContract.blocked`: coverage missing or storage prerequisite unknown.
7. `availabilityContract.unblockingSteps`: create general specialist coverage, set default note destination.
8. `demoHook`: produce structured notes with decisions/actions and retrieval cue.

### `pack_vacation_delegate_guard`

1. `requiredContext`: Slack workspace/channel, Google Calendar connection, owner-approved vacation policy (`maxConcurrentAway`, blocked periods, minimum on-duty pharmacist coverage), and team roster.
2. `toolChain`: Slack request intake -> calendar overlap + capacity check -> policy/rule evaluator -> conflict mediation response -> approval/decision logging -> calendar mutation (approved only).
3. `approvalProfile`: `delegated_auto` for conflict analysis + draft alternatives, `ask` for policy changes and over-capacity override requests.
4. `trustEvents`: vacation-request intake event, conflict-evaluation event, approval/decline decision event, calendar-write event.
5. `availabilityContract.available_now`: Slack integration connected, Google Calendar read/write readiness verified, vacation policy configured, and team coverage roster loaded.
6. `availabilityContract.blocked`: missing Slack integration, missing Google Calendar readiness, missing policy/coverage setup, or unknown prerequisite state.
7. `availabilityContract.unblockingSteps`: connect Slack channel, connect Google Calendar, configure policy caps/blackout windows/coverage floor, sync team roster and role tags.
8. `demoHook`: teammate requests vacation in Slack and receives a policy-grounded approve/conflict response with alternative windows and a direct-colleague discussion suggestion when conflicts exist.

### `pack_event_manager_full_lifecycle`

1. `requiredContext`: event title/date/location/capacity, ticket tiers, checkout form fields, billing target, and template-set defaults.
2. `toolChain`: list events -> create/update event -> create registration form -> create ticket products -> create checkout page -> publish assets -> create/send invoice -> verify checkout fulfillment evidence.
3. `approvalProfile`: `ask` for publish/send steps, `delegated_auto` for draft object assembly and non-mutating checks.
4. `trustEvents`: publish checkpoint event, invoice-send approval event, checkout-activation event, fulfillment dispatch audit event.
5. `availabilityContract.available_now`: event/product/form/checkout/invoice tools enabled, Stripe + Resend connected, template set configured.
6. `availabilityContract.blocked`: missing tool/integration/template prerequisites, unknown prerequisite state, or explicit request for event-flow sandbox dry-run autonomy (not implemented).
7. `availabilityContract.unblockingSteps`: enable missing tools, connect Stripe/Resend, configure template set, and run staged draft/publish rehearsal until sandbox dry-run lane exists.
8. `demoHook`: produce a live checkout URL with custom form + ticket tiers, send invoice from the same flow, and show ticket-delivery fulfillment evidence.

---

## LOC-013 Playbook Alignment Contract (Deterministic)

Each founder scenario must map to exactly one capability pack and one hidden-specialist route chain.

| Scenario ID | Founder scenario | `packId` | Hidden specialist route chain | Deterministic preflight gate |
|---|---|---|---|---|
| `FND-001` | Email agent / spam filter personal assistant | `pack_personal_inbox_defense` | `inbox_triage_specialist -> spam_rule_guard_specialist -> escalation_router_specialist` | `available_now` only when inbox/rules/escalation context are known good; otherwise `blocked` with concrete unblocking steps |
| `FND-002` | Work-with-me learning assistant (pocket + Meta glasses) | `pack_wearable_operator_companion` | `av_context_ingest_specialist -> memory_update_specialist -> live_coaching_specialist` | `available_now` only when AV/session prerequisites are verified; otherwise `blocked` fail-closed |
| `FND-003` | Actionable business administration (proactive daily executive checkup) | `pack_exec_daily_checkup` | `kpi_synthesis_specialist -> risk_rank_specialist -> followup_router_specialist` | `available_now` only when KPI + integration + hold-state prerequisites are verified; otherwise `blocked` fail-closed |
| `FND-004` | Todo/shopping list from Meta glasses + iPhone camera | `pack_visual_todo_shopping` | `vision_extract_specialist -> list_normalization_specialist -> reminder_router_specialist` | `available_now` only when visual pipeline and destination prerequisites are verified; otherwise `blocked` fail-closed |
| `FND-005` | Note taker | `pack_note_capture_memory` | `capture_transcribe_specialist -> structure_summary_specialist -> memory_index_specialist` | `available_now` only when capture source + destination prerequisites are verified; otherwise `blocked` fail-closed |
| `FND-006` | Pharmacist vacation scheduler in Slack (policy-based approval + conflict mediation) | `pack_vacation_delegate_guard` | `vacation_policy_specialist -> calendar_conflict_specialist -> colleague_resolution_specialist` | `available_now` only when Slack + Google Calendar + policy/coverage prerequisites are verified; otherwise `blocked` fail-closed |
| `FND-007` | Complete event manager workflow (event setup, checkout + custom forms, ticket tiers, invoice send, ticket fulfillment evidence) | `pack_event_manager_full_lifecycle` | `event_design_specialist -> checkout_orchestration_specialist -> fulfillment_audit_specialist` | `available_now` only when event/product/form/checkout/invoice prerequisites and integrations are verified; explicit sandbox dry-run requests fail closed to `blocked` with fallback steps |

Alignment invariants:

1. One visible operator UX only across all seven scenarios.
2. `available_now`/`blocked` output is mandatory before execution.
3. Unknown prerequisites always resolve to `blocked`.
4. Mutating actions remain approval-governed and trust-event auditable.
5. Playbook checkpoints in `DEMO_PLAYBOOKS.md` are the deterministic pass/fail source of truth for demo execution.

---

## Non-Negotiable Runtime Rules

1. One visible operator UX only; hidden specialist routing remains default implementation detail.
2. Pack execution must preserve layered behavior contract (`prompt + memory + policy + tools + eval + trust`).
3. Any mutating action requires trust evidence (approval artifact or policy-bound auto path).
4. Pack status cannot be optimistic; unknown prerequisites always resolve to `blocked`.
