# Germany-First OpenClaw Kanzlei Pilot Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening`  
**Last updated:** 2026-04-01

---

## Objective

Stand up an isolated OpenClaw/NemoClaw pilot for German legal practice workflows with:

1. Germany-resident hosting and data persistence by default.
2. Strict runtime and credential isolation from the main platform.
3. Upstream-first implementation decisions that avoid duplicated runtime systems.
4. Fail-closed legal and technical release gate with auditable evidence.

---

## Execution mode decisions (locked)

1. Delivery track: `EU-compliant MVP`.
2. Hosting track: `Hetzner H1` dedicated Germany hosting.
3. Current deployed environment role: `staging` only.
4. Production policy: separate prod environment, initial one-server-per-customer (single-tenant).
5. Future track remains preserved: `strict Germany-only promise`.

---

## Reality reset (current phase)

Before additional implementation, execution is intentionally rebased on real codebase capability:

1. Inventory what OpenClaw/NemoClaw already provides in local cloned repos.
2. Lock anti-duplication architecture rules.
3. Lock monorepo separation rules for `apps/nemoclaw-kanzlei-eu`.
4. Only then resume Clara MVP runtime implementation.

Mapped queue rows:

1. `NCLAW-013` capability inventory (`DONE`) with artifact: `UPSTREAM_CAPABILITY_INVENTORY.md`.
2. `NCLAW-014` anti-duplication architecture contract (`DONE`) with contract in this plan section.
3. `NCLAW-015` protected-separate-track monorepo contract (`DONE`).
4. `NCLAW-016` coding-ready Clara backlog grounded in upstream surfaces (`DONE`).
5. `NCLAW-017` baseline checkpoint before resumed implementation (`DONE`).

---

## Non-negotiable operating principles

1. Fail-closed release gate: unresolved legal evidence or unclear trust boundaries blocks release.
2. Upstream-first reuse: extension/skill/plugin seams first, custom code second.
3. No parallel runtime systems: avoid maintaining duplicate orchestration paths.
4. Strict trust-boundary separation from main platform runtime and mutable infra.
5. `apps/nemoclaw-kanzlei-eu` is the protected deployment root for this pilot track.

---

## Upstream-first reuse order

For every new feature request in this track, evaluate in this order:

1. Existing OpenClaw core feature.
2. Existing OpenClaw extension.
3. Existing OpenClaw skill.
4. Existing NemoClaw plugin/blueprint seam.
5. Thin local overlay in `apps/nemoclaw-kanzlei-eu`.
6. Custom forked runtime code only with explicit queue approval and documented justification.

---

## Anti-duplication architecture contract (`NCLAW-014`, locked)

This contract is mandatory for the protected DSGVO-separated track at `apps/nemoclaw-kanzlei-eu`.

### Allowed customization seams

1. Configuration overlays on existing OpenClaw plugins/extensions (`voice-call`, `elevenlabs`, `openrouter`, related upstream surfaces).
2. NemoClaw policy overlays and deployment/image hardening overlays without replacing upstream sandbox architecture.
3. Kanzlei-specific prompts, worker packet contracts, and workflow orchestration that run on top of upstream extension/skill interfaces.
4. Germany-specific compliance artifacts, runbooks, and release evidence in this workstream root.
5. Minimal integration glue in `apps/nemoclaw-kanzlei-eu` that binds upstream capabilities without introducing duplicate runtimes.

### No parallel systems rules (explicit)

1. No second telephony runtime while upstream `voice-call` path satisfies MVP needs.
2. No custom ElevenLabs transport layer while upstream ElevenLabs plugin + existing voice-call configuration is sufficient.
3. No sidecar or duplicated model-router runtime while upstream provider plugins satisfy routing needs.
4. No separate plugin or skill management runtime outside OpenClaw-native plugin/skill surfaces.
5. No duplicate sandbox execution stack outside NemoClaw/OpenShell policy model.
6. No alternate mutable deployment root for this pilot outside `apps/nemoclaw-kanzlei-eu`.

### Runtime fork criteria

A runtime fork is allowed only when all conditions hold:

1. Reuse order steps `1` to `5` are exhausted with explicit evidence.
2. The unmet requirement blocks legal, security, or operational acceptance for this pilot.
3. The gap cannot be solved with a configuration/policy overlay or thin local adapter.
4. Blast radius and rollback plan are documented and reviewed in queue artifacts.
5. A dedicated queue row is created and approved before implementation.

### Mandatory fork justification template

Any row proposing a fork must include this template in `TASK_QUEUE.md` notes (or linked artifact):

1. Requirement ID and short problem statement.
2. Upstream surfaces evaluated (core/extension/skill/plugin/policy) with repo paths.
3. Why each surface is insufficient, with concrete failing behavior.
4. Verification evidence (commands, logs, or tests) proving insufficiency.
5. Rejected alternatives and reasons.
6. Proposed fork scope and files.
7. DSGVO/trust-boundary impact assessment for `apps/nemoclaw-kanzlei-eu`.
8. Rollback and upstream-reconciliation plan.
9. Owner, reviewer, and decision date.

