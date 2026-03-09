# macOS Native Companion Runtime Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/macos-native-companion-runtime`  
**Last updated:** 2026-03-09  
**Source request:** Start a new implementation workstream for a native macOS companion/menu-bar utility that makes the local computer an agent-capability surface under one-agent trust/approval contracts.

---

## Purpose

This workstream defines and executes a production path for a native macOS companion that:

1. adds a menu bar entrypoint + hotkey quick-chat operator surface,
2. integrates local capture/context connectors (screen, camera, mic),
3. optionally supports tightly scoped local system actions,
4. routes all actionable intents through canonical backend authority/trust/approval gates.

---

## Core files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/macos-native-companion-runtime/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/macos-native-companion-runtime/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/macos-native-companion-runtime/MASTER_PLAN.md`
- Index (this file):
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/macos-native-companion-runtime/INDEX.md`

---

## Status snapshot

1. Workstream has deterministic execution rows `MCR-001`..`MCR-025`.
2. Lane `A` `P0` rows are now complete:
   - `MCR-001` is `DONE` (2026-02-26): baseline contract publication.
   - `MCR-002` is `DONE` (2026-02-26): permission/trust matrix with explicit approval-token semantics and read-only vs mutating path rules.
3. Lane `B` scaffold + bridge rows are complete:
   - `MCR-003` is `DONE` (2026-02-26): `apps/macos` Swift package scaffold is buildable/testable with menu bar shell, popover host skeleton, shared protocol boundary, and baseline tests.
   - `MCR-004` is `DONE` (2026-02-26): bridge envelope mapping now emits canonical `tcg_ingress_envelope_v1`-compatible metadata for chat/session ingress via `tcg_ingress_metadata_v1` while preserving backend-only mutation authority.
4. Lane `C` auth + LaunchAgent lifecycle rows are complete:
   - `MCR-005` is `DONE` (2026-02-26): `/auth/desktop` URL builder + custom callback parser + keychain-backed credential lifecycle are scaffolded and verified.
   - `MCR-006` is `DONE` (2026-02-26): LaunchAgent lifecycle scaffolding now covers deterministic `install`/`enable`/`disable`/`reconcile` flows with fail-closed ownership checks, login-start policy (`RunAtLoad`), reconnect policy (`KeepAlive` + `ThrottleInterval`), and safe cleanup tests.
5. Lane `D` quick-chat + notification/deep-link rows are complete:
   - `MCR-007` is `DONE` (2026-02-26): menu-bar quick-chat popover, global hotkey monitor, pending-approval badge wiring, and open-dashboard deep link are scaffolded and verified.
   - `MCR-008` is `DONE` (2026-02-27): notification bridge and approval/escalation deep-link handlers now enforce correlation ID + evidence-link propagation and no-bypass trust gate fallback (`approval_action` vs `read_only`) before desktop routing.
6. Lane `E` local connector rows are complete:
   - `MCR-009` is `DONE` (2026-02-26): additive capture connector scaffolding for screen snapshot/record, camera, and microphone is implemented under `apps/macos/Sources/OpenOperatorMac/Capture/*` with fail-closed `approval.session` gating and canonical AV ingress metadata mapping (`liveSessionId`, `cameraRuntime`, `voiceRuntime`).
   - `MCR-010` is `DONE` (2026-02-27): optional local system-exec scaffolding is now implemented under `apps/macos/Sources/OpenOperatorMac/SystemExec/*` with explicit deny-by-default policy defaults, scoped allowlist rules (command + args + working-directory scope), `approval.action` artifact binding checks (`commandSHA256`, `argumentsSHA256`, correlation/scope), deterministic audit report/cleanup descriptors, and fail-closed test coverage in `apps/macos/Tests/OpenOperatorMacTests/SystemExec/SystemExecConnectorTests.swift`.
7. Lane `F` canonical trust/ingress + observability rows are complete:
   - `MCR-011` is `DONE` (2026-02-26): row-external typecheck baseline recovery was validated and the full row profile reran clean (`V-TYPE`, `V-LINT`, `V-UNIT`, `V-AV-CONTRACT`).
   - `MCR-012` is `DONE` (2026-02-27): mac companion observability contract is now verified across backend trust payloads + desktop telemetry bridge for session IDs (`sessionId`, `liveSessionId`, `voiceSessionId`), gate outcomes, approval status/artifact IDs, fallback reasons, and delivery failure reasons (`V-TYPE`, `V-UNIT`, `V-DOCS`).
8. Lane `G` release pipeline rows are complete:
   - `MCR-013` is `DONE` (2026-02-26): deterministic release scaffolding is now in place under `apps/macos/scripts/*` (codesign/notarization preflight, metadata contract emission, packaging orchestrator stubs) with lane usage documented in `apps/macos/README.md`.
   - `MCR-014` is `DONE` (2026-02-27): deterministic DMG + auto-update contract scaffolding is now in place with channel-scoped appcast emission (`release-appcast-stub.sh`), DMG contract planning (`release-dmg-stub.sh`), staged channel policy resources (`Resources/update/channel-strategy.json`), and rollback-safe update policy resources (`Resources/update/rollback-policy.json`) wired into the lane `G` pipeline entrypoint.
9. Lane `H` kickoff QA row is now complete:
   - `MCR-015` is `DONE` (2026-02-27): required verification profile passed and go/no-go evidence is published under `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-015-20260227T092913Z/*` (including `go-no-go-matrix.md` and per-command logs). Initial sandbox-only desktop E2E bind failure (`listen EPERM 127.0.0.1:3000`) was rerun outside sandbox restrictions and passed.
10. Lane `H` closeout row is now complete:
   - `MCR-016` is `DONE` (2026-02-27): residual-risk register, rollback runbook, and escalation ownership map were published in `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-016-20260227T094625Z/closeout-summary.md` and all queue-first docs were synchronized.
11. Follow-on hardening row is now complete:
   - `MCR-017` is `DONE` (2026-02-27): post-closeout monitoring + automation hardening baseline is published in `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-017-20260227T095948Z/monitoring-automation-hardening.md` with deterministic cadence for health checks, evidence automation contract, and escalation drill ownership targets.
12. Production release automation rows are complete and hardened:
   - `MCR-018` is `DONE` (2026-02-27): strict notarization/stapling (`release-notarize.sh`), Sparkle Ed25519 appcast signing (`release-sign-appcast.sh`), GitHub release publishing (`release-github.sh`), and manual/tagged `macos-release` workflow (`.github/workflows/macos-release.yml`) are implemented with fail-closed strict mode and report-mode blocker evidence.
   - Follow-on hardening pass (same date) added deterministic `v<version>` tag enforcement, required secret/url validation, `APP_NAME=SevenLayers` guardrails in release scripts, pipeline evidence manifest emission, and explicit operator guidance for repo permissions + rollback evidence paths.
13. Priority shift execution is complete:
   - Lane `I` (`MCR-020+`) is now complete through parity foundation closeout (`MCR-025` `DONE`).
   - `MCR-019` is no longer dependency-deferred and has been executed in strict rehearsal mode.
14. Lane `I` kickoff row is now complete after unblock verification:
   - `MCR-020` is `DONE` (2026-02-27). The earlier row-external `npm run typecheck` blocker was cleared, then the full profile reran clean.
   - Verification evidence bundle: `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-session-20260227T133053Z/*` (includes sandbox caveat logs and unrestricted reruns for Swift + desktop E2E).
15. Native chat-window parity slice is now complete:
   - `MCR-021A` is `DONE` (2026-02-27): native chat window surface is now wired for end-to-end draft submission through canonical ingress (`QuickChatSessionController` -> bridge envelope), mirrors pending approvals, and opens from popover/menu-bar flow.
   - Verification evidence bundle: `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-021a-20260227T123334Z/*`.
16. Work-observation workflow recommendation slice is now complete:
   - `MCR-021B` is `DONE` (2026-03-09): native popover now supports foreground-app watch, local heuristic recommendation generation, and one-click recommendation-to-draft insertion via a bounded session controller.
   - Implementation paths: `/Users/foundbrand_001/Development/vc83-com/apps/macos/Sources/SevenLayersMac/WorkObservation/*`, `/Users/foundbrand_001/Development/vc83-com/apps/macos/Sources/SevenLayersMac/UI/PopoverHostController.swift`, `/Users/foundbrand_001/Development/vc83-com/apps/macos/Sources/SevenLayersMac/App/MenuBarApplicationDelegate.swift`.
   - Validation coverage: `/Users/foundbrand_001/Development/vc83-com/apps/macos/Tests/SevenLayersMacTests/Runtime/AgenticWorkflowRecommendationEngineTests.swift` and `/Users/foundbrand_001/Development/vc83-com/apps/macos/Tests/SevenLayersMacTests/UI/WorkflowRecommendationSessionControllerTests.swift`.
17. Concrete camera + microphone provider slice is now complete:
   - `MCR-021` is `DONE` (2026-03-09): lane `I` now includes concrete `AVFoundationCameraCaptureProvider` and `AVFoundationMicrophoneCaptureProvider` with permission preflight and bounded active-session lifecycle fail-closed behavior.
   - Validation profile passed: `cd apps/macos && swift test`, `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`.
18. Voice wake + push-to-talk parity slice is now complete:
   - `MCR-022` is `DONE` (2026-03-09): lane `I` now includes `DesktopVoiceRuntimeLoop` with wake-monitor + push-to-talk activation, transcript forwarding envelopes through canonical ingress contract (`tcg_ingress_envelope_v1`), and explicit degraded fallback behavior for approval/permission/runtime stream failures.
   - Implementation paths: `/Users/foundbrand_001/Development/vc83-com/apps/macos/Sources/SevenLayersMac/Voice/DesktopVoiceRuntimeLoop.swift`, `/Users/foundbrand_001/Development/vc83-com/apps/macos/Tests/SevenLayersMacTests/Voice/DesktopVoiceRuntimeLoopTests.swift`, `/Users/foundbrand_001/Development/vc83-com/convex/ai/voiceRuntime.ts`.
   - Validation profile passed: `cd apps/macos && swift build`, `cd apps/macos && swift test`, `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`.
19. Exec approvals UX/policy hardening slice is now complete:
   - `MCR-023` is `DONE` (2026-03-09): `SystemExecConnector` now exposes `system_exec_approval_prompt_v1` contract prompts, enforces persisted deny-by-default policy prechecks, and preserves non-bypass `approval.action` artifact binding validation.
   - Implementation paths: `/Users/foundbrand_001/Development/vc83-com/apps/macos/Sources/SevenLayersMac/SystemExec/SystemExecApprovalPolicyBindings.swift`, `/Users/foundbrand_001/Development/vc83-com/apps/macos/Sources/SevenLayersMac/SystemExec/SystemExecConnector.swift`, `/Users/foundbrand_001/Development/vc83-com/apps/macos/Sources/SevenLayersMac/UI/SystemExecApprovalPromptFormatter.swift`.
   - Validation profile passed: `cd apps/macos && swift build`, `cd apps/macos && swift test`, `npm run lint`, `npm run test:unit`, `npm run docs:guard`.
20. Deep-link/trust-portal + notification action parity slice is now complete:
   - `MCR-024` is `DONE` (2026-03-09): desktop node event follow-through now supports approval/escalation/capture deep links with explicit requested-vs-effective gate semantics and fail-closed approval evidence handling.
   - Implementation paths: `/Users/foundbrand_001/Development/vc83-com/apps/macos/Sources/SevenLayersMac/DeepLinks/NotificationDeepLinkHandler.swift`, `/Users/foundbrand_001/Development/vc83-com/apps/macos/Sources/SevenLayersMac/Notifications/CompanionNotificationBridge.swift`, `/Users/foundbrand_001/Development/vc83-com/apps/macos/Sources/SevenLayersMac/Notifications/CompanionNotificationActionHandler.swift`.
   - Validation profile passed: `cd apps/macos && swift build`, `cd apps/macos && swift test`, `npm run typecheck`, `npm run test:e2e:desktop`, `npm run docs:guard`.
21. External dependencies remain aligned for downstream phases:
   - `YAI-021` is already `DONE` (ingress/parity closeout satisfied).
   - `AVR-010` is `DONE`; `AVR-010@DONE_GATE` is satisfied for downstream closeout rows.
22. Desktop parity foundation closeout is now complete:
   - `MCR-025` is `DONE` (2026-03-09): lane `I` now includes deterministic transport-health + retry/disable/rollback observability, fail-closed transport-disable runtime behavior, and operator-visible diagnostics in the native popover while preserving backend mutation authority and non-bypass approval gates.
   - Validation profile passed: `cd apps/macos && swift build`; `cd apps/macos && swift test`; `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:e2e:desktop`; `npm run docs:guard`.
23. First strict credentialed release rehearsal row has now run and is fail-closed blocked:
   - `MCR-019` moved `PENDING -> READY -> IN_PROGRESS -> BLOCKED` (2026-03-09) with evidence at `/Users/foundbrand_001/Development/vc83-com/tmp/reports/macos-companion/mcr-019-20260309T124642Z/*`.
   - Explicit prerequisite validation failed (`10/10` required live values missing), and strict release attempt (`MODE=strict ... scripts/release-pipeline.sh`) failed at preflight with `codesign_identity:missing` and `notary_credentials:missing` (`release-dist/preflight-report.json`, `release-dist/release-pipeline-evidence.json`).
   - Required verification profile was still completed and captured (including unrestricted reruns for sandbox-restricted Swift module-cache and desktop E2E localhost bind).
24. `apps/macos` implementation now includes lane `B` bridge-envelope contract mapping, lane `C` LaunchAgent lifecycle scaffolding, lane `D` notification/deep-link bridge handlers, lane `E` capture connectors, lane `G/H` production release automation foundations with hardened public-release guardrails, and lane `I` parity rows `MCR-020`..`MCR-025` all `DONE`; `MCR-019` remains blocked strictly on missing live credentials/host URLs.

---

## Scope boundary

Owned in this workstream:

1. native macOS app scaffold and lifecycle,
2. mac menu bar UX contracts for one-agent operator flow,
3. local capability connectors mapped to existing AV/runtime contracts,
4. trust/approval/no-bypass integration and release readiness.

Not owned in this workstream:

1. productization/catalog marketplace lanes (AGP frozen lanes),
2. mobile app implementation (EXPO lanes),
3. OpenClaw reference project code as product source-of-truth.

---

## Lane board

- [x] Lane A: contract freeze + permission/trust matrix (`MCR-001` `DONE`, `MCR-002` `DONE`)
- [x] Lane B: `apps/macos` scaffold + bridge envelope (`MCR-003` `DONE`, `MCR-004` `DONE`)
- [x] Lane C: auth/keychain/LaunchAgent lifecycle (`MCR-005` `DONE`, `MCR-006` `DONE`)
- [x] Lane D: menu bar UX + notification/deep-link (`MCR-007` `DONE`, `MCR-008` `DONE`)
- [x] Lane E: local capture + scoped system connector (`MCR-009` `DONE`, `MCR-010` `DONE`)
- [x] Lane F: canonical ingress/trust + observability (`MCR-011` `DONE`, `MCR-012` `DONE`)
- [x] Lane G: packaging/signing/notarization/update (`MCR-013` `DONE`, `MCR-014` `DONE`)
- [ ] Lane H: QA matrix + closeout + release hardening (`MCR-015` `DONE`, `MCR-016` `DONE`, `MCR-017` `DONE`, `MCR-018` `DONE`, `MCR-019` `BLOCKED`)
- [x] Lane I: desktop deep integration parity (`MCR-020` `DONE`, `MCR-021A` `DONE`, `MCR-021B` `DONE`, `MCR-021` `DONE`, `MCR-022` `DONE`, `MCR-023` `DONE`, `MCR-024` `DONE`, `MCR-025` `DONE`)

---

## Operating commands

- Docs guard: `npm run docs:guard`
- Release report pipeline check: `cd apps/macos && MODE=report APP_NAME=SevenLayers VERSION=0.1.0 RELEASE_CHANNEL=stable scripts/release-pipeline.sh`
- Existing runtime baseline:
  `npm run typecheck && npm run lint && npm run test:unit`
- Current desktop e2e baseline:
  `npm run test:e2e:desktop`
