# Tool Requirement Matrix

**Status:** In progress (`AGP-005`, `AGP-006`, `AGP-012`, and `AGP-018` complete)  
**Last updated:** 2026-02-26

This document captures:

1. existing tool-system baseline (from current code),
2. net-new tool gaps for 104-book-agent coverage,
3. finalized vertical profile expansion contracts,
4. one-agent access-mode and work/private tool mutability constraints,
5. behavioral-system enforcement for the `tools` layer under soul contracts.

Implementation control surface:

1. Master tracker: `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/IMPLEMENTATION_OVERVIEW.md`
2. Agent-level dependency consumer: `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/AGENT_PRODUCT_CATALOG.md`
3. Seed-level dependency consumer: `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/SOUL_SEED_LIBRARY.md`
4. Behavioral contract: `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/BEHAVIORAL_SYSTEM_CONTRACT.md`

---

## Behavioral-System Layer Alignment (`LOC-007`)

1. This matrix owns the `tools` layer of the canonical stack: `prompt + memory + policy + tools + eval + trust`.
2. Tool requirements in this doc are valid only when paired with policy, eval, and trust constraints; prompt-only differentiation is non-compliant.
3. Any proposed tool must declare mutability defaults, approval/autonomy behavior, and trust-audit expectations.
4. A `soul` that references these tools is considered complete only when tool boundaries here align with seed metadata and runtime trust gates.

## Founder Demo Pack Tool Contract (`LOC-011`)

Capability-pack source of truth:
`/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/CAPABILITY_PACK_TAXONOMY.md`

The seven founder demo packs depend on this matrix for deterministic tool + trust behavior:

| `packId` | Required tool chain (minimum) | Integration minimum | Trust/approval floor |
|---|---|---|---|
| `pack_personal_inbox_defense` | classification + prioritization + escalation routing | messaging + inbox connector | approval for new automation rules; trust event on rule writes |
| `pack_wearable_operator_companion` | AV ingress + memory update + planning loop | AV device permission contract | memory-write checkpoint required |
| `pack_exec_daily_checkup` | briefing synthesis + follow-up routing + prioritization | calendar + messaging | approval for outbound actions; trust event on dispatch |
| `pack_visual_todo_shopping` | visual capture + extraction + list sync | camera/visual pipeline | approval for purchase/outbound effects |
| `pack_note_capture_memory` | note capture + summarization + structured storage | optional storage connector | approval for external share; trust event on memory write |
| `pack_vacation_delegate_guard` | Slack vacation intake + calendar overlap/capacity check + policy evaluator + conflict-mediation response | `slack`, Google Calendar | delegated-auto for analysis/draft alternatives only; approval for policy edits and over-capacity overrides; trust event on decision + calendar mutation |
| `pack_event_manager_full_lifecycle` | event create/update + ticket product setup + custom-form checkout + publish + invoice send + fulfillment verification | `stripe`, `resend`, template-set readiness | approval for publish/send mutations; trust event on publish, invoice dispatch, and fulfillment evidence |

Deterministic availability rule:

1. Pack status is only `available_now` or `blocked`.
2. Unknown prerequisites fail closed to `blocked`.
3. `blocked` outputs must include concrete unblocking steps.
4. Event-flow sandbox dry-run autonomy is currently unsupported; explicit requests must fail closed to `blocked` with staging fallback steps.

---

## A) Existing Tool Audit Baseline

Current registry snapshot (code-backed):

1. `TOOL_REGISTRY` keys: `75` (`convex/ai/tools/registry.ts`)
2. `INTERVIEW_TOOLS` keys: `12` (`convex/ai/tools/interviewTools.ts`)
3. Unique currently modeled tools: `87`

Current profile/scoping baseline (`convex/ai/toolScoping.ts`):

1. `general`
2. `support`
3. `sales`
4. `booking`
5. `readonly`
6. `admin`

Current integration requirement map:

1. `stripe` (invoice/payment/checkout tools)
2. `resend` (email tools)
3. `unsplash` (image-search tool)
4. `activecampaign`
5. `microsoft` (contact sync/calendar)

Already shipped capability anchors (do not duplicate as "new"):

