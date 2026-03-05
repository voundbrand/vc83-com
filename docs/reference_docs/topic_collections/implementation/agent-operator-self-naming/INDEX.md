# Agent Operator Self-Naming Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming`  
**Intent:** Replace hardcoded agent naming with soul-level co-created identity contracts and unify name resolution across iPhone, webchat/native guest, and desktop AI chat.

---

## Canonical files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming/MASTER_PLAN.md`
- Index: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-operator-self-naming/INDEX.md`

---

## Why this workstream exists

Observed identity drift points in current code:

1. Mobile defaults to local `DEFAULT_AGENT_NAME='SevenLayers'` and uses it in conversation starter text.
2. Onboarding assigns names from a static internal candidate list when identity is generic.
3. Desktop AI chat shows hardcoded sender/placeholders with `SevenLayers`.
4. Commercial kickoff and runtime fallback paths still contain hardcoded `Samantha` display-name defaults.

These make soul-level naming non-authoritative and can contradict user/agent co-created identity.

---

## Lane board

- [ ] Lane `A`: identity contract + resolver (`AOSN-001`, `AOSN-002`)
- [ ] Lane `B`: runtime de-hardcoding (`AOSN-003`, `AOSN-004`)
- [ ] Lane `C`: onboarding co-creation lifecycle (`AOSN-005`..`AOSN-007`)
- [ ] Lane `D`: iPhone/mobile cutover (`AOSN-008`, `AOSN-009`)
- [ ] Lane `E`: desktop/main app AI chat cutover (`AOSN-010`..`AOSN-012`)
- [ ] Lane `F`: migration + telemetry + closeout (`AOSN-013`..`AOSN-016`)

Current status snapshot:

1. `READY`: `AOSN-001`, `AOSN-003`
2. `PENDING`: all other rows
3. `IN_PROGRESS`: none

---

## Current READY-first execution list

1. `AOSN-001` (establish identity contract authority)
2. `AOSN-003` (remove display-name runtime heuristics)

---

## Required verification gates

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npx tsc -p convex/tsconfig.json --noEmit`
4. Row-specific unit/integration slices from `TASK_QUEUE.md`

---

## Outcome target

After queue completion, every user-visible agent name in scoped channels resolves from soul-level co-created identity state, with deterministic fallback and migration-safe compatibility behavior.
