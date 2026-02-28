# Free Onboarding Global V2 Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/INDEX.md`

---

## Resume checklist (when context is low)

1. Open queue and find the single `IN_PROGRESS` row.
2. Confirm all dependencies for that row are `DONE`.
3. Execute only that row’s scope and verify commands.
4. Update queue status/notes with concrete files changed and verify outcomes.
5. Run `npm run docs:guard` whenever queue/docs are edited.

---

## Concurrency and gating

1. Maximum one `IN_PROGRESS` task globally for this workstream.
2. Follow lane order from queue dependency flow; do not skip `P0` prerequisites.
3. Keep existing signed-in UX and existing channel routing behavior stable while adding onboarding-v2 paths.
4. Preserve business-mode default (`work`) unless an explicit row changes that requirement.
5. For lane `G`, enforce clone-first catalog birthing with `isPrimary=true` first-successful-clone behavior (`orgId + userId` scope), capability-limit snapshots (`available now` vs `blocked`), and purchase-only custom-agent concierge fallback using exact terms (`€5,000 minimum`, `€2,500 deposit`, `includes 90-minute onboarding with engineer`).

---

## Session A (Lane A: beta code platform foundation)

Latest checkpoint (2026-02-27):

1. `FOG2-001` is `DONE`.
2. `FOG2-002` is `DONE`.
3. `FOG2-003` is `DONE`: Super Admin `Beta Access` now includes beta-code filters, inline edit/deactivate, batch create, and CSV export while preserving existing gating/request behavior.
4. Lane `A` has no promotable rows in scope `FOG2-001`..`FOG2-003`.

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md

Scope:
- FOG2-001..FOG2-003

Rules:
1) Before each row, list top 3 regression risks (signup gating, auth, admin controls).
2) Run row Verify commands exactly.
3) Keep no-code signup path intact (manual approval when gate is on).
4) Keep beta code logic deterministic: normalize, validate, redeem idempotently.
5) Update queue notes with exact files and verify output summary.

Stop when lane A has no promotable rows.
```

---

## Session B (Lane B: OAuth + identity continuity)

Latest checkpoint (2026-02-27):

1. `FOG2-004` is `DONE`.
2. `FOG2-005` is `DONE`.
3. Next promotable lane outside `B` is `FOG2-008` in lane `C`.

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md

Scope:
- FOG2-004..FOG2-005

Rules:
1) Confirm FOG2-002 is DONE before starting FOG2-004.
2) Before each row, list top 3 OAuth/account-link regression risks.
3) Run row Verify commands exactly.
4) Existing OAuth login for returning users must remain unchanged.
5) Keep redemption + funnel events idempotent.

Stop when lane B has no promotable rows.
```

---

## Session C (Lane C: AI-chat-first onboarding)

Latest checkpoint (2026-02-25):

1. `FOG2-007` is `DONE`.
2. `FOG2-008` is now `DONE`.
3. Lane `C` has no promotable rows in scope `FOG2-006`..`FOG2-008`; signed-in assistant behavior remained unchanged while guest onboarding flow gained business-context-first birthing + compilation reveal guidance.

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md

Scope:
- FOG2-006..FOG2-008

Rules:
1) Confirm dependencies for FOG2-007 are DONE before starting.
2) Before each row, list top 3 onboarding UX regression risks.
3) Run row Verify commands exactly.
4) Keep chat narrative continuous (no forced form detours) for guest onboarding.
5) Preserve signed-in AI assistant behavior while extending guest flow.

Stop when lane C has no promotable rows.
```

---

## Session D (Lane D: messaging channel parity)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md

Scope:
- FOG2-009..FOG2-010

Rules:
1) Confirm FOG2-002 is DONE before lane D starts.
2) Before each row, list top 3 channel-routing regression risks.
3) Run row Verify commands exactly.
4) Do not break existing Telegram/WhatsApp/Slack/SMS handlers.
5) Track first-message latency metrics for connected channels.

Stop when lane D has no promotable rows.
```

