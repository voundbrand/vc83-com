# Germany-First OpenClaw Kanzlei Pilot Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening`

---

## Lane gating and concurrency

1. Run at most one `IN_PROGRESS` row globally.
2. Lane `A` must complete before lane `B` starts.
3. Lane `C` and lane `D` may run only after `NCLAW-004` is `DONE`.
4. Lane `E` requires `NCLAW-006` and `NCLAW-007` to be `DONE`.
5. Lane `G` starts only after lane `E` `P0` rows are `DONE`.
6. Lane `F` starts only after lane `G` `P0` rows are `DONE`.
7. Fail-closed policy is mandatory; unknown legal/runtime state remains blocking.
8. `apps/nemoclaw-kanzlei-eu` is the protected deployment track and must remain isolated from main-platform deployment targets.

---

## Deterministic execution order contract

Use this algorithm for every row transition:

1. Filter rows by priority: `P0` first, then `P1`.
2. Within selected priority, choose rows with all dependencies `DONE`.
3. If multiple are eligible, pick lowest numeric task ID.
4. Move exactly one row to `IN_PROGRESS`.
5. Apply changes for that row and run all `Verify` commands.
6. If verification passes, move row to `DONE`.
7. If blocked, move row to `BLOCKED` and record owner plus mitigation in `Notes`.
8. Re-evaluate dependency promotions after each transition.

Current deterministic path:

1. `NCLAW-010` (`DONE`)
2. `NCLAW-011` (`DONE`)
3. `NCLAW-018` (`DONE`)
4. `NCLAW-019` (`DONE`)
5. `NCLAW-020` (`DONE`)
6. `NCLAW-012` (`BLOCKED`; unblock only after staging gateway/sandbox create path is healthy, staging sandbox exposes `openclaw voicecall`, current-path `calls.jsonl` source is available, and matched non-zero pilot/current datasets are collected for comparator rerun)

---

## Prompt A (Lane A: legal and hosting baseline)

You are executing lane `A` for Germany-first OpenClaw planning.

Tasks:
1. Keep legal and hosting baseline artifacts coherent.
2. Keep fail-closed release gate language explicit.

Requirements:
1. Prioritize German-resident hosting and explicit subprocessor traceability.
2. Keep evidence requirements concrete and auditable.
3. Run `npm run docs:guard`.

---

## Prompt B (Lane B: isolation architecture)

You are executing lane `B` for infrastructure isolation.

Tasks:
1. Maintain account/project/network/identity/secret separation requirements.
2. Keep staging/prod/customer tenancy boundaries explicit.

Requirements:
1. No shared mutable trust boundary with main platform.
2. Run `npm run docs:guard`.

---

## Prompt C (Lane C: runtime hardening)

You are executing lane `C` for OpenClaw runtime security.

Tasks:
1. Keep deny-by-default tool and egress policy documented.
2. Keep sandbox and audit controls explicit.

Requirements:
1. Treat upstream alpha behavior as untrusted by default.
2. Run `npm run docs:guard`.

---

## Prompt D (Lane D: data locality and lifecycle)

You are executing lane `D` for Germany-first data governance.

Tasks:
1. Keep DB/backups/logs/keys/retention/deletion controls explicit.
2. Keep transfer exception policy fail-closed.

Requirements:
1. Tie controls to auditable evidence artifacts.
2. Run `npm run docs:guard`.

---

## Prompt E (Lane E: legal/provider evidence closure)

You are executing lane `E` for provider legal readiness.

Tasks:
1. Maintain AVV/DPA and subprocessor evidence completeness.
2. Keep legal-operational checklist aligned with release gates.
3. For enterprise vendor lanes, map contract assertions to verifiable evidence fields (residency mode, retention mode, no-training language, webhook controls).

Requirements:
1. Missing evidence keeps release blocked.
2. Run `npm run docs:guard`.

---

## Prompt G (Lane G: upstream-first architecture lock)

You are executing lane `G` to avoid duplication and parallel runtime systems.

Tasks:
1. Inventory existing OpenClaw/NemoClaw capabilities from local repos (extensions, skills, plugin APIs), explicitly including ElevenLabs and voice-call paths.
2. Publish upstream-first reuse contract and anti-duplication rules.
3. Lock the monorepo separation contract for `apps/nemoclaw-kanzlei-eu` as the protected DSGVO deployment track.
4. Produce coding-ready Clara MVP backlog packets that reuse upstream seams and existing ElevenLabs assets.
5. Lock async worker I/O contracts and explicit no-specialist-handoff MVP rule.
6. Keep any compliance-sidecar integration constrained to governance/evidence control-plane scope only (no runtime/telephony replacement).
7. For `NCLAW-019`, publish fail-closed handoff requirements for `NCLAW-020` with mandatory readiness fields (`decision`, blocker ownership, evidence counts, generated timestamp).

Requirements:
1. No new custom runtime fork before capability inventory is complete.
2. Explicitly document what stays upstream, what is local overlay, and what is out-of-scope.
3. Missing or stale compliance readiness output must force lane `F` synthesis to `NO_GO`.
4. Run `npm run docs:guard`.

---

## Prompt F (Lane F: validation and release gate)

You are executing lane `F` for pilot readiness decisioning.

Tasks:
1. Run validation drills only after lane `G` `P0` closure.
2. Publish final `GO`/`NO_GO` decision package.
3. If live staging evidence cannot be collected, set row status to `BLOCKED` with owner and mitigation.
4. Keep tier language deterministic in release artifacts (`EU-compliant MVP` vs `strict Germany-only promise`) and fail closed on ambiguity.

Requirements:
1. `GO` is impossible while mandatory legal evidence is unresolved.
2. Include dated proof for restore, incident response, and permission-boundary tests.
3. Run `npm run docs:guard` and `npm run typecheck` where required.