### Acceptance checklist for any new implementation row

Every new implementation row in this workstream must pass all checks before it can move to `DONE`:

1. Dependency prerequisites are `DONE`.
2. Reuse-order decision is documented and mapped to at least one upstream surface from `UPSTREAM_CAPABILITY_INVENTORY.md`.
3. Chosen customization seam is one of the allowed seams in this contract.
4. No-parallel-systems check is explicitly marked `PASS`.
5. Fork template is fully completed if a runtime fork is requested; otherwise row states `FORK_NOT_REQUIRED`.
6. Protected-track boundary check is `PASS` (`apps/nemoclaw-kanzlei-eu` owns deploy/runtime secrets and promotion assets).
7. Verification commands are listed and executed (`npm run docs:guard` minimum; add row-specific checks as needed).
8. Notes include deterministic status transition trace and completion evidence location.

Rows that fail any checklist item stay `BLOCKED` until corrected.

---

## Monorepo separation contract (`apps/nemoclaw-kanzlei-eu`)

1. Deployment, Docker assets, and Hetzner scripts for this track live under:
   - `apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/`
   - `apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/`
2. Environment templates are committed only as `*.example`; live secrets stay outside git and inside this track's env surfaces.
3. CI/CD for this track must call only the app-local deployment scripts; no main-platform deployment pipeline may mutate this track.
4. Staging and production credentials/SSH keys must be separated and non-reused across other platform tracks.
5. Promotion path is local -> staging -> prod with exact-ref deployments (`commit` for staging, `tag` for prod).
6. This track can reuse shared knowledge/docs, but cannot share mutable deployment credentials or mutable runtime state.
7. Production promotions require explicit release gate closure and evidence lock.

### Protected-track boundary matrix (`NCLAW-015`, locked)

| Boundary | Contract |
|---|---|
| Docker/runtime templates | Only app-local templates under `apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/` may define deployment runtime for this track. |
| Hetzner operations | Only app-local scripts (`deploy-staging.sh`, `promote-prod.sh`, `local-openclaw-dev.sh`) are allowed for this track's deployment lifecycle. |
| Environment files | `pipeline.env` and server-side env for this track must not import main-platform `.env*` files or shared mutable secrets. |
| CI execution path | Any automation for this track must execute app-local scripts and maintain staging/prod key separation; root CI can validate docs/tests only unless explicitly scoped. |
| Secrets and identity | Separate SSH targets, separate keys, separate provider credentials for staging and production; no credential re-use with non-DSGVO tracks. |

### No-cross-track rules (`NCLAW-015`)

1. Do not deploy this pilot from root-level ad-hoc scripts or non-app-local automation.
2. Do not copy secrets from main-platform env files into this track.
3. Do not run customer production traffic on the staging server.
4. Do not collapse staging and production credentials into one identity.
5. Do not bypass tag-only production promotion.

---

## Clara MVP implementation backlog baseline (`NCLAW-016`, published)

`NCLAW-016` produces coding-ready execution packets that must stay upstream-first and avoid specialist telephony handoffs in MVP:

1. Telephony intake implementation reuses upstream `voice-call` + `elevenlabs` + provider plugin path.
2. Async worker packet contract is locked for post-call structuring/triage/follow-up planning.
3. Callback scheduling and lawyer brief production remain async and policy-bounded.
4. Specialist telephony transfer branches are explicitly out of MVP scope.
5. All implementation packets must reference upstream surfaces before local overlays.

Async worker I/O contract baseline:

1. Intake packet required fields: `tenant_id`, `case_id`, `call_id`, `caller_identity`, `matter_summary`, `urgency_level`, `callback_window`, `consent_flags`, `transcript_reference`.
2. Worker output required fields: `case_id`, `status`, `risk_flags`, `missing_fields`, `lawyer_brief`, `callback_brief`, `recommended_next_action`, `policy_audit_ref`.
3. Status values: `ready_for_lawyer`, `needs_followup`, `blocked_policy`.

---

## Reality baseline checkpoint (`NCLAW-017`, done)

Checkpoint decision date: `2026-03-27`.

| Checkpoint criterion | Result |
|---|---|
| Upstream capability inventory locked (`NCLAW-013`) | `PASS` |
| Anti-duplication contract locked (`NCLAW-014`) | `PASS` |
| Protected-separate-track monorepo contract locked (`NCLAW-015`) | `PASS` |
| Coding-ready Clara backlog and async contract published (`NCLAW-016`) | `PASS` |
| No-parallel-runtime-path assertion for MVP baseline | `PASS` |

Checkpoint decision:

1. `GO` to resume implementation planning/execution inside the protected track.
2. External client-data release remains `NO_GO` until lane `F` validation and legal evidence closure finish.

---

## Legal and control baseline (already established)

Rows `NCLAW-001` to `NCLAW-009` are completed and retained as gate prerequisites:

