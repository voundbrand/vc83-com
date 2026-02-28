# Credits System & User Support Interface Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface`

**Lane milestone snapshot (2026-02-22):**

- Lane `A` (`CSI-001`..`CSI-003`) is complete.
- Lane `B` (`CSI-004`..`CSI-006`) is complete.
- Lane `C` (`CSI-007`..`CSI-009`) is complete.
- Lane `D` (`CSI-010`..`CSI-012`) is complete.
- Lane `E` (`CSI-013`..`CSI-015`) is complete.
- Lane `F` (`CSI-016`..`CSI-018`) is complete.
- Lane `G` (`CSI-019`..`CSI-021`) is complete.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/INDEX.md`

---

## Concurrency and lane gating

1. Execute lanes in queue dependency order.
2. Maximum one `IN_PROGRESS` task globally in this workstream.
3. Do not start lane `C` UI work before lane `A` and lane `B` API contracts are stable.
4. Do not start lane `F` AI support automation before lane `E` intake and escalation requirements are implemented.

---

## Session A (Lane A: credits ledger contract + API baseline)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/TASK_QUEUE.md

Scope:
- CSI-001..CSI-003

Rules:
1) Before each task, list top 3 credit-ledger regression risks.
2) Preserve compatibility with existing org-level credit balances.
3) Add gifted-credit semantics without breaking monthly/purchased consumption logic.
4) Keep response payloads deterministic and typed.
5) Run Verify commands exactly from queue rows.

Stop when lane A has no promotable tasks.
```

---

## Session B (Lane B: code redemption + admin controls)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/TASK_QUEUE.md

Scope:
- CSI-004..CSI-006

Rules:
1) Confirm CSI-002 is DONE before starting.
2) Before each task, list top 3 abuse/fraud regression risks.
3) Enforce code expiration, usage cap, and targeting restrictions.
4) Require super-admin role for code issuance/revocation.
5) Ensure redeem behavior fails closed for invalid or ambiguous claims.
6) Run Verify commands exactly from queue rows.

Stop when lane B has no promotable tasks.
```

---

## Session C (Lane C: top-right credits UX)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/TASK_QUEUE.md

Scope:
- CSI-007..CSI-009

Rules:
1) Confirm CSI-003 and CSI-005 are DONE before starting.
2) Before each task, list top 3 nav/operator UX regression risks.
3) Place credits counter next to avatar with keyboard-accessible dropdown.
4) Wire actions: Redeem Code, Buy Credits, Refer.
5) Keep desktop and mobile shell behaviors consistent with existing patterns.
6) Run Verify commands exactly from queue rows.

Stop when lane C has no promotable tasks.
```

---

## Session D (Lane D: platform-level referral system)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/TASK_QUEUE.md

Scope:
- CSI-010..CSI-012

Rules:
1) Confirm CSI-002 is DONE before starting.
2) Before each task, list top 3 referral integrity regression risks.
3) Route referrals through platform configuration (no hardcoded org IDs).
4) Reward both users on signup/subscription with cap enforced at $200/month.
5) Delay subscription rewards until payment is confirmed.
6) Run Verify commands exactly from queue rows.

Stop when lane D has no promotable tasks.
```

---

## Session E (Lane E: feedback + support intake)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/TASK_QUEUE.md

Scope:
- CSI-013..CSI-015

Rules:
1) Confirm CSI-008 is DONE before starting.
2) Before each task, list top 3 support-experience regression risks.
3) Capture feedback sentiment + message + runtime context.
4) Route feedback to support mailbox, not sales mailbox.
5) Build support intake flow with product/account selection and clear community/sales split.
6) Run Verify commands exactly from queue rows.

Stop when lane E has no promotable tasks.
```

---

## Session F (Lane F: AI support runtime + escalation)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/TASK_QUEUE.md

Scope:
- CSI-016..CSI-018

Rules:
1) Confirm CSI-015 is DONE before starting.
2) Before each task, list top 3 AI-support safety regression risks.
3) Seed support agent with docs, troubleshooting, and pricing/billing knowledge.
4) Add deterministic escalation criteria and ticket creation path.
5) Track support quality metrics and escalation outcomes.
6) Run Verify commands exactly from queue rows.

Stop when lane F has no promotable tasks.
```

---

## Session G (Lane G: i18n + security + closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane G tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/TASK_QUEUE.md

Scope:
- CSI-019..CSI-021

Rules:
1) Start only when all prior P0 tasks are DONE or BLOCKED.
2) Before each task, list top 3 release-hardening regression risks.
3) Ship six-locale parity: en, de, pl, es, fr, ja.
4) Enforce fraud/rate-limit/role-gate controls before rollout.
5) Publish migration and rollback playbooks and sync queue artifacts.
6) Run Verify commands exactly from queue rows and resolve docs guard failures before completion.

Stop when lane G has no promotable tasks.
```