---

## Session E (Lane E: nurture + soul report)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md

Scope:
- FOG2-011..FOG2-012

Rules:
1) Confirm FOG2-007 and FOG2-009 are DONE before starting.
2) Before each row, list top 3 personalization or timing regression risks.
3) Run row Verify commands exactly.
4) Day 0-3 first-win delivery must stay under 24 hours.
5) Soul report content must be data-backed and channel-safe.

Stop when lane E has no promotable rows.
```

---

## Session F (Lane F: rollout + closeout)

Latest checkpoint (2026-02-25):

1. `FOG2-013` is `DONE`: centralized rollout controls (`legacy_manual_approval` vs `v2_beta_code_auto_approve`) and emergency kill switch are wired through signup decisioning and Super Admin controls.
2. `FOG2-014` is `DONE`: re-validation ran commands exactly (`npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run docs:guard`) and all checks passed after fixing `convex/ai/agentExecution.ts` optional `ctx.db` narrowing in cross-org enrichment.
3. Kill-switch + rollback contract from `FOG2-013` remains valid and unchanged; rollback remains policy-only and does not require Telegram/WhatsApp/Slack/SMS handler or first-message latency telemetry changes. Runbook location: `MASTER_PLAN.md` -> `FOG2-013 Rollout + Rollback Runbook`.
4. Lane `F` has no promotable rows in scope `FOG2-013`..`FOG2-014`.

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md

Scope:
- FOG2-013..FOG2-014

Rules:
1) Confirm all prior P0 rows are DONE or BLOCKED.
2) Before each row, list top 3 rollout/rollback risks.
3) Run row Verify commands exactly.
4) Publish kill-switch and rollback steps before final completion.
5) Sync INDEX.md, MASTER_PLAN.md, TASK_QUEUE.md, SESSION_PROMPTS.md.

Stop when lane F has no promotable rows.
```

---

## Session G (Lane G: clone-first birthing convergence)

Latest checkpoint (2026-02-25):

1. `FOG2-015` is `DONE`.
2. `FOG2-016` is `DONE`.
3. `FOG2-016` closure added deterministic lane-G regression coverage and runbook synchronization for clone-first onboarding contracts (`isPrimary=true` first-successful-clone behavior in `orgId + userId`, capability-limit transparency, one-visible-operator copy constraints, tone/communication-style capture, and no-fit concierge fallback messaging).
4. Lane `G` now has no promotable rows in scope `FOG2-015`..`FOG2-016`; `FOG2-013` rollout/kill-switch/rollback contracts remain unchanged (policy-only rollback).

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane G rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/free-onboarding-global/TASK_QUEUE.md

Scope:
- FOG2-015..FOG2-016

Rules:
1) Confirm dependencies are satisfied before starting: `FOG2-014` is DONE and `AGP-023` is READY or DONE.
2) Remove onboarding-exposed operator free-form create defaults; birthing must route through protected-template clone lifecycle.
3) Set `isPrimary=true` for the first successful clone when no primary exists in `orgId + userId`.
4) Show capability-limit snapshot (`available now` vs `blocked`) in onboarding birthing/activation handoff.
5) Route no-fit onboarding outcomes to purchase-only custom-agent concierge with exact terms: `€5,000 minimum`, `€2,500 deposit`, `includes 90-minute onboarding with engineer`.
6) Enforce one-visible-operator language: do not expose internal terms like `clone`, `template`, `specialist routing`, or `orchestration layer` in operator-facing onboarding copy.
7) Preserve `FOG2-013` rollout and kill-switch/rollback behavior unchanged (policy-only rollback; no channel-handler rewrites).
8) Run row Verify commands exactly.
9) Sync INDEX.md, MASTER_PLAN.md, TASK_QUEUE.md, SESSION_PROMPTS.md, and ROLLOUT_CHECKLIST.md when lane G milestones move.

Stop when lane G has no promotable rows.
```
