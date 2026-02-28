# Agent Product Catalog

**Status:** In progress (catalog foundations complete; marketplace expansion rows `AGP-021`..`AGP-035` are strategy-frozen under one-of-one pivot lock)  
**Last updated:** 2026-02-26

This document maps book agents to product implementation specs.

## One-of-One Pivot Note (2026-02-25)

1. Runtime strategy is one primary user-owned operator; this catalog is treated as a capability/projection taxonomy first, not a mandate to run 104 distinct active personas by default.
2. Marketplace/commercialization expansion rows (`AGP-021`..`AGP-035`) are `BLOCKED` in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/TASK_QUEUE.md`.
3. Active cleanup and unfreeze authority is owned by `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md`.

## Distinct Behavioral System Contract (`LOC-007`)

1. Runtime differentiation uses a shared base model plus deterministic behavior layers: `prompt + memory + policy + tools + eval + trust`.
2. A `soul` in this catalog is the packaging of that full stack for an operator/specialist context, not a prompt-only persona.
3. `Soul Blend` communicates intended archetype flavor but does not by itself satisfy runtime differentiation requirements.
4. Canonical contract source: `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/BEHAVIORAL_SYSTEM_CONTRACT.md`.

Row schema:
`Agent #`, `Name`, `Category`, `Tier`, `Soul Blend`, `Soul Status`, `Subtype`, `Tool Profile`, `Required Tools`, `Required Integrations`, `Channel Affinity`, `Specialist Access Modes`, `Autonomy Default`, `Implementation Phase`.

Implementation control surface:

1. Master tracker: `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/IMPLEMENTATION_OVERVIEW.md`
2. Tool dependency mapping: `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/TOOL_REQUIREMENT_MATRIX.md`
3. Seed readiness mapping: `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/SOUL_SEED_LIBRARY.md`
4. Operator store experience contract: `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/AGENT_STORE_EXPERIENCE.md`
5. Behavioral-layer contract: `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/BEHAVIORAL_SYSTEM_CONTRACT.md`
6. Capability-pack contract (canonical): `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/CAPABILITY_PACK_TAXONOMY.md`

## Capability-Pack Finalization (`LOC-011`)

This catalog now serves as deterministic source data for capability packs.

Founder demo packs formalized in `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/CAPABILITY_PACK_TAXONOMY.md`:

1. `pack_personal_inbox_defense`
2. `pack_wearable_operator_companion`
3. `pack_exec_daily_checkup`
4. `pack_visual_todo_shopping`
5. `pack_note_capture_memory`
6. `pack_vacation_delegate_guard`
7. `pack_event_manager_full_lifecycle`

Binding rules:

1. Operator UX remains one visible agent; specialist routing stays hidden by default.
2. Pack status is deterministic (`available_now` or `blocked`) with explicit unblocking steps.
3. Unknown prerequisites fail closed to `blocked`.
4. Mutating flows remain policy- and trust-governed.
5. `pack_vacation_delegate_guard` currently maps to the pharmacist vacation scheduler demo contract (`FND-006`): Slack vacation intake + Google Calendar conflict checks + policy-based colleague-resolution guidance.

---

## Operator Agent Store Projection Contract (`AGP-023`)

This catalog remains the deterministic source for operator-facing Agent Store projection fields. The UI schema, privacy rules, clone-first birthing contract, and avatar metadata contract are owned by:

- `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/AGENT_STORE_EXPERIENCE.md`

### Store-card field derivation from this catalog

| Store field | Derivation source in this catalog | Projection policy |
|---|---|---|
| `cardId` | `Agent #` (`agent:{Agent #}`) | Public |
| `displayName` | `Name` | Public |
| `verticalCategory` | `Category` | Public |
| `tier` | `Tier` | Public |
| `abilityTags` | Deterministic tags from `Subtype` + `Tool Profile` + intent overlays | Public |
| `toolTags` | `Required Tools` (`[proposed]` suffix preserved as `planned`) | Public |
| `frameworkTags` | Projection from `Tool Profile` + `Specialist Access Modes` + `Autonomy Default` | Public |
| `integrationReadiness` | `Required Integrations` + runtime connection availability | Public (`available now` vs `blocked`) |
| `capabilitySnapshot` | `Soul Status` + tool/integration/channel/access-mode checks | Public at activation handoff |
| `supportedAccessModes` | `Specialist Access Modes` | Public |
| `channelAffinity` | `Channel Affinity` | Public |
| `traitProjectionSeed` | Deterministic projection from soul metadata (no recipe internals) | Public projection only |
| `avatarSlotMetadata` | `Agent #` + tier/category mapping (see Agent Store doc) | Public |

### Projection guardrails

1. Operator-default birthing remains clone-first from premade catalog agents; no free-form self-build default path.
2. Public cards may show rich abilities/tools/framework tags plus strengths/weaknesses projections, but never raw soul-recipe/framework mix internals.
3. Activation flows must present capability-limit snapshots with explicit `available now` vs `blocked` states before clone confirmation.
4. First successful clone must set `isPrimary=true` when no primary exists in the same `orgId + userId` scope.
5. No-fit outcomes route to purchase-only custom-agent concierge; free-form custom self-build remains disallowed.

---

## Your AI v1.3 alignment

1. The day-one user experience is one primary agent; specialist rows represent capability layers behind that primary agent by default.
2. Dream Team specialists remain full soul-powered agents (not KB snippets).
3. Every row must declare specialist access mode expectations: `invisible` (default), plus `direct`/`meeting` where enabled.

## One-Agent Contract Guardrails (`AGP-012`)

1. D1 packaging is primary-agent-first: exactly one `PRIMARY` agent is the default operator-facing surface, and reassignment follows the explicit `setPrimaryAgent` contract from `YAI-003`.
2. `Specialist Access Modes` values are runtime contract semantics consumed from `YAI-003`/`YAI-004` (`teamAccessMode` behavior), not UI-only labels.
3. `meeting` mode remains advisory by default: specialist input can shape synthesis, but any mutation must run through an explicit approved mutation path under primary authority.
4. Dream Team specialists remain soul-powered agents with full seed/soul lifecycle requirements; they are not KB snippets or static retrieval overlays.
5. Ownership boundary: this catalog consumes one-agent and personal-operator contracts and does not redefine core runtime routing or seed implementation behavior.

## Current implementation snapshot

