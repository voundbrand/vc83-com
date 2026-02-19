# Agent Trust Experience Master Plan

**Date:** 2026-02-17  
**Scope:** Build a trust-first agent creation and management experience where users can feel agent identity, understand memory and soul drift, and safely operate agent teams (including super-admin platform agents) using one consistent process.

---

## Mission

Deliver an end-to-end trust operating system that lets users:

1. run a soul-building interview that creates emotionally coherent agent identity,
2. explicitly control what is remembered and why,
3. understand team behavior, drift, and guardrails in one place,
4. train their own customer-facing agents and platform-level agents using the same workflow.

This workstream is separate from free onboarding funnel delivery.

---

## Current state in this codebase

1. **Brain window trust-critical data paths are now real-data backed.**
   `src/components/window-content/brain-window/index.tsx` is live, and:
   - `review-mode.tsx` is wired to org-scoped `convex/brainKnowledge.ts` query results.
   - `teach-mode.tsx` now persists docs/audio/link/text ingestion with durable status/failure metadata.
2. **Interview execution and Content DNA storage exist.**
   `convex/ai/interviewRunner.ts` runs guided sessions, advances phases, and saves `content_profile` objects on completion.
3. **Memory consent trust design is now productized in the interview flow.**
   `docs/pressmaster_onboarding/MEMORY_CONSENT_INTEGRATION.md` patterns are now enforced in `convex/ai/interviewRunner.ts` + interview UI via explicit consent checkpoints and reversible accept/decline behavior before durable writes.
4. **Setup mode trust runtime is now wired end-to-end.**
   Setup mode now enforces deterministic kickoff (empty-chat bootstrap), built-in provider routing, fenced setup artifact parsing, validation feedback, and builder workspace file persistence (`src/contexts/builder-context.tsx`, `src/components/builder/builder-chat-panel.tsx`, `src/lib/builder/setup-response-parser.ts`, `convex/ai/chat.ts`).
5. **Agents window has strong primitives but weak trust narrative.**
   Soul editing, approvals, escalation queue, and analytics are present (`src/components/window-content/agents/*`, `convex/ai/soulEvolution.ts`, `convex/ai/escalation.ts`, `convex/ai/agentApprovals.ts`) but not unified into a clear trust timeline/guardrail comprehension loop.
6. **Backend guardrail and drift primitives already exist.**
   Protected fields, proposal throttling, escalation policies, and approval workflows exist; UX does not yet expose them as one coherent “trust cockpit.”

---

## Option set

| Option | Description | Pros | Cons |
|---|---|---|---|
| `A` (recommended) | Trust OS over existing primitives: wire Brain + interview + setup + agents UI into one explicit trust journey | Fastest path, leverages existing backend investment, least rewrite risk | Requires careful UX orchestration and cross-surface consistency |
| `B` | Build a new standalone trust wizard and separate trust dashboard | Conceptual clarity in isolation | Duplicates builder/brain/agents capabilities, high drift and maintenance |
| `C` | Incremental patching without unified contract | Quick tactical changes | Continues fragmented user mental model and weak trust adoption |

### Recommendation

Adopt **Option A** with a strict trust contract and queue-first execution.

---

## Strategy pillars

1. **Soul-first identity:** every agent starts with a structured identity interview and explicit role framing.
2. **Memory transparency:** every remembered insight has source, consent state, and edit/revoke controls.
3. **Guardrail visibility:** users can see what is immutable, what can drift, and what requires approval.
4. **Team legibility:** users can understand handoffs, escalations, and specialist roles without reading logs.
5. **Dogfooding parity:** super-admins use the same flow to train platform agents daily.
6. **Trust telemetry:** measurable trust outcomes (consent acceptance, drift stability, escalation confidence, intervention rates).

---

## Architecture Coverage Matrix

This matrix is the explicit coverage pass for layer model, memory architecture, guardrails, and trust UX integration.  
Coverage states:

- `covered`: implementation exists and is already mapped into this workstream.
- `partial`: implementation exists but is not yet coherently surfaced in trust UX/runtime flow.
- `missing`: no production implementation in current flow; must be introduced.

