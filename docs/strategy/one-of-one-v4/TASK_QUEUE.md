# One-of-One V4 - Task Queue

## Queue Rules

- Workstream root: `docs/strategy/one-of-one-v4`
- This queue replaces the optimistic Sprint 1 file mapping with the codebase-real execution path.
- Prefer 1-2 hour tasks with direct verification commands.
- A task can move to `DONE` only after its listed verification passes.
- Status flow is dependency-based: `PENDING` -> `READY` -> `IN_PROGRESS` -> `DONE`.
- Use `BLOCKED` only when a dependency or external setup decision prevents execution.
- Keep the first release target to a single-firm Kanzlei MVP; defer generic routing and dashboard work.
- Build the law-firm wedge on the Anne Becker protected-template lifecycle; do not ship a bespoke org-only agent path for Clara, Jonas, and Maren.

## Verification Profiles

| Verify | Command / Method |
| --- | --- |
| `DOCS_GUARD` | `npm run docs:guard` |
| `TYPECHECK` | `npm run typecheck` |
| `UNIT_INGRESS` | `npm run test:unit -- tests/unit/ai/meetingConciergeIngress.test.ts` |
| `UNIT_PHONE_BOOKING` | `npm run test:unit -- tests/unit/ai/bookingTool.nativePhoneCallConvergence.test.ts` |
| `UNIT_BOOKING_RUNTIME` | `npm run test:unit -- tests/unit/bookingOntology.agentRuntimeConvergence.test.ts` |
| `INT_CALENDAR` | `npm run test:unit -- tests/integration/googleCalendarPushReconciliation.integration.test.ts` |
| `ELEVENLABS_HANDOFFS` | `npm run landing:elevenlabs:simulate -- --suite all-handoffs` |
| `LAWFIRM_SMOKE` | Manual inbound checklist: Eleven call -> booking or phone-safe fallback -> lawyer calendar -> firm summary email |

## Execution Lanes

| Lane | Purpose | Concurrency Rule |
| --- | --- | --- |
| `LANE-A` | Eleven telephony ingress and inbound call persistence | Single-writer lane for `convex/http.ts` and `convex/channels/router.ts` |
| `LANE-B` | Booking concierge, booking model, and Kanzlei routing | Single-writer lane for `convex/ai/tools/bookingTool.ts`, `convex/bookingOntology.ts`, and org settings |
| `LANE-C` | Validation, fixtures, and live smoke process | Can run with one implementation lane, but not both, when test fixtures or shared docs are being edited |
| `LANE-D` | Platform telephony templates and Kanzlei deployment scaffolding | Single-writer lane for `convex/onboarding/seedPlatformAgents.ts` and `convex/integrations/telephony.ts`; can run with one other implementation lane when shared telephony adapter contracts are unchanged |