1. Catalog-complete rows: `104 / 104` (core + industry rows).
2. Catalog-pending rows: `0 / 104` (row-level schema complete; tool matrix closure is complete via `AGP-006`).
3. First-wave backlog in scope: `42` agents (Legal + Trades + E-Commerce).
4. Runtime/live state must be read with seed status from `SOUL_SEED_LIBRARY.md` and tool readiness from `TOOL_REQUIREMENT_MATRIX.md`.
5. Required tool columns for #7-#104 now map to finalized `AGP-006` vertical tool-profile contracts; specialist overlays remain proposal-scoped until implementation rows land.

---

## Recommender Index Contract (`AGP-018`)

This catalog is the deterministic source for 104+ agent recommendation indexing. `AGP-019`/`AGP-020` must consume this contract and must not ship parallel hardcoded outcome maps.

### Canonical intent taxonomy (v1)

| Intent ID | Primary user ask | Default candidate slices |
|---|---|---|
| `book_appointment` | Create a new appointment/booking window | `35-48`, `77-90` |
| `reschedule_conflict` | Resolve a time collision or move a scheduled commitment | `35-48`, `77-90`, optional `7-20` |
| `provider_or_client_outreach` | Run follow-up or outreach sequences | `7-34`, `49-76`, `77-104` |
| `compliance_hold` | Enforce policy/safety/privacy holds and escalation | `7-20`, `21-34`, `35-48` |
| `case_or_account_brief` | Summarize context, risks, and next actions | `2`, `7-34`, `63-104` |
| `document_or_quote_packet` | Generate legal packets, proposals, or quote PDFs | `10`, `13`, `18`, `63-90` |
| `financial_modeling` | Compute margin, payback, and scenario planning outputs | `5`, `21-34` |
| `care_follow_up` | Coordinate care cadence, reminders, and treatment communication | `35-48` |
| `program_or_session_tracking` | Track coaching milestones and session prep | `49-62` |
| `resource_capacity_planning` | Allocate capacity and flag planning conflicts | `63-76` |
| `job_material_estimation` | Estimate materials/costs for field jobs | `77-90` |
| `cart_recovery_or_growth` | Recover carts and optimize conversion/upsell paths | `91-104` |
| `inventory_restock_or_fulfillment` | Detect stock risk and trigger restock/fulfillment actions | `91-104` |
| `marketplace_channel_sync` | Sync product metadata to channel/marketplace endpoints | `100`, `104` (optional `91-99`) |
| `retention_and_reviews` | Improve retention, loyalty, review/reputation outcomes | `11`, `18`, `29`, `49-62`, `81`, `88`, `93`, `98` |
| `platform_operations` | Plan/execute cross-functional business operations | `1-6`, optional `63-76` |

Intent tag policy:

1. Every indexed agent row must emit at least one intent from this taxonomy.
2. New intents are additive only and require D1/D2 synchronization in the same change set.
3. If multiple intents tie during resolver scoring, tie-break by lower `agentId` for deterministic ordering.

### Keyword normalization and alias contract (v1)

Resolver preprocessing must apply this pipeline in order:

1. Lowercase, trim, and ASCII-fold input text.
2. Replace punctuation with spaces and collapse repeated whitespace.
3. Remove stop words: `a`, `an`, `the`, `please`, `help`, `need`, `my`, `for`, `to`, `with`.
4. Normalize token variants by alias map below.
5. Deduplicate tokens while preserving first-seen order.

Canonical alias map:

| Aliases | Canonical intent token |
|---|---|
| `book`, `booking`, `appointment`, `schedule`, `slot` | `book_appointment` |
| `reschedule`, `conflict`, `move`, `postpone` | `reschedule_conflict` |
| `followup`, `follow-up`, `outreach`, `callback`, `reminder` | `provider_or_client_outreach` |
| `compliance`, `policy`, `privacy`, `consent`, `risk hold` | `compliance_hold` |
| `brief`, `summary`, `recap`, `case notes`, `account notes` | `case_or_account_brief` |
| `quote`, `estimate`, `proposal`, `scope`, `packet`, `pdf` | `document_or_quote_packet` |
| `margin`, `unit economics`, `payback`, `scenario`, `forecast` | `financial_modeling` |
| `care plan`, `medical followup`, `treatment followup` | `care_follow_up` |
| `program`, `session`, `milestone`, `homework`, `coaching tracker` | `program_or_session_tracking` |
| `capacity`, `allocation`, `bandwidth`, `staffing` | `resource_capacity_planning` |
| `materials`, `takeoff`, `job cost`, `estimate sheet` | `job_material_estimation` |
| `cart`, `abandon`, `upsell`, `cross-sell`, `conversion` | `cart_recovery_or_growth` |
| `inventory`, `restock`, `stockout`, `reorder`, `fulfillment` | `inventory_restock_or_fulfillment` |
| `marketplace`, `listing`, `channel`, `sync` | `marketplace_channel_sync` |
| `retention`, `renewal`, `loyalty`, `reviews`, `reputation` | `retention_and_reviews` |
| `operations`, `operator`, `strategist`, `planning` | `platform_operations` |

### Index derivation rules per catalog row

| Index field | Deterministic derivation rule |
|---|---|
| `agentId` | `Agent #` (string form, e.g., `"27"`). |
| `agentName` | `Name`. |
| `categoryTag` | Lower snake-case `Category` value. |
| `toolProfileTag` | `Tool Profile` value. |
| `subtypeTag` | `Subtype` value. |
| `requiredToolKeys` | Parse `Required Tools`; strip ` [proposed]` suffix into `proposedToolKeys` set. |
| `requiredIntegrationKeys` | Parse `Required Integrations`; `none required` becomes `[]`. |
| `supportedAccessModes` | Parse `Specialist Access Modes` into ordered set (`invisible`, `direct`, `meeting`). |
| `runtimeAvailability` | `available_now` when `Soul Status` is `ready`; otherwise `planned`. |
| `intentTags` | Union of (a) taxonomy aliases matched from normalized row tokens, (b) profile/subtype overlays, (c) tool-derived intent tags; dedupe in first-seen order. |
| `implementationPhase` | Integer cast from `Implementation Phase`. |

Deterministic overlays:

