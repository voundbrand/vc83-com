# macOS Native Companion Runtime Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/macos-native-companion-runtime`  
**Last updated:** 2026-02-27

---

## Objective

Deliver a native macOS companion app (`apps/macos`) that functions as an operator-first menu bar surface and local-capability ingress bridge while preserving one-agent backend authority and trust controls.

---

## Why this stream exists

Current state in this repository:

1. YAI contracts for canonical ingress/trust authority are done (`YAI-014`..`YAI-021`).
2. Reusable AV foundations are largely done and now exposing a no-bypass bridge gate (`AVR-010` is `DONE`).
3. Repo implementation still lacks a dedicated `apps/macos` production target.
4. PRD intent already specifies a native menu bar companion and `apps/macos` build phase, but execution rows were not opened in a dedicated implementation queue.

This stream closes that execution gap.

---

## `MCR-001` execution baseline (`DONE` 2026-02-26)

### Scope

1. `apps/macos` native scaffold and lifecycle.
2. Menu bar quick chat + hotkey + notification/deep-link UX.
3. Local connectors for camera, microphone, screen context.
4. Optional scoped system connector contract (deny-by-default).
5. Canonical ingress/trust/approval bridge integration.
6. Packaging/signing/notarization/update pipeline readiness.
7. QA matrix and rollback playbook.

### Non-goals

1. Marketplace/catalog/commercial AGP frozen lanes.
2. Mobile Expo feature delivery.
3. Treating `docs/reference_projects/openclaw/*` as product source code.
4. Unbounded root-level local execution capability.

### Authority invariants

1. `vc83` backend runtime (`convex/ai/*`) is the only mutation authority.
2. macOS companion is ingress/control only; it may not finalize mutating intents locally.
3. Any mutating intent requires canonical policy + trust gate + approval artifact enforcement.
4. Missing/invalid approval artifacts force fail-closed behavior.
5. `vc83_runtime_policy` precedence cannot be bypassed by desktop bridge compatibility layers.

### OpenClaw reference boundary rules

1. OpenClaw assets are reference-only architecture inputs.
2. Production source-of-truth remains first-party repo paths (`apps/macos`, `convex/ai/*`, tests, workstream docs).
3. Any borrowed pattern must be translated into explicit `vc83` contract language before implementation rows proceed.
4. When OpenClaw behavior conflicts with `vc83` trust/authority contracts, `vc83` contracts win without exception.

### Acceptance criteria mapped to executable rows

| Acceptance criterion | Queue rows that satisfy it | Verification profile(s) |
|---|---|---|
| Baseline contract (scope, non-goals, invariants, reference boundaries) is published and frozen | `MCR-001` | `V-DOCS` |
| Permission/trust matrix for mic/camera/screen/system/keychain/notifications is explicit and approval-token based | `MCR-002` | `V-DOCS` |
| Native menu-bar app skeleton is buildable/testable | `MCR-003` | `V-SWIFT-BUILD`; `V-SWIFT-TEST`; `V-DOCS` |
| Bridge envelope remains `tcg_ingress_envelope_v1` compatible with no local mutation authority | `MCR-004` | `V-SWIFT-BUILD`; `V-SWIFT-TEST`; `V-DOCS` |
| Desktop auth/keychain lifecycle and LaunchAgent behavior are deterministic and reversible | `MCR-005`; `MCR-006` | `V-SWIFT-BUILD`; `V-SWIFT-TEST`; `V-DOCS` |
| Operator UX path (popover/hotkey/notifications/deep links) preserves trust boundaries | `MCR-007`; `MCR-008` | `V-SWIFT-BUILD`; `V-SWIFT-TEST` |
| Capture connectors use canonical AV metadata and remain no-bypass; scoped system connector stays deny-by-default | `MCR-009`; `MCR-010` | `V-SWIFT-BUILD`; `V-TYPE`; `V-UNIT`; `V-AV-CONTRACT`; `V-DOCS` |
| Backend ingress/trust/approval invariants and mac observability remain canonical | `MCR-011`; `MCR-012` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-AV-CONTRACT`; `V-DOCS` |
| Signing/notarization/update pipeline is deterministic and rollback-aware | `MCR-013`; `MCR-014` | `V-SWIFT-BUILD`; `V-DOCS` |
| QA evidence, residual risk, rollback, and ownership closeout are complete | `MCR-015`; `MCR-016` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-E2E-DESKTOP`; `V-DOCS` |
| Post-closeout monitoring + automation hardening baseline is established | `MCR-017` | `V-DOCS` |
| Production release automation is executable end-to-end (notarize, appcast sign, GitHub release publish) with strict fail-closed behavior and report-mode blocker evidence | `MCR-018` | `V-SHELL-LINT`; `V-RELEASE-REPORT`; `V-DOCS` |
| Desktop node/gateway transport, capability discovery, and first concrete approval-gated capture vertical slice are implemented in `apps/macos` | `MCR-020` | `V-SWIFT-BUILD`; `V-SWIFT-TEST`; `V-TYPE`; `V-LINT`; `V-UNIT`; `V-E2E-DESKTOP`; `V-DOCS` |
| Native chat-window parity slice is implemented on macOS using the same ingress contract as iPhone/webchat (backend-authoritative and approval-aware) | `MCR-021A` | `V-SWIFT-BUILD`; `V-SWIFT-TEST`; `V-DOCS` |
| Concrete camera + microphone providers and voice wake/push-to-talk transcript forwarding are implemented with fail-closed permission/approval behavior | `MCR-021`; `MCR-022` | `V-SWIFT-BUILD`; `V-SWIFT-TEST`; `V-TYPE`; `V-UNIT`; `V-DOCS` |
| Exec approvals UX/policy hardening and trust-portal notification action parity are complete | `MCR-023`; `MCR-024` | `V-SWIFT-BUILD`; `V-SWIFT-TEST`; `V-LINT`; `V-E2E-DESKTOP`; `V-DOCS` |
| Desktop parity foundation closeout (observability + safe failure/rollback behavior) is complete before broad release rehearsal | `MCR-025` | `V-SWIFT-BUILD`; `V-SWIFT-TEST`; `V-TYPE`; `V-LINT`; `V-UNIT`; `V-E2E-DESKTOP`; `V-DOCS` |
| First strict credentialed release rehearsal is captured with real secrets and hosted URLs | `MCR-019` | `V-DOCS` |

