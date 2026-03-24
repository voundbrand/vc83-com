# One-of-One V4 - Task Queue

## Queue Rules

- Workstream root: `docs/strategy/one-of-one-v4`
- This queue tracks the live Kanzlei MVP after the cutover away from the 3-agent wedge.
- Prefer 1-2 hour tasks with direct verification commands.
- A task can move to `DONE` only after its listed verification passes.
- Status flow is dependency-based: `PENDING` -> `READY` -> `IN_PROGRESS` -> `DONE`.
- Use `BLOCKED` only when a dependency or external setup decision prevents execution.
- Keep the first release target to a single-firm Kanzlei MVP; defer generic routing and dashboard work.
- Build the law-firm MVP on the Anne Becker protected-template lifecycle; do not ship a bespoke org-only path.
- The live template source-of-truth is [template.ts](/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/elevenlabs/agents/kanzlei-mvp/template.ts), not the old Clara/Jonas/Maren demo source.

## Verification Profiles

| Verify | Command / Method |
| --- | --- |
| `DOCS_GUARD` | `npm run docs:guard` |
| `TYPECHECK` | `npm run typecheck` |
| `UNIT_INGRESS` | `npm run test:unit -- tests/unit/ai/meetingConciergeIngress.test.ts tests/unit/ai/telephonyWebhookCompatibilityBridge.test.ts` |
| `UNIT_PHONE_BOOKING` | `npm run test:unit -- tests/unit/ai/bookingTool.nativePhoneCallConvergence.test.ts` |
| `UNIT_BOOKING_RUNTIME` | `npm run test:unit -- tests/unit/bookingOntology.agentRuntimeConvergence.test.ts` |
| `INT_CALENDAR` | `npm run test:unit -- tests/integration/googleCalendarPushReconciliation.integration.test.ts` |
| `UNIT_KANZLEI_TEMPLATE` | `npm run test:unit -- tests/unit/telephony/kanzleiMvpTemplateSeed.test.ts tests/unit/telephony/telephonyIntegration.test.ts` |
| `KANZLEI_TEMPLATE_DEPLOY` | Manual target-org deploy: run platform template seed, deploy `deployKanzleiMvpTemplateToOrganization`, then run `syncAgentTelephonyProvider` for the spawned clone and record clone id plus remote agent id |
| `ORG_SETUP_AUDIT` | Target-org audit via `integrations.telephony.getKanzleiMvpLiveSetupAudit`; confirm `bookingConcierge`, `lawyerCalendar`, `phoneBinding`, `firmNotificationRecipients`, and `ingressPreflight` are all `ready`, then record the returned ids |
| `LIVE_INGRESS_PREFLIGHT` | Manual accepted inbound call: capture provider ids, confirm `telephony_call_record`, transcript/outcome, tenant resolution, and `processInboundMessage` dispatch |
| `LAWFIRM_SMOKE` | Manual inbound checklist: Eleven call -> single Kanzlei agent -> booking or phone-safe fallback -> lawyer calendar -> firm summary email |

## Execution Lanes

| Lane | Purpose | Concurrency Rule |
| --- | --- | --- |
| `LANE-A` | Eleven telephony ingress and inbound call persistence | Single-writer lane for `convex/http.ts` and `convex/channels/router.ts` |
| `LANE-B` | Booking concierge, booking model, and live Kanzlei org settings | Single-writer lane for `convex/ai/tools/bookingTool.ts`, `convex/bookingOntology.ts`, and org settings |
| `LANE-C` | Validation, preflight, and live smoke process | Can run with one implementation lane, but not both, when shared docs are being edited |
| `LANE-D` | Single-agent Kanzlei template source, seeding, and deployment scaffolding | Single-writer lane for `apps/one-of-one-landing/elevenlabs/agents/kanzlei-mvp/*`, `src/lib/telephony/agent-telephony.ts`, `convex/onboarding/seedPlatformAgents.ts`, and `convex/integrations/telephony.ts` |