1. Category overlays: `Legal` -> add `case_or_account_brief`, `compliance_hold`; `Finance` -> `financial_modeling`; `Health` -> `care_follow_up`; `Coaching` -> `program_or_session_tracking`; `Agencies` -> `resource_capacity_planning`; `Trades` -> `job_material_estimation`; `E-Commerce` -> `cart_recovery_or_growth`, `inventory_restock_or_fulfillment`; `Core Specialist` -> `platform_operations`.
2. Subtype overlays: `sales_assistant` -> `provider_or_client_outreach`; `customer_support` -> `retention_and_reviews`; `booking_agent` -> `book_appointment`, `reschedule_conflict`.
3. Tool overlays: `schedule_callback` -> `book_appointment`; `log_outcome_and_followup` -> `provider_or_client_outreach`; `generate_quote_or_scope_pdf` -> `document_or_quote_packet`; `calculate_unit_economics` -> `financial_modeling`; `care_plan_followup_scheduler` -> `care_follow_up`; `session_program_tracker` -> `program_or_session_tracking`; `resource_capacity_allocator` -> `resource_capacity_planning`; `job_material_estimator` -> `job_material_estimation`; `abandoned_cart_recovery_trigger` -> `cart_recovery_or_growth`; `inventory_restock_alert` -> `inventory_restock_or_fulfillment`; `marketplace_listing_sync` -> `marketplace_channel_sync`; `compliance_hold_and_escalate` -> `compliance_hold`.

---

## Core Specialists (#1-#6)

| Agent # | Name | Category | Tier | Soul Blend | Soul Status | Subtype | Tool Profile | Required Tools | Required Integrations | Channel Affinity | Specialist Access Modes | Autonomy Default | Implementation Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `1` | The Closer | Core Specialist | Foundation | Alex Hormozi (50%) + Jefferson Fisher (30%) + Chris Voss (20%) | `ready` | `sales_assistant` | `sales` | `search_contacts`, `create_invoice`, `send_invoice`, `create_checkout_page`, `publish_checkout`, `send_bulk_crm_email`, `escalate_to_human` | `stripe`, `resend` | webchat, slack, voice | `invisible` default; `direct`; `meeting` | `supervised` | `1` |
| `2` | The Strategist | Core Specialist | Foundation | Donald Miller (100%) | `ready` | `general` | `general` | `run_platform_productivity_loop`, `run_eval_analyst_checks`, `search_contacts`, `list_products`, `list_events`, `escalate_to_human` | none required | webchat, slack | `invisible` default; `direct`; `meeting` | `supervised` | `1` |
| `3` | The Copywriter | Core Specialist | Foundation | Russell Brunson (100%) | `ready` | `general` | `sales` | `create_template`, `send_email_from_template`, `send_bulk_crm_email`, `create_page`, `publish_page`, `search_unsplash_images`, `escalate_to_human` | `resend`, `unsplash` | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `1` |
| `4` | The Operator | Core Specialist | Foundation | Leila Hormozi (100%) | `ready` | `general` | `admin` | `create_workflow`, `create_layers_workflow`, `link_objects`, `enable_workflow`, `list_workflows`, `manage_projects`, `update_organization_settings`, `escalate_to_human` | none required | webchat, slack | `invisible` default; `direct`; `meeting` | `supervised` | `1` |
| `5` | The CFO | Core Specialist | Dream Team | Ben Horowitz (60%) + Marc Andreessen (40%) | `ready` | `general` | `admin` | `create_invoice`, `send_invoice`, `process_payment`, `set_product_price`, `list_products`, `run_eval_analyst_checks`, `escalate_to_human` | `stripe` | webchat, slack, email | `invisible` default; `direct`; `meeting` | `supervised` | `1` |
| `6` | The Coach | Core Specialist | Dream Team | Alan Watts (35%) + Jefferson Fisher (25%) + Robert Greene (25%) + Joseph Goldstein (15%) | `ready` | `general` | `support` | `search_contacts`, `review_own_soul`, `propose_soul_update`, `view_pending_proposals`, `escalate_to_human` | none required | webchat, voice | `invisible` default; `direct`; `meeting` | `supervised` | `1` |

Tool notes (core):

1. Core specialists intentionally reuse existing `general`/`support`/`sales`/`admin` profiles.
2. `escalate_to_human` remains mandatory for all six.
3. Any autonomy expansion beyond `supervised` requires trust-gate evidence from `ACE`/`ATX` contracts.

---

## Legal (#7-#20)

