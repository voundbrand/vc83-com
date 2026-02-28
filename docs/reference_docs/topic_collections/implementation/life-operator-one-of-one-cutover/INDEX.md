# Life Operator One-of-One Cutover Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover`  
**Source request:** Review open workstreams + existing codebase, forge a path to one user-owned Life Operator, and execute a mobile-first (iPhone-first, Meta-glasses-capable) live concierge runtime path with world-class webchat/iPhone parity.

---

## Purpose

This workstream is the deterministic cutover layer that:

1. freezes misaligned multi-agent marketplace expansion,
2. redirects execution to one-primary-operator utility,
3. cleans up legacy direction artifacts in queue docs and runtime/UI surfaces,
4. defines rollout/rollback and acceptance gates for the pivot,
5. finishes one-operator memory runtime layers and closes research-vs-runtime memory gaps.

---

## Core files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/MASTER_PLAN.md`
- Pharmacist vacation policy contract:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/PHARMACIST_VACATION_POLICY_CONTRACT.md`
- Rollout/rollback playbook:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/ROLLOUT_ROLLBACK_PLAYBOOK.md`
- iPhone GTM CI implementation:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/IPHONE_GTM_CI_IMPLEMENTATION.md`
- Index (this file):
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/INDEX.md`

---

## Current status

1. `LOC-001` complete: open-workstream triage matrix documented with keep/freeze/defer criteria.
2. `LOC-002` complete: AGP rows `AGP-021`..`AGP-035` frozen to `BLOCKED` and AGP docs synchronized to pivot lock.
3. `LOC-003` complete: non-core streams are now paused with explicit `BLOCKED` + unfreeze conditions (`ACR-001`..`ACR-027`, `PRN-002`..`PRN-051`, `UIP-013`..`UIP-014`).
4. `LOC-004` is `DONE`: Agent Store is removed from default create flow in `agents-window`; primary-operator creation is now the default entry.
5. `LOC-005` is `DONE`: backend store/recommender compatibility surfaces now fail closed by default unless explicit compatibility flags are enabled.
6. `LOC-006` is `DONE`: stale operator-commerce docs were replaced/archived into one-of-one positioning with compatibility pointers for legacy references.
7. `LOC-007` is `DONE`: soul catalog/tool/seed contracts now enforce layered behavioral-system semantics (`prompt + memory + policy + tools + eval + trust`) via `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/BEHAVIORAL_SYSTEM_CONTRACT.md`.
8. `LOC-008` is `DONE`: user-owned memory graph + permission ladder contracts are now published in one-agent-core and personal-operator master plans with rollback/audit guarantees.
9. `LOC-009` is `DONE`: acceptance matrix is published with explicit evidence for utility/trust/privacy/cross-org contracts plus marketplace-regression coverage.
10. `LOC-010` is `DONE`: rollout/rollback playbook and closeout handoff are published.
11. `LOC-011` is `DONE`: capability-pack taxonomy is finalized with canonical schema, deterministic founder-pack contracts, and catalog-slice mapping.
12. `LOC-012` is `DONE`: resolver/UI now provide deterministic `available_now` vs `blocked` capability states with explicit unblocking steps and fail-closed unknown prerequisites.
13. `LOC-013` is `DONE`: founder knockout playbooks now include deterministic preflight, pass/fail checkpoints, hidden specialist routing, and trust-gated mutation evidence for all seven scenarios.
14. `LOC-014` is `DONE`: demo-readiness scorecard now enforces deterministic rehearsal gates with fail-closed evidence requirements across `FND-001`..`FND-007`.
15. `LOC-015` is `DONE`: memory completion contract kickoff is now synced across LOC artifacts.
16. `LOC-016`..`LOC-020` are `DONE`: pinned notes, rolling summary/recent-context budgeting, reactivation memory, and structured contact memory are live with fail-closed scope controls + deterministic prompt layering (`L3 -> L2 -> L5 -> L4`), and `LOC-020` closed `aiAgentMemory` with an explicit runtime `deprecate` contract plus fail-closed scope evaluation and memory-lane telemetry evidence.
17. World-class memory contract language is now explicitly documented across product and lane artifacts:
   - `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/LIFE_OPERATOR_ONE_AGENT_ARCHITECTURE_PLAYBOOK.md` (`World-Class Memory Contract`)
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/MASTER_PLAN.md` (`World-Class Memory Contract (Lane F)`)
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md` (lane `F` addendum + exit conditions)
18. Founder-priority seven-demo set remains encoded in lane-`E` artifacts (inbox defense, wearable work companion, proactive exec checkup, visual todo/shopping capture, note taker, pharmacist vacation scheduling in Slack with conflict mediation, and end-to-end event manager workflow).
19. Lane `G` pharmacist-vacation execution is complete: `LOC-021`..`LOC-025` are `DONE` (contract + Slack parser/envelope persistence + deterministic policy/calendar evaluator + owner policy UI + deterministic conflict mediation/trust-evidenced outcomes).
20. Lane `H` baseline runtime send/sync + AV command-gating contract is now complete: `LOC-032`, `LOC-026`, `LOC-027`, and `LOC-028` are `DONE` (2026-02-27), `LOC-029` is now `IN_PROGRESS` (2026-02-28), `LOC-030`..`LOC-031` remain staged baseline/hardening rows, and parity/acceptance closeout remains tracked in `LOC-033`..`LOC-035`.
21. Concrete parity gap identified and queued: web `use-ai-chat` currently sends `liveSessionId/cameraRuntime/voiceRuntime`, but not `commandPolicy`, `transportRuntime`, or `avObservability` that backend/mobile paths already support (`LOC-033`).
22. Final world-class parity closeout remains dependency-gated on external workstream rows: `AVR-012` and `FOG2-016` gates are both satisfied (`DONE` on 2026-02-27), and `LOC-035` now depends on lane-`H` parity/hardening evidence completion.
23. `LOC-036` is `DONE`: local Expo iOS command paths now enforce supported Node runtime (`>=20`, `<24`) with deterministic fail-fast guidance to eliminate the Node 24 `ERR_SOCKET_BAD_PORT` blocker.
24. `LOC-037` is `DONE`: iPhone preflight CI and runbook/docs contract are active via `/Users/foundbrand_001/Development/vc83-com/.github/workflows/operator-mobile-ios-preflight.yml` and `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/IPHONE_GTM_CI_IMPLEMENTATION.md`.
25. Cleanup stabilization sprint is now queued as lane `J` (`LOC-038`..`LOC-042`), with `LOC-038` (simulator signup Tab-focus breakage) set as the first `READY` user-blocking fix before broader hygiene/deprecation work.

---

## Next objective

1. execute lane `J` `LOC-038` first: fix simulator signup Tab-focus regression that breaks UI while moving to password input,
2. run cleanup stabilization sequence (`LOC-039`..`LOC-042`): worktree hygiene guardrails, Convex typecheck blocker recovery, `expo-av` migration, and onboarding alias retirement plan execution,
3. resume lane-`H` baseline from `LOC-029`/`LOC-030`, then continue hardening/parity (`LOC-031`, `LOC-033`, `LOC-034`),
4. finalize world-class acceptance/runbook evidence under satisfied external done-gates (`LOC-035`; `AVR-012` and `FOG2-016` already `DONE`),
5. keep lane `I` iPhone preflight CI contract green on every `apps/operator-mobile` change while lanes `H` and `J` advance.
