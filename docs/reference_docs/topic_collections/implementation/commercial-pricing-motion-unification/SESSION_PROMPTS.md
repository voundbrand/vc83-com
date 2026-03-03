# Commercial Pricing Motion Unification Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/INDEX.md`

---

## Resume checklist (when context is low)

1. Open queue and find the single `IN_PROGRESS` row (or promote the top deterministic `READY` row).
2. Confirm all dependencies for that row are `DONE`.
3. Execute only that row scope and run listed verification commands.
4. Update queue row status and notes with exact files touched and verify output summary.
5. Run `npm run docs:guard` whenever queue/docs are edited.

Current lane focus:

1. `CPMU-001`..`CPMU-005` are baseline `DONE`.
2. Corrected commercial contract is now locked:
   - Free = Diagnostic lead-gen
   - `€3,500` = consulting-only strategy/scope
   - `€7,000+` = first implementation motion
3. No promotable rows remain; lane `F` (`CPMU-012`, `CPMU-013`) is complete.

---

## Concurrency and gating

1. Maximum one `IN_PROGRESS` task globally for this workstream.
2. Preserve existing Pro/Scale and credits backend compatibility until lane `F` gates authorize cutover.
3. No row may imply `€3,500` implementation start.
4. No row may publish Free as a durable paid entitlement tier.
5. Every commercial CTA path must preserve `offer_code`, `intent_code`, `surface`, `routing_hint`, and campaign attribution keys.

---

## Session C (Lane C: Store correction)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/TASK_QUEUE.md

Scope:
- CPMU-006..CPMU-007

Rules:
1) Before each row, list top 3 pricing-trust regressions.
2) Reposition Free to Diagnostic lead-gen language.
3) Enforce €3,500 as consulting-only strategy/scope (no implementation promise).
4) Enforce €7,000+ as implementation start across all Store copy/CTAs.
5) Hide/de-emphasize legacy Pro/Scale on public sales surfaces while preserving management flows for existing subscribers.
6) Preserve metadata contract for all CTA routing and checkout paths.
7) Run row Verify commands exactly.

Stop when lane C has no promotable rows.
```

---

## Session D (Lane D: Landing correction)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/TASK_QUEUE.md

Scope:
- CPMU-008..CPMU-009

Rules:
1) Before each row, list top 3 landing-to-chat routing risks.
2) Replace any copy implying €3,500 implementation start.
3) Keep three-motion contract explicit: Diagnostic / Consulting Sprint / Implementation Start.
4) Replace legacy `handoff` + `intent` params with canonical `offer_code` + `intent_code` + `surface` + `routing_hint`.
5) Preserve UTM/referrer/landingPath continuity to `/chat` and stored attribution.
6) Run row Verify commands exactly.

Stop when lane D has no promotable rows.
```

---

## Session E (Lane E: Samantha alignment)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/TASK_QUEUE.md

Scope:
- CPMU-010..CPMU-011

Rules:
1) Confirm CPMU-007 and CPMU-009 are DONE.
2) Before each row, list top 3 lead-quality/routing regressions.
3) Samantha prompt/tool flow must branch by intent code and motion type.
4) Explicitly guard against consulting -> implementation promise drift.
5) Preserve required lead fields and attribution continuity.
6) Run row Verify commands exactly.

Stop when lane E has no promotable rows.
```

---

## Session F (Lane F: gates + rollback + cutover)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F rows from:
/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/commercial-pricing-motion-unification/TASK_QUEUE.md

Scope:
- CPMU-012..CPMU-013

Rules:
1) Confirm all prior P0 rows are DONE or BLOCKED.
2) Before each row, list top 3 rollout/rollback risks.
3) Validate measurable gates (metadata completeness, checkout health, credit/subscriber continuity).
4) Run a rollback rehearsal and document trigger thresholds.
5) Only execute legacy public cutover if gates pass; otherwise stay in coexistence.
6) Run row Verify commands exactly.
7) Sync INDEX.md, MASTER_PLAN.md, TASK_QUEUE.md, SESSION_PROMPTS.md.

Stop when lane F has no promotable rows.
```
