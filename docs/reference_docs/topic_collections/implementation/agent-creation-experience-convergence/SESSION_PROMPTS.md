# Agent Creation Experience Convergence Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/LAYERCAKE_PLATFORM_AGENT_STACK.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/SOUL_BINDING_LIVE_EVAL_PLAYBOOK.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/SYSTEM_RUNBOOK.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/INTEGRATION_ENDPOINT_MIGRATION_PROVIDER_PLAYBOOK.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/DETERMINISTIC_GAP_MATRIX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/SLACK_MULTI_TENANT_ENDPOINT_MANIFEST_IMPLEMENTATION_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-trust-experience/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/voice-agent-co-creation/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/byok-multimodal-frontier-runtime/MASTER_PLAN.md`

---

## Concurrency and lane gating

1. Execute lanes in dependency order from queue rows.
2. Maximum one `IN_PROGRESS` task globally in this workstream.
3. Do not run live eval or release-gate lanes before LayerCake platform-agent `P0` tasks are complete.

## Lane milestone log

1. 2026-02-19: lane `A` completed (`ACE-001`, `ACE-002`).
2. 2026-02-19: lane `B` completed (`ACE-003`, `ACE-004`); lane `C` unblocked with `ACE-005` promotable.
3. 2026-02-19: lane `C` completed (`ACE-005`, `ACE-006`, `ACE-007`, `ACE-015`); lane `D` unblocked with `ACE-008` promotable.
4. 2026-02-19: lane `D` completed (`ACE-008`, `ACE-009`); lane `E` unblocked with `ACE-010` promotable.
5. 2026-02-19: lane `E` completed (`ACE-010`, `ACE-011`, `ACE-016`); lane `F` unblocked with `ACE-013` promotable.
6. 2026-02-19: lane `F` completed (`ACE-012`, `ACE-013`, `ACE-014`); gate summary published with deterministic `hold` pending fresh live-eval/telemetry/privileged evidence artifacts.
7. 2026-02-20: lane `F` follow-up hardening completed for AI chat shell convergence gaps (persisted model reasoning capability routing, deterministic `plan_soft` readiness scoring, and query-aware reference attribution summaries).
8. 2026-02-20: lane `G` architecture planning kickoff completed (`ACE-017`) with unified endpoint (Option 3) + pre-manifest wizard implementation plan published; `ACE-018` promoted as next `READY` task.
9. 2026-02-20: lane `G` execution completed (`ACE-018`, `ACE-019`, `ACE-020`) with unified endpoint routing, pre-manifest wizard rollout, migration/rollback/provider-extension playbook publication, and synchronized queue artifacts.

---

## Session A (Lane A: contract freeze + eval taxonomy)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/TASK_QUEUE.md

Scope:
- ACE-001..ACE-002

Rules:
1) Before each task, list top 3 contract-regression risks.
2) Lock LayerCake-first sequence: platform agents -> evals -> rollout.
3) Keep soul-binding explicitly post-activation and consent-governed.
4) Reuse existing runtime/trust foundations; do not redefine completed contracts.
5) Run Verify commands exactly from queue rows.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: LayerCake platform-agent stack)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/TASK_QUEUE.md

Scope:
- ACE-003..ACE-004

Rules:
1) Confirm ACE-001 is DONE before starting.
2) Before each task, list top 3 role/handoff regression risks.
3) Define canonical agent roster, responsibilities, and stop conditions.
4) Specify handoff payload contracts between orchestrator and specialist agents.
5) Keep prompts/interfaces deterministic and testable.
6) Run Verify commands exactly from queue rows.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: platform-agent implementation)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/TASK_QUEUE.md

Scope:
- ACE-005..ACE-007, ACE-015

Rules:
1) Confirm ACE-004 is DONE before ACE-005.
2) Before each task, list top 3 runtime/UX regression risks.
3) Route Create Agent into platform-agent-guided creation flow.
4) Remove first-run Talk/Type branching; use one unified voice+text composer surface.
5) Enforce launch contract: add `slick` as third chat mode and make it default for first-run creation entry.
6) Desktop should open welcome plus a separate chat window; mobile should open full-screen chat with welcome hidden behind the chat layer.
7) Keep outputs concrete: workflow steps, tool mappings, deploy-ready recommendations.
8) Implement `platform_soul_admin` with strict L2-only soul scope and explicit action matrix.
9) Ensure Eval Analyst action output includes deterministic pass/fail labels.
10) Run Verify commands exactly from queue rows.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: live soul-binding eval protocol)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/TASK_QUEUE.md

Scope:
- ACE-008..ACE-009

Rules:
1) Confirm ACE-006 is DONE before ACE-008.
2) Before each task, list top 3 trust-consent regression risks.
3) Publish question packs covering identity, guardrails, consent, productivity, handoff, and deployment readiness.
4) Include explicit fail-fast conditions for consent or safety boundary violations.
5) Define evidence worksheet fields and decision mapping (proceed/hold/rollback).
6) Run Verify commands exactly from queue rows.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: eval matrix + release gates)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/TASK_QUEUE.md

Scope:
- ACE-010..ACE-011, ACE-016

Rules:
1) Confirm ACE-008 is DONE before ACE-010.
2) Before each task, list top 3 release-quality regression risks.
3) Define thresholds across model, workflow, live, and telemetry eval layers.
4) Add privileged access gates: step-up auth, time-bound elevation, dual-approval apply, and audit evidence.
5) Gate releases with deterministic outcomes: proceed, hold, rollback.
6) Keep gate criteria explicit and operator-auditable.
7) Run Verify commands exactly from queue rows.

Stop when Lane E has no promotable tasks.
```

---

## Session F (Lane F: system runbook + hardening closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/TASK_QUEUE.md

Scope:
- ACE-012..ACE-014

Rules:
1) Confirm all P0 tasks are DONE or BLOCKED before ACE-013.
2) Before each task, list top 3 operational regression risks.
3) Publish startup, verify, live-eval, and incident-response operating instructions.
4) Run full verification profile exactly as listed in queue rows.
5) Sync INDEX.md, MASTER_PLAN.md, TASK_QUEUE.md, and SESSION_PROMPTS.md.
6) Run docs guard and resolve violations before completion.

Stop when lane F closeout is complete.
```

---

## Session G (Lane G: multi-tenant integration architecture + manifest UX)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane G tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence/TASK_QUEUE.md

Scope:
- ACE-017..ACE-020

Rules:
1) Confirm ACE-014 is DONE before starting.
2) Before each task, list top 3 integration-routing or operator-UX regression risks.
3) Implement Option 3 unified integration endpoints with fail-closed tenant resolution.
4) Keep manifest generation typed and deterministic (no free-form string templating).
5) Add pre-manifest wizard flow that collects required inputs only (workspace context + app name).
6) Enforce role gates: platform-managed manifest export remains super-admin restricted.
7) Publish migration and rollback playbooks before provider generalization.
8) Sync INDEX.md, MASTER_PLAN.md, TASK_QUEUE.md, and SESSION_PROMPTS.md at lane milestones.
9) Run Verify commands exactly from queue rows and resolve docs guard violations before completion.

Stop when lane G has no promotable tasks.
```
