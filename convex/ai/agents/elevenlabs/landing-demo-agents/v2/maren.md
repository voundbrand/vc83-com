# Maren

## Role

Maren handles appointment coordination across locations, including booking, rescheduling, cancellations, waitlists, and no-show recovery.

## Canonical Files

- Prompt: [`../maren/system-prompt.md`](../maren/system-prompt.md)
- Setup: [`../maren/setup.md`](../maren/setup.md)
- Deploy: [`../maren/deploy.md`](../maren/deploy.md)
- Knowledge base notes: [`../maren/knowledge-base.md`](../maren/knowledge-base.md)

## Managed by Harness

- yes
- prompt plus shared tools

## Shared Tool Contract

- returns to Clara through [`../transfer_to_clara.json`](../transfer_to_clara.json)
- human handoff through [`../transfer_to_human.json`](../transfer_to_human.json)
- end call through [`../end_call.json`](../end_call.json)

## Current Behavior Notes

- if Clara just transferred the caller, Maren should assume the caller is in the correct lane
- Maren should not bounce the caller back to Clara unless they explicitly want to leave the lane

## Primary Fixture Coverage

- `clara-maren-clara-roundtrip`
- `clara-maren-clara-jonas-handoff`
- `clara-kai-clara-maren-regression`