1. Hosting and legal baseline locked.
2. Isolation and hardening baseline documented.
3. Data locality and retention baseline documented.
4. Provider evidence and legal-operational checklist assembled.

External client-data launch remains `NO_GO` unless these remain current and complete.

---

## Clara MVP architecture target (post-reset)

When reset rows close, implementation resumes with these boundaries:

1. Live-call agent performs intake + reassurance + callback capture only.
2. No specialist telephony handoffs in MVP line.
3. Post-call asynchronous workers handle structuring, urgency triage, and follow-up action planning.
4. Worker outputs are contract-bound with required packet fields and org-isolation metadata.
5. All runtime behavior must map to existing upstream capability seams where possible.

---

## Governance-sidecar integration contract (`NCLAW-019`)

Contract objective: integrate `apps/compliance-engine` as governance/evidence control plane only, without introducing any duplicate telephony, agent-runtime, or inference stack.

### Scope boundary (locked)

1. `apps/compliance-engine` may publish governance posture, evidence completeness, and release-gate recommendations.
2. `apps/compliance-engine` may not own or replace OpenClaw/NemoClaw runtime call handling, orchestration, or model transport.
3. Allowed seam for this integration is `thin glue` + `compliance/runbook` only.
4. Upstream runtime path remains `openclaw/extensions/voice-call` + `openclaw/extensions/elevenlabs` with no sidecar runtime fork.

### Fail-closed release-gate wiring

1. `NCLAW-020` must consume compliance-engine readiness output as an input artifact, not as advisory text.
2. Readiness payload must include at least: `decision`, `blockers` (with owner and mitigation), `evidence_counts`, and generated timestamp.
3. Missing payload fields, unknown blocker ownership, or stale readiness timestamps force release decision to `NO_GO`.
4. Tier-language check is mandatory in synthesis output (`EU-compliant MVP` vs `strict Germany-only promise`), and ambiguity forces `NO_GO`.
5. NemoClaw legal/runtime evidence and compliance-engine readiness must agree; any mismatch keeps gate closed.

### Cross-workstream linkage (documentation only)

1. NemoClaw lane `F` row `NCLAW-020` links to compliance-engine queue state at `apps/compliance-engine/docs/phase-0-governance-execution/TASK_QUEUE.md`.
2. This linkage is evidence-handoff only and does not authorize runtime/control ownership transfer.

---

## Release gate sequence (post-reset)

1. `NCLAW-010`: validation drills (incident, restore, permission boundary).
2. `NCLAW-011`: release decision package (`GO`/`NO_GO`).
3. `NCLAW-018`: enterprise-controls evidence overlay in provider/legal artifacts.
4. `NCLAW-019`: governance-sidecar integration contract (control-plane only).
5. `NCLAW-020`: weekly release synthesis package (`GO`/`NO_GO` with blocker ledger).
6. `NCLAW-012`: benchmark and migration recommendation (advisory).

Current lane state:

1. `NCLAW-010` is `DONE` with live staging drill evidence captured.
2. `NCLAW-011` is `DONE`; release decision package is published with deterministic blocker ledger and signoff matrix (internal technical pilot `GO`, external customer-data launch `NO_GO`).
3. `NCLAW-018` is `DONE`; ElevenLabs enterprise control fields are mapped into provider/legal evidence artifacts with fail-closed tracking.
4. `NCLAW-019` is `DONE`; governance-sidecar integration contract is published with control-plane-only scope and fail-closed handoff requirements.
5. `NCLAW-020` is `DONE`; weekly synthesis package is published with deterministic decision `NO_GO` for external release, `GO` for internal staging continuity, and explicit blocker ownership.
6. `NCLAW-012` remains `BLOCKED` after the 2026-03-28 enablement session: immutable voicecall image/config attempts were executed, but repeated `nemoclaw onboard` recreate flows failed during sandbox create with OpenShell transport errors (`tls handshake eof`, `Connection reset by peer`) after image upload, so `openclaw --help` voicecall verification and live baseline traffic could not run; current-path source logs are still unavailable.

Gate policy:

1. `GO` is not allowed while mandatory legal evidence is unresolved.
2. `GO` is not allowed while architecture duplication risk remains unresolved.
3. `GO` is not allowed while staging/prod separation controls are incomplete.

---

## Milestones

1. Milestone 1 (`NCLAW-001` to `NCLAW-003`): legal and hosting baseline freeze.
2. Milestone 2 (`NCLAW-004` to `NCLAW-007`): isolation and hardening baseline freeze.
3. Milestone 3 (`NCLAW-008` to `NCLAW-009`): provider evidence and legal checklist closure.
4. Milestone 4 (`NCLAW-013` to `NCLAW-017`): reality reset, upstream-first architecture lock, and protected-separate-track contract.
5. Milestone 5 (`NCLAW-010` to `NCLAW-011`): validation and release decision package.
6. Milestone 6 (`NCLAW-018` to `NCLAW-020`): enterprise-controls evidence overlay and governance-sidecar release synthesis.
7. Milestone 7 (`NCLAW-012`): benchmark-informed migration recommendation.
