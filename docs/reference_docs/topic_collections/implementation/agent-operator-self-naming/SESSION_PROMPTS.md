# Agent Operator Self-Naming Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming`

Read before execution:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming/INDEX.md`

Global lane gating and concurrency rules:

1. One active row per lane max; parallel execution allowed only for dependency-unblocked rows.
2. Allowed statuses are only `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
3. Never gate runtime behavior by display-name string literals.
4. User-visible identity must resolve from soul-level co-creation contract.
5. Run row-level `Verify` commands exactly and update all four workstream docs after each row closure.

---

## Session A (Lane A: Identity contract + resolver)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A rows from TASK_QUEUE.md.

Primary scope:
- AOSN-001
- AOSN-002

Rules:
1) Implement `agent_identity_v1` and deterministic resolver precedence first.
2) Keep identity state explicit (`pending_co_creation`, `confirmed`).
3) Propagate resolved identity through webchat/native-guest/conversation read contracts.
4) Do not leave direct `displayName` assumptions in public payloads.
5) Run listed Verify commands exactly.
```

---

## Session B (Lane B: Runtime de-hardcoding)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B rows from TASK_QUEUE.md.

Primary scope:
- AOSN-003
- AOSN-004

Rules:
1) Remove display-name-based runtime classification paths.
2) Use template role/runtime module keys for specialist/runtime decisions.
3) Replace hardcoded user-facing specialist names with resolver-derived identity labels.
4) Preserve fail-closed behavior contracts while changing naming sources.
5) Run listed Verify commands exactly.
```

---

## Session C (Lane C: Onboarding co-creation lifecycle)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C rows from TASK_QUEUE.md.

Primary scope:
- AOSN-005
- AOSN-006
- AOSN-007

Rules:
1) Remove static onboarding auto-name candidate lists.
2) Introduce explicit co-creation handshake before marking identity confirmed.
3) Persist audit metadata for proposed/accepted names.
4) Add cooldown and conflict controls for rename thrash.
5) Run listed Verify commands exactly.
```

---

## Session D (Lane D: iPhone/mobile cutover)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D rows from TASK_QUEUE.md.

Primary scope:
- AOSN-008
- AOSN-009

Rules:
1) Remove local default name authority (`DEFAULT_AGENT_NAME='SevenLayers'`).
2) Hydrate active agent identity from backend resolver payloads.
3) Keep a neutral temporary fallback label (`Operator`) only until identity resolves.
4) Convert settings name edits into co-creation intent, not local identity override.
5) Run listed Verify commands exactly.
```

---

## Session E (Lane E: Desktop/main app AI chat cutover)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane E rows from TASK_QUEUE.md.

Primary scope:
- AOSN-010
- AOSN-011
- AOSN-012

Rules:
1) Remove hardcoded sender/placeholders like `SevenLayers` in chat identity surfaces.
2) Remove hardcoded `Samantha` kickoff display-name defaults from commercial routing contracts.
3) Keep internal kickoff detection marker-based, not literal-name-prefix based.
4) Preserve operator-collaboration behavior while changing visible identity labels.
5) Run listed Verify commands exactly.
```

---

## Session F (Lane F: Migration + telemetry + closeout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane F rows from TASK_QUEUE.md.

Primary scope:
- AOSN-013
- AOSN-014
- AOSN-015
- AOSN-016

Rules:
1) Backfill identity state deterministically for historical agents.
2) Publish telemetry for identity source and fallback usage.
3) Validate parity across iPhone, native guest, webchat, and desktop AI chat.
4) Close only when queue/prompts/master-plan/index are synchronized.
5) Run listed Verify commands exactly.
```
