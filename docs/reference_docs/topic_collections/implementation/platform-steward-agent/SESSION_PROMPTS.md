# Platform Mother Authority Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent`

Use one prompt per lane and worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/chat.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/completeOnboarding.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/organizations.ts`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/MASTER_PLAN.md`

---

## Concurrency and lane gating

1. Inspect the dirty worktree first with `git status --short`.
2. Execute lanes in dependency order from queue rows.
3. Maximum one `IN_PROGRESS` task globally in this workstream.
4. Do not revert in-flight telephony, template, Twilio, layers, agent UI, routing, chat-side `configure_agent_fields`, or default-operator bootstrap work.
5. Preserve the org-owned One-of-One Operator clone as the default authenticated desktop authority at every stage.
6. Treat Quinn as the current implementation base and compatibility alias for Mother during rollout.
7. Keep guest onboarding behavior intact while broadening Quinn into Mother.
8. Keep authenticated customer access to Mother explicit and isolated from default operator routing.
9. Separate Mother onboarding, support, and governance modes.
10. Keep customer-facing telephony templates behaviorally unchanged unless a row explicitly says otherwise.

---

## Lane milestone log

1. 2026-03-20: workstream initialized; queue-first artifacts created.
2. 2026-03-20: `PSA-001` completed; code-reality audit and hard boundary statement published.
3. 2026-03-20: `PSA-002` completed; Mother ontology, Quinn-to-Mother compatibility strategy, routing isolation, lifecycle, governance, migration, testing, and rollout architecture frozen in docs.
4. 2026-03-20: `PSA-003` completed; Quinn evolved into Mother at the seed and ontology layer with compatibility aliases and a protected governance runtime.
5. 2026-03-20: `PSA-004` completed; Mother is now excluded from implicit routing and only active Mother support runtimes may cross org boundaries through explicit targeting.
6. 2026-03-20: `PSA-005` completed; Mother support runtime, invocation resolvers, support-conversation entrypoint, and governance dispatch wrapper landed and passed verification.
7. 2026-03-20: `PSA-006` completed; durable Mother review artifacts, approval/rejection/execution-correlation envelopes, Quinn alias evidence support, and read-only `objectActions`/`auditLogs` evidence rails landed without enabling lifecycle writes.
8. 2026-03-20: `PSA-007` completed; Mother proposal capture now validates explicit support/governance context, reuses the canonical operator managed-clone distribution engine for dry-run-only planning, and persists review artifacts that point at lifecycle evidence without publish/apply/customer-clone writes.
9. 2026-03-20: `PSA-008` completed; Mother governance now records policy-family scope plus rollout-gate requirements on review artifacts and blocks org-local routing/telephony fields from entering Mother rollout scope.
10. 2026-03-20: `PSA-009` completed; auth, onboarding, and org-baseline flows now share one idempotent operator bootstrap invariant so the managed One-of-One Operator clone remains the authenticated desktop authority.
11. 2026-03-23: `PSA-010` completed; Mother governance now records read-only drift-audit, migration-plan, and org-intervention review packets with persisted dry-run context, partial-rollout summaries, intervention packets, Quinn alias-safe evidence, and linked lifecycle plan evidence while customer-owned clones remain untouched.
12. 2026-03-23: `PSA-011` completed; Mother governance now dispatches approved publish, distribution, and default-authority repair flows only from persisted governance review artifacts with approver identity, dry-run lifecycle correlation, and alias-safe target evidence, while missing approval or dry-run evidence still fails closed.
13. 2026-03-23: `PSA-012` completed; explicit Mother `phone_call` targeting now fails closed even if runtime metadata drifts, Quinn literal-name fallback still resolves onboarding safely, protected Mother seeds keep platform-only non-cloning invariants, and approved execution/non-mutation tests now prove review-linked lifecycle evidence plus alias-mismatch fail-closed behavior.
14. 2026-03-23: `PSA-013` completed; the explicit Mother support entrypoint now reuses an existing targeted support conversation contract when present, and internal governance controls can list, approve, and reject persisted Mother review artifacts programmatically without adding dedicated UI or a third routing rail.
15. 2026-03-23: `PSA-014` completed; Mother support now requires explicit feature flags plus a platform-owned support-release contract, canary org allowlists must come from approved governance review artifacts, and Quinn alias compatibility remains the default until rename-safety review explicitly clears a future cleanup step.