---

## Permission and trust matrix (`MCR-002` `DONE` 2026-02-26)

### Capability matrix with approval-token semantics

| Capability | Read-only context path | Mutating action path | OS permission/runtime surface | Default mode | Required approval token | Token scope + TTL | Trust evidence + fail-closed behavior |
|---|---|---|---|---|---|---|---|
| Menu bar quick chat | Draft/view conversation context | Dispatch mutating tool intent via backend orchestration | none | enabled | `approval.action` for mutating tool calls (none for read-only chat context) | single intent; expires immediately after one successful/failed decision | Correlation ID + tool-intent hash required; missing token blocks tool execution |
| Notification alerts | Receive/display informational alerts | Approve/escalate from notification deep link | macOS notifications | disabled until consent | `consent.preference` to enable channel; `approval.action` for mutating approval click-through | preference token persists until revoked; action token is single-use | Notification events must carry correlation ID; missing/invalid token resolves to read-only open state |
| Microphone capture | Device availability + level preview metadata | Start/stop capture stream | `NSMicrophoneUsageDescription` | off | `approval.session` | session-scoped; expires on session end or idle timeout | Trust log includes session ID, capability, token ID; if gate fails capture does not start |
| Camera capture | Device availability + preview metadata | Start/stop camera stream | camera permission | off | `approval.session` | session-scoped; expires on session end or idle timeout | Trust log includes session ID, capability, token ID; gate failure keeps camera off |
| Screen snapshot/record | Enumerate displays + capture readiness metadata | Start snapshot/record operation | screen recording permission | off | `approval.session` for capture start; `approval.action` for export/share mutation | session token for active capture; action token for each mutating export/share intent | Gate outcomes and artifact IDs must be recorded; no token means no recording/export |
| Keychain token storage | Read existing scoped session credential metadata | Write/rotate/revoke credentials | Keychain | enabled after auth | `approval.action` | single credential mutation; short TTL; bound to auth session + account | Mutation requires backend-issued artifact; invalid token blocks keychain write/delete |
| Local system connector | Read allowlist and command capability manifest | Execute allowlisted command | native process bridge | disabled by default | `approval.action` (high-risk) | single command; bound to command hash + args hash + working dir | Require allowlist hit + approval artifact + audit envelope; any mismatch hard-fails execution |

### Approval-token lifecycle contract

1. Tokens are minted only by canonical backend trust/approval services; the macOS companion cannot self-issue tokens.
2. `consent.preference` enables low-risk channel preferences only and is never sufficient for mutating execution.
3. `approval.session` covers bounded runtime windows for medium-risk capture controls.
4. `approval.action` is single-use and bound to intent-specific hashes (`tool`, `args`, correlation/session IDs).
5. Every token validation result (pass/fail) must emit trust telemetry and preserve evidence links.