| Capability | Existing evidence |
|---|---|
| Provider-agnostic model registry + auth profile resolution | `BMF-005`, `BMF-007`, `BMF-008` |
| Model conformance gates and quality thresholds | `BMF-015` |
| Voice provider runtime foundation | `BMF-016`, `VAC` |
| Template specialist seeding + clone factory | `OCO-008`, `OCO-009` |
| Soul v2 evolution overlays + owner approval loop | `OCO-010`, `OCO-011` |
| Trust telemetry + rollout guardrails | `ATX-013`, `ACE-010`, `ACE-011` |

Current matrix readiness:

1. Baseline audit is complete (`AGP-005` done).
2. Net-new gap matrix + seven vertical profile contracts are complete (`AGP-006` done).
3. Proposed tools below remain design/runtime backlog items until downstream implementation rows pick them up.

---

## A1) One-Agent Access and Mode Constraints

PRD v1.3 requires tools to respect both specialist access mode and soul mode:

Contract guardrails for this section:

1. Access-mode semantics below consume `YAI-003`/`YAI-004` runtime contracts (`teamAccessMode` + primary-governed delegation authority); this matrix does not redefine runtime routing.
2. Primary-agent-first packaging is mandatory: specialist tool execution starts on the primary path unless explicit `direct`/`meeting` mode is selected.
3. `meeting` mode is advisory by default; no mutation is valid unless it takes an explicit approved mutation path under primary authority.
4. Dream Team specialist tooling remains attached to soul-powered agents and must not be flattened into KB-only snippet behavior.

| Dimension | Allowed behavior | Tool implication |
|---|---|---|
| `invisible` specialist mode (default) | Primary agent invokes specialist depth behind the scenes | Mutating tools still follow approval/autonomy policy; no hidden escalation bypass |
| `direct` specialist mode | User explicitly talks to specialist | Specialist can expose deeper tooling within scoped profile, but mutations still require explicit approved path under primary authority |
| `meeting` specialist mode | Multiple specialists weigh in; primary agent synthesizes | Advisory synthesis only; no implicit commits or hidden writes from meeting thread |
| `work` soul mode | Full business operations path | Mutation-capable tools can run per autonomy/trust constraints |
| `private` soul mode | Reflective/advisory path | Default to `readonly`/advisory tools; no silent CRM/booking mutations |

---

## B) Net-New Tool Gap Matrix (Finalized for `AGP-006`)

`Status` legend:

1. `proposed` = defined contract, not yet shipped in runtime.
2. `scoped` = proposal exists and is anchored to specific agent IDs/profiles.

### Universal tools (10+ agents)

| Tool Name | Cluster | Candidate agents | Inputs | Outputs | Integrations | Work mode default | Private mode default | Approval/autonomy | Status |
|---|---|---|---|---|---|---|---|---|---|
| `schedule_callback` | universal | `35-48`, `77-90` (optional expansion: `7-20`, `49-62`) | `contactId`, `timezone`, `preferredWindows`, `reason`, `availabilityModel` | callback booking record, confirmation payload, reminder plan | `resend`, `microsoft` | booking mutation allowed with approval | advisory only; no booking mutation | `requires_approval` on create/update/cancel | `proposed` |
| `summarize_case_or_account_brief` | universal | `2`, `7-34`, `63-104` | thread IDs, object IDs, optional doc refs | structured brief (`summary`, risks, next actions) | none required | readonly auto execution | readonly auto execution | `auto_execute` with audit event | `proposed` |
| `generate_quote_or_scope_pdf` | universal | `77-90` (optional expansion: `63-76`) | line items, tax rules, terms, customer context | versioned PDF artifact + share token | `stripe` (optional for price hydration), `resend` (optional send) | document generation allowed; external send requires approval | disabled by default | `requires_approval` for external delivery | `proposed` |
| `log_outcome_and_followup` | universal | `7-34` | conversation ID, disposition, owner, due date, SLA | CRM/workflow outcome record + follow-up task | `activecampaign`, `microsoft` (optional) | internal write allowed | readonly notes only; no CRM write | `auto_execute` for internal write; approval for outbound follow-up send | `proposed` |
| `compliance_hold_and_escalate` | universal | `7-20`, `21-34`, `35-48` | policy signal, severity, blocked action context | trust event, hold artifact, escalation work item | none required | hard-stop + escalate | hard-stop + escalate | `auto_execute` hard-stop (no bypass) | `proposed` |

