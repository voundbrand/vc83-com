# AI Model Release Gate Operations

## What Is Enforced

- Only **release-ready** models are exposed by platform model queries used in user-facing selectors and runtime routing.
- Release-ready is evaluated with shared gate logic:
  - `validationStatus === "validated"`
  - all hard gate checks pass
  - conformance gate passes
  - operational review acknowledgement is present for platform-enabled models
- Tool-calling runtime paths reject execution when no release-ready tools+json route exists.

## Run Validation

Run the existing live validation harness:

```bash
npm run test:model -- --untested-only
```

Optional targeted runs:

```bash
npm run test:model -- --model "anthropic/claude-sonnet-4.5"
npm run test:model -- --provider "openai"
```

## Release A Model

1. Run validation (`npm run test:model`) and confirm model status is `validated`.
2. In platform model management, enable the model with operational review acknowledgement.
3. Confirm model appears in release-ready platform model lists.

Operational acknowledgement is persisted on enablement (`operationalReviewAcknowledgedAt`).

## CI Audit Modes

The CI audit script is:

```bash
npx tsx scripts/ci/model-release-gate-audit.ts
```

Useful shortcuts:

```bash
npm run model:gate:audit
npm run model:gate:enforce
```

Environment controls:

- `MODEL_RELEASE_GATE_MODE`: `audit` or `enforce`
- `MODEL_RELEASE_GATE_REQUIRE_OPERATIONAL_REVIEW_FOR_ENABLED_MODELS`: `1|0` (default `1`)
- `MODEL_RELEASE_GATE_EXPECTED_CRITICAL_TOOL_CONTRACT_COUNT`: optional integer override
- `MODEL_RELEASE_GATE_REPORT_PATH`: JSON output path
- `MODEL_RELEASE_GATE_SUMMARY_PATH`: text summary output path

Enforce mode fails CI when any **platform-enabled** model is not release-ready. Failure output lists model IDs and blocking reasons.

## Workflows

- `.github/workflows/model-release-gate.yml`
  - PR/main guardrail audit
  - defaults to `audit` on PR, `enforce` on main pushes (override supported)
- `.github/workflows/model-validation-live.yml`
  - nightly/manual live validation via `scripts/test-model-validation.ts` when secrets are available