| Architecture domain | Required invariant | Current anchors in codebase | Coverage | Queue owner |
|---|---|---|---|---|
| Business layer context model (L1-L4) | Setup and customer conversations must not cross-leak layer context | `convex/ai/systemKnowledge/meta-context.md`; `convex/ai/systemKnowledge/index.ts`; `convex/ai/agentExecution.ts`; `convex/ai/chat.ts` | `partial` | `ATX-002`, `ATX-003`, `ATX-009` |
| Identity/session lifecycle | Auth/session context must gate write actions and preserve org-scoped ownership | `docs/platform/codebase_atlas/flows/F1-identity-session.md`; `convex/auth.ts`; `src/hooks/use-auth.ts`; `convex/rbac*.ts` | `covered` | `ATX-002` (contract mapping only) |
| Guided interview state machine | Interview progression must be deterministic, resumable, and auditable | `convex/ai/interviewRunner.ts`; `convex/schemas/interviewSchemas.ts`; `convex/schemas/agentSessionSchemas.ts`; `src/components/interview/interview-runner.tsx` | `covered` | `ATX-002`, `ATX-006`, `ATX-007` |
| Content DNA object architecture | Interview output must be durable, queryable, and source-attributed | `convex/ai/interviewRunner.ts` (`content_profile` write); `src/components/interview/interview-results.tsx`; `src/components/window-content/brain-window/review-mode.tsx` | `partial` | `ATX-004`, `ATX-008` |
| Memory consent architecture | Memory writes from interview must require explicit user consent states | `docs/pressmaster_onboarding/MEMORY_CONSENT_INTEGRATION.md`; consent-gated extraction/write path in `convex/ai/interviewRunner.ts` | `covered` | `ATX-006` |
| Knowledge ingestion architecture | Brain Teach must persist uploads/links/text with processing status and error traces | `src/components/window-content/brain-window/teach-mode.tsx`; `convex/organizationMedia.ts`; `convex/projectFileSystemInternal.ts` | `covered` | `ATX-005` |
| Runtime knowledge retrieval | Customer-mode responses must consume org knowledge consistently with trust artifacts | `convex/ai/agentExecution.ts`; `convex/organizationMedia.ts`; `convex/ai/memoryComposer.ts` | `covered` | `ATX-002`, `ATX-010` |
| Setup-mode knowledge + artifact generation | Setup mode must drive deterministic interview-to-artifact generation (`agent-config.json`, `kb/*.md`) | `convex/ai/chat.ts`; `src/contexts/builder-context.tsx`; `src/components/builder/builder-chat-panel.tsx`; `src/lib/builder/setup-response-parser.ts` | `partial` | `ATX-009` |
| Setup connect handoff architecture | Generated artifacts must be detected/validated and converted into persisted agent + KB state | `src/lib/builder/agent-config-detector.ts`; connect execution in `src/contexts/builder-context.tsx`; `convex/agentOntology.ts` | `partial` | `ATX-010` |
| Soul core memory model | Soul identity anchors and core-memory policy must be explicit and versioned | `convex/ai/soulEvolution.ts`; `convex/schemas/aiSchemas.ts` (`coreMemory*` validators) | `covered` | `ATX-002`, `ATX-011` |
| Soul evolution governance | Drift proposals must be throttled, reviewable, and rollback-capable | `convex/ai/soulEvolution.ts`; `convex/schemas/soulEvolutionSchemas.ts`; `src/components/window-content/agents/agent-soul-editor.tsx` | `partial` | `ATX-011` |
| Guardrail enforcement model | Autonomy/tool/block-topic policies must be enforceable at runtime and understandable in UI | `convex/agentOntology.ts`; `convex/ai/toolScoping.ts`; `convex/ai/agentExecution.ts`; `src/components/window-content/agents/agent-tools-config.tsx` | `partial` | `ATX-011` |
| Human-in-the-loop approvals | Tool actions requiring approval must be queueable, executable, and auditable | `convex/ai/agentApprovals.ts`; `src/components/window-content/agents/agent-approval-queue.tsx` | `covered` | `ATX-011` |
| Escalation architecture | Escalations must support detection, takeover, dismissal, resolution, and metrics | `convex/ai/escalation.ts`; `src/components/window-content/agents/agent-escalation-queue.tsx`; `convex/schemas/agentSessionSchemas.ts` | `covered` | `ATX-011`, `ATX-013` |
| Team session/handoff architecture | Multi-agent handoff context must remain legible and traceable to operators | `convex/schemas/agentSessionSchemas.ts` (`teamSession`); `convex/ai/agentExecution.ts`; sessions UI in `src/components/window-content/agents/agent-sessions-viewer.tsx` | `partial` | `ATX-011` |
| Trust telemetry + event taxonomy | All trust milestones must emit deterministic events for analysis and alarms | `convex/objectActions` usage across modules; analytics emitters; current gaps in explicit trust event schema | `partial` | `ATX-003`, `ATX-013` |
| Super-admin platform-agent parity | Platform operators must use the same trust interview/training mechanics as customer orgs | `convex/onboarding/seedPlatformAgents.ts`; super-admin windows under `src/components/window-content/super-admin-organizations-window/*` | `covered` | `ATX-012` |

