# Windows Native Companion Runtime Task Queue

**Last updated:** 2026-03-10  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime`  
**Source request:** Create a full implementation plan for a native Windows version of `/apps/macos` that keeps backend mutation authority and expands safe local-system access through explicit trust/approval gates.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless lane gating explicitly permits concurrency.
3. Promote `PENDING` to `READY` only when all dependency tokens are satisfied.
4. Deterministic task selection order is `P0` before `P1`, then lowest task ID.
5. Windows-native local capabilities must remain fail-closed unless trust/approval artifacts are valid.
6. Backend (`vc83`) remains mutation authority; desktop runtime remains ingress/control.
7. Sync `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md` after each `DONE` row.
8. Keep each row scoped to a 1-2 hour implementation slice with explicit verification commands.
9. Record blockers in `Notes`, mark row `BLOCKED`, and continue with the next deterministic `READY` row.

---

## Dependency token semantics

1. `ID`: dependency row must be `DONE` before this row can move to `READY`.
2. `ID@READY`: dependency row must be `READY` or `DONE` before this row can move to `READY`.
3. `ID@DONE_GATE`: row can move to `READY`/`IN_PROGRESS`, but cannot move to `DONE` until dependency row is `DONE`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-E2E-DESKTOP` | `npm run test:e2e:desktop` |
| `V-DOTNET-RESTORE` | `dotnet restore apps/windows/SevenLayers.Windows.sln` |
| `V-DOTNET-BUILD` | `dotnet build apps/windows/SevenLayers.Windows.sln -c Release` |
| `V-DOTNET-TEST` | `dotnet test apps/windows/SevenLayers.Windows.sln -c Release` |
| `V-DOTNET-FMT` | `dotnet format apps/windows/SevenLayers.Windows.sln --verify-no-changes` |
| `V-POWERSHELL-SYNTAX` | `pwsh -NoProfile -Command "Get-ChildItem apps/windows/scripts/*.ps1 | ForEach-Object { [System.Management.Automation.Language.Parser]::ParseFile($_.FullName,[ref]$null,[ref]$null) | Out-Null }"` |
| `V-MSIX-REPORT` | `pwsh -NoProfile -File apps/windows/scripts/release-pipeline.ps1 -Mode Report` |
| `V-WIN-SMOKE` | `pwsh -NoProfile -File apps/windows/scripts/smoke/native-shell-smoke.ps1` |
| `V-AV-CONTRACT` | `npx vitest run tests/unit/ai/ingressEnvelopeAuthorityMatrix.test.ts tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Contract freeze + architecture boundaries | Workstream docs + policy map | No Windows runtime code edits before lane `A` `P0` rows are `DONE` |
| `B` | Windows app scaffold + protocol bridge | `apps/windows/*` solution + shared contracts | Keep changes additive; no trust-policy mutation in this lane |
| `C` | Auth/session/startup lifecycle | `apps/windows/*` auth + secure storage + bootstrapping | No capture/system-exec work in lane `C` |
| `D` | Native shell UX | tray UI, hotkey, quick chat, notifications | UX may not bypass trust/approval surfaces |
| `E` | Local capability adapters | screen/camera/mic/system adapters | Fail-closed approval gates required on every adapter |
| `F` | Canonical ingress + trust/telemetry parity | `convex/ai/*` + desktop bridge mapping | Backend mutation authority is non-negotiable |
| `G` | Packaging/signing/update pipeline | MSIX/AppInstaller/winget release scripts | Keep release artifacts deterministic and rollback-capable |
| `H` | QA matrix + operational closeout | tests + runbooks + docs sync | Final closeout only after all `P0` rows pass |
| `I` | Native parity slices | chat window, workflow recommendation, voice runtime | Preserve authority invariants across parity slices |
| `J` | Security + reliability hardening | threat model, policy audits, soak tests | No GA rehearsal until lane `J` `P0` row is `DONE` |
| `K` | Credentialed release rehearsal + GA | release evidence + post-launch operations | Strict fail-closed release gating |

---

## Dependency-based status flow

1. Start lane `A` (`WCR-001`, `WCR-002`).
2. Start lane `B` only after lane `A` `P0` rows are `DONE`.
3. Start lanes `C` and `D` after `WCR-003` is `DONE`.
4. Start lane `E` after `WCR-005` is `DONE`.
5. Start lane `F` after `WCR-010`, `WCR-011`, and `YAI-021` are `DONE`.
6. Start lane `G` after `WCR-007` and `WCR-013` are `DONE`.
7. Start lane `H` after `WCR-014` and `WCR-016` are `DONE`.
8. Start lane `I` after `WCR-013` is `DONE` (and row-level dependencies are satisfied).
9. Start lane `J` after `WCR-017` and `WCR-022` are `DONE`.
10. Start lane `K` after `WCR-018` and `WCR-024` are `DONE`.
11. `WCR-025` strict release rehearsal cannot move to `DONE` without real credentials, real signing, and hosted artifact URLs.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `WCR-001` | `A` | 1 | `P0` | `READY` | - | Publish canonical Windows-native companion baseline: scope, non-goals, authority invariants, and acceptance criteria mapped to deterministic rows | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime/INDEX.md` | `V-DOCS` | Kickoff row. Promote to `IN_PROGRESS` first. |
| `WCR-002` | `A` | 1 | `P0` | `PENDING` | `WCR-001` | Define Windows permission + trust matrix for notifications, screen, mic, camera, secure storage, startup, and system-exec with token semantics | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime/TASK_QUEUE.md` | `V-DOCS` | Must include explicit fail-closed behavior and token classes (`consent.preference`, `approval.session`, `approval.action`). |
| `WCR-003` | `B` | 2 | `P0` | `PENDING` | `WCR-002` | Scaffold `apps/windows` native solution (`WinUI 3`, tray shell bootstrap, test project, scripts folder) | `/Users/foundbrand_001/Development/vc83-com/apps/windows/SevenLayers.Windows.sln`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/tests/*` | `V-DOTNET-RESTORE`; `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-DOCS` | Additive scaffold only; no policy overrides. |
| `WCR-004` | `B` | 2 | `P1` | `PENDING` | `WCR-003` | Implement Windows protocol bridge contracts compatible with `tcg_ingress_envelope_v1` / `tcg_ingress_metadata_v1` | `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows.Protocol/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/tests/SevenLayers.Windows.Protocol.Tests/*` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-DOCS` | Keep metadata parity with macOS/runtime contracts. |
| `WCR-005` | `C` | 3 | `P0` | `PENDING` | `WCR-003` | Implement desktop auth coordinator (`/auth/desktop`), callback parsing, and secure credential storage (Credential Locker/DPAPI) | `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/Auth/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/tests/SevenLayers.Windows.Auth.Tests/*` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-DOTNET-FMT`; `V-DOCS` | Must include explicit signed-out/expired credential states. |
| `WCR-006` | `C` | 3 | `P1` | `PENDING` | `WCR-005` | Add startup lifecycle manager (Run at login), reconnect policy, and deterministic disable path | `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/Startup/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/scripts/startup/*` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-POWERSHELL-SYNTAX`; `V-DOCS` | Startup policy must be reversible and least-privilege. |
| `WCR-007` | `D` | 4 | `P0` | `PENDING` | `WCR-005` | Build tray/quick-chat shell (notification area icon, hotkey, open-dashboard deep link, pending-approval badge) | `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/Shell/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/tests/SevenLayers.Windows.Shell.Tests/*` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-WIN-SMOKE`; `V-DOCS` | Keep ingress-only behavior in shell interactions. |
| `WCR-008` | `D` | 4 | `P1` | `PENDING` | `WCR-007` | Implement Windows notification bridge and deep-link action routing for approvals/escalations | `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/Notifications/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/DeepLinks/*` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-WIN-SMOKE`; `V-DOCS` | Must resolve unsupported/missing approvals to read-only fallback. |
| `WCR-009` | `E` | 5 | `P0` | `PENDING` | `WCR-005`, `AVR-010@DONE_GATE` | Implement capture approval gate and capability catalog for Windows adapters (screen/camera/mic) | `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/Capture/CaptureApprovalGate.cs`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/Capture/CaptureCapabilityCatalog.cs` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-AV-CONTRACT`; `V-DOCS` | Preserve token-class validation and fail-closed defaults. |
| `WCR-010` | `E` | 5 | `P0` | `PENDING` | `WCR-009` | Add screen snapshot/record provider using `Windows.Graphics.Capture` with permission preflight and evidence metadata | `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/Capture/Screen/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/tests/SevenLayers.Windows.Capture.Tests/Screen/*` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-WIN-SMOKE`; `V-DOCS` | No capture start without valid `approval.session`. |
| `WCR-011` | `E` | 5 | `P1` | `PENDING` | `WCR-009` | Add camera/microphone providers using `MediaCapture` with bounded session lifecycle and permission preflight | `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/Capture/Camera/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/Capture/Microphone/*` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-WIN-SMOKE`; `V-DOCS` | Must reject duplicate active sessions and expired sessions. |
| `WCR-012` | `E` | 6 | `P1` | `PENDING` | `WCR-009` | Implement optional scoped system-exec connector with allowlist, hash binding, and deny-by-default policy storage | `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/SystemExec/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/tests/SevenLayers.Windows.SystemExec.Tests/*` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-DOTNET-FMT`; `V-DOCS` | Keep command/args/working-directory scope binding strict. |
| `WCR-013` | `F` | 7 | `P0` | `PENDING` | `WCR-010`, `WCR-011`, `YAI-021` | Wire Windows companion events into canonical backend ingress and enforce trust/approval no-bypass invariants | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentToolOrchestration.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/ingressEnvelopeAuthorityMatrix.test.ts` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-AV-CONTRACT`; `V-DOCS` | Mutating intents remain backend-authoritative only. |
| `WCR-014` | `F` | 7 | `P1` | `PENDING` | `WCR-013` | Extend observability parity for Windows-native transport health, gate outcomes, and approval diagnostics | `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/Telemetry/*`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustTelemetry.ts` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-TYPE`; `V-UNIT`; `V-DOCS` | Maintain shared key naming and contract versioning discipline. |
| `WCR-015` | `G` | 8 | `P0` | `PENDING` | `WCR-007`, `WCR-013` | Build deterministic Windows packaging pipeline (MSIX artifact build/sign metadata + release evidence manifest) | `/Users/foundbrand_001/Development/vc83-com/apps/windows/scripts/release/build-msix.ps1`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/scripts/release/release-metadata.ps1`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/dist/release/*` | `V-POWERSHELL-SYNTAX`; `V-MSIX-REPORT`; `V-DOCS` | Strict mode must fail-closed on missing signing prerequisites. |
| `WCR-016` | `G` | 8 | `P1` | `PENDING` | `WCR-015` | Implement update/distribution contracts (App Installer feed, optional winget manifest generation, rollback policy) | `/Users/foundbrand_001/Development/vc83-com/apps/windows/scripts/release/update-feed.ps1`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/Resources/update/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/README.md` | `V-POWERSHELL-SYNTAX`; `V-MSIX-REPORT`; `V-DOCS` | Publish report-mode evidence even when credentials/host URLs are absent. |
| `WCR-017` | `H` | 9 | `P0` | `PENDING` | `WCR-014`, `WCR-016` | Execute Windows QA matrix (permissions, reconnect/fallback, capture, trust/approval paths) with evidence bundle | `/Users/foundbrand_001/Development/vc83-com/tmp/reports/windows-companion/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/tests/*` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-WIN-SMOKE`; `V-TYPE`; `V-UNIT`; `V-E2E-DESKTOP`; `V-DOCS` | Store pass/fail evidence and explicit caveats. |
| `WCR-018` | `H` | 9 | `P1` | `PENDING` | `WCR-017` | Publish closeout pack: residual risks, rollback runbook, escalation map, and docs sync | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime/*`; `/Users/foundbrand_001/Development/vc83-com/tmp/reports/windows-companion/*` | `V-DOCS` | Queue-first docs must be fully synchronized. |
| `WCR-019` | `I` | 10 | `P0` | `PENDING` | `WCR-007`, `WCR-013` | Implement native chat window parity slice for Windows with canonical draft submission and pending-approval mirroring | `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/UI/NativeChat/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/tests/SevenLayers.Windows.UI.Tests/NativeChat/*` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-WIN-SMOKE`; `V-DOCS` | No desktop-local mutation shortcuts. |
| `WCR-020` | `I` | 10 | `P1` | `PENDING` | `WCR-019` | Add proactive workflow recommendation slice based on foreground-app observation and draft insertion | `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/WorkObservation/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/tests/SevenLayers.Windows.WorkObservation.Tests/*` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-WIN-SMOKE`; `V-DOCS` | Must stay advisory; backend remains mutation authority. |
| `WCR-021` | `I` | 11 | `P1` | `PENDING` | `WCR-011`, `WCR-013` | Implement voice runtime loop (push-to-talk + transcript forwarding envelopes + degraded fallback behavior) | `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/Voice/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/tests/SevenLayers.Windows.Voice.Tests/*`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/voiceRuntime.ts` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-TYPE`; `V-UNIT`; `V-DOCS` | Fail-closed on missing approval artifact or malformed transcript envelope. |
| `WCR-022` | `I` | 11 | `P1` | `PENDING` | `WCR-012`, `WCR-019` | Implement system-exec approval UX: prompt contract, deny-policy persistence, and binding visibility | `/Users/foundbrand_001/Development/vc83-com/apps/windows/src/SevenLayers.Windows/UI/SystemExec/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/tests/SevenLayers.Windows.UI.Tests/SystemExec/*` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-DOTNET-FMT`; `V-DOCS` | Keep deny-by-default behavior explicit in UX copy and state transitions. |
| `WCR-023` | `J` | 12 | `P0` | `PENDING` | `WCR-017`, `WCR-022` | Produce Windows-native threat model + permission abuse matrix + policy hardening tests | `/Users/foundbrand_001/Development/vc83-com/apps/windows/docs/security/threat-model.md`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/tests/SevenLayers.Windows.Security.Tests/*`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime/MASTER_PLAN.md` | `V-DOTNET-TEST`; `V-TYPE`; `V-UNIT`; `V-DOCS` | Blocks credentialed release rehearsal until complete. |
| `WCR-024` | `J` | 12 | `P1` | `PENDING` | `WCR-023` | Run reliability/performance soak tests on clean Windows VM snapshots (install, update, reconnect, idle stability) | `/Users/foundbrand_001/Development/vc83-com/apps/windows/scripts/smoke/*`; `/Users/foundbrand_001/Development/vc83-com/tmp/reports/windows-companion/soak/*` | `V-WIN-SMOKE`; `V-MSIX-REPORT`; `V-DOCS` | Attach deterministic test matrix and failure triage notes. |
| `WCR-025` | `K` | 13 | `P0` | `PENDING` | `WCR-018`, `WCR-024` | Execute strict credentialed release rehearsal (real signing cert, hosted update feed, signed install artifact, release evidence) | `/Users/foundbrand_001/Development/vc83-com/apps/windows/dist/release/*`; `/Users/foundbrand_001/Development/vc83-com/apps/windows/scripts/release/*`; `/Users/foundbrand_001/Development/vc83-com/tmp/reports/windows-companion/wcr-025-*` | `V-DOTNET-BUILD`; `V-DOTNET-TEST`; `V-MSIX-REPORT`; `V-WIN-SMOKE`; `V-DOCS` | Must fail closed if any credential, signature, or URL contract value is missing. |
| `WCR-026` | `K` | 13 | `P1` | `PENDING` | `WCR-025` | Final GA launch gate: publish operator run cadence, incident triggers, rollback drills, and post-launch monitoring automation | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime/*`; `/Users/foundbrand_001/Development/vc83-com/tmp/reports/windows-companion/wcr-026-*` | `V-DOCS` | GA row closes only when monitoring + rollback drills are documented and rehearsed. |

---

## Current kickoff

1. Active task count: `0` rows in `IN_PROGRESS`.
2. Next deterministic promotable row: `WCR-001`.
3. Immediate objective: close lane `A` contract rows, then unlock scaffold execution in lane `B`.
