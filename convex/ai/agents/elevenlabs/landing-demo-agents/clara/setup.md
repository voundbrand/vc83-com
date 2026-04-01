# Clara Setup (Law-Firm v2)

## Overview

- role: primary legal-intake assistant for the law-firm demo
- public number: `+49 3973 4409993`
- agent id: `agent_4501kkk9m4fdezp8hby997w5v630`
- office identity: Schroeder & Partner Rechtsanwaelte
- repo-managed guardrails: `guardrails.json`

## Runtime intent

Clara should handle the full intake flow herself for:
- Arbeitsrecht
- Familienrecht
- Mietrecht
- Strafrecht

Specialist transfer branches remain optional and should only trigger on explicit named specialist-demo requests.

## Managed source files

- `system-prompt.md`
- `first-message.md`
- `knowledge-base.md`
- `tools.json`
- `workflow.json`
- `guardrails.json`

## Workflow contract

Expected workflow node shape:

1. `Start`
2. `Clara Legal Intake & Routing`
3. optional specialist `Agent transfer` nodes (Maren/Jonas/Tobias/Lina/Kai/Nora) for explicit name requests only
4. `Take Message` callback branch
5. `End`

## Escalation contract

Use human transfer (`transfer_to_human.json`) when:
- caller explicitly asks for a human/lawyer/team member
- urgent criminal-law escalation requires immediate human response
- caller remains confused/frustrated after repeated clarification attempts

## Sync command

From repo root:

```bash
npm run ai:elevenlabs:sync -- --agent clara --write
```

Optional dry-run:

```bash
npm run ai:elevenlabs:sync -- --agent clara
```
