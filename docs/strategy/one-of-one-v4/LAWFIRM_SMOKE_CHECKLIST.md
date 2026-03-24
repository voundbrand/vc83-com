# Law-Firm Smoke Checklist

**Last updated:** 2026-03-23
**Queue row:** `V4-L1-009`
**Status:** `PENDING`

## Purpose

This checklist is the manual go/no-go gate for the first real Kanzlei deployment path:

`inbound Eleven call -> single Kanzlei agent -> booking or phone-safe fallback -> lawyer calendar -> firm email`

Do not treat the law-firm path as live until every gate below is green in the same release window.

## Current gate status

| Gate | Status | Evidence |
| --- | --- | --- |
| `UNIT_KANZLEI_TEMPLATE` | `PASS` | The new single-agent template seed and telephony provisioning path are covered by `tests/unit/telephony/kanzleiMvpTemplateSeed.test.ts` and `tests/unit/telephony/telephonyIntegration.test.ts`. |
| Eleven inbound webhook -> runtime bridge | `PASS` | The direct Eleven webhook path now normalizes trusted inbound metadata, creates or resolves the inbound `telephony_call_record`, records outcome/transcript artifacts, and can invoke `api.ai.agentExecution.processInboundMessage` for accepted inbound calls. |
| Existing call-artifact correlation | `PASS` | [`convex/channels/router.ts`](/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts) can now reuse a same-org call record by `providerConversationId` when the provider call id changes mid-bridge. |
| Live phone-agent/runtime booking attachment | `PASS (code)` | The booking concierge can now be reached from accepted Eleven inbound calls through the direct-ingress runtime bridge. Live tenant verification is still pending. |
| Single-agent Kanzlei template readiness | `PASS (code)` | The live MVP template now exists in [template.ts](/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/elevenlabs/agents/kanzlei-mvp/template.ts) and is seeded/deployable through [seedPlatformAgents.ts](/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts) and [telephony.ts](/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts). |
| Kanzlei org deploy state | `BLOCKED` | The repo now has a dedicated read-only audit in [telephony.ts](/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts) (`getKanzleiMvpLiveSetupAudit`), but no captured run output yet confirms a real target org clone, remote Eleven agent id, phone binding, route key, calendar linkage, or firm recipient path. |

## Remaining prerequisites before a live call

1. Seed the new Kanzlei template on the platform org if it is not present yet.
2. Deploy that template to the target Kanzlei org and sync the remote Eleven agent.
3. Capture the target org id, clone id, remote agent id, phone number, and route key.
4. Confirm the target org has `booking_concierge` settings with:
   `primaryResourceId`, `operatorCalendarConnectionId`, `timezone`, and a deterministic meeting label.
5. Confirm the target lawyer calendar connection is active and writable.
6. Confirm firm notification email recipients are configured and deliverable.
7. Run one accepted inbound preflight call and confirm the tenant resolution, call record, transcript, and runtime dispatch before trying the full booking smoke.

## Exact `V4-L1-011` operator sequence

Run these in order against the real target org:

1. Seed the protected platform template:
   `npx convex run --typecheck disable --codegen disable internal.onboarding.seedPlatformAgents.seedAll '{}'`
2. Deploy the Kanzlei template to the target org and record the returned `cloneAgentId`:
   `npx convex run --typecheck disable --codegen disable integrations.telephony.deployKanzleiMvpTemplateToOrganization '{"sessionId":"<sessionId>","organizationId":"<orgId>"}'`
3. Sync the spawned clone to ElevenLabs:
   `npx convex run --typecheck disable --codegen disable integrations.telephony.syncAgentTelephonyProvider '{"sessionId":"<sessionId>","organizationId":"<orgId>","agentId":"<cloneAgentId>"}'`
4. Audit the full live setup state:
   `npx convex run --typecheck disable --codegen disable integrations.telephony.getKanzleiMvpLiveSetupAudit '{"sessionId":"<sessionId>","organizationId":"<orgId>","agentId":"<cloneAgentId>"}'`

Record these audit fields in the smoke notes before any real call:

- `templateSeed.templateAgentId`
- `cloneDeploy.selectedAgentId`
- `remoteAgentSync.remoteAgentId`
- `phoneBinding.fromNumber`
- `phoneBinding.routeKey`
- `bookingConcierge.config.primaryResourceId`
- `lawyerCalendar.operatorConnectionId`
- `firmNotificationRecipients.effectiveRecipients`

If the audit returns blockers, fix them directly and rerun the audit:

- Missing phone binding:
  `npx convex run --typecheck disable --codegen disable integrations.telephony.saveOrganizationTelephonySettings '{"sessionId":"<sessionId>","organizationId":"<orgId>","providerKey":"elevenlabs","enabled":true,"baseUrl":"<direct-call-base-url>","fromNumber":"<e164-number>","webhookSecret":"<webhook-secret>"}'`
- Missing booking concierge config:
  `npx convex run --typecheck disable --codegen disable organizationOntology.upsertKanzleiBookingConciergeConfig '{"sessionId":"<sessionId>","organizationId":"<orgId>","primaryResourceId":"<resourceId>","primaryResourceLabel":"<resourceLabel>","operatorCalendarConnectionId":"<oauthConnectionId>","timezone":"Europe/Berlin","defaultMeetingTitle":"Erstberatung","intakeLabel":"Erstberatung","requireConfiguredResource":true}'`
- Missing firm recipient:
  `npx convex run --typecheck disable --codegen disable organizationOntology.updateOrganizationContact '{"sessionId":"<sessionId>","organizationId":"<orgId>","supportEmail":"<firm-email@example.com>"}'`

Do not attempt `V4-L1-013` until `getKanzleiMvpLiveSetupAudit` reports `ingressPreflight.status = "ready"`.

## Manual smoke procedure once unblocked

1. Call the real Eleven number routed to the target Kanzlei org.
2. Capture the provider call id, conversation id, route key, and org identity for the accepted call.
3. Confirm the call creates or resolves a `telephony_call_record` plus transcript/outcome artifacts.
4. Walk the caller through one realistic legal intake using the new single-agent prompt.
5. Confirm the agent produces either:
   `booking_confirmed`, or a deliberate phone-safe fallback with no fake success.
6. If a booking is confirmed, confirm the booking appears on the configured lawyer calendar.
7. Confirm the firm notification email arrives with structured intake fields.
8. Record screenshots, ids, timestamps, and any missing-field degradation in the smoke notes.

## 2026-03-23 execution result

`NOT RUN`

Reason:

- The code-side gates are now green.
- The new single-agent Kanzlei template exists in code.
- The real target org deployment and configuration are not yet evidenced by a captured `getKanzleiMvpLiveSetupAudit` run.
