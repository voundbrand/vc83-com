# Multi-Provider BYOA Channel Runtime Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime`  
**Source request:** Keep `l4yercak3` platform agents on dedicated provider apps while enabling painless org BYOA onboarding across Slack/Telegram/WhatsApp with stronger security.

---

## Purpose

Queue-first implementation layer for dual-mode channel architecture:

1. platform-owned app profiles for platform agents,
2. org-owned BYOA app profiles/installations for tenant messaging,
3. provider-agnostic routing and verification contracts with hardened security defaults.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/MASTER_PLAN.md`
- BYOA provider runbook: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/BYOA_PROVIDER_SETUP_RUNBOOK.md`
- Security matrix: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/SECURITY_FAILURE_PATH_MATRIX.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/INDEX.md`

---

## Status

Current kickoff:

1. `MPB-001` is `DONE`: architecture blockers and separation contract captured.
2. `MPB-002` is `DONE`: channel binding contract now carries installation/profile identity hints with migration-safe fallback.
3. `MPB-003` is `DONE`: migration/backfill + feature flag guardrails landed for Slack/Telegram/WhatsApp rollout.
4. `MPB-004` is `DONE`: Slack ingress now resolves installation/profile context first and verifies signatures with installation-scoped secrets at the HTTP boundary.
5. `MPB-005` is `DONE`: Telegram ingress now authenticates webhook ownership at the HTTP boundary and stores custom bot secrets encrypted-at-rest.
6. `MPB-006` is `DONE`: WhatsApp inbound routes now enforce real HMAC verification at ingress before dispatch.
7. `MPB-007` is `DONE`: outbound routing now enforces explicit platform fallback opt-in and blocks cross-boundary credential leakage across platform/BYOA profiles.
8. `MPB-008` is `DONE`: session resolution now carries route/install identity and agent dimension to prevent shared-channel collisions while preserving legacy active session continuity.
9. `MPB-009` is `BLOCKED`: deterministic route-policy dispatch implementation landed, and `V-LINT`/`V-UNIT`/`V-MODEL` passed, but `V-TYPE` failed on external `TS2589` in `src/components/window-content/store-window.tsx:46` (outside lane `C` ownership).
10. `MPB-010` is `DONE`: dual-mode integrations UX is live for Slack/Telegram/WhatsApp (including WhatsApp integration tile wiring and copy-ready setup packets), and `V-TYPE`/`V-LINT`/`V-UNIT` passed.
11. `MPB-011` is `DONE`: published BYOA provider onboarding runbook with concrete manifest fields, callback/webhook URLs, scope lists, dev->prod cutover checklist, and provider key-rotation checklist; `V-DOCS` passed.
12. `MPB-012` is `DONE`: rollout controls now include operator-facing state query, global/provider flag mutations, canary-first stage promotion guards, and explicit provider rollback mutations; `V-LINT`/`V-UNIT`/`V-INTEG`/`V-DOCS` passed, while `V-TYPE` remains externally blocked by existing errors in `convex/ai/agentExecution.ts` and `convex/integrations/openclawBridge.ts`.
13. `MPB-013` is `DONE`: failure-path security matrix expanded with new Telegram/WhatsApp signature tests, routing-isolation boundary tests, and matrix integration coverage; `V-UNIT` and `V-INTEG` passed; `V-MODEL` executed with functional tests passing but conformance output failing due missing `cost_per_1k_tokens_usd` metric.
14. `MPB-014` is `DONE`: lane `E` docs and runbooks are reconciled across queue/plan/index and docs guard is green.

Immediate objective:

1. Lane `E` closeout is complete (`MPB-012`..`MPB-014` are done).
2. Keep provider rollout promotion gated by `SECURITY_FAILURE_PATH_MATRIX.md`.
3. Use rollback mutations first on canary regressions before global fallback changes.

---

## Lane progress board

- [x] Lane A contract freeze (`MPB-001`)
- [x] Lane A implementation (`MPB-002`..`MPB-003`)
- [x] Lane B ingress security (`MPB-004`..`MPB-006`)
- [ ] Lane C routing/runtime isolation (`MPB-007`..`MPB-009`, blocked on external `V-TYPE` regression)
- [x] Lane D setup UX/docs (`MPB-010`..`MPB-011`)
- [x] Lane E migration/closeout (`MPB-012`..`MPB-014`)

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime/TASK_QUEUE.md`
- Run baseline checks: `npm run typecheck && npm run lint`
- Run runtime checks: `npm run test:unit && npm run test:integration`
- Run matrix-focused checks: `npx vitest run tests/unit/channels/telegramWebhookSecret.test.ts tests/unit/channels/whatsappSignature.test.ts tests/unit/ai/channelRouterCredentialBoundary.test.ts tests/integration/ai/channelSecurityFailurePathMatrix.integration.test.ts`
