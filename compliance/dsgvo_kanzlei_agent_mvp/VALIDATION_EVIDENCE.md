# Validation Evidence (KAMVP-017)

Stand: 2026-03-26 (revalidated 21:17 CET via `GDPRSYS-012`)  
Workstream: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp`

## 1. Profile execution summary (`KAMVP-017`)

| Profile | Command | Exit code | Result | Evidence log |
|---|---|---:|---|---|
| `V-DOCS` | `npm run docs:guard` | `0` | `PASS` | `tmp/reports/kanzlei-agent-mvp/docs_guard.log` |
| `V-TYPE` | `npm run typecheck` | `0` | `PASS` | `tmp/reports/kanzlei-agent-mvp/typecheck.log` |
| `V-UNIT` | `npm run test:unit` | `0` | `PASS` | `tmp/reports/kanzlei-agent-mvp/test_unit.log` |
| `V-INTEG` | `npm run test:integration` | `0` | `PASS` | `tmp/reports/kanzlei-agent-mvp/test_integration.log` |

## 2. Detailed verification results

`V-UNIT` summary (`tmp/reports/kanzlei-agent-mvp/test_unit.log`):

1. Test files: `429 passed`, `7 skipped` (total `436`).
2. Tests: `2262 passed`, `106 skipped` (total `2368`).

`V-INTEG` summary (`tmp/reports/kanzlei-agent-mvp/test_integration.log`):

1. Test files: `54 passed`, `2 skipped` (total `56`).
2. Tests: `198 passed`, `22 skipped` (total `220`).

Execution timestamp for this validation bundle:

1. `2026-03-26 21:17:33 CET` (`date` captured after log refresh).

## 3. Supplementary model validation for `KAMVP-014` (`V-MODEL`)

`KAMVP-014` requires `V-MODEL`; this remains tracked as supplementary evidence (last run 2026-03-25):

| Profile | Command | Exit code | Result | Evidence log |
|---|---|---:|---|---|
| `V-MODEL` | `npm run test:model` | `0` | `PASS` | `tmp/reports/kanzlei-agent-mvp/test_model.log` |

Result snapshot:

1. Resolved validation model: `anthropic/claude-opus-4.5` (from `TEST_MODEL_ID`).
2. Validation runtime mode: `direct_runtime` (explicit via `MODEL_VALIDATION_TRANSPORT=direct_runtime`).
3. Strict fail-closed model-selection mode: `enabled` (`MODEL_VALIDATION_STRICT_MODEL=1`).
4. Summary: `6/6` checks passed, `conformance=PASS`.
5. Conformance metrics: `tool_call_parse_rate=1 (2/2)`, `schema_fidelity_rate=1 (2/2)`, `refusal_handling_rate=1 (1/1)`, `latency_p95_ms=3529`, `cost_per_1k_tokens_usd=0.003014`.

Historical scoped closure checks (2026-03-25):

| Profile | Command | Exit code | Result | Evidence log |
|---|---|---:|---|---|
| `V-TYPE` | `npm run typecheck` | `0` | `PASS` | `tmp/reports/kanzlei-agent-mvp/typecheck.log` |
| `V-UNIT` (scoped) | `npm run test:unit -- tests/unit/ai/toolRegistrySchemaResilience.test.ts` | `0` | `PASS` | `tmp/reports/kanzlei-agent-mvp/scoped_tool_registry_schema_resilience.log` |
| `V-DOCS` | `npm run docs:guard` | `0` | `PASS` | `tmp/reports/kanzlei-agent-mvp/docs_guard.log` |

## 4. Gate status for `KAMVP-017`

Status: `DONE`

Reason:

1. Required profile set for `KAMVP-017` (`V-DOCS`, `V-TYPE`, `V-UNIT`, `V-INTEG`) is fully green.
2. Previous global unit blocker is resolved in current run.

Residual note:

- `KAMVP-014` is now `DONE`; `V-MODEL` is green for the configured release baseline.
