# Life Operator One-of-One Cutover Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover`  
**Last updated:** 2026-03-02

---

## Mission

Shift delivery from multi-agent catalog commerce toward a single user-owned Life Operator that is uniquely tuned to one human and improves through verified outcomes.

Target runtime shape:

1. one primary operator identity per user,
2. specialist capabilities as modular skill packs (not separate runtime personas by default),
3. explicit permission ladder (`suggest`, `ask`, `delegated_auto`, `full_auto`) with rollback/audit,
4. global model improvements never overwrite personal identity memory.

Behavioral contract baseline:

1. Distinct runtime behavior uses layered controls, not prompt cosmetics: `prompt + memory + policy + tools + eval + trust`.
2. A `soul` is treated as packaging for that full stack in a scoped operator/specialist context.
3. Canonical contract source: `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/BEHAVIORAL_SYSTEM_CONTRACT.md`.

Demo posture baseline:

1. Customer-facing UX remains one visible operator.
2. Specialist depth is routed behind the scenes through capability packs.
3. Demo quality is measured by utility + trust + clarity, not persona styling.

---

## Code Reality Snapshot

Primary one-agent/runtime foundations are already in place and should be extended, not replaced:

1. one-agent harness contracts and authority invariants: `/Users/foundbrand_001/Development/vc83-com/convex/ai/harness.ts`
2. ingress authority and tool-gating paths: `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`
3. personal-operator execution stream and trust controls: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`

Misaligned operator-facing expansion already shipped and now under cutover cleanup:

1. Agent Store UI entrypoint and catalog clone handoff in agents window (default entrypoint removed by `LOC-004`, residual code cleanup pending): `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents-window.tsx`
2. Agent Store browse/compare/clone panel: `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-store-panel.tsx`
3. 104-agent store API surface: `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentStoreCatalog.ts`
4. recommender ranking engine built for broad catalog routing: `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentRecommendationResolver.ts`

---

## Open Workstream Audit (2026-02-25)

High-open queues and direction impact:

| Workstream | Open rows | Direction fit |
|---|---:|---|
| `your-ai-one-agent-core` | `4` | Freeze parity reopen rows (`YAI-018`..`YAI-021` `BLOCKED`) unless explicit cutover override |
| `reusable-av-core-agent-harness` | `11` | Keep (multimodal utility for primary operator) |
| `expo-operator-edge-app` | `15` | Keep, but only as primary-operator mobile surface |
| `platform-usage-accounting-guardrails` | `4` | Keep (trust + business safety) |
| `i18n-untranslated-coverage` | `7` | Keep (quality + reliability) |
| `book-agent-productization` | `0` | Frozen rows (`AGP-021`..`AGP-035`) remain `BLOCKED` |
| `product-os-community-roadmap` | `0` | Paused by `LOC-003` (`ACR-001`..`ACR-027` `BLOCKED`) |
| `product-rename-sevenlayers` | `0` | Paused by `LOC-003` (`PRN-002`..`PRN-051` `BLOCKED`) |
| `ui-perfection-workstream` | `0` | Paused by `LOC-003` (`UIP-013`, `UIP-014` `BLOCKED`) |

Interpretation:

1. core one-of-one runtime path exists and is closer to completion than the marketplace path,
2. largest remaining effort is currently concentrated in non-core catalog-commerce and broad product/community work,
3. fast path is cut/freeze of misaligned rows plus cleanup of shipped store/recommender surfaces.

---

## Cut Criteria

A task stays active only if it materially improves one of these:

1. meaningful life-task completion rate,
2. trust/safety guarantees for external actions,
3. private context quality and continuity,
4. user-specific utility compounding over time.

A task is frozen/deferred when it primarily optimizes:

1. multi-agent catalog breadth,
2. operator marketplace merchandising/commerce,
3. broad brand/community polish before core utility reliability.

---

## Pivot Decisions

### Keep (execute now)

1. `AVR-003`..`AVR-013` (AV harness core).
2. `EXPO-003`..`EXPO-017` (mobile execution surface, one-operator-first constraints).
3. `PUAG-003`..`PUAG-006` and `IUC-015`..`IUC-021` (guardrails and quality debt).

### Freeze (applied)

1. `AGP-021`..`AGP-035` moved to `BLOCKED` under one-of-one pivot lock.
2. `YAI-018`..`YAI-021` moved to `BLOCKED` as deprecated by one-of-one cutover (unfreeze only via explicit cutover override that re-prioritizes live camera/voice parity).

### Defer (applied)

1. `LOC-003` applied explicit pause policy with `BLOCKED` + unfreeze condition for non-core streams (`ACR-*`, `PRN-*`, `UIP-013`, `UIP-014`).

---

## Progress Snapshot

1. `LOC-001` and `LOC-002` are complete (triage + AGP freeze lock).
2. `LOC-003` is complete: non-core open streams were paused with explicit `BLOCKED` reason + unfreeze condition (`LOC-009` done + cutover override).
3. `LOC-004` is complete: default operator creation path in `agents-window` no longer opens Agent Store; it now routes to primary-operator creation assistant.
4. `LOC-005` is complete: backend legacy store/recommender endpoints now fail closed behind default-`OFF` compatibility flags (`AGENT_STORE_COMPATIBILITY_ENABLED`, `AGENT_RECOMMENDER_COMPATIBILITY_ENABLED`) with additive compatibility metadata.
5. `LOC-006` is `DONE` (one-of-one replacement/archival of stale operator-commerce docs) and `LOC-008` is `DONE` (user-owned memory graph + permission ladder contracts published with rollback/audit guarantees in one-agent-core and personal-operator plans).
6. `LOC-007` is complete: catalog/matrix/seed docs now enforce capability-pack semantics under a layered behavioral-system contract with trust as a first-class layer.
7. `LOC-009` is complete: one-of-one acceptance matrix evidence is now published and verified.
8. `LOC-010` is complete: rollout/rollback closeout playbook is published at `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/ROLLOUT_ROLLBACK_PLAYBOOK.md`.
9. `LOC-011` is complete: capability-pack taxonomy is now active with deterministic schema, catalog-slice mapping, and founder demo pack registry.
10. `LOC-012` is complete: resolver/UI now enforce deterministic `available_now` vs `blocked` capability status with concrete unblocking steps and fail-closed unknown prerequisites.
11. `LOC-013` is complete: founder demo playbooks are finalized with deterministic pass/fail checkpoints and fail-closed preflight gates across seven scenarios (`FND-001`..`FND-007`), including the refreshed `FND-006` pharmacist vacation scheduler in Slack + Google Calendar with policy-based conflict mediation.
12. `LOC-014` is complete: demo-readiness scorecard now enforces deterministic rehearsal gates with fail-closed evidence requirements across seven scenarios.
13. Lane `F` memory completion is closed: `LOC-015`..`LOC-020` are `DONE` (tenant-scoped pinned notes + fail-closed RBAC + deterministic prompt injection + rolling summary/recent-context budgeting + inactivity-triggered reactivation cache + structured contact memory with provenance/merge gates and scoped continuity boundaries + explicit `aiAgentMemory` runtime `deprecate` contract with fail-closed scope evaluation and memory-lane telemetry).
14. Lane `G` pharmacist-vacation track is complete: `LOC-021`..`LOC-025` are `DONE` (contract + Slack parser/envelope persistence + deterministic policy/calendar evaluator + owner policy configuration UI + deterministic conflict mediation with trust-evidenced outcomes).
15. Lane `H` baseline runtime send/sync + AV command-gating + concierge telemetry + parity/hardening foundation are complete: `LOC-032`, `LOC-026`, `LOC-027`, `LOC-028`, `LOC-029`, `LOC-030`, `LOC-031`, `LOC-033`, and `LOC-034` are `DONE` (latest on 2026-03-01).
16. `LOC-033` closed webchat/iPhone send-envelope metadata parity by forwarding `commandPolicy`, `transportRuntime`, and `avObservability` through web send contracts.
17. `LOC-034` delivered transport/session attestation fail-closed enforcement (`tcg_mobile_transport_session_attestation_v1`) across ingress/runtime contracts, with deterministic fallback traceability and mutation-authority invariant blocks when attestation drifts.
18. `LOC-035` is now `DONE`: root typecheck blocker in `src/components/window-content/agents/agent-escalation-queue.tsx` (`TS2589`) is resolved, follow-on mobile typecheck token-index issue in `apps/operator-mobile/app/(tabs)/index.tsx` is resolved, desktop e2e baseline is green, and `AVR-012`/`FOG2-016` remain satisfied.
19. `LOC-036` is complete: operator-mobile Expo command scripts now enforce a supported Node runtime contract (`>=20`, `<24`) with deterministic fail-fast guidance, removing the local Node 24 iOS startup blocker.
20. `LOC-037` is complete: iPhone preflight CI + implementation/runbook sync are active (`.github/workflows/operator-mobile-ios-preflight.yml` + `IPHONE_GTM_CI_IMPLEMENTATION.md`), with explicit linkage to lane-`H` parity gates.
21. Lane `J` cleanup stabilization sprint is complete: `LOC-038`..`LOC-042` are `DONE` with deterministic verify subset evidence captured for the alias-retirement closeout row.
22. External workstreams required for this live mobile concierge path are fully closed: ORV (`ORV-001`..`ORV-019`) is `DONE`, AVR (`AVR-001`..`AVR-013`) is `DONE`, and AOH (`AOH-001`..`AOH-014`) is `DONE`.
23. Lane `K` demo-ops rollout is complete for Option A (`Der Terminmacher`): `LOC-043`..`LOC-047` are `DONE`; lane-`K` rehearsals are green (`FND-007-C3` recovered, founder aggregate `GO`) and deterministic degraded-path choreography is codified.
24. Final production-demo signoff is `GO`: consolidated ORV/AVR/AOH/LOC readiness evidence with explicit founder demo-ops handoff.
25. `LOC-048` is complete as post-signoff hardening: Appointment Booking Specialist is now the deterministic self-sufficient path for medical-follow-up routing (integrations ready), removing planned-path drift from lane-`K` readiness output while preserving iPhone preflight + agentic sanity gates.
26. Maintenance pass on 2026-03-02 found no recommender/runtime/docs drift for the self-sufficient medical-follow-up contract and closed `LOC-049` (`DONE`) as the deterministic drift-watch rerun row for lane-`K` GO continuity.

---

## Execution Waves

1. `Wave 1` (`LOC-001`, `LOC-002`, `LOC-003`): strategy lock and queue freeze/defer matrix (`LOC-001`, `LOC-002`, `LOC-003` done).
2. `Wave 2` (`LOC-004`, `LOC-005`, `LOC-006`): remove marketplace defaults and fail-close legacy store APIs (`LOC-004`, `LOC-005`, and `LOC-006` done).
3. `Wave 3` (`LOC-007`, `LOC-008`): catalog-contract refactor and memory/permission contract publication are complete (`LOC-007` and `LOC-008` done).
4. `Wave 4` (`LOC-009`, `LOC-010`): acceptance verification and rollout/rollback closeout are complete.
5. `Wave 5` (`LOC-011`..`LOC-014`): `LOC-011`, `LOC-012`, `LOC-013`, and `LOC-014` are complete.
6. `Wave 6` (`LOC-015`..`LOC-020`): memory runtime completion under one-operator authority contract is now complete (`LOC-015`..`LOC-020` are `DONE`).
7. `Wave 7` (`LOC-021`..`LOC-025`): pharmacist vacation scheduler implementation (Slack parser, Google overlap evaluator, owner policy UI, conflict mediation response generator) is complete with dependency gate satisfied after lane `F` closeout.
8. `Wave 8` (`LOC-032`, `LOC-026`..`LOC-031`): lane-`H` unblock + baseline mobile-first concierge runtime (iPhone ingress, guarded command execution, telemetry) followed by hardening.
9. `Wave 9` (`LOC-033`..`LOC-035`): cross-surface parity closure and launch-gate evidence (webchat + iPhone metadata parity, Meta-stream hardening completion, and external done-gates `AVR-012` + `FOG2-016`; both external gates are satisfied as of 2026-02-27).
10. `Wave 10` (`LOC-036`, `LOC-037`): iPhone release hygiene closeout (Node runtime guard, icon preflight checks, dedicated preflight CI workflow, and go-to-market implementation contract).
11. `Wave 11` (`LOC-038`..`LOC-042`): cleanup stabilization sprint is complete (`LOC-038`..`LOC-042` done).
12. `Wave 12` (`LOC-043`..`LOC-047`): Der Terminmacher demo-ops lock is complete (`LOC-043`..`LOC-047` done) covering stage script mapping, fail-closed reality sanity gate, iPhone/toolchain/integration readiness, contract-fix closure + artifact-backed rehearsal proof, live failover choreography, and final production-demo GO/NO_GO signoff.
13. `Wave 13` (`LOC-048`): post-signoff specialist-path hardening is complete, with deterministic appointment self-sufficient routing and rerun readiness gates (`typecheck`, `iOS preflight`, agentic sanity, docs guard).
14. `Wave 14` (`LOC-049`): post-signoff drift-watch maintenance rerun is complete; recommender/runtime/docs contracts remain aligned and lane-`K` `GO` evidence is current.

---

## Cleanup Stabilization Path (Lane J)

Deterministic order:

1. `LOC-038` (`P0`, `DONE`): fixed user-blocking simulator signup Tab-focus transition bug (email -> password) and confirmed with green verify stack plus manual simulator hardware-Tab traversal.
2. `LOC-039` (`P0`, `DONE`): established lane-scoped hygiene controls in docs/queue for high-concurrency churn (ownership matrix + parking protocol + deterministic verify subsets).
3. `LOC-040` (`P0`, `DONE`): validated global Convex typecheck baseline and targeted `voiceRuntime` + onboarding coverage; pre-existing `GenericActionCtx`/`db` blocker is not reproducible.
4. `LOC-041` (`P1`, `DONE`): operator-mobile `expo-av` migration dependency gate is closed.
5. `LOC-042` (`P1`, `DONE`): onboarding alias phase-6 cleanup row is closed; prior unrelated `TS7053` blocker is no longer reproducible and deterministic verify subset is green (`V-TYPE`, onboarding unit subset, alias-reference audit, `V-DOCS`).

Constraints:

1. Lane `J` may preempt lane `H` execution while preserving deterministic lane sequence (`LOC-035` remains the next lane-`H` row).
2. Keep runtime trust/approval invariants fail-closed while touching onboarding or voice runtime boundaries.
3. Use row-level verify gates exactly and sync queue/index/master/session artifacts at lane milestones.

### Lane `J` blast-radius controls (`LOC-039`)

1. File ownership boundaries are row-scoped and fail closed:
   - `LOC-039`: workstream docs only (`TASK_QUEUE.md`, `INDEX.md`, `MASTER_PLAN.md`, `SESSION_PROMPTS.md`).
   - `LOC-040`: `convex/ai/voiceRuntime.ts` + targeted unit tests in `tests/unit/ai/voiceRuntime*.test.ts` and `tests/unit/onboarding/*`.
   - `LOC-041`: operator-mobile audio/runtime + dependency manifests (`useMobileVoiceRuntime.ts`, `VoiceRecorder.tsx`, `package.json`, `package-lock.json`).
   - `LOC-042`: onboarding alias retirement surfaces + decision log.
2. Unrelated dirty deltas are parked before verify/commit prep with path-scoped stash and revalidated via `git status --short`; if non-owned deltas cannot be isolated cleanly, row status moves to `BLOCKED`.
3. Deterministic verification subsets are row-bound:
   - `LOC-039`: `npm run docs:guard`.
   - `LOC-040`: `npm run typecheck` + `npx vitest run tests/unit/ai/voiceRuntime*.test.ts tests/unit/onboarding`.
   - `LOC-041`: `cd apps/operator-mobile && npm run typecheck`; `npx vitest run tests/unit/ai/mobileRuntimeHardening.test.ts tests/unit/ai/mobileGlassesBridge.test.ts`; `cd apps/operator-mobile && npm run ci:ios:preflight`; zero `expo-av` references check.
   - `LOC-042`: `npm run typecheck`; `npx vitest run tests/unit/onboarding`; alias-reference audit; `npm run docs:guard`.
4. `LOC-039` completion gate is satisfied (`DONE`): controls are synchronized in queue/index/master/session artifacts and `V-DOCS` passed.

Closure evidence (`LOC-041`):

1. Operator-mobile audio runtime/dependency migration now uses `expo-audio`/`expo-video` and removes `expo-av` references.
2. Verification subset is green: mobile typecheck, targeted mobile hardening/glasses tests, iOS preflight, and `expo-av` grep gate.
3. Runtime compatibility preserved for existing chat surfaces (`suspendSession`, `finalizeStreamingUtterance`) under fail-closed voice capture/transcription behavior.

---

## Demo Knockout Path (Lane E)

1. Formalize capability packs from catalog rows (`LOC-011`) so one operator can route hidden specialist depth consistently. (`DONE`)
2. Expose deterministic `available_now` vs `blocked` explanations with unblocking steps (`LOC-012`) to avoid vague demo behavior. (`DONE`)
3. Run seven scripted founder-priority playbooks under seven minutes each (`LOC-013`) using one-operator orchestration; `FND-006` specifically validates owner-defined vacation rules, calendar conflict checks, and colleague-resolution guidance in Slack. (`DONE`)
4. Gate demo readiness with scorecard thresholds (`LOC-014`) before customer-facing demos. (`DONE`)

---

## Memory Completion Path (Lane F)

Lane `F` closes the gap between memory research claims and current runtime reality under one-visible-operator constraints.

Deterministic delivery order:

1. `LOC-015` (`DONE`): memory completion contract is published and conflicting "already complete" memory claims are reconciled at workstream level.
2. `LOC-016` (`DONE`, `P0`): operator pinned notes (`L3`) are implemented with tenant-scoped data model, fail-closed RBAC CRUD/query APIs, and deterministic runtime prompt injection order (verified via `npm run typecheck`, `npm run test:unit`, `npx vitest run tests/integration/ai`).
3. `LOC-017` (`DONE`, `P0`): rolling session summaries (`L2`) + budgeted recent context (`L1`) are implemented with user+verified-tool-only extraction policy, fail-closed memory scope checks, and deterministic prompt layering. Verification: `npm run typecheck` pass; `npm run test:unit` executed with pre-existing unrelated transcription/audio failures (`transcribeMediaAudio`, `mediaTools`, `youtubeTranscribeTool`); `npx vitest run tests/integration/ai` pass.
4. `LOC-018` (`DONE`, `P0`): reactivation memory (`L5`) now uses deterministic inactivity trigger logic, cache generation/retrieval with explicit provenance + expiry, and fail-closed tenant/channel/contact/route continuity boundaries; verification executed (`npm run typecheck` blocked by unrelated pre-existing frontend type errors in `slick-chat-input.tsx` and `ProjectForm.tsx`, `npm run test:unit` pass, `npx vitest run tests/integration/ai` pass).
5. `LOC-019` (`DONE`, `P1`): structured contact memory (`L4`) extraction/merge shipped with deterministic dedupe + supersede/revert metadata, strict provenance/write-gate contract, and scoped prompt injection (`L3 -> L2 -> L5 -> L4`); verification ran with unrelated pre-existing `typecheck` blocker plus passing unit/integration AI suites.
6. `LOC-020` (`DONE`, `P1`): `aiAgentMemory` runtime contract is explicitly `deprecate` (no dormant wire-in path), with fail-closed scope evaluation (`organization`/`channel`/`contact`/`route`), runtime memory-lane telemetry (`memory` payload in `logAgentAction`), and test coverage in `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/aiAgentMemoryContract.test.ts` + `/Users/foundbrand_001/Development/vc83-com/tests/integration/ai/aiAgentMemoryContract.integration.test.ts`. Verification: `npm run typecheck` pass; `npm run test:unit` pass (`157` files passed, `4` skipped; `775` tests passed, `80` skipped); `npx vitest run tests/integration/ai` pass (`20` files, `58` tests).

Implementation invariants:

1. Memory completion must preserve one-visible-operator UX and primary authority.
2. Memory retrieval/writes must remain tenant-safe and org-safe; fail closed on ambiguous scope.
3. Memory writes should prioritize user messages and verified tool outputs over assistant-only text.
4. Five-layer completion cannot be claimed until `LOC-020` is `DONE` with test-backed evidence.

### World-Class Memory Contract (Lane `F`)

Current completion state:

1. `L1`, `L2`, `L3`, and `L5` are implemented in runtime.
2. `aiAgentMemory` contract closure is complete (`LOC-020` `DONE`): runtime uses explicit fail-closed deprecation semantics and preserves `L3 -> L2 -> L5 -> L4` layering.

Contract requirements:

1. Layered architecture must remain explicit and deterministic: `L3` pinned guidance -> `L2` rolling summary -> `L5` reactivation continuity -> `L4` structured durable memory.
2. Durable memory writes must be policy-bound, provenance-backed, and reversible.
3. Assistant-only claims are never eligible as durable memory source of truth.
4. All reads/writes fail closed on scope mismatch (`organization`, `channel`, `contact`, `route`).
5. Prompt assembly remains budget-aware per selected model context length.
6. Explicit user correction in active turn overrides historical memory.

Deterministic `LOC-019`/`LOC-020` closure requirements:

1. `LOC-019`: ship typed structured contact memory schema + merge policy (`dedupe`, conflict precedence, supersession/revert metadata) with trust-event linkage.
2. `LOC-019`: add tests proving no cross-tenant leakage and reversible update behavior.
3. `LOC-020`: resolve `aiAgentMemory` as either runtime-wired contract or explicit deprecation contract; no dormant ambiguity allowed.
4. `LOC-020`: publish final lane-`F` acceptance evidence in queue/docs with verify logs and runtime file anchors.

---

## Pharmacist Vacation Scheduler Path (Lane G)

Lane `G` delivers the pharmacist vacation scheduling scenario as a runtime feature built on existing integration contracts.

Deterministic delivery order:

1. `LOC-021` (`DONE`, `P0`): publish contract + schema baseline in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/PHARMACIST_VACATION_POLICY_CONTRACT.md`.
2. `LOC-022` (`DONE`, `P0`): current Slack ingest path (no new endpoint) now includes deterministic vacation-request parsing (mentions + slash via provider normalization), persisted `vacation_request` envelopes, and fail-closed scope/policy prerequisite gating.
3. `LOC-023` (`DONE`, `P0`): policy-capacity + calendar-overlap evaluator now runs on existing `availabilityOntology`, `calendarSyncOntology`, and `calendarSyncSubcalendars` primitives with fail-closed decision precedence and persisted evaluation snapshot metadata.
4. `LOC-024` (`DONE`, `P1`): owner policy configuration UI is live in existing integrations surfaces with fail-closed Slack/Google readiness gating.
5. `LOC-025` (`DONE`, `P0`): deterministic approve/conflict responses now include rationale, alternatives, direct-colleague discussion guidance, and audited approved-path calendar mutation evidence.

Implementation invariants:

1. Slack integration remains the existing stack: `/integrations/slack/events` and `/integrations/slack/commands` -> `processSlackEvent`/`processSlackSlashCommand`.
2. OAuth/credentials remain `oauthConnections` + `slack_settings`; no parallel secret store.
3. Calendar checks and blocking behavior must reuse current resource conflict and external-busy contracts.
4. Unknown integration/policy prerequisites fail closed to `blocked`.
5. Conflict outcomes must include concrete rationale, alternatives, and colleague-resolution guidance.

Primary lane-`E` demo artifacts (unchanged):

1. `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/CAPABILITY_PACK_TAXONOMY.md`
2. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/DEMO_PLAYBOOKS.md`
3. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/DEMO_READINESS_SCORECARD.md`

---

## Mobile-First Live Concierge + Parity Path (Lane H)

Lane `H` ships the live concierge path directly in operator-mobile, then closes metadata/behavior parity with mother-repo webchat.

Deterministic delivery order:

1. `LOC-032` (`DONE`, `P0`): residual lane-`H` verify blockers are cleared after AVR closeout; full verify reconfirmation is recorded (`V-TYPE`, `V-MOBILE-TYPE`, `V-UNIT`, `V-E2E-DESKTOP`).
2. `LOC-026` (`DONE`, `P0`): mobile ingress contract is closed (`liveSessionId`, `cameraRuntime`, `voiceRuntime`, `commandPolicy`, `attachments`, plus transport/observability envelope preservation) through `/api/v1/ai/chat` into runtime.
3. `LOC-027` (`DONE`, `P0`): replace operator-mobile chat stubs with real backend send/sync and approval-aware UI rendering.
4. `LOC-028` (`DONE`, `P0`): add mobile AV source registry + command gating policy.
5. `LOC-029` (`DONE`, `P0`): mapped voice/camera context into concierge payload fields, enforced preview-first auto-injection, and retained explicit-confirm mutation gating for `manage_bookings:run_meeting_concierge_demo`.
6. `LOC-030` (`DONE`, `P1`): payload/decision telemetry and end-to-end latency instrumentation are now recorded with `<60s` target breach signals and test evidence.
7. `LOC-031` (`DONE`, `P1`): hardening track foundation delivered (Meta DAT/WebRTC relay constraints + stronger source attestation + tighter fail-closed node command policy enforcement).
8. `LOC-033` (`DONE`, `P0`): webchat/iPhone send-envelope parity is complete for `commandPolicy`, `transportRuntime`, and `avObservability`.
9. `LOC-034` (`DONE`, `P1`): production-grade iPhone + Meta stream transport/session attestation hardening is complete with deterministic fallback traceability and fail-closed mutation invariants.
10. `LOC-035` (`DONE`, `P1`): world-class parity acceptance + runbook verification is complete with all row-level checks green under satisfied external gates `AVR-012@DONE_GATE` and `FOG2-016@DONE_GATE`.

OpenClaw-inspired implementation posture (conceptual copy, not dependency coupling):

1. explicit ingress/provider registry (no implicit source execution),
2. allowlisted command routing through a centralized command registry,
3. fail-closed node command policy with explicit denials for non-allowlisted mutations.

Implementation invariants:

1. mutating execution remains preview-first and approval-gated,
2. tenant/org scoping and idempotency contracts remain unchanged,
3. webchat and iPhone chat must carry equivalent runtime metadata and trust semantics for world-class parity claims.
4. final lane closeout evidence for lane `H` is complete through `LOC-035`, while external quality gates `AVR-012` and `FOG2-016` remain satisfied as of 2026-02-27.

---

## iPhone GTM CI + Release Hygiene Path (Lane I)

Lane `I` keeps iPhone release operations deterministic while lane `H` feature/parity work continues.

Deterministic delivery order:

1. `LOC-036` (`DONE`, `P0`): enforce supported Node runtime guard for Expo local command paths to eliminate Node 24 `ERR_SOCKET_BAD_PORT` startup failures.
2. `LOC-037` (`DONE`, `P0`): publish executable iPhone preflight CI and implementation contract:
   - workflow: `/Users/foundbrand_001/Development/vc83-com/.github/workflows/operator-mobile-ios-preflight.yml`,
   - implementation doc: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/IPHONE_GTM_CI_IMPLEMENTATION.md`,
   - runbook sync: `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/DEPLOY_TESTFLIGHT.md`.

Implementation invariants:

1. iPhone preflight checks stay deterministic: `typecheck` + icon size/no-alpha validation.
2. Expo-facing commands fail fast on unsupported Node runtimes with explicit remediation steps (`nvm use`).
3. Lane `I` does not weaken or bypass lane `H` trust/parity acceptance gates; it hardens release readiness only.

---

## Der Terminmacher Demo-Ops Path (Lane K)

Lane `K` turns Option A from stage script into an executable runtime contract with deterministic go/no-go evidence.

Deterministic delivery order:

1. `LOC-043` (`P0`, `DONE`): lock the `0:00`..`0:60` script beat map to runtime actions and trust gates.
2. `LOC-044` (`P0`, `DONE`): locked iPhone + integration preflight matrix and published fail-closed reality sanity map (recommender IDs, coverage blueprint IDs, runtime concierge hooks) with explicit `GO`/`NO_GO` classification.
3. `LOC-045` (`P0`, `DONE`): `LOC-044` P0 contract drifts are closed and full verify stack is green with artifact-backed rehearsal evidence (`FND-007-C1`..`C4` all `PASS`, founder aggregate `GO`).
4. `LOC-046` (`P1`, `DONE`): deterministic degraded-path choreography (Meta-glasses primary, iPhone fallback) is now published with fail-closed wording and operator run cards.
5. `LOC-047` (`P0`, `DONE`): final production-demo GO/NO_GO signoff ledger is published with `GO` outcome and explicit owner handoff; `LOC-041@DONE_GATE` is satisfied.
6. `LOC-048` (`P0`, `DONE`): post-signoff hardening keeps appointment outcomes self-sufficient under `appointment_booking_specialist` and removes planned-path drift from medical-follow-up recommender output.
7. `LOC-049` (`P0`, `DONE`): maintenance drift-watch rerun validated recommender/runtime/docs alignment and refreshed the lane-`K` GO continuity ledger.

`LOC-045` closeout evidence:

1. Closed drift: kickoff specialist-hint parity now includes `medical_compliance_reviewer` via shared role contract (`agent-recommender.ts` + `onboarding-kickoff-contract.ts`).
2. Closed drift: deterministic specialist-role -> blueprint mapping contract now exists via `SPECIALIST_ROLE_CONTRACTS` consumed in `agents-window.tsx`.
3. Closed drift: `FND-007` preflight now publishes deterministic runtime readiness evidence fields (`convexConnected`, `crmLookupCreateConfigured`, `calendarReadinessConfigured`, `outboundInviteChannelReady`) and scorecard contract references them.
4. Rehearsal evidence now passes: `tmp/reports/fnd-007/latest.json` records `result: "PASS"` with `checkpointFailIds: "none"` and founder aggregate at `tmp/reports/founder-rehearsal/latest.json` records `result: "GO"`.
5. Verification rerun for row closeout is green in deterministic order: `npm run typecheck`; targeted `vitest` sanity subset; `npm run demo:fnd-007`; `npm run demo:founder`; `npm run docs:guard`.

Script-to-runtime contract (`LOC-043`) for Option A:

1. `0:16` “Agent — wer steht vor mir?” -> vision ingest + name-tag extraction + CRM lookup path.
2. `0:22` scheduling question capture -> meeting window extraction + payload assembly.
3. `0:30` phone contact view capture -> email/phone extraction with explicit confidence/fallback handling.
4. `0:35` concierge execution path -> preview-first validation, explicit-confirm mutation gate, invite dispatch.
5. `0:40` phone buzz confirmation -> delivery evidence + operator verbal confirmation contract.

`LOC-046` deterministic failover choreography contract:

1. Primary path (Meta glasses): execute full identify -> slot capture -> contact capture -> preview -> explicit approval -> invite dispatch sequence in <=60 seconds.
2. Immediate fallback trigger: if vision, network, CRM, calendar, or outbound invite checks are not confidently `GO`, switch in-session to iPhone camera ingress without restarting the demo.
3. Fallback path (iPhone camera): preserve identical trust gates (preview-first, explicit confirm before mutating invite send) and keep one visible operator narrative; no specialist/tooling internals are exposed.
4. Degraded-path wording is fail-closed: operator states "preview ready, send pending your confirmation" or "connection not verified, I will not claim sent yet" instead of claiming execution without evidence.
5. Cadence guardrail remains 20-60 seconds total with deterministic stage prompts for each branch.

`LOC-047` final signoff evidence:

1. `V-IOS-PREFLIGHT` pass: `cd apps/operator-mobile && npm run ci:ios:preflight`.
2. `V-DEMO-FND-007` pass: `tmp/reports/fnd-007/latest.json` shows `result: "PASS"` with `checkpointFailIds: "none"` and live invoice dispatch evidence.
3. `V-DEMO-FOUNDER` pass: `tmp/reports/founder-rehearsal/latest.json` shows `result: "GO"` and `totals.passCount: 7` of `7`.
4. `V-DOCS` pass: `npm run docs:guard`.
5. Consolidated external done-gates remain satisfied in signoff ledger: ORV (`ORV-001`..`ORV-019`), AVR (`AVR-001`..`AVR-013`), AOH (`AOH-001`..`AOH-014`).

`LOC-048` post-signoff hardening evidence:

1. Recommender routing contract now keeps `medical_follow_up` on the self-sufficient appointment path (`appointment_booking_specialist`) under ready calendar/messaging integrations.
2. Support knowledge baseline mirrors the same contract so operator-facing guidance does not reintroduce planned-path drift.
3. Verification rerun is green in deterministic order: `npm run typecheck`; `cd apps/operator-mobile && npm run ci:ios:preflight`; `npx vitest run tests/unit/agents/agentRecommender.test.ts tests/unit/agents/agentStorePanel.test.ts tests/integration/ai/mobileRuntimeHardening.integration.test.ts`; `npm run docs:guard`.

Implementation invariants:

1. One visible operator only; specialist routing remains hidden.
2. Trust/approval contracts remain fail-closed for mutating paths.
3. Fallback path must preserve the same trust gates and evidence contracts.
4. No “production-ready” claim is allowed without explicit `GO` output from `LOC-047`.
5. No lane-`K` readiness claim is allowed unless `LOC-044` reality sanity ledger is complete with file-level evidence and owner-tagged unblock actions for every `NO_GO` finding.
6. Lane-`K` `GO` remains valid only while `LOC-048` self-sufficient appointment-routing contract is preserved (no reintroduced planned-path dependency for medical-follow-up demo output).
7. Lane-`K` `GO` remains valid only while `LOC-049` drift-watch evidence is current and no recommender/runtime/docs contract drift is detected.

---

## One-of-One Acceptance Contract

The cutover is not complete until all are true:

1. operator-facing default path no longer routes through Agent Store shopping or 104-agent recommender,
2. primary operator handles task execution with explicit capability-limit explanations,
3. external actions remain approval-bound by policy level and are fully auditable,
4. user memory/identity continuity persists across sessions without global overwrite behavior,
5. residual legacy paths are either removed or explicitly compatibility-gated `OFF` by default,
6. memory-layer claims are evidence-backed and aligned to implemented lane-`F` contracts (no doc/runtime drift).
7. mobile ingress path can run end-to-end concierge demo without webchat dependency while preserving trust/approval gates.
8. webchat and iPhone chat share equivalent live-ingress metadata semantics (`liveSessionId`, runtime metadata, command policy, transport observability) with verified parity evidence.

---

## LOC-009 Acceptance Matrix (2026-02-25)

| Acceptance axis | Contract | Evidence tests |
|---|---|---|
| Utility (task completion) | Primary operator completes mission flows with deterministic laddering and closure evidence. | `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/personalLifeOperatorPilotChecklist.test.ts` (`PO-SLA-01`..`PO-SLA-06`) |
| Trust safety | External/mutating actions stay approval-gated with shared runtime/chat semantics and explicit trust events. | `/Users/foundbrand_001/Development/vc83-com/tests/integration/ai/approvalPolicy.integration.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolApprovalPolicy.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/trustEventTaxonomy.test.ts` |
| Privacy guarantees | Local-only/privacy modes fail closed against cloud routes or bypass mutations. | `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/modelAdapters.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/modelPolicy.test.ts` |
| Cross-org clarity | Session/org routing and booking behavior never leak or mutate across org boundaries. | `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/webchatPublicMessageContext.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/personalLifeOperatorPilotChecklist.test.ts` (`PO-ORG-01`..`PO-ORG-03`) |
| Marketplace regression lock | Default UI create path stays primary-operator-first; legacy store/recommender endpoints remain compatibility-gated `OFF`. | `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/oneOfOneMarketplaceRegression.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/agentStoreCatalog.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/agentCatalogAdmin.recommendationMetadata.test.ts` |

Verification commands required by `LOC-009`:

1. `npm run typecheck`
2. `npm run test:unit`
3. `npm run test:e2e:desktop`
4. `npm run docs:guard`

Verification run results (2026-02-25):

1. `npm run typecheck` passed.
2. `npm run test:unit` passed (`142` files passed, `4` skipped; `687` tests passed, `80` skipped).
3. `npm run test:e2e:desktop` passed (`1` passed).
4. `npm run docs:guard` passed.

---

## LOC-010 Closeout Record (2026-02-25)

1. Published rollout/rollback and handoff playbook:
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/ROLLOUT_ROLLBACK_PLAYBOOK.md`
2. Closed lane `D` closeout row with queue sync:
   - `LOC-010` set to `DONE`.
3. Enforced closeout freeze for non-priority follow-ons:
   - historical freeze was later closed by explicit directives (`LOC-006` and `LOC-008` completed on 2026-02-26).
4. Re-opened lane `E` by directive and completed taxonomy/gap-explainer milestones:
   - `LOC-011`, `LOC-012`, `LOC-013`, and `LOC-014` are `DONE`.
5. Verified docs structure and references:
   - `npm run docs:guard` pass.