### Vertical-specific tools (3+ agents in one vertical)

| Tool Name | Cluster | Candidate agents | Inputs | Outputs | Integrations | Work mode default | Private mode default | Approval/autonomy | Status |
|---|---|---|---|---|---|---|---|---|---|
| `track_case_deadline` | legal | `7-20` | matter ID, jurisdiction, trigger date, rule set | deadline timeline, reminder queue, breach-risk flag | `microsoft`, `resend` (optional alerts) | allowed with approval for external notifications | readonly timeline view only | `requires_approval` for client-facing alerts | `scoped` |
| `draft_legal_document_packet` | legal | `10`, `13`, `18` | template ID, matter context, clause set | draft packet + review checklist | none required | draft generation allowed; publish/send gated | disabled | `requires_approval` for export/send | `proposed` |
| `calculate_unit_economics` | finance | `21-34` | revenue assumptions, cost drivers, scenario params | margin/payback model + sensitivity table | `stripe` (optional pricing inputs) | readonly + scenario modeling | readonly only | `auto_execute` | `scoped` |
| `portfolio_risk_alert` | finance | `21-34` | holdings snapshot, thresholds, risk policy | alert object + risk summary | `resend` (optional alert dispatch) | risk evaluation allowed; alert send gated | readonly dashboard only | `requires_approval` for outbound alerts | `proposed` |
| `care_plan_followup_scheduler` | health | `35-48` | patient plan ID, cadence rules, escalation thresholds | follow-up schedule + reminder tasks | `microsoft`, `resend` | schedule mutation allowed with approval | advisory schedule only | `requires_approval` | `scoped` |
| `session_program_tracker` | coaching | `49-62` | program ID, milestones, homework signals | adherence scorecard + session prep deltas | `resend` (optional nudges) | internal tracking allowed | readonly coaching journal view | `auto_execute` internal; approval for outbound nudges | `scoped` |
| `resource_capacity_allocator` | agency | `63-76` | project load, team capacity, skill tags, dates | allocation recommendation + conflict flags | `microsoft` (calendar sync optional) | planning writes allowed | readonly planning view | `requires_approval` for assignment commits | `scoped` |
| `job_material_estimator` | trades | `77-90` | job type, measurements, unit costs, waste factors | material estimate + confidence range | none required | estimate generation allowed | advisory only | `auto_execute` | `scoped` |
| `abandoned_cart_recovery_trigger` | ecommerce | `91-104` | cart/session ID, wait window, campaign template | recovery flow run + attribution metrics | `activecampaign`, `resend`, `stripe` | outbound trigger allowed with approval | disabled | `requires_approval` | `scoped` |
| `inventory_restock_alert` | ecommerce | `91-104` | SKU velocity, on-hand qty, reorder rules | restock alert + reorder recommendation | `activecampaign` (optional), ERP bridge optional | internal alerting allowed | readonly inventory watchlist | `auto_execute` internal; approval for supplier outreach | `scoped` |

### Specialist tools (1-2 agents)

| Tool Name | Cluster | Candidate agents | Inputs | Outputs | Integrations | Work mode default | Private mode default | Approval/autonomy | Status |
|---|---|---|---|---|---|---|---|---|---|
| `opposing_counsel_profile_brief` | specialist/legal | `14` | opposing counsel identity, case type, jurisdiction | structured tendencies brief + risk notes | none required | readonly analysis | readonly analysis | `auto_execute` | `proposed` |
| `settlement_range_simulator` | specialist/legal-finance | `15` (optional: `5`) | BATNA inputs, cost/risk assumptions, concession bounds | settlement range table + recommended strategy bands | none required | simulation allowed; outbound recommendation gated | readonly simulation only | `requires_approval` for client-facing recommendation | `proposed` |
| `courtroom_rehearsal_simulator` | specialist/legal | `16` | hearing type, argument packet, persona settings | rehearsal transcript + scoring rubric | none required | simulation allowed | disabled | `requires_approval` for saved rehearsal artifacts shared externally | `proposed` |
| `diagnostic_treatment_plan_explainer` | specialist/health | `36`, `41`, `47` | treatment plan, diagnosis context, language level | plain-language explanation + safety warnings | none required | explanation draft allowed; patient send gated | disabled | `requires_approval` | `proposed` |
| `marketplace_listing_sync` | specialist/ecommerce | `100`, `104` (optional: `91-99`) | SKU metadata, channel policy, price/inventory payload | channel sync result + drift report | channel connectors (future), `activecampaign` optional | channel mutation allowed with approval | disabled | `requires_approval` | `proposed` |

