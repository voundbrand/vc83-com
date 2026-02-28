# Demo Playbooks (One Visible Operator, Hidden Specialists)

**Status:** Finalized founder knockout set (`LOC-013`)  
**Last updated:** 2026-02-26

Goal: run seven founder-priority demos that are magical in feel and deterministic in behavior.

## Global run contract

1. One visible operator only. Specialist routing is hidden unless the user asks for internals.
2. Every playbook executes the layered contract: `prompt + memory + policy + tools + eval + trust`.
3. Preflight output must be exactly one of: `available_now` or `blocked`.
4. If any prerequisite is unknown, fail closed to `blocked`.
5. Any mutating action requires trust governance: explicit approval artifact or policy-allowed auto path with trust event.
6. Maximum runtime per playbook is `<= 7m`.

Evidence artifacts captured for every run:

1. `preflight_status` (`available_now`/`blocked`) with concrete unblocking steps if blocked.
2. `action_log` with tool/memory/policy checkpoints.
3. `trust_log` with approvals and trust events.
4. `outcome_summary` with measurable result statement.

---

## Playbook 1: Email Agent / Spam Filter Personal Assistant

Scenario ID: `FND-001`  
Mapped pack: `pack_personal_inbox_defense`  
Hidden specialist route: `inbox_triage_specialist -> spam_rule_guard_specialist -> escalation_router_specialist`

Preflight gate:

1. `available_now`: inbox linked, baseline rules loaded, escalation contact configured.
2. `blocked`: missing inbox link, missing specialist coverage, or unknown prerequisite state.
3. Unblocking steps: connect inbox provider, activate specialist coverage, confirm rule baseline.

Timed script (`<= 7m`):

1. `00:00-00:40` operator states preflight status and route summary.
2. `00:40-02:10` operator classifies inbox into urgent/normal/spam buckets.
3. `02:10-03:30` operator proposes new auto-rules and requests approval before persistence.
4. `03:30-05:00` operator applies known-safe rules and escalates uncertain threads.
5. `05:00-06:30` operator returns defended inbox outcome with counts and unresolved items.

Deterministic pass/fail checkpoints:

| Checkpoint | Pass rule | Fail rule | Evidence |
|---|---|---|---|
| `FND-001-C1` | Preflight emitted as `available_now` or `blocked` only | Any ambiguous status string | `preflight_status` |
| `FND-001-C2` | Classification includes counts for all three buckets | Missing bucket counts or rationale | `action_log` |
| `FND-001-C3` | Any new auto-rule has approval artifact before write | Rule persisted without approval | `trust_log` |
| `FND-001-C4` | Uncertain items are explicitly escalated with target channel | Uncertain items silently auto-processed | `action_log`, `outcome_summary` |

---

## Playbook 2: Work-With-Me Learning Assistant (Pocket + Meta Glasses)

Scenario ID: `FND-002`  
Mapped pack: `pack_wearable_operator_companion`  
Hidden specialist route: `av_context_ingest_specialist -> memory_update_specialist -> live_coaching_specialist`

Preflight gate:

1. `available_now`: active session objective set, AV permissions granted, specialist coverage active.
2. `blocked`: missing camera/mic permissions, missing live session, missing coverage, or unknown prerequisite state.
3. Unblocking steps: grant AV permissions, start session objective, activate specialist coverage.

Timed script (`<= 7m`):

1. `00:00-00:45` operator states preflight status and confirms task objective.
2. `00:45-02:15` operator consumes live voice/camera context and proposes immediate next actions.
3. `02:15-03:40` operator shows "what I learned" and requests approval for persistent preference updates.
4. `03:40-05:20` operator executes safe support actions and adapts guidance from feedback.
5. `05:20-06:40` operator summarizes progress, stored memory deltas, and next best step.

Deterministic pass/fail checkpoints:

| Checkpoint | Pass rule | Fail rule | Evidence |
|---|---|---|---|
| `FND-002-C1` | Status is deterministic (`available_now`/`blocked`) with unblocking if blocked | No status or unclear status | `preflight_status` |
| `FND-002-C2` | Guidance references at least two live context signals | Generic advice not tied to live signals | `action_log` |
| `FND-002-C3` | Persistent memory updates have approval artifact | Silent memory mutation | `trust_log` |
| `FND-002-C4` | Operator continuity remains single-surface across pocket/glasses | User exposed to specialist handoff UI | `outcome_summary` |

---

## Playbook 3: Actionable Business Administration (Proactive Daily Executive Checkup)

Scenario ID: `FND-003`  
Mapped pack: `pack_exec_daily_checkup`  
Hidden specialist route: `kpi_synthesis_specialist -> risk_rank_specialist -> followup_router_specialist`

Preflight gate:

1. `available_now`: KPI ledger loaded, calendar + messaging integrations connected, compliance hold clear.
2. `blocked`: missing integrations, missing specialist coverage, unresolved hold, or unknown prerequisite state.
3. Unblocking steps: connect integrations, activate missing coverage, clear hold through trust policy path.

