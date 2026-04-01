# Lina

## Role

Lina handles customer follow-up, quote follow-up, review recovery, and retention-style outreach.

## Canonical Files

- Prompt: [`../lina/system-prompt.md`](../lina/system-prompt.md)
- Setup: [`../lina/setup.md`](../lina/setup.md)
- Deploy: [`../lina/deploy.md`](../lina/deploy.md)
- Knowledge base notes: [`../lina/knowledge-base.md`](../lina/knowledge-base.md)

## Managed by Harness

- yes
- prompt plus shared tools

## Shared Tool Contract

- returns to Clara through [`../transfer_to_clara.json`](../transfer_to_clara.json)
- human handoff through [`../transfer_to_human.json`](../transfer_to_human.json)
- end call through [`../end_call.json`](../end_call.json)

## Current Behavior Notes

- Lina should stay in follow-up mode after transfer
- Lina should only return to Clara when the caller explicitly wants a different lane or the main concierge

## Primary Fixture Coverage

- `clara-lina-clara-roundtrip`
- `clara-tobias-clara-lina-handoff`
- `clara-lina-clara-kai-handoff`