Guardrails that are non-negotiable:

1. `approvalInvariant = non_bypassable`.
2. `nativePolicyPrecedence = vc83_runtime_policy`.
3. `readOnlyContext != mutationAuthority`.
4. `directDeviceMutation = fail_closed`.
5. Every high-risk action must emit trust telemetry with correlation IDs.

---

## Lane execution map

| Lane | Rows | Outcome target |
|---|---|---|
| `A` | `MCR-001`, `MCR-002` | Contract baseline and permission/trust matrix frozen |
| `B` | `MCR-003`, `MCR-004` | `apps/macos` scaffold + ingress bridge envelope compatible with canonical runtime |
| `C` | `MCR-005`, `MCR-006` | Secure auth lifecycle + background service controls |
| `D` | `MCR-007`, `MCR-008` | Operator-native quick-chat and alert ergonomics |
| `E` | `MCR-009`, `MCR-010` | Local capability connectors + scoped system connector contract |
| `F` | `MCR-011`, `MCR-012` | Canonical trust/approval/no-bypass enforcement + observability parity |
| `G` | `MCR-013`, `MCR-014` | Release pipeline + update channel contract |
| `H` | `MCR-015`, `MCR-016`, `MCR-017`, `MCR-018`, `MCR-019` | QA evidence, risk register, rollback/handoff closeout, post-closeout monitoring hardening, and production release automation/rehearsal |
| `I` | `MCR-020`, `MCR-021A`, `MCR-021`, `MCR-022`, `MCR-023`, `MCR-024`, `MCR-025` | Desktop deep integration parity across node transport, native chat surface parity, concrete capture/voice surfaces, approvals UX, trust-portal action flows, and rollback-safe observability |

---

## Dependency map

External dependencies enforced by queue tokens:

1. `YAI-021` must remain `DONE` for lane `F` trust bridge rows.
2. `AVR-010@DONE_GATE` must be satisfied before `MCR-009` and `MCR-011` can close.

Internal deterministic gates:

1. No `apps/macos` scaffold rows before lane `A` baseline rows close.
2. No local connector rows before auth lifecycle exists.
3. No release pipeline rows before trust/ingress bridge rows close.
4. No closeout before QA matrix is complete.
5. Credentialed release rehearsal (`MCR-019`) remains deferred until parity foundation row `MCR-025` is `DONE`.

---

## Acceptance criteria policy

1. Acceptance for this stream is defined by the `MCR-001` row-mapping table above.
2. No row may be marked `DONE` unless its mapped verification profiles pass.
3. `MCR-009` and `MCR-011` additionally require `AVR-010@DONE_GATE` before closeout.
4. `MCR-019` cannot be promoted from `PENDING` until lane `I` parity foundation row `MCR-025` is `DONE`.

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| mac app scaffold diverges from backend authority contracts | high | Enforce `MCR-011` as `P0` gate before release lane |
| OS permissions create brittle UX | medium | Lane `H` permission matrix QA with explicit fallback copy |
| AV bridge bypass regression | high | Keep `V-AV-CONTRACT` in `MCR-009` and `MCR-011` verify profiles |
| Local system connector overreaches into unsafe execution | high | Deny-by-default connector contract in `MCR-010`; no broad root semantics |
| Release pipeline fragility | medium | Phase `G` artifacts must include deterministic metadata and rollback policy |

---

## `MCR-015` QA evidence (`DONE` 2026-02-27)

1. Verification bundle published at `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-015-20260227T092913Z/*`.
2. Required profile outcome:
   - `npm run typecheck` -> pass (exit `0`)
   - `npm run lint` -> pass (exit `0`; `0` errors, `3377` warnings baseline)
   - `npm run test:unit` -> pass (`164` files passed, `4` skipped; `863` tests passed, `80` skipped)
   - `npm run test:e2e:desktop` -> pass on unrestricted rerun (`1` passed); sandboxed run blocked by localhost bind permission (`listen EPERM 127.0.0.1:3000`)
   - `npm run docs:guard` -> pass (`Docs guard passed.`)
3. QA matrix evidence summary (go/no-go artifact: `go-no-go-matrix.md`):
   - Permissions + trust/approval UX: covered by unit + desktop E2E profile, pass.
   - Reconnect + degrade/fallback: covered by unit profile contract/fallback suites, pass.
   - Capture fidelity + safe failure modes: covered by unit profile metadata/fail-closed suites, pass.