---

## C) Finalized Vertical Tool Profile Contracts (7)

| Profile | Agent coverage | Base shipped profiles | Shipped tool baseline (from D1) | Proposed additions (from section B) | Integration contract | Booking ontology binding | Default mutability policy |
|---|---|---|---|---|---|---|---|
| `legal` | `7-20` | `support` + `admin` + `readonly` | `run_platform_productivity_loop`, `escalate_to_human` | `track_case_deadline`, `log_outcome_and_followup`, `draft_legal_document_packet`, `compliance_hold_and_escalate` | `resend`, `microsoft` (optional) | `appointment` on `time_slot` for consultations/callbacks | Work: approval-gated client-facing writes. Private: readonly only. |
| `finance` | `21-34` | `sales` + `admin` + `readonly` | `run_eval_analyst_checks`, `escalate_to_human` | `calculate_unit_economics`, `portfolio_risk_alert`, `log_outcome_and_followup`, `compliance_hold_and_escalate` | `stripe`, `resend`, `microsoft` (optional) | `appointment` on `time_slot` for review meetings | Work: approval-gated outbound actions. Private: readonly only. |
| `health` | `35-48` | `support` + `booking` + `readonly` | `run_platform_productivity_loop`, `escalate_to_human` | `care_plan_followup_scheduler`, `schedule_callback`, `diagnostic_treatment_plan_explainer`, `compliance_hold_and_escalate` | `resend`, `microsoft` | `appointment` (`time_slot`) and optional `class_enrollment` | Work: all patient-facing mutations require approval. Private: no outbound/booking mutations. |
| `coaching` | `49-62` | `booking` + `support` + `readonly` | `create_template`, `send_email_from_template`, `escalate_to_human` | `session_program_tracker`, `schedule_callback`, `summarize_case_or_account_brief` | `resend`, `microsoft` (optional) | `appointment` + `class_enrollment` on `time_slot` | Work: outbound messaging approval-gated. Private: readonly notes/advice only. |
| `agency` | `63-76` | `general` + `admin` + `readonly` | `create_page`, `publish_page`, `escalate_to_human` | `resource_capacity_allocator`, `generate_quote_or_scope_pdf`, `summarize_case_or_account_brief` | `resend`, `unsplash`, `microsoft` (optional) | `appointment` on `time_slot` for client/project meetings | Work: publish/assignment writes require approval. Private: readonly only. |
| `trades` | `77-90` | `sales` + `booking` + `readonly` | `escalate_to_human` (plus shipped billing tools as optional overlays) | `generate_quote_or_scope_pdf`, `job_material_estimator`, `schedule_callback`, `compliance_hold_and_escalate` | `stripe`, `resend`, `microsoft` (optional) | `appointment`/`reservation` on `time_slot`; `rental` on `date_range_inventory` where applicable | Work: quote/schedule/payment mutations require approval. Private: no mutation path. |
| `ecommerce` | `91-104` | `sales` + `support` + `readonly` | `list_products`, `escalate_to_human` | `abandoned_cart_recovery_trigger`, `inventory_restock_alert`, `marketplace_listing_sync`, `summarize_case_or_account_brief` | `stripe`, `resend`, `activecampaign` | `reservation` (`time_slot`) for pickup windows; `date_range_inventory` for stock holds; optional `departure_bound` with `departureId` when modeled | Work: campaign/listing changes require approval. Private: readonly only. |

---

## D) D1 Coverage Resolution (`AGP-006` close gate)

Deterministic coverage checks from `/docs/prd/souls/AGENT_PRODUCT_CATALOG.md`:

1. Agent rows with concrete required tools: `104 / 104`.
2. Proposed-tool coverage mapped in D1 rows:

