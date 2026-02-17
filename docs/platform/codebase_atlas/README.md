# Codebase Atlas Index

This folder is the visualization backbone for the whole platform.

## Contents

- `SYSTEM_LANDSCAPE.md`
  - high-level system flow map across runtime domains
- `BOUNDARIES_AND_CAPABILITIES.md`
  - canonical boundary map (`B1..Bn`)
  - capability catalog (`C1..Cn`)
- `FLOW_CATALOG.md`
  - runtime flow inventory (`F1..Fn`)
  - entry points, status, and owners
- `flows/`
  - detailed per-flow sequence diagrams (Mermaid)
- `path-flow-map.tsv`
  - machine-readable mapping used by CI to detect impacted flows from changed files

## Current Runtime Flows

- `F1` Identity and session lifecycle
- `F2` AI conversation runtime
- `F3` Checkout to fulfillment
- `F4` Workflow trigger and behavior execution
- `F5` External webhook and channel ingestion
- `F6` Affiliate event to reward pipeline
- `F7` Organization onboarding and bootstrap
- `F8` CRM, forms, events, and booking lifecycle
- `F9` Projects, files, media, and collaboration
- `F10` Template composition and resolution
- `F11` Builder, publishing, and deployment
- `F12` Invoicing, PDF generation, and email delivery
- `F13` OAuth, API keys, and integration authorization
- `F14` Credits, licensing, and AI billing
- `F15` Governance, audit, and runtime guards
- `F16` Translation and localization delivery

## Editing Rules

1. Do not rename existing `B*`, `C*`, or `F*` IDs.
2. Keep diagrams in Mermaid embedded in markdown.
3. Update `path-flow-map.tsv` when a new critical path appears.
4. Keep this index in sync with `docs/platform/CODEBASE_ATLAS.md`.
5. Keep PR contract keys in `.github/pull_request_template.md` aligned with `scripts/ci/check-diagram-impact.sh`.
6. Do not use `impact:none` when mapped critical flow paths changed in the PR.