## Tasks

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `V4-REALITY-001` | `LANE-C` | Reality audit | High | `DONE` | - | Freeze the real gap between `TECHNICAL_PRODUCT_PLAN.md` and the current codebase, including the inbound telephony gap and the email requirement. | `TECHNICAL_PRODUCT_PLAN.md`, `IMPLEMENTATION_REALITY_AUDIT.md`, queue docs | `DOCS_GUARD` | This is the baseline for all remaining work. |
| `V4-L1-001` | `LANE-A` | Inbound call bridge | High | `DONE` | `V4-REALITY-001` | Make inbound Eleven telephony calls create or resolve durable telephony call records and preserve transcript, provider call id, conversation id, route key, and tenant identity. | `convex/http.ts`, `convex/channels/router.ts` | `UNIT_INGRESS` | Done in code with direct-ingress call-record creation plus same-org `providerConversationId` reuse when provider call ids drift. |
| `V4-L1-002` | `LANE-A` | Eleven payload adapter | High | `DONE` | `V4-L1-001` | Convert Eleven post-call payloads into deterministic runtime metadata so the booking concierge can be invoked from inbound phone calls instead of only from internal runtime flows. | `convex/http.ts`, `convex/ai/agentExecution.ts`, `tests/unit/ai/meetingConciergeIngress.test.ts`, `tests/unit/ai/telephonyWebhookCompatibilityBridge.test.ts` | `UNIT_INGRESS` | Done in code with trusted inbound metadata normalization, fail-closed dispatch rules, and `processInboundMessage` invocation for accepted Eleven inbound calls. |
| `V4-L1-003` | `LANE-D` | Single-agent template base | High | `DONE` | `V4-REALITY-001` | Create one protected platform Kanzlei telephony template using the same seed/bootstrap/deploy lifecycle already proven by Anne Becker. | `apps/one-of-one-landing/elevenlabs/agents/kanzlei-mvp/template.ts`, `src/lib/telephony/agent-telephony.ts`, `convex/onboarding/seedPlatformAgents.ts`, `convex/integrations/telephony.ts` | `UNIT_KANZLEI_TEMPLATE` | Completed in code with a single-agent Kanzlei prompt/KB plus a protected template role and deploy action. |
| `V4-L1-004` | `LANE-B` | Phone-first Kanzlei MVP | High | `DONE` | `V4-L1-002, V4-L1-003` | Ship the first deployable law-firm path as one explicit `Erstberatung` resource or one lawyer calendar, without automatic practice-area routing. | `convex/ai/tools/bookingTool.ts`, `convex/organizationOntology.ts` | `TYPECHECK`, `UNIT_PHONE_BOOKING` | Implemented with org-level `booking_concierge` settings, explicit resource/calendar defaults, and fail-closed resolution when the Kanzlei booking target is misconfigured. |
| `V4-L1-005` | `LANE-B` | Phone-first intake contract | High | `DONE` | `V4-L1-004` | Remove the current hard dependency on customer email for the initial law-firm path, or add a deterministic phone-only fallback that still lets the firm act on the intake. | `convex/ai/agentExecution.ts`, `convex/ai/tools/bookingTool.ts`, `convex/bookingOntology.ts` | `TYPECHECK`, `UNIT_INGRESS`, `UNIT_PHONE_BOOKING` | Implemented by letting the existing platform concierge/contact/booking path proceed on phone-call identity when caller phone is present, without fake emails. |
| `V4-L1-006` | `LANE-B` | Structured legal intake fields | High | `DONE` | `V4-L1-004` | Extend the booking and call-artifact model so practice area, urgency, case summary, and intake provenance can be stored structurally instead of only in notes. | `convex/bookingOntology.ts`, `convex/ai/tools/bookingTool.ts` | `TYPECHECK`, `UNIT_PHONE_BOOKING`, `UNIT_BOOKING_RUNTIME` | Done with a narrow concierge-layer contract that persists structured intake on bookings and mirrored phone-call artifacts without adding a parallel booking system. |
| `V4-L1-007` | `LANE-B` | Firm notification email | High | `DONE` | `V4-L1-006` | Send a structured internal summary email to the firm when a booking or callback-ready intake is created. | `convex/ai/tools/bookingTool.ts`, `convex/channels/router.ts`, email provider path | `TYPECHECK`, `UNIT_PHONE_BOOKING` | Done with a best-effort internal firm email on the native phone-call booking path, booking-first intake reads plus artifact fallback. |
| `V4-L1-008` | `LANE-C` | Calendar and booking validation | High | `DONE` | `V4-L1-004, V4-L1-005, V4-L1-006` | Prove that the narrowed Kanzlei MVP still creates bookings and reconciles the configured lawyer calendar correctly. | `tests/unit/ai/bookingTool.nativePhoneCallConvergence.test.ts`, `tests/unit/bookingOntology.agentRuntimeConvergence.test.ts`, `tests/integration/googleCalendarPushReconciliation.integration.test.ts` | `UNIT_PHONE_BOOKING`, `UNIT_BOOKING_RUNTIME`, `INT_CALENDAR` | Completed with automated coverage for the org-configured Kanzlei execute path and calendar reconciliation. |
| `V4-L1-009` | `LANE-C` | Live law-firm smoke | High | `PENDING` | `V4-L1-011, V4-L1-012, V4-L1-013` | Run the real smoke path: inbound Eleven call -> single Kanzlei agent -> booking or fallback -> lawyer calendar -> firm email. | `LAWFIRM_SMOKE_CHECKLIST.md`, `LAWFIRM_SMOKE_NOTES.md`, ElevenLabs config | `LAWFIRM_SMOKE`, `DOCS_GUARD` | The remaining gate is live deployment, org setup, preflight evidence, and one real end-to-end call. |
| `V4-L1-010` | `LANE-D` | Kanzlei live prompt source | High | `DONE` | `V4-L1-003` | Replace the live Kanzlei MVP prompt source with one single-agent template that handles intake, urgency, and scheduling in one conversation. | `apps/one-of-one-landing/elevenlabs/agents/kanzlei-mvp/template.ts`, `src/lib/telephony/agent-telephony.ts` | `UNIT_KANZLEI_TEMPLATE` | Completed in code; the live path no longer depends on the Clara/Jonas/Maren demo prompt set. |
| `V4-L1-011` | `LANE-D` | Kanzlei template deploy and sync | High | `READY` | `V4-L1-003, V4-L1-010` | Seed the new template on the platform org, deploy it to the target Kanzlei org, sync the remote Eleven agent, and capture the audit ids from `getKanzleiMvpLiveSetupAudit` (`templateAgentId`, `selectedAgentId`, `remoteAgentId`, `fromNumber`, `routeKey`). | `convex/onboarding/seedPlatformAgents.ts`, `convex/integrations/telephony.ts`, `LAWFIRM_SMOKE_NOTES.md` | `KANZLEI_TEMPLATE_DEPLOY`, `ORG_SETUP_AUDIT` | This is the live cutover step; if the new audit query is still `blocked`, the row is not complete. |
| `V4-L1-012` | `LANE-B` | Kanzlei org service config | High | `PENDING` | `V4-L1-011` | Verify the target org has a complete `booking_concierge` configuration, one writable lawyer calendar connection, deterministic booking labels, and deliverable firm notification recipients. | `convex/ai/tools/bookingTool.ts`, `convex/organizationOntology.ts`, target org settings, `LAWFIRM_SMOKE_CHECKLIST.md` | `ORG_SETUP_AUDIT` | No multi-lawyer routing or practice-area auto-assignment in this step. |
| `V4-L1-013` | `LANE-C` | Live ingress preflight | High | `PENDING` | `V4-L1-011, V4-L1-012` | Place one short accepted inbound call and confirm the direct Eleven path creates or resolves the durable call record, preserves transcript/outcome artifacts, resolves the tenant correctly, and invokes runtime before attempting a booking scenario. | `LAWFIRM_SMOKE_CHECKLIST.md`, `LAWFIRM_SMOKE_NOTES.md`, Convex logs | `LIVE_INGRESS_PREFLIGHT` | Fail closed on any route-key, org-resolution, or transcript ambiguity. |
| `V4-L2-001` | `LANE-B` | Practice-area routing | Medium | `PENDING` | `V4-L1-008` | Add explicit practice-area to lawyer-resource routing once the single-resource MVP is stable. | `convex/organizationOntology.ts`, `convex/ai/tools/bookingTool.ts`, `convex/availabilityOntology.ts` | `TYPECHECK`, `UNIT_PHONE_BOOKING` | Keep this out of the initial critical path. |
| `V4-L2-002` | `LANE-B` | Multi-lawyer Kanzlei config | Medium | `PENDING` | `V4-L2-001` | Support multiple lawyers, fallback calendars, and practice-specific roster configuration for broader Kanzlei deployments. | `convex/organizationOntology.ts`, `convex/calendarSyncOntology.ts`, `convex/ai/tools/bookingTool.ts` | `TYPECHECK`, `UNIT_PHONE_BOOKING`, `INT_CALENDAR` | Only start after one firm is live end-to-end. |
