# Agent Ops Observability Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability`  
**Source request:** Build implementation documentation for Agent Ops observability by adopting proven LLM observability concepts (for example Langfuse-style trace/eval patterns) while implementing natively in the existing LayerCake platform and UI.

---

## Purpose

This folder is the execution control center for shipping Agent Ops observability as a first-party platform capability.

Primary outcomes:

1. keep observability inside the existing AI Agents product surfaces,
2. provide role-scoped visibility for organization owners and super admins,
3. expose deterministic diagnostics for channel ingress, routing, model/tool/retrieval behavior, and incident response,
4. define rollout gates and runbooks so operations are reliable and auditable.

---

## Core files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/MASTER_PLAN.md`
- Implementation spec:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/AGENT_OPS_OBSERVABILITY_IMPLEMENTATION.md`
- Index (this file):
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-ops-observability/INDEX.md`

---

## Status

1. Queue-first workstream artifacts are now initialized.
2. Implementation intent is locked to concept reuse, not third-party code copying.
3. Primary product destination is the existing AI Agents surface with explicit super-admin expansion paths.
4. Lane `A` contract/taxonomy freeze is complete (`OBS-001`, `OBS-002`).
5. Lane `B` is complete (`OBS-003`, `OBS-004`) with ingress and receipt reliability diagnostics now operator-visible.
6. Lane `C` is complete (`OBS-005`, `OBS-006`, `OBS-007`) with route-aware drilldown context and runtime KPI cards now integrated into the trust cockpit.
7. Lane `D` is complete (`OBS-008`, `OBS-009`, `OBS-010`) with super-admin scoped controls, deterministic incident state transitions, and threshold-to-incident escalation hooks now wired.
8. Lane `E` closeout is complete (`OBS-011`, `OBS-012`) with full verification evidence published; release gate is now `PASSED` and operational safeguards are active for deep-link telemetry and parity reruns.

Immediate objective:

1. proceed with rollout promotion using lane `E` handoff cadence (`npm run test:e2e:shell-parity` before each rollout window),
2. enforce monitoring thresholds for `shell_deeplink_cleanup` and aborted-navigation retry behavior,
3. treat any critical safeguard breach as immediate incident-response trigger.

---

## Lane progress board

- [x] Lane A contract freeze and telemetry model (`OBS-001`..`OBS-002`)
- [x] Lane B ingestion and runtime diagnostics plumbing (`OBS-003`..`OBS-004`)
- [x] Lane C org-owner Agent Ops UI in existing agents surfaces (`OBS-005`..`OBS-007`)
- [x] Lane D super-admin cross-org and incident controls (`OBS-008`..`OBS-010`)
- [x] Lane E verification, rollout gate, and closeout sync (`OBS-011`..`OBS-012`, gate `PASSED`)

---

## Release Gate Status (2026-02-24 watchlist-control closeout)

Gate verdict: `PASSED` after one immediate parity rerun; rollout promotion remains unblocked with transient-risk monitoring active.

Verification outcomes:

1. `npm run typecheck`: pass.
2. `npm run lint`: pass with warnings (`0` errors, `3128` warnings).
3. `npm run test:unit -- tests/unit/shell/telemetry.test.ts tests/unit/shell/url-state.test.ts`: pass (`109` files, `570` tests).
4. `npm run test:e2e:shell-parity`: attempt 1 failed in desktop suite (`tests/e2e/desktop-shell.spec.ts`) with timeout + `page.goto: Target page, context or browser has been closed` at `tests/e2e/utils/shell-navigation.ts:39`; immediate attempt 2 passed (`desktop 1/1`, `mobile 12/12`).
5. `npm run docs:guard`: pass.

Operational safeguards active:

1. `shell_deeplink_cleanup` monitoring: warning at `>=3` same-reason events per `30m`, critical at `>=8` or two consecutive warning windows; owner `ops_owner`; SLA `15m` acknowledge and `60m` mitigation plan; escalation `ops_owner` -> incident commander -> platform on-call.
2. aborted-navigation retry monitoring: warning when parity passes but records budget-edge retries (`desktop=2` or `mobile=1`), critical on any parity gate failure or budget exceed; owner `runtime_oncall`; SLA `15m` acknowledge and `60m` mitigation or rollback decision; escalation `runtime_oncall` -> incident commander + release manager + platform on-call.
3. release parity gate operationalized: `npm run test:e2e:shell-parity` is the required pre-rollout command and CI gate.

Residual non-blocking risk:

1. transient desktop timeout can appear on first parity run during warmup; treat repeat occurrences as escalation-triggering signal.
2. short-lived `shell_deeplink_cleanup` warning spikes can occur during deploy warmup; rollout remains unblocked unless critical thresholds are hit.

---

## Operating commands

- Docs policy:
  `npm run docs:guard`
- Baseline checks:
  `npm run typecheck && npm run lint && npm run test:unit`
- Integration checks:
  `npm run test:integration`
- Optional behavior checks when UI tasks land:
  `npm run test:e2e:shell-parity`
- CI/release workflow gate:
  `.github/workflows/mobile-shell-qa.yml` (`Run shell parity release gate` -> `npm run test:e2e:shell-parity`)