### Matrix Gate

`ATX-002` is complete only when every `partial`/`missing` row has:

1. one named invariant owner in the queue,
2. a deterministic verification command or profile,
3. a defined trust event surface (if user-visible).

## ATX-002 Partial-Domain Contract Map

This section closes the matrix gate for all `partial` rows by defining deterministic event contracts and verification commands.

Event naming standard:

- `trust.<surface>.<domain>.<action>.v1`

Required base payload on every trust event:

- `event_id`
- `event_version`
- `occurred_at`
- `org_id`
- `mode` (`brain` | `setup` | `agents` | `admin` | `runtime`)
- `channel`
- `session_id`
- `actor_type`
- `actor_id`

1. **Business layer context model (L1-L4)** (`ATX-003`, `ATX-009`)
   - Event contract: `trust.context.layer_boundaries_validated.v1`; `trust.context.layer_violation_blocked.v1`
   - Required payload additions: `source_layer`, `resolved_layer`, `enforcement_action`, `request_origin`
   - Emit points: `convex/ai/systemKnowledge/index.ts`; `convex/ai/chat.ts`; `convex/ai/agentExecution.ts`
   - Contract verify (ATX-002): `rg -n "trust.context.layer_boundaries_validated.v1" docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
   - Implementation verify: `V-TYPE`; `V-LINT`; `V-UNIT`; `V-SETUP-LINT`
2. **Content DNA object architecture** (`ATX-004`, `ATX-008`)
   - Event contract: `trust.brain.content_dna.composed.v1`; `trust.brain.content_dna.source_linked.v1`
   - Required payload additions: `content_profile_id`, `content_profile_version`, `source_object_ids`, `artifact_types`
   - Emit points: `convex/ai/interviewRunner.ts`; `src/components/interview/interview-results.tsx`; `src/components/window-content/brain-window/review-mode.tsx`
   - Contract verify (ATX-002): `rg -n "trust.brain.content_dna.composed.v1" docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
   - Implementation verify: `V-TYPE`; `V-LINT`; `V-BRAIN-LINT`; `V-UNIT`
3. **Memory consent architecture** (`ATX-006`)
   - Event contract: `trust.memory.consent_prompted.v1`; `trust.memory.consent_decided.v1`; `trust.memory.write_blocked_no_consent.v1`
   - Required payload additions: `consent_scope`, `consent_decision`, `memory_candidate_ids`, `consent_prompt_version`
   - Emit points: `convex/ai/interviewRunner.ts`; `src/components/interview/interview-runner.tsx`
   - Contract verify (ATX-002): `rg -n "trust.memory.consent_decided.v1" docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
   - Implementation verify: `V-TYPE`; `V-LINT`; `V-BRAIN-LINT`; `V-UNIT`
4. **Knowledge ingestion architecture** (`ATX-005`)
   - Event contract: `trust.knowledge.ingest_submitted.v1`; `trust.knowledge.ingest_processed.v1`; `trust.knowledge.ingest_failed.v1`
   - Required payload additions: `knowledge_item_id`, `knowledge_kind`, `ingest_status`, `processor_stage`, `failure_reason`
   - Emit points: `src/components/window-content/brain-window/teach-mode.tsx`; `convex/organizationMedia.ts`; `convex/projectFileSystemInternal.ts`
   - Contract verify (ATX-002): `rg -n "trust.knowledge.ingest_submitted.v1" docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
   - Implementation verify: `V-TYPE`; `V-LINT`; `V-BRAIN-LINT`; `V-UNIT`
