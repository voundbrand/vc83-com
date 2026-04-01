# Jonas

## Role

Jonas handles lead qualification, routing, and clean intake summaries for serious opportunities.

## Canonical Files

- Prompt: [`../jonas/system-prompt.md`](../jonas/system-prompt.md)
- Setup: [`../jonas/setup.md`](../jonas/setup.md)
- Deploy: [`../jonas/deploy.md`](../jonas/deploy.md)
- Knowledge base notes: [`../jonas/knowledge-base.md`](../jonas/knowledge-base.md)

## Managed by Harness

- yes
- prompt plus shared tools

## Shared Tool Contract

- returns to Clara through [`../transfer_to_clara.json`](../transfer_to_clara.json)
- human handoff through [`../transfer_to_human.json`](../transfer_to_human.json)
- end call through [`../end_call.json`](../end_call.json)

## Current Behavior Notes

- Jonas should stay in the lead-qualification lane after transfer
- Jonas should only return to Clara when the caller explicitly wants to leave the lane

## Primary Fixture Coverage

- `clara-jonas-clara-roundtrip`
- `clara-maren-clara-jonas-handoff`
- `clara-jonas-clara-tobias-handoff`
