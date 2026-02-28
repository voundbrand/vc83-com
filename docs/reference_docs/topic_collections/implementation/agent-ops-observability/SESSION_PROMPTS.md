# Agent Ops Observability Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/AGENT_OPS_OBSERVABILITY_IMPLEMENTATION.md`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents-window.tsx`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-trust-cockpit.tsx`
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/terminal-window.tsx`
- `/Users/foundbrand_001/Development/vc83-com/convex/terminal/terminalFeed.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/channels/webhooks.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/channels/providers/slackProvider.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts`

---

## Concurrency and lane gating

1. Execute lanes in dependency order from queue rows.
2. Maximum one `IN_PROGRESS` task globally in this workstream.
3. Do not start lanes `B`..`E` before their dependency gates are satisfied.
4. Keep Agent Ops within existing AI Agents surfaces; avoid replacing current window architecture.

---

## Lane milestone log

1. 2026-02-24: lane `A` completed (`OBS-001`, `OBS-002`); lane `B` unblocked with `OBS-003` promotable.
2. 2026-02-24: `OBS-003` completed; lane `B` moved to `OBS-004` receipt diagnostics.
3. 2026-02-24: `OBS-004` completed; lane `C` unblocked with `OBS-005` promoted.
4. 2026-02-24: `OBS-005` completed; Agent Ops section added in existing AI Agents window and `OBS-006` promoted.
5. 2026-02-24: `OBS-006` completed; trust cockpit drilldown now includes route identity, selected-agent/delivery context, and shared session/turn/correlation identifiers for terminal-trust pivots.
6. 2026-02-24: `OBS-007` completed; runtime KPI cards for fallback/tool/retrieval/scoping telemetry were wired from existing backend queries with explicit scope and period labels.
7. 2026-02-24: lane `D` completed (`OBS-008`..`OBS-010`); super-admin scoped controls, incident state workflow, and threshold-to-incident hooks are in place and lane `E` is now promotable.
8. 2026-02-24: lane `E` completed (`OBS-011`, `OBS-012`) with synchronized closeout docs and rerun gate evidence; rollout gate remains `PASSED` after parity rerun, with operational safeguards active for deep-link telemetry and aborted-navigation retry behavior.

---

## Session A (Lane A: contract and telemetry taxonomy)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/TASK_QUEUE.md

Scope:
- OBS-001..OBS-002

Rules:
1) Before each task, list top 3 observability-contract regression risks.
2) Freeze role boundaries: org-owner scope and super-admin scope.
3) Keep implementation concept-inspired and first-party; do not copy third-party vendor code.
4) Define deterministic telemetry naming for ingress, routing, runtime, delivery, and incidents.
5) Run Verify commands exactly from queue rows.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: ingress and diagnostics plumbing)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/TASK_QUEUE.md

Scope:
- OBS-003..OBS-004

Rules:
1) Confirm OBS-001 is DONE before starting.
2) Before each task, list top 3 channel-ingress regression risks.
3) Ensure webhook outcomes are visible even when payloads are ignored/skipped.
4) Preserve idempotency and receipt-first processing guarantees.
5) Run Verify commands exactly from queue rows.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: org-owner Agent Ops UI)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/TASK_QUEUE.md

Scope:
- OBS-005..OBS-007

Rules:
1) Confirm lane B P0 tasks are DONE before starting.
2) Before each task, list top 3 UI/operations regression risks.
3) Extend the existing AI Agents window; do not create a disconnected observability product surface.
4) Link terminal timeline, trust timeline, and session drilldown using shared identifiers.
5) Surface backend KPIs (fallback/tools/retrieval/scoping) with clear period and scope labels.
6) Run Verify commands exactly from queue rows.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: super-admin and incidents)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/TASK_QUEUE.md

Scope:
- OBS-008..OBS-010

Rules:
1) Confirm lane C P0 tasks are DONE before starting.
2) Before each task, list top 3 authorization and incident-response regression risks.
3) Add cross-org filtering only for authorized super-admin sessions.
4) Make incident states deterministic: open, acknowledged, mitigated, closed with evidence.
5) Keep thresholds and escalation rules auditable and documented.
6) Run Verify commands exactly from queue rows.

Stop when Lane D has no promotable tasks.
```

---

## Session E (Lane E: verification and closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/TASK_QUEUE.md

Scope:
- OBS-011..OBS-012

Rules:
1) Confirm all prior P0 tasks are DONE or BLOCKED before OBS-011.
2) Before each task, list top 3 release-gate regression risks.
3) Run the full queue verification profile exactly as listed.
4) Publish final gate status, operational safeguards, and only truly residual non-blocking risks.
5) Sync INDEX.md, MASTER_PLAN.md, TASK_QUEUE.md, and SESSION_PROMPTS.md.
6) Enforce `npm run test:e2e:shell-parity` as the pre-rollout parity gate command in docs/workflow evidence.
7) Run docs guard and resolve violations before completion.

Stop when lane E closeout is complete.
```