5. **Setup-mode knowledge + artifact generation** (`ATX-009`)
   - Event contract: `trust.setup.artifact_generation_started.v1`; `trust.setup.artifact_generated.v1`; `trust.setup.artifact_generation_failed.v1`
   - Required payload additions: `setup_session_id`, `artifact_kind`, `artifact_path`, `artifact_checksum`, `generator_model`
   - Emit points: `convex/ai/chat.ts`; `src/contexts/builder-context.tsx`; `src/lib/builder/setup-response-parser.ts`
   - Contract verify (ATX-002): `rg -n "trust.setup.artifact_generation_started.v1" docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
   - Implementation verify: `V-TYPE`; `V-LINT`; `V-SETUP-LINT`; `V-UNIT`
6. **Setup connect handoff architecture** (`ATX-010`)
   - Event contract: `trust.setup.connect_validation_passed.v1`; `trust.setup.connect_validation_failed.v1`; `trust.setup.connect_persisted.v1`
   - Required payload additions: `detected_artifacts`, `validation_status`, `validation_errors`, `persisted_object_ids`
   - Emit points: `src/lib/builder/agent-config-detector.ts`; `src/contexts/builder-context.tsx`; `convex/agentOntology.ts`
   - Contract verify (ATX-002): `rg -n "trust.setup.connect_persisted.v1" docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
   - Implementation verify: `V-TYPE`; `V-LINT`; `V-SETUP-LINT`; `V-UNIT`
7. **Soul evolution governance** (`ATX-011`)
   - Event contract: `trust.soul.proposal_created.v1`; `trust.soul.proposal_reviewed.v1`; `trust.soul.rollback_executed.v1`
   - Required payload additions: `proposal_id`, `proposal_version`, `risk_level`, `review_decision`, `rollback_target`
   - Emit points: `convex/ai/soulEvolution.ts`; `src/components/window-content/agents/agent-soul-editor.tsx`
   - Contract verify (ATX-002): `rg -n "trust.soul.proposal_created.v1" docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
   - Implementation verify: `V-TYPE`; `V-LINT`; `V-AGENTS-LINT`; `V-UNIT`
8. **Guardrail enforcement model** (`ATX-011`)
   - Event contract: `trust.guardrail.policy_evaluated.v1`; `trust.guardrail.policy_blocked.v1`; `trust.guardrail.policy_overridden.v1`
   - Required payload additions: `policy_type`, `policy_id`, `tool_name`, `enforcement_decision`, `override_source`
   - Emit points: `convex/ai/toolScoping.ts`; `convex/ai/agentExecution.ts`; `src/components/window-content/agents/agent-tools-config.tsx`
   - Contract verify (ATX-002): `rg -n "trust.guardrail.policy_blocked.v1" docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
   - Implementation verify: `V-TYPE`; `V-LINT`; `V-AGENTS-LINT`; `V-UNIT`
