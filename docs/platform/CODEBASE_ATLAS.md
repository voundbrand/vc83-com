# Codebase Atlas

Purpose:
- provide one canonical visualization layer for the full platform (not only AI endurance)
- keep architecture diagrams synchronized with code changes
- make change impact explicit in pull requests and CI

This document is the atlas entrypoint. Deep flow docs are in:
- `docs/platform/codebase_atlas/`

## Stable IDs (Do Not Rename)

Boundaries use `B*` IDs.
Capabilities use `C*` IDs.
Runtime flows use `F*` IDs.

These IDs are the contract between:
- architecture docs
- PR impact declarations
- CI enforcement rules

## Atlas Layout

- Index: `docs/platform/codebase_atlas/README.md`
- System landscape: `docs/platform/codebase_atlas/SYSTEM_LANDSCAPE.md`
- Boundaries + capabilities: `docs/platform/codebase_atlas/BOUNDARIES_AND_CAPABILITIES.md`
- Flow catalog: `docs/platform/codebase_atlas/FLOW_CATALOG.md`
- Flow docs:
  - `docs/platform/codebase_atlas/flows/F1-identity-session.md`
  - `docs/platform/codebase_atlas/flows/F2-ai-conversation-runtime.md`
  - `docs/platform/codebase_atlas/flows/F3-checkout-fulfillment.md`
  - `docs/platform/codebase_atlas/flows/F4-workflow-trigger-execution.md`
  - `docs/platform/codebase_atlas/flows/F5-external-webhooks-and-channels.md`
  - `docs/platform/codebase_atlas/flows/F6-affiliate-event-reward.md`
  - `docs/platform/codebase_atlas/flows/F7-organization-onboarding-bootstrap.md`
  - `docs/platform/codebase_atlas/flows/F8-crm-forms-events-lifecycle.md`
  - `docs/platform/codebase_atlas/flows/F9-projects-files-media-collaboration.md`
  - `docs/platform/codebase_atlas/flows/F10-template-composition-and-resolution.md`
  - `docs/platform/codebase_atlas/flows/F11-builder-publishing-and-deployment.md`
  - `docs/platform/codebase_atlas/flows/F12-invoicing-pdf-and-email-delivery.md`
  - `docs/platform/codebase_atlas/flows/F13-oauth-api-keys-and-integrations.md`
  - `docs/platform/codebase_atlas/flows/F14-credits-licensing-and-ai-billing.md`
  - `docs/platform/codebase_atlas/flows/F15-governance-audit-and-runtime-guards.md`
  - `docs/platform/codebase_atlas/flows/F16-translation-and-localization-delivery.md`
- Path-to-flow map (machine-readable): `docs/platform/codebase_atlas/path-flow-map.tsv`

## Diagram Update Protocol

Every functional PR must declare diagram impact in PR body with this contract:

```text
impact: none | minor | major
affected_flows: [F1, F3]
updated_docs: [docs/platform/codebase_atlas/flows/F3-checkout-fulfillment.md]
justification: <required when impact=none>
```

Rules:
1. If code changes affect mapped critical paths, `impact:none` is not allowed.
2. If code changes affect mapped critical paths, impacted flow IDs must be declared.
3. If `impact` is `minor` or `major`, corresponding flow docs must be updated in the same PR.
4. If `impact` is `none` (for unmapped changes), explicit justification is required.

## CI Enforcement

CI enforcement is implemented by:
- PR template: `.github/pull_request_template.md`
- Script: `scripts/ci/check-diagram-impact.sh`
- Workflow: `.github/workflows/diagram-impact.yml`

The checker uses:
- PR diff (`base sha` -> `head sha`)
- path-to-flow mapping from `docs/platform/codebase_atlas/path-flow-map.tsv`
- PR body contract

## Baseline Coverage Status

Initial full-pass baseline is now documented in:
- `docs/platform/codebase_atlas/FLOW_CATALOG.md` (`F1..F16`)
- `docs/platform/codebase_atlas/BOUNDARIES_AND_CAPABILITIES.md` (capability coverage map for `C1..C27`)

## Ownership and Drift Control

- Atlas edits are required for runtime behavior changes in mapped paths.
- Keep flow docs in Mermaid so diffs are reviewable.
- If a new subsystem is introduced, update:
  - `path-flow-map.tsv`
  - `BOUNDARIES_AND_CAPABILITIES.md`
  - `FLOW_CATALOG.md` and/or add new `F*` flow docs