---

## Session A (Lane A: architecture freeze)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent/TASK_QUEUE.md

Scope:
- PSA-001..PSA-002

Rules:
1) Inspect the dirty worktree first.
2) Before each task, list top 3 authority, naming, or ownership contamination risks.
3) Ground every plan statement in current code reality from seedPlatformAgents, agentOntology, ai/chat, agentExecution, onboarding, and auth/bootstrap files.
4) Preserve the already-made product decision: the org-owned One-of-One Operator clone remains the default authenticated desktop authority.
5) Treat Mother as Quinn evolved, not as a separate greenfield platform agent.
6) Run Verify commands exactly from queue rows.

Stop when lane A has no promotable tasks.
```

---

## Session B (Lane B: identity evolution and routing isolation)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent/TASK_QUEUE.md

Scope:
- PSA-003..PSA-005

Rules:
1) Confirm PSA-001 and PSA-002 are DONE before starting.
2) Inspect the dirty worktree first and do not revert unrelated in-flight changes.
3) Before each task, list top 3 routing, alias-migration, or authority contamination risks.
4) Evolve Quinn into Mother instead of seeding a second competing platform identity.
5) Keep Quinn compatibility aliases intact until dedicated Mother lookup and seed tests pass.
6) Preserve guest onboarding behavior, the org-owned operator default route, Samantha, Anne, and telephony contracts.
7) Authenticated customer reachability must use explicit targeting on existing seams, not a new routing rail.
8) Run Verify commands exactly from queue rows.

Stop when lane B has no promotable tasks.
```

---

## Session C (Lane C: governance artifacts and lifecycle hooks)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent/TASK_QUEUE.md

Scope:
- PSA-006..PSA-008

Rules:
1) Confirm lane B P0 rows are DONE before starting.
2) Before each task, list top 3 governance, silent-mutation, or mode-bleed risks.
3) Mother may help customers, capture signals, propose, review, and dry-run; it must not create a parallel publish or sync engine.
4) Every future Mother write path must point to a review artifact and human approval.
5) Preserve existing managed-clone override gates (`locked`, `warn`, `free`) and extend them rather than replacing them.
6) Mother governance must fail closed if org-local routing or telephony fields appear in the rollout scope.
7) Run Verify commands exactly from queue rows.

Stop when lane C has no promotable tasks.
```

---

## Session D (Lane D: bootstrap, migration, approved execution)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent/TASK_QUEUE.md

Scope:
- PSA-009..PSA-011

Rules:
1) Confirm lane C P0 rows are DONE before starting.
2) Before each task, list top 3 bootstrap, onboarding-handoff, or migration-regression risks.
3) Org creation, onboarding completion, and auth sign-up/login flows must continue to produce the One-of-One Operator clone as the default authenticated desktop authority.
4) Mother migration work is dry-run-first and approval-first.
5) Support-mode conversations are read and proposal only; only governance mode may dispatch approved writes.
6) Missing approval, missing dry-run correlation, missing alias-safe target resolution, or missing Mother review artifact must block execution fail closed.
7) Reuse the shared operator bootstrap invariant instead of duplicating default-agent bootstrap logic in each auth/onboarding surface.
8) Run Verify commands exactly from queue rows.

Stop when lane D has no promotable tasks.
```

---

## Session E (Lane E: tests, ops wiring, rollout closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent/TASK_QUEUE.md

Scope:
- PSA-012..PSA-014

Rules:
1) Confirm all prior P0 rows are DONE or BLOCKED before starting.
2) Before each task, list top 3 release-gate, alias-cleanup, or non-regression risks.
3) Preserve telephony and customer-facing template behavior while adding Mother tests and internal wiring.
4) No dedicated super-admin UI is required; super-admin control remains programmatic and internal.
5) Customer-facing Mother entry must remain explicit and isolated from the default operator route.
6) Quinn-to-Mother rename safety must be tested before any alias cleanup is scheduled.
7) Sync INDEX.md, MASTER_PLAN.md, TASK_QUEUE.md, and SESSION_PROMPTS.md.
8) Run Verify commands exactly from queue rows.

Stop when lane E closeout is complete.
```