| Proposed tool in D1 | Agent count | Agent IDs |
|---|---:|---|
| `track_case_deadline [proposed]` | `14` | `7-20` |
| `log_outcome_and_followup [proposed]` | `28` | `7-34` |
| `calculate_unit_economics [proposed]` | `14` | `21-34` |
| `care_plan_followup_scheduler [proposed]` | `14` | `35-48` |
| `schedule_callback [proposed]` | `28` | `35-48`, `77-90` |
| `session_program_tracker [proposed]` | `14` | `49-62` |
| `resource_capacity_allocator [proposed]` | `14` | `63-76` |
| `generate_quote_or_scope_pdf [proposed]` | `14` | `77-90` |
| `job_material_estimator [proposed]` | `14` | `77-90` |
| `abandoned_cart_recovery_trigger [proposed]` | `14` | `91-104` |
| `inventory_restock_alert [proposed]` | `14` | `91-104` |

3. Specialist overlays not yet required in D1 rows (kept as scoped proposals):
   - `opposing_counsel_profile_brief`, `settlement_range_simulator`, `courtroom_rehearsal_simulator`, `diagnostic_treatment_plan_explainer`, `marketplace_listing_sync`.

---

## E) Access-Mode + Work/Private Mutability Defaults

| Tool cluster | `invisible` mode | `direct` mode | `meeting` mode | Work mode | Private mode | Minimum approval |
|---|---|---|---|---|---|---|
| Readonly analysis (`summarize_*`, risk/brief tools) | primary invokes silently | specialist may show details | advisory synthesis only | `auto_execute` allowed | `auto_execute` allowed | audit event only |
| Internal workflow writes (`log_outcome_and_followup`, tracker/allocation internals) | primary executes internal writes | specialist can propose/execute within profile scope | primary synthesizes; no implicit commits | internal writes allowed | readonly only | approval for outbound effects |
| Customer-facing outbound (`schedule_callback`, campaign/review/recovery sends) | primary remains authority | specialist can draft/send after approval | advisory until explicit approval | allowed with approval | disabled by default | `requires_approval` |
| Financial/contract/channel mutations (`generate_quote_or_scope_pdf` send, listing sync, price-impact actions) | no hidden mutations | explicit mutation path only | no mutation from advisory thread | allowed with approval | disabled | `requires_approval` + trust audit |
| Safety/compliance holds (`compliance_hold_and_escalate`) | always enforce | always enforce | always enforce | auto hold + escalation | auto hold + escalation | no bypass; owner/admin clear path only |

Interpretation rule: section `A1` and section `E` define contract semantics, not optional UI labels. If runtime behavior differs, update this matrix to match `YAI` contracts rather than introducing parallel semantics.

---

## F) Booking Ontology Alignment (mandatory)

Source anchors:

1. `convex/bookingOntology.ts`
2. `convex/availabilityOntology.ts`
3. `convex/ai/tools/bookingTool.ts`
4. `convex/ai/tools/bookingWorkflowTool.ts`

Profile-to-ontology bindings for booking-capable flows:

| Profile | Booking subtype(s) | Availability model(s) | Required fields | Conflict semantics |
|---|---|---|---|---|
| `legal` | `appointment` | `time_slot` | `timezone`, `minDuration`, `slotIncrement` | enforce `bufferBefore`/`bufferAfter` + overlap checks |
| `finance` | `appointment` | `time_slot` | `timezone`, `minDuration` | same conflict policy as legal |
| `health` | `appointment`, optional `class_enrollment` | `time_slot`, optional `event_bound_seating` | `timezone`, `capacity`; `eventId` required for `event_bound_seating` | capacity + medical follow-up windows |
| `coaching` | `appointment`, `class_enrollment` | `time_slot`, optional `event_bound_seating` | `timezone`, `capacity`; `eventId` when event-bound | recurring series + attendance-safe capacity checks |
| `agency` | `appointment` | `time_slot` | `timezone`, `slotIncrement` | prevent overbooked internal/resource calendars |
| `trades` | `appointment`, `reservation`, optional `rental` | `time_slot`, `date_range_inventory` | `timezone`, `capacity`, inventory quantity | labor/equipment contention + buffer windows |
| `ecommerce` | `reservation`, optional `rental` | `time_slot`, `date_range_inventory`, optional `departure_bound` | inventory quantity; `departureId` required for `departure_bound` | pickup/fulfillment conflict checks |

Invariant rules:

1. No proposed booking tool may bypass availability conflict checks.
2. `event_bound_seating` always requires `eventId`; `departure_bound` always requires `departureId`.
3. Status progression remains canonical: `pending_confirmation` -> `confirmed` -> `checked_in` -> `completed`.

