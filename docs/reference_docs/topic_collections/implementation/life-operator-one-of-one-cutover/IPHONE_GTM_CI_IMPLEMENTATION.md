# iPhone GTM CI Implementation

**Status:** Active contract (`LOC-037`)  
**Last updated:** 2026-03-05  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover`

---

## Objective

Ship a deterministic go-to-market delivery path for the iPhone operator app that supports the founder demo outcome:

1. live networking conversation capture from iPhone + optional Meta glasses ingress,
2. concierge extraction of person/context/intent,
3. guarded appointment creation flow with explicit confirmation and trust evidence,
4. parity behavior between iPhone app and mother-repo web chat surfaces.

---

## Blocker policy

`expo run:ios` is blocked on unsupported Node versions.

1. Supported runtime for Expo local commands is Node `>=20` and `<24`.
2. `apps/operator-mobile/.nvmrc` is pinned to Node `22`.
3. `apps/operator-mobile/scripts/require-supported-node.mjs` fails fast with remediation steps when runtime is out of contract.
4. `apps/operator-mobile` scripts (`start`, `ios`, `android`, `web`) enforce this guard.

---

## iPhone preflight contract

Command:

```bash
cd /Users/foundbrand_001/Development/vc83-com/apps/operator-mobile
npm run ci:ios:preflight
```

Deterministic checks:

1. mobile type safety (`npm run typecheck`),
2. App Store icon readiness (`npm run icons:check`):
   - `assets/icon.png` exists and is `1024x1024`,
   - `ios/L4yercak3/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png` exists and is `1024x1024`,
   - both icons contain no alpha channel.

---

## CI implementation

Workflow: `/Users/foundbrand_001/Development/vc83-com/.github/workflows/operator-mobile-ios-preflight.yml`

Trigger contract:

1. `pull_request` changes under `apps/operator-mobile/**`,
2. `push` to `main` affecting `apps/operator-mobile/**`,
3. manual `workflow_dispatch`.

Execution contract:

1. Use Node from `apps/operator-mobile/.nvmrc` (Node 22),
2. install app dependencies with `npm ci`,
3. execute `npm run ci:ios:preflight`.

---

## Mother-repo parity gates for live demo

iPhone preflight CI is necessary but not sufficient for the founder demo.

Before go-to-market demo signoff, keep these lane-`H` gates green:

1. `LOC-032`: shared AV/mobile blockers cleared (`V-TYPE`, `V-MOBILE-TYPE`, `V-UNIT`, `V-E2E-DESKTOP`),
2. `LOC-033`: web/iPhone metadata parity (`commandPolicy`, `transportRuntime`, `avObservability`),
3. `LOC-035`: final parity runbook evidence with external done-gates `AVR-012` and `FOG2-016` (both are already `DONE`).

---

## Release execution

After preflight + parity gates:

```bash
cd /Users/foundbrand_001/Development/vc83-com/apps/operator-mobile
npm run build:ios:production
npm run submit:ios:production
```

One-shot path:

```bash
npm run deploy:testflight
```

This implementation works with existing TestFlight runbook:
`/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/DEPLOY_TESTFLIGHT.md`

---

## LOC-044 Reality Sanity Ledger (2026-03-02)

Fail-closed stage status: `GO` for `LOC-044` contract-alignment gates; rehearsal acceptance remains governed by `LOC-045` verify results.

| Contract signal | File-level evidence | Status | Owner | Unblock date |
|---|---|---|---|---|
| iPhone runtime/toolchain preflight gate | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile` (`npm run ci:ios:preflight`) | `GO` | lane `I` release ops | 2026-03-02 |
| Recommender specialist IDs are registered in kickoff specialist hints | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-recommender.ts`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/onboarding-kickoff-contract.ts` | `GO` (kickoff hints now include `medical_compliance_reviewer` from shared specialist-role contract) | lane `K` `LOC-045` engineering | 2026-03-02 |
| Coverage blueprint IDs are present and stable | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents-window.tsx` | `GO` | lane `K` product/runtime | 2026-03-02 |
| Deterministic recommender-ID -> blueprint-ID join contract exists | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-recommender.ts`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents-window.tsx` | `GO` (shared `SPECIALIST_ROLE_CONTRACTS` now anchors role-to-blueprint mapping and specialist coverage derivation) | lane `K` `LOC-045` engineering | 2026-03-02 |
| Concierge runtime hook contract exists with preview-first + explicit-confirm guardrails | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` | `GO` | lane `H`/`K` runtime | 2026-03-02 |
| Convex + CRM + calendar + outbound invite channel readiness is captured in deterministic preflight evidence | `/Users/foundbrand_001/Development/vc83-com/tests/e2e/utils/fnd-007-rehearsal.ts`; `/Users/foundbrand_001/Development/vc83-com/tmp/reports/fnd-007/latest.json`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/DEMO_READINESS_SCORECARD.md` | `GO` (artifact now includes `preflight_status.runtimeReadiness.{convexConnected, crmLookupCreateConfigured, calendarReadinessConfigured, outboundInviteChannelReady}` fields) | demo-ops owner (`LOC-045`) | 2026-03-02 |
| iOS/TestFlight profile and release path are documented | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/DEPLOY_TESTFLIGHT.md` | `GO` | lane `I` release ops | 2026-03-02 |

`LOC-045` closed prior `LOC-044` contract-alignment `NO_GO` rows; remaining lane-`K` blocker is rehearsal checkpoint failure (`FND-007-C3`) captured in `tmp/reports/fnd-007/latest.json` and founder aggregate `tmp/reports/founder-rehearsal/latest.json`.

---

## ARH-L-001 Tool-Chain Truth Audit (2026-03-05)

Fail-closed audit status for `ARH-L-001`: `GO` for deterministic tool-chain contract coverage, with explicit inferred-vs-artifact labels.

| Capability path | Runtime contract evidence | Evidence type | Evidence commands | Status | Notes |
|---|---|---|---|---|---|
| CRM lookup/create | `run_meeting_concierge_demo` stage contract emits `crm_lookup_create` with fail-closed outcomes (`crm_lookup_failed`, `crm_contact_create_required`, `contact_capture_create_failed`) in `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts` | `artifact-backed` | `rg -n "crm_lookup_create|crm_lookup_failed|crm_contact_create_required|contact_capture_create_failed|internalSearchContacts|internalCreateContact|internalUpdateContact" /Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts`; `npm run test:unit -- tests/unit/ai/meetingConciergeIngress.test.ts tests/unit/ai/agentExecutionVoiceRuntime.test.ts` | `PASS` | Unit matrix now includes explicit `stage_blocked:crm_lookup_create:crm_lookup_failed` reason-code assertion. |
| Booking create | Deterministic booking stage (`booking_created` / `booking_replayed`) in `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts` with idempotency patch fail-closed path | `artifact-backed` | `rg -n "booking_created|booking_replayed|booking_create_failed|booking_idempotency_patch_failed|createBookingInternal" /Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts`; `npm run test:unit -- tests/unit/ai/meetingConciergeIngress.test.ts tests/unit/ai/agentExecutionVoiceRuntime.test.ts` | `PASS` | Telemetry matrix includes execute-path terminal stage coverage (`invite_sent`) proving booking stage progression into invite stage. |
| Calendar push | Explicit post-booking calendar mutation via `pushBookingToCalendar` with fail-closed `invite_calendar_push_failed` stage outcome | `artifact-backed` | `rg -n "pushBookingToCalendar|invite_calendar_push_failed|calendarPush" /Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts`; `npx vitest run tests/integration/ai/mobileRuntimeHardening.integration.test.ts tests/integration/ai/avDeviceMatrixLatency.integration.test.ts` | `PASS` | Calendar push is a hard gate before confirmation send; failure keeps terminal outcome `blocked`. |
| Confirmation send | Deterministic outbound invite routing (`resolveConfirmationRouting` + `channels.router.sendMessage`) with fail-closed `invite_delivery_failed` and success `invite_sent` | `artifact-backed` | `rg -n "resolveConfirmationRouting|sendMessage|invite_delivery_failed|invite_sent" /Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts`; `npm run test:unit -- tests/unit/ai/meetingConciergeIngress.test.ts tests/unit/ai/agentExecutionVoiceRuntime.test.ts` | `PASS` | Unit matrix asserts both blocked (`invite_delivery_failed`) and success (`invite_sent`) terminal outcomes. |
| STT language path | `resolveVoiceRuntimeLanguage` feeds `adapter.transcribe(...language)` and ElevenLabs adapter maps to `language_code` form field | `artifact-backed` | `rg -n "resolveVoiceRuntimeLanguage|adapter\\.transcribe\\(|resolvedLanguage" /Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `rg -n "language_code|transcribe\\(" /Users/foundbrand_001/Development/vc83-com/convex/ai/voiceRuntimeAdapter.ts`; `npm run test:unit -- tests/unit/ai/meetingConciergeIngress.test.ts tests/unit/ai/agentExecutionVoiceRuntime.test.ts` | `PASS` | STT language selection is deterministic (`inbound -> voiceLanguage -> language`) and now carried in runtime telemetry metadata. |
| TTS language path | TTS currently consumes assistant text + configured voice id; runtime now records `resolvedSynthesisLanguage` / usage metadata language for audit trail | `inferred` | `rg -n "adapter\\.synthesize\\(|resolveVoiceRuntimeLanguage|resolvedSynthesisLanguage|resolvedLanguage" /Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `npm run test:unit -- tests/unit/ai/meetingConciergeIngress.test.ts tests/unit/ai/agentExecutionVoiceRuntime.test.ts` | `PASS_WITH_INFERENCE` | Provider-enforced language selection is not a dedicated synthesize argument in current adapter contract; language control is inferred from generated assistant text + configured language policy. |
| Vision OCR ingress | Concierge payload extraction ingests `cameraRuntime.detectedText|ocrText|sceneSummary` with attestation gating before extraction | `artifact-backed` | `rg -n "cameraRuntime\\.detectedText|cameraRuntime\\.ocrText|cameraRuntime\\.sceneSummary|collectMeetingConciergeTextCandidates" /Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `npm run test:unit -- tests/unit/ai/meetingConciergeIngress.test.ts tests/unit/ai/agentExecutionVoiceRuntime.test.ts`; `npx vitest run tests/integration/ai/mobileRuntimeHardening.integration.test.ts tests/integration/ai/avDeviceMatrixLatency.integration.test.ts` | `PASS` | Unit matrix now includes explicit OCR-only ingress extraction evidence; integration suite covers attestation fail-closed behavior. |

Verification bundle for this audit row:

```bash
npm run typecheck
npx tsc -p convex/tsconfig.json --noEmit
npm run test:unit -- tests/unit/ai/meetingConciergeIngress.test.ts tests/unit/ai/agentExecutionVoiceRuntime.test.ts
npx vitest run tests/integration/ai/mobileRuntimeHardening.integration.test.ts tests/integration/ai/avDeviceMatrixLatency.integration.test.ts
npm run docs:guard
```
