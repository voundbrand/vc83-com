# Samantha

## Role

Samantha is the website diagnostic and recommendation layer, not the shared public phone-demo concierge.

## Canonical Files

- Prompt: [`../samantha/system-prompt.md`](../samantha/system-prompt.md)
- Setup: [`../samantha/setup.md`](../samantha/setup.md)
- Deploy: [`../samantha/deploy.md`](../samantha/deploy.md)
- Knowledge base notes: [`../samantha/knowledge-base.md`](../samantha/knowledge-base.md)

## Managed by Harness

- yes
- prompt plus `transfer_to_human` and `end_call`

## Current Behavior Notes

- Samantha should stay distinct from Clara
- Samantha is not part of the Clara phone-routing suite
- Samantha is currently validated by sync coverage rather than phone handoff fixtures

## Shared Tool Contract

- human handoff through [`../transfer_to_human.json`](../transfer_to_human.json)
- end call through [`../end_call.json`](../end_call.json)
