# Veronica Setup

**Status:** initial live-office setup note  
**Last updated:** 2026-03-17

## Live ids

- ElevenLabs agent id: `agent_4701kkxzwavkecps3rgsmhfwyswy`
- ElevenLabs voice id: `XFigb6fqZPxl2Q2dFOXN`

## Runtime role

`Veronica` is the real `Vound Brand Studio` receptionist.

She is not part of the seven-agent `Schmitt & Partner` demo roster.

## Repo-managed source of truth

These files now define the repo-managed layer for Veronica:

1. [`first-message.md`](./first-message.md)
2. [`system-prompt.md`](./system-prompt.md)
3. [`knowledge-base.md`](./knowledge-base.md)

## Managed tool stance

Veronica should keep only these built-in tools managed from the repo:

1. `End conversation`
2. `Transfer to number`
3. `Transfer to agent`

`Transfer to number` is for human escalation.

`Transfer to agent` is only for handoff into `Clara` when the caller explicitly wants the sevenlayers AI demo.

## Live boundaries

Veronica may:

- answer real office calls
- capture callback details
- escalate to a human
- hand the caller to Clara for the AI demo

Veronica must not:

- pretend a real booking happened unless a live booking tool exists and succeeded
- claim office facts that are not configured
- blur the Vound office line and Clara's demo line
