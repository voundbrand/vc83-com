# Windows Native Companion Runtime Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime`  
**Last updated:** 2026-03-10

---

## Objective

Deliver a native Windows companion app (`apps/windows`) that unlocks deeper local-system capability access while preserving canonical trust boundaries:

1. backend (`vc83`) stays mutation authority,
2. desktop runtime stays ingress/control,
3. mutating operations stay approval-gated and fail-closed by default.

---

## Why this stream exists

Current repository state:

1. A native macOS companion exists under `apps/macos`.
2. No equivalent native Windows runtime is scaffolded in-repo.
3. Existing trust/approval contracts already define the guardrails this Windows runtime must follow.

Strategic gap:

1. Desktop-native system access goals require a Windows-native runtime, not a browser shell.
2. Without a deterministic queue and release contract, Windows work risks authority drift and unsafe capability bypasses.

This stream closes that gap with explicit lane gates, contract parity checkpoints, and release evidence requirements.

---

## Platform decision

Target stack:

1. Windows App SDK + WinUI 3 native desktop application.
2. .NET/C# solution layout under `apps/windows`.
3. PowerShell-based release automation for packaging and evidence capture.

Why this stack:

1. Native integration points for tray, notifications, capture APIs, startup policy, and secure local credential storage.
2. Strong test/build toolchain (`dotnet build/test`) and deterministic packaging path (`MSIX`).
3. Clean separation between native adapters and backend-trust contract enforcement.

---

## Scope

In-scope deliverables:

1. Native shell: tray app, hotkeys, quick chat, notifications, deep-link routing.
2. Secure auth/session lifecycle for desktop callback and token storage.
3. Local adapters: screen capture, camera, microphone, optional scoped system execution.
4. Canonical ingress/trust wiring into existing backend authority paths.
5. Packaging, update feeds, rollback policy, credentialed release rehearsal evidence.

Out-of-scope deliverables:

1. Mobile runtime changes.
2. Replacing backend trust policy architecture.
3. Unscoped root-level local command execution.

---

## Authority invariants

1. `mutationAuthority = vc83_backend` for all mutating intents.
2. Desktop runtime is ingress/control only.
3. Missing or invalid approval artifacts always fail closed.
4. Token classes are explicit and non-interchangeable:
   - `consent.preference`
   - `approval.session`
   - `approval.action`
5. All high-risk local actions emit telemetry with correlation/session context.

---

## Permission and trust matrix (target contract)

| Capability | Read-only path | Mutating path | Runtime surface | Default mode | Required token class | Fail-closed rule |
|---|---|---|---|---|---|---|
| Tray quick chat | local draft + context view | backend tool intent dispatch | WinUI shell | enabled | `approval.action` for mutating tool intents | no token, no mutating dispatch |
| Notifications | informational toast delivery | approval/escalation action handoff | Windows notifications | disabled until consent | `consent.preference` for channel enable, `approval.action` for mutating action | unresolved action opens read-only route |
| Screen capture | source enumeration, readiness metadata | snapshot/record start | `Windows.Graphics.Capture` | off | `approval.session` | capture start denied without valid session token |
| Camera/microphone | device readiness metadata | start/stop media session | `MediaCapture` | off | `approval.session` | duplicate/expired/unauthorized sessions denied |
| Secure credential store | signed-in state read | token write/rotate/revoke | Credential Locker/DPAPI | enabled after auth | `approval.action` for credential mutation flows | mutation blocked without valid artifact context |
| Scoped system exec | allowlist preview | allowlisted command execution | native process bridge | disabled | `approval.action` bound to command/args/scope hash | any mismatch blocks execution |
| Startup lifecycle | startup status view | enable/disable auto-start | Windows startup policy | off until explicit enable | `approval.action` for startup policy mutations | startup policy cannot auto-enable without explicit approval |

---

## Acceptance criteria mapped to queue rows

