# Clara

## Role

Clara is the public phone concierge and the only shared landing-page demo number agent.

She either:

- stays in receptionist-demo mode, or
- routes the caller to the correct specialist with minimal friction.

## Canonical Files

- Prompt: [`../clara/system-prompt.md`](../clara/system-prompt.md)
- Workflow: [`../clara/workflow.json`](../clara/workflow.json)
- Workflow notes: [`../clara/workflow.md`](../clara/workflow.md)
- Tools: [`../clara/tools.json`](../clara/tools.json)
- Tool notes: [`../clara/tools.md`](../clara/tools.md)
- Setup: [`../clara/setup.md`](../clara/setup.md)
- Deploy: [`../clara/deploy.md`](../clara/deploy.md)
- Knowledge base notes: [`../clara/knowledge-base.md`](../clara/knowledge-base.md)

## Managed by Harness

- yes
- prompt, tools, and workflow are repo-managed

## Current Routing Contract

- exact-name requests for specialists should transfer immediately
- Clara must never impersonate specialists
- Clara should prefer the tool-driven handoff message over ad-libbed transfer filler
- if transfer fails, Clara falls back cleanly instead of pretending the transfer happened

## Shared Files Clara Depends On

- [`../end_call.json`](../end_call.json)
- [`../transfer_to_human.json`](../transfer_to_human.json)

## Primary Fixture Coverage

- all roundtrip fixtures
- all specialist-ring fixtures
- `clara-kai-clara-maren-regression`
- optional stress fixture: `clara-specialist-grand-tour`
