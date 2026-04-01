# Nora

## Role

Nora handles analytics, KPI interpretation, trend explanation, and location-level performance insight.

## Canonical Files

- Prompt: [`../nora/system-prompt.md`](../nora/system-prompt.md)
- Setup: [`../nora/setup.md`](../nora/setup.md)
- Deploy: [`../nora/deploy.md`](../nora/deploy.md)
- Knowledge base notes: [`../nora/knowledge-base.md`](../nora/knowledge-base.md)

## Managed by Harness

- yes
- prompt plus shared tools

## Shared Tool Contract

- returns to Clara through [`../transfer_to_clara.json`](../transfer_to_clara.json)
- human handoff through [`../transfer_to_human.json`](../transfer_to_human.json)
- end call through [`../end_call.json`](../end_call.json)

## Current Behavior Notes

- Nora should stay in analytics mode after transfer
- Nora is the terminal specialist in the current specialist-ring coverage

## Primary Fixture Coverage

- `clara-nora-clara-roundtrip`
- `clara-kai-clara-nora-handoff`
