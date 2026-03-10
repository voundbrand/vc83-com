# Windows Native Companion Runtime Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/windows-native-companion-runtime`

---

## Lane gating and concurrency

1. Run at most one `IN_PROGRESS` task globally unless explicit temporary parallelism is approved.
2. Do not start lane `B` before lane `A` `P0` rows (`WCR-001`, `WCR-002`) are `DONE`.
3. Do not start lanes `C` or `D` before `WCR-003` is `DONE`.
4. Do not start lane `E` before `WCR-005` is `DONE`; `WCR-009` cannot move to `DONE` until `AVR-010` is `DONE`.
5. Do not start lane `F` before `WCR-010`, `WCR-011`, and `YAI-021` are `DONE`.
6. Do not start lane `G` before `WCR-007` and `WCR-013` are `DONE`.
7. Do not start lane `H` before `WCR-014` and `WCR-016` are `DONE`.
8. Do not start lane `I` before `WCR-013` is `DONE`; row-level dependencies still apply.
9. Do not start lane `J` before `WCR-017` and `WCR-022` are `DONE`.
10. Do not start lane `K` before `WCR-018` and `WCR-024` are `DONE`.
11. `WCR-025` must fail closed if any release credential/signing/hosted URL prerequisite is missing.
12. After each `DONE` row, sync `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md`.

Status snapshot (2026-03-10):

1. `WCR-001` is `READY`.
2. All other rows (`WCR-002`..`WCR-026`) are `PENDING`.
3. Active row count is `0` (`IN_PROGRESS` rows: none).
4. Deterministic next row is `WCR-001`.

---

## Prompt A (Lane A: contract freeze)

You are executing lane `A` for Windows-native companion contract definition.
Tasks:

1. Complete `WCR-001`: publish scope, non-goals, authority invariants, and acceptance mapping.
2. Complete `WCR-002`: publish capability permission/trust matrix with explicit token semantics.

Requirements:

1. Backend remains mutation authority.
2. Desktop runtime remains ingress/control only.
3. Every mutating action path must require explicit approval artifacts.
4. Run row `Verify` commands exactly.

---

## Prompt B (Lane B: scaffold + protocol bridge)

You are executing lane `B` for native Windows solution bootstrap.
Tasks:

1. Complete `WCR-003`: scaffold `apps/windows` WinUI solution + test harness.
2. Complete `WCR-004`: add ingress-envelope contract compatibility layer.

Requirements:

1. Keep scaffold additive.
2. Maintain compatibility with `tcg_ingress_envelope_v1`.
3. No trust-policy mutation in this lane.
4. Run row `Verify` commands exactly.

---

## Prompt C (Lane C: auth + startup lifecycle)

You are executing lane `C` for auth/session lifecycle.
Tasks:

1. Complete `WCR-005`: desktop auth callback + secure credential store.
2. Complete `WCR-006`: startup/reconnect lifecycle with deterministic disable path.

Requirements:

1. Keep credential handling least-privilege and auditable.
2. Keep startup policy reversible.
3. No capture/system-exec implementation in this lane.
4. Run row `Verify` commands exactly.

---

## Prompt D (Lane D: shell UX)

You are executing lane `D` for operator shell UX.
Tasks:

1. Complete `WCR-007`: tray quick-chat, hotkey, badge, dashboard deep link.
2. Complete `WCR-008`: notification action routing with trust-aware deep links.

Requirements:

1. UX actions must route through backend trust gates.
2. Unsupported/missing approvals resolve to read-only fallback.
3. Correlation IDs and approval context remain visible in diagnostics.
4. Run row `Verify` commands exactly.

---

## Prompt E (Lane E: local capabilities)

You are executing lane `E` for local adapter implementation.
Tasks:

1. Complete `WCR-009`: capability/approval gate contracts.
2. Complete `WCR-010`: screen capture provider.
3. Complete `WCR-011`: camera/microphone providers.
4. Complete `WCR-012`: optional system-exec connector.

Requirements:

1. `WCR-009` cannot close before `AVR-010` is `DONE`.
2. All capability adapters remain fail-closed by default.
3. No broad/root-level command execution semantics.
4. Run row `Verify` commands exactly.

---

## Prompt F (Lane F: ingress + trust parity)

You are executing lane `F` for backend authority and telemetry parity.
Tasks:

1. Complete `WCR-013`: canonical ingress wiring and no-bypass approval enforcement.
2. Complete `WCR-014`: telemetry parity for transport/gate/approval outcomes.

Requirements:

1. Backend mutation authority is non-negotiable.
2. Missing/invalid approval artifacts must hard-fail mutating paths.
3. Contract tests remain release-blocking.
4. Run row `Verify` commands exactly.

---

## Prompt G (Lane G: packaging + updates)

You are executing lane `G` for Windows distribution pipeline.
Tasks:

1. Complete `WCR-015`: deterministic MSIX build/sign/report pipeline.
2. Complete `WCR-016`: update-feed and rollback policy contracts.

Requirements:

1. Strict mode fails closed on missing signing/release prerequisites.
2. Report mode always emits blocker evidence artifacts.
3. Distribution channels remain deterministic and reversible.
4. Run row `Verify` commands exactly.

---

## Prompt H (Lane H: QA + closeout)

You are executing lane `H` for release readiness and operational closeout.
Tasks:

1. Complete `WCR-017`: QA matrix + evidence bundle.
2. Complete `WCR-018`: residual-risk + rollback + escalation closeout docs.

Requirements:

1. No open `P0` defects in trust/approval/capture paths.
2. Evidence bundle must include exact command logs.
3. Queue-first docs must remain synchronized.
4. Run row `Verify` commands exactly.

---

## Prompt I (Lane I: parity slices)

You are executing lane `I` for Windows-native parity slices.
Tasks:

1. Complete `WCR-019`: native chat window parity.
2. Complete `WCR-020`: workflow recommendation session controls.
3. Complete `WCR-021`: voice runtime push-to-talk transcript forwarding.
4. Complete `WCR-022`: system-exec approval UX/persistence parity.

Requirements:

1. Keep all slices backend-authoritative.
2. Preserve fail-closed behavior on trust/approval failures.
3. Keep parity slices additive and testable.
4. Run row `Verify` commands exactly.

---

## Prompt J (Lane J: security + reliability hardening)

You are executing lane `J` for final hardening.
Tasks:

1. Complete `WCR-023`: threat model and abuse-path contract tests.
2. Complete `WCR-024`: reliability/performance soak runs on clean Windows VMs.

Requirements:

1. Capture explicit abuse scenarios and mitigations.
2. Treat unresolved high-severity findings as release blockers.
3. Publish deterministic evidence and triage notes.
4. Run row `Verify` commands exactly.

---

## Prompt K (Lane K: credentialed rehearsal + GA)

You are executing lane `K` for credentialed release and launch gate.
Tasks:

1. Complete `WCR-025`: strict credentialed release rehearsal with signed artifacts.
2. Complete `WCR-026`: GA launch gate and monitoring automation cadence.

Requirements:

1. Do not publish with placeholder credentials/URLs.
2. Keep rollback paths validated before GA.
3. Document incident triggers and escalation ownership.
4. Run row `Verify` commands exactly.
