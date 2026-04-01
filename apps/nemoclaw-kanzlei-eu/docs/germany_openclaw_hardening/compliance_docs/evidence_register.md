# Evidence Register

Snapshot date: 2026-04-01

## Hetzner

Detected local artifacts in `compliance_docs/hetzner`:
1. `DPA_de.pdf`
2. `TOM.pdf`
3. `dpa-2026-03-27.pdf`
4. `dpa-tuev-audit-de.pdf`
5. `Screenshot 2026-03-27 at 08.51.21.png`
6. `subunternehmer.pdf`

Mapped evidence IDs:
- `E-LGL-001` (AVV/DPA): complete. Final executed artifact confirmed as `dpa-2026-03-27.pdf` with portal proof screenshot (`AV-Vertrag vom 27.03.2026`).
- `E-LGL-002` (Subprocessors): complete. Local artifact `subunternehmer.pdf` added on 2026-03-27 as reference proof.
- `E-LGL-003` (TOM + audit): provisional complete. `TOM.pdf` and `dpa-tuev-audit-de.pdf` present; portal screenshot shows `Pruefbericht vom 19.02.2026`.

Acceptance checklist:
1. Done: final executed DPA file confirmed.
2. Done: portal screenshot stored locally as completion proof.
3. Done: subcontractor list evidence added (`subunternehmer.pdf`).
4. Done: review owner set to `Remington Splettstoesser`; next review date `2026-06-30` (see `company_profile.md` and `incident_contact_matrix.md`).

## Runtime deployment evidence (private live mode)

Detected local artifacts:
1. `runtime_evidence_2026-03-27_private_live.md`
2. `../MVP_GO_LIVE_CHECKLIST.md`

Mapped evidence IDs:
- `E-LGL-012` (accountability bundle): in progress. Private technical live mode is documented; external client-data release remains blocked pending legal evidence closure.
- `E-LGL-007` (incident readiness): complete for technical drill evidence via `NCLAW-010` live staging incident + restore execution log.
- `E-LGL-008` (retention/deletion and runtime boundary): provisional complete for runtime boundary validation via `NCLAW-010` port/firewall/policy-deny evidence.

Acceptance checklist:
1. Done: private live deployment snapshot recorded.
2. Done: incident drill and restore drill artifacts recorded in `runtime_evidence_2026-03-27_private_live.md`.
3. Done: permission-boundary evidence recorded (127.0.0.1-only UI binding + policy deny log + firewall snapshot).
4. Done: final release signoff package published in `../INDEX.md` via `NCLAW-011` (internal technical pilot `GO`, external launch `NO_GO`).

## Baseline throughput/latency evidence (`NCLAW-012`)

Detected local artifacts:
1. `baseline_metrics/STAGING_CAPTURE_PROBE_2026-03-27.md`
2. `baseline_metrics/20260327T202716Z_pilot-staging-real-no-traffic/metrics.json`
3. `baseline_metrics/20260327T202721Z_current-path-real-no-traffic/metrics.json`
4. `baseline_metrics/comparisons/20260327T202726Z/COMPARISON.md`
5. `baseline_metrics/STAGING_BASELINE_CYCLE_ATTEMPT_2026-03-28.md`
6. `baseline_metrics/STAGING_VOICECALL_ENABLEMENT_ATTEMPT_2026-03-28.md`

Mapped evidence IDs:
- `E-LGL-013` (performance baseline comparability): blocked. First real staging/current capture attempt completed with zero call records; second live retry on 2026-03-28 stopped at preflight because staging sandbox did not expose `openclaw voicecall`; subsequent immutable enablement/recreate attempts on 2026-03-28 failed with OpenShell transport errors (`tls handshake eof`, `Connection reset by peer`) before stable sandbox verification.

Acceptance checklist:
1. Done: staging probe captured (no `calls.jsonl` found; sandbox `Ready`).
2. Done: first pilot/current metrics artifacts generated with deterministic tooling.
3. Done: comparator report generated with explicit `insufficient metrics` outcome.
4. Done: 2026-03-28 live-cycle retry evidence captured with command + failure reason (`voicecall` command absent in sandbox).
5. Done: immutable voicecall enablement/recreate attempt log captured with commit/deploy/onboard command history and failure details (`STAGING_VOICECALL_ENABLEMENT_ATTEMPT_2026-03-28.md`).
6. Pending: stabilize staging OpenShell gateway/sandbox create path, complete immutable `@openclaw/voice-call` verification (`openclaw --help` includes `voicecall`), collect matched non-zero pilot/current datasets, and rerun comparator for final migration recommendation closure.

## OpenRouter (EU MVP path)

Expected artifacts (pending):
1. Executed DPA/AVV (enterprise contract pack).
2. EU routing confirmation artifact (account-level configuration proof for EU endpoint/routing mode).
3. Current subprocessor list and notification policy.
4. Privacy and routing configuration evidence (`allow_fallbacks=false`, `data_collection=deny`, `zdr=true`).

Mapped evidence IDs:
- `E-LGL-001`: pending (processor contract).
- `E-LGL-002`: pending (subprocessor list).
- `E-LGL-004`/`E-LGL-005`: pending (transfer-basis map for full chain).

## ElevenLabs (EU MVP voice path, `NCLAW-018` overlay)

Control mapping baseline (`2026-04-01`):

| Enterprise control | Evidence field | Required artifact | Status | Release-gate effect |
|---|---|---|---|---|
| EU-isolated endpoint and residency mode | `EL-EU-ENDPOINT` | Provisioning confirmation + endpoint list for production workspace (`eu.residency.elevenlabs.io` or equivalent) | Pending | External release remains `NO_GO` until complete |
| Zero Retention Mode policy state | `EL-ZERO-RETENTION` | Workspace policy screenshot/export showing mode state for production workspace | Pending | External release remains `NO_GO` until complete |
| No-training clause for enterprise customer content | `EL-NO-TRAINING-CLAUSE` | Signed MSA/order-form rider or DPA clause | Pending | External release remains `NO_GO` until complete |
| Webhook authenticity controls | `EL-WEBHOOK-AUTH` | Signature verification docs + region IP allowlist evidence | Pending | External release remains `NO_GO` until complete |
| Subprocessor notice and objection path | `EL-SUBPROCESSOR-NOTICE` | Current subprocessor list + DPA section/process URL showing notice/objection rights | Pending | External release remains `NO_GO` until complete |

Mapped evidence IDs:
- `E-LGL-001`: pending (processor contract + no-training contractual language coverage).
- `E-LGL-002`: pending (subprocessor inventory + notice/objection path).
- `E-LGL-004`/`E-LGL-005`: pending (transfer-basis map and residency exception handling).
- `E-LGL-014`: pending (`EL-EU-ENDPOINT` artifact bundle).
- `E-LGL-015`: pending (`EL-ZERO-RETENTION` + retention-mode artifact bundle).
- `E-LGL-016`: pending (`EL-WEBHOOK-AUTH` artifact bundle).

Acceptance checklist:
1. Done: enterprise control fields overlaid into evidence artifacts for deterministic review (`NCLAW-018`).
2. Done: control mapping aligned with negotiation source doc `../../../../docs/strategy/one-of-one-v4/phase-0-kanzlei/06_PHASE_0_ELEVENLABS_ENTERPRISE_REDLINE.md`.
3. Pending: collect and archive artifacts for all five control fields, then update status per evidence ID.
4. Pending: keep fail-closed gate at `NO_GO` for external launch until every pending ElevenLabs evidence ID is complete.
