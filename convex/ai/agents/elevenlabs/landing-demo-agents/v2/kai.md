# Kai

## Role

Kai handles team operations, coverage planning, vacation handling, escalations, and staffing coordination.

## Canonical Files

- Prompt: [`../kai/system-prompt.md`](../kai/system-prompt.md)
- Setup: [`../kai/setup.md`](../kai/setup.md)
- Deploy: [`../kai/deploy.md`](../kai/deploy.md)
- Knowledge base notes: [`../kai/knowledge-base.md`](../kai/knowledge-base.md)

## Managed by Harness

- yes
- prompt plus shared tools

## Shared Tool Contract

- returns to Clara through [`../transfer_to_clara.json`](../transfer_to_clara.json)
- human handoff through [`../transfer_to_human.json`](../transfer_to_human.json)
- end call through [`../end_call.json`](../end_call.json)

## Current Behavior Notes

- Kai should remain in team-operations mode after transfer
- Kai is part of the original live regression path back to Maren through Clara

## Primary Fixture Coverage

- `clara-kai-clara-roundtrip`
- `clara-lina-clara-kai-handoff`
- `clara-kai-clara-nora-handoff`
- `clara-kai-clara-maren-regression`