| Acceptance criterion | Queue rows | Verification profiles |
|---|---|---|
| Contract baseline and trust matrix are frozen | `WCR-001`, `WCR-002` | `V-DOCS` |
| Native Windows solution scaffold is buildable/testable | `WCR-003` | `V-DOTNET-RESTORE`; `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-DOCS` |
| Canonical ingress envelope parity is implemented | `WCR-004` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-DOCS` |
| Desktop auth + secure storage + startup lifecycle are deterministic | `WCR-005`, `WCR-006` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-DOTNET-FMT`; `V-DOCS` |
| Native shell UX parity (tray/hotkey/notifications/deep links) is implemented | `WCR-007`, `WCR-008` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-WIN-SMOKE`; `V-DOCS` |
| Local capability adapters remain approval-gated and fail-closed | `WCR-009`, `WCR-010`, `WCR-011`, `WCR-012` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-AV-CONTRACT`; `V-WIN-SMOKE`; `V-DOCS` |
| Backend ingress/trust and telemetry parity are complete | `WCR-013`, `WCR-014` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-AV-CONTRACT`; `V-DOCS` |
| Packaging/update pipeline is deterministic and rollback-safe | `WCR-015`, `WCR-016` | `V-POWERSHELL-SYNTAX`; `V-MSIX-REPORT`; `V-DOCS` |
| QA and operational closeout evidence are complete | `WCR-017`, `WCR-018` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-WIN-SMOKE`; `V-TYPE`; `V-UNIT`; `V-E2E-DESKTOP`; `V-DOCS` |
| Native parity slices (chat/workflow/voice/approval UX) are complete | `WCR-019`, `WCR-020`, `WCR-021`, `WCR-022` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-WIN-SMOKE`; `V-TYPE`; `V-UNIT`; `V-DOCS` |
| Security and reliability hardening are release-gated | `WCR-023`, `WCR-024` | `V-DOTNET-TEST`; `V-WIN-SMOKE`; `V-MSIX-REPORT`; `V-DOCS` |
| Strict credentialed rehearsal and GA launch gate are complete | `WCR-025`, `WCR-026` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-MSIX-REPORT`; `V-WIN-SMOKE`; `V-DOCS` |

---

## Lane execution map

| Lane | Rows | Outcome |
|---|---|---|
| `A` | `WCR-001`, `WCR-002` | Contract and trust baseline frozen |
| `B` | `WCR-003`, `WCR-004` | Native scaffold + envelope contract parity |
| `C` | `WCR-005`, `WCR-006` | Auth/session and startup lifecycle |
| `D` | `WCR-007`, `WCR-008` | Native shell UX and notification routing |
| `E` | `WCR-009`, `WCR-010`, `WCR-011`, `WCR-012` | Local capability adapters under approval gates |
| `F` | `WCR-013`, `WCR-014` | Ingress/trust and telemetry parity |
| `G` | `WCR-015`, `WCR-016` | Packaging/update/release contract |
| `H` | `WCR-017`, `WCR-018` | QA evidence and closeout docs |
| `I` | `WCR-019`, `WCR-020`, `WCR-021`, `WCR-022` | Native parity slices |
| `J` | `WCR-023`, `WCR-024` | Security + reliability hardening |
| `K` | `WCR-025`, `WCR-026` | Strict rehearsal and GA operations gate |

---

## Dependency map

External dependencies:

1. `YAI-021` must stay `DONE` for canonical trust/ingress closure in lane `F`.
2. `AVR-010@DONE_GATE` must be satisfied before `WCR-009` can move to `DONE`.

Internal lane gates:

1. Lane `B` starts only after lane `A` `P0` rows are `DONE`.
2. Lanes `C` and `D` start only after `WCR-003` is `DONE`.
3. Lane `E` starts only after `WCR-005` is `DONE`.
4. Lane `F` starts only after `WCR-010` and `WCR-011` are `DONE`.
5. Lane `G` starts only after `WCR-007` and `WCR-013` are `DONE`.
6. Lane `H` starts only after `WCR-014` and `WCR-016` are `DONE`.
7. Lane `I` starts only after `WCR-013` is `DONE`.
8. Lane `J` starts only after `WCR-017` and `WCR-022` are `DONE`.
9. Lane `K` starts only after `WCR-018` and `WCR-024` are `DONE`.

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Native adapters bypass approval semantics | high | Keep adapter entry points behind `WCR-009` gate contract + `V-AV-CONTRACT` tests |
| Credential/storage implementation drifts by machine policy | medium | Enforce deterministic auth/session tests and explicit signed-out/expired paths |
| Startup auto-enable surprises users/operators | medium | Require explicit approval for startup policy mutations and reversible disable path |
| Packaging/update drift causes unverified binaries | high | Fail-closed strict release mode; report-mode evidence required for every run |
| Security hardening left late or under-tested | high | Gate `WCR-025` on lane `J` `P0` completion (`WCR-023`) |
| Windows-only CI blind spot from macOS dev host | medium | Require Windows-machine verification profile execution for all `dotnet/pwsh` release rows |

---

## Exit criteria

1. All `P0` rows are `DONE`.
2. `WCR-025` strict credentialed rehearsal is `DONE` with signed artifact evidence.
3. `WCR-026` GA launch gate is `DONE` with published monitoring and rollback operations cadence.
4. `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md` are synchronized and pass docs guard.