9. **Team session/handoff architecture** (`ATX-011`)
   - Event contract: `trust.team.handoff_started.v1`; `trust.team.handoff_completed.v1`; `trust.team.handoff_dropped_context.v1`
   - Required payload additions: `team_session_id`, `handoff_id`, `from_agent_id`, `to_agent_id`, `context_digest`
   - Emit points: `convex/ai/agentExecution.ts`; `convex/schemas/agentSessionSchemas.ts`; `src/components/window-content/agents/agent-sessions-viewer.tsx`
   - Contract verify (ATX-002): `rg -n "trust.team.handoff_started.v1" docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
   - Implementation verify: `V-TYPE`; `V-LINT`; `V-AGENTS-LINT`; `V-UNIT`
10. **Trust telemetry + event taxonomy** (`ATX-003`, `ATX-013`)
   - Event contract: `trust.telemetry.schema_registered.v1`; `trust.telemetry.schema_validation_failed.v1`; `trust.telemetry.kpi_checkpoint.v1`
   - Required payload additions: `taxonomy_version`, `event_namespace`, `schema_validation_status`, `metric_name`, `metric_value`
   - Emit points: analytics/trust emitters in `convex/ai/*`; downstream dashboards/tests in lane `G`
   - Contract verify (ATX-002): `rg -n "trust.telemetry.schema_registered.v1" docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
   - Implementation verify: `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS`
11. **Super-admin platform-agent parity** (`ATX-012`)
   - Event contract: `trust.admin.training_session_started.v1`; `trust.admin.training_artifact_published.v1`; `trust.admin.training_session_completed.v1`
   - Required payload additions: `platform_agent_id`, `training_template_id`, `parity_mode`, `customer_agent_template_link`
   - Emit points: `convex/onboarding/seedPlatformAgents.ts`; `src/components/window-content/super-admin-organizations-window/*`
   - Contract verify (ATX-002): `rg -n "trust.admin.training_session_started.v1" docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
   - Implementation verify: `V-TYPE`; `V-LINT`; `V-UNIT`

ATX-002 close condition is now explicit and deterministic:

1. every `partial` row has event names, payload requirements, and emit points,
2. every `partial` row has a concrete contract verification command,
3. every `partial` row maps to implementation verification profiles already defined in `TASK_QUEUE.md`.

---

## Phase-to-lane mapping

| Phase | Objective | Queue lanes | Queue tasks |
|---|---|---|---|
| Phase 1 | Trust contract and event model | `A` | `ATX-001`..`ATX-003` |
| Phase 2 | Brain trust data realism + memory consent UX | `B` | `ATX-004`..`ATX-006` |
| Phase 3 | Soul-building interview framework | `C` | `ATX-007`..`ATX-008` |
| Phase 4 | Setup-mode trust interview + connect wiring | `D` | `ATX-009`..`ATX-010` |
| Phase 5 | Agent team trust cockpit | `E` | `ATX-011` |
| Phase 6 | Super-admin platform agent training loop | `F` | `ATX-012` |
| Phase 7 | Instrumentation, hardening, release closeout | `G` | `ATX-013`..`ATX-014` |
| Phase 8 | Agent control center thread model + lifecycle optics | `H` | `ATX-015`..`ATX-017` |
| Phase 9 | Human in-loop provider ingress parity | `I` | `ATX-018`..`ATX-020` |

---

## Delivery waves

1. **Wave 0:** lock trust contract/event taxonomy (lane `A`) so all surfaces use the same semantics.
2. **Wave 1:** wire Brain and interview trust loop (`B` + `C`) in parallel after contract is done.
3. **Wave 2:** complete setup-mode runtime wiring and connect handoff (`D`).
4. **Wave 3:** ship trust cockpit surfaces in Agents window and super-admin training parity (`E` + `F`).
5. **Wave 4:** validate metrics, tests, docs, and rollout controls (`G`).
6. **Wave 5:** lock control-center data contracts and thread-level operator optics (`H`).
7. **Wave 6:** ship in-stream human intervention parity for Telegram/Slack/Webchat (`I`).

## Execution updates

1. **2026-02-17 (`ATX-004` complete):** Brain Review moved from `MOCK_KNOWLEDGE_ITEMS` to real org-scoped data retrieval via `convex/brainKnowledge.ts`, including deterministic category/search filtering and explicit loading/empty/error states in `src/components/window-content/brain-window/review-mode.tsx`.
2. **2026-02-17 (`ATX-005` complete):** Brain Teach moved from simulated timeout ingestion to real upload/link/text persistence paths (`organizationMedia.*` + `convex/brainKnowledge.ts`) with persisted ingest status/failure reasons and trust knowledge ingest telemetry events.
3. **2026-02-17 (`ATX-006` complete):** Interview runtime now enforces explicit memory consent before durable writes: completion prompts consent with source-attributed phase summaries, `decideMemoryConsent` handles accept/decline with trust events, and decline/revoke path removes previously persisted Content DNA for reversible consent UX.
4. **2026-02-17 (`ATX-007` complete):** Replaced default interview seeds with trust-first template set (`Customer Agent Identity Blueprint`, `Agent Team Shape Charter`, `Platform Agent Trust Training`), each explicitly collecting identity anchors, guardrails, handoff boundaries, and drift cues for cross-surface consumption.
5. **2026-02-17 (`ATX-008` complete):** Interview persistence now emits a shared trust artifact bundle (`trust-artifacts.v1`) that includes `Soul Card`, `Guardrails Card`, `Team Charter`, and `Memory Ledger` with source attribution; artifact rendering is integrated in `src/components/interview/interview-results.tsx`, and Brain review summaries in `convex/brainKnowledge.ts` now expose artifact coverage + handoff/drift cue visibility.
6. **2026-02-17 (`ATX-009` complete):** Setup mode now auto-kicks off deterministically when wizard chat is empty, forces built-in provider for setup interviews, parses fenced setup artifacts (`agent-config.json`, `kb/*.md`), persists generated files to builder workspace, and surfaces explicit setup validation/warning feedback.
7. **2026-02-17 (`ATX-010` complete):** Connect flow now consumes setup artifacts with deterministic detection + validation feedback, blocks invalid setup configs with actionable errors, creates/links `org_agent` records from `agent-config.json`, imports `kb/*.md` into organization docs, and registers those docs as durable knowledge items.
8. **2026-02-18 (`ATX-011` complete):** Agents window now includes a dedicated trust cockpit tab that unifies drift indicators, guardrail map, approval/escalation narrative, and an action-first trust timeline (soul proposals, approvals, escalations, and team handoffs); approval queue rendering now surfaces explainable intent/context summaries instead of raw payload dumps while preserving existing approve/reject and escalation handling behaviors.
9. **2026-02-18 (`ATX-012` complete):** Super-admin parity loop is now live: `convex/onboarding/seedPlatformAgents.ts` upserts the trust parity templates (`Platform Agent Trust Training` + `Customer Agent Identity Blueprint`), exposes guarded daily start/publish mutations (`startTrustTrainingSession`, `publishTrustTrainingSession`) with operator confirmation tokens/notes, and emits admin trust events (`trust.admin.training_session_started.v1`, `trust.admin.training_artifact_published.v1`, `trust.admin.training_session_completed.v1`). Super-admin UI now includes a dedicated `Platform Agent Trust` tab wired to the same guided interview + trust artifact workflow used by customer-facing training.
10. **2026-02-18 (`ATX-013` complete):** Added lane-`G` trust telemetry implementation in `convex/ai/trustTelemetry.ts`, including deterministic dashboard catalog, KPI baseline/target/alert threshold contracts, KPI checkpoint payload builder for `trust.telemetry.kpi_checkpoint.v1`, and rollout guardrail evaluators with `proceed`/`hold`/`rollback` decisions. Added regression coverage in `tests/unit/ai/trustTelemetryDashboards.test.ts`.
11. **2026-02-18 (`ATX-014` complete):** Published staged rollout gates and rollback playbook in this document, synchronized lane `G` queue/index artifacts, and re-ran verification suite for closeout (`V-TYPE`, `V-LINT`, `V-UNIT`, `V-DOCS`).
12. **2026-02-18 (`ATX-015` complete):** Added explicit Agent Control Center contracts in `/agent-trust-experience/AGENT_CONTROL_CENTER_SPEC.md` and `/agent-trust-experience/AGENT_CONTROL_CENTER_DATA_CONTRACT.md`, including canonical thread-row, timeline, intervention, and spawn-lineage payloads locked to lifecycle state naming.
13. **2026-02-18 (`ATX-018` complete):** Documented HITL ingress policy and current provider capability posture (Telegram/Slack/Webchat) with a parity target for in-stream operator replies routed through channel delivery + trust/audit events.
14. **2026-02-18 (`ATX-016` complete):** Added thread-level control-center optics in Agents UI: backend `getControlCenterThreadRows` now computes canonical lifecycle state plus separate delivery state (`queued`/`running`/`done`/`blocked`/`failed`), escalation urgency/count, active-instance counts, and waiting-on-human-first ordering. Trust cockpit now renders lifecycle/delivery badges plus escalation + active-instance indicators per thread, and Agents header now surfaces org-level waiting-on-human count. Most recent verification rerun (2026-02-19): `V-TYPE` pass, `V-AGENTS-LINT` pass with existing warnings (`0` errors, `92` warnings), `V-UNIT` pass (`73` files, `355` tests).
15. **2026-02-18 (`ATX-017` complete):** Added canonical escalation-gate mapping (`pre_llm`/`post_llm`/`tool_failure`/`not_applicable`) in `convex/ai/agentLifecycle.ts`, implemented `getControlCenterThreadDrillDown` in `convex/ai/agentSessions.ts` to return lifecycle checkpoint timeline events + instance lineage summaries for a selected thread, and updated `agent-trust-cockpit.tsx` with selectable thread drill-down that groups timeline rows by checkpoint gate and renders per-instance lineage details (template, parent, handoff reason, active state). Also aligned escalation object-action `reason` fields with lifecycle transition reasons on takeover/dismiss/resolve paths to preserve intervention reason fidelity. Verification: `V-TYPE` failed on pre-existing non-lane issues (`convex/http.ts`, `src/components/chat-widget/*`), `V-AGENTS-LINT` passed with existing warnings (`0` errors, `90` warnings), `V-UNIT` passed (`68` files, `337` tests).
16. **2026-02-18 (`ATX-019` complete):** Conversations API in-stream operator replies now require handed-off session state, dispatch outbound through `internal.channels.router.sendMessage`, and persist operator reply parity artifacts: `session_reply_in_stream`/`session_reply_in_stream_failed` object-action audits with reason + channel/session provenance, delivered assistant-turn persistence, trust event emission (`trust.lifecycle.operator_reply_in_stream.v1`), and control-center timeline rendering of operator reply lifecycle rows in `getControlCenterThreadDrillDown`. Verification: `V-TYPE` failed on pre-existing non-lane errors in `src/components/window-content/web-publishing-window/*`; `V-LINT` passed with existing warnings (`0` errors, `2953` warnings); `V-UNIT` passed (`69` files, `340` tests); `V-HITL-LINT` passed with existing warnings (`0` errors, `129` warnings).
17. **2026-02-18 (`ATX-020` complete):** Provider-native HITL quick-action parity is now shipped for Telegram, Slack, and Webchat: added shared quick-action mutation (`handleProviderQuickActionInternal`) in `convex/ai/escalation.ts` so takeover/resume flows share lifecycle checkpoint + actor/reason audit semantics; added Telegram `esc_resume` callback support plus callback actor metadata forwarding; added Slack slash command quick-action bridge (`hitl takeover|resume <sessionId>`) in `convex/channels/webhooks.ts` that bypasses inbound message ingestion; added webchat HITL endpoint (`/api/v1/webchat/hitl`) plus quick-action controls in `ChatWidget.tsx`; and published channel runbook/capability updates in `AGENT_CONTROL_CENTER_DATA_CONTRACT.md`. Verification: `V-TYPE` failed on pre-existing non-lane TS2589 in `src/components/window-content/super-admin-organizations-window/system-organizations-tab.tsx`; `V-LINT` passed with existing warnings (`0` errors, `2961` warnings); `V-UNIT` passed (`71` files, `346` tests); `V-DOCS` passed.

---

## Acceptance criteria

1. Brain `Review` and `Teach` use real org data/mutations, not mocks/simulations.
2. Interview flow supports explicit memory consent checkpoints and phase-level memory summaries.
3. Setup mode can produce and persist `agent-config.json` + KB docs and pass them through connect reliably.
4. Agents UI exposes soul drift state, guardrails, approvals, and escalations in one coherent flow.
5. Super-admin can run the same trust workflow for platform agents and inspect outcomes.
6. Trust telemetry events are emitted with deterministic names and channel/mode context.
7. Queue verification commands pass for completed rows, including `npm run docs:guard`.
8. Agent control center thread rows, timeline events, and intervention actions use one typed contract across UI and backend.
9. Human in-loop entrypoints are explicit: Agents UI is primary, and provider ingress parity is defined for Telegram/Slack/Webchat.

---

## Non-goals

1. No redesign of unrelated billing/store/checkout architecture.
2. No rewrite of core LLM runtime orchestration.
3. No replacement of existing onboarding funnel stream work.

---

## Risks and mitigations

1. **Overlapping trust concepts across surfaces create inconsistent UX.**
   Mitigation: define one trust contract (`ATX-002`) and enforce it as the dependency gate for downstream work.
2. **Memory consent UX may reduce extraction speed or completion rates.**
   Mitigation: phased prompts, configurable consent granularity, and instrumentation to tune friction.
3. **Setup mode might still fail to hand off generated artifacts to connect.**
   Mitigation: wire parser/detector + deterministic integration tests and connect fallback checks.
4. **Drift/guardrail UI may expose noise without actionable guidance.**
   Mitigation: prioritize “why this changed,” “risk level,” and “what to do next” summaries over raw logs.

---

## Success metrics

1. Interview completion rate for trust interview templates.
2. Memory consent accept/reject/edit rates by phase.
3. Time-to-first-trusted-agent (from open wizard to active supervised agent).
4. Soul proposal approval quality (approval ratio + post-approval rollback rate).
5. Escalation confidence metrics (false positives, takeover latency, resolution rate).
6. Super-admin daily trust-loop usage for platform agents.

---

## ATX-013 trust telemetry dashboards

Canonical telemetry contracts for lane `G` are now defined in `convex/ai/trustTelemetry.ts` with regression coverage in `tests/unit/ai/trustTelemetryDashboards.test.ts`.

| Dashboard | Modes | KPI keys |
|---|---|---|
| `Trust Funnel Health` | `brain` | `trust_interview_completion_rate`; `trust_memory_consent_accept_rate` |
| `Trust Setup Runtime` | `setup` | `trust_setup_connect_success_rate`; `trust_time_to_first_trusted_agent_minutes` |
| `Trust Agent Operations` | `agents`, `runtime` | `trust_soul_post_approval_rollback_rate`; `trust_team_handoff_context_loss_rate` |
| `Trust Admin Parity` | `admin` | `trust_admin_training_completion_rate` |

### Trust KPI baselines and alert thresholds

| KPI key | Baseline | Target | Warning threshold | Critical threshold | Window | Guardrail action |
|---|---:|---:|---:|---:|---:|---|
| `trust_interview_completion_rate` | `0.78` | `>=0.85` | `<0.72` | `<0.65` | `24h` | `hold` on warning, `rollback` on critical |
| `trust_memory_consent_accept_rate` | `0.67` | `>=0.74` | `<0.58` | `<0.50` | `24h` | `hold` on warning, `rollback` on critical |
| `trust_setup_connect_success_rate` | `0.88` | `>=0.94` | `<0.80` | `<0.72` | `24h` | `hold` on warning, `rollback` on critical |
| `trust_time_to_first_trusted_agent_minutes` | `45` | `<=30` | `>65` | `>90` | `24h` | `hold` on warning, `rollback` on critical |
| `trust_soul_post_approval_rollback_rate` | `0.05` | `<=0.03` | `>0.07` | `>0.10` | `24h` | `hold` on warning, `rollback` on critical |
| `trust_team_handoff_context_loss_rate` | `0.03` | `<=0.02` | `>0.05` | `>0.08` | `24h` | `hold` on warning, `rollback` on critical |
| `trust_admin_training_completion_rate` | `0.70` | `>=0.82` | `<0.62` | `<0.55` | `24h` | `hold` on warning, `rollback` on critical |

Lane `G` rollout guardrail contract:

1. Any critical KPI breach returns `rollback`.
2. Any warning KPI or missing required KPI returns `hold`.
3. Full required-KPI green state returns `proceed`.

---

## ATX-014 staged rollout and rollback playbook

### Staged rollout gates

| Stage | Exposure | Entry gate | Exit gate | Hard stop trigger |
|---|---|---|---|---|
| `0` (shadow) | Internal operator validation only | `ATX-013` telemetry contracts and tests are green in CI | 24h with all required KPIs observed and no criticals | Any missing required KPI after 24h |
| `1` (canary) | Limited org cohort | Stage `0` exit gate met; trust cockpit operators staffed | 48h with zero critical KPIs and max one warning KPI window | Any critical KPI in two consecutive windows |
| `2` (widened) | Broad but controlled rollout | Stage `1` exit gate met and warning KPI has remediation owner | 7d with no unresolved warning KPIs and stable handoff/rollback metrics | Any unresolved warning KPI > 48h |
| `3` (general availability) | Full trust OS rollout | Stage `2` exit gate met; rollback drill completed within last 7d | Ongoing monthly audit on KPI thresholds and taxonomy drift | Any critical KPI or failed monthly drill |

### Release checklist

1. Run queue verification commands exactly: `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run docs:guard`.
2. Confirm dashboard KPI windows include all required metrics in `TRUST_ROLLOUT_REQUIRED_METRICS`.
3. Confirm on-call owner for each warning/critical KPI before promoting rollout stage.
4. Confirm trust event taxonomy version in telemetry payloads matches `TRUST_EVENT_TAXONOMY_VERSION`.
5. Record stage entry timestamp, owner, and expected review checkpoint in release notes.

### Rollback playbook

1. Freeze stage promotion immediately and record incident start time.
2. If any KPI is `critical`, revert rollout to the previous stage within the same review window.
3. Route all new high-risk trust changes (soul proposal approvals, guardrail overrides) through explicit human review until KPIs return to `ok`.
4. Re-run verification suite and confirm dashboard snapshot returns `hold` or `proceed` (no `rollback`) before re-widening.
5. Publish a post-incident note with root cause, corrective action, and threshold tuning decision.

---

## Status snapshot

- Baseline trust-gap audit is complete (`ATX-001` `DONE`).
- Trust contract normalization is complete (`ATX-002` `DONE`) with explicit partial-domain event contracts and verification commands.
- Lane `A` taxonomy implementation is complete (`ATX-003` `DONE`) with canonical event registry + mode map + payload validator surface (`convex/ai/trustEvents.ts`; `convex/schemas/aiSchemas.ts`; `tests/unit/ai/trustEventTaxonomy.test.ts`).
- Verification snapshot (lane `H`/`I` docs kickoff): `V-DOCS` pass for contract/policy sync updates.
- Lanes `A` through `I` are complete through `ATX-020` (verification baseline still includes one pre-existing non-lane `V-TYPE` failure).
