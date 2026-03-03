# Super Admin Agent QA Runbook

## Purpose

Use the main chat UI (`ai-chat-window`) in explicit QA mode to target a specific agent/template and debug runtime failures with deterministic diagnostics.

## Access + gating

- QA mode is enabled only when both conditions are true:
1. query/payload explicitly requests QA mode
2. authenticated actor is `isSuperAdmin === true`
- Non-super-admin attempts are blocked with `SUPER_ADMIN_QA_MODE_DENIED:<reason>`.
- Every QA request writes an audit event (`ai.super_admin_agent_qa_mode_access`) with `success=true|false`, mode version, and requested targets.

## Start a QA session in main chat UI

1. Sign in as a super admin.
2. Open the chat route with explicit QA query params:
   - `/chat?qa=1`
   - optional target agent: `&qaAgentId=<agent_id>`
   - optional target template role: `&qaTemplateRole=<template_role>`
   - optional label: `&qaLabel=<run_label>`
   - optional explicit run id (recommended for long sessions): `&qaRunId=<qa_run_id>`
3. Confirm the in-app banner: `Super Admin Agent QA Mode`.
4. Use `Open QA run` in the banner to jump directly into the QA Runs panel scoped to the current run.
5. Run manual or long sessions; onboarding kickoff auto-send is skipped while QA mode is enabled.

Example:

```text
/chat?qa=1&qaAgentId=objects_123&qaTemplateRole=one_of_one_warm_lead_capture_consultant_template&qaLabel=samantha-pdf-regression&qaRunId=qa_20260303_samantha_pdf
```

## Deterministic QA diagnostics envelope

When QA mode is enabled, chat responses include:

- `qaDiagnostics.enabled`
- `qaDiagnostics.modeVersion`
- `qaDiagnostics.actor.userId|email`
- `qaDiagnostics.target.agentId|templateRole`
- `qaDiagnostics.diagnostics` with action-completion analysis:
  - `preflightReasonCode`
  - `reasonCode`
  - `requiredTools`
  - `availableTools`
  - `observedTools`
  - `missingRequiredFields`
  - `enforcementMode`
  - `blockedReason` and `blockedDetail`

Blocked reason mapping:

- `tool_unavailable` (`reasonCode=claim_tool_unavailable`)
- `missing_required_fields` (`preflightReasonCode=missing_required_fields`)
- `tool_not_observed` (`preflightReasonCode=tool_not_observed`)

## Terminal Convex log tail

Use:

```bash
npm run logs:qa:convex -- --session <session_id>
```

Optional filters:

- `--turn <turn_id>`
- `--agent <agent_id>`
- `--run <qa_run_id>`
- `--raw` (prints non-matching raw lines too)
- Any extra args are passed through to `npx convex logs`.

Example:

```bash
npm run logs:qa:convex -- --run qa_20260303121500 --session j57... --agent objects_123 --raw
```

The formatter highlights:

- `preflightReasonCode`
- `reasonCode`
- `requiredTools` vs `availableTools`
- `missingRequiredFields`
- action-completion decision fields (`enforcementMode` / outcome)

## QA Runs panel (super admin)

Open:

- `/?app=organizations&panel=qa-runs`

Capabilities:

- filter runs by `qaRunId`
- inspect run status/start/end + failure taxonomy counts
- jump to Agent Control Center session/turn deep link
- export incident bundle JSON per run
- mark active run `completed` or `failed`

Retention policy:

- completed/failed runs older than 30 days are cleaned hourly
- active runs idle for more than 7 days are cleaned hourly
- row-cap trimming keeps table size bounded for predictable storage

## CI telemetry contract gate

Run locally:

```bash
npm run qa:telemetry:guard
```

This guard fails if required QA telemetry tokens drift between:

- emitter: `convex/ai/agentExecution.ts`
- typed envelope contract: `convex/ai/qaModeContracts.ts`
- parser/formatter: `scripts/ai/super-admin-agent-qa-log-formatter.mjs`

Schema-level envelope test:

- `tests/unit/ai/superAdminQaTelemetryEnvelopeContract.test.ts`

The gate is wired into:

- `agent-runtime:dev:stage3:contract-tests`