Timed script (`<= 7m`):

1. `00:00-00:40` operator reports deterministic preflight status.
2. `00:40-02:20` operator produces executive brief with priority/risk/blocked sections.
3. `02:20-04:00` operator ranks actions by impact and assigns owner + due window.
4. `04:00-05:20` operator requests approval for outbound escalations/messages.
5. `05:20-06:40` operator logs checkpoint and schedules next daily cadence.

Deterministic pass/fail checkpoints:

| Checkpoint | Pass rule | Fail rule | Evidence |
|---|---|---|---|
| `FND-003-C1` | Brief includes measurable KPIs (not narrative only) | No measurable metrics in brief | `outcome_summary` |
| `FND-003-C2` | At least one proactive action includes owner and due window | Actions lack owner or deadline | `action_log` |
| `FND-003-C3` | Outbound actions gated by approval before send | Outbound mutation without approval | `trust_log` |
| `FND-003-C4` | Next cadence timestamp recorded | No scheduled follow-up checkpoint | `action_log` |

---

## Playbook 4: Todo/Shopping List From Meta Glasses + iPhone Camera

Scenario ID: `FND-004`  
Mapped pack: `pack_visual_todo_shopping`  
Hidden specialist route: `vision_extract_specialist -> list_normalization_specialist -> reminder_router_specialist`

Preflight gate:

1. `available_now`: visual permissions granted, destination lists configured, extraction pipeline verified.
2. `blocked`: missing permissions, unknown extraction readiness, missing list destination, or missing coverage.
3. Unblocking steps: grant camera access, verify extraction pipeline, set list destination, activate coverage.

Timed script (`<= 7m`):

1. `00:00-00:35` operator states preflight status and target list destinations.
2. `00:35-02:15` operator ingests live capture and extracts candidate items with confidence.
3. `02:15-03:50` operator blocks ambiguous items and asks explicit confirmation before commit.
4. `03:50-05:20` operator writes confirmed items and schedules reminders.
5. `05:20-06:30` operator returns synchronized todo/shopping delta summary.

Deterministic pass/fail checkpoints:

| Checkpoint | Pass rule | Fail rule | Evidence |
|---|---|---|---|
| `FND-004-C1` | Candidate list includes confidence + ambiguity flags | Raw untyped extraction only | `action_log` |
| `FND-004-C2` | Ambiguous items remain blocked pending user confirmation | Ambiguous items auto-committed | `action_log`, `trust_log` |
| `FND-004-C3` | List mutations carry trust artifact | Silent mutation without policy/trust event | `trust_log` |
| `FND-004-C4` | Final sync reports exact item delta per list | No deterministic final state delta | `outcome_summary` |

---

## Playbook 5: Note Taker

Scenario ID: `FND-005`  
Mapped pack: `pack_note_capture_memory`  
Hidden specialist route: `capture_transcribe_specialist -> structure_summary_specialist -> memory_index_specialist`

Preflight gate:

1. `available_now`: note source active, destination notebook configured, specialist coverage active.
2. `blocked`: missing source, missing destination, missing coverage, or unknown prerequisite state.
3. Unblocking steps: select capture source, set destination notebook, activate coverage.

Timed script (`<= 7m`):

1. `00:00-00:40` operator reports deterministic preflight status.
2. `00:40-02:40` operator captures discussion and structures notes into headings/decisions/actions.
3. `02:40-04:10` operator writes notes to destination and generates retrieval cue.
4. `04:10-05:30` operator requests approval for any external sharing/reminder mutation.
5. `05:30-06:30` operator returns recap with next actions and lookup phrase.

Deterministic pass/fail checkpoints:

| Checkpoint | Pass rule | Fail rule | Evidence |
|---|---|---|---|
| `FND-005-C1` | Notes include headings, decisions, and action list | Transcript dump without structure | `outcome_summary` |
| `FND-005-C2` | Retrieval cue is generated and testable | No retrieval key/phrase supplied | `action_log` |
| `FND-005-C3` | External share/reminder mutation is approval-gated | External mutation without approval | `trust_log` |
| `FND-005-C4` | Memory write trust event recorded | Missing memory-write trust evidence | `trust_log` |

---

## Playbook 6: Pharmacist Vacation Scheduler in Slack (Policy Rules + Conflict Mediation)

Scenario ID: `FND-006`  
Mapped pack: `pack_vacation_delegate_guard`  
Hidden specialist route: `vacation_policy_specialist -> calendar_conflict_specialist -> colleague_resolution_specialist`

Preflight gate:

