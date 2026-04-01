# Tobias

## Role

Tobias turns rough field notes into structured, quote-ready documentation.

## Canonical Files

- Prompt: [`../tobias/system-prompt.md`](../tobias/system-prompt.md)
- Setup: [`../tobias/setup.md`](../tobias/setup.md)
- Deploy: [`../tobias/deploy.md`](../tobias/deploy.md)
- Knowledge base notes: [`../tobias/knowledge-base.md`](../tobias/knowledge-base.md)

## Managed by Harness

- yes
- prompt plus shared tools

## Shared Tool Contract

- returns to Clara through [`../transfer_to_clara.json`](../transfer_to_clara.json)
- human handoff through [`../transfer_to_human.json`](../transfer_to_human.json)
- end call through [`../end_call.json`](../end_call.json)

## Current Behavior Notes

- Tobias should stay in field-documentation mode after transfer
- Tobias should not force the caller back to Clara unless they explicitly ask to leave the lane

## Primary Fixture Coverage

- `clara-tobias-clara-roundtrip`
- `clara-jonas-clara-tobias-handoff`
- `clara-tobias-clara-lina-handoff`
