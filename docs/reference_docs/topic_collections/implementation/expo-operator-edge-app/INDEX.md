# Expo Operator Edge App Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app`  
**Source request:** Define a handoff-ready Expo implementation plan for operator real-world runtime (phone camera/mic and optional smart-glasses adapters) with understandable trust-gate UX.

---

## Purpose

This workstream defines how to deliver a first-party Expo mobile app that:

1. acts as a camera/mic edge client for one-agent runtime,
2. keeps one-agent authority and trust-gate policies understandable to non-technical operators,
3. routes all mutations through native `vc83` tool policy gates,
4. treats OpenClaw as optional compatibility only, not required infrastructure.

---

## Core files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/MASTER_PLAN.md`
- Index (this file):
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/expo-operator-edge-app/INDEX.md`

---

## Scope boundary

Owned here:

1. Expo app architecture and implementation sequencing,
2. phone camera/mic and optional glasses adapter client contracts,
3. trust-gate explanation and operator override UX patterns,
4. mobile observability, reliability, and rollout handoff for the edge app.

Not owned here:

1. shared one-agent runtime authority policy implementation (`YAI` workstream),
2. Dream Team catalog ownership (`AGP` workstream),
3. personal-operator template ownership semantics (`PLO` workstream),
4. direct ownership of `seedPlatformAgents.ts` and `toolScoping.ts`.

---

## Status snapshot

1. Lane `A` contract freeze is complete (`EXPO-001`, `EXPO-002` done).
2. Lane `B` kickoff row `EXPO-003` is currently `BLOCKED` until `YAI-014@READY` is satisfied.
3. Core external dependencies:
   - `YAI-014@READY` for canonical ingress and authority invariants,
   - `YAI-015@READY` for native vision-edge bridge contract.
4. OpenClaw compatibility remains optional (`EXPO-013`) and default `OFF`.
5. One-agent authority invariant remains explicit: Expo app is ingress/control only, backend is mutation authority.

---

## Lane board

- [x] Lane A: trust model + contract freeze (`EXPO-001`..`EXPO-002`)
- [ ] Lane B: Expo shell + session foundation (`EXPO-003`..`EXPO-004`)
- [ ] Lane C: capture + realtime transport + ingress envelope (`EXPO-005`..`EXPO-007`)
- [ ] Lane D: trust-gate UX + overrides (`EXPO-008`..`EXPO-010`)
- [ ] Lane E: policy-safe action execution (`EXPO-011`..`EXPO-013`)
- [ ] Lane F: reliability + observability (`EXPO-014`..`EXPO-015`)
- [ ] Lane G: QA, rollout, and handoff (`EXPO-016`..`EXPO-017`)

---

## Operating commands

- Docs guard: `npm run docs:guard`
- Runtime baseline checks:
  `npm run typecheck && npm run lint && npm run test:unit && npm run test:integration && npm run test:e2e:mobile`
