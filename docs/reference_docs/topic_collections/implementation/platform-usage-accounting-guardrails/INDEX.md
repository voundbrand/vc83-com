# Platform Usage Accounting Guardrails Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails`  
**Source request:** End-to-end metering for all platform-funded and non-platform AI usage, CI guardrails against unmetered provider calls, and guard-driven fix planning.

---

## Purpose

Queue-first execution layer for universal AI usage accounting across:

1. OpenRouter/direct LLM paths,
2. ElevenLabs voice paths,
3. v0 generation paths,
4. all billing-source modes (`platform`, `byok`, `private`).

The objective is deterministic credits-to-native-cost observability with super-admin economics accuracy and regression-resistant CI guardrails.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails/MASTER_PLAN.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails/INDEX.md`

---

## Status snapshot

1. Baseline guard inventory completed (`PUAG-001`) and seeded into queue.
2. Canonical non-chat metering contract (`PUAG-002`) is complete.
3. Runtime/v0 uncovered callsite lanes (`PUAG-003`, `PUAG-004`) are complete and reflected in guard-passing closeout verification.
4. CI guard + regression suite verification commands are active and passing in closeout runs (`PUAG-005`, `PUAG-006` verification profile surfaces).
5. Lane `E` closeout is complete (`PUAG-007`, `PUAG-008`) with guard output showing zero newly introduced unmetered callsites and full verification profile passing.

Immediate objective:

1. Preserve guard zero state in CI (`npm run ai:usage:guard`).
2. Keep workstream docs synchronized as queue statuses advance.

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-usage-accounting-guardrails/TASK_QUEUE.md`
- Baseline guard scan: `rg -n "chatCompletion\\(" convex && rg -n "v0Request<|v0Request\\(" convex/integrations/v0.ts && rg -n "fetch\\(" convex/integrations/v0.ts`
- Full implementation verify: `npx convex codegen && npm run typecheck && npm run test:unit`