| Agent # | Name | Category | Tier | Soul Blend | Soul Status | Subtype | Tool Profile | Required Tools | Required Integrations | Channel Affinity | Specialist Access Modes | Autonomy Default | Implementation Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `7` | The Client Intake Specialist | Legal | Foundation | Jay Foonberg (40%) + Robert Cialdini (35%) + Dale Carnegie (25%) | `ready` | `sales_assistant` | `legal` | `run_platform_productivity_loop`, `track_case_deadline [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | none required | webchat, email, slack | `invisible` default; `direct` | `supervised` | `2` |
| `8` | The Case Strategy Advisor | Legal | Dream Team | Gerry Spence (50%) + Daniel Kahneman (30%) + Robert Greene (20%) | `ready` | `general` | `legal` | `run_platform_productivity_loop`, `track_case_deadline [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | none required | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `9` | The Compliance Monitor | Legal | Dream Team | Atul Gawande (50%) + Richard Susskind (30%) + W. Edwards Deming (20%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `legal` | `run_platform_productivity_loop`, `track_case_deadline [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | none required | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `10` | The Document Drafter | Legal | Foundation | Richard Susskind (40%) + Gerry Spence (35%) + David Ogilvy (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `legal` | `run_platform_productivity_loop`, `track_case_deadline [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | none required | webchat, email, slack | `invisible` default; `direct` | `supervised` | `2` |
| `11` | The Client Communicator | Legal | Foundation | Bryan Stevenson (40%) + Marshall Rosenberg (35%) + Jefferson Fisher (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `customer_support` | `legal` | `run_platform_productivity_loop`, `track_case_deadline [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | none required | webchat, email, slack | `invisible` default; `direct` | `supervised` | `2` |
| `12` | The Billing Coordinator | Legal | Foundation | Mike Michalowicz (45%) + Jay Foonberg (35%) + Ellen Rohr (20%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `legal` | `run_platform_productivity_loop`, `track_case_deadline [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | none required | webchat, email, slack | `invisible` default; `direct` | `supervised` | `2` |
| `13` | The Discovery Analyst | Legal | Sovereign | Daniel Kahneman (45%) + Gerry Spence (35%) + Nassim Taleb (20%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `legal` | `run_platform_productivity_loop`, `track_case_deadline [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | none required | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `14` | The Opposing Counsel Profiler | Legal | Sovereign | Robert Greene (50%) + Chris Voss (30%) + Daniel Kahneman (20%) | `needs_build [REQUIRES_SOUL_BUILD:1]` | `general` | `legal` | `run_platform_productivity_loop`, `track_case_deadline [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | none required | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `15` | The Settlement Negotiator | Legal | Dream Team | Roger Fisher (40%) + Chris Voss (35%) + Gerry Spence (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `sales_assistant` | `legal` | `run_platform_productivity_loop`, `track_case_deadline [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | none required | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `16` | The Courtroom Prep Coach | Legal | Dream Team | Gerry Spence (50%) + Tony Robbins (30%) + Jefferson Fisher (20%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `customer_support` | `legal` | `run_platform_productivity_loop`, `track_case_deadline [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | none required | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `17` | The Referral Network Builder | Legal | Dream Team | Keith Ferrazzi (50%) + Jay Foonberg (30%) + Robert Cialdini (20%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `legal` | `run_platform_productivity_loop`, `track_case_deadline [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | none required | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `18` | The Client Retention Advisor | Legal | Dream Team | Shep Hyken (40%) + Jay Abraham (35%) + Bryan Stevenson (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `legal` | `run_platform_productivity_loop`, `track_case_deadline [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | none required | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `19` | The Practice Growth Strategist | Legal | Sovereign | Jay Foonberg (40%) + Seth Godin (35%) + Alex Hormozi (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `legal` | `run_platform_productivity_loop`, `track_case_deadline [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | none required | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `20` | The Confidentiality Guardian | Legal | Sovereign | Bruce Schneier (50%) + Richard Susskind (30%) + Nassim Taleb (20%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `legal` | `run_platform_productivity_loop`, `track_case_deadline [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | none required | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `2` |

Tool notes (legal):

1. Focus tools expected: intake qualification, deadline tracking, document drafting, compliance alerts.
2. `AGP-006` mapped legal-specific tools against current registry and net-new needs; runtime delivery remains implementation-gated.

---

## Finance (#21-#34)

| Agent # | Name | Category | Tier | Soul Blend | Soul Status | Subtype | Tool Profile | Required Tools | Required Integrations | Channel Affinity | Specialist Access Modes | Autonomy Default | Implementation Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `21` | The Portfolio Narrator | Finance | Foundation | Carl Richards (45%) + Morgan Housel (35%) + Donald Miller (20%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `finance` | `run_eval_analyst_checks`, `calculate_unit_economics [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, email, slack | `invisible` default; `direct` | `supervised` | `3` |
| `22` | The Risk Sentinel | Finance | Dream Team | Howard Marks (45%) + Nassim Taleb (35%) + Daniel Kahneman (20%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `finance` | `run_eval_analyst_checks`, `calculate_unit_economics [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `23` | The Client Onboarding Concierge | Finance | Foundation | Tony Hsieh (40%) + Michael Kitces (35%) + Dale Carnegie (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `finance` | `run_eval_analyst_checks`, `calculate_unit_economics [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, email, slack | `invisible` default; `direct` | `supervised` | `3` |
| `24` | The Compliance Officer | Finance | Foundation | Atul Gawande (45%) + Michael Kitces (35%) + W. Edwards Deming (20%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `finance` | `run_eval_analyst_checks`, `calculate_unit_economics [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, email, slack | `invisible` default; `direct` | `supervised` | `3` |
| `25` | The Market Pulse Analyst | Finance | Dream Team | Howard Marks (40%) + Morgan Housel (35%) + Ray Dalio (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `finance` | `run_eval_analyst_checks`, `calculate_unit_economics [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `26` | The Financial Plan Architect | Finance | Dream Team | Michael Kitces (45%) + Carl Richards (30%) + Morgan Housel (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `finance` | `run_eval_analyst_checks`, `calculate_unit_economics [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `27` | The Tax Strategy Advisor | Finance | Dream Team | Tom Wheelwright (55%) + Michael Kitces (25%) + Ben Horowitz (20%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `finance` | `run_eval_analyst_checks`, `calculate_unit_economics [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `28` | The Estate Planning Guide | Finance | Sovereign | Morgan Housel (40%) + Bryan Stevenson (30%) + Michael Kitces (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `finance` | `run_eval_analyst_checks`, `calculate_unit_economics [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `29` | The Client Review Coordinator | Finance | Foundation | Nick Murray (45%) + Carl Richards (35%) + Michael Bungay Stanier (20%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `finance` | `run_eval_analyst_checks`, `calculate_unit_economics [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, email, slack | `invisible` default; `direct` | `supervised` | `3` |
| `30` | The Lead Qualifier | Finance | Foundation | Alex Hormozi (40%) + Nick Murray (35%) + Robert Cialdini (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `sales_assistant` | `finance` | `run_eval_analyst_checks`, `calculate_unit_economics [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, email, slack | `invisible` default; `direct` | `supervised` | `3` |
| `31` | The Fee Transparency Advocate | Finance | Dream Team | Carl Richards (45%) + Blair Enns (35%) + Brené Brown (20%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `finance` | `run_eval_analyst_checks`, `calculate_unit_economics [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `32` | The Retirement Roadmap Builder | Finance | Dream Team | Michael Kitces (45%) + Morgan Housel (30%) + Carl Richards (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `finance` | `run_eval_analyst_checks`, `calculate_unit_economics [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `33` | The Insurance Needs Analyst | Finance | Dream Team | Nassim Taleb (40%) + Michael Kitces (35%) + Carl Richards (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `finance` | `run_eval_analyst_checks`, `calculate_unit_economics [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `34` | The Referral Catalyst | Finance | Dream Team | Keith Ferrazzi (45%) + Nick Murray (30%) + Robert Cialdini (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `finance` | `run_eval_analyst_checks`, `calculate_unit_economics [proposed]`, `log_outcome_and_followup [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, email, slack | `invisible` default; `direct`; `meeting` | `supervised` | `3` |

---

## Health & Medical (#35-#48)

| Agent # | Name | Category | Tier | Soul Blend | Soul Status | Subtype | Tool Profile | Required Tools | Required Integrations | Channel Affinity | Specialist Access Modes | Autonomy Default | Implementation Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `35` | The Patient Liaison | Health | Foundation | Abraham Verghese (45%) + Dale Carnegie (30%) + Tony Hsieh (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `health` | `run_platform_productivity_loop`, `care_plan_followup_scheduler [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | none required | webchat, voice, sms/chat channels | `invisible` default; `direct` | `supervised` | `3` |
| `36` | The Treatment Plan Communicator | Health | Foundation | Abraham Verghese (40%) + Atul Gawande (35%) + Carl Richards (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `health` | `run_platform_productivity_loop`, `care_plan_followup_scheduler [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | none required | webchat, voice, sms/chat channels | `invisible` default; `direct` | `supervised` | `3` |
| `37` | The Wellness Coach | Health | Dream Team | Andrew Huberman (35%) + BJ Fogg (30%) + Peter Attia (20%) + James Clear (15%) | `needs_build [REQUIRES_SOUL_BUILD:4]` | `customer_support` | `health` | `run_platform_productivity_loop`, `care_plan_followup_scheduler [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | none required | webchat, voice, sms/chat channels | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `38` | The Insurance Navigator | Health | Foundation | Atul Gawande (40%) + Marshall Rosenberg (30%) + Leila Hormozi (30%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `health` | `run_platform_productivity_loop`, `care_plan_followup_scheduler [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | none required | webchat, voice, sms/chat channels | `invisible` default; `direct` | `supervised` | `3` |
| `39` | The Follow-Up Coordinator | Health | Foundation | BJ Fogg (40%) + Atul Gawande (35%) + Abraham Verghese (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `health` | `run_platform_productivity_loop`, `care_plan_followup_scheduler [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | none required | webchat, voice, sms/chat channels | `invisible` default; `direct` | `supervised` | `3` |
| `40` | The Intake Processor | Health | Foundation | Leila Hormozi (40%) + Tony Hsieh (30%) + Abraham Verghese (30%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `health` | `run_platform_productivity_loop`, `care_plan_followup_scheduler [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | none required | webchat, voice, sms/chat channels | `invisible` default; `direct` | `supervised` | `3` |
| `41` | The Symptom Triage Guide | Health | Dream Team | Eric Topol (45%) + Atul Gawande (35%) + Daniel Kahneman (20%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `health` | `run_platform_productivity_loop`, `care_plan_followup_scheduler [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | none required | webchat, voice, sms/chat channels | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `42` | The Prescription Reminder | Health | Dream Team | BJ Fogg (50%) + James Clear (30%) + Andrew Huberman (20%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `health` | `run_platform_productivity_loop`, `care_plan_followup_scheduler [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | none required | webchat, voice, sms/chat channels | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `43` | The Patient Satisfaction Monitor | Health | Dream Team | Shep Hyken (40%) + Don Berwick (35%) + Brené Brown (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `health` | `run_platform_productivity_loop`, `care_plan_followup_scheduler [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | none required | webchat, voice, sms/chat channels | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `44` | The Referral Coordinator | Health | Foundation | Keith Ferrazzi (40%) + Atul Gawande (35%) + Leila Hormozi (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `customer_support` | `health` | `run_platform_productivity_loop`, `care_plan_followup_scheduler [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | none required | webchat, voice, sms/chat channels | `invisible` default; `direct` | `supervised` | `3` |
| `45` | The Practice Marketing Advisor | Health | Dream Team | Seth Godin (40%) + Jay Abraham (35%) + Donald Miller (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `sales_assistant` | `health` | `run_platform_productivity_loop`, `care_plan_followup_scheduler [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | none required | webchat, voice, sms/chat channels | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `46` | The Staff Scheduling Optimizer | Health | Foundation | Taiichi Ohno (45%) + Leila Hormozi (35%) + Eliyahu Goldratt (20%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `health` | `run_platform_productivity_loop`, `care_plan_followup_scheduler [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | none required | webchat, voice, sms/chat channels | `invisible` default; `direct` | `supervised` | `3` |
| `47` | The Telehealth Facilitator | Health | Dream Team | Eric Topol (50%) + Tony Hsieh (25%) + Abraham Verghese (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `health` | `run_platform_productivity_loop`, `care_plan_followup_scheduler [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | none required | webchat, voice, sms/chat channels | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `48` | The Medical Records Organizer | Health | Foundation | Atul Gawande (40%) + Bruce Schneier (35%) + Taiichi Ohno (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `health` | `run_platform_productivity_loop`, `care_plan_followup_scheduler [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | none required | webchat, voice, sms/chat channels | `invisible` default; `direct` | `supervised` | `3` |

---

## Coaching & Consulting (#49-#62)

| Agent # | Name | Category | Tier | Soul Blend | Soul Status | Subtype | Tool Profile | Required Tools | Required Integrations | Channel Affinity | Specialist Access Modes | Autonomy Default | Implementation Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `49` | The Discovery Call Navigator | Coaching | Foundation | Michael Bungay Stanier (40%) + Chris Voss (35%) + Alex Hormozi (25%) | `needs_build [REQUIRES_SOUL_BUILD:1]` | `general` | `coaching` | `create_template`, `send_email_from_template`, `session_program_tracker [proposed]`, `escalate_to_human` | `resend` | webchat, voice, email | `invisible` default; `direct` | `supervised` | `3` |
| `50` | The Program Architect | Coaching | Dream Team | Brendon Burchard (40%) + Amy Porterfield (35%) + Tim Ferriss (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `coaching` | `create_template`, `send_email_from_template`, `session_program_tracker [proposed]`, `escalate_to_human` | `resend` | webchat, voice, email | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `51` | The Accountability Partner | Coaching | Foundation | Marshall Goldsmith (40%) + James Clear (35%) + BJ Fogg (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `coaching` | `create_template`, `send_email_from_template`, `session_program_tracker [proposed]`, `escalate_to_human` | `resend` | webchat, voice, email | `invisible` default; `direct` | `supervised` | `3` |
| `52` | The Content Repurposer | Coaching | Foundation | Gary Vaynerchuk (45%) + Joe Pulizzi (30%) + Russell Brunson (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `coaching` | `create_template`, `send_email_from_template`, `session_program_tracker [proposed]`, `escalate_to_human` | `resend` | webchat, voice, email | `invisible` default; `direct` | `supervised` | `3` |
| `53` | The Community Manager | Coaching | Dream Team | Pat Flynn (40%) + Tony Hsieh (30%) + Brené Brown (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `coaching` | `create_template`, `send_email_from_template`, `session_program_tracker [proposed]`, `escalate_to_human` | `resend` | webchat, voice, email | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `54` | The Testimonial Harvester | Coaching | Foundation | Robert Cialdini (45%) + Russell Brunson (30%) + Donald Miller (25%) | `needs_build [REQUIRES_SOUL_BUILD:1]` | `sales_assistant` | `coaching` | `create_template`, `send_email_from_template`, `session_program_tracker [proposed]`, `escalate_to_human` | `resend` | webchat, voice, email | `invisible` default; `direct` | `supervised` | `3` |
| `55` | The Proposal Builder | Coaching | Foundation | Blair Enns (45%) + Alex Hormozi (30%) + David C. Baker (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `sales_assistant` | `coaching` | `create_template`, `send_email_from_template`, `session_program_tracker [proposed]`, `escalate_to_human` | `resend` | webchat, voice, email | `invisible` default; `direct` | `supervised` | `3` |
| `56` | The Session Prep Agent | Coaching | Foundation | Michael Bungay Stanier (45%) + Tim Ferriss (30%) + Marshall Goldsmith (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `coaching` | `create_template`, `send_email_from_template`, `session_program_tracker [proposed]`, `escalate_to_human` | `resend` | webchat, voice, email | `invisible` default; `direct` | `supervised` | `3` |
| `57` | The Follow-Up Sequencer | Coaching | Foundation | Russell Brunson (40%) + BJ Fogg (30%) + Ryan Deiss (30%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `sales_assistant` | `coaching` | `create_template`, `send_email_from_template`, `session_program_tracker [proposed]`, `escalate_to_human` | `resend` | webchat, voice, email | `invisible` default; `direct` | `supervised` | `3` |
| `58` | The Workshop Facilitator | Coaching | Dream Team | Tony Robbins (40%) + Brendon Burchard (35%) + Amy Porterfield (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `coaching` | `create_template`, `send_email_from_template`, `session_program_tracker [proposed]`, `escalate_to_human` | `resend` | webchat, voice, email | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `59` | The Certification Tracker | Coaching | Dream Team | Leila Hormozi (50%) + Atul Gawande (30%) + Gino Wickman (20%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `coaching` | `create_template`, `send_email_from_template`, `session_program_tracker [proposed]`, `escalate_to_human` | `resend` | webchat, voice, email | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `60` | The Thought Leadership Publisher | Coaching | Dream Team | Seth Godin (40%) + Ryan Holiday (30%) + Joe Pulizzi (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `coaching` | `create_template`, `send_email_from_template`, `session_program_tracker [proposed]`, `escalate_to_human` | `resend` | webchat, voice, email | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `61` | The Client Matching Engine | Coaching | Dream Team | Michael Bungay Stanier (40%) + Daniel Kahneman (30%) + David C. Baker (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `sales_assistant` | `coaching` | `create_template`, `send_email_from_template`, `session_program_tracker [proposed]`, `escalate_to_human` | `resend` | webchat, voice, email | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `62` | The Revenue Diversifier | Coaching | Sovereign | Jay Abraham (40%) + Alex Hormozi (30%) + Pat Flynn (30%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `sales_assistant` | `coaching` | `create_template`, `send_email_from_template`, `session_program_tracker [proposed]`, `escalate_to_human` | `resend` | webchat, voice, email | `invisible` default; `direct`; `meeting` | `supervised` | `3` |

---

## Agencies (#63-#76)

| Agent # | Name | Category | Tier | Soul Blend | Soul Status | Subtype | Tool Profile | Required Tools | Required Integrations | Channel Affinity | Specialist Access Modes | Autonomy Default | Implementation Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `63` | The Client Success Manager | Agency | Foundation | Shep Hyken (35%) + Michael Bungay Stanier (35%) + Marshall Goldsmith (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `agency` | `create_page`, `publish_page`, `resource_capacity_allocator [proposed]`, `escalate_to_human` | `resend`, `unsplash` | webchat, slack, email | `invisible` default; `direct` | `supervised` | `3` |
| `64` | The Proposal Engineer | Agency | Foundation | Blair Enns (50%) + David C. Baker (30%) + Alex Hormozi (20%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `sales_assistant` | `agency` | `create_page`, `publish_page`, `resource_capacity_allocator [proposed]`, `escalate_to_human` | `resend`, `unsplash` | webchat, slack, email | `invisible` default; `direct` | `supervised` | `3` |
| `65` | The Campaign Optimizer | Agency | Dream Team | Ryan Deiss (40%) + Dan Kennedy (30%) + Daniel Kahneman (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `agency` | `create_page`, `publish_page`, `resource_capacity_allocator [proposed]`, `escalate_to_human` | `resend`, `unsplash` | webchat, slack, email | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `66` | The Creative Brief Writer | Agency | Foundation | David Ogilvy (45%) + Donald Miller (30%) + Seth Godin (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `agency` | `create_page`, `publish_page`, `resource_capacity_allocator [proposed]`, `escalate_to_human` | `resend`, `unsplash` | webchat, slack, email | `invisible` default; `direct` | `supervised` | `3` |
| `67` | The Project Timeline Guardian | Agency | Foundation | David Heinemeier Hansson (45%) + Leila Hormozi (30%) + Gino Wickman (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `agency` | `create_page`, `publish_page`, `resource_capacity_allocator [proposed]`, `escalate_to_human` | `resend`, `unsplash` | webchat, slack, email | `invisible` default; `direct` | `supervised` | `3` |
| `68` | The Scope Creep Detector | Agency | Dream Team | Blair Enns (45%) + Mike Michalowicz (30%) + Jason Fried (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `agency` | `create_page`, `publish_page`, `resource_capacity_allocator [proposed]`, `escalate_to_human` | `resend`, `unsplash` | webchat, slack, email | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `69` | The Reporting Narrator | Agency | Foundation | Carl Richards (40%) + Morgan Housel (30%) + David Ogilvy (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `agency` | `create_page`, `publish_page`, `resource_capacity_allocator [proposed]`, `escalate_to_human` | `resend`, `unsplash` | webchat, slack, email | `invisible` default; `direct` | `supervised` | `3` |
| `70` | The Talent Scout | Agency | Dream Team | Laszlo Bock (45%) + Keith Ferrazzi (30%) + Kim Scott (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `sales_assistant` | `agency` | `create_page`, `publish_page`, `resource_capacity_allocator [proposed]`, `escalate_to_human` | `resend`, `unsplash` | webchat, slack, email | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `71` | The Retainer Renewal Strategist | Agency | Dream Team | Jay Abraham (40%) + Alex Hormozi (35%) + Blair Enns (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `sales_assistant` | `agency` | `create_page`, `publish_page`, `resource_capacity_allocator [proposed]`, `escalate_to_human` | `resend`, `unsplash` | webchat, slack, email | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `72` | The New Business Prospector | Agency | Dream Team | Dan Kennedy (40%) + David C. Baker (35%) + Keith Ferrazzi (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `sales_assistant` | `agency` | `create_page`, `publish_page`, `resource_capacity_allocator [proposed]`, `escalate_to_human` | `resend`, `unsplash` | webchat, slack, email | `invisible` default; `direct`; `meeting` | `supervised` | `3` |
| `73` | The Brand Voice Guardian | Agency | Foundation | David Ogilvy (50%) + Seth Godin (30%) + Donald Miller (20%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `agency` | `create_page`, `publish_page`, `resource_capacity_allocator [proposed]`, `escalate_to_human` | `resend`, `unsplash` | webchat, slack, email | `invisible` default; `direct` | `supervised` | `3` |
| `74` | The Client Onboarding Director | Agency | Foundation | Tony Hsieh (35%) + Leila Hormozi (35%) + Michael Bungay Stanier (30%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `customer_support` | `agency` | `create_page`, `publish_page`, `resource_capacity_allocator [proposed]`, `escalate_to_human` | `resend`, `unsplash` | webchat, slack, email | `invisible` default; `direct` | `supervised` | `3` |
| `75` | The QA & Review Agent | Agency | Foundation | Atul Gawande (45%) + W. Edwards Deming (30%) + David Ogilvy (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `agency` | `create_page`, `publish_page`, `resource_capacity_allocator [proposed]`, `escalate_to_human` | `resend`, `unsplash` | webchat, slack, email | `invisible` default; `direct` | `supervised` | `3` |
| `76` | The Agency Culture Keeper | Agency | Dream Team | Patrick Lencioni (40%) + Kim Scott (30%) + Brené Brown (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `agency` | `create_page`, `publish_page`, `resource_capacity_allocator [proposed]`, `escalate_to_human` | `resend`, `unsplash` | webchat, slack, email | `invisible` default; `direct`; `meeting` | `supervised` | `3` |

---

## Trades & Construction (#77-#90)

| Agent # | Name | Category | Tier | Soul Blend | Soul Status | Subtype | Tool Profile | Required Tools | Required Integrations | Channel Affinity | Specialist Access Modes | Autonomy Default | Implementation Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `77` | The Quote Follow-Up Agent | Trades | Foundation | Tommy Mello (45%) + Alex Hormozi (30%) + Robert Cialdini (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `sales_assistant` | `trades` | `generate_quote_or_scope_pdf [proposed]`, `job_material_estimator [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, voice, whatsapp/telegram | `invisible` default; `direct` | `supervised` | `2` |
| `78` | The Job Scheduler | Trades | Foundation | Taiichi Ohno (45%) + Leila Hormozi (30%) + Eliyahu Goldratt (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `trades` | `generate_quote_or_scope_pdf [proposed]`, `job_material_estimator [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, voice, whatsapp/telegram | `invisible` default; `direct` | `supervised` | `2` |
| `79` | The Safety Compliance Officer | Trades | Dream Team | Atul Gawande (50%) + W. Edwards Deming (30%) + Mike Holmes (20%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `trades` | `generate_quote_or_scope_pdf [proposed]`, `job_material_estimator [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, voice, whatsapp/telegram | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `80` | The Material Estimator | Trades | Dream Team | Taiichi Ohno (40%) + Mike Michalowicz (30%) + Paul Akers (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `trades` | `generate_quote_or_scope_pdf [proposed]`, `job_material_estimator [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, voice, whatsapp/telegram | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `81` | The Client Update Messenger | Trades | Foundation | Shep Hyken (40%) + Dale Carnegie (30%) + Tommy Mello (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `trades` | `generate_quote_or_scope_pdf [proposed]`, `job_material_estimator [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, voice, whatsapp/telegram | `invisible` default; `direct` | `supervised` | `2` |
| `82` | The Invoice & Payment Collector | Trades | Foundation | Mike Michalowicz (45%) + Ellen Rohr (30%) + Chris Voss (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `sales_assistant` | `trades` | `generate_quote_or_scope_pdf [proposed]`, `job_material_estimator [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, voice, whatsapp/telegram | `invisible` default; `direct` | `supervised` | `2` |
| `83` | The Permit Navigator | Trades | Dream Team | Richard Susskind (40%) + Atul Gawande (35%) + Leila Hormozi (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `trades` | `generate_quote_or_scope_pdf [proposed]`, `job_material_estimator [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, voice, whatsapp/telegram | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `84` | The Subcontractor Coordinator | Trades | Foundation | Leila Hormozi (40%) + Patrick Lencioni (30%) + Taiichi Ohno (30%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `customer_support` | `trades` | `generate_quote_or_scope_pdf [proposed]`, `job_material_estimator [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, voice, whatsapp/telegram | `invisible` default; `direct` | `supervised` | `2` |
| `85` | The Warranty Manager | Trades | Dream Team | Shep Hyken (40%) + Mike Holmes (30%) + Jay Abraham (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `trades` | `generate_quote_or_scope_pdf [proposed]`, `job_material_estimator [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, voice, whatsapp/telegram | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `86` | The Lead Intake Qualifier | Trades | Foundation | Tommy Mello (45%) + Alex Hormozi (30%) + Dale Carnegie (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `sales_assistant` | `trades` | `generate_quote_or_scope_pdf [proposed]`, `job_material_estimator [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, voice, whatsapp/telegram | `invisible` default; `direct` | `supervised` | `2` |
| `87` | The Equipment Maintenance Tracker | Trades | Dream Team | Taiichi Ohno (45%) + Paul Akers (30%) + Mike Michalowicz (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `trades` | `generate_quote_or_scope_pdf [proposed]`, `job_material_estimator [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, voice, whatsapp/telegram | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `88` | The Review & Reputation Manager | Trades | Foundation | Robert Cialdini (40%) + Shep Hyken (30%) + Tommy Mello (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `trades` | `generate_quote_or_scope_pdf [proposed]`, `job_material_estimator [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, voice, whatsapp/telegram | `invisible` default; `direct` | `supervised` | `2` |
| `89` | The Apprentice Training Coordinator | Trades | Dream Team | Mike Rowe (40%) + Robert Greene (30%) + Marshall Goldsmith (30%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `customer_support` | `trades` | `generate_quote_or_scope_pdf [proposed]`, `job_material_estimator [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, voice, whatsapp/telegram | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `90` | The Seasonal Demand Forecaster | Trades | Sovereign | Ray Dalio (40%) + Nassim Taleb (30%) + Tommy Mello (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `trades` | `generate_quote_or_scope_pdf [proposed]`, `job_material_estimator [proposed]`, `schedule_callback [proposed]`, `escalate_to_human` | `stripe`, `resend` | webchat, voice, whatsapp/telegram | `invisible` default; `direct`; `meeting` | `supervised` | `2` |

---

## E-Commerce & Retail (#91-#104)

| Agent # | Name | Category | Tier | Soul Blend | Soul Status | Subtype | Tool Profile | Required Tools | Required Integrations | Channel Affinity | Specialist Access Modes | Autonomy Default | Implementation Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `91` | The Cart Recovery Specialist | E-Commerce | Foundation | Ryan Deiss (40%) + Robert Cialdini (35%) + Russell Brunson (25%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `sales_assistant` | `ecommerce` | `abandoned_cart_recovery_trigger [proposed]`, `inventory_restock_alert [proposed]`, `list_products`, `escalate_to_human` | `stripe`, `resend`, `activecampaign` | webchat, email, messaging channels | `invisible` default; `direct` | `supervised` | `2` |
| `92` | The Product Recommender | E-Commerce | Dream Team | Jeff Bezos (40%) + Nir Eyal (35%) + Robert Cialdini (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `sales_assistant` | `ecommerce` | `abandoned_cart_recovery_trigger [proposed]`, `inventory_restock_alert [proposed]`, `list_products`, `escalate_to_human` | `stripe`, `resend`, `activecampaign` | webchat, email, messaging channels | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `93` | The Review Manager | E-Commerce | Foundation | Robert Cialdini (40%) + Shep Hyken (30%) + Brené Brown (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `ecommerce` | `abandoned_cart_recovery_trigger [proposed]`, `inventory_restock_alert [proposed]`, `list_products`, `escalate_to_human` | `stripe`, `resend`, `activecampaign` | webchat, email, messaging channels | `invisible` default; `direct` | `supervised` | `2` |
| `94` | The Order Status Communicator | E-Commerce | Foundation | Tony Hsieh (45%) + Shep Hyken (30%) + Marshall Rosenberg (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `customer_support` | `ecommerce` | `abandoned_cart_recovery_trigger [proposed]`, `inventory_restock_alert [proposed]`, `list_products`, `escalate_to_human` | `stripe`, `resend`, `activecampaign` | webchat, email, messaging channels | `invisible` default; `direct` | `supervised` | `2` |
| `95` | The Return & Exchange Handler | E-Commerce | Foundation | Tony Hsieh (40%) + Chris Voss (30%) + Jay Abraham (30%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `ecommerce` | `abandoned_cart_recovery_trigger [proposed]`, `inventory_restock_alert [proposed]`, `list_products`, `escalate_to_human` | `stripe`, `resend`, `activecampaign` | webchat, email, messaging channels | `invisible` default; `direct` | `supervised` | `2` |
| `96` | The Inventory Alert Agent | E-Commerce | Dream Team | Taiichi Ohno (45%) + Jeff Bezos (30%) + Nassim Taleb (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `ecommerce` | `abandoned_cart_recovery_trigger [proposed]`, `inventory_restock_alert [proposed]`, `list_products`, `escalate_to_human` | `stripe`, `resend`, `activecampaign` | webchat, email, messaging channels | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `97` | The Upsell & Cross-Sell Engine | E-Commerce | Dream Team | Jay Abraham (40%) + Ryan Deiss (35%) + Nir Eyal (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `sales_assistant` | `ecommerce` | `abandoned_cart_recovery_trigger [proposed]`, `inventory_restock_alert [proposed]`, `list_products`, `escalate_to_human` | `stripe`, `resend`, `activecampaign` | webchat, email, messaging channels | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `98` | The Customer Loyalty Builder | E-Commerce | Dream Team | Tony Hsieh (35%) + Pat Flynn (35%) + Nir Eyal (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `ecommerce` | `abandoned_cart_recovery_trigger [proposed]`, `inventory_restock_alert [proposed]`, `list_products`, `escalate_to_human` | `stripe`, `resend`, `activecampaign` | webchat, email, messaging channels | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `99` | The Seasonal Campaign Planner | E-Commerce | Dream Team | Ezra Firestone (40%) + Russell Brunson (30%) + Dan Kennedy (30%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `ecommerce` | `abandoned_cart_recovery_trigger [proposed]`, `inventory_restock_alert [proposed]`, `list_products`, `escalate_to_human` | `stripe`, `resend`, `activecampaign` | webchat, email, messaging channels | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `100` | The Supplier Liaison | E-Commerce | Dream Team | Roger Fisher (40%) + Jeff Bezos (30%) + Leila Hormozi (30%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `sales_assistant` | `ecommerce` | `abandoned_cart_recovery_trigger [proposed]`, `inventory_restock_alert [proposed]`, `list_products`, `escalate_to_human` | `stripe`, `resend`, `activecampaign` | webchat, email, messaging channels | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `101` | The Price Optimization Advisor | E-Commerce | Sovereign | Blair Enns (35%) + Daniel Kahneman (35%) + Howard Marks (30%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `general` | `ecommerce` | `abandoned_cart_recovery_trigger [proposed]`, `inventory_restock_alert [proposed]`, `list_products`, `escalate_to_human` | `stripe`, `resend`, `activecampaign` | webchat, email, messaging channels | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `102` | The Social Proof Curator | E-Commerce | Dream Team | Gary Vaynerchuk (45%) + Robert Cialdini (30%) + Seth Godin (25%) | `needs_build [REQUIRES_SOUL_BUILD:3]` | `sales_assistant` | `ecommerce` | `abandoned_cart_recovery_trigger [proposed]`, `inventory_restock_alert [proposed]`, `list_products`, `escalate_to_human` | `stripe`, `resend`, `activecampaign` | webchat, email, messaging channels | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
| `103` | The FAQ & Knowledge Base Agent | E-Commerce | Foundation | Donald Miller (40%) + Eric Topol (30%) + Atul Gawande (30%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `customer_support` | `ecommerce` | `abandoned_cart_recovery_trigger [proposed]`, `inventory_restock_alert [proposed]`, `list_products`, `escalate_to_human` | `stripe`, `resend`, `activecampaign` | webchat, email, messaging channels | `invisible` default; `direct` | `supervised` | `2` |
| `104` | The Marketplace Expansion Scout | E-Commerce | Sovereign | Jeff Bezos (40%) + Marc Andreessen (30%) + Jay Abraham (30%) | `needs_build [REQUIRES_SOUL_BUILD:2]` | `general` | `ecommerce` | `abandoned_cart_recovery_trigger [proposed]`, `inventory_restock_alert [proposed]`, `list_products`, `escalate_to_human` | `stripe`, `resend`, `activecampaign` | webchat, email, messaging channels | `invisible` default; `direct`; `meeting` | `supervised` | `2` |
