# Channel Runtime Security Failure-Path Matrix

**Workstream:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/multi-provider-byoa-channel-runtime`  
**Last updated:** 2026-02-19  
**Owner lane:** `E` (`MPB-013`)

---

## Purpose

Define and enforce the go/no-go matrix for BYOA channel rollout stage promotion.

Rollout promotion rule:

1. Provider stages may move from `canary` to `on` only when the matrix is green.
2. A matrix is green only when every failure-path check below is passing.

---

## Matrix

| Failure-path dimension | Expected behavior | Coverage |
|---|---|---|
| Signature spoof | Invalid Slack/Telegram/WhatsApp signatures are rejected | `tests/unit/slack/slackSignatureRotation.test.ts`; `tests/unit/channels/telegramWebhookSecret.test.ts`; `tests/unit/channels/whatsappSignature.test.ts`; `tests/integration/ai/channelSecurityFailurePathMatrix.integration.test.ts` |
| Replay | Stale Slack signature timestamps are rejected; deterministic event keys remain stable | `tests/integration/slack/slackWebhookSignature.integration.test.ts`; `tests/unit/slack/slackReplayIdempotency.test.ts` |
| Token rotation | Previous valid Slack signing secrets are accepted during rotation windows | `tests/unit/slack/slackSignatureRotation.test.ts`; `tests/integration/ai/channelSecurityFailurePathMatrix.integration.test.ts` |
| Routing isolation | Organization bindings cannot resolve to platform fallback credentials; route/install identity mismatches fail boundary checks | `tests/unit/ai/channelRouterCredentialBoundary.test.ts`; `tests/integration/ai/channelSecurityFailurePathMatrix.integration.test.ts` |

---

## Green Criteria

Treat the matrix as green only when all of the following pass in the target environment:

1. `npm run test:unit`
2. `npm run test:integration`
3. `npm run test:model`

Optional focused preflight before full profiles:

1. `npx vitest run tests/unit/channels/telegramWebhookSecret.test.ts tests/unit/channels/whatsappSignature.test.ts tests/unit/ai/channelRouterCredentialBoundary.test.ts tests/unit/slack/slackSignatureRotation.test.ts tests/unit/slack/slackReplayIdempotency.test.ts tests/integration/slack/slackWebhookSignature.integration.test.ts tests/integration/ai/channelSecurityFailurePathMatrix.integration.test.ts`

If any matrix check fails:

1. Keep provider stage at `canary` or `off`.
2. Execute rollback command for affected provider.
3. Re-run the full matrix before another promotion attempt.