---

## G) Completion Criteria (`AGP-006`) Status

- [x] Every agent row in D1 has concrete required tools (section `D`).
- [x] Every new-tool row includes inputs, outputs, integration dependencies, mutability, and autonomy defaults (section `B`).
- [x] Seven vertical profile proposals are finalized with explicit shipped-vs-proposed boundaries (section `C`).
- [x] Booking-capable rows map to booking ontology contracts (section `F`).
- [x] Work/private mutability defaults are explicit per tool cluster (section `E`).
- [x] Access-mode semantics do not bypass approval/trust gates (sections `A1`, `E`).
- [x] No already-shipped capability lane is duplicated as "new" (section `A`).

---

## H) Recommender Matrix Scoring + Explanation Contract (`AGP-018`)

This matrix defines deterministic ranking semantics for `AGP-020` resolver implementation and replaces static outcome-to-specialist recommendation maps.

### H1) Weighted scoring signals

`baseScore` is computed in `[0,1]` using normalized signal values:

| Signal | Weight | Deterministic source |
|---|---:|---|
| Intent-match coverage | `0.32` | Overlap between normalized query intents (D1 taxonomy) and row `intentTags` |
| Keyword alias coverage | `0.18` | Overlap between normalized query tokens and row `keywordAliases` |
| Tool coverage readiness | `0.20` | Fraction of required tools currently available (non-`[proposed]` and runtime-known) |
| Integration readiness | `0.15` | Fraction of required integrations connected/available |
| Access-mode compatibility | `0.10` | `1` when requested mode is supported; `0` otherwise |
| Runtime availability | `0.05` | `1` for `available_now`, `0` for `planned` |

Formula:

`baseScore = Σ(weight_i * signal_i)` with weights fixed as above.

Deterministic ordering:

1. Sort by `finalScore` descending.
2. Break ties by lower numeric `agentId`.

### H2) Gap penalties and activation state gates

`finalScore` applies additive penalties (bounded and deterministic):

| Gap condition | Penalty | Activation impact |
|---|---:|---|
| Missing required integration (each, max 3) | `-0.08` | Sets `needs_setup` unless runtime is `planned` |
| Required tool is still `[proposed]` or unavailable (each, max 4) | `-0.06` | Sets `needs_setup` unless runtime is `planned` |
| Requested access mode not supported | `-0.12` | Sets `blocked` |
| Runtime availability is `planned` | `-0.15` | Sets `planned_only` |
| Compliance hold intent present with unresolved hold | `-0.20` | Sets `blocked` |

Penalty rule:

`finalScore = clamp(baseScore + sum(penalties), 0, 1)`

Activation-state contract:

1. `suggest_activation`: runtime is `available_now`, no blocking condition, and no unresolved setup gaps.
2. `needs_setup`: runtime is `available_now` with non-blocking tool/integration gaps.
3. `planned_only`: runtime is `planned` regardless of other non-blocking signals.
4. `blocked`: access-mode mismatch or compliance hold gate.

### H3) Gap-first explanation payload (required shape)

Every ranked result must return a human-readable payload before activation suggestions:

```json
{
  "agentId": "77",
  "agentName": "The Quote Follow-Up Agent",
  "rank": 3,
  "finalScore": 0.67,
  "activationState": "needs_setup",
  "intentEvidence": {
    "matchedIntents": ["document_or_quote_packet", "provider_or_client_outreach"],
    "matchedKeywords": ["quote", "followup"],
    "coverageRatio": 0.75
  },
  "gaps": {
    "runtime": [],
    "integrations": ["stripe"],
    "tools": ["generate_quote_or_scope_pdf"],
    "accessMode": []
  },
  "nextActions": [
    "Connect Stripe to enable quote delivery.",
    "Keep recommendation in advisory mode until quote tool is shipped."
  ]
}
```

### H4) Explanation ordering rules

1. Present `gaps.runtime` first, then `gaps.integrations`, then `gaps.tools`, then `gaps.accessMode`.
2. Show positive signals (`intentEvidence`) only after all current gaps are listed.
3. `nextActions` must map 1:1 to unresolved gap groups and stay actionable.
4. If no gaps exist, include explicit line: `No blocking gaps detected for requested mode.`