4. Decision: `GO` for lane `H` kickoff gate with explicit caveat that sandbox-only Playwright web server startup fails due local bind restriction.

---

## `MCR-016` closeout package (`DONE` 2026-02-27)

1. Closeout evidence bundle published at `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-016-20260227T094625Z/*`.
2. Queue-first synchronization completed for:
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/macos-native-companion-runtime/TASK_QUEUE.md`
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/macos-native-companion-runtime/INDEX.md`
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/macos-native-companion-runtime/MASTER_PLAN.md`
   - `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/macos-native-companion-runtime/SESSION_PROMPTS.md`
3. Verification evidence: `npm run docs:guard` passed (`Docs guard passed.`).

### Residual risk register

| Risk | Trigger | Owner role | Mitigation/response |
|---|---|---|---|
| Sandbox-restricted desktop E2E startup can fail on localhost bind (`EPERM`) | CI/local runs under restricted sandbox | QA/Developer Experience oncall | Treat as environment caveat; validate desktop E2E in unrestricted runtime for release gating. |
| macOS permission behavior drift across OS updates | New macOS release alters permission prompts or APIs | Desktop companion oncall | Rerun lane `H` permission matrix and patch fallback copy/flows before broad rollout. |
| Release signing/notarization credential drift | Cert expiration, team ID/profile mismatch | Release engineering oncall | Run lane `G` preflight checks and rotate credentials before publishing artifacts. |
| Trust/approval policy regression on new tool surfaces | New connector/tool bypasses approval artifact checks | AI runtime policy oncall | Re-run authority matrix suites; enforce fail-closed policy and block rollout if invariants fail. |

### Rollback runbook (release-blocking failure path)

1. Trigger rollback when a `P0` invariant fails post-closeout (trust bypass, approval artifact mismatch, capture/session safety regression, or release integrity failure).
2. Freeze forward rollout by holding update-channel promotion and keeping only last known-good stable artifact active.
3. Repoint distribution metadata/appcast to the last known-good build and disable affected high-risk capability flags in runtime policy.
4. Run verification profile (`typecheck`, `lint`, `test:unit`, `test:e2e:desktop`, `docs:guard`) before any re-promotion attempt.
5. Publish incident note with root cause, blast radius, and explicit re-enable criteria.

### Escalation ownership map

| Domain | Primary owner role | Secondary owner role | Initial response target |
|---|---|---|---|
| Trust/approval policy invariants | AI runtime policy oncall | Platform reliability oncall | 15 minutes |
| macOS native app runtime/connectors | Desktop companion oncall | AI runtime policy oncall | 30 minutes |
| Release pipeline/signing/update metadata | Release engineering oncall | Desktop companion oncall | 30 minutes |
| QA matrix/repro environment | QA/developer experience oncall | Platform reliability oncall | 30 minutes |

---

## `MCR-017` follow-on hardening row (`DONE` 2026-02-27)

1. Row intent completed: post-closeout runtime monitoring + automation hardening baseline is now codified to reduce manual drift after closeout.
2. Published outputs:
   - deterministic health-check cadence for trust/approval runtime gates,
   - evidence capture automation contract under `/tmp/reports/macos-companion/*`,
   - escalation-drill ownership cadence tied to the ownership map defined in `MCR-016`.
3. Evidence artifact: `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-017-20260227T095948Z/monitoring-automation-hardening.md`.
4. Verification evidence: `npm run docs:guard` passed (`Docs guard passed.`).

---

## `MCR-018` production release automation row (`DONE` 2026-02-27)

1. Implemented strict notarization/stapling script:
   - `apps/macos/scripts/release-notarize.sh` notarizes DMG (fallback ZIP), validates notary status, and staples both app bundle and DMG with fail-closed strict behavior.
2. Implemented real appcast signature script:
   - `apps/macos/scripts/release-sign-appcast.sh` generates Sparkle Ed25519 signature from `SPARKLE_PRIVATE_KEY_BASE64`, replaces `sparkle:edSignature` in appcast, emits `appcast.signed.xml`, and records signature evidence.
3. Implemented GitHub release publish script:
   - `apps/macos/scripts/release-github.sh` creates/updates release tag and uploads DMG/ZIP/appcast/update-contract artifacts (plus available evidence artifacts) with upload report output.
4. Added release workflow:
   - `.github/workflows/macos-release.yml` supports manual dispatch and `v*` tag push, imports Developer ID + notary credentials securely, then runs build/sign -> notarize -> appcast-sign -> GitHub publish.
5. Pipeline orchestration update:
   - `apps/macos/scripts/release-pipeline.sh` now optionally runs notarization/appcast-sign/GitHub publish stages (`RUN_NOTARIZATION`, `RUN_APPCAST_SIGN`, `PUBLISH_GITHUB_RELEASE` flags).
6. Verification evidence:
   - `bash -n apps/macos/scripts/*.sh` passed.
   - `cd apps/macos && MODE=report APP_NAME=SevenLayers VERSION=0.1.0 RELEASE_CHANNEL=stable scripts/release-pipeline.sh` passed with expected report-mode blockers recorded in generated release reports due missing live credentials.
   - `npm run docs:guard` passed.
7. Follow-on release-readiness hardening (same date):
   - workflow now enforces deterministic `v<version>` tag flow for manual dispatch and validates required secret names + production `https` URL contract values,
   - release scripts now enforce `APP_NAME=SevenLayers`, require valid public URL contract fields before publish, and emit `dist/release/release-pipeline-evidence.json`,
   - operator docs/checklist now include required repo permission settings, public world readiness checks (download/appcast/release-notes URLs), and stage-specific rollback evidence expectations.

---

## `MCR-020` desktop parity kickoff row (`DONE` 2026-02-27)

1. Priority shift activated:
   - `MCR-019` credentialed release rehearsal is intentionally deferred while lane `I` parity foundation (`MCR-020+`) is built.
2. Implementation scope for this kickoff row:
   - add SevenLayers desktop node gateway transport contract,
   - expose deterministic capability discovery + permissions map for local capture surfaces,
   - ship one concrete approval-gated capture vertical slice with ingress envelope + telemetry.
3. Implementation files for this row:
   - `apps/macos/Sources/SevenLayersMac/Runtime/DesktopNodeGateway.swift`
   - `apps/macos/Sources/SevenLayersMac/Capture/CoreGraphicsScreenCaptureProvider.swift`
   - `apps/macos/Sources/SevenLayersMac/App/MenuBarApplicationDelegate.swift`
   - `apps/macos/Tests/SevenLayersMacTests/Runtime/DesktopNodeGatewayTests.swift`
   - `apps/macos/Tests/SevenLayersMacTests/Capture/CoreGraphicsScreenCaptureProviderTests.swift`
4. Completion gate:
   - full required verification profile must pass (`swift build`, `swift test`, `typecheck`, `lint`, `test:unit`, `test:e2e:desktop`, `docs:guard`) with evidence captured under a new `tmp/reports/macos-companion/*` timestamped folder.
5. Verification evidence bundles:
   - initial blocked run: `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-020-20260227T120611Z/*`
   - unblock + closeout rerun: `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-session-20260227T133053Z/*`
6. Verification outcome after unblock rerun:
   - `npm run typecheck` now passes (`exit 0`),
   - `swift build` and `swift test` pass on unrestricted reruns (`swift_build_escalated.log`, `swift_test_escalated.log`),
   - `npm run lint`, `npm run test:unit`, and `npm run docs:guard` pass,
   - `npm run test:e2e:desktop` passes on unrestricted approved runner (`2 passed` recorded in `npm_test_e2e_desktop_escalated_approved.log`).
7. Row status decision:
   - `MCR-020` promoted `BLOCKED` -> `DONE`; dependency gate for `MCR-021` is now open.

---

## `MCR-021A` native chat window parity slice (`DONE` 2026-02-27)

1. Row intent completed:
   - add a native macOS chat window that reuses existing canonical ingress contracts instead of creating a desktop-only chat path.
2. Implementation scope delivered:
   - `NativeChatWindowSessionController` with message/state model and pending-approval mirroring from `QuickChatSessionController`,
   - `NativeChatWindowController` AppKit window surface for transcript + draft submit flow,
   - popover wiring to open the native chat window from the menu bar companion,
   - app delegate wiring to retain native chat session/window lifecycle.
3. Validation coverage added:
   - `NativeChatWindowSessionControllerTests` verifies end-to-end draft submission, blank-draft fail-closed behavior, and pending-approval synchronization.
4. Evidence bundle:
   - `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-021a-20260227T123334Z/*`
5. Verification outcome:
   - `swift build` and `swift test` pass on unrestricted reruns (`swift_build_escalated.log`, `swift_test_escalated.log`),
   - `npm run docs:guard` passes (`npm_docs_guard.log`),
   - sandbox Swift failures retained as environment caveat evidence in the same bundle.

---

## Immediate next action

1. Start `MCR-021` (`READY`) for concrete camera + microphone runtime providers with fail-closed permission preflight and bounded session lifecycle enforcement.
