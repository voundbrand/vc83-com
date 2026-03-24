# Law-Firm Smoke Notes

**Date:** 2026-03-23
**Queue row:** `V4-L1-009`
**Result:** `NO-GO`

## Validation run

`npm run test:unit -- tests/unit/telephony/kanzleiMvpTemplateSeed.test.ts tests/unit/telephony/telephonyIntegration.test.ts`

Result:

- `PASSED`

Notes:

- The new single-agent Kanzlei template is now covered as a protected template seed plus remote Eleven provisioning path.
- The live MVP no longer depends on rewriting the Clara/Jonas/Maren demo prompt set before deployment.
- A dedicated live setup audit now exists in [telephony.ts](/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts) as `getKanzleiMvpLiveSetupAudit` so the real target org can be checked for template seed, clone deploy, remote sync, phone binding, route key, booking config, lawyer calendar readiness, and firm recipients in one run.

## Code-side findings now cleared

1. Eleven inbound webhook ingress is no longer outcome-only for the direct provider path.
   [`convex/http.ts`](/Users/foundbrand_001/Development/vc83-com/convex/http.ts) can now normalize trusted inbound metadata, create or resolve the inbound call record, record outcome/transcript artifacts, and invoke `api.ai.agentExecution.processInboundMessage` for accepted inbound calls.

2. The Eleven direct ingress path now establishes or reuses an inbound call record before outcome mutation.
   [`convex/channels/router.ts`](/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts) can reuse a same-org record by `providerConversationId` when provider call ids drift.

3. The accepted Eleven webhook can now dispatch the platform runtime booking path.
   The direct ingress path in [`convex/http.ts`](/Users/foundbrand_001/Development/vc83-com/convex/http.ts) can invoke `api.ai.agentExecution.processInboundMessage` with tenant-safe fail-closed rules.

4. A dedicated single-agent Kanzlei telephony template now exists in code.
   The canonical source is [`template.ts`](/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/elevenlabs/agents/kanzlei-mvp/template.ts), seeded through [`seedPlatformAgents.ts`](/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts), and deployable through [`telephony.ts`](/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts).

## Remaining live-smoke blockers

1. `V4-L1-011` is still awaiting real operator evidence, not code work.
   There is no captured output yet from `integrations.telephony.getKanzleiMvpLiveSetupAudit` for the real target org. That means the intended org clone, remote Eleven agent id, phone binding, route key, lawyer calendar readiness, and firm recipient path are still unverified in live state.

2. There is no recorded live ingress preflight yet.
   The new bridge and template path exist in code, but one accepted inbound call still needs to prove the real number resolves the correct tenant and produces the expected runtime artifacts before the full booking smoke.

## Live smoke execution

Manual `LAWFIRM_SMOKE`:

- `NOT ATTEMPTED`

Exact blocker:

- The code-side bridge and single-agent template are ready, but the target Kanzlei org still lacks one captured `getKanzleiMvpLiveSetupAudit` result proving `templateSeed`, `cloneDeploy`, `remoteAgentSync`, `phoneBinding`, `bookingConcierge`, `lawyerCalendar`, and `firmNotificationRecipients` are all ready.

## Setup still required before retry

1. Run `internal.onboarding.seedPlatformAgents.seedAll`.
2. Run `integrations.telephony.deployKanzleiMvpTemplateToOrganization` and record `cloneAgentId`.
3. Run `integrations.telephony.syncAgentTelephonyProvider` for that clone.
4. Run `integrations.telephony.getKanzleiMvpLiveSetupAudit` and record:
   `templateSeed.templateAgentId`, `cloneDeploy.selectedAgentId`, `remoteAgentSync.remoteAgentId`, `phoneBinding.fromNumber`, `phoneBinding.routeKey`, `bookingConcierge.config.primaryResourceId`, `lawyerCalendar.operatorConnectionId`, and `firmNotificationRecipients.effectiveRecipients`.
5. If the audit returns blockers, fix only those blocker fields and rerun the audit until `ingressPreflight.status` is `ready`.
6. Run one accepted inbound preflight call and record the call ids plus runtime artifacts.
7. Retry the full manual smoke only after the preflight is green.

## Decision

`V4-L1-009` stays `PENDING` until `V4-L1-011` produces a green live setup audit and `V4-L1-013` produces one accepted inbound preflight call.