## Tasks

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `V4-REALITY-001` | `LANE-C` | Reality audit | High | `DONE` | - | Freeze the real gap between `TECHNICAL_PRODUCT_PLAN.md` and the current codebase, including the inbound telephony gap and the email requirement. | `TECHNICAL_PRODUCT_PLAN.md`, `IMPLEMENTATION_REALITY_AUDIT.md`, queue docs | `DOCS_GUARD` | This is the baseline for all remaining work. |
| `V4-L1-001` | `LANE-A` | Inbound call bridge | High | `READY` | `V4-REALITY-001` | Make inbound Eleven telephony calls create or resolve durable telephony call records and preserve transcript, provider call id, conversation id, route key, and tenant identity. | `convex/http.ts`, `convex/channels/router.ts` | `TYPECHECK`, `UNIT_INGRESS` | This is the actual critical path task that Sprint 1 understated. |
| `V4-L1-002` | `LANE-A` | Eleven payload adapter | High | `READY` | `V4-L1-001` | Convert Eleven post-call payloads into deterministic runtime metadata so the booking concierge can be invoked from inbound phone calls instead of only from internal runtime flows. | `convex/http.ts`, `convex/ai/agentExecution.ts`, `tests/unit/ai/meetingConciergeIngress.test.ts` | `TYPECHECK`, `UNIT_INGRESS` | Keep the payload contract explicit and tenant-safe. |
| `V4-L1-003` | `LANE-D` | Core wedge template base | High | `DONE` | `V4-REALITY-001` | Create Clara, Jonas, and Maren as protected platform telephony templates using the same seed/bootstrap/deploy lifecycle already proven by Anne Becker, while keeping the rollout limited to the 3-agent Kanzlei wedge. | `convex/onboarding/seedPlatformAgents.ts`, `convex/integrations/telephony.ts`, `apps/one-of-one-landing/scripts/elevenlabs/lib/catalog.ts` | `TYPECHECK` | Completed in code with protected template seeds, org deploy actions, and sync-time template-role transfer resolution. |
| `V4-L1-004` | `LANE-B` | Phone-first Kanzlei MVP | High | `DONE` | `V4-L1-002, V4-L1-003` | Ship the first deployable law-firm path as one explicit `Erstberatung` resource or one lawyer calendar, without automatic practice-area routing. | `convex/ai/tools/bookingTool.ts`, `convex/organizationOntology.ts` | `TYPECHECK`, `UNIT_PHONE_BOOKING` | Implemented with org-level `booking_concierge` settings, explicit resource/calendar defaults, and fail-closed resolution when the Kanzlei booking target is misconfigured. |
| `V4-L1-005` | `LANE-B` | Phone-first intake contract | High | `DONE` | `V4-L1-004` | Remove the current hard dependency on customer email for the initial law-firm path, or add a deterministic phone-only fallback that still lets the firm act on the intake. | `convex/ai/agentExecution.ts`, `convex/ai/tools/bookingTool.ts`, `convex/bookingOntology.ts` | `TYPECHECK`, `UNIT_INGRESS`, `UNIT_PHONE_BOOKING` | Implemented by letting the existing platform concierge/contact/booking path proceed on phone-call identity when caller phone is present, without fabricating a separate booking system or fake email addresses. |
| `V4-L1-006` | `LANE-B` | Structured legal intake fields | High | `DONE` | `V4-L1-004` | Extend the booking and call-artifact model so practice area, urgency, case summary, and intake provenance can be stored structurally instead of only in notes. | `convex/bookingOntology.ts`, `convex/ai/tools/bookingTool.ts` | `TYPECHECK`, `UNIT_PHONE_BOOKING`, `UNIT_BOOKING_RUNTIME` | Done with a narrow concierge-layer contract that persists structured intake on bookings and mirrored phone-call artifacts without adding a parallel booking system. |
| `V4-L1-007` | `LANE-B` | Firm notification email | High | `DONE` | `V4-L1-006` | Send a structured internal summary email to the firm when a booking or callback-ready intake is created. | `convex/ai/tools/bookingTool.ts`, `convex/channels/router.ts`, email provider path | `TYPECHECK`, `UNIT_PHONE_BOOKING` | Done with a best-effort internal firm email on the native phone-call booking path, booking-first intake reads plus artifact fallback, and a minimal Resend channel provider so the existing router can deliver org email notifications. |
| `V4-L1-008` | `LANE-C` | Calendar and booking validation | High | `READY` | `V4-L1-004, V4-L1-005, V4-L1-006` | Prove that the narrowed Kanzlei MVP still creates bookings and reconciles the configured lawyer calendar correctly. | `tests/unit/ai/bookingTool.nativePhoneCallConvergence.test.ts`, `tests/unit/bookingOntology.agentRuntimeConvergence.test.ts`, `tests/integration/googleCalendarPushReconciliation.integration.test.ts` | `UNIT_PHONE_BOOKING`, `UNIT_BOOKING_RUNTIME`, `INT_CALENDAR` | Keep this automated; do not rely on the voice demo alone. |
| `V4-L1-009` | `LANE-C` | Live law-firm smoke | High | `PENDING` | `V4-L1-001, V4-L1-002, V4-L1-003, V4-L1-007, V4-L1-008` | Run the real smoke path: inbound Eleven call -> Clara/Jonas qualification payload -> Maren booking or fallback -> lawyer calendar -> firm email. | Demo runbook docs, ElevenLabs config, smoke notes | `ELEVENLABS_HANDOFFS`, `LAWFIRM_SMOKE`, `DOCS_GUARD` | This is the publish/no-publish gate for the first law-firm deployment. |
| `V4-L2-001` | `LANE-B` | Practice-area routing | Medium | `PENDING` | `V4-L1-008` | Add explicit practice-area to lawyer-resource routing once the single-resource MVP is stable. | `convex/organizationOntology.ts`, `convex/ai/tools/bookingTool.ts`, `convex/availabilityOntology.ts` | `TYPECHECK`, `UNIT_PHONE_BOOKING` | Keep this out of the initial 2-week critical path. |
| `V4-L2-002` | `LANE-B` | Multi-lawyer Kanzlei config | Medium | `PENDING` | `V4-L2-001` | Support multiple lawyers, fallback calendars, and practice-specific roster configuration for broader Kanzlei deployments. | `convex/organizationOntology.ts`, `convex/calendarSyncOntology.ts`, `convex/ai/tools/bookingTool.ts` | `TYPECHECK`, `UNIT_PHONE_BOOKING`, `INT_CALENDAR` | Only start after one firm is live end-to-end. |