1. `available_now`: Slack channel integration connected, Google Calendar readiness verified, owner policy configured (`maxConcurrentAway`, blocked periods, minimum on-duty pharmacist coverage), and team roster loaded.
2. `blocked`: missing Slack integration, missing Google Calendar readiness, missing policy/coverage roster, or unknown prerequisite state.
3. Unblocking steps: connect Slack, connect Google Calendar, configure vacation rules with owner, load team roster/role coverage.

Timed script (`<= 7m`):

1. `00:00-00:45` operator reports deterministic preflight status and active policy snapshot.
2. `00:45-02:00` owner confirms or updates vacation rules (max concurrent leave, blocked periods, minimum on-duty coverage).
3. `02:00-03:20` teammate submits vacation request directly in Slack.
4. `03:20-04:40` operator evaluates Google Calendar overlap plus policy constraints and coverage impact.
5. `04:40-05:50` operator returns decision: approve with calendar hold or conflict response with rule rationale, alternative windows, and direct-colleague discussion recommendation.
6. `05:50-06:40` operator emits trust/audit summary with approved vs blocked counts and reason tags.

Deterministic pass/fail checkpoints:

| Checkpoint | Pass rule | Fail rule | Evidence |
|---|---|---|---|
| `FND-006-C1` | Policy contract includes all required controls (`maxConcurrentAway`, blocked periods, minimum on-duty pharmacist coverage) | Missing one or more required policy controls | `preflight_status`, `action_log` |
| `FND-006-C2` | Request decision includes deterministic verdict + rule rationale + calendar overlap evidence | Decision is ambiguous or lacks policy/calendar justification | `action_log`, `outcome_summary` |
| `FND-006-C3` | Conflict response includes alternative windows and direct-colleague discussion guidance | Conflict returned without alternatives or colleague-resolution suggestion | `action_log`, `outcome_summary` |
| `FND-006-C4` | Approved requests create audited calendar mutations; blocked requests produce no calendar write | Calendar writes occur for blocked requests or missing trust evidence for approved writes | `trust_log`, `action_log` |

---

## Playbook 7: Complete Event Manager Workflow (Creation -> Checkout -> Invoice -> Ticket Delivery)

Scenario ID: `FND-007`  
Mapped pack: `pack_event_manager_full_lifecycle`  
Hidden specialist route: `event_design_specialist -> checkout_orchestration_specialist -> fulfillment_audit_specialist`

Preflight gate:

1. `available_now`: event/product/form/checkout/invoice tools are enabled, Stripe + Resend integrations are connected, and template-set defaults are configured.
2. `blocked`: missing tool/integration/template prerequisites, unknown prerequisite state, or explicit request for event-flow sandbox dry-run autonomy.
3. Unblocking steps: connect Stripe + Resend, configure ticket/invoice/email template set, and run staged draft/publish rehearsal until sandbox dry-run autonomy is implemented.

Timed script (`<= 7m`):

1. `00:00-00:40` operator reports deterministic preflight status and scope.
2. `00:40-01:50` operator creates or updates the event (title/date/location/agenda/ticket plan).
3. `01:50-03:00` operator creates custom registration form and ticket products linked to the event.
4. `03:00-04:20` operator creates behavior-driven checkout linking event + products + form.
5. `04:20-05:10` operator publishes all assets and returns public checkout URL.
6. `05:10-06:00` operator creates and sends invoice for sponsor/group booking path with approval artifact.
7. `06:00-06:40` operator runs one controlled checkout rehearsal and returns ticket-fulfillment evidence.

Deterministic pass/fail checkpoints:

| Checkpoint | Pass rule | Fail rule | Evidence |
|---|---|---|---|
| `FND-007-C1` | Preflight is exactly `available_now` or `blocked`, and blocked includes sandbox-gap/fix steps when relevant | Ambiguous preflight or missing unblocking steps | `preflight_status` |
| `FND-007-C2` | Artifact graph is complete (`eventId`, `productIds`, `formId`, `checkoutId`, `checkoutUrl`) | Missing one or more core artifact IDs | `action_log`, `outcome_summary` |
| `FND-007-C3` | Invoice send has approval artifact and dispatch confirmation | Invoice sent without approval or missing dispatch result | `trust_log`, `action_log` |
| `FND-007-C4` | Checkout rehearsal yields ticket-fulfillment evidence (ticket artifact + delivery pipeline status) | No deterministic ticket delivery evidence after rehearsal | `action_log`, `outcome_summary` |

Executable rehearsal:

1. Command: `npm run demo:fnd-007` (or `npm run test:e2e:fnd-007`)
2. Evidence artifact: `tmp/reports/fnd-007/latest.json`
3. If live Stripe/Resend are unavailable locally, invoice dispatch falls back to deterministic simulated evidence and records that fallback in `notes`/`simulatedComponents`.

---

## Run completion rule

1. A playbook is `PASS` only if all listed checkpoints pass.
2. Any failed checkpoint marks the playbook `FAIL` and requires rerun after remediation.
3. If preflight is `blocked`, execution stops immediately and returns unblocking steps only.
